<?php

namespace App\DataFixtures;

use App\Entity\Ingredient;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Persistence\ObjectManager;

class IngredientsFixture extends Fixture implements FixtureGroupInterface
{
    public function load(ObjectManager $manager): void
    {
        $eggs = new Ingredient();
        $eggs->setLabel('eggs');
        $manager->persist($eggs);

        $sugar = new Ingredient();
        $sugar->setLabel('sugar');
        $sugar->setUnit('g');
        $manager->persist($sugar);

        $milk = new Ingredient();
        $milk->setLabel('milk');
        $milk->setUnit('l');
        $manager->persist($milk);

        $manager->flush();
    }

    public static function getGroups(): array
    {
        return ['ingredients'];
    }
}