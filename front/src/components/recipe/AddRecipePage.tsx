import { RECIPE_CATEGORIES, CATEGORY_LABEL_KEYS } from "../../types";
import type { Category, IngredientOption } from "../../types";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronLeft, PlusIcon, GripIcon, TrashIcon } from "../icons";
import { createRecipe, fetchIngredients, uploadRecipePhotos } from "../../api";
import {
  MAX_PHOTOS, MAX_PHOTO_SIZE, ALLOWED_PHOTO_TYPES, MAX_STEP_LENGTH,
  inputStyle, visuallyHiddenStyle, FormSection, StepBadge, TimeFields, IngredientInput, PhotoGrid, extractMessages,
  validateRecipeForm, buildStepsPayload, buildIngredientsPayload,
} from "./RecipeFormShared";
import type { SelectedIngredient, LocalPhoto } from "./RecipeFormShared";
import { useTranslation } from "../../context/LocaleContext";

// NOTE : la plupart des petits composants (FormSection, IngredientInput,
// PhotoGrid…) ont été déplacés dans RecipeFormShared.tsx, car UpdateRecipePage
// en a besoin exactement à l'identique. Ne les redéfinissez pas ici — toute
// correction doit se faire dans ce fichier partagé pour profiter aux deux pages.

// ── AddRecipePage ──────────────────────────────────────────────────────────────

type SubmitStatus = "idle" | "submitting" | "submitted";

export default function AddRecipePage({ onCancel }: { onCancel: () => void }) {
  const { t } = useTranslation();

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
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  // Gestion du focus au changement d'écran (cf. commentaire sur le h1
  // ci-dessous) : on ne le fait qu'à l'entrée dans l'état "submitted".
  useEffect(() => {
    if (status === "submitted") {
      successHeadingRef.current?.focus();
    }
  }, [status]);
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
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) rejected.push(t("recipe.form.photo_error_unsupported_format", { filename: file.name }));
      else if (file.size > MAX_PHOTO_SIZE)          rejected.push(t("recipe.form.photo_error_too_large", { filename: file.name }));
      else                                          accepted.push(file);
    }

    const room = MAX_PHOTOS - photos.length;
    if (accepted.length > room) rejected.push(t("recipe.form.photo_error_max_reached", { max: MAX_PHOTOS }));

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
    // Validation ET construction du payload
    const errs = validateRecipeForm({ title, prepTime, cookTime, ingredientsCount: ingredients.length, steps }, t);
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
            t("recipe.add.photo_warning", { error: extractMessages(photoErr, t("recipe.form.error_generic_fallback"))[0] })
          );
        }
      }

      setStatus("submitted");
    } catch (err) {
      setErrors(extractMessages(err, t("recipe.form.error_generic_fallback")));
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
        <div aria-hidden="true" style={{
          width: 72, height: 72, borderRadius: "50%", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "rgba(224,154,90,0.15)",
        }}>
          <span style={{ color: "var(--color-primary)", transform: "scale(1.8)", display: "block" }}>
            <CheckIcon />
          </span>
        </div>
        {/* h1 (et non h2) : cet écran REMPLACE entièrement le formulaire, ce
            n'est pas une sous-section de "Nouvelle recette" mais un écran à
            part entière — il doit donc porter son propre titre de plus haut
            niveau. tabIndex={-1} + ref + focus() au montage : le bouton sur
            lequel le focus clavier se trouvait vient de disparaître du DOM
            (le formulaire entier a été démonté), le focus retombe sinon sur
            <body> sans qu'aucune technologie d'assistance n'annonce ce
            nouvel écran de confirmation. */}
        <h1 ref={successHeadingRef} tabIndex={-1} style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>
          {t("recipe.add.success_title")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: photoWarning ? 12 : 28 }}>
          {t("recipe.add.success_message", { title })}
        </p>
        {photoWarning && (
          <p role="alert" style={{ fontSize: 13, color: "#e0b070", marginBottom: 28 }}>{photoWarning}</p>
        )}
        <button type="button"
          onClick={onCancel}
          style={{
            padding: "14px 32px", borderRadius: 16,
            fontSize: 14, fontWeight: 700,
            backgroundColor: "var(--color-primary)", color: "#171210",
            cursor: "pointer",
          }}
        >
          {t("recipe.add.back_home_button")}
        </button>
      </div>
    );
  }

  // ── Formulaire principal ───────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "var(--font-body)", backgroundColor: "var(--color-background)", minHeight: "100dvh", overflowY: "auto", paddingBottom: 40 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "52px 20px 20px" }}>
        <button type="button"
          onClick={onCancel}
          disabled={submitting}
          aria-label={t("common.buttons.cancel")}
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
          {t("recipe.add.title")}
        </h1>
      </div>

      <main style={{ padding: "0 20px" }}>

        {/* ── Titre ──
            titleId + aria-labelledby : le champ titre n'avait AUCUN nom
            accessible (le "label" visuel de FormSection est un simple <p>,
            jamais lié à l'input). Un lecteur d'écran annonçait juste
            "Édition, texte" en y arrivant au clavier. */}
        <FormSection htmlFor="recipe-title-input" title={t("recipe.form.title_label")} titleId="recipe-title-label">
          <input
            id="recipe-title-input"
            type="text"
            aria-labelledby="recipe-title-label"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            placeholder={t("recipe.form.title_placeholder")}
            style={{ ...inputStyle, fontSize: 15, fontFamily: "var(--font-display)", fontWeight: 500, padding: "14px 16px", borderRadius: 14 }}
          />
        </FormSection>

        {/* ── Personnes + Catégorie (2 colonnes) ── */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          {/* Personnes — compteur +/- : role="group" relie visuellement et
              sémantiquement les deux boutons et le nombre à l'intitulé
              "Personnes" (sinon trois éléments sans aucun rapport exposé).
              Les boutons − / + n'avaient pour seul nom accessible que le
              caractère "−"/"+" lui-même, que certains lecteurs d'écran
              prononcent mal ou passent sous silence ; aria-label explicite
              le rend sans ambiguïté, et aria-live sur le compteur annonce
              la nouvelle valeur après chaque clic (le focus reste sur le
              bouton, jamais sur le chiffre, qui ne serait donc jamais relu
              sans ce live region). */}
          <div style={{ flex: 1 }}>
            <p id="people-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-dim)", marginBottom: 10 }}>
              {t("recipe.form.people_label")}
            </p>
            <div
              role="group"
              aria-labelledby="people-label"
              style={{
                display: "flex", alignItems: "center",
                backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden",
              }}
            >
              <button type="button"
                onClick={() => setPeople((p) => Math.max(1, p - 1))}
                aria-label={t("common.aria.decrease") + " — " + t("recipe.form.people_label")}
                style={{ width: 44, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 300, color: "var(--color-primary)", flexShrink: 0, cursor: "pointer" }}
              >−</button>
              <span aria-live="polite" style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>{people}</span>
              <button type="button"
                onClick={() => setPeople((p) => p + 1)}
                aria-label={t("common.aria.increase") + " — " + t("recipe.form.people_label")}
                style={{ width: 44, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 300, color: "var(--color-primary)", flexShrink: 0, cursor: "pointer" }}
              >+</button>
            </div>
          </div>

          {/* Catégorie — role="radiogroup"/"radio" serait le choix "parfait"
              puisqu'un SEUL choix est possible parmi plusieurs options
              mutuellement exclusives, mais cela exigerait la navigation au
              clavier par flèches (comme pour les tabs plus haut). On reste
              cohérent avec le reste de l'app (HomePage, PaginationControls) :
              role="group" + aria-pressed, plus simple et honnête sur ce que
              le clavier permet réellement ici (Tab + Entrée/Espace). */}
          <div style={{ flex: 1 }}>
            <p id="category-label" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-dim)", marginBottom: 10 }}>
              {t("recipe.form.category_label")}
            </p>
            <div role="group" aria-labelledby="category-label" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {RECIPE_CATEGORIES.map((c) => {
                const isActive = category === c;
                return (
                  <button type="button"
                    key={c}
                    onClick={() => setCategory(c)}
                    aria-pressed={isActive}
                    style={{
                      padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.15s",
                      backgroundColor: isActive ? "var(--color-primary)" : "var(--color-card)",
                      color: isActive ? "#171210" : "var(--color-text-muted)",
                      border: isActive ? "1px solid transparent" : "1px solid var(--color-border)",
                    }}
                  >
                    {t(CATEGORY_LABEL_KEYS[c])}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      {/* ── Temps de préparation + cuisson ── */}
      <TimeFields
        prepTime={prepTime}
        onPrepTimeChange={setPrepTime}
        cookTime={cookTime}
        onCookTimeChange={setCookTime}
      />

        {/* ── Photos ── */}
        <FormSection title={t("recipe.form.photos_label")} badge={t("common.badges.optional")}>
          <PhotoGrid photos={photos} onAdd={addPhotos} onRemove={removePhoto} />
        </FormSection>

        {/* ── Ingrédients ── */}
        <FormSection title={t("recipe.form.ingredients_label")}>
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
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    aria-label={`${t("common.buttons.delete")} — ${ing.label}`}
                    style={{ color: "var(--color-text-dim)", cursor: "pointer", marginLeft: 4 }}
                  >
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

        {/* ── Étapes ──
            <ol> plutôt que des <div> empilées : des étapes de recette sont
            INTRINSÈQUEMENT une liste ordonnée. Un lecteur d'écran annonce
            alors "liste de N éléments" puis "élément 3 sur 5" en se
            déplaçant — information précieuse ici, totalement absente avec de
            simples <div>. listStyle:"none" + margin/padding:0 : on retire
            juste les puces/numéros natifs du navigateur (déjà affichés via
            le badge rond stylé), le rendu visuel ne change pas. */}
        <FormSection title={t("recipe.form.steps_label")}>
          <ol style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none", margin: 0, padding: 0 }}>
            {steps.map((step, i) => (
              <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {/* <span aria-hidden="true" style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  backgroundColor: "var(--color-primary)", color: "#171210",
                }}>
                  {i + 1}
                </span> */}
                <label htmlFor={`step-${i}`} aria-hidden="true" style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  backgroundColor: "var(--color-primary)", color: "#171210",
                }}>
                  {i + 1}
                </label>
                <div style={{ flex: 1 }}>
                  {/* <label htmlFor={`step-${i}`} style={visuallyHiddenStyle}>
                    {t("recipe.form.step_placeholder", { n: i + 1 })}
                  </label> */}
                  <textarea
                    id={`step-${i}`}
                    value={step}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder={t("recipe.form.step_placeholder", { n: i + 1 })}
                    rows={2}
                    maxLength={MAX_STEP_LENGTH}
                    aria-describedby={step.length > MAX_STEP_LENGTH * 0.8 ? `step-${i}-counter` : undefined}
                    style={{ ...inputStyle, resize: "none", lineHeight: 1.55, padding: "10px 14px" }}
                  />
                  {step.length > MAX_STEP_LENGTH * 0.8 && (
                    <p id={`step-${i}-counter`} style={{ fontSize: 11, color: "var(--color-text-dim)", textAlign: "right", marginTop: 4 }}>
                      {step.length} / {MAX_STEP_LENGTH}
                    </p>
                  )}
                </div>
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    aria-label={`${t("common.buttons.delete")} — ${t("recipe.form.step_placeholder", { n: i + 1 })}`}
                    style={{ color: "var(--color-text-dim)", marginTop: 12, flexShrink: 0, cursor: "pointer" }}
                  >
                    <TrashIcon />
                  </button>
                )}
              </li>
            ))}
          </ol>
          <button type="button"
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
            <PlusIcon size={15} /> {t("recipe.form.add_step_button")}
          </button>
        </FormSection>

        {/* ── Astuces : un seul champ texte, sans limite ── */}
        <FormSection htmlFor="recipe-tips-input" title={t("recipe.form.tips_label")} titleId="recipe-tips-label" badge={t("common.badges.optional")}>
          <textarea
            id="recipe-tips-input"
            aria-labelledby="recipe-tips-label"
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            placeholder={t("recipe.form.tips_placeholder")}
            rows={4}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
          />
        </FormSection>

        {/* ── Erreurs de validation ──
            role="alert" : la liste apparaît après un clic sur "Confirmer" qui
            échoue — sans ce live region, rien n'annonce que la soumission a
            été bloquée (le focus reste sur le bouton, plus bas dans le DOM).
            <ul>/<li> plutôt que des "• " en dur : un caractère "•" tapé dans
            le texte est parfois lu à voix haute ("puce") par certains
            lecteurs d'écran — la sémantique de liste native évite ce bruit. */}
        {errors.length > 0 && (
          <div role="alert" style={{
            marginBottom: 20, padding: "12px 16px", borderRadius: 12,
            backgroundColor: "rgba(224,90,90,0.1)", border: "1px solid rgba(224,90,90,0.25)",
          }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {errors.map((e, i) => (
                <li key={i} style={{ fontSize: 13, color: "#e07070" }}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Boutons d'action ──
            Le bouton "Brouillon" est retiré : le back n'a pas de champ `status`.
            Le remettre quand l'API le gèrera. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16 }}>
          <button type="button"
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
            <CheckIcon /> {submitting ? t("recipe.add.submitting") : t("recipe.add.submit_button")}
          </button>
          <button type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 16,
              fontSize: 14, fontWeight: 500,
              backgroundColor: "transparent", color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)", cursor: "pointer",
            }}
          >
            {t("common.buttons.cancel")}
          </button>
        </div>

      </main>
    </div>
  );
}