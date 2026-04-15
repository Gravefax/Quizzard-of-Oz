import type { LeaderboardResponse } from "@/app/models/Leaderboard";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

async function fetchLeaderboard(page = 1): Promise<LeaderboardResponse> {
  const res = await fetch(`${API_BASE_URL}/ranking/leaderboard?page=${page}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`LEADERBOARD_FETCH_FAILED_${res.status}`);
  }

  return (await res.json()) as LeaderboardResponse;
}

async function searchLeaderboardByUsername(
  username: string,
  page = 1,
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ username, page: String(page) });
  const res = await fetch(`${API_BASE_URL}/ranking/leaderboard/search?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`LEADERBOARD_SEARCH_FAILED_${res.status}`);
  }

  return (await res.json()) as LeaderboardResponse;
}

export { fetchLeaderboard, searchLeaderboardByUsername };
