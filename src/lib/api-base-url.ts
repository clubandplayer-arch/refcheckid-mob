const defaultBackendPort = "4000";

export function getApiBaseUrl(): string {
  const expoPublicBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (expoPublicBaseUrl) return expoPublicBaseUrl;

  const nextPublicBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (nextPublicBaseUrl) return nextPublicBaseUrl;

  return `http://localhost:${defaultBackendPort}/api/v1`;
}
