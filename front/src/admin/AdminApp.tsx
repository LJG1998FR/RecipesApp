// ─────────────────────────────────────────────────────────────────────────────
// src/admin/AdminApp.tsx
//
// Point d'entrée de l'interface admin.
// Contient UNIQUEMENT : état global (auth + données) + routing entre les pages.
//
// CHANGEMENT vs version précédente :
// - onAdd et onUpdate reçoivent maintenant un Recipe COMPLET retourné par l'API
//   (y compris steps et ingredients hydratés).
// - C'est la page Recipes.tsx qui appelle l'API et remonte le résultat ici.
//   AdminApp ne fait plus de "construction" d'objet côté client — il stocke
//   directement ce que le serveur a persisté.
//
// Pourquoi ce changement est important (pour le junior) :
// Avant, on construisait l'objet Recipe dans AdminApp avec des valeurs locales.
// Problème : l'id généré par la BDD, les index des steps, les ids des RecipeIngredients
// n'étaient pas connus. En remontant le résultat de l'API, on a un état cohérent
// avec la base de données dès la création.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import type { AdminPage, User, Recipe, Ingredient } from "./types";
import Login from "./components/auth/Login";
import AdminShell from "./components/layout/AdminShell";
import Overview from "./pages/Overview";
import Users from "./pages/Users";
import Recipes from "./pages/Recipes";
import { fetchAdminRecipes, fetchUsers, getUserData, isAuthenticated, fetchAdminIngredients, createIngredient, updateAdminIngredient, deleteIngredient } from "../api";
import { UserData } from "@/context/UserContext";
import "../styles/admin.css";
import Ingredients from "./pages/Ingredients";

export default function AdminApp() {
  // ── État d'authentification ────────────────────────────────────────────────
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<AdminPage>("overview");

  // ── Données ────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    if (!loggedIn) return;
    fetchUsers().then(setUsers);
    fetchAdminRecipes().then(setRecipes);
    fetchAdminIngredients().then((res) => setIngredients(res)); 
  }, [loggedIn]);

  // ── Auth ───────────────────────────────────────────────────────────────────
  async function handleLogin(email: string, password: string): Promise<boolean> {
    const user: UserData = await getUserData();

    if (
      user &&
      (user.role.includes("ROLE_ADMIN") ||
        user.role.includes("ROLE_SUPER_ADMIN"))
    ) {
      setCurrentUser({ ...user, password });
      setLoggedIn(true);
      return true;
    }
    return false;
  }

  function handleLogout() {
    setLoggedIn(false);
    setCurrentUser(null);
    setCurrentPage("overview");
  }

  // ── CRUD Utilisateurs ─────────────────────────────────────────────────────
  function addUser(u: Omit<User, "id" | "createdAt">) {
    const newUser: User = {
      ...u,
      id: Date.now(), // Temporaire — à remplacer quand l'API /users/create existera
      createdAt: Math.floor(Date.now() / 1000),
    };
    setUsers((prev) => [...prev, newUser]);
  }

  function updateUser(u: User) {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
  }

  function deleteUser(id: number) {
    setUsers((prev) => prev.filter((x) => x.id !== id));
  }

  // ── CRUD Recettes ─────────────────────────────────────────────────────────
  // addRecipe et updateRecipe reçoivent maintenant un Recipe COMPLET
  // retourné par l'API (via Recipes.tsx qui appelle createRecipe/updateRecipe).
  // On ne construit plus d'objet côté client — on stocke ce que le serveur a persisté.

  function addRecipe(recipe: Recipe) {
    setRecipes((prev) => [recipe, ...prev]);
  }

  function updateRecipe(recipe: Recipe) {
    setRecipes((prev) =>
      prev.map((x) => (x.id === recipe.id ? recipe : x))
    );
  }

  function deleteRecipe(id: number) {
    setRecipes((prev) => prev.filter((x) => x.id !== id));
  }

    // ── CRUD Ingrédients (NOUVEAU — async car vrais appels API) ───────────────
 
  /**
   * Crée un ingrédient via l'API et met à jour le state local.
   *
   * Note junior : on attend la réponse de l'API (await) pour obtenir l'id
   * généré par la base de données. On ne peut pas générer cet id côté front.
   * C'est la différence avec addUser() qui était sur un mock local.
   */
  async function addIngredient(
    data: Omit<Ingredient, "id" | "usedInRecipesCount">
  ): Promise<void> {
    const created = await createIngredient(data);
    setIngredients((prev) => [...prev, created]);
  }
 
  /**
   * Met à jour un ingrédient via l'API et synchronise le state.
   * La réponse de l'API fait autorité sur les données (ex: normalisation du label).
   */
  async function handleUpdateIngredient(ingredient: Ingredient): Promise<void> {
    const updated = await updateAdminIngredient(ingredient.id, {
      label: ingredient.label,
      unit:  ingredient.unit,
    });
    setIngredients((prev) =>
      prev.map((i) => (i.id === updated.id ? updated : i))
    );
  }
 
  /**
   * Supprime un ingrédient via l'API.
   * En cas d'erreur (409 - utilisé dans des recettes), l'exception remonte
   * jusqu'à Ingredients.tsx qui l'affiche dans la modale.
   */
  async function handleDeleteIngredient(id: number): Promise<void> {
    await deleteIngredient(id);
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }

  const userName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : "Admin";

  return (
    <div className="admin-scope">
      {!loggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <AdminShell
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onLogout={handleLogout}
          userName={userName}
        >
          {currentPage === "overview" && (
            <Overview users={users} recipes={recipes} />
          )}
          {currentPage === "users" && (
            <Users
              users={users}
              onAdd={addUser}
              onUpdate={updateUser}
              onDelete={deleteUser}
            />
          )}
          {currentPage === "recipes" && (
            <Recipes
              recipes={recipes}
              onAdd={addRecipe}
              onUpdate={updateRecipe}
              onDelete={deleteRecipe}
            />
          )}
          {currentPage === "ingredients" && (
            <Ingredients
              ingredients={ingredients}
              onAdd={addIngredient}
              onUpdate={handleUpdateIngredient}
              onDelete={handleDeleteIngredient}
            />
          )}
        </AdminShell>
      )}
    </div>
  );
}
