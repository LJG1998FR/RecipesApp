/**
 * api/index.ts — couche d'abstraction HTTP.
 *
 * Actuellement les données viennent de src/data/recipes.ts (mock).
 * Quand le back Symfony sera prêt, il suffira de décommenter les fonctions
 * fetch ci-dessous et de supprimer les imports depuis data/.
 *
 * L'URL de base se configure via la variable d'environnement VITE_API_URL.
 * Créez un fichier .env.local à la racine du projet front :
 *   VITE_API_URL=http://localhost:8000
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem("token");
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
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<{ token: string }>(res);
  localStorage.setItem("token", data.token);
  return data;
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string
  ) {
  const res = await fetch(`${BASE_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
  const data = await handleResponse<{ token: string; user: object }>(res);
  localStorage.setItem("token", data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}

// ── Recettes ───────────────────────────────────────────────────────────────────

export async function fetchRecipes() {
  const res = await fetch(`${BASE_URL}/api/recipes`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function fetchRecipe(id: number) {
  const res = await fetch(`${BASE_URL}/api/recipes/${id}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createRecipe(data: object) {
  const res = await fetch(`${BASE_URL}/api/recipes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateRecipe(id: number, data: object) {
  const res = await fetch(`${BASE_URL}/api/recipes/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteRecipe(id: number) {
  const res = await fetch(`${BASE_URL}/api/recipes/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ── Ingrédients ────────────────────────────────────────────────────────────────

export async function fetchIngredients() {
  const res = await fetch(`${BASE_URL}/api/ingredients`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function fetchRecipesByIngredients(ids: number[]) {
  const res = await fetch(`${BASE_URL}/api/ingredients/recipes?ids=${ids.join(",")}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}
