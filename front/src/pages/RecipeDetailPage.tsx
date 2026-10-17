import { Recipe } from "../admin/types";
import { fetchRecipe } from "../api";
import RecipeDetail from "../components/recipe/RecipeDetail";
import Loading from "../components/layout/Loading";
import { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import { useTranslation } from "@/context/LocaleContext";

interface Props {
  recipeId: number;
  onBack: () => void;
  /**
   * Appelé quand la personne clique sur le crayon. On lui laisse le choix de
   * CE QU'IL SE PASSE ensuite (AppRouter décide : ouvrir UpdateRecipePage) —
   * cette page ne connaît que la recette, pas la navigation globale.
   */
  onEdit?: (recipeId: number) => void;
}

export default function RecipeDetailPage({ recipeId, onBack, onEdit }: Props) {

  const { user } = useUser();
  const [recipe,    setRecipe]    = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(false);
  const { t } = useTranslation();

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
          {t("recipe.not_found.message")}
        </p>
        <button
          onClick={onBack}
          style={{ fontSize: 14, fontWeight: 600, color: "var(--color-primary)" }}
        >
          {t("recipe.not_found.back_button")}
        </button>
      </div>
    );
  }

  const isOwner = recipe.userId != null && user?.id === recipe.userId;
  const isAdmin = user?.role === "ROLE_SUPER_ADMIN" || user?.role === "ROLE_ADMIN";
  const canEdit = isOwner || isAdmin;

  return (
    <RecipeDetail
      recipe={recipe}
      onBack={onBack}
      canEdit={canEdit}
      onEdit={onEdit ? () => onEdit(recipe.id) : undefined}
    />
  );
}