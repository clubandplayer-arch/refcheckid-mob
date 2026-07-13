import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Manager Mobile ARCH-1 subject workflow", () => {
  it("uses the official subject upload workflow for both players and staff", () => {
    const workflow = read("src/features/manager/match-sheet-workflow.tsx");

    expect(workflow).toContain('subjectKind: "athlete"');
    expect(workflow).toContain('subjectKind: "staff_member"');
    expect(workflow).toContain("uploadOfficialSubjectPhoto");
    expect(workflow).toContain("Pending Approval");
  });

  it("enriches players and staff with backend photo state and registration context", () => {
    const apiClient = read("src/lib/api-client.ts");

    expect(apiClient).toContain("enrichPlayersWithBackendPhotos");
    expect(apiClient).toContain("enrichStaffWithBackendStatus");
    expect(apiClient).toContain("fetchPlayerRegistrations");
    expect(apiClient).toContain("fetchStaffRegistrations");
  });

  it("implements Upload Intent and Upload Complete in the mobile official photo service", () => {
    const backend = read("src/lib/manager-photo-backend.ts");

    expect(backend).toContain('"/photos/upload-intent"');
    expect(backend).toContain('/photos/uploads/${encodeURIComponent(uploadId)}/complete');
    expect(backend).toContain("readBackendPhotoState");
    expect(backend).toContain("proposedPhotoUrl");
    expect(backend).not.toContain("playerId: input.subjectId");
    expect(backend).not.toContain("staffMemberId: input.subjectId");
  });

  it("keeps manager mobile official-photo read mapping aligned with Manager Web", () => {
    const apiClient = read("src/lib/api-client.ts");
    const backend = read("src/lib/manager-photo-backend.ts");
    const workflow = read("src/features/manager/match-sheet-workflow.tsx");

    expect(apiClient).toContain("fetchPlayerRegistrations(`?clubId=${encodeURIComponent(managerClubId)}`).catch");
    expect(apiClient).toContain('return value === "/placeholder-player.svg" ? null : value;');
    expect(backend).toContain("currentPhotoUrl = signed.signedUrl?.url ?? null");
    expect(backend).toContain("if (flags.legacyLocalFallback) currentPhotoUrl = legacyPhotoUrl");
    expect(backend).toContain("return signed.signedUrl?.url ?? null");
    expect(workflow).toContain("resolveRenderablePhotoUrl");
    expect(workflow).toContain("function SubjectPhoto");
    expect(backend).toContain('import { request } from "./api-request";');
    expect(apiClient).toContain('import { request } from "./api-request";');
    expect(apiClient).not.toContain('from "./session"');
    expect(workflow).not.toContain("PlayerPhotoDiagnostics");
  });

});
