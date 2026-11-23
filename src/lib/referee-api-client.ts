import {
  ApiRequestError, completeRecognition, fetchMatches, fetchMatchReports, fetchMatchSheets,
  fetchMatchPhotoManifest, lockMatchSheet, request, selectOperationalMatch, startRecognition,
} from "./api-client";
import { resolveRenderablePhotoUrl } from "./photo-url";
import type { ApiMatch, ApiMatchSheet, ApiReport } from "./api-client";
import type {
  MatchReportDraft,
  RecognitionSubject,
  RefereeDashboard,
  TeamSheetVerification,
} from "./referee-types";

export async function fetchRefereeDashboard(): Promise<RefereeDashboard> {
  const matches = await fetchMatches();
  const nextMatch = selectOperationalMatch(matches);
  return {
    games: matches.map(toRefereeMatch),
    nextMatch: nextMatch ? toRefereeMatch(nextMatch) : null,
    notifications: nextMatch ? [toRefereeMatchNotification(nextMatch.status)] : [],
  };
}

function toRefereeMatchNotification(status: string): string {
  return {
    completed: "Gara completata",
    in_progress: "Gara in corso",
    scheduled: "Gara programmata",
  }[status] ?? `Gara ${status}`;
}

export async function fetchRefereeMatchSheets(
  matchId: string,
): Promise<readonly TeamSheetVerification[]> {
  const sheets = await fetchMatchSheets(
    `?matchId=${encodeURIComponent(matchId)}`,
  );
  return sheets.filter((sheet) => sheet.matchId === matchId).map(toTeamSheetVerification);
}

export async function fetchRecognitionSubjects(matchId?: string): Promise<
  readonly RecognitionSubject[]
> {
  if (!matchId) return [];
  const [manifest, saved] = await Promise.all([
    fetchMatchPhotoManifest(matchId),
    request<readonly { registrationId: string; status: string }[]>(`/recognitions?matchId=${encodeURIComponent(matchId)}`),
  ]);
  if (manifest.status !== "available") return [];
  return manifest.subjects.map((subject) => {
    const status = saved.find((entry) => entry.registrationId === subject.id)?.status;
    return { ...subject, photoUrl: resolveRenderablePhotoUrl(subject.photoUrl),
      decision: status === "recognized" ? "approved" : status === "rejected" ? "rejected" : "pending" };
  });
}

export function saveRecognitionDecision(matchId: string, registrationId: string, decision: "approved" | "rejected" | "pending", notes = "") {
  return request("/recognitions/decision", {
    method: "POST",
    body: JSON.stringify({ matchId, registrationId, status: decision === "approved" ? "recognized" : decision, notes: notes.trim() }),
  });
}

export function fetchRecognitionWorkflow(matchId: string) {
  return request<{ status: "not_started" | "in_progress" | "locked" }>(`/recognitions/workflow?matchId=${encodeURIComponent(matchId)}`);
}

export async function fetchRefereeReport(
  matchId: string,
): Promise<MatchReportDraft> {
  try {
    const response = await fetchMatchReports(`?matchId=${encodeURIComponent(matchId)}`);
    const report = Array.isArray(response) ? response[0] : response;
    return toReportDraft(report ?? null);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return toReportDraft(null);
    throw error;
  }
}

export async function lockSubmittedSheetsAndStartRecognition(
  matchId: string,
): Promise<unknown> {
  const sheets = await fetchMatchSheets(
    `?matchId=${encodeURIComponent(matchId)}`,
  );
  await Promise.all(
    sheets
      .filter((sheet) => sheet.matchId === matchId && sheet.status === "submitted")
      .map((sheet) => lockMatchSheet(sheet.id)),
  );
  const workflow = await fetchRecognitionWorkflow(matchId);
  return workflow.status === "not_started" ? startRecognition(matchId) : workflow;
}

export { completeRecognition };

export function writeRefereeReport(matchId: string, report: MatchReportDraft, action: "report-draft" | "final-report") {
  const { goals, cautions, expulsions, substitutions, refereeNotes, homeGoals, awayGoals } = report;
  const summary = JSON.stringify({
    matchId, goals, cautions, expulsions, substitutions, refereeNotes,
    result: { homeGoals, awayGoals },
  });
  return request<ApiReport>(`/matches/${encodeURIComponent(matchId)}/${action}`, {
    method: "POST", body: JSON.stringify({ summary }),
  });
}

function toRefereeMatch(
  match: ApiMatch,
): NonNullable<RefereeDashboard["nextMatch"]> {
  return {
    id: match.id,
    platformFixtureId: match.platformFixtureId,
    awayTeam: match.awayClubName ?? "Ospiti",
    homeTeam: match.homeClubName ?? "Casa",
    scheduledAt: match.scheduledAt,
    status:
      match.status === "completed"
        ? "completed"
        : match.status === "in_progress"
          ? "recognition"
          : "scheduled",
    venue: match.venue ?? "Da definire",
  };
}

function toTeamSheetVerification(sheet: ApiMatchSheet): TeamSheetVerification {
  return {
    id: sheet.id,
    clubName: sheet.clubName ?? "Società",
    playerCount: sheet.playerCount ?? 0,
    staffCount: sheet.staffCount ?? 0,
    status: sheet.status === "draft" ? "missing" : sheet.status,
    submittedAt: sheet.submittedAt,
    team: sheet.team ?? "home",
  };
}

function toReportDraft(report: ApiReport | null): MatchReportDraft {
  let summary: Partial<MatchReportDraft> & { result?: { homeGoals: number; awayGoals: number } } = {};
  if (report?.summary) {
    try {
      summary = JSON.parse(report.summary) ?? {};
    } catch {
      summary = { refereeNotes: report.summary };
    }
  }
  return {
    id: report?.id ?? null,
    status: report?.status ?? "draft",
    awayGoals: summary.result?.awayGoals ?? 0,
    cautions: summary.cautions ?? [],
    expulsions: summary.expulsions ?? [],
    goals: summary.goals ?? [],
    homeGoals: summary.result?.homeGoals ?? 0,
    refereeNotes: summary.refereeNotes ?? "",
    substitutions: summary.substitutions ?? [],
  };
}
