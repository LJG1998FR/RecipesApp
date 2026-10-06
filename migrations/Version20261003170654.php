<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261003170654 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE recipes ADD photo_collection_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE recipes ADD CONSTRAINT FK_A369E2B5D5787C2A FOREIGN KEY (photo_collection_id) REFERENCES photo_collections (id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_A369E2B5D5787C2A ON recipes (photo_collection_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE recipes DROP FOREIGN KEY FK_A369E2B5D5787C2A');
        $this->addSql('DROP INDEX UNIQ_A369E2B5D5787C2A ON recipes');
        $this->addSql('ALTER TABLE recipes DROP photo_collection_id');
    }
}
