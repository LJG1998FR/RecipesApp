<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261017150633 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // On met un DEFAULT 'PUBLISHED' temporaire pour satisfaire le NOT NULL
        // sur les lignes déjà existantes
        $this->addSql("ALTER TABLE recipes ADD status VARCHAR(255) NOT NULL DEFAULT 'PUBLISHED'");
    }

    public function down(Schema $schema): void
    {

        $this->addSql('ALTER TABLE recipes DROP status');
    }
}
