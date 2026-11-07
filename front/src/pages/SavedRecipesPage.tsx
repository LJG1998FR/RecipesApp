import { useEffect, useState } from "react";
import type { Recipe } from "../types";
import { fetchSavedRecipes } from "../api";
import RecipeCard from "../components/recipe/RecipeCard";
import Loading from "../components/layout/Loading";
import { useTranslation } from "@/context/LocaleContext";

interface Props {
  onSelectRecipe: (id: number) => void;
}

/**
 * Remplace l'ancien bloc statique (icône 🔖 + texte figé) qui occupait
 * l'onglet "saved" dans AppRouter : ce bloc n'appelait aucune API, c'était
 * un simple placeholder visuel en attendant que le back existe.
 *
 * Même structure que HomePage (Loading plein écran au premier chargement,
 * aria-busy pendant un refetch, message d'erreur en role="alert"), mais
 * sans pagination/filtres : la liste des favoris d'un utilisateur reste
 * d'une taille raisonnable, inutile d'alourdir l'écran pour ça.
 */
export default function SavedRecipesPage({ onSelectRecipe }: Props) {
  const { t } = useTranslation();
  const [recipes,   setRecipes]   = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchSavedRecipes()
      .then((res) => {
        if (!cancelled) setRecipes(res);
      })
      .catch(() => {
        if (!cancelled) setError(t("saved.error"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // Garde-fou classique : si le composant est démonté (changement
    // d'onglet) avant la fin du fetch, on évite un setState sur un
    // composant qui n'existe plus (warning React bien connu).
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div style={{ fontFamily: "var(--font-body)", padding: "52px 20px 100px" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22, fontWeight: 700,
          color: "var(--color-text)",
          marginBottom: 20,
        }}
      >
        {t("saved.title")}
      </h1>

      {error && (
        <p role="alert" style={{ fontSize: 13, color: "#e07070", marginBottom: 16 }}>
          {error}
        </p>
      )}

      {recipes.length === 0 && !error ? (
        <div
          style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            minHeight: "50vh", gap: 12,
          }}
        >
          <p style={{ fontSize: 40 }} aria-hidden="true">🔖</p>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
            {t("saved.empty_state")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} onSelect={() => onSelectRecipe(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
