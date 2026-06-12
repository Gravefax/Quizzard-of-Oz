import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BattleWsPage from "@/app/battle/ws/[match_id]/page";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/components/Icons", () => ({
  IconAlertTriangle: ({ size }: { size?: number }) => (
    <svg data-testid="icon-alert-triangle" aria-hidden="true" />
  ),
}));

describe("BattleWsPage – Match in Progress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("zeigt den Match-Titel an", () => {
    render(<BattleWsPage />);
    expect(screen.getByText("Match wird gerade gespielt")).toBeInTheDocument();
  });

  it("zeigt den erklärenden Infotext an", () => {
    render(<BattleWsPage />);
    expect(
      screen.getByText(/Battles können nur über das Hauptmenü betreten werden/)
    ).toBeInTheDocument();
  });

  it("zeigt den Hinweis auf laufendes oder abgelaufenes Battle an", () => {
    render(<BattleWsPage />);
    expect(
      screen.getByText(/Dieses Battle läuft bereits oder existiert nicht mehr/)
    ).toBeInTheDocument();
  });

  it("zeigt das Warn-Icon an", () => {
    render(<BattleWsPage />);
    expect(screen.getByTestId("icon-alert-triangle")).toBeInTheDocument();
  });

  it("zeigt den Zurück-Button an", () => {
    render(<BattleWsPage />);
    expect(
      screen.getByRole("button", { name: /Zum Hauptmenü/i })
    ).toBeInTheDocument();
  });

  it("navigiert zur Hauptseite beim Klick auf den Button", async () => {
    const user = userEvent.setup();
    render(<BattleWsPage />);
    await user.click(screen.getByRole("button", { name: /Zum Hauptmenü/i }));
    expect(mockPush).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
