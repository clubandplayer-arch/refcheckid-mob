import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { MatchSheetWorkflow } from "@/features/manager/match-sheet-workflow";
import { ToastProvider } from "@/components/ui/toast";
import { fetchManagerMatchSheet, fetchManagerRoster } from "@/lib/api-client";
import type { PlayerListItem } from "@/lib/types";

jest.mock("@/lib/session", () => ({ useSession: () => ({ session: null }) }));
jest.mock("@/components/ui/bottom-sheet", () => ({ BottomSheet: () => null }));
jest.mock("@/lib/api-client", () => ({
  ...jest.requireActual("@/lib/api-client"), fetchManagerMatchSheet: jest.fn(), fetchManagerRoster: jest.fn(),
}));
jest.mock("@/lib/manager-photo-backend", () => ({
  ...jest.requireActual("@/lib/manager-photo-backend"),
  fetchManagerPhotoStates: jest.fn(async () => new Map([["a", {
    status: "pending", currentPhotoUrl: "https://example.test/current.jpg",
    lastFederationDecision: { status: "rejected", reasonText: "Volto non visibile" },
  }], ["b", { status: "active", currentPhotoUrl: "https://example.test/other.jpg" }]])),
}));

const a = player("a", "Alfa");
const suspended = player("s", "Squalificato", true);
const b = player("b", "Beta");

it("selects the eligible roster across a search and reorders past an unselected row", async () => {
  open("draft");
  await screen.findByText("Alfa Test");
  fireEvent.changeText(screen.getByPlaceholderText("Cerca giocatore"), "Alfa");
  expect(screen.queryByText("Beta Test")).toBeNull();
  fireEvent.press(screen.getByText("Seleziona tutti"));
  expect(screen.getByText("2 giocatori convocati")).toBeOnTheScreen();
  fireEvent.press(screen.getAllByText("2. Ordine")[0]);
  fireEvent.press(screen.getAllByText("Giù")[0]);
  expect(screen.getByText("1. Beta Test")).toBeOnTheScreen();
  expect(screen.getByText("2. Alfa Test")).toBeOnTheScreen();
});

it("keeps locked lineup controls disabled while photo status and management remain available", async () => {
  open("locked");
  await screen.findByText("Ultima decisione federale: Rifiutata");
  expect(screen.getByText("Volto non visibile")).toBeOnTheScreen();
  expect(screen.getByText("Richiesta già in attesa")).toBeOnTheScreen();
  expect(screen.getByText("Gestisci foto")).toBeEnabled();
  expect(screen.getAllByText("Rimuovi")[0]).toBeDisabled();
  fireEvent.press(screen.getAllByText("2. Ordine")[0]);
  expect(screen.getAllByPlaceholderText("N° maglia")[0]).toBeDisabled();
  expect(screen.getAllByText("Rimuovi")[0]).toBeDisabled();
  expect(screen.getAllByText("Giù")[0]).toBeDisabled();
});

function open(status: "draft" | "locked") {
  jest.mocked(fetchManagerMatchSheet).mockResolvedValue({
    id: "sheet", matchId: "game", clubId: "club", status, submittedAt: null,
    match: { id: "game", homeClubId: "club", awayClubId: "away", refereeId: null, scheduledAt: "", venue: null, status: "scheduled" },
    players: status === "locked" ? [a, b].map((row, lineupOrder) => ({
      playerRegistrationId: row.id, shirtNumber: lineupOrder + 1, lineupOrder, role: "starter",
    })) : [],
  });
  jest.mocked(fetchManagerRoster).mockResolvedValue({ players: [a, suspended, b], staff: [] });
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  render(<QueryClientProvider client={client}><ToastProvider><MatchSheetWorkflow matchId="game" clubId="club" /></ToastProvider></QueryClientProvider>);
}

function player(id: string, lastName: string, suspended = false): PlayerListItem {
  return { id, lastName, firstName: "Test", suspended, selected: false, registrationId: id, season: "test", photoUrl: null,
    warning: false, shirtNumber: null, role: "starter", isGoalkeeper: false, isCaptain: false, isViceCaptain: false };
}
