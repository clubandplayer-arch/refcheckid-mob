import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ErrorState, SkeletonBlock } from "@/components/ui/state";
import { ApiRequestError, request } from "@/lib/api-client";
import { useApiMutation, useApiQuery } from "@/lib/query";
import {
  buildPeriodUpdate, fetchNotebook, gamePath, postClock, postPeriod,
  type Appointment, type ClockCommand, type EventType, type GameEvent, type GameContext, type GameSummary, type GameState, type PeriodDraft, type PeriodUpdate, type PlatformPage,
} from "@/lib/referee-platform";
import { useSession } from "@/lib/session";

interface LocalNotebook {
  draft: PeriodDraft;
  pending?: PeriodUpdate;
  clock?: ClockCommand;
  keepDraft?: boolean;
}

const eventLabels: Record<EventType, string> = {
  goal: "Gol", own_goal: "Autorete", yellow: "Ammonizione", red: "Espulsione",
  substitution: "Sostituzione", points: "Punti", set: "Set vinto",
};

export function Notebook({ fixtureId }: { fixtureId: string }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const query = useApiQuery(["notebook", userId, fixtureId], () => fetchNotebook(fixtureId), { retry: false });
  if (query.isLoading) return <SkeletonBlock />;
  if (query.isError && (!query.data || (query.error instanceof ApiRequestError && [401, 403, 404].includes(query.error.status)))) {
    return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
  }
  if (!query.data || !userId) return null;
  return <NotebookEditor fixtureId={fixtureId} storageKey={`refcheckid.notebook:${userId}:${fixtureId}`} {...query.data} refresh={query.refetch} />;
}

function NotebookEditor({ fixtureId, game, role, storageKey, refresh }: {
  fixtureId: string;
  game: GameContext;
  role: Appointment["role"];
  storageKey: string;
  refresh: () => Promise<unknown>;
}) {
  const [local, setLocal] = useState<LocalNotebook | null>(null);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [rejected, setRejected] = useState(false);
  const [type, setType] = useState<EventType | null>(null);
  const [clubId, setClubId] = useState(game.home.id);
  const [person, setPerson] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<string | null>(null);
  const [minute, setMinute] = useState("0");
  const [stoppage, setStoppage] = useState("0");
  const [points, setPoints] = useState("1");
  const summary = game.summary;
  const principal = role === "principal";
  const readOnly = game.reportStatus === "submitted" || game.reportStatus === "locked";
  const draft = local?.draft ?? {
    events: game.events,
    period: summary?.state === "period_confirmed"
      ? Math.min(summary.period + 1, game.competition.rules.periods) : summary?.period ?? 1,
    revision: summary?.revision ?? 0,
    correctionReason: "",
  };
  const draftScore = buildPeriodUpdate(draft, game.home.id, "provisional", "");
  const types: readonly EventType[] = game.competition.sport === "football"
    ? ["goal", "own_goal", "yellow", "red", "substitution"]
    : game.competition.sport === "basketball" ? ["points", "substitution"] : ["set", "substitution"];

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey).then((saved) => {
      if (!active) return;
      if (saved) setLocal(JSON.parse(saved));
      setRestored(true);
    }).catch(() => { if (active) setError("Impossibile leggere il taccuino locale."); });
    return () => { active = false; };
  }, [storageKey]);

  async function perform(task: () => Promise<void>) {
    if (lock.current || !restored) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setRejected(false);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operazione non riuscita.");
      setRejected(cause instanceof ApiRequestError && [400, 403, 409, 422].includes(cause.status));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function persist(next: LocalNotebook) {
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    setLocal(next);
  }

  function addEvent() {
    if (!type || (type !== "set" && !person) || (type === "substitution" && !incoming)) return;
    void perform(async () => {
      const next = { ...draft, events: [...draft.events, {
        id: randomUUID(), period: draft.period, type, clubId, registrationId: type === "set" ? null : person,
        incomingRegistrationId: type === "substitution" ? incoming : null, minute: Number(minute),
        stoppage: Number(stoppage), points: type === "points" ? Number(points) : ["goal", "own_goal", "set"].includes(type) ? 1 : 0,
      }] };
      await persist({ draft: next });
      setType(null);
    });
  }

  function sync(state?: GameState) {
    void perform(async () => {
      const pending = local?.pending ?? (state && buildPeriodUpdate(draft, game.home.id, state, randomUUID()));
      if (!pending) return;
      if (!local?.pending) await persist({ draft, pending });
      const confirmed = await postPeriod(fixtureId, pending);
      await AsyncStorage.removeItem(storageKey);
      await refresh();
      setLocal(null);
      setConfirmed(confirmed.revision);
    });
  }

  function syncClock(action?: ClockCommand["action"]) {
    void perform(async () => {
      const command = local?.clock ?? (action && { action, revision: game.progress?.revision ?? 0, operationId: randomUUID() });
      if (!command) return;
      if (!local?.clock) await persist({ draft, clock: command, keepDraft: !!local });
      await postClock(fixtureId, command);
      if (local?.clock ? local.keepDraft : local) await persist({ draft });
      else {
        await AsyncStorage.removeItem(storageKey);
        setLocal(null);
      }
      await refresh();
    });
  }

  const [confirmed, setConfirmed] = useState<number | null>(null);
  const queued = !!(local?.pending || local?.clock);
  const locked = busy || !restored || queued || readOnly;
  const clock = game.progress;
  const clockAction = !clock || clock.phase === "interval" ? "start" : clock.runningSince ? "pause" : "resume";
  const clockLabel = { start: "Avvia periodo", pause: "Metti in pausa", resume: "Riprendi" }[clockAction];
  return (
    <View style={{ gap: 16 }}>
      <Card style={{ gap: 8 }}>
        <Text accessibilityRole="header">Taccuino · {game.home.name} – {game.away.name}</Text>
        <Text>{summary ? `Server: ${summary.homeScore} – ${summary.awayScore} · revisione ${summary.revision}` : "Nessun aggiornamento sul server."}</Text>
        <Text>{queued ? "In attesa di sincronizzazione" : local ? "Bozza salvata sul dispositivo" : confirmed !== null ? `Confermata dal server · revisione ${confirmed}` : "Dati del server"}</Text>
        {error ? <Text accessibilityRole="alert">{error}</Text> : null}
        {local?.pending ? <Button disabled={busy} onPress={() => sync()}>Riprova invio salvato</Button> : null}
        {local?.clock ? <Button disabled={busy} onPress={() => syncClock()}>Riprova comando orologio</Button> : null}
        {local && queued && rejected ? <Button disabled={busy} onPress={() => void perform(async () => {
          await refresh();
          await persist({ draft: local.draft });
        })}>Torna alla bozza locale</Button> : null}
        {local && !queued && local.draft.revision !== (summary?.revision ?? 0) ? (
          <Button disabled={busy} onPress={() => void perform(async () => {
            await AsyncStorage.removeItem(storageKey);
            setLocal(null);
            await refresh();
          })}>Scarta bozza obsoleta e ricarica</Button>
        ) : null}
        <Text>Orologio server · {clock ? `${clock.seconds} s${clock.runningSince ? " · in corso" : ""}` : "fermo"}</Text>
        {principal && game.recognitionStatus === "locked" && !readOnly && summary?.state !== "final_confirmed" && !queued ? (
          <>
            <Button disabled={locked} onPress={() => syncClock(clockAction)}>{clockLabel}</Button>
            {clock?.runningSince ? <Button disabled={locked} onPress={() => syncClock("suspend")}>Sospendi gara</Button> : null}
          </>
        ) : null}
        <Text>Periodo {draft.period} · {draftScore.homeScore} – {draftScore.awayScore}</Text>
        {!readOnly && !queued ? (
          <>
            {Array.from({ length: game.competition.rules.periods }, (_, index) => index + 1).map((period) => (
              <Button key={period} disabled={locked || draft.period === period} onPress={() => void perform(() => persist({ draft: { ...draft, period } }))}>Periodo {period}</Button>
            ))}
            <Text>Nuovo evento</Text>
            {types.map((event) => <Button key={event} disabled={locked} onPress={() => { setType(event); setPerson(null); setIncoming(null); }}>{eventLabels[event]}{type === event ? " ✓" : ""}</Button>)}
            {type ? (
              <>
                {[game.home, game.away].map((club) => <Button key={club.id} disabled={locked} onPress={() => { setClubId(club.id); setPerson(null); setIncoming(null); }}>{club.name}{clubId === club.id ? " ✓" : ""}</Button>)}
                {type !== "set" ? game.players.filter((player) => player.clubId === clubId).map((player) => (
                  <Button key={player.registrationId} disabled={locked} onPress={() => setPerson(player.registrationId)}>{player.shirtNumber ?? "—"} {player.name}{person === player.registrationId ? " ✓" : ""}</Button>
                )) : null}
                {type === "substitution" && person ? (
                  <>
                    <Text>Giocatore entrante</Text>
                    {game.players.filter((player) => player.clubId === clubId && player.registrationId !== person).map((player) => <Button key={player.registrationId} disabled={locked} onPress={() => setIncoming(player.registrationId)}>{player.name}{incoming === player.registrationId ? " ✓" : ""}</Button>)}
                  </>
                ) : null}
                <Input accessibilityLabel="Minuto" keyboardType="number-pad" value={minute} onChangeText={setMinute} editable={!locked} />
                <Input accessibilityLabel="Recupero" keyboardType="number-pad" value={stoppage} onChangeText={setStoppage} editable={!locked} />
                {type === "points" ? <Input accessibilityLabel="Punti" keyboardType="number-pad" value={points} onChangeText={setPoints} editable={!locked} /> : null}
                <Button disabled={locked || (type !== "set" && !person) || (type === "substitution" && (!incoming || incoming === person))} onPress={addEvent}>Salva evento sul dispositivo</Button>
              </>
            ) : null}
            {draft.events.map((event) => (
              <View key={event.id}>
                <Text>{event.period}° · {event.minute}′ · {eventLabels[event.type]} · {game.players.find((player) => player.registrationId === event.registrationId)?.name ?? (event.clubId === game.home.id ? game.home.name : game.away.name)}</Text>
                <Button disabled={locked} onPress={() => void perform(() => persist({ draft: { ...draft, events: draft.events.filter((row) => row.id !== event.id) } }))}>Rimuovi evento</Button>
              </View>
            ))}
            {summary && summary.state !== "provisional" && principal ? <Input value={draft.correctionReason} editable={!locked} placeholder="Motivo della rettifica" onChangeText={(correctionReason) => {
              setLocal({ draft: { ...draft, correctionReason } });
            }} onEndEditing={(event) => void perform(() => persist({ draft: { ...draft, correctionReason: event.nativeEvent.text } }))} /> : null}
            {summary?.state !== "final_confirmed" ? <Button disabled={locked} onPress={() => sync("provisional")}>Invia aggiornamento provvisorio</Button> : null}
            {principal && summary?.state !== "final_confirmed" ? <Button disabled={locked} onPress={() => sync("period_confirmed")}>Conferma periodo</Button> : null}
            {principal ? <Button disabled={locked} onPress={() => sync("final_confirmed")}>Conferma fine gara</Button> : null}
          </>
        ) : null}
      </Card>
      <EventArchive fixtureId={fixtureId} revision={summary?.revision} />
      {principal && (readOnly || summary?.state === "final_confirmed") ? <PrivateReport fixtureId={fixtureId} submitted={readOnly} blocked={!!local} refresh={refresh} /> : null}
    </View>
  );
}

function EventArchive({ fixtureId, revision }: { fixtureId: string; revision?: number }) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const history = useApiQuery(["event-archive", fixtureId, revision, cursor], () =>
    request<PlatformPage<GameSummary & { events: readonly GameEvent[] }>>(`${gamePath(fixtureId)}/history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`));
  return (
    <Card style={{ gap: 8 }}>
      <Text accessibilityRole="header">Archivio eventi e risultati</Text>
      {history.isError ? <ErrorState message={history.error.message} onRetry={() => void history.refetch()} /> : null}
      {history.isLoading ? <SkeletonBlock /> : null}
      {history.data?.items.map((row) => (
        <View key={row.revision} style={{ gap: 4 }}>
          <Button onPress={() => setExpanded(expanded === row.revision ? null : row.revision)}>
            Rev. {row.revision} · periodo {row.period} · {row.homeScore} – {row.awayScore} · {row.state}
          </Button>
          {expanded === row.revision ? row.events.map((event) => (
            <Text key={event.id}>{event.period}° · {event.minute}′{event.stoppage ? `+${event.stoppage}` : ""} · {eventLabels[event.type]}</Text>
          )) : null}
        </View>
      ))}
      {cursor ? <Button onPress={() => setCursor(null)}>Prima pagina</Button> : null}
      {history.data?.nextCursor ? <Button onPress={() => setCursor(history.data?.nextCursor ?? null)}>Revisioni precedenti</Button> : null}
    </Card>
  );
}

function PrivateReport({ fixtureId, submitted, blocked, refresh }: { fixtureId: string; submitted: boolean; blocked: boolean; refresh: () => Promise<unknown> }) {
  const path = `${gamePath(fixtureId)}/report`;
  const [notes, setNotes] = useState("");
  const query = useApiQuery(["private-report", fixtureId], () => request<{ summary: string } | null>(path), { retry: false });
  const send = useApiMutation(() => request(path, { method: "POST", body: JSON.stringify({ notes }) }), {
    async onSuccess() { await Promise.all([refresh(), query.refetch()]); setNotes(""); },
  });
  let saved = "";
  if (query.data?.summary) {
    try { saved = JSON.parse(query.data.summary)?.refereeNotes ?? ""; } catch { saved = query.data.summary; }
  }
  return (
    <Card style={{ gap: 8 }}>
      <Text accessibilityRole="header">Referto riservato</Text>
      {query.isError ? <ErrorState message={query.error.message} /> : null}
      {submitted ? <Text>{saved || "Nessuna nota arbitrale."}</Text> : (
        <>
          <Input accessibilityLabel="Note arbitrali" multiline value={notes} onChangeText={setNotes} />
          <Button disabled={blocked || query.isPending || query.isError || send.isPending} onPress={() => send.mutate()}>Invia referto riservato</Button>
          {send.isError ? <Text accessibilityRole="alert">{send.error.message}</Text> : null}
        </>
      )}
    </Card>
  );
}
