import { DEMO_USERS } from "../data/demoData";
import type { User } from "../types";
import { apiFetch, isApiEnabled } from "./apiClient";
import { clearSession, readSession, writeSession } from "./session";

/**
 * Demo auth by default; POST /api/auth/login when VITE_USE_API=true.
 * Callers are unchanged - the AuthSession shape is identical either way.
 */
export interface AuthSession {
  user: User;
  token: string;
  loginAt: string;
}

function stripPassword(u: (typeof DEMO_USERS)[number]): User {
  const { password: _pw, ...rest } = u;
  return rest;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthSession> {
    if (isApiEnabled()) {
      const res = await apiFetch<{ user: User; token: string }>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      const session: AuthSession = {
        user: res.user,
        token: res.token,
        loginAt: new Date().toISOString(),
      };
      writeSession(session);
      return session;
    }
    await new Promise((r) => setTimeout(r, 500)); // demo latency
    const found = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!found || found.password !== password) {
      throw new Error("Invalid email or password. Try a demo account below.");
    }
    const session: AuthSession = {
      user: stripPassword(found),
      token: `demo.${found.id}.${Date.now()}`,
      loginAt: new Date().toISOString(),
    };
    writeSession(session);
    return session;
  },

  /** Fresh profile from the backend; demo mode returns the stored user. */
  async me(): Promise<User> {
    const session = readSession();
    if (!session) throw new Error("Not signed in.");
    if (!isApiEnabled()) return session.user;
    const user = await apiFetch<User>("/api/users/me", { token: session.token });
    writeSession({ ...session, user });
    return user;
  },

  logout(): void {
    clearSession();
  },

  getSession(): AuthSession | null {
    return readSession();
  },

  getCurrentUser(): User | null {
    return this.getSession()?.user ?? null;
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};
