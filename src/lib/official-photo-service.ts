import { request, type ApiPhoto } from "./api-client";
import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from "./local-storage";
import { resolveRenderablePhotoUrl } from "./photo-url";

export type OfficialPhotoSubjectKind = "player" | "staff";
export type OfficialPhotoState = "missing" | "pending" | "active" | "rejected" | "suspended";

export interface OfficialPhotoManifestEntry {
  subjectId: string;
  subjectKind: OfficialPhotoSubjectKind;
  state: OfficialPhotoState;
  photoUrl: string | null;
  version: string | null;
  updatedAt: string | null;
}

export interface OfficialPhotoUploadIntent {
  uploadId: string;
  uploadUrl: string;
  method?: string;
  headers?: Record<string, string>;
  storagePath?: string;
}

export interface OfficialPhotoUploadComplete {
  photo: ApiPhoto;
  manifestEntry?: OfficialPhotoManifestEntry;
}

export interface CreateOfficialPhotoUploadIntentInput {
  subjectId: string;
  subjectKind: OfficialPhotoSubjectKind;
  mimeType: string;
  sizeBytes: number;
}

export interface CompleteOfficialPhotoUploadInput extends CreateOfficialPhotoUploadIntentInput {
  uploadId: string;
  storagePath?: string;
}

const manifestCacheKey = "refcheckid.officialPhotoManifest.manager";
const manifestCacheVersion = 1;
const cacheMaxAgeMs = 15 * 60 * 1000;
const legacyFallbackFlag = "refcheckid.arch1.officialPhotoLegacyFallback";

interface ManifestCachePayload {
  version: number;
  cachedAt: string;
  entries: readonly OfficialPhotoManifestEntry[];
}

export function isOfficialPhotoLegacyFallbackEnabled(): boolean {
  return getLocalStorageItem(legacyFallbackFlag) === "enabled";
}

export async function fetchOfficialPhotoManifest(): Promise<readonly OfficialPhotoManifestEntry[]> {
  try {
    const entries = await request<readonly OfficialPhotoManifestEntry[]>("/official-photos/manifest?scope=manager");
    writeOfficialPhotoManifestCache(entries);
    return entries;
  } catch (error) {
    const cached = readOfficialPhotoManifestCache();
    if (cached) return cached;
    if (isOfficialPhotoLegacyFallbackEnabled()) return toManifestEntries(await request<readonly ApiPhoto[]>("/photos"));
    throw error;
  }
}

export function prefetchOfficialPhotoManifest(): Promise<readonly OfficialPhotoManifestEntry[]> {
  return fetchOfficialPhotoManifest();
}

export async function createOfficialPhotoUploadIntent(input: CreateOfficialPhotoUploadIntentInput): Promise<OfficialPhotoUploadIntent> {
  return request<OfficialPhotoUploadIntent>("/official-photos/upload-intents", {
    method: "POST",
    body: JSON.stringify({
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      subjectId: input.subjectId,
      subjectKind: input.subjectKind,
    }),
  });
}

export async function uploadOfficialPhotoBinary(intent: OfficialPhotoUploadIntent, photoUri: string, mimeType: string): Promise<void> {
  const response = await fetch(intent.uploadUrl, {
    method: intent.method ?? "PUT",
    headers: { "content-type": mimeType, ...(intent.headers ?? {}) },
    body: photoUri,
  });
  if (!response.ok) throw new Error(`Official photo upload failed with status ${response.status}.`);
}

export async function completeOfficialPhotoUpload(input: CompleteOfficialPhotoUploadInput): Promise<OfficialPhotoUploadComplete> {
  const result = await request<OfficialPhotoUploadComplete>("/official-photos/upload-complete", {
    method: "POST",
    body: JSON.stringify({
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: input.storagePath,
      subjectId: input.subjectId,
      subjectKind: input.subjectKind,
      uploadId: input.uploadId,
    }),
  });
  invalidateOfficialPhotoManifestCache();
  return result;
}

export function readOfficialPhotoManifestCache(): readonly OfficialPhotoManifestEntry[] | null {
  const raw = getLocalStorageItem(manifestCacheKey);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as ManifestCachePayload;
    if (payload.version !== manifestCacheVersion || !Array.isArray(payload.entries)) return null;
    if (Date.now() - Date.parse(payload.cachedAt) > cacheMaxAgeMs) return null;
    return payload.entries.filter(isOfficialPhotoManifestEntry);
  } catch {
    return null;
  }
}

export function writeOfficialPhotoManifestCache(entries: readonly OfficialPhotoManifestEntry[]): void {
  setLocalStorageItem(manifestCacheKey, JSON.stringify({ version: manifestCacheVersion, cachedAt: new Date().toISOString(), entries }));
}

export function invalidateOfficialPhotoManifestCache(): void {
  removeLocalStorageItem(manifestCacheKey);
}

export function resolveOfficialPhotoEntry(entries: readonly OfficialPhotoManifestEntry[], subjectId: string, subjectKind: OfficialPhotoSubjectKind): OfficialPhotoManifestEntry {
  return entries.find((entry) => entry.subjectId === subjectId && entry.subjectKind === subjectKind) ?? {
    subjectId,
    subjectKind,
    state: "missing",
    photoUrl: null,
    version: null,
    updatedAt: null,
  };
}

export function getOfficialPhotoStateLabel(state: OfficialPhotoState): string {
  return { active: "Active", missing: "Missing", pending: "Pending", rejected: "Rejected", suspended: "Suspended" }[state];
}

export function toManifestEntries(photos: readonly ApiPhoto[]): readonly OfficialPhotoManifestEntry[] {
  return photos.map((photo) => {
    const subjectKind: OfficialPhotoSubjectKind = photo.staffMemberId || photo.staff_member_id ? "staff" : "player";
    const subjectId = String(subjectKind === "player" ? photo.playerId ?? photo.player_id ?? photo.id : photo.staffMemberId ?? photo.staff_member_id ?? photo.id);
    return {
      subjectId,
      subjectKind,
      state: normalizePhotoState(photo.status),
      photoUrl: resolveRenderablePhotoUrl(photo.storagePath ?? photo.storage_path ?? null),
      version: photo.id,
      updatedAt: null,
    };
  });
}

function normalizePhotoState(status: unknown): OfficialPhotoState {
  if (status === "pending" || status === "rejected" || status === "suspended") return status;
  if (status === "active" || status === "approved") return "active";
  return "missing";
}

function isOfficialPhotoManifestEntry(value: unknown): value is OfficialPhotoManifestEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.subjectId === "string" && (entry.subjectKind === "player" || entry.subjectKind === "staff") && ["missing", "pending", "active", "rejected", "suspended"].includes(String(entry.state));
}
