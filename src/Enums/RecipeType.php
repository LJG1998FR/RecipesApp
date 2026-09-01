<?php

namespace App\Enums;

enum RecipeType: string
{
    case PLATE = 'Plats';
    case DESSERT = 'Desserts';
    case MOCKTAIL = 'Mocktails';
}