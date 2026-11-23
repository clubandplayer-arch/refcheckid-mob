import { Redirect, router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { logoutSession } from "@/lib/auth-client";
import { colors, spacing } from "@/lib/theme";
import { hasAppRole, useSession, type AppRole, type AuthenticatedUser } from "@/lib/session";

export const roleRedirects: Record<AppRole, string> = {
  federation: "/federation",
  manager: "/manager",
  referee: "/referee",
};

const operationalRoles = ["manager", "referee"] as const;

export function getRoleRedirect(user: AuthenticatedUser): string {
  if (user.role === "manager" || user.role === "referee") return roleRedirects[user.role];
  const mobileRole = operationalRoles.find((role) => hasAppRole(user, role));
  return mobileRole ? roleRedirects[mobileRole] : roleRedirects.federation;
}

export function AuthGate({ allowedRole, children }: Readonly<{ allowedRole: AppRole; children: ReactNode }>) {
  const { isReady, logout, session } = useSession();

  if (!isReady) return <Verification />;
  if (!session) return <Redirect href="/" />;
  const webOnly = allowedRole === "federation" && getRoleRedirect(session.user) === roleRedirects.federation;
  if (!webOnly && !hasAppRole(session.user, allowedRole)) return <Redirect href={getRoleRedirect(session.user)} />;

  async function handleLogout() {
    if (session) {
      try {
        await logoutSession(session.refreshToken);
      } finally {
        logout();
        router.replace("/");
      }
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.userBarSafe}>
        <View style={styles.userBar}>
          <Text style={styles.userName}>{session.user.displayName}</Text>
          <Button onPress={() => void handleLogout()}>Logout</Button>
        </View>
      </SafeAreaView>
      {operationalRoles.filter((role) => role !== allowedRole && hasAppRole(session.user, role)).map((role) => (
        <Button key={role} onPress={() => router.replace(roleRedirects[role])}>{role === "manager" ? "Area dirigente" : "Area arbitro"}</Button>
      ))}
      {children}
    </View>
  );
}

function Verification() {
  return (
    <View style={styles.verifyScreen}>
      <Text style={styles.verifyText}>Verifica sessione…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, flex: 1 },
  userBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  userBarSafe: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  userName: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  verifyScreen: { flex: 1, padding: spacing.xl },
  verifyText: { color: colors.foreground, fontSize: 16 },
});
