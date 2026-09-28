import { tokenStorage } from "../api/client";
import { getUserData } from "../api";
import { createContext, useContext, useEffect, useState } from "react";

export interface UserData {
  id: number;
  firstName: string;
  lastName:  string;
  email:     string;
  memberSince: number;
  role: string;         // "ROLE_USER" | "ROLE_ADMIN" | "ROLE_SUPER_ADMIN"
  createdAt: number;
}

// ── Helpers de rôle ────────────────────────────────────────────────────────────
// Centralisés ici pour éviter de dupliquer les comparaisons de chaînes partout

export function isAdmin(user: UserData | null): boolean {
  return user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_SUPER_ADMIN';
}

export function isSuperAdmin(user: UserData | null): boolean {
  return user?.role === 'ROLE_SUPER_ADMIN';
}

// ── Contexte ───────────────────────────────────────────────────────────────────
interface UserContextValue {
  user: UserData | null;
  setUser: (data: UserData | null) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const init = async () => {
      if (tokenStorage.getAccess()) {
        try {
          const data = await getUserData();
          setUser(data);
        } catch {
          tokenStorage.clear();
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    const handleLogout = () => setUser(null);
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}

export function getInitials(user: UserData): string {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}