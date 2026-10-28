import { useEffect, useState } from "react";
import type { Category, Recipe } from "../types";
import { CATEGORIES, CATEGORY_LABEL_KEYS } from "../types";
import { fetchRecipesPaginated } from "../api/index";
import RecipeCard from "../components/recipe/RecipeCard";
import { SearchIcon } from "../components/icons";
import { useUser, getInitials } from "../context/UserContext";
import Loading from "../components/layout/Loading";
import PaginationControls from "../components/layout/PaginationControls";
import { useTranslation } from "@/context/LocaleContext";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

interface Props {
  onSelectRecipe: (id: number) => void;
}

export default function HomePage({ onSelectRecipe }: Props) {
  const { user } = useUser();
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<Category>("Tout");
  const [search, setSearch] = useState("");
  // Version "debouncée" de search : on évite de déclencher une requête
  // réseau à chaque frappe. 300ms est un bon compromis réactivité/charge.
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── Pagination (chargée depuis le serveur, 10/20/50 par page) ───────────────
  // Avant : un seul fetch au montage, puis filtre catégorie/recherche EN MÉMOIRE
  // sur la liste complète. Problème : ça charge toutes les recettes d'un coup,
  // ce que la pagination a justement pour but d'éviter. `items` est désormais
  // la page courante renvoyée par GET /api/recipes, déjà filtrée côté serveur.
  const [items,          setItems]          = useState<Recipe[]>([]);
  const [page,           setPage]           = useState(1);
  const [limit,          setLimit]          = useState(10); // 10 par défaut : cartes hautes, écran de téléphone
  const [total,          setTotal]          = useState(0);
  const [totalPages,     setTotalPages]     = useState(1);
  // Deux états de chargement distincts :
  // - isLoading   → tout premier chargement (écran plein <Loading/>)
  // - isLoadingList → changement de page/filtre/taille (la liste reste visible, juste atténuée)
  const [isLoading,     setIsLoading]     = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError,     setListError]     = useState("");

  async function loadRecipes() {
    setIsLoadingList(true);
    setListError("");
    try {
      // ⚠️ On filtre toujours par la valeur TECHNIQUE (activeCategory, ex: "Plats"),
      // jamais par son libellé traduit — le serveur ne connaît pas les traductions.
      const res = await fetchRecipesPaginated<Recipe>({
        page,
        limit,
        type: activeCategory !== "Tout" ? activeCategory : undefined,
        search: debouncedSearch || undefined,
      });
      setItems(res.items);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch {
      setListError(t("home.load_error"));
    } finally {
      setIsLoading(false);
      setIsLoadingList(false);
    }
  }

  // Debounce de la recherche texte
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Revenir à la page 1 dès qu'un filtre, la recherche ou la taille de page
  // change — sinon on pourrait rester sur une "page 4" qui n'existe plus
  // une fois le résultat filtré.
  useEffect(() => {
    setPage(1);
  }, [activeCategory, debouncedSearch, limit]);

  // Rechargement serveur à chaque changement de page/catégorie/recherche/limite
  useEffect(() => {
    loadRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, activeCategory, debouncedSearch]);

  // ✅ Garde-fous : user non chargé OU recettes en cours de fetch
  if (!user || isLoading) {
    return <Loading />;
  }

  return (
    <div style={{ fontFamily: "var(--font-body)" }}>

      {/* ── Navbar supérieure ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "52px 20px 16px",
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text)" }}>
          {t("home.greeting", { name: user.firstName })}
        </p>

        {/* Groupe : sélecteur de langue + avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LanguageSwitcher />
          <div
            style={{
              width: 42, height: 42, borderRadius: "50%",
              backgroundColor: "var(--color-primary)", color: "#171210",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, fontFamily: "var(--font-display)",
              flexShrink: 0,
            }}
          >
            {getInitials(user)}
          </div>
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
            placeholder={t("home.search_placeholder")}
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
          {activeCategory === "Tout" ? t("home.section_title_all") : t(CATEGORY_LABEL_KEYS[activeCategory])}
        </h2>
        {/* Pas de vrai moteur de pluriel en mode fait-maison : on choisit
        la clé singulier/pluriel ici-même. */}
        <span style={{ fontSize: 12, color: "var(--color-text-dim)" }}>
          {total <= 1
            ? t("home.recipe_count_singular", { count: total })
            : t("home.recipe_count_plural", { count: total })}
        </span>
      </div>

      {/* ── Erreur de chargement ── */}
      {listError && (
        <div style={{ padding: "0 20px 14px" }}>
          <p style={{ fontSize: 13, color: "#e07070" }}>{listError}</p>
        </div>
      )}

      {/* ── Liste des recettes ────────────────────────────────────────────── */}
      <div
        style={{
          padding: "0 20px",
          opacity: isLoadingList ? 0.6 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {items.length === 0 && !isLoadingList ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🍽️</p>
            <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>{t("home.empty_state")}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {items.map((r) => (
              <RecipeCard key={r.id} recipe={r} onSelect={() => onSelectRecipe(r.id)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      <PaginationControls
        page={page}
        limit={limit}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onLimitChange={setLimit}
        disabled={isLoadingList}
        labels={{
          perPage: t("home.pagination.per_page"),
          page: t("home.pagination.page"),
          previous: t("home.pagination.previous"),
          next: t("home.pagination.next"),
        }}
      />

      {/* Espace pour la BottomNav fixe */}
      <div style={{ height: 90 }} />
    </div>
  );
}