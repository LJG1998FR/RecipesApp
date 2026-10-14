import { useEffect, useRef, useState } from "react";
import { PlusIcon } from "../icons";
import type { IngredientOption } from "../../admin/types";
import { normalizeForSearch } from "../../types/utils";

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

export function FormSection({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-dim)" }}>
          {title}
        </p>
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

export function IngredientInput({ available, alreadyUsedIds, loading, loadError, onAdd }: IngredientInputProps) {
  const [query, setQuery] = useState("");
  // `selected` = l'ingrédient réellement choisi dans la liste (avec son id).
  // Taper du texte libre ne suffit PAS : le back exige un ingredientId existant.
  const [selected, setSelected] = useState<IngredientOption | null>(null);
  const [qty, setQty] = useState("");
  const [showSugg, setShowSugg] = useState(false);
  const [localError, setLocalError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

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
    setLocalError("");
  };

  const handleAdd = () => {
    if (!selected) return setLocalError("Choisissez un ingrédient dans la liste.");
    const amount = parseFloat(qty.replace(",", "."));
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT)
      return setLocalError(`La quantité doit être un nombre ≥ ${MIN_AMOUNT}.`);

    onAdd({ ingredientId: selected.id, label: selected.label, unit: selected.unit, amount });
    setQuery(""); setSelected(null); setQty(""); setLocalError("");
  };

  const canAdd = !!selected && qty.trim() !== "";

  return (
    <div ref={containerRef} style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 16, overflow: "visible" }}>

      {/* ── Étape 1 : Nom (autocomplétion depuis l'API) ── */}
      <div style={{ padding: "16px 16px 14px", position: "relative" }}>
        <p style={{ fontSize: 12, color: "var(--color-text-dim)", marginBottom: 8 }}>
          <StepBadge n={1} />Ingrédient
        </p>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); setShowSugg(true); }}
          onFocus={() => setShowSugg(true)}
          placeholder={loading ? "Chargement des ingrédients…" : "Tapez pour rechercher…"}
          disabled={loading || loadError}
          style={inputStyle}
        />
        {loadError && (
          <p style={{ fontSize: 12, color: "#e07070", marginTop: 8 }}>
            Impossible de charger la liste des ingrédients. Rechargez la page.
          </p>
        )}
        {showSugg && suggestions.length > 0 && (
          <div style={{
            position: "absolute", left: 16, right: 16, top: "100%",
            backgroundColor: "#2a2420", border: "1px solid var(--color-border)",
            borderRadius: 12, overflow: "hidden", zIndex: 50,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)", marginTop: 4,
          }}>
            {suggestions.map((s) => (
              <button
                key={s.id}
                // onMouseDown (et non onClick) : se déclenche AVANT le blur de l'input
                onMouseDown={() => choose(s)}
                style={{
                  width: "100%", textAlign: "left", padding: "11px 16px",
                  fontSize: 14, color: "var(--color-text)",
                  borderBottom: "1px solid var(--color-border)",
                  backgroundColor: "transparent", cursor: "pointer",
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
          <p style={{ fontSize: 12, color: "var(--color-text-dim)", marginTop: 8 }}>
            Aucun ingrédient correspondant. Seul un administrateur peut en créer de nouveaux.
          </p>
        )}
      </div>

      <div style={{ height: 1, margin: "0 16px", backgroundColor: "var(--color-border)" }} />

      {/* ── Étape 2 : Quantité (+ unité en LECTURE SEULE) ── */}
      <div style={{ padding: "14px 16px" }}>
        <p style={{ fontSize: 12, color: "var(--color-text-dim)", marginBottom: 8 }}>
          <StepBadge n={2} />Quantité
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="number"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="ex. 250 ou 1.5"
            min={MIN_AMOUNT}
            step="any"
            style={{ ...inputStyle, flex: 1, width: undefined }}
          />
          {/* L'unité appartient à l'ingrédient (table ingredients), pas à la recette :
              on l'affiche, on ne la choisit plus. */}
          <span style={{
            minWidth: 64, textAlign: "center", fontSize: 13, padding: "12px 10px", borderRadius: 12,
            color: "var(--color-text-muted)", border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-surface)",
          }}>
            {selected ? (selected.unit ?? "—") : "unité"}
          </span>
        </div>
      </div>

      {localError && (
        <p style={{ fontSize: 12, color: "#e07070", padding: "0 16px 10px" }}>{localError}</p>
      )}

      {/* ── Bouton Ajouter ── */}
      <div style={{ padding: "0 16px 16px" }}>
        <button
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
          <PlusIcon size={15} /> Ajouter l'ingrédient
        </button>
      </div>
    </div>
  );
}

// ── PhotoGrid ──────────────────────────────────────────────────────────────────
// Affiche uniquement les photos LOCALES, pas encore envoyées au serveur
// (fichiers choisis dans ce passage sur le formulaire). UpdateRecipePage gère
// séparément les photos déjà existantes en base (voir ExistingPhotoGrid
// ci-dessous), car elles ne se suppriment/affichent pas de la même façon
// (un File local n'a pas d'id serveur ; une photo déjà en base n'a pas de
// File JS à montrer).

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
  const remaining = MAX_PHOTOS - photos.length;

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
              alt={`Photo ${i + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <button
              onClick={() => onRemove(i)}
              style={{
                position: "absolute", top: 4, right: 4,
                width: 22, height: 22, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: "rgba(23,18,16,0.75)", color: "#fff", cursor: "pointer",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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
            }}
          >
            <PlusIcon size={20} />
            <input
              type="file"
              accept={ALLOWED_PHOTO_TYPES.join(",")}
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) onAdd(e.target.files);
                e.target.value = ""; // permet de resélectionner le même fichier plus tard
              }}
            />
          </label>
        )}
      </div>

      <p style={{ fontSize: 12, color: "var(--color-text-dim)", marginTop: 8 }}>
        {photos.length} / {MAX_PHOTOS} photo{photos.length > 1 ? "s" : ""} · 5 Mo max chacune
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

export function validateRecipeForm(values: RecipeFormValues): string[] {
  const errors: string[] = [];
  const prep = Number(values.prepTime);
  const cook = Number(values.cookTime);

  if (!values.title.trim()) errors.push("Le titre est requis.");

  if (!values.prepTime.trim() || !Number.isInteger(prep) || prep < 1)
    errors.push("Le temps de préparation doit être un nombre entier de minutes (≥ 1).");

  if (values.cookTime.trim() && (!Number.isInteger(cook) || cook < 0))
    errors.push("Le temps de cuisson doit être un nombre entier de minutes (≥ 0).");

  if (values.ingredientsCount === 0) errors.push("Ajoutez au moins un ingrédient.");

  const filledSteps = values.steps.map((s) => s.trim()).filter(Boolean);
  if (filledSteps.length === 0) errors.push("Ajoutez au moins une étape.");
  if (filledSteps.some((s) => s.length > MAX_STEP_LENGTH))
    errors.push(`Chaque étape est limitée à ${MAX_STEP_LENGTH} caractères.`);

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
// retombe sur err.message.
export function extractMessages(err: unknown, fallback = "Une erreur est survenue. Réessayez."): string[] {
  const messages = (err as { messages?: unknown })?.messages;
  if (Array.isArray(messages) && messages.length > 0) return messages.map(String);
  if (err instanceof Error && err.message) return [err.message];
  return [fallback];
}
