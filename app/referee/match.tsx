import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AuthGate } from "@/components/auth/auth-gate";
import { RefereeMatchWorkflow } from "@/features/referee/referee-match-workflow";
import { colors, spacing } from "@/lib/theme";

export default function RefereeMatchPage() {
  return (
    <AuthGate allowedRole="referee">
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text onPress={() => router.push("/referee")} style={styles.backLink}>← Torna alla dashboard</Text>
          <Text style={styles.title}>Gestione gara arbitro</Text>
        </View>
        <RefereeMatchWorkflow />
      </View>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  backLink: { color: colors.primary, fontSize: 14 },
  header: { gap: spacing.sm },
  screen: { gap: spacing.lg, padding: spacing.xl },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "700" },
});
