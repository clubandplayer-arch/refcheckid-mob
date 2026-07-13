import { readFileSync } from "node:fs";

describe("Login password visibility UX", () => {
  it("uses a secureTextEntry toggle without changing authentication calls", () => {
    const source = readFileSync("src/features/auth/login-form.tsx", "utf8");

    expect(source).toContain("isPasswordVisible");
    expect(source).toContain("secureTextEntry={!isPasswordVisible}");
    expect(source).toContain("Mostra password");
    expect(source).toContain("Nascondi password");
    expect(source).toContain("authenticateWithPassword({ email, password })");
    expect(source).toContain("[RefCheckID][Auth][LoginRequest]");
    expect(source).toContain("[RefCheckID][Auth][LoginError]");
    expect(source).toContain("payload: safePayload");
    expect(source).toContain("diagnostics?.status");
    expect(source).toContain("diagnostics?.responseBody");
    expect(source).toContain("submitError.stack");
  });
});
