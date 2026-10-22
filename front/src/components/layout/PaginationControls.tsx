// ─────────────────────────────────────────────────────────────────────────────
// src/components/layout/PaginationControls.tsx
//
// Équivalent du composant Pagination de l'admin, mais stylé pour le
// front-office (thème sombre, design tokens --color-*, boutons "pill"
// cohérents avec les filtres de catégorie de HomePage.tsx).
//
// Volontairement "dumb" (pas de state interne, pas de fetch) : HomePage.tsx
// détient page/limit et déclenche le fetch côté serveur via
// onPageChange / onLimitChange — même logique que côté admin.
// ─────────────────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

interface PaginationControlsProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  disabled?: boolean;
  /** Libellés i18n — passés par HomePage.tsx pour rester cohérent avec LocaleContext */
  labels: {
    perPage: string;      // ex: "Par page"
    page: string;         // ex: "Page" (suivi de "X / Y")
    previous: string;     // ex: "Précédent"
    next: string;         // ex: "Suivant"
  };
}

export default function PaginationControls({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  disabled = false,
  labels,
}: PaginationControlsProps) {
  if (total === 0) {
    return null;
  }

  const canGoPrev = page > 1 && !disabled;
  const canGoNext = page < totalPages && !disabled;

  const navButtonStyle = (enabled: boolean): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 16px",
    borderRadius: 99,
    fontSize: 13,
    fontWeight: 600,
    cursor: enabled ? "pointer" : "not-allowed",
    backgroundColor: "var(--color-card)",
    color: enabled ? "var(--color-text)" : "var(--color-text-dim)",
    border: "1px solid var(--color-border)",
    opacity: enabled ? 1 : 0.5,
    transition: "opacity 0.15s",
  });

  return (
    <div style={{ padding: "4px 20px 0" }}>
      {/* ── Sélecteur du nombre d'éléments par page ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--color-text-dim)", flexShrink: 0 }}>
          {labels.perPage}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {PAGE_SIZE_OPTIONS.map((size) => {
            const isActive = limit === size;
            return (
              <button
                key={size}
                onClick={() => onLimitChange(size)}
                disabled={disabled}
                style={{
                  padding: "6px 14px",
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  cursor: disabled ? "not-allowed" : "pointer",
                  backgroundColor: isActive ? "var(--color-primary)" : "var(--color-card)",
                  color: isActive ? "#171210" : "var(--color-text-muted)",
                  border: isActive ? "1px solid transparent" : "1px solid var(--color-border)",
                }}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Navigation page précédente / suivante ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrev}
          style={navButtonStyle(canGoPrev)}
        >
          ‹ {labels.previous}
        </button>

        <span style={{ fontSize: 13, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
          {labels.page} {page} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
          style={navButtonStyle(canGoNext)}
        >
          {labels.next} ›
        </button>
      </div>
    </div>
  );
}