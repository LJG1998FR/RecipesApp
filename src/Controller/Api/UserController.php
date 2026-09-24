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

    #[Route('', name: 'users_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $users = $this->userRepository->findAll();

        $user = $this->getUser();
        if (!$this->canAccessUser($user)) {
            return $this->json(
                ['error' => 'You are not allowed to view this user.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        $data = array_map(fn(User $r) => [
            'id'          => $r->getId(),
            'firstName'       => $r->getFirstName(),
            'lastName' =>  $r->getLastName(),
            'email' => $r->getEmail(),
            'role'        => $r->getHighestRole(),
            'createdAt'    => $r->getCreatedAt(),
        ], $users);

        return $this->json(
            $data,
            Response::HTTP_OK,
        );
    }

    #[Route('/create', name: 'api_users_create', methods: ['POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        $email     = trim($data['email'] ?? '');
        $password  = $data['password'] ?? '';
        $firstName = trim($data['firstName'] ?? '');
        $lastName  = trim($data['lastName'] ?? '');
        $role  = [$data['role']] ?? ['ROLE_USER'];

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
        $user->setCreatedAt(time());
        $user->setRoles($role);
        $user->setPassword($hasher->hashPassword($user, $password));

        $em->persist($user);
        $em->flush();

        return $this->json([
            'user'      => [
                'id'        => $user->getId(),
                'email'     => $user->getEmail(),
                'firstName' => $user->getFirstName(),
                'lastName'  => $user->getLastName(),
                'role'      => $user->getHighestRole()
            ],
        ], 201);
    }

    // ── GET /api/users/{id} ────────────────────────────────────────────────────

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(int $id): JsonResponse
    {
        $user = $this->userRepository->find($id);

        if (!$user) {
            return $this->json(
                ['error' => "User with id $id not found."],
                Response::HTTP_NOT_FOUND,
            );
        }

        if (!$this->canAccessUser($user)) {
            return $this->json(
                ['error' => 'You are not allowed to view this user.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        return $this->json($this->serialize($user), Response::HTTP_OK);
    }

    // ── GET by email /api/users/getUser ────────────────────────────────────────────────────
    #[Route('/getUser', name: 'getUserData', methods: ['POST'])]
    public function getUserData(): JsonResponse
    {
        $user = $this->getUser();
        if(!$user){
            $response = [
                "success" => false,
                 'error' => [
                    'code' => 'INVALID_PARAMETER',
                    'message' => "No user"
                ]
            ];

            
            return new JsonResponse($response, 404);
        }

        if (!$this->canAccessUser($user)) {
            return $this->json(
                ['error' => 'You are not allowed to view this user.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        return $this->json($this->serialize($user), Response::HTTP_OK);
    }

    // ── PUT /api/users/update ────────────────────────────────────────────────────

    #[Route('/update', name: 'update', methods: ['PUT'])]
    public function update(Request $request): JsonResponse
    {
        
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(
                ['error' => 'Invalid JSON body.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $user = $this->userRepository->findOneBy(["email" => $data["email"]]);

        if (!$user) {
            return $this->json(
                ['error' => "User with email " . $data['email'] . " not found."],
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
        $updatableFields = ['password'];
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
    }

    // ── PUT /api/users/admin-update ────────────────────────────────────────────────────

    #[Route('/admin-update', name: 'admin-update', methods: ['PUT'])]
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
    }

    // ── DELETE /api/users/{id} ─────────────────────────────────────────────────

    #[Route('/{id}', name: 'delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->userRepository->find($id);

        if (!$user) {
            return $this->json(
                ['error' => "User with id $id not found."],
                Response::HTTP_NOT_FOUND,
            );
        }

        if (!$this->canAccessUser($user)) {
            return $this->json(
                ['error' => 'You are not allowed to delete this user.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        $this->em->remove($user);
        $this->em->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * A user can only access their own data unless they are an admin.
     */
    private function canAccessUser(User $target): bool
    {
        $currentUser = $this->security->getUser();

        return $currentUser === $target || $this->isGranted('ROLE_ADMIN') || $this->isGranted('ROLE_SUPER_ADMIN');
    }

    /**
     * Validates user update fields (all optional — only validated when present).
     *
     * @return array<string, string> field => error message
     */
    private function validateUserData(array $data): array
    {
        $errors = [];

        if (isset($data['firstName']) && trim((string) $data['firstName']) === '') {
            $errors['firstName'] = 'The first name cannot be empty.';
        }

        if (isset($data['lastName']) && trim((string) $data['lastName']) === '') {
            $errors['lastName'] = 'The last name cannot be empty.';
        }

        if (isset($data['email'])) {
            $email = trim((string) $data['email']);
            if ($email === '') {
                $errors['email'] = 'The email cannot be empty.';
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors['email'] = 'The email address is not valid.';
            }
        }

        if (isset($data['password'])) {
            if (strlen((string) $data['password']) < 8) {
                $errors['password'] = 'The password must be at least 8 characters long.';
            }
        }

        return $errors;
    }

    /** Serializes a User entity to a plain array for JSON output. */
    private function serialize(User $user): array
    {
        return [
            //'id'        => $user->getId(),
            'email'     => $user->getEmail(),
            'firstName' => $user->getFirstName(),
            'lastName'  => $user->getLastName(),
            'memberSince' => $user->getCreatedAt(),
            'role'     => $user->getHighestRole(),
            'recipes'   => $user->getRecipes()->map(fn($r) => [
                //'id'    => $r->getId(),
                'title' => $r->getTitle(),
                'type'  => $r->getType()?->value,
            ])->toArray(),
        ];
    }
}