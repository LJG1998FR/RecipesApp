//import { recipes } from "../data/recipes";
import { Recipe } from "@/types";
import { fetchRecipe } from "../api";
import RecipeDetail from "../components/recipe/RecipeDetail";
import { useEffect, useState } from "react";

interface Props {
  recipeId: number;
  onBack: () => void;
}

export default function RecipeDetailPage({ recipeId, onBack }: Props) {
  //const recipe = recipes.find((r) => r.id === recipeId);
  const [recipe, setRecipe] = useState<Recipe|null>(null);

  // ✅ Fetch une seule fois au montage du composant
  useEffect(() => {
    fetchRecipe(recipeId).then((res) => setRecipe(res));
  }, []); // ← tableau vide = une seule fois

  // Garde-fou : recette introuvable
  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-4xl">🍽️</p>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Recette introuvable.</p>
        <button
          onClick={onBack}
          className="text-sm font-medium"
          style={{ color: "var(--color-primary)" }}
        >
          ← Retour
        </button>
      </div>
    );
  }

  return <RecipeDetail recipe={recipe} onBack={onBack} />;
}
