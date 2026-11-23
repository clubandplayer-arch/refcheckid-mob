import { fetchRecognitionSubjects, saveRecognitionDecision } from "@/lib/referee-api-client";
import { fetchMatchPhotoManifest, request } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({ request: jest.fn(), fetchMatchPhotoManifest: jest.fn() }));
const api = jest.mocked(request);
const manifest = jest.mocked(fetchMatchPhotoManifest);
beforeEach(() => { api.mockReset(); manifest.mockReset(); });

it("loads saved decisions for both teams and reopens official signed photos", async () => {
  manifest.mockResolvedValue({
    matchId: "match", manifestVersion: "frozen", photoEtag: "tag", generatedAt: "", expiresAt: null, status: "available",
    subjects: [subject("home", "Casa"), subject("away", "Ospiti")],
  });
  api.mockResolvedValue([{ registrationId: "home", status: "recognized" }, { registrationId: "away", status: "rejected" }]);
  await expect(fetchRecognitionSubjects("match")).resolves.toMatchObject([
    { id: "home", decision: "approved", isFrozenSnapshot: true, photoUrl: expect.stringContaining("/api/v1/photo") },
    { id: "away", decision: "rejected", teamName: "Ospiti" },
  ]);
  expect(api).toHaveBeenCalledWith("/recognitions?matchId=match");
});

it("persists the referee decision with the backend registration ID and status", async () => {
  api.mockResolvedValue({});
  await saveRecognitionDecision("match", "away", "approved");
  expect(api).toHaveBeenCalledWith("/recognitions/decision", {
    method: "POST", body: JSON.stringify({ matchId: "match", registrationId: "away", status: "recognized", notes: "" }),
  });
});

function subject(id: string, teamName: string) {
  return {
    id, firstName: "Nome", lastName: "Test", teamName, photoUrl: "/api/v1/photo", isFrozenSnapshot: true,
    photoStatus: "active" as const, photoEtag: "etag", manifestSource: "frozen_snapshot" as const,
    shirtNumber: 1, roleLabel: "Titolare", subjectKind: "player" as const, document: { type: "", number: "", expiresAt: "" },
  };
}
