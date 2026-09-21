// ─────────────────────────────────────────────────────────────────────────────
// src/admin/components/ui/Table.tsx
//
// Table réutilisable avec typage générique.
//
// CONCEPT CLÉ — Generics TypeScript :
//   Table<T> signifie "une table qui accepte n'importe quel type T".
//   Ça permet d'écrire Table<User> ou Table<Recipe> sans dupliquer le code.
//   Les colonnes définissent comment afficher chaque champ de T.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

/** Définition d'une colonne */
export interface Column<T> {
  /** Texte de l'en-tête */
  header: string;
  /** Fonction qui reçoit la ligne et retourne ce qu'on affiche */
  render: (row: T) => ReactNode;
  /** Largeur optionnelle (ex: "120px", "auto") */
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Clé unique de chaque ligne (pour le `key` React) */
  keyExtractor: (row: T) => number;
  /** Contenu affiché si `data` est vide */
  emptyState?: ReactNode;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
}: TableProps<T>) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        {/* En-têtes */}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.header}
                className="table-th"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Corps */}
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: "0.875rem",
                }}
              >
                {emptyState ?? "Aucun élément à afficher."}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)} className="table-tr">
                {columns.map((col) => (
                  <td key={col.header} className="table-td">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
