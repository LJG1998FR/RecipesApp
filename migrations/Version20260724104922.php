<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260724104922 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE ingredients (id INT AUTO_INCREMENT NOT NULL, label VARCHAR(255) NOT NULL, unit VARCHAR(255) DEFAULT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE photo_collections (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) NOT NULL, slugger VARCHAR(255) NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE photos (id INT AUTO_INCREMENT NOT NULL, filename VARCHAR(255) NOT NULL, position INT DEFAULT NULL, photo_collection_id INT NOT NULL, INDEX IDX_876E0D9D5787C2A (photo_collection_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE recipe_ingredients (id INT AUTO_INCREMENT NOT NULL, amount INT NOT NULL, recipe_id INT NOT NULL, ingredient_id INT NOT NULL, INDEX IDX_9F925F2B59D8A214 (recipe_id), INDEX IDX_9F925F2B933FE08C (ingredient_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE recipes (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) NOT NULL, nb_people SMALLINT NOT NULL, type VARCHAR(255) NOT NULL, prep_time INT NOT NULL, cooking_time INT DEFAULT NULL, tips LONGTEXT DEFAULT NULL, created_at INT NOT NULL, user_id INT DEFAULT NULL, INDEX IDX_A369E2B5A76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE steps (id INT AUTO_INCREMENT NOT NULL, `index` SMALLINT NOT NULL, description VARCHAR(255) NOT NULL, recipe_id INT NOT NULL, INDEX IDX_34220A7259D8A214 (recipe_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE users (id INT AUTO_INCREMENT NOT NULL, email VARCHAR(180) NOT NULL, roles JSON NOT NULL, password VARCHAR(255) NOT NULL, first_name VARCHAR(50) NOT NULL, last_name VARCHAR(100) NOT NULL, UNIQUE INDEX UNIQ_IDENTIFIER_EMAIL (email), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE messenger_messages (id BIGINT AUTO_INCREMENT NOT NULL, body LONGTEXT NOT NULL, headers LONGTEXT NOT NULL, queue_name VARCHAR(190) NOT NULL, created_at DATETIME NOT NULL, available_at DATETIME NOT NULL, delivered_at DATETIME DEFAULT NULL, INDEX IDX_75EA56E0FB7336F0E3BD61CE16BA31DBBF396750 (queue_name, available_at, delivered_at, id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE photos ADD CONSTRAINT FK_876E0D9D5787C2A FOREIGN KEY (photo_collection_id) REFERENCES photo_collections (id)');
        $this->addSql('ALTER TABLE recipe_ingredients ADD CONSTRAINT FK_9F925F2B59D8A214 FOREIGN KEY (recipe_id) REFERENCES recipes (id)');
        $this->addSql('ALTER TABLE recipe_ingredients ADD CONSTRAINT FK_9F925F2B933FE08C FOREIGN KEY (ingredient_id) REFERENCES ingredients (id)');
        $this->addSql('ALTER TABLE recipes ADD CONSTRAINT FK_A369E2B5A76ED395 FOREIGN KEY (user_id) REFERENCES users (id)');
        $this->addSql('ALTER TABLE steps ADD CONSTRAINT FK_34220A7259D8A214 FOREIGN KEY (recipe_id) REFERENCES recipes (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE photos DROP FOREIGN KEY FK_876E0D9D5787C2A');
        $this->addSql('ALTER TABLE recipe_ingredients DROP FOREIGN KEY FK_9F925F2B59D8A214');
        $this->addSql('ALTER TABLE recipe_ingredients DROP FOREIGN KEY FK_9F925F2B933FE08C');
        $this->addSql('ALTER TABLE recipes DROP FOREIGN KEY FK_A369E2B5A76ED395');
        $this->addSql('ALTER TABLE steps DROP FOREIGN KEY FK_34220A7259D8A214');
        $this->addSql('DROP TABLE ingredients');
        $this->addSql('DROP TABLE photo_collections');
        $this->addSql('DROP TABLE photos');
        $this->addSql('DROP TABLE recipe_ingredients');
        $this->addSql('DROP TABLE recipes');
        $this->addSql('DROP TABLE steps');
        $this->addSql('DROP TABLE users');
        $this->addSql('DROP TABLE messenger_messages');
    }
}
