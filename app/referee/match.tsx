import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AuthGate } from "@/components/auth/auth-gate";
import { MobileScreen } from "@/components/ui/mobile-screen";
import { RefereeMatchWorkflow } from "@/features/referee/referee-match-workflow";
import { colors, spacing } from "@/lib/theme";

export default function RefereeMatchPage() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  return (
    <AuthGate allowedRole="referee">
      <MobileScreen contentStyle={styles.screen} keyboardAvoiding>
        <View style={styles.header}>
          <Text onPress={() => router.push("/referee")} style={styles.backLink}>← Torna alla dashboard</Text>
          <Text style={styles.title}>Gestione gara arbitro</Text>
        </View>
        <RefereeMatchWorkflow key={matchId} requestedMatchId={matchId ?? ""} />
      </MobileScreen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  backLink: { color: colors.primary, fontSize: 14 },
  header: { gap: spacing.sm },
  screen: { gap: spacing.lg },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "700" },
});
