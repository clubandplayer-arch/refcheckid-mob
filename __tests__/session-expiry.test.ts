import { request } from "@/lib/api-client";
import { readStoredSession, removeStoredSession, writeStoredSession, type AppSession } from "@/lib/session";

const originalFetch = fetch;
const session: AppSession = {
  accessToken: "access", refreshToken: "refresh", expiresAt: "2020-01-01",
  user: { id: "referee", email: "referee@example.test", role: "referee", displayName: "Test" },
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  removeStoredSession();
});

it("clears a rejected refresh without sending the old bearer", async () => {
  writeStoredSession(session);
  const mock = jest.fn(async () => new Response(JSON.stringify({ message: "Sessione scaduta" }), { status: 401 }));
  globalThis.fetch = mock;
  await expect(request("/matches")).rejects.toMatchObject({ status: 401 });
  expect(readStoredSession()).toBeNull();
  expect(mock).toHaveBeenNthCalledWith(2, expect.stringContaining("/matches"), expect.objectContaining({
    headers: { "content-type": "application/json" },
  }));
});

it("preserves the session for a transient refresh failure", async () => {
  writeStoredSession(session);
  const mock = jest.fn(async () => new Response(null, { status: 503 }));
  globalThis.fetch = mock;
  await expect(request("/matches")).rejects.toThrow("HTTP 503");
  expect(readStoredSession()).toEqual(session);
  expect(mock).toHaveBeenCalledTimes(1);
});
