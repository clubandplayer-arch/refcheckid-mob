import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AuthGate } from "@/components/auth/auth-gate";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/state";
import { fetchFederationDashboard, fetchFederationMatches } from "@/lib/federation-api-client";
import type { FederationMatchListItem, FederationReportStatus } from "@/lib/federation-types";
import { queryKeys, useApiQuery } from "@/lib/query";
import { colors, radii, spacing } from "@/lib/theme";

const sections = ["Cruscotto", "Calendario", "Referti", "Foto", "Storico"] as const;
const reportStatuses: readonly ("all" | FederationReportStatus)[] = ["all", "missing", "draft", "submitted", "reviewed"];

export default function FederationPage() {
  const [section, setSection] = useState(0);

  return (
    <AuthGate allowedRole="federation">
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Area Federazione</Text>
          <Text style={styles.title}>Cruscotto operativo</Text>
        </View>
        <View style={styles.sectionTabs}>
          {sections.map((label, index) => (
            <Pressable
              accessibilityRole="button"
              key={label}
              onPress={() => setSection(index)}
              style={[styles.sectionButton, section === index ? styles.sectionButtonActive : null]}
            >
              <Text style={[styles.sectionText, section === index ? styles.sectionTextActive : null]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {section === 0 ? <FederationDashboardPanel /> : null}
        {section === 1 ? <MatchCalendarPanel /> : null}
        {section > 1 ? <Card><Text style={styles.body}>{sections[section]} disponibile nelle Wave successive.</Text></Card> : null}
      </View>
    </AuthGate>
  );
}

function FederationDashboardPanel() {
  const query = useApiQuery([...queryKeys.federation, "dashboard"], fetchFederationDashboard);
  if (query.isLoading) return <SkeletonBlock />;
  if (query.isError) return <ErrorState message={query.error?.message ?? "Errore sconosciuto"} onRetry={() => void query.refetch()} />;
  if (!query.data) return <EmptyState message="Dashboard federazione non disponibile." />;

  return (
    <View style={styles.cardGap}>
      <View style={styles.statGrid}>
        <StatCard label="Referti ricevuti" value={String(query.data.reportsReceived)} />
        <StatCard label="Gare in attesa" value={String(query.data.matchesPending)} />
        <StatCard label="Richieste foto" value={String(query.data.pendingPhotoRequests)} />
      </View>
      <Card style={styles.cardGapSmall}>
        <Text style={styles.heading}>Notifiche operative</Text>
        {query.data.notifications.length === 0 ? <Text style={styles.body}>Nessuna notifica operativa.</Text> : null}
        {query.data.notifications.map((notification) => <Text key={notification} style={styles.body}>• {notification}</Text>)}
      </Card>
    </View>
  );
}

function StatCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return <Card style={styles.statCard}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></Card>;
}

function MatchCalendarPanel() {
  const query = useApiQuery(queryKeys.matches, fetchFederationMatches);
  const [matchday, setMatchday] = useState("all");
  const [status, setStatus] = useState<(typeof reportStatuses)[number]>("all");
  const days = useMemo(() => [...new Set((query.data ?? []).map((match) => match.matchday))], [query.data]);
  const filteredMatches = useMemo(() => (query.data ?? []).filter((match) => {
    const matchdayMatches = matchday === "all" || String(match.matchday) === matchday;
    const statusMatches = status === "all" || match.reportStatus === status;
    return matchdayMatches && statusMatches;
  }), [matchday, query.data, status]);

  if (query.isLoading) return <SkeletonBlock />;
  if (query.isError) return <ErrorState message={query.error?.message ?? "Errore sconosciuto"} onRetry={() => void query.refetch()} />;

  return (
    <Card style={styles.cardGap}>
      <View style={styles.cardGapSmall}>
        <Text style={styles.heading}>Calendario gare</Text>
        <Text style={styles.body}>Filtra per giornata e stato referto.</Text>
      </View>
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Giornata</Text>
        <View style={styles.choiceWrap}>
          <FilterChip active={matchday === "all"} label="Tutte" onPress={() => setMatchday("all")} />
          {days.map((day) => <View key={day}><FilterChip active={matchday === String(day)} label={`G${day}`} onPress={() => setMatchday(String(day))} /></View>)}
        </View>
      </View>
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Stato referto</Text>
        <View style={styles.choiceWrap}>{reportStatuses.map((reportStatus) => <View key={reportStatus}><FilterChip active={status === reportStatus} label={formatStatusLabel(reportStatus)} onPress={() => setStatus(reportStatus)} /></View>)}</View>
      </View>
      <MatchList matches={filteredMatches} />
    </Card>
  );
}

function FilterChip({ active, label, onPress }: Readonly<{ active: boolean; label: string; onPress: () => void }>) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.choiceButton, active ? styles.choiceButtonActive : null]}><Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>{label}</Text></Pressable>;
}

function MatchList({ matches }: Readonly<{ matches: readonly FederationMatchListItem[] }>) {
  if (matches.length === 0) return <Text style={styles.emptyInline}>Nessuna gara trovata con i filtri selezionati.</Text>;
  return <View style={styles.matchList}>{matches.map((match) => <View key={match.id} style={styles.matchRow}><Text style={styles.matchday}>G{match.matchday}</Text><Text style={styles.matchTitle}>{match.homeTeam} - {match.awayTeam}</Text><Text style={styles.body}>Arbitro: {match.refereeName}</Text><View style={styles.badgeRow}><StatusBadge status={match.matchStatus} /><StatusBadge status={match.reportStatus} /></View></View>)}</View>;
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  return <Text style={[styles.statusBadge, isPositiveStatus(status) ? styles.statusPositive : styles.statusNeutral]}>{formatStatusLabel(status)}</Text>;
}

function formatStatusLabel(status: string) {
  return {
    all: "Tutti",
    completed: "Completata",
    draft: "Bozza",
    in_progress: "In corso",
    missing: "Mancante",
    reviewed: "Revisionato",
    scheduled: "Programmata",
    submitted: "Inviato",
  }[status] ?? status;
}

function isPositiveStatus(status: string) {
  return ["submitted", "reviewed", "completed", "approved", "ok"].includes(status);
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
  cardGap: { gap: spacing.lg },
  cardGapSmall: { gap: spacing.sm },
  choiceButton: { backgroundColor: colors.muted, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  choiceButtonActive: { backgroundColor: colors.primary },
  choiceText: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
  choiceTextActive: { color: colors.white },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  emptyInline: { backgroundColor: colors.muted, borderRadius: radii.lg, color: colors.mutedForeground, fontSize: 14, padding: spacing.md },
  filterGroup: { gap: spacing.sm },
  filterLabel: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  header: { gap: spacing.xs },
  heading: { color: colors.foreground, fontSize: 20, fontWeight: "700" },
  kicker: { color: colors.primary, fontWeight: "600" },
  matchList: { borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1 },
  matchRow: { borderBottomColor: colors.border, borderBottomWidth: 1, gap: spacing.sm, padding: spacing.md },
  matchTitle: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  matchday: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  screen: { gap: spacing.lg, padding: spacing.xl },
  sectionButton: { backgroundColor: colors.muted, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sectionButtonActive: { backgroundColor: colors.primary },
  sectionTabs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sectionText: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  sectionTextActive: { color: colors.white },
  statCard: { gap: spacing.sm },
  statGrid: { gap: spacing.md },
  statLabel: { color: colors.mutedForeground, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  statValue: { color: colors.foreground, fontSize: 32, fontWeight: "800" },
  statusBadge: { borderRadius: 999, fontSize: 12, fontWeight: "800", paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  statusNeutral: { backgroundColor: colors.muted, color: colors.foreground },
  statusPositive: { backgroundColor: colors.successBackground, color: colors.successText },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "700" },
});
