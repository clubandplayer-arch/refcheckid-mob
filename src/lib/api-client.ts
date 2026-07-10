import { getApiBaseUrl } from "./api-base-url";
import { managerTeamConfig, getCurrentManagerTeam } from "./manager-team";
import { pilotAwayPlayers, pilotAwayStaff, pilotPlayers, pilotStaff } from "./pilot-data";
import { fetchOfficialPhotoManifest, resolveOfficialPhotoEntry } from "./official-photo-service";
import {
  isSessionExpired,
  removeStoredSession,
  readStoredSession,
  refreshStoredSession,
  writeStoredSession,
} from "./session";
import type { ManagerDashboard, PlayerListItem, StaffListItem } from "./types";

export interface ApiMatch {
  id: string;
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

export interface ApiPhoto {
  id: string;
  playerId?: string;
  player_id?: string | null;
  status?: string;
  staffMemberId?: string | null;
  staff_member_id?: string | null;
  storagePath?: string;
  storage_path?: string;
}

export const queryKeys = {
  audit: ["audit"] as const,
  federation: ["federation"] as const,
  manager: ["manager"] as const,
  matches: ["matches"] as const,
  matchReports: ["matchReports"] as const,
  matchSheets: ["matchSheets"] as const,
  photos: ["photos"] as const,
  players: ["players"] as const,
  recognitions: ["recognitions"] as const,
  referees: ["referees"] as const,
  staff: ["staff"] as const,
};

export async function fetchManagerDashboard(): Promise<ManagerDashboard> {
  const managerTeam = getCurrentManagerTeam();
  const managerClubId = managerTeamConfig[managerTeam].clubId;
  const [matches, sheets] = await Promise.all([
    fetchMatches(`?clubId=${encodeURIComponent(managerClubId)}`),
    fetchMatchSheets(`?clubId=${encodeURIComponent(managerClubId)}`),
  ]);
  const nextMatch =
    [...matches].sort((a, b) =>
      a.scheduledAt.localeCompare(b.scheduledAt),
    )[0] ?? null;
  const firstSheet = nextMatch
    ? sheets.find((sheet) => sheet.matchId === nextMatch.id)
    : null;
  return {
    nextMatch: nextMatch
      ? {
          id: nextMatch.id,
          opponent: managerTeamConfig[managerTeam].opponent,
          scheduledAt: nextMatch.scheduledAt,
          venue: nextMatch.venue ?? "Da definire",
        }
      : null,
    matchSheetStatus: firstSheet?.status ?? "draft",
    notifications: firstSheet ? [toManagerStatusNotification(firstSheet.status)] : [],
  };
}

function toManagerStatusNotification(status: ApiMatchSheet["status"]): string {
  return {
    draft: "Distinta in bozza: completa i convocati e inviala",
    locked: "Distinta presa in carico dall’arbitro",
    submitted: "Distinta inviata: attendi l’arbitro",
  }[status];
}

export async function fetchPlayers(): Promise<readonly PlayerListItem[]> {
  const [players, manifest] = await Promise.all([
    request<readonly Record<string, unknown>[]>("/players"),
    fetchOfficialPhotoManifest(),
  ]);
  const managerTeam = getCurrentManagerTeam();
  const pilotRoster = managerTeam === "away" ? pilotAwayPlayers : pilotPlayers;
  if (players.length === 0) return withOfficialPhotoManifest(pilotRoster, manifest, "player");
  return players.map((player) => ({
    id: String(player.id),
    firstName: String(player.firstName ?? player.first_name ?? ""),
    lastName: String(player.lastName ?? player.last_name ?? ""),
    photoUrl: resolveOfficialPhotoEntry(manifest, String(player.id), "player").photoUrl,
    officialPhotoState: resolveOfficialPhotoEntry(manifest, String(player.id), "player").state,
    warning: Boolean(player.warning ?? false),
    suspended: Boolean(player.suspended ?? false),
    selected: false,
    shirtNumber: null,
    role: "starter",
    isGoalkeeper: false,
    isCaptain: false,
    isViceCaptain: false,
  }));
}

export async function fetchStaff(): Promise<readonly StaffListItem[]> {
  const [staff, manifest] = await Promise.all([
    request<readonly Record<string, unknown>[]>("/staff-members"),
    fetchOfficialPhotoManifest(),
  ]);
  const managerTeam = getCurrentManagerTeam();
  const pilotRoster = managerTeam === "away" ? pilotAwayStaff : pilotStaff;
  if (staff.length === 0) return withOfficialPhotoManifest(pilotRoster, manifest, "staff");
  return staff.map((staffMember) => ({
    id: String(staffMember.id),
    fullName: String(
      staffMember.fullName ?? staffMember.full_name ?? staffMember.id,
    ),
    role: String(staffMember.role ?? "staff"),
    photoUrl: resolveOfficialPhotoEntry(manifest, String(staffMember.id), "staff").photoUrl,
    officialPhotoState: resolveOfficialPhotoEntry(manifest, String(staffMember.id), "staff").state,
    selected: false,
  }));
}

function withOfficialPhotoManifest<TSubject extends { id: string; photoUrl: string | null }>(subjects: readonly TSubject[], manifest: Awaited<ReturnType<typeof fetchOfficialPhotoManifest>>, kind: "player" | "staff"): readonly TSubject[] {
  return subjects.map((subject) => ({
    ...subject,
    photoUrl: resolveOfficialPhotoEntry(manifest, subject.id, kind).photoUrl,
    officialPhotoState: resolveOfficialPhotoEntry(manifest, subject.id, kind).state,
  }));
}

export function fetchMatches(query = ""): Promise<readonly ApiMatch[]> {
  return request<readonly ApiMatch[]>(`/matches${query}`);
}

export function fetchMatchSheets(
  query = "",
): Promise<readonly ApiMatchSheet[]> {
  return request<readonly ApiMatchSheet[]>(`/match-sheets${query}`);
}

export function resetSmokeMatchSheet(matchSheetId: string): Promise<ApiMatchSheet> {
  return request<ApiMatchSheet>(
    `/match-sheets/${encodeURIComponent(matchSheetId)}/reset-smoke`,
    { method: "POST" },
  );
}

export function fetchMatchReports(
  query = "",
): Promise<readonly ApiReport[] | ApiReport | null> {
  return request<readonly ApiReport[] | ApiReport | null>(
    `/match-reports${query}`,
  );
}

export function fetchPhotos(): Promise<readonly ApiPhoto[]> {
  return request<readonly ApiPhoto[]>("/photos");
}

export function submitMatchSheet(matchSheetId: string): Promise<ApiMatchSheet> {
  return request<ApiMatchSheet>(
    `/match-sheets/${encodeURIComponent(matchSheetId)}/submit`,
    {
      method: "POST",
    },
  );
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

export function updateMatchReport(
  reportId: string,
  summary: string,
): Promise<ApiReport> {
  return request<ApiReport>(`/match-reports/${encodeURIComponent(reportId)}`, {
    method: "PATCH",
    body: JSON.stringify({ summary }),
  });
}

export function submitMatchReport(reportId: string): Promise<ApiReport> {
  return request<ApiReport>(
    `/match-reports/${encodeURIComponent(reportId)}/submit`,
    { method: "POST" },
  );
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
