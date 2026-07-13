const rawBackendPlayersById = new Map<string, unknown>();
const signedPhotoPayloadBySubjectId = new Map<string, unknown>();

export function registerManagerRawBackendPlayers(players: readonly Record<string, unknown>[]): void {
  rawBackendPlayersById.clear();
  players.forEach((player) => {
    const id = player.id;
    if (typeof id === "string") rawBackendPlayersById.set(id, player);
  });
}

export function readManagerRawBackendPlayer(playerId: string): unknown {
  return rawBackendPlayersById.get(playerId) ?? null;
}

export function registerManagerSignedPhotoPayload(subjectId: string, payload: unknown): void {
  signedPhotoPayloadBySubjectId.set(subjectId, payload);
}

export function readManagerSignedPhotoPayload(subjectId: string): unknown {
  return signedPhotoPayloadBySubjectId.get(subjectId) ?? null;
}
