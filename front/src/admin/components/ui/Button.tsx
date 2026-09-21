// ─────────────────────────────────────────────────────────────────────────────
// src/admin/components/ui/Button.tsx
//
// POURQUOI ce composant existe-t-il ?
// Dans Login.tsx et Sidebar.tsx originaux, les styles de bouton étaient
// dupliqués via des classes CSS globales ("btn-primary", "btn-secondary"…).
// Ce composant centralise la logique + les variantes en un seul endroit.
//
// PATTERN utilisé : "variant prop" — une seule prop `variant` contrôle
// l'apparence. C'est la façon standard dans tous les design systems
// (shadcn, MUI, Chakra…).
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode, ButtonHTMLAttributes } from "react";

// Les variantes disponibles — étendre ici si besoin
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
  /** Affiche un état de chargement et désactive le bouton */
  loading?: boolean;
  /** Icône affichée à gauche du texte */
  leftIcon?: ReactNode;
}

// Map variant → classes CSS (venant de index.css)
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:   "btn-primary",
  secondary: "btn-secondary",
  danger:    "btn-danger",
  ghost:     "sidebar-link",
};

export default function Button({
  variant = "primary",
  loading = false,
  leftIcon,
  children,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`${VARIANT_CLASS[variant]} ${className}`}
      disabled={isDisabled}
      style={{ opacity: isDisabled ? 0.7 : 1 }}
      {...rest}
    >
      {/* Spinner de chargement inline */}
      {loading ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ animation: "spin 1s linear infinite" }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
    </button>
  );
}
