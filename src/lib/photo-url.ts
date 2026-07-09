import { getApiBaseUrl } from "./api-base-url";

export function resolveRenderablePhotoUrl(photoUrl: string | null | undefined): string | null {
  const trimmed = photoUrl?.trim();
  if (!trimmed || trimmed.endsWith(".svg")) return null;
  if (/^(content|data|file|https?):/u.test(trimmed)) return trimmed;
  const apiOrigin = getApiBaseUrl().replace(/\/api\/v1\/?$/u, "");
  return `${apiOrigin}/${trimmed.replace(/^\/+/, "")}`;
}
