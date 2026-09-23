// ─────────────────────────────────────────────────────────────────────────────
// src/admin/AdminApp.tsx
//
// Point d'entrée de l'interface admin.
// Contient UNIQUEMENT : état global (auth + données) + logique CRUD.
// Le layout est délégué à AdminShell, les pages à leurs composants respectifs.
//
// COMMENT l'intégrer dans le projet principal :
//   Dans src/App.tsx (ou le router) :
//     import AdminApp from "./admin/AdminApp";
//     // ex : <Route path="/admin/*" element={<AdminApp />} />
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import type { AdminPage, User, Recipe } from "./types";
import Login     from "./components/auth/Login";
import AdminShell from "./components/layout/AdminShell";
import Overview  from "./pages/Overview";
import Users     from "./pages/Users";
import Recipes   from "./pages/Recipes";
import { fetchAdminRecipes, fetchRecipes, fetchUsers, getUserData, isAuthenticated } from "../api";
import { UserData } from "@/context/UserContext";
import "../styles/admin.css";

export default function AdminApp() {
  // ── État d'authentification ────────────────────────────────────────────────
  const [loggedIn,     setLoggedIn]     = useState(isAuthenticated());
  const [currentUser,  setCurrentUser]  = useState<User | null>(null);
  const [currentPage,  setCurrentPage]  = useState<AdminPage>("overview");

  // ── Données ───────────────────
  const [users,   setUsers]   = useState<User[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    fetchUsers().then((res) => setUsers(res));
    fetchAdminRecipes().then((res) => setRecipes(res));
  }, [])

  // ── Auth ───────────────────────────────────────────────────────────────────
  async function handleLogin(email: string, password: string): Promise<boolean> {

    const user: UserData = await getUserData();

    if (user && (user.role.includes("ROLE_ADMIN") || user.role.includes("ROLE_SUPER_ADMIN"))) {
    	setCurrentUser({...user, password});
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
  // Omit<User,b"createdAt"> = tous les champs sauf createdAt
  // (généré automatiquement ici)
  function addUser(u: Omit<User, "id" | "createdAt">) {
    const newUser: User = {
      ...u,
	  id:1,
      createdAt: new Date().getMilliseconds()
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
  function addRecipe(r: Omit<Recipe, "id" | "createdAt">) {
    const newRecipe: Recipe = {
      ...r,
	  id:1,
      createdAt: new Date().getMilliseconds()
    };
    setRecipes((prev) => [...prev, newRecipe]);
  }

  function updateRecipe(r: Recipe) {
    setRecipes((prev) => prev.map((x) => (x.id === r.id ? r : x)));
  }

  function deleteRecipe(id: number) {
    setRecipes((prev) => prev.filter((x) => x.id !== id));
  }

  const userName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : "Admin";

  return (
    <div className="admin-scope">
      {!loggedIn ? 
        <Login onLogin={handleLogin} /> 
      : 
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
      </AdminShell>
      }

    </div>
  );
}
