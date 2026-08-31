<?php

namespace App\DataFixtures;

use App\Entity\Recipe;
use App\Enums\RecipeType;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Persistence\ObjectManager;

class RecipeFixture extends Fixture implements FixtureGroupInterface
{
    public function load(ObjectManager $manager): void
    {
        $recipe1 = new Recipe();
        $recipe1->setTitle('Tiramisu');
        $recipe1->setNbPeople(4);
        $recipe1->setType(RecipeType::DESSERT);
        $recipe1->setPrepTime(30);
        $recipe1->setCreatedAt(time());
        $manager->persist($recipe1);

        $recipe2 = new Recipe();
        $recipe2->setTitle('Salade');
        $recipe2->setNbPeople(1);
        $recipe2->setType(RecipeType::PLATE);
        $recipe2->setPrepTime(10);
        $recipe2->setCreatedAt(time());
        $manager->persist($recipe2);

        $recipe3 = new Recipe();
        $recipe3->setTitle('Rougai Saucisse');
        $recipe3->setNbPeople(2);
        $recipe3->setType(RecipeType::PLATE);
        $recipe3->setPrepTime(35);
        $recipe3->setCreatedAt(time());
        $manager->persist($recipe3);

        $manager->flush();
    }

    public static function getGroups(): array
    {
        return ['recipes'];
    }
}