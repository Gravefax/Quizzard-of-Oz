import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginButton from "@/app/components/login-button/LoginButton";
import { loginWithGoogle } from "@/app/lib/auth/authClient";

const mockSetCredential = vi.fn();

vi.mock("@react-oauth/google", () => ({
  GoogleLogin: ({
    onSuccess,
    onError,
  }: {
    onSuccess: (response: { credential?: string }) => void;
    onError: () => void;
  }) => (
    <div>
      <button onClick={() => onSuccess({ credential: "token-123" })}>Google Success</button>
      <button onClick={() => onSuccess({})}>Google Missing Token</button>
      <button onClick={onError}>Google Error</button>
    </div>
  ),
}));

vi.mock("@/app/lib/auth/authClient", () => ({
  loginWithGoogle: vi.fn(),
}));

vi.mock("@/app/stores/authStore", () => ({
  default: vi.fn(() => ({
    setCredential: mockSetCredential,
  })),
}));

describe("LoginButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loginWithGoogle).mockResolvedValue({
      email: "user@example.com",
      username: "DummyUser",
      expires_at: 123,
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the google login button", async () => {
    render(<LoginButton />);

    expect(await screen.findByRole("button", { name: /google success/i })).toBeInTheDocument();
  });

  it("maps login response and stores credential after successful login", async () => {
    const user = userEvent.setup();
    render(<LoginButton />);

    await user.click(await screen.findByRole("button", { name: /google success/i }));

    await waitFor(() => {
      expect(loginWithGoogle).toHaveBeenCalledWith("token-123");
      expect(mockSetCredential).toHaveBeenCalledWith({
        email: "user@example.com",
        username: "DummyUser",
        expiresAt: 123,
      });
    });
  });

  it("falls back to email when username is missing", async () => {
    vi.mocked(loginWithGoogle).mockResolvedValue({
      email: "fallback@example.com",
      expires_at: 999,
    });

    const user = userEvent.setup();
    render(<LoginButton />);

    await user.click(await screen.findByRole("button", { name: /google success/i }));

    await waitFor(() => {
      expect(mockSetCredential).toHaveBeenCalledWith({
        email: "fallback@example.com",
        username: "fallback@example.com",
        expiresAt: 999,
      });
    });
  });

  it("logs an error and stops when no token is provided", async () => {
    const user = userEvent.setup();
    render(<LoginButton />);

    await user.click(await screen.findByRole("button", { name: /google missing token/i }));

    expect(loginWithGoogle).not.toHaveBeenCalled();
    expect(mockSetCredential).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("No token provided");
  });

  it("handles unauthorized login errors", async () => {
    vi.mocked(loginWithGoogle).mockRejectedValue(new Error("UNAUTHORIZED:INVALID_TOKEN"));

    const user = userEvent.setup();
    render(<LoginButton />);

    await user.click(await screen.findByRole("button", { name: /google success/i }));

    await waitFor(() => {
      expect(mockSetCredential).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith("Token ungueltig oder abgelaufen: INVALID_TOKEN");
    });
  });

  it("logs generic login errors and google onError callback", async () => {
    vi.mocked(loginWithGoogle).mockRejectedValue(new Error("NETWORK"));

    const user = userEvent.setup();
    render(<LoginButton />);

    await user.click(await screen.findByRole("button", { name: /google success/i }));
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith("Login fehlgeschlagen", expect.any(Error));
    });

    await user.click(await screen.findByRole("button", { name: /google error/i }));
    expect(console.error).toHaveBeenCalledWith("Google Login fehlgeschlagen");
  });
});

