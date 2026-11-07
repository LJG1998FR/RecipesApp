# Les tests de Saveurs — guide pour toi, développeur junior

Salut 👋 Ce document explique **tout** ce qu'il faut savoir sur les tests de
ce projet : ceux qui existaient déjà, ceux que j'ai ajoutés aujourd'hui, et
surtout **comment les lire, les lancer, et en écrire de nouveaux** sans
paniquer. Je l'ai volontairement écrit long et détaillé plutôt que court :
un junior qui découvre les tests automatisés a besoin de comprendre le
*pourquoi*, pas juste le *comment*.

Deux parties bien séparées :
- **Partie 1 — Back (Symfony / PHPUnit)**
- **Partie 2 — Front (React / Vitest)**

Et une partie commune à la fin sur l'accessibilité, parce que c'est un fil
rouge des deux côtés dans ce projet.

---

## 0. Pourquoi on teste, en une phrase

Un test automatisé, c'est une **question qu'on pose au code**, écrite une
fois, qu'on peut reposer en 2 secondes à chaque modification future — au
lieu de recliquer manuellement dans l'appli à chaque fois pour vérifier "ça
marche toujours ?". Si la réponse change sans que tu l'aies voulu, le test
devient rouge et t'avertit *avant* que ça parte en production.

Ce n'est **pas** une preuve que le code est parfait. C'est une preuve que
le code se comporte comme *décrit par le test*, pour les cas que le test
couvre. D'où l'importance de tester aussi les cas limites (zéro, négatif,
chaîne vide, doublons...) et pas seulement le "happy path".

---

# PARTIE 1 — Backend (Symfony / PHPUnit)

## 1.1 Ce qui a changé aujourd'hui

| Avant | Après |
|---|---|
| ❌ Pas de `phpunit.xml` à la racine | ✅ `phpunit.xml.dist` créé — **sans lui, `php bin/phpunit` ne pouvait même pas démarrer** |
| `tests/unit/...` (minuscules) alors que les namespaces PHP étaient en PascalCase | ✅ Dossiers renommés en `tests/Unit/...` / `tests/Functional/...` (voir encadré "⚠️" ci-dessous) |
| Tests sur `RecipeController` seulement | ✅ + `PasswordPolicy` (unitaire), `IngredientController` (unitaire), `AuthController` et `UserController` (fonctionnels) |

### ⚠️ Pourquoi j'ai renommé les dossiers de tests

Les tests existants étaient dans `tests/unit/controller/api/...` (tout en
minuscules) mais déclaraient `namespace App\Tests\Unit\Controller\Api;`
(en PascalCase). `composer.json` mappe `App\Tests\` sur `tests/` en PSR-4 :
l'autoloader va donc chercher le fichier à
`tests/Unit/Controller/Api/MonTest.php` (en respectant la casse du
namespace), **pas** `tests/unit/controller/api/MonTest.php`.

Sur macOS et Windows, le système de fichiers ignore la casse par défaut :
ça "marche" quand même, personne ne voit le problème en dev. Sur Linux (la
plupart des serveurs CI et des conteneurs Docker), le système de fichiers
est sensible à la casse : `composer` ne retrouve pas le fichier, et la
suite entière plante avec une erreur `Class "..." not found`. C'est un
piège classique — "ça marche chez moi" — qui ne se révèle qu'au moment où
quelqu'un lance les tests sur un environnement différent du tien. J'ai
renommé les dossiers pour que la casse corresponde exactement aux
namespaces, ce qui règle le problème pour de bon.

**Leçon à retenir** : le nom d'un dossier de test doit TOUJOURS
correspondre, caractère pour caractère, au namespace PHP qu'il contient.

## 1.2 Structure actuelle

```
tests/
├── bootstrap.php                            ← charge .env.test avant tout
├── README_tests.md                          ← ce fichier
├── Unit/                                    ← AUCUNE base de données, AUCUN kernel
│   ├── Security/
│   │   └── PasswordPolicyTest.php
│   └── Controller/Api/
│       ├── RecipeControllerValidationTest.php
│       └── IngredientControllerValidationTest.php
└── Functional/                              ← vrai kernel Symfony + vraie base de test
    └── Controller/Api/
        ├── RecipeControllerTest.php
        ├── AuthControllerTest.php
        └── UserControllerTest.php
```

`phpunit.xml.dist` déclare deux *testsuites* (`unit` et `functional`)
précisément pour pouvoir les lancer séparément — voir plus bas.

## 1.3 Unitaire vs Fonctionnel : la différence concrète ici

| | **Unit** | **Functional** |
|---|---|---|
| Démarre le kernel Symfony ? | ❌ Non | ✅ Oui (`WebTestCase`) |
| Touche une vraie base de données ? | ❌ Non | ✅ Oui |
| Vitesse | Millisecondes | Secondes (connexion DB, requêtes SQL réelles) |
| Ce qu'on teste | Une fonction **pure** : mêmes entrées → toujours la même sortie, aucun effet de bord | Un comportement qui dépend de Doctrine, du firewall JWT, de plusieurs couches ensemble |
| Exemple dans ce projet | `PasswordPolicy::validate()`, `RecipeController::validateRecipeData()` | "Un non-propriétaire ne peut pas modifier la recette d'un autre" (ça dépend de la vraie entité en base + du vrai firewall) |

**Comment savoir dans quelle catégorie écrire un nouveau test ?**
Pose-toi la question : *"si j'exécute cette fonction 1000 fois avec les
mêmes arguments, est-ce que j'obtiens 1000 fois exactement le même
résultat, sans jamais toucher à une base de données, un fichier, le réseau,
l'heure système... ?"*
- Oui → unitaire (rapide, isolé, pas de prérequis).
- Non (ça dépend de ce qu'il y a en base, d'un utilisateur connecté, d'un
  appel réseau...) → fonctionnel.

### Pourquoi on utilise la Réflexion PHP dans les tests unitaires

`RecipeControllerValidationTest` et `IngredientControllerValidationTest`
appellent des méthodes **privées** des contrôleurs via `ReflectionMethod`.
C'est un compromis assumé (voir les commentaires dans ces fichiers) : en
toute rigueur on ne devrait tester que l'API *publique* d'une classe, mais
ces méthodes de validation sont assez complexes pour mériter des tests
dédiés, sans pour autant les rendre publiques juste pour les tests (ce qui
polluerait l'API du contrôleur pour tout le monde). Si tu ajoutes une
nouvelle méthode privée de validation dans un contrôleur, le réflexe est le
même : `newInstanceWithoutConstructor()` + `ReflectionMethod::invokeArgs()`.

## 1.4 Lancer les tests

```bash
# TOUT lancer (unitaire + fonctionnel)
php bin/phpunit

# Seulement les unitaires (rapide, aucun prérequis — à lancer en boucle pendant que tu codes)
php bin/phpunit --testsuite unit

# Seulement les fonctionnels
php bin/phpunit --testsuite functional

# Un seul fichier
php bin/phpunit tests/Unit/Security/PasswordPolicyTest.php

# Une seule méthode précise (utile pour debugger un test qui échoue)
php bin/phpunit --filter testValidate_tooShort_returnsTooShort
```

### Prérequis pour les tests FONCTIONNELS uniquement

```bash
# Une seule fois, pour préparer l'environnement :
php bin/console doctrine:database:create --env=test --if-not-exists
php bin/console doctrine:schema:update --env=test --force
# (ou, si vous préférez passer par vos vraies migrations :)
# php bin/console doctrine:migrations:migrate --env=test --no-interaction
```

Les tests unitaires n'ont besoin de **rien** de tout ça : si un test
unitaire échoue, c'est forcément un vrai bug dans le code testé (ou un test
mal écrit), jamais un problème d'environnement.

## 1.5 Lire un résultat de test

```
PHPUnit 11.5.x

..F.....                                                           8 / 8 (100%)

There was 1 failure:

1) App\Tests\Unit\Security\PasswordPolicyTest::testValidate_tooShort_returnsTooShort
Failed asserting that an array contains 'too_short'.

/path/tests/Unit/Security/PasswordPolicyTest.php:45

FAILURES!
Tests: 8, Assertions: 12, Failures: 1.
```

- Un point `.` = un test réussi.
- Un `F` = un test qui échoue (assertion fausse).
- Un `E` = une **erreur** (exception non attendue, pas juste une assertion
  fausse — souvent un problème d'environnement : base absente, classe
  introuvable...).
- La ligne `Failed asserting that...` te dit **quoi** était attendu vs reçu.
- Le chemin en dessous (`tests/Unit/.../PasswordPolicyTest.php:45`) te dit
  **où** est l'assertion qui a échoué dans le fichier de test — pas
  forcément où est le bug (ça, c'est à toi de le trouver en remontant
  jusqu'au code testé).

**Réflexe en cas d'échec** : relis d'abord le *nom* du test
(`testValidate_tooShort_returnsTooShort` — les noms de ce projet suivent
systématiquement le format `test<Méthode>_<scénario>_<résultat attendu>`),
il te dit déjà *quel comportement* est cassé, avant même de lire le détail
de l'assertion.

## 1.6 Écrire un nouveau test — check-list

1. **Où ?** Pure fonction sans dépendance → `tests/Unit/...`. Sinon →
   `tests/Functional/...`. Respecte l'arborescence qui reflète celle de
   `src/` (ex: `src/Controller/Api/FooController.php` →
   `tests/Unit/Controller/Api/FooControllerTest.php`).
2. **Nommage de la classe** : `<NomDeLaClasseTestée>Test`, dans un
   namespace qui correspond EXACTEMENT (casse comprise) au chemin du
   dossier.
3. **Nommage de la méthode** : `test<CeQuiEstTesté>_<scénario>_<résultat>`
   — en anglais, pour rester cohérent avec le reste du projet. Un nom
   clair remplace un commentaire.
4. **Isolation** (fonctionnel uniquement) : ne dépends d'AUCUNE fixture
   partagée (`UserFixture`, `IngredientsFixture`...). Crée tes propres
   entités avec un identifiant unique (`uniqid()`), et nettoie-les dans
   `tearDown()`. Regarde `RecipeControllerTest` comme modèle — c'est
   exactement pour ça que les tests peuvent tourner dans n'importe quel
   ordre, et même en parallèle (`paratest`), sans se marcher dessus.
5. Un test = **une seule chose vérifiée**. Si tu te surprends à écrire
   5 `assert` qui testent 5 comportements différents dans la même méthode,
   découpe en 5 tests.

## 1.7 Dépannage

| Symptôme | Piste |
|---|---|
| `phpunit.xml(.dist) not found` ou tests introuvables | Vérifie que tu es bien à la racine du projet Symfony quand tu lances la commande. |
| `Connection refused` / `database does not exist` | La base `<nom>_test` n'existe pas encore, ou `.env.test.local` pointe ailleurs que votre vraie BDD (voir § 1.4). |
| `401 Unauthorized` sur les requêtes POST/PUT des tests fonctionnels | Vérifiez que les clés JWT (`config/jwt/private.pem` / `public.pem`) sont bien présentes et lisibles en env `test`. |
| `Class "App\Tests\...\XxxTest" not found` | Vérifiez la CASSE exacte du chemin du fichier vs le namespace déclaré (voir § 1.1). |
| Les tests fonctionnels passent seuls mais échouent tous ensemble | Deux tests se marchent dessus (fixtures partagées, emails non uniques...). Tout ce projet utilise `uniqid()` pour l'éviter — si tu ajoutes un test sans ce réflexe, c'est probablement la cause. |
| `The EntityManager is closed` | Une exception Doctrine précédente (ex. contrainte violée) a fermé l'EM pour le reste du test. Regarde le test juste AVANT dans l'ordre d'exécution. |

## 1.8 Constats à surveiller (esprit critique, pas des bugs à corriger aujourd'hui)

En écrivant ces tests, j'ai noté deux choses qui méritent une décision
d'équipe plutôt qu'une correction silencieuse de ma part :

- **`RecipeControllerValidationTest::testValidateSteps_whenManualIndexNotRequired_indexIsIgnored`**
  documente que le paramètre `allowManualIndex = false` de `validateSteps()`
  n'est en réalité appelé par **aucun** des deux endpoints publics actuels
  (`add()`/`update()` passent toujours `true`). Ce n'est pas un bug, mais
  c'est du code "mort" côté API HTTP — à nettoyer ou à documenter
  explicitement si vous gardez l'intention de vous en servir plus tard.
- **Cohérence vérifiée, pas supposée** :
  `UserControllerTest::testUpdate_weakNewPassword_isRejectedBySamePolicyAsRegistration`
  prouve que la même règle de robustesse de mot de passe (`PasswordPolicy`)
  s'applique à l'inscription ET au changement de mot de passe depuis le
  profil. C'est un bon réflexe déjà en place dans le code — le test sert
  de garde-fou pour que ça le reste si quelqu'un modifie un des deux
  chemins sans penser à l'autre.
- **⚠️ Nouveau et NON testé : la fonctionnalité "favoris"**
  (`SavedRecipe`, `SavedRecipeController`, `RecipeController::saved()` /
  `buildSavedMaps()`). Je l'ai codée mais je n'ai écrit aucun test dessus —
  ne la considérez pas couverte juste parce qu'elle est dans ce repo. Les
  cas qui mériteraient clairement un test `Functional` avant de merger :
  - sauvegarder deux fois la même recette ne doit PAS créer deux lignes
    (contrainte unique `(user_id, recipe_id)` — vérifier qu'une violation
    de contrainte ne fait pas planter l'endpoint avec une 500 plutôt que de
    répondre proprement) ;
  - `DELETE` sur une recette jamais sauvegardée doit rester idempotent
    (200, pas 404) ;
  - `savedCount` ne doit être présent (non `null`) QUE pour un admin dans
    `RecipeController::list()` — un test qui prouve qu'un visiteur public
    reçoit bien `null` et pas un vrai chiffre calculé en vain ;
  - suppression en cascade : supprimer un `User` ou une `Recipe` qui a des
    favoris ne doit pas planter (orphanRemoval + `ON DELETE CASCADE`).

---

# PARTIE 2 — Frontend (React / Vitest)

## 2.1 Ce qui a changé aujourd'hui

Il n'existait **aucun outillage de test côté front** avant aujourd'hui
(pas de Vitest, pas de Testing Library dans `package.json`). J'ai ajouté :

- **Vitest** — le "PHPUnit du monde JavaScript/Vite" : même projet (Vite),
  donc même config d'alias (`@/...`), mêmes plugins, pas de configuration
  dupliquée à maintenir en parallèle.
- **@testing-library/react** — pour rendre des composants React dans un
  faux DOM (jsdom) et interagir avec comme le ferait un·e utilisateur·ice
  (cliquer, taper, naviguer au clavier), plutôt que d'inspecter les
  détails d'implémentation internes (state, props...).
- **@testing-library/jest-dom** — des assertions lisibles sur le DOM
  (`toBeInTheDocument()`, `toBeDisabled()`, `toHaveAttribute()`...).
- **@testing-library/user-event** — simule des interactions utilisateur
  réalistes (`user.click()`, `user.selectOptions()`...), plus fidèle que
  `fireEvent` pour les cas qui nécessitent plusieurs événements DOM (focus,
  pointerdown, click, dans le bon ordre).
- **vitest-axe** — lance le moteur d'accessibilité **axe-core** (le même
  que l'extension "axe DevTools") directement dans les tests. Voir § 2.6.

### ⚠️ Je n'ai pas pu exécuter `npm install` ni `npm run test` ici

Comme pour les tests back ajoutés par la session précédente : je n'ai pas
d'environnement Node disponible pour installer les paquets et lancer
réellement la suite. Les versions indiquées dans `package.json` sont
cohérentes entre elles au moment de l'écriture, mais **la première chose à
faire chez vous est `npm install` puis `npm run test`**, et d'ajuster une
version si `npm` râle sur un conflit de peer-dependency. Ne considérez pas
ces fichiers comme "vérité absolue tant qu'ils n'ont pas tourné au moins
une fois chez vous".

## 2.2 Structure actuelle

```
front/
├── vite.config.ts                 ← config Vite ET Vitest réunies (bloc `test: {...}`)
├── src/
│   ├── test/
│   │   ├── setup.ts               ← exécuté avant TOUTE la suite (matchers, cleanup)
│   │   └── test-utils.tsx         ← helper renderWithLocale() (voir § 2.4)
│   ├── utils/
│   │   └── passwordPolicy.test.ts
│   ├── components/
│   │   ├── form/PasswordRequirements.test.tsx
│   │   └── recipe/
│   │       ├── RecipeCard.test.tsx
│   │       └── RecipeFormShared.test.ts       ← fonctions pures seulement, pas de rendu
│   └── admin/
│       └── components/ui/Pagination.test.tsx  ← BackOffice
```

**Convention de ce projet** : le fichier de test vit **à côté** du fichier
qu'il teste (`RecipeCard.tsx` + `RecipeCard.test.tsx` dans le même
dossier), plutôt que dans un dossier `__tests__/` séparé. Avantage : quand
tu déplaces ou supprimes un composant, son test est juste à côté — tu ne
peux pas l'oublier.

## 2.3 Lancer les tests

```bash
cd front
npm install          # une seule fois (ou après chaque changement de package.json)

npm run test          # lance toute la suite UNE fois puis s'arrête (mode CI)
npm run test:watch    # relance automatiquement les tests concernés à chaque sauvegarde
npm run test:coverage # + rapport de couverture (ouvrir front/coverage/index.html)

# Un seul fichier
npx vitest run src/components/recipe/RecipeCard.test.tsx

# Filtrer par nom de test (correspond à describe/it)
npx vitest run -t "activable au clavier"
```

`test:watch` est le mode à utiliser **pendant que tu codes** : tu gardes un
terminal ouvert, Vitest ne relance que les tests liés au fichier que tu
viens de modifier (bien plus rapide qu'une relance complète).

## 2.4 Pourquoi certains tests utilisent `renderWithLocale` et d'autres `render`

Beaucoup de composants de ce projet appellent `useTranslation()`
(`LocaleContext.tsx`) pour afficher du texte traduit. Un hook React ne
fonctionne QUE si le composant qui l'appelle est rendu à l'intérieur de
son `Provider` — sinon, `useTranslation()` lève explicitement
`"useTranslation must be used inside <LocaleProvider>"`.

`src/test/test-utils.tsx` exporte `renderWithLocale()`, qui enrobe le
composant testé dans le VRAI `<LocaleProvider>` (pas un mock) et attend que
le chargement asynchrone des traductions soit terminé avant de rendre la
main au test. **Pourquoi le vrai Provider et pas un mock léger ?** Parce
qu'un mock qui renvoie juste la clé telle quelle (`t = (key) => key`) ne
détecterait JAMAIS une clé de traduction mal orthographiée ou supprimée
par erreur dans `fr.json`/`en.json` — alors qu'un test qui s'attend à voir
le VRAI texte français affiché (ex. `"Au moins 16 caractères"`) casse
immédiatement si cette clé disparaît. C'est un bonus de ce choix, pas
seulement une contrainte.

**Règle pratique** : avant d'écrire le test d'un composant, regarde s'il
importe `useTranslation` (ou un autre contexte, ex. `useUser`). Si oui →
utilise (ou crée) un helper de rendu qui enrobe avec le bon Provider. Si
non (comme `Pagination.tsx`, qui n'a aucun texte traduit) → `render()`
classique suffit, pas la peine d'ajouter de la complexité pour rien.

## 2.5 Pourquoi certains tests n'ont même pas besoin de rendre un composant

`RecipeFormShared.test.ts` (notez l'extension `.ts`, pas `.tsx` : il n'y a
aucun JSX dedans) teste `validateRecipeForm`, `buildStepsPayload`,
`buildIngredientsPayload` et `extractMessages` **sans jamais appeler
`render()`**. Ce sont des fonctions exportées, pures (mêmes entrées, même
sortie, aucun effet de bord), exactement comme `PasswordPolicy::validate()`
côté PHP. On les appelle juste comme des fonctions normales.

C'est le test le **moins cher et le plus fiable** qu'on puisse écrire :
pas de DOM simulé, pas de Provider, pas d'attente asynchrone. Chaque fois
que c'est possible, préfère extraire la logique métier d'un composant vers
une fonction pure exportée (comme c'est déjà fait dans
`RecipeFormShared.tsx`) plutôt que de la laisser mélangée au JSX — ça la
rend testable à ce niveau, bien plus simple à déboguer qu'un test qui doit
d'abord faire interagir un utilisateur·ice virtuel·le avec un formulaire
entier pour vérifier une seule règle de validation.

## 2.6 Accessibilité : ce que `vitest-axe` vérifie (et ce qu'il NE vérifie PAS)

Chaque composant testé ici a un test du type :

```ts
const { container } = await renderWithLocale(<MonComposant />);
const results = await axe(container);
expect(results).toHaveNoViolations();
```

`axe-core` analyse le DOM rendu et détecte automatiquement une partie des
problèmes d'accessibilité : attributs ARIA invalides ou manquants, champs
de formulaire sans nom accessible, contrastes de couleur insuffisants,
structure de titres incohérente, etc. C'est rapide, ça tourne à chaque
exécution de la suite, et ça attrape des régressions qu'un·e humain·e
oublierait de revérifier manuellement à chaque modification.

**⚠️ Ce que ça ne remplace PAS :**
- **La validation W3C du HTML** (https://validator.w3.org/) reste un
  outil différent et complémentaire : elle vérifie que le *balisage* est
  syntaxiquement correct (attributs dupliqués, imbrication invalide,
  DOCTYPE...), pas qu'il est *accessible*. Un HTML peut être 100% valide
  W3C et totalement inutilisable au clavier (c'était le cas de
  `RecipeCard` avant sa correction — un `<div onClick>` est un HTML
  parfaitement valide, mais inaccessible). Pensez à lancer le validateur
  W3C sur les pages publiées, en plus de ces tests.
- **Un vrai test au clavier et au lecteur d'écran.** `axe-core` ne "clique"
  jamais réellement sur un élément ni n'écoute ce qu'annoncerait VoiceOver
  ou NVDA — c'est de l'analyse STATIQUE du DOM. C'est pour ça qu'on écrit
  en PLUS des tests comportementaux explicites comme
  `RecipeCard.test.tsx::"est activable au clavier avec la touche Entrée"` :
  eux simulent réellement l'appui sur une touche et vérifient que l'action
  a bien eu lieu.
- Les règles d'axe couvrent environ 30 à 50 % des critères WCAG selon leurs
  propres chiffres officiels : un composant "vert" chez axe peut encore
  avoir des problèmes d'accessibilité réels (ex. un ordre de tabulation
  illogique, un texte d'erreur qui n'a pas de sens hors contexte...). Ne
  traitez jamais `toHaveNoViolations()` comme un label "100% accessible".

## 2.7 Écrire un nouveau test — check-list

1. **Composant simple, sans contexte** (pas de `useTranslation`,
   `useUser`...) → `render()` classique suffit.
2. **Composant qui utilise `useTranslation()`** → `renderWithLocale()`.
   S'il utilise un AUTRE contexte (`useUser()`...), il faudra étendre
   `test-utils.tsx` avec un wrapper équivalent plutôt que de dupliquer la
   logique d'enrobage dans chaque fichier de test.
3. **Logique métier pure extraite d'un composant** (comme
   `validateRecipeForm`) → teste-la directement, sans rendu React.
4. Préfère toujours les requêtes `screen.getByRole(...)`,
   `screen.getByLabelText(...)` à `screen.getByTestId(...)` : la première
   catégorie vérifie *en même temps* que l'élément est accessible (un
   `getByRole("button", { name: "Valider" })` qui ne trouve rien te dit
   littéralement "ce bouton n'a pas de nom accessible pour qui que ce
   soit, humain ou lecteur d'écran" — c'est un bonus gratuit). Réserve
   `getByTestId` aux cas où il n'existe vraiment aucune autre façon fiable
   de cibler l'élément.
5. Ajoute un test `axe()` si c'est un composant qui a du texte, des
   contrôles de formulaire, ou une structure un peu riche (pas la peine
   pour un composant purement décoratif sans interaction).
6. Un `it(...)` = une seule assertion de comportement (comme côté PHP).

## 2.8 Dépannage

| Symptôme | Piste |
|---|---|
| `useTranslation must be used inside <LocaleProvider>` | Utilise `renderWithLocale()` au lieu de `render()` pour ce composant. |
| Le test reste bloqué / timeout sur un composant qui utilise `useTranslation` | Vérifie que `waitFor` dans `renderWithLocale` trouve bien la disparition du `role="status"` — si `<Loading />` a été renommé ou que son rôle a changé, `test-utils.tsx` doit être mis à jour en même temps. |
| `Unable to find role "button"` alors que l'élément existe visuellement | Le rôle ARIA effectif peut différer du type HTML (ex. un `<div>` sans `role="button"` n'a AUCUN rôle "button" pour les outils d'accessibilité, même s'il ressemble à un bouton visuellement). C'est souvent le test qui a raison : c'est un vrai problème d'accessibilité à corriger dans le composant. |
| Erreurs TypeScript sur `toBeInTheDocument`, `toHaveNoViolations`... | Vérifie que `tsconfig.json` liste bien `"vitest/globals"` et `"@testing-library/jest-dom"` dans `compilerOptions.types` (déjà fait dans ce projet — à revérifier si tu ajoutes un nouveau tsconfig). Ça n'empêche pas Vitest de FAIRE TOURNER les tests (il transpile avec esbuild, sans vérification de types stricte), mais ça fera râler `tsc`/ton IDE. |
| `npm install` échoue sur un conflit de versions | Les versions de `vitest`/`@vitest/coverage-v8` doivent rester cohérentes avec la version de `vite` installée (voir la doc officielle Vitest pour la matrice de compatibilité) — ajuste au besoin, je n'ai pas pu vérifier cette matrice dans mon environnement. |

---

## 3. Pyramide des tests de ce projet, en résumé

```
            ▲
           / \        Tests manuels (navigateur réel, clavier, lecteur
          /   \        d'écran, W3C Validator...) — PAS automatisables,
         / E2E \       à faire quand même avant chaque mise en prod.
        /───────\
       /  Front  \     Composants React (Vitest + Testing Library + axe)
      / fonctionnel\   → tests/Functional/... côté back (kernel + vraie DB)
     /───────────────\
    /   Unit (PHP+TS)  \   Fonctions pures : validateRecipeForm(),
   /_____________________\  PasswordPolicy::validate(), checkPassword()...
```

Plus on descend, plus les tests sont **nombreux, rapides et faciles à
écrire** — c'est voulu : on veut un maximum de couverture au niveau le
moins cher. Plus on monte, plus chaque test est **cher mais couvre un
scénario réaliste complet**. Aucun des deux niveaux ne remplace l'autre :
un test unitaire ne peut pas prouver qu'un firewall JWT fonctionne, et un
test fonctionnel/E2E complet serait beaucoup trop lent et fragile à
écrire pour chaque règle de validation individuelle.

## 4. Important — honnêteté sur les limites de ce travail

Comme pour les tests back déjà présents avant mon passage, je n'ai pas
d'environnement d'exécution (ni PHP+Symfony+PostgreSQL/MySQL, ni Node)
disponible ici pour FAIRE TOURNER réellement cette suite. Chaque fichier a
été écrit avec soin et relu attentivement (noms de méthodes vérifiés dans
le code source réel, pas supposés), mais **c'est à vous de les exécuter et
de corriger le moindre écart** (nom de service, configuration d'un
bundle, version de paquet npm...) avant de les considérer comme la vérité.
Si quelque chose ne colle pas chez vous, c'est très probablement un détail
d'environnement local plutôt qu'une erreur de logique dans le test lui-même
— mais vérifiez quand même : je peux me tromper.
