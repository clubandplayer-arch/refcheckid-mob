import { digest, CryptoDigestAlgorithm } from "expo-crypto";
import { fetch as fetchNative } from "expo/fetch";
import { request } from "./api-client";
import { resolveRenderablePhotoUrl } from "./photo-url";
import type { PlayerListItem, StaffListItem } from "./types";

export type OfficialPhotoStatus = "missing" | "pending" | "active" | "rejected" | "suspended";

export interface ManagerPhotoState {
  readonly status: OfficialPhotoStatus;
  readonly currentPhotoUrl: string | null;
  readonly proposedPhotoUrl: string | null;
  readonly approvalId: string | null;
  readonly requiresReplacementReason: boolean;
}

interface UploadIntentResponse {
  intent: { uploadId: string; objectKey: string; uploadUrl?: { url?: string; method?: string; headers?: Record<string, string> } };
}

export async function fetchManagerPhotoStates(clubId: string, registrationIds: readonly string[]) {
  const ids = [...new Set(registrationIds)];
  const rows = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const query = encodeURIComponent(ids.slice(offset, offset + 100).join(","));
    const response = await request<{ items: (ManagerPhotoState & { registrationId: string })[] }>(
      `/platform/club-photo-roster/${encodeURIComponent(clubId)}?registrations=${query}`,
    );
    rows.push(...response.items);
  }
  return new Map(rows.map((row) => [row.registrationId, {
    ...row,
    currentPhotoUrl: resolveRenderablePhotoUrl(row.currentPhotoUrl),
    proposedPhotoUrl: resolveRenderablePhotoUrl(row.proposedPhotoUrl),
  }]));
}

export function attachRosterPhotos<T extends PlayerListItem | StaffListItem>(members: readonly T[], photos?: ReadonlyMap<string, ManagerPhotoState>): readonly T[] {
  return members.map((member) => {
    const photo = member.registrationId ? photos?.get(member.registrationId) : undefined;
    return { ...member, photo, photoUrl: photo?.currentPhotoUrl ?? null };
  });
}

export async function uploadOfficialSubjectPhoto(input: { subjectKind: "athlete" | "staff_member"; subjectId: string; registrationId: string; clubId: string; federationId: string; seasonId: string; dataUrl: string; replacementReason: string; mimeType: string }): Promise<void> {
  const bytes = dataUrlToBytes(input.dataUrl);
  const mimeType = input.mimeType;
  const sha256 = await sha256Hex(bytes);
  const intentResponse = await request<UploadIntentResponse>("/photos/upload-intent", {
    method: "POST",
    body: JSON.stringify({
      subjectKind: input.subjectKind,
      subjectId: input.subjectId,
      ...(input.subjectKind === "athlete" ? { playerId: input.subjectId } : { staffMemberId: input.subjectId }),
      ...(input.replacementReason.trim() ? { replacementReason: input.replacementReason.trim() } : {}),
      registrationId: input.registrationId,
      federationId: input.federationId,
      seasonId: input.seasonId,
      mimeType,
      fileSizeBytes: bytes.byteLength,
      sha256,
      actorRole: "manager",
      clubId: input.clubId,
      registrationClubId: input.clubId,
    }),
  });
  const { uploadId, objectKey, uploadUrl } = intentResponse.intent;
  if (uploadUrl?.url && uploadUrl.url.startsWith("http")) {
    const uploadResponse = await fetchNative(uploadUrl.url, { method: uploadUrl.method ?? "PUT", headers: uploadUrl.headers, body: toArrayBuffer(bytes) });
    if (!uploadResponse.ok) {
      throw new Error(`Signed upload failed with status ${uploadResponse.status}.`);
    }
  }
  await request(`/photos/uploads/${encodeURIComponent(uploadId)}/complete`, {
    method: "POST",
    body: JSON.stringify({
      objectKey,
      ...(uploadUrl?.url && uploadUrl.url.startsWith("http") ? {} : { contentBase64: bytesToBase64(bytes) }),
      actorRole: "manager",
      clubId: input.clubId,
      federationId: input.federationId,
    }),
  });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = (dataUrl.split(",")[1] ?? "").split("#")[0] ?? "";
  const binary = decodeBase64(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return encodeBase64(binary);
}

function decodeBase64(value: string): string {
  if (typeof atob === "function") return atob(value);
  return getBuffer().from(value, "base64").toString("binary");
}

function encodeBase64(value: string): string {
  if (typeof btoa === "function") return btoa(value);
  return getBuffer().from(value, "binary").toString("base64");
}

function getBuffer(): { from(value: string, encoding: string): { toString(encoding: string): string } } {
  const buffer = (globalThis as unknown as { Buffer?: { from(value: string, encoding: string): { toString(encoding: string): string } } }).Buffer;
  if (!buffer) throw new Error("Base64 codec non disponibile in questo ambiente.");
  return buffer;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await digest(CryptoDigestAlgorithm.SHA256, toArrayBuffer(bytes));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
