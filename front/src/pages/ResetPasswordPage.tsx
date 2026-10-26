// front/src/pages/ResetPasswordPage.tsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api";
import { isPasswordValid } from "@/utils/passwordPolicy";
import { ApiValidationError } from "@/api/errors";
import PasswordRequirements from "@/components/form/PasswordRequirements";
import { EyeIcon, LockIcon } from "../components/icons";
import { useTranslation } from "@/context/LocaleContext";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { t } = useTranslation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <CenteredMessage
        emoji="⚠️"
        text={t("auth.reset_password.invalid_link_message")}
        onBack={() => navigate("/mot-de-passe-oublie")}
        backLabel={t("auth.reset_password.request_new_link")}
      />
    );
  }

  const handleSubmit = async () => {
    setError("");
    if (!isPasswordValid(password)) {
      return setError(t("common.errors.password.invalid"));
    }
    if (password !== confirmPassword) {
      return setError(t("common.errors.password_mismatch"));
    }

    try {
      setIsLoading(true);
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiValidationError && err.errors.password) {
        setError(err.errors.password.map((code) => t(`common.errors.password.${code}`, { min: 16 })).join(" "));
      } else {
        setError(t("auth.reset_password.expired_or_used"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <CenteredMessage
        emoji="✅"
        text={t("auth.reset_password.success_message")}
        onBack={() => navigate("/")}
        backLabel={t("auth.reset_password.back_to_login")}
      />
    );
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
        padding: "52px 24px 48px",
      }}
    >
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>
        {t("auth.reset_password.title")}
      </h1>
      <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 24 }}>
        {t("auth.reset_password.description")}
      </p>

      <PwdInput
        id="reset_password"
        label={t("auth.reset_password.password_label")}
        value={password}
        onChange={setPassword}
        show={showPwd}
        onToggleShow={() => setShowPwd((s) => !s)}
        placeholder={t("auth.reset_password.password_placeholder")}
      />
      <PasswordRequirements password={password} />

      <div style={{ marginTop: 16 }}>
        <PwdInput
          id="reset_confirm"
          label={t("auth.reset_password.confirm_label")}
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showPwd}
          onToggleShow={() => setShowPwd((s) => !s)}
          placeholder={t("auth.reset_password.confirm_placeholder")}
        />
      </div>

      {error && (
        <p style={{ fontSize: 12, color: "#e07070", marginTop: 16 }}>{error}</p>
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
        {isLoading ? t("auth.reset_password.submitting") : t("auth.reset_password.submit_button")}
      </button>
    </div>
  );
}

function PwdInput({
  id, label, value, onChange, show, onToggleShow, placeholder,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggleShow: () => void; placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} style={{ display: "block", fontSize: 12, color: "var(--color-text-dim)", marginBottom: 6 }}>
        {label}
      </label>
      <div
        style={{
          display: "flex", alignItems: "center",
          padding: "0 16px", height: 52, borderRadius: 12,
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <span style={{ color: "var(--color-text-dim)", marginRight: 10, flexShrink: 0 }}><LockIcon /></span>
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            fontSize: 14, color: "var(--color-text)", caretColor: "var(--color-primary)",
          }}
        />
        <button onClick={onToggleShow} style={{ color: "var(--color-text-dim)", flexShrink: 0, marginLeft: 8 }}>
          <EyeIcon off={!show} />
        </button>
      </div>
    </div>
  );
}

function CenteredMessage({
  emoji, text, onBack, backLabel,
}: { emoji: string; text: string; onBack: () => void; backLabel: string }) {
  return (
    <div
      style={{
        minHeight: "100dvh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 32px", textAlign: "center",
        backgroundColor: "var(--color-background)",
      }}
    >
      <p style={{ fontSize: 44, marginBottom: 16 }}>{emoji}</p>
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 24, lineHeight: 1.6 }}>{text}</p>
      <button onClick={onBack} style={{ fontSize: 14, fontWeight: 600, color: "var(--color-primary)" }}>
        {backLabel}
      </button>
    </div>
  );
}