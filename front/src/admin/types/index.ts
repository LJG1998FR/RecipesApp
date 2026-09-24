// ─────────────────────────────────────────────────────────────────────────────
// src/admin/types/index.ts
//
// SOURCE UNIQUE DE VÉRITÉ pour tous les types de l'admin.
// Règle : si un type est utilisé dans 2+ fichiers → il vit ici.
// ─────────────────────────────────────────────────────────────────────────────

// ── Navigation ────────────────────────────────────────────────────────────────

export type AdminPage = "overview" | "users" | "recipes" | "ingredients";

// ── Entités métier ────────────────────────────────────────────────────────────

export type UserRole = "ROLE_ADMIN" | "ROLE_SUPER_ADMIN" | "ROLE_USER";

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  createdAt: number;
}

export type RecipeType = "Plats" | "Desserts" | "Mocktails";

// Conservé côté front uniquement — pas encore de colonne en base.
// Ne jamais envoyer ce champ dans le payload API.
export type RecipeStatus = "published" | "draft";

// ── Step : une étape de préparation d'une recette ─────────────────────────────
// index = ordre d'affichage (1-based). Auto-généré à la création, modifiable en update.
export interface RecipeStep {
  id?: number;       // Absent à la création (pas encore persisté)
  index: number;
  description: string;
}

// ── RecipeIngredient : jointure entre une recette et un ingrédient du référentiel ──
// ingredientId = id de l'entité Ingredient en base.
// label + unit sont en lecture seule (viennent de l'entité Ingredient).
// amount = quantité propre à cette recette.
export interface RecipeIngredientItem {
  id?: number;         // Absent à la création
  ingredientId: number;
  label: string;       // Read-only — affiché dans l'UI, non envoyé en écriture
  unit: string | null; // Peut être null (ex : "œufs" n'a pas d'unité fixe)
  amount: number;
}

// ── Ingrédient du référentiel global (table `ingredients`) ───────────────────
// Utilisé uniquement pour alimenter la barre de recherche dans la modale.
export interface IngredientOption {
  id: number;
  label: string;
  unit: string | null;
}

export interface Recipe {
  id: number;
  title: string;
  type: RecipeType;
  userId: number | null;
  nbPeople: number;
  // status : état local front uniquement — absent du payload envoyé à l'API.
  status: RecipeStatus;
  prepTime: number;
  cookingTime: number | null;
  createdAt: number;
  tips: string | null;
  steps: RecipeStep[];
  ingredients: RecipeIngredientItem[];
  // image, description — champs présents dans le type front utilisateur mais pas
  // encore gérés côté admin dans cette itération.
  image?: string;
  description?: string;
}


export interface Ingredient {
  id: number;
  label: string;
  unit: string | null;
  usedInRecipesCount: number;
}

// ── Props réutilisables ───────────────────────────────────────────────────────

export interface DisableableProps {
  disabled?: boolean;
}

export interface ModalBaseProps {
  onClose: () => void;
}
