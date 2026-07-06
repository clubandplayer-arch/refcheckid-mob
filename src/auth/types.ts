export type AppRole = "manager" | "referee" | "federation";
export type RolePath = "/manager" | "/referee" | "/federation";
export interface AppSession { accessToken: string; refreshToken: string; expiresAt: string; user: { id: string; email: string; role: AppRole; displayName: string } }
export const roleRedirects: Record<AppRole, RolePath> = { manager: "/manager", referee: "/referee", federation: "/federation" };
export function isAppRole(value: unknown): value is AppRole { return value === "manager" || value === "referee" || value === "federation"; }
export function isValidSession(value: unknown): value is AppSession {
  const s = value as AppSession | undefined;
  return !!s && typeof s.accessToken === "string" && !!s.accessToken && typeof s.refreshToken === "string" && !!s.refreshToken &&
    typeof s.expiresAt === "string" && !Number.isNaN(Date.parse(s.expiresAt)) && !!s.user && typeof s.user.id === "string" &&
    typeof s.user.email === "string" && isAppRole(s.user.role);
}
export function isExpired(session: AppSession, now = Date.now()): boolean { return Date.parse(session.expiresAt) <= now; }
