<?php

namespace App\Entity;

use App\Repository\SavedRecipeRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Table de jointure explicite entre User et Recipe pour les favoris.
 *
 * ⚠️ Volontairement une entité à part (et pas un #[ManyToMany] "magique"
 * entre User et Recipe) parce qu'on a besoin d'une donnée EN PLUS sur la
 * relation elle-même : createdAt (date de sauvegarde, utile pour trier
 * "mes favoris les plus récents" côté front). Doctrine ne permet pas
 * d'attacher un champ à une relation ManyToMany implicite.
 *
 * La contrainte unique ci-dessous empêche un même utilisateur de
 * sauvegarder deux fois la même recette (double-clic sur le cœur).
 */
#[ORM\Table(name: 'saved_recipes')]
#[ORM\UniqueConstraint(name: 'UNIQ_SAVED_RECIPE_USER_RECIPE', fields: ['user', 'recipe'])]
#[ORM\Entity(repositoryClass: SavedRecipeRepository::class)]
class SavedRecipe
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'savedRecipes')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\ManyToOne(targetEntity: Recipe::class, inversedBy: 'savedBy')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Recipe $recipe = null;

    #[ORM\Column]
    private ?int $createdAt = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getRecipe(): ?Recipe
    {
        return $this->recipe;
    }

    public function setRecipe(?Recipe $recipe): static
    {
        $this->recipe = $recipe;

        return $this;
    }

    public function getCreatedAt(): ?int
    {
        return $this->createdAt;
    }

    public function setCreatedAt(int $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }
}
