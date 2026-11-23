import { authenticateWithPassword } from "@/lib/auth-client";

const originalFetch = fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

it("handles a login rejection with an empty response body", async () => {
  globalThis.fetch = jest.fn(async () => ({ ok: false, status: 403, text: async () => "" } as Response));
  await expect(authenticateWithPassword({ email: "x@example.test", password: "test" })).rejects.toMatchObject({
    diagnostics: { responseBody: null, status: 403 },
  });
});

it("uses the authenticated profile returned by /auth/me", async () => {
  const user = { id: "id", email: "x@example.test", role: "manager", displayName: "Test" };
  const mock = jest.fn(async (url) => String(url).endsWith("/auth/login")
    ? { ok: true, text: async () => JSON.stringify({ user, accessToken: "access", refreshToken: "refresh", expiresAt: "2030-01-01" }) }
    : { ok: true, json: async () => ({ ...user, clubIds: ["actual-club"] }) }) as jest.Mock;
  globalThis.fetch = mock;
  await expect(authenticateWithPassword({ email: user.email, password: "test" }))
    .resolves.toMatchObject({ user: { role: "manager", clubIds: ["actual-club"] } });
  expect(mock).toHaveBeenLastCalledWith(expect.stringContaining("/auth/me"), { headers: { authorization: "Bearer access" } });
});
