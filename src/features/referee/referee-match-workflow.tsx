import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/state";
import { useToast } from "@/components/ui/toast";
import { queryKeys, useApiMutation, useApiQuery, useInvalidateQueries } from "@/lib/query";
import {
  fetchRefereeDashboard,
  fetchRefereeMatchSheets,
  lockSubmittedSheetsAndStartRecognition,
} from "@/lib/referee-api-client";
import type { TeamSheetVerification } from "@/lib/referee-types";
import { useSession } from "@/lib/session";
import { colors, radii, spacing } from "@/lib/theme";

const steps = ["Distinte", "Riconoscimento", "Referto"] as const;

export function RefereeMatchWorkflow() {
  const [step, setStep] = useState(0);
  const [initialRecognitionTeamName, setInitialRecognitionTeamName] = useState<string | null>(null);
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
        {steps.map((label, index) => (
          <Pressable
            accessibilityRole="button"
            key={label}
            onPress={() => setStep(index)}
            style={[styles.stepButton, step === index ? styles.stepButtonActive : null]}
          >
            <Text style={[styles.stepText, step === index ? styles.stepTextActive : null]}>
              {index + 1}. {label}
            </Text>
          </Pressable>
        ))}
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
        <Card style={styles.cardGap}>
          <Text style={styles.heading}>Riconoscimento</Text>
          <Text style={styles.body}>
            Riconoscimento avviato{initialRecognitionTeamName ? ` con ${initialRecognitionTeamName}` : ""}. La lista soggetti e le decisioni appartengono alla Wave 8.
          </Text>
        </Card>
      ) : null}
      {step === 2 ? (
        <Card style={styles.cardGap}>
          <Text style={styles.heading}>Referto</Text>
          <Text style={styles.body}>Referto disponibile nelle Wave successive.</Text>
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
  body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
  cardGap: { gap: spacing.lg },
  cardGapSmall: { gap: spacing.sm },
  detailLabel: { color: colors.mutedForeground, fontSize: 14 },
  detailList: { gap: spacing.sm, marginTop: spacing.md },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailValue: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  heading: { color: colors.foreground, fontSize: 20, fontWeight: "700" },
  infoBox: { backgroundColor: colors.infoBackground, borderRadius: radii.lg, color: colors.infoText, fontSize: 14, padding: spacing.md },
  missingAlert: { backgroundColor: colors.dangerBackground, borderRadius: radii.lg, color: colors.dangerText, fontSize: 14, fontWeight: "600", padding: spacing.md },
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
  stepButton: { backgroundColor: colors.muted, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  stepButtonActive: { backgroundColor: colors.primary },
  stepText: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  stepTextActive: { color: colors.white },
  stepper: { gap: spacing.sm },
  workflow: { gap: spacing.lg },
});
