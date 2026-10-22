// ─────────────────────────────────────────────────────────────────────────────
// src/admin/components/ui/Pagination.tsx
//
// Contrôle de pagination générique : boutons précédent/suivant, numéro de
// page courante, et sélecteur du nombre d'éléments par page (10/20/50).
//
// Volontairement "dumb" (pas de state interne, pas de fetch) : le parent
// (Recipes.tsx, Ingredients.tsx, Users.tsx…) détient page/limit et déclenche
// le fetch côté serveur via onPageChange / onLimitChange.
// ─────────────────────────────────────────────────────────────────────────────

import Button from "./Button";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

interface PaginationProps {
  page: number;          // page courante (1-indexée)
  limit: number;          // nombre d'éléments par page
  total: number;          // nombre total d'éléments (toutes pages confondues)
  totalPages: number;     // nombre total de pages
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  disabled?: boolean;     // true pendant un chargement, pour éviter le double-clic
}

export default function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  disabled = false,
}: PaginationProps) {
  if (total === 0) {
    return null;
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const canGoPrev = page > 1 && !disabled;
  const canGoNext = page < totalPages && !disabled;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.75rem",
        padding: "0.875rem 1rem",
        borderTop: "1px solid #e2e8f0",
        backgroundColor: "#fff",
      }}
    >
      <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
        {from}–{to} sur {total}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {/* ── Sélecteur du nombre d'éléments par page ── */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.8125rem",
            color: "#64748b",
          }}
        >
          Par page
          <select
            className="input-field"
            value={limit}
            disabled={disabled}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8125rem", width: "auto" }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        {/* ── Navigation page précédente / suivante ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Button
            variant="secondary"
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoPrev}
            style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}
          >
            ‹ Précédent
          </Button>
          <span style={{ fontSize: "0.8125rem", color: "#0f172a", fontWeight: 500, minWidth: 64, textAlign: "center" }}>
            Page {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoNext}
            style={{ padding: "0.25rem 0.625rem", fontSize: "0.8125rem" }}
          >
            Suivant ›
          </Button>
        </div>
      </div>
    </div>
  );
}