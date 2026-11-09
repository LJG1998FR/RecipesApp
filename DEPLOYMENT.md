# Déploiement — Saveurs (Symfony + React)

Ce document explique comment ce projet est déployé, et comment résoudre les
erreurs les plus courantes rencontrées en cours de route. Il s'adresse à
quiconque reprend le projet (y compris "futur toi" dans six mois).

## 🏗️ Architecture du repo

Un seul repo GitHub (`RecipesApp`) contient deux applications distinctes :

```
RecipesApp/
├── composer.json        ← back-end Symfony (racine du repo)
├── src/
├── config/
├── .env                 ← committé, valeurs par défaut NON sensibles
└── front/                ← front-end React + Vite (sous-dossier)
    ├── package.json
    └── vite.config.ts
```

- **Le back-end Symfony** est déployé sur **Scalingo** (PaaS PHP).
- **Le front-end React/Vite** est déployé sur **Vercel**.
- Les deux plateformes sont connectées **directement au même repo**
  `RecipesApp`, chacune ne construisant que la partie qui la concerne.

> ⚠️ Avoir un seul repo (plutôt que deux repos séparés, un "de dev" et un
> "de déploiement") évite d'oublier de synchroniser manuellement les deux —
> piège dans lequel on est tombé en cours de route sur ce projet.

---

## 🚀 Configuration Scalingo (back-end)

### 1. Lien avec le repo GitHub

Dashboard Scalingo → ton app → **Deploy → Configuration** → choisis
l'organisation/compte GitHub puis le repo `RecipesApp`. Active **Auto
deploy** sur la branche `main` pour que chaque push déclenche un
déploiement automatique.

Scalingo détecte automatiquement une app PHP grâce à la présence de
`composer.json`/`composer.lock` **à la racine** du repo — pas besoin de
configuration supplémentaire pour qu'il ignore le dossier `front/`.

### 2. Variables d'environnement requises

Dashboard Scalingo → ton app → **Environment**. À minima :

| Variable | Exemple | Rôle |
|---|---|---|
| `DATABASE_URL` | fournie automatiquement par l'addon PostgreSQL | Connexion DB |
| `APP_SECRET` | chaîne aléatoire longue | Secret Symfony |
| `APP_ENV` | `prod` | Environnement Symfony |
| `JWT_SECRET_KEY` / `JWT_PUBLIC_KEY` / `JWT_PASSPHRASE` | — | Authentification JWT |
| `CORS_ALLOW_ORIGIN` | `^https://saveurs-app\.vercel\.app$` | Voir section CORS ci-dessous |

Ces variables **écrasent toujours** ce qui est défini dans les fichiers
`.env*` du repo — voir section suivante.

> ℹ️ **Un 404 sur `GET /` est normal.** Ce backend est une API pure : toutes
> les routes vivent sous `/api/...` (voir `config/routes.yaml`), il n'y a
> volontairement aucune route pour `/`. Ne pas confondre avec une panne —
> teste plutôt une vraie route (`/api/recipes`, `/api/login`...) pour
> vérifier que l'app tourne. Si un outil de monitoring/healthcheck externe
> tape sur `/` et s'alarme du 404, ajoute une route dédiée plutôt que de
> désactiver l'alerte :
> ```php
> #[Route('/', name: 'health_check', methods: ['GET'])]
> public function health(): JsonResponse
> {
>     return $this->json(['status' => 'ok']);
> }
> ```

### 3. Le fichier `.env` à la racine est obligatoire

Symfony a besoin d'un fichier `.env` **committé sur Git** (avec des valeurs
par défaut non sensibles) pour pouvoir démarrer, même si les vraies valeurs
viennent des variables d'environnement Scalingo au runtime. Vérifier que
`.gitignore` n'ignore **que** `.env.local` et ses dérivés, jamais `.env`
seul.

```env
# .env (committé — valeurs par défaut uniquement, jamais de vrais secrets)
APP_ENV=prod
APP_SECRET=ChangeThisDefaultSecret
DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/app?serverVersion=16&charset=utf8"
CORS_ALLOW_ORIGIN='^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$'
```

---

## 🚀 Configuration Vercel (front-end)

### 1. Lien avec le repo GitHub

Dashboard Vercel → ton projet → **Settings → Git** → **Connect Git
Repository** → sélectionne `RecipesApp`.

### 2. Root Directory — réglage indispensable

Le code front n'est **pas à la racine** du repo. Sans ce réglage, Vercel
cherche un `package.json` à la racine, ne le trouve pas correctement, et le
build échoue avec `npm error Missing script: "build"`.

**Settings → Build and Deployment → Root Directory → `front`**

Laisse **"Include files outside of the Root Directory"** désactivé — pas
besoin que Vercel touche au code Symfony.

### 3. SPA fallback — indispensable pour les routes internes (`/admin`, etc.)

Le routing (`/`, `/admin`, ...) est géré **côté client** par
`react-router-dom` (voir `front/src/App.tsx`). Ça ne fonctionne que si le
JS de l'app est déjà chargé dans le navigateur :

- Navigation **interne** (clic sur un lien depuis l'app déjà ouverte) → OK,
  React Router intercepte et change de vue sans recharger la page.
- Accès **direct** à une URL interne (taper `/admin` dans la barre
  d'adresse, rafraîchir la page, partager un lien) → le navigateur envoie
  une vraie requête HTTP au serveur Vercel, qui cherche un fichier
  `admin.html` dans le build, ne le trouve pas → **404**.

C'est pour ça que les appels API continuent de fonctionner pendant qu'une
route interne est en 404 : un `fetch()` vers Scalingo est une requête
indépendante qui ne passe jamais par le routeur de fichiers de Vercel —
les deux mécanismes sont complètement découplés.

> ⚠️ `historyApiFallback: true` dans `front/vite.config.ts` ne concerne que
> le serveur de dev (`npm run dev`). Il n'a aucun effet sur le build
> déployé sur Vercel.

**Solution** : un fichier `vercel.json` à la racine du **dossier front**
(là où se trouve `package.json`), pour dire à Vercel de servir
`index.html` pour toute route inconnue et laisser React Router prendre le
relais :

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 4. Variables d'environnement

**Settings → Environment Variables** :

| Variable | Exemple |
|---|---|
| `VITE_API_URL` | `https://saveurs-app.osc-fr1.scalingoapps.com` |

Sans elle, le front appelle `http://localhost:8000` même en prod (valeur
par défaut dans `front/src/api/index.ts` et `front/src/api/client.ts`).

---

## 🔒 CORS — comment ça marche vraiment

CORS n'a **aucun champ dédié** dans les dashboards Vercel ou Scalingo. C'est
une protection du **navigateur**, levée par un header HTTP envoyé par le
**serveur back-end**. Rien à configurer côté Vercel.

Le projet utilise `NelmioCorsBundle` (`config/packages/nelmio_cors.yaml`),
qui lit la variable d'environnement `CORS_ALLOW_ORIGIN` comme une
**expression régulière** (`origin_regex: true`) :

```
# Une seule origine précise
^https://saveurs-app\.vercel\.app$

# + les preview deployments Vercel (urls générées par branche/PR)
^https://saveurs-app(-[a-z0-9-]+)?\.vercel\.app$
```

⚠️ Ne jamais mettre `.*` — ça autorise n'importe quel site à appeler l'API.

À définir dans **Scalingo → Environment** (pas Vercel). Redémarre
automatiquement l'app, pas besoin de repush.

**Debug CORS** : une erreur CORS dans la console peut masquer une vraie
erreur serveur (500). Toujours vérifier dans DevTools → **Network** le
status code réel de la requête et les Response Headers avant de conclure
à un problème CORS.

---

## 🧯 Dépannage — erreurs déjà rencontrées sur ce projet

### `ext-sodium missing` (Scalingo, phase Composer)

```
lcobucci/jwt 5.6.0 requires ext-sodium * -> it is missing from your system.
```

L'extension PHP `sodium` n'est pas activée par défaut sur Scalingo — il
faut la déclarer explicitement dans `composer.json` :

```json
"require": {
    "ext-sodium": "*"
}
```

Puis `composer update --lock` en local (sans upgrader les autres
dépendances), commit `composer.json` **et** `composer.lock`, push.

> Ne jamais utiliser `--ignore-platform-req=ext-sodium` en prod : le build
> passerait, mais l'app planterait au runtime au premier JWT à signer.

### `npm error Missing script: "build"` (Vercel)

Vercel exécute les commandes à la racine du repo au lieu de `front/`. Voir
section **Root Directory** ci-dessus.

### `404 "GET /"` dans les logs Scalingo

Comportement normal, pas une panne — voir l'encadré ℹ️ dans la section
**Configuration Scalingo** ci-dessus. Vérifie plutôt une vraie route API.

> 💡 Dans les logs Scalingo, un message `"channel":"deprecation"` avec
> `"level_name":"INFO"` (ex. dépréciations Doctrine) n'est que du bruit,
> pas une erreur. Seuls les `level_name` type `ERROR`/`CRITICAL` indiquent
> un vrai problème.

### `404` sur une route interne du front (`/admin`, etc.) en accès direct

Les appels API fonctionnent mais l'URL donne 404 au chargement ou au
rafraîchissement → il manque le SPA fallback. Voir section **SPA
fallback** ci-dessus (`vercel.json` avec `rewrites`).

### `Unable to read the ".env" environment file` (Scalingo, post-install)

Le fichier `.env` n'existe pas dans le repo (souvent gitignored par
erreur). Voir section **"Le fichier .env à la racine est obligatoire"**
ci-dessus.

### Avertissement PSR-4 autoloading (Composer, non bloquant mais à corriger)

```
Class App\Security\LogoutSuccessHandler located in
./src/Security/SucessLogoutHandler.php does not comply with psr-4
autoloading standard. Skipping.
```

Le nom du fichier doit correspondre exactement au nom de la classe qu'il
contient (norme PSR-4). Composer ignore silencieusement la classe sinon —
ce qui peut provoquer un `Class not found` au runtime si cette classe est
référencée quelque part (ex: `security.yaml`).

```bash
git mv src/Security/SucessLogoutHandler.php src/Security/LogoutSuccessHandler.php
```

---

## 🔄 Workflow de déploiement normal

1. Développe en local, teste.
2. `git push origin main`.
3. Scalingo et Vercel se déclenchent **automatiquement** (webhooks GitHub).
4. Vérifie les deux logs de build en cas de doute (dashboards respectifs).
5. Si erreur : identifie **quelle plateforme** échoue (le message le dit
   toujours), et reporte-toi à la section Dépannage ci-dessus.
