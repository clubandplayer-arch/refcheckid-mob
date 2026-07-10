import type { ManagerPhotoState } from "./manager-photo-backend";

export type MatchSheetStatus = "draft" | "submitted" | "locked";
export type PlayerLineupRole = "starter" | "reserve";

export interface ManagerDashboard {
  nextMatch: {
    id: string;
    opponent: string;
    scheduledAt: string;
    venue: string;
  } | null;
  matchSheetStatus: MatchSheetStatus;
  notifications: readonly string[];
}

export interface PlayerListItem {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  registrationId?: string | null;
  season?: string | null;
  photo?: ManagerPhotoState;
  warning: boolean;
  suspended: boolean;
  selected: boolean;
  shirtNumber: number | null;
  role: PlayerLineupRole;
  isGoalkeeper: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface StaffListItem {
  id: string;
  fullName: string;
  role: string;
  photoUrl: string | null;
  photo?: ManagerPhotoState;
  selected: boolean;
}
