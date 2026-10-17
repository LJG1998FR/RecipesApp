#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * ============================================================================
 * Script d'export des traductions YAML vers JSON pour React
 * ============================================================================
 *
 * USAGE :
 *   php bin/export-translations.php [langue]
 *
 * EXEMPLES :
 *   php bin/export-translations.php           # Exporte toutes les langues
 *   php bin/export-translations.php en        # Exporte seulement l'anglais
 *   php bin/export-translations.php fr        # Exporte seulement le français
 *
 * ============================================================================
 */

// Autoloader Symfony
require __DIR__.'/../vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;
use Symfony\Component\Yaml\Exception\ParseException;

// Configuration
$translationsDir = __DIR__.'/../translations';
$outputDir = __DIR__.'/../front/src/locales';

// Récupérer la langue depuis les arguments CLI
$targetLang = $argv[1] ?? null;

// Couleurs pour le terminal (optionnel, pour un meilleur feedback)
class Color {
    const GREEN = "\033[32m";
    const RED = "\033[31m";
    const YELLOW = "\033[33m";
    const BLUE = "\033[34m";
    const RESET = "\033[0m";
}

echo Color::BLUE . "\n╔════════════════════════════════════════════════════╗\n";
echo "║   SANCTUARY - Export des traductions YAML → JSON  ║\n";
echo "╚════════════════════════════════════════════════════╝\n" . Color::RESET;

// ── Garde-fou : symfony/yaml est-il bien installé ? ──────────────────────────
// Le composant Yaml est tiré indirectement par symfony/translation,
// mais mieux vaut un message clair qu'une fatal error incompréhensible.
if (!class_exists(Yaml::class)) {
    echo Color::RED . "✗ La classe Symfony\\Component\\Yaml\\Yaml est introuvable.\n";
    echo "  Vérifie que 'symfony/yaml' est bien présent dans ton composer.json\n" . Color::RESET;
    exit(1);
}

// ── Garde-fou : format de langue valide (2 lettres, ex: fr, en) ─────────────
if ($targetLang !== null && !preg_match('/^[a-z]{2}$/', $targetLang)) {
    echo Color::RED . "✗ Langue invalide : \"$targetLang\". Format attendu : 2 lettres minuscules (ex: fr, en).\n" . Color::RESET;
    exit(1);
}

// Créer le dossier de sortie s'il n'existe pas
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0755, true);
    echo Color::GREEN . "✓ Dossier créé : $outputDir\n" . Color::RESET;
}

if (!is_writable($outputDir)) {
    echo Color::RED . "✗ Le dossier $outputDir n'est pas accessible en écriture.\n" . Color::RESET;
    exit(1);
}

// Scanner les fichiers de traduction disponibles
$translationFiles = glob("$translationsDir/messages.*.yaml");
sort($translationFiles); // ordre déterministe, indépendant du filesystem

if (empty($translationFiles)) {
    echo Color::RED . "✗ Aucun fichier de traduction trouvé dans $translationsDir\n" . Color::RESET;
    exit(1);
}

$exportedCount = 0;
$errors = [];
$foundTargetLang = false;

foreach ($translationFiles as $yamlFile) {
    // Extraire la langue depuis le nom de fichier (messages.en.yaml → en)
    preg_match('/messages\.([a-z]{2})\.yaml$/', basename($yamlFile), $matches);

    if (!isset($matches[1])) {
        echo Color::YELLOW . "⚠ Fichier ignoré (format invalide) : " . basename($yamlFile) . "\n" . Color::RESET;
        continue;
    }

    $lang = $matches[1];

    // Si une langue cible est spécifiée, ignorer les autres
    if ($targetLang && $lang !== $targetLang) {
        continue;
    }

    if ($targetLang) {
        $foundTargetLang = true;
    }

    echo "\n" . Color::BLUE . "→ Traitement de la langue : $lang\n" . Color::RESET;

    try {
        // Charger le fichier YAML
        echo "  • Lecture du fichier YAML...";
        $translations = Yaml::parseFile($yamlFile);
        echo Color::GREEN . " ✓\n" . Color::RESET;

        // Compter les clés (récursivement)
        $keyCount = countKeys($translations ?? []);
        echo "  • Nombre de clés détectées : " . Color::YELLOW . $keyCount . Color::RESET . "\n";

        // Convertir en JSON
        echo "  • Conversion en JSON...";
        $jsonContent = json_encode(
            $translations,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        if ($jsonContent === false) {
            throw new \RuntimeException('Échec de l\'encodage JSON : ' . json_last_error_msg());
        }
        echo Color::GREEN . " ✓\n" . Color::RESET;

        // Sauvegarder le fichier JSON
        $jsonFile = "$outputDir/$lang.json";
        echo "  • Écriture dans $jsonFile...";

        // Ajout d'un retour à la ligne final (bonne pratique POSIX)
        $bytesWritten = file_put_contents($jsonFile, $jsonContent . "\n");

        if ($bytesWritten === false) {
            throw new \RuntimeException('Impossible d\'écrire le fichier JSON');
        }

        echo Color::GREEN . " ✓\n" . Color::RESET;
        echo "  • Taille du fichier : " . Color::YELLOW . formatBytes($bytesWritten) . Color::RESET . "\n";

        $exportedCount++;

    } catch (ParseException $e) {
        $error = "Erreur de parsing YAML pour $lang : " . $e->getMessage();
        $errors[] = $error;
        echo Color::RED . "\n✗ $error\n" . Color::RESET;

    } catch (\Exception $e) {
        $error = "Erreur inattendue pour $lang : " . $e->getMessage();
        $errors[] = $error;
        echo Color::RED . "\n✗ $error\n" . Color::RESET;
    }
}

// ── Garde-fou explicite : langue demandée mais jamais trouvée ───────────────
if ($targetLang && !$foundTargetLang) {
    echo Color::RED . "\n✗ Aucun fichier \"messages.$targetLang.yaml\" trouvé dans $translationsDir\n" . Color::RESET;
    exit(1);
}

// Résumé final
echo "\n" . Color::BLUE . "════════════════════════════════════════════════════\n" . Color::RESET;

if ($exportedCount > 0) {
    echo Color::GREEN . "✓ Export terminé avec succès !\n" . Color::RESET;
    echo "  • Fichiers exportés : " . Color::YELLOW . $exportedCount . Color::RESET . "\n";
    echo "  • Dossier de destination : " . Color::BLUE . $outputDir . Color::RESET . "\n";

    if (!empty($errors)) {
        echo Color::YELLOW . "\n⚠ Avertissements :\n" . Color::RESET;
        foreach ($errors as $error) {
            echo "  • $error\n";
        }
    }

    echo Color::GREEN . "\n✓ Les fichiers JSON sont prêts à être utilisés dans React !\n" . Color::RESET;

} else {
    echo Color::RED . "✗ Aucun fichier n'a été exporté\n" . Color::RESET;

    if (!empty($errors)) {
        echo Color::RED . "\nErreurs détectées :\n" . Color::RESET;
        foreach ($errors as $error) {
            echo "  • $error\n";
        }
    }

    exit(1);
}

echo Color::BLUE . "════════════════════════════════════════════════════\n\n" . Color::RESET;

// ============================================================================
// Fonctions utilitaires
// ============================================================================

/**
 * Compte récursivement le nombre de clés dans un tableau
 */
function countKeys(array $array): int
{
    $count = 0;

    foreach ($array as $value) {
        if (is_array($value)) {
            $count += countKeys($value);
        } else {
            $count++;
        }
    }

    return $count;
}

function formatBytes(int $bytes, int $precision = 2): string
{
    $units = ['B', 'KB', 'MB', 'GB'];
    $i = 0;

    for (; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }

    return round($bytes, $precision) . ' ' . $units[$i];
}