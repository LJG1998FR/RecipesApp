import { createContext, useContext, useState } from "react";

// ── Type UserData ──────────────────────────────────────────────────────────────
export interface UserData {
  firstName: string;
  lastName:  string;
  email:     string;
  memberSince: number;
}

// ── Valeurs par défaut (remplacées après login) ────────────────────────────────
const DEFAULT_USER: UserData = {
  firstName:   "Marie",
  lastName:    "Dupont",
  email:       "marie.dupont@example.com",
  memberSince: 1784890472,
};

// ── Contexte ───────────────────────────────────────────────────────────────────
interface UserContextValue {
  user: UserData;
  setUser: (data: UserData) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData>(DEFAULT_USER);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}

// ── Utilitaire : initiales ─────────────────────────────────────────────────────
export function getInitials(user: UserData): string {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}