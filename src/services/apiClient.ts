import { readToken } from "./session";

/**
 * Single HTTP boundary for the whole frontend. No other module may call
 * fetch() for backend communication - every service delegates through here.
 *
 * Controlled by env:
 *   VITE_API_URL - backend origin (default http://localhost:8080 for dev)
 *   VITE_USE_API - "true" switches services from localStorage to this client
 */

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "")
  ?? "http://localhost:8080";

const TIMEOUT_MS = 15000;

export function isApiEnabled(): boolean {
  return (import.meta.env.VITE_USE_API as string | undefined) === "true";
}

export function apiBase(): string {
  return API_BASE;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: string | null;

  constructor(status: number, message: string, body: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = options.token ?? readToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const parsed = JSON.parse(text) as { message?: string; error?: string };
        if (parsed.message) message = parsed.message;
        else if (parsed.error) message = parsed.error;
      } catch {
        if (text) message = text.slice(0, 200);
      }
      throw new ApiError(response.status, message, text || null);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError(0, "Request timed out - is the backend running?");
    }
    throw new ApiError(0, e instanceof Error ? e.message : "Network request failed");
  } finally {
    clearTimeout(timer);
  }
}
