// ─────────────────────────────────────────────────────────────────────────────
// src/admin/AdminApp.tsx
//
// Point d'entrée de l'interface admin.
// Contient UNIQUEMENT : état global (auth + données) + logique CRUD.
// Le layout est délégué à AdminShell, les pages à leurs composants respectifs.
//
// CORRECTIFS vs version précédente :
//   1. deleteUser et deleteRecipe wrappés dans useCallback (ils ne l'étaient pas)
//   2. handleLogout wrappé dans useCallback (passé à AdminShell → Sidebar)
//   3. handleLogin wrappé dans useCallback (passé à Login)
//   4. new Date().getMilliseconds() remplacé par Math.floor(Date.now() / 1000)
//      → getMilliseconds() retourne 0-999 (millisecondes de la seconde courante !)
//      → Date.now() / 1000 donne un timestamp Unix en secondes, cohérent avec
//        time() de PHP et avec la fonction formatDate() du projet qui fait * 1000
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import type { AdminPage, User, Recipe } from "./types";
import Login      from "./components/auth/Login";
import AdminShell from "./components/layout/AdminShell";
import Overview   from "./pages/Overview";
import Users      from "./pages/Users";
import Recipes    from "./pages/Recipes";
import { fetchAdminRecipes, fetchUsers, getUserData, isAuthenticated } from "../api";
import { UserData } from "@/context/UserContext";
import "../styles/admin.css";

export default function AdminApp() {
  // ── État d'authentification ────────────────────────────────────────────────
  const [loggedIn,    setLoggedIn]    = useState(isAuthenticated());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<AdminPage>("overview");

  // ── Données ────────────────────────────────────────────────────────────────
  const [users,   setUsers]   = useState<User[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    fetchUsers().then((res) => setUsers(res));
    fetchAdminRecipes().then((res) => setRecipes(res));
  }, []);

  // ── Auth ───────────────────────────────────────────────────────────────────
  // useCallback [] : handleLogin ne capture aucune variable du composant
  // (setCurrentUser et setLoggedIn sont des setters React, toujours stables).
  const handleLogin = useCallback(async (email: string, password: string): Promise<boolean> => {
    const user: UserData = await getUserData();

    if (user && (user.role.includes("ROLE_ADMIN") || user.role.includes("ROLE_SUPER_ADMIN"))) {
      setCurrentUser({ ...user, password });
      setLoggedIn(true);
      return true;
    }
    return false;
  }, []);

  // useCallback [] : même raison — setLoggedIn, setCurrentUser, setCurrentPage
  // sont tous des setters stables fournis par React.
  const handleLogout = useCallback(() => {
    setLoggedIn(false);
    setCurrentUser(null);
    setCurrentPage("overview");
  }, []);

  // ── CRUD Utilisateurs ──────────────────────────────────────────────────────
  const addUser = useCallback((u: Omit<User, "id" | "createdAt">) => {
    const newUser: User = {
      ...u,
      id: -1,
      createdAt: Math.floor(Date.now() / 1000),
    };
    setUsers((prev) => [...prev, newUser]);
  }, []);

  const updateUser = useCallback((u: User) => {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
  }, []);

  // ✅ Manquait dans la version précédente : deleteUser n'était pas dans useCallback
  // → à chaque render d'AdminApp, une nouvelle fonction deleteUser était créée
  // → Users.tsx recevait une nouvelle référence onDelete → re-render de la Table
  const deleteUser = useCallback((id: number) => {
    setUsers((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // ── CRUD Recettes ──────────────────────────────────────────────────────────
  const addRecipe = useCallback((r: Omit<Recipe, "id" | "createdAt">) => {
    const newRecipe: Recipe = {
      ...r,
      id: -1,
      createdAt: Math.floor(Date.now() / 1000),
    };
    setRecipes((prev) => [...prev, newRecipe]);
  }, []);

  const updateRecipe = useCallback((r: Recipe) => {
    setRecipes((prev) => prev.map((x) => (x.id === r.id ? r : x)));
  }, []);


  const deleteRecipe = useCallback((id: number) => {
    setRecipes((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // ── userName  ───────────────────────────────────────────────────────
  // Pas critique ici (c'est juste une string), mais bonne habitude de ne pas
  // recalculer inutilement une valeur dérivée du state.
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
          onNavigate={setCurrentPage}  // setter React : déjà stable, pas besoin de wrapper
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
        </AdminShell>
      )}
    </div>
  );
}