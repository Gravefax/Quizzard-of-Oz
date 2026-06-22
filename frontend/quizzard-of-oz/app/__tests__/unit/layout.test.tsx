import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/Navbar", () => ({ default: () => <nav>Navbar</nav> }));
vi.mock("@/app/providers/ThemeProvider", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/app/providers/KeycloakProvider", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="keycloak-provider">{children}</div>
  ),
  useKeycloak: vi.fn().mockReturnValue({ keycloak: null, initialized: false }),
}));
vi.mock("@/app/components/ConfigErrorFallback", () => ({
  default: ({ message }: { message: string }) => (
    <div data-testid="config-error">{message}</div>
  ),
}));

describe("RootLayout", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders KeycloakProvider when all env vars are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_URL", "http://keycloak:8080");
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_REALM", "quizzard");
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_CLIENT_ID", "frontend");

    const { default: RootLayout } = await import("@/app/layout");
    render(
      <RootLayout>
        <span data-testid="child">content</span>
      </RootLayout>,
    );

    expect(screen.getByTestId("keycloak-provider")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("renders ConfigErrorFallback when Keycloak is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_URL", "");
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_REALM", "");
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_CLIENT_ID", "");

    const { default: RootLayout } = await import("@/app/layout");
    render(
      <RootLayout>
        <span>content</span>
      </RootLayout>,
    );

    expect(screen.getByTestId("config-error")).toBeInTheDocument();
    expect(screen.queryByTestId("keycloak-provider")).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("renders ConfigErrorFallback when URL is the placeholder value", async () => {
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_URL", "your_keycloak_url_here");
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_REALM", "quizzard");
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_CLIENT_ID", "frontend");

    const { default: RootLayout } = await import("@/app/layout");
    render(
      <RootLayout>
        <span>content</span>
      </RootLayout>,
    );

    expect(screen.getByTestId("config-error")).toBeInTheDocument();
    vi.unstubAllEnvs();
  });
});
