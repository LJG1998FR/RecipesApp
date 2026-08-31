# Structure du projet front (React + TypeScript)

```
src/
├── api/
│   └── index.ts          ← toutes les fonctions fetch vers Symfony (login, recettes…)
│
├── components/
│   ├── icons/
│   │   └── index.tsx     ← tous les SVG inline regroupés (StarIcon, ClockIcon…)
│   ├── layout/
│   │   └── BottomNav.tsx ← barre de navigation basse
│   └── recipe/
│       ├── RecipeCard.tsx   ← carte résumé d'une recette (liste)
│       └── RecipeDetail.tsx ← vue complète d'une recette (ingrédients + étapes)
│
├── data/
│   └── recipes.ts        ← données mock (à supprimer quand l'API Symfony sera branchée)
│
├── pages/
│   ├── AuthPage.tsx         ← connexion / inscription
│   ├── HomePage.tsx         ← liste + recherche + filtres catégories
│   ├── ProfilePage.tsx      ← profil utilisateur + changement de mot de passe
│   └── RecipeDetailPage.tsx ← page détail (wrapper qui cherche la recette par id)
│
├── router/
│   └── AppRouter.tsx     ← toute la logique de navigation par état
│
├── styles/
│   └── global.css        ← variables CSS (couleurs, fonts) + reset
│
├── types/
│   └── index.ts          ← interfaces TypeScript partagées (Recipe, NavTab…)
│
└── App.tsx               ← point d'entrée minimal → importe AppRouter
```

## Règle de base

| Dossier       | Contient quoi                                              |
|---------------|------------------------------------------------------------|
| `api/`        | Tout ce qui parle au réseau (fetch, JWT, gestion d'erreur) |
| `components/` | Briques réutilisables (pas de logique de routing)          |
| `data/`       | Données statiques temporaires (mock)                       |
| `pages/`      | Une page = un fichier = une "vue" complète                 |
| `router/`     | Logique de navigation (quel composant afficher et quand)   |
| `styles/`     | CSS global, design tokens, reset                           |
| `types/`      | Types et interfaces TypeScript partagés                    |

## Brancher l'API Symfony

1. Créer `.env.local` à la racine du front :
   ```
   VITE_API_URL=http://localhost:8000
   ```
2. Dans chaque page, remplacer les imports depuis `../data/recipes`
   par des appels aux fonctions de `../api` (ex: `fetchRecipes()`).
3. Supprimer `src/data/recipes.ts` une fois les données servies par l'API.
