import type { Browser, BrowserContext, Page } from "@playwright/test";

export const TEST_USER = {
  username: "e2etestuser",
  password: "TestUser1234!",
};

export const TEST_USER_2 = {
  username: "e2etestuser2",
  password: "TestUser1234!",
};

const KEYCLOAK_BASE = "http://localhost:8080";
const KEYCLOAK_REALM = "quizzard";
const DEFAULT_TEST_PASSWORD = "TestUser1234!";

/** Returns a unique test-user credential pair. */
export function generateTestUser(): { username: string; password: string } {
  const uid = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  return { username: `e2e_${uid}`, password: DEFAULT_TEST_PASSWORD };
}

async function getAdminToken(): Promise<string> {
  const res = await fetch(
    `${KEYCLOAK_BASE}/realms/master/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "admin-cli",
        username: "admin",
        password: "admin",
        grant_type: "password",
      }),
    },
  );
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Creates a Keycloak user via the Admin REST API.
 * Returns the Keycloak user ID (UUID) for later deletion.
 */
export async function createKeycloakUser(user: {
  username: string;
  password: string;
}): Promise<string> {
  const token = await getAdminToken();
  const res = await fetch(
    `${KEYCLOAK_BASE}/admin/realms/${KEYCLOAK_REALM}/users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: user.username,
        email: `${user.username}@test.local`,
        enabled: true,
        credentials: [
          { type: "password", value: user.password, temporary: false },
        ],
      }),
    },
  );
  if (res.status !== 201) {
    throw new Error(
      `Failed to create Keycloak user "${user.username}": ${res.status} ${await res.text()}`,
    );
  }
  const location = res.headers.get("location") ?? "";
  return location.split("/").at(-1) ?? "";
}

/** Deletes a Keycloak user by their UUID. */
export async function deleteKeycloakUser(userId: string): Promise<void> {
  const token = await getAdminToken();
  await fetch(
    `${KEYCLOAK_BASE}/admin/realms/${KEYCLOAK_REALM}/users/${userId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
}

/**
 * Creates two fresh Keycloak users, logs them in, and places them both into
 * the ranked queue so the backend matches them. Returns both contexts, pages,
 * credentials, and Keycloak user IDs; caller must close contexts and delete users.
 */
export async function startTwoPlayerBattle(browser: Browser): Promise<{
  context1: BrowserContext;
  context2: BrowserContext;
  page1: Page;
  page2: Page;
  user1: { username: string; password: string };
  user2: { username: string; password: string };
  userId1: string;
  userId2: string;
}> {
  const user1 = generateTestUser();
  const user2 = generateTestUser();
  const [userId1, userId2] = await Promise.all([
    createKeycloakUser(user1),
    createKeycloakUser(user2),
  ]);

  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  await loginViaKeycloak(page1, user1);
  await loginViaKeycloak(page2, user2);

  await page1.goto("/ranked-modus");
  await page2.goto("/ranked-modus");

  await page1.getByRole("button", { name: /queue beitreten/i }).click();
  await page2.getByRole("button", { name: /queue beitreten/i }).click();

  await Promise.all([
    page1.waitForURL(/\/battle\//, { timeout: 30_000 }),
    page2.waitForURL(/\/battle\//, { timeout: 30_000 }),
  ]);

  return { context1, context2, page1, page2, user1, user2, userId1, userId2 };
}

/**
 * Logs in via the real Keycloak UI.
 * Navigates to "/", clicks Anmelden, fills the Keycloak login form,
 * then waits until the user menu button is visible in the Navbar.
 */
export async function loginViaKeycloak(
  page: Page,
  user: { username: string; password: string } = TEST_USER,
): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: /anmelden/i }).click();

  await page.waitForURL(/\/realms\/quizzard\/protocol\/openid-connect\/auth/, {
    timeout: 15_000,
  });

  await page.locator("#username").fill(user.username);
  await page.locator("#password").fill(user.password);
  await page.locator("#kc-login").click();

  // keycloak-js handles the code exchange and calls POST /auth/login;
  // the Navbar then shows the user menu button.
  await page.waitForURL(/localhost:3000/, { timeout: 15_000 });
  await page
    .getByRole("button", { name: new RegExp(user.username, "i") })
    .waitFor({ state: "visible", timeout: 10_000 });
}
