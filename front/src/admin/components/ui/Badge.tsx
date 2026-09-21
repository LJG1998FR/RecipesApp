// ─────────────────────────────────────────────────────────────────────────────
// src/admin/components/ui/Badge.tsx
//
// Utilisé dans les tables Users et Recipes pour afficher :
//   - le rôle d'un utilisateur (ADMIN / EDITOR / USER)
//   - le statut d'une recette (published / draft)
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

type BadgeColor = "indigo" | "emerald" | "amber" | "slate" | "rose";

interface BadgeProps {
  color: BadgeColor;
  children: ReactNode;
}

// Map couleur → styles inline (évite de polluer index.css avec des variantes)
const COLOR_STYLES: Record<BadgeColor, { bg: string; color: string; border: string }> = {
  indigo:  { bg: "#eef2ff", color: "#4f46e5", border: "#c7d2fe" },
  emerald: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  amber:   { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  slate:   { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  rose:    { bg: "#fff1f2", color: "#e11d48", border: "#fecdd3" },
};

export default function Badge({ color, children }: BadgeProps) {
  const s = COLOR_STYLES[color];
  return (
    <span
      className="badge"
      style={{
        backgroundColor: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {children}
    </span>
  );
}

// ── Helpers sémantiques ───────────────────────────────────────────────────────
// Fonctions utilitaires : appellent Badge avec la bonne couleur selon la valeur
// métier. Évite que chaque tableau doive se souvenir quelle couleur = quel rôle.

import type { UserRole, RecipeStatus } from "../../types";

export function RoleBadge({ role }: { role: UserRole }) {
  const colorMap: Record<UserRole, BadgeColor> = {
    ADMIN:  "indigo",
    EDITOR: "emerald",
    USER:   "slate",
  };
  const labelMap: Record<UserRole, string> = {
    ADMIN:  "Admin",
    EDITOR: "Éditeur",
    USER:   "Utilisateur",
  };
  return <Badge color={colorMap[role]}>{labelMap[role]}</Badge>;
}

export function StatusBadge({ status }: { status: RecipeStatus }) {
  return (
    <Badge color={status === "published" ? "emerald" : "amber"}>
      {status === "published" ? "Publié" : "Brouillon"}
    </Badge>
  );
}
