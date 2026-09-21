// ─────────────────────────────────────────────────────────────────────────────
// src/admin/pages/Recipes.tsx
//
// Gestion des recettes : liste filtrée + création + édition + suppression.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import type { Recipe, RecipeType, RecipeStatus } from "../types";
import Table, { type Column } from "../components/ui/Table";
import { StatusBadge } from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";

interface RecipesProps {
  recipes: Recipe[];
  onAdd:    (r: Omit<Recipe, "id" | "createdAt">) => void;
  onUpdate: (r: Recipe) => void;
  onDelete: (id: number) => void;
}

const RECIPE_TYPES: RecipeType[]   = ["Plats", "Desserts", "Mocktails"];
const RECIPE_STATUSES: RecipeStatus[] = ["published", "draft"];

const EMPTY_FORM = {
  title:    "",
  type:     "Plats"     as RecipeType,
  status:   "draft"     as RecipeStatus,
  prepTime: 10,
  authorId: "",
};

export default function Recipes({ recipes, onAdd, onUpdate, onDelete }: RecipesProps) {
  const [editingRecipe,  setEditingRecipe]  = useState<Recipe | null | false>(null);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [deleteConfirm,  setDeleteConfirm]  = useState<number | null>(null);

  // Filtre local (ne modifie pas les données, juste la vue)
  const [filterType,   setFilterType]   = useState<RecipeType | "Tous">("Tous");
  const [filterStatus, setFilterStatus] = useState<RecipeStatus | "Tous">("Tous");
  const [search,       setSearch]       = useState("");

  // ── Filtrage ───────────────────────────────────────────────────────────────
  const filtered = recipes.filter((r) => {
    if (filterType !== "Tous"   && r.type   !== filterType)   return false;
    if (filterStatus !== "Tous" && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Ouverture modale ───────────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingRecipe(false);
  }

  function openEdit(recipe: Recipe) {
    setForm({
      title:    recipe.title,
      type:     recipe.type,
      status:   recipe.status,
      prepTime: recipe.prepTime,
      authorId: recipe.authorId,
    });
    setEditingRecipe(recipe);
  }

  function closeModal() { setEditingRecipe(null); }

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingRecipe) {
      onUpdate({ ...editingRecipe, ...form });
    } else {
      onAdd(form);
    }
    closeModal();
  }

  // ── Colonnes ───────────────────────────────────────────────────────────────
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
      render: (r) => <span style={{ fontSize: "0.875rem", color: "#475569" }}>{r.type}</span>,
    },
    {
      header: "Statut",
      width: "110px",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: "Prépa.",
      width: "80px",
      render: (r) => <span style={{ color: "#94a3b8" }}>{r.prepTime} min</span>,
    },
    {
      header: "Créée le",
      width: "110px",
      render: (r) => <span style={{ color: "#94a3b8" }}>{r.createdAt}</span>,
    },
    {
      header: "Actions",
      width: "150px",
      render: (r) => (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button variant="secondary" onClick={() => openEdit(r)} style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}>
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

  return (
    <div style={{ padding: "2rem" }}>

      {/* ── En-tête ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>Recettes</h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
            {filtered.length} / {recipes.length} recette{recipes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} leftIcon={<PlusIcon />}>
          Ajouter
        </Button>
      </div>

      {/* ── Barre de filtres ── */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
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
          {RECIPE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          className="input-field"
          style={{ maxWidth: 160 }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as RecipeStatus | "Tous")}
        >
          <option value="Tous">Tous les statuts</option>
          <option value="published">Publiées</option>
          <option value="draft">Brouillons</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", overflow: "hidden" }}>
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(r) => r.id}
          emptyState="Aucune recette ne correspond aux filtres."
        />
      </div>

      {/* ── Modale création / édition ── */}
      {isModalOpen && (
        <Modal onClose={closeModal} maxWidth={460}>
          <Modal.Header
            title={editingRecipe ? "Modifier la recette" : "Nouvelle recette"}
            onClose={closeModal}
          />
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Titre</label>
                <input className="input-field" value={form.title} onChange={(e) => setField("title", e.target.value)} required placeholder="Nom de la recette" />
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                  <select className="input-field" value={form.type} onChange={(e) => setField("type", e.target.value as RecipeType)}>
                    {RECIPE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut</label>
                  <select className="input-field" value={form.status} onChange={(e) => setField("status", e.target.value as RecipeStatus)}>
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Temps de préparation (min)
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
            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" type="button" onClick={closeModal}>Annuler</Button>
              <Button variant="primary" type="submit">
                {editingRecipe ? "Enregistrer" : "Créer"}
              </Button>
            </Modal.Footer>
          </form>
        </Modal>
      )}

      {/* ── Modale confirmation suppression ── */}
      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)} maxWidth={380}>
          <Modal.Header title="Confirmer la suppression" onClose={() => setDeleteConfirm(null)} />
          <Modal.Body>
            <p style={{ fontSize: "0.875rem", color: "#374151" }}>
              Cette recette sera définitivement supprimée. Cette action est irréversible.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button variant="danger" onClick={() => { onDelete(deleteConfirm); setDeleteConfirm(null); }}>
              Supprimer
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
