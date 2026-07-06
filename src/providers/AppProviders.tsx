import React, { useEffect, useRef } from "react";
import { bindSessionAccess } from "@/api/client";
import { AuthProvider } from "@/auth/auth-context";
import { SessionProvider, useSession } from "@/auth/session-context";
import { ToastProvider } from "@/components/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryProvider } from "./QueryProvider";
function SessionBinder({ children }: { children: React.ReactNode }) { const sessionRef = useRef(useSession().session); const session = useSession(); sessionRef.current = session.session; useEffect(() => bindSessionAccess({ getSession: () => sessionRef.current, setSession: session.setSession, clearSession: session.clearSession }), [session.setSession, session.clearSession]); return <>{children}</>; }
export function AppProviders({ children }: { children: React.ReactNode }) { return <ErrorBoundary><QueryProvider><SessionProvider><SessionBinder><AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider></SessionBinder></SessionProvider></QueryProvider></ErrorBoundary>; }
