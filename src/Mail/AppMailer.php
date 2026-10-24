<?php

namespace App\Mail;

use App\Entity\Recipe;
use App\Entity\User;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Contracts\Translation\TranslatorInterface;

class AppMailer
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly TranslatorInterface $translator,
        private readonly string $fromAddress = 'no-reply@saveurs.app',
        private readonly string $fromName = 'Saveurs',
    ) {}

    private function from(): Address
    {
        return new Address($this->fromAddress, $this->fromName);
    }

    /**
     * Point d'entrée UNIQUE pour construire et envoyer un email templaté.
     *
     * Factorise ce qui est strictement mécanique :
     *   - traduire le sujet (toujours domaine "emails", toujours locale explicite)
     *   - construire le TemplatedEmail (from, to, subject, template)
     *   - injecter "locale" dans le contexte Twig (sinon les |trans du template
     *     retombent sur la locale par défaut — cf. le piège qu'on a identifié
     *     plus tôt avec les emails envoyés depuis le worker Messenger)
     *   - envoyer
     *
     * Reste volontairement EN DEHORS de cette méthode, à la charge de chaque
     * appelant : d'où vient le destinataire, d'où vient la locale (auteur de
     * la recette ? admin destinataire ? utilisateur lui-même ?), et quelles
     * données métier passer au template. Ce sont des décisions différentes
     * selon le mail, les y mélanger aurait recréé un couplage artificiel.
     *
     * @param array<string,string> $subjectParams Paramètres d'interpolation du sujet (ex: ['{title}' => ...])
     * @param array<string,mixed>  $context       Contexte Twig du template (hors "locale", ajoutée automatiquement)
     */
    private function send(
        string $toEmail,
        string $locale,
        string $subjectTransKey,
        array $subjectParams,
        string $template,
        array $context,
    ): void {
        $subject = $this->translator->trans(
            $subjectTransKey,
            $subjectParams,
            'emails',
            $locale,
        );

        $this->mailer->send(
            (new TemplatedEmail())
                ->from($this->from())
                ->to($toEmail)
                ->subject($subject)
                ->htmlTemplate($template)
                ->context($context + ['locale' => $locale])
        );
    }

    public function sendWelcome(User $user): void
    {
        $this->send(
            toEmail: $user->getEmail(),
            locale: $user->getLocale(),
            subjectTransKey: 'welcome.subject',
            subjectParams: ['{firstName}' => $user->getFirstName()],
            template: 'emails/welcome.html.twig',
            context: ['user' => $user],
        );
    }

    public function sendRecipePending(Recipe $recipe): void
    {
        // La locale suit TOUJOURS l'auteur de la recette, jamais une valeur par défaut.
        $this->send(
            toEmail: $recipe->getUser()->getEmail(),
            locale: $recipe->getUser()->getLocale(),
            subjectTransKey: 'recipe_pending.subject',
            subjectParams: ['{title}' => $recipe->getTitle()],
            template: 'emails/recipe_pending.html.twig',
            context: ['recipe' => $recipe],
        );
    }

    public function sendRecipeAccepted(Recipe $recipe): void
    {
        $this->send(
            toEmail: $recipe->getUser()->getEmail(),
            locale: $recipe->getUser()->getLocale(),
            subjectTransKey: 'recipe_accepted.subject',
            subjectParams: ['{title}' => $recipe->getTitle()],
            template: 'emails/recipe_accepted.html.twig',
            context: ['recipe' => $recipe],
        );
    }

    public function sendRecipeDeclined(Recipe $recipe, ?string $reason = null): void
    {
        $this->send(
            toEmail: $recipe->getUser()->getEmail(),
            locale: $recipe->getUser()->getLocale(),
            subjectTransKey: 'recipe_declined.subject',
            subjectParams: ['{title}' => $recipe->getTitle()],
            template: 'emails/recipe_declined.html.twig',
            // ⚠️ 'reason' n'est pas traduit (texte libre saisi par un modérateur) :
            // il passe tel quel dans le contexte, à côté de 'locale' qui sert
            // uniquement à traduire le reste du gabarit.
            context: ['recipe' => $recipe, 'reason' => $reason],
        );
    }

    public function sendPasswordChanged(User $user): void
    {
        $this->send(
            toEmail: $user->getEmail(),
            locale: $user->getLocale(),
            subjectTransKey: 'password_changed.subject',
            subjectParams: [],
            template: 'emails/password_changed.html.twig',
            context: ['user' => $user],
        );
    }

    /** @param User[] $admins */
    public function sendAdminNewRecipeAlert(Recipe $recipe, array $admins): void
    {
        foreach ($admins as $admin) {
            // Chaque admin reçoit le mail dans SA PROPRE langue — pas celle
            // de l'auteur de la recette. C'est la bonne granularité ici :
            // la locale appartient au destinataire du mail, pas au contenu.
            // (C'est précisément le genre de nuance qu'une factorisation trop
            // agressive — ex: un seul paramètre "locale" déduit automatiquement
            // d'une entité générique — aurait pu faire disparaître par erreur.)
            $this->send(
                toEmail: $admin->getEmail(),
                locale: $admin->getLocale(),
                subjectTransKey: 'admin_new_recipe.subject',
                subjectParams: ['{title}' => $recipe->getTitle()],
                template: 'emails/admin_new_recipe.html.twig',
                context: ['recipe' => $recipe, 'admin' => $admin],
            );
        }
    }
}