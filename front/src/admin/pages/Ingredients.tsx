// ─────────────────────────────────────────────────────────────────────────────
// src/admin/pages/Ingredients.tsx
//
// Gestion du référentiel ingrédients : liste + recherche + création + édition
// + suppression avec garde-fou si l'ingrédient est utilisé dans des recettes.
//
// PATTERN REPRIS DE Recipes.tsx / Users.tsx :
//   - Table générique typée <Ingredient>
//   - Modal compound component pour création/édition
//   - Modal de confirmation pour la suppression
//   - Filtre local (search) sur les données déjà chargées côté client
//
// NOTE JUNIOR — Pourquoi un garde-fou côté UI pour la suppression ?
//   Le backend renvoie HTTP 409 si l'ingrédient est utilisé (usedInRecipesCount > 0).
//   Mais attendre la réponse du serveur pour afficher une erreur, c'est une
//   mauvaise UX : l'utilisateur a cliqué, attendu, et reçu une erreur.
//   Ici on lit usedInRecipesCount dès l'affichage et on désactive le bouton
//   "Supprimer" proactivement. L'erreur API reste un filet de sécurité.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import type { Ingredient } from "../types";
import Table, { type Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";

// Unités disponibles — cohérent avec le front public (front/src/types/index.ts)
const UNITS = [
  "", // aucune unité
  "g", "kg", "ml", "L", "cl",
  "c.s.", "c.c.",
  "unité(s)", "pincée(s)", "tranche(s)", "botte(s)",
];

interface IngredientsProps {
  ingredients: Ingredient[];
  onAdd:    (i: Omit<Ingredient, "id" | "usedInRecipesCount">) => Promise<void>;
  onUpdate: (i: Ingredient) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const EMPTY_FORM = {
  label: "",
  unit: "" as string | null,
};

export default function Ingredients({ ingredients, onAdd, onUpdate, onDelete }: IngredientsProps) {
  // null  = modale fermée
  // Ingredient = édition
  // false = création
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null | false>(null);
  const [form,              setForm]              = useState(EMPTY_FORM);
  const [deleteConfirm,     setDeleteConfirm]     = useState<Ingredient | null>(null);
  const [search,            setSearch]            = useState("");
  const [isSubmitting,      setIsSubmitting]      = useState(false);
  const [submitError,       setSubmitError]       = useState("");

  // ── Filtre local ───────────────────────────────────────────────────────────
  const filtered = ingredients.filter((i) =>
    search === "" || i.label.toLowerCase().includes(search.toLowerCase())
  );

  // ── Ouverture modale ───────────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM);
    setSubmitError("");
    setEditingIngredient(false);
  }

  function openEdit(ingredient: Ingredient) {
    setForm({
      label: ingredient.label,
      unit:  ingredient.unit ?? "",
    });
    setSubmitError("");
    setEditingIngredient(ingredient);
  }

  function closeModal() {
    setEditingIngredient(null);
    setSubmitError("");
  }

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── Soumission formulaire ──────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    // Validation minimale côté front (doublonne la validation Symfony)
    if (!form.label.trim()) {
      setSubmitError("Le nom de l'ingrédient est requis.");
      return;
    }

    const payload = {
      label: form.label.trim(),
      unit:  form.unit?.trim() || null, // chaîne vide → null
    };

    setIsSubmitting(true);
    try {
      if (editingIngredient) {
        await onUpdate({ ...editingIngredient, ...payload });
      } else {
        await onAdd(payload);
      }
      closeModal();
    } catch (err: unknown) {
      // L'erreur remonte de AdminApp via la couche API
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Suppression ────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err: unknown) {
      // En cas d'erreur inattendue du serveur, on ferme quand même la modale
      // et l'AdminApp rechargera les données
      setDeleteConfirm(null);
    }
  }

  // ── Colonnes de la table ───────────────────────────────────────────────────
  const columns: Column<Ingredient>[] = [
    {
      header: "Nom",
      render: (i) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          {/* Pastille verte cohérente avec la charte "ingrédient naturel" */}
          <div style={{
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
            backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <LeafIcon />
          </div>
          <span style={{ fontWeight: 500, color: "#0f172a", fontSize: "0.875rem" }}>
            {i.label}
          </span>
        </div>
      ),
    },
    {
      header: "Unité",
      width: "100px",
      render: (i) =>
        i.unit ? (
          <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "2px 10px", borderRadius: 9999,
            fontSize: 12, fontWeight: 500,
            backgroundColor: "#eff6ff", color: "#3b82f6",
            border: "1px solid #bfdbfe",
          }}>
            {i.unit}
          </span>
        ) : (
          <span style={{ color: "#cbd5e1", fontSize: "0.8125rem" }}>—</span>
        ),
    },
    {
      header: "Utilisé dans",
      width: "130px",
      render: (i) => (
        <span style={{
          fontSize: "0.875rem",
          color: i.usedInRecipesCount > 0 ? "#64748b" : "#cbd5e1",
        }}>
          {i.usedInRecipesCount > 0
            ? `${i.usedInRecipesCount} recette${i.usedInRecipesCount > 1 ? "s" : ""}`
            : "Non utilisé"}
        </span>
      ),
    },
    {
      header: "Actions",
      width: "160px",
      render: (i) => (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            variant="secondary"
            onClick={() => openEdit(i)}
            style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}
          >
            Modifier
          </Button>
          {/*
            On désactive le bouton si l'ingrédient est utilisé dans des recettes.
            Le title HTML donne un feedback au survol (accessibilité + UX).
          */}
          <Button
            variant="danger"
            onClick={() => setDeleteConfirm(i)}
            disabled={i.usedInRecipesCount > 0}
            title={
              i.usedInRecipesCount > 0
                ? `Utilisé dans ${i.usedInRecipesCount} recette(s) — retirez-le d'abord`
                : "Supprimer cet ingrédient"
            }
          >
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  const isModalOpen = editingIngredient !== null;

  return (
    <div style={{ padding: "2rem" }}>

      {/* ── En-tête de page ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>Ingrédients</h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
            {ingredients.length} ingrédient{ingredients.length !== 1 ? "s" : ""} au total
            {search && filtered.length !== ingredients.length
              ? ` · ${filtered.length} affiché${filtered.length !== 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} leftIcon={<PlusIcon />}>
          Ajouter
        </Button>
      </div>

      {/* ── Barre de recherche ── */}
      <div style={{ marginBottom: "1.25rem" }}>
        <input
          className="input-field"
          style={{ maxWidth: 280 }}
          placeholder="Rechercher un ingrédient…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Table ── */}
      <div style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "0.75rem",
        overflow: "hidden",
      }}>
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(i) => i.id}
          emptyState={
            search
              ? `Aucun ingrédient ne correspond à "${search}".`
              : "Aucun ingrédient pour le moment. Commencez par en ajouter un !"
          }
        />
      </div>

      {/* ── Modale création / édition ── */}
      {isModalOpen && (
        <Modal onClose={closeModal} maxWidth={420}>
          <Modal.Header
            title={editingIngredient ? "Modifier l'ingrédient" : "Nouvel ingrédient"}
            onClose={closeModal}
          />
          <form onSubmit={handleSubmit}>
            <Modal.Body>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom <span style={{ color: "#e11d48" }}>*</span>
                </label>
                <input
                  className="input-field"
                  value={form.label}
                  onChange={(e) => setField("label", e.target.value)}
                  placeholder="ex. Farine de blé"
                  required
                  autoFocus
                />
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.375rem" }}>
                  Doit être unique. La casse est significative ("Ail" ≠ "ail" côté serveur).
                </p>
              </div>

              {/* Unité */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Unité <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optionnel)</span>
                </label>
                {/*
                  On utilise un <select> pour contraindre les valeurs possibles
                  et rester cohérent avec les unités du front public (types/index.ts).
                  Alternative : <input> libre si on veut plus de flexibilité.
                */}
                <select
                  className="input-field"
                  value={form.unit ?? ""}
                  onChange={(e) => setField("unit", e.target.value)}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u === "" ? "Aucune unité" : u}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.375rem" }}>
                  Laissez vide pour les ingrédients comptables (ex. 3 œufs).
                </p>
              </div>

              {/* Erreur API ou validation front */}
              {submitError && (
                <div style={{
                  padding: "0.625rem 0.875rem",
                  borderRadius: "0.375rem",
                  backgroundColor: "#fff1f2",
                  border: "1px solid #fecdd3",
                  color: "#e11d48",
                  fontSize: "0.875rem",
                }}>
                  {submitError}
                </div>
              )}

            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" type="button" onClick={closeModal} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button variant="primary" type="submit" loading={isSubmitting}>
                {editingIngredient ? "Enregistrer" : "Créer"}
              </Button>
            </Modal.Footer>
          </form>
        </Modal>
      )}

      {/* ── Modale confirmation suppression ── */}
      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)} maxWidth={380}>
          <Modal.Header
            title="Confirmer la suppression"
            onClose={() => setDeleteConfirm(null)}
          />
          <Modal.Body>
            <p style={{ fontSize: "0.875rem", color: "#374151" }}>
              Vous êtes sur le point de supprimer{" "}
              <strong style={{ color: "#0f172a" }}>"{deleteConfirm.label}"</strong>.
              Cette action est irréversible.
            </p>
            {/* Double sécurité : afficher le compteur même dans la modale */}
            {deleteConfirm.usedInRecipesCount > 0 && (
              <div style={{
                padding: "0.625rem 0.875rem",
                borderRadius: "0.375rem",
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#d97706",
                fontSize: "0.875rem",
              }}>
                ⚠️ Cet ingrédient est utilisé dans {deleteConfirm.usedInRecipesCount} recette(s).
                Retirez-le d'abord de toutes les recettes.
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleteConfirm.usedInRecipesCount > 0}
            >
              Supprimer
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

// ── Icônes locales ────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12" />
      <path d="M12 12C12 12 7 9 7 5a5 5 0 0 1 10 0c0 4-5 7-5 7z" />
    </svg>
  );
}
