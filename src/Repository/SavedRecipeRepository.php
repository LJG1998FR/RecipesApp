<?php

namespace App\Repository;

use App\Entity\Recipe;
use App\Entity\SavedRecipe;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SavedRecipe>
 */
class SavedRecipeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SavedRecipe::class);
    }

    public function findOneByUserAndRecipe(User $user, Recipe $recipe): ?SavedRecipe
    {
        return $this->findOneBy(['user' => $user, 'recipe' => $recipe]);
    }

    /**
     * Nombre de fois où CETTE recette a été sauvegardée.
     * Une seule requête — utilisé pour l'affichage détail (RecipeController::show()),
     * où on ne sérialise qu'une seule recette donc pas de risque de N+1.
     */
    public function countByRecipe(Recipe $recipe): int
    {
        return (int) $this->createQueryBuilder('sr')
            ->select('COUNT(sr.id)')
            ->andWhere('sr.recipe = :recipe')
            ->setParameter('recipe', $recipe)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Compte agrégé, pour TOUTES les recettes d'une liste, en UNE seule requête.
     *
     * ⚠️ Volontairement utilisé par RecipeController::list() au lieu d'appeler
     * countByRecipe() dans une boucle sur chaque recette affichée : boucler
     * ferait une requête SQL par ligne (problème N+1 classique), ce qui
     * s'effondre dès que la liste admin s'agrandit. Ici c'est un
     * GROUP BY unique, aussi rapide pour 5 recettes que pour 5000.
     *
     * @param list<int> $recipeIds
     * @return array<int, int> [recipeId => count]
     */
    public function countByRecipeIds(array $recipeIds): array
    {
        if (empty($recipeIds)) {
            return [];
        }

        $rows = $this->createQueryBuilder('sr')
            ->select('IDENTITY(sr.recipe) AS recipeId, COUNT(sr.id) AS cnt')
            ->andWhere('sr.recipe IN (:ids)')
            ->setParameter('ids', $recipeIds)
            ->groupBy('sr.recipe')
            ->getQuery()
            ->getResult();

        $counts = [];
        foreach ($rows as $row) {
            $counts[(int) $row['recipeId']] = (int) $row['cnt'];
        }

        return $counts;
    }

    /**
     * IDs des recettes, parmi $recipeIds, que CE user a sauvegardées.
     * Même logique "une seule requête, pas de boucle" que countByRecipeIds().
     *
     * @param list<int> $recipeIds
     * @return array<int, true> set d'IDs sauvegardés (clé = recipeId)
     */
    public function findSavedRecipeIdsForUser(User $user, array $recipeIds): array
    {
        if (empty($recipeIds)) {
            return [];
        }

        $rows = $this->createQueryBuilder('sr')
            ->select('IDENTITY(sr.recipe) AS recipeId')
            ->andWhere('sr.user = :user')
            ->andWhere('sr.recipe IN (:ids)')
            ->setParameter('user', $user)
            ->setParameter('ids', $recipeIds)
            ->getQuery()
            ->getResult();

        $ids = [];
        foreach ($rows as $row) {
            $ids[(int) $row['recipeId']] = true;
        }

        return $ids;
    }

    /**
     * Recettes sauvegardées par un user, triées de la plus récente à la plus
     * ancienne sauvegarde (pas de la plus récente création de recette —
     * nuance importante pour l'onglet "Favoris" du front).
     *
     * @return list<SavedRecipe>
     */
    public function findByUserOrderedByRecent(User $user): array
    {
        return $this->createQueryBuilder('sr')
            ->andWhere('sr.user = :user')
            ->setParameter('user', $user)
            ->orderBy('sr.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
