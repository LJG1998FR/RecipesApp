import { useState } from "react";
import type { AuthMode } from "../types";
import type { UserData } from "../context/UserContext";
import { EyeIcon, MailIcon, LockIcon } from "../components/icons";
import { getUserData, login, register } from "../api";
import Loading from "../components/layout/Loading";
import { useTranslation } from "@/context/LocaleContext";
import { isPasswordValid } from "@/utils/passwordPolicy";
import { ApiValidationError } from "@/api/errors";
import PasswordRequirements from "@/components/form/PasswordRequirements";
import { useNavigate } from "react-router-dom";

interface Props {
  onAuth: (userData: UserData) => void;
}

// Formate depuis la date courante
export function formatMemberSince(userTsp: number): string {
  return new Date(userTsp * 1000).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default function AuthPage({ onAuth }: Props) {
  const [mode,      setMode]      = useState<AuthMode>("login");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [error,     setError]     = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { t, locale } = useTranslation();
  const navigate = useNavigate();

const handleSubmit = async () => {
  setError("");
  if (mode === "signup" && (!firstName.trim() || !lastName.trim()))
    return setError("Veuillez renseigner votre prénom et nom.");
  if (!email.includes("@"))
    return setError("Adresse e-mail invalide.");

  // ⚠️ La règle des 16 caractères ne s'applique QU'à l'inscription,
  // jamais au login — sinon on bloquerait les comptes existants !
  if (mode === "signup" && !isPasswordValid(password)){
    return setError(t("common.errors.password.invalid"));
  }

  try {
    setIsLoading(true);
    if (mode === "signup") {
      await register(email, password, firstName, lastName, locale);
    } else {
      await login(email, password);
    }
    const userData: UserData = await getUserData();
    onAuth(userData);
  } catch (err) {
    if (err instanceof ApiValidationError && err.errors.password) {
      setError(err.errors.password.map((code) => t(`common.errors.password.${code}`, { min: 16 })).join(" "));
    } else {
      setError(t("auth.login.error_invalid_credentials"));
    }
  } finally {
    setIsLoading(false);
  }
};

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-body)",
        backgroundColor: "var(--color-background)",
        maxWidth: 430,
        margin: "0 auto",
      }}
    >
      {/* ── Hero ── */}
      <div className="relative flex-shrink-0" style={{ height: "clamp(260px, 45vh, 360px)" }}>
        <img
          src="https://images.unsplash.com/photo-1493770348161-369560ae357d?w=800&h=600&fit=crop&auto=format"
          alt="Cuisine"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(23,18,16,0.15) 0%, rgba(23,18,16,0.5) 50%, rgba(23,18,16,1) 100%)",
          }}
        />
        <div className="absolute">
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
              <>{t("auth.login.title")}<br /><em style={{ color: "var(--color-primary)", fontStyle: "italic" }}>{t("auth.login.subtitle")}</em></>
            ) : (
              <>{t("auth.register.title")}<br /><em style={{ color: "var(--color-primary)", fontStyle: "italic" }}>{t("auth.register.subtitle")}</em></>
            )}
          </h1>
        </div>
      </div>

      {/* ── Formulaire ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "109px 24px 48px" }}>

        {/* Toggle */}
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
              {m === "login" ? t("auth.login.button_title") : t("auth.register.button_title")}
            </button>
          ))}
        </div>

        {/* Prénom + Nom (inscription) */}
        {mode === "signup" && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {[
              { label: t("auth.register.firstname_label"), value: firstName, set: setFirstName, placeholder: t("auth.register.firstname_placeholder") },
              { label: t("auth.register.lastname_label"),    value: lastName,  set: setLastName,  placeholder:t("auth.register.lastname_placeholder") },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label} style={{ flex: 1 }}>
                <label htmlFor={"signup_label_"+label} style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  id={"signup_label_"+label}
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

        {/* E-mail */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="label_email" style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 6 }}>
            {t("auth.login.email_label")}
          </label>
          <div
            style={{
              display: "flex", alignItems: "center",
              padding: "0 16px", height: 52,
              borderRadius: 12,
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span style={{ color: "var(--color-text-dim)", marginRight: 10, flexShrink: 0 }}><MailIcon /></span>
            <input
              id="label_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.login.email_placeholder")}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 14, color: "var(--color-text)", caretColor: "var(--color-primary)",
              }}
            />
          </div>
        </div>

        {/* Mot de passe */}
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="label_password" style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 6 }}>
            {t("auth.login.password_label")}
          </label>
          <div
            style={{
              display: "flex", alignItems: "center",
              padding: "0 16px", height: 52,
              borderRadius: 12,
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span style={{ color: "var(--color-text-dim)", marginRight: 10, flexShrink: 0 }}><LockIcon /></span>
            <input
              id="label_password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.login.password_placeholder")}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 14, color: "var(--color-text)", caretColor: "var(--color-primary)",
              }}
            />
            <button onClick={() => setShowPwd((s) => !s)} style={{ color: "var(--color-text-dim)", flexShrink: 0, marginLeft: 8 }}>
              <EyeIcon off={!showPwd} />
            </button>
          </div>
          {mode === "signup" && <PasswordRequirements password={password} />}
        </div>

        {mode === "login" && (
          <div style={{ textAlign: "right", marginBottom: 8 }}>
            <button onClick={() => navigate("/mot-de-passe-oublie")} style={{ fontSize: 12, color: "var(--color-primary)" }}>
              {t("auth.login.forgot_password")}
            </button>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 12, color: "#e07070", marginTop: 12, marginBottom: 4 }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          style={{
            width: "100%", marginTop: 24, padding: "16px 0",
            borderRadius: 16, fontSize: 15, fontWeight: 600,
            backgroundColor: "var(--color-primary)", color: "#171210",
            transition: "opacity 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseOut={(e)  => (e.currentTarget.style.opacity = "1")}
        >
          {mode === "login" ? t("auth.login.button_submit") : t("auth.register.button_submit")}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-border)" }} />
          <span style={{ fontSize: 12, color: "var(--color-text-dim)" }}>ou</span>
          <div style={{ flex: 1, height: 1, backgroundColor: "var(--color-border)" }} />
        </div>

        <p style={{ fontSize: 12, textAlign: "center", color: "var(--color-text-dim)" }}>
          {mode === "login" ? t("auth.login.switch_to_signup_text") : t("auth.register.switch_to_login_text")}
          <button type="submit"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)" }}
          >
            {mode === "login" ? t("auth.login.switch_to_signup_link") : t("auth.register.switch_to_login_link")}
          </button>
        </p>
      </div>
    </div>
  );
}