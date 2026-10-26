<?php
// src/Entity/PasswordResetToken.php

namespace App\Entity;

use App\Repository\PasswordResetTokenRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Table(name: 'password_reset_tokens')]
#[ORM\Entity(repositoryClass: PasswordResetTokenRepository::class)]
class PasswordResetToken
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    // On ne stocke JAMAIS le token en clair, seulement son hash SHA-256 —
    // même principe que les mots de passe : si la base fuite, le token
    // n'est pas directement réutilisable par un attaquant.
    #[ORM\Column(length: 64, unique: true)]
    private ?string $tokenHash = null;

    #[ORM\Column]
    private ?int $expiresAt = null;

    #[ORM\Column(nullable: true)]
    private ?int $usedAt = null;

    #[ORM\Column]
    private ?int $createdAt = null;

    public function getId(): ?int { return $this->id; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(User $user): static { $this->user = $user; return $this; }

    public function getTokenHash(): ?string { return $this->tokenHash; }
    public function setTokenHash(string $tokenHash): static { $this->tokenHash = $tokenHash; return $this; }

    public function getExpiresAt(): ?int { return $this->expiresAt; }
    public function setExpiresAt(int $expiresAt): static { $this->expiresAt = $expiresAt; return $this; }

    public function getUsedAt(): ?int { return $this->usedAt; }
    public function setUsedAt(?int $usedAt): static { $this->usedAt = $usedAt; return $this; }

    public function getCreatedAt(): ?int { return $this->createdAt; }
    public function setCreatedAt(int $createdAt): static { $this->createdAt = $createdAt; return $this; }
}