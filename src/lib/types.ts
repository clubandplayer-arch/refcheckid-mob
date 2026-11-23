import type { ManagerPhotoState } from "./manager-photo-backend";

export type MatchSheetStatus = "draft" | "submitted" | "locked";
export type PlayerLineupRole = "starter" | "reserve";

export interface ManagerDashboard {
  games: readonly ManagerGame[];
  nextMatch: ManagerGame | null;
  matchSheetStatus: MatchSheetStatus;
  notifications: readonly string[];
}

export interface ManagerGame {
  id: string;
  clubId: string;
  clubName: string;
  opponent: string;
  scheduledAt: string;
  venue: string;
}

export interface PlayerListItem {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  registrationId: string | null;
  season: string | null;
  warning: boolean;
  suspended: boolean;
  selected: boolean;
  shirtNumber: number | null;
  role: PlayerLineupRole;
  isGoalkeeper: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
  photo?: ManagerPhotoState;
}

export interface StaffListItem {
  id: string;
  fullName: string;
  role: string;
  photoUrl: string | null;
  registrationId: string | null;
  season: string | null;
  selected: boolean;
  photo?: ManagerPhotoState;
}
