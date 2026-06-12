import { describe, it, expect, vi, afterEach } from "vitest";
import { generateTestUser, createKeycloakUser, deleteKeycloakUser } from "../e2e/auth-helpers";

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
