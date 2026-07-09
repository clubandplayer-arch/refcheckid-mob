import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileTabs } from "@/components/ui/mobile-tabs";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/state";
import { useToast } from "@/components/ui/toast";
import { queryKeys, useApiMutation, useApiQuery, useInvalidateQueries } from "@/lib/query";
import {
  completeRecognition,
  fetchRecognitionSubjects,
  fetchRefereeReport,
  fetchRefereeDashboard,
  fetchRefereeMatchSheets,
  lockSubmittedSheetsAndStartRecognition,
  submitRefereeReport,
} from "@/lib/referee-api-client";
import type { MatchReportDraft, MatchReportEvent, RecognitionDecision, RecognitionSubject, TeamSheetVerification } from "@/lib/referee-types";
import { useSession } from "@/lib/session";
import { saveSubmittedFederationReport } from "@/lib/submitted-report";
import {
  cautionReasons,
  countGoalsByTeam,
  expulsionReasons,
  goalTypes,
  reportTeams,
  resolveReportPlayerName,
  validateReportDraft,
  type ReportEventKey,
} from "@/lib/referee-report-validation";
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
      <RefereeWorkflowStepper currentStep={step} recognitionClosed={recognitionClosed} onChangeStep={setStep} />

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
        <MatchReportStep fullRecognitionComplete={fullRecognitionComplete} matchId={matchId} />
      ) : null}
      <RefereeWorkflowStepper currentStep={step} recognitionClosed={recognitionClosed} onChangeStep={setStep} />
    </View>
  );
}

function RefereeWorkflowStepper({ currentStep, onChangeStep, recognitionClosed }: Readonly<{ currentStep: number; onChangeStep: (step: number) => void; recognitionClosed: boolean }>) {
  return (
    <View style={styles.stepper}>
      {steps.map((label, index) => {
        const isRecognitionStepDisabled = recognitionClosed && index < 2;
        return (
          <Pressable
            accessibilityRole="button"
            disabled={isRecognitionStepDisabled}
            key={label}
            onPress={() => {
              if (!isRecognitionStepDisabled) onChangeStep(index);
            }}
            style={[
              styles.stepButton,
              currentStep === index ? styles.stepButtonActive : null,
              isRecognitionStepDisabled ? styles.stepButtonDisabled : null,
            ]}
          >
            <Text style={[styles.stepText, currentStep === index ? styles.stepTextActive : null]}>
              {index + 1}. {label}
            </Text>
          </Pressable>
        );
      })}
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
  const selectedTeamCompletedCount = selectedTeamSubjects.filter((subject) => decisions[subject.id]).length;
  const selectedTeamTotal = selectedTeamSubjects.length;
  const currentTeamDecisionOrder = decisionOrder.filter((subjectId) => {
    const subject = allSubjects.find((item) => item.id === subjectId);
    return subject?.teamName === activeTeamName;
  });
  const completedCount = decisionOrder.length;
  const recognizedSubjects = allSubjects.filter((subject) => decisions[subject.id]);
  const recognizedTeams = new Set(recognizedSubjects.map((subject) => subject.teamName));
  const hasHomeRecognition = teamNames[0] ? recognizedTeams.has(teamNames[0]) : false;
  const hasAwayRecognition = teamNames[1] ? recognizedTeams.has(teamNames[1]) : false;
  const fullRecognitionComplete =
    completedCount === allSubjects.length && hasHomeRecognition && hasAwayRecognition;
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
    const previousSubjectId = currentTeamDecisionOrder.at(-1);
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
        <Text style={styles.body}>{completedCount} tesserati verificati. Ogni squadra va chiusa separatamente.</Text>
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
          <Text style={styles.pendingAlert}>Completa le squadre evidenziate in arancione prima di chiudere il riconoscimento.</Text>
        )}
      </Card>
    );
  }

  return (
    <Card style={styles.cardGap}>
      <View style={styles.sheetHeader}>
        <View style={styles.sheetTitleBlock}>
          <Text style={styles.heading}>Riconoscimento</Text>
          <Text style={styles.body}>Controlla foto, dati e documento. Conferma il tesserato o torna indietro per rivedere.</Text>
        </View>
        <Text style={styles.progressPill}>{selectedTeamCompletedCount}/{selectedTeamTotal}</Text>
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
          </View>
        ) : (
          <Text style={styles.body}>Tocca per aprire i dati documento.</Text>
        )}
      </Pressable>
      <View style={styles.actionGrid}>
        <Button disabled={currentTeamDecisionOrder.length === 0} onPress={goBackToPreviousSubject}>Indietro</Button>
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


const reportSteps = ["Risultato", "Gol", "Ammonizioni", "Espulsioni", "Sostituzioni", "Note", "Riepilogo"] as const;
const reportStepTabs = reportSteps.map((label, index) => ({ key: String(index), label }));

function MatchReportStep({ fullRecognitionComplete, matchId }: Readonly<{ fullRecognitionComplete: boolean; matchId: string }>) {
  const toast = useToast();
  const invalidate = useInvalidateQueries();
  const query = useApiQuery([...queryKeys.matchReports, matchId], () => fetchRefereeReport(matchId));
  const subjectsQuery = useApiQuery([...queryKeys.recognitions, matchId, "report-options"], fetchRecognitionSubjects);
  const [step, setStep] = useState(0);
  const [report, setReport] = useState<MatchReportDraft | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const currentReport = report ?? query.data ?? null;
  const reportErrors = currentReport ? validateReportDraft(currentReport, subjectsQuery.data ?? []) : [];
  const recognitionErrors = fullRecognitionComplete ? [] : ["Riconoscimento non completato per entrambe le squadre"];
  const blockingErrors = [...recognitionErrors, ...reportErrors];
  const isReadOnly = isSubmitted || currentReport?.status === "submitted";
  const submitMutation = useApiMutation(() => currentReport ? submitRefereeReport(matchId, currentReport) : Promise.reject(new Error("Nessun referto disponibile.")), {
    onError(error) { toast.notify(error.message, "error"); },
    onSuccess() {
      if (currentReport) saveSubmittedFederationReport(matchId, currentReport);
      setIsSubmitted(true);
      toast.notify("Referto inviato", "success");
      void invalidate(queryKeys.matchReports);
    },
  });

  if (query.isLoading) return <SkeletonBlock />;
  if (query.isError) return <ErrorState message={query.error?.message ?? "Errore sconosciuto"} onRetry={() => void query.refetch()} />;
  if (!currentReport) return <EmptyState message="Nessun referto disponibile." />;
  const currentStep = reportSteps[step];
  return (
    <Card style={styles.cardGap}>
      <View style={styles.cardGapSmall}><Text style={styles.heading}>Referto</Text><Text style={styles.body}>Risultato, eventi disciplinari, sostituzioni, note e invio.</Text></View>
      <ReportQuickSummary blockingErrors={blockingErrors} onOpenSummary={() => setStep(reportSteps.length - 1)} report={currentReport} />
      <MobileTabs accessibilityLabel="Sezioni referto" items={reportStepTabs} onChange={(key) => setStep(Number(key))} value={String(step)} />
      {currentStep === "Risultato" ? <ResultPanel readOnly={isReadOnly} report={currentReport} setReport={setReport} /> : null}
      {currentStep === "Gol" ? <EventsPanel eventKey="goals" readOnly={isReadOnly} recognitionSubjects={subjectsQuery.data ?? []} report={currentReport} setReport={setReport} title="Gol" /> : null}
      {currentStep === "Ammonizioni" ? <EventsPanel eventKey="cautions" readOnly={isReadOnly} recognitionSubjects={subjectsQuery.data ?? []} report={currentReport} setReport={setReport} title="Ammonizioni" /> : null}
      {currentStep === "Espulsioni" ? <EventsPanel eventKey="expulsions" readOnly={isReadOnly} recognitionSubjects={subjectsQuery.data ?? []} report={currentReport} setReport={setReport} title="Espulsioni" /> : null}
      {currentStep === "Sostituzioni" ? <EventsPanel eventKey="substitutions" readOnly={isReadOnly} recognitionSubjects={subjectsQuery.data ?? []} report={currentReport} setReport={setReport} title="Sostituzioni" /> : null}
      {currentStep === "Note" ? <Input editable={!isReadOnly} multiline onChangeText={(refereeNotes: string) => setReport({ ...currentReport, refereeNotes })} style={styles.notesInput} value={currentReport.refereeNotes} /> : null}
      {currentStep === "Riepilogo" ? <SummaryPanel blockingErrors={blockingErrors} isReadOnly={isReadOnly} isPending={submitMutation.isPending} onSubmit={() => submitMutation.mutate()} report={currentReport} /> : null}
    </Card>
  );
}

function ResultPanel({ readOnly, report, setReport }: Readonly<{ readOnly: boolean; report: MatchReportDraft; setReport: (report: MatchReportDraft) => void }>) {
  return <View style={styles.twoColumn}><NumberField label="Gol Casa" readOnly={readOnly} value={report.homeGoals} onChange={(homeGoals) => setReport({ ...report, homeGoals })} /><NumberField label="Gol Ospite" readOnly={readOnly} value={report.awayGoals} onChange={(awayGoals) => setReport({ ...report, awayGoals })} /></View>;
}

function EventsPanel({ eventKey, readOnly, recognitionSubjects, report, setReport, title }: Readonly<{ eventKey: ReportEventKey; readOnly: boolean; recognitionSubjects: readonly RecognitionSubject[]; report: MatchReportDraft; setReport: (report: MatchReportDraft) => void; title: string }>) {
  const events = report[eventKey];
  const counts = countGoalsByTeam(report);
  const goalLimitReached = eventKey === "goals" && events.length >= report.homeGoals + report.awayGoals;
  const setEvents = (next: readonly MatchReportEvent[]) => setReport({ ...report, [eventKey]: next });
  const addEvent = () => {
    const base: MatchReportEvent = { detail: defaultDetail(eventKey), id: `${eventKey}-${Date.now()}-${events.length + 1}`, minute: Math.min((events.at(-1)?.minute ?? 0) + 1, 120), playerName: "", shirtNumber: null, teamName: counts.home < report.homeGoals ? "Casa" : "Ospite" };
    setEvents([...events, eventKey === "substitutions" ? { ...base, incomingPlayerName: "", incomingShirtNumber: null, outgoingPlayerName: "", outgoingShirtNumber: null } : base]);
  };
  const updateEvent = (id: string, patch: Partial<MatchReportEvent>) => setEvents(events.map((event) => {
    if (event.id !== id) return event;
    const next = { ...event, ...patch };
    if (("teamName" in patch || "shirtNumber" in patch) && !("playerName" in patch)) next.playerName = resolveReportPlayerName(next.teamName, next.shirtNumber);
    if (("teamName" in patch || "outgoingShirtNumber" in patch) && !("outgoingPlayerName" in patch)) next.outgoingPlayerName = resolveReportPlayerName(next.teamName, next.outgoingShirtNumber);
    if (("teamName" in patch || "incomingShirtNumber" in patch) && !("incomingPlayerName" in patch)) next.incomingPlayerName = resolveReportPlayerName(next.teamName, next.incomingShirtNumber);
    return next;
  }));
  return <View style={styles.cardGapSmall}><View style={styles.reportHeader}><View><Text style={styles.subheading}>{title}</Text><Text style={styles.body}>{events.length} eventi inseriti</Text></View><Button disabled={readOnly || goalLimitReached} onPress={addEvent}>Aggiungi</Button></View>{eventKey === "goals" ? <View style={styles.twoColumn}><Text style={styles.infoBox}>Gol casa inseriti {counts.home}/{report.homeGoals}</Text><Text style={styles.infoBox}>Gol ospite inseriti {counts.away}/{report.awayGoals}</Text></View> : null}{events.length === 0 ? <Text style={styles.emptyInline}>Nessun evento inserito.</Text> : events.map((event, index) => <View key={event.id} style={styles.eventCard}><View style={styles.eventHeader}><Text style={styles.subheading}>Evento {index + 1}</Text><Button disabled={readOnly} variant="danger" onPress={() => setEvents(events.filter((item) => item.id !== event.id))}>Rimuovi</Button></View><NumberField label="Minuto" readOnly={readOnly} value={event.minute} onChange={(minute) => updateEvent(event.id, { minute })} /><ChoiceField label="Squadra" readOnly={readOnly} options={reportTeams} value={event.teamName} onChange={(teamName) => updateEvent(event.id, eventKey === "substitutions" ? { incomingPlayerName: "", incomingShirtNumber: null, outgoingPlayerName: "", outgoingShirtNumber: null, teamName } : { playerName: "", shirtNumber: null, teamName })} />{eventKey === "substitutions" ? <SubstitutionFields event={event} onChange={(patch) => updateEvent(event.id, patch)} readOnly={readOnly} recognitionSubjects={recognitionSubjects} /> : <PlayerFields event={event} eventKey={eventKey} onChange={(patch) => updateEvent(event.id, patch)} readOnly={readOnly} recognitionSubjects={recognitionSubjects} />}{event.minute < (events[index - 1]?.minute ?? 0) ? <Text style={styles.missingAlert}>Evento fuori ordine cronologico.</Text> : null}</View>)}</View>;
}

function PlayerFields({ event, eventKey, onChange, readOnly, recognitionSubjects }: Readonly<{ event: MatchReportEvent; eventKey: Exclude<ReportEventKey, "substitutions">; onChange: (patch: Partial<MatchReportEvent>) => void; readOnly: boolean; recognitionSubjects: readonly RecognitionSubject[] }>) {
  const options = playerOptions(event.teamName, recognitionSubjects);
  const detailOptions = eventKey === "goals" ? goalTypes : eventKey === "cautions" ? cautionReasons : expulsionReasons;
  return <><ChoiceField label="Maglia" readOnly={readOnly} options={options.map((p) => String(p.shirtNumber))} value={event.shirtNumber ? String(event.shirtNumber) : ""} onChange={(value) => { const selected = options.find((p) => String(p.shirtNumber) === value); onChange({ playerName: selected ? `${selected.lastName} ${selected.firstName}` : resolveReportPlayerName(event.teamName, Number(value)), shirtNumber: Number(value) || null }); }} /><ChoiceField label="Dettaglio" readOnly={readOnly} options={detailOptions} value={event.detail} onChange={(detail) => onChange({ detail })} /></>;
}

function SubstitutionFields({ event, onChange, readOnly, recognitionSubjects }: Readonly<{ event: MatchReportEvent; onChange: (patch: Partial<MatchReportEvent>) => void; readOnly: boolean; recognitionSubjects: readonly RecognitionSubject[] }>) {
  const options = playerOptions(event.teamName, recognitionSubjects);
  const shirtOptions = options.map((p) => String(p.shirtNumber));
  const nameFor = (value: string) => { const selected = options.find((p) => String(p.shirtNumber) === value); return selected ? `${selected.lastName} ${selected.firstName}` : resolveReportPlayerName(event.teamName, Number(value)); };
  return <><ChoiceField label="Uscente" readOnly={readOnly} options={shirtOptions} value={event.outgoingShirtNumber ? String(event.outgoingShirtNumber) : ""} onChange={(value) => onChange({ outgoingPlayerName: nameFor(value), outgoingShirtNumber: Number(value) || null })} /><ChoiceField label="Entrante" readOnly={readOnly} options={shirtOptions} value={event.incomingShirtNumber ? String(event.incomingShirtNumber) : ""} onChange={(value) => onChange({ incomingPlayerName: nameFor(value), incomingShirtNumber: Number(value) || null })} /></>;
}

function ReportQuickSummary({ blockingErrors, onOpenSummary, report }: Readonly<{ blockingErrors: readonly string[]; onOpenSummary: () => void; report: MatchReportDraft }>) {
  const totalEvents = report.goals.length + report.cautions.length + report.expulsions.length + report.substitutions.length;
  return <Pressable accessibilityRole="button" onPress={onOpenSummary} style={styles.quickSummary}><View><Text style={styles.fieldLabel}>Riepilogo referto</Text><Text style={styles.body}>{report.homeGoals}-{report.awayGoals} · {totalEvents} eventi · {blockingErrors.length} errori</Text></View><Text style={blockingErrors.length ? styles.errorTitle : styles.completeText}>{blockingErrors.length ? "Da correggere" : "Pronto"}</Text></Pressable>;
}

function SummaryPanel({ blockingErrors, isReadOnly, isPending, onSubmit, report }: Readonly<{ blockingErrors: readonly string[]; isReadOnly: boolean; isPending: boolean; onSubmit: () => void; report: MatchReportDraft }>) {
  return <View style={styles.cardGapSmall}>{blockingErrors.length === 0 ? <Text style={styles.completePill}>Riepilogo pronto per l’invio.</Text> : <View style={styles.errorBox}><Text style={styles.errorTitle}>Referto non valido.</Text>{blockingErrors.map((error) => <Text key={error} style={styles.errorText}>• {error}</Text>)}</View>}<DetailRow label="Gol registrati" value={String(report.goals.length)} /><DetailRow label="Ammonizioni" value={String(report.cautions.length)} /><DetailRow label="Espulsioni" value={String(report.expulsions.length)} /><DetailRow label="Sostituzioni" value={String(report.substitutions.length)} /><Button disabled={isReadOnly || blockingErrors.length > 0 || isPending} onPress={onSubmit}>Invia referto</Button></View>;
}

function NumberField({ label, onChange, readOnly, value }: Readonly<{ label: string; onChange: (value: number) => void; readOnly: boolean; value: number }>) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><Input editable={!readOnly} keyboardType="number-pad" onChangeText={(text: string) => onChange(Number(text) || 0)} style={styles.numberInput} value={String(value)} /></View>;
}

function ChoiceField<T extends string>({ label, onChange, options, readOnly, value }: Readonly<{ label: string; onChange: (value: T) => void; options: readonly T[]; readOnly: boolean; value: string }>) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>{options.map((option) => <Pressable accessibilityRole="button" accessibilityState={{ disabled: readOnly, selected: value === option }} disabled={readOnly} key={option} onPress={() => onChange(option)} style={[styles.choiceButton, value === option ? styles.choiceButtonActive : null]}><Text style={[styles.choiceText, value === option ? styles.choiceTextActive : null]}>{option}</Text></Pressable>)}</ScrollView></View>;
}

function playerOptions(teamName: string, subjects: readonly RecognitionSubject[]) {
  const teamNames = Array.from(new Set(subjects.map((subject) => subject.teamName)));
  const selectedTeamName = teamNames[teamName === "Casa" ? 0 : 1] ?? teamNames[0] ?? "";
  return subjects.filter((subject) => subject.subjectKind === "player" && subject.teamName === selectedTeamName && subject.shirtNumber);
}

function defaultDetail(eventKey: ReportEventKey) { if (eventKey === "goals") return goalTypes[0]; if (eventKey === "cautions") return cautionReasons[0]; if (eventKey === "expulsions") return expulsionReasons[0]; return ""; }

const statusStyles = StyleSheet.create({
  locked: { backgroundColor: colors.successBackground, color: colors.successText },
  missing: { backgroundColor: colors.dangerBackground, color: colors.dangerText },
  submitted: { backgroundColor: colors.infoBackground, color: colors.infoText },
});

const styles = StyleSheet.create({
  actionGrid: { gap: spacing.sm },
  choiceButton: { backgroundColor: colors.muted, borderRadius: radii.md, marginRight: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  choiceButtonActive: { backgroundColor: colors.primary },
  choiceText: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
  choiceTextActive: { color: colors.white },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  emptyInline: { backgroundColor: colors.muted, borderRadius: radii.lg, color: colors.mutedForeground, fontSize: 14, padding: spacing.md },
  errorBox: { backgroundColor: colors.dangerBackground, borderRadius: radii.lg, gap: spacing.xs, padding: spacing.md },
  errorText: { color: colors.dangerText, fontSize: 13 },
  errorTitle: { color: colors.dangerText, fontSize: 14, fontWeight: "700" },
  eventCard: { borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  eventHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  field: { gap: spacing.xs },
  fieldLabel: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
  centeredCard: { alignItems: "center" },
  cardGap: { gap: spacing.lg },
  cardGapSmall: { gap: spacing.sm },
  completePill: { backgroundColor: colors.success, borderRadius: radii.lg, color: colors.white, fontSize: 14, fontWeight: "700", marginTop: spacing.sm, padding: spacing.sm, textAlign: "center" },
  completeText: { color: colors.successText, fontSize: 13, fontWeight: "800" },
  detailLabel: { color: colors.mutedForeground, fontSize: 14 },
  detailList: { gap: spacing.sm, marginTop: spacing.md },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailValue: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  documentCard: { borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  heading: { color: colors.foreground, fontSize: 20, fontWeight: "700" },
  infoBox: { backgroundColor: colors.infoBackground, borderRadius: radii.lg, color: colors.infoText, fontSize: 14, padding: spacing.md },
  missingAlert: { backgroundColor: colors.dangerBackground, borderRadius: radii.lg, color: colors.dangerText, fontSize: 14, fontWeight: "600", padding: spacing.md },
  notesInput: { minHeight: 160, textAlignVertical: "top" },
  numberInput: { fontSize: 22, fontWeight: "800", minHeight: 56, textAlign: "center" },
  pendingAlert: { backgroundColor: colors.warningBackground, borderRadius: radii.lg, color: colors.warningText, fontSize: 14, fontWeight: "600", padding: spacing.md },
  photoFrame: { alignItems: "center", alignSelf: "center", aspectRatio: 3 / 4, backgroundColor: colors.white, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, justifyContent: "center", maxWidth: 260, overflow: "hidden", width: "100%" },
  photoPlaceholder: { color: colors.mutedForeground, fontSize: 16, fontWeight: "600", textAlign: "center" },
  reportHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  reportTabs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  progressPill: { backgroundColor: colors.muted, borderRadius: 999, color: colors.foreground, fontSize: 13, fontWeight: "700", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  quickSummary: { alignItems: "center", backgroundColor: colors.muted, borderRadius: radii.lg, flexDirection: "row", justifyContent: "space-between", padding: spacing.md },
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
  subheading: { color: colors.foreground, fontSize: 17, fontWeight: "700" },
  subjectName: { color: colors.foreground, fontSize: 28, fontWeight: "800" },
  subjectPhoto: { height: "100%", width: "100%" },
  stepButton: { backgroundColor: colors.muted, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  stepButtonActive: { backgroundColor: colors.primary },
  stepButtonDisabled: { opacity: 0.5 },
  stepText: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  stepTextActive: { color: colors.white },
  stepper: { gap: spacing.sm },
  twoColumn: { gap: spacing.sm },
  teamSummary: { borderRadius: radii.xl, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  teamSummaryComplete: { backgroundColor: colors.successBackground, borderColor: colors.success },
  teamSummaryPending: { backgroundColor: colors.warningBackground, borderColor: colors.warning },
  teamSummaryTitle: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  workflow: { gap: spacing.lg },
});
