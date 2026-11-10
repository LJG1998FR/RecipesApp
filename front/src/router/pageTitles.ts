import type { NavTab, AppView } from "../types";

/**
 * Clé de traduction du titre pour chaque onglet du shell principal.
 * N'y figurent QUE les onglets dont le titre est statique.
 * "detail" (fiche recette) n'y est pas : son titre dépend des données
 * chargées (le nom de la recette), donc géré à part — voir AppRouter.tsx.
 */
export const TAB_TITLE_KEYS: Record<NavTab, string> = {
  home: "common.nav.home",
  saved: "common.nav.saved",
  addrecipe: "recipe.add.title",
  editrecipe: "recipe.update.title",
  profile: "profile.title",
};

/** Idem, pour les écrans plein écran hors onglets (view, pas activeNav). */
export const VIEW_TITLE_KEYS: Partial<Record<AppView, string>> = {
  myrecipes: "profile.my_recipes.title",
};