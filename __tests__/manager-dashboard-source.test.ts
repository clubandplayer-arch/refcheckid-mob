import { fetchManagerDashboard, fetchManagerMatchSheet, writeMatchSheet } from "@/lib/api-client";
import { removeStoredSession, writeStoredSession } from "@/lib/session";

const originalFetch = fetch;
const match = (id: string, homeClubId = "club") => ({
  id, homeClubId, awayClubId: "guest", homeClubName: "Casa", awayClubName: "Ospiti",
  scheduledAt: "2026-04-10T15:00:00.000Z", status: "scheduled",
});
const sheet = (id: string, matchId: string, clubId = "club") => ({ id, matchId, clubId, status: "draft", players: [], staff: [] });

afterEach(() => {
  globalThis.fetch = originalFetch;
  removeStoredSession();
});

it("lists the authenticated club's matches instead of inferring a club from the email", async () => {
  signIn(["club"]);
  globalThis.fetch = jest.fn(async (url) => reply(String(url).endsWith("/matches")
    ? [match("mine"), match("outside", "other")]
    : [sheet("sheet", "mine")]));
  const dashboard = await fetchManagerDashboard();
  expect(dashboard.games).toMatchObject([{ id: "mine", clubId: "club", opponent: "Ospiti" }]);
  expect(dashboard.nextMatch?.id).toBe("mine");
});

it("opens the selected match and rejects a club outside the profile before sending requests", async () => {
  signIn(["club"]);
  const mock = jest.fn(async (url) => reply(String(url).endsWith("/matches/selected") ? match("selected")
    : [sheet("first", "earlier"), sheet("other-club", "selected", "guest"), sheet("right", "selected")]));
  globalThis.fetch = mock;
  await expect(fetchManagerMatchSheet("selected", "guest")).rejects.toThrow("non autorizzata");
  expect(mock).not.toHaveBeenCalled();
  await expect(fetchManagerMatchSheet("selected", "club")).resolves.toMatchObject({ id: "right" });
  expect(mock).toHaveBeenCalledWith(expect.stringContaining("/match-sheets?matchId=selected"), expect.any(Object));
});

it("preserves a backend denial instead of opening a different match", async () => {
  signIn(["club"]);
  globalThis.fetch = jest.fn(async () => reply({ message: "Gara fuori competenza" }, 403));
  await expect(fetchManagerMatchSheet("selected", "club")).rejects.toMatchObject({ status: 403, message: "Gara fuori competenza" });
});

it("sends the saved lineup to the selected sheet and reopens server rows", async () => {
  signIn(["club"]);
  const lineup = { players: [{ playerRegistrationId: "registration", role: "starter", shirtNumber: 9, lineupOrder: 0, isCaptain: true }], staff: [{ staffRegistrationId: "staff", role: "coach" }] };
  const saved = { ...sheet("right", "selected"), ...lineup };
  const mock = jest.fn(async (url, init) =>
    reply(init?.method === "POST" ? saved : String(url).endsWith("/matches/selected") ? match("selected") : [saved]));
  globalThis.fetch = mock;
  await writeMatchSheet("right", "draft", lineup);
  expect(mock).toHaveBeenCalledWith(expect.stringContaining("/match-sheets/right/draft"),
    expect.objectContaining({ method: "POST", body: JSON.stringify(lineup) }));
  await expect(fetchManagerMatchSheet("selected", "club")).resolves.toMatchObject(saved);
});

function signIn(clubIds: string[]) {
  writeStoredSession({
    accessToken: "access", refreshToken: "refresh", expiresAt: new Date(Date.now() + 60_000).toISOString(),
    user: { id: "manager", email: "different@example.test", displayName: "Dirigente", role: "manager", clubIds },
  });
}

function reply(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}
