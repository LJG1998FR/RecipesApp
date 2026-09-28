import type { ReactNode } from "react";
import type { AdminPage } from "../../types";
import Sidebar from "./Sidebar";

interface AdminShellProps {
  currentPage: AdminPage;
  onNavigate:  (page: AdminPage) => void;
  onLogout:    () => void;
  userName:    string;
  currentRole: string;
  children:    ReactNode;
}

export default function AdminShell({
  currentPage, onNavigate, onLogout, userName, currentRole, children,
}: AdminShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        userName={userName}
        currentRole={currentRole}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
}