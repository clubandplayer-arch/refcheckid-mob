import { useMemo, useState, type ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MobileTabs } from "@/components/ui/mobile-tabs";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/state";
import { fetchMatchSheets, fetchPlayers, fetchStaff, resetSmokeMatchSheet, submitMatchSheet } from "@/lib/api-client";
import { managerTeamConfig, getCurrentManagerTeam } from "@/lib/manager-team";
import {
  getMatchSheetSubmitError,
  getPlayerStatusLabel,
  getPlayerStatusTone,
  lineupRoleOptions,
  validateMatchSheet,
} from "@/lib/match-sheet-validation";
import { queryKeys, useApiMutation, useApiQuery, useInvalidateQueries } from "@/lib/query";
import { saveManagerSubjectPhoto } from "@/lib/manager-photo-store";
import { uploadOfficialSubjectPhoto } from "@/lib/manager-photo-backend";
import { getPhotoFeatureFlags } from "@/lib/photo-feature-flags";
import { resolveRenderablePhotoUrl } from "@/lib/photo-url";
import { clearSubmittedMatchSheetSnapshot, saveSubmittedMatchSheetSnapshot } from "@/lib/submitted-match-sheet";
import { choosePhotoFromLibrary, takePhotoWithCamera } from "@/lib/native-image-picker";
import { colors, radii, spacing } from "@/lib/theme";
import { useToast } from "@/components/ui/toast";
import type { PlayerLineupRole, PlayerListItem, StaffListItem } from "@/lib/types";

const EMPTY_PLAYERS: readonly PlayerListItem[] = [];
const EMPTY_STAFF: readonly StaffListItem[] = [];
const steps = ["Compilazione", "Ordine", "Staff", "Riepilogo"] as const;
const stepTabs = steps.map((label, index) => ({ key: String(index), label: `${index + 1}. ${label}` }));
const maxPhotoSizeBytes = 5 * 1024 * 1024;

type PhotoDraft = { id: string; previewUrl: string; mimeType: string; sizeBytes: number; zoom: number; offsetX: number; offsetY: number };

export function MatchSheetWorkflow() {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const managerTeam = getCurrentManagerTeam();
  const managerClubId = managerTeamConfig[managerTeam].clubId;
  const invalidateQueries = useInvalidateQueries();
  const { notify } = useToast();
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<readonly PlayerListItem[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<readonly StaffListItem[]>([]);

  const playersQuery = useApiQuery([...queryKeys.players, managerTeam], fetchPlayers);
  const staffQuery = useApiQuery([...queryKeys.staff, managerTeam], fetchStaff);
  const sheetsQuery = useApiQuery(
    [...queryKeys.matchSheets, managerClubId],
    () => fetchMatchSheets(`?clubId=${encodeURIComponent(managerClubId)}`),
  );

  const fetchedPlayers = playersQuery.data ?? EMPTY_PLAYERS;
  const fetchedStaff = staffQuery.data ?? EMPTY_STAFF;
  const players = selectedPlayers.length > 0 ? selectedPlayers : fetchedPlayers;
  const staff = selectedStaff.length > 0 ? selectedStaff : fetchedStaff;
  const calledPlayers = players.filter((player) => player.selected);
  const calledStaff = staff.filter((staffMember) => staffMember.selected);
  const matchSheetStatus = sheetsQuery.data?.[0]?.status ?? "draft";
  const isReadOnly = matchSheetStatus !== "draft";
  const submitMutation = useApiMutation(async () => {
    const firstSheet = sheetsQuery.data?.[0];
    if (!firstSheet) throw new Error("Nessuna distinta disponibile.");
    if (firstSheet.status !== "draft") throw new Error("Distinta già inviata. Usa il ripristino della distinta di prova per crearne una nuova.");
    saveSubmittedMatchSheetSnapshot({ players: calledPlayers, staff: calledStaff, team: managerTeam });
    return submitMatchSheet(firstSheet.id);
  }, {
    onSuccess() {
      notify("Distinta inviata", "success");
      void invalidateQueries(queryKeys.matchSheets);
    },
    onError(error) { notify(error.message, "error"); },
  });

  const resetSmokeMutation = useApiMutation(async () => {
    const firstSheet = sheetsQuery.data?.[0];
    if (!firstSheet) throw new Error("Nessuna distinta disponibile.");
    clearSubmittedMatchSheetSnapshot(managerTeam);
    setSelectedPlayers([]);
    setSelectedStaff([]);
    return resetSmokeMatchSheet(firstSheet.id);
  }, {
    onSuccess() {
      notify("Distinta di prova ripristinata", "success");
      void invalidateQueries(queryKeys.matchSheets);
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


  function handlePhotoDraft(subjectId: string, draft: Pick<PhotoDraft, "previewUrl" | "mimeType" | "sizeBytes"> | null) {
    if (isReadOnly || !draft) return;
    setPhotoError(null);
    if (!draft.mimeType.startsWith("image/")) {
      setPhotoError("Carica solo file immagine.");
      return;
    }
    if (draft.sizeBytes > maxPhotoSizeBytes) {
      setPhotoError("La foto supera la dimensione massima di 5 MB.");
      return;
    }
    setPhotoDraft({ id: subjectId, previewUrl: draft.previewUrl, mimeType: draft.mimeType, sizeBytes: draft.sizeBytes, zoom: 1, offsetX: 0, offsetY: 0 });
  }

  function updatePhotoDraftTransform(subjectId: string, transform: Partial<Pick<PhotoDraft, "zoom" | "offsetX" | "offsetY">>) {
    setPhotoDraft((current) => (current?.id === subjectId ? { ...current, ...transform } : current));
  }

  function clearPhotoDraft(subjectId: string) {
    setPhotoDraft((current) => (current?.id === subjectId ? null : current));
    setPhotoError(null);
  }

  async function confirmPhoto(subjectId: string, applyPhoto: (photoUrl: string) => void | Promise<void>) {
    if (!photoDraft || photoDraft.id !== subjectId) {
      setPhotoError("Conferma una preview prima del salvataggio.");
      return;
    }
    try {
      await applyPhoto(cropPhotoDraft(photoDraft));
      setPhotoDraft(null);
      setPhotoError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload foto non riuscito.";
      setPhotoError(message);
      notify(message, "error");
    }
  }

  async function updatePlayerPhoto(playerId: string, photoUrl: string) {
    const player = players.find((item) => item.id === playerId);
    const flags = getPhotoFeatureFlags();
    if (flags.officialBackendUpload) {
      if (!player?.registrationId || !player.season) throw new Error("Tesseramento stagionale non disponibile: impossibile caricare la foto ufficiale.");
      const state = await uploadOfficialSubjectPhoto({ subjectKind: "athlete", subjectId: playerId, registrationId: player.registrationId, clubId: managerClubId, federationId: managerTeamConfig[managerTeam].federationId, seasonId: player.season, dataUrl: photoUrl });
      setPlayerList((current) => current.map((item) => (item.id === playerId ? { ...item, photo: state, photoUrl: state.currentPhotoUrl ?? item.photoUrl } : item)));
      void invalidateQueries([...queryKeys.players, managerTeam]);
      notify(state.status === "pending" ? "Foto inviata al backend: richiesta in attesa di approvazione federale" : "Foto tesserato aggiornata dal backend", "success");
      return;
    }
    const status = saveManagerSubjectPhoto(managerTeam, playerId, photoUrl, player?.photoUrl ?? null, player ? `${player.lastName} ${player.firstName}` : playerId);
    if (status === "approved") {
      setPlayerList((current) => current.map((item) => (item.id === playerId ? { ...item, photoUrl } : item)));
      notify("Foto tesserato aggiornata", "success");
      return;
    }
    notify("Nuova foto inviata alla Federazione per approvazione: fino all’esito userai la foto ufficiale corrente", "success");
  }

  async function updateStaffPhoto(staffId: string, photoUrl: string) {
    const staffMember = staff.find((item) => item.id === staffId);
    const flags = getPhotoFeatureFlags();
    if (flags.officialBackendUpload) {
      if (!staffMember?.registrationId || !staffMember.season) throw new Error("Tesseramento stagionale staff non disponibile: impossibile caricare la foto ufficiale.");
      const state = await uploadOfficialSubjectPhoto({ subjectKind: "staff_member", subjectId: staffId, registrationId: staffMember.registrationId, clubId: managerClubId, federationId: managerTeamConfig[managerTeam].federationId, seasonId: staffMember.season, dataUrl: photoUrl });
      setStaffList((current) => current.map((item) => (item.id === staffId ? { ...item, photo: state, photoUrl: state.currentPhotoUrl ?? item.photoUrl } : item)));
      void invalidateQueries([...queryKeys.staff, managerTeam]);
      notify(state.status === "pending" ? "Foto staff inviata al backend: richiesta in attesa di approvazione federale" : "Foto staff aggiornata dal backend", "success");
      return;
    }
    const status = saveManagerSubjectPhoto(managerTeam, staffId, photoUrl, staffMember?.photoUrl ?? null, staffMember?.fullName ?? staffId);
    if (status === "approved") {
      setStaffList((current) => current.map((item) => (item.id === staffId ? { ...item, photoUrl } : item)));
      notify("Foto tesserato aggiornata", "success");
      return;
    }
    notify("Nuova foto inviata alla Federazione per approvazione: fino all’esito userai la foto ufficiale corrente", "success");
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
      const target = index + direction;
      if (index < 0 || target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  if (playersQuery.isLoading || staffQuery.isLoading || sheetsQuery.isLoading) return <Screen><SkeletonBlock /></Screen>;
  if (playersQuery.isError) return <Screen><ErrorState message={playersQuery.error?.message ?? "Errore API"} onRetry={() => void playersQuery.refetch()} /></Screen>;
  if (staffQuery.isError) return <Screen><ErrorState message={staffQuery.error?.message ?? "Errore API"} onRetry={() => void staffQuery.refetch()} /></Screen>;
  if (sheetsQuery.isError) return <Screen><ErrorState message={sheetsQuery.error?.message ?? "Errore API"} onRetry={() => void sheetsQuery.refetch()} /></Screen>;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Distinta {managerTeamConfig[managerTeam].label}</Text>
        <Text style={styles.title}>Distinta gara</Text>
        <Text style={styles.body}>Completa convocati, ordine, staff e riepilogo prima dell’invio.</Text>
        <Text style={styles.statusPill}>Stato: {getMatchSheetStatusLabel(matchSheetStatus)}</Text>
        {isReadOnly ? <Text style={styles.readOnly}>Distinta inviata: non puoi più modificarla. Se serve correggere qualcosa, avvisa l’arbitro o la segreteria.</Text> : null}
        <Button disabled={resetSmokeMutation.isPending} onPress={() => resetSmokeMutation.mutate()}>Ripristina distinta di prova</Button>
      </View>
      <MatchSheetStepper currentStep={step} onChangeStep={setStep} />
      {step === 0 ? <PlayersStep onCancelPhoto={(playerId) => clearPhotoDraft(playerId)} onConfirmPhoto={(playerId) => confirmPhoto(playerId, (photoUrl) => updatePlayerPhoto(playerId, photoUrl))} onPhotoDraft={handlePhotoDraft} onPhotoError={setPhotoError} onPhotoTransform={updatePhotoDraftTransform} photoDraft={photoDraft} photoError={photoError} players={filteredPlayers} query={query} setQuery={setQuery} togglePlayer={togglePlayer} /> : null}
      {step === 1 ? <OrderStep players={calledPlayers} movePlayer={movePlayer} toggleCaptain={toggleCaptain} togglePlayer={togglePlayer} toggleViceCaptain={toggleViceCaptain} updatePlayer={updatePlayer} /> : null}
      {step === 2 ? <StaffStep onCancelPhoto={(staffId) => clearPhotoDraft(staffId)} onConfirmPhoto={(staffId) => confirmPhoto(staffId, (photoUrl) => updateStaffPhoto(staffId, photoUrl))} onPhotoDraft={handlePhotoDraft} onPhotoError={setPhotoError} onPhotoTransform={updatePhotoDraftTransform} photoDraft={photoDraft} photoError={photoError} staff={staff} toggleStaff={toggleStaff} /> : null}
      {step === 3 ? <SummaryStep isReadOnly={isReadOnly} isSubmitting={submitMutation.isPending} onInvalidSubmit={(message) => notify(message, "error")} onSubmit={() => submitMutation.mutate()} players={calledPlayers} staff={calledStaff} /> : null}
      <MatchSheetStepper currentStep={step} onChangeStep={setStep} />
    </Screen>
  );
}

function MatchSheetStepper({ currentStep, onChangeStep }: Readonly<{ currentStep: number; onChangeStep: (step: number) => void }>) {
  return <MobileTabs accessibilityLabel="Step distinta" items={stepTabs} onChange={(key) => onChangeStep(Number(key))} value={String(currentStep)} />;
}

function Screen({ children }: Readonly<{ children: ReactNode }>) {
  return <View style={styles.screen}>{children}</View>;
}

function PlayersStep({ onCancelPhoto, onConfirmPhoto, onPhotoDraft, onPhotoError, onPhotoTransform, photoDraft, photoError, players, query, setQuery, togglePlayer }: Readonly<{ onCancelPhoto: (id: string) => void; onConfirmPhoto: (id: string) => void; onPhotoDraft: (id: string, draft: Pick<PhotoDraft, "previewUrl" | "mimeType" | "sizeBytes"> | null) => void; onPhotoError: (message: string | null) => void; onPhotoTransform: (id: string, transform: Partial<Pick<PhotoDraft, "zoom" | "offsetX" | "offsetY">>) => void; photoDraft: PhotoDraft | null; photoError: string | null; players: readonly PlayerListItem[]; query: string; setQuery: (value: string) => void; togglePlayer: (id: string) => void }>) {
  return <Card style={styles.section}><Text style={styles.cardTitle}>Compilazione distinta</Text><Text style={styles.body}>Ricerca giocatori, controlla foto, diffide, squalifiche e convocazione.</Text><PhotoApprovalNotice /><Input onChangeText={setQuery} placeholder="Cerca giocatore" value={query} />{players.length === 0 ? <EmptyState message="Nessun giocatore trovato." /> : players.map((player) => { const tone = getPlayerStatusTone(player); return <View key={player.id} style={[styles.rowCard, tone === "warning" ? styles.warning : null, tone === "suspended" ? styles.suspended : null]}><View style={styles.rowText}><Text style={styles.name}>{player.lastName} {player.firstName}</Text><Text style={styles.body}>{player.warning ? "Diffida" : "Nessuna diffida"} · {player.suspended ? "Squalificato" : "Disponibile"}{!player.photoUrl ? " · Foto mancante" : ""}</Text><SubjectPhoto accessibilityLabel={`Foto ${player.lastName} ${player.firstName}`} photoUrl={player.photo?.currentPhotoUrl ?? player.photoUrl} /><BackendPhotoStatus photo={player.photo} /></View><PhotoComparison currentPhotoUrl={player.photo?.currentPhotoUrl ?? player.photoUrl} proposedPhotoUrl={player.photo?.proposedPhotoUrl ?? null} /><PhotoCaptureControls currentPhotoUrl={player.photo?.currentPhotoUrl ?? player.photoUrl} onCancel={() => onCancelPhoto(player.id)} onConfirm={() => onConfirmPhoto(player.id)} onPhotoDraft={(draft) => onPhotoDraft(player.id, draft)} onPhotoError={onPhotoError} onPhotoTransform={(transform) => onPhotoTransform(player.id, transform)} photoDraft={photoDraft?.id === player.id ? photoDraft : null} photoError={photoError} subjectLabel={`${player.lastName} ${player.firstName}`} /><Button disabled={player.suspended} onPress={() => togglePlayer(player.id)}>{player.selected ? "Rimuovi" : "Convoca"}</Button></View>; })}</Card>;
}

function SubjectPhoto({ accessibilityLabel, photoUrl }: Readonly<{ accessibilityLabel: string; photoUrl: string | null }>) {
  const renderablePhotoUrl = resolveRenderablePhotoUrl(photoUrl);
  if (!renderablePhotoUrl) return <View style={styles.photoPlaceholder}><Text style={styles.body}>Foto</Text></View>;
  return <Image accessibilityLabel={accessibilityLabel} source={{ uri: renderablePhotoUrl }} style={styles.photo} />;
}

function BackendPhotoStatus({ photo }: Readonly<{ photo: PlayerListItem["photo"] | StaffListItem["photo"] }>) {
  const status = photo?.status ?? "missing";
  const label = { active: "Active", missing: "Missing", pending: "Pending Approval", rejected: "Rejected", suspended: "Suspended" }[status];
  const style = { active: styles.statusActive, missing: styles.statusMissing, pending: styles.statusPending, rejected: styles.statusRejected, suspended: styles.statusSuspended }[status];
  return <Text style={[styles.backendStatus, style]}>{label}</Text>;
}

function PhotoComparison({ currentPhotoUrl, proposedPhotoUrl }: Readonly<{ currentPhotoUrl: string | null; proposedPhotoUrl: string | null }>) {
  const renderableCurrentPhotoUrl = resolveRenderablePhotoUrl(currentPhotoUrl);
  const renderableProposedPhotoUrl = resolveRenderablePhotoUrl(proposedPhotoUrl);
  if (!renderableProposedPhotoUrl) return null;
  return <View style={styles.comparisonBox}><Text style={styles.warningTitle}>Foto ufficiale corrente → nuova proposta pending</Text><View style={styles.comparisonRow}>{renderableCurrentPhotoUrl ? <Image accessibilityLabel="Foto ufficiale corrente" source={{ uri: renderableCurrentPhotoUrl }} style={styles.comparisonPhoto} /> : <Text style={styles.body}>Missing</Text>}<Text style={styles.body}>→</Text><Image accessibilityLabel="Nuova foto proposta" source={{ uri: renderableProposedPhotoUrl }} style={styles.comparisonPhoto} /></View></View>;
}

function PhotoApprovalNotice() {
  return <View style={styles.notice}><Text style={styles.warningTitle}>Nota foto tesserati</Text><Text style={styles.warningText}>Scatta o seleziona una foto con volto centrato, frontale e ben visibile. L’upload usa Upload Intent e Upload Complete del backend ARCH-1: il backend è la Source of Truth. Se sostituisci una foto attiva, la foto ufficiale corrente resta visibile fino all’approvazione federale e la nuova foto compare come proposta pending.</Text></View>;
}

function PhotoCaptureControls({ currentPhotoUrl, onCancel, onConfirm, onPhotoDraft, onPhotoError, onPhotoTransform, photoDraft, photoError, subjectLabel }: Readonly<{ currentPhotoUrl: string | null; onCancel: () => void; onConfirm: () => void; onPhotoDraft: (draft: Pick<PhotoDraft, "previewUrl" | "mimeType" | "sizeBytes"> | null) => void; onPhotoError: (message: string | null) => void; onPhotoTransform: (transform: Partial<Pick<PhotoDraft, "zoom" | "offsetX" | "offsetY">>) => void; photoDraft: PhotoDraft | null; photoError: string | null; subjectLabel: string }>) {
  const [open, setOpen] = useState(false);
  const hasPreviewUri = Boolean(photoDraft?.previewUrl?.trim());
  const photoStatus = currentPhotoUrl ? "Foto presente" : "Foto mancante";

  async function selectPhoto(source: "camera" | "library") {
    onPhotoError(null);
    try {
      const draft = source === "camera" ? await takePhotoWithCamera() : await choosePhotoFromLibrary();
      if (draft) onPhotoDraft(draft);
    } catch (error) {
      onPhotoError(error instanceof Error ? error.message : "Foto non disponibile.");
    }
  }

  function handleCancel() {
    onCancel();
    setOpen(false);
  }

  function handleConfirm() {
    onConfirm();
    setOpen(false);
  }

  return (
    <View style={styles.photoControlsCompact}>
      <View style={styles.photoControlsHeader}>
        <Text style={styles.name}>{photoStatus}</Text>
        <Text style={styles.body}>{currentPhotoUrl ? "Tocca per sostituire o verificare la foto." : "Aggiungi una foto frontale e visibile."}</Text>
      </View>
      <Button onPress={() => setOpen(true)}>{currentPhotoUrl ? "Gestisci foto" : "Aggiungi foto"}</Button>
      <BottomSheet onClose={() => setOpen(false)} title={`${currentPhotoUrl ? "Sostituisci" : "Aggiungi"} foto ${subjectLabel}`} visible={open}>
        <View style={styles.photoControls}>
          <View style={styles.buttonRow}>
            <Button onPress={() => void selectPhoto("camera")}>{currentPhotoUrl ? "Scatta nuova foto" : "Scatta foto"}</Button>
            <Button onPress={() => void selectPhoto("library")}>{currentPhotoUrl ? "Sostituisci dalla galleria" : "Scegli dalla galleria"}</Button>
          </View>
          {photoDraft ? (
            <View style={styles.previewBox}>
              {hasPreviewUri ? (
                <Image
                  accessibilityLabel={`Preview foto ${subjectLabel}`}
                  source={{ uri: photoDraft.previewUrl }}
                  style={[
                    styles.previewImage,
                    { transform: [{ translateX: photoDraft.offsetX }, { translateY: photoDraft.offsetY }, { scale: photoDraft.zoom }] },
                  ]}
                />
              ) : (
                <View style={styles.photoPlaceholder}><Text style={styles.body}>Foto</Text></View>
              )}
              <Text style={styles.body}>Anteprima foto selezionata · zoom {photoDraft.zoom.toFixed(1)}</Text>
              <View style={styles.buttonRow}>
                <Button onPress={() => onPhotoTransform({ zoom: Math.max(0.5, photoDraft.zoom - 0.1) })}>Riduci</Button>
                <Button onPress={() => onPhotoTransform({ zoom: Math.min(3, photoDraft.zoom + 0.1) })}>Zoom</Button>
                <Button onPress={() => onPhotoTransform({ offsetX: photoDraft.offsetX - 4 })}>Sinistra</Button>
                <Button onPress={() => onPhotoTransform({ offsetX: photoDraft.offsetX + 4 })}>Destra</Button>
                <Button onPress={() => onPhotoTransform({ offsetY: photoDraft.offsetY - 4 })}>Su</Button>
                <Button onPress={() => onPhotoTransform({ offsetY: photoDraft.offsetY + 4 })}>Giù</Button>
              </View>
              <View style={styles.buttonRow}>
                <Button onPress={handleConfirm}>Conferma foto</Button>
                <Button onPress={handleCancel}>Annulla</Button>
              </View>
            </View>
          ) : null}
          {photoError ? <Text style={styles.errorText}>{photoError}</Text> : null}
        </View>
      </BottomSheet>
    </View>
  );
}


function OrderStep({ players, movePlayer, toggleCaptain, togglePlayer, toggleViceCaptain, updatePlayer }: Readonly<{ players: readonly PlayerListItem[]; movePlayer: (id: string, direction: -1 | 1) => void; toggleCaptain: (id: string) => void; togglePlayer: (id: string) => void; toggleViceCaptain: (id: string) => void; updatePlayer: (id: string, patch: Partial<PlayerListItem>) => void }>) {
  return <Card style={styles.section}><Text style={styles.cardTitle}>Ordine distinta</Text><Text style={styles.body}>Usa i pulsanti su/giù come alternativa mobile al drag & drop Web.</Text>{players.length === 0 ? <EmptyState message="Nessun convocato." /> : players.map((player, index) => <View key={player.id} style={styles.rowCard}><Text style={styles.name}>{index + 1}. {player.lastName} {player.firstName}</Text><Input editable={!player.suspended} keyboardType="number-pad" onChangeText={(value: string) => updatePlayer(player.id, { shirtNumber: value ? Number(value) : null })} placeholder="N° maglia" value={player.shirtNumber === null ? "" : String(player.shirtNumber)} /><View style={styles.buttonRow}>{lineupRoleOptions.map((option) => <Button key={option.value} disabled={player.role === option.value} onPress={() => updatePlayer(player.id, { role: option.value as PlayerLineupRole })}>{option.label}</Button>)}</View><View style={styles.buttonRow}><Button onPress={() => updatePlayer(player.id, { isGoalkeeper: !player.isGoalkeeper })}>{player.isGoalkeeper ? "No portiere" : "Portiere"}</Button><Button onPress={() => toggleCaptain(player.id)}>{player.isCaptain ? "No capitano" : "Capitano"}</Button><Button onPress={() => toggleViceCaptain(player.id)}>{player.isViceCaptain ? "No vice" : "Vice"}</Button></View><Text style={styles.body}>{getPlayerStatusLabel(player)}</Text><View style={styles.buttonRow}><Button disabled={index === 0} onPress={() => movePlayer(player.id, -1)}>Su</Button><Button disabled={index === players.length - 1} onPress={() => movePlayer(player.id, 1)}>Giù</Button><Button onPress={() => togglePlayer(player.id)} variant="danger">Rimuovi</Button></View></View>)}</Card>;
}

function StaffStep({ onCancelPhoto, onConfirmPhoto, onPhotoDraft, onPhotoError, onPhotoTransform, photoDraft, photoError, staff, toggleStaff }: Readonly<{ onCancelPhoto: (id: string) => void; onConfirmPhoto: (id: string) => void; onPhotoDraft: (id: string, draft: Pick<PhotoDraft, "previewUrl" | "mimeType" | "sizeBytes"> | null) => void; onPhotoError: (message: string | null) => void; onPhotoTransform: (id: string, transform: Partial<Pick<PhotoDraft, "zoom" | "offsetX" | "offsetY">>) => void; photoDraft: PhotoDraft | null; photoError: string | null; staff: readonly StaffListItem[]; toggleStaff: (id: string) => void }>) {
  return <Card style={styles.section}><Text style={styles.cardTitle}>Staff</Text>{staff.length === 0 ? <EmptyState message="Nessuno staff disponibile." /> : staff.map((staffMember) => <View key={staffMember.id} style={styles.rowCard}><View style={styles.rowText}><Text style={styles.name}>{staffMember.fullName}</Text><Text style={styles.body}>{staffMember.role}{!staffMember.photoUrl ? " · Foto mancante" : ""}</Text><SubjectPhoto accessibilityLabel={`Foto ${staffMember.fullName}`} photoUrl={staffMember.photo?.currentPhotoUrl ?? staffMember.photoUrl} /><BackendPhotoStatus photo={staffMember.photo} /></View><PhotoComparison currentPhotoUrl={staffMember.photo?.currentPhotoUrl ?? staffMember.photoUrl} proposedPhotoUrl={staffMember.photo?.proposedPhotoUrl ?? null} /><PhotoCaptureControls currentPhotoUrl={staffMember.photo?.currentPhotoUrl ?? staffMember.photoUrl} onCancel={() => onCancelPhoto(staffMember.id)} onConfirm={() => onConfirmPhoto(staffMember.id)} onPhotoDraft={(draft) => onPhotoDraft(staffMember.id, draft)} onPhotoError={onPhotoError} onPhotoTransform={(transform) => onPhotoTransform(staffMember.id, transform)} photoDraft={photoDraft?.id === staffMember.id ? photoDraft : null} photoError={photoError} subjectLabel={staffMember.fullName} /><Button onPress={() => toggleStaff(staffMember.id)}>{staffMember.selected ? "Rimuovi" : "Seleziona"}</Button></View>)}</Card>;
}

function SummaryStep({ isReadOnly, isSubmitting, onInvalidSubmit, onSubmit, players, staff }: Readonly<{ isReadOnly: boolean; isSubmitting: boolean; onInvalidSubmit: (message: string) => void; onSubmit: () => void; players: readonly PlayerListItem[]; staff: readonly StaffListItem[] }>) {
  const validation = validateMatchSheet(players, staff);
  const submitError = getMatchSheetSubmitError(validation);
  return <Card style={styles.section}><Text style={styles.cardTitle}>Riepilogo e controlli finali</Text><Text style={styles.body}>Giocatori convocati: {players.length}</Text><Text style={styles.body}>Staff selezionato: {staff.length}</Text><Text style={styles.body}>Numeri maglia mancanti: {validation.missingNumbers}{validation.missingShirtNumberPlayers.length > 0 ? ` (${validation.missingShirtNumberPlayers.join(", ")})` : ""}</Text><Text style={styles.body}>Numeri maglia duplicati: {validation.duplicateShirtNumbers.length > 0 ? validation.duplicateShirtNumbers.join(", ") : "nessuno"}</Text><Text style={styles.body}>Giocatori non validi: {validation.invalidPlayers}</Text><Text style={styles.body}>Portieri: {validation.goalkeepers}</Text><Text style={styles.body}>Titolari: {validation.starters}</Text><Text style={styles.body}>Giocatori in panchina: {validation.benchPlayers}/20</Text><Text style={styles.body}>Staff in panchina: {staff.length}/5</Text><Text style={styles.body}>Capitani: {validation.captains}</Text><Text style={styles.body}>Vice capitani: {validation.viceCaptains}</Text>{validation.isValid ? <Text style={styles.successBox}>Controlli superati.</Text> : <View style={styles.warningBox}><Text style={styles.warningTitle}>Controlli non superati.</Text>{validation.errors.map((error) => <Text key={error} style={styles.warningText}>• {error}</Text>)}</View>}<Button disabled={isReadOnly || isSubmitting} onPress={() => (submitError ? onInvalidSubmit(submitError) : onSubmit())}>{isReadOnly ? "Distinta già inviata" : submitError ?? "Invia distinta"}</Button></Card>;
}

function cropPhotoDraft(draft: PhotoDraft): string {
  return draft.previewUrl.includes("#crop=") ? draft.previewUrl : `${draft.previewUrl}#crop=zoom:${draft.zoom.toFixed(2)},x:${draft.offsetX},y:${draft.offsetY}`;
}

function getMatchSheetStatusLabel(status: string): string {
  return { draft: "Bozza — da completare e inviare", locked: "Bloccata dall’arbitro — riconoscimento in corso", submitted: "Inviata — in attesa dell’arbitro" }[status] ?? status;
}

const styles = StyleSheet.create({
  body: { color: colors.foreground, fontSize: 14 },
  backendStatus: { alignSelf: "flex-start", borderRadius: radii.lg, fontSize: 11, fontWeight: "700", overflow: "hidden", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  comparisonBox: { backgroundColor: "#fffbeb", borderColor: "#fcd34d", borderRadius: radii.lg, borderWidth: 1, gap: spacing.xs, padding: spacing.sm },
  comparisonPhoto: { borderRadius: radii.sm, height: 48, width: 36 },
  comparisonRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  cardTitle: { color: colors.foreground, fontSize: 18, fontWeight: "700" },
  header: { gap: spacing.sm },
  kicker: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  name: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  notice: { backgroundColor: "#fffbeb", borderColor: "#fcd34d", borderRadius: radii.lg, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  photo: { backgroundColor: colors.muted, borderRadius: radii.md, height: 96, width: 80 },
  photoControls: { gap: spacing.md },
  photoControlsCompact: { borderColor: colors.border, borderRadius: radii.lg, borderStyle: "dashed", borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  photoControlsHeader: { gap: spacing.xs },
  photoPlaceholder: { alignItems: "center", backgroundColor: colors.muted, borderRadius: radii.md, height: 96, justifyContent: "center", width: 80 },
  previewBox: { alignItems: "center", backgroundColor: colors.muted, borderRadius: radii.lg, gap: spacing.sm, overflow: "hidden", padding: spacing.md },
  previewImage: { height: 144, width: 108 },
  readOnly: { color: colors.mutedForeground, fontSize: 14 },
  rowCard: { borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  rowText: { flex: 1, gap: spacing.xs },
  screen: { gap: spacing.lg, padding: spacing.xl },
  section: { gap: spacing.md },
  statusActive: { backgroundColor: "#dcfce7", color: "#166534" },
  statusMissing: { backgroundColor: colors.muted, color: colors.foreground },
  statusPending: { backgroundColor: "#fef3c7", color: "#92400e" },
  statusRejected: { backgroundColor: "#fee2e2", color: "#991b1b" },
  statusSuspended: { backgroundColor: "#ffedd5", color: "#9a3412" },
  statusPill: { alignSelf: "flex-start", backgroundColor: colors.muted, borderRadius: radii.lg, color: colors.foreground, fontSize: 14, fontWeight: "600", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  successBox: { backgroundColor: "#dcfce7", borderRadius: radii.lg, color: "#14532d", padding: spacing.md },
  suspended: { backgroundColor: "#fee2e2", opacity: 0.8 },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "700" },
  warning: { backgroundColor: "#fef9c3" },
  warningBox: { backgroundColor: "#fef9c3", borderRadius: radii.lg, gap: spacing.xs, padding: spacing.md },
  warningText: { color: "#713f12", fontSize: 14 },
  warningTitle: { color: "#713f12", fontSize: 14, fontWeight: "700" },
});
