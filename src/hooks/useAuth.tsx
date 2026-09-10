import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authService } from "../services/authService";
import { isApiEnabled } from "../services/apiClient";
import type { Role, User } from "../types";

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());

  const login = useCallback(async (email: string, password: string) => {
    const session = await authService.login(email, password);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  // API mode only: revalidate a restored session against the backend once.
  // An expired/revoked token drops the session instead of failing later.
  useEffect(() => {
    if (!isApiEnabled()) return;
    if (!authService.getSession()) return;
    let live = true;
    authService
      .me()
      .then((fresh) => {
        if (live) setUser(fresh);
      })
      .catch(() => {
        if (live) {
          authService.logout();
          setUser(null);
        }
      });
    return () => {
      live = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
