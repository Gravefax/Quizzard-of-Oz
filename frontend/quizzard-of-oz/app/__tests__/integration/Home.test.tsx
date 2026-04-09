import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/lib/api/ranking", () => ({
  fetchLeaderboard: vi.fn().mockResolvedValue({
    page: 1,
    page_size: 50,
    total_players: 0,
    entries: [],
  }),
}));

describe("Home page", () => {
  it("renders the Quizard of Oz heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /quizzard of oz/i })
    ).toBeInTheDocument();
  });

  it("renders landing page intro text", () => {
    render(<Home />);
    expect(
      screen.getByText(/compete · rank · dominate/i)
    ).toBeInTheDocument();
  });

  it("renders available game mode buttons", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: /ranked battle/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /übung/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /leaderboard/i })).toBeInTheDocument();
  });

  it("Ranked button shows login hint", () => {
    render(<Home />);
    expect(screen.getByText(/login erforderlich/i)).toBeInTheDocument();
  });

  it("Übung button shows training mode info", () => {
    render(<Home />);
    expect(screen.getByText(/trainingsmodus/i)).toBeInTheDocument();
  });
});
