import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LeaderboardPage from "@/app/leaderboard/page";
import { fetchLeaderboard, searchLeaderboardByUsername } from "@/app/lib/api/ranking";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/lib/api/ranking", () => ({
  fetchLeaderboard: vi.fn(),
  searchLeaderboardByUsername: vi.fn(),
}));

describe("LeaderboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads leaderboard entries and uses server-side username search", async () => {
    vi.mocked(fetchLeaderboard).mockResolvedValue({
      page: 1,
      page_size: 50,
      total_players: 2,
      entries: [
        {
          rank: 1,
          user_id: "u1",
          username: "Alpha",
          elo_rating: 1300,
          wins: 10,
          losses: 2,
          total_matches: 12,
          last_win_at: null,
        },
        {
          rank: 2,
          user_id: "u2",
          username: "Bravo",
          elo_rating: 1200,
          wins: 8,
          losses: 3,
          total_matches: 11,
          last_win_at: null,
        },
      ],
    });

    vi.mocked(searchLeaderboardByUsername).mockResolvedValue({
      page: 1,
      page_size: 50,
      total_players: 1,
      entries: [
        {
          rank: 1,
          user_id: "u1",
          username: "Alpha",
          elo_rating: 1300,
          wins: 10,
          losses: 2,
          total_matches: 12,
          last_win_at: null,
        },
      ],
    });

    const user = userEvent.setup();
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/alpha/i)).toBeInTheDocument();
      expect(screen.getByText(/bravo/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/suche nach benutzername/i), "alp");

    await waitFor(() => {
      expect(screen.getByText(/alpha/i)).toBeInTheDocument();
      expect(screen.queryByText(/bravo/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/wins/i)).toBeInTheDocument();
    expect(screen.getByText(/losses/i)).toBeInTheDocument();
  });

  it("paginates to next page", async () => {
    vi.mocked(fetchLeaderboard)
      .mockResolvedValueOnce({
        page: 1,
        page_size: 50,
        total_players: 100,
        entries: [
          {
            rank: 1,
            user_id: "u1",
            username: "PageOne",
            elo_rating: 1400,
            wins: 12,
            losses: 1,
            total_matches: 13,
            last_win_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        page: 2,
        page_size: 50,
        total_players: 100,
        entries: [
          {
            rank: 51,
            user_id: "u51",
            username: "PageTwo",
            elo_rating: 1100,
            wins: 7,
            losses: 7,
            total_matches: 14,
            last_win_at: null,
          },
        ],
      });

    const user = userEvent.setup();
    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/pageone/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /naechste seite/i }));

    await waitFor(() => {
      expect(screen.getByText(/pagetwo/i)).toBeInTheDocument();
    });

    expect(fetchLeaderboard).toHaveBeenNthCalledWith(1, 1);
    expect(fetchLeaderboard).toHaveBeenNthCalledWith(2, 2);
  });

  it("shows error state when leaderboard request fails", async () => {
    vi.mocked(fetchLeaderboard).mockRejectedValue(new Error("boom"));

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/leaderboard konnte nicht geladen werden/i)).toBeInTheDocument();
    });
  });

  it("navigates back to landing page", async () => {
    vi.mocked(fetchLeaderboard).mockResolvedValue({
      page: 1,
      page_size: 50,
      total_players: 0,
      entries: [],
    });

    const user = userEvent.setup();
    render(<LeaderboardPage />);

    await user.click(screen.getByRole("button", { name: /zurueck/i }));

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("renders wins and losses in separate columns and handles pagination limits", async () => {
    vi.mocked(fetchLeaderboard).mockResolvedValue({
      page: 1,
      page_size: 50,
      total_players: 1,
      entries: [
        {
          rank: 1,
          user_id: "u1",
          username: "Solo",
          elo_rating: 999,
          wins: 5,
          losses: 1,
          total_matches: 6,
          last_win_at: null,
        },
      ],
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: /wins/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /losses/i })).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /vorherige seite/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /naechste seite/i })).toBeDisabled();
  });
});


