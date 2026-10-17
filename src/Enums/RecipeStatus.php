<?php

namespace App\Enums;

enum RecipeStatus: string
{
    case PENDING   = 'PENDING';
    case DECLINED  = 'DECLINED';
    case PUBLISHED = 'PUBLISHED';
}