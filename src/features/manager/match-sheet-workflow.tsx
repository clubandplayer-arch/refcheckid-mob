import { useMemo, useRef, useState, type ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MobileTabs } from "@/components/ui/mobile-tabs";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/state";
import { fetchLineupDefaults, fetchManagerMatchSheet, fetchManagerRoster, writeMatchSheet, type ApiMatchSheet, type LineupRules } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import {
  getMatchSheetSubmitError,
  getPlayerStatusLabel,
  lineupRoleOptions,
  validateMatchSheet,
} from "@/lib/match-sheet-validation";
import { queryKeys, useApiMutation, useApiQuery, useInvalidateQueries } from "@/lib/query";
import { attachRosterPhotos, fetchManagerPhotoStates, uploadOfficialSubjectPhoto, type ManagerPhotoState } from "@/lib/manager-photo-backend";
import { choosePhotoFromLibrary, takePhotoWithCamera, type NativePhotoDraft } from "@/lib/native-image-picker";
import { colors, radii, spacing } from "@/lib/theme";
import { useToast } from "@/components/ui/toast";
import type { PlayerLineupRole, PlayerListItem, StaffListItem } from "@/lib/types";

const EMPTY_PLAYERS: readonly PlayerListItem[] = [];
const EMPTY_STAFF: readonly StaffListItem[] = [];
const steps = ["Compilazione", "Ordine", "Staff", "Riepilogo"] as const;
const stepTabs = steps.map((label, index) => ({ key: String(index), label: `${index + 1}. ${label}` }));
const maxPhotoSizeBytes = 5 * 1024 * 1024;

type PhotoDraft = NativePhotoDraft;

export function MatchSheetWorkflow({ matchId, clubId: managerClubId }: { matchId: string; clubId: string }) {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const { session } = useSession();
  const invalidateQueries = useInvalidateQueries();
  const { notify } = useToast();
  const writing = useRef(false);
  const [selectedPlayers, setSelectedPlayers] = useState<readonly PlayerListItem[] | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<readonly StaffListItem[] | null>(null);

  const sheetKey = [...queryKeys.matchSheets, matchId, managerClubId];
  const sheetQuery = useApiQuery(sheetKey, () => fetchManagerMatchSheet(matchId, managerClubId), { retry: false });
  const sheet = sheetQuery.data;
  const federationId = sheet?.match?.federationId ?? session?.user.clubFederationIds?.[managerClubId];
  const rosterQuery = useApiQuery([...queryKeys.roster, matchId, managerClubId], () => {
    if (!sheet?.match) throw new Error("Gara non disponibile.");
    return fetchManagerRoster(managerClubId, sheet.match);
  }, { enabled: !!sheet?.match });
  const playerRoster = rosterQuery.data?.players;
  const staffRoster = rosterQuery.data?.staff;
  const playerIds = (playerRoster ?? []).flatMap((player) => player.registrationId ? [player.registrationId] : []);
  const staffIds = (staffRoster ?? []).flatMap((member) => member.registrationId ? [member.registrationId] : []);
  const photoKey = [...queryKeys.photos, managerClubId];
  const playerPhotos = useApiQuery([...photoKey, "players", playerIds], () => fetchManagerPhotoStates(managerClubId, playerIds), { enabled: playerIds.length > 0 });
  const staffPhotos = useApiQuery([...photoKey, "staff", staffIds], () => fetchManagerPhotoStates(managerClubId, staffIds), { enabled: staffIds.length > 0 });
  const players = useMemo(() => attachRosterPhotos(selectedPlayers ?? restorePlayers(playerRoster ?? EMPTY_PLAYERS, sheet), playerPhotos.data), [selectedPlayers, playerRoster, sheet, playerPhotos.data]);
  const staff = useMemo(() => attachRosterPhotos(selectedStaff ?? restoreStaff(staffRoster ?? EMPTY_STAFF, sheet), staffPhotos.data), [selectedStaff, staffRoster, sheet, staffPhotos.data]);
  const calledPlayers = players.filter((player) => player.selected);
  const calledStaff = staff.filter((member) => member.selected);
  const matchSheetStatus = sheet?.status ?? "draft";
  const writeMutation = useApiMutation(async (action: "draft" | "submit") => {
    if (!sheet || sheet.status !== "draft") throw new Error("Distinta non modificabile.");
    const lineup = {
      players: calledPlayers.map((player, lineupOrder) => {
        if (!player.registrationId) throw new Error("Tesseramento atleta mancante.");
        return {
          playerRegistrationId: player.registrationId, shirtNumber: player.shirtNumber,
          role: player.role, lineupOrder, isGoalkeeper: player.isGoalkeeper,
          isCaptain: player.isCaptain, isViceCaptain: player.isViceCaptain,
        };
      }),
      staff: calledStaff.map((member) => {
        if (!member.registrationId) throw new Error("Tesseramento staff mancante.");
        return { staffRegistrationId: member.registrationId, role: member.role };
      }),
    };
    return writeMatchSheet(sheet.id, action, lineup);
  }, {
    async onSuccess(_result, action) {
      await invalidateQueries(queryKeys.matchSheets);
      setSelectedPlayers(null);
      setSelectedStaff(null);
      notify(action === "draft" ? "Bozza confermata dal server" : "Distinta inviata", "success");
    },
    onError(error) { notify(error.message, "error"); },
  });
  function saveLineup(action: "draft" | "submit") {
    if (writing.current || sheet?.status !== "draft") return;
    writing.current = true;
    void writeMutation.mutateAsync(action).catch(() => undefined).finally(() => { writing.current = false; });
  }

  const isReadOnly = matchSheetStatus !== "draft" || writeMutation.isPending;

  const defaults = useApiMutation(() => fetchLineupDefaults(managerClubId, matchId), {
    onSuccess(result) {
      if (!result.sourceMatchSheetId) {
        notify("Nessuna distinta precedente disponibile.");
        return;
      }
      setSelectedPlayers((current) => (current ?? players).map((player) => {
        if (!player.selected) return player;
        const previous = result.players.find((line) => line.playerRegistrationId === player.registrationId);
        if (!previous) return player;
        return {
          ...player,
          role: previous.role === "reserve" ? "reserve" : "starter",
          shirtNumber: previous.shirtNumber,
          isGoalkeeper: !!previous.isGoalkeeper,
          isCaptain: !!previous.isCaptain,
          isViceCaptain: !!previous.isViceCaptain,
        };
      }));
      notify("Suggerimenti caricati. Verifica numeri e incarichi prima di salvare.", "info");
    },
    onError(error) { notify(error.message, "error"); },
  });
  const filteredPlayers = useMemo(
    () => players
      .filter((player) => `${player.lastName} ${player.firstName}`.toLowerCase().includes(query.toLowerCase()))
      .sort((left, right) => left.lastName.localeCompare(right.lastName)),
    [players, query],
  );

  function setPlayerList(updater: (current: readonly PlayerListItem[]) => readonly PlayerListItem[]) {
    if (isReadOnly) return;
    setSelectedPlayers(updater(players));
  }

  function setStaffList(updater: (current: readonly StaffListItem[]) => readonly StaffListItem[]) {
    if (isReadOnly) return;
    setSelectedStaff(updater(staff));
  }


  async function uploadPhoto(member: PlayerListItem | StaffListItem, draft: PhotoDraft, replacementReason: string) {
    if (!member.registrationId || !member.season || !federationId) throw new Error("Tesseramento o federazione non disponibile.");
    await uploadOfficialSubjectPhoto({
      subjectKind: "firstName" in member ? "athlete" : "staff_member", subjectId: member.id,
      registrationId: member.registrationId, clubId: managerClubId, federationId,
      seasonId: member.season, dataUrl: draft.dataUrl, mimeType: draft.mimeType, replacementReason,
    });
    await invalidateQueries(photoKey);
    notify("Richiesta foto confermata dal server", "success");
  }

  function togglePlayer(playerId: string) {
    setPlayerList((current) => current.map((player) => (
      player.id === playerId && !player.suspended
        ? {
          ...player,
          isCaptain: player.selected ? false : player.isCaptain,
          isViceCaptain: player.selected ? false : player.isViceCaptain,
          selected: !player.selected,
        }
        : player
    )));
  }

  function toggleStaff(staffId: string) {
    setStaffList((current) => current.map((staffMember) => (
      staffMember.id === staffId ? { ...staffMember, selected: !staffMember.selected } : staffMember
    )));
  }

  function updatePlayer(playerId: string, patch: Partial<PlayerListItem>) {
    setPlayerList((current) => current.map((player) => (
      player.id === playerId ? { ...player, ...patch } : player
    )));
  }

  function toggleCaptain(playerId: string) {
    setPlayerList((current) => current.map((player) => {
      if (player.id !== playerId) return { ...player, isCaptain: false };
      const nextCaptain = !player.isCaptain;
      return { ...player, isCaptain: nextCaptain, isViceCaptain: nextCaptain ? false : player.isViceCaptain };
    }));
  }

  function toggleViceCaptain(playerId: string) {
    setPlayerList((current) => current.map((player) => {
      if (player.id !== playerId) return { ...player, isViceCaptain: false };
      const nextViceCaptain = !player.isViceCaptain;
      return { ...player, isCaptain: nextViceCaptain ? false : player.isCaptain, isViceCaptain: nextViceCaptain };
    }));
  }

  function movePlayer(playerId: string, direction: -1 | 1) {
    setPlayerList((current) => {
      const next = [...current];
      const index = next.findIndex((player) => player.id === playerId);
      const called = current.filter((player) => player.selected);
      const calledIndex = called.findIndex((player) => player.id === playerId);
      const neighbor = calledIndex < 0 ? undefined : called[calledIndex + direction];
      if (!neighbor) return current;
      const target = current.indexOf(neighbor);
      const [player] = next.splice(index, 1);
      next.splice(target, 0, player);
      return next;
    });
  }

  if (rosterQuery.isLoading || sheetQuery.isLoading) return <Screen><SkeletonBlock /></Screen>;
  if (rosterQuery.isError) return <Screen><ErrorState message={rosterQuery.error.message} onRetry={() => void rosterQuery.refetch()} /></Screen>;
  if (sheetQuery.isError) return <Screen><ErrorState message={sheetQuery.error?.message ?? "Errore API"} onRetry={() => void sheetQuery.refetch()} /></Screen>;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Distinta {sheet?.clubName ?? ""}</Text>
        <Text style={styles.title}>Distinta gara</Text>
        <Text style={styles.body}>Completa convocati, ordine, staff e riepilogo prima dell’invio.</Text>
        <Text style={styles.statusPill}>Stato: {getMatchSheetStatusLabel(matchSheetStatus)}</Text>
        {matchSheetStatus !== "draft" ? <Text style={styles.readOnly}>Distinta inviata: non puoi più modificarla. Se serve correggere qualcosa, avvisa l’arbitro o la segreteria.</Text> : null}
        {matchSheetStatus === "draft" ? <Button disabled={isReadOnly} onPress={() => saveLineup("draft")}>Salva bozza</Button> : null}
      </View>
      <MatchSheetStepper currentStep={step} onChangeStep={setStep} />
      {step === 0 ? (
        <Card style={styles.section}>
          <Text style={styles.cardTitle}>Convocazioni</Text>
          <PhotoApprovalNotice />
          <Input onChangeText={setQuery} placeholder="Cerca giocatore" value={query} />
          <Button disabled={isReadOnly || !players.some((player) => !player.suspended && !player.selected)}
            onPress={() => setPlayerList((current) => current.map((player) => player.suspended ? player : { ...player, selected: true }))}>Seleziona tutti</Button>
          <Text accessibilityLiveRegion="polite">{calledPlayers.length} giocatori convocati</Text>
          <Text style={styles.body}>Seleziona tutta la rosa idonea, anche con una ricerca attiva.</Text>
          {filteredPlayers.length === 0 ? <EmptyState message="Nessun giocatore trovato." /> : null}
          {filteredPlayers.map((player) => (
            <View key={player.id} style={styles.rowCard}>
              <Text style={styles.name}>{player.lastName} {player.firstName}</Text>
              <Text style={styles.body}>{getPlayerStatusLabel(player)}</Text>
              <PhotoCaptureControls photo={player.photo} failed={playerPhotos.isError} onUpload={(draft, reason) => uploadPhoto(player, draft, reason)} />
              <Button disabled={isReadOnly || player.suspended} onPress={() => togglePlayer(player.id)}>{player.selected ? "Rimuovi" : "Convoca"}</Button>
            </View>
          ))}
        </Card>
      ) : null}
      {step === 1 && !isReadOnly && calledPlayers.length > 0 ? (
        <Button disabled={defaults.isPending} onPress={() => defaults.mutate()}>Usa numeri e incarichi della distinta precedente</Button>
      ) : null}
      {step === 1 ? <OrderStep readOnly={isReadOnly} players={calledPlayers} movePlayer={movePlayer} toggleCaptain={toggleCaptain} togglePlayer={togglePlayer} toggleViceCaptain={toggleViceCaptain} updatePlayer={updatePlayer} /> : null}
      {step === 2 ? (
        <Card style={styles.section}>
          <Text style={styles.cardTitle}>Staff</Text>
          <Button disabled={isReadOnly || !staff.some((member) => !member.selected)}
            onPress={() => setStaffList((current) => current.map((member) => ({ ...member, selected: true })))}>Seleziona tutti</Button>
          <Text accessibilityLiveRegion="polite">{calledStaff.length} membri dello staff selezionati</Text>
          {staff.length === 0 ? <EmptyState message="Nessuno staff disponibile." /> : null}
          {staff.map((member) => (
            <View key={member.id} style={styles.rowCard}>
              <Text style={styles.name}>{member.fullName}</Text>
              <Text style={styles.body}>{member.role}</Text>
              <PhotoCaptureControls photo={member.photo} failed={staffPhotos.isError} onUpload={(draft, reason) => uploadPhoto(member, draft, reason)} />
              <Button disabled={isReadOnly} onPress={() => toggleStaff(member.id)}>{member.selected ? "Rimuovi" : "Seleziona"}</Button>
            </View>
          ))}
        </Card>
      ) : null}
      {step === 3 ? <SummaryStep rules={sheet?.match?.lineupRules} isReadOnly={isReadOnly} isSubmitting={writeMutation.isPending} onInvalidSubmit={(message) => notify(message, "error")} onSubmit={() => saveLineup("submit")} players={calledPlayers} staff={calledStaff} /> : null}
      <MatchSheetStepper currentStep={step} onChangeStep={setStep} />
    </Screen>
  );
}

function restorePlayers(players: readonly PlayerListItem[], sheet?: ApiMatchSheet): readonly PlayerListItem[] {
  const lines = [...(sheet?.players ?? [])].sort((a, b) => a.lineupOrder - b.lineupOrder);
  const selected = lines.flatMap((line) => {
    const player = players.find((item) => item.registrationId === line.playerRegistrationId);
    if (!player) return [];
    const role = lineupRoleOptions.find((option) => option.value === line.role)?.value ?? player.role;
    return [{
      ...player, role, selected: true, shirtNumber: line.shirtNumber,
      isGoalkeeper: !!line.isGoalkeeper, isCaptain: !!line.isCaptain, isViceCaptain: !!line.isViceCaptain,
    }];
  });
  return [...selected, ...players.filter((player) => !lines.some((line) => line.playerRegistrationId === player.registrationId))];
}

function restoreStaff(staff: readonly StaffListItem[], sheet?: ApiMatchSheet): readonly StaffListItem[] {
  return staff.map((member) => {
    const line = sheet?.staff?.find((row) => row.staffRegistrationId === member.registrationId);
    return line ? { ...member, selected: true, role: line.role } : member;
  });
}

function MatchSheetStepper({ currentStep, onChangeStep }: Readonly<{ currentStep: number; onChangeStep: (step: number) => void }>) {
  return <MobileTabs accessibilityLabel="Step distinta" items={stepTabs} onChange={(key) => onChangeStep(Number(key))} value={String(currentStep)} />;
}

function Screen({ children }: Readonly<{ children: ReactNode }>) {
  return <View style={styles.screen}>{children}</View>;
}

function PhotoApprovalNotice() {
  return <Text style={styles.body}>Le foto diventano ufficiali dopo l’approvazione federale.</Text>;
}

function PhotoCaptureControls({ photo, failed, onUpload }: {
  photo?: ManagerPhotoState;
  failed: boolean;
  onUpload: (draft: PhotoDraft, reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PhotoDraft | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const uploading = useRef(false);
  if (!photo) return <Text style={styles.body}>{failed ? "Stato foto non disponibile." : "Caricamento foto…"}</Text>;

  async function selectPhoto(source: "camera" | "library") {
    setError(null);
    try {
      const next = await (source === "camera" ? takePhotoWithCamera() : choosePhotoFromLibrary());
      if (!next) return;
      if (next.sizeBytes > maxPhotoSizeBytes) throw new Error("La foto supera 5 MB.");
      setReason("");
      setDraft(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Foto non disponibile.");
    }
  }

  function close() {
    if (uploading.current) return;
    setOpen(false);
    setDraft(null);
    setReason("");
    setError(null);
  }

  async function submit() {
    if (!draft || photo?.status === "pending" || uploading.current || (photo?.requiresReplacementReason && reason.trim().length < 20)) return;
    uploading.current = true;
    setBusy(true);
    setError(null);
    try {
      await onUpload(draft, reason);
      uploading.current = false;
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invio foto non riuscito.");
    } finally {
      uploading.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      {photo.currentPhotoUrl ? <Image accessibilityLabel="Foto ufficiale" source={{ uri: photo.currentPhotoUrl }} style={styles.photo} /> : <Text style={styles.body}>Foto ufficiale assente</Text>}
      {photo.proposedPhotoUrl ? <Image accessibilityLabel="Foto proposta" source={{ uri: photo.proposedPhotoUrl }} style={styles.photo} /> : null}
      {photo.lastFederationDecision ? (
        <View>
          <Text style={styles.body}>Ultima decisione federale: {photo.lastFederationDecision.status === "approved" ? "Approvata" : "Rifiutata"}</Text>
          {photo.lastFederationDecision.reasonText ? <Text style={styles.body}>{photo.lastFederationDecision.reasonText}</Text> : null}
        </View>
      ) : null}
      {photo.status === "pending" ? <Text style={styles.body}>Richiesta già in attesa</Text> : <Button onPress={() => setOpen(true)}>Gestisci foto</Button>}
      <BottomSheet onClose={close} title="Foto tesserato" visible={open}>
        <View style={styles.section}>
          <Button disabled={busy} onPress={() => void selectPhoto("camera")}>Scatta foto</Button>
          <Button disabled={busy} onPress={() => void selectPhoto("library")}>Scegli dalla galleria</Button>
          {draft ? <Image accessibilityLabel="Anteprima foto" source={{ uri: draft.previewUrl }} style={styles.previewImage} /> : null}
          {draft && photo.requiresReplacementReason ? <Input editable={!busy} value={reason} onChangeText={setReason} placeholder="Motivazione (almeno 20 caratteri)" /> : null}
          {draft ? <Button disabled={busy || photo.status === "pending" || (photo.requiresReplacementReason && reason.trim().length < 20)} onPress={() => void submit()}>{busy ? "Invio in corso" : "Invia richiesta"}</Button> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </BottomSheet>
    </View>
  );
}

function OrderStep({ readOnly, players, movePlayer, toggleCaptain, togglePlayer, toggleViceCaptain, updatePlayer }: Readonly<{ readOnly: boolean; players: readonly PlayerListItem[]; movePlayer: (id: string, direction: -1 | 1) => void; toggleCaptain: (id: string) => void; togglePlayer: (id: string) => void; toggleViceCaptain: (id: string) => void; updatePlayer: (id: string, patch: Partial<PlayerListItem>) => void }>) {
  return <Card style={styles.section}><Text style={styles.cardTitle}>Ordine distinta</Text><Text style={styles.body}>Usa i pulsanti su/giù come alternativa mobile al drag & drop Web.</Text>{players.length === 0 ? <EmptyState message="Nessun convocato." /> : players.map((player, index) => <View key={player.id} style={styles.rowCard}><Text style={styles.name}>{index + 1}. {player.lastName} {player.firstName}</Text><Input editable={!readOnly && !player.suspended} keyboardType="number-pad" onChangeText={(value: string) => updatePlayer(player.id, { shirtNumber: value ? Number(value) : null })} placeholder="N° maglia" value={player.shirtNumber === null ? "" : String(player.shirtNumber)} /><View style={styles.buttonRow}>{lineupRoleOptions.map((option) => <Button key={option.value} disabled={readOnly || player.role === option.value} onPress={() => updatePlayer(player.id, { role: option.value as PlayerLineupRole })}>{option.label}</Button>)}</View><View style={styles.buttonRow}><Button disabled={readOnly} onPress={() => updatePlayer(player.id, { isGoalkeeper: !player.isGoalkeeper })}>{player.isGoalkeeper ? "No portiere" : "Portiere"}</Button><Button disabled={readOnly} onPress={() => toggleCaptain(player.id)}>{player.isCaptain ? "No capitano" : "Capitano"}</Button><Button disabled={readOnly} onPress={() => toggleViceCaptain(player.id)}>{player.isViceCaptain ? "No vice" : "Vice"}</Button></View><Text style={styles.body}>{getPlayerStatusLabel(player)}</Text><View style={styles.buttonRow}><Button disabled={readOnly || index === 0} onPress={() => movePlayer(player.id, -1)}>Su</Button><Button disabled={readOnly || index === players.length - 1} onPress={() => movePlayer(player.id, 1)}>Giù</Button><Button disabled={readOnly || player.suspended} onPress={() => togglePlayer(player.id)} variant="danger">Rimuovi</Button></View></View>)}</Card>;
}

function SummaryStep({ rules, isReadOnly, isSubmitting, onInvalidSubmit, onSubmit, players, staff }: Readonly<{ rules?: LineupRules; isReadOnly: boolean; isSubmitting: boolean; onInvalidSubmit: (message: string) => void; onSubmit: () => void; players: readonly PlayerListItem[]; staff: readonly StaffListItem[] }>) {
  const validation = validateMatchSheet(players, staff, rules);
  const submitError = getMatchSheetSubmitError(validation);
  return <Card style={styles.section}><Text style={styles.cardTitle}>Riepilogo e controlli finali</Text><Text style={styles.body}>Giocatori convocati: {players.length}</Text><Text style={styles.body}>Staff selezionato: {staff.length}</Text><Text style={styles.body}>Numeri maglia mancanti: {validation.missingNumbers}{validation.missingShirtNumberPlayers.length > 0 ? ` (${validation.missingShirtNumberPlayers.join(", ")})` : ""}</Text><Text style={styles.body}>Numeri maglia duplicati: {validation.duplicateShirtNumbers.length > 0 ? validation.duplicateShirtNumbers.join(", ") : "nessuno"}</Text><Text style={styles.body}>Giocatori non validi: {validation.invalidPlayers}</Text><Text style={styles.body}>Portieri: {validation.goalkeepers}</Text><Text style={styles.body}>Titolari: {validation.starters}</Text><Text style={styles.body}>Giocatori in panchina: {validation.benchPlayers}/{rules?.benchLimit ?? 20}</Text><Text style={styles.body}>Staff in panchina: {staff.length}/{rules?.staffLimit ?? 5}</Text><Text style={styles.body}>Capitani: {validation.captains}</Text><Text style={styles.body}>Vice capitani: {validation.viceCaptains}</Text>{validation.isValid ? <Text style={styles.successBox}>Controlli superati.</Text> : <View style={styles.warningBox}><Text style={styles.warningTitle}>Controlli non superati.</Text>{validation.errors.map((error) => <Text key={error} style={styles.warningText}>• {error}</Text>)}</View>}<Button disabled={isReadOnly || isSubmitting} onPress={() => (submitError ? onInvalidSubmit(submitError) : onSubmit())}>{isReadOnly ? "Distinta già inviata" : submitError ?? "Invia distinta"}</Button></Card>;
}

function getMatchSheetStatusLabel(status: string): string {
  return { draft: "Bozza — da completare e inviare", locked: "Bloccata dall’arbitro — riconoscimento in corso", submitted: "Inviata — in attesa dell’arbitro" }[status] ?? status;
}

const styles = StyleSheet.create({
  body: { color: colors.foreground, fontSize: 14 },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cardTitle: { color: colors.foreground, fontSize: 18, fontWeight: "700" },
  header: { gap: spacing.sm },
  kicker: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  name: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  notice: { backgroundColor: "#fffbeb", borderColor: "#fcd34d", borderRadius: radii.lg, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  photo: { backgroundColor: colors.muted, borderRadius: radii.md, height: 96, width: 80 },
  previewImage: { height: 144, width: 108 },
  readOnly: { color: colors.mutedForeground, fontSize: 14 },
  rowCard: { borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  screen: { gap: spacing.lg, padding: spacing.xl },
  section: { gap: spacing.md },
  statusActive: { backgroundColor: "#dcfce7", color: "#166534" },
  statusMissing: { backgroundColor: colors.muted, color: colors.foreground },
  statusPending: { backgroundColor: "#fef3c7", color: "#92400e" },
  statusRejected: { backgroundColor: "#fee2e2", color: "#991b1b" },
  statusSuspended: { backgroundColor: "#ffedd5", color: "#9a3412" },
  statusPill: { alignSelf: "flex-start", backgroundColor: colors.muted, borderRadius: radii.lg, color: colors.foreground, fontSize: 14, fontWeight: "600", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  successBox: { backgroundColor: "#dcfce7", borderRadius: radii.lg, color: "#14532d", padding: spacing.md },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "700" },
  warningBox: { backgroundColor: "#fef9c3", borderRadius: radii.lg, gap: spacing.xs, padding: spacing.md },
  warningText: { color: "#713f12", fontSize: 14 },
  warningTitle: { color: "#713f12", fontSize: 14, fontWeight: "700" },
});
