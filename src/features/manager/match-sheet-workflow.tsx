import { useMemo, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/state";
import { fetchMatchSheets, fetchPlayers, fetchStaff } from "@/lib/api-client";
import { managerTeamConfig, getCurrentManagerTeam } from "@/lib/manager-team";
import {
  getMatchSheetSubmitError,
  getPlayerStatusLabel,
  getPlayerStatusTone,
  lineupRoleOptions,
  validateMatchSheet,
} from "@/lib/match-sheet-validation";
import { queryKeys, useApiQuery } from "@/lib/query";
import { colors, radii, spacing } from "@/lib/theme";
import type { PlayerLineupRole, PlayerListItem, StaffListItem } from "@/lib/types";

const EMPTY_PLAYERS: readonly PlayerListItem[] = [];
const EMPTY_STAFF: readonly StaffListItem[] = [];
const steps = ["Compilazione", "Ordine", "Staff", "Riepilogo"] as const;

export function MatchSheetWorkflow() {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const managerTeam = getCurrentManagerTeam();
  const managerClubId = managerTeamConfig[managerTeam].clubId;
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
      </View>
      <View style={styles.stepTabs}>{steps.map((label, index) => <Button key={label} disabled={step === index} onPress={() => setStep(index)}>{index + 1}. {label}</Button>)}</View>
      {step === 0 ? <PlayersStep players={filteredPlayers} query={query} setQuery={setQuery} togglePlayer={togglePlayer} /> : null}
      {step === 1 ? <OrderStep players={calledPlayers} movePlayer={movePlayer} toggleCaptain={toggleCaptain} togglePlayer={togglePlayer} toggleViceCaptain={toggleViceCaptain} updatePlayer={updatePlayer} /> : null}
      {step === 2 ? <StaffStep staff={staff} toggleStaff={toggleStaff} /> : null}
      {step === 3 ? <SummaryStep isReadOnly={isReadOnly} players={calledPlayers} staff={calledStaff} /> : null}
    </Screen>
  );
}

function Screen({ children }: Readonly<{ children: ReactNode }>) {
  return <View style={styles.screen}>{children}</View>;
}

function PlayersStep({ players, query, setQuery, togglePlayer }: Readonly<{ players: readonly PlayerListItem[]; query: string; setQuery: (value: string) => void; togglePlayer: (id: string) => void }>) {
  return <Card style={styles.section}><Text style={styles.cardTitle}>Compilazione distinta</Text><Text style={styles.body}>Ricerca giocatori, controlla diffide, squalifiche e convocazione.</Text><Input onChangeText={setQuery} placeholder="Cerca giocatore" value={query} />{players.length === 0 ? <EmptyState message="Nessun giocatore trovato." /> : players.map((player) => { const tone = getPlayerStatusTone(player); return <View key={player.id} style={[styles.rowCard, tone === "warning" ? styles.warning : null, tone === "suspended" ? styles.suspended : null]}><View style={styles.rowText}><Text style={styles.name}>{player.lastName} {player.firstName}</Text><Text style={styles.body}>{player.warning ? "Diffida" : "Nessuna diffida"} · {player.suspended ? "Squalificato" : "Disponibile"}{!player.photoUrl ? " · Foto mancante" : ""}</Text></View><Button disabled={player.suspended} onPress={() => togglePlayer(player.id)}>{player.selected ? "Rimuovi" : "Convoca"}</Button></View>; })}</Card>;
}

function OrderStep({ players, movePlayer, toggleCaptain, togglePlayer, toggleViceCaptain, updatePlayer }: Readonly<{ players: readonly PlayerListItem[]; movePlayer: (id: string, direction: -1 | 1) => void; toggleCaptain: (id: string) => void; togglePlayer: (id: string) => void; toggleViceCaptain: (id: string) => void; updatePlayer: (id: string, patch: Partial<PlayerListItem>) => void }>) {
  return <Card style={styles.section}><Text style={styles.cardTitle}>Ordine distinta</Text><Text style={styles.body}>Usa i pulsanti su/giù come alternativa mobile al drag & drop Web.</Text>{players.length === 0 ? <EmptyState message="Nessun convocato." /> : players.map((player, index) => <View key={player.id} style={styles.rowCard}><Text style={styles.name}>{index + 1}. {player.lastName} {player.firstName}</Text><Input editable={!player.suspended} keyboardType="number-pad" onChangeText={(value: string) => updatePlayer(player.id, { shirtNumber: value ? Number(value) : null })} placeholder="N° maglia" value={player.shirtNumber === null ? "" : String(player.shirtNumber)} /><View style={styles.buttonRow}>{lineupRoleOptions.map((option) => <Button key={option.value} disabled={player.role === option.value} onPress={() => updatePlayer(player.id, { role: option.value as PlayerLineupRole })}>{option.label}</Button>)}</View><View style={styles.buttonRow}><Button onPress={() => updatePlayer(player.id, { isGoalkeeper: !player.isGoalkeeper })}>{player.isGoalkeeper ? "No portiere" : "Portiere"}</Button><Button onPress={() => toggleCaptain(player.id)}>{player.isCaptain ? "No capitano" : "Capitano"}</Button><Button onPress={() => toggleViceCaptain(player.id)}>{player.isViceCaptain ? "No vice" : "Vice"}</Button></View><Text style={styles.body}>{getPlayerStatusLabel(player)}</Text><View style={styles.buttonRow}><Button disabled={index === 0} onPress={() => movePlayer(player.id, -1)}>Su</Button><Button disabled={index === players.length - 1} onPress={() => movePlayer(player.id, 1)}>Giù</Button><Button onPress={() => togglePlayer(player.id)} variant="danger">Rimuovi</Button></View></View>)}</Card>;
}

function StaffStep({ staff, toggleStaff }: Readonly<{ staff: readonly StaffListItem[]; toggleStaff: (id: string) => void }>) {
  return <Card style={styles.section}><Text style={styles.cardTitle}>Staff</Text>{staff.length === 0 ? <EmptyState message="Nessuno staff disponibile." /> : staff.map((staffMember) => <View key={staffMember.id} style={styles.rowCard}><View style={styles.rowText}><Text style={styles.name}>{staffMember.fullName}</Text><Text style={styles.body}>{staffMember.role}{!staffMember.photoUrl ? " · Foto mancante" : ""}</Text></View><Button onPress={() => toggleStaff(staffMember.id)}>{staffMember.selected ? "Rimuovi" : "Seleziona"}</Button></View>)}</Card>;
}

function SummaryStep({ isReadOnly, players, staff }: Readonly<{ isReadOnly: boolean; players: readonly PlayerListItem[]; staff: readonly StaffListItem[] }>) {
  const validation = validateMatchSheet(players, staff);
  const submitError = getMatchSheetSubmitError(validation);
  return <Card style={styles.section}><Text style={styles.cardTitle}>Riepilogo e controlli finali</Text><Text style={styles.body}>Giocatori convocati: {players.length}</Text><Text style={styles.body}>Staff selezionato: {staff.length}</Text><Text style={styles.body}>Numeri maglia mancanti: {validation.missingNumbers}{validation.missingShirtNumberPlayers.length > 0 ? ` (${validation.missingShirtNumberPlayers.join(", ")})` : ""}</Text><Text style={styles.body}>Numeri maglia duplicati: {validation.duplicateShirtNumbers.length > 0 ? validation.duplicateShirtNumbers.join(", ") : "nessuno"}</Text><Text style={styles.body}>Giocatori non validi: {validation.invalidPlayers}</Text><Text style={styles.body}>Portieri: {validation.goalkeepers}</Text><Text style={styles.body}>Titolari: {validation.starters}</Text><Text style={styles.body}>Giocatori in panchina: {validation.benchPlayers}/20</Text><Text style={styles.body}>Staff in panchina: {staff.length}/5</Text><Text style={styles.body}>Capitani: {validation.captains}</Text><Text style={styles.body}>Vice capitani: {validation.viceCaptains}</Text>{validation.isValid ? <Text style={styles.successBox}>Controlli superati.</Text> : <View style={styles.warningBox}><Text style={styles.warningTitle}>Controlli non superati.</Text>{validation.errors.map((error) => <Text key={error} style={styles.warningText}>• {error}</Text>)}</View>}<Button disabled>{isReadOnly ? "Distinta già inviata" : submitError ?? "Invia distinta"}</Button></Card>;
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
  name: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  readOnly: { color: colors.mutedForeground, fontSize: 14 },
  rowCard: { borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  rowText: { flex: 1, gap: spacing.xs },
  screen: { gap: spacing.lg, padding: spacing.xl },
  section: { gap: spacing.md },
  statusPill: { alignSelf: "flex-start", backgroundColor: colors.muted, borderRadius: radii.lg, color: colors.foreground, fontSize: 14, fontWeight: "600", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  stepTabs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  successBox: { backgroundColor: "#dcfce7", borderRadius: radii.lg, color: "#14532d", padding: spacing.md },
  suspended: { backgroundColor: "#fee2e2", opacity: 0.8 },
  title: { color: colors.foreground, fontSize: 28, fontWeight: "700" },
  warning: { backgroundColor: "#fef9c3" },
  warningBox: { backgroundColor: "#fef9c3", borderRadius: radii.lg, gap: spacing.xs, padding: spacing.md },
  warningText: { color: "#713f12", fontSize: 14 },
  warningTitle: { color: "#713f12", fontSize: 14, fontWeight: "700" },
});
