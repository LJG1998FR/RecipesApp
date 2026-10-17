import { useTranslation } from "@/context/LocaleContext";
import { toPhotoUrl } from "../../api";
import type { Recipe } from "../../types";

interface Props {
  recipe: Recipe;
  onSelect: () => void;
}

export default function RecipeCard({ recipe, onSelect }: Props) {
  
  const { t } = useTranslation();
  const hasCookTime = parseInt(recipe.cookTime) > 0;
  return (
    <div
      onClick={onSelect}
      style={{
        textAlign: "left",
        width: "100%",
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "var(--color-card)",
        border: "1px solid var(--color-border)",
        transition: "transform 0.15s",
        display: "block",
        cursor: "pointer",
      }}
      onMouseOver={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseOut={(e)  => (e.currentTarget.style.transform = "scale(1)")}
    >
      {/* ── Image avec badge temps et dégradé ──
          On prend la 1ère photo renvoyée par le back
          (déjà triée par position côté serveur, cf. serializePhotos()),
          avec un fallback visuel si la recette n'a encore aucune photo
          (optionnel côté formulaire). */}
      <div style={{ position: "relative", height: 200, backgroundColor: "var(--color-card)" }}>
        {recipe.photos?.[0] ? (
          <img
            src={toPhotoUrl(recipe.photos[0].url)}
            alt={recipe.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32,
            }}
            aria-hidden
          >
            🍽️
          </div>
        )}
        {/* Dégradé du bas pour lisibilité */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(23,18,16,0.85) 0%, rgba(23,18,16,0.2) 50%, transparent 100%)",
          }}
        />
        {/* Badge temps — coin haut gauche */}
        <span
          style={{
            position: "absolute", top: 24, left: 12,
            fontSize: 12, fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 99,
            backgroundColor: "rgba(23,18,16,0.72)",
            color: "var(--color-primary)",
            backdropFilter: "blur(4px)",
          }}
        >
        {hasCookTime
            ? t("recipe.card.time_prep_and_cook", { prepTime: recipe.prepTime, cookTime: recipe.cookTime })
            : t("recipe.card.time_prep_only", { prepTime: recipe.prepTime })}
        </span>
      </div>

      {/* ── Infos texte sous l'image ── */}
      <div style={{ padding: "14px 16px 16px" }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 17,
            color: "var(--color-text)",
            marginBottom: 4,
            lineHeight: 1.25,
          }}
        >
          {recipe.title}
        </p>
      </div>
    </div>
  );
}