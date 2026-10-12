<?php

namespace App\Controller\Api;

use App\Entity\Photo;
use App\Entity\PhotoCollection;
use App\Entity\Recipe;
use App\Repository\PhotoRepository;
use App\Repository\RecipeRepository;
use App\Service\PhotoUploader;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

#[Route('/api/recipes/{recipeId}/photos', name: 'api_recipe_photos_', requirements: ['recipeId' => '\d+'])]
class PhotoController extends AbstractController
{
    private const MAX_PHOTOS = 5;
    private const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo

    public function __construct(
        private readonly RecipeRepository $recipeRepository,
        private readonly PhotoRepository $photoRepository,
        private readonly EntityManagerInterface $em,
        private readonly Security $security,
        private readonly PhotoUploader $photoUploader,
    ) {
    }

    // ── GET /api/recipes/{id}/photos ─────────────────────────────────────────
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(int $recipeId): JsonResponse
    {
        $recipe = $this->findRecipeOr404($recipeId);
        if ($recipe instanceof JsonResponse) {
            return $recipe;
        }

        $collection = $recipe->getPhotoCollection();
        $photos = $collection ? $collection->getPhotos()->toArray() : [];

        // Le tri par position évite de dépendre de l'ordre d'insertion en BDD
        usort($photos, fn(Photo $a, Photo $b) => ($a->getPosition() ?? 0) <=> ($b->getPosition() ?? 0));

        return $this->json(array_map($this->serializePhoto(...), $photos));
    }

    // ── POST /api/recipes/{id}/photos ────────────────────────────────────────
    #[Route('', name: 'add', methods: ['POST'])]
    public function add(int $recipeId, Request $request): JsonResponse
    {
        $recipe = $this->findRecipeOr404($recipeId);
        if ($recipe instanceof JsonResponse) {
            return $recipe;
        }
        if (!$this->canEditRecipe($recipe)) {
            return $this->json(['error' => 'You are not allowed to edit this recipe.'], Response::HTTP_FORBIDDEN);
        }

        $collection = $recipe->getPhotoCollection();
        if (!$collection) {
            // Garde-fou : normalement créée dès la création de la recette (voir RecipeController),
            // mais utile pour les recettes existantes avant l'ajout de cette fonctionnalité.
            $collection = new PhotoCollection();
            $collection->setTitle($recipe->getTitle());
            $collection->setSlugger(Uuid::v4()->toRfc4122());
            $recipe->setPhotoCollection($collection);
            $this->em->persist($collection);
        }

        $existingCount = count($collection->getPhotos());

        /** @var UploadedFile[] $files */
        $files = $request->files->get('photos', []);
        if (!is_array($files)) {
            $files = [$files]; // un seul fichier envoyé sans crochets côté front
        }

        if ($existingCount + count($files) > self::MAX_PHOTOS) {
            return $this->json(
                ['error' => sprintf(
                    'Maximum %d photos par recette (%d déjà présentes, %d envoyées).',
                    self::MAX_PHOTOS,
                    $existingCount,
                    count($files),
                )],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        $created = [];
        $position = $existingCount;

        foreach ($files as $file) {
            if (!$file instanceof UploadedFile || !$file->isValid()) {
                return $this->json(['error' => 'Fichier invalide.'], Response::HTTP_BAD_REQUEST);
            }
            if (!in_array($file->getMimeType(), self::ALLOWED_MIME_TYPES, true)) {
                return $this->json(
                    ['error' => 'Format non supporté : ' . $file->getClientOriginalName()],
                    Response::HTTP_UNSUPPORTED_MEDIA_TYPE,
                );
            }
            if ($file->getSize() > self::MAX_FILE_SIZE) {
                return $this->json(
                    ['error' => 'Fichier trop volumineux (5 Mo max) : ' . $file->getClientOriginalName()],
                    Response::HTTP_UNPROCESSABLE_ENTITY,
                );
            }

            $photo = $this->photoUploader->upload($file, $collection);
            $photo->setPosition($position++);
            $this->em->persist($photo);
            $created[] = $photo;
        }

        $this->em->flush();

        return $this->json(array_map($this->serializePhoto(...), $created), Response::HTTP_CREATED);
    }

    // ── DELETE /api/recipes/{id}/photos/{photoId} ────────────────────────────
    #[Route('/{photoId}', name: 'delete', methods: ['DELETE'], requirements: ['photoId' => '\d+'])]
    public function delete(int $recipeId, int $photoId): JsonResponse
    {
        $recipe = $this->findRecipeOr404($recipeId);
        if ($recipe instanceof JsonResponse) {
            return $recipe;
        }
        if (!$this->canEditRecipe($recipe)) {
            return $this->json(['error' => 'You are not allowed to edit this recipe.'], Response::HTTP_FORBIDDEN);
        }

        $photo = $this->photoRepository->find($photoId);
        if (!$photo || $photo->getPhotoCollection() !== $recipe->getPhotoCollection()) {
            return $this->json(['error' => 'Photo not found for this recipe.'], Response::HTTP_NOT_FOUND);
        }

        $this->photoUploader->delete($photo); // supprime le fichier sur le disque
        $this->em->remove($photo);             // supprime la ligne en BDD
        $this->em->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    // ── PATCH /api/recipes/{id}/photos/{photoId}/position — "éditer" = réordonner ──
    #[Route('/{photoId}/position', name: 'reorder', methods: ['PATCH'], requirements: ['photoId' => '\d+'])]
    public function updatePosition(int $recipeId, int $photoId, Request $request): JsonResponse
    {
        $recipe = $this->findRecipeOr404($recipeId);
        if ($recipe instanceof JsonResponse) {
            return $recipe;
        }
        if (!$this->canEditRecipe($recipe)) {
            return $this->json(['error' => 'You are not allowed to edit this recipe.'], Response::HTTP_FORBIDDEN);
        }

        $photo = $this->photoRepository->find($photoId);
        if (!$photo || $photo->getPhotoCollection() !== $recipe->getPhotoCollection()) {
            return $this->json(['error' => 'Photo not found for this recipe.'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (!isset($data['position']) || !is_numeric($data['position'])) {
            return $this->json(['error' => 'Le champ "position" (entier) est requis.'], Response::HTTP_BAD_REQUEST);
        }

        $photo->setPosition((int) $data['position']);
        $this->em->flush();

        return $this->json($this->serializePhoto($photo));
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

    private function canEditRecipe(Recipe $recipe): bool
    {
        $currentUser = $this->security->getUser();

        return !$recipe->getUser() || $recipe->getUser() === $currentUser || $this->isGranted('ROLE_ADMIN');
    }

    private function serializePhoto(Photo $photo): array
    {
        return [
            'id' => $photo->getId(),
            'position' => $photo->getPosition(),
            'url' => $this->photoUploader->publicPath($photo),
        ];
    }
}