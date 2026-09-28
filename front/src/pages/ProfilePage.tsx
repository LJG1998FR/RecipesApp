import { useState } from "react";
import { useUser } from "../context/UserContext";
import { logout, updateUser, deleteCurrentUser } from "../api";  // ← à ajouter dans api/index.ts
import Loading from '../components/layout/Loading';

// ... (ReadonlyField et PwdField inchangés)

export default function ProfilePage() {
  const { user, setUser } = useUser();

  const [editingPassword,  setEditingPassword]  = useState(false);
  const [currentPwd,       setCurrentPwd]       = useState("");
  const [newPwd,           setNewPwd]           = useState("");
  const [confirmPwd,       setConfirmPwd]       = useState("");
  const [showCurrent,      setShowCurrent]      = useState(false);
  const [showNew,          setShowNew]          = useState(false);
  const [saved,            setSaved]            = useState(false);
  const [error,            setError]            = useState("");

  // ── Nouvel état pour la confirmation de suppression ────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading,     setDeleteLoading]     = useState(false);

  const handleSave = async () => {
    setError("");
    if (!currentPwd)           return setError("Entrez votre mot de passe actuel.");
    if (newPwd.length < 8)     return setError("Le nouveau mot de passe doit faire au moins 8 caractères.");
    if (newPwd !== confirmPwd) return setError("Les mots de passe ne correspondent pas.");

    try {
      await updateUser(user.email, newPwd);
      setSaved(true);
      setEditingPassword(false);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
    }
  };

  // ── Suppression du compte ──────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteCurrentUser(user.id);
      // On déconnecte proprement après suppression
      await logout();
      setUser(null);
      window.location.href = "/";
    } catch {
      setError("Impossible de supprimer le compte. Veuillez réessayer.");
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) return <Loading />;

  return (
    <div style={{
      fontFamily: "var(--font-body)",
      backgroundColor: "var(--color-background)",
      minHeight: "100dvh",
      overflowY: "auto",
      paddingBottom: 100,
    }}>

      {/* ... avatar, informations, section sécurité inchangés ... */}

      <div style={{ padding: "0 20px" }}>

        {/* ... tous les champs existants inchangés ... */}

        {/* ── Déconnexion ── */}
        <button
          style={{
            width: "100%", padding: "15px 0", borderRadius: 16,
            fontSize: 14, fontWeight: 600,
            backgroundColor: "rgba(180,50,50,0.15)", color: "#e07070",
            border: "1px solid rgba(180,50,50,0.25)", cursor: "pointer",
            marginBottom: 12,
          }}
          onClick={handleLogout}
        >
          Se déconnecter
        </button>

        {/* ── Suppression du compte ── */}
        {!showDeleteConfirm ? (
          <button
            style={{
              width: "100%", padding: "15px 0", borderRadius: 16,
              fontSize: 14, fontWeight: 500,
              backgroundColor: "transparent", color: "var(--color-text-dim)",
              border: "1px solid var(--color-border)", cursor: "pointer",
            }}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Supprimer mon compte
          </button>
        ) : (
          /* Confirmation inline — évite une modale pour une action aussi destructrice */
          <div style={{
            padding: 16, borderRadius: 16,
            backgroundColor: "rgba(180,50,50,0.08)",
            border: "1px solid rgba(180,50,50,0.25)",
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#e07070", marginBottom: 6 }}>
              ⚠️ Supprimer définitivement votre compte ?
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
              Cette action est irréversible. Toutes vos données seront perdues.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  fontSize: 14, fontWeight: 600,
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-border)", cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  fontSize: 14, fontWeight: 600,
                  backgroundColor: "#e07070", color: "#fff",
                  cursor: deleteLoading ? "not-allowed" : "pointer",
                  opacity: deleteLoading ? 0.7 : 1,
                }}
              >
                {deleteLoading ? "Suppression…" : "Confirmer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}