export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  elo_rating: number;
  wins: number;
  losses: number;
  total_matches: number;
  last_win_at: string | null;
}

export interface LeaderboardResponse {
  page: number;
  page_size: number;
  total_players: number;
  entries: LeaderboardEntry[];
}

