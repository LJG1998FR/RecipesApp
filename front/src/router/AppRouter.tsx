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
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CHANGEMENT IMPORTANT PAR RAPPORT À LA VERSION PRÉCÉDENTE :
 * <UserProvider> englobe désormais TOUT l'arbre une fois authentifié (y
 * compris l'écran détail plein écran), au lieu de n'envelopper que le shell
 * à onglets. Avant ce changement, RecipeDetailPage/RecipeDetail n'avaient
 * tout simplement AUCUN accès à useUser() — un appel à ce hook y aurait levé
 * l'erreur "useUser must be used inside <UserProvider>". C'était un bug
 * silencieux tant que personne n'essayait d'utiliser le contexte utilisateur
 * depuis cet écran ; le bouton "Modifier" en avait justement besoin pour
 * savoir qui est connecté, ce qui l'a révélé.
 * ─────────────────────────────────────────────────────────────────────────
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
import UpdateRecipePage from "../components/recipe/UpdateRecipePage";
import { isAuthenticated } from "../api";
import { UserProvider } from "../context/UserContext";

export default function AppRouter() {
  const navigate = useNavigate();

  const [authed, setAuthed] = useState<boolean>(isAuthenticated());
  const [view,       setView]       = useState<AppView>("home");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeNav,  setActiveNav]  = useState<NavTab>("home");
  // Id de la recette en cours d'édition. Distinct de `selectedId` (qui sert
  // à l'écran "detail" en lecture seule) : les deux écrans peuvent en
  // théorie porter sur des recettes différentes selon le parcours, mieux
  // vaut ne pas les confondre dans un seul state partagé.
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);

  // ── Non connecté ────────────────────────────────────────────────────────────
  if (!authed) {
    return <AuthPage onAuth={() => setAuthed(true)} />;
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  const openRecipe = (id: number) => {
    setSelectedId(id);
    setView("detail");
  };

  const openEdit = (id: number) => {
    setEditingRecipeId(id);
    setActiveNav("editrecipe");
    // On quitte l'écran détail plein écran (view === "detail") pour revenir
    // dans le shell à onglets, qui est ce qui affiche réellement
    // UpdateRecipePage (via renderPage(), cf. plus bas) — cohérent avec le
    // choix déjà fait pour "addrecipe".
    setView("home");
  };

  const closeEdit = () => {
    setEditingRecipeId(null);
    setActiveNav("home");
  };

  const renderPage = () => {
    if (activeNav === "profile")   return <ProfilePage />;
    if (activeNav === "addrecipe") return <AddRecipePage onCancel={() => setActiveNav("home")} />;
    if (activeNav === "editrecipe" && editingRecipeId !== null) {
      return (
        <UpdateRecipePage
          recipeId={editingRecipeId}
          onCancel={closeEdit}
          onDeleted={closeEdit}
        />
      );
    }
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
      {view === "detail" && selectedId !== null ? (
        // ── Détail recette : plein écran sans BottomNav ───────────────────────
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
            onEdit={openEdit}
          />
        </div>
      ) : (
        // ── Pages principales (shell à onglets) ────────────────────────────────
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
      )}
    </UserProvider>
  );
}