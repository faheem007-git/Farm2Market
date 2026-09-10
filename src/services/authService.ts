import { DEMO_USERS } from "../data/demoData";
import type { User } from "../types";

const SESSION_KEY = "agripulse.session.v1";

/**
 * Frontend-only demo auth. Interface mirrors a future Spring Boot REST
 * client: swap internals with fetch('/api/auth/...') later without
 * changing callers.
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
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  getSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  },

  getCurrentUser(): User | null {
    return this.getSession()?.user ?? null;
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};
