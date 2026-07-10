import { request } from "./api-client";
import { getLocalStorageItem, setLocalStorageItem } from "./local-storage";
import { applyManagerPhotoOverrides, saveManagerSubjectPhoto } from "./manager-photo-store";
import type { ManagerTeam } from "./manager-team";
import { getPhotoFeatureFlags } from "./photo-feature-flags";
import type { PlayerListItem, StaffListItem } from "./types";

export type OfficialPhotoStatus = "missing" | "pending" | "active" | "rejected" | "suspended";

export interface ManagerPhotoState {
  readonly status: OfficialPhotoStatus;
  readonly currentPhotoUrl: string | null;
  readonly proposedPhotoUrl: string | null;
  readonly approvalId: string | null;
  readonly photoEtag: string | null;
  readonly cachedAt: string | null;
  readonly offline: boolean;
}

interface SignedReadResponse { signedUrl?: { url?: string }; version?: { status?: string; id?: string; sha256?: string; updatedAt?: string } }
interface ApprovalResponse { id: string; photoVersionId: string; registrationId: string | null; requestedAt?: string; status: string }
interface UploadIntentResponse { intent: { uploadId: string; objectKey: string; uploadUrl?: { url?: string; method?: string; headers?: Record<string, string> } } }

const cacheKey = "refcheckid.officialPhotoCache.v1";
const cacheTtlMs = 5 * 60 * 1000;

type CachedPhoto = ManagerPhotoState & { expiresAt: string };
type PhotoCache = Record<string, CachedPhoto>;

export async function enrichPlayersWithBackendPhotos(team: ManagerTeam, players: readonly PlayerListItem[]): Promise<readonly PlayerListItem[]> {
  const flags = getPhotoFeatureFlags();
  const legacyPlayers = flags.legacyLocalFallback ? applyManagerPhotoOverrides(team, players) : players;
  if (!flags.officialBackendRead) return legacyPlayers;
  const legacyPlayerById = new Map(legacyPlayers.map((player) => [player.id, player]));
  return Promise.all(players.map(async (player) => {
    const legacyPlayer = legacyPlayerById.get(player.id) ?? player;
    const photo = await readBackendPhotoState(player.id, player.registrationId ?? null, legacyPlayer.photoUrl);
    return { ...player, photo, photoUrl: photo.currentPhotoUrl };
  }));
}

export function enrichStaffWithBackendStatus(team: ManagerTeam, staff: readonly StaffListItem[]): readonly StaffListItem[] {
  const flags = getPhotoFeatureFlags();
  const legacyStaff = flags.legacyLocalFallback ? applyManagerPhotoOverrides(team, staff) : staff;
  return legacyStaff.map((member) => ({
    ...member,
    photo: { status: member.photoUrl ? "active" : "missing", currentPhotoUrl: member.photoUrl, proposedPhotoUrl: null, approvalId: null, photoEtag: null, cachedAt: null, offline: false },
  }));
}

export async function readBackendPhotoState(playerId: string, registrationId: string | null, legacyPhotoUrl: string | null): Promise<ManagerPhotoState> {
  const flags = getPhotoFeatureFlags();
  const cached = readCachedPhoto(playerId);
  let currentPhotoUrl: string | null = null;
  let currentStatus: OfficialPhotoStatus = "missing";
  let photoEtag: string | null = null;
  try {
    const signed = await request<SignedReadResponse>(`/players/${encodeURIComponent(playerId)}/photo?rendition=normalized&ttlSeconds=300`);
    currentPhotoUrl = signed.signedUrl?.url ?? null;
    photoEtag = signed.version?.sha256 ?? signed.version?.id ?? signed.version?.updatedAt ?? null;
    currentStatus = toOfficialStatus(signed.version?.status, currentPhotoUrl);
  } catch {
    if (cached) return { ...cached, offline: true };
    if (flags.legacyLocalFallback) currentPhotoUrl = legacyPhotoUrl;
    currentStatus = currentPhotoUrl ? "active" : "missing";
  }
  const approval = registrationId ? await readLatestApproval(registrationId).catch(() => null) : null;
  const state = await resolveApprovalState(approval, currentPhotoUrl, currentStatus, photoEtag);
  writeCachedPhoto(playerId, state);
  return state;
}

export async function uploadOfficialPlayerPhoto(input: { playerId: string; registrationId: string; clubId: string; federationId: string; seasonId: string; dataUrl: string; mimeType?: string; legacyPhotoUrl?: string | null; subjectName?: string; team?: ManagerTeam }): Promise<ManagerPhotoState> {
  const flags = getPhotoFeatureFlags();
  if (!flags.officialBackendUpload) throw new Error("Upload backend disabilitato dal feature flag photos.officialBackendUpload.");
  const bytes = dataUrlToBytes(input.dataUrl);
  const mimeType = input.mimeType ?? input.dataUrl.match(/^data:([^;]+);/)?.[1] ?? "image/jpeg";
  const sha256 = await sha256Hex(bytes);
  const intentResponse = await request<UploadIntentResponse>("/photos/upload-intent", { method: "POST", body: JSON.stringify({ playerId: input.playerId, registrationId: input.registrationId, federationId: input.federationId, seasonId: input.seasonId, mimeType, fileSizeBytes: bytes.byteLength, sha256, actorRole: "manager", clubId: input.clubId, registrationClubId: input.clubId }) });
  const { uploadId, objectKey, uploadUrl } = intentResponse.intent;
  if (uploadUrl?.url && uploadUrl.url.startsWith("http")) {
    const uploadResponse = await fetch(uploadUrl.url, { method: uploadUrl.method ?? "PUT", headers: uploadUrl.headers, body: toArrayBuffer(bytes) });
    if (!uploadResponse.ok) throw new Error(`Signed upload failed with status ${uploadResponse.status}.`);
  }
  await request(`/photos/uploads/${encodeURIComponent(uploadId)}/complete`, { method: "POST", body: JSON.stringify({ objectKey, ...(uploadUrl?.url && uploadUrl.url.startsWith("http") ? {} : { contentBase64: bytesToBase64(bytes) }), actorRole: "manager", clubId: input.clubId, federationId: input.federationId }) });
  if (flags.dualWriteLegacy) saveManagerSubjectPhoto(input.team ?? "home", input.playerId, input.dataUrl, input.legacyPhotoUrl ?? null, input.subjectName ?? input.playerId);
  const state = await readBackendPhotoState(input.playerId, input.registrationId, input.legacyPhotoUrl ?? null);
  writeCachedPhoto(input.playerId, state);
  return state;
}

export function prefetchOfficialPlayerPhotos(players: readonly PlayerListItem[]): void {
  players.forEach((player) => { if (player.registrationId) void readBackendPhotoState(player.id, player.registrationId, player.photoUrl); });
}

async function resolveApprovalState(approval: ApprovalResponse | null, currentPhotoUrl: string | null, currentStatus: OfficialPhotoStatus, photoEtag: string | null): Promise<ManagerPhotoState> {
  if (!approval) return makeState(currentStatus, currentPhotoUrl, null, null, photoEtag, false);
  const proposedPhotoUrl = await readVersionUrl(approval.photoVersionId).catch(() => null);
  if (approval.status === "pending") return makeState("pending", currentPhotoUrl, proposedPhotoUrl, approval.id, photoEtag, false);
  if (approval.status === "rejected") return makeState("rejected", currentPhotoUrl, proposedPhotoUrl, approval.id, photoEtag, false);
  return makeState("active", proposedPhotoUrl ?? currentPhotoUrl, null, approval.id, photoEtag, false);
}

async function readLatestApproval(registrationId: string): Promise<ApprovalResponse | null> {
  const approvals = await request<readonly ApprovalResponse[]>(`/photo-approvals?registrationId=${encodeURIComponent(registrationId)}`);
  return [...approvals].sort((left, right) => (left.requestedAt ?? "").localeCompare(right.requestedAt ?? "") || left.id.localeCompare(right.id)).at(-1) ?? null;
}

async function readVersionUrl(versionId: string): Promise<string | null> {
  const signed = await request<SignedReadResponse>(`/photos/versions/${encodeURIComponent(versionId)}/content?rendition=normalized&ttlSeconds=300`);
  return signed.signedUrl?.url ?? null;
}

function makeState(status: OfficialPhotoStatus, currentPhotoUrl: string | null, proposedPhotoUrl: string | null, approvalId: string | null, photoEtag: string | null, offline: boolean): ManagerPhotoState {
  return { status, currentPhotoUrl, proposedPhotoUrl, approvalId, photoEtag, cachedAt: new Date().toISOString(), offline };
}

function toOfficialStatus(status: string | undefined, url: string | null): OfficialPhotoStatus {
  if (status === "pending" || status === "rejected" || status === "suspended" || status === "missing") return status;
  return url ? "active" : "missing";
}

function readCache(): PhotoCache { try { return JSON.parse(getLocalStorageItem(cacheKey) ?? "{}"); } catch { return {}; } }
function writeCache(cache: PhotoCache): void { setLocalStorageItem(cacheKey, JSON.stringify(cache)); }
function readCachedPhoto(playerId: string): ManagerPhotoState | null { const cached = readCache()[playerId]; if (!cached || Date.parse(cached.expiresAt) < Date.now()) return null; return cached; }
function writeCachedPhoto(playerId: string, state: ManagerPhotoState): void { const cache = readCache(); cache[playerId] = { ...state, expiresAt: new Date(Date.now() + cacheTtlMs).toISOString() }; writeCache(cache); }
function dataUrlToBytes(dataUrl: string): Uint8Array { const base64 = dataUrl.split(",")[1] ?? ""; const binary = globalThis.atob(base64); return Uint8Array.from(binary, (char) => char.charCodeAt(0)); }
function bytesToBase64(bytes: Uint8Array): string { let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return globalThis.btoa(binary); }
async function sha256Hex(bytes: Uint8Array): Promise<string> { const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes)); return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer { const copy = new Uint8Array(bytes.byteLength); copy.set(bytes); return copy.buffer; }
