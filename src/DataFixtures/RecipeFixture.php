<?php

namespace App\DataFixtures;

use App\Entity\Ingredient;
use App\Entity\Recipe;
use App\Entity\RecipeIngredient;
use App\Entity\Step;
use App\Entity\User;
use App\Enums\RecipeStatus;
use App\Enums\RecipeType;
use Doctrine\Bundle\FixturesBundle\DependentFixtureInterface;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Common\DataFixtures\DependentFixtureInterface as DataFixturesDependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class RecipeFixture extends Fixture implements FixtureGroupInterface, DataFixturesDependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        /** @var User $author */
        $author = $this->getReference(UserFixture::SUPER_ADMIN_REF, User::class);

        $ingredientRepository = $manager->getRepository(Ingredient::class);

        /**
         * Petit helper pour retrouver un ingrédient par son libellé exact,
         * tel que défini dans IngredientsFixture::INGREDIENTS.
         *
         * ⚠️ Esprit critique : on pourrait être tenté de faire confiance
         * aveuglément aux données qu'on insère nous-même. Mais une simple
         * faute de frappe sur un libellé (ex: "Oeufs" au lieu de "Œufs")
         * ferait planter cette fixture avec un message Doctrine peu clair
         * ("Call to a member function setIngredient() on null"). On préfère
         * lever une exception explicite qui dit exactement quoi corriger.
         */
        $findIngredient = function (string $label) use ($ingredientRepository): Ingredient {
            $ingredient = $ingredientRepository->findOneBy(['label' => $label]);
            if (!$ingredient) {
                throw new \RuntimeException(sprintf(
                    'Ingrédient "%s" introuvable. Avez-vous bien chargé le groupe "ingredients" '
                    . 'avant "recipes" ? ex: bin/console doctrine:fixtures:load --group=ingredients --group=recipes',
                    $label,
                ));
            }

            return $ingredient;
        };

        // ── Recette 1 : Tiramisu (publiée, complète) ────────────────────────
        $recipe1 = new Recipe();
        $recipe1->setTitle('Tiramisu');
        $recipe1->setNbPeople(4);
        $recipe1->setType(RecipeType::DESSERT);
        $recipe1->setPrepTime(30);
        $recipe1->setTips("Utilisez des œufs très frais.\nLaissez reposer au moins 4h au frigo.");
        $recipe1->setCreatedAt(time());
        // ⚠️ Sans ce setStatus(), la recette reste PENDING (valeur par défaut
        // du constructeur) et n'apparaît jamais pour un utilisateur normal,
        // car RecipeController::list() filtre sur status = PUBLISHED.
        $recipe1->setStatus(RecipeStatus::PUBLISHED);
        $recipe1->setUser($author);

        $recipe1->addStep((new Step())->setIndex(1)->setDescription("Séparer les blancs des jaunes d'œufs."));
        $recipe1->addStep((new Step())->setIndex(2)->setDescription('Mélanger le mascarpone avec les jaunes et le sucre.'));
        $recipe1->addStep((new Step())->setIndex(3)->setDescription('Monter les blancs en neige et les incorporer délicatement.'));
        $recipe1->addStep((new Step())->setIndex(4)->setDescription('Tremper les biscuits dans le café et alterner les couches.'));

        $recipe1->addRecipeIngredient((new RecipeIngredient())->setIngredient($findIngredient('Œufs'))->setAmount(4));
        $recipe1->addRecipeIngredient((new RecipeIngredient())->setIngredient($findIngredient('Mascarpone'))->setAmount(250));
        $recipe1->addRecipeIngredient((new RecipeIngredient())->setIngredient($findIngredient('Sucre blanc'))->setAmount(100));

        $manager->persist($recipe1);

        // ── Recette 2 : Salade (publiée, rapide) ────────────────────────────
        $recipe2 = new Recipe();
        $recipe2->setTitle('Salade');
        $recipe2->setNbPeople(1);
        $recipe2->setType(RecipeType::PLATE);
        $recipe2->setPrepTime(10);
        $recipe2->setCreatedAt(time());
        $recipe2->setStatus(RecipeStatus::PUBLISHED);
        $recipe2->setUser($author);

        $recipe2->addStep((new Step())->setIndex(1)->setDescription('Laver et couper la salade et la tomate.'));
        $recipe2->addStep((new Step())->setIndex(2)->setDescription("Assaisonner avec huile d'olive et vinaigre."));

        $recipe2->addRecipeIngredient((new RecipeIngredient())->setIngredient($findIngredient('Salade romaine'))->setAmount(100));
        $recipe2->addRecipeIngredient((new RecipeIngredient())->setIngredient($findIngredient('Tomate'))->setAmount(1));

        $manager->persist($recipe2);

        // ── Recette 3 : Rougail Saucisse (volontairement EN ATTENTE) ────────
        // On ne l'envoie pas en PUBLISHED : elle reste au statut par défaut
        // (RecipeStatus::PENDING), ce qui permet de tester tout de suite le
        // circuit de modération admin (PATCH /api/recipes/{id}/moderate)
        // sans avoir à créer une recette "à la main" dans le front.
        $recipe3 = new Recipe();
        $recipe3->setTitle('Rougail Saucisse');
        $recipe3->setNbPeople(2);
        $recipe3->setType(RecipeType::PLATE);
        $recipe3->setPrepTime(35);
        $recipe3->setCreatedAt(time());
        $recipe3->setUser($author);

        $recipe3->addStep((new Step())->setIndex(1)->setDescription('Faire revenir les saucisses avec oignon et tomate.'));

        $recipe3->addRecipeIngredient((new RecipeIngredient())->setIngredient($findIngredient('Oignon jaune'))->setAmount(1));
        $recipe3->addRecipeIngredient((new RecipeIngredient())->setIngredient($findIngredient('Tomate'))->setAmount(2));

        $manager->persist($recipe3);

        $manager->flush();
    }

    public static function getGroups(): array
    {
        return ['recipes'];
    }

    /**
     * DependentFixtureInterface garantit que UserFixture et IngredientsFixture
     * sont chargées AVANT RecipeFixture, quel que soit l'ordre dans lequel on
     * liste les groupes en ligne de commande. Sans ça, $this->getReference()
     * et nos findOneBy(['label' => ...]) ne trouveraient rien, et l'erreur
     * ne serait pas toujours évidente à diagnostiquer.
     */
    public function getDependencies(): array
    {
        return [
            UserFixture::class,
            IngredientsFixture::class,
        ];
    }
}