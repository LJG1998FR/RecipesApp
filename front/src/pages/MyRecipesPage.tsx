import { useEffect, useState } from "react";
import type { Recipe } from "../types";
import { CATEGORY_LABEL_KEYS } from "../types";
import { fetchUserRecipes, deleteRecipe, toPhotoUrl } from "../api";
import { ChevronLeft, TrashIcon, PencilIcon } from "../components/icons";
import { FormSection } from "../components/recipe/RecipeFormShared";
import Loading from "../components/layout/Loading";
import { useTranslation } from "@/context/LocaleContext";
import type { TFunction } from "@/context/LocaleContext";

// ─────────────────────────────────────────────────────────────────────────────
// MyRecipesPage.tsx — "Mes recettes", accessible depuis ProfilePage.
//
// Consomme GET /api/recipes/my-recipes (RecipeController::myRecipes), qui
// renvoie DÉJÀ les recettes groupées par statut :
//   - published : Recipe[] complètes (mêmes champs que HomePage/RecipeDetail)
//   - pending   : version allégée { id, title, status } — le back appelle ça
//                 "pending" mais range dedans TOUT ce qui n'est pas publié,
//                 donc PENDING *et* DECLINED mélangés.
//
// On sépare nous-mêmes "en attente" et "refusées" côté front grâce au champ
// `status` déjà présent sur chaque item — pas besoin de toucher au back.
//
// Volontairement AUTONOME : ne dépend d'aucun composant dont la version
// actuelle n'est pas confirmée (pas de RecipeCard ici, par exemple) — juste
// de l'API et des briques dont l'existence est vérifiée dans le code fourni.
// ─────────────────────────────────────────────────────────────────────────────

/** Forme allégée renvoyée pour les recettes non publiées (voir myRecipes() côté back). */
interface LightRecipe {
  id: number;
  title: string;
  status: string; // "PENDING" | "DECLINED" (jamais "PUBLISHED" ici, filtré par le back)
}

interface Props {
  /** Retour à l'écran précédent (ProfilePage). */
  onBack: () => void;
  /** Déclenché par le bouton "Modifier" d'une recette non publiée. */
  onEditRecipe: (recipeId: number) => void;
  /**
   * Optionnel : clic sur une recette PUBLIÉE pour voir son détail.
   * Si absent, les cartes publiées ne sont simplement pas cliquables
   * (pas de navigation inventée vers un écran qu'on ne veut pas forcément).
   */
  onViewRecipe?: (recipeId: number) => void;
}

export default function MyRecipesPage({ onBack, onEditRecipe, onViewRecipe }: Props) {
  const { t } = useTranslation();

  const [published, setPublished] = useState<Recipe[]>([]);
  const [pending,    setPending]    = useState<LightRecipe[]>([]);
  const [declined,   setDeclined]   = useState<LightRecipe[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [loadError,  setLoadError]  = useState(false);

  // Suppression : état local pour afficher "en cours" + confirmation à deux
  // temps (on évite d'ajouter une dépendance à un composant Modal qui
  // n'existe pas côté front "utilisateur", contrairement à l'admin).
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [deletingId,   setDeletingId]   = useState<number | null>(null);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);

  useEffect(() => {
    fetchUserRecipes()
      .then((res) => {
        setPublished(res.published);
        // Répartition PENDING / DECLINED côté front, à partir du statut déjà fourni.
        const pendingOnly  = res.pending.filter((r) => r.status === "PENDING");
        const declinedOnly = res.pending.filter((r) => r.status === "DECLINED");
        setPending(pendingOnly);
        setDeclined(declinedOnly);
      })
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleDelete(id: number) {
    setDeleteError(null);
    setDeletingId(id);
    try {
      await deleteRecipe(id);
      setPending((prev)  => prev.filter((r) => r.id !== id));
      setDeclined((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // deleteRecipe() passe par apiClient (axios), pas par handleResponse()/ApiError
      // (ce pattern n'existe que pour les appels fetch() manuels type createRecipe) :
      // on ne peut donc pas extraire un message précis du serveur ici, seulement
      // afficher un message générique. À améliorer le jour où deleteRecipe()
      // migrera vers apiClient avec un intercepteur qui normalise les erreurs.
      setDeleteError(t("profile.my_recipes.delete_error"));
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  if (isLoading) {
    return <Loading />;
  }

  const isEmpty = published.length === 0 && pending.length === 0 && declined.length === 0;

  return (
    <div
      style={{
        fontFamily: "var(--font-body)",
        backgroundColor: "var(--color-background)",
        minHeight: "100dvh",
        overflowY: "auto",
        paddingBottom: 48,
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "52px 20px 20px" }}>
        <button
          onClick={onBack}
          style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)",
            color: "var(--color-text)", cursor: "pointer",
          }}
        >
          <ChevronLeft />
        </button>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--color-text)" }}>
          {t("profile.my_recipes.title")}
        </h1>
      </div>

      <div style={{ padding: "0 20px" }}>

        {loadError && (
          <p style={{ fontSize: 14, color: "#e07070", marginBottom: 20 }}>
            {t("profile.my_recipes.load_error")}
          </p>
        )}

        {!loadError && isEmpty && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🍳</p>
            <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
              {t("profile.my_recipes.empty_all")}
            </p>
          </div>
        )}

        {deleteError && (
          <p style={{ fontSize: 13, color: "#e07070", marginBottom: 16 }}>{deleteError}</p>
        )}

        {/* ── Section 1 : Publiées ── */}
        {published.length > 0 && (
          <FormSection title={t("profile.my_recipes.section_published")} badge={String(published.length)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {published.map((recipe) => (
                <PublishedRow
                  key={recipe.id}
                  recipe={recipe}
                  onClick={onViewRecipe ? () => onViewRecipe(recipe.id) : undefined}
                  t={t}
                />
              ))}
            </div>
          </FormSection>
        )}

        {/* ── Section 2 : En attente de publication ── */}
        {pending.length > 0 && (
          <FormSection title={t("profile.my_recipes.section_pending")} badge={String(pending.length)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pending.map((recipe) => (
                <PendingRow
                  key={recipe.id}
                  recipe={recipe}
                  variant="pending"
                  isConfirming={confirmingId === recipe.id}
                  isDeleting={deletingId === recipe.id}
                  onEdit={() => onEditRecipe(recipe.id)}
                  onAskDelete={() => setConfirmingId(recipe.id)}
                  onCancelDelete={() => setConfirmingId(null)}
                  onConfirmDelete={() => handleDelete(recipe.id)}
                  t={t}
                />
              ))}
            </div>
          </FormSection>
        )}

        {/* ── Section 3 : Refusées ── */}
        {declined.length > 0 && (
          <FormSection title={t("profile.my_recipes.section_declined")} badge={String(declined.length)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {declined.map((recipe) => (
                <PendingRow
                  key={recipe.id}
                  recipe={recipe}
                  variant="declined"
                  isConfirming={confirmingId === recipe.id}
                  isDeleting={deletingId === recipe.id}
                  onEdit={() => onEditRecipe(recipe.id)}
                  onAskDelete={() => setConfirmingId(recipe.id)}
                  onCancelDelete={() => setConfirmingId(null)}
                  onConfirmDelete={() => handleDelete(recipe.id)}
                  t={t}
                />
              ))}
            </div>
          </FormSection>
        )}
      </div>
    </div>
  );
}

// ── Ligne "recette publiée" ──────────────────────────────────────────────────
// Reçoit une Recipe COMPLÈTE (photos, type, prepTime…) puisque le back les
// sérialise en entier pour ce groupe (contrairement à pending/declined).
function PublishedRow({
  recipe,
  onClick,
  t,
}: {
  recipe: Recipe;
  onClick?: () => void;
  t: TFunction;
}) {
  const typeLabelKey = CATEGORY_LABEL_KEYS[recipe.type as keyof typeof CATEGORY_LABEL_KEYS];

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 12px", borderRadius: 14,
        backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--color-surface)" }}>
        {recipe.photos?.[0] && (
          <img
            src={toPhotoUrl(recipe.photos[0].url)}
            alt={recipe.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 2 }}>
          {recipe.title}
        </p>
        <p style={{ fontSize: 12, color: "var(--color-text-dim)" }}>
          {typeLabelKey ? t(typeLabelKey) : recipe.type} · {recipe.prepTime} min
        </p>
      </div>
    </div>
  );
}

// ── Ligne "recette en attente / refusée" ─────────────────────────────────────
// Ne reçoit QUE { id, title, status } — pas de photo, pas de type : c'est
// exactement ce que le back renvoie pour ce groupe. Pas de clic sur la ligne
// (choix assumé) : seuls les boutons Modifier / Supprimer sont actionnables.
function PendingRow({
  recipe,
  variant,
  isConfirming,
  isDeleting,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  t,
}: {
  recipe: LightRecipe;
  variant: "pending" | "declined";
  isConfirming: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  t: TFunction;
}) {
  const badgeColor = variant === "declined" ? "#e07070" : "var(--color-primary)";
  const badgeBg    = variant === "declined" ? "rgba(224,112,112,0.12)" : "rgba(224,154,90,0.15)";
  const statusKey  = variant === "declined" ? "profile.my_recipes.status_declined" : "profile.my_recipes.status_pending";

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px", borderRadius: 14,
        backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)",
        opacity: isDeleting ? 0.5 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>
          {recipe.title}
        </p>
        <span
          style={{
            fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 99,
            backgroundColor: badgeBg, color: badgeColor,
          }}
        >
          {t(statusKey)}
        </span>
      </div>

      {isConfirming ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {t("profile.my_recipes.delete_confirm")}
          </span>
          <button
            onClick={onCancelDelete}
            disabled={isDeleting}
            style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", cursor: "pointer" }}
          >
            {t("profile.my_recipes.delete_cancel")}
          </button>
          <button
            onClick={onConfirmDelete}
            disabled={isDeleting}
            style={{ fontSize: 12, fontWeight: 700, color: "#e07070", cursor: isDeleting ? "wait" : "pointer" }}
          >
            {t("profile.my_recipes.delete_button")}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            onClick={onEdit}
            aria-label={t("profile.my_recipes.edit_button")}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "var(--color-surface)", color: "var(--color-text)",
              border: "1px solid var(--color-border)", cursor: "pointer",
            }}
          >
            <PencilIcon size={14} />
          </button>
          <button
            onClick={onAskDelete}
            aria-label={t("profile.my_recipes.delete_button")}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "var(--color-surface)", color: "#e07070",
              border: "1px solid var(--color-border)", cursor: "pointer",
            }}
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}