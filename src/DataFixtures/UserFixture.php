<?php

namespace App\DataFixtures;

use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserFixture extends Fixture implements FixtureGroupInterface
{
    private UserPasswordHasherInterface $hasher;

    public function __construct(UserPasswordHasherInterface $hasher)
    {
        $this->hasher = $hasher;
    }

    public function load(ObjectManager $manager): void
    {
        $user = new User();
        $user->setEmail('ljgalt1@gmail.com');
        $user->setFirstName('Loïc');
        $user->setLastName('Gueret');
        $user->setRoles(['ROLE_SUPER_ADMIN']);

        $password = $this->hasher->hashPassword($user, 'test1234');
        $user->setPassword($password);

        $manager->persist($user);

        $secondUser = new User();
        $secondUser->setEmail('test@test.dev');
        $secondUser->setFirstName('Second');
        $secondUser->setLastName('User');

        $password = $this->hasher->hashPassword($secondUser, 'test1235');
        $secondUser->setPassword($password);

        $manager->persist($secondUser);

        $thirdUser = new User();
        $thirdUser->setEmail('lucas.grey@test.dev');
        $thirdUser->setFirstName('Lucas');
        $thirdUser->setLastName('Grey');

        $password = $this->hasher->hashPassword($thirdUser, 'test1236');
        $thirdUser->setPassword($password);

        $manager->persist($thirdUser);
        $manager->flush();
    }

    public static function getGroups(): array
    {
        return ['users'];
    }
}
