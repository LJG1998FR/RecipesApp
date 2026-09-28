<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/users', name: 'api_user_')]
class UserController extends AbstractController
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $em,
        private readonly Security $security,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {}

    // ── GET /api/users ─────────────────────────────────────────────────────────
    // Réservé aux SUPER_ADMIN (géré aussi par access_control dans security.yaml)

    #[Route('', name: 'list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_SUPER_ADMIN');

        $users = $this->userRepository->findAll();

        $data = array_map(fn(User $u) => [
            'id'        => $u->getId(),
            'firstName' => $u->getFirstName(),
            'lastName'  => $u->getLastName(),
            'email'     => $u->getEmail(),
            'role'      => $u->getHighestRole(),
            'createdAt' => $u->getCreatedAt(),
        ], $users);

        return $this->json($data, Response::HTTP_OK);
    }

    // ── GET /api/users/{id} ────────────────────────────────────────────────────

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(int $id): JsonResponse
    {
        $target = $this->userRepository->find($id);

        if (!$target) {
            return $this->json(['error' => "User $id not found."], Response::HTTP_NOT_FOUND);
        }

        // Un user peut voir son propre profil ; un SUPER_ADMIN peut voir n'importe qui
        if (!$this->canViewUser($target)) {
            return $this->json(['error' => 'Access denied.'], Response::HTTP_FORBIDDEN);
        }

        return $this->json($this->serialize($target), Response::HTTP_OK);
    }

    // ── POST /api/users/getUser ────────────────────────────────────────────────
    // Récupère le profil de l'utilisateur actuellement connecté

    #[Route('/getUser', name: 'getUserData', methods: ['POST'])]
    public function getUserData(): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (!$user) {
            return $this->json(['error' => 'Not authenticated.'], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json($this->serialize($user), Response::HTTP_OK);
    }

    // ── PUT /api/users/update ──────────────────────────────────────────────────
    // Chaque utilisateur peut modifier son propre profil (email, password).
    // Un SUPER_ADMIN peut modifier n'importe qui.
    // PERSONNE ne peut changer son propre rôle.

    #[Route('/update', name: 'update', methods: ['PUT'])]
    public function update(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON body.'], Response::HTTP_BAD_REQUEST);
        }

        /** @var User $currentUser */
        $currentUser = $this->getUser();

        // Détermine l'utilisateur cible
        // Un SUPER_ADMIN peut passer un `targetEmail` pour modifier quelqu'un d'autre
        $targetEmail = $data['targetEmail'] ?? $data['email'] ?? null;
        $target      = $targetEmail
            ? $this->userRepository->findOneBy(['email' => $targetEmail])
            : $currentUser;

        if (!$target) {
            return $this->json(['error' => 'User not found.'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->canEditUser($target)) {
            return $this->json(['error' => 'Access denied.'], Response::HTTP_FORBIDDEN);
        }

        // ── Protection auto-modification de rôle ──────────────────────────────
        // Personne ne peut changer son PROPRE rôle, même un SUPER_ADMIN
        if (isset($data['role']) && $target === $currentUser) {
            return $this->json(
                ['error' => 'You cannot change your own role.'],
                Response::HTTP_FORBIDDEN
            );
        }

        // Un SUPER_ADMIN peut changer le rôle d'un AUTRE utilisateur
        if (isset($data['role']) && $this->isGranted('ROLE_SUPER_ADMIN') && $target !== $currentUser) {
            $allowedRoles = ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN'];
            if (!in_array($data['role'], $allowedRoles, true)) {
                return $this->json(['errors' => ['role' => 'Invalid role.']], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $target->setRoles([$data['role']]);
        }

        // ── Validation & mise à jour des champs autorisés ──────────────────────
        $errors = $this->validateUserData($data);
        if (!empty($errors)) {
            return $this->json(['errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (isset($data['firstName'])) {
            $target->setFirstName(trim($data['firstName']));
        }

        if (isset($data['lastName'])) {
            $target->setLastName(trim($data['lastName']));
        }

        if (isset($data['email']) && $data['email'] !== $target->getEmail()) {
            $existing = $this->userRepository->findOneBy(['email' => trim($data['email'])]);
            if ($existing && $existing->getId() !== $target->getId()) {
                return $this->json(
                    ['errors' => ['email' => 'This email is already in use.']],
                    Response::HTTP_CONFLICT
                );
            }
            $target->setEmail(trim($data['email']));
        }

        if (!empty($data['password'])) {
            $target->setPassword($this->passwordHasher->hashPassword($target, $data['password']));
        }

        $this->em->flush();

        return $this->json($this->serialize($target), Response::HTTP_OK);
    }

       // ── PUT /api/users/admin-update ────────────────────────────────────────────────────

    /*#[Route('/admin-update', name: 'admin-update', methods: ['PUT'])]
    public function updateAsAdmin(Request $request): JsonResponse
    {
        
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(
                ['error' => 'Invalid JSON body.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $user = $this->userRepository->findOneBy(["id" => $data["id"]]);

        if (!$user) {
            return $this->json(
                ['error' => "User not found."],
                Response::HTTP_NOT_FOUND,
            );
        }

        if (!$this->canAccessUser($user)) {
            return $this->json(
                ['error' => 'You are not allowed to update this user.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        // At least one updatable field must be provided
        $updatableFields = ['email', 'firstName', 'lastName', 'password', 'role'];
        if (empty(array_intersect(array_keys($data), $updatableFields))) {
            return $this->json(
                ['error' => 'No updatable field provided. Accepted fields: ' . implode(', ', $updatableFields)],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $errors = $this->validateUserData($data);
        if (!empty($errors)) {
            return $this->json(['errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (isset($data['firstName'])) {
            $user->setFirstName(trim($data['firstName']));
        }

        if (isset($data['lastName'])) {
            $user->setLastName(trim($data['lastName']));
        }

        if (isset($data['email'])) {
            // Ensure the new email is not already used by another account
            $existing = $this->userRepository->findOneBy(['email' => trim($data['email'])]);
            if ($existing && $existing->getId() !== $user->getId()) {
                return $this->json(
                    ['errors' => ['email' => 'This email address is already in use.']],
                    Response::HTTP_CONFLICT,
                );
            }
            $user->setEmail(trim($data['email']));
        }

        if (isset($data['password'])) {
            $hashed = $this->passwordHasher->hashPassword($user, $data['password']);
            $user->setPassword($hashed);
        }

        $this->em->flush();

        return $this->json($this->serialize($user), Response::HTTP_OK);
    }*/

    // ── DELETE /api/users/{id} ─────────────────────────────────────────────────
    #[Route('/{id}', name: 'delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $this->getUser();
        $target      = $this->userRepository->find($id);

        if (!$target) {
            return $this->json(['error' => "User $id not found."], Response::HTTP_NOT_FOUND);
        }

        $isSelf       = $target === $currentUser;
        $isSuperAdmin = $this->isGranted('ROLE_SUPER_ADMIN');

        // Un user peut supprimer son propre compte.
        // Un SUPER_ADMIN peut supprimer n'importe qui sauf lui-même.
        if (!$isSelf && !$isSuperAdmin) {
            return $this->json(['error' => 'Access denied.'], Response::HTTP_FORBIDDEN);
        }

        if ($isSuperAdmin && $isSelf) {
            return $this->json(
                ['error' => 'A Super Admin cannot delete their own account.'],
                Response::HTTP_FORBIDDEN
            );
        }

        $this->em->remove($target);
        $this->em->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    // ── POST /api/users/create ─────────────────────────────────────────────────
    // Création d'un utilisateur par un SUPER_ADMIN

    #[Route('/create', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_SUPER_ADMIN');

        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON body.'], Response::HTTP_BAD_REQUEST);
        }

        foreach (['email', 'password', 'firstName', 'lastName'] as $required) {
            if (empty($data[$required])) {
                return $this->json(
                    ['errors' => [$required => "Field \"$required\" is required."]],
                    Response::HTTP_UNPROCESSABLE_ENTITY
                );
            }
        }

        if ($this->userRepository->findOneBy(['email' => $data['email']])) {
            return $this->json(
                ['errors' => ['email' => 'This email is already in use.']],
                Response::HTTP_CONFLICT
            );
        }

        $allowedRoles = ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN'];
        $role         = $data['role'] ?? 'ROLE_USER';

        if (!in_array($role, $allowedRoles, true)) {
            return $this->json(
                ['errors' => ['role' => 'Invalid role.']],
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $user = new User();
        $user->setEmail(trim($data['email']));
        $user->setFirstName(trim($data['firstName']));
        $user->setLastName(trim($data['lastName']));
        $user->setRoles([$role]);
        $user->setCreatedAt(time());
        $user->setPassword($this->passwordHasher->hashPassword($user, $data['password']));

        $this->em->persist($user);
        $this->em->flush();

        return $this->json($this->serialize($user), Response::HTTP_CREATED);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Peut voir le profil d'un utilisateur ?
     * → Oui si c'est soi-même, ou si on est SUPER_ADMIN
     */
    private function canViewUser(User $target): bool
    {
        return $this->getUser() === $target || $this->isGranted('ROLE_SUPER_ADMIN');
    }

    /**
     * Peut modifier un utilisateur ?
     * → Oui si c'est soi-même (son propre profil), ou si on est SUPER_ADMIN
     * Note : un ADMIN ne peut PAS modifier les autres utilisateurs
     */
    private function canEditUser(User $target): bool
    {
        return $this->getUser() === $target || $this->isGranted('ROLE_SUPER_ADMIN');
    }

    /**
     * Validation des champs (uniquement les champs présents dans la requête).
     * @return array<string, string>
     */
    private function validateUserData(array $data): array
    {
        $errors = [];

        if (isset($data['firstName']) && trim((string) $data['firstName']) === '') {
            $errors['firstName'] = 'First name cannot be empty.';
        }

        if (isset($data['lastName']) && trim((string) $data['lastName']) === '') {
            $errors['lastName'] = 'Last name cannot be empty.';
        }

        if (isset($data['email'])) {
            $email = trim((string) $data['email']);
            if ($email === '') {
                $errors['email'] = 'Email cannot be empty.';
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors['email'] = 'Email is not valid.';
            }
        }

        if (!empty($data['password']) && strlen((string) $data['password']) < 8) {
            $errors['password'] = 'Password must be at least 8 characters.';
        }

        return $errors;
    }

    /** Sérialise un User en tableau pour la réponse JSON. */
    private function serialize(User $user): array
    {
        return [
            'email'       => $user->getEmail(),
            'firstName'   => $user->getFirstName(),
            'lastName'    => $user->getLastName(),
            'memberSince' => $user->getCreatedAt(),
            'role'        => $user->getHighestRole(),
            'recipes'     => $user->getRecipes()->map(fn($r) => [
                'title' => $r->getTitle(),
                'type'  => $r->getType()?->value,
            ])->toArray(),
        ];
    }
}