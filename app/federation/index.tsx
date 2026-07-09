import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImagePreview } from "@/components/ui/image-preview";
import { MobileScreen } from "@/components/ui/mobile-screen";
import { MobileTabs } from "@/components/ui/mobile-tabs";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/state";
import { useToast } from "@/components/ui/toast";
import { fetchFederationDashboard, fetchFederationHistory, fetchFederationMatches, fetchFederationReports, fetchPhotoRequests } from "@/lib/federation-api-client";
import { decideManagerPhotoApprovalRequest } from "@/lib/manager-photo-store";
import type { FederationHistoryItem, FederationMatchListItem, FederationReport, FederationReportEvent, FederationReportStatus, PhotoRequest, PhotoRequestStatus } from "@/lib/federation-types";
import { resolveRenderablePhotoUrl } from "@/lib/photo-url";
import { queryKeys, useApiQuery } from "@/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { colors, radii, spacing } from "@/lib/theme";

const sections = ["Cruscotto", "Calendario", "Referti", "Foto", "Storico"] as const;
const sectionTabs = sections.map((label, index) => ({ key: String(index), label }));
const reportStatuses: readonly ("all" | FederationReportStatus)[] = ["all", "missing", "draft", "submitted", "reviewed"];

export default function FederationPage() {
  const [section, setSection] = useState(0);

  return (
    <AuthGate allowedRole="federation">
      <MobileScreen
        contentStyle={styles.screen}
        edges={["left", "right"]}
        stickyHeader={
          <MobileTabs
            accessibilityLabel="Sezioni Federazione"
            items={sectionTabs}
            onChange={(key) => setSection(Number(key))}
            value={String(section)}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Area Federazione</Text>
          <Text style={styles.title}>Cruscotto operativo</Text>
        </View>
        {section === 0 ? <FederationDashboardPanel /> : null}
        {section === 1 ? <MatchCalendarPanel /> : null}
        {section === 2 ? <ReportsPanel /> : null}
        {section === 3 ? <PhotoRequestsPanel /> : null}
        {section === 4 ? <HistoryPanel /> : null}
      </MobileScreen>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRail}>
          <FilterChip active={matchday === "all"} label="Tutte" onPress={() => setMatchday("all")} />
          {days.map((day) => <View key={day}><FilterChip active={matchday === String(day)} label={`G${day}`} onPress={() => setMatchday(String(day))} /></View>)}
        </ScrollView>
      </View>
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Stato referto</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRail}>{reportStatuses.map((reportStatus) => <View key={reportStatus}><FilterChip active={status === reportStatus} label={formatStatusLabel(reportStatus)} onPress={() => setStatus(reportStatus)} /></View>)}</ScrollView>
      </View>
      <MatchList matches={filteredMatches} />
    </Card>
  );
}

function FilterChip({ active, label, onPress }: Readonly<{ active: boolean; label: string; onPress: () => void }>) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.choiceButton, active ? styles.choiceButtonActive : null]}><Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>{label}</Text></Pressable>;
}

function MatchList({ matches }: Readonly<{ matches: readonly FederationMatchListItem[] }>) {
  if (matches.length === 0) return <Text style={styles.emptyInline}>Nessuna gara trovata con i filtri selezionati.</Text>;
  return <View style={styles.matchList}>{matches.map((match) => <View key={match.id} style={styles.matchRow}><Text style={styles.matchday}>G{match.matchday}</Text><Text style={styles.matchTitle}>{match.homeTeam} - {match.awayTeam}</Text><Text style={styles.body}>Arbitro: {match.refereeName}</Text><View style={styles.badgeRow}><StatusBadge status={match.matchStatus} /><StatusBadge status={match.reportStatus} /></View></View>)}</View>;
}


function ReportsPanel() {
  const query = useApiQuery(queryKeys.matchReports, fetchFederationReports);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  if (query.isLoading) return <SkeletonBlock />;
  if (query.isError) return <ErrorState message={query.error?.message ?? "Errore sconosciuto"} onRetry={() => void query.refetch()} />;
  const reports = query.data ?? [];
  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null;
  return <View style={styles.cardGap}><Card style={styles.cardGapSmall}><View style={styles.panelHeader}><View style={styles.cardGapSmall}><Text style={styles.heading}>Referti ricevuti</Text><Text style={styles.body}>{reports.length} referti disponibili. Scorri orizzontalmente per cambiare selezione.</Text></View>{selectedReport ? <ReportSummary report={selectedReport} /> : null}</View><ReportList reports={reports} selectedReportId={selectedReport?.id ?? selectedReportId} onSelect={setSelectedReportId} /></Card>{selectedReport ? <ReportDetail report={selectedReport} /> : <EmptyState message="Seleziona un referto." />}</View>;
}

function ReportSummary({ report }: Readonly<{ report: FederationReport }>) {
  return <View style={styles.summaryPill}><Text style={styles.summaryScore}>{report.result.homeGoals}-{report.result.awayGoals}</Text><Text style={styles.summaryText}>{formatSubmittedAt(report.submittedAt)}</Text></View>;
}

function ReportList({ reports, selectedReportId, onSelect }: Readonly<{ reports: readonly FederationReport[]; selectedReportId: string | null; onSelect: (id: string) => void }>) {
  if (reports.length === 0) return <EmptyState message="Nessun referto ricevuto." />;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroller}>{reports.map((report) => <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedReportId === report.id }} key={report.id} onPress={() => onSelect(report.id)} style={[styles.reportChip, selectedReportId === report.id ? styles.listButtonActive : null]}><Text style={styles.matchTitle}>{report.homeTeam} - {report.awayTeam}</Text><Text style={styles.body}>{report.refereeName}</Text></Pressable>)}</ScrollView>;
}

function ReportDetail({ report }: Readonly<{ report: FederationReport }>) {
  return <Card style={styles.cardGap}><View style={styles.detailHeader}><View style={styles.cardGapSmall}><Text style={styles.kicker}>Dettaglio referto in sola lettura</Text><Text style={styles.heading}>{report.homeTeam} - {report.awayTeam}</Text><Text style={styles.body}>Arbitro: {report.refereeName}</Text><Text style={styles.body}>Invio: {formatSubmittedAt(report.submittedAt)}</Text></View><Text style={styles.scoreBadge}>{report.result.homeGoals}-{report.result.awayGoals}</Text></View><CollapsibleSection defaultExpanded title={`Gol (${report.goals.length})`}><ReportEvents events={report.goals} homeTeam={report.homeTeam} awayTeam={report.awayTeam} /></CollapsibleSection><CollapsibleSection title={`Ammonizioni (${report.cautions.length})`}><ReportEvents events={report.cautions} homeTeam={report.homeTeam} awayTeam={report.awayTeam} /></CollapsibleSection><CollapsibleSection title={`Espulsioni (${report.expulsions.length})`}><ReportEvents events={report.expulsions} homeTeam={report.homeTeam} awayTeam={report.awayTeam} /></CollapsibleSection><CollapsibleSection title={`Sostituzioni (${report.substitutions.length})`}><ReportEvents events={report.substitutions} homeTeam={report.homeTeam} awayTeam={report.awayTeam} /></CollapsibleSection><CollapsibleSection defaultExpanded title="Note"><ReadOnlyNotes title="Note arbitro" value={report.refereeNotes} />{report.commissionerNotes ? <ReadOnlyNotes title="Note commissario" value={report.commissionerNotes} /> : null}</CollapsibleSection></Card>;
}

function ReportEvents({ events, homeTeam, awayTeam }: Readonly<{ events: readonly FederationReportEvent[]; homeTeam: string; awayTeam: string }>) {
  return <View style={styles.cardGapSmall}>{events.length === 0 ? <Text style={styles.emptyInline}>Nessun evento.</Text> : null}{events.map((event) => <View key={event.id} style={styles.eventRow}><Text style={styles.matchday}>{event.minute}'</Text><Text style={styles.body}>{formatReportTeamName(event.teamName, homeTeam, awayTeam)}</Text><Text style={styles.body}>{event.playerName} · {event.detail}</Text></View>)}</View>;
}

function ReadOnlyNotes({ title, value }: Readonly<{ title: string; value: string }>) {
  return <View style={styles.cardGapSmall}><Text style={styles.filterLabel}>{title}</Text><Text style={styles.emptyInline}>{value}</Text></View>;
}

function PhotoRequestsPanel() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const query = useApiQuery(queryKeys.photos, fetchPhotoRequests);
  const [localStatuses, setLocalStatuses] = useState<Record<string, PhotoRequestStatus>>({});
  function transitionRequest(requestId: string, status: Exclude<PhotoRequestStatus, "pending">) {
    decideManagerPhotoApprovalRequest(requestId, status);
    setLocalStatuses((current) => ({ ...current, [requestId]: status }));
    notify(status === "approved" ? "Nuova foto approvata e resa disponibile al Club" : "Nuova foto rifiutata: il Club mantiene la foto attuale", "success");
    void queryClient.invalidateQueries({ queryKey: queryKeys.photos });
    void queryClient.invalidateQueries({ queryKey: queryKeys.players });
    void queryClient.invalidateQueries({ queryKey: queryKeys.staff });
  }
  if (query.isLoading) return <SkeletonBlock />;
  if (query.isError) return <ErrorState message={query.error?.message ?? "Errore sconosciuto"} onRetry={() => void query.refetch()} />;
  const requests = (query.data ?? []).map((request) => ({ ...request, status: localStatuses[request.id] ?? request.status }));
  return <Card style={styles.cardGap}><View style={styles.cardGapSmall}><Text style={styles.heading}>Richieste foto</Text><Text style={styles.body}>Confronta foto attuale e nuova proposta prima della decisione.</Text></View>{requests.length === 0 ? <EmptyState message="Nessuna richiesta foto." /> : null}{requests.map((request) => <View key={request.id}><PhotoRequestCard request={request} transitionRequest={transitionRequest} /></View>)}</Card>;
}

function PhotoRequestCard({ request, transitionRequest }: Readonly<{ request: PhotoRequest; transitionRequest: (requestId: string, status: Exclude<PhotoRequestStatus, "pending">) => void }>) {
  return <View style={styles.photoCard}><View style={styles.photoCardHeader}><View style={styles.cardGapSmall}><Text style={styles.matchTitle}>{request.playerName}</Text><Text style={styles.body}>Tesserato · {request.clubName}</Text></View><StatusBadge status={request.status} /></View><View style={styles.photoGrid}><PhotoBox label="Foto attuale" photoUrl={request.currentPhotoUrl} /><PhotoBox label="Nuova foto da approvare" photoUrl={request.proposedPhotoUrl} /></View>{request.status === "rejected" ? <Text style={styles.dangerNote}>Rifiuto comunicato al Club: resta valida la foto attuale e la Federazione può richiedere motivazione dell'upload e documenti afferenti l'identità del tesserato.</Text> : null}{request.status === "approved" ? <Text style={styles.successNote}>Foto approvata: la nuova immagine è subito disponibile al Club.</Text> : null}<View style={styles.photoActions}><Button disabled={request.status !== "pending"} onPress={() => transitionRequest(request.id, "approved")}>Approva</Button><Button disabled={request.status !== "pending"} onPress={() => transitionRequest(request.id, "rejected")} variant="danger">Rifiuta</Button></View></View>;
}

function PhotoBox({ label, photoUrl }: Readonly<{ label: string; photoUrl: string | null }>) {
  const resolvedPhotoUrl = resolveRenderablePhotoUrl(photoUrl);
  return <View style={styles.cardGapSmall}><Text style={styles.filterLabel}>{label}</Text><ImagePreview accessibilityLabel={label} placeholder="Nessuna immagine" style={styles.photoPreview} title={label} uri={resolvedPhotoUrl} />{resolvedPhotoUrl ? <Text style={styles.photoHint}>Tocca per ingrandire</Text> : null}</View>;
}


function HistoryPanel() {
  const historyQuery = useApiQuery(queryKeys.audit, fetchFederationHistory);
  const reportsQuery = useApiQuery([...queryKeys.matchReports, "history-actions"], fetchFederationReports);
  const [queryText, setQueryText] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const filteredHistory = useMemo(() => (historyQuery.data ?? []).filter((item) => `${item.matchLabel} ${item.clubNames.join(" ")} ${item.refereeName}`.toLowerCase().includes(queryText.toLowerCase())), [historyQuery.data, queryText]);
  const selectedAuditItem = filteredHistory.find((item) => item.id === selectedAuditId) ?? null;
  const selectedReport = (reportsQuery.data ?? []).find((report) => report.id === selectedReportId) ?? null;
  if (historyQuery.isLoading || reportsQuery.isLoading) return <SkeletonBlock />;
  if (historyQuery.isError) return <ErrorState message={historyQuery.error?.message ?? "Errore sconosciuto"} onRetry={() => void historyQuery.refetch()} />;
  if (reportsQuery.isError) return <ErrorState message={reportsQuery.error?.message ?? "Errore sconosciuto"} onRetry={() => void reportsQuery.refetch()} />;
  return <Card style={styles.cardGap}><View style={styles.cardGapSmall}><Text style={styles.heading}>Storico</Text><Text style={styles.body}>Ricerca gara, società o arbitro e apri solo il dettaglio necessario.</Text></View><View style={styles.searchBox}><TextInput onChangeText={setQueryText} placeholder="Cerca gara, società o arbitro" returnKeyType="search" style={styles.searchInput} value={queryText} />{queryText ? <Button onPress={() => setQueryText("")}>Pulisci</Button> : null}</View><Text style={styles.body}>{filteredHistory.length} risultati</Text>{filteredHistory.length === 0 ? <EmptyState message="Nessun elemento storico trovato." /> : null}<View style={styles.cardGapSmall}>{filteredHistory.map((item) => <View key={item.id}><HistoryCard item={item} onOpenReport={() => { setSelectedReportId(item.reportId); setSelectedAuditId(null); }} onOpenAudit={() => { setSelectedAuditId(item.id); setSelectedReportId(null); }} /></View>)}</View>{selectedReport ? <ReportDetail report={selectedReport} /> : null}{selectedAuditItem ? <AuditSummaryPanel item={selectedAuditItem} /> : null}</Card>;
}

function HistoryCard({ item, onOpenAudit, onOpenReport }: Readonly<{ item: FederationHistoryItem; onOpenAudit: () => void; onOpenReport: () => void }>) {
  return <View style={styles.photoCard}><View style={styles.cardGapSmall}><Text style={styles.matchTitle}>{item.matchLabel}</Text><Text style={styles.body}>Arbitro: {item.refereeName}</Text></View><View style={styles.buttonRow}><Button onPress={onOpenReport}>Apri referto</Button><Button onPress={onOpenAudit}>Audit sintetico</Button></View>{item.auditSummary.map((entry) => <Text key={entry} style={styles.body}>• {entry}</Text>)}</View>;
}

function AuditSummaryPanel({ item }: Readonly<{ item: FederationHistoryItem }>) {
  const auditEntries = ["Distinta inviata dal dirigente", "Riconoscimento completato dall’arbitro", "Referto inviato dall’arbitro", "Referto ricevuto dalla federazione", ...item.auditSummary];
  return <Card style={[styles.cardGap, styles.auditPanel]}><View><Text style={styles.kicker}>Audit sintetico</Text><Text style={styles.heading}>{item.matchLabel}</Text><Text style={styles.body}>Attore evento: {item.refereeName || "Arbitro Demo"}</Text></View>{auditEntries.map((entry, index) => <Text key={`${entry}-${index}`} style={styles.auditEntry}>{index + 1}. {entry}{"\n"}<Text style={styles.body}>Timestamp: {formatSubmittedAt(new Date().toISOString())}</Text></Text>)}</Card>;
}

function CollapsibleSection({ children, defaultExpanded = false, title }: Readonly<{ children: React.ReactNode; defaultExpanded?: boolean; title: string }>) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return <View style={styles.collapsible}><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((current) => !current)} style={styles.collapsibleHeader}><Text style={styles.filterLabel}>{title}</Text><Text style={styles.choiceText}>{expanded ? "Chiudi" : "Apri"}</Text></Pressable>{expanded ? <View style={styles.collapsibleBody}>{children}</View> : null}</View>;
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  return <Text style={[styles.statusBadge, getStatusStyle(status)]}>{formatStatusLabel(status)}</Text>;
}


function formatSubmittedAt(value: string) {
  return value ? new Date(value).toLocaleString("it-IT") : "Invio registrato";
}

function formatReportTeamName(teamName: string, homeTeam: string, awayTeam: string): string {
  if (teamName === "Casa") return homeTeam;
  if (teamName === "Ospite") return awayTeam;
  return teamName;
}

function formatStatusLabel(status: string) {
  return {
    all: "Tutti",
    archived: "Archiviata",
    approved: "Approvata",
    completed: "Completata",
    draft: "Bozza",
    failed: "Errore",
    in_progress: "In corso",
    missing: "Mancante",
    pending: "In attesa",
    rejected: "Rifiutata",
    reviewed: "Revisionato",
    scheduled: "Programmata",
    submitted: "Inviato",
    warning: "Attenzione",
  }[status] ?? status;
}

function getStatusStyle(status: string) {
  if (["submitted", "reviewed", "completed", "approved", "ok"].includes(status)) return styles.statusPositive;
  if (["failed", "rejected"].includes(status)) return styles.statusDanger;
  return styles.statusNeutral;
}

const styles = StyleSheet.create({
  auditEntry: { backgroundColor: colors.white, borderRadius: radii.md, color: colors.foreground, fontSize: 14, lineHeight: 20, padding: spacing.md },
  auditPanel: { backgroundColor: colors.muted },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dangerNote: { backgroundColor: "#fee2e2", borderRadius: radii.md, color: "#991b1b", fontSize: 12, lineHeight: 18, padding: spacing.sm },
  detailHeader: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" },
  horizontalScroller: { marginHorizontal: -spacing.xs },
  eventRow: { borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  inputLike: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.foreground, padding: spacing.md },
  listButton: { borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  listButtonActive: { backgroundColor: colors.muted, borderColor: colors.primary },
  photoActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.sm },
  photoCard: { borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  photoCardHeader: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  photoGrid: { gap: spacing.lg },
  photoHint: { color: colors.mutedForeground, fontSize: 12, fontWeight: "600" },
  photoPreview: { aspectRatio: 3 / 4, minHeight: 220 },
  panelHeader: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" },
  scoreBadge: { backgroundColor: colors.primary, borderRadius: radii.lg, color: colors.white, fontSize: 22, fontWeight: "900", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  successNote: { backgroundColor: colors.successBackground, borderRadius: radii.md, color: colors.successText, fontSize: 12, lineHeight: 18, padding: spacing.sm },
  cardGap: { gap: spacing.lg },
  cardGapSmall: { gap: spacing.sm },
  collapsible: { borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, overflow: "hidden" },
  collapsibleBody: { gap: spacing.sm, padding: spacing.md },
  collapsibleHeader: { alignItems: "center", backgroundColor: colors.muted, flexDirection: "row", justifyContent: "space-between", padding: spacing.md },
  choiceButton: { backgroundColor: colors.muted, borderRadius: radii.md, marginRight: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  choiceButtonActive: { backgroundColor: colors.primary },
  choiceText: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
  choiceTextActive: { color: colors.white },
  chipRail: { marginHorizontal: -spacing.xs },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  emptyInline: { backgroundColor: colors.muted, borderRadius: radii.lg, color: colors.mutedForeground, fontSize: 14, padding: spacing.md },
  filterGroup: { gap: spacing.sm },
  filterLabel: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  header: { gap: spacing.xs },
  heading: { color: colors.foreground, fontSize: 20, fontWeight: "700" },
  kicker: { color: colors.primary, fontWeight: "600" },
  matchList: { borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1 },
  matchRow: { borderBottomColor: colors.border, borderBottomWidth: 1, gap: spacing.sm, padding: spacing.md },
  reportChip: { borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.xs, marginRight: spacing.sm, minWidth: 220, padding: spacing.md },
  matchTitle: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  matchday: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  screen: { gap: spacing.lg },
  searchBox: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  searchInput: { borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.foreground, flex: 1, minHeight: 48, padding: spacing.md },
  statCard: { gap: spacing.sm },
  statGrid: { gap: spacing.md },
  statLabel: { color: colors.mutedForeground, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  statValue: { color: colors.foreground, fontSize: 32, fontWeight: "800" },
  statusBadge: { borderRadius: 999, fontSize: 12, fontWeight: "800", paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  summaryPill: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  summaryScore: { color: colors.white, fontSize: 22, fontWeight: "900" },
  summaryText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  statusDanger: { backgroundColor: "#fee2e2", color: "#991b1b" },
  statusNeutral: { backgroundColor: colors.muted, color: colors.foreground },
  statusPositive: { backgroundColor: colors.successBackground, color: colors.successText },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "700" },
});
