// ─────────────────────────────────────────────────────────────────────────────
// src/admin/components/layout/AdminShell.tsx
//
// POURQUOI ce composant ?
// Dans l'App.tsx original, le layout (flex h-screen + Sidebar + main) était
// mélangé avec la logique de routing et d'auth. AdminShell isole la structure
// visuelle : il ne sait pas QUI est connecté, juste COMMENT afficher la page.
//
// C'est le principe de "séparation des responsabilités" (SoC) :
//   - AdminApp   → qui est connecté, quelle page afficher
//   - AdminShell → comment mettre en page Sidebar + contenu
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import type { AdminPage } from "../../types";
import Sidebar from "./Sidebar";

interface AdminShellProps {
  currentPage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  userName: string;
  children: ReactNode;
}

export default function AdminShell({
  currentPage,
  onNavigate,
  onLogout,
  userName,
  children,
}: AdminShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        userName={userName}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
}
