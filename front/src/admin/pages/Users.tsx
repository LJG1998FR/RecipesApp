import { useState } from "react";
import type { User, UserRole } from "../types";
import Table, { type Column } from "../components/ui/Table";
import { RoleBadge } from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";
import { formatDate } from "./Overview";
import { createUser, updateUser } from "../../api";

interface UsersProps {
  users:        User[];
  currentUserId: number;    // ← nouveau : ID de l'utilisateur connecté
  onAdd:        (u: Omit<User, "id" | "createdAt">) => void;
  onUpdate:     (u: User) => void;
  onDelete:     (id: number) => void;
}

const EMPTY_FORM = {
  firstName: "",
  lastName:  "",
  email:     "",
  password:  "",
  role:      "ROLE_USER" as string,
};

export default function Users({ users, currentUserId, onAdd, onUpdate, onDelete }: UsersProps) {
  const [editingUser,   setEditingUser]   = useState<User | null | false>(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Détermine si l'utilisateur en cours d'édition est soi-même
  const isEditingSelf = editingUser && (editingUser as User).id === currentUserId;

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingUser(false);
  }

  function openEdit(user: User) {
    setForm({
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email,
      password:  "",
      role:      user.role,
    });
    setEditingUser(user);
  }

  function closeModal() { setEditingUser(null); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingUser) {
      await updateUser({ ...editingUser, ...form });
      onUpdate({ ...editingUser, ...form });
    } else {
      await createUser(form);
      onAdd(form);
    }
    closeModal();
  }

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const columns: Column<User>[] = [
    {
      header: "Nom",
      render: (u) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            backgroundColor: u.id === currentUserId ? "#dbeafe" : "#eef2ff",
            color: u.id === currentUserId ? "#2563eb" : "#4f46e5",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
          }}>
            {u.firstName.charAt(0)}
          </div>
          <div>
            <p style={{ fontWeight: 500, color: "#0f172a", fontSize: "0.875rem" }}>
              {u.firstName} {u.lastName}
              {/* Indicateur visuel "c'est vous" */}
              {u.id === currentUserId && (
                <span style={{ marginLeft: 6, fontSize: 11, color: "#64748b", fontWeight: 400 }}>
                  (vous)
                </span>
              )}
            </p>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Rôle",
      width: "140px",
      render: (u) => <RoleBadge role={u.role as UserRole} />,
    },
    {
      header: "Créé le",
      width: "110px",
      render: (u) => <span style={{ color: "#94a3b8" }}>{formatDate(u.createdAt)}</span>,
    },
    {
      header: "Actions",
      width: "160px",
      render: (u) => (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            variant="secondary"
            onClick={() => openEdit(u)}
            style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}
          >
            Modifier
          </Button>
          {/* On ne peut pas se supprimer soi-même */}
          {u.id !== currentUserId && (
            <Button variant="danger" onClick={() => setDeleteConfirm(u.id)}>
              Supprimer
            </Button>
          )}
        </div>
      ),
    },
  ];

  const isModalOpen = editingUser !== null;

  return (
    <div style={{ padding: "2rem" }}>
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
                  <input className="input-field" value={form.firstName} onChange={e => setField("firstName", e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom</label>
                  <input className="input-field" value={form.lastName} onChange={e => setField("lastName", e.target.value)} required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={e => setField("email", e.target.value)} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mot de passe{" "}
                  {editingUser && <span style={{ color: "#94a3b8", fontWeight: 400 }}>(laisser vide pour conserver)</span>}
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={form.password}
                  onChange={e => setField("password", e.target.value)}
                  required={!editingUser}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  Rôle
                  {/* Avertissement visible si l'admin édite son propre profil */}
                  {isEditingSelf && (
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 99,
                      backgroundColor: "#fef9c3", color: "#854d0e",
                      border: "1px solid #fde047",
                    }}>
                      🔒 Non modifiable (votre propre compte)
                    </span>
                  )}
                </label>
                <select
                  className="input-field"
                  value={form.role}
                  onChange={e => setField("role", e.target.value)}
                  disabled={!!isEditingSelf}   // ← désactivé si on édite son propre compte
                  style={{
                    opacity: isEditingSelf ? 0.5 : 1,
                    cursor:  isEditingSelf ? "not-allowed" : "pointer",
                  }}
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