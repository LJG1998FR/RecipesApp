import { RECIPE_CATEGORIES } from "../../types";
import type { Category, IngredientOption } from "../../types";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronLeft, ClockIcon, FlameIcon, PlusIcon, GripIcon, TrashIcon } from "../icons";
import { createRecipe, fetchIngredients, uploadRecipePhotos } from "../../api";

// ── Contraintes alignées sur le back (Symfony) ─────────────────────────────────
// Si le back change, on ne modifie QUE ces constantes.
const MAX_PHOTOS = 5;                         // PhotoController::MAX_PHOTOS
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;       // PhotoController::MAX_FILE_SIZE (5 Mo)
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_STEP_LENGTH = 255;                  // Step.description = VARCHAR(255)
const MIN_AMOUNT = 1;                         // RecipeController::MIN_AMOUNT

// ── Styles partagés ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
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

function FormSection({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
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

function StepBadge({ n }: { n: number }) {
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
const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ── IngredientInput ────────────────────────────────────────────────────────────
// Ce que la page stocke pour chaque ingrédient choisi.
// `label` et `unit` ne servent qu'à l'AFFICHAGE : le back ne reçoit que
// { ingredientId, amount } (voir handleSubmit).
type SelectedIngredient = { ingredientId: number; label: string; unit: string | null; amount: number };

interface IngredientInputProps {
  available: IngredientOption[];          // catalogue venant de l'API
  alreadyUsedIds: number[];               // pour ne pas proposer 2x le même
  loading: boolean;
  loadError: boolean;
  onAdd: (ing: SelectedIngredient) => void;
}

function IngredientInput({ available, alreadyUsedIds, loading, loadError, onAdd }: IngredientInputProps) {
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
          .filter((i) => !alreadyUsedIds.includes(i.id) && normalize(i.label).includes(normalize(query)))
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
            Aucun ingrédient correspondant.
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
        <p style={
          { fontSize: 12, color: "#e07070", padding: "0 16px 10px" }}>{localError}</p>
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

interface LocalPhoto {
  file: File;
  preview: string; // URL.createObjectURL, pour la preview avant upload
}

function PhotoGrid({
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

// ── Extraction des messages d'erreur ──────────────────────────────────────────
// Le back renvoie soit { error: "..." } soit { errors: { champ: "..." } } (422).
// handleResponse (api/index.ts) les regroupe dans `err.messages`.
// On reste défensif : si l'erreur n'a pas ce format (ex. réseau coupé), on retombe
// sur err.message.
function extractMessages(err: unknown): string[] {
  const messages = (err as { messages?: unknown })?.messages;
  if (Array.isArray(messages) && messages.length > 0) return messages.map(String);
  if (err instanceof Error && err.message) return [err.message];
  return ["La création de la recette a échoué. Réessayez."];
}

// ── AddRecipePage ──────────────────────────────────────────────────────────────

type SubmitStatus = "idle" | "submitting" | "submitted";

export default function AddRecipePage({ onCancel }: { onCancel: () => void }) {
  const [title,       setTitle]       = useState("");
  const [people,      setPeople]      = useState(2);
  const [category,    setCategory]    = useState<Exclude<Category, "Tout">>("Plats");
  // Les temps sont stockés en string (valeur brute de l'input) puis convertis en
  // entiers au moment de l'envoi : le back attend des minutes (int), pas "15 min".
  const [prepTime,    setPrepTime]    = useState("");
  const [cookTime,    setCookTime]    = useState("");
  const [photos,      setPhotos]      = useState<LocalPhoto[]>([]);
  const [ingredients, setIngredients] = useState<SelectedIngredient[]>([]);
  const [steps,       setSteps]       = useState<string[]>([""]);
  // Un SEUL champ texte pour les astuces (colonne TEXT côté back, sans limite).
  const [tips,        setTips]        = useState("");
  const [errors,      setErrors]      = useState<string[]>([]);
  const [status,      setStatus]      = useState<SubmitStatus>("idle");
  const [photoWarning, setPhotoWarning] = useState("");

  // Catalogue d'ingrédients (API)
  const [catalog,        setCatalog]        = useState<IngredientOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError,   setCatalogError]   = useState(false);

  useEffect(() => {
    // Flag d'annulation : si le composant est démonté avant la réponse,
    // on évite de faire un setState sur un composant qui n'existe plus.
    let cancelled = false;
    fetchIngredients()
      .then((res) => { if (!cancelled) setCatalog(res); })
      .catch(() => { if (!cancelled) setCatalogError(true); })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Fuites mémoire des previews ────────────────────────────────────────────
  // BUG corrigé : avant, `useEffect(() => () => photos.forEach(revoke), [])`
  // capturait la valeur initiale de `photos` ([]), donc rien n'était jamais révoqué
  // au démontage. On passe par une ref, toujours à jour.
  const photosRef = useRef<LocalPhoto[]>([]);
  photosRef.current = photos;
  useEffect(() => {
    return () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
  }, []);

  const removeIngredient = (i: number) => setIngredients((p) => p.filter((_, idx) => idx !== i));
  const updateStep = (i: number, v: string) => setSteps((p) => p.map((s, idx) => idx === i ? v : s));
  const addStep    = () => setSteps((p) => [...p, ""]);
  const removeStep = (i: number) => setSteps((p) => p.filter((_, idx) => idx !== i));

  const addPhotos = (files: FileList) => {
    const rejected: string[] = [];
    const accepted: File[] = [];

    for (const file of Array.from(files)) {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) rejected.push(`${file.name} : format non supporté`);
      else if (file.size > MAX_PHOTO_SIZE)          rejected.push(`${file.name} : plus de 5 Mo`);
      else                                          accepted.push(file);
    }

    const room = MAX_PHOTOS - photos.length;
    if (accepted.length > room) rejected.push(`Maximum ${MAX_PHOTOS} photos : certaines ont été ignorées`);

    const mapped = accepted.slice(0, room).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((p) => [...p, ...mapped]);
    setErrors(rejected);
  };

  const removePhoto = (index: number) => {
    setPhotos((p) => {
      URL.revokeObjectURL(p[index].preview);
      return p.filter((_, i) => i !== index);
    });
  };

  const validate = () => {
    const errs: string[] = [];
    const prep = Number(prepTime);
    const cook = Number(cookTime);

    if (!title.trim()) errs.push("Le titre est requis.");

    if (!prepTime.trim() || !Number.isInteger(prep) || prep < 1)
      errs.push("Le temps de préparation doit être un nombre entier de minutes (≥ 1).");

    if (cookTime.trim() && (!Number.isInteger(cook) || cook < 0))
      errs.push("Le temps de cuisson doit être un nombre entier de minutes (≥ 0).");

    if (ingredients.length === 0) errs.push("Ajoutez au moins un ingrédient.");

    const filledSteps = steps.map((s) => s.trim()).filter(Boolean);
    if (filledSteps.length === 0) errs.push("Ajoutez au moins une étape.");
    if (filledSteps.some((s) => s.length > MAX_STEP_LENGTH))
      errs.push(`Chaque étape est limitée à ${MAX_STEP_LENGTH} caractères.`);

    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setPhotoWarning("");
    setStatus("submitting");

    // ── Construction du payload attendu par RecipeController::add() ──────────
    const payload = {
      title: title.trim(),
      nbPeople: people,
      type: category,
      prepTime: Number(prepTime),
      // cookingTime est optionnel : on ne l'envoie que s'il est renseigné
      ...(cookTime.trim() ? { cookingTime: Number(cookTime) } : {}),
      // tips : string brute ; \r\n → \n pour que le back puisse découper sur "\n"
      ...(tips.trim() ? { tips: tips.trim().replace(/\r\n/g, "\n") } : {}),
      // steps : on retire les étapes vides, puis index = position réelle (1, 2, 3…).
      // ⚠️ filtrer AVANT de numéroter, sinon on aurait des trous (1, 3, 4).
      steps: steps
        .map((s) => s.trim())
        .filter(Boolean)
        .map((description, i) => ({ index: i + 1, description })),
      // ingredients : le back ne veut que l'id et la quantité (label/unit = affichage)
      ingredients: ingredients.map(({ ingredientId, amount }) => ({ ingredientId, amount })),
    };

    try {
      // 1. Créer la recette : sans ID, impossible d'uploader des photos.
      const created = await createRecipe(payload);

      // 2. Photos : 2e appel (multipart). Si ça échoue, la recette EXISTE déjà :
      //    on ne doit surtout pas afficher "échec de création" (l'utilisateur
      //    re-soumettrait et créerait un doublon).
      if (photos.length > 0) {
        try {
          await uploadRecipePhotos(created.id, photos.map((p) => p.file));
        } catch (photoErr) {
          setPhotoWarning(
            `La recette a bien été créée, mais l'envoi des photos a échoué (${extractMessages(photoErr)[0]}). ` +
            "Vous pourrez les ajouter depuis la modification de la recette."
          );
        }
      }

      setStatus("submitted");
    } catch (err) {
      setErrors(extractMessages(err));
      setStatus("idle");
    }
  };

  const submitting = status === "submitting";

  // ── Écran de confirmation ──────────────────────────────────────────────────
  if (status === "submitted") {
    return (
      <div style={{
        fontFamily: "var(--font-body)",
        minHeight: "100dvh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 32px", textAlign: "center",
        backgroundColor: "var(--color-background)",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "rgba(224,154,90,0.15)",
        }}>
          <span style={{ color: "var(--color-primary)", transform: "scale(1.8)", display: "block" }}>
            <CheckIcon />
          </span>
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>
          Recette ajoutée !
        </h2>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: photoWarning ? 12 : 28 }}>
          "{title}" a été publiée avec succès.
        </p>
        {photoWarning && (
          <p style={{ fontSize: 13, color: "#e0b070", marginBottom: 28 }}>{photoWarning}</p>
        )}
        <button
          onClick={onCancel}
          style={{
            padding: "14px 32px", borderRadius: 16,
            fontSize: 14, fontWeight: 700,
            backgroundColor: "var(--color-primary)", color: "#171210",
            cursor: "pointer",
          }}
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // ── Formulaire principal ───────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "var(--font-body)", backgroundColor: "var(--color-background)", minHeight: "100dvh", overflowY: "auto", paddingBottom: 40 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "52px 20px 20px" }}>
        <button
          onClick={onCancel}
          disabled={submitting}
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
          Nouvelle recette
        </h1>
      </div>

      <div style={{ padding: "0 20px" }}>

        {/* ── Titre ── */}
        <FormSection title="Titre">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            placeholder="ex. Tarte Tatin aux pommes"
            style={{ ...inputStyle, fontSize: 15, fontFamily: "var(--font-display)", fontWeight: 500, padding: "14px 16px", borderRadius: 14 }}
          />
        </FormSection>

        {/* ── Personnes + Catégorie (2 colonnes) ── */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          {/* Personnes */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-dim)", marginBottom: 10 }}>
              Personnes
            </p>
            <div style={{
              display: "flex", alignItems: "center",
              backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden",
            }}>
              <button
                onClick={() => setPeople((p) => Math.max(1, p - 1))}
                style={{ width: 44, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 300, color: "var(--color-primary)", flexShrink: 0, cursor: "pointer" }}
              >−</button>
              <span style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>{people}</span>
              <button
                onClick={() => setPeople((p) => p + 1)}
                style={{ width: 44, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 300, color: "var(--color-primary)", flexShrink: 0, cursor: "pointer" }}
              >+</button>
            </div>
          </div>

          {/* Catégorie */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-dim)", marginBottom: 10 }}>
              Catégorie
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {RECIPE_CATEGORIES.map((c) => {
                const isActive = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    style={{
                      padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.15s",
                      backgroundColor: isActive ? "var(--color-primary)" : "var(--color-card)",
                      color: isActive ? "#171210" : "var(--color-text-muted)",
                      border: isActive ? "1px solid transparent" : "1px solid var(--color-border)",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Préparation + Cuisson (2 colonnes, en minutes) ── */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Préparation", badge: undefined,    icon: <ClockIcon size={15} />, value: prepTime, set: setPrepTime, placeholder: "15", min: 1 },
            { label: "Cuisson",     badge: "optionnel",   icon: <FlameIcon />,           value: cookTime, set: setCookTime, placeholder: "30", min: 0 },
          ].map(({ label, badge, icon, value, set, placeholder, min }) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-dim)" }}>
                  {label}
                </p>
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
                <span style={{ color: "var(--color-text-dim)", flexShrink: 0 }}>{icon}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={min}
                  step={1}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontSize: 14, color: "var(--color-text)", caretColor: "var(--color-primary)", fontFamily: "inherit" }}
                />
                <span style={{ fontSize: 12, color: "var(--color-text-dim)", flexShrink: 0 }}>min</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Photos ── */}
        <FormSection title="Photos" badge="optionnel">
          <PhotoGrid photos={photos} onAdd={addPhotos} onRemove={removePhoto} />
        </FormSection>

        {/* ── Ingrédients ── */}
        <FormSection title="Ingrédients">
          {ingredients.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {ingredients.map((ing, i) => (
                // key = ingredientId : stable et unique (on interdit les doublons)
                <li key={ing.ingredientId} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 12,
                  backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)",
                }}>
                  <span style={{ color: "var(--color-text-dim)", flexShrink: 0 }}><GripIcon /></span>
                  <span style={{ flex: 1, fontSize: 14, color: "var(--color-text)" }}>{ing.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}>
                    {ing.amount} {ing.unit ?? ""}
                  </span>
                  <button onClick={() => removeIngredient(i)} style={{ color: "var(--color-text-dim)", cursor: "pointer", marginLeft: 4 }}>
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <IngredientInput
            available={catalog}
            alreadyUsedIds={ingredients.map((i) => i.ingredientId)}
            loading={catalogLoading}
            loadError={catalogError}
            onAdd={(ing) => setIngredients((p) => [...p, ing])}
          />
        </FormSection>

        {/* ── Étapes ── */}
        <FormSection title="Étapes">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  backgroundColor: "var(--color-primary)", color: "#171210",
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <textarea
                    value={step}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder={`Étape ${i + 1}…`}
                    rows={2}
                    maxLength={MAX_STEP_LENGTH}
                    style={{ ...inputStyle, resize: "none", lineHeight: 1.55, padding: "10px 14px" }}
                  />
                  {step.length > MAX_STEP_LENGTH * 0.8 && (
                    <p style={{ fontSize: 11, color: "var(--color-text-dim)", textAlign: "right", marginTop: 4 }}>
                      {step.length} / {MAX_STEP_LENGTH}
                    </p>
                  )}
                </div>
                {steps.length > 1 && (
                  <button onClick={() => removeStep(i)} style={{ color: "var(--color-text-dim)", marginTop: 12, flexShrink: 0, cursor: "pointer" }}>
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addStep}
            style={{
              marginTop: 12, width: "100%", padding: "11px 0",
              borderRadius: 12, fontSize: 14, fontWeight: 500,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              backgroundColor: "var(--color-card)",
              border: "1px dashed var(--color-border)",
              color: "var(--color-text-muted)", cursor: "pointer",
            }}
          >
            <PlusIcon size={15} /> Ajouter une étape
          </button>
        </FormSection>

        {/* ── Astuces : un seul champ texte, sans limite ── */}
        <FormSection title="Astuces du chef" badge="optionnel">
          <textarea
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            placeholder={"Partagez vos astuces…\n(une astuce par ligne)"}
            rows={4}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
          />
        </FormSection>

        {/* ── Erreurs de validation ── */}
        {errors.length > 0 && (
          <div style={{
            marginBottom: 20, padding: "12px 16px", borderRadius: 12,
            backgroundColor: "rgba(224,90,90,0.1)", border: "1px solid rgba(224,90,90,0.25)",
          }}>
            {errors.map((e, i) => (
              <p key={i} style={{ fontSize: 13, color: "#e07070" }}>• {e}</p>
            ))}
          </div>
        )}

        {/* ── Boutons d'action ──
            Le bouton "Brouillon" est retiré : le back n'a pas de champ `status`.
            Le remettre quand l'API le gèrera. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16 }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%", padding: "16px 0", borderRadius: 16,
              fontSize: 15, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              backgroundColor: "var(--color-primary)", color: "#171210",
              cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.6 : 1,
            }}
          >
            <CheckIcon /> {submitting ? "Envoi en cours…" : "Confirmer l'ajout"}
          </button>
          <button
            onClick={onCancel}
            disabled={submitting}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 16,
              fontSize: 14, fontWeight: 500,
              backgroundColor: "transparent", color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)", cursor: "pointer",
            }}
          >
            Annuler
          </button>
        </div>

      </div>
    </div>
  );
}