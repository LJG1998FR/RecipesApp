//import { recipes } from "../data/recipes";
import { Recipe } from "@/types";
import { fetchRecipe } from "../api";
import RecipeDetail from "../components/recipe/RecipeDetail";
import Loading from "../components/layout/Loading";
import { useEffect, useState } from "react";

interface Props {
  recipeId: number;
  onBack: () => void;
}

export default function RecipeDetailPage({ recipeId, onBack }: Props) {

  const [recipe,    setRecipe]    = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(false);

  // ✅ Fetch une seule fois au montage du composant
  useEffect(() => {
    fetchRecipe(recipeId)
      .then((res) => setRecipe(res))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [recipeId]); // ← recipeId en dépendance : si l'id change, on re-fetch


  if (isLoading) {
    return <Loading />;
  }

  if (error || !recipe) {
    return (
      <div
        style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          minHeight: "100dvh", gap: 12,
        }}
      >
        <p style={{ fontSize: 40 }}>🍽️</p>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          Recette introuvable.
        </p>
        <button
          onClick={onBack}
          style={{ fontSize: 14, fontWeight: 600, color: "var(--color-primary)" }}
        >
          ← Retour
        </button>
      </div>
    );
  }

  return <RecipeDetail recipe={recipe} onBack={onBack} />;
}