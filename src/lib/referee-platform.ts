import { request } from "./api-client";

export interface PlatformPage<T> {
  items: readonly T[];
  nextCursor: string | null;
}

export interface Appointment {
  id: string;
  fixtureId: string;
  role: "principal" | "assistant" | "table";
  status: "draft" | "invited" | "accepted" | "declined" | "revoked";
  operational: boolean;
  delegationActive: boolean;
  fixture: { matchId: string; externalCode: string; scheduledAt: string; venue: string };
}

export function fetchAppointments(cursor?: string | null) {
  return request<PlatformPage<Appointment>>(`/platform/my-appointments${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
}

export function replyToAppointment(id: string, action: "accept" | "decline") {
  return request(`/platform/appointments/${encodeURIComponent(id)}/change`, {
    method: "POST",
    body: JSON.stringify({ action, notes: action === "decline" ? "Indisponibilità comunicata dall’arbitro" : "" }),
  });
}

export type EventType = "goal" | "own_goal" | "yellow" | "red" | "substitution" | "points" | "set";
export type GameState = "provisional" | "period_confirmed" | "final_confirmed";

export interface GameEvent {
  id: string;
  period: number;
  type: EventType;
  clubId: string;
  registrationId: string | null;
  incomingRegistrationId: string | null;
  minute: number;
  stoppage: number;
  points: number;
}

export interface PeriodDraft {
  events: readonly GameEvent[];
  revision: number;
  period: number;
  correctionReason: string;
}

export interface PeriodUpdate extends PeriodDraft {
  operationId: string;
  state: GameState;
  homeScore: number;
  awayScore: number;
}

export interface GameSummary {
  revision: number;
  period: number;
  state: GameState;
  homeScore: number;
  awayScore: number;
}

export interface GameContext {
  recognitionStatus?: string;
  reportStatus: string | null;
  competition: { sport: string; rules: { periods: number; minutesPerPeriod: number } };
  home: { id: string; name: string };
  away: { id: string; name: string };
  players: readonly { registrationId: string; clubId: string; name: string; shirtNumber: number | null }[];
  events: readonly GameEvent[];
  summary: GameSummary | null;
  progress?: MatchClock | null;
}

export interface MatchClock {
  revision: number;
  phase: "live" | "interval" | "suspended" | "finished";
  seconds: number;
  runningSince: string | null;
  period: number;
}

export interface ClockCommand {
  action: "start" | "pause" | "resume" | "suspend";
  revision: number;
  operationId: string;
}

export function postClock(id: string, command: ClockCommand) {
  return request<MatchClock>(`${gamePath(id)}/clock`, { method: "POST", body: JSON.stringify(command) });
}

export function gamePath(id: string) {
  return `/platform/games/${encodeURIComponent(id)}`;
}

export async function fetchNotebook(id: string) {
  const path = gamePath(id);
  const access = await request<{ role: Appointment["role"] }>(`${path}/access`);
  const game = await request<GameContext>(path);
  return { game, role: access.role };
}

export function buildPeriodUpdate(draft: PeriodDraft, homeId: string, state: GameState, operationId: string): PeriodUpdate {
  let homeScore = 0;
  let awayScore = 0;
  for (const event of draft.events) {
    if (!["goal", "own_goal", "points", "set"].includes(event.type)) continue;
    const home = event.clubId === homeId;
    if (event.type === "own_goal" ? !home : home) homeScore += event.points;
    else awayScore += event.points;
  }
  return { ...draft, homeScore, awayScore, state, operationId };
}

export function postPeriod(id: string, update: PeriodUpdate) {
  return request<GameSummary>(`${gamePath(id)}/periods`, { method: "POST", body: JSON.stringify(update) });
}
