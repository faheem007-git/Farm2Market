import type { User } from "../types";

export interface StoredSession {
  user: User;
  token: string;
  loginAt: string;
}

const SESSION_KEY = "agripulse.session.v1";

export function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function readToken(): string | null {
  return readSession()?.token ?? null;
}
