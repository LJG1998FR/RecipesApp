<?php

namespace App\Controller\Api;

use App\Entity\Recipe;
use App\Entity\SavedRecipe;
use App\Repository\RecipeRepository;
use App\Repository\SavedRecipeRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Même découpage que PhotoController : un controller dédié par sous-ressource
 * de Recipe, plutôt que de faire grossir RecipeController indéfiniment.
 *
 * Volontairement : les deux actions ci-dessous renvoient un payload MINIMAL
 * ({ saved, savedCount }) et pas la recette entière re-sérialisée. Un clic
 * sur le cœur n'a pas besoin d'aller re-chercher les steps/ingredients/photos
 * de la recette — ce serait un aller-retour réseau inutilement lourd pour
 * ce que l'action fait réellement.
 */
#[Route('/api/recipes/{recipeId}/favorite', name: 'api_recipe_favorite_', requirements: ['recipeId' => '\d+'])]
class SavedRecipeController extends AbstractController
{
    public function __construct(
        private readonly RecipeRepository $recipeRepository,
        private readonly SavedRecipeRepository $savedRecipeRepository,
        private readonly EntityManagerInterface $em,
        private readonly Security $security,
    ) {
    }

    // ── POST /api/recipes/{id}/favorite ──────────────────────────────────────
    #[Route('', name: 'add', methods: ['POST'])]
    public function add(int $recipeId): JsonResponse
    {
        $recipe = $this->findRecipeOr404($recipeId);
        if ($recipe instanceof JsonResponse) {
            return $recipe;
        }

        $user = $this->security->getUser();
        if (!$user) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        // Idempotent : si déjà sauvegardée, on ne crée pas de doublon et on
        // répond simplement l'état actuel. Le front n'a pas besoin de savoir
        // si c'était "déjà fait" ou "vient d'être fait" — juste l'état final.
        $existing = $this->savedRecipeRepository->findOneByUserAndRecipe($user, $recipe);
        if (!$existing) {
            $saved = new SavedRecipe();
            $saved->setUser($user);
            $saved->setRecipe($recipe);
            $saved->setCreatedAt(time());
            $this->em->persist($saved);
            $this->em->flush();
        }

        return $this->json([
            'saved'      => true,
            'savedCount' => $this->savedRecipeRepository->countByRecipe($recipe),
        ], Response::HTTP_OK);
    }

    // ── DELETE /api/recipes/{id}/favorite ────────────────────────────────────
    #[Route('', name: 'remove', methods: ['DELETE'])]
    public function remove(int $recipeId): JsonResponse
    {
        $recipe = $this->findRecipeOr404($recipeId);
        if ($recipe instanceof JsonResponse) {
            return $recipe;
        }

        $user = $this->security->getUser();
        if (!$user) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $existing = $this->savedRecipeRepository->findOneByUserAndRecipe($user, $recipe);
        if ($existing) {
            $this->em->remove($existing);
            $this->em->flush();
        }

        return $this->json([
            'saved'      => false,
            'savedCount' => $this->savedRecipeRepository->countByRecipe($recipe),
        ], Response::HTTP_OK);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function findRecipeOr404(int $recipeId): Recipe|JsonResponse
    {
        $recipe = $this->recipeRepository->find($recipeId);
        if (!$recipe) {
            return $this->json(['error' => "Recipe with id $recipeId not found."], Response::HTTP_NOT_FOUND);
        }

        return $recipe;
    }
}
