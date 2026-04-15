import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "@/app/Navbar";
import useAuthStore from "@/app/stores/authStore";
import { logout, refreshAccessToken } from "@/app/lib/auth/authClient";

vi.mock("@/app/components/login-button/LoginButton", () => ({
  default: () => <button>Login</button>,
}));

vi.mock("@/app/lib/auth/authClient", () => ({
  refreshAccessToken: vi.fn(),
  logout: vi.fn(),
}));

describe("Navbar", () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({ credential: null });
    });
    vi.mocked(refreshAccessToken).mockRejectedValue(new Error("NO_REFRESH"));
    vi.mocked(logout).mockResolvedValue();
  });

  it("renders the brand name", () => {
    render(<Navbar />);
    expect(screen.getByText(/quizzard of oz/i)).toBeInTheDocument();
  });

  it("renders the login button when not logged in", () => {
    render(<Navbar />);
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("renders the leaderboard link", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: /leaderboard/i })).toBeInTheDocument();
  });

  it("shows username when logged in", () => {
    act(() => {
      useAuthStore.setState({
        credential: { email: "user@example.com", username: "DummyUser", expiresAt: 123 },
      });
    });

    render(<Navbar />);
    expect(screen.getByRole("button", { name: /dummyuser/i })).toBeInTheDocument();
  });

  it("opens the user menu with settings and logout actions", async () => {
    act(() => {
      useAuthStore.setState({
        credential: { email: "user@example.com", username: "DummyUser", expiresAt: 123 },
      });
    });

    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole("button", { name: /dummyuser/i }));

    expect(screen.getByRole("menuitem", { name: /einstellungen/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /abmelden/i })).toBeInTheDocument();
  });

  it("falls back to email when username is missing", () => {
    act(() => {
      useAuthStore.setState({
        credential: { email: "fallback@example.com", expiresAt: 123 },
      });
    });

    render(<Navbar />);
    expect(screen.getByRole("button", { name: /fallback@example.com/i })).toBeInTheDocument();
  });

  it("clears credentials after logout", async () => {
    act(() => {
      useAuthStore.setState({
        credential: { email: "user@example.com", username: "DummyUser", expiresAt: 123 },
      });
    });

    const user = userEvent.setup();
    render(<Navbar />);
    await user.click(screen.getByRole("button", { name: /dummyuser/i }));
    await user.click(screen.getByRole("menuitem", { name: /abmelden/i }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    });
  });
});
