// ── Type central : une recette ─────────────────────────────────────────────────
export interface Recipe {
  id: number;
  title: string;
  subtitle: string;
  category: string;
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

// ── Catégories disponibles ─────────────────────────────────────────────────────
export const CATEGORIES = ["Tout", "Plats", "Desserts", "Mocktails"] as const;
export type Category = (typeof CATEGORIES)[number];

// ── Onglets de navigation ──────────────────────────────────────────────────────
export type NavTab = "home" | "saved" | "profile";

// ── Vues principales ───────────────────────────────────────────────────────────
export type AppView = "home" | "detail";

// ── Mode auth ─────────────────────────────────────────────────────────────────
export type AuthMode = "login" | "signup";
