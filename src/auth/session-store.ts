import * as SecureStore from "expo-secure-store";
import { AppSession, isValidSession } from "./types";
export const SESSION_KEY = "refcheckid.session";
export async function readStoredSession(): Promise<AppSession | null> { const raw = await SecureStore.getItemAsync(SESSION_KEY); if (!raw) return null; try { const parsed = JSON.parse(raw); return isValidSession(parsed) ? parsed : null; } catch { return null; } }
export async function writeStoredSession(session: AppSession): Promise<void> { await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session)); }
export async function clearStoredSession(): Promise<void> { await SecureStore.deleteItemAsync(SESSION_KEY); }
