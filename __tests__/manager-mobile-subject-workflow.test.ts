import { fetchManagerPhotoStates, uploadOfficialSubjectPhoto } from "@/lib/manager-photo-backend";
import { request } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({ request: jest.fn() }));
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digest: jest.fn(async () => new Uint8Array(32).buffer),
}));
jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));
const api = jest.mocked(request);

beforeEach(() => api.mockReset());

it("loads the server's pending photo and mandatory reason in the club scope", async () => {
  api.mockResolvedValue({ items: [{ registrationId: "t", status: "pending", approvalId: "a", currentPhotoUrl: "/api/v1/photo", proposedPhotoUrl: null, requiresReplacementReason: true }] });
  const result = await fetchManagerPhotoStates("club", ["t", "t"]);
  expect(api).toHaveBeenCalledTimes(1);
  expect(api).toHaveBeenCalledWith("/platform/club-photo-roster/club?registrations=t");
  expect(result.get("t")).toMatchObject({ status: "pending", approvalId: "a", requiresReplacementReason: true,
    currentPhotoUrl: expect.stringMatching(/^https?:\/\/.+\/api\/v1\/photo$/) });
});

it("sends the staff ID, replacement reason and photo bytes through the official upload", async () => {
  api.mockResolvedValueOnce({ intent: { uploadId: "upload", objectKey: "object" } }).mockResolvedValueOnce({});
  await uploadOfficialSubjectPhoto({ subjectKind: "staff_member", subjectId: "person", registrationId: "t",
    clubId: "club", federationId: "fed", seasonId: "season", dataUrl: "data:image/jpeg;base64,AQID",
    mimeType: "image/jpeg", replacementReason: "Motivazione di sostituzione verificata" });
  expect(JSON.parse(api.mock.calls[0][1]?.body as string)).toMatchObject({
    staffMemberId: "person", replacementReason: "Motivazione di sostituzione verificata", fileSizeBytes: 3,
  });
  expect(api.mock.calls[1][0]).toBe("/photos/uploads/upload/complete");
  expect(JSON.parse(api.mock.calls[1][1]?.body as string)).toMatchObject({ contentBase64: "AQID" });
});
