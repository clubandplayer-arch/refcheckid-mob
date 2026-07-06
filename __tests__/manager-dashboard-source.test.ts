import { fetchManagerDashboard } from "@/lib/api-client";
import { writeStoredSession } from "@/lib/session";

const originalFetch = fetch;

describe("Wave 4 manager dashboard source", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("uses the manager club, picks the next scheduled match and maps sheet state", async () => {
    writeManagerSession();
    const fetchMock = async (url: string) => {
      if (url.includes("/matches?clubId=70000000-0000-4000-8000-000000000003")) {
        return jsonResponse([
          {
            awayClubId: "away",
            homeClubId: "home",
            id: "later-match",
            refereeId: null,
            scheduledAt: "2026-04-20T15:00:00.000Z",
            status: "scheduled",
            venue: "Campo B",
          },
          {
            awayClubId: "away",
            homeClubId: "home",
            id: "next-match",
            refereeId: null,
            scheduledAt: "2026-04-10T15:00:00.000Z",
            status: "scheduled",
            venue: null,
          },
        ]);
      }

      if (url.includes("/match-sheets?clubId=70000000-0000-4000-8000-000000000003")) {
        return jsonResponse([
          {
            clubId: "70000000-0000-4000-8000-000000000003",
            id: "sheet-next",
            matchId: "next-match",
            status: "submitted",
            submittedAt: "2026-04-09T15:00:00.000Z",
          },
        ]);
      }

      throw new Error(`Unexpected URL ${url}`);
    };
    globalThis.fetch = fetchMock as typeof fetch;

    const dashboard = await fetchManagerDashboard();

    expect(JSON.stringify(dashboard)).toBe(JSON.stringify({
      matchSheetStatus: "submitted",
      nextMatch: {
        id: "next-match",
        opponent: "Sporting Litorale",
        scheduledAt: "2026-04-10T15:00:00.000Z",
        venue: "Da definire",
      },
      notifications: ["Distinta inviata: attendi l’arbitro"],
    }));
  });

  it("defaults to draft with no notifications when the next match has no sheet", async () => {
    writeManagerSession();
    globalThis.fetch = (async (url: string) => {
      if (url.includes("/matches?")) {
        return jsonResponse([
          {
            awayClubId: "away",
            homeClubId: "home",
            id: "next-match",
            refereeId: null,
            scheduledAt: "2026-04-10T15:00:00.000Z",
            status: "scheduled",
            venue: "Campo A",
          },
        ]);
      }

      if (url.includes("/match-sheets?")) return jsonResponse([]);

      throw new Error(`Unexpected URL ${url}`);
    }) as typeof fetch;

    const dashboard = await fetchManagerDashboard();

    expect(dashboard.matchSheetStatus).toBe("draft");
    expect(JSON.stringify(dashboard.notifications)).toBe(JSON.stringify([]));
  });
});

function writeManagerSession() {
  writeStoredSession({
    accessToken: "access-token",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    refreshToken: "refresh-token",
    user: {
      displayName: "Dirigente",
      email: "dirigente@refcheckid.local",
      id: "manager-id",
      role: "manager",
    },
  });
}

function jsonResponse(payload: unknown): Response {
  return {
    json: async () => payload,
    ok: true,
    status: 200,
  } as Response;
}
