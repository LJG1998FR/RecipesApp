<?php

namespace App\EventListener;

use App\Entity\Recipe;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Event\PreRemoveEventArgs;
use Doctrine\ORM\Events;

#[AsEntityListener(event: Events::preRemove, method: 'preRemove', entity: Recipe::class)]
class RecipePhotoCleanupListener
{
    public function __construct(private readonly string $recipesPhotosDir)
    {
    }

    public function preRemove(Recipe $recipe, PreRemoveEventArgs $args): void
    {
        $collection = $recipe->getPhotoCollection();
        if (!$collection) {
            return;
        }

        $dir = $this->recipesPhotosDir . '/' . $collection->getSlugger();
        if (is_dir($dir)) {
            array_map('unlink', glob($dir . '/*') ?: []);
            rmdir($dir);
        }
    }
}