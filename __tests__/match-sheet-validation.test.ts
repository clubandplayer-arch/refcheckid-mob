import { getMatchSheetSubmitError, validateMatchSheet } from "@/lib/match-sheet-validation";
import type { PlayerListItem, StaffListItem } from "@/lib/types";

describe("Wave 5 match sheet validation", () => {
  it("matches the Web errors for empty sheets", () => {
    const validation = validateMatchSheet([], []);

    expect(validation.isValid).toBe(false);
    expect(JSON.stringify(validation.errors)).toBe(JSON.stringify([
      "Seleziona almeno un giocatore convocato.",
      "Seleziona almeno un membro dello staff.",
      "Seleziona un Portiere tra gli 11 titolari.",
      "Seleziona 11 titolari per completare la distinta.",
    ]));
    expect(getMatchSheetSubmitError(validation)).toBe("Distinta non valida");
  });

  it("detects missing and duplicate shirt numbers before submit", () => {
    const players = buildPlayers(11).map((player, index) => ({
      ...player,
      isGoalkeeper: index === 0,
      shirtNumber: index === 10 ? null : index < 2 ? 7 : index + 1,
    }));
    const validation = validateMatchSheet(players, [staffMember()]);

    expect(validation.missingNumbers).toBe(1);
    expect(JSON.stringify(validation.duplicateShirtNumbers)).toBe(JSON.stringify([7]));
    expect(validation.errors.includes("Completa i numeri maglia per: Cognome11 Nome11.")).toBe(true);
    expect(validation.errors.includes("Numeri di maglia duplicati: 7.")).toBe(true);
    expect(getMatchSheetSubmitError(validation)).toBe("Numeri di maglia duplicati");
  });

  it("enforces starters, starting goalkeeper, bench, staff and armband rules", () => {
    const players = [
      ...buildPlayers(12).map((player, index) => ({
        ...player,
        isCaptain: index === 0 || index === 1,
        isGoalkeeper: false,
        role: "starter" as const,
      })),
      ...buildPlayers(21, 20).map((player) => ({ ...player, role: "reserve" as const })),
    ];
    const validation = validateMatchSheet(players, Array.from({ length: 6 }, (_, index) => staffMember(index + 1)));

    expect(validation.errors.includes("Seleziona un Portiere tra gli 11 titolari.")).toBe(true);
    expect(validation.errors.includes("Seleziona al massimo 11 titolari.")).toBe(true);
    expect(validation.errors.includes("Seleziona al massimo 20 giocatori in panchina.")).toBe(true);
    expect(validation.errors.includes("Seleziona al massimo 5 membri dello staff in panchina.")).toBe(true);
    expect(validation.errors.includes("Seleziona al massimo un Capitano.")).toBe(true);
  });

  it("accepts a valid draft lineup", () => {
    const players = buildPlayers(16).map((player, index) => ({
      ...player,
      isCaptain: index === 1,
      isGoalkeeper: index === 0,
      isViceCaptain: index === 2,
      role: index < 11 ? "starter" as const : "reserve" as const,
    }));

    expect(JSON.stringify(validateMatchSheet(players, [staffMember()]).errors)).toBe(JSON.stringify([]));
  });
});

function buildPlayers(count: number, start = 1): PlayerListItem[] {
  return Array.from({ length: count }, (_, index) => {
    const number = start + index;
    return {
      firstName: `Nome${number}`,
      id: `player-${number}`,
      isCaptain: false,
      isGoalkeeper: false,
      isViceCaptain: false,
      lastName: `Cognome${number}`,
      photoUrl: null,
      role: "starter",
      selected: true,
      shirtNumber: number,
      suspended: false,
      warning: false,
    };
  });
}

function staffMember(index = 1): StaffListItem {
  return { fullName: `Staff ${index}`, id: `staff-${index}`, photoUrl: null, role: "Allenatore", selected: true };
}
