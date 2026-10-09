# Lancer les tests ajoutés

## 1. Tests unitaires (rapides, aucun prérequis)

```bash
php bin/phpunit tests/Unit/Controller/Api/RecipeControllerValidationTest.php
```

Aucune base de données nécessaire. S'ils échouent, c'est forcément un vrai
bug dans `validateRecipeData` / `validateSteps` / `validateIngredients` /
`splitTips` (ou un test mal écrit), jamais un problème d'environnement.

## 2. Tests fonctionnels (nécessitent une vraie base de test)

```bash
# Une seule fois, pour préparer l'environnement :
php bin/console doctrine:database:create --env=test --if-not-exists
php bin/console doctrine:schema:update --env=test --force
# (ou : php bin/console doctrine:migrations:migrate --env=test --no-interaction
#  si vous préférez passer par vos vraies migrations)

php bin/phpunit tests/Functional/Controller/Api/RecipeControllerTest.php
```

## Si ça ne marche pas du premier coup

| Symptôme | Piste |
|---|---|
| `Connection refused` / `database does not exist` | La base `<nom>_test` n'existe pas encore, ou `.env.test.local` pointe ailleurs que votre vraie BDD. |
| `401 Unauthorized` sur les requêtes POST/PUT | Vérifiez que les clés JWT (`config/jwt/private.pem` / `public.pem`) sont bien présentes et lisibles en env `test`. |
| `There is no extension able to load the configuration for "lexik_jwt_authentication"` | Le bundle de test ne charge pas forcément les mêmes variables d'env — vérifiez `.env.test`. |
| Les tests fonctionnels passent seuls mais échouent en les lançant tous ensemble | Signe que deux tests se marchent dessus (fixtures partagées, emails non uniques...). J'ai utilisé `uniqid()` partout pour éviter ça — si vous avez ajouté des tests sans ce réflexe, c'est probablement la cause. |
| `The EntityManager is closed` | Une exception Doctrine précédente (ex. contrainte violée) a fermé l'EM pour le reste du test. Regardez le test juste avant dans l'ordre d'exécution. |

## Important

Je n'ai pas pu exécuter ces tests moi-même (pas d'environnement PHP/Symfony
disponible ici) : ils sont écrits avec le plus grand soin et une relecture
manuelle attentive, mais **à faire tourner et ajuster chez vous** avant de
les considérer comme la vérité. S'il y a un écart (nom de service JWT,
configuration d'un bundle...), dites-le-moi et je corrige.
