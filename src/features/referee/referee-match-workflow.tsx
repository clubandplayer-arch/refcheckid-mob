import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/state";
import { useToast } from "@/components/ui/toast";
import { queryKeys, useApiMutation, useApiQuery, useInvalidateQueries } from "@/lib/query";
import {
  completeRecognition,
  fetchRecognitionSubjects,
  fetchRefereeDashboard,
  fetchRefereeMatchSheets,
  lockSubmittedSheetsAndStartRecognition,
} from "@/lib/referee-api-client";
import type { RecognitionDecision, RecognitionSubject, TeamSheetVerification } from "@/lib/referee-types";
import { useSession } from "@/lib/session";
import { colors, radii, spacing } from "@/lib/theme";

const steps = ["Distinte", "Riconoscimento", "Referto"] as const;

export function RefereeMatchWorkflow() {
  const [step, setStep] = useState(0);
  const [initialRecognitionTeamName, setInitialRecognitionTeamName] = useState<string | null>(null);
  const [recognitionClosed, setRecognitionClosed] = useState(false);
  const [fullRecognitionComplete, setFullRecognitionComplete] = useState(false);
  const { session } = useSession();
  const dashboardQuery = useApiQuery(
    [...queryKeys.referees, "dashboard"],
    fetchRefereeDashboard,
    { enabled: Boolean(session) },
  );
  const matchId = dashboardQuery.data?.nextMatch?.id ?? "";

  if (!session) return <ErrorState message="Sessione richiesta." />;
  if (dashboardQuery.isLoading) return <SkeletonBlock />;
  if (dashboardQuery.isError) {
    return <ErrorState message={dashboardQuery.error?.message ?? "Errore sconosciuto"} onRetry={() => void dashboardQuery.refetch()} />;
  }
  if (!matchId) return <EmptyState message="Nessuna gara assegnata." />;

  return (
    <View style={styles.workflow}>
      <View style={styles.stepper}>
        {steps.map((label, index) => {
          const isRecognitionStepDisabled = recognitionClosed && index < 2;
          return (
            <Pressable
              accessibilityRole="button"
              disabled={isRecognitionStepDisabled}
              key={label}
              onPress={() => {
                if (!isRecognitionStepDisabled) setStep(index);
              }}
              style={[
                styles.stepButton,
                step === index ? styles.stepButtonActive : null,
                isRecognitionStepDisabled ? styles.stepButtonDisabled : null,
              ]}
            >
              <Text style={[styles.stepText, step === index ? styles.stepTextActive : null]}>
                {index + 1}. {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {step === 0 ? (
        <SheetVerificationStep
          matchId={matchId}
          onStart={(teamName) => {
            setInitialRecognitionTeamName(teamName);
            setStep(1);
          }}
        />
      ) : null}
      {step === 1 ? (
        <RecognitionStep
          initialTeamName={initialRecognitionTeamName}
          isLocked={recognitionClosed}
          matchId={matchId}
          onComplete={() => {
            setFullRecognitionComplete(true);
            setRecognitionClosed(true);
            setStep(2);
          }}
        />
      ) : null}
      {step === 2 ? (
        <Card style={styles.cardGap}>
          <Text style={styles.heading}>Referto</Text>
          <Text style={styles.body}>
            {fullRecognitionComplete
              ? "Riconoscimento completato. Il referto sarà disponibile nella Wave 9."
              : "Completa il riconoscimento prima di accedere al referto."}
          </Text>
        </Card>
      ) : null}
    </View>
  );
}

function SheetVerificationStep({
  matchId,
  onStart,
}: Readonly<{ matchId: string; onStart: (teamName: string | null) => void }>) {
  const query = useApiQuery(
    [...queryKeys.matchSheets, matchId],
    () => fetchRefereeMatchSheets(matchId),
  );
  const invalidate = useInvalidateQueries();
  const toast = useToast();
  const [selectedStartTeam, setSelectedStartTeam] = useState<string | null>(null);
  const mutation = useApiMutation(() => lockSubmittedSheetsAndStartRecognition(matchId), {
    onError(error) {
      toast.notify(error.message, "error");
    },
    onSuccess() {
      void invalidate([...queryKeys.matchSheets, matchId]);
      toast.notify("Riconoscimento avviato.", "success");
    },
  });
  const sheets = query.data ?? [];
  const homeSheet = sheets.find((sheet) => sheet.team === "home");
  const defaultStartTeam = homeSheet?.clubName.split(" · ")[0] ?? null;
  const effectiveStartTeam = selectedStartTeam ?? defaultStartTeam;

  useEffect(() => {
    if (!selectedStartTeam && defaultStartTeam) setSelectedStartTeam(defaultStartTeam);
  }, [defaultStartTeam, selectedStartTeam]);

  if (query.isLoading) return <SkeletonBlock />;
  if (query.isError) return <ErrorState message={query.error?.message ?? "Errore sconosciuto"} onRetry={() => void query.refetch()} />;

  const missingAwaySheet = sheets.some((sheet) => sheet.team === "away" && sheet.status === "missing");
  const canStart = sheets.length > 0 && sheets.every((sheet) => sheet.status !== "missing");

  return (
    <Card style={styles.cardGap}>
      <View style={styles.cardGapSmall}>
        <Text style={styles.heading}>Verifica distinte</Text>
        <Text style={styles.body}>Controlla casa, ospite e stato prima di avviare il riconoscimento.</Text>
      </View>
      {sheets.length === 0 ? <EmptyState message="Nessuna distinta disponibile." /> : null}
      <View style={styles.sheetGrid}>
        {sheets.map((sheet) => {
          const teamName = sheet.clubName.split(" · ")[0] ?? sheet.clubName;
          return (
            <TeamSheetCard
              isSelected={effectiveStartTeam === teamName}
              key={sheet.id}
              onSelect={() => setSelectedStartTeam(teamName)}
              sheet={sheet}
            />
          );
        })}
      </View>
      {missingAwaySheet ? <Text style={styles.missingAlert}>Distinta ospite mancante</Text> : null}
      <Text style={styles.infoBox}>
        Il riconoscimento deve iniziare dalla squadra di casa. Se l’arbitro deve partire da un’altra distinta, può selezionare la squadra prima di avviare.
      </Text>
      <Button
        disabled={!canStart || mutation.isPending}
        onPress={() => {
          onStart(effectiveStartTeam);
          mutation.mutate();
        }}
      >
        Inizia riconoscimento {effectiveStartTeam ? `con ${effectiveStartTeam}` : ""}
      </Button>
    </Card>
  );
}


function RecognitionStep({
  initialTeamName,
  isLocked,
  matchId,
  onComplete,
}: Readonly<{
  initialTeamName: string | null;
  isLocked: boolean;
  matchId: string;
  onComplete: () => void;
}>) {
  const toast = useToast();
  const invalidate = useInvalidateQueries();
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(initialTeamName);
  const [showDocument, setShowDocument] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, RecognitionDecision>>({});
  const [decisionOrder, setDecisionOrder] = useState<readonly string[]>([]);
  const [isRecognitionClosed, setIsRecognitionClosed] = useState(isLocked);
  const query = useApiQuery(
    [...queryKeys.recognitions, matchId],
    fetchRecognitionSubjects,
  );
  const mutation = useApiMutation(() => completeRecognition(matchId), {
    onError(error) {
      setIsRecognitionClosed(false);
      toast.notify(error.message, "error");
    },
    onSuccess() {
      void invalidate([...queryKeys.recognitions, matchId]);
      toast.notify("Riconoscimento chiuso.", "success");
      onComplete();
    },
  });
  const allSubjects = useMemo(() => query.data ?? [], [query.data]);
  const teamNames = useMemo(
    () => Array.from(new Set(allSubjects.map((subject) => subject.teamName))),
    [allSubjects],
  );
  const activeTeamName = selectedTeamName ?? teamNames[0] ?? null;
  const selectedTeamSubjects = activeTeamName
    ? allSubjects.filter((subject) => subject.teamName === activeTeamName)
    : allSubjects;
  const currentSubject = selectedTeamSubjects.find((subject) => !decisions[subject.id]) ?? null;
  const completedCount = Object.keys(decisions).length;
  const pendingCount = Math.max(allSubjects.length - completedCount, 0);
  const fullRecognitionComplete = allSubjects.length > 0 && pendingCount === 0;
  const teamRecognitionSummaries = teamNames.map((teamName) => {
    const teamSubjects = allSubjects.filter((subject) => subject.teamName === teamName);
    const completed = teamSubjects.filter((subject) => decisions[subject.id]).length;
    return {
      completed,
      isComplete: teamSubjects.length > 0 && completed === teamSubjects.length,
      teamName,
      total: teamSubjects.length,
    };
  });

  useEffect(() => {
    if (!selectedTeamName && activeTeamName) setSelectedTeamName(activeTeamName);
  }, [activeTeamName, selectedTeamName]);

  if (isLocked || isRecognitionClosed) {
    return (
      <Card style={[styles.cardGap, styles.centeredCard]}>
        <Text style={styles.heading}>Riconoscimento LOCKED</Text>
        <Text style={styles.body}>Il riconoscimento è chiuso. Puoi proseguire solo con il referto.</Text>
        <Button onPress={onComplete}>Referto</Button>
      </Card>
    );
  }
  if (query.isLoading) return <SkeletonBlock />;
  if (query.isError) return <ErrorState message={query.error?.message ?? "Errore sconosciuto"} onRetry={() => void query.refetch()} />;
  if (allSubjects.length === 0) return <EmptyState message="Nessun tesserato da riconoscere." />;

  function decide(subject: RecognitionSubject, decision: Exclude<RecognitionDecision, "pending">) {
    setDecisions((current) => ({ ...current, [subject.id]: decision }));
    setDecisionOrder((current) => [...current.filter((subjectId) => subjectId !== subject.id), subject.id]);
    setShowDocument(false);
  }

  function goBackToPreviousSubject() {
    const previousSubjectId = decisionOrder.at(-1);
    if (!previousSubjectId) return;
    const previousSubject = allSubjects.find((subject) => subject.id === previousSubjectId);
    setDecisions((current) => {
      const next = { ...current };
      delete next[previousSubjectId];
      return next;
    });
    setDecisionOrder((current) => current.slice(0, -1));
    if (previousSubject) setSelectedTeamName(previousSubject.teamName);
    setShowDocument(false);
  }

  if (!currentSubject) {
    return (
      <Card style={[styles.cardGap, styles.centeredCard]}>
        <Text style={styles.heading}>{fullRecognitionComplete ? "Riconoscimento completato" : "Seleziona la prossima squadra"}</Text>
        <Text style={styles.body}>{completedCount} tesserati verificati. Pending: {pendingCount}.</Text>
        <View style={styles.sheetGrid}>
          {teamRecognitionSummaries.map((summary) => (
            <View key={summary.teamName} style={[styles.teamSummary, summary.isComplete ? styles.teamSummaryComplete : styles.teamSummaryPending]}>
              <Text style={styles.teamSummaryTitle}>{summary.teamName}</Text>
              <Text style={styles.body}>{summary.completed}/{summary.total} tesserati</Text>
              {summary.isComplete ? (
                <Text style={styles.completePill}>Riconoscimento concluso</Text>
              ) : (
                <Button onPress={() => setSelectedTeamName(summary.teamName)}>Apri {summary.teamName}</Button>
              )}
            </View>
          ))}
        </View>
        {fullRecognitionComplete ? (
          <Button
            disabled={mutation.isPending || isRecognitionClosed}
            onPress={() => {
              setIsRecognitionClosed(true);
              mutation.mutate();
            }}
          >
            {isRecognitionClosed ? "Riconoscimento chiuso" : "Conferma chiusura riconoscimento"}
          </Button>
        ) : (
          <Text style={styles.pendingAlert}>Completa tutti i tesserati prima di chiudere il riconoscimento.</Text>
        )}
      </Card>
    );
  }

  return (
    <Card style={styles.cardGap}>
      <View style={styles.sheetHeader}>
        <View style={styles.sheetTitleBlock}>
          <Text style={styles.heading}>Riconoscimento</Text>
          <Text style={styles.body}>Controlla foto, dati e documento. Approva o rifiuta ogni tesserato.</Text>
        </View>
        <Text style={styles.progressPill}>Pending {pendingCount}</Text>
      </View>
      <View style={styles.photoFrame}>
        {currentSubject.photoUrl ? (
          <Image accessibilityLabel={`Foto ${currentSubject.firstName} ${currentSubject.lastName}`} source={{ uri: currentSubject.photoUrl }} style={styles.subjectPhoto} />
        ) : (
          <Text style={styles.photoPlaceholder}>Foto non disponibile</Text>
        )}
      </View>
      <View style={styles.cardGapSmall}>
        <Text style={styles.sideLabel}>{currentSubject.teamName}</Text>
        <Text style={styles.subjectName}>{currentSubject.firstName} {currentSubject.lastName}</Text>
        <Text style={styles.body}>{currentSubject.subjectKind === "player" ? `Maglia #${currentSubject.shirtNumber ?? "-"}` : `Qualifica: ${currentSubject.roleLabel}`}</Text>
        <Text style={styles.body}>Ruolo: {currentSubject.roleLabel}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => setShowDocument((current) => !current)} style={styles.documentCard}>
        <Text style={styles.detailValue}>Documento</Text>
        {showDocument ? (
          <View style={styles.detailList}>
            <DetailRow label="Tipo" value={currentSubject.document.type} />
            <DetailRow label="Numero" value={currentSubject.document.number} />
            <DetailRow label="Scadenza" value={new Date(currentSubject.document.expiresAt).toLocaleDateString("it-IT")} />
          </View>
        ) : (
          <Text style={styles.body}>Tocca per aprire i dati documento.</Text>
        )}
      </Pressable>
      <View style={styles.actionGrid}>
        <Button disabled={decisionOrder.length === 0} onPress={goBackToPreviousSubject}>Indietro</Button>
        <Button variant="danger" onPress={() => decide(currentSubject, "rejected")}>Rifiuta</Button>
        <Button onPress={() => decide(currentSubject, "approved")}>Conferma riconoscimento</Button>
      </View>
    </Card>
  );
}

function TeamSheetCard({
  isSelected,
  onSelect,
  sheet,
}: Readonly<{ isSelected: boolean; key?: string; onSelect: () => void; sheet: TeamSheetVerification }>) {
  const statusLabel = {
    locked: "Pronta per il riconoscimento",
    missing: "Distinta non disponibile",
    submitted: "Inviata — da prendere in carico",
  }[sheet.status];
  const sideLabel = sheet.team === "home" ? "Squadra casa" : "Squadra ospite";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onSelect}
      style={[styles.sheetCard, isSelected ? styles.sheetCardSelected : null]}
    >
      <View style={styles.sheetHeader}>
        <View style={styles.sheetTitleBlock}>
          <Text style={styles.sideLabel}>{sideLabel}</Text>
          <Text style={styles.sheetClub}>{sheet.clubName}</Text>
        </View>
        <View style={styles.statusColumn}>
          {isSelected ? <Text style={styles.selectedPill}>Selezionata</Text> : null}
          <Text style={[styles.sheetStatus, statusStyles[sheet.status]]}>{statusLabel}</Text>
        </View>
      </View>
      <View style={styles.detailList}>
        <DetailRow label="Lato gara" value={sideLabel} />
        <DetailRow label="Giocatori" value={String(sheet.playerCount)} />
        <DetailRow label="Staff" value={String(sheet.staffCount)} />
        <DetailRow label="Invio" value={sheet.submittedAt ? "Ricevuta" : "Non ricevuta"} />
      </View>
    </Pressable>
  );
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const statusStyles = StyleSheet.create({
  locked: { backgroundColor: colors.successBackground, color: colors.successText },
  missing: { backgroundColor: colors.dangerBackground, color: colors.dangerText },
  submitted: { backgroundColor: colors.infoBackground, color: colors.infoText },
});

const styles = StyleSheet.create({
  actionGrid: { gap: spacing.sm },
  body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
  centeredCard: { alignItems: "center" },
  cardGap: { gap: spacing.lg },
  cardGapSmall: { gap: spacing.sm },
  completePill: { backgroundColor: colors.success, borderRadius: radii.lg, color: colors.white, fontSize: 14, fontWeight: "700", marginTop: spacing.sm, padding: spacing.sm, textAlign: "center" },
  detailLabel: { color: colors.mutedForeground, fontSize: 14 },
  detailList: { gap: spacing.sm, marginTop: spacing.md },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailValue: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  documentCard: { borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  heading: { color: colors.foreground, fontSize: 20, fontWeight: "700" },
  infoBox: { backgroundColor: colors.infoBackground, borderRadius: radii.lg, color: colors.infoText, fontSize: 14, padding: spacing.md },
  missingAlert: { backgroundColor: colors.dangerBackground, borderRadius: radii.lg, color: colors.dangerText, fontSize: 14, fontWeight: "600", padding: spacing.md },
  pendingAlert: { backgroundColor: colors.warningBackground, borderRadius: radii.lg, color: colors.warningText, fontSize: 14, fontWeight: "600", padding: spacing.md },
  photoFrame: { alignItems: "center", alignSelf: "center", aspectRatio: 3 / 4, backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, justifyContent: "center", maxWidth: 260, overflow: "hidden", width: "100%" },
  photoPlaceholder: { color: colors.mutedForeground, fontSize: 16, fontWeight: "600", textAlign: "center" },
  progressPill: { backgroundColor: colors.muted, borderRadius: 999, color: colors.foreground, fontSize: 13, fontWeight: "700", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  selectedPill: { backgroundColor: colors.primary, borderRadius: 999, color: colors.white, fontSize: 12, fontWeight: "700", paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  sheetCard: { borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, padding: spacing.lg },
  sheetCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  sheetClub: { color: colors.foreground, fontSize: 18, fontWeight: "700" },
  sheetGrid: { gap: spacing.md },
  sheetHeader: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  sheetStatus: { borderRadius: radii.lg, fontSize: 12, fontWeight: "700", maxWidth: 130, padding: spacing.sm, textAlign: "center" },
  sheetTitleBlock: { flex: 1, gap: spacing.xs },
  sideLabel: { color: colors.primary, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  statusColumn: { alignItems: "flex-end", gap: spacing.sm },
  subjectName: { color: colors.foreground, fontSize: 28, fontWeight: "800" },
  subjectPhoto: { height: "100%", width: "100%" },
  stepButton: { backgroundColor: colors.muted, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  stepButtonActive: { backgroundColor: colors.primary },
  stepButtonDisabled: { opacity: 0.5 },
  stepText: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  stepTextActive: { color: colors.white },
  stepper: { gap: spacing.sm },
  teamSummary: { borderRadius: radii.xl, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  teamSummaryComplete: { backgroundColor: colors.successBackground, borderColor: colors.success },
  teamSummaryPending: { backgroundColor: colors.warningBackground, borderColor: colors.warning },
  teamSummaryTitle: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  workflow: { gap: spacing.lg },
});
