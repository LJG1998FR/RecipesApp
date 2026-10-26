import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/context/LocaleContext";
import { requestPasswordReset } from "../api";
import { ChevronLeft, MailIcon } from "../components/icons";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t, locale } = useTranslation();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email.includes("@")) {
      return setError(t("auth.login.error_invalid_email"));
    }
    try {
      setIsLoading(true);
      await requestPasswordReset(email, locale);
      setSubmitted(true);
    } catch {
      setError(t("auth.forgot_password.error_generic"));
    } finally {
      setIsLoading(false);
    }
  };

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
        padding: "0 24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "52px 0 32px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)",
            color: "var(--color-text)",
          }}
        >
          <ChevronLeft />
        </button>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--color-text)" }}>
          {t("auth.forgot_password.title")}
        </h1>
      </div>

      {submitted ? (
        <div style={{ textAlign: "center", paddingTop: 20 }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>📬</p>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            {t("auth.forgot_password.success_message", { email })}
          </p>
          <button
            onClick={() => navigate("/")}
            style={{ marginTop: 24, fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}
          >
            {t("auth.forgot_password.back_to_login")}
          </button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 24, lineHeight: 1.5 }}>
            {t("auth.forgot_password.description")}
          </p>

          <div style={{ marginBottom: 8 }}>
            <label htmlFor="forgot_email" style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 6 }}>
              {t("auth.forgot_password.email_label")}
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
                id="forgot_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.forgot_password.email_placeholder")}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: 14, color: "var(--color-text)", caretColor: "var(--color-primary)",
                }}
              />
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: "#e07070", marginTop: 8, marginBottom: 4 }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              width: "100%", marginTop: 24, padding: "16px 0",
              borderRadius: 16, fontSize: 15, fontWeight: 600,
              backgroundColor: "var(--color-primary)", color: "#171210",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? t("auth.forgot_password.submitting") : t("auth.forgot_password.submit_button")}
          </button>
        </>
      )}
    </div>
  );
}