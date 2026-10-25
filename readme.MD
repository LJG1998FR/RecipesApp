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
├── templates/emails/       # 6 gabarits Twig d'emails transactionnels
├── translations/           # messages.fr.yaml + emails.fr.yaml / emails.en.yaml
├── migrations/             # Historique du schéma de BDD
├── tests/                  # Unitaires + fonctionnels (PHPUnit)
└── front/
    └── src/
        ├── pages/           # Accueil, Auth, Profil, Détail recette, Mes recettes
        ├── components/recipe/  # Ajout / édition de recette
        ├── admin/           # Back-office (/admin) : overview, users, recipes, ingredients
        ├── context/         # UserContext (session), LocaleContext (i18n)
        ├── api/             # Couche HTTP (axios + refresh token automatique)
        └── locales/fr.json  # Traductions de l'interface
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

**Configuration de l'environnement** — créez un fichier `.env.local` à la
racine (jamais commité, cf. `.gitignore`) avec, au minimum, ces variables :

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
DEFAULT_URI=http://localhost:8000
```

> 💡 Aucune valeur sensible n'est fournie ici volontairement — à toi de les
> générer. Je te recommande de committer un `.env.example` (valeurs vides)
> pour que ce tableau n'ait pas à être recopié à la main à chaque clone.

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

Créez `front/.env.local` :

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
| `admin@exemple.dev` *(remplace l'email réel défini dans `UserFixture.php`)* | `test1234` | `ROLE_SUPER_ADMIN` |
| `test@test.dev` | `test1235` | `ROLE_USER` |
| `lucas.grey@test.dev` | `test1236` | `ROLE_USER` |

> 🔒 **Note perso** : l'email du premier compte dans `UserFixture.php` est
> actuellement une vraie adresse personnelle en clair dans le code source.
> À remplacer par une adresse `@test.dev` ou `@example.com` avant de rendre
> le dépôt public, pour éviter le spam et la confusion avec un vrai compte.

---

## 📦 Contenu de l'app

### Côté utilisateur
- **Authentification** : inscription, connexion (JWT + refresh token à
  usage unique, rotation automatique côté front via un intercepteur Axios),
  déconnexion.
- **Recettes** : consultation, recherche, filtre par catégorie (`Plats`,
  `Desserts`, `Mocktails`), création et **édition** d'une recette avec
  ingrédients (quantité + unité), étapes ordonnées, astuces, et **upload de
  plusieurs photos réordonnables**.
- **Mes recettes** : liste des recettes créées par l'utilisateur connecté,
  avec leur statut de modération.
- **Modération des recettes** : toute recette créée part avec le statut
  `PENDING` (en attente) et doit être validée par un admin avant d'être
  visible publiquement (`PUBLISHED`) — ou refusée (`DECLINED`), avec un motif
  optionnel transmis à l'auteur.
- **Profil** : modification du mot de passe (avec règles de robustesse
  côté front ET back), déconnexion.
- **Internationalisation** : l'interface est actuellement **en français
  uniquement** (`front/src/locales/fr.json`) — voir limitations.

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
| Mot de passe modifié | Changement de mot de passe | L'utilisateur |
| Alerte nouvelle recette | Création d'une recette | Chaque admin, dans **sa propre** langue |

**Les emails sont asynchrones** (routés via Symfony Messenger, cf. section
Installation) — sans worker `messenger:consume` actif, ils restent en file
d'attente et ne partent jamais.

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

- **Interface front en français uniquement** : le back et les templates
  d'emails sont prêts pour le FR/EN (`translations/emails.en.yaml` existe),
  mais `front/src/locales/` ne contient qu'un `fr.json`.
- **Onglet "Sauvegardés"** : présent dans la navigation mais pas encore
  implémenté (état vide statique).
- **`src/Form/*Type.php`** (`UserType`, `RecipeType`, `IngredientType`...)
  : ces classes `AbstractType` de Symfony ne sont **appelées nulle part** —
  les contrôleurs API valident et construisent les entités "à la main"
  depuis le JSON reçu. Ce sont donc du code mort. `UserType.php` contient en
  plus un bug de précédence d'opérateurs (`||` avant `&&`) qui désactiverait
  toujours le choix `ROLE_USER` s'il était un jour réellement utilisé — sans
  impact aujourd'hui puisque le formulaire n'est jamais rendu.
- **Adresse email réelle dans les fixtures** : voir l'avertissement dans
  la section Installation.
- Pas de Docker / docker-compose pour l'instant — installation manuelle
  uniquement (documentée ci-dessus).