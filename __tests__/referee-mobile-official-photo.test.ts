import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Referee Mobile ARCH-1 official photo workflow", () => {
  it("uses the backend match photo manifest as the recognition source of truth", () => {
    const apiClient = read("src/lib/api-client.ts");
    const refereeClient = read("src/lib/referee-api-client.ts");

    expect(apiClient).toContain("ApiMatchPhotoManifest");
    expect(apiClient).toContain("/matches/${encodeURIComponent(matchId)}/photo-manifest");
    expect(refereeClient).toContain("getPhotoFeatureFlags");
    expect(refereeClient).toContain("fetchMatchPhotoManifest(matchId)");
    expect(refereeClient).toContain('manifest.status !== "available"');
    expect(refereeClient).not.toContain('/players/${encodeURIComponent');
    expect(refereeClient).not.toContain('/photo?rendition');
  });

  it("pins and prefetches the manifest-backed recognition cache for offline use", () => {
    const workflow = read("src/features/referee/referee-match-workflow.tsx");

    expect(workflow).toContain("staleTime: Number.POSITIVE_INFINITY");
    expect(workflow).toContain("refetchOnWindowFocus: false");
    expect(workflow).toContain("refetchOnReconnect: false");
    expect(workflow).toContain("refetchOnMount: false");
    expect(workflow).toContain("refetchInterval: false");
    expect(workflow).toContain("retry: false");
    expect(workflow).toContain("manifestQueryOptions");
    expect(workflow).toContain("Image.prefetch(photoUrl)");
    expect(workflow).toContain('() => fetchRecognitionSubjects(matchId)');
  });

  it("renders backend photo state and frozen snapshot metadata without local reconstruction", () => {
    const types = read("src/lib/referee-types.ts");
    const workflow = read("src/features/referee/referee-match-workflow.tsx");

    expect(types).toContain("ManifestPhotoStatus");
    expect(types).toContain("ManifestSource");
    expect(types).toContain("photoEtag?: string | null");
    expect(types).toContain("isFrozenSnapshot?: boolean");
    expect(workflow).toContain("photoStatusLabel(currentSubject.photoStatus");
    expect(workflow).toContain("Snapshot congelato");
    expect(workflow).toContain("Manifest backend");
    expect(workflow).toContain("currentSubject.photoEtag");
    expect(workflow).toContain('(currentSubject.photoStatus ?? "missing") === "active"');
  });
});
