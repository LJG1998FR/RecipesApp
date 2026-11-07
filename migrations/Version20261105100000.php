<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Ajoute la table saved_recipes (favoris) : jointure explicite User <-> Recipe.
 *
 * Points clés :
 * - UNIQUE INDEX sur (user_id, recipe_id) : empêche un même user de
 *   sauvegarder deux fois la même recette (contrainte posée en base, pas
 *   seulement côté PHP — la vraie garantie contre une race condition).
 * - ON DELETE CASCADE sur les deux clés étrangères : si un user ou une
 *   recette est supprimé, ses lignes de favoris disparaissent avec lui
 *   plutôt que de laisser des lignes orphelines pointant vers du vide.
 */
final class Version20261105100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute la table saved_recipes pour la fonctionnalité "recettes favorites"';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE saved_recipes (id INT AUTO_INCREMENT NOT NULL, created_at INT NOT NULL, user_id INT NOT NULL, recipe_id INT NOT NULL, UNIQUE INDEX UNIQ_SAVED_RECIPE_USER_RECIPE (user_id, recipe_id), INDEX IDX_SAVED_RECIPES_USER (user_id), INDEX IDX_SAVED_RECIPES_RECIPE (recipe_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE saved_recipes ADD CONSTRAINT FK_SAVED_RECIPES_USER FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE saved_recipes ADD CONSTRAINT FK_SAVED_RECIPES_RECIPE FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE saved_recipes DROP FOREIGN KEY FK_SAVED_RECIPES_USER');
        $this->addSql('ALTER TABLE saved_recipes DROP FOREIGN KEY FK_SAVED_RECIPES_RECIPE');
        $this->addSql('DROP TABLE saved_recipes');
    }
}
