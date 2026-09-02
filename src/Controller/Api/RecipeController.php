<?php

namespace App\Controller\Api;

use App\Entity\Recipe;
use App\Enums\RecipeType;
use App\Repository\RecipeRepository;
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
        private readonly EntityManagerInterface $em,
        private readonly Security $security,
    ) {}

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
        ], $recipes);

        return $this->json(
            $data,
            Response::HTTP_OK,
        );
    }

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
            'tips'        => $recipe->getTips(),
            'steps'       => $recipe->getSteps()->map(fn($s) => [
                'index'       => $s->getIndex(),
                'description' => $s->getDescription(),
            ])->toArray(),
            'ingredients' => $recipe->getIngredients()->map(fn($ri) => [
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
 
        if (isset($data['title'])) {
            $recipe->setTitle(trim($data['title']));
        }
 
        if (isset($data['nbPeople'])) {
            $recipe->setNbPeople((int) $data['nbPeople']);
        }
 
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
 
        if (isset($data['prepTime'])) {
            $recipe->setPrepTime((int) $data['prepTime']);
        }
 
        if (array_key_exists('cookingTime', $data)) {
            $recipe->setCookingTime($data['cookingTime'] !== null ? (int) $data['cookingTime'] : null);
        }
 
        if (array_key_exists('tips', $data)) {
            $recipe->setTips($data['tips']);
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
     * Validates recipe fields.
     * In creation mode all required fields must be present.
     * In update mode only provided fields are validated.
     *
     * @return array<string, string> field => error message
     */
    private function validateRecipeData(array $data, bool $isCreation): array
    {
        $errors = [];
 
        // ── Required fields (creation only) ──
        if ($isCreation) {
            foreach (['title', 'nbPeople', 'type', 'prepTime'] as $required) {
                if (!isset($data[$required]) || $data[$required] === '') {
                    $errors[$required] = "The field \"$required\" is required.";
                }
            }
        }
 
        // ── Field-level validation (only when the field is present) ──
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
 
    /** Serializes a Recipe entity to a plain array for JSON output. */
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
                'id'     => $ri->getId(),
                'label'  => $ri->getIngredient()?->getLabel(),
                'unit'   => $ri->getIngredient()?->getUnit(),
                'amount' => $ri->getAmount(),
            ])->toArray(),
        ];
    }
}