import type { Recipe } from "../../types";
import { StarIcon } from "../icons";

interface Props {
  recipe: Recipe;
  onSelect: () => void;
}

export default function RecipeCard({ recipe, onSelect }: Props) {
  return (
    <button
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
      {/* ── Image avec badge temps et dégradé ── */}
      <div style={{ position: "relative", height: 200 }}>
        <img
          src={recipe.image}
          alt={recipe.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
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
            position: "absolute", top: 12, left: 12,
            fontSize: 12, fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 99,
            backgroundColor: "rgba(23,18,16,0.72)",
            color: "var(--color-primary)",
            backdropFilter: "blur(4px)",
          }}
        >
          {recipe.prepTime} + {recipe.cookTime}
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
        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            marginBottom: 10,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
          }}
        >
          {recipe.subtitle}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <StarIcon />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
            {recipe.rating}
          </span>
          <span style={{ fontSize: 13, color: "var(--color-text-dim)" }}>
            ({recipe.reviews})
          </span>
        </div>
      </div>
    </button>
  );
}
