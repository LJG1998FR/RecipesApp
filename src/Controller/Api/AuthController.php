<?php

namespace App\Controller\Api;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class AuthController extends AbstractController
{
    #[Route('/api/register', name: 'api_register', methods: ['POST'])]
    public function register(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher,
        JWTTokenManagerInterface $jwtManager,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        $email     = trim($data['email'] ?? '');
        $password  = $data['password'] ?? '';
        $firstName = trim($data['firstName'] ?? '');
        $lastName  = trim($data['lastName'] ?? '');

        // Validations basiques
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Adresse e-mail invalide.'], 422);
        }
        if (strlen($password) < 8) {
            return $this->json(['error' => 'Le mot de passe doit faire au moins 8 caractères.'], 422);
        }
        if (!$firstName || !$lastName) {
            return $this->json(['error' => 'Prénom et nom requis.'], 422);
        }

        // Vérifier unicité email
        $existing = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existing) {
            return $this->json(['error' => 'Cet e-mail est déjà utilisé.'], 409);
        }

        $user = new User();
        $user->setEmail($email);
        $user->setFirstName($firstName);
        $user->setLastName($lastName);
        $user->setRoles(['ROLE_USER']);
        $user->setPassword($hasher->hashPassword($user, $password));

        $em->persist($user);
        $em->flush();

        $token = $jwtManager->create($user);

        return $this->json([
            'token'     => $token,
            'user'      => [
                'id'        => $user->getId(),
                'email'     => $user->getEmail(),
                'firstName' => $user->getFirstName(),
                'lastName'  => $user->getLastName(),
            ],
        ], 201);
    }
}