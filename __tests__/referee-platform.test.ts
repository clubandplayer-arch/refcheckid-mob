import { ApiRequestError, request } from "@/lib/api-client";
import { buildPeriodUpdate, fetchNotebook, postPeriod, type PeriodDraft } from "@/lib/referee-platform";

jest.mock("@/lib/api-client", () => ({
  ...jest.requireActual("@/lib/api-client"),
  request: jest.fn(),
}));
const api = jest.mocked(request);
beforeEach(() => api.mockReset());

it("checks access before fetching protected notebook context", async () => {
  api.mockRejectedValueOnce(new ApiRequestError(403, "Incarico fuori competenza"));
  await expect(fetchNotebook("fixture")).rejects.toMatchObject({ status: 403 });
  expect(api.mock.calls).toEqual([["/platform/games/fixture/access"]]);
  api.mockResolvedValueOnce({ role: "assistant" }).mockResolvedValueOnce({ events: [] });
  await expect(fetchNotebook("fixture")).resolves.toEqual({ role: "assistant", game: { events: [] } });
});

it("retries the same queued period payload after a lost network response", async () => {
  const draft: PeriodDraft = {
    revision: 3, period: 1, correctionReason: "",
    events: [{ id: "event", period: 1, clubId: "away", type: "own_goal", registrationId: "player", incomingRegistrationId: null, points: 1, minute: 20, stoppage: 0 }],
  };
  const pending = buildPeriodUpdate(draft, "home", "period_confirmed", "one-operation");
  api.mockRejectedValueOnce(new Error("Rete assente")).mockResolvedValueOnce({ revision: 4 });
  await expect(postPeriod("fixture", pending)).rejects.toThrow("Rete assente");
  await expect(postPeriod("fixture", JSON.parse(JSON.stringify(pending)))).resolves.toEqual({ revision: 4 });
  expect(api.mock.calls[0]).toEqual(api.mock.calls[1]);
  expect(pending).toMatchObject({ operationId: "one-operation", revision: 3, homeScore: 1, awayScore: 0 });
});
