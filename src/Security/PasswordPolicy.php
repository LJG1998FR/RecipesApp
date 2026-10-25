<?php

namespace App\Security;

final class PasswordPolicy
{
    public const MIN_LENGTH = 16;

    /**
     * @return string[] Liste de codes d'erreur. Tableau vide = mot de passe valide.
     */
    public static function validate(string $password): array
    {
        $errors = [];

        if (mb_strlen($password) < self::MIN_LENGTH) {
            $errors[] = 'too_short';
        }
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'missing_uppercase';
        }
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'missing_lowercase';
        }
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'missing_digit';
        }

        return $errors;
    }
}