<?php

namespace App\Tests\Unit\Security;

use App\Security\PasswordPolicy;
use PHPUnit\Framework\TestCase;

/**
 * Test unitaire "classique" : PasswordPolicy::validate() est une méthode
 * STATIQUE et PURE (aucun état, aucune dépendance). Pas besoin de kernel,
 * pas de Reflection : on l'appelle directement, comme n'importe quelle
 * fonction PHP. C'est le cas le plus simple et le plus rapide à tester —
 * le modèle à reproduire chaque fois que de la logique métier peut être
 * extraite d'un contrôleur vers une classe dédiée.
 *
 * ✅ Bon réflexe repéré en relisant le code (et vérifié ici par les tests
 * fonctionnels) : PasswordPolicy::validate() est appelée aux DEUX endroits
 * qui créent/modifient un mot de passe —
 *   - AuthController::register()               (inscription)
 *   - UserController::validateUserData()        (changement de mot de passe
 *     depuis le profil, appelée par update())
 * — donc pas de "porte dérobée" qui laisserait passer un mot de passe
 * faible par un chemin alternatif. C'est exactement le genre de cohérence
 * qu'un test fonctionnel dédié doit vérifier explicitement plutôt que de
 * la supposer : voir
 * UserControllerTest::testUpdate_weakNewPassword_isRejectedBySamePolicyAsRegistration().
 */
final class PasswordPolicyTest extends TestCase
{
    public function testValidate_strongPassword_returnsNoErrors(): void
    {
        $errors = PasswordPolicy::validate('UnMotDePasseTresLong1');

        self::assertSame([], $errors);
    }

    public function testValidate_tooShort_returnsTooShort(): void
    {
        // 15 caractères : un de moins que MIN_LENGTH (16). On teste la limite
        // exacte plutôt qu'un mot de passe "évidemment" trop court : c'est
        // aux bornes qu'un bug off-by-one (< vs <=) se cache le plus souvent.
        $errors = PasswordPolicy::validate(str_repeat('Aa1', 5)); // 15 caractères

        self::assertContains('too_short', $errors);
    }

    public function testValidate_exactlyMinLength_isAccepted(): void
    {
        $password = 'Aa1' . str_repeat('a', PasswordPolicy::MIN_LENGTH - 3);
        self::assertSame(PasswordPolicy::MIN_LENGTH, mb_strlen($password));

        $errors = PasswordPolicy::validate($password);

        self::assertNotContains('too_short', $errors);
    }

    public function testValidate_missingUppercase_isReported(): void
    {
        $errors = PasswordPolicy::validate('aucune majuscule ici 1');

        self::assertContains('missing_uppercase', $errors);
    }

    public function testValidate_missingLowercase_isReported(): void
    {
        $errors = PasswordPolicy::validate('AUCUNE MINUSCULE ICI 1');

        self::assertContains('missing_lowercase', $errors);
    }

    public function testValidate_missingDigit_isReported(): void
    {
        $errors = PasswordPolicy::validate('AucunChiffreDansCeMotDePasse');

        self::assertContains('missing_digit', $errors);
    }

    public function testValidate_emptyString_reportsAllRules(): void
    {
        $errors = PasswordPolicy::validate('');

        self::assertContains('too_short', $errors);
        self::assertContains('missing_uppercase', $errors);
        self::assertContains('missing_lowercase', $errors);
        self::assertContains('missing_digit', $errors);
        self::assertCount(4, $errors, 'Une chaîne vide doit échouer aux 4 règles, pas plus, pas moins.');
    }

    /**
     * Les accents / caractères multi-octets ne doivent pas fausser le
     * décompte de longueur. mb_strlen() est utilisé côté implémentation
     * précisément pour ça (vs strlen() qui compte les octets, pas les
     * caractères) — ce test prouve que ce choix est le bon, et casserait
     * si quelqu'un "simplifiait" un jour par strlen().
     */
    public function testValidate_multibyteCharacters_areCountedAsSingleCharacters(): void
    {
        // "é" compte pour 1 caractère "humain" mais 2 octets en UTF-8.
        $password = 'Éé1' . str_repeat('é', PasswordPolicy::MIN_LENGTH - 3);
        self::assertSame(PasswordPolicy::MIN_LENGTH, mb_strlen($password));

        $errors = PasswordPolicy::validate($password);

        self::assertNotContains('too_short', $errors);
    }
}
