import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearStoredSession, readStoredSession, writeStoredSession } from "./session-store";
import { AppSession } from "./types";
type SessionContextValue = { session: AppSession | null; isReady: boolean; setSession: (s: AppSession) => Promise<void>; clearSession: () => Promise<void> };
const SessionContext = createContext<SessionContextValue | undefined>(undefined);
export function SessionProvider({ children }: { children: React.ReactNode }) { const [session, setSessionState] = useState<AppSession | null>(null); const [isReady, setReady] = useState(false); useEffect(() => { readStoredSession().then(setSessionState).finally(() => setReady(true)); }, []); const setSession = useCallback(async (s: AppSession) => { await writeStoredSession(s); setSessionState(s); }, []); const clearSession = useCallback(async () => { await clearStoredSession(); setSessionState(null); }, []); const value = useMemo(() => ({ session, isReady, setSession, clearSession }), [session, isReady, setSession, clearSession]); return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>; }
export function useSession() { const ctx = useContext(SessionContext); if (!ctx) throw new Error("useSession must be used inside SessionProvider"); return ctx; }
