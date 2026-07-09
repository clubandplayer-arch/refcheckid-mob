import { Redirect, router } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { logoutSession } from "@/lib/auth-client";
import { colors, spacing } from "@/lib/theme";
import { useSession, type AppRole } from "@/lib/session";

export const roleRedirects: Record<AppRole, string> = {
  federation: "/federation",
  manager: "/manager",
  referee: "/referee",
};

export function AuthGate({ allowedRole, children }: Readonly<{ allowedRole: AppRole; children: ReactNode }>) {
  const { isReady, logout, session } = useSession();

  if (!isReady) return <Verification />;
  if (!session) return <Redirect href="/" />;
  if (session.user.role !== allowedRole) return <Redirect href={roleRedirects[session.user.role]} />;

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
