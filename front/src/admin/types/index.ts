// ─────────────────────────────────────────────────────────────────────────────
// src/admin/types/index.ts
//
// SOURCE UNIQUE DE VÉRITÉ pour tous les types de l'admin.
// Règle : si un type est utilisé dans 2+ fichiers → il vit ici.
// ─────────────────────────────────────────────────────────────────────────────

// ── Navigation ────────────────────────────────────────────────────────────────

/** Pages accessibles dans l'admin */
export type AdminPage = "overview" | "users" | "recipes";

// ── Entités métier ────────────────────────────────────────────────────────────

/** Rôles possibles d'un utilisateur */
//export type UserRole = "ROLE_ADMIN" | "ROLE_SUPER_ADMIN" | "ROLE_USER";

/** Représentation d'un utilisateur en mémoire */
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  password:string;
  role: string;
  createdAt: number; // unix timestamp
}

/** Types de recettes disponibles */
export type RecipeType = "Plats" | "Desserts" | "Mocktails";

/** Statut de publication d'une recette */
export type RecipeStatus = "published" | "draft";

/** Représentation d'une recette */
export interface Recipe {
  id: number;
  title: string;
  type: RecipeType;
  authorId: string;   // référence à User.id
  status: RecipeStatus;
  prepTime: number;   // en minutes
  createdAt: number; // unix timestamp
}

// ── Props réutilisables ───────────────────────────────────────────────────────

/** Props de base pour un composant qui peut être désactivé */
export interface DisableableProps {
  disabled?: boolean;
}

/** Props communes aux modales */
export interface ModalBaseProps {
  onClose: () => void;
}
