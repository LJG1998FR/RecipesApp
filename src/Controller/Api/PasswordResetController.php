<?php

namespace App\Controller\Api;

use App\Entity\PasswordResetToken;
use App\Mail\AppMailer;
use App\Repository\PasswordResetTokenRepository;
use App\Repository\UserRepository;
use App\Security\PasswordPolicy;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

class PasswordResetController extends AbstractController
{
    private const TOKEN_TTL_SECONDS = 900; // 15 mins

    #[Route('/api/password/forgot', name: 'api_password_forgot', methods: ['POST'])]
    public function forgot(
        Request $request,
        UserRepository $userRepository,
        PasswordResetTokenRepository $tokenRepository,
        EntityManagerInterface $em,
        AppMailer $mailer,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = trim($data['email'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Adresse e-mail invalide.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user = $userRepository->findOneBy(['email' => $email]);

        // ⚠️ Réponse strictement identique que le compte existe ou non —
        // ne jamais laisser deviner si un email est enregistré (user enumeration).
        if ($user) {
            $tokenRepository->invalidateAllForUser($user);

            $plainToken = bin2hex(random_bytes(32));

            $resetToken = new PasswordResetToken();
            $resetToken->setUser($user);
            $resetToken->setTokenHash(hash('sha256', $plainToken));
            $resetToken->setExpiresAt(time() + self::TOKEN_TTL_SECONDS);
            $resetToken->setCreatedAt(time());

            $em->persist($resetToken);
            $em->flush();

            $frontendUrl = $this->getParameter('app.frontend_url');
            $resetUrl = sprintf('%s/reinitialiser-mot-de-passe?token=%s', rtrim($frontendUrl, '/'), $plainToken);

            $mailer->sendPasswordReset($user, $resetUrl);
        }

        return $this->json(['message' => 'If an account exists, an email has been sent.'], Response::HTTP_OK);
    }

    #[Route('/api/password/reset', name: 'api_password_reset', methods: ['POST'])]
    public function reset(
        Request $request,
        PasswordResetTokenRepository $tokenRepository,
        UserPasswordHasherInterface $hasher,
        EntityManagerInterface $em,
        AppMailer $mailer,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $token = $data['token'] ?? '';
        $password = $data['password'] ?? '';

        if (!$token) {
            return $this->json(['error' => 'Token manquant.'], Response::HTTP_BAD_REQUEST);
        }

        $passwordErrors = PasswordPolicy::validate($password);
        if (!empty($passwordErrors)) {
            return $this->json(['errors' => ['password' => $passwordErrors]], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $resetToken = $tokenRepository->findValidByHash(hash('sha256', $token));

        if (!$resetToken) {
            // Pas de distinction "introuvable" vs "expiré" dans le message :
            // ça n'apporte rien à l'utilisateur, seulement à un attaquant.
            return $this->json(['error' => 'Ce lien a expiré ou a déjà été utilisé.'], Response::HTTP_GONE);
        }

        $user = $resetToken->getUser();
        $user->setPassword($hasher->hashPassword($user, $password));
        $resetToken->setUsedAt(time());

        $em->flush();

        // Cohérent avec ton flux "changement de mot de passe" du profil :
        // on notifie toujours l'utilisateur quand son mot de passe change.
        $mailer->sendPasswordChanged($user);

        return $this->json(['message' => 'Password updated.'], Response::HTTP_OK);
    }
}