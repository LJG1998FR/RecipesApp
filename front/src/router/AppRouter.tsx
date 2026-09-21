/**
 * AppRouter.tsx — navigation interne de l'app recettes.
 *
 * On conserve le routing par état (useState) pour les onglets principaux
 * car ils ne nécessitent pas d'URL dédiée (pas de lien direct possible de toute façon).
 *
 * EXCEPTION : la page détail d'une recette.
 * Elle utilise useNavigate pour pousser une entrée dans l'historique du navigateur,
 * ce qui permet au bouton "retour" natif de fonctionner.
 *
 * Pourquoi ne pas tout migrer vers des <Route> imbriqués ?
 * Pour un projet de cette taille, c'est du sur-engineering.
 * La règle pragmatique : une URL dédiée seulement si l'utilisateur
 * doit pouvoir partager/bookmarker cette page.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppView, NavTab } from "../types";

import AuthPage         from "../pages/AuthPage";
import HomePage         from "../pages/HomePage";
import RecipeDetailPage from "../pages/RecipeDetailPage";
import ProfilePage      from "../pages/ProfilePage";
import BottomNav        from "../components/layout/BottomNav";
import AddRecipePage    from "../components/recipe/AddRecipePage";
import { isAuthenticated } from "../api";
import { UserProvider } from "../context/UserContext";

export default function AppRouter() {
  const navigate = useNavigate();

  const [authed, setAuthed] = useState<boolean>(isAuthenticated());
  const [view,       setView]       = useState<AppView>("home");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeNav,  setActiveNav]  = useState<NavTab>("home");

  // ── Non connecté ────────────────────────────────────────────────────────────
  if (!authed) {
    return <AuthPage onAuth={() => setAuthed(true)} />;
  }

  // ── Détail recette : plein écran sans BottomNav ─────────────────────────────
  if (view === "detail" && selectedId !== null) {
    return (
      <div
        style={{
          backgroundColor: "var(--color-background)",
          maxWidth: 430,
          margin: "0 auto",
          minHeight: "100dvh",
        }}
      >
        <RecipeDetailPage
          recipeId={selectedId}
          onBack={() => {
            // navigate(-1) = "retour arrière" dans l'historique du navigateur.
            // Équivalent du bouton ← natif. Bien plus propre que setView("home").
            //navigate(-1);
            setView("home");
            setSelectedId(null);
          }}
        />
      </div>
    );
  }

  // ── Pages principales ────────────────────────────────────────────────────────
  const openRecipe = (id: number) => {
    setSelectedId(id);
    setView("detail");
  };

  const renderPage = () => {
    if (activeNav === "profile")   return <ProfilePage />;
    if (activeNav === "addrecipe") return <AddRecipePage onCancel={() => setActiveNav("home")} />;
    if (activeNav === "saved") return (
      <div
        style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          minHeight: "60vh", gap: 12,
        }}
      >
        <p style={{ fontSize: 40 }}>🔖</p>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          Vos recettes sauvegardées apparaîtront ici.
        </p>
      </div>
    );
    return <HomePage onSelectRecipe={openRecipe} />;
  };

  return (
    <UserProvider>
      <div
        style={{
          backgroundColor: "var(--color-background)",
          maxWidth: 430,
          margin: "0 auto",
          minHeight: "100dvh",
          overflowY: "auto",
          paddingBottom: 80,
        }}
      >
        {renderPage()}
        <BottomNav active={activeNav} onChange={setActiveNav} />
      </div>
    </UserProvider>
  );
}