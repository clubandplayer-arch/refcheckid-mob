import { Redirect } from "expo-router";
import { StyleSheet } from "react-native";
import { roleRedirects } from "@/components/auth/auth-gate";
import { MobileScreen } from "@/components/ui/mobile-screen";
import { LoginForm } from "@/features/auth/login-form";
import { colors, spacing } from "@/lib/theme";
import { useSession } from "@/lib/session";

export default function Index() {
  const { isReady, session } = useSession();

  if (isReady && session) return <Redirect href={roleRedirects[session.user.role]} />;

  return (
    <MobileScreen contentStyle={styles.screen} keyboardAvoiding style={styles.shell}>
      <LoginForm />
    </MobileScreen>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: colors.muted },
  screen: { flexGrow: 1, justifyContent: "center", paddingVertical: spacing.xl },
});
