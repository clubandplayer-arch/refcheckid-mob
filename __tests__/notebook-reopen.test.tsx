import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Notebook } from "@/features/referee/notebook";
import { fetchNotebook, postPeriod, type PeriodUpdate } from "@/lib/referee-platform";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-crypto", () => ({ randomUUID: () => "stable-op" }));
jest.mock("@/lib/session", () => ({ useSession: () => ({ session: { user: { id: "referee" } } }) }));
jest.mock("@/lib/api-client", () => ({
  ...jest.requireActual("@/lib/api-client"),
  request: jest.fn(async () => ({ items: [], nextCursor: null })),
}));
jest.mock("@/lib/referee-platform", () => ({
  ...jest.requireActual("@/lib/referee-platform"),
  fetchNotebook: jest.fn(),
  postPeriod: jest.fn(),
}));

it("reopens a persisted unconfirmed operation and sends exactly the original payload", async () => {
  const storageKey = "refcheckid.notebook:referee:fixture";
  const game = {
    reportStatus: null, summary: null,
    competition: { sport: "football", rules: { periods: 2, minutesPerPeriod: 45 } },
    home: { id: "home", name: "Casa" }, away: { id: "away", name: "Ospiti" },
    players: [], events: [],
  };
  jest.mocked(fetchNotebook).mockResolvedValue({ game, role: "principal" });
  jest.mocked(postPeriod)
    .mockRejectedValueOnce(new Error("Rete caduta"))
    .mockResolvedValueOnce({ revision: 1, period: 1, state: "provisional", homeScore: 0, awayScore: 0 });
  await AsyncStorage.clear();

  const initial = openNotebook();
  await waitFor(() => expect(screen.getByText("Invia aggiornamento provvisorio")).toBeEnabled());
  fireEvent.press(screen.getByText("Invia aggiornamento provvisorio"));
  await screen.findByText("Rete caduta");
  const saved = JSON.parse((await AsyncStorage.getItem(storageKey)) ?? "null") as { pending: PeriodUpdate };
  expect(saved.pending).toMatchObject({ operationId: "stable-op", revision: 0 });
  initial.unmount();

  openNotebook();
  await screen.findByText("In attesa di sincronizzazione");
  fireEvent.press(screen.getByText("Riprova invio salvato"));
  await screen.findByText("Confermata dal server · revisione 1");
  expect(jest.mocked(postPeriod).mock.calls).toEqual([["fixture", saved.pending], ["fixture", saved.pending]]);
  expect(await AsyncStorage.getItem(storageKey)).toBeNull();
});

function openNotebook() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Notebook fixtureId="fixture" />
    </QueryClientProvider>,
  );
}
