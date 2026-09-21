// ─────────────────────────────────────────────────────────────────────────────
// src/admin/components/layout/Sidebar.tsx
//
// DIFFÉRENCES vs l'original :
//   1. Le type `Page` est importé depuis types/ (plus de redéclaration locale)
//   2. `navItems` est typé correctement (ReactNode pour les icônes)
//   3. Le bouton de déconnexion utilise le composant Button
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import type { AdminPage } from "../../types";

interface SidebarProps {
  currentPage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  userName: string;
}

interface NavItem {
  id: AdminPage;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  {
    id: "overview",
    label: "Vue d'ensemble",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "users",
    label: "Utilisateurs",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "recipes",
    label: "Recettes",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4" />
        <path d="M9 17c0-1.66 1.34-3 3-3s3 1.34 3 3" />
      </svg>
    ),
  },
];

export default function Sidebar({ currentPage, onNavigate, onLogout, userName }: SidebarProps) {
  // Initiale de l'utilisateur pour l'avatar (ex: "Loïc" → "L")
  const initial = userName.charAt(0).toUpperCase();

  return (
    <aside
      style={{ width: "220px", minWidth: "220px" }}
      className="h-screen bg-slate-50 border-r border-slate-200 flex flex-col"
    >
      {/* ── Marque ── */}
      <div className="px-4 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4" />
              <path d="M9 17c0-1.66 1.34-3 3-3s3 1.34 3 3" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-tight">Saveurs</p>
            <p className="text-xs text-slate-400 leading-tight">Admin</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        <p className="px-2 text-xs font-medium text-slate-400 mb-2 tracking-wider">
          Menu
        </p>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-link w-full text-left${currentPage === item.id ? " active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* ── Pied — utilisateur + déconnexion ── */}
      <div className="px-3 py-4 border-t border-slate-200">
        {/* Info utilisateur */}
        <div className="flex items-center gap-2.5 px-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 flex-shrink-0">
            {initial}
          </div>
          <p className="text-sm font-medium text-slate-700 truncate">{userName}</p>
        </div>

        {/* Bouton déconnexion */}
        <button
          className="sidebar-link w-full text-left"
          onClick={onLogout}
          style={{ color: "#ef4444" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
