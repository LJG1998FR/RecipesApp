import { checkPassword, PASSWORD_MIN_LENGTH } from "../../utils/passwordPolicy";
import { CheckIcon } from "../icons";
import { useTranslation } from "@/context/LocaleContext";

interface Props {
  password: string;
}

export default function PasswordRequirements({ password }: Props) {
  const { t } = useTranslation();
  const check = checkPassword(password);

  const rules = [
    { ok: check.length,    label: t("common.errors.password.too_short", { min: PASSWORD_MIN_LENGTH }) },
    { ok: check.uppercase, label: t("common.errors.password.missing_uppercase") },
    { ok: check.lowercase, label: t("common.errors.password.missing_lowercase") },
    { ok: check.digit,     label: t("common.errors.password.missing_digit") },
  ];

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 4 }}>
      {rules.map((r) => (
        <li
          key={r.label}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12,
            color: r.ok ? "#a8c87a" : "var(--color-text-dim)",
          }}
        >
          <span style={{ opacity: r.ok ? 1 : 0.35 }}><CheckIcon /></span>
          {r.label}
        </li>
      ))}
    </ul>
  );
}