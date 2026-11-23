import { getApiBaseUrl } from "./api-base-url";
import {
  hasAppRole,
  readStoredSession,
  resolveActiveSession,
} from "./session";
import type { ManagerDashboard, PlayerListItem, StaffListItem } from "./types";

export interface LineupRules {
  starters?: number;
  goalkeeperRequired?: boolean;
  benchLimit?: number;
  staffLimit?: number;
  minShirtNumber?: number;
  maxShirtNumber?: number;
}

export interface ApiMatch {
  season?: string;
  federationId?: string;
  platformFixtureId?: string;
  lineupRules?: LineupRules;
  id: string;
  homeClubName?: string;
  awayClubName?: string;
  homeClubId: string;
  awayClubId: string;
  refereeId: string | null;
  scheduledAt: string;
  venue: string | null;
  status: string;
}

export interface ApiMatchSheet {
  id: string;
  matchId: string;
  clubId: string;
  clubName?: string;
  team?: "home" | "away";
  playerCount?: number;
  staffCount?: number;
  match?: ApiMatch;
  players?: readonly (LineupPlayer & { lineupOrder: number })[];
  staff?: readonly LineupStaff[];
  submittedAt: string | null;
  status: "draft" | "submitted" | "locked";
}

export interface ApiReport {
  id: string;
  matchId: string;
  refereeId: string;
  submittedAt: string | null;
  status: string;
  summary: string | null;
}

export type ApiManifestPhotoStatus = "missing" | "pending" | "active" | "rejected" | "suspended";
export type ApiManifestSource = "live_manifest" | "frozen_snapshot";

export interface ApiMatchPhotoManifestSubject {
  id: string;
  firstName: string;
  lastName: string;
  shirtNumber: number | null;
  teamName: string;
  roleLabel: string;
  subjectKind: "player" | "staff";
  photoUrl: string | null;
  photoStatus: ApiManifestPhotoStatus;
  photoEtag: string | null;
  manifestSource: ApiManifestSource;
  isFrozenSnapshot: boolean;
  document: {
    type: string;
    number: string;
    expiresAt: string;
  };
}

export interface ApiMatchPhotoManifest {
  matchId: string;
  manifestVersion: string;
  photoEtag: string;
  generatedAt: string;
  expiresAt: string | null;
  status: "available" | "expired" | "unavailable";
  subjects: readonly ApiMatchPhotoManifestSubject[];
}

export const queryKeys = {
  manager: ["manager"] as const,
  matchReports: ["matchReports"] as const,
  matchSheets: ["matchSheets"] as const,
  photos: ["photos"] as const,
  roster: ["roster"] as const,
  recognitions: ["recognitions"] as const,
  referees: ["referees"] as const,
};

export function getManagerClubIds(): readonly string[] {
  const user = readStoredSession()?.user;
  return user && hasAppRole(user, "manager") ? user.clubIds ?? [] : [];
}

export async function fetchManagerDashboard(): Promise<ManagerDashboard> {
  const clubIds = getManagerClubIds();
  if (!clubIds.length) return { games: [], nextMatch: null, matchSheetStatus: "draft", notifications: [] };
  const [matches, sheets] = await Promise.all([fetchMatches(), fetchMatchSheets()]);
  const games = matches.flatMap((match) => clubIds
    .filter((clubId) => clubId === match.homeClubId || clubId === match.awayClubId)
    .map((clubId) => ({
      id: match.id,
      clubId,
      clubName: (clubId === match.homeClubId ? match.homeClubName : match.awayClubName) ?? "La tua società",
      opponent: (clubId === match.homeClubId ? match.awayClubName : match.homeClubName) ?? "Avversario",
      scheduledAt: match.scheduledAt,
      venue: match.venue ?? "Da definire",
    })));
  const nextId = selectOperationalMatch(matches.filter((match) => games.some((game) => game.id === match.id)))?.id;
  const nextMatch = games.find((game) => game.id === nextId) ?? null;
  const sheet = sheets.find((row) => row.matchId === nextMatch?.id && row.clubId === nextMatch?.clubId);
  return {
    games,
    nextMatch,
    matchSheetStatus: sheet?.status ?? "draft",
    notifications: sheet ? [toManagerStatusNotification(sheet.status)] : [],
  };
}

export function selectOperationalMatch(matches: readonly ApiMatch[]): ApiMatch | null {
  const ordered = [...matches].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return ordered.find((match) => match.status === "scheduled" || match.status === "in_progress")
    ?? ordered.reverse().find((match) => match.status === "completed") ?? null;
}

export async function fetchManagerMatchSheet(matchId: string, clubId: string): Promise<ApiMatchSheet> {
  if (!matchId || !getManagerClubIds().includes(clubId)) throw new Error("Gara o società non autorizzata.");
  const [match, sheets] = await Promise.all([
    request<ApiMatch>(`/matches/${encodeURIComponent(matchId)}`),
    fetchMatchSheets(`?matchId=${encodeURIComponent(matchId)}`),
  ]);
  if (match.id !== matchId || (match.homeClubId !== clubId && match.awayClubId !== clubId)) {
    throw new Error("Gara o società non autorizzata.");
  }
  const sheet = sheets.find((row) => row.matchId === matchId && row.clubId === clubId);
  if (!sheet) throw new Error("Distinta non disponibile per questa gara e società.");
  return { ...sheet, match };
}

function toManagerStatusNotification(status: ApiMatchSheet["status"]): string {
  return {
    draft: "Distinta in bozza: completa i convocati e inviala",
    locked: "Distinta presa in carico dall’arbitro",
    submitted: "Distinta inviata: attendi l’arbitro",
  }[status];
}

interface ManagerRoster {
  players: readonly Record<string, unknown>[];
  staff: readonly Record<string, unknown>[];
  registrations: readonly ApiPlayerRegistration[];
  staffRegistrations: readonly ApiStaffRegistration[];
}

export async function fetchManagerRoster(clubId: string, match: ApiMatch) {
  const filter = `?clubId=${encodeURIComponent(clubId)}`;
  let roster: ManagerRoster;
  if (match.platformFixtureId) {
    roster = await request<ManagerRoster>(`/platform/match-roster/${encodeURIComponent(match.id)}${filter}`);
  } else {
    const [players, staff, registrations, staffRegistrations] = await Promise.all([
      request<ManagerRoster["players"]>("/players"),
      request<ManagerRoster["staff"]>("/staff-members"),
      fetchPlayerRegistrations(filter),
      fetchStaffRegistrations(filter),
    ]);
    roster = { players, staff, registrations, staffRegistrations };
  }
  const current = (row: { clubId: string; season: string }) =>
    row.clubId === clubId && (!match.season || row.season === match.season);
  return {
    players: mapPlayers(roster.players, roster.registrations.filter(current)),
    staff: mapStaff(roster.staff, roster.staffRegistrations.filter(current)),
  };
}

function mapPlayers(players: ManagerRoster["players"], registrations: ManagerRoster["registrations"]): readonly PlayerListItem[] {
  return players.flatMap((player) => {
    const registration = registrations.find((row) => row.playerId === String(player.id) && row.status !== "ended");
    if (!registration) return [];
    return [{
      id: String(player.id),
      firstName: String(player.firstName ?? player.first_name ?? ""),
      lastName: String(player.lastName ?? player.last_name ?? ""),
      photoUrl: normalizePhotoUrl(player.photoUrl ?? player.photo_url),
      registrationId: registration?.id ?? null,
      season: registration?.season ?? null,
      warning: Boolean(player.warning ?? false),
      suspended: registration.status !== "active" || Boolean(player.suspended ?? false),
      selected: false,
      shirtNumber: null,
      role: "starter" as const,
      isGoalkeeper: false,
      isCaptain: false,
      isViceCaptain: false,
    }];
  });
}

function mapStaff(staff: ManagerRoster["staff"], registrations: ManagerRoster["staffRegistrations"]): readonly StaffListItem[] {
  return staff.flatMap((staffMember) => {
    const registration = registrations.find((row) => row.staffMemberId === String(staffMember.id) && row.status !== "ended");
    if (!registration) return [];
    return [{
      id: String(staffMember.id),
      fullName: String(staffMember.fullName ?? staffMember.full_name ?? ([staffMember.firstName ?? staffMember.first_name, staffMember.lastName ?? staffMember.last_name].filter(Boolean).join(" ") || staffMember.id)),
      role: String(registration?.role ?? staffMember.role ?? "staff"),
      photoUrl: normalizePhotoUrl(staffMember.photoUrl ?? staffMember.photo_url),
      registrationId: registration?.id ?? null,
      season: registration?.season ?? null,
      selected: false,
    }];
  });
}

export interface ApiPlayerRegistration {
  id: string;
  playerId: string;
  clubId: string;
  season: string;
  status: string;
}

export function fetchPlayerRegistrations(query = ""): Promise<readonly ApiPlayerRegistration[]> {
  return request<readonly ApiPlayerRegistration[]>(`/player-registrations${query}`);
}

export interface ApiStaffRegistration {
  id: string;
  staffMemberId: string;
  clubId: string;
  season: string;
  role: string;
  status: string;
}

export function fetchStaffRegistrations(query = ""): Promise<readonly ApiStaffRegistration[]> {
  return request<readonly ApiStaffRegistration[]>(`/staff-registrations${query}`);
}

function normalizePhotoUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return value === "/placeholder-player.svg" ? null : value;
}

export function fetchMatches(query = ""): Promise<readonly ApiMatch[]> {
  return request<readonly ApiMatch[]>(`/matches${query}`);
}

export function fetchMatchSheets(
  query = "",
): Promise<readonly ApiMatchSheet[]> {
  return request<readonly ApiMatchSheet[]>(`/match-sheets${query}`);
}

export function fetchMatchReports(
  query = "",
): Promise<readonly ApiReport[] | ApiReport | null> {
  return request<readonly ApiReport[] | ApiReport | null>(
    `/match-reports${query}`,
  );
}

export function fetchMatchPhotoManifest(matchId: string): Promise<ApiMatchPhotoManifest> {
  return request<ApiMatchPhotoManifest>(`/matches/${encodeURIComponent(matchId)}/photo-manifest`);
}

interface LineupPlayer {
  playerRegistrationId: string;
  shirtNumber: number | null;
  role: string;
  lineupOrder?: number;
  isGoalkeeper?: boolean;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

interface LineupStaff {
  staffRegistrationId: string;
  role: string;
}

export function fetchLineupDefaults(clubId: string, matchId: string) {
  return request<{ sourceMatchSheetId: string | null; players: readonly LineupPlayer[] }>(
    `/clubs/${encodeURIComponent(clubId)}/lineup-defaults?matchId=${encodeURIComponent(matchId)}`,
  );
}

export interface MatchSheetLineup {
  players: readonly LineupPlayer[];
  staff: readonly LineupStaff[];
}

export function writeMatchSheet(id: string, action: "draft" | "submit", lineup: MatchSheetLineup) {
  return request<ApiMatchSheet>(`/match-sheets/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: JSON.stringify(lineup),
  });
}

export function lockMatchSheet(matchSheetId: string): Promise<ApiMatchSheet> {
  return request<ApiMatchSheet>(
    `/match-sheets/${encodeURIComponent(matchSheetId)}/lock`,
    {
      method: "POST",
    },
  );
}

export function startRecognition(matchId: string) {
  return request("/recognitions/start", {
    method: "POST",
    body: JSON.stringify({ matchId }),
  });
}

export function completeRecognition(matchId: string) {
  return request("/recognitions/complete", {
    method: "POST",
    body: JSON.stringify({ matchId }),
  });
}

export class ApiRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

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
    const body = await response.json().catch(() => null) as { message?: unknown; error?: unknown } | null;
    const message = body?.message ?? body?.error;
    throw new ApiRequestError(response.status, typeof message === "string" ? message : `Richiesta non riuscita (HTTP ${response.status}).`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
