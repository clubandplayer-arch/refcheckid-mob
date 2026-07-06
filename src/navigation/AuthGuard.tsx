import React, { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/auth/auth-context";
import { useSession } from "@/auth/session-context";
import { AppRole, roleRedirects } from "@/auth/types";
import { Button, LoadingState } from "@/components/Primitives";
import { Text, View } from "react-native";
export function AuthGuard({ role, children }: { role: AppRole; children: React.ReactNode }) { const { session, isReady } = useSession(); const { logout } = useAuth(); useEffect(() => { if (!isReady) return; if (!session) router.replace("/"); else if (session.user.role !== role) router.replace(roleRedirects[session.user.role]); }, [isReady, session, role]); if (!isReady) return <LoadingState label="Verifica sessione…" />; if (!session || session.user.role !== role) return <LoadingState label="Reindirizzamento…" />; return <View style={{ flex: 1 }}><View style={{ padding: 16, gap: 8 }}><Text>{session.user.displayName} · {session.user.role}</Text><Button title="Logout" onPress={() => { logout().finally(() => router.replace("/")); }} /></View>{children}</View>; }
