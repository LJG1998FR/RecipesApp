import { tokenStorage } from "../api/client";
import { getUserData } from "../api";
import { createContext, useContext, useEffect, useState } from "react";

// ── Type UserData ──────────────────────────────────────────────────────────────
export interface UserData {
  firstName: string;
  lastName:  string;
  email:     string;
  memberSince: number;
}

// ── Contexte ───────────────────────────────────────────────────────────────────
interface UserContextValue {
  user: UserData | null;
  setUser: (data: UserData | null) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);

  // if there is an existing token, get user profile
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
        //setLoading(false);
    };
    init();
  }, []);

  // Listen to global event sent by interceptor
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

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useUser() : any {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}

// ── Utilitaire : initiales ─────────────────────────────────────────────────────
export function getInitials(user: UserData): string {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}