import { getApiBaseUrl } from "@/lib/api-base-url";
import { isValidSession, type AppSession, type AuthenticatedUser } from "@/lib/session";

export type AuthErrorCode = "NETWORK_ERROR" | "INVALID_CREDENTIALS" | "USER_NOT_FOUND" | "ACCOUNT_DISABLED";

export interface AuthDiagnostics {
  readonly url: string;
  readonly status?: number;
  readonly responseBody?: unknown;
  readonly corsOrNetworkError?: string;
}

export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string,
    readonly diagnostics: AuthDiagnostics,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function authenticateWithPassword(input: {
  email: string;
  password: string;
}): Promise<AppSession> {
  const url = `${getApiBaseUrl()}/auth/login`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network/CORS error";
    console.warn("[RefCheckID][auth] login network or CORS failure", { error: message, url });
    throw new AuthError("NETWORK_ERROR", "Verifica la connessione e l’URL del backend.", {
      corsOrNetworkError: message,
      url,
    });
  }

  const responseText = await response.text();
  const responseBody = parseResponseBody(responseText);
  if (!response.ok) {
    const body = isAuthErrorBody(responseBody) ? responseBody : {};
    throw new AuthError(body.error ?? "INVALID_CREDENTIALS", body.message ?? "Accesso non riuscito.", {
      responseBody,
      status: response.status,
      url,
    });
  }

  const session = responseBody as AppSession | null;
  if (!session || !isValidSession(session)) throw new Error("Sessione non valida.");
  const profile = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: { authorization: `Bearer ${session.accessToken}` },
  });
  if (!profile.ok) throw new Error(`Profilo non disponibile (HTTP ${profile.status}).`);
  const user = (await profile.json()) as AuthenticatedUser;
  if (user?.id !== session.user.id || !["manager", "referee", "federation", "admin"].includes(user.role)) {
    throw new Error("Per questo profilo usa il portale web.");
  }
  return { ...session, user };
}

export async function logoutSession(refreshToken: string): Promise<void> {
  await fetch(`${getApiBaseUrl()}/auth/logout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}

function isAuthErrorBody(value: unknown): value is { error?: AuthErrorCode; message?: string } {
  return typeof value === "object" && value !== null;
}

function parseResponseBody(responseText: string): unknown {
  if (responseText.length === 0) return null;
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}
