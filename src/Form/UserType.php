<?php

namespace App\Form;

use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\FormBuilderInterface;

use Symfony\Component\Form\FormEvent;
use Symfony\Component\Form\FormEvents;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;

class UserType extends AbstractType
{
    private $security;
    public function __construct(Security $security) {
        $this->security = $security;
    }
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('username')
            ->addEventListener(FormEvents::PRE_SET_DATA, function (FormEvent $event) {
                $user = $event->getData(); // get user object
                $form = $event->getForm();
                $currentUser = $this->security->getUser(); // get current user

                $disableSuperAdminRole = $user && in_array('ROLE_SUPER_ADMIN', $user->getRoles()) && $currentUser === $user;

                $form->add('roles', ChoiceType::class, [
                    'choices' => [
                        'Super Admin' => 'ROLE_SUPER_ADMIN',
                        'Admin' => 'ROLE_ADMIN',
                        'User' => 'ROLE_USER',
                    ],
                    'multiple' => true,
                    'expanded' => true,
                    'choice_attr' => function($choice) use ($disableSuperAdminRole) {
                        if ($choice === 'ROLE_USER' || $choice === 'ROLE_SUPER_ADMIN' && $disableSuperAdminRole) {
                            return ['disabled' => 'disabled'];
                        } else {
                            return [];
                        }

                    },
                ])
                ->add('password', PasswordType::class, [
                    'mapped' => false,
                    'attr' => ['autocomplete' => 'new-password'],
                    'required' => isset($user) === false ? true : false,
                    'constraints' => isset($user) === false ? [
                        new NotBlank([
                            'message' => 'Please enter a password',
                        ]),
                        new Length(null, 5, 64),
                    ] : [
                        new Length(null, 5, 64),
                    ],
                ]);
            });
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => User::class,
        ]);
    }
}
