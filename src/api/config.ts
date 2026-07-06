import Constants from "expo-constants";
export function getApiBaseUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_BASE_URL;
  const extra = Constants.expoConfig?.extra?.apiBaseUrl;
  return (env || extra || "http://localhost:3001").replace(/\/$/, "");
}
