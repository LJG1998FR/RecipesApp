import { useState } from "react";
import type { Recipe } from "../../types";
import {
  StarIcon, ClockIcon, FlameIcon,
  ChevronLeft, ChevronDown, HeartIcon,
  BulbIcon, CheckIcon,
} from "../icons";

interface Props {
  recipe: Recipe;
  onBack: () => void;
}

// Styles réutilisables
const S = {
  card: {
    backgroundColor: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: 16,
  },
  label: {
    fontSize: 11,
    color: "var(--color-text-dim)",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    backgroundColor: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: 14,
    marginBottom: 10,
  },
};

export default function RecipeDetail({ recipe, onBack }: Props) {
  const [liked,     setLiked]     = useState(false);
  const [activeTab, setActiveTab] = useState<"ingredients" | "steps">("ingredients");
  const [tipsOpen,  setTipsOpen]  = useState(false);

  return (
    <div
      style={{
        fontFamily: "var(--font-body)",
        backgroundColor: "var(--color-background)",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Hero image ── */}
      <div style={{ position: "relative", height: "clamp(260px, 42vh, 340px)", flexShrink: 0 }}>
        <img
          src={recipe.image}
          alt={recipe.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {/* Dégradé : sombre en haut (boutons) et en bas (badge catégorie) */}
        <div
          style={{
            position: "absolute", inset: 0,
            background:
              "linear-gradient(to bottom, rgba(23,18,16,0.7) 0%, rgba(23,18,16,0) 35%, rgba(23,18,16,0) 55%, rgba(23,18,16,0.92) 100%)",
          }}
        />

        {/* Boutons retour + like */}
        <div
          style={{
            position: "absolute", top: 0, left: 0, right: 0,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "48px 20px 0",
          }}
        >
          <button
            onClick={onBack}
            style={{
              width: 38, height: 38, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "rgba(23,18,16,0.6)",
              color: "var(--color-text)",
              backdropFilter: "blur(4px)",
            }}
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => setLiked((l) => !l)}
            style={{
              width: 38, height: 38, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "rgba(23,18,16,0.6)",
              backdropFilter: "blur(4px)",
            }}
          >
            <HeartIcon filled={liked} />
          </button>
        </div>

        {/* Badge catégorie — bas du hero */}
        <div style={{ position: "absolute", bottom: 16, left: 20 }}>
          <span
            style={{
              fontSize: 12, fontWeight: 600,
              padding: "5px 12px", borderRadius: 99,
              backgroundColor: "rgba(224,154,90,0.25)",
              color: "var(--color-primary)",
              border: "1px solid rgba(224,154,90,0.3)",
            }}
          >
            {recipe.category}
          </span>
        </div>
      </div>

      {/* ── Contenu scrollable ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 100px" }}>

        {/* Titre + sous-titre */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.75rem, 7vw, 2.25rem)",
            lineHeight: 1.15,
            color: "var(--color-text)",
            marginBottom: 6,
          }}
        >
          {recipe.title}
        </h1>
        {/* <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 20 }}>
          {recipe.subtitle}
        </p> */}

        {/* Stats prépa / cuisson / note */}
        <div
          style={{
            ...S.card,
            display: "flex",
            gap: 0,
            marginBottom: 20,
            overflow: "hidden",
          }}
        >
          {[
            { icon: <ClockIcon size={16} />, value: recipe.prepTime,          label: "Préparation" },
            { icon: <FlameIcon />,           value: recipe.cookTime,           label: "Cuisson"     },
            { icon: <StarIcon />,            value: `${recipe.rating}`,        label: `${recipe.reviews} avis` },
          ].map(({ icon, value, label }, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "14px 8px",
                borderRight: idx < 2 ? "1px solid var(--color-border)" : "none",
                gap: 3,
              }}
            >
              <span style={{ color: "var(--color-primary)" }}>{icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>{value}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-dim)" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        {/* <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text-muted)", marginBottom: 20 }}>
          {recipe.description}
        </p> */}

        {/* ── Astuces du chef (accordion) ── */}
        {recipe.tips.length > 0 && (
          <div style={{ ...S.card, marginBottom: 20, overflow: "hidden" }}>
            {/* Header accordion */}
            <button
              onClick={() => setTipsOpen((o) => !o)}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px",
                backgroundColor: "var(--color-card)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--color-primary)" }}><BulbIcon /></span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                  Astuces du chef
                </span>
              </div>
              <span style={{ color: "var(--color-text-dim)" }}>
                <ChevronDown open={tipsOpen} />
              </span>
            </button>

            {/* Contenu accordion */}
            {tipsOpen && (
              <div style={{ padding: "0 16px 16px", backgroundColor: "var(--color-card)" }}>
                <div style={{ height: 1, backgroundColor: "var(--color-border)", marginBottom: 14 }} />
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {recipe.tips.map((tip, i) => (
                    <li key={i} style={{ display: "flex", gap: 10 }}>
                      <span style={{ flexShrink: 0, marginTop: 2, color: "var(--color-primary)" }}>
                        <CheckIcon />
                      </span>
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-text-muted)", margin: 0 }}>
                        {tip}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Tabs Ingrédients / Étapes ── */}
        <div
          style={{
            display: "flex",
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 14,
            padding: 4,
            marginBottom: 16,
          }}
        >
          {(["ingredients", "steps"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                transition: "background-color 0.2s, color 0.2s",
                backgroundColor: activeTab === tab ? "var(--color-primary)" : "transparent",
                color: activeTab === tab ? "#171210" : "var(--color-text-muted)",
                cursor: "pointer",
              }}
            >
              {tab === "ingredients" ? "Ingrédients" : "Étapes"}
            </button>
          ))}
        </div>

        {/* ── Liste ingrédients ── */}
        {activeTab === "ingredients" ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} style={{ ...S.row }}>
                <span
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 12, fontWeight: 700,
                    backgroundColor: "rgba(224,154,90,0.18)",
                    color: "var(--color-primary)",
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 14, color: "var(--color-text)" }}>{ing}</span>
              </li>
            ))}
          </ul>
        ) : (
          /* ── Liste étapes ── */
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {recipe.steps.map((step, i) => (
              <li key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 13, fontWeight: 700,
                    backgroundColor: "var(--color-primary)",
                    color: "#171210",
                  }}
                >
                  {i + 1}
                </span>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--color-text-muted)", margin: 0, paddingTop: 5 }}>
                  {step}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
