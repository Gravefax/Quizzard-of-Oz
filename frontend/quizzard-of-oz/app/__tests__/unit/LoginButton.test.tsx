import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginButton from "@/app/components/login-button/LoginButton";

const mockLogin = vi.fn();

vi.mock("@/app/providers/KeycloakProvider", () => ({
  useKeycloak: vi.fn(() => ({
    keycloak: { login: mockLogin },
    initialized: true,
  })),
}));

describe("LoginButton", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useKeycloak } = await import("@/app/providers/KeycloakProvider");
    vi.mocked(useKeycloak).mockReturnValue({
      keycloak: { login: mockLogin } as never,
      initialized: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Anmelden button when initialized", () => {
    render(<LoginButton />);

    expect(screen.getByRole("button", { name: /anmelden/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registrieren/i })).not.toBeInTheDocument();
  });

  it("renders nothing when not initialized", async () => {
    const { useKeycloak } = await import("@/app/providers/KeycloakProvider");
    vi.mocked(useKeycloak).mockReturnValue({ keycloak: null, initialized: false } as never);

    const { container } = render(<LoginButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls keycloak.login() when Anmelden is clicked", async () => {
    const user = userEvent.setup();
    render(<LoginButton />);

    await user.click(screen.getByRole("button", { name: /anmelden/i }));

    expect(mockLogin).toHaveBeenCalledOnce();
  });
});
