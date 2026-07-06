import React, { createContext, useCallback, useContext, useMemo } from "react";
import { loginWithPassword, logoutSession } from "./auth-client";
import { useSession } from "./session-context";
type AuthContextValue = { login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; isAuthenticated: boolean };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) { const { session, setSession, clearSession } = useSession(); const login = useCallback(async (email: string, password: string) => setSession(await loginWithPassword(email, password)), [setSession]); const logout = useCallback(async () => { const token = session?.refreshToken; await clearSession(); if (token) { try { await logoutSession(token); } catch {} } }, [session, clearSession]); const value = useMemo(() => ({ login, logout, isAuthenticated: !!session }), [login, logout, session]); return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>; }
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used inside AuthProvider"); return ctx; }
