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
    // aria-live="polite" : ces règles se (dé)valident en direct pendant la
    // frappe du mot de passe. Sans live region, une personne au clavier/
    // lecteur d'écran doit interrompre sa saisie et revenir manuellement sur
    // la liste pour savoir où elle en est.
    <ul aria-live="polite" style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 4 }}>
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
          {/* Avant : seule la couleur/opacité de l'icône (masquée aux
              lecteurs d'écran, purement décorative) portait l'information
              "rempli / pas rempli" — invisible sans les yeux. Ce texte
              sr-only (visible seulement des technologies d'assistance,
              cf. visuallyHiddenStyle dans RecipeFormShared.tsx) la restitue
              explicitement, sans rien changer à l'affichage. */}
          <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
            {r.ok ? t("common.aria.requirement_met") : t("common.aria.requirement_unmet")}
          </span>
        </li>
      ))}
    </ul>
  );
}