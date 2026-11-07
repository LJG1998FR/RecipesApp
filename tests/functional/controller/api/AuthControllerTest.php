<?php

namespace App\Tests\Functional\Controller\Api;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tests fonctionnels de /api/register.
 *
 * Pourquoi fonctionnel et pas unitaire ici : register() ne fait presque que
 * de l'orchestration (vérifier l'unicité en base, persister, générer un
 * JWT, envoyer un email de bienvenue) — il n'y a pas de fonction "pure" à
 * isoler comme pour RecipeController::validateRecipeData(). On est donc
 * obligé de passer par le vrai kernel + une vraie base pour avoir une
 * garantie utile.
 *
 * ⚠️ Prérequis identiques à RecipeControllerTest (voir son en-tête) :
 * base de test créée et à jour, clés JWT présentes en env `test`.
 *
 * Note sur l'email de bienvenue : AppMailer::sendWelcome() passe par
 * Symfony Mailer, qui lui-même route Symfony\Component\Mailer\Messenger\SendEmailMessage
 * vers le transport "async" (cf. config/packages/messenger.yaml). En env de
 * test, ce message est donc seulement INSÉRÉ dans la table
 * messenger_messages (transport Doctrine), jamais réellement envoyé par
 * SMTP — on n'a donc pas besoin de mocker AppMailer ici, et les tests ne
 * dépendent d'aucune configuration MAILER_DSN valide.
 */
final class AuthControllerTest extends WebTestCase
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

    private function requestJson(KernelBrowser $client, string $method, string $uri, array $payload): array
    {
        $client->request(
            method: $method,
            uri: $uri,
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode($payload, JSON_THROW_ON_ERROR),
        );

        $response = $client->getResponse();
        $body = $response->getContent() !== '' ? json_decode($response->getContent(), true) : null;

        return ['status' => $response->getStatusCode(), 'body' => $body];
    }

    private function validRegisterPayload(array $overrides = []): array
    {
        return array_merge([
            // 16+ caractères, majuscule, minuscule, chiffre : respecte
            // PasswordPolicy::validate(). Si ce test commence à échouer sur
            // l'erreur "password" après une évolution de la policy, c'est
            // ICI qu'il faut l'ajuster plutôt que dans chaque test.
            'email'     => 'test_' . uniqid('', true) . '@example.test',
            'password'  => 'MotDePasseValide1',
            'firstName' => 'Jean',
            'lastName'  => 'Dupont',
        ], $overrides);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Cas nominal
    // ═══════════════════════════════════════════════════════════════════════

    public function testRegister_withValidPayload_createsUserAndReturnsToken(): void
    {
        $client = static::createClient();

        $result = $this->requestJson($client, 'POST', '/api/register', $this->validRegisterPayload());

        self::assertSame(Response::HTTP_CREATED, $result['status'], print_r($result['body'], true));
        self::assertArrayHasKey('token', $result['body']);
        self::assertNotEmpty($result['body']['token'], 'Un JWT doit être renvoyé pour permettre une connexion immédiate.');
        self::assertSame('ROLE_USER', self::assertUserCreatedAndGetHighestRole($result['body']['user']['id']));

        $this->createdUserIds[] = $result['body']['user']['id'];
    }

    public function testRegister_defaultLocale_isFrenchWhenNotSpecified(): void
    {
        $client = static::createClient();

        $result = $this->requestJson($client, 'POST', '/api/register', $this->validRegisterPayload());
        $this->createdUserIds[] = $result['body']['user']['id'];

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $user = $em->getRepository(User::class)->find($result['body']['user']['id']);

        self::assertSame('fr', $user->getLocale(), 'Sans locale fournie, "fr" doit être le repli par défaut.');
    }

    /** @dataProvider provideValidLocales */
    public function testRegister_explicitLocale_isPersisted(string $locale): void
    {
        $client = static::createClient();

        $result = $this->requestJson($client, 'POST', '/api/register', $this->validRegisterPayload(['locale' => $locale]));
        $this->createdUserIds[] = $result['body']['user']['id'];

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $user = $em->getRepository(User::class)->find($result['body']['user']['id']);

        self::assertSame($locale, $user->getLocale());
    }

    public static function provideValidLocales(): array
    {
        return ['fr' => ['fr'], 'en' => ['en']];
    }

    public function testRegister_unsupportedLocale_fallsBackToFrench(): void
    {
        // On n'accepte QUE 'fr'/'en' : une valeur arbitraire envoyée par un
        // client mal formé (ou malveillant) ne doit pas se retrouver telle
        // quelle en base et casser l'i18n plus tard.
        $client = static::createClient();

        $result = $this->requestJson($client, 'POST', '/api/register', $this->validRegisterPayload(['locale' => 'de']));
        $this->createdUserIds[] = $result['body']['user']['id'];

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $user = $em->getRepository(User::class)->find($result['body']['user']['id']);

        self::assertSame('fr', $user->getLocale());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Validations
    // ═══════════════════════════════════════════════════════════════════════

    public function testRegister_invalidEmail_returns422(): void
    {
        $client = static::createClient();

        $result = $this->requestJson($client, 'POST', '/api/register', $this->validRegisterPayload([
            'email' => 'pas-un-email',
        ]));

        self::assertSame(422, $result['status']);
        self::assertArrayHasKey('error', $result['body']);
    }

    public function testRegister_weakPassword_returns422WithPasswordErrorCodes(): void
    {
        $client = static::createClient();

        $result = $this->requestJson($client, 'POST', '/api/register', $this->validRegisterPayload([
            'password' => 'court1', // trop court, sans majuscule
        ]));

        self::assertSame(422, $result['status']);
        self::assertArrayHasKey('errors', $result['body']);
        self::assertContains('too_short', $result['body']['errors']['password']);
        self::assertContains('missing_uppercase', $result['body']['errors']['password']);
    }

    public function testRegister_missingFirstName_returns422(): void
    {
        $client = static::createClient();

        $result = $this->requestJson($client, 'POST', '/api/register', $this->validRegisterPayload([
            'firstName' => '',
        ]));

        self::assertSame(422, $result['status']);
    }

    public function testRegister_duplicateEmail_returns409AndDoesNotCreateASecondUser(): void
    {
        $client = static::createClient();
        $email = 'duplicate_' . uniqid('', true) . '@example.test';

        $first = $this->requestJson($client, 'POST', '/api/register', $this->validRegisterPayload(['email' => $email]));
        self::assertSame(Response::HTTP_CREATED, $first['status']);
        $this->createdUserIds[] = $first['body']['user']['id'];

        $second = $this->requestJson($client, 'POST', '/api/register', $this->validRegisterPayload(['email' => $email]));

        self::assertSame(Response::HTTP_CONFLICT, $second['status']);

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $count = $em->getRepository(User::class)->count(['email' => $email]);
        self::assertSame(1, $count, 'Il ne doit JAMAIS y avoir deux comptes avec le même email.');
    }

    public function testRegister_passwordIsNeverReturnedInClearInTheResponse(): void
    {
        // Garde-fou volontairement "bête" mais important : même par erreur
        // de sérialisation future (ex: quelqu'un ajoute "...$user" en vrac
        // dans le tableau de réponse), ce test doit immédiatement échouer.
        $client = static::createClient();

        $payload = $this->validRegisterPayload();
        $result = $this->requestJson($client, 'POST', '/api/register', $payload);
        $this->createdUserIds[] = $result['body']['user']['id'];

        self::assertArrayNotHasKey('password', $result['body']['user']);
        self::assertStringNotContainsString($payload['password'], (string) $client->getResponse()->getContent());
    }

    private static function assertUserCreatedAndGetHighestRole(int $userId): string
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $user = $em->getRepository(User::class)->find($userId);

        self::assertNotNull($user, 'Le user doit exister réellement en base, pas juste dans la réponse JSON.');

        return $user->getHighestRole();
    }
}
