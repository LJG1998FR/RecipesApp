<?php

namespace App\Tests\Unit\Controller\Api;

use App\Controller\Api\IngredientController;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;
use Symfony\Component\HttpFoundation\Request;

/**
 * Mêmes principes que RecipeControllerValidationTest : on isole les méthodes
 * PRIVÉES et PURES d'IngredientController (validateIngredientData,
 * getPaginationParams, buildPaginationMeta) de tout ce qui a besoin d'une
 * vraie base de données (repository, EntityManager, Security). On instancie
 * le contrôleur sans passer par son constructeur pour le prouver : si un
 * jour une de ces méthodes se met à utiliser $this->em, ce fichier plantera
 * immédiatement — c'est voulu, c'est le signal qu'il faut revoir la
 * conception (extraire un service plutôt que de garder la logique dans le
 * contrôleur).
 */
final class IngredientControllerValidationTest extends TestCase
{
    private IngredientController $controller;

    protected function setUp(): void
    {
        $this->controller = (new ReflectionClass(IngredientController::class))
            ->newInstanceWithoutConstructor();
    }

    private function invokePrivate(string $method, array $args = []): mixed
    {
        $reflectionMethod = new ReflectionMethod($this->controller, $method);
        $reflectionMethod->setAccessible(true);

        return $reflectionMethod->invokeArgs($this->controller, $args);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // validateIngredientData()
    // ═══════════════════════════════════════════════════════════════════════

    public function testValidateIngredientData_creationWithLabel_returnsNoErrors(): void
    {
        $errors = $this->invokePrivate('validateIngredientData', [
            ['label' => 'Farine', 'unit' => 'g'],
            true,
        ]);

        self::assertSame([], $errors);
    }

    public function testValidateIngredientData_creationWithoutUnit_isAllowed(): void
    {
        // L'unité est OPTIONNELLE (cf. Ingredient::unit nullable:true en DB) :
        // un ingrédient compté à l'unité ("3 œufs") n'a pas besoin d'une unité.
        $errors = $this->invokePrivate('validateIngredientData', [
            ['label' => 'Œuf'],
            true,
        ]);

        self::assertArrayNotHasKey('unit', $errors);
    }

    public function testValidateIngredientData_creationMissingLabel_isRejected(): void
    {
        $errors = $this->invokePrivate('validateIngredientData', [[], true]);

        self::assertArrayHasKey('label', $errors);
    }

    public function testValidateIngredientData_creationBlankLabel_isRejected(): void
    {
        // Des espaces uniquement ne doivent pas compter comme "rempli" —
        // la méthode fait un trim() avant de tester la vacuité.
        $errors = $this->invokePrivate('validateIngredientData', [
            ['label' => '   '],
            true,
        ]);

        self::assertArrayHasKey('label', $errors);
    }

    public function testValidateIngredientData_update_emptyPayload_isValid(): void
    {
        // En update (isCreation = false), ne rien envoyer = ne rien changer :
        // ce n'est PAS une erreur, contrairement à la création.
        $errors = $this->invokePrivate('validateIngredientData', [[], false]);

        self::assertSame([], $errors);
    }

    public function testValidateIngredientData_labelAtExactly255Characters_isAccepted(): void
    {
        $errors = $this->invokePrivate('validateIngredientData', [
            ['label' => str_repeat('a', 255)],
            false,
        ]);

        self::assertArrayNotHasKey('label', $errors);
    }

    public function testValidateIngredientData_labelOver255Characters_isRejected(): void
    {
        $errors = $this->invokePrivate('validateIngredientData', [
            ['label' => str_repeat('a', 256)],
            false,
        ]);

        self::assertArrayHasKey('label', $errors);
    }

    public function testValidateIngredientData_unitOver255Characters_isRejected(): void
    {
        $errors = $this->invokePrivate('validateIngredientData', [
            ['unit' => str_repeat('a', 256)],
            false,
        ]);

        self::assertArrayHasKey('unit', $errors);
    }

    public function testValidateIngredientData_unitExplicitlyNull_isAccepted(): void
    {
        // "unit": null doit pouvoir servir à EFFACER l'unité d'un ingrédient
        // existant en update — à ne pas confondre avec "unit" absent (= ne
        // pas toucher au champ).
        $errors = $this->invokePrivate('validateIngredientData', [
            ['unit' => null],
            false,
        ]);

        self::assertArrayNotHasKey('unit', $errors);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // getPaginationParams() — protection contre un `limit` arbitraire envoyé
    // par le client (ex: ?limit=99999 forcerait Doctrine à tout charger)
    // ═══════════════════════════════════════════════════════════════════════

    public function testGetPaginationParams_defaults_whenNoQueryParams(): void
    {
        [$page, $limit] = $this->invokePrivate('getPaginationParams', [new Request()]);

        self::assertSame(1, $page);
        self::assertSame(20, $limit);
    }

    public function testGetPaginationParams_negativePage_fallsBackToOne(): void
    {
        $request = new Request(query: ['page' => '-5']);

        [$page] = $this->invokePrivate('getPaginationParams', [$request]);

        self::assertSame(1, $page);
    }

    /** @dataProvider provideAllowedLimits */
    public function testGetPaginationParams_allowedLimit_isKeptAsIs(int $allowedLimit): void
    {
        $request = new Request(query: ['limit' => (string) $allowedLimit]);

        [, $limit] = $this->invokePrivate('getPaginationParams', [$request]);

        self::assertSame($allowedLimit, $limit);
    }

    public static function provideAllowedLimits(): array
    {
        return ['10' => [10], '20' => [20], '50' => [50]];
    }

    public function testGetPaginationParams_arbitraryLimit_fallsBackToTwenty(): void
    {
        // Le client ne contrôle PAS librement combien de lignes il peut
        // faire charger au serveur en une requête — seule une liste fermée
        // de valeurs est acceptée. C'est le comportement à défendre ici.
        $request = new Request(query: ['limit' => '99999']);

        [, $limit] = $this->invokePrivate('getPaginationParams', [$request]);

        self::assertSame(20, $limit);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // buildPaginationMeta()
    // ═══════════════════════════════════════════════════════════════════════

    public function testBuildPaginationMeta_computesTotalPagesByRoundingUp(): void
    {
        // 45 éléments, 20 par page → 3 pages (20 + 20 + 5), pas 2 : on vérifie
        // qu'on arrondit AU-DESSUS (ceil), sinon les 5 derniers éléments
        // seraient invisibles pour le client.
        $meta = $this->invokePrivate('buildPaginationMeta', [1, 20, 45]);

        self::assertSame(3, $meta['totalPages']);
    }

    public function testBuildPaginationMeta_zeroTotal_givesZeroPages(): void
    {
        $meta = $this->invokePrivate('buildPaginationMeta', [1, 20, 0]);

        self::assertSame(0, $meta['totalPages']);
    }
}
