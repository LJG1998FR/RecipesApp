<?php

namespace App\Tests\Unit\Controller\Api;

use App\Controller\Api\RecipeController;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;

/**
 * VRAIS tests unitaires : pas de kernel Symfony, pas de base de données,
 * pas de requête HTTP. On instancie RecipeController SANS passer par son
 * constructeur (il n'en a pas besoin : les méthodes testées ici ne touchent
 * ni $this->em, ni $this->security, ni aucun repository).
 *
 * Pourquoi c'est possible : validateRecipeData(), validateSteps(),
 * validateIngredients() et splitTips() sont des fonctions PURES — leur
 * résultat ne dépend que de leurs paramètres. C'est exactement le genre
 * de code qu'on doit pouvoir tester en isolation totale.
 *
 * Si l'une de ces méthodes se mettait un jour à utiliser $this->em, ce
 * fichier planterait avec une erreur "Typed property must not be accessed
 * before initialization" — ce serait le signal qu'il faut soit revenir en
 * arrière, soit extraire la logique dans un service injectable testable
 * séparément.
 */
final class RecipeControllerValidationTest extends TestCase
{
    private RecipeController $controller;

    protected function setUp(): void
    {
        // newInstanceWithoutConstructor() : on obtient un objet RecipeController
        // valide en mémoire, sans jamais exécuter son __construct(). Les 5
        // propriétés readonly (recipeRepository, em, security…) restent
        // "non initialisées" — ce qui est précisément voulu : on ne va jamais
        // les lire.
        $this->controller = (new ReflectionClass(RecipeController::class))
            ->newInstanceWithoutConstructor();
    }

    /**
     * Appelle une méthode PRIVATE du contrôleur via la Réflexion.
     * C'est un compromis pragmatique : en toute rigueur, on ne devrait tester
     * que l'API publique d'une classe. Ici on fait une exception volontaire
     * parce que ces helpers sont assez complexes (plusieurs règles de
     * validation) pour mériter des tests dédiés, sans pour autant les rendre
     * publics juste pour les tests (ce qui polluerait l'API du contrôleur).
     */
    private function invokePrivate(string $method, array $args = []): mixed
    {
        $reflectionMethod = new ReflectionMethod($this->controller, $method);
        $reflectionMethod->setAccessible(true); // no-op depuis PHP 8.1, inoffensif avant

        return $reflectionMethod->invokeArgs($this->controller, $args);
    }

    /** Lit une constante PRIVATE de la classe, pour ne jamais dupliquer "en dur" un seuil métier. */
    private function constant(string $name): mixed
    {
        return (new ReflectionClass(RecipeController::class))->getConstant($name);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // validateRecipeData()
    // ═══════════════════════════════════════════════════════════════════════

    public function testValidateRecipeData_creationWithAllRequiredFields_returnsNoErrors(): void
    {
        $errors = $this->invokePrivate('validateRecipeData', [
            ['title' => 'Tarte', 'nbPeople' => 4, 'type' => 'Desserts', 'prepTime' => 20],
            true, // isCreation
        ]);

        self::assertSame([], $errors);
    }

    public function testValidateRecipeData_creationMissingRequiredFields_listsEachOne(): void
    {
        $errors = $this->invokePrivate('validateRecipeData', [[], true]);

        // On vérifie les CLÉS, pas le texte exact des messages : si quelqu'un
        // reformule un message d'erreur demain, ce test ne doit pas casser
        // pour autant — seul le champ fautif importe pour le contrat API.
        self::assertArrayHasKey('title', $errors);
        self::assertArrayHasKey('nbPeople', $errors);
        self::assertArrayHasKey('type', $errors);
        self::assertArrayHasKey('prepTime', $errors);
    }

    public function testValidateRecipeData_update_doesNotRequireAnyField(): void
    {
        // En update (isCreation: false), un objet vide est valide :
        // "aucune clé" = "je ne modifie rien" (cf. la sémantique de update()).
        $errors = $this->invokePrivate('validateRecipeData', [[], false]);

        self::assertSame([], $errors);
    }

    /** @dataProvider provideInvalidNbPeople */
    public function testValidateRecipeData_rejectsInvalidNbPeople(mixed $value): void
    {
        $errors = $this->invokePrivate('validateRecipeData', [
            ['nbPeople' => $value],
            false,
        ]);

        self::assertArrayHasKey('nbPeople', $errors);
    }

    public static function provideInvalidNbPeople(): array
    {
        return [
            'zero'          => [0],
            'negative'      => [-1],
            'non-numeric'   => ['beaucoup'],
        ];
    }

    public function testValidateRecipeData_cookingTimeNull_isAccepted(): void
    {
        // null = "pas de temps de cuisson" (recette froide) : doit être autorisé,
        // contrairement à une valeur négative.
        $errors = $this->invokePrivate('validateRecipeData', [
            ['cookingTime' => null],
            false,
        ]);

        self::assertArrayNotHasKey('cookingTime', $errors);
    }

    public function testValidateRecipeData_cookingTimeNegative_isRejected(): void
    {
        $errors = $this->invokePrivate('validateRecipeData', [
            ['cookingTime' => -5],
            false,
        ]);

        self::assertArrayHasKey('cookingTime', $errors);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // validateSteps()
    // ═══════════════════════════════════════════════════════════════════════

    public function testValidateSteps_validSequentialSteps_returnsNoErrors(): void
    {
        $errors = $this->invokePrivate('validateSteps', [
            [
                ['index' => 1, 'description' => 'Laver les tomates'],
                ['index' => 2, 'description' => 'Couper les tomates en rondelles'],
            ],
            true, // allowManualIndex
        ]);

        self::assertSame([], $errors);
    }

    public function testValidateSteps_blankDescription_isRejected(): void
    {
        $errors = $this->invokePrivate('validateSteps', [
            [['index' => 1, 'description' => '   ']], // uniquement des espaces
            true,
        ]);

        self::assertArrayHasKey('steps[0].description', $errors);
    }

    public function testValidateSteps_descriptionAtExactLimit_isAccepted(): void
    {
        $maxLength = $this->constant('MAX_STEP_LENGTH');

        $errors = $this->invokePrivate('validateSteps', [
            [['index' => 1, 'description' => str_repeat('a', $maxLength)]],
            true,
        ]);

        self::assertSame([], $errors, "Une description de exactement {$maxLength} caractères doit passer.");
    }

    public function testValidateSteps_descriptionOneCharacterOverLimit_isRejected(): void
    {
        $maxLength = $this->constant('MAX_STEP_LENGTH');

        $errors = $this->invokePrivate('validateSteps', [
            [['index' => 1, 'description' => str_repeat('a', $maxLength + 1)]],
            true,
        ]);

        self::assertArrayHasKey('steps[0].description', $errors);
    }

    public function testValidateSteps_missingIndexWhenManualIndexRequired_isRejected(): void
    {
        $errors = $this->invokePrivate('validateSteps', [
            [['description' => 'Étape sans index']],
            true,
        ]);

        self::assertArrayHasKey('steps[0].index', $errors);
    }

    public function testValidateSteps_duplicateIndex_isRejected(): void
    {
        $errors = $this->invokePrivate('validateSteps', [
            [
                ['index' => 1, 'description' => 'Première'],
                ['index' => 1, 'description' => 'Deuxième, mais même index'],
            ],
            true,
        ]);

        // Seule la SECONDE occurrence est fautive : la première qui "prend" l'index est valide.
        self::assertArrayNotHasKey('steps[0].index', $errors);
        self::assertArrayHasKey('steps[1].index', $errors);
    }

    public function testValidateSteps_whenManualIndexNotRequired_indexIsIgnored(): void
    {
        // ⚠️ CONSTAT CRITIQUE (pas un bug, mais une zone grise à documenter) :
        // ce chemin (allowManualIndex = false) n'est en réalité appelé par
        // AUCUNE des deux méthodes publiques add()/update() du contrôleur
        // actuel — elles passent toutes les deux `true`. Ce test garantit que
        // le comportement reste correct SI ce paramètre était un jour
        // réutilisé (ex. un futur endpoint qui génère l'index automatiquement),
        // mais il documente aussi explicitement que ce code est actuellement
        // "mort" du point de vue de l'API HTTP. À surveiller / nettoyer.
        $errors = $this->invokePrivate('validateSteps', [
            [['description' => 'Étape sans index, et ce n’est pas grave ici']],
            false,
        ]);

        self::assertArrayNotHasKey('steps[0].index', $errors);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // validateIngredients()
    // ═══════════════════════════════════════════════════════════════════════

    public function testValidateIngredients_validList_returnsNoErrors(): void
    {
        $errors = $this->invokePrivate('validateIngredients', [
            [['ingredientId' => 38, 'amount' => 1]],
        ]);

        self::assertSame([], $errors);
    }

    public function testValidateIngredients_acceptsFloatAmountAboveOne(): void
    {
        // Spec explicite : "on accepte un float ≥ 1".
        $errors = $this->invokePrivate('validateIngredients', [
            [['ingredientId' => 38, 'amount' => 1.5]],
        ]);

        self::assertSame([], $errors);
    }

    public function testValidateIngredients_amountBelowMinimum_isRejected(): void
    {
        $minAmount = $this->constant('MIN_AMOUNT');

        $errors = $this->invokePrivate('validateIngredients', [
            [['ingredientId' => 38, 'amount' => $minAmount - 0.5]],
        ]);

        self::assertArrayHasKey('ingredients[0].amount', $errors);
    }

    public function testValidateIngredients_missingIngredientId_isRejected(): void
    {
        $errors = $this->invokePrivate('validateIngredients', [
            [['amount' => 1]],
        ]);

        self::assertArrayHasKey('ingredients[0].ingredientId', $errors);
    }

    public function testValidateIngredients_duplicateIngredientId_isRejectedOnSecondOccurrence(): void
    {
        $errors = $this->invokePrivate('validateIngredients', [
            [
                ['ingredientId' => 38, 'amount' => 1],
                ['ingredientId' => 38, 'amount' => 2], // même ingrédient listé deux fois
            ],
        ]);

        self::assertArrayNotHasKey('ingredients[0].ingredientId', $errors);
        self::assertArrayHasKey('ingredients[1].ingredientId', $errors);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // splitTips() — régression du bug explode('\n', …) vs preg_split('/\R/', …)
    // ═══════════════════════════════════════════════════════════════════════

    public function testSplitTips_null_returnsEmptyArray(): void
    {
        self::assertSame([], $this->invokePrivate('splitTips', [null]));
    }

    public function testSplitTips_blankString_returnsEmptyArray(): void
    {
        self::assertSame([], $this->invokePrivate('splitTips', ["   \n  "]));
    }

    public function testSplitTips_unixLineBreaks_splitsCorrectly(): void
    {
        $result = $this->invokePrivate('splitTips', ["Astuce 1\nAstuce 2"]);

        self::assertSame(['Astuce 1', 'Astuce 2'], $result);
    }

    public function testSplitTips_windowsLineBreaks_splitsCorrectly(): void
    {
        // C'EST le test de non-régression du bug corrigé : l'ancien code
        // `explode('\n', $tips)` (guillemets simples) ne coupait JAMAIS rien,
        // qu'importe le format de saut de ligne. Si ce test échoue après une
        // future modification, c'est que le bug a été réintroduit.
        $result = $this->invokePrivate('splitTips', ["Astuce 1\r\nAstuce 2\r\nAstuce 3"]);

        self::assertSame(['Astuce 1', 'Astuce 2', 'Astuce 3'], $result);
    }

    public function testSplitTips_trimsEachLineAndDropsEmptyOnes(): void
    {
        $result = $this->invokePrivate('splitTips', ["  Astuce 1  \n\n   \nAstuce 2"]);

        self::assertSame(['Astuce 1', 'Astuce 2'], $result);
    }
}
