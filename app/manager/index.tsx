import { IdentityHeader } from "@/features/auth/identity-header";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AuthGate } from "@/components/auth/auth-gate";
import { MobileScreen } from "@/components/ui/mobile-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/state";
import { fetchManagerDashboard } from "@/lib/api-client";
import { queryKeys, useApiQuery } from "@/lib/query";
import { colors, radii, spacing } from "@/lib/theme";
import type { MatchSheetStatus } from "@/lib/types";

export default function ManagerPage() {
  return (
    <AuthGate allowedRole="manager">
      <ManagerDashboard />
    </AuthGate>
  );
}

function ManagerDashboard() {
  const dashboardQuery = useApiQuery(
    [...queryKeys.manager, "dashboard"],
    fetchManagerDashboard,
  );

  if (dashboardQuery.isLoading) {
    return (
      <MobileScreen edges={["left", "right"]} contentStyle={styles.screen}>
        <SkeletonBlock />
      </MobileScreen>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <MobileScreen edges={["left", "right"]} contentStyle={styles.screen}>
        <ErrorState
          message={dashboardQuery.error?.message ?? "Errore API"}
          onRetry={() => void dashboardQuery.refetch()}
        />
      </MobileScreen>
    );
  }

  const dashboard = dashboardQuery.data;
  if (!dashboard) {
    return (
      <MobileScreen edges={["left", "right"]} contentStyle={styles.screen}>
        <EmptyState message="Dashboard dirigente non disponibile." />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen edges={["left", "right"]} contentStyle={styles.screen}>
      <IdentityHeader role="manager" />
      <View style={styles.header}>
        <View style={styles.headingText}>
          <Text style={styles.kicker}>Area Dirigente</Text>
          <Text style={styles.title}>Dashboard</Text>
        </View>

      </View>

      <View style={styles.cards}>
        <Card style={styles.dashboardCard}>
          <Text style={styles.cardTitle}>Gare autorizzate</Text>
          {dashboard.games.length === 0 ? <EmptyState message="Nessuna gara disponibile." /> : null}
          {dashboard.games.map((game) => (
            <View key={`${game.id}:${game.clubId}`} style={styles.matchDetails}>
              <Text style={styles.opponent}>{game.clubName} – {game.opponent}</Text>
              <Text style={styles.body}>{formatScheduledAt(game.scheduledAt)} · {game.venue}</Text>
              <Button onPress={() => router.push({ pathname: "/manager/match-sheet", params: { matchId: game.id, clubId: game.clubId } })}>Apri distinta</Button>
            </View>
          ))}
        </Card>

        <Card style={styles.dashboardCard}>
          <Text style={styles.cardTitle}>Stato distinta</Text>
          <Text style={styles.statusPill}>
            {formatMatchSheetStatus(dashboard.matchSheetStatus)}
          </Text>
        </Card>

        <Card style={styles.dashboardCard}>
          <Text style={styles.cardTitle}>Notifiche</Text>
          {dashboard.notifications.length === 0 ? (
            <EmptyState message="Nessuna notifica." />
          ) : (
            <View style={styles.notifications}>
              {dashboard.notifications.map((notification) => (
                <Text key={notification} style={styles.body}>
                  • {notification}
                </Text>
              ))}
            </View>
          )}
        </Card>
      </View>
    </MobileScreen>
  );
}

function formatMatchSheetStatus(status: MatchSheetStatus): string {
  return {
    draft: "Bozza — da completare e inviare",
    locked: "Presa in carico dall’arbitro",
    submitted: "Inviata — in attesa dell’arbitro",
  }[status];
}

function formatScheduledAt(scheduledAt: string): string {
  return new Date(scheduledAt).toLocaleString("it-IT");
}

const styles = StyleSheet.create({
  body: { color: colors.foreground, fontSize: 14 },
  cardTitle: { color: colors.foreground, fontSize: 16, fontWeight: "600" },
  cards: { gap: spacing.lg },
  dashboardCard: { gap: spacing.md },
  header: { gap: spacing.lg },
  headingText: { gap: spacing.xs },
  kicker: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  matchDetails: { gap: spacing.xs },
  notifications: { gap: spacing.sm },
  opponent: { color: colors.foreground, fontSize: 18, fontWeight: "700" },
  screen: { gap: spacing.md, paddingTop: spacing.xs },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.muted,
    borderRadius: radii.lg,
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "700" },
});
