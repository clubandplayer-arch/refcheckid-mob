import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, SkeletonBlock } from "@/components/ui/state";
import { useApiMutation, useApiQuery, useInvalidateQueries } from "@/lib/query";
import { fetchAppointments, replyToAppointment } from "@/lib/referee-platform";

const appointmentsKey = ["appointments"] as const;
const roles = { principal: "Arbitro principale", assistant: "Assistente", table: "Ufficiale di tavolo" };

export function Appointments() {
  const [cursor, setCursor] = useState<string | null>(null);
  const invalidate = useInvalidateQueries();
  const query = useApiQuery([...appointmentsKey, cursor], () => fetchAppointments(cursor));
  const change = useApiMutation(({ id, action }: { id: string; action: "accept" | "decline" }) =>
    replyToAppointment(id, action), {
    async onSuccess() {
      await Promise.all([invalidate(appointmentsKey), invalidate(["referees"])]);
    },
  });

  return (
    <Card style={{ gap: 12 }}>
      <Text accessibilityRole="header">Designazioni</Text>
      {query.isLoading ? <SkeletonBlock /> : null}
      {query.isError ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : null}
      {change.isError ? <Text accessibilityRole="alert">{change.error.message}</Text> : null}
      {query.data?.items.length === 0 ? <Text>Nessuna designazione.</Text> : null}
      {query.data?.items.map((row) => (
        <View key={row.id} style={{ gap: 8 }}>
          <Text>{row.fixture.externalCode} · {new Date(row.fixture.scheduledAt).toLocaleString("it-IT")}</Text>
          <Text>{roles[row.role]} · {row.fixture.venue}</Text>
          {!row.delegationActive ? <Text>Delega inattiva</Text> : null}
          {row.status === "invited" && row.delegationActive ? (
            <>
              <Button disabled={change.isPending} onPress={() => change.mutate({ id: row.id, action: "accept" })}>Accetta gara</Button>
              <Button disabled={change.isPending} onPress={() => change.mutate({ id: row.id, action: "decline" })}>Comunica indisponibilità</Button>
            </>
          ) : null}
          {row.operational && row.role === "principal" ? <Button onPress={() => router.push({ pathname: "/referee/match", params: { matchId: row.fixture.matchId } })}>Apri distinte e riconoscimento</Button> : null}
          {row.operational ? <Button onPress={() => router.push({ pathname: "/referee/notebook", params: { fixtureId: row.fixtureId } })}>Apri taccuino</Button> : null}
        </View>
      ))}
      {cursor ? <Button onPress={() => setCursor(null)}>Prima pagina</Button> : null}
      {query.data?.nextCursor ? <Button onPress={() => setCursor(query.data?.nextCursor ?? null)}>Pagina successiva</Button> : null}
    </Card>
  );
}
