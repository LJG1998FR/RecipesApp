import { useState } from "react";
import type { AppView, NavTab } from "../types";

import AuthPage         from "../pages/AuthPage";
import HomePage         from "../pages/HomePage";
import RecipeDetailPage from "../pages/RecipeDetailPage";
import ProfilePage      from "../pages/ProfilePage";
import BottomNav        from "../components/layout/BottomNav";

export default function AppRouter() {
  const [authed,     setAuthed]     = useState(false);
  const [view,       setView]       = useState<AppView>("home");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeNav,  setActiveNav]  = useState<NavTab>("home");

  // ── Non connecté ──────────────────────────────────────────────────────────
  if (!authed) {
    return <AuthPage onAuth={() => setAuthed(true)} />;
  }

  // ── Détail recette : plein écran sans BottomNav ───────────────────────────
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
          onBack={() => { setView("home"); setSelectedId(null); }}
        />
      </div>
    );
  }

  // ── Pages principales ─────────────────────────────────────────────────────
  const openRecipe = (id: number) => { setSelectedId(id); setView("detail"); };

  const handleNavChange = (tab: NavTab) => { setActiveNav(tab); };

  const renderPage = () => {
    if (activeNav === "profile") return <ProfilePage />;
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
    /*
     * Le container principal est scrollable (overflowY: auto).
     * La BottomNav est en position:fixed dans son propre composant,
     * donc elle ne fait pas partie du flux et n'a pas besoin d'un
     * wrapper flex-col ici.
     */
    <div
      style={{
        backgroundColor: "var(--color-background)",
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100dvh",
        overflowY: "auto",
        /* Empêche le contenu de passer sous la BottomNav fixe (~72px) */
        paddingBottom: 80,
      }}
    >
      {renderPage()}
      <BottomNav active={activeNav} onChange={handleNavChange} />
    </div>
  );
}
