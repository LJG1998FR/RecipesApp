<?php

namespace App\Service;

use App\Entity\Photo;
use App\Entity\PhotoCollection;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Uid\Uuid;

class PhotoUploader
{
    public function __construct(
        private readonly string $recipesPhotosDir,
    ) {
    }

    public function upload(UploadedFile $file, PhotoCollection $collection): Photo
    {
        $targetDir = $this->targetDir($collection);

        if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
            throw new \RuntimeException(sprintf('Impossible de créer le dossier "%s".', $targetDir));
        }

        $extension = $file->guessExtension() ?? 'bin';
        $filename = Uuid::v4()->toRfc4122() . '.' . $extension;

        $file->move($targetDir, $filename);

        $photo = new Photo();
        $photo->setFilename($filename);
        $photo->setPhotoCollection($collection);

        return $photo;
    }

    public function delete(Photo $photo): void
    {
        $path = $this->targetDir($photo->getPhotoCollection()) . '/' . $photo->getFilename();
        if (is_file($path)) {
            unlink($path);
        }
    }

    /** Chemin public (ex: /recipes/3f2a.../b91c....jpg), à préfixer du domaine côté front. */
    public function publicPath(Photo $photo): string
    {
        return sprintf('/recipes/%s/%s', $photo->getPhotoCollection()->getSlugger(), $photo->getFilename());
    }

    private function targetDir(PhotoCollection $collection): string
    {
        return $this->recipesPhotosDir . '/' . $collection->getSlugger();
    }
}