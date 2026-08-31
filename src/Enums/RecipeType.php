<?php

namespace App\Enums;

enum RecipeType: string
{
    case PLATE = 'Plate';
    case DESSERT = 'Dessert';
    case MOCKTAIL = 'Mocktail';
}