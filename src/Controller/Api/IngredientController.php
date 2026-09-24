<?php

namespace App\Controller\Api;

use App\Entity\Ingredient;
use App\Repository\IngredientRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Controller REST pour la gestion des ingrédients.
 *
 * Endpoints exposés :
 *   GET    /api/ingredients        → liste tous les ingrédients
 *   GET    /api/ingredients/{id}   → détail d'un ingrédient
 *   POST   /api/ingredients        → crée un ingrédient (ROLE_ADMIN requis)
 *   PUT    /api/ingredients/{id}   → modifie un ingrédient (ROLE_ADMIN requis)
 *   DELETE /api/ingredients/{id}   → supprime un ingrédient (ROLE_ADMIN requis)
 *
 * Pourquoi ROLE_ADMIN pour l'écriture ?
 *   Les ingrédients sont des données "référentiel" partagées par toutes les recettes.
 *   Un utilisateur lambda ne devrait pas pouvoir renommer "Farine" en "Sucre"
 *   et casser toutes les recettes qui utilisent cet ingrédient.
 */
#[Route('/api/ingredients', name: 'api_ingredients_')]
class IngredientController extends AbstractController
{
    public function __construct(
        private readonly IngredientRepository    $ingredientRepository,
        private readonly EntityManagerInterface  $em,
        private readonly Security                $security,
    ) {}

    // ── GET /api/ingredients ───────────────────────────────────────────────────

    /**
     * Retourne la liste complète des ingrédients.
     *
     * Note junior : on utilise array_map() pour transformer une collection
     * d'objets Doctrine en tableaux PHP simples, que json_encode() peut
     * sérialiser. Doctrine ne sait pas serializer ses entités tout seul.
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $ingredients = $this->ingredientRepository->findAll();

        $data = array_map(
            fn(Ingredient $i) => $this->serialize($i),
            $ingredients
        );

        return $this->json($data, Response::HTTP_OK);
    }

    // ── GET /api/ingredients/{id} ──────────────────────────────────────────────

    /**
     * Retourne un ingrédient par son ID.
     *
     * Note junior : on retourne HTTP 404 si l'ID n'existe pas.
     * Ne jamais retourner HTTP 200 avec un body vide — c'est trompeur pour
     * le client (ici le front React qui attend un objet).
     */
    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(int $id): JsonResponse
    {
        $ingredient = $this->ingredientRepository->find($id);

        if (!$ingredient) {
            return $this->json(
                ['error' => "Ingredient with id $id not found."],
                Response::HTTP_NOT_FOUND,
            );
        }

        return $this->json($this->serialize($ingredient), Response::HTTP_OK);
    }

    // ── POST /api/ingredients ──────────────────────────────────────────────────

    /**
     * Crée un nouvel ingrédient.
     *
     * Accès restreint : ROLE_ADMIN uniquement.
     *
     * Body JSON attendu :
     * {
     *   "label": "Farine",      // obligatoire, string non vide
     *   "unit":  "g"            // optionnel, ex: "g", "kg", "ml", "L", "unité(s)"
     * }
     *
     * Note junior : on décode le JSON manuellement avec json_decode() car
     * les APIs REST n'utilisent pas les FormData HTML — tout passe en JSON
     * dans le body de la requête. Le deuxième argument `true` retourne un
     * tableau associatif au lieu d'un stdClass.
     */
    #[Route('', name: 'add', methods: ['POST'])]
    public function add(Request $request): JsonResponse
    {
        // Vérification des droits AVANT de lire le body
        // → évite un traitement inutile si l'utilisateur n'est pas admin
        if (!$this->isGranted('ROLE_ADMIN') && !$this->isGranted('ROLE_SUPER_ADMIN')) {
            return $this->json(
                ['error' => 'Access denied. ROLE_ADMIN or ROLE_SUPER_ADMIN required.'],
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

        $errors = $this->validateIngredientData($data, isCreation: true);
        if (!empty($errors)) {
            return $this->json(
                ['errors' => $errors],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        // Vérifier l'unicité du label (insensible à la casse)
        // → on ne veut pas deux ingrédients "farine" et "Farine"
        $existing = $this->ingredientRepository->findOneBy([
            'label' => trim($data['label']),
        ]);

        if ($existing) {
            return $this->json(
                ['errors' => ['label' => "An ingredient with label \"{$data['label']}\" already exists."]],
                Response::HTTP_CONFLICT,
            );
        }

        $ingredient = new Ingredient();
        $ingredient->setLabel(trim($data['label']));

        // L'unité est optionnelle : isset() + null coalescing
        if (isset($data['unit']) && trim($data['unit']) !== '') {
            $ingredient->setUnit(trim($data['unit']));
        }

        $this->em->persist($ingredient);
        $this->em->flush();

        // HTTP 201 Created (et non 200) pour signaler qu'une ressource a été créée
        return $this->json($this->serialize($ingredient), Response::HTTP_CREATED);
    }

    // ── PUT /api/ingredients/{id} ──────────────────────────────────────────────

    /**
     * Modifie un ingrédient existant.
     *
     * Accès restreint : ROLE_ADMIN uniquement.
     *
     * Body JSON (tous les champs sont optionnels en mise à jour) :
     * {
     *   "label": "Farine de blé",
     *   "unit":  "g"
     * }
     *
     * Note junior : en PUT "partiel" (souvent appelé PATCH sémantiquement),
     * on ne met à jour que les champs présents dans le body.
     * Si "unit" n'est pas envoyé, on ne touche pas à l'unité existante.
     *
     * Note sur l'unicité : si le nouveau label est identique à l'actuel,
     * on ne bloque pas (l'utilisateur n'a peut-être changé que l'unité).
     */
    #[Route('/{id}', name: 'update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function update(int $id, Request $request): JsonResponse
    {
        if (!$this->isGranted('ROLE_ADMIN') && !$this->isGranted('ROLE_SUPER_ADMIN')) {
            return $this->json(
                ['error' => 'Access denied. ROLE_ADMIN or ROLE_SUPER_ADMIN required.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        $ingredient = $this->ingredientRepository->find($id);

        if (!$ingredient) {
            return $this->json(
                ['error' => "Ingredient with id $id not found."],
                Response::HTTP_NOT_FOUND,
            );
        }

        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(
                ['error' => 'Invalid JSON body.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        // En mode update : isCreation: false → seuls les champs présents sont validés
        $errors = $this->validateIngredientData($data, isCreation: false);
        if (!empty($errors)) {
            return $this->json(
                ['errors' => $errors],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        // Vérification d'unicité du label uniquement si on le modifie
        if (isset($data['label'])) {
            $newLabel = trim($data['label']);

            // On exclut l'ingrédient courant de la recherche d'unicité
            $duplicate = $this->ingredientRepository->findOneBy(['label' => $newLabel]);
            if ($duplicate && $duplicate->getId() !== $ingredient->getId()) {
                return $this->json(
                    ['errors' => ['label' => "An ingredient with label \"$newLabel\" already exists."]],
                    Response::HTTP_CONFLICT,
                );
            }

            $ingredient->setLabel($newLabel);
        }

        if (array_key_exists('unit', $data)) {
            // array_key_exists vs isset : array_key_exists détecte aussi `"unit": null`
            // ce qui permet à l'admin de supprimer l'unité en envoyant null
            $ingredient->setUnit($data['unit'] !== null ? trim($data['unit']) : null);
        }

        // Pas besoin de persist() ici : Doctrine "track" les changements sur
        // les entités déjà chargées. flush() suffit à persister.
        $this->em->flush();

        return $this->json($this->serialize($ingredient), Response::HTTP_OK);
    }

    // ── DELETE /api/ingredients/{id} ───────────────────────────────────────────

    /**
     * Supprime un ingrédient.
     *
     * Accès restreint : ROLE_ADMIN uniquement.
     *
     * ⚠️ ATTENTION (point critique pour le junior) :
     * Supprimer un ingrédient qui est lié à des RecipeIngredient va lever
     * une exception de contrainte de clé étrangère en base de données
     * si la relation n'a pas `cascade: ['remove']` ou `onDelete: CASCADE`
     * côté SQL.
     *
     * Ici, RecipeIngredient.ingredient a @JoinColumn(nullable: false),
     * donc Doctrine refusera la suppression si des RecipeIngredients
     * référencent cet ingrédient. On attrape ce cas et on retourne HTTP 409.
     *
     * Note junior : HTTP 204 No Content = succès sans body à retourner.
     * C'est la convention REST pour un DELETE réussi.
     */
    #[Route('/{id}', name: 'delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        if (!$this->isGranted('ROLE_ADMIN') && !$this->isGranted('ROLE_SUPER_ADMIN')) {
            return $this->json(
                ['error' => 'Access denied. ROLE_ADMIN or ROLE_SUPER_ADMIN required.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        $ingredient = $this->ingredientRepository->find($id);

        if (!$ingredient) {
            return $this->json(
                ['error' => "Ingredient with id $id not found."],
                Response::HTTP_NOT_FOUND,
            );
        }

        // Vérifier si des recettes utilisent cet ingrédient avant suppression
        // → meilleur message d'erreur qu'une exception SQL brute
        $usageCount = $ingredient->getRecipeIngredients()->count();
        if ($usageCount > 0) {
            return $this->json(
                [
                    'error'   => "Cannot delete ingredient \"{$ingredient->getLabel()}\": it is used in $usageCount recipe(s).",
                    'details' => 'Remove this ingredient from all recipes before deleting it.',
                ],
                Response::HTTP_CONFLICT,
            );
        }

        $this->em->remove($ingredient);
        $this->em->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    // ── Helpers privés ─────────────────────────────────────────────────────────

    /**
     * Valide les données d'un ingrédient.
     *
     * @param array<string, mixed> $data
     * @param bool $isCreation  true = tous les champs requis ; false = validation partielle
     * @return array<string, string>  tableau field => message d'erreur
     *
     * Note junior : on sépare la validation dans une méthode dédiée
     * (principe Single Responsibility) pour ne pas alourdir add() et update().
     * Les deux méthodes appellent la même validation avec un flag différent.
     */
    private function validateIngredientData(array $data, bool $isCreation): array
    {
        $errors = [];

        // ── Champs obligatoires uniquement à la création ──
        if ($isCreation && (!isset($data['label']) || trim((string) $data['label']) === '')) {
            $errors['label'] = 'The field "label" is required and cannot be empty.';
        }

        // ── Validation du label si présent ──
        if (isset($data['label'])) {
            $label = trim((string) $data['label']);

            if ($label === '') {
                $errors['label'] = 'The label cannot be empty.';
            } elseif (strlen($label) > 255) {
                $errors['label'] = 'The label cannot exceed 255 characters.';
            }
        }

        // ── Validation de l'unité si présente (et non null) ──
        if (isset($data['unit']) && $data['unit'] !== null) {
            $unit = trim((string) $data['unit']);

            if (strlen($unit) > 255) {
                $errors['unit'] = 'The unit cannot exceed 255 characters.';
            }
        }

        return $errors;
    }

    /**
     * Sérialise une entité Ingredient en tableau PHP pour la réponse JSON.
     *
     * Note junior : on sérialise EXPLICITEMENT chaque champ voulu.
     * Ne jamais passer l'entité Doctrine directement à json(), car :
     *   1. Les relations circulaires causent des boucles infinies
     *   2. On expose involontairement des champs sensibles
     *   3. Doctrine ajoute des métadonnées internes à l'objet
     *
     * @return array<string, mixed>
     */
    private function serialize(Ingredient $ingredient): array
    {
        return [
            'id'    => $ingredient->getId(),
            'label' => $ingredient->getLabel(),
            'unit'  => $ingredient->getUnit(),
            // Nombre de recettes qui utilisent cet ingrédient (utile pour le front)
            // Cela permet d'afficher un warning avant suppression dans l'admin
            'usedInRecipesCount' => $ingredient->getRecipeIngredients()->count(),
        ];
    }
}