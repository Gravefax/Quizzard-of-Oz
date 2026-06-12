import { describe, it, expect, vi, afterEach } from "vitest";
import type { Page, Browser } from "@playwright/test";
import {
  generateTestUser,
  createKeycloakUser,
  deleteKeycloakUser,
  loginViaKeycloak,
  startTwoPlayerBattle,
} from "../e2e/auth-helpers";

function makeAdminTokenFetch() {
  return {
    json: vi.fn().mockResolvedValue({ access_token: "admin-tok" }),
  } as unknown as Response;
}

describe("generateTestUser", () => {
  it("returns a username prefixed with e2e_", () => {
    const user = generateTestUser();
    expect(user.username).toMatch(/^e2e_/);
  });

  it("returns the default password", () => {
    const { password } = generateTestUser();
    expect(password).toBe("TestUser1234!");
  });

  it("generates unique usernames on each call", () => {
    const a = generateTestUser();
    const b = generateTestUser();
    expect(a.username).not.toBe(b.username);
  });
});

describe("createKeycloakUser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the user ID extracted from the Location header", async () => {
    const userId = "abc123-uuid";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(makeAdminTokenFetch())
        .mockResolvedValueOnce({
          status: 201,
          headers: {
            get: (k: string) =>
              k === "location"
                ? `http://localhost:8080/admin/realms/quizzard/users/${userId}`
                : null,
          },
          text: vi.fn().mockResolvedValue(""),
        } as unknown as Response),
    );

    const id = await createKeycloakUser({ username: "newuser", password: "Pass1234!" });
    expect(id).toBe(userId);
  });

  it("throws when the server returns a non-201 status", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(makeAdminTokenFetch())
        .mockResolvedValueOnce({
          status: 409,
          headers: { get: () => null },
          text: vi.fn().mockResolvedValue("Conflict"),
        } as unknown as Response),
    );

    await expect(
      createKeycloakUser({ username: "dup", password: "Pass1234!" }),
    ).rejects.toThrow(/failed to create keycloak user/i);
  });

  it("returns empty string when Location header is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(makeAdminTokenFetch())
        .mockResolvedValueOnce({
          status: 201,
          headers: { get: () => null },
          text: vi.fn().mockResolvedValue(""),
        } as unknown as Response),
    );

    const id = await createKeycloakUser({ username: "newuser", password: "Pass1234!" });
    expect(id).toBe("");
  });
});

describe("loginViaKeycloak", () => {
  afterEach(() => vi.unstubAllGlobals());

  function makePage() {
    const locator = {
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
      waitFor: vi.fn().mockResolvedValue(undefined),
    };
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      getByRole: vi.fn().mockReturnValue(locator),
      waitForURL: vi.fn().mockResolvedValue(undefined),
      locator: vi.fn().mockReturnValue(locator),
    };
    return { page, locator };
  }

  it("navigates to / and fills username, password, and submits", async () => {
    const { page, locator } = makePage();

    await loginViaKeycloak(page as unknown as Page, { username: "alice", password: "pw123" });

    expect(page.goto).toHaveBeenCalledWith("/");
    expect(page.locator).toHaveBeenCalledWith("#username");
    expect(page.locator).toHaveBeenCalledWith("#password");
    expect(page.locator).toHaveBeenCalledWith("#kc-login");
    expect(locator.fill).toHaveBeenCalledWith("alice");
    expect(locator.fill).toHaveBeenCalledWith("pw123");
  });

  it("uses TEST_USER credentials when called without a user argument", async () => {
    const { page, locator } = makePage();

    await loginViaKeycloak(page as unknown as Page);

    expect(locator.fill).toHaveBeenCalledWith("e2etestuser");
    expect(locator.fill).toHaveBeenCalledWith("TestUser1234!");
  });
});

describe("startTwoPlayerBattle", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates two users in Keycloak, logs them in, and returns contexts and IDs", async () => {
    let userCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/token")) {
          return { json: async () => ({ access_token: "admin-tok" }) } as unknown as Response;
        }
        const id = `uid-${++userCount}`;
        return {
          status: 201,
          headers: { get: (k: string) => (k === "location" ? `http://kc/users/${id}` : null) },
          text: async () => "",
        } as unknown as Response;
      }),
    );

    const locator = {
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
      waitFor: vi.fn().mockResolvedValue(undefined),
    };
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      getByRole: vi.fn().mockReturnValue(locator),
      waitForURL: vi.fn().mockResolvedValue(undefined),
      locator: vi.fn().mockReturnValue(locator),
    };
    const context = { newPage: vi.fn().mockResolvedValue(page) };
    const browser = { newContext: vi.fn().mockResolvedValue(context) };

    const result = await startTwoPlayerBattle(browser as unknown as Browser);

    expect(result.page1).toBe(page);
    expect(result.page2).toBe(page);
    expect(result.userId1).toMatch(/^uid-/);
    expect(result.userId2).toMatch(/^uid-/);
    expect(result.userId1).not.toBe(result.userId2);
    expect(result.user1.username).toMatch(/^e2e_/);
    expect(result.user2.username).toMatch(/^e2e_/);
  });
});

describe("deleteKeycloakUser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls DELETE on the user-specific URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeAdminTokenFetch())
      .mockResolvedValueOnce({} as Response);
    vi.stubGlobal("fetch", fetchMock);

    await deleteKeycloakUser("user-id-xyz");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, opts] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toContain("user-id-xyz");
    expect(opts.method).toBe("DELETE");
  });

  it("includes the admin Bearer token in the DELETE request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeAdminTokenFetch())
      .mockResolvedValueOnce({} as Response);
    vi.stubGlobal("fetch", fetchMock);

    await deleteKeycloakUser("some-id");

    const [, opts] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer admin-tok",
    );
  });
});
