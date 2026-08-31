import { useState } from "react";
import type { AuthMode } from "../types";
import { EyeIcon, MailIcon, LockIcon } from "../components/icons";

interface Props {
  onAuth: () => void;
}

export default function AuthPage({ onAuth }: Props) {
  const [mode, setMode]           = useState<AuthMode>("login");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [error, setError]         = useState("");

  const handleSubmit = () => {
    setError("");
    if (mode === "signup" && (!firstName || !lastName))
      return setError("Veuillez renseigner votre prénom et nom.");
    if (!email.includes("@"))
      return setError("Adresse e-mail invalide.");
    if (password.length < 8)
      return setError("Le mot de passe doit faire au moins 8 caractères.");
    onAuth();
  };

  return (
    /*
     * Container principal : min-h-full (et non h-full) pour que la page
     * soit scrollable sur petits écrans quand le clavier mobile s'ouvre,
     * sans être bloquée par overflow:hidden.
     */
    <div
      style={{
        minHeight: "100dvh",           /* dvh = tient compte de la barre URL mobile */
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-body)",
        backgroundColor: "var(--color-background)",
        maxWidth: 430,
        margin: "0 auto",
      }}
    >
      {/* ── Hero : image + dégradé + titre ────────────────────────────────── */}
      <div
        className="relative flex-shrink-0"
        style={{ height: "clamp(260px, 45vh, 360px)" }}  /* responsive : jamais trop petit ni trop grand */
      >
        <img
          src="https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&h=600&fit=crop&auto=format"
          alt="Cuisine"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {/* Dégradé plus prononcé en bas pour que le titre soit lisible */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(23,18,16,0.15) 0%, rgba(23,18,16,0.5) 50%, rgba(23,18,16,1) 100%)",
          }}
        />
        {/* Titre positionné en bas du hero, calé sur le padding du formulaire */}
        <div className="absolute" style={{ bottom: 32, left: 24 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text)",
              fontWeight: 600,
              fontSize: "clamp(2rem, 8vw, 2.5rem)",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {mode === "login" ? (
              <>Bon retour,<br /><em style={{ color: "var(--color-primary)", fontStyle: "italic" }}>chef.</em></>
            ) : (
              <>Rejoindre<br /><em style={{ color: "var(--color-primary)", fontStyle: "italic" }}>la table.</em></>
            )}
          </h1>
        </div>
      </div>

      {/* ── Formulaire ─────────────────────────────────────────────────────── */}
      {/*
       * On utilise un div scrollable indépendant (overflow-y: auto) pour que
       * le formulaire scroll sans affecter le hero. Le padding-bottom laisse
       * de l'air en bas, surtout sur mobile avec barre de navigation.
       */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "109px 24px 48px",
        }}
      >
        {/* Toggle Connexion / Inscription */}
        <div
          style={{
            display: "flex",
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 14,
            padding: 4,
            marginBottom: 24,
          }}
        >
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1,
                padding: "10px 0",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 10,
                transition: "background-color 0.2s, color 0.2s",
                backgroundColor: mode === m ? "var(--color-primary)" : "transparent",
                color: mode === m ? "#171210" : "var(--color-text-muted)",
              }}
            >
              {m === "login" ? "Connexion" : "Inscription"}
            </button>
          ))}
        </div>

        {/* Champs prénom + nom (inscription uniquement) */}
        {mode === "signup" && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Prénom", value: firstName, set: setFirstName, placeholder: "Marie" },
              { label: "Nom",    value: lastName,  set: setLastName,  placeholder: "Dupont" },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label} style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    fontSize: 14,
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                    caretColor: "var(--color-primary)",
                    outline: "none",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Champ e-mail */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 6 }}>
            Adresse e-mail
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              height: 52,
              borderRadius: 12,
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span style={{ color: "var(--color-text-dim)", marginRight: 10, flexShrink: 0 }}><MailIcon /></span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="marie@example.com"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "var(--color-text)",
                caretColor: "var(--color-primary)",
              }}
            />
          </div>
        </div>

        {/* Champ mot de passe */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 6 }}>
            Mot de passe
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              height: 52,
              borderRadius: 12,
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span style={{ color: "var(--color-text-dim)", marginRight: 10, flexShrink: 0 }}><LockIcon /></span>
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 caractères"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "var(--color-text)",
                caretColor: "var(--color-primary)",
              }}
            />
            <button
              onClick={() => setShowPwd((s) => !s)}
              style={{ color: "var(--color-text-dim)", flexShrink: 0, marginLeft: 8 }}
            >
              <EyeIcon off={!showPwd} />
            </button>
          </div>
        </div>

        {/* Lien mot de passe oublié */}
        {mode === "login" && (
          <div style={{ textAlign: "right", marginBottom: 8 }}>
            <button style={{ fontSize: 12, color: "var(--color-primary)" }}>
              Mot de passe oublié ?
            </button>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <p style={{ fontSize: 12, color: "#e07070", marginTop: 12, marginBottom: 4 }}>{error}</p>
        )}

        {/* Bouton principal */}
        <button
          onClick={handleSubmit}
          style={{
            width: "100%",
            marginTop: 24,
            padding: "16px 0",
            borderRadius: 16,
            fontSize: 15,
            fontWeight: 600,
            backgroundColor: "var(--color-primary)",
            color: "#171210",
            transition: "opacity 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseOut={(e)  => (e.currentTarget.style.opacity = "1")}
        >
          {mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>

        {/* Séparateur "ou" */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-border)" }} />
          <span style={{ fontSize: 12, color: "var(--color-text-dim)" }}>ou</span>
          <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-border)" }} />
        </div>

        {/* Lien switch connexion ↔ inscription */}
        <p style={{ fontSize: 12, textAlign: "center", color: "var(--color-text-dim)" }}>
          {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)" }}
          >
            {mode === "login" ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}
