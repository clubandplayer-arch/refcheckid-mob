import { Redirect } from "expo-router";
import { StyleSheet, View } from "react-native";
import { roleRedirects } from "@/components/auth/auth-gate";
import { LoginForm } from "@/features/auth/login-form";
import { colors, spacing } from "@/lib/theme";
import { useSession } from "@/lib/session";

export default function Index() {
  const { isReady, session } = useSession();

  if (isReady && session) return <Redirect href={roleRedirects[session.user.role]} />;

  return (
    <View style={styles.screen}>
      <LoginForm />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.muted, flex: 1, justifyContent: "center", padding: spacing.xl },
});
