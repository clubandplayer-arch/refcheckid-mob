import {
  getOfficialPhotoStateLabel,
  readOfficialPhotoManifestCache,
  resolveOfficialPhotoEntry,
  toManifestEntries,
  writeOfficialPhotoManifestCache,
} from "../src/lib/official-photo-service";

describe("official photo service", () => {
  beforeEach(() => globalThis.localStorage?.clear());

  it("maps backend photos into backend-owned manifest states", () => {
    const manifest = toManifestEntries([
      { id: "photo-1", playerId: "player-1", status: "approved", storagePath: "photos/player-1.jpg" },
      { id: "photo-2", staffMemberId: "staff-1", status: "rejected", storagePath: "photos/staff-1.jpg" },
    ]);

    expect(resolveOfficialPhotoEntry(manifest, "player-1", "player")).toMatchObject({ state: "active", photoUrl: "photos/player-1.jpg" });
    expect(resolveOfficialPhotoEntry(manifest, "staff-1", "staff")).toMatchObject({ state: "rejected", photoUrl: "photos/staff-1.jpg" });
    expect(resolveOfficialPhotoEntry(manifest, "missing", "player")).toMatchObject({ state: "missing", photoUrl: null });
  });

  it("keeps the mobile cache as a temporary copy of the manifest", () => {
    writeOfficialPhotoManifestCache([{ photoUrl: null, state: "pending", subjectId: "player-1", subjectKind: "player", updatedAt: null, version: "v1" }]);

    expect(readOfficialPhotoManifestCache()).toEqual([{ photoUrl: null, state: "pending", subjectId: "player-1", subjectKind: "player", updatedAt: null, version: "v1" }]);
    expect(getOfficialPhotoStateLabel("suspended")).toBe("Suspended");
  });
});
