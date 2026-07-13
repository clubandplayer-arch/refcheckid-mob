import { getApiBaseUrl } from "./api-base-url";
import {
  isSessionExpired,
  removeStoredSession,
  readStoredSession,
  refreshStoredSession,
  writeStoredSession,
} from "./session";

export async function request<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const activeSession = await resolveActiveSession();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(activeSession ? { authorization: `Bearer ${activeSession.accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}.`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

async function resolveActiveSession() {
  const session = readStoredSession();
  if (session === null) return null;
  if (!isSessionExpired(session)) return session;

  const refreshedSession = await refreshStoredSession(session.refreshToken);
  if (refreshedSession === null) {
    removeStoredSession();
    return null;
  }

  writeStoredSession(refreshedSession);
  return refreshedSession;
}
