# Interface Admin — Saveurs

Documentation technique à destination de l'équipe de développement.

---

## Structure des fichiers

```
src/admin/
├── AdminApp.tsx              ← point d'entrée : auth + état global + CRUD
│
├── types/
│   └── index.ts              ← TOUS les types TypeScript partagés
│
├── data/
│   └── store.ts              ← données mock (⚠️ temporaires)
│
├── components/
│   ├── auth/
│   │   └── Login.tsx         ← formulaire de connexion
│   ├── layout/
│   │   ├── AdminShell.tsx    ← mise en page Sidebar + contenu
│   │   └── Sidebar.tsx       ← navigation latérale
│   └── ui/
│       ├── Badge.tsx         ← badges de statut et de rôle
│       ├── Button.tsx        ← bouton avec variantes
│       ├── Modal.tsx         ← modale générique (compound component)
│       └── Table.tsx         ← table générique typée
│
└── pages/
    ├── Overview.tsx          ← tableau de bord (lecture seule)
    ├── Users.tsx             ← CRUD utilisateurs
    └── Recipes.tsx           ← CRUD recettes avec filtres
```

---

## Règles d'architecture

| Règle | Raison |
|---|---|
| Les types vivent dans `types/index.ts` | Une seule source de vérité, pas de redéclaration |
| Les composants `ui/` ne contiennent pas de logique métier | Réutilisables dans n'importe quel contexte |
| `AdminApp.tsx` est le seul fichier à avoir du `useState` pour les données | Facilite la migration vers une API |
| Les pages reçoivent leurs données via props | Testables indépendamment |

---

## Migrer vers l'API Symfony

Actuellement, toutes les données viennent de `data/store.ts` (mémoire locale).

Pour brancher l'API :

**Étape 1** — Créer `src/admin/api/index.ts` :
```ts
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function fetchUsers() {
  const res = await fetch(`${BASE}/api/admin/users`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  return res.json();
}
// … fetchRecipes, createUser, updateUser, deleteUser …
```

**Étape 2** — Dans `AdminApp.tsx`, remplacer `useState(initialUsers)` par :
```ts
const [users, setUsers] = useState<User[]>([]);

useEffect(() => {
  fetchUsers().then(setUsers);
}, []);
```

**Étape 3** — Supprimer `data/store.ts` une fois tout branché.

---

## Accès

| Email | Mot de passe | Rôle |
|---|---|---|
| admin@saveurs.fr | admin123 | ADMIN |
| marie@saveurs.fr | editor456 | EDITOR |

Les rôles `USER` n'ont pas accès à l'admin (bloqués dans `handleLogin`).
