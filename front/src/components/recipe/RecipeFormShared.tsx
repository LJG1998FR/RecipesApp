import { useEffect, useRef, useState } from "react";
import { ClockIcon, FlameIcon, PlusIcon } from "../icons";
import type { IngredientOption } from "../../admin/types";
import { normalizeForSearch } from "../../types/utils";
import { useTranslation } from "../../context/LocaleContext";
import type { TFunction } from "../../context/LocaleContext";

// ─────────────────────────────────────────────────────────────────────────────
// Morceaux PARTAGÉS entre AddRecipePage.tsx et UpdateRecipePage.tsx.
//
// Pourquoi ce fichier existe : l'autocomplétion d'ingrédients, la grille de
// photos et les contraintes alignées sur le back sont identiques dans les
// deux écrans. Les dupliquer aurait voulu dire corriger chaque bug deux fois.
// Règle simple : si vous touchez à l'un de ces composants, les DEUX pages en
// bénéficient automatiquement — c'est tout l'intérêt.
// ─────────────────────────────────────────────────────────────────────────────

// ── Contraintes alignées sur le back (Symfony) ─────────────────────────────────
// Si le back change, on ne modifie QUE ces constantes.
export const MAX_PHOTOS = 5;                         // PhotoController::MAX_PHOTOS
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;       // PhotoController::MAX_FILE_SIZE (5 Mo)
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_STEP_LENGTH = 255;                  // Step.description = VARCHAR(255)
export const MIN_AMOUNT = 1;                         // RecipeController::MIN_AMOUNT

// ── Styles partagés ────────────────────────────────────────────────────────────

// Style "sr-only" standard : le contenu reste dans le DOM et donc lisible
// par un lecteur d'écran, mais est retiré du rendu visuel (taille 1px,
// clip, overflow caché) SANS utiliser display:none ou visibility:hidden,
// qui eux masquent aussi le contenu aux technologies d'assistance.
export const visuallyHiddenStyle: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
  caretColor: "var(--color-primary)",
  outline: "none",
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  fontSize: 14,
  fontFamily: "inherit",
};

// ── FormSection ────────────────────────────────────────────────────────────────
// Ne traduit rien elle-même : title/badge arrivent déjà traduits depuis les
// pages appelantes (via t()). FormSection reste un composant "bête", agnostique
// de la langue — c'est aux pages de décider QUOI afficher.

export function FormSection({ title, titleId, htmlFor, badge, children }: { title: string; titleId?: string; htmlFor?: string; badge?: string; children: React.ReactNode }) {
  const TitleTag = htmlFor ? "label" : "p";
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {/* titleId (optionnel) : permet à l'appelant de relier un champ unique
            de la section à cet intitulé via aria-labelledby, quand FormSection
            enveloppe un seul input/textarea plutôt qu'une liste/un groupe. */}
        <TitleTag id={titleId} htmlFor={htmlFor} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-dim)" }}>
          {title}
        </TitleTag>
        {badge && (
          <span style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 99,
            backgroundColor: "var(--color-tag)", color: "var(--color-text-dim)",
            border: "1px solid var(--color-border)",
          }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Badge numéroté (étapes ingrédient) ────────────────────────────────────────

export function StepBadge({ n }: { n: number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 20, height: 20, borderRadius: "50%",
      fontSize: 11, fontWeight: 700, marginRight: 6,
      backgroundColor: "rgba(224,154,90,0.2)", color: "var(--color-primary)",
    }}>
      {n}
    </span>
  );
}

// ── TimeFields ─────────────────────────────────────────────────────────────────
// Partagé entre AddRecipePage et UpdateRecipePage : les deux champs "Préparation"
// et "Cuisson" (en minutes), affichés côte à côte.
//
// ⚠️ Piège CSS corrigé ici : chaque colonne est un enfant flex (`flex: 1`), mais
// un enfant flex a par défaut `min-width: auto`, c'est-à-dire qu'il refuse de
// rétrécir en dessous de la largeur de son propre contenu. Comme la colonne
// "Cuisson" contient un badge "optionnel" en plus de son label, son contenu
// minimal est plus large que celui de "Préparation" — elle refusait donc de
// rétrécir et débordait du conteneur. `minWidth: 0` lève cette contrainte.
// En le mettant ICI, dans le composant partagé, ce bug ne peut plus jamais
// revenir se glisser silencieusement dans une seule des deux pages.

export interface TimeFieldsProps {
  prepTime: string;
  onPrepTimeChange: (value: string) => void;
  cookTime: string;
  onCookTimeChange: (value: string) => void;
}

export function TimeFields({ prepTime, onPrepTimeChange, cookTime, onCookTimeChange }: TimeFieldsProps) {
  const { t } = useTranslation();

  // id stable (recipe_prep_time / recipe_cook_time), PAS dérivé du texte
  // traduit — un id construit à partir d'un libellé qui peut contenir des
  // espaces en anglais casserait l'id ET l'association label/input.
  const fields = [
    {
      id: "recipe_prep_time",
      label: t("recipe.form.prep_label"),
      badge: undefined as string | undefined,
      icon: <ClockIcon size={15} />,
      value: prepTime,
      onChange: onPrepTimeChange,
      placeholder: "15",
      min: 1,
    },
    {
      id: "recipe_cook_time",
      label: t("recipe.form.cook_label"),
      badge: t("common.badges.optional"),
      icon: <FlameIcon />,
      value: cookTime,
      onChange: onCookTimeChange,
      placeholder: "30",
      min: 0,
    },
  ];

  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
      {fields.map(({ id, label, badge, icon, value, onChange, placeholder, min }) => (
        <div key={id} style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <label htmlFor={id} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-dim)" }}>
              {label}
            </label>
            {badge && (
              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, backgroundColor: "var(--color-tag)", color: "var(--color-text-dim)", border: "1px solid var(--color-border)" }}>
                {badge}
              </span>
            )}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "0 14px", height: 48, borderRadius: 14,
            backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)",
          }}>
            <span aria-hidden="true" style={{ color: "var(--color-text-dim)", flexShrink: 0 }}>{icon}</span>
            <input
              id={id}
              type="number"
              inputMode="numeric"
              min={min}
              step={1}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              aria-describedby={`${id}-unit`}
              style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "var(--color-text)", caretColor: "var(--color-primary)", fontFamily: "inherit" }}
            />
            <span id={`${id}-unit`} style={{ fontSize: 12, color: "var(--color-text-dim)", flexShrink: 0 }}>min</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Utilitaire : recherche insensible à la casse ET aux accents ───────────────
// "epinards" doit retrouver "Épinards". NFD sépare la lettre de son accent,
// la regex supprime ensuite les accents (plage Unicode U+0300–U+036F).
/*export const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");*/

// ── IngredientInput ────────────────────────────────────────────────────────────
// Ce que la page stocke pour chaque ingrédient choisi.
// `label` et `unit` ne servent qu'à l'AFFICHAGE : le back ne reçoit que
// { ingredientId, amount } (voir handleSubmit des pages Add/Update).
export type SelectedIngredient = { ingredientId: number; label: string; unit: string | null; amount: number };

interface IngredientInputProps {
  available: IngredientOption[];          // catalogue venant de l'API
  alreadyUsedIds: number[];               // pour ne pas proposer 2x le même
  loading: boolean;
  loadError: boolean;
  onAdd: (ing: SelectedIngredient) => void;
}

// Composant React à part entière (pas une fonction utilitaire) : il peut donc
// appeler useTranslation() directement, pas besoin de lui passer `t` en prop.
export function IngredientInput({ available, alreadyUsedIds, loading, loadError, onAdd }: IngredientInputProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  // `selected` = l'ingrédient réellement choisi dans la liste (avec son id).
  // Taper du texte libre ne suffit PAS : le back exige un ingredientId existant.
  const [selected, setSelected] = useState<IngredientOption | null>(null);
  const [qty, setQty] = useState("");
  const [showSugg, setShowSugg] = useState(false);
  const [localError, setLocalError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  // -1 = aucune suggestion survolée/sélectionnée au clavier.
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Suggestions DÉRIVÉES de l'état (query + catalogue) : pas besoin de useState/useEffect
  // pour ça. Règle d'or React : si une valeur peut être calculée, ne la stocke pas.
  const suggestions =
    query.trim().length >= 1 && !selected
      ? available
          .filter((i) => !alreadyUsedIds.includes(i.id) && normalizeForSearch(i.label).includes(normalizeForSearch(query.toLowerCase())))
          .slice(0, 6)
      : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowSugg(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const choose = (ing: IngredientOption) => {
    setSelected(ing);
    setQuery(ing.label);
    setShowSugg(false);
    setHighlightedIndex(-1);
    setLocalError("");
  };

  // ⚠️ Correctif bloquant : avant, la liste de suggestions ne se choisissait
  // QU'à la souris (onMouseDown). Une personne au clavier tapait un nom,
  // voyait les suggestions s'afficher... et n'avait aucun moyen de les
  // valider. On ajoute la navigation flèches haut/bas + Entrée + Échap,
  // conforme au pattern "combobox" des ARIA Authoring Practices.
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSugg || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        choose(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSugg(false);
      setHighlightedIndex(-1);
    }
  };

  const handleAdd = () => {
    if (!selected) return setLocalError(t("recipe.form.error_choose_ingredient"));
    const amount = parseFloat(qty.replace(",", "."));
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT)
      return setLocalError(t("recipe.form.error_quantity_min", { min: MIN_AMOUNT }));

    onAdd({ ingredientId: selected.id, label: selected.label, unit: selected.unit, amount });
    setQuery(""); setSelected(null); setQty(""); setLocalError("");
  };

  const canAdd = !!selected && qty.trim() !== "";

  return (
    <div ref={containerRef} style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 16, overflow: "visible" }}>

      {/* ── Étape 1 : Nom (autocomplétion depuis l'API) ── */}
      <div style={{ padding: "16px 16px 14px", position: "relative" }}>
        {/* <label htmlFor> plutôt qu'un <p> à côté : sans ce lien, un lecteur
            d'écran annonce juste "Édition, texte" en arrivant sur le champ,
            sans jamais dire "Ingrédient". */}
        <label htmlFor="ingredient-name-input" style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 8 }}>
          <StepBadge n={1} />{t("recipe.form.ingredient_singular_label")}
        </label>
        <input
          id="ingredient-name-input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSugg && suggestions.length > 0}
          aria-controls="ingredient-suggestions-list"
          aria-activedescendant={highlightedIndex >= 0 ? `ingredient-option-${highlightedIndex}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); setShowSugg(true); setHighlightedIndex(-1); }}
          onFocus={() => setShowSugg(true)}
          onKeyDown={handleNameKeyDown}
          placeholder={loading ? t("recipe.form.ingredient_loading") : t("recipe.form.ingredient_search_placeholder")}
          disabled={loading || loadError}
          style={inputStyle}
        />
        {loadError && (
          <p role="alert" style={{ fontSize: 12, color: "#e07070", marginTop: 8 }}>
            {t("recipe.form.ingredient_load_error")}
          </p>
        )}
        {showSugg && suggestions.length > 0 && (
          <div
            id="ingredient-suggestions-list"
            role="listbox"
            aria-label={t("recipe.form.ingredient_singular_label")}
            style={{
              position: "absolute", left: 16, right: 16, top: "100%",
              backgroundColor: "#2a2420", border: "1px solid var(--color-border)",
              borderRadius: 12, overflow: "hidden", zIndex: 50,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)", marginTop: 4,
            }}
          >
            {suggestions.map((s, idx) => (
              <button type="button"
                key={s.id}
                id={`ingredient-option-${idx}`}
                role="option"
                aria-selected={highlightedIndex === idx}
                // onMouseDown (et non onClick) : se déclenche AVANT le blur de l'input
                onMouseDown={() => choose(s)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  width: "100%", textAlign: "left", padding: "11px 16px",
                  fontSize: 14, color: "var(--color-text)",
                  borderBottom: "1px solid var(--color-border)",
                  backgroundColor: highlightedIndex === idx ? "rgba(224,154,90,0.15)" : "transparent",
                  cursor: "pointer",
                  display: "flex", justifyContent: "space-between",
                }}
              >
                <span>{s.label}</span>
                {s.unit && <span style={{ color: "var(--color-text-dim)" }}>{s.unit}</span>}
              </button>
            ))}
          </div>
        )}
        {showSugg && query.trim() !== "" && !selected && suggestions.length === 0 && !loading && !loadError && (
          <p role="status" style={{ fontSize: 12, color: "var(--color-text-dim)", marginTop: 8 }}>
            {t("recipe.form.ingredient_no_match")}
          </p>
        )}
      </div>

      <div style={{ height: 1, margin: "0 16px", backgroundColor: "var(--color-border)" }} />

      {/* ── Étape 2 : Quantité (+ unité en LECTURE SEULE) ── */}
      <div style={{ padding: "14px 16px" }}>
        <label htmlFor="ingredient-qty-input" style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 8 }}>
          <StepBadge n={2} />{t("recipe.form.quantity_label")}
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            id="ingredient-qty-input"
            type="number"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={t("recipe.form.quantity_placeholder")}
            min={MIN_AMOUNT}
            step="any"
            aria-describedby="ingredient-qty-unit"
            style={{ ...inputStyle, flex: 1, width: undefined }}
          />
          {/* L'unité appartient à l'ingrédient (table ingredients), pas à la recette :
              on l'affiche, on ne la choisit plus. */}
          {/* aria-describedby sur le champ quantité ci-dessus : l'unité
              n'est pas éditable mais fait partie du sens de la valeur saisie
              ("250" tout court n'a aucun sens sans son unité). */}
          <span
            id="ingredient-qty-unit"
            style={{
              minWidth: 64, textAlign: "center", fontSize: 13, padding: "12px 10px", borderRadius: 12,
              color: "var(--color-text-muted)", border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
            }}
          >
            {selected ? (selected.unit ?? "—") : t("recipe.form.unit_placeholder")}
          </span>
        </div>
      </div>

      {localError && (
        <p role="alert" style={{ fontSize: 12, color: "#e07070", padding: "0 16px 10px" }}>{localError}</p>
      )}

      {/* ── Bouton Ajouter ── */}
      <div style={{ padding: "0 16px 16px" }}>
        <button type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          style={{
            width: "100%", padding: "11px 0",
            borderRadius: 12, fontSize: 14, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            cursor: canAdd ? "pointer" : "not-allowed",
            backgroundColor: canAdd ? "var(--color-primary)" : "var(--color-surface)",
            color: canAdd ? "#171210" : "var(--color-text-dim)",
            opacity: canAdd ? 1 : 0.5,
            border: "1px solid transparent",
            transition: "all 0.15s",
          }}
        >
          <PlusIcon size={15} /> {t("recipe.form.add_ingredient_button")}
        </button>
      </div>
    </div>
  );
}

// ── PhotoGrid ──────────────────────────────────────────────────────────────────
// Affiche uniquement les photos LOCALES, pas encore envoyées au serveur
// (fichiers choisis dans ce passage sur le formulaire). UpdateRecipePage gère
// séparément les photos déjà existantes en base (voir ExistingPhotoGrid dans
// UpdateRecipePage.tsx), car elles ne se suppriment/affichent pas de la même
// façon (un File local n'a pas d'id serveur ; une photo déjà en base n'a pas
// de File JS à montrer).

export interface LocalPhoto {
  file: File;
  preview: string; // URL.createObjectURL, pour la preview avant upload
}

export function PhotoGrid({
  photos,
  onAdd,
  onRemove,
}: {
  photos: LocalPhoto[];
  onAdd: (files: FileList) => void;
  onRemove: (index: number) => void;
}) {
  const { t } = useTranslation();
  const remaining = MAX_PHOTOS - photos.length;
  const [inputFocused, setInputFocused] = useState(false);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {photos.map((p, i) => (
          <div
            key={p.preview}
            style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden" }}
          >
            <img
              src={p.preview}
              alt={t("recipe.form.photo_alt", { n: i + 1 })}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <button type="button"
              onClick={() => onRemove(i)}
              aria-label={t("recipe.form.remove_photo_button")}
              style={{
                position: "absolute", top: 4, right: 4,
                width: 22, height: 22, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: "rgba(23,18,16,0.75)", color: "#fff", cursor: "pointer",
              }}
            >
              <svg aria-hidden="true" focusable="false" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {remaining > 0 && (
          <label
            style={{
              aspectRatio: "1", borderRadius: 12, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px dashed var(--color-border)", backgroundColor: "var(--color-card)",
              color: "var(--color-text-dim)",
              // Le focus est sur l'<input>, invisible lui-même — on simule
              // l'anneau de focus sur le label qui l'enveloppe.
              outline: inputFocused ? "2px solid var(--color-primary)" : "none",
              outlineOffset: 2,
            }}
          >
            <PlusIcon size={20} />
            {/* Le <label> n'a pas de texte visible (juste une icône) : son nom
                accessible serait donc vide pour l'input qu'il enveloppe.
                aria-label le répare sans changer le rendu visuel. */}
            <input
              type="file"
              aria-label={t("recipe.form.add_photo_button")}
              accept={ALLOWED_PHOTO_TYPES.join(",")}
              multiple
              style={visuallyHiddenStyle}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) onAdd(e.target.files);
                e.target.value = ""; // permet de resélectionner le même fichier plus tard
              }}
            />
          </label>
        )}
      </div>

      {/* Pluriel fait-maison : photos.length > 1 -> pluriel, sinon singulier
          (0 et 1 sont tous les deux singuliers en français). */}
      <p style={{ fontSize: 12, color: "var(--color-text-dim)", marginTop: 8 }}>
        {photos.length > 1
          ? t("recipe.form.photo_count_plural", { count: photos.length, max: MAX_PHOTOS })
          : t("recipe.form.photo_count_singular", { count: photos.length, max: MAX_PHOTOS })}
      </p>
    </div>
  );
}

// ── Validation partagée du formulaire ──────────────────────────────────────────
// Ces règles DOIVENT rester cohérentes avec RecipeController::validateRecipeData/
// validateSteps/validateIngredients côté back. On valide ici en plus côté front
// uniquement pour donner un retour instantané (pas besoin d'un aller-retour
// réseau pour dire "le titre est vide") — le back reste la seule source de
// vérité en cas de divergence (toujours tout revalider côté serveur, ce que
// fait déjà RecipeController).
export interface RecipeFormValues {
  title: string;
  prepTime: string;   // valeur brute de l'input (pas encore convertie en nombre)
  cookTime: string;
  ingredientsCount: number;
  steps: string[];
}

// ⚠️ validateRecipeForm n'est PAS un composant React : elle ne peut donc pas
// appeler useTranslation() elle-même (les hooks ne fonctionnent que dans des
// composants / d'autres hooks). On lui injecte `t` en paramètre à la place —
// la fonction reste pure et testable, tout en produisant du texte traduit.
export function validateRecipeForm(values: RecipeFormValues, t: TFunction): string[] {
  const errors: string[] = [];
  const prep = Number(values.prepTime);
  const cook = Number(values.cookTime);

  if (!values.title.trim()) errors.push(t("recipe.form.error_title_required"));

  if (!values.prepTime.trim() || !Number.isInteger(prep) || prep < 1)
    errors.push(t("recipe.form.error_prep_time_invalid"));

  if (values.cookTime.trim() && (!Number.isInteger(cook) || cook < 0))
    errors.push(t("recipe.form.error_cook_time_invalid"));

  if (values.ingredientsCount === 0) errors.push(t("recipe.form.error_no_ingredients"));

  const filledSteps = values.steps.map((s) => s.trim()).filter(Boolean);
  if (filledSteps.length === 0) errors.push(t("recipe.form.error_no_steps"));
  if (filledSteps.some((s) => s.length > MAX_STEP_LENGTH))
    errors.push(t("recipe.form.error_step_too_long", { max: MAX_STEP_LENGTH }));

  return errors;
}

/** steps[] (textes bruts, avec trous éventuels) → payload attendu par le back. */
export function buildStepsPayload(steps: string[]): { index: number; description: string }[] {
  // On filtre AVANT de numéroter : sinon une étape vide au milieu laisserait
  // un trou dans les index (1, 3, 4 au lieu de 1, 2, 3).
  return steps
    .map((s) => s.trim())
    .filter(Boolean)
    .map((description, i) => ({ index: i + 1, description }));
}

/** SelectedIngredient[] (avec label/unit d'affichage) → payload attendu par le back. */
export function buildIngredientsPayload(ingredients: SelectedIngredient[]): { ingredientId: number; amount: number }[] {
  return ingredients.map(({ ingredientId, amount }) => ({ ingredientId, amount }));
}

// ── Extraction des messages d'erreur ──────────────────────────────────────────
// Le back renvoie soit { error: "..." } soit { errors: { champ: "..." } } (422).
// handleResponse (api/index.ts) les regroupe dans `err.messages` (ApiError).
// On reste défensif : si l'erreur n'a pas ce format (ex. réseau coupé), on
// retombe sur `fallback`.
//
// ⚠️ `fallback` est désormais OBLIGATOIRE (plus de valeur par défaut en
// français en dur). Comme extractMessages() n'est pas un composant, elle ne
// peut pas traduire elle-même : c'est à l'appelant (qui, lui, a `t` via
// useTranslation()) de fournir un texte déjà traduit, ex :
//   extractMessages(err, t("recipe.form.error_generic_fallback"))
export function extractMessages(err: unknown, fallback: string): string[] {
  const messages = (err as { messages?: unknown })?.messages;
  if (Array.isArray(messages) && messages.length > 0) return messages.map(String);
  if (err instanceof Error && err.message) return [err.message];
  return [fallback];
}