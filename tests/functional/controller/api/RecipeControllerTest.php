<?php

namespace App\Tests\Functional\Controller\Api;

use App\Entity\Ingredient;
use App\Entity\Recipe;
use App\Entity\RecipeIngredient;
use App\Entity\User;
use App\Enums\RecipeType;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tests FONCTIONNELS (pas unitaires) : on démarre le vrai kernel Symfony,
 * on passe par le vrai firewall JWT, et on écrit/lit dans une vraie base de
 * données de test. On ne peut pas faire autrement ici : ce qu'on vérifie
 * (transaction, orphanRemoval, diff d'ingrédients…) est un comportement de
 * Doctrine, pas une règle métier isolable.
 *
 * ⚠️ PRÉREQUIS, à adapter si votre environnement diffère :
 *   1. Une base de test existe et son schéma est à jour :
 *        php bin/console doctrine:database:create --env=test --if-not-exists
 *        php bin/console doctrine:schema:update --env=test --force
 *      (ou vos migrations, si vous en avez une dédiée au schéma de test)
 *   2. Le bundle JWT est configuré en env de test comme en dev (clés RSA
 *      présentes, cf. config/packages/lexik_jwt_authentication.yaml).
 *   3. tests/ est bien mappé sur le namespace App\Tests\ dans composer.json
 *      (autoload-dev → c'est le cas par défaut avec le skeleton Symfony).
 *
 * Je n'ai pas pu exécuter ces tests dans mon environnement (pas de PHP
 * disponible ici) : relisez-les comme une proposition sérieuse mais à
 * valider avec `php bin/phpunit` chez vous, pas comme un fait acquis.
 *
 * STRATÉGIE D'ISOLATION DES DONNÉES :
 * Je ne dépends d'AUCUNE fixture existante (ni UserFixture, ni
 * IngredientsFixture) : chaque test crée ses propres User/Ingredient avec un
 * identifiant unique (uniqid()), et tearDown() nettoie tout ce qui a été créé.
 * Pourquoi : dépendre de fixtures partagées rend les tests fragiles (un autre
 * test ou un dev qui modifie les fixtures casse silencieusement celui-ci) et
 * les empêche de tourner en parallèle (paratest, cf. "TEST_TOKEN" dans
 * doctrine.yaml) sans collisions d'ID.
 */
final class RecipeControllerTest extends WebTestCase
{
    /** @var int[] */
    private array $createdRecipeIds = [];
    /** @var int[] */
    private array $createdIngredientIds = [];
    /** @var int[] */
    private array $createdUserIds = [];

    protected function tearDown(): void
    {
        // On va chercher un EntityManager FRAIS, pas une référence gardée
        // depuis le début du test : le client de test redémarre le kernel
        // (donc le container, donc l'EntityManager) à chaque requête HTTP
        // par défaut. Réutiliser une vieille instance ici planterait
        // ("EntityManager is closed") ou agirait sur une connexion fermée.
        $em = $this->entityManager();

        // Ordre important : les Recipe d'abord (cascade automatiquement vers
        // Step, RecipeIngredient et PhotoCollection — voir les annotations
        // cascade/orphanRemoval sur Recipe.php), puis seulement ensuite les
        // Ingredient (sinon : violation de contrainte de clé étrangère si un
        // RecipeIngredient les référence encore).
        foreach ($this->createdRecipeIds as $id) {
            if ($recipe = $em->getRepository(Recipe::class)->find($id)) {
                $em->remove($recipe);
            }
        }
        $em->flush();

        foreach ($this->createdIngredientIds as $id) {
            if ($ingredient = $em->getRepository(Ingredient::class)->find($id)) {
                $em->remove($ingredient);
            }
        }
        foreach ($this->createdUserIds as $id) {
            if ($user = $em->getRepository(User::class)->find($id)) {
                $em->remove($user);
            }
        }
        $em->flush();

        parent::tearDown();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Helpers d'arrangement (Arrange)
    // ═══════════════════════════════════════════════════════════════════════

    private function entityManager(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    private function createUser(array $roles = ['ROLE_USER']): User
    {
        $em = $this->entityManager();

        $user = new User();
        $user->setEmail('test_' . uniqid('', true) . '@example.test');
        $user->setFirstName('Test');
        $user->setLastName('User');
        $user->setRoles($roles);
        $user->setCreatedAt(time());
        // Le mot de passe n'est jamais vérifié par ce flux (on génère le JWT
        // directement, sans passer par /api/login) : une valeur arbitraire
        // suffit, la colonne n'est juste pas nullable.
        $user->setPassword('not-used-in-tests');

        $em->persist($user);
        $em->flush();

        $this->createdUserIds[] = $user->getId();

        return $user;
    }

    private function createIngredient(string $label, ?string $unit = 'g'): Ingredient
    {
        $em = $this->entityManager();

        $ingredient = new Ingredient();
        $ingredient->setLabel($label . ' ' . uniqid('', true)); // unique : évite les collisions inter-tests
        if ($unit !== null) {
            $ingredient->setUnit($unit);
        }

        $em->persist($ingredient);
        $em->flush();

        $this->createdIngredientIds[] = $ingredient->getId();

        return $ingredient;
    }

    /**
     * Crée un client de test authentifié comme $user, en générant directement
     * un JWT via le service du bundle Lexik — exactement ce que fait
     * AuthController::register() après un login réussi. On évite ainsi un
     * aller-retour HTTP supplémentaire vers /api/login juste pour obtenir un
     * jeton.
     */
    private function authenticatedClient(User $user): KernelBrowser
    {
        $client = static::createClient();

        $token = static::getContainer()
            ->get(JWTTokenManagerInterface::class)
            ->create($user);

        $client->setServerParameter('HTTP_AUTHORIZATION', 'Bearer ' . $token);

        return $client;
    }

    /** @return array{status:int, body:array} */
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

    private function defaultRecipePayload(array $overrides = []): array
    {
        return array_merge([
            'title'    => 'Recette de test',
            'nbPeople' => 4,
            'type'     => RecipeType::PLATE->value,
            'prepTime' => 10,
        ], $overrides);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // POST /api/recipes
    // ═══════════════════════════════════════════════════════════════════════

    public function testCreate_withStepsAndIngredients_persistsEverything(): void
    {
        $user = $this->createUser();
        $tomate = $this->createIngredient('Tomate', 'g');
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'POST', '/api/recipes', $this->defaultRecipePayload([
            'tips'  => "Astuce 1\nAstuce 2",
            'steps' => [
                ['index' => 1, 'description' => 'Laver les tomates'],
                ['index' => 2, 'description' => 'Couper les tomates en rondelles'],
            ],
            'ingredients' => [
                ['ingredientId' => $tomate->getId(), 'amount' => 1.5],
            ],
        ]));

        self::assertSame(Response::HTTP_CREATED, $result['status'], print_r($result['body'], true));
        $this->createdRecipeIds[] = $result['body']['id'];

        self::assertCount(2, $result['body']['steps']);
        self::assertSame('Laver les tomates', $result['body']['steps'][0]['description']);
        self::assertCount(1, $result['body']['ingredients']);
        self::assertSame(1.5, $result['body']['ingredients'][0]['amount']);

        // On ne fait pas QUE confiance à la réponse HTTP : on relit en base,
        // via un EntityManager "propre" (clear() vide le cache d'identité),
        // pour prouver que c'est vraiment persisté et pas juste renvoyé par
        // erreur sans avoir été sauvegardé.
        $em = $this->entityManager();
        $em->clear();
        $recipe = $em->getRepository(Recipe::class)->find($result['body']['id']);
        self::assertNotNull($recipe);
        self::assertCount(2, $recipe->getSteps());
        self::assertCount(1, $recipe->getIngredients());
    }

    public function testCreate_withUnknownIngredientId_returns422WithFieldError(): void
    {
        $user = $this->createUser();
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'POST', '/api/recipes', $this->defaultRecipePayload([
            'ingredients' => [['ingredientId' => 999_999_999, 'amount' => 1]],
        ]));

        self::assertSame(Response::HTTP_UNPROCESSABLE_ENTITY, $result['status']);
        self::assertArrayHasKey('ingredients[0].ingredientId', $result['body']['errors']);
    }

    public function testCreate_withBlankStepDescription_returns422(): void
    {
        $user = $this->createUser();
        $client = $this->authenticatedClient($user);

        $result = $this->requestJson($client, 'POST', '/api/recipes', $this->defaultRecipePayload([
            'steps' => [['index' => 1, 'description' => '   ']],
        ]));

        self::assertSame(Response::HTTP_UNPROCESSABLE_ENTITY, $result['status']);
        self::assertArrayHasKey('steps[0].description', $result['body']['errors']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUT /api/recipes/{id} — c'est ici qu'on valide le point 3 du récap
    // ═══════════════════════════════════════════════════════════════════════

    public function testUpdate_replacingSteps_deletesOldStepsAndPersistsNewOnes(): void
    {
        $user = $this->createUser();
        $client = $this->authenticatedClient($user);

        $created = $this->requestJson($client, 'POST', '/api/recipes', $this->defaultRecipePayload([
            'steps' => [
                ['index' => 1, 'description' => 'Ancienne étape 1'],
                ['index' => 2, 'description' => 'Ancienne étape 2'],
            ],
        ]));
        $recipeId = $created['body']['id'];
        $this->createdRecipeIds[] = $recipeId;

        $updated = $this->requestJson($client, 'PUT', "/api/recipes/{$recipeId}", [
            'steps' => [['index' => 1, 'description' => 'Étape unique de remplacement']],
        ]);

        self::assertSame(Response::HTTP_OK, $updated['status'], print_r($updated['body'], true));
        self::assertCount(1, $updated['body']['steps']);
        self::assertSame('Étape unique de remplacement', $updated['body']['steps'][0]['description']);

        // Preuve que c'est l'ORPHAN REMOVAL qui a bien fait le ménage en base
        // (et pas juste une collection PHP modifiée en mémoire sans flush réel) :
        $em = $this->entityManager();
        $em->clear();
        $recipe = $em->getRepository(Recipe::class)->find($recipeId);
        self::assertCount(1, $recipe->getSteps());
    }

    public function testUpdate_omittingStepsKey_leavesExistingStepsUntouched(): void
    {
        $user = $this->createUser();
        $client = $this->authenticatedClient($user);

        $created = $this->requestJson($client, 'POST', '/api/recipes', $this->defaultRecipePayload([
            'steps' => [['index' => 1, 'description' => 'Étape qui ne doit pas bouger']],
        ]));
        $recipeId = $created['body']['id'];
        $this->createdRecipeIds[] = $recipeId;

        // On n'envoie PAS la clé "steps" du tout — seulement un nouveau titre.
        $updated = $this->requestJson($client, 'PUT', "/api/recipes/{$recipeId}", [
            'title' => 'Nouveau titre, rien dautre',
        ]);

        self::assertSame(Response::HTTP_OK, $updated['status']);
        self::assertCount(1, $updated['body']['steps']);
        self::assertSame('Étape qui ne doit pas bouger', $updated['body']['steps'][0]['description']);
    }

    public function testUpdate_withExplicitEmptyStepsArray_deletesAllSteps(): void
    {
        $user = $this->createUser();
        $client = $this->authenticatedClient($user);

        $created = $this->requestJson($client, 'POST', '/api/recipes', $this->defaultRecipePayload([
            'steps' => [['index' => 1, 'description' => 'Étape destinée à disparaître']],
        ]));
        $recipeId = $created['body']['id'];
        $this->createdRecipeIds[] = $recipeId;

        // Ici, "steps" EST présent, mais vide : sémantique "supprime tout".
        $updated = $this->requestJson($client, 'PUT', "/api/recipes/{$recipeId}", [
            'steps' => [],
        ]);

        self::assertSame(Response::HTTP_OK, $updated['status']);
        self::assertSame([], $updated['body']['steps']);
    }

    public function testUpdate_diffsIngredients_preservesUnchangedRowUpdatesAmountAndRemovesDropped(): void
    {
        $user = $this->createUser();
        $carotte = $this->createIngredient('Carotte');
        $poireau = $this->createIngredient('Poireau');
        $celeri  = $this->createIngredient('Céleri');
        $client = $this->authenticatedClient($user);

        $created = $this->requestJson($client, 'POST', '/api/recipes', $this->defaultRecipePayload([
            'ingredients' => [
                ['ingredientId' => $carotte->getId(), 'amount' => 2],
                ['ingredientId' => $poireau->getId(), 'amount' => 1],
            ],
        ]));
        $recipeId = $created['body']['id'];
        $this->createdRecipeIds[] = $recipeId;

        // On capture l'ID de la ligne RecipeIngredient "carotte" AVANT update,
        // pour prouver après coup qu'elle a été MISE À JOUR (pas supprimée
        // puis recréée avec un nouvel ID).
        $em = $this->entityManager();
        $carrotRowBefore = $em->getRepository(RecipeIngredient::class)->findOneBy([
            'recipe'     => $recipeId,
            'ingredient' => $carotte->getId(),
        ]);
        self::assertNotNull($carrotRowBefore);
        $carrotRowId = $carrotRowBefore->getId();

        // On garde la carotte (quantité modifiée), on retire le poireau,
        // on ajoute le céleri.
        $updated = $this->requestJson($client, 'PUT', "/api/recipes/{$recipeId}", [
            'ingredients' => [
                ['ingredientId' => $carotte->getId(), 'amount' => 3],
                ['ingredientId' => $celeri->getId(), 'amount' => 1],
            ],
        ]);

        self::assertSame(Response::HTTP_OK, $updated['status'], print_r($updated['body'], true));

        $responseIngredientIds = array_column($updated['body']['ingredients'], 'ingredientId');
        self::assertContains($carotte->getId(), $responseIngredientIds);
        self::assertContains($celeri->getId(), $responseIngredientIds);
        self::assertNotContains($poireau->getId(), $responseIngredientIds, 'Le poireau retiré du payload doit disparaître.');

        $em->clear();

        $carrotRowAfter = $em->getRepository(RecipeIngredient::class)->findOneBy([
            'recipe'     => $recipeId,
            'ingredient' => $carotte->getId(),
        ]);
        self::assertNotNull($carrotRowAfter);
        self::assertSame($carrotRowId, $carrotRowAfter->getId(), 'La ligne carotte doit être RÉUTILISÉE (diff), pas recréée.');
        self::assertSame(3.0, $carrotRowAfter->getAmount());

        $leekRowAfter = $em->getRepository(RecipeIngredient::class)->findOneBy([
            'recipe'     => $recipeId,
            'ingredient' => $poireau->getId(),
        ]);
        self::assertNull($leekRowAfter, 'La ligne poireau doit avoir été réellement supprimée en base (pas juste détachée en mémoire).');
    }

    public function testUpdate_byNonOwnerWithoutAdminRole_isForbidden(): void
    {
        $owner = $this->createUser();
        $intruder = $this->createUser(); // simple ROLE_USER, pas admin

        $ownerClient = $this->authenticatedClient($owner);
        $created = $this->requestJson($ownerClient, 'POST', '/api/recipes', $this->defaultRecipePayload());
        $recipeId = $created['body']['id'];
        $this->createdRecipeIds[] = $recipeId;

        $intruderClient = $this->authenticatedClient($intruder);
        $result = $this->requestJson($intruderClient, 'PUT', "/api/recipes/{$recipeId}", [
            'title' => 'Je ne suis pas le propriétaire',
        ]);

        self::assertSame(Response::HTTP_FORBIDDEN, $result['status']);
    }

    public function testUpdate_byAdmin_isAllowedEvenWhenNotOwner(): void
    {
        $owner = $this->createUser();
        $admin = $this->createUser(['ROLE_ADMIN']);

        $ownerClient = $this->authenticatedClient($owner);
        $created = $this->requestJson($ownerClient, 'POST', '/api/recipes', $this->defaultRecipePayload());
        $recipeId = $created['body']['id'];
        $this->createdRecipeIds[] = $recipeId;

        $adminClient = $this->authenticatedClient($admin);
        $result = $this->requestJson($adminClient, 'PUT', "/api/recipes/{$recipeId}", [
            'title' => 'Corrigé par un admin',
        ]);

        self::assertSame(Response::HTTP_OK, $result['status']);
        self::assertSame('Corrigé par un admin', $result['body']['title']);
    }
}
