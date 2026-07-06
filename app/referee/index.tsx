import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/state";
import { queryKeys, useApiQuery } from "@/lib/query";
import { fetchRefereeDashboard } from "@/lib/referee-api-client";
import { colors, spacing } from "@/lib/theme";

export default function RefereePage() {
  const dashboardQuery = useApiQuery(
    [...queryKeys.referees, "dashboard"],
    fetchRefereeDashboard,
  );

  if (dashboardQuery.isLoading) {
    return (
      <AuthGate allowedRole="referee">
        <View style={styles.screen}>
          <SkeletonBlock />
        </View>
      </AuthGate>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <AuthGate allowedRole="referee">
        <View style={styles.screen}>
          <ErrorState
            message={dashboardQuery.error?.message ?? "Errore sconosciuto"}
            onRetry={() => void dashboardQuery.refetch()}
          />
        </View>
      </AuthGate>
    );
  }

  const dashboard = dashboardQuery.data;
  if (!dashboard) {
    return (
      <AuthGate allowedRole="referee">
        <View style={styles.screen}>
          <EmptyState message="Dashboard arbitro non disponibile." />
        </View>
      </AuthGate>
    );
  }

  const nextMatch = dashboard.nextMatch;

  return (
    <AuthGate allowedRole="referee">
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Area Arbitro</Text>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <Button onPress={() => router.push("/referee/match")}>Apri gara</Button>
        </View>

        <View style={styles.grid}>
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Prossima gara</Text>
            {nextMatch ? (
              <View style={styles.cardBody}>
                <Text style={styles.matchTitle}>
                  {nextMatch.homeTeam} - {nextMatch.awayTeam}
                </Text>
                <Text style={styles.body}>{new Date(nextMatch.scheduledAt).toLocaleString("it-IT")}</Text>
                <Text style={styles.body}>{nextMatch.venue}</Text>
              </View>
            ) : (
              <EmptyState message="Nessuna gara assegnata." />
            )}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Stato gara</Text>
            <Text style={styles.statusPill}>{formatMatchStatus(nextMatch?.status)}</Text>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Notifiche</Text>
            {dashboard.notifications.length === 0 ? (
              <EmptyState message="Nessuna notifica." />
            ) : (
              <View style={styles.notifications}>
                {dashboard.notifications.map((notification) => (
                  <Text key={notification} style={styles.body}>• {notification}</Text>
                ))}
              </View>
            )}
          </Card>
        </View>
      </View>
    </AuthGate>
  );
}

function formatMatchStatus(status: string | undefined): string {
  return {
    completed: "Completata",
    empty: "Nessuna gara",
    recognition: "Riconoscimento in corso",
    scheduled: "Programmata",
  }[status ?? "empty"] ?? status ?? "Nessuna gara";
}

const styles = StyleSheet.create({
  body: { color: colors.mutedForeground, fontSize: 14 },
  card: { gap: spacing.md },
  cardBody: { gap: spacing.xs },
  cardTitle: { color: colors.foreground, fontSize: 16, fontWeight: "600" },
  grid: { gap: spacing.md },
  header: { gap: spacing.md },
  headerText: { gap: spacing.xs },
  kicker: { color: colors.primary, fontWeight: "600" },
  matchTitle: { color: colors.foreground, fontSize: 18, fontWeight: "700" },
  notifications: { gap: spacing.sm },
  screen: { gap: spacing.lg, padding: spacing.xl },
  statusPill: {
    backgroundColor: colors.muted,
    borderRadius: 999,
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "700" },
});
