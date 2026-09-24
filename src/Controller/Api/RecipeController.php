<?php

namespace App\Controller\Api;

use App\Entity\Recipe;
use App\Entity\Step;
use App\Entity\RecipeIngredient;
use App\Enums\RecipeType;
use App\Repository\RecipeRepository;
use App\Repository\IngredientRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Bundle\SecurityBundle\Security;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/recipes', name: 'api_recipes_')]
class RecipeController extends AbstractController
{
    public function __construct(
        private readonly RecipeRepository $recipeRepository,
        private readonly IngredientRepository $ingredientRepository,
        private readonly EntityManagerInterface $em,
        private readonly Security $security,
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
            'tips'        => ($r->getTips() === null) ? [] : explode('\n', $r->getTips()),
            'steps'       => $r->getSteps()->map(fn($s) => [
                'id'          => $s->getId(),
                'index'       => $s->getIndex(),
                'description' => $s->getDescription(),
            ])->toArray(),
            'ingredients' => $r->getIngredients()->map(fn($ri) => [
                'id'     => $ri->getId(),
                'label'  => $ri->getIngredient()->getLabel(),
                'unit'   => $ri->getIngredient()->getUnit(),
                'amount' => $ri->getAmount(),
            ])->toArray(),
        ], $recipes);

        return $this->json($data, Response::HTTP_OK);
    }

    // ── GET /api/recipes/{id} ──────────────────────────────────────────────────

    #[Route('/{id}', name: 'show', methods: ['GET'])]
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
            'tips'        => ($recipe->getTips() === null) ? [] : explode('\n', $recipe->getTips()),
            'steps'       => $recipe->getSteps()->map(fn($s) => [
                'id'          => $s->getId(),
                'index'       => $s->getIndex(),
                'description' => $s->getDescription(),
            ])->toArray(),
            'ingredients' => $recipe->getIngredients()->map(fn($ri) => [
                'id'     => $ri->getId(),
                'label'  => $ri->getIngredient()->getLabel(),
                'unit'   => $ri->getIngredient()->getUnit(),
                'amount' => $ri->getAmount(),
            ])->toArray(),
        ]);
    }

    // ── POST /api/recipes ──────────────────────────────────────────────────────

    #[Route('', name: 'add', methods: ['POST'])]
    public function add(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(
                ['error' => 'Invalid JSON body.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $errors = $this->validateRecipeData($data, isCreation: true);
        if (!empty($errors)) {
            return $this->json(['errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $type = RecipeType::tryFrom($data['type']);
        if (!$type) {
            return $this->json(
                ['errors' => ['type' => 'Invalid type. Allowed values: ' . implode(', ', array_column(RecipeType::cases(), 'value'))]],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        $recipe = new Recipe();
        $recipe->setTitle(trim($data['title']));
        $recipe->setNbPeople((int) $data['nbPeople']);
        $recipe->setType($type);
        $recipe->setPrepTime((int) $data['prepTime']);
        $recipe->setCookingTime(isset($data['cookingTime']) ? (int) $data['cookingTime'] : null);
        $recipe->setTips($data['tips'] ?? null);
        $recipe->setCreatedAt(time());

        $user = $this->security->getUser();
        if ($user) {
            $recipe->setUser($user);
        }

        // ── Steps : index auto-incrémenté à la création ──────────────────────
        if (!empty($data['steps']) && is_array($data['steps'])) {
            $errors = $this->validateSteps($data['steps']);
            if (!empty($errors)) {
                return $this->json(['errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            foreach ($data['steps'] as $position => $stepData) {
                $step = new Step();
                $step->setIndex($position + 1); // Index auto : 1-based
                $step->setDescription(trim($stepData['description']));
                $recipe->addStep($step);
                $this->em->persist($step);
            }
        }

        // ── Ingredients : on cherche l'entité existante par son id ───────────
        // Le client envoie [{ ingredientId: 3, amount: 250 }, ...]
        // On ne crée jamais un nouvel ingrédient ici — on sélectionne dans le référentiel.
        if (!empty($data['ingredients']) && is_array($data['ingredients'])) {
            $ingredientErrors = $this->validateIngredients($data['ingredients']);
            if (!empty($ingredientErrors)) {
                return $this->json(['errors' => $ingredientErrors], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            foreach ($data['ingredients'] as $ingData) {
                $ingredient = $this->ingredientRepository->find((int) $ingData['ingredientId']);
                if (!$ingredient) {
                    return $this->json(
                        ['errors' => ['ingredients' => "Ingredient with id {$ingData['ingredientId']} not found."]],
                        Response::HTTP_UNPROCESSABLE_ENTITY,
                    );
                }

                $recipeIngredient = new RecipeIngredient();
                $recipeIngredient->setIngredient($ingredient);
                $recipeIngredient->setAmount((int) $ingData['amount']);
                $recipe->addRecipeIngredient($recipeIngredient);
                $this->em->persist($recipeIngredient);
            }
        }

        $this->em->persist($recipe);
        $this->em->flush();

        return $this->json($this->serialize($recipe), Response::HTTP_CREATED);
    }

    // ── PUT /api/recipes/{id} ──────────────────────────────────────────────────

    #[Route('/{id}', name: 'update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $recipe = $this->recipeRepository->find($id);

        if (!$recipe) {
            return $this->json(
                ['error' => "Recipe with id $id not found."],
                Response::HTTP_NOT_FOUND,
            );
        }

        $currentUser = $this->security->getUser();
        if ($recipe->getUser() && $recipe->getUser() !== $currentUser && !$this->isGranted('ROLE_ADMIN')) {
            return $this->json(
                ['error' => 'You are not allowed to update this recipe.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(
                ['error' => 'Invalid JSON body.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $errors = $this->validateRecipeData($data, isCreation: false);
        if (!empty($errors)) {
            return $this->json(['errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (isset($data['title']))    $recipe->setTitle(trim($data['title']));
        if (isset($data['nbPeople'])) $recipe->setNbPeople((int) $data['nbPeople']);

        if (isset($data['type'])) {
            $type = RecipeType::tryFrom($data['type']);
            if (!$type) {
                return $this->json(
                    ['errors' => ['type' => 'Invalid type. Allowed values: ' . implode(', ', array_column(RecipeType::cases(), 'value'))]],
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                );
            }
            $recipe->setType($type);
        }

        if (isset($data['prepTime']))              $recipe->setPrepTime((int) $data['prepTime']);
        if (array_key_exists('cookingTime', $data)) $recipe->setCookingTime($data['cookingTime'] !== null ? (int) $data['cookingTime'] : null);
        if (array_key_exists('tips', $data))        $recipe->setTips($data['tips']);

        // ── Steps en update : l'admin peut modifier l'index manuellement ─────
        // Stratégie : on supprime les anciens steps et on recrée.
        // C'est plus simple et plus fiable qu'un diff — la table steps est légère.
        // À noter pour le junior : cette stratégie "delete + recreate" est acceptable
        // ici car les steps n'ont pas de relations externes. Éviter sur des entités
        // avec des FK ou de l'historique.
        if (isset($data['steps']) && is_array($data['steps'])) {
            $errors = $this->validateSteps($data['steps'], allowManualIndex: true);
            if (!empty($errors)) {
                return $this->json(['errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            // Supprimer les steps existants
            foreach ($recipe->getSteps() as $existingStep) {
                $recipe->removeStep($existingStep);
                $this->em->remove($existingStep);
            }

            // Recréer avec l'index fourni par l'admin
            foreach ($data['steps'] as $stepData) {
                $step = new Step();
                $step->setIndex((int) $stepData['index']);
                $step->setDescription(trim($stepData['description']));
                $step->setRecipe($recipe);
                $recipe->addStep($step);
                $this->em->persist($step);
            }
        }

        // ── Ingredients en update : même stratégie delete + recreate ─────────
        if (isset($data['ingredients']) && is_array($data['ingredients'])) {
            $ingredientErrors = $this->validateIngredients($data['ingredients']);
            if (!empty($ingredientErrors)) {
                return $this->json(['errors' => $ingredientErrors], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            foreach ($recipe->getIngredients() as $existingRI) {
                $recipe->removeRecipeIngredient($existingRI);
                $this->em->remove($existingRI);
            }

            foreach ($data['ingredients'] as $ingData) {
                $ingredient = $this->ingredientRepository->find((int) $ingData['ingredientId']);
                if (!$ingredient) {
                    return $this->json(
                        ['errors' => ['ingredients' => "Ingredient with id {$ingData['ingredientId']} not found."]],
                        Response::HTTP_UNPROCESSABLE_ENTITY,
                    );
                }

                $recipeIngredient = new RecipeIngredient();
                $recipeIngredient->setIngredient($ingredient);
                $recipeIngredient->setRecipe($recipe);
                $recipeIngredient->setAmount((int) $ingData['amount']);
                $recipe->addRecipeIngredient($recipeIngredient);
                $this->em->persist($recipeIngredient);
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
            return $this->json(
                ['error' => "Recipe with id $id not found."],
                Response::HTTP_NOT_FOUND,
            );
        }

        $currentUser = $this->security->getUser();
        if ($recipe->getUser() && $recipe->getUser() !== $currentUser && !$this->isGranted('ROLE_ADMIN')) {
            return $this->json(
                ['error' => 'You are not allowed to delete this recipe.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        $this->em->remove($recipe);
        $this->em->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

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
     * En création, l'index n'est pas requis (auto-généré).
     * En update, l'index doit être fourni et être un entier positif.
     *
     * @return array<string, string>
     */
    private function validateSteps(array $steps, bool $allowManualIndex = false): array
    {
        $errors = [];

        foreach ($steps as $i => $step) {
            if (!isset($step['description']) || trim((string) $step['description']) === '') {
                $errors["steps[$i].description"] = "Step at position $i must have a non-empty description.";
            }

            if ($allowManualIndex) {
                if (!isset($step['index']) || !is_numeric($step['index']) || (int) $step['index'] < 1) {
                    $errors["steps[$i].index"] = "Step at position $i must have a positive integer index.";
                }
            }
        }

        return $errors;
    }

    /**
     * Validates the ingredients array.
     * Each entry must have an ingredientId (int) and an amount (positive int).
     *
     * @return array<string, string>
     */
    private function validateIngredients(array $ingredients): array
    {
        $errors = [];

        foreach ($ingredients as $i => $ing) {
            if (!isset($ing['ingredientId']) || !is_numeric($ing['ingredientId'])) {
                $errors["ingredients[$i].ingredientId"] = "Ingredient at position $i must have a valid ingredientId.";
            }
            if (!isset($ing['amount']) || !is_numeric($ing['amount']) || (int) $ing['amount'] < 1) {
                $errors["ingredients[$i].amount"] = "Ingredient at position $i must have a positive amount.";
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
            'steps'       => $recipe->getSteps()->map(fn($s) => [
                'id'          => $s->getId(),
                'index'       => $s->getIndex(),
                'description' => $s->getDescription(),
            ])->toArray(),
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
