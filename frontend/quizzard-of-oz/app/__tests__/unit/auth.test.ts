import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

function mockFetchResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("auth api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("NEXT_PUBLIC_API_BASE", "http://backend.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends login request and returns payload", async () => {
    const { loginWithKeycloak } = await import("@/app/lib/auth/authClient");
    const payload = { email: "user@example.com", username: "DummyUser", expires_at: 123 };
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, payload));

    const result = await loginWithKeycloak("token-123");

    expect(fetch).toHaveBeenCalledWith("http://backend.test/auth/login", {
      method: "POST",
      headers: { Authorization: "Bearer token-123" },
      credentials: "include",
    });
    expect(result).toEqual(payload);
  });

  it("throws MISSING_TOKEN on login 400", async () => {
    const { loginWithKeycloak } = await import("@/app/lib/auth/authClient");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(400));

    await expect(loginWithKeycloak("token-123")).rejects.toThrow("MISSING_TOKEN");
  });

  it("throws UNAUTHORIZED on login 401", async () => {
    const { loginWithKeycloak } = await import("@/app/lib/auth/authClient");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(401));

    await expect(loginWithKeycloak("token-123")).rejects.toThrow("UNAUTHORIZED");
  });

  it("throws LOGIN_FAILED on other non-ok login response", async () => {
    const { loginWithKeycloak } = await import("@/app/lib/auth/authClient");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(500));

    await expect(loginWithKeycloak("token-123")).rejects.toThrow("LOGIN_FAILED_500");
  });

  it("sends refresh request and returns payload", async () => {
    const { refreshAccessToken } = await import("@/app/lib/auth/authClient");
    const payload = { email: "user@example.com", username: "DummyUser", expires_at: 123 };
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, payload));

    const result = await refreshAccessToken();

    expect(fetch).toHaveBeenCalledWith("http://backend.test/auth/refresh", {
      method: "GET",
      credentials: "include",
    });
    expect(result).toEqual(payload);
  });

  it("throws UNAUTHORIZED on refresh 401", async () => {
    const { refreshAccessToken } = await import("@/app/lib/auth/authClient");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(401));

    await expect(refreshAccessToken()).rejects.toThrow("UNAUTHORIZED");
  });

  it("throws TOKEN_EXPIRED on refresh 403", async () => {
    const { refreshAccessToken } = await import("@/app/lib/auth/authClient");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(403));

    await expect(refreshAccessToken()).rejects.toThrow("TOKEN_EXPIRED");
  });

  it("throws REFRESH_FAILED on other non-ok refresh response", async () => {
    const { refreshAccessToken } = await import("@/app/lib/auth/authClient");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(500));

    await expect(refreshAccessToken()).rejects.toThrow("REFRESH_FAILED_500");
  });

  it("sends logout request", async () => {
    const { logout } = await import("@/app/lib/auth/authClient");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(204));

    await logout();

    expect(fetch).toHaveBeenCalledWith("http://backend.test/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  });
});
