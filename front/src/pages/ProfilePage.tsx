import { useState } from "react";
import { getInitials, useUser } from "../context/UserContext";
import { logout, updateUser, deleteCurrentUser } from "../api";
import Loading from '../components/layout/Loading';
import { LockIcon, EyeIcon, CheckIcon, ChevronLeft } from "../components/icons";
import { formatMemberSince } from "./AuthPage";
import { useTranslation } from "@/context/LocaleContext";
import { isPasswordValid } from "@/utils/passwordPolicy";
import PasswordRequirements from "@/components/form/PasswordRequirements";
import { ApiValidationError } from "@/api/errors";

// ── Champ lecture seule ────────────────────────────────────────────────────
const ReadonlyField = ({ label, value, readonlyBadge }: { label: string; value: string; readonlyBadge: string }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>
      {label}
    </label>
    <div
      style={{
        display: "flex", alignItems: "center",
        padding: "13px 16px", borderRadius: 14,
        backgroundColor: "var(--color-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <span style={{ fontSize: 14, color: "var(--color-text)", flex: 1 }}>{value}</span>
      <span
        style={{
          fontSize: 12, color: "var(--color-text-dim)",
          backgroundColor: "rgba(255,255,255,0.05)",
          padding: "3px 10px", borderRadius: 99,
          border: "1px solid var(--color-border)",
          whiteSpace: "nowrap",
        }}
      >
        {readonlyBadge}
      </span>
    </div>
  </div>
);

// ── Champ mot de passe ─────────────────────────────────────────────────────
const PwdField = ({
  label, value, onChange, show, onToggle, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; placeholder: string;
}) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 6 }}>
      {label}
    </label>
    <div
      style={{
        display: "flex", alignItems: "center",
        padding: "0 14px", height: 48, borderRadius: 12,
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <span style={{ color: "var(--color-text-dim)", marginRight: 10, flexShrink: 0 }}><LockIcon /></span>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, background: "transparent", border: "none", outline: "none",
          fontSize: 14, color: "var(--color-text)", caretColor: "var(--color-primary)",
        }}
      />
      <button onClick={onToggle} style={{ color: "var(--color-text-dim)", flexShrink: 0, marginLeft: 8 }}>
        <EyeIcon off={!show} />
      </button>
    </div>
  </div>
);

interface Props {
  /**
   * Ouvre MyRecipesPage, en plein écran, au-dessus de tout (même mécanisme
   * que AppRouter utilise pour RecipeDetailPage via `view === "detail"`).
   * ProfilePage ne sait PAS comment la navigation est faite derrière — elle
   * se contente d'appeler ce callback, exactement comme RecipeDetailPage le
   * fait déjà avec `onEdit`. Çà évite de coupler ce composant à AppRouter.
   */
  onOpenMyRecipes: () => void;
}

export default function ProfilePage({ onOpenMyRecipes }: Props) {
  const { user, setUser } = useUser();
  const { t } = useTranslation();

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
    if (!currentPwd)           return setError(t("profile.error_current_password_required"));
    //if (newPwd.length < 8)     return setError(t("profile.error_new_password_too_short"));
    if (!isPasswordValid(newPwd)) return setError(t("common.errors.password.invalid"));
    if (newPwd !== confirmPwd) return setError(t("profile.error_passwords_mismatch"));

    try {
      await updateUser({user});
      setSaved(true);
      setEditingPassword(false);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => setSaved(false), 3000);
    } catch(err) {
      if (err instanceof ApiValidationError && err.errors.password) {
        setError(err.errors.password.map((code) => t(`common.errors.password.${code}`, { min: 16 })).join(" "));
      } else {
        setError(t("auth.login.error_invalid_credentials"));
      }
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

      {/* ── Avatar + nom ── */}
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 90, paddingBottom: 28,
        }}
      >
        <div
          style={{
            width: 80, height: 80, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "var(--color-primary)",
            color: "#171210",
            fontFamily: "var(--font-display)",
            fontSize: 28, fontWeight: 700,
            marginBottom: 14,
          }}
        >
          {getInitials(user)}
        </div>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20, fontWeight: 700,
            color: "var(--color-text)",
            marginBottom: 4,
          }}
        >
          {user.firstName} {user.lastName}
        </p>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          {t("profile.member_since", { date: formatMemberSince(user.memberSince) })}
        </p>
      </div>

      <div style={{ padding: "0 20px" }}>

        {/* ── Mes recettes ──────────────────────────────────────────────────────
            Volontairement AVANT "Informations" : c'est l'action la plus probable
            pour quelqu'un qui publie des recettes, autant la mettre en avant
            plutôt que de la noyer en bas de page. */}
        <button
          onClick={onOpenMyRecipes}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 18px", borderRadius: 16, marginBottom: 24,
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
            {t("profile.my_recipes_button")}
          </span>
          {/* Pas d'icône "chevron droit" dans le set actuel : on réutilise
              ChevronLeft pivoté à 180°, même trick déjà utilisé par
              ChevronDown ailleurs dans le code (rotation conditionnelle). */}
          <span style={{ color: "var(--color-text-dim)", display: "inline-flex", transform: "rotate(180deg)" }}>
            <ChevronLeft />
          </span>
        </button>

        {/* ── Section Informations ── */}
        <p
          style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--color-text-dim)", marginBottom: 14,
          }}
        >
          {t("profile.section_informations")}
        </p>
        <ReadonlyField label={t("profile.field_firstname")} value={user.firstName} readonlyBadge={t("profile.readonly_badge")} />
        <ReadonlyField label={t("profile.field_lastname")}  value={user.lastName}  readonlyBadge={t("profile.readonly_badge")} />
        <ReadonlyField label={t("profile.field_email")}     value={user.email}     readonlyBadge={t("profile.readonly_badge")} />

        {/* ── Section Sécurité ── */}
        <p
          style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--color-text-dim)",
            marginTop: 28, marginBottom: 14,
          }}
        >
          {t("profile.section_security")}
        </p>

        <label style={{ display: "block", fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>
          {t("profile.password_label")}
        </label>

        {!editingPassword ? (
          <div
            style={{
              display: "flex", alignItems: "center",
              padding: "13px 16px", borderRadius: 14,
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", gap: 5, alignItems: "center", flex: 1 }}>
              {[...Array(10)].map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 7, height: 7, borderRadius: "50%",
                    backgroundColor: "var(--color-text-muted)", display: "inline-block",
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setEditingPassword(true)}
              style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)", cursor: "pointer" }}
            >
              {t("profile.password_edit_button")}
            </button>
          </div>
        ) : (
          <div
            style={{
              borderRadius: 16, padding: 16,
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 14 }}>
              {t("profile.password_change_title")}
            </p>
            <PwdField
              label={t("profile.password_current_label")} value={currentPwd}
              onChange={setCurrentPwd} show={showCurrent}
              onToggle={() => setShowCurrent((s) => !s)} placeholder={t("profile.password_current_placeholder")}
            />
            <PwdField
              label={t("profile.password_new_label")} value={newPwd}
              onChange={setNewPwd} show={showNew}
              onToggle={() => setShowNew((s) => !s)} placeholder={t("profile.password_new_placeholder")}
            />
            <PasswordRequirements password={newPwd} />
            <div style={{ marginBottom: 4 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 6 }}>
                {t("profile.password_confirm_label")}
              </label>
              <div
                style={{
                  display: "flex", alignItems: "center",
                  padding: "0 14px", height: 48, borderRadius: 12,
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <span style={{ color: "var(--color-text-dim)", marginRight: 10 }}><LockIcon /></span>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder={t("profile.password_confirm_placeholder")}
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    fontSize: 14, color: "var(--color-text)", caretColor: "var(--color-primary)",
                  }}
                />
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 12, color: "#e07070", marginTop: 10, marginBottom: 4 }}>{error}</p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => {
                  setEditingPassword(false); setError("");
                  setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
                }}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  fontSize: 14, fontWeight: 600,
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-border)", cursor: "pointer",
                }}
              >
                {t("common.buttons.cancel")}
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  fontSize: 14, fontWeight: 600,
                  backgroundColor: "var(--color-primary)",
                  color: "#171210", cursor: "pointer",
                }}
              >
                {t("common.buttons.save")}
              </button>
            </div>
          </div>
        )}

        {saved && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 12, marginBottom: 16,
              backgroundColor: "rgba(168,200,122,0.12)",
              border: "1px solid rgba(168,200,122,0.3)",
            }}
          >
            <span style={{ color: "#a8c87a" }}><CheckIcon /></span>
            <p style={{ fontSize: 13, color: "#a8c87a", margin: 0 }}>
              {t("profile.success_password_updated")}
            </p>
          </div>
        )}

        {/* ── Déconnexion ── */}
        <button
          style={{
            width: "100%", padding: "15px 0", borderRadius: 16,
            fontSize: 14, fontWeight: 600,
            backgroundColor: "rgba(180,50,50,0.15)", color: "#e07070",
            border: "1px solid rgba(180,50,50,0.25)", cursor: "pointer",
          }}
          onClick={handleLogout}
        >
          {t("auth.logout.button")}
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
            {t("profile.delete_account_title")}
          </button>
        ) : (
          /* Confirmation inline — évite une modale pour une action aussi destructrice */
          <div style={{
            padding: 16, borderRadius: 16,
            backgroundColor: "rgba(180,50,50,0.08)",
            border: "1px solid rgba(180,50,50,0.25)",
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#e07070", marginBottom: 6 }}>
              {t("profile.delete_account_subtitle")}
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
              {t("profile.delete_account_warning")}
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
                {t("common.buttons.cancel")}
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