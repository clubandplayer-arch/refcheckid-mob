import { roleRedirects } from "@/components/auth/auth-gate";
import { request, queryKeys } from "@/lib/api-client";
import { getMatchSheetSubmitError, validateMatchSheet } from "@/lib/match-sheet-validation";
import { removeStoredSession, writeStoredSession } from "@/lib/session";
import { validateReportDraft } from "@/lib/referee-report-validation";
import type { MatchReportDraft, RecognitionSubject } from "@/lib/referee-types";
import type { PlayerListItem, StaffListItem } from "@/lib/types";

const originalFetch = globalThis.fetch;

afterEach(() => {
  removeStoredSession();
  globalThis.fetch = originalFetch;
});

describe("Wave 12 final feature parity hardening", () => {
  it("covers the Web role redirects and cross-role authorization targets", () => {
    expect(JSON.stringify(roleRedirects)).toBe(JSON.stringify({
      federation: "/federation",
      manager: "/manager",
      referee: "/referee",
    }));
  });

  it("keeps all Web data domains represented by stable query keys for invalidation", () => {
    expect(JSON.stringify(Object.keys(queryKeys).sort())).toBe(JSON.stringify([
      "audit",
      "federation",
      "manager",
      "matchReports",
      "matchSheets",
      "matches",
      "photos",
      "players",
      "recognitions",
      "referees",
      "staff",
    ]));
  });

  it("sends authorized JSON API requests and supports Web-equivalent 204 responses", async () => {
    writeStoredSession({
      accessToken: "access-token",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      refreshToken: "refresh-token",
      user: { displayName: "Manager", email: "manager@example.test", id: "user-1", role: "manager" },
    });
    const calls: Array<[string, RequestInit | undefined]> = [];
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push([String(url), init]);
      return { ok: true, status: 204 } as Response;
    }) as typeof fetch;

    const response = await request<void>("/match-sheets/sheet-1/submit", { method: "POST" });
    expect(response).toBe(undefined);
    expect(calls.length).toBe(1);
    expect(calls[0]?.[0].includes("/match-sheets/sheet-1/submit")).toBe(true);
    expect((calls[0]?.[1]?.headers as Record<string, string>).authorization).toBe("Bearer access-token");
    expect((calls[0]?.[1]?.headers as Record<string, string>)["content-type"]).toBe("application/json");
    expect(calls[0]?.[1]?.method).toBe("POST");
  });

  it("blocks the critical manager negative path before submit", () => {
    const validation = validateMatchSheet(
      validPlayers().map((player, index) => ({
        ...player,
        isCaptain: index === 0,
        isGoalkeeper: false,
        shirtNumber: index < 2 ? 9 : player.shirtNumber,
      })),
      [],
    );

    expect(validation.isValid).toBe(false);
    expect(validation.errors.includes("Seleziona almeno un membro dello staff.")).toBe(true);
    expect(validation.errors.includes("Numeri di maglia duplicati: 9.")).toBe(true);
    expect(validation.errors.includes("Seleziona un Portiere tra gli 11 titolari.")).toBe(true);
    expect(getMatchSheetSubmitError(validation)).toBe("Numeri di maglia duplicati");
  });

  it("accepts the manager happy path lineup used by the referee and federation workflows", () => {
    const validation = validateMatchSheet(validPlayers(), [staffMember()]);

    expect(validation.isValid).toBe(true);
    expect(JSON.stringify(validation.errors)).toBe(JSON.stringify([]));
  });

  it("blocks closing the referee report while recognition leaves pending subjects", () => {
    const errors = validateReportDraft(validReport(), [recognitionSubject({ decision: "pending" })]);

    expect(errors.includes("Completa il riconoscimento di tutti i tesserati prima del referto.")).toBe(true);
  });

  it("accepts a full referee report once all recognition subjects are decided", () => {
    const errors = validateReportDraft(validReport(), [recognitionSubject({ decision: "approved" })]);

    expect(JSON.stringify(errors)).toBe(JSON.stringify([]));
  });
});

function validPlayers(): PlayerListItem[] {
  return Array.from({ length: 11 }, (_, index) => ({
    firstName: `Nome${index + 1}`,
    id: `player-${index + 1}`,
    isCaptain: index === 0,
    isGoalkeeper: index === 1,
    isViceCaptain: index === 2,
    lastName: `Cognome${index + 1}`,
    photoUrl: null,
    role: "starter",
    selected: true,
    shirtNumber: index + 1,
    suspended: false,
    warning: false,
  }));
}

function staffMember(): StaffListItem {
  return { fullName: "Mario Rossi", id: "staff-1", photoUrl: null, role: "Allenatore", selected: true };
}

function validReport(): MatchReportDraft {
  return {
    awayGoals: 0,
    cautions: [],
    expulsions: [],
    goals: [
      {
        detail: "Azione",
        id: "goal-1",
        minute: 12,
        playerName: "Cognome1 Nome1",
        shirtNumber: 1,
        teamName: "Casa",
      },
    ],
    homeGoals: 1,
    id: "report-1",
    refereeNotes: "Gara regolare.",
    status: "draft",
    substitutions: [],
  };
}

function recognitionSubject(overrides: Partial<RecognitionSubject> = {}): RecognitionSubject {
  return {
    decision: "approved",
    document: { expiresAt: "2027-06-30", number: "DOC-1", type: "CI" },
    firstName: "Nome1",
    id: "subject-1",
    lastName: "Cognome1",
    photoUrl: null,
    roleLabel: "Titolare",
    shirtNumber: 1,
    subjectKind: "player",
    teamName: "Casa",
    ...overrides,
  };
}
