<?php

namespace App\DataFixtures;

use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserFixture extends Fixture implements FixtureGroupInterface
{
    /**
     * Références nommées (clés publiques) pour que RecipeFixture puisse
     * récupérer ces utilisateurs via $this->getReference(...) sans
     * refaire de requête SQL. C'est le mécanisme standard de
     * DoctrineFixturesBundle pour créer des liens entre fixtures.
     */
    public const SUPER_ADMIN_REF = 'user_super_admin';
    public const SECOND_USER_REF = 'user_second';
    public const THIRD_USER_REF  = 'user_third';

    public function __construct(
        private readonly UserPasswordHasherInterface $hasher,
    ) {
    }

    public function load(ObjectManager $manager): void
    {
        $user = new User();
        $user->setEmail('firstuser@test.dev');
        $user->setFirstName('First');
        $user->setLastName('Dev');
        $user->setCreatedAt(time());
        $user->setRoles(['ROLE_SUPER_ADMIN']);
        $user->setPassword($this->hasher->hashPassword($user, 'test1234'));
        $manager->persist($user);
        $this->addReference(self::SUPER_ADMIN_REF, $user);

        $secondUser = new User();
        $secondUser->setEmail('test@test.dev');
        $secondUser->setFirstName('Second');
        $secondUser->setLastName('User');
        // 🐛 Correction : la version précédente appelait $user->setCreatedAt()
        // ici par erreur (copier-coller), ce qui ne faisait que réécrire la
        // date du PREMIER utilisateur pour rien, et laissait created_at
        // à null pour $secondUser et $thirdUser.
        $secondUser->setCreatedAt(time());
        $secondUser->setRoles(['ROLE_USER']);
        $secondUser->setPassword($this->hasher->hashPassword($secondUser, 'test1235'));
        $manager->persist($secondUser);
        $this->addReference(self::SECOND_USER_REF, $secondUser);

        $thirdUser = new User();
        $thirdUser->setEmail('lucas.grey@test.dev');
        $thirdUser->setFirstName('Lucas');
        $thirdUser->setLastName('Grey');
        $thirdUser->setCreatedAt(time());
        // Rôle ADMIN (et non SUPER_ADMIN) pour pouvoir tester la nuance
        // entre les deux dans l'interface admin (ex: endpoint /moderate).
        $thirdUser->setRoles(['ROLE_ADMIN']);
        $thirdUser->setPassword($this->hasher->hashPassword($thirdUser, 'test1236'));
        $manager->persist($thirdUser);
        $this->addReference(self::THIRD_USER_REF, $thirdUser);

        $manager->flush();
    }

    public static function getGroups(): array
    {
        return ['users'];
    }
}