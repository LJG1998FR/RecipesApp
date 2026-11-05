# 🍲 Saveurs

Application de partage de recettes de cuisine : une API **Symfony 7.4** et un
client **React 19 / TypeScript**, avec un espace utilisateur mobile-first et
un back-office d'administration pour la modération du contenu.

> Projet pédagogique / portfolio — ce README documente l'état réel du dépôt
> tel qu'exploré, pas une cible théorique.

---

## Sommaire

- [Stack technique](#-stack-technique)
- [Structure du dépôt](#-structure-du-dépôt)
- [Installation](#️-installation)
  - [Prérequis](#prérequis)
  - [1. Backend (API Symfony)](#1-backend-api-symfony)
  - [2. Frontend (React)](#2-frontend-react)
  - [Comptes de démonstration](#comptes-de-démonstration)
- [Contenu de l'app](#-contenu-de-lapp)
- [Naviguer dans l'app](#-naviguer-dans-lapp)
- [Les emails](#-les-emails)
- [Tests](#-tests)
- [Limitations connues](#-limitations-connues--dette-technique)

---

## 🧱 Stack technique

| | Technologies |
|---|---|
| **Backend** | PHP 8.2+, Symfony 7.4, Doctrine ORM 3, Doctrine Migrations |
| **Auth** | JWT (`lexik/jwt-authentication-bundle`) + refresh token à usage unique (`gesdinet/jwt-refresh-token-bundle`) |
| **Emails** | Symfony Mailer + Messenger (envoi asynchrone), templates Twig, FR/EN |
| **API ↔ Front** | REST JSON, CORS géré par `nelmio/cors-bundle` |
| **Frontend** | React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 4, Axios |
| **Tests back** | PHPUnit 11 (unitaires + fonctionnels) |

---

## 📁 Structure du dépôt

Le dépôt est un **monorepo** : l'API Symfony à la racine, le client React dans `front/`.

```
RecipesApp/
├── src/
│   ├── Controller/Api/     # Endpoints REST (Auth, Recipe, Ingredient, Photo, User)
│   ├── Controller/Dev/     # Prévisualisation des emails (dev uniquement)
│   ├── Entity/             # User, Recipe, Ingredient, Photo, Step, RefreshToken...
│   ├── Enums/               # RecipeType (Plats/Desserts/Mocktails), RecipeStatus
│   ├── Mail/AppMailer.php  # Point d'entrée unique pour l'envoi des emails
│   ├── Form/                # ⚠️ Non utilisé actuellement, voir "Limitations"
│   └── DataFixtures/       # Jeux de données de démo (users, recipes, ingredients)
├── templates/emails/       # 7 gabarits Twig d'emails transactionnels
├── translations/           # messages.{fr,en}.yaml + emails.{fr,en}.yaml
├── migrations/             # Historique du schéma de BDD
├── tests/                  # Unitaires + fonctionnels (PHPUnit)
└── front/
    └── src/
        ├── pages/           # Accueil, Auth, Profil, Détail recette, Mes recettes,
        │                    # Mot de passe oublié / Réinitialisation
        ├── components/recipe/  # Ajout / édition de recette
        ├── components/layout/LanguageSwitcher.tsx  # Sélecteur FR/EN (accessible)
        ├── admin/           # Back-office (/admin) : overview, users, recipes, ingredients
        ├── context/         # UserContext (session), LocaleContext (i18n)
        ├── api/             # Couche HTTP (axios + refresh token automatique)
        └── locales/         # fr.json + en.json — traductions de l'interface
```

---

## ⚙️ Installation

### Prérequis

- PHP ≥ 8.2 avec les extensions `ctype` et `iconv`
- Composer
- Node.js (≥ 20 recommandé) + npm
- Un SGBD compatible Doctrine (MySQL/MariaDB ou PostgreSQL)
- Le [Symfony CLI](https://symfony.com/download) (facultatif mais confortable pour `symfony server:start`)

### 1. Backend (API Symfony)

```bash
# Installation des dépendances PHP
composer install
```

**Configuration de l'environnement** — copiez `.env.example` vers
`.env.local` à la racine (jamais commité, cf. `.gitignore`) puis complétez
les valeurs :

```bash
cp .env.example .env.local
```

```dotenv
APP_SECRET=                  # chaîne aléatoire (ex: openssl rand -hex 16)
DATABASE_URL=                # ex: mysql://user:pass@127.0.0.1:3306/saveurs
MESSENGER_TRANSPORT_DSN=     # ex: doctrine://default (file d'attente en base)
JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=              # passphrase choisie à la génération des clés
JWT_TTL=3600                 # durée de vie du token JWT en secondes
REFRESH_TOKEN_TTL=2592000    # durée de vie du refresh token en secondes
CORS_ALLOW_ORIGIN=^http://localhost:5173$   # URL du front en dev
MAILER_DSN=                  # ex: smtp://... (voir section "Les emails")
MAILER_FROM_ADDRESS=         # adresse "expéditeur" affichée sur les emails
MAILER_FROM_NAME=            # nom "expéditeur" affiché sur les emails
DEFAULT_URI=http://localhost:8000
FRONTEND_URL=http://localhost:5173   # sert à construire le lien de reset mdp
```

> 💡 Détail de chaque variable, exemples de valeurs et commentaires :
> voir le fichier [`.env.example`](./.env.example) fourni à la racine du
> dépôt — plus la peine de recopier ce tableau à la main à chaque clone.

Ensuite :

```bash
# Génération des clés JWT (répond aux questions interactivement)
php bin/console lexik:jwt:generate-keypair

# Création de la base + application des migrations
php bin/console doctrine:database:create --if-not-exists
php bin/console doctrine:migrations:migrate --no-interaction

# Chargement des données de démo (users + recettes + ingrédients)
php bin/console doctrine:fixtures:load --group=users --group=recipes --group=ingredients

# Lancement du serveur
symfony server:start
# ou, sans Symfony CLI :
php -S 127.0.0.1:8000 -t public
```

**⚠️ Étape indispensable, souvent oubliée** : les emails sont routés via
**Symfony Messenger** (`routing: SendEmailMessage: async` dans
`messenger.yaml`). Sans worker lancé, les emails sont mis en file d'attente
mais **jamais envoyés**. Dans un second terminal :

```bash
php bin/console messenger:consume async -vv
```

### 2. Frontend (React)

```bash
cd front
npm install
```

Copiez `front/.env.example` vers `front/.env.local` :

```bash
cp .env.example .env.local
```

```dotenv
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Le front est servi sur `http://localhost:5173` (configuré dans
`vite.config.ts`). Vérifie que `CORS_ALLOW_ORIGIN` côté back correspond bien
à cette URL.

### Comptes de démonstration

Après chargement des fixtures (`--group=users`), trois comptes sont
disponibles :

| Email | Mot de passe | Rôle |
|---|---|---|
| `firstuser@test.dev` | `test1234` | `ROLE_SUPER_ADMIN` |
| `test@test.dev` | `test1235` | `ROLE_USER` |
| `lucas.grey@test.dev` | `test1236` | `ROLE_ADMIN` |

> ✅ L'email personnel qui traînait auparavant en clair dans
> `UserFixture.php` a été remplacé par une adresse `@test.dev` — c'est
> réglé, plus besoin de le masquer ici.

---

## 📦 Contenu de l'app

### Côté utilisateur
- **Authentification** : inscription, connexion (JWT + refresh token à
  usage unique, rotation automatique côté front via un intercepteur Axios),
  déconnexion.
- **Mot de passe oublié** : demande d'un lien de réinitialisation par email,
  valable **15 minutes, à usage unique**. Implémentation particulièrement
  soignée côté sécurité — voir le détail dans la section
  [Les emails](#-les-emails).
- **Recettes** : consultation paginée, recherche, filtre par catégorie
  (`Plats`, `Desserts`, `Mocktails`), création et **édition** d'une recette
  avec ingrédients (quantité + unité), étapes ordonnées, astuces, et
  **upload de plusieurs photos réordonnables**.
- **Mes recettes** : liste des recettes créées par l'utilisateur connecté,
  avec leur statut de modération.
- **Modération des recettes** : toute recette créée part avec le statut
  `PENDING` (en attente) et doit être validée par un admin avant d'être
  visible publiquement (`PUBLISHED`) — ou refusée (`DECLINED`), avec un motif
  optionnel transmis à l'auteur.
- **Profil** : modification du mot de passe (avec règles de robustesse
  côté front ET back), déconnexion.
- **Internationalisation** : interface disponible en **français et
  anglais** (`front/src/locales/{fr,en}.json`), via un sélecteur de langue
  accessible (`role="listbox"`, navigation clavier, fermeture à `Échap`) —
  cohérent avec les emails et les messages de validation du back, également
  bilingues.

### Côté admin (`/admin`)
- **Vue d'ensemble** : statistiques globales.
- **Gestion des utilisateurs** (`ROLE_SUPER_ADMIN` uniquement pour la liste
  complète, cf. `access_control` dans `security.yaml`).
- **Modération des recettes** : accepter / refuser les recettes en attente
  (déclenche l'envoi d'un email à l'auteur).
- **Gestion du référentiel d'ingrédients** : ajout, édition, suppression.

### Rôles et droits (hiérarchie Symfony)
```
ROLE_SUPER_ADMIN → hérite de ROLE_ADMIN → hérite de ROLE_USER
```

---

## 🧭 Naviguer dans l'app

### App utilisateur (`/`, pensée mobile — largeur max 430px)

La navigation principale se fait via une **barre d'onglets fixe en bas
d'écran** (`BottomNav`) :

| Onglet | Contenu |
|---|---|
| 🏠 Accueil | Liste des recettes publiées, recherche, filtres par catégorie |
| 🔖 Sauvegardés | *(emplacement réservé — fonctionnalité pas encore implémentée)* |
| ➕ Ajouter | Formulaire de création d'une recette |
| 👤 Profil | Infos du compte, changement de mot de passe, accès à "Mes recettes" |

Deux écrans s'ouvrent **en plein écran, sans la barre d'onglets** (navigation
par état React plutôt que par URL — volontaire pour un projet de cette
taille, voir le commentaire en tête de `AppRouter.tsx`) :
- le **détail d'une recette** (ouvert depuis une carte de la liste),
- **"Mes recettes"** (ouvert depuis le Profil), qui permet elle-même
  d'ouvrir le détail ou l'édition d'une recette.

Deux écrans, en revanche, sont de **vraies routes URL** plutôt que de la
navigation par état : c'est indispensable puisqu'on doit pouvoir y arriver
depuis un **lien cliqué dans un email**, potentiellement sans session active :
- `/mot-de-passe-oublie` — accessible depuis l'écran de connexion,
- `/reinitialiser-mot-de-passe?token=...` — lien reçu par email, token en
  paramètre d'URL (jamais stocké en clair côté serveur, voir
  [Les emails](#-les-emails)).

### Back-office admin (`/admin`)

Accessible uniquement aux comptes `ROLE_ADMIN` / `ROLE_SUPER_ADMIN` (sinon
redirigé vers l'écran de connexion admin). Navigation par **sidebar
latérale** :

```
Vue d'ensemble → Utilisateurs → Recettes (modération) → Ingrédients
```

---

## ✉️ Les emails

Tous les emails transitent par un point d'entrée unique,
**`src/Mail/AppMailer.php`**, qui construit et envoie des
`TemplatedEmail` via Symfony Mailer. Chaque email est envoyé **dans la
langue du destinataire** (`User::$locale`, `fr` par défaut), pas dans une
langue par défaut globale.

| Email | Déclencheur | Destinataire |
|---|---|---|
| Bienvenue | Inscription | Le nouvel utilisateur |
| Recette en attente | Création d'une recette | L'auteur |
| Recette acceptée | Modération admin → `accept` | L'auteur |
| Recette refusée | Modération admin → `decline` | L'auteur (avec motif libre si fourni) |
| Mot de passe modifié | Changement de mot de passe (profil **ou** reset) | L'utilisateur |
| Réinitialisation de mot de passe | Demande sur `/mot-de-passe-oublie` | L'utilisateur (si le compte existe) |
| Alerte nouvelle recette | Création d'une recette | Chaque admin, dans **sa propre** langue |

**Les emails sont asynchrones** (routés via Symfony Messenger, cf. section
Installation) — sans worker `messenger:consume` actif, ils restent en file
d'attente et ne partent jamais.

#### Zoom sécurité : réinitialisation de mot de passe

C'est la partie du projet où j'ai été le plus rigoureux, donc ça vaut le
coup de le documenter explicitement (`PasswordResetController` +
`PasswordResetToken`) :
- Le token envoyé par email n'est **jamais stocké en clair** en base — seul
  son hash SHA-256 l'est (même logique qu'un mot de passe).
- Expiration **15 minutes**, **usage unique** (`usedAt` posé à la
  consommation), et toute demande d'un nouveau lien **invalide
  automatiquement** les précédents pour cet utilisateur.
- La réponse de `/api/password/forgot` est **strictement identique** que
  l'email corresponde à un compte ou non (`{"message": "If an account
  exists, an email has been sent."}`), pour empêcher l'énumération de
  comptes.
- Le message d'erreur d'un token invalide/expiré ne distingue pas les deux
  cas, pour la même raison.

### Prévisualiser un email sans rien envoyer

Un outil de développement (actif **uniquement en environnement `dev`**,
aucune donnée n'est persistée) permet de voir le rendu HTML de chaque email
avec des données factices :

```
http://localhost:8000/dev/mail-preview
```

Chaque email peut être affiché en français ou en anglais via
`?locale=fr` / `?locale=en` (les templates sont bilingues, l'interface React
ne l'est pas encore — voir limitations).

### Pour recevoir vraiment un email en local

`MAILER_DSN` peut pointer vers un outil de capture d'emails comme
[Mailpit](https://github.com/axllent/mailpit) ou
[Mailtrap](https://mailtrap.io/) plutôt qu'un vrai SMTP, le temps du
développement — évite d'envoyer de vrais emails aux adresses des fixtures.

---

## 🧪 Tests

```bash
# Unitaires — rapides, aucun prérequis
php bin/phpunit tests/Unit/Controller/Api/RecipeControllerValidationTest.php

# Fonctionnels — nécessitent une base de test dédiée
php bin/console doctrine:database:create --env=test --if-not-exists
php bin/console doctrine:migrations:migrate --env=test --no-interaction
php bin/phpunit tests/Functional/Controller/Api/RecipeControllerTest.php
```

Le détail des erreurs courantes (base de test manquante, clés JWT absentes
en env `test`...) est documenté dans `tests/README_tests.md`.

---

## 🚧 Limitations connues / dette technique

Section tenue à jour honnêtement plutôt que cachée — utile pour moi comme
pour un lecteur de portfolio :

- **Onglet "Sauvegardés"** : présent dans la navigation mais pas encore
  implémenté (état vide statique).
- **`src/Form/*Type.php`** (`UserType`, `RecipeType`, `IngredientType`...)
  : ces classes `AbstractType` de Symfony ne sont **appelées nulle part** —
  les contrôleurs API valident et construisent les entités "à la main"
  depuis le JSON reçu. Ce sont donc du code mort. `UserType.php` contient en
  plus un bug de précédence d'opérateurs (`||` avant `&&`) qui désactiverait
  toujours le choix `ROLE_USER` s'il était un jour réellement utilisé — sans
  impact aujourd'hui puisque le formulaire n'est jamais rendu. Toujours
  présent dans cette version, pas de changement depuis le dernier point.
- La durée de vie du lien de réinitialisation de mot de passe (15 min) est
  codée en dur dans `PasswordResetController` plutôt que pilotable par
  variable d'environnement — un choix défendable pour une valeur de
  sécurité qui ne devrait pas varier entre environnements, mais qui mérite
  d'être su.
- Pas de Docker / docker-compose pour l'instant — installation manuelle
  uniquement (documentée ci-dessus).

### ✅ Résolu depuis la dernière version
- ~~Interface front en français uniquement~~ → FR/EN disponibles.
- ~~Adresse email personnelle en clair dans les fixtures~~ → remplacée par
  une adresse `@test.dev`.