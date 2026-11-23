import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-base-url";

export type AppRole = "manager" | "referee" | "federation";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AppRole | "admin";
  availableRoles?: readonly (AppRole | "admin")[];
  displayName: string;
  clubIds?: readonly string[];
  clubFederationIds?: Readonly<Record<string, string>>;
  federationIds?: readonly string[];
}

export function hasAppRole(user: AuthenticatedUser, role: AppRole): boolean {
  return user.role === role || !!user.availableRoles?.includes(role);
}

export interface AppSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: AuthenticatedUser;
}

const storageKey = "refcheckid.session";
let memorySession: string | null = null;
let refreshInProgress: { token: string; promise: Promise<AppSession | null> } | null = null;

interface SessionContextValue {
  session: AppSession | null;
  isReady: boolean;
  login: (session: AppSession) => void;
  refreshSession: () => Promise<AppSession | null>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AppSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSession(readStoredSession());
    setIsReady(true);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isReady,
      login(nextSession) {
        queryClient.clear();
        writeStoredSession(nextSession);
        setSession(nextSession);
      },
      async refreshSession() {
        const refreshedSession = await resolveActiveSession();
        setSession(refreshedSession);
        return refreshedSession;
      },
      logout() {
        queryClient.clear();
        removeStoredSession();
        setSession(null);
      },
    }),
    [isReady, queryClient, session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === null) throw new Error("useSession must be used inside SessionProvider.");
  return context;
}

export function readStoredSession(): AppSession | null {
  const rawSession = getStorageItem(storageKey);
  if (!rawSession) return null;
  try {
    const session = JSON.parse(rawSession) as AppSession;
    return isValidSession(session) ? session : null;
  } catch {
    return null;
  }
}

export function writeStoredSession(session: AppSession): void {
  setStorageItem(storageKey, JSON.stringify(session));
}

export function removeStoredSession(): void {
  removeStorageItem(storageKey);
}

export function isSessionExpired(session: AppSession): boolean {
  return Date.parse(session.expiresAt) <= Date.now();
}

export async function resolveActiveSession(): Promise<AppSession | null> {
  const session = readStoredSession();
  if (!session || !isSessionExpired(session)) return session;

  const token = session.refreshToken;
  if (refreshInProgress?.token === token) return refreshInProgress.promise;

  const promise = refreshStoredSession(token).then((refreshed) => {
    // A response for an old session may arrive after logout or account switch.
    if (readStoredSession()?.refreshToken !== token) return null;
    if (refreshed?.user.id === session.user.id) {
      writeStoredSession(refreshed);
      return refreshed;
    }
    removeStoredSession();
    return null;
  }).finally(() => {
    if (refreshInProgress?.promise === promise) refreshInProgress = null;
  });
  refreshInProgress = { token, promise };
  return promise;
}

async function refreshStoredSession(refreshToken: string): Promise<AppSession | null> {
  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) return null;
  const session = (await response.json()) as AppSession;
  return isValidSession(session) ? session : null;
}

export function isValidSession(session: AppSession): boolean {
  return Boolean(
    session.accessToken &&
      session.refreshToken &&
      session.expiresAt &&
      session.user?.id &&
      session.user.email &&
      session.user.role,
  );
}

function getStorageItem(key: string): string | null {
  if (typeof globalThis.localStorage !== "undefined") return globalThis.localStorage.getItem(key);
  return memorySession;
}

function setStorageItem(key: string, value: string): void {
  if (typeof globalThis.localStorage !== "undefined") globalThis.localStorage.setItem(key, value);
  else memorySession = value;
}

function removeStorageItem(key: string): void {
  if (typeof globalThis.localStorage !== "undefined") globalThis.localStorage.removeItem(key);
  else memorySession = null;
}
