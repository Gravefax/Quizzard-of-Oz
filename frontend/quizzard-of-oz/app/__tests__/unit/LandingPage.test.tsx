import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LandingPage from "@/app/components/LandingPage";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/lib/api/ranking", () => ({
  fetchLeaderboard: vi.fn().mockResolvedValue({
    page: 1,
    page_size: 50,
    total_players: 0,
    entries: [],
  }),
}));

describe("LandingPage", () => {
  it("renders heading", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: /quizzard of oz/i })).toBeInTheDocument();
  });

  it("renders Ranked Battle and Uebung buttons", () => {
    render(<LandingPage />);
    expect(screen.getByRole("button", { name: /ranked battle/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /(uebung|übung)/i })).toBeInTheDocument();
  });

  it("navigates to ranked and training pages", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);

    await user.click(screen.getByRole("button", { name: /ranked battle/i }));
    await user.click(screen.getByRole("button", { name: /(uebung|übung)/i }));

    expect(mockPush).toHaveBeenCalledWith("/ranked-modus");
    expect(mockPush).toHaveBeenCalledWith("/trainings-modus");
  });
});
