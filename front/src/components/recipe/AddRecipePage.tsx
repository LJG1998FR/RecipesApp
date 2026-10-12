import { RECIPE_CATEGORIES } from "../../types";
import type { Category, IngredientOption } from "../../types";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronLeft, ClockIcon, FlameIcon, PlusIcon, GripIcon, TrashIcon } from "../icons";
import { createRecipe, fetchIngredients, uploadRecipePhotos } from "../../api";
import {
  MAX_PHOTOS, MAX_PHOTO_SIZE, ALLOWED_PHOTO_TYPES, MAX_STEP_LENGTH,
  inputStyle, FormSection, StepBadge, IngredientInput, PhotoGrid, extractMessages,
  validateRecipeForm, buildStepsPayload, buildIngredientsPayload,
} from "./RecipeFormShared";
import type { SelectedIngredient, LocalPhoto } from "./RecipeFormShared";

// NOTE : la plupart des petits composants (FormSection, IngredientInput,
// PhotoGrid…) ont été déplacés dans RecipeFormShared.tsx, car UpdateRecipePage
// en a besoin exactement à l'identique. Ne les redéfinissez pas ici — toute
// correction doit se faire dans ce fichier partagé pour profiter aux deux pages.

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

  const handleSubmit = async () => {
    // Validation ET construction du payload sont désormais partagées avec
    // UpdateRecipePage.tsx (voir RecipeFormShared.tsx) : ce sont les mêmes
    // règles des deux côtés, pas de raison de les maintenir en double.
    const errs = validateRecipeForm({ title, prepTime, cookTime, ingredientsCount: ingredients.length, steps });
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
      steps: buildStepsPayload(steps),
      ingredients: buildIngredientsPayload(ingredients),
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