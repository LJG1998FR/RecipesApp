<?php

namespace App\Entity;

use App\Enums\RecipeType;
use App\Repository\RecipeRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Table(name: 'recipes')]
#[ORM\Entity(repositoryClass: RecipeRepository::class)]
class Recipe
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: Types::SMALLINT)]
    private ?int $nbPeople = null;

    #[ORM\Column(enumType: RecipeType::class)]
    private ?RecipeType $type = null;

    #[ORM\Column]
    private ?int $prepTime = null;

    #[ORM\Column(nullable: true)]
    private ?int $cookingTime = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $tips = null;

    #[ORM\Column]
    private ?int $created_at = null;

    /**
     * @var Collection<int, Step>
     */
    #[ORM\OneToMany(targetEntity: Step::class, mappedBy: 'recipe', orphanRemoval: true)]
    private Collection $steps;

    /**
     * @var Collection<int, RecipeIngredient>
     */
    #[ORM\OneToMany(targetEntity: RecipeIngredient::class, mappedBy: 'recipe', cascade: ['persist', 'remove'])]
    private Collection $ingredients;

    #[ORM\ManyToOne(inversedBy: 'recipes')]
    private ?User $user = null;

    public function __construct()
    {
        $this->steps = new ArrayCollection();
        $this->ingredients = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getNbPeople(): ?int
    {
        return $this->nbPeople;
    }

    public function setNbPeople(int $nbPeople): static
    {
        $this->nbPeople = $nbPeople;

        return $this;
    }

    public function getType(): ?RecipeType
    {
        return $this->type;
    }

    public function setType(RecipeType $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getPrepTime(): ?int
    {
        return $this->prepTime;
    }

    public function setPrepTime(int $prepTime): static
    {
        $this->prepTime = $prepTime;

        return $this;
    }

    public function getCookingTime(): ?int
    {
        return $this->cookingTime;
    }

    public function setCookingTime(?int $cookingTime): static
    {
        $this->cookingTime = $cookingTime;

        return $this;
    }

    public function getTips(): ?string
    {
        return $this->tips;
    }

    public function setTips(?string $tips): static
    {
        $this->tips = $tips;

        return $this;
    }

    public function getCreatedAt(): ?int
    {
        return $this->created_at;
    }

    public function setCreatedAt(int $created_at): static
    {
        $this->created_at = $created_at;

        return $this;
    }

    /**
     * @return Collection<int, Step>
     */
    public function getSteps(): Collection
    {
        return $this->steps;
    }

    public function addStep(Step $step): static
    {
        if (!$this->steps->contains($step)) {
            $this->steps->add($step);
            $step->setRecipe($this);
        }

        return $this;
    }

    public function removeStep(Step $step): static
    {
        if ($this->steps->removeElement($step)) {
            // set the owning side to null (unless already changed)
            if ($step->getRecipe() === $this) {
                $step->setRecipe(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Ingredient>
     */
    public function getIngredients(): Collection
    {
        return $this->ingredients;
    }

    public function addRecipeIngredient(RecipeIngredient $recipeIngredient): static
    {
        if (!$this->ingredients->contains($recipeIngredient)) {
            $this->ingredients->add($recipeIngredient);
            $recipeIngredient->setRecipe($this);
        }
 
        return $this;
    }
 
    public function removeRecipeIngredient(RecipeIngredient $recipeIngredient): static
    {
        if ($this->ingredients->removeElement($recipeIngredient)) {
            if ($recipeIngredient->getRecipe() === $this) {
                $recipeIngredient->setRecipe(null);
            }
        }
 
        return $this;
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
}
