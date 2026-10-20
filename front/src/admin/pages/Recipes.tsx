// ─────────────────────────────────────────────────────────────────────────────
// src/admin/pages/Recipes.tsx
//
// Gestion des recettes : liste filtrée + création + édition + suppression.
//
// POINTS PÉDAGOGIQUES pour le junior :
//
// 1. SÉPARATION DES ÉTATS :
//    - `recipes` (props) = données serveur → ne jamais muter directement
//    - `form` (useState local) = état du formulaire en cours d'édition
//    - `allIngredients` (useState local) = référentiel chargé une fois au montage
//
// 2. PATTERN "OPTIMISTIC UPDATE" vs "REFETCH" :
//    Ici on utilise les callbacks onAdd/onUpdate/onDelete qui vivent dans AdminApp.
//    AdminApp met à jour son state local. On ne refetch pas depuis ici.
//    Avantage : l'UI répond immédiatement. Inconvénient : si l'API échoue,
//    le state local est désynchronisé → à terme, penser à gérer les erreurs
//    et rollback.
//
// 3. RECHERCHE D'INGRÉDIENTS côté client :
//    On charge tous les ingrédients une fois (fetchIngredients) et on filtre
//    en mémoire. Acceptable tant que le référentiel est < ~500 entrées.
//    Au-delà, il faudra un endpoint de recherche côté serveur.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import type {
  Recipe,
  RecipeType,
  RecipeStatus,
  RecipeStep,
  RecipeIngredientItem,
  IngredientOption,
  RecipePhoto,
} from "../types";
import Table, { type Column } from "../components/ui/Table";
import { StatusBadge } from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import {
  fetchIngredients,
  fetchRecipe,
  createRecipe,
  updateRecipe as apiUpdateRecipe,
  deleteRecipe as apiDeleteRecipe,
  updateRecipeStatus,
  uploadRecipePhotos,
  deleteRecipePhoto,
  reorderRecipePhoto,
  toPhotoUrl,
} from "../../api";

interface RecipesProps {
  recipes: Recipe[];
  currentRole: string;
  onAdd: (r: Recipe) => void;
  onUpdate: (r: Recipe) => void;
  onDelete: (id: number) => void;
}

const RECIPE_TYPES: RecipeType[] = ["Plats", "Desserts", "Mocktails"];

// ── État initial du formulaire ─────────────────────────────────────────────────
// On sépare les champs "scalaires" du formulaire des listes (steps/ingredients)
// car elles ont leur propre logique d'ajout/suppression.
interface RecipeForm {
  title: string;
  type: RecipeType;
  status: RecipeStatus; // local uniquement — pas envoyé à l'API
  nbPeople: number;
  prepTime: number;
  cookingTime: number | null;
  tips: string;
  steps: RecipeStep[];
  ingredients: RecipeIngredientItem[];
  // Photos DÉJÀ persistées côté serveur (vide en création tant que la
  // recette n'existe pas). Contrairement à steps/ingredients, ce champ n'est
  // JAMAIS envoyé dans le payload de POST/PUT recette : les photos ont leurs
  // propres endpoints (voir PhotoController) et se gèrent indépendamment.
  photos: RecipePhoto[];
}

const EMPTY_FORM: RecipeForm = {
  title: "",
  type: "Plats",
  status: "PENDING",
  nbPeople: 2,
  prepTime: 10,
  cookingTime: null,
  tips: "",
  steps: [],
  ingredients: [],
  photos: [],
};

// ── Photo en attente d'envoi (mode création uniquement) ────────────────────
// Tant que la recette n'existe pas, on ne peut pas appeler l'API photos
// (elle a besoin d'un recipeId). On garde donc le File brut en mémoire, le
// temps de la création, accompagné d'une URL de preview locale.
interface PendingPhoto {
  file: File;
  previewUrl: string;
}

// Dupliqué volontairement depuis PhotoController.php (back) : on valide vite
// côté client pour le confort de l'admin, mais c'est le SERVEUR qui fait foi.
// Si ces constantes changent côté back un jour, il faudra penser à les
// resynchroniser ici — un bon candidat pour un futur endpoint de config.
const MAX_PHOTOS = 5;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 Mo, comme PhotoController::MAX_FILE_SIZE

// ── Sous-composant : barre de recherche d'ingrédients ─────────────────────────
// Isolé dans son propre composant pour ne pas alourdir la modale principale.
// Reçoit la liste complète des ingrédients et appelle onSelect quand l'admin choisit.
function IngredientSearch({
  allIngredients,
  selectedIds,
  onSelect,
}: {
  allIngredients: IngredientOption[];
  selectedIds: number[];
  onSelect: (ing: IngredientOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtrage local : on exclut les ingrédients déjà sélectionnés
  const matches = query.trim().length < 1
    ? []
    : allIngredients
        .filter(
          (ing) =>
            !selectedIds.includes(ing.id) &&
            ing.label.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8); // Max 8 suggestions pour ne pas noyer l'admin

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        className="input-field"
        placeholder="Rechercher un ingrédient…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && matches.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {matches.map((ing) => (
            <button
              key={ing.id}
              type="button"
              onClick={() => {
                onSelect(ing);
                setQuery("");
                setOpen(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "9px 14px",
                fontSize: 14,
                color: "#0f172a",
                borderBottom: "1px solid #f1f5f9",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#f8fafc")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <span>{ing.label}</span>
              {ing.unit && (
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{ing.unit}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function Recipes({ recipes, currentRole, onAdd, onUpdate, onDelete }: RecipesProps) {
  // null = modale fermée | false = création | Recipe = édition
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null | false>(null);
  const [form, setForm] = useState<RecipeForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Chargé une fois au montage — référentiel des ingrédients disponibles
  const [allIngredients, setAllIngredients] = useState<IngredientOption[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // Gestion des erreurs API dans la modale
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chargement de la recette complète avant ouverture de la modale d'édition.
  // La liste ne contient pas steps/ingredients (trop lourd à charger en masse),
  // donc on fetche le détail au clic sur "Modifier".
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  // ── État local des photos ───────────────────────────────────────────────
  // pendingPhotos : fichiers choisis en mode CRÉATION, pas encore envoyés
  //                 (ils le seront juste après la création de la recette).
  // photoError / uploadingPhotos : feedback UI, partagés création + édition.
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Filtres de la liste
  const [filterType, setFilterType] = useState<RecipeType | "Tous">("Tous");
  const [filterStatus, setFilterStatus] = useState<RecipeStatus | "Tous">("Tous");
  const [search, setSearch] = useState("");

  // ── Chargement du référentiel ingrédients ──────────────────────────────────
  useEffect(() => {
    setLoadingIngredients(true);
    fetchIngredients()
      .then(setAllIngredients)
      .catch(() => console.error("Impossible de charger les ingrédients"))
      .finally(() => setLoadingIngredients(false));
  }, []);

  // ── Nettoyage des object URLs de preview (évite les fuites mémoire) ───────
  // PIÈGE CLASSIQUE : un `useEffect(() => { ... }, [])` capturerait
  // `pendingPhotos` tel qu'il était AU MONTAGE du composant (closure figée),
  // pas sa valeur actuelle au moment du démontage. On passe donc par un ref,
  // mis à jour à chaque render, que le cleanup peut lire "en direct".
  const pendingPhotosRef = useRef<PendingPhoto[]>([]);
  useEffect(() => {
    pendingPhotosRef.current = pendingPhotos;
  }, [pendingPhotos]);
  useEffect(() => {
    return () => {
      pendingPhotosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  // ── Filtrage de la liste ───────────────────────────────────────────────────
  const filtered = recipes.filter((r) => {
    if (filterType !== "Tous" && r.type !== filterType) return false;
    if (filterStatus !== "Tous" && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  // ── Ouverture modale création ──────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM);
    setSubmitError(null);
    resetPendingPhotos();
    setEditingRecipe(false);
  }

  // ── Ouverture modale édition ───────────────────────────────────────────────
  // On fetche la recette COMPLÈTE (GET /api/recipes/{id}) avant d'ouvrir la modale.
  //
  // Pourquoi ne pas utiliser la recette déjà dans le state ?
  // L'endpoint GET /api/recipes (liste) ne retourne pas steps ni ingredients
  // pour ne pas surcharger la réponse. On ne charge ces données lourdes
  // que quand l'admin en a besoin, c'est-à-dire ici, au moment de l'édition.
  // C'est le pattern "load on demand" — très courant dans les back-offices.
  async function openEdit(recipe: Recipe) {
    setIsLoadingRecipe(true);
    setSubmitError(null);
    resetPendingPhotos();
    // On ouvre immédiatement la modale avec les données partielles de la liste
    // pour que l'admin voie un feedback visuel (spinner) plutôt qu'un clic sans réponse.
    setEditingRecipe(recipe);

    try {
      // fetchRecipe appelle GET /api/recipes/{id}, qui retourne désormais
      // TOUJOURS la même forme que la liste (RecipeController::serialize()
      // est unifié) : tips est un tableau, ingredients a bien ingredientId.
      // On n'a donc plus besoin de se défendre contre une forme ambiguë —
      // seul `Array.isArray` reste, par prudence runtime : un type TypeScript
      // n'est qu'une promesse de compilation, pas une garantie sur le JSON
      // qui arrive réellement du réseau.
      const fullRecipe = await fetchRecipe(recipe.id);
      setForm({
        title: fullRecipe.title,
        type: fullRecipe.type,
        status: recipe.status, // status est local — pas retourné par l'API
        nbPeople: fullRecipe.nbPeople,
        prepTime: fullRecipe.prepTime,
        cookingTime: fullRecipe.cookingTime ?? null,
        tips: Array.isArray(fullRecipe.tips) ? fullRecipe.tips.join("\n") : "",
        steps: Array.isArray(fullRecipe.steps) ? [...fullRecipe.steps] : [],
        ingredients: Array.isArray(fullRecipe.ingredients)
          ? fullRecipe.ingredients.map((ing) => ({
              id: ing.id,
              ingredientId: ing.ingredientId,
              label: ing.label,
              unit: ing.unit,
              amount: ing.amount,
            }))
          : [],
        // Même prudence runtime que pour steps/ingredients ci-dessus :
        // RecipeController::serialize() garantit "photos" => [] au minimum,
        // mais on ne fait jamais confiance aveuglément à ce qui vient du réseau.
        photos: Array.isArray(fullRecipe.photos) ? fullRecipe.photos : [],
      });
    } catch (err) {
      setSubmitError("Impossible de charger la recette. Veuillez réessayer.");
    } finally {
      setIsLoadingRecipe(false);
    }
  }

  function closeModal() {
    setEditingRecipe(null);
    setSubmitError(null);
    resetPendingPhotos();
  }

  // ── Mise à jour d'un champ scalaire du formulaire ─────────────────────────
  function setField<K extends keyof RecipeForm>(key: K, value: RecipeForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── Gestion des steps ──────────────────────────────────────────────────────

  function addStep() {
    setForm((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        { index: prev.steps.length + 1, description: "" },
      ],
    }));
  }

  function updateStep(i: number, field: keyof RecipeStep, value: string | number) {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, idx) =>
        idx === i ? { ...s, [field]: value } : s
      ),
    }));
  }

  function removeStep(i: number) {
    setForm((prev) => ({
      ...prev,
      // Après suppression, on recalcule les index pour qu'ils restent consécutifs.
      // Important : en mode création seulement — en update l'admin contrôle l'index.
      steps: prev.steps
        .filter((_, idx) => idx !== i)
        .map((s, idx) => ({ ...s, index: idx + 1 })),
    }));
  }

  // ── Gestion des ingrédients ────────────────────────────────────────────────

  function addIngredient(ing: IngredientOption) {
    setForm((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          ingredientId: ing.id,
          label: ing.label,
          unit: ing.unit,
          amount: 1, // Valeur par défaut — l'admin ajustera
        },
      ],
    }));
  }

  function updateIngredientAmount(i: number, amount: number) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, idx) =>
        idx === i ? { ...ing, amount } : ing
      ),
    }));
  }

  function removeIngredient(i: number) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, idx) => idx !== i),
    }));
  }

  // ── Gestion des photos ──────────────────────────────────────────────────────
  //
  // ATTENTION, comportement volontairement différent entre les deux modes :
  //
  // - CRÉATION (!isEditing) : il n'y a pas encore de recipeId, donc PAS
  //   d'appel réseau ici. On stocke juste les File en mémoire (pendingPhotos)
  //   avec une preview locale. L'envoi réel se fait dans handleSubmit, juste
  //   après la création de la recette.
  //
  // - ÉDITION (isEditing) : la recette existe déjà, donc chaque action
  //   (ajout / suppression / réordonnancement) part en requête TOUT DE SUITE,
  //   indépendamment du bouton "Enregistrer". C'est différent de
  //   steps/ingredients, qui eux sont bufferisés dans `form` jusqu'au submit.
  //   Pourquoi cette différence ? Parce que PhotoController n'est pas raccordé
  //   au PUT /api/recipes/{id} — ce sont des endpoints REST séparés
  //   (POST/DELETE/PATCH .../photos). On respecte le découpage de l'API
  //   plutôt que de réinventer un système de "photos en attente" côté front
  //   pour l'édition, ce qui ajouterait de la complexité pour peu de valeur.

  function resetPendingPhotos() {
    // Toujours révoquer les object URLs avant de vider le tableau,
    // sinon le navigateur garde les blobs en mémoire indéfiniment.
    pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingPhotos([]);
    setPhotoError(null);
  }

  /** Valide un lot de fichiers contre les règles de PhotoController. Renvoie un message d'erreur ou null. */
  function validatePhotoFiles(files: File[], alreadyCount: number): string | null {
    if (alreadyCount + files.length > MAX_PHOTOS) {
      return `Maximum ${MAX_PHOTOS} photos par recette (${alreadyCount} déjà présente${alreadyCount > 1 ? "s" : ""}).`;
    }
    for (const file of files) {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        return `Format non supporté : ${file.name} (jpeg, png, webp ou gif uniquement).`;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        return `Fichier trop volumineux (5 Mo max) : ${file.name}.`;
      }
    }
    return null;
  }

  // CRÉATION : on stage les fichiers localement, aucun appel réseau.
  function handleSelectPhotos(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const error = validatePhotoFiles(files, form.photos.length + pendingPhotos.length);
    if (error) {
      setPhotoError(error);
      return;
    }
    setPhotoError(null);
    const newPending = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setPendingPhotos((prev) => [...prev, ...newPending]);
  }

  function removePendingPhoto(index: number) {
    setPendingPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  // ÉDITION : upload immédiat vers la recette déjà existante.
  async function handleUploadPhotosNow(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !editingRecipe) return;
    const files = Array.from(fileList);
    const error = validatePhotoFiles(files, form.photos.length);
    if (error) {
      setPhotoError(error);
      return;
    }
    setPhotoError(null);
    setUploadingPhotos(true);
    try {
      const uploaded = await uploadRecipePhotos(editingRecipe.id, files);
      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...uploaded] }));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Échec de l'envoi des photos.");
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function handleDeletePhoto(photoId: number) {
    if (!editingRecipe) return;
    try {
      await deleteRecipePhoto(editingRecipe.id, photoId);
      setForm((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== photoId) }));
    } catch {
      setPhotoError("Impossible de supprimer cette photo.");
    }
  }

  async function handleReorderPhoto(photoId: number, position: number) {
    if (!editingRecipe) return;
    try {
      const updated = await reorderRecipePhoto(editingRecipe.id, photoId, position);
      setForm((prev) => ({
        ...prev,
        photos: prev.photos.map((p) => (p.id === photoId ? updated : p)),
      }));
    } catch {
      setPhotoError("Impossible de réordonner les photos.");
    }
  }

  // ── Soumission du formulaire ───────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (editingRecipe) {
        // ── UPDATE ──────────────────────────────────────────────────────────
        // On envoie les steps avec leur index (modifiable manuellement par l'admin).
        // On envoie les ingredients avec uniquement ingredientId + amount.
        // label/unit ne sont pas des champs éditables — ils viennent du référentiel.
        const payload = {
          title: form.title,
          nbPeople: form.nbPeople,
          type: form.type,
          prepTime: form.prepTime,
          cookingTime: form.cookingTime,
          tips: form.tips || null,
          steps: form.steps.map((s) => ({
            index: s.index,
            description: s.description,
          })),
          ingredients: form.ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            amount: ing.amount,
          })),
        };

        const updated = await apiUpdateRecipe(editingRecipe.id, payload);
        // On fusionne le résultat API avec le status local (pas retourné par l'API)
        onUpdate({ ...updated, status: form.status });
      } else {
        // ── CRÉATION ────────────────────────────────────────────────────────
        // Steps : on n'envoie que description — l'index est généré côté serveur.
        const payload = {
          title: form.title,
          nbPeople: form.nbPeople,
          type: form.type,
          prepTime: form.prepTime,
          cookingTime: form.cookingTime,
          tips: form.tips || null,
          steps: form.steps.map((s) => ({ description: s.description })),
          ingredients: form.ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            amount: ing.amount,
          })),
        };

        // Appel 1/2 : la recette est créée SANS photos. C'est obligatoire —
        // PhotoController a besoin d'un recipeId qui n'existe qu'une fois
        // la recette persistée (voir POST /api/recipes/{recipeId}/photos).
        const created = await createRecipe(payload);

        // Appel 2/2 : si des photos ont été choisies avant la création
        // (stockées dans pendingPhotos, jamais envoyées jusqu'ici), on les
        // pousse maintenant vers la recette qu'on vient d'obtenir.
        let uploadedPhotos: RecipePhoto[] = [];
        if (pendingPhotos.length > 0) {
          try {
            uploadedPhotos = await uploadRecipePhotos(
              created.id,
              pendingPhotos.map((p) => p.file)
            );
          } catch (photoErr) {
            // La recette existe DÉJÀ en base (appel 1 réussi) : impossible et
            // inutile de "rollback" — ce sont deux requêtes HTTP indépendantes,
            // pas une transaction partagée. On informe l'admin et on reste sur
            // la modale, repassée en mode édition sur la recette fraîchement
            // créée, pour qu'il puisse réessayer l'envoi sans tout ressaisir.
            resetPendingPhotos();
            onAdd({ ...created, status: form.status, photos: [] });
            setEditingRecipe({ ...created, status: form.status, photos: [] });
            setForm((prev) => ({ ...prev, photos: [] }));
            setSubmitError(
              "La recette a été créée, mais l'envoi des photos a échoué. Vous pouvez réessayer ci-dessous."
            );
            return; // on NE ferme PAS la modale dans ce cas précis
          }
        }

        resetPendingPhotos();
        onAdd({ ...created, status: form.status, photos: uploadedPhotos });
      }

      closeModal();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Suppression ────────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    try {
      await apiDeleteRecipe(id);
      onDelete(id);
    } catch (err) {
      console.error("Erreur lors de la suppression :", err);
    } finally {
      setDeleteConfirm(null);
    }
  }

  function formatLongDate(tsp: number): string {
    return new Date(tsp * 1000).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  // ── Colonnes de la table ───────────────────────────────────────────────────
  const columns: Column<Recipe>[] = [
    {
      header: "Titre",
      render: (r) => (
        <span style={{ fontWeight: 500, color: "#0f172a" }}>{r.title}</span>
      ),
    },
    {
      header: "Type",
      width: "110px",
      render: (r) => (
        <span style={{ fontSize: "0.875rem", color: "#475569" }}>{r.type}</span>
      ),
    },
    {
      header: "Statut",
      width: "160px",
      render: (r) => {
        const canModerate = currentRole === "ROLE_ADMIN" || currentRole === "ROLE_SUPER_ADMIN";
        if (!canModerate) return <StatusBadge status={r.status} />;
        return (
          <select
            className="input-field"
            value={r.status}
            onChange={async (e) => {
              const updated = await updateRecipeStatus(r.id, e.target.value as any);
              onUpdate(updated);
            }}
          >
            <option value="PENDING">En attente</option>
            <option value="PUBLISHED">Publiée</option>
            <option value="DECLINED">Refusée</option>
          </select>
        );
      },
    },
    {
      header: "Prépa.",
      width: "80px",
      render: (r) => (
        <span style={{ color: "#94a3b8" }}>{r.prepTime} min</span>
      ),
    },
    {
      header: "Créée le",
      width: "130px",
      render: (r) => (
        <span style={{ color: "#94a3b8" }}>{formatLongDate(r.createdAt)}</span>
      ),
    },
    {
      header: "Actions",
      width: "150px",
      render: (r) => (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            variant="secondary"
            onClick={() => openEdit(r)}
            style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}
          >
            Modifier
          </Button>
          <Button variant="danger" onClick={() => setDeleteConfirm(r.id)}>
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  const isModalOpen = editingRecipe !== null;
  const isEditing = !!editingRecipe;

  // ── IDs déjà sélectionnés pour la barre de recherche (évite les doublons) ──
  const selectedIngredientIds = form.ingredients.map((i) => i.ingredientId);

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "2rem" }}>

      {/* ── En-tête ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
            Recettes
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
            {filtered.length} / {recipes.length} recette
            {recipes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} leftIcon={<PlusIcon />}>
          Ajouter
        </Button>
      </div>

      {/* ── Filtres ── */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <input
          className="input-field"
          style={{ maxWidth: 220 }}
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field"
          style={{ maxWidth: 140 }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as RecipeType | "Tous")}
        >
          <option value="Tous">Tous les types</option>
          {RECIPE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="input-field"
          style={{ maxWidth: 160 }}
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as RecipeStatus | "Tous")
          }
        >
          <option value="Tous">Tous les statuts</option>
          <option value="published">Publiées</option>
          <option value="draft">Brouillons</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "0.75rem",
          overflow: "hidden",
        }}
      >
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(r) => r.id}
          emptyState="Aucune recette ne correspond aux filtres."
        />
      </div>

      {/* ── Modale création / édition ── */}
      {isModalOpen && (
        <Modal onClose={closeModal} maxWidth={580}>
          <Modal.Header
            title={isEditing ? "Modifier la recette" : "Nouvelle recette"}
            onClose={closeModal}
          />
          <form onSubmit={handleSubmit}>
            <Modal.Body>

              {/* ── Spinner affiché pendant le fetch de la recette complète ── */}
              {isLoadingRecipe ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2.5rem 0",
                    gap: 12,
                    color: "#94a3b8",
                    fontSize: 14,
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2"
                    style={{ animation: "spin 1s linear infinite" }}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Chargement de la recette…
                </div>
              ) : (
                <>
              {/* ── Erreur API ── */}
              {submitError && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    backgroundColor: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#e11d48",
                    fontSize: 13,
                  }}
                >
                  {submitError}
                </div>
              )}

              {/* ─── SECTION : Informations générales ─── */}
              <SectionTitle>Informations générales</SectionTitle>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Titre *
                </label>
                <input
                  className="input-field"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  required
                  placeholder="Nom de la recette"
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Type *
                  </label>
                  <select
                    className="input-field"
                    value={form.type}
                    onChange={(e) => setField("type", e.target.value as RecipeType)}
                  >
                    {RECIPE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  {/* Status : local uniquement, pas envoyé à l'API */}
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Statut
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 11,
                        color: "#94a3b8",
                        fontWeight: 400,
                      }}
                    >
                      (local)
                    </span>
                  </label>
                  <select
                    className="input-field"
                    value={form.status}
                    onChange={(e) =>
                      setField("status", e.target.value as RecipeStatus)
                    }
                  >
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Personnes *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.nbPeople}
                    onChange={(e) => setField("nbPeople", Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Préparation (min) *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.prepTime}
                    onChange={(e) => setField("prepTime", Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Cuisson (min)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.cookingTime ?? ""}
                    onChange={(e) =>
                      setField(
                        "cookingTime",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    min={0}
                    placeholder="Optionnel"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Astuces du chef
                </label>
                <textarea
                  className="input-field"
                  value={form.tips}
                  onChange={(e) => setField("tips", e.target.value)}
                  rows={2}
                  placeholder="Conseils, variantes…"
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* ─── SECTION : Photos ───────────────────────────────────────────
                  Deux comportements selon le mode (voir les handlers plus haut) :
                  - création  → staging local, aucun appel réseau avant submit
                  - édition   → upload / suppression / réordonnancement immédiats */}
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                  <label className="block text-sm font-medium text-slate-700">Photos</label>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    {form.photos.length + pendingPhotos.length} / {MAX_PHOTOS}
                  </span>
                </div>

                {photoError && (
                  <div
                    style={{
                      marginBottom: 8, padding: "6px 10px", borderRadius: 8,
                      backgroundColor: "#fff1f2", border: "1px solid #fecdd3",
                      color: "#e11d48", fontSize: 12,
                    }}
                  >
                    {photoError}
                  </div>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
                  {/* Photos déjà persistées côté serveur */}
                  {form.photos.map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        position: "relative", width: 92, height: 92,
                        borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0",
                        flexShrink: 0, background: "#f1f5f9",
                      }}
                    >
                      <img
                        src={toPhotoUrl(photo.url)}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      {/* En création, editingRecipe === false : pas d'actions possibles sur des
                          photos "déjà persistées" puisqu'il n'y en a jamais à ce stade. */}
                      {editingRecipe && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo.id)}
                            title="Supprimer"
                            style={{
                              position: "absolute", top: 4, right: 4,
                              width: 22, height: 22, borderRadius: "50%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              backgroundColor: "rgba(15,23,42,0.72)", color: "#fff", cursor: "pointer",
                            }}
                          >
                            <TrashIcon />
                          </button>
                          <input
                            type="number"
                            defaultValue={photo.position ?? 0}
                            title="Position d'affichage"
                            onBlur={(e) => {
                              const next = Number(e.target.value);
                              if (!Number.isNaN(next) && next !== photo.position) {
                                handleReorderPhoto(photo.id, next);
                              }
                            }}
                            style={{
                              position: "absolute", bottom: 3, left: 3, width: 30,
                              fontSize: 10, padding: "1px 3px", borderRadius: 4,
                              border: "1px solid #e2e8f0", backgroundColor: "#fff",
                            }}
                          />
                        </>
                      )}
                    </div>
                  ))}

                  {/* Photos choisies mais pas encore envoyées (création uniquement) */}
                  {pendingPhotos.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        position: "relative", width: 92, height: 92,
                        borderRadius: 10, overflow: "hidden",
                        border: "1px dashed #c7d2fe", flexShrink: 0,
                      }}
                    >
                      <img
                        src={p.previewUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      <span
                        style={{
                          position: "absolute", bottom: 3, left: 3,
                          fontSize: 9, padding: "1px 5px", borderRadius: 4,
                          backgroundColor: "#eef2ff", color: "#4f46e5", fontWeight: 600,
                        }}
                      >
                        à envoyer
                      </span>
                      <button
                        type="button"
                        onClick={() => removePendingPhoto(i)}
                        title="Retirer"
                        style={{
                          position: "absolute", top: 4, right: 4,
                          width: 22, height: 22, borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          backgroundColor: "rgba(15,23,42,0.72)", color: "#fff", cursor: "pointer",
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}

                  {/* Bouton d'ajout — masqué une fois la limite atteinte */}
                  {form.photos.length + pendingPhotos.length < MAX_PHOTOS && (
                    <label
                      style={{
                        width: 92, height: 92, borderRadius: 10, flexShrink: 0,
                        border: "2px dashed #c7d2fe", backgroundColor: "#eef2ff",
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", gap: 4, color: "#4f46e5", fontSize: 11,
                        cursor: uploadingPhotos ? "not-allowed" : "pointer",
                        opacity: uploadingPhotos ? 0.6 : 1,
                      }}
                    >
                      {uploadingPhotos ? (
                        "Envoi…"
                      ) : (
                        <>
                          <PlusIcon />
                          Ajouter
                        </>
                      )}
                      <input
                        type="file"
                        accept={ALLOWED_PHOTO_TYPES.join(",")}
                        multiple
                        disabled={uploadingPhotos}
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (editingRecipe) {
                            handleUploadPhotosNow(e.target.files);
                          } else {
                            handleSelectPhotos(e.target.files);
                          }
                          // Sans ça, resélectionner le même fichier après l'avoir
                          // retiré ne redéclencherait pas onChange (même valeur).
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>

                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                  JPEG, PNG, WebP ou GIF — 5 Mo max par photo, {MAX_PHOTOS} photos max.
                  {!editingRecipe && " Envoyées juste après la création de la recette."}
                </p>
              </div>

              {/* ─── SECTION : Étapes ─── */}
              <SectionTitle>
                Étapes de préparation
                <span
                  style={{ marginLeft: 8, fontSize: 12, color: "#94a3b8", fontWeight: 400 }}
                >
                  {form.steps.length} étape{form.steps.length !== 1 ? "s" : ""}
                </span>
              </SectionTitle>

              {form.steps.length === 0 && (
                <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
                  Aucune étape ajoutée.
                </p>
              )}

              {form.steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "0.625rem",
                    alignItems: "flex-start",
                    padding: "10px 12px",
                    background: "#f8fafc",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {/* Index — lecture seule en création, éditable en update */}
                  <div style={{ flexShrink: 0 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "#94a3b8",
                        marginBottom: 4,
                      }}
                    >
                      Ordre
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      style={{ width: 56, textAlign: "center", padding: "6px 8px" }}
                      value={step.index}
                      min={1}
                      // En création : index auto, on laisse quand même l'éditer pour
                      // que l'admin puisse réordonner avant de sauvegarder.
                      // En update : index librement modifiable (demande métier).
                      onChange={(e) =>
                        updateStep(i, "index", Number(e.target.value))
                      }
                    />
                  </div>

                  {/* Description */}
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "#94a3b8",
                        marginBottom: 4,
                      }}
                    >
                      Description *
                    </label>
                    <textarea
                      className="input-field"
                      value={step.description}
                      onChange={(e) =>
                        updateStep(i, "description", e.target.value)
                      }
                      rows={2}
                      placeholder={`Étape ${step.index}…`}
                      style={{ resize: "vertical" }}
                      required
                    />
                  </div>

                  {/* Bouton supprimer */}
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    style={{
                      marginTop: 20,
                      color: "#e11d48",
                      cursor: "pointer",
                      flexShrink: 0,
                      padding: "4px",
                    }}
                    title="Supprimer cette étape"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addStep}
                style={{
                  width: "100%",
                  padding: "9px 0",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#4f46e5",
                  border: "1px dashed #c7d2fe",
                  background: "#eef2ff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <PlusIcon /> Ajouter une étape
              </button>

              {/* ─── SECTION : Ingrédients ─── */}
              <SectionTitle>
                Ingrédients
                <span
                  style={{ marginLeft: 8, fontSize: 12, color: "#94a3b8", fontWeight: 400 }}
                >
                  {form.ingredients.length} sélectionné
                  {form.ingredients.length !== 1 ? "s" : ""}
                </span>
              </SectionTitle>

              {loadingIngredients ? (
                <p style={{ fontSize: 13, color: "#94a3b8" }}>
                  Chargement des ingrédients…
                </p>
              ) : (
                <IngredientSearch
                  allIngredients={allIngredients}
                  selectedIds={selectedIngredientIds}
                  onSelect={addIngredient}
                />
              )}

              {/* Liste des ingrédients sélectionnés */}
              {form.ingredients.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    marginTop: 4,
                  }}
                >
                  {form.ingredients.map((ing, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "8px 12px",
                        background: "#f8fafc",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {/* Label de l'ingrédient — lecture seule */}
                      <span
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#0f172a",
                        }}
                      >
                        {ing.label}
                      </span>

                      {/* Unité — lecture seule, vient du référentiel */}
                      {ing.unit && (
                        <span
                          style={{
                            fontSize: 12,
                            color: "#94a3b8",
                            flexShrink: 0,
                            minWidth: 32,
                          }}
                        >
                          {ing.unit}
                        </span>
                      )}

                      {/* Quantité — éditable */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <label
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Qté
                        </label>
                        <input
                          type="number"
                          className="input-field"
                          style={{ width: 72, padding: "5px 8px", textAlign: "center" }}
                          value={ing.amount}
                          min={1}
                          onChange={(e) =>
                            updateIngredientAmount(i, Number(e.target.value))
                          }
                          required
                        />
                      </div>

                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={() => removeIngredient(i)}
                        style={{ color: "#e11d48", cursor: "pointer", flexShrink: 0 }}
                        title="Retirer cet ingrédient"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
                </>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="secondary"
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={isSubmitting}
                disabled={isLoadingRecipe || isSubmitting}
              >
                {isEditing ? "Enregistrer" : "Créer"}
              </Button>
            </Modal.Footer>
          </form>
        </Modal>
      )}

      {/* ── Modale confirmation suppression ── */}
      {deleteConfirm !== null && (
        <Modal onClose={() => setDeleteConfirm(null)} maxWidth={380}>
          <Modal.Header
            title="Confirmer la suppression"
            onClose={() => setDeleteConfirm(null)}
          />
          <Modal.Body>
            <p style={{ fontSize: "0.875rem", color: "#374151" }}>
              Cette recette sera définitivement supprimée, ainsi que toutes ses
              étapes et ses associations d'ingrédients. Cette action est
              irréversible.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirm(null)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(deleteConfirm)}
            >
              Supprimer
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

// ── Composants utilitaires locaux ─────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "#64748b",
        marginTop: 8,
        paddingBottom: 6,
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      {children}
    </p>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}