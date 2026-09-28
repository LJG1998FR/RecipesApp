/**
 * api/index.ts — couche d'abstraction HTTP.
 *
 * Toutes les fonctions fetch vers Symfony sont centralisées ici.
 * Règle fondamentale pour le junior : on ne fait JAMAIS de fetch directement
 * dans un composant React. On passe toujours par cette couche.
 * Pourquoi ? Testabilité, cohérence des headers, gestion centralisée des erreurs.
 */

import { Recipe } from "@/types";
import apiClient, { tokenStorage } from "./client";
import { User, Recipe as AdminRecipe, RecipeStep, RecipeIngredientItem, IngredientOption } from "@/admin/types";
import { Ingredient } from "@/admin/types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getToken(): string | null {
  return tokenStorage.getAccess();
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Erreur HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  // Exception : le login ne doit PAS passer par l'intercepteur
  // (pas de token à injecter, et une 401 ici = mauvais identifiants)
  const { data } = await apiClient.post("/api/login", { email, password });
  tokenStorage.setTokens(data);
  return data;
}

export async function getUserData() {
  const { data } = await apiClient.post("/api/users/getUser");
  return data;
}

export async function register(email: string, password: string, firstName: string, lastName: string) {
  const { data } = await apiClient.post("/api/register", {
    email, password, firstName, lastName,
  });
  tokenStorage.setTokens(data);
  return data;
}

export async function updateUser(data: object) {
  const res = await fetch(`${BASE_URL}/api/users/update`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

/*export async function updateUserAsAdmin(data: object) {
  const res = await fetch(`${BASE_URL}/api/users/admin-update`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}*/

export async function logout(): Promise<void> {
  await apiClient.post("/api/logout", {
    refresh_token: tokenStorage.getRefresh(),
  });
  tokenStorage.clear();
}

export function isAuthenticated(): boolean {
  return tokenStorage.getAccess() !== null;
}

// ── Recettes (front utilisateur) ───────────────────────────────────────────────

export async function fetchRecipes(): Promise<Recipe[]> {
  const { data } = await apiClient.get("/api/recipes");
  return data;
}

export async function fetchAdminRecipes(): Promise<AdminRecipe[]> {
  const { data } = await apiClient.get("/api/recipes");
  return data;
}

export async function fetchRecipe(id: number): Promise<AdminRecipe> {
  const { data } = await apiClient.get(`/api/recipes/${id}`);
  return data;
}

export async function createRecipe(payload: object) {
  const { data } = await apiClient.post("/api/recipes", payload);
  return data;
}

export async function updateRecipe(id: number, payload: object) {
  const { data } = await apiClient.put(`/api/recipes/${id}`, payload);
  return data;
}

export async function deleteRecipe(id: number) {
  const { data } = await apiClient.delete(`/api/recipes/${id}`);
  return data;
}

/**
 * Payload de création d'une recette.
 *
 * Points importants pour le junior :
 * - `status` est ABSENT : ce champ n'existe pas encore en base, on ne l'envoie pas.
 * - `steps` : tableau d'objets { description }. L'index est auto-généré côté serveur.
 * - `ingredients` : tableau d'objets { ingredientId, amount }. On n'envoie pas label/unit
 *   car ce sont des données en lecture seule qui viennent du référentiel Ingredient.
 */
export interface CreateRecipePayload {
  title: string;
  nbPeople: number;
  type: string;
  prepTime: number;
  cookingTime?: number | null;
  tips?: string | null;
  steps: Array<{ description: string }>;
  ingredients: Array<{ ingredientId: number; amount: number }>;
}

/**
 * Payload de mise à jour d'une recette.
 *
 * Différence clé avec la création :
 * - `steps` inclut maintenant `index` (l'admin peut le modifier manuellement).
 * - Tous les champs sont optionnels : on n'envoie que ce qui a changé.
 */
export interface UpdateRecipePayload {
  title?: string;
  nbPeople?: number;
  type?: string;
  prepTime?: number;
  cookingTime?: number | null;
  tips?: string | null;
  steps?: Array<{ index: number; description: string }>;
  ingredients?: Array<{ ingredientId: number; amount: number }>;
}

// ── Ingrédients ────────────────────────────────────────────────────────────────

/**
 * Récupère tous les ingrédients du référentiel.
 * Utilisé pour alimenter la barre de recherche dans la modale admin.
 * Le filtrage se fait côté client (pas de pagination pour l'instant).
 */
export async function fetchIngredients() {
  const { data } = await apiClient.get("/api/ingredients");
  return data;
}

export async function fetchRecipesByIngredients(ids: number[]) {
  const { data } = await apiClient.get(`/api/ingredients/recipes?ids=${ids.join(",")}`);
  return data;
}

// ── Utilisateurs ────────────────────────────────────────────────────────────────

export async function fetchUsers(): Promise<User[]> {
  const { data } = await apiClient.get("/api/users");
  return data;
}

export async function createUser(payload: object) {
  const { data } = await apiClient.post("/api/users/create", payload);
  return data;
}

export async function deleteUser(id: number) {
  const { data } = await apiClient.delete(`/api/users/${id}`);
  return data;
}


export async function deleteCurrentUser(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ── Ingrédients (admin) ────────────────────────────────────────────────────────
 
/**
 * Récupère tous les ingrédients du référentiel.
 * Accessible à tous les utilisateurs connectés (GET public dans le controller).
 */
export async function fetchAdminIngredients(): Promise<Ingredient[]> {
  const res = await fetch(`${BASE_URL}/api/ingredients`, {
    headers: authHeaders(),
  });
  return handleResponse<Ingredient[]>(res);
}
 
/**
 * Crée un nouvel ingrédient.
 * Nécessite ROLE_ADMIN ou ROLE_SUPER_ADMIN côté Symfony.
 *
 * Note junior : on passe `label` et `unit` dans le body JSON.
 * `unit` peut être null (pas d'unité pour un ingrédient comptable comme les œufs).
 */
export async function createIngredient(
  data: Pick<Ingredient, "label" | "unit">
): Promise<Ingredient> {
  const res = await fetch(`${BASE_URL}/api/ingredients`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Ingredient>(res);
}
 
/**
 * Met à jour un ingrédient existant.
 * Nécessite ROLE_ADMIN ou ROLE_SUPER_ADMIN côté Symfony.
 */
export async function updateAdminIngredient(
  id: number,
  data: Pick<Ingredient, "label" | "unit">
): Promise<Ingredient> {
  const res = await fetch(`${BASE_URL}/api/ingredients/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Ingredient>(res);
}
 
/**
 * Supprime un ingrédient.
 * Nécessite ROLE_ADMIN ou ROLE_SUPER_ADMIN côté Symfony.
 *
 * Note junior : le serveur renvoie HTTP 409 si l'ingrédient est encore
 * utilisé dans des recettes. handleResponse() va lever une Error avec
 * le message JSON du serveur, qu'on remonte dans la page Ingredients.tsx.
 */
export async function deleteIngredient(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/ingredients/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
 
  // DELETE renvoie 204 No Content en cas de succès → pas de body à parser
  if (res.status === 204) {
    return;
  }
 
  // Toute autre réponse (404, 409, 403…) → on délègue à handleResponse
  return handleResponse<void>(res);
}