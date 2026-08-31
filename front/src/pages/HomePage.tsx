import { useState } from "react";
import type { Category } from "../types";
import { CATEGORIES } from "../types";
import { recipes } from "../data/recipes";
import RecipeCard from "../components/recipe/RecipeCard";
import { SearchIcon } from "../components/icons";

interface Props {
  onSelectRecipe: (id: number) => void;
}

export default function HomePage({ onSelectRecipe }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>("Tout");
  const [search, setSearch] = useState("");

  const filtered = recipes.filter(
    (r) =>
      (activeCategory === "Tout" || r.category === activeCategory) &&
      (search === "" || r.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ fontFamily: "var(--font-body)" }}>

      {/* ── Navbar supérieure ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "52px 20px 16px",   /* 52px top = safe area + breathing room */
        }}
      >
        {/* Salutation */}
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text)" }}>
          Bonjour, Marie 👋
        </p>

        {/* Avatar circulaire */}
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            backgroundColor: "var(--color-primary)",
            color: "#171210",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            flexShrink: 0,
          }}
        >
          M
        </div>
      </div>

      {/* ── Barre de recherche ────────────────────────────────────────────── */}
      <div style={{ padding: "0 20px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px",
            height: 50,
            borderRadius: 16,
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <span style={{ color: "var(--color-text-dim)", flexShrink: 0 }}>
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Rechercher une recette…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "var(--color-text)",
              caretColor: "var(--color-primary)",
            }}
          />
        </div>
      </div>

      {/* ── Filtres catégories ────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          padding: "0 20px 22px",
          /* Masque la scrollbar horizontale */
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0,
                padding: "9px 18px",
                borderRadius: 99,
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "background-color 0.15s, color 0.15s",
                backgroundColor: isActive ? "var(--color-primary)" : "var(--color-card)",
                color: isActive ? "#171210" : "var(--color-text-muted)",
                border: isActive ? "1px solid transparent" : "1px solid var(--color-border)",
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── Titre section + compteur ──────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px 14px",
        }}
      >
        <h2
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "var(--color-text)",
            fontFamily: "var(--font-display)",
          }}
        >
          {activeCategory === "Tout" ? "Toutes les recettes" : activeCategory}
        </h2>
        <span style={{ fontSize: 12, color: "var(--color-text-dim)" }}>
          {filtered.length} recette{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Liste des recettes ────────────────────────────────────────────── */}
      <div style={{ padding: "0 20px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🍽️</p>
            <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Aucune recette trouvée</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map((r) => (
              <RecipeCard key={r.id} recipe={r} onSelect={() => onSelectRecipe(r.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Espace pour la BottomNav fixe */}
      <div style={{ height: 90 }} />
    </div>
  );
}
