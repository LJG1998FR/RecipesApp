/**
 * api/index.ts — couche d'abstraction HTTP.
 *
 * Toutes les fonctions fetch vers Symfony sont centralisées ici.
 * Règle fondamentale pour le junior : on ne fait JAMAIS de fetch directement
 * dans un composant React. On passe toujours par cette couche.
 * Pourquoi ? Testabilité, cohérence des headers, gestion centralisée des erreurs.
 */

import { Recipe } from "../types";
import apiClient, { tokenStorage } from "./client";
import { User, Recipe as AdminRecipe, RecipePhoto, IngredientOption } from "../admin/types";
import { Ingredient } from "../admin/types";
import { ApiValidationError } from "./errors";

export const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

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

// ── Pagination ─────────────────────────────────────────────────────────────────
//
// Enveloppe renvoyée par les endpoints de liste quand `page`/`limit` sont
// fournis (voir IngredientController/UserController/RecipeController::list()).
// Sans ces paramètres, les mêmes endpoints renvoient toujours un tableau brut
// (rétrocompatibilité pour les appelants qui ont besoin de la liste complète,
// ex. le sélecteur d'ingrédients du formulaire Recette).
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

function buildPaginationParams(query: PaginationQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.page)  params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  return params;
}

export class ApiError extends Error {
  status: number;
  messages: string[];
 
  constructor(status: number, messages: string[]) {
    super(messages[0] ?? `Erreur HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
  }
}
 
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body?.errors) {
      throw new ApiValidationError(body.errors);
    }
    throw new Error(body?.error ?? `Erreur HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Mot de passe oublié ──────────────────────────────────────────────────

export async function requestPasswordReset(email: string, locale: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/password/forgot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, locale }),
  });
  await handleResponse(res);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  await handleResponse(res);
}

// Transforme un chemin relatif ("/recipes/xxx/yyy.jpg") en URL absolue affichable
export function toPhotoUrl(relativeUrl: string): string {
  return `${BASE_URL}${relativeUrl}`;
}

// En-têtes SANS Content-Type : voir l'explication plus bas
function authHeadersMultipart(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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

export async function register(email: string, password: string, firstName: string, lastName: string, locale: string) {
  const { data } = await apiClient.post("/api/register", {
    email, password, firstName, lastName, locale
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

export interface RecipesQuery extends PaginationQuery {
  type?: string;
  status?: string;
  search?: string;
}

/**
 * Liste paginée des recettes — GET /api/recipes?page=&limit=&type=&status=&search=
 *
 * Utilisée par :
 *  - la page admin (Recipes.tsx), typée <AdminRecipe> (valeur par défaut) ;
 *  - la page d'accueil front-office (HomePage.tsx), typée <Recipe> explicitement
 *    (`fetchRecipesPaginated<Recipe>({ ... })`).
 *
 * C'est le MÊME endpoint Symfony dans les deux cas (RecipeController::list()) :
 * seul le typage TypeScript diffère, pour que chaque front reçoive la forme
 * qu'il attend. Le serveur, lui, restreint déjà automatiquement les résultats
 * aux recettes publiées pour un utilisateur non-admin (voir RecipeController).
 *
 * `type`/`status`/`search` remplacent le filtrage qui se faisait auparavant
 * côté client : une fois paginé, filtrer en mémoire ne porterait que sur la
 * page courante, pas sur l'ensemble des recettes.
 */
export async function fetchRecipesPaginated<T = AdminRecipe>(
  query: RecipesQuery = {}
): Promise<PaginatedResponse<T>> {
  const params = buildPaginationParams(query);
  if (query.type) params.set("type", query.type);
  if (query.status) params.set("status", query.status);
  if (query.search) params.set("search", query.search);

  const res = await fetch(`${BASE_URL}/api/recipes?${params.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse<PaginatedResponse<T>>(res);
}

// GET /api/recipes/{id} — un SEUL point d'entrée pour la recette détaillée.
// Avant : fetchRecipe() et fetchRecipeDetail() tapaient le même endpoint et
// étaient typées pour renvoyer deux interfaces différentes (AdminRecipe vs
// RecipeDetail), alors que RecipeController::serialize() est désormais unifié
// (list/show/add/update renvoient tous la même forme). fetchRecipeDetail()
// n'était d'ailleurs appelée nulle part dans l'admin — code mort, supprimé.
export async function fetchRecipe(id: number): Promise<AdminRecipe> {
  const { data } = await apiClient.get(`/api/recipes/${id}`);
  return data;
}

// RecipeController::add() renvoie $this->serialize($recipe) → la recette
// COMPLÈTE, pas juste { id }. Le typage précédent (Promise<{ id: number }>)
// ne correspondait pas à la réponse réelle : Recipes.tsx traitait déjà `created`
// comme une Recipe complète (`onAdd({ ...created, status: form.status })`),
// ce qui n'aurait normalement pas dû passer la vérification de types.
export async function createRecipe(data: CreateRecipePayload): Promise<AdminRecipe> {
  const res = await fetch(`${BASE_URL}/api/recipes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<AdminRecipe>(res);
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

// Même remarque que createRecipe() : RecipeController::update() renvoie lui
// aussi $this->serialize($recipe) en entier.
export async function updateRecipe(id: number, data: UpdateRecipePayload): Promise<AdminRecipe> {
  const res = await fetch(`${BASE_URL}/api/recipes/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<AdminRecipe>(res);
}

export async function updateRecipeStatus(
  id: number,
  status: "PENDING" | "DECLINED" | "PUBLISHED"
): Promise<AdminRecipe> {
  const res = await fetch(`${BASE_URL}/api/recipes/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleResponse<AdminRecipe>(res);
}

export async function fetchUserRecipes(): Promise<{
  published: Recipe[];
  pending: { id: number; title: string; status: string }[];
}> {
  const { data } = await apiClient.get("/api/recipes/my-recipes");
  return data;
}

// ── Ingrédients ────────────────────────────────────────────────────────────────

/**
 * Récupère tous les ingrédients du référentiel.
 * Utilisé pour alimenter la barre de recherche dans la modale admin.
 * Le filtrage se fait côté client (pas de pagination pour l'instant).
 */
export async function fetchIngredients(): Promise<IngredientOption[]> {
  const res = await fetch(`${BASE_URL}/api/ingredients`, { headers: authHeaders() });
  return handleResponse<IngredientOption[]>(res);
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

/** Liste paginée des utilisateurs pour la page admin (Users.tsx). */
export async function fetchUsersPaginated(
  query: PaginationQuery = {}
): Promise<PaginatedResponse<User>> {
  const params = buildPaginationParams(query);
  const res = await fetch(`${BASE_URL}/api/users?${params.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse<PaginatedResponse<User>>(res);
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

export interface IngredientsQuery extends PaginationQuery {
  search?: string;
}

/**
 * Liste paginée des ingrédients pour la page admin (Ingredients.tsx).
 * `search` remplace le filtre local sur `ingredients` (qui ne porterait
 * plus que sur la page courante une fois le référentiel paginé).
 */
export async function fetchAdminIngredientsPaginated(
  query: IngredientsQuery = {}
): Promise<PaginatedResponse<Ingredient>> {
  const params = buildPaginationParams(query);
  if (query.search) params.set("search", query.search);

  const res = await fetch(`${BASE_URL}/api/ingredients?${params.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse<PaginatedResponse<Ingredient>>(res);
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

// ── Photos ───────────────────────────────────────────────────────────────────

export async function fetchRecipePhotos(recipeId: number): Promise<RecipePhoto[]> {
  const res = await fetch(`${BASE_URL}/api/recipes/${recipeId}/photos`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function uploadRecipePhotos(recipeId: number, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("photos[]", file));
 
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/recipes/${recipeId}/photos`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {}, // pas de Content-Type !
    body: formData,
  });
  // Aligné sur RecipePhoto (position est nullable côté back, comme partout ailleurs).
  return handleResponse<RecipePhoto[]>(res);
}

export async function deleteRecipePhoto(recipeId: number, photoId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/recipes/${recipeId}/photos/${photoId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Erreur HTTP ${res.status}`);
  }
}

export async function reorderRecipePhoto(
  recipeId: number,
  photoId: number,
  position: number,
): Promise<RecipePhoto> {
  const res = await fetch(`${BASE_URL}/api/recipes/${recipeId}/photos/${photoId}/position`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ position }),
  });
  return handleResponse(res);
}