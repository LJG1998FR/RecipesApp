import { useEffect, useRef, useState } from "react";
import { RECIPE_CATEGORIES } from "../../types";
import type { Category, IngredientOption, RecipePhoto } from "../../types";
import { CheckIcon, ChevronLeft, ClockIcon, FlameIcon, PlusIcon, GripIcon, TrashIcon } from "../icons";
import {
  updateRecipe, deleteRecipe, fetchIngredients,
  uploadRecipePhotos, deleteRecipePhoto, ApiError,
  toPhotoUrl,
  fetchRecipe,
} from "../../api";
import type { UpdateRecipePayload } from "../../api";
import {
  MAX_PHOTOS, MAX_PHOTO_SIZE, ALLOWED_PHOTO_TYPES, MAX_STEP_LENGTH,
  inputStyle, FormSection, StepBadge, IngredientInput, PhotoGrid, extractMessages,
  validateRecipeForm, buildStepsPayload, buildIngredientsPayload,
} from "./RecipeFormShared";
import type { SelectedIngredient, LocalPhoto } from "./RecipeFormShared";
import Loading from "../layout/Loading";

// NOTE : la grande majorité de l'UI (champs, autocomplétion d'ingrédients,
// grille de nouvelles photos…) vient de RecipeFormShared.tsx — exactement ce
// qu'utilise AddRecipePage.tsx. Ne redéfinissez rien de ça ici : si un
// composant partagé a un bug, corrigez-le UNE fois dans RecipeFormShared.tsx.
//
// Ce fichier n'ajoute QUE ce qui est spécifique à l'édition :
//   - charger la recette existante avant d'afficher le formulaire,
//   - afficher/retirer les photos DÉJÀ en base (différent des nouvelles photos
//     locales, qui n'ont pas encore d'id serveur),
//   - "Enregistrer" (PUT, remplacement total) et "Supprimer la recette" (DELETE).

interface Props {
  recipeId: number;
  /** Retour à l'écran précédent sans rien changer. */
  onCancel: () => void;
  /** Appelé après une sauvegarde réussie (ex. pour rafraîchir une liste côté parent). */
  onSaved?: (recipe: RecipePhoto) => void;
  /** Appelé après une suppression réussie — à vous de décider où naviguer ensuite. */
  onDeleted?: () => void;
}

// ── Grille des photos DÉJÀ EN BASE ──────────────────────────────────────────────
// Distincte de PhotoGrid (RecipeFormShared) : celle-ci affiche des photos qui
// ont un `id` serveur et une `url` déjà hébergée, et leur suppression déclenche
// un VRAI appel API (DELETE), pas juste un retrait de l'état local.
function ExistingPhotoGrid({
  photos,
  deletingId,
  onRemove,
}: {
  photos: RecipePhoto[];
  deletingId: number | null;
  onRemove: (photo: RecipePhoto) => void;
}) {
  if (photos.length === 0) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
      {photos.map((photo) => {
        const isDeleting = deletingId === photo.id;
        return (
          <div
            key={photo.id}
            style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", opacity: isDeleting ? 0.5 : 1 }}
          >
            <img
              src={toPhotoUrl(photo.url)}
              alt="Photo de la recette"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <button
              onClick={() => onRemove(photo)}
              disabled={isDeleting}
              style={{
                position: "absolute", top: 4, right: 4,
                width: 22, height: 22, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: "rgba(23,18,16,0.75)", color: "#fff",
                cursor: isDeleting ? "wait" : "pointer",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

type LoadStatus = "loading" | "ready" | "not-found" | "forbidden" | "error";

export default function UpdateRecipePage({ recipeId, onCancel, onSaved, onDeleted }: Props) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");

  // ── Champs du formulaire, identiques à AddRecipePage ──────────────────────
  const [title,       setTitle]       = useState("");
  const [people,      setPeople]      = useState(2);
  const [category,    setCategory]    = useState<Exclude<Category, "Tout">>("Plats");
  const [prepTime,    setPrepTime]    = useState("");
  const [cookTime,    setCookTime]    = useState("");
  const [ingredients, setIngredients] = useState<SelectedIngredient[]>([]);
  const [steps,       setSteps]       = useState<string[]>([""]);
  const [tips,        setTips]        = useState("");

  // ── Photos : deux listes bien distinctes (voir commentaire plus haut) ─────
  const [existingPhotos, setExistingPhotos] = useState<RecipePhoto[]>([]);
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);
  const [newPhotos, setNewPhotos] = useState<LocalPhoto[]>([]);

  // ── Catalogue d'ingrédients (API), comme sur AddRecipePage ─────────────────
  const [catalog,        setCatalog]        = useState<IngredientOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError,   setCatalogError]   = useState(false);

  // ── États de soumission ─────────────────────────────────────────────────────
  const [errors,       setErrors]       = useState<string[]>([]);
  const [submitting,   setSubmitting]   = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRecipe, setDeletingRecipe] = useState(false);
  const [deleteError,  setDeleteError]  = useState("");

  // ── Chargement de la recette à éditer ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    fetchRecipe(recipeId)
      .then((recipe) => {
        if (cancelled) return;

        setTitle(recipe.title);
        setPeople(recipe.nbPeople);
        setCategory(recipe.type);
        setPrepTime(String(recipe.prepTime));
        setCookTime(recipe.cookingTime !== null ? String(recipe.cookingTime) : "");
        setTips(recipe.tips);
        setSteps(recipe.steps.length > 0 ? recipe.steps.map((s) => s.description) : [""]);
        setIngredients(recipe.ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          label: i.label,
          unit: i.unit,
          amount: i.amount,
        })));
        setExistingPhotos(recipe.photos);
        setLoadStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setLoadStatus("not-found");
        else if (err instanceof ApiError && err.status === 403) setLoadStatus("forbidden");
        else setLoadStatus("error");
      });

    return () => { cancelled = true; };
  }, [recipeId]);

  useEffect(() => {
    let cancelled = false;
    fetchIngredients()
      .then((res) => { if (!cancelled) setCatalog(res); })
      .catch(() => { if (!cancelled) setCatalogError(true); })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Nettoyage des previews locales au démontage (même piège que sur AddRecipePage :
  // on passe par une ref pour toujours révoquer les DERNIÈRES previews, pas
  // celles capturées au premier rendu).
  const newPhotosRef = useRef<LocalPhoto[]>([]);
  newPhotosRef.current = newPhotos;
  useEffect(() => {
    return () => newPhotosRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
  }, []);

  const removeIngredient = (i: number) => setIngredients((p) => p.filter((_, idx) => idx !== i));
  const updateStep = (i: number, v: string) => setSteps((p) => p.map((s, idx) => idx === i ? v : s));
  const addStep    = () => setSteps((p) => [...p, ""]);
  const removeStep = (i: number) => setSteps((p) => p.filter((_, idx) => idx !== i));

  const addNewPhotos = (files: FileList) => {
    const rejected: string[] = [];
    const accepted: File[] = [];
    const totalPhotos = existingPhotos.length + newPhotos.length;

    for (const file of Array.from(files)) {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) rejected.push(`${file.name} : format non supporté`);
      else if (file.size > MAX_PHOTO_SIZE)          rejected.push(`${file.name} : plus de 5 Mo`);
      else                                          accepted.push(file);
    }

    const room = MAX_PHOTOS - totalPhotos;
    if (accepted.length > room) rejected.push(`Maximum ${MAX_PHOTOS} photos au total : certaines ont été ignorées`);

    const mapped = accepted.slice(0, Math.max(room, 0)).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setNewPhotos((p) => [...p, ...mapped]);
    setErrors(rejected);
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos((p) => {
      URL.revokeObjectURL(p[index].preview);
      return p.filter((_, i) => i !== index);
    });
  };

  // Suppression d'une photo DÉJÀ EN BASE : appel réseau immédiat (pas différé
  // au "Enregistrer"). C'est un choix délibéré : il existe déjà un endpoint
  // DELETE dédié côté back, autant l'utiliser directement plutôt que de
  // réinventer un état "à supprimer au prochain save" côté front.
  const removeExistingPhoto = async (photo: RecipePhoto) => {
    setDeletingPhotoId(photo.id);
    try {
      await deleteRecipePhoto(recipeId, photo.id);
      setExistingPhotos((p) => p.filter((x) => x.id !== photo.id));
    } catch (err) {
      setErrors(extractMessages(err, "La suppression de la photo a échoué."));
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const totalPhotoCount = existingPhotos.length + newPhotos.length;

  const handleSubmit = async () => {
    const errs = validateRecipeForm({ title, prepTime, cookTime, ingredientsCount: ingredients.length, steps });
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setSavedMessage("");
    setSubmitting(true);

    // ── Construction du payload attendu par RecipeController::update() ───────
    // ⚠️ Différence volontaire avec AddRecipePage : ici on envoie TOUJOURS
    // cookingTime et tips (même vides/null), jamais en les omettant. Cette
    // page affiche et gère l'état COMPLET de la recette : si l'utilisateur a
    // vidé le champ "astuces", on doit explicitement dire au back "il n'y en a
    // plus", pas rester silencieux (silence = "ne touche à rien" côté back,
    // ce qui laisserait les anciennes astuces en place par erreur).

    const payload: UpdateRecipePayload = {
      title: title.trim(),
      nbPeople: people,
      type: category,
      prepTime: Number(prepTime),
      cookingTime: cookTime.trim() ? Number(cookTime) : null,
      tips: tips != "" ? tips.toString().trim().replace(/\r\n/g, "\n") : "",
      steps: buildStepsPayload(steps),
      ingredients: buildIngredientsPayload(ingredients),
    };

    try {
      await updateRecipe(recipeId, payload);

      if (newPhotos.length > 0) {
        try {
          await uploadRecipePhotos(recipeId, newPhotos.map((p) => p.file));
          newPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
          setNewPhotos([]);
        } catch (photoErr) {
          setErrors([
            `Les modifications ont été enregistrées, mais l'envoi des nouvelles photos a échoué (${extractMessages(photoErr)[0]}).`,
          ]);
        }
      }

      // ⚠️ On NE réutilise PAS directement la réponse de updateRecipe() pour
      // mettre à jour l'écran ou notifier le parent : RecipeController::update()
      // renvoie via sérialise() un format qui N'EST PAS le même que GET /api/recipes/{id}
      // (ex. "tips" y est une string brute, pas un tableau découpé par ligne
      // comme ailleurs ; "photos" y est carrément absent). Plutôt que de
      // contourner ça avec un cast TypeScript hasardeux, on re-fetch la
      // ressource canonique — plus robuste, et ça donne à `onSaved` des
      // données garanties cohérentes avec le reste de l'app.
      const refreshed = await fetchRecipe(recipeId);
      setExistingPhotos(refreshed.photos);

      setSavedMessage("Modifications enregistrées.");
      // Le bandeau disparaît tout seul après 3s — même pattern que ProfilePage.
      setTimeout(() => setSavedMessage(""), 3000);
      onSaved?.(refreshed);
    } catch (err) {
      setErrors(extractMessages(err, "La mise à jour de la recette a échoué."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeletingRecipe(true);
    setDeleteError("");
    try {
      await deleteRecipe(recipeId);
      onDeleted?.();
    } catch (err) {
      setDeleteError(extractMessages(err, "La suppression de la recette a échoué.")[0]);
      setDeletingRecipe(false);
    }
  };

  // ── États de chargement / erreur initiale ───────────────────────────────────

  if (loadStatus === "loading") {
    return <Loading />;
  }

  if (loadStatus !== "ready") {
    const messages: Record<Exclude<LoadStatus, "loading" | "ready">, string> = {
      "not-found": "Cette recette est introuvable. Elle a peut-être déjà été supprimée.",
      "forbidden": "Vous n'êtes pas autorisé à modifier cette recette.",
      "error": "Impossible de charger cette recette. Réessayez dans un instant.",
    };

    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: "100dvh", gap: 12, padding: "0 32px", textAlign: "center",
        backgroundColor: "var(--color-background)",
      }}>
        <p style={{ fontSize: 40 }}>🍽️</p>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>{messages[loadStatus]}</p>
        <button
          onClick={onCancel}
          style={{ fontSize: 14, fontWeight: 600, color: "var(--color-primary)", marginTop: 8 }}
        >
          ← Retour
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
          Modifier la recette
        </h1>
      </div>

      <div style={{ padding: "0 20px" }}>

        {/* ── Bandeau de succès ── */}
        {savedMessage && (
          <div style={{
            marginBottom: 20, padding: "12px 16px", borderRadius: 12,
            backgroundColor: "rgba(168,200,122,0.12)", border: "1px solid rgba(168,200,122,0.3)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ color: "#a8c87a" }}><CheckIcon /></span>
            <p style={{ fontSize: 13, color: "#a8c87a", margin: 0 }}>{savedMessage}</p>
          </div>
        )}

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

        {/* ── Photos : existantes (suppression immédiate) + nouvelles (upload au save) ── */}
        <FormSection title="Photos" badge="optionnel">
          <ExistingPhotoGrid photos={existingPhotos} deletingId={deletingPhotoId} onRemove={removeExistingPhoto} />
          {totalPhotoCount < MAX_PHOTOS && (
            <PhotoGrid photos={newPhotos} onAdd={addNewPhotos} onRemove={removeNewPhoto} />
          )}
          {totalPhotoCount >= MAX_PHOTOS && newPhotos.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--color-text-dim)" }}>
              Maximum de {MAX_PHOTOS} photos atteint — supprimez-en une pour en ajouter une nouvelle.
            </p>
          )}
        </FormSection>

        {/* ── Ingrédients ── */}
        <FormSection title="Ingrédients">
          {ingredients.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {ingredients.map((ing, i) => (
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

        {/* ── Astuces ── */}
        <FormSection title="Astuces du chef" badge="optionnel">
          <textarea
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            placeholder={"Partagez vos astuces…\n(une astuce par ligne)"}
            rows={4}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
          />
        </FormSection>

        {/* ── Erreurs ── */}
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

        {/* ── Boutons d'action : enregistrer / annuler ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
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
            <CheckIcon /> {submitting ? "Enregistrement…" : "Enregistrer les modifications"}
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

        {/* ── Zone de suppression, bien séparée visuellement du reste ──
            (pattern classique "danger zone" : on évite qu'un clic malheureux
            juste après "Annuler" ne déclenche une suppression irréversible). */}
        <div style={{
          borderTop: "1px solid var(--color-border)", paddingTop: 20, paddingBottom: 16,
        }}>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 16,
                fontSize: 14, fontWeight: 600,
                backgroundColor: "rgba(180,50,50,0.1)", color: "#e07070",
                border: "1px solid rgba(180,50,50,0.2)", cursor: "pointer",
              }}
            >
              <TrashIcon /> Supprimer cette recette
            </button>
          ) : (
            <div style={{
              padding: 16, borderRadius: 16,
              backgroundColor: "rgba(180,50,50,0.08)", border: "1px solid rgba(180,50,50,0.2)",
            }}>
              <p style={{ fontSize: 13, color: "var(--color-text)", marginBottom: 4, fontWeight: 600 }}>
                Supprimer définitivement « {title} » ?
              </p>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 14 }}>
                Cette action est irréversible : la recette, ses étapes, ses ingrédients et ses photos seront supprimés.
              </p>
              {deleteError && (
                <p style={{ fontSize: 12, color: "#e07070", marginBottom: 10 }}>{deleteError}</p>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingRecipe}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 12,
                    fontSize: 13, fontWeight: 600,
                    backgroundColor: "var(--color-surface)", color: "var(--color-text-muted)",
                    border: "1px solid var(--color-border)", cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deletingRecipe}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 12,
                    fontSize: 13, fontWeight: 700,
                    backgroundColor: "#c84f4f", color: "#fff",
                    cursor: deletingRecipe ? "wait" : "pointer",
                    opacity: deletingRecipe ? 0.7 : 1,
                  }}
                >
                  {deletingRecipe ? "Suppression…" : "Confirmer la suppression"}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}