// ── Type central : une recette ─────────────────────────────────────────────────
export interface Recipe {
  id: number;
  title: string;
  subtitle: string;
  type: string;
  prepTime: string;
  cookTime: string;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  tips: string[];
  ingredients: string[];
  steps: string[];
}

export interface RecipePhoto {
  id: number;
  position: number | null;
  url: string; // chemin relatif renvoyé par l'API, ex: "/recipes/<uuid>/<uuid>.jpg"
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
/*export const UNITS = ["g", "kg", "ml", "L", "cl", "c.s.", "c.c.", "unité(s)", "pincée(s)", "tranche(s)", "botte(s)"];
export const INGREDIENT_SUGGESTIONS = [
  "Ail", "Aubergine", "Avocat", "Basilic", "Beurre", "Bicarbonate",
  "Cannelle", "Cardamome", "Carotte", "Champignons", "Chocolat noir",
  "Citron", "Concombre", "Coriandre", "Courgette", "Crème de coco",
  "Crème entière", "Cumin", "Curcuma", "Eau de coco", "Épinards",
  "Farine", "Farine de seigle", "Framboises", "Garam masala", "Gélatine",
  "Gingembre", "Huile de sésame", "Huile d'olive", "Jus de citron",
  "Lait", "Lentilles", "Levure", "Levure chimique", "Maïs",
  "Menthe", "Miel", "Mirin", "Miso blanc", "Moutarde", "Myrtilles",
  "Nouilles ramen", "Œufs", "Oignon", "Paprika", "Parmesan",
  "Pâtes", "Patate douce", "Poivron", "Pois chiches", "Pomme de terre",
  "Porc", "Poulet", "Riz", "Romarin", "Salade romaine", "Saumon",
  "Sauce soja", "Sel", "Sésame", "Sucre", "Sucre roux", "Thym",
  "Tomate", "Vanille", "Vinaigre balsamique",
];*/
export type Category = (typeof CATEGORIES)[number];

// ── Onglets de navigation ──────────────────────────────────────────────────────
export type NavTab = "home" | "saved" | "profile" | "addrecipe";

// ── Vues principales ───────────────────────────────────────────────────────────
export type AppView = "home" | "detail" | "addrecipe";

// ── Mode auth ─────────────────────────────────────────────────────────────────
export type AuthMode = "login" | "signup";
