// ─────────────────────────────────────────────────────────────────────────────
// src/admin/pages/Overview.tsx
//
// Correspondance exacte avec la maquette dashboard_target :
//   - 4 StatCards : Utilisateurs / Recettes totales / Plats / Desserts & Mocktails
//   - Barre colorée sous chaque card (indigo / cyan / vert / amber)
//   - Table "Recettes récentes" : Titre / Type / Personnes / Tps prépa / Ajouté le
//   - Table "Utilisateurs récents" : Nom / Email / Rôle / Inscrit le
// ─────────────────────────────────────────────────────────────────────────────

import type { User, Recipe, UserRole } from "../types";
import { RoleBadge } from "../components/ui/Badge";

interface OverviewProps {
  users: User[];
  recipes: Recipe[];
}

// ── TypeBadge inline — plus léger qu'importer Badge pour 3 valeurs ────────────
function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Plats:     { bg: "#eff6ff", color: "#3b82f6" },
    Desserts:  { bg: "#faf5ff", color: "#a855f7" },
    Mocktails: { bg: "#f0fdf4", color: "#22c55e" },
  };
  const s = styles[type] ?? { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: 9999,
      fontSize: 12, fontWeight: 500,
      backgroundColor: s.bg, color: s.color,
    }}>
      {type === "Mocktails" ? "Mocktail" : type.replace(/s$/, "")}
    </span>
  );
}

// ── StatCard avec barre colorée ───────────────────────────────────────────────
function StatCard({
  label, value, sub, barColor,
}: {
  label: string;
  value: number | string;
  sub: string;
  barColor: string;
}) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: "20px 24px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      flex: 1,
      minWidth: 0,
    }}>
      <p style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>{sub}</p>
      {/* Barre colorée signature de la maquette */}
      <div style={{ height: 3, borderRadius: 9999, backgroundColor: barColor, width: "60%" }} />
    </div>
  );
}

export function formatDate(userTsp: number): string {
  return new Date(userTsp * 1000).toLocaleDateString("fr-FR", { day: "2-digit" , month: "long", year: "numeric" });
}

// ── Overview ──────────────────────────────────────────────────────────────────
export default function Overview({ users, recipes }: OverviewProps) {
  const publishedCount = recipes.filter((r) => r.status === "published").length;
  const platsCount     = recipes.filter((r) => r.type === "Plats").length;
  const autresCount    = recipes.filter((r) => r.type !== "Plats").length;
  const dessertsCount  = recipes.filter((r) => r.type === "Desserts").length;
  const mocktailsCount = recipes.filter((r) => r.type === "Mocktails").length;

  const recentRecipes = [...recipes]
    .sort((a, b) => b.createdAt-a.createdAt);

  const recentUsers = [...users]
    .sort((a, b) => b.createdAt-a.createdAt);

  return (
    <div style={{ padding: "2rem", maxWidth: 960 }}>

      {/* ── Titre ── */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#0f172a" }}>
          Vue d'ensemble
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 4 }}>
          Tableau de bord de l'application Saveurs
        </p>
      </div>

      {/* ── 4 StatCards ── */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
        <StatCard
          label="Utilisateurs"
          value={users.length}
          sub={`${users.filter((u) => u.role === "ROLE_SUPER_ADMIN").length} admin(s)`}
          barColor="#6366f1"
        />
        <StatCard
          label="Recettes totales"
          value={recipes.length}
          sub={`${publishedCount} publiées`}
          barColor="#06b6d4"
        />
        <StatCard
          label="Plats"
          value={platsCount}
          sub="recettes principales"
          barColor="#22c55e"
        />
        <StatCard
          label="Desserts & Mocktails"
          value={autresCount}
          sub={`${dessertsCount} dessert${dessertsCount !== 1 ? "s" : ""} · ${mocktailsCount} mocktail${mocktailsCount !== 1 ? "s" : ""}`}
          barColor="#f59e0b"
        />
      </div>

      {/* ── Table recettes récentes ── */}
      <div style={{
        background: "#fff", border: "1px solid #e2e8f0",
        borderRadius: 12, overflow: "hidden", marginBottom: "1.5rem",
      }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0f172a" }}>
            Recettes récentes
          </h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="table-th">Titre</th>
              <th className="table-th">Type</th>
              <th className="table-th">Personnes</th>
              <th className="table-th">Tps prépa</th>
              <th className="table-th">Ajouté le</th>
            </tr>
          </thead>
          <tbody>
            {recentRecipes.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                  Aucune recette pour le moment.
                </td>
              </tr>
            ) : recentRecipes.map((r) => (
              <tr key={r.id} className="table-tr">
                <td className="table-td" style={{ fontWeight: 500, color: "#0f172a" }}>{r.title}</td>
                <td className="table-td"><TypeBadge type={r.type} /></td>
                <td className="table-td" style={{ color: "#64748b" }}>{r.nbPeople}</td>
                <td className="table-td" style={{ color: "#64748b" }}>{r.prepTime} min</td>
                <td className="table-td" style={{ color: "#94a3b8" }}>{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Table utilisateurs récents ── */}
      <div style={{
        background: "#fff", border: "1px solid #e2e8f0",
        borderRadius: 12, overflow: "hidden",
      }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0f172a" }}>
            Utilisateurs récents
          </h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="table-th">Nom</th>
              <th className="table-th">Email</th>
              <th className="table-th">Rôle</th>
              <th className="table-th">Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                  Aucun utilisateur pour le moment.
                </td>
              </tr>
            ) : recentUsers.map((u) => (
              <tr key={u.id} className="table-tr">
                <td className="table-td" style={{ fontWeight: 500, color: "#0f172a" }}>
                  {u.firstName} {u.lastName}
                </td>
                <td className="table-td" style={{ color: "#64748b" }}>{u.email}</td>
                <td className="table-td"><RoleBadge role={u.role as UserRole} /></td>
                <td className="table-td" style={{ color: "#94a3b8" }}>{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}