<?php

namespace App\Entity;

use DateTime;
use Doctrine\ORM\Mapping as ORM;
use Gesdinet\JWTRefreshTokenBundle\Entity\RefreshToken as BaseRefreshToken;
use Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: '\Gesdinet\JWTRefreshTokenBundle\Entity\RefreshTokenRepository')]
#[ORM\Table(name: 'refresh_tokens')]

class RefreshToken extends BaseRefreshToken
{

}