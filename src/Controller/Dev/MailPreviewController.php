<?php
// src/Controller/Dev/MailPreviewController.php

namespace App\Controller\Dev;

use App\Entity\Recipe;
use App\Entity\User;
use App\Enums\RecipeStatus as EnumsRecipeStatus;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * ⚠️ Contrôleur réservé au développement.
 * Il n'est routé QUE si config/routes/dev/mail_preview.yaml est importé
 * sous un bloc "when@dev" — voir plus bas. Rien ici ne touche la base
 * de données réelle : on fabrique des entités "factices" en mémoire,
 * jamais persistées (pas de persist()/flush()).
 */
#[Route('/dev/mail-preview')]
class MailPreviewController extends AbstractController
{
    /** Liste cliquable de tous les emails disponibles */
    #[Route('', name: 'dev_mail_preview_index', methods: ['GET'])]
    public function index(): Response
    {
        $emails = [
            'welcome'          => 'Bienvenue (inscription)',
            'recipe-pending'   => 'Recette en attente de modération',
            'recipe-accepted'  => 'Recette acceptée',
            'recipe-declined'  => 'Recette refusée',
            'password-changed' => 'Mot de passe modifié',
            'admin-new-recipe' => 'Alerte admin : nouvelle recette',
            'password-reset'   => 'Réinitialisation de mot de passe'
        ];

        return $this->render('dev/mail_preview_index.html.twig', ['emails' => $emails]);
    }

    /** Rendu direct du HTML d'un email, avec des données bidon réalistes */
    #[Route('/{name}', name: 'dev_mail_preview_show', methods: ['GET'])]
    public function show(string $name, Request $request): Response
    {
        $locale = $request->query->get('locale', 'fr');
        if (!in_array($locale, ['fr', 'en'], true)) {
            $locale = 'fr';
        }
        $fakeUser = $this->buildFakeUser($locale);
        $fakeRecipe = $this->buildFakeRecipe($fakeUser);

        $template = match ($name) {
            'welcome' => ['emails/welcome.html.twig', ['user' => $fakeUser, 'locale' => $locale]],
            'recipe-pending'   => ['emails/recipe_pending.html.twig',   ['recipe' => $fakeRecipe, 'locale' => $locale]],
            'recipe-accepted'  => ['emails/recipe_accepted.html.twig',  ['recipe' => $fakeRecipe, 'locale' => $locale]],
            'recipe-declined'  => ['emails/recipe_declined.html.twig',  ['recipe' => $fakeRecipe, 'locale' => $locale, 'reason' => 'Photos de mauvaise qualité, merci de les retravailler.']],
            'password-changed' => ['emails/password_changed.html.twig', ['user' => $fakeUser, 'locale' => $locale]],
            'admin-new-recipe' => ['emails/admin_new_recipe.html.twig', ['recipe' => $fakeRecipe, 'locale' => $locale, 'admin' => $fakeUser]],
            'password-reset' => ['emails/password_reset.html.twig', ['resetUrl' => '#', 'expiryMinutes' => 15, 'locale' => $locale, 'user' => $fakeUser]],
            default            => throw $this->createNotFoundException("Email \"$name\" inconnu."),
        };

        // On rend le template DIRECTEMENT, sans passer par TemplatedEmail/MailerInterface.
        // C'est volontaire : on veut juste voir le HTML, pas tester l'envoi.
        return $this->render($template[0], $template[1]);
    }

    private function buildFakeUser(string $locale): User
    {
        $user = new User();
        $user->setFirstName('Marie');
        $user->setLastName('Dupont');
        $user->setEmail('marie.dupont@example.com');
        $user->setCreatedAt(time());
        $user->setRoles(['ROLE_USER']);
        $user->setLocale($locale);

        return $user;
    }

    private function buildFakeRecipe(User $user): Recipe
    {
        $recipe = new Recipe();
        $recipe->setTitle('Tarte Tatin aux pommes');
        $recipe->setNbPeople(4);
        $recipe->setPrepTime(30);
        $recipe->setCookingTime(45);
        $recipe->setCreatedAt(time());
        $recipe->setStatus(EnumsRecipeStatus::PENDING);
        $recipe->setUser($user);

        return $recipe;
    }
}