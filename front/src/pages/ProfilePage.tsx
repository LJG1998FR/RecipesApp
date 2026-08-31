import { useState } from "react";
import { EyeIcon, LockIcon, CheckIcon } from "../components/icons";

export default function ProfilePage() {
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPwd,  setCurrentPwd]  = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState("");

  const handleSave = () => {
    setError("");
    if (!currentPwd)          return setError("Entrez votre mot de passe actuel.");
    if (newPwd.length < 8)    return setError("Le nouveau mot de passe doit faire au moins 8 caractères.");
    if (newPwd !== confirmPwd) return setError("Les mots de passe ne correspondent pas.");
    setSaved(true);
    setEditingPassword(false);
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setTimeout(() => setSaved(false), 3000);
  };

  // ── Champ lecture seule ──────────────────────────────────────────────────────
  const ReadonlyField = ({ label, value }: { label: string; value: string }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>
        {label}
      </label>
      <div
        style={{
          display: "flex", alignItems: "center",
          padding: "13px 16px",
          borderRadius: 14,
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <span style={{ fontSize: 14, color: "var(--color-text)", flex: 1 }}>{value}</span>
        <span
          style={{
            fontSize: 12,
            color: "var(--color-text-dim)",
            backgroundColor: "rgba(255,255,255,0.05)",
            padding: "3px 10px",
            borderRadius: 99,
            border: "1px solid var(--color-border)",
            whiteSpace: "nowrap",
          }}
        >
          Non modifiable
        </span>
      </div>
    </div>
  );

  // ── Champ mot de passe (input) ───────────────────────────────────────────────
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
          padding: "0 14px", height: 48,
          borderRadius: 12,
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <span style={{ color: "var(--color-text-dim)", marginRight: 10, flexShrink: 0 }}>
          <LockIcon />
        </span>
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

  return (
    <div
      style={{
        fontFamily: "var(--font-body)",
        backgroundColor: "var(--color-background)",
        minHeight: "100dvh",
        overflowY: "auto",
        paddingBottom: 100,
      }}
    >
      {/* ── Avatar + nom ── */}
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 52, paddingBottom: 28,
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
          M
        </div>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20, fontWeight: 700,
            color: "var(--color-text)",
            marginBottom: 4,
          }}
        >
          Marie Dupont
        </p>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          membre depuis août 2024
        </p>
      </div>

      <div style={{ padding: "0 20px" }}>
        {/* ── Section Informations ── */}
        <p
          style={{
            fontSize: 11, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--color-text-dim)",
            marginBottom: 14,
          }}
        >
          Informations
        </p>
        <ReadonlyField label="Prénom"          value="Marie" />
        <ReadonlyField label="Nom"             value="Dupont" />
        <ReadonlyField label="Adresse e-mail"  value="marie.dupont@example.com" />

        {/* ── Section Sécurité ── */}
        <p
          style={{
            fontSize: 11, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--color-text-dim)",
            marginTop: 28, marginBottom: 14,
          }}
        >
          Sécurité
        </p>

        <label style={{ display: "block", fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>
          Mot de passe
        </label>

        {!editingPassword ? (
          // Ligne mot de passe masqué + bouton Modifier
          <div
            style={{
              display: "flex", alignItems: "center",
              padding: "13px 16px",
              borderRadius: 14,
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
                    backgroundColor: "var(--color-text-muted)",
                    display: "inline-block",
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setEditingPassword(true)}
              style={{
                fontSize: 13, fontWeight: 600,
                color: "var(--color-primary)",
                cursor: "pointer",
              }}
            >
              Modifier
            </button>
          </div>
        ) : (
          // Formulaire changement mot de passe
          <div
            style={{
              borderRadius: 16, padding: 16,
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 14 }}>
              Changer le mot de passe
            </p>
            <PwdField
              label="Mot de passe actuel" value={currentPwd}
              onChange={setCurrentPwd} show={showCurrent}
              onToggle={() => setShowCurrent((s) => !s)} placeholder="••••••••"
            />
            <PwdField
              label="Nouveau mot de passe" value={newPwd}
              onChange={setNewPwd} show={showNew}
              onToggle={() => setShowNew((s) => !s)} placeholder="Min. 8 caractères"
            />
            <div style={{ marginBottom: 4 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 6 }}>
                Confirmer le mot de passe
              </label>
              <div
                style={{
                  display: "flex", alignItems: "center",
                  padding: "0 14px", height: 48,
                  borderRadius: 12,
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <span style={{ color: "var(--color-text-dim)", marginRight: 10 }}><LockIcon /></span>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Répétez le mot de passe"
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
                onClick={() => { setEditingPassword(false); setError(""); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); }}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  fontSize: 14, fontWeight: 600,
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-border)",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  fontSize: 14, fontWeight: 600,
                  backgroundColor: "var(--color-primary)",
                  color: "#171210",
                  cursor: "pointer",
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        )}

        {/* Confirmation sauvegarde */}
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
              Mot de passe mis à jour avec succès.
            </p>
          </div>
        )}

        {/* Bouton déconnexion */}
        <button
          style={{
            width: "100%",
            padding: "15px 0",
            borderRadius: 16,
            fontSize: 14, fontWeight: 600,
            backgroundColor: "rgba(180,50,50,0.15)",
            color: "#e07070",
            border: "1px solid rgba(180,50,50,0.25)",
            cursor: "pointer",
          }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
