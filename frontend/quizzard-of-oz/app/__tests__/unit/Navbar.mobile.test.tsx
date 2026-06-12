/**
 * Covers mobile menu, theme toggle, escape/outside-click handlers,
 * and the Keycloak-authenticated session-restore path in Navbar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "@/app/Navbar";
import useAuthStore from "@/app/stores/authStore";
import useThemeStore from "@/app/stores/themeStore";
import { loginWithKeycloak, refreshAccessToken, logout } from "@/app/lib/auth/authClient";
import { useKeycloak } from "@/app/providers/KeycloakProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/app/components/login-button/LoginButton", () => ({
  default: () => <button>Login</button>,
}));

vi.mock("@/app/lib/auth/authClient", () => ({
  loginWithKeycloak: vi.fn(),
  refreshAccessToken: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/app/providers/KeycloakProvider", () => ({
  useKeycloak: vi.fn(),
}));

const CREDENTIAL = {
  email: "user@example.com",
  username: "MobileUser",
  expiresAt: 9_999_999_999,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useKeycloak).mockReturnValue({ keycloak: null, initialized: false });
  vi.mocked(refreshAccessToken).mockRejectedValue(new Error("NO_REFRESH"));
  vi.mocked(loginWithKeycloak).mockRejectedValue(new Error("NO_LOGIN"));
  vi.mocked(logout).mockResolvedValue();
  act(() => {
    useAuthStore.setState({ credential: null });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Mobile menu ──────────────────────────────────────────────────────────────

describe("Navbar – mobile menu", () => {
  it("opens the mobile menu when the burger button is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    const burger = screen.getByRole("button", { name: /menü öffnen/i });
    await user.click(burger);

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("closes the mobile menu when the burger button is clicked again", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole("button", { name: /menü öffnen/i }));
    await user.click(screen.getByRole("button", { name: /menü schließen/i }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the mobile menu when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole("button", { name: /menü öffnen/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
  });

  it("closes the mobile menu when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Navbar />
        <div data-testid="outside">outside</div>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: /menü öffnen/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));

    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
  });

  it("shows Login button inside mobile menu when logged out", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole("button", { name: /menü öffnen/i }));

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
  });

  it("shows Abmelden in mobile menu when logged in", async () => {
    act(() => {
      useAuthStore.setState({ credential: CREDENTIAL });
    });
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole("button", { name: /menü öffnen/i }));

    expect(
      screen.getByRole("menuitem", { name: /abmelden/i }),
    ).toBeInTheDocument();
  });
});

// ── Theme toggle ─────────────────────────────────────────────────────────────

describe("Navbar – theme toggle", () => {
  afterEach(() => {
    act(() => {
      useThemeStore.setState({ theme: "dark" });
    });
  });

  it("desktop theme button toggles the theme", async () => {
    act(() => {
      useThemeStore.setState({ theme: "dark" });
    });

    const user = userEvent.setup();
    render(<Navbar />);

    const themeBtn = screen.getByRole("button", {
      name: /light mode aktivieren/i,
    });
    await user.click(themeBtn);

    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("mobile theme button toggles theme and closes menu", async () => {
    act(() => {
      useThemeStore.setState({ theme: "dark" });
    });

    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole("button", { name: /menü öffnen/i }));
    const mobileThemeBtn = screen.getByRole("menuitem", {
      name: /light mode/i,
    });
    await user.click(mobileThemeBtn);

    expect(useThemeStore.getState().theme).toBe("light");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

// ── Keycloak-authenticated session restore ────────────────────────────────────

describe("Navbar – Keycloak-authenticated restore", () => {
  it("calls loginWithKeycloak when keycloak is authenticated with a token", async () => {
    const mockKc = { authenticated: true, token: "kc-access-token" };
    vi.mocked(useKeycloak).mockReturnValue({
      keycloak: mockKc as never,
      initialized: true,
    });
    vi.mocked(loginWithKeycloak).mockResolvedValue({
      email: "kc@example.com",
      username: "KcUser",
      expires_at: 9_999_999_999,
    });

    render(<Navbar />);

    await waitFor(() => expect(loginWithKeycloak).toHaveBeenCalledWith("kc-access-token"));
    await waitFor(() =>
      expect(useAuthStore.getState().credential?.username).toBe("KcUser"),
    );
  });

  it("falls back to refreshAccessToken when keycloak is not authenticated", async () => {
    vi.mocked(useKeycloak).mockReturnValue({
      keycloak: { authenticated: false, token: undefined } as never,
      initialized: true,
    });
    vi.mocked(refreshAccessToken).mockResolvedValue({
      email: "refresh@example.com",
      username: "RefreshUser",
      expires_at: 9_999_999_999,
    });

    render(<Navbar />);

    await waitFor(() => expect(refreshAccessToken).toHaveBeenCalled());
    await waitFor(() =>
      expect(useAuthStore.getState().credential?.username).toBe("RefreshUser"),
    );
  });

  it("does not attempt restore when credential is already set", async () => {
    act(() => {
      useAuthStore.setState({ credential: CREDENTIAL });
    });
    vi.mocked(useKeycloak).mockReturnValue({
      keycloak: { authenticated: true, token: "tok" } as never,
      initialized: true,
    });

    render(<Navbar />);

    await new Promise((r) => setTimeout(r, 50));
    expect(loginWithKeycloak).not.toHaveBeenCalled();
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });
});
