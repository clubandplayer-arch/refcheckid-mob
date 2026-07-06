import { getApiBaseUrl } from "./config";
import { refreshSession } from "@/auth/auth-client";
import { AppSession, isExpired } from "@/auth/types";
type SessionAccess = { getSession: () => AppSession | null; setSession: (session: AppSession) => Promise<void>; clearSession: () => Promise<void> };
let access: SessionAccess | null = null;
export function bindSessionAccess(next: SessionAccess) { access = next; }
async function resolveSession(): Promise<AppSession | null> { const session = access?.getSession() ?? null; if (!session) return null; if (!isExpired(session)) return session; try { const refreshed = await refreshSession(session.refreshToken); await access?.setSession(refreshed); return refreshed; } catch (error) { await access?.clearSession(); throw error; } }
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> { const session = await resolveSession(); const headers = new Headers(init.headers); if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json"); if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`); const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers }); if (response.status === 204) return undefined as T; if (!response.ok) throw new Error(`API request failed with status ${response.status}`); return response.json() as Promise<T>; }
