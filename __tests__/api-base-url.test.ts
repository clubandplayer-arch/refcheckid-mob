import { getApiBaseUrl } from "@/lib/api-base-url";

describe("getApiBaseUrl", () => {
  const originalExpo = process.env.EXPO_PUBLIC_API_BASE_URL;
  const originalNext = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = originalExpo;
    process.env.NEXT_PUBLIC_API_BASE_URL = originalNext;
  });

  it("uses the Expo public API base URL when configured", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.example.test/api/v1";
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://next.example.test/api/v1";

    expect(getApiBaseUrl()).toBe("https://api.example.test/api/v1");
  });

  it("falls back to the Web-compatible Next variable", () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://next.example.test/api/v1";

    expect(getApiBaseUrl()).toBe("https://next.example.test/api/v1");
  });

  it("uses the local backend default when no environment variable is set", () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    expect(getApiBaseUrl()).toBe("http://localhost:4000/api/v1");
  });
});
