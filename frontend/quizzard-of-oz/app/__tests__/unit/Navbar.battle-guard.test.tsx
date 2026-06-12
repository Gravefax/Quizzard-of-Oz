import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "@/app/Navbar";
import useAuthStore from "@/app/stores/authStore";
import { logout, refreshAccessToken } from "@/app/lib/auth/authClient";

const mockPush = vi.fn();
let mockPathnameValue = "/battle/test-match-001";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathnameValue,
}));

vi.mock("@/app/components/login-button/LoginButton", () => ({
  default: () => <button>Login</button>,
}));

vi.mock("@/app/lib/auth/authClient", () => ({
  refreshAccessToken: vi.fn(),
  logout: vi.fn(),
}));

const CREDENTIAL = {
  email: "user@example.com",
  username: "TestUser",
  expiresAt: 9_999_999_999,
};

let assignMock: ReturnType<typeof vi.fn>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupMocks() {
  vi.clearAllMocks();
  vi.mocked(refreshAccessToken).mockRejectedValue(new Error("NO_REFRESH"));
  vi.mocked(logout).mockResolvedValue();
  act(() => {
    useAuthStore.setState({ credential: null });
  });
  assignMock = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { assign: assignMock, href: "http://localhost/battle/test-match-001" },
  });
}

// ── Tests: isBattle = true ───────────────────────────────────────────────────

describe("Navbar – battle leave guard (isBattle = true)", () => {
  beforeEach(() => {
    mockPathnameValue = "/battle/test-match-001";
    setupMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the leave dialog when the logo is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByText(/quizzard of oz/i));

    expect(
      screen.getByRole("dialog", { name: /battle verlassen/i })
    ).toBeInTheDocument();
  });

  it("shows the leave dialog when the Leaderboard link is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole("link", { name: /leaderboard/i }));

    expect(
      screen.getByRole("dialog", { name: /battle verlassen/i })
    ).toBeInTheDocument();
  });

  it("dialog body contains the ELO-penalty warning", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByText(/quizzard of oz/i));

    expect(screen.getByText(/elo-punkte/i)).toBeInTheDocument();
  });

  it('"Weiterspielen" closes the dialog without navigating', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByText(/quizzard of oz/i));
    await waitFor(() =>
      screen.getByRole("dialog", { name: /battle verlassen/i })
    );
    await user.click(screen.getByRole("button", { name: /weiterspielen/i }));

    expect(
      screen.queryByRole("dialog", { name: /battle verlassen/i })
    ).not.toBeInTheDocument();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it('"Verlassen" after logo click calls window.location.assign("/")', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByText(/quizzard of oz/i));
    await waitFor(() =>
      screen.getByRole("dialog", { name: /battle verlassen/i })
    );
    await user.click(screen.getByRole("button", { name: /verlassen/i }));

    expect(assignMock).toHaveBeenCalledWith("/");
  });

  it('"Verlassen" after leaderboard click calls window.location.assign("/leaderboard")', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole("link", { name: /leaderboard/i }));
    await waitFor(() =>
      screen.getByRole("dialog", { name: /battle verlassen/i })
    );
    await user.click(screen.getByRole("button", { name: /verlassen/i }));

    expect(assignMock).toHaveBeenCalledWith("/leaderboard");
  });

  describe("with a logged-in user", () => {
    beforeEach(() => {
      act(() => {
        useAuthStore.setState({ credential: CREDENTIAL });
      });
    });

    it("shows the leave dialog instead of logging out immediately", async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      await user.click(screen.getByRole("button", { name: /testuser/i }));
      await user.click(screen.getByRole("menuitem", { name: /abmelden/i }));

      expect(
        screen.getByRole("dialog", { name: /battle verlassen/i })
      ).toBeInTheDocument();
      // logout must NOT have been called yet
      expect(vi.mocked(logout)).not.toHaveBeenCalled();
    });

    it('"Verlassen" after Abmelden proceeds with logout', async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      await user.click(screen.getByRole("button", { name: /testuser/i }));
      await user.click(screen.getByRole("menuitem", { name: /abmelden/i }));
      await waitFor(() =>
        screen.getByRole("dialog", { name: /battle verlassen/i })
      );
      await user.click(screen.getByRole("button", { name: /verlassen/i }));

      await waitFor(() => expect(vi.mocked(logout)).toHaveBeenCalledOnce());
    });

    it('"Weiterspielen" after Abmelden cancels the logout', async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      await user.click(screen.getByRole("button", { name: /testuser/i }));
      await user.click(screen.getByRole("menuitem", { name: /abmelden/i }));
      await waitFor(() =>
        screen.getByRole("dialog", { name: /battle verlassen/i })
      );
      await user.click(screen.getByRole("button", { name: /weiterspielen/i }));

      expect(
        screen.queryByRole("dialog", { name: /battle verlassen/i })
      ).not.toBeInTheDocument();
      expect(vi.mocked(logout)).not.toHaveBeenCalled();
    });
  });
});

// ── Tests: isBattle = false ──────────────────────────────────────────────────

describe("Navbar – battle leave guard (isBattle = false)", () => {
  beforeEach(() => {
    mockPathnameValue = "/";
    setupMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does NOT show leave dialog when logo is clicked on a non-battle page", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByText(/quizzard of oz/i));

    expect(
      screen.queryByRole("dialog", { name: /battle verlassen/i })
    ).not.toBeInTheDocument();
  });

  it("does NOT show leave dialog when Leaderboard is clicked on a non-battle page", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole("link", { name: /leaderboard/i }));

    expect(
      screen.queryByRole("dialog", { name: /battle verlassen/i })
    ).not.toBeInTheDocument();
  });

  it("logs out directly without any dialog on a non-battle page", async () => {
    act(() => {
      useAuthStore.setState({ credential: CREDENTIAL });
    });
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole("button", { name: /testuser/i }));
    await user.click(screen.getByRole("menuitem", { name: /abmelden/i }));

    await waitFor(() => expect(vi.mocked(logout)).toHaveBeenCalledOnce());
    expect(
      screen.queryByRole("dialog", { name: /battle verlassen/i })
    ).not.toBeInTheDocument();
  });
});
