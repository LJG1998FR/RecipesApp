// Forme exacte d'une photo telle que renvoyée par RecipeController::serialize()
// (back) — voir aussi RecipeDetailPhoto dans api/index.ts, qui est la même
// chose sous un autre nom. Deux noms pour une même forme de données dans la
// même app = risque de divergence ; à terme, un seul des deux devrait rester
// et l'autre le réutiliser (hors périmètre du correctif actuel).
export interface RecipePhoto {
  id: number;
  position: number | null;
  url: string;
}

// ── Type central : une recette ─────────────────────────────────────────────────
export interface Recipe {
  id: number;
  title: string;
  type: string;
  prepTime: string;
  cookTime: string;
  description: string;
  tips: string[];
  ingredients: string[];
  steps: string[];
  photos: RecipePhoto[];
  userId?: number | null;
}

// Données user

export interface User {
  firstname: string;
  lastname: string;
  email: string;
}

export interface IngredientOption {
  id: number;
  label: string;
  unit: string | null;
  usedInRecipesCount: number;
}
 
/** Payload attendu par POST /api/recipes (cf. RecipeController::add) */
export interface CreateRecipePayload {
  title: string;
  nbPeople: number;
  type: "Plats" | "Desserts" | "Mocktails";
  prepTime: number;          // minutes, entier ≥ 1
  cookingTime?: number;      // minutes, entier ≥ 0, optionnel
  tips?: string;             // texte libre, une astuce par ligne
  steps: { index: number; description: string }[];
  ingredients: { ingredientId: number; amount: number }[];
}

// ── Catégories disponibles ─────────────────────────────────────────────────────
export const CATEGORIES = ["Tout", "Plats", "Desserts", "Mocktails"] as const;
export const RECIPE_CATEGORIES = ["Plats", "Desserts", "Mocktails"] as const;
export const UNITS = ["g", "kg", "ml", "L", "cl", "c.s.", "c.c.", "unité(s)", "pincée(s)", "tranche(s)", "botte(s)"];
export type Category = (typeof CATEGORIES)[number];

// ── Libellés traduits des catégories ────────────────────────────────────────
// Les valeurs de CATEGORIES ("Plats", "Desserts"...) sont aussi les valeurs
// renvoyées par l'API (cf. RecipeType.php côté back) et servent à filtrer
// les données : on ne les traduit donc JAMAIS directement. Cette table fait
// uniquement le lien "valeur technique" -> "clé de traduction" pour
// l'affichage, partagée par HomePage et RecipeDetail.
export const CATEGORY_LABEL_KEYS: Record<Category, string> = {
  Tout: "common.categories.all",
  Plats: "common.categories.plates",
  Desserts: "common.categories.desserts",
  Mocktails: "common.categories.mocktails",
};

// ── Onglets de navigation ──────────────────────────────────────────────────────
// "editrecipe" : pas un VRAI onglet visible dans la BottomNav (pas d'icône
// dédiée ajoutée), mais réutilise le même mécanisme que "addrecipe" pour
// swapper l'écran principal — cohérent avec le choix déjà fait pour l'ajout.
export type NavTab = "home" | "saved" | "profile" | "addrecipe" | "editrecipe";

// ── Vues principales ───────────────────────────────────────────────────────────
export type AppView = "home" | "detail" | "addrecipe" | "myrecipes";

// ── Mode auth ─────────────────────────────────────────────────────────────────
export type AuthMode = "login" | "signup";