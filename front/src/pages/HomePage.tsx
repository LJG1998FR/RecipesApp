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
    const controller = new AbortController();

    async function loadRecipes() {
      setIsLoadingList(true);
      setListError("");
      try {
        const res = await fetchRecipesPaginated<Recipe>(
          {
            page,
            limit,
            type: activeCategory !== "Tout" ? activeCategory : undefined,
            search: debouncedSearch || undefined
          },
          {
            signal: controller.signal
          } // ⚠️ à transmettre jusqu'au fetch() réel dans api/index.ts
        );
        setItems(res.items);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      } catch (err) {
        // Une requête annulée lève une AbortError : ce n'est PAS une vraie
        // erreur à afficher à l'utilisateur, juste le signe qu'une requête
        // plus récente a pris le relais.
        if (err instanceof Error && err.name === "AbortError") return;
        setListError(t("home.load_error"));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsLoadingList(false);
        }
      }
    }

    loadRecipes();

    // Cleanup : à chaque nouveau rendu (nouvelle dépendance) OU au démontage,
    // React annule automatiquement la requête précédente avant d'en lancer une nouvelle.
    return () => controller.abort();
  }, [page, limit, activeCategory, debouncedSearch]);

  // ✅ Garde-fous : user non chargé OU recettes en cours de fetch
  if (!user || isLoading) {
    return <Loading />;
  }

  return (
    // <main> : BottomNav est rendue par le routeur, en dehors de ce composant
    // (voir AppRouter) — tout ce que HomePage affiche EST donc le contenu
    // principal de la vue "Accueil".
    <main style={{ fontFamily: "var(--font-body)" }}>

      {/* ── Navbar supérieure ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "52px 20px 16px",
        }}
      >
        {/* h1 : la page n'avait AUCUN titre de niveau 1 — le <h2> "Toutes les
            recettes" plus bas apparaissait donc comme un titre orphelin, sans
            h1 parent (hiérarchie cassée, cf. "Heading levels should only
            increase by one" — règle axe-core/W3C). La salutation fait un très
            bon h1 : elle est déjà le premier contenu significatif de la page. */}
        <h1 style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text)" }}>
          {t("home.greeting", { name: user.firstName })}
        </h1>

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

      {/* ── Barre de recherche ──────────────────────────────────────────────
          role="search" : landmark dédié, au même titre que <nav>/<main>. Un
          lecteur d'écran peut sauter directement "à la recherche" sans avoir
          à parcourir toute la page. Le placeholder NE remplace PAS un nom
          accessible (il disparaît dès la saisie et n'est pas garanti d'être
          exposé par tous les lecteurs d'écran) : on ajoute donc aria-label. */}
      <div role="search" style={{ padding: "0 20px 20px" }}>
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
            aria-label={t("home.search_label")}
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

      {/* ── Filtres catégories ──────────────────────────────────────────────
          role="group" : signale que ces boutons forment un seul contrôle
          logique ("filtrer par catégorie"), pas une liste de boutons isolés
          sans rapport entre eux. aria-pressed sur chaque bouton expose
          lequel est actuellement sélectionné (sinon, seule la couleur de
          fond le montrait — invisible pour un lecteur d'écran, et limite
          aussi pour un utilisateur malvoyant à fort contraste personnalisé). */}
      <div
        role="group"
        aria-label={t("common.aria.category_filter_group")}
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
            <button type="button"
              key={cat}
              onClick={() => setActiveCategory(cat)}
              aria-pressed={isActive}
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
          <p role="alert" style={{ fontSize: 13, color: "#e07070" }}>{listError}</p>
        </div>
      )}

      {/* ── Liste des recettes ──────────────────────────────────────────────
          aria-busy indique aux technologies d'assistance qu'une mise à jour
          de la zone est en cours (changement de page/filtre) — sans lui,
          seule l'opacité CSS signalait visuellement ce "chargement en
          douceur", invisible pour qui n'utilise pas d'écran. */}
      <div
        aria-busy={isLoadingList}
        style={{
          padding: "0 20px",
          opacity: isLoadingList ? 0.6 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {items.length === 0 && !isLoadingList ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 36, marginBottom: 12 }} aria-hidden="true">🍽️</p>
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
          region: t("home.pagination.region"),
          perPage: t("home.pagination.per_page"),
          page: t("home.pagination.page"),
          previous: t("home.pagination.previous"),
          next: t("home.pagination.next"),
        }}
      />

      {/* Espace pour la BottomNav fixe */}
      <div style={{ height: 90 }} aria-hidden="true" />
    </main>
  );
}