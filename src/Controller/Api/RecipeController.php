<?php

namespace App\Controller\Api;

use App\Entity\Ingredient;
use App\Entity\PhotoCollection;
use App\Entity\Recipe;
use App\Entity\RecipeIngredient;
use App\Entity\Step;
use App\Enums\RecipeType;
use App\Repository\IngredientRepository;
use App\Repository\RecipeRepository;
use App\Service\PhotoUploader;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

#[Route('/api/recipes', name: 'api_recipes_')]
class RecipeController extends AbstractController
{
    /** Doit rester aligné avec Step::$description (VARCHAR 255) */
    private const MAX_STEP_LENGTH = 255;

    /**
     * Quantité minimale d'un ingrédient.
     * ⚠️ Avec 1.0, "0,5 cuillère" est refusé. Si vous voulez autoriser les
     * fractions, passez à 0.01 ici ET à MIN_AMOUNT dans AddRecipePage.tsx.
     */
    private const MIN_AMOUNT = 1.0;

    public function __construct(
        private readonly RecipeRepository $recipeRepository,
        private readonly IngredientRepository $ingredientRepository,
        private readonly EntityManagerInterface $em,
        private readonly Security $security,
        private readonly PhotoUploader $photoUploader
    ) {}

    // ── GET /api/recipes ───────────────────────────────────────────────────────

    #[Route('', name: 'recipes_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $recipes = $this->recipeRepository->findAll();

        $data = array_map(fn(Recipe $r) => [
            'id'          => $r->getId(),
            'title'       => $r->getTitle(),
            'type'        => $r->getType()?->value,
            'nbPeople'    => $r->getNbPeople(),
            'prepTime'    => $r->getPrepTime(),
            'cookingTime' => $r->getCookingTime(),
            'createdAt'   => $r->getCreatedAt(),
            'tips'        => $this->splitTips($r->getTips()),
            'steps'       => $this->serializeSteps($r),
            'ingredients' => $r->getIngredients()->map(fn($ri) => [
                'id'           => $ri->getId(),
                'ingredientId' => $ri->getIngredient()?->getId(),
                'label'        => $ri->getIngredient()?->getLabel(),
                'unit'         => $ri->getIngredient()?->getUnit(),
                'amount'       => $ri->getAmount(),
            ])->toArray(),
        ], $recipes);

        return $this->json($data, Response::HTTP_OK);
    }

    // ── GET /api/recipes/{id} ──────────────────────────────────────────────────

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => '\d+'])]
public function show(int $id): JsonResponse
    {
        $recipe = $this->recipeRepository->find($id);
 
        if (!$recipe) {
            return $this->json(
                ['error' => "Recipe with id $id not found."],
                Response::HTTP_NOT_FOUND,
            );
        }
 
        return $this->json([
            'id'          => $recipe->getId(),
            'title'       => $recipe->getTitle(),
            'type'        => $recipe->getType()?->value,
            'nbPeople'    => $recipe->getNbPeople(),
            'prepTime'    => $recipe->getPrepTime(),
            'cookingTime' => $recipe->getCookingTime(),
            // AJOUT nécessaire pour que le front sache afficher ou non le
            // bouton "Modifier" (comparaison avec l'utilisateur connecté).
            // Volontairement un simple id, pas un objet "canEdit" calculé ici :
            // la décision d'autorisation réelle reste de toute façon
            // uniquement tranchée côté back par canMutateRecipe() au moment
            // du PUT/DELETE — ceci ne sert qu'à l'AFFICHAGE, jamais à la
            // sécurité (le front ne doit jamais être la source de vérité
            // pour un contrôle d'accès).
            'userId'      => $recipe->getUser()?->getId(),
            'tips'        => $this->splitTips($recipe->getTips()),
            'steps'       => $this->serializeSteps($recipe),
            'ingredients' => $recipe->getIngredients()->map(fn($ri) => [
                'id'           => $ri->getId(),
                'ingredientId' => $ri->getIngredient()?->getId(),
                'label'        => $ri->getIngredient()?->getLabel(),
                'unit'         => $ri->getIngredient()?->getUnit(),
                'amount'       => $ri->getAmount(),
            ])->toArray(),
            'photos' => $recipe->getPhotoCollection()
                ? array_map(
                    fn($p) => ['id' => $p->getId(), 'position' => $p->getPosition(), 'url' => $this->photoUploader->publicPath($p)],
                    $recipe->getPhotoCollection()->getPhotos()->toArray(),
                )
                : [],
        ]);
    }

    // ── POST /api/recipes ──────────────────────────────────────────────────────
    //
    // Payload attendu :
    // {
    //   "title": "Tarte Tatin", "nbPeople": 4, "type": "Desserts",
    //   "prepTime": 20, "cookingTime": 35,                         (optionnel)
    //   "tips": "Astuce 1\nAstuce 2",                              (optionnel)
    //   "steps": [{ "index": 1, "description": "..." }],           (optionnel)
    //   "ingredients": [{ "ingredientId": 38, "amount": 1.5 }]     (optionnel)
    // }

    #[Route('', name: 'add', methods: ['POST'])]
    public function add(Request $request): JsonResponse
    {
        // Tout utilisateur authentifié peut créer une recette
        // (IS_AUTHENTICATED_FULLY est déjà garanti par le firewall)

        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON body.'], Response::HTTP_BAD_REQUEST);
        }

        // ── 1. Validation : on COLLECTE toutes les erreurs avant de répondre,
        //       pour que le front puisse tout afficher d'un coup.
        $errors = $this->validateRecipeData($data, isCreation: true);

        $stepsData = $data['steps'] ?? [];
        if (!is_array($stepsData)) {
            $errors['steps'] = 'steps must be an array.';
            $stepsData = [];
        } else {
            $errors += $this->validateSteps($stepsData, allowManualIndex: true);
        }

        $ingredientsData = $data['ingredients'] ?? [];
        if (!is_array($ingredientsData)) {
            $errors['ingredients'] = 'ingredients must be an array.';
            $ingredientsData = [];
        } else {
            $errors += $this->validateIngredients($ingredientsData);
        }

        if (isset($data['tips']) && !is_string($data['tips'])) {
            $errors['tips'] = 'tips must be a string.';
        }

        if (!empty($errors)) {
            return $this->json(['errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $type = RecipeType::tryFrom($data['type']);
        if (!$type) {
            return $this->json(
                ['errors' => ['type' => 'Invalid type. Allowed: ' . implode(', ', array_column(RecipeType::cases(), 'value'))]],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        // ── 2. Les ingredientId existent-ils vraiment en base ? ───────────────
        //       UNE seule requête (WHERE id IN (...)) plutôt qu'une par ingrédient.
        $ingredientsById = [];
        if (!empty($ingredientsData)) {
            $ids = array_map(fn($i) => (int) $i['ingredientId'], $ingredientsData);

            foreach ($this->ingredientRepository->findBy(['id' => $ids]) as $found) {
                $ingredientsById[$found->getId()] = $found;
            }

            foreach ($ingredientsData as $i => $ing) {
                if (!isset($ingredientsById[(int) $ing['ingredientId']])) {
                    $errors["ingredients[$i].ingredientId"] = "Ingredient {$ing['ingredientId']} does not exist.";
                }
            }

            if (!empty($errors)) {
                return $this->json(['errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        // ── 3. Création, dans UNE transaction : tout ou rien. ─────────────────
        //       Sans ça, un plantage en cours de route laisserait une recette
        //       sans étapes ni ingrédients en base.
        $recipe = new Recipe();
        $this->em->wrapInTransaction(function () use ($recipe, $data, $type, $stepsData, $ingredientsData, $ingredientsById) {
            $recipe->setTitle(trim($data['title']));
            $recipe->setNbPeople((int) $data['nbPeople']);
            $recipe->setType($type);
            $recipe->setPrepTime((int) $data['prepTime']);
            $recipe->setCookingTime(isset($data['cookingTime']) ? (int) $data['cookingTime'] : null);
            $recipe->setTips(isset($data['tips']) && trim($data['tips']) !== '' ? trim($data['tips']) : null);
            $recipe->setCreatedAt(time());
            $recipe->setUser($this->security->getUser());   // toujours lier au créateur

            // Collection de photos (vide) créée dès maintenant : persistée par cascade (Recipe.photoCollection)
            $photoCollection = new PhotoCollection();
            $photoCollection->setTitle($recipe->getTitle());
            $photoCollection->setSlugger(Uuid::v4()->toRfc4122());
            $recipe->setPhotoCollection($photoCollection);

            foreach ($stepsData as $s) {
                $step = new Step();
                $step->setIndex((int) $s['index']);
                $step->setDescription(trim($s['description']));
                $recipe->addStep($step);        // pose aussi $step->recipe
                $this->em->persist($step);      // Recipe.steps n'a PAS de cascade persist → obligatoire
            }

            foreach ($ingredientsData as $ing) {
                $ri = new RecipeIngredient();
                $ri->setIngredient($ingredientsById[(int) $ing['ingredientId']]);
                $ri->setAmount((float) $ing['amount']);
                $recipe->addRecipeIngredient($ri); // cascade persist déjà déclaré sur Recipe.recipeIngredients
            }

            $this->em->persist($recipe);
            // flush() est appelé automatiquement à la fin de wrapInTransaction
        });

        return $this->json($this->serialize($recipe), Response::HTTP_CREATED);
    }

    // ── PUT /api/recipes/{id} ──────────────────────────────────────────────────

    #[Route('/{id}', name: 'update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $recipe = $this->recipeRepository->find($id);

        if (!$recipe) {
            return $this->json(['error' => "Recipe $id not found."], Response::HTTP_NOT_FOUND);
        }

        // Autorisé si : propriétaire de la recette OU admin
        if (!$this->canMutateRecipe($recipe)) {
            return $this->json(['error' => 'Access denied.'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON body.'], Response::HTTP_BAD_REQUEST);
        }

        $errors = $this->validateRecipeData($data, isCreation: false);
        if (!empty($errors)) {
            return $this->json(['errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (isset($data['title']))       $recipe->setTitle(trim($data['title']));
        if (isset($data['nbPeople']))    $recipe->setNbPeople((int) $data['nbPeople']);
        if (isset($data['prepTime']))    $recipe->setPrepTime((int) $data['prepTime']);

        if (array_key_exists('cookingTime', $data)) {
            $recipe->setCookingTime($data['cookingTime'] !== null ? (int) $data['cookingTime'] : null);
        }

        if (array_key_exists('tips', $data)) {
            $recipe->setTips($data['tips']);
        }

        if (isset($data['type'])) {
            $type = RecipeType::tryFrom($data['type']);
            if (!$type) {
                return $this->json(
                    ['errors' => ['type' => 'Invalid type.']],
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                );
            }
            $recipe->setType($type);
        }

        // ── Steps : stratégie "remplace tout" ──────────────────────────────
        // orphanRemoval: true sur cette relation → Doctrine supprime les
        // anciennes lignes tout seul au flush(), pas de em->remove() à faire.
        if (array_key_exists('steps', $data) && is_array($data['steps'])) {

            foreach ($recipe->getSteps() as $existingStep) {
                $recipe->removeStep($existingStep);
            }

            foreach (array_values($data['steps']) as $i => $stepData) {
                $step = new Step();
                $step->setIndex((int) ($stepData['index'] ?? $i + 1));
                $step->setDescription(trim($stepData['description']));
                $recipe->addStep($step);
            }
        }

        // ── Ingrédients : remplace tout, association à des ingrédients existants ──
        // Le front envoie des ingredientId (choisis dans le catalogue), jamais de
        // nouveaux ingrédients à créer : l'API ne fait donc jamais de find-or-create.
        if (array_key_exists('ingredients', $data) && is_array($data['ingredients'])) {
            // ⚠️ Pas d'orphanRemoval sur recipeIngredients (cascade: ['remove']
            // uniquement) : suppression manuelle obligatoire, sinon les anciennes
            // lignes RecipeIngredient restent orphelines en base.
            foreach ($recipe->getIngredients() as $existingRi) {
                $recipe->removeRecipeIngredient($existingRi);
                $this->em->remove($existingRi);
            }

            foreach ($data['ingredients'] as $ingredientData) {
                $ingredient = $this->ingredientRepository->find((int) $ingredientData['ingredientId']);
                // On sait déjà (validation plus bas) que l'ingrédient existe,
                // mais on vérifie à nouveau par prudence (sécurité en profondeur).
                if (!$ingredient) {
                    continue;
                }

                $recipeIngredient = new RecipeIngredient();
                $recipeIngredient->setIngredient($ingredient);
                $recipeIngredient->setAmount((int) $ingredientData['amount']);
                $recipe->addRecipeIngredient($recipeIngredient);
            }
        }

        $this->em->flush();

        return $this->json($this->serialize($recipe), Response::HTTP_OK);
    }

    // ── DELETE /api/recipes/{id} ───────────────────────────────────────────────
    #[Route('/{id}', name: 'delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        $recipe = $this->recipeRepository->find($id);

        if (!$recipe) {
            return $this->json(['error' => "Recipe $id not found."], Response::HTTP_NOT_FOUND);
        }

        if (!$this->canMutateRecipe($recipe)) {
            return $this->json(['error' => 'Access denied.'], Response::HTTP_FORBIDDEN);
        }

        $this->em->remove($recipe);
        $this->em->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    // ── Helper : peut-on modifier/supprimer cette recette ? ────────────────────
    /**
     * Retourne true si :
     * - l'utilisateur connecté est le propriétaire de la recette
     * - OU l'utilisateur est ROLE_ADMIN (ou SUPER_ADMIN par héritage)
     *
     * Une recette sans propriétaire (créée en fixture) n'est modifiable
     * que par un admin.
     */
    private function canMutateRecipe(Recipe $recipe): bool
    {
        $currentUser = $this->security->getUser();

        $isOwner = $recipe->getUser() !== null && $recipe->getUser() === $currentUser;
        $isAdmin = $this->isGranted('ROLE_ADMIN');

        return $isOwner || $isAdmin;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Découpe le champ `tips` (TEXT en base) en tableau, une astuce par ligne.
     *
     * CORRECTION : l'ancien code faisait explode('\n', …). En PHP, les guillemets
     * SIMPLES n'interprètent pas les séquences d'échappement : '\n' = les deux
     * caractères "\" et "n", pas un saut de ligne → rien n'était jamais découpé.
     * preg_split('/\R/') gère en plus \r\n (Windows) et \n (Unix).
     *
     * @return list<string>
     */
    private function splitTips(?string $tips): array
    {
        if ($tips === null || trim($tips) === '') {
            return [];
        }

        $lines = preg_split('/\R/', $tips) ?: [];

        return array_values(array_filter(
            array_map('trim', $lines),
            fn(string $line) => $line !== '',
        ));
    }

    /**
     * Étapes triées par `index` (l'ordre de la collection Doctrine n'est pas garanti).
     *
     * @return list<array{id: int|null, index: int|null, description: string|null}>
     */
    private function serializeSteps(Recipe $recipe): array
    {
        $steps = $recipe->getSteps()->toArray();
        usort($steps, fn(Step $a, Step $b) => ($a->getIndex() ?? 0) <=> ($b->getIndex() ?? 0));

        return array_map(fn(Step $s) => [
            'id'          => $s->getId(),
            'index'       => $s->getIndex(),
            'description' => $s->getDescription(),
        ], $steps);
    }

    /**
     * Validates recipe base fields.
     * @return array<string, string>
     */
    private function validateRecipeData(array $data, bool $isCreation): array
    {
        $errors = [];

        if ($isCreation) {
            foreach (['title', 'nbPeople', 'type', 'prepTime'] as $required) {
                if (!isset($data[$required]) || $data[$required] === '') {
                    $errors[$required] = "The field \"$required\" is required.";
                }
            }
        }

        if (isset($data['title']) && trim((string) $data['title']) === '') {
            $errors['title'] = 'The title cannot be empty.';
        }

        if (isset($data['nbPeople'])) {
            if (!is_numeric($data['nbPeople']) || (int) $data['nbPeople'] < 1) {
                $errors['nbPeople'] = 'nbPeople must be a positive integer.';
            }
        }

        if (isset($data['prepTime'])) {
            if (!is_numeric($data['prepTime']) || (int) $data['prepTime'] < 1) {
                $errors['prepTime'] = 'prepTime must be a positive integer (minutes).';
            }
        }

        if (isset($data['cookingTime']) && $data['cookingTime'] !== null) {
            if (!is_numeric($data['cookingTime']) || (int) $data['cookingTime'] < 0) {
                $errors['cookingTime'] = 'cookingTime must be a non-negative integer (minutes).';
            }
        }

        return $errors;
    }

    /**
     * Validates the steps array.
     * En création/update, l'index doit être fourni (entier ≥ 1, sans doublon).
     *
     * @return array<string, string>
     */
    private function validateSteps(array $steps, bool $allowManualIndex = false): array
    {
        $errors = [];
        $seenIndexes = [];

        foreach ($steps as $i => $step) {
            if (!is_array($step)) {
                $errors["steps[$i]"] = "Step at position $i must be an object.";
                continue;
            }

            $description = isset($step['description']) ? trim((string) $step['description']) : '';
            if ($description === '') {
                $errors["steps[$i].description"] = "Step at position $i must have a non-empty description.";
            } elseif (mb_strlen($description) > self::MAX_STEP_LENGTH) {
                $errors["steps[$i].description"] = "Step at position $i exceeds " . self::MAX_STEP_LENGTH . ' characters.';
            }

            if ($allowManualIndex) {
                if (!isset($step['index']) || !is_numeric($step['index']) || (int) $step['index'] < 1) {
                    $errors["steps[$i].index"] = "Step at position $i must have a positive integer index.";
                } elseif (in_array((int) $step['index'], $seenIndexes, true)) {
                    $errors["steps[$i].index"] = "Step at position $i has a duplicate index.";
                } else {
                    $seenIndexes[] = (int) $step['index'];
                }
            }
        }

        return $errors;
    }

    /**
     * Validates the ingredients array.
     * Each entry must have an ingredientId (int, sans doublon) and an amount (float ≥ MIN_AMOUNT).
     *
     * @return array<string, string>
     */
    private function validateIngredients(array $ingredients): array
    {
        $errors = [];
        $seenIds = [];

        foreach ($ingredients as $i => $ing) {
            if (!is_array($ing)) {
                $errors["ingredients[$i]"] = "Ingredient at position $i must be an object.";
                continue;
            }

            if (!isset($ing['ingredientId']) || !is_numeric($ing['ingredientId'])) {
                $errors["ingredients[$i].ingredientId"] = "Ingredient at position $i must have a valid ingredientId.";
            } elseif (in_array((int) $ing['ingredientId'], $seenIds, true)) {
                $errors["ingredients[$i].ingredientId"] = "Ingredient {$ing['ingredientId']} is listed twice.";
            } else {
                $seenIds[] = (int) $ing['ingredientId'];
            }

            // is_numeric accepte 1, "1.5", 1.5 ; (float) convertit ensuite proprement.
            if (!isset($ing['amount']) || !is_numeric($ing['amount']) || (float) $ing['amount'] < self::MIN_AMOUNT) {
                $errors["ingredients[$i].amount"] = "Ingredient at position $i must have an amount >= " . self::MIN_AMOUNT . '.';
            }
        }

        return $errors;
    }

    /**
     * Serializes a Recipe entity to a plain array for JSON output.
     */
    private function serialize(Recipe $recipe): array
    {
        return [
            'id'          => $recipe->getId(),
            'title'       => $recipe->getTitle(),
            'nbPeople'    => $recipe->getNbPeople(),
            'type'        => $recipe->getType()?->value,
            'prepTime'    => $recipe->getPrepTime(),
            'cookingTime' => $recipe->getCookingTime(),
            'tips'        => $recipe->getTips(),
            'createdAt'   => $recipe->getCreatedAt(),
            'userId'      => $recipe->getUser()?->getId(),
            'steps'       => $this->serializeSteps($recipe),
            'ingredients' => $recipe->getIngredients()->map(fn($ri) => [
                'id'           => $ri->getId(),
                'ingredientId' => $ri->getIngredient()?->getId(),
                'label'        => $ri->getIngredient()?->getLabel(),
                'unit'         => $ri->getIngredient()?->getUnit(),
                'amount'       => $ri->getAmount(),
            ])->toArray(),
        ];
    }
}