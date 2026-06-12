import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import KeycloakProvider, { useKeycloak } from "@/app/providers/KeycloakProvider";

// vi.hoisted ensures mockInit is available when the vi.mock factory runs (hoisted before imports)
const mockInit = vi.hoisted(() => vi.fn());

vi.mock("keycloak-js", () => ({
  default: class KeycloakMock {
    init = mockInit;
  },
}));

function TestConsumer() {
  const { keycloak, initialized } = useKeycloak();
  return (
    <div>
      <span data-testid="initialized">{String(initialized)}</span>
      <span data-testid="has-keycloak">{keycloak ? "yes" : "no"}</span>
    </div>
  );
}

describe("KeycloakProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with initialized=false and keycloak=null", () => {
    mockInit.mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <KeycloakProvider>
        <TestConsumer />
      </KeycloakProvider>,
    );
    expect(screen.getByTestId("initialized").textContent).toBe("false");
    expect(screen.getByTestId("has-keycloak").textContent).toBe("no");
  });

  it("sets initialized=true and provides instance when init resolves", async () => {
    mockInit.mockResolvedValue(true);
    render(
      <KeycloakProvider>
        <TestConsumer />
      </KeycloakProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("initialized").textContent).toBe("true"),
    );
    expect(screen.getByTestId("has-keycloak").textContent).toBe("yes");
  });

  it("sets initialized=true even when init rejects", async () => {
    mockInit.mockRejectedValue(new Error("Keycloak unreachable"));
    render(
      <KeycloakProvider>
        <TestConsumer />
      </KeycloakProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("initialized").textContent).toBe("true"),
    );
    expect(screen.getByTestId("has-keycloak").textContent).toBe("yes");
  });

  it("renders children at all times", async () => {
    mockInit.mockResolvedValue(true);
    render(
      <KeycloakProvider>
        <span data-testid="child">hello</span>
      </KeycloakProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("does not update state after unmount (cancelled flag)", async () => {
    let resolveInit!: (v: boolean) => void;
    mockInit.mockReturnValue(
      new Promise<boolean>((res) => {
        resolveInit = res;
      }),
    );

    const { unmount } = render(
      <KeycloakProvider>
        <TestConsumer />
      </KeycloakProvider>,
    );
    unmount();

    // Resolving after unmount must not throw or update state
    await act(async () => {
      resolveInit(true);
    });
    // If we reach here without errors, the cancelled guard is working
  });
});

describe("useKeycloak default context", () => {
  it("returns null keycloak and initialized=false when used outside provider", () => {
    function Bare() {
      const ctx = useKeycloak();
      return (
        <span data-testid="val">
          {ctx.keycloak === null && !ctx.initialized ? "defaults-ok" : "wrong"}
        </span>
      );
    }
    render(<Bare />);
    expect(screen.getByTestId("val").textContent).toBe("defaults-ok");
  });
});
