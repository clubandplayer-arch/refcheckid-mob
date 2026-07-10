// @ts-nocheck
import { readFileSync } from "fs";
import { join } from "path";

describe("ARCH-1 manager mobile official photo migration", () => {
  const backendSource = readFileSync(join(process.cwd(), "src/lib/manager-photo-backend.ts"), "utf8");
  const workflowSource = readFileSync(join(process.cwd(), "src/features/manager/match-sheet-workflow.tsx"), "utf8");
  const flagsSource = readFileSync(join(process.cwd(), "src/lib/photo-feature-flags.ts"), "utf8");

  it("uses the existing ARCH-1 feature flags without adding mobile-specific flags", () => {
    expect(flagsSource).toContain("photos.officialBackendRead");
    expect(flagsSource).toContain("photos.officialBackendUpload");
    expect(flagsSource).toContain("photos.legacyLocalFallback");
    expect(flagsSource).toContain("photos.dualWriteLegacy");
    expect(flagsSource.includes("managerMobile")).toBe(false);
  });

  it("performs upload intent and upload complete through the Official Photo Service", () => {
    expect(backendSource).toContain("/photos/upload-intent");
    expect(backendSource).toContain("/photos/uploads/");
    expect(backendSource).toContain("contentBase64");
    expect(backendSource.includes("supabase")).toBe(false);
  });

  it("reads backend photo state and approvals instead of computing states locally", () => {
    expect(backendSource).toContain("/players/");
    expect(backendSource).toContain("/photo?rendition=normalized");
    expect(backendSource).toContain("/photo-approvals?registrationId=");
    expect(backendSource).toContain("/photos/versions/");
  });

  it("keeps offline cache as a temporary copy and exposes backend states in UI", () => {
    expect(backendSource).toContain("refcheckid.officialPhotoCache.v1");
    expect(backendSource).toContain("cacheTtlMs");
    expect(workflowSource).toContain("prefetchOfficialPlayerPhotos");
    expect(workflowSource).toContain("Stato backend");
    for (const status of ["Missing", "Pending", "Active", "Rejected", "Suspended"]) {
      expect(workflowSource).toContain(status);
    }
  });

  it("does not save manager player photos through the legacy local store in the primary workflow", () => {
    expect(workflowSource).toContain("uploadOfficialPlayerPhoto");
    expect(workflowSource.includes("saveManagerSubjectPhoto")).toBe(false);
  });
});
