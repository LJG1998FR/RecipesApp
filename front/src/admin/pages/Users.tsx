// ─────────────────────────────────────────────────────────────────────────────
// src/admin/pages/Users.tsx
//
// Gestion des utilisateurs : liste + création + édition + suppression.
//
// PATTERN : "controlled form" — chaque champ du formulaire est un état React.
// La modale est partagée pour création ET édition (editingUser null = création).
//
// CORRECTIFS vs version précédente :
//   1. `columns` mémoïsé avec useMemo → ne se recrée QUE si openEdit/setDeleteConfirm changent
//   2. `openEdit`, `openCreate`, `closeModal`, `handleSubmit` wrappés dans useCallback
//      → leurs références restent stables entre les renders
//   3. Ces deux points combinés empêchent la Table de se re-render inutilement
//      quand le composant parent déclenche un render (ex: setState dans AdminApp)
//
// POURQUOI ce n'était pas correct avant ?
//   - `columns` était un tableau littéral défini DANS le corps du composant.
//   - À chaque render de Users, React crée un NOUVEAU tableau en mémoire.
//   - La Table reçoit donc toujours des nouvelles "columns" → elle re-render entièrement.
//   - useMemo(() => [...], [deps]) dit à React : "ne recrée ce tableau que si les
//     dépendances [deps] ont changé". Entre deux renders sans changement de deps,
//     c'est la même référence mémoire → la Table ne re-render pas.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from "react";
import type { User, UserRole } from "../types";
import Table, { type Column } from "../components/ui/Table";
import { RoleBadge } from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import { formatDate } from "./Overview";
import { createUser, updateUser, updateUserAsAdmin } from "../../api";

interface UsersProps {
  users: User[];
  onAdd:    (u: Omit<User, "id" | "createdAt">) => void;
  onUpdate: (u: User) => void;
  onDelete: (id: number) => void;
}

// ── Valeurs par défaut du formulaire ──────────────────────────────────────────
// Défini EN DEHORS du composant : c'est un objet constant, pas besoin de le
// recréer à chaque render. Ça évite aussi de le mettre dans les dépendances de useMemo.
const EMPTY_FORM = {
  firstName: "",
  lastName:  "",
  email:     "",
  password:  "",
  role:      "ROLE_USER",
};

export default function Users({ users, onAdd, onUpdate, onDelete }: UsersProps) {
  // null  = modale fermée
  // User  = on édite cet utilisateur
  // false = on crée un nouvel utilisateur
  const [editingUser,   setEditingUser]   = useState<User | null | false>(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // ── Ouverture modale ───────────────────────────────────────────────────────
  // useCallback : la référence de openCreate ne change jamais (deps = [])
  // → le bouton "Ajouter" ne force pas un re-render de la Table
  const openCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingUser(false);
  }, []);

  // useCallback avec []: openEdit capture setForm et setEditingUser qui sont
  // des setters stables fournis par React (leur référence ne change jamais).
  const openEdit = useCallback((user: User) => {
    setForm({
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email,
      password:  user.password,
      role:      user.role,
    });
    setEditingUser(user);
  }, []);

  const closeModal = useCallback(() => {
    setEditingUser(null);
  }, []);

  // ── Soumission formulaire ──────────────────────────────────────────────────
  // Note : handleSubmit dépend de editingUser, onUpdate, onAdd et closeModal.
  // React compare ces valeurs entre chaque render pour décider si la fonction
  // doit être recrée.

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      await updateUserAsAdmin({ ...editingUser, ...form });
      onUpdate({ ...editingUser, ...form });
    } else {
      await createUser(form);
      onAdd(form);
    }
    closeModal();
  }, [editingUser, form, onUpdate, onAdd, closeModal]);

  // ── Mise à jour d'un champ du formulaire ───────────────────────────────────
  // Typage générique : keyof typeof EMPTY_FORM assure qu'on ne peut passer
  // qu'une clé valide du formulaire (firstName, lastName, etc.)
  const setField = useCallback(<K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, [])

  // ── Définition des colonnes ────────────────────────────────────────────────
  // useMemo : React ne recrée ce tableau QUE si openEdit ou setDeleteConfirm changent.
  // Or openEdit est stable (useCallback []), et setDeleteConfirm est un setter React
  // (toujours stable) → en pratique, columns n'est JAMAIS recréé inutilement.
  //
  // Sans useMemo, columns était un nouveau tableau à chaque render → la Table
  // recevait toujours de nouvelles props → re-render complet à chaque interaction.
  const columns: Column<User>[] = useMemo(() => [
    {
      header: "Nom",
      render: (u) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: "50%",
              backgroundColor: "#eef2ff", color: "#4f46e5",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
            }}
          >
            {u.firstName.charAt(0)}
          </div>
          <div>
            <p style={{ fontWeight: 500, color: "#0f172a", fontSize: "0.875rem" }}>
              {u.firstName} {u.lastName}
            </p>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Rôle",
      width: "120px",
      render: (u) => <RoleBadge role={u.role as UserRole} />,
    },
    {
      header: "Créé le",
      width: "110px",
      render: (u) => <span style={{ color: "#94a3b8" }}>{formatDate(u.createdAt)}</span>,
    },
    {
      header: "Actions",
      width: "140px",
      render: (u) => (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            variant="secondary"
            onClick={() => openEdit(u)}
            style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}
          >
            Modifier
          </Button>
          <Button variant="danger" onClick={() => setDeleteConfirm(u.id)}>
            Supprimer
          </Button>
        </div>
      ),
    },
  ], [openEdit]); // setDeleteConfirm est stable (setter React) → pas besoin de le lister

  const isModalOpen = editingUser !== null;

  return (
    <div style={{ padding: "2rem" }}>

      {/* ── En-tête de page ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>Utilisateurs</h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
            {users.length} utilisateur{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} leftIcon={<PlusIcon />}>
          Ajouter
        </Button>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.75rem", overflow: "hidden" }}>
        <Table
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          emptyState="Aucun utilisateur pour le moment."
        />
      </div>

      {/* ── Modale création / édition ── */}
      {isModalOpen && (
        <Modal onClose={closeModal} maxWidth={460}>
          <Modal.Header
            title={editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            onClose={closeModal}
          />
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Prénom</label>
                  <input
                    className="input-field"
                    value={form.firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                    required
                    placeholder="Marie"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom</label>
                  <input
                    className="input-field"
                    value={form.lastName}
                    onChange={(e) => setField("lastName", e.target.value)}
                    required
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  required
                  placeholder="marie@saveurs.fr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mot de passe{" "}
                  {editingUser && (
                    <span style={{ color: "#94a3b8", fontWeight: 400 }}>
                      (laisser vide pour ne pas changer)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  required={!editingUser}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rôle</label>
                <select
                  className="input-field"
                  value={form.role}
                  onChange={(e) => setField("role", e.target.value)}
                >
                  <option value="ROLE_SUPER_ADMIN">Super Admin</option>
                  <option value="ROLE_ADMIN">Admin</option>
                  <option value="ROLE_USER">Utilisateur</option>
                </select>
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" type="button" onClick={closeModal}>Annuler</Button>
              <Button variant="primary" type="submit">
                {editingUser ? "Enregistrer" : "Créer"}
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
              Cette action est irréversible. L'utilisateur sera définitivement supprimé.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button
              variant="danger"
              onClick={() => { onDelete(deleteConfirm); setDeleteConfirm(null); }}
            >
              Supprimer
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

// ── Icône locale ──────────────────────────────────────────────────────────────
// Définie hors du composant : ne se recrée pas à chaque render de Users.
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}