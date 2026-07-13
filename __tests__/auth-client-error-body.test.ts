import { readFileSync } from "node:fs";

describe("auth client error diagnostics", () => {
  it("does not read error fields from a null response body", () => {
    const source = readFileSync("src/lib/auth-client.ts", "utf8");

    expect(source).toContain("isAuthErrorBody(responseBody) ? responseBody : {}");
    expect(source).toContain("[RefCheckID][auth] login response");
    expect(source).toContain("[RefCheckID][auth] login request");
  });
});
