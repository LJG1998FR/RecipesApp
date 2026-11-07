<?php

namespace App\Tests\Functional\Controller\Api;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tests fonctionnels de /api/users/* : c'est le contrôleur le plus sensible
 * côté SÉCURITÉ de l'app (qui peut voir / modifier / supprimer quel
 * compte), donc celui où des tests automatisés rapportent le plus — une
 * régression ici n'est pas "un bouton mal aligné", c'est une fuite de
 * données ou une élévation de privilèges.
 *
 * ⚠️ Mêmes prérequis que RecipeControllerTest (base de test à jour, clés
 * JWT présentes en env `test`). Même stratégie d'isolation : chaque test
 * crée ses propres utilisateurs avec un email unique (uniqid()) et les
 * supprime dans tearDown(), sans dépendre des fixtures (UserFixture)
 * existantes.
 */
final class UserControllerTest extends WebTestCase
{
    /** @var int[] */
    private array $createdUserIds = [];

    protected function tearDown(): void
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);

        foreach ($this->createdUserIds as $id) {
            if ($user = $em->getRepository(User::class)->find($id)) {
                $em->remove($user);
            }
        }
        $em->flush();

        parent::tearDown();
    }

    private function createUser(array $roles = ['ROLE_USER']): User
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);

        $user = new User();
        $user->setEmail('test_' . uniqid('', true) . '@example.test');
        $user->setFirstName('Test');
        $user->setLastName('User');
        $user->setRoles($roles);
        $user->setCreatedAt(time());
        $user->setPassword('not-used-in-tests');

        $em->persist($user);
        $em->flush();

        $this->createdUserIds[] = $user->getId();

        return $user;
    }

    private function authenticatedClient(User $user): KernelBrowser
    {
        $client = static::createClient();

        $token = static::getContainer()
            ->get(JWTTokenManagerInterface::class)
            ->create($user);

        $client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer ' . $token);

        return $client;
    }

    private function requestJson(KernelBrowser $client, string $method, string $uri, array $payload = []): array
    {
        $client->request(
            method: $method,
            uri: $uri,
            server: ['CONTENT_TYPE' => 'application/json'],
            content: $payload === [] ? null : json_encode($payload, JSON_THROW_ON_ERROR),
        );

        $response = $client->getResponse();
        $body = $response->getContent() !== '' ? json_decode($response->getContent(), true) : null;

        return ['status' => $response->getStatusCode(), 'body' => $body];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GET /api/users — réservé ROLE_SUPER_ADMIN
    // ═══════════════════════════════════════════════════════════════════════

    public function testList_asSimpleUser_isForbidden(): void
    {
        $user = $this->createUser();
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'GET', '/api/users');

        self::assertSame(Response::HTTP_FORBIDDEN, $result['status']);
    }

    public function testList_asSuperAdmin_isAllowed(): void
    {
        $admin = $this->createUser(['ROLE_SUPER_ADMIN']);
        $client = $this->authenticatedClient($admin);

        $result = $this->requestJson($client, 'GET', '/api/users');

        self::assertSame(Response::HTTP_OK, $result['status']);
        self::assertIsArray($result['body']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GET /api/users/{id} — soi-même, ou SUPER_ADMIN
    // ═══════════════════════════════════════════════════════════════════════

    public function testShow_ownProfile_isAllowed(): void
    {
        $user = $this->createUser();
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'GET', "/api/users/{$user->getId()}");

        self::assertSame(Response::HTTP_OK, $result['status']);
        self::assertSame($user->getEmail(), $result['body']['email']);
    }

    public function testShow_someoneElsesProfileAsSimpleUser_isForbidden(): void
    {
        $user = $this->createUser();
        $other = $this->createUser();
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'GET', "/api/users/{$other->getId()}");

        self::assertSame(Response::HTTP_FORBIDDEN, $result['status']);
    }

    public function testShow_adminButNotSuperAdmin_cannotViewOthers(): void
    {
        // ⚠️ Point à bien avoir en tête (et testé explicitement ici) :
        // canViewUser() n'accepte QUE ROLE_SUPER_ADMIN, pas ROLE_ADMIN.
        // Un simple "ROLE_ADMIN" ne doit donc PAS pouvoir consulter la fiche
        // d'un autre utilisateur, même si le mot "Admin" peut le laisser
        // penser. Si cette hiérarchie change un jour, ce test doit être le
        // premier à être mis à jour consciemment (pas juste "corrigé" pour
        // qu'il passe).
        $admin = $this->createUser(['ROLE_ADMIN']);
        $other = $this->createUser();
        $client = $this->authenticatedClient($admin);

        $result = $this->requestJson($client, 'GET', "/api/users/{$other->getId()}");

        self::assertSame(Response::HTTP_FORBIDDEN, $result['status']);
    }

    public function testShow_unknownId_returns404(): void
    {
        $admin = $this->createUser(['ROLE_SUPER_ADMIN']);
        $client = $this->authenticatedClient($admin);

        $result = $this->requestJson($client, 'GET', '/api/users/999999999');

        self::assertSame(Response::HTTP_NOT_FOUND, $result['status']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUT /api/users/update
    // ═══════════════════════════════════════════════════════════════════════

    public function testUpdate_ownFirstName_isPersisted(): void
    {
        $user = $this->createUser();
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'PUT', '/api/users/update', [
            'firstName' => 'Nouveau Prénom',
        ]);

        self::assertSame(Response::HTTP_OK, $result['status']);
        self::assertSame('Nouveau Prénom', $result['body']['firstName']);
    }

    public function testUpdate_ownRole_isForbiddenEvenForSuperAdmin(): void
    {
        // Règle métier explicite du contrôleur : "PERSONNE ne peut changer
        // son propre rôle". On vérifie que ça tient MÊME pour un
        // super-admin — c'est justement le cas le plus facile à casser par
        // erreur (un dev pourrait être tenté d'ajouter une exception "sauf
        // si c'est un super-admin").
        $admin = $this->createUser(['ROLE_SUPER_ADMIN']);
        $client = $this->authenticatedClient($admin);

        $result = $this->requestJson($client, 'PUT', '/api/users/update', [
            'role' => 'ROLE_USER',
        ]);

        self::assertSame(Response::HTTP_FORBIDDEN, $result['status']);

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->clear();
        $reloaded = $em->getRepository(User::class)->find($admin->getId());
        self::assertSame('ROLE_SUPER_ADMIN', $reloaded->getHighestRole(), 'Le rôle ne doit pas avoir bougé.');
    }

    public function testUpdate_anotherUsersRoleBySuperAdmin_isAllowed(): void
    {
        $superAdmin = $this->createUser(['ROLE_SUPER_ADMIN']);
        $target = $this->createUser();
        $client = $this->authenticatedClient($superAdmin);

        $result = $this->requestJson($client, 'PUT', '/api/users/update', [
            'targetEmail' => $target->getEmail(),
            'role'        => 'ROLE_ADMIN',
        ]);

        self::assertSame(Response::HTTP_OK, $result['status'], print_r($result['body'], true));
        self::assertSame('ROLE_ADMIN', $result['body']['role']);
    }

    public function testUpdate_anotherUsersProfileBySimpleUser_isForbidden(): void
    {
        $user = $this->createUser();
        $target = $this->createUser();
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'PUT', '/api/users/update', [
            'targetEmail' => $target->getEmail(),
            'firstName'   => 'Usurpé',
        ]);

        self::assertSame(Response::HTTP_FORBIDDEN, $result['status']);
    }

    public function testUpdate_emailAlreadyUsedByAnotherAccount_returns409(): void
    {
        $user = $this->createUser();
        $other = $this->createUser();
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'PUT', '/api/users/update', [
            'email' => $other->getEmail(),
        ]);

        self::assertSame(Response::HTTP_CONFLICT, $result['status']);
    }

    /**
     * ✅ Vérifie que la même règle de robustesse de mot de passe s'applique
     * au CHANGEMENT de mot de passe (profil) qu'à l'INSCRIPTION — voir la
     * note dans PasswordPolicyTest. C'est le test qui transforme une
     * hypothèse ("ça doit sûrement être cohérent") en fait vérifié.
     */
    public function testUpdate_weakNewPassword_isRejectedBySamePolicyAsRegistration(): void
    {
        $user = $this->createUser();
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'PUT', '/api/users/update', [
            'password' => 'faible', // 6 caractères, pas de majuscule, pas de chiffre
        ]);

        self::assertSame(Response::HTTP_UNPROCESSABLE_ENTITY, $result['status']);
        self::assertArrayHasKey('password', $result['body']['errors']);
        self::assertContains('too_short', $result['body']['errors']['password']);
    }

    public function testUpdate_strongNewPassword_isAcceptedAndHashed(): void
    {
        $user = $this->createUser();
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'PUT', '/api/users/update', [
            'password' => 'NouveauMotDePasse1',
        ]);

        self::assertSame(Response::HTTP_OK, $result['status']);

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->clear();
        $reloaded = $em->getRepository(User::class)->find($user->getId());

        // On ne vérifie surtout pas une égalité avec le mot de passe en
        // clair : un hash bcrypt/argon2 ne doit JAMAIS correspondre
        // caractère pour caractère à l'entrée. On vérifie juste qu'il a
        // changé (et qu'il n'est donc pas resté "not-used-in-tests").
        self::assertNotSame('not-used-in-tests', $reloaded->getPassword());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DELETE /api/users/{id}
    // ═══════════════════════════════════════════════════════════════════════

    public function testDelete_ownAccount_isAllowed(): void
    {
        $user = $this->createUser();
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'DELETE', "/api/users/{$user->getId()}");

        self::assertSame(Response::HTTP_NO_CONTENT, $result['status']);

        // Le compte étant déjà supprimé par la requête, tearDown() n'a
        // rien à faire pour celui-ci : on le retire de la liste pour ne
        // pas tenter un remove() en double (sans effet mais inutile).
        $this->createdUserIds = array_diff($this->createdUserIds, [$user->getId()]);
    }

    public function testDelete_superAdminCannotDeleteOwnAccount(): void
    {
        // Garde-fou métier : on ne veut jamais qu'un super-admin se
        // supprime lui-même par erreur (ou par malveillance) et laisse
        // l'application sans administrateur.
        $superAdmin = $this->createUser(['ROLE_SUPER_ADMIN']);
        $client = $this->authenticatedClient($superAdmin);

        $result = $this->requestJson($client, 'DELETE', "/api/users/{$superAdmin->getId()}");

        self::assertSame(Response::HTTP_FORBIDDEN, $result['status']);
    }

    public function testDelete_anotherUserBySuperAdmin_isAllowed(): void
    {
        $superAdmin = $this->createUser(['ROLE_SUPER_ADMIN']);
        $target = $this->createUser();
        $client = $this->authenticatedClient($superAdmin);

        $result = $this->requestJson($client, 'DELETE', "/api/users/{$target->getId()}");

        self::assertSame(Response::HTTP_NO_CONTENT, $result['status']);
        $this->createdUserIds = array_diff($this->createdUserIds, [$target->getId()]);
    }

    public function testDelete_anotherUserBySimpleUser_isForbidden(): void
    {
        $user = $this->createUser();
        $target = $this->createUser();
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'DELETE', "/api/users/{$target->getId()}");

        self::assertSame(Response::HTTP_FORBIDDEN, $result['status']);
    }
}
