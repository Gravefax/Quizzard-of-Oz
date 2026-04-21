import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function mockFetchResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("ranking api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("NEXT_PUBLIC_API_BASE", "http://backend.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("fetchLeaderboard returns payload", async () => {
    const { fetchLeaderboard } = await import("@/app/lib/api/ranking");
    const payload = { page: 1, page_size: 50, total_players: 1, entries: [] };
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, payload));

    const result = await fetchLeaderboard(1);

    expect(fetch).toHaveBeenCalledWith("http://backend.test/ranking/leaderboard?page=1", {
      method: "GET",
      credentials: "include",
    });
    expect(result).toEqual(payload);
  });

  it("fetchLeaderboard throws on non-ok response", async () => {
    const { fetchLeaderboard } = await import("@/app/lib/api/ranking");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(500));

    await expect(fetchLeaderboard(1)).rejects.toThrow("LEADERBOARD_FETCH_FAILED_500");
  });

  it("searchLeaderboardByUsername returns payload", async () => {
    const { searchLeaderboardByUsername } = await import("@/app/lib/api/ranking");
    const payload = { page: 1, page_size: 50, total_players: 1, entries: [] };
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, payload));

    const result = await searchLeaderboardByUsername("alpha", 2);

    expect(fetch).toHaveBeenCalledWith(
      "http://backend.test/ranking/leaderboard/search?username=alpha&page=2",
      {
        method: "GET",
        credentials: "include",
      },
    );
    expect(result).toEqual(payload);
  });

  it("searchLeaderboardByUsername throws on non-ok response", async () => {
    const { searchLeaderboardByUsername } = await import("@/app/lib/api/ranking");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse(404));

    await expect(searchLeaderboardByUsername("alpha", 1)).rejects.toThrow(
      "LEADERBOARD_SEARCH_FAILED_404",
    );
  });
});


