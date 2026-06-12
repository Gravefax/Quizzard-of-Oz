import { test, expect, Page } from "@playwright/test";

const MATCH_ID = "test-match-001";
const BATTLE_URL = `/battle/${MATCH_ID}`;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function gotoAndWait(page: Page) {
  // Backend may not be running in CI — the Navbar always renders regardless.
  await page.goto(BATTLE_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
  // Wait for the Navbar brand link to confirm the page rendered.
  await expect(page.getByText(/quizzard of oz/i).first()).toBeVisible({
    timeout: 5000,
  });
}

async function mockLoggedIn(page: Page) {
  await page.route("**/auth/google/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        email: "user@example.com",
        username: "TestUser",
        expires_at: 9_999_999_999,
      }),
    });
  });
}

/**
 * Replaces window.WebSocket with a controllable mock BEFORE the page loads.
 * The last created instance is stored on window.__lastMockWS so tests can
 * inject messages via page.evaluate().
 */
async function injectMockWebSocket(page: Page) {
  await page.addInitScript(() => {
    class MockWS {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onclose: ((e: CloseEvent) => void) | null = null;
      readyState = 1; // OPEN

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      send(_data: string) {}
      close() {
        this.onclose?.(new CloseEvent("close", { code: 1000 }));
      }

      constructor(public url: string) {
        // Expose so tests can call onmessage via page.evaluate()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__lastMockWS = this;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).WebSocket = MockWS;
  });
}

/**
 * Simulates the server sending a pick_category message to BattleArena,
 * which sets canSurrender = true and registers the browser-guard event listeners.
 */
async function emitPickCategory(page: Page) {
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = (window as any).__lastMockWS as {
      onmessage: ((e: MessageEvent) => void) | null;
    } | undefined;
    ws?.onmessage?.(
      new MessageEvent("message", {
        data: JSON.stringify({
          type: "pick_category",
          categories: ["Wissenschaft", "Geschichte", "Sport"],
          round: 1,
          your_wins: 0,
          opponent_wins: 0,
        }),
      })
    );
  });
}

// ── Navbar leave guard ───────────────────────────────────────────────────────

test.describe("Battle Leave Guard – Navbar dialog", () => {
  test("shows leave dialog when logo is clicked during a battle", async ({
    page,
  }) => {
    await gotoAndWait(page);
    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i })
    ).toBeVisible();
  });

  test("leave dialog body contains ELO-penalty warning", async ({ page }) => {
    await gotoAndWait(page);
    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i })
    ).toBeVisible();
    await expect(page.getByText(/elo-punkte/i)).toBeVisible();
  });

  test("leave dialog shows Verlassen and Weiterspielen buttons", async ({
    page,
  }) => {
    await gotoAndWait(page);
    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /verlassen/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /weiterspielen/i })
    ).toBeVisible();
  });

  test('"Weiterspielen" closes the dialog and keeps the user on the battle page', async ({
    page,
  }) => {
    await gotoAndWait(page);
    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /weiterspielen/i }).click();

    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i })
    ).toHaveCount(0);
    expect(page.url()).toContain("/battle/");
  });

  test('"Verlassen" navigates away from the battle page', async ({ page }) => {
    await gotoAndWait(page);
    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /verlassen/i }).click();

    // window.location.assign('/') triggers a full navigation to the root
    await page.waitForURL("/", { timeout: 5000 });
    expect(page.url()).not.toContain("/battle/");
  });

  test("shows leave dialog when Leaderboard link is clicked during a battle", async ({
    page,
  }) => {
    await gotoAndWait(page);
    await page.getByRole("link", { name: /leaderboard/i }).click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i })
    ).toBeVisible();
  });

  test("Leaderboard confirm navigates to /leaderboard", async ({ page }) => {
    await gotoAndWait(page);
    await page.getByRole("link", { name: /leaderboard/i }).click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /verlassen/i }).click();

    await page.waitForURL("**/leaderboard", { timeout: 5000 });
    expect(page.url()).toContain("/leaderboard");
  });

  test("shows leave dialog when Abmelden is clicked during a battle (logged in)", async ({
    page,
  }) => {
    await mockLoggedIn(page);
    await gotoAndWait(page);

    // Open user dropdown and click Abmelden
    await page.getByRole("button", { name: /testuser/i }).click();
    await page.getByRole("menuitem", { name: /abmelden/i }).click();

    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i })
    ).toBeVisible();
  });

  test("no leave dialog when logo is clicked outside of battle routes", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i })
    ).toHaveCount(0);
  });
});

// ── beforeunload / popstate guards ──────────────────────────────────────────
//
// These guards activate only when canSurrender = true (phase pick_category or
// later). Instead of requiring a full 2-player match, the tests inject a mock
// WebSocket (see injectMockWebSocket above) and manually emit pick_category
// via page.evaluate() — no backend needed.

test.describe("Battle Leave Guard – beforeunload / popstate", () => {
  test("beforeunload event is cancelled during an active match phase", async ({
    page,
  }) => {
    await injectMockWebSocket(page);
    await mockLoggedIn(page);
    await page.goto(BATTLE_URL, { waitUntil: "domcontentloaded" });

    // Advance to pick_category → canSurrender = true
    await emitPickCategory(page);

    // The "Aufgeben" button confirms canSurrender is active
    await expect(
      page.getByRole("button", { name: /aufgeben/i })
    ).toBeVisible({ timeout: 3000 });

    // Dispatch beforeunload and verify the handler calls e.preventDefault()
    const wasCancelled = await page.evaluate(() => {
      const event = new Event("beforeunload", {
        cancelable: true,
      }) as BeforeUnloadEvent;
      Object.defineProperty(event, "returnValue", { writable: true, value: "" });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });

    expect(wasCancelled).toBe(true);
  });

  test("popstate triggers the surrender confirm dialog during an active match phase", async ({
    page,
  }) => {
    await injectMockWebSocket(page);
    await mockLoggedIn(page);
    await page.goto(BATTLE_URL, { waitUntil: "domcontentloaded" });

    await emitPickCategory(page);

    await expect(
      page.getByRole("button", { name: /aufgeben/i })
    ).toBeVisible({ timeout: 3000 });

    // Simulate the browser back button
    await page.evaluate(() =>
      window.dispatchEvent(new PopStateEvent("popstate"))
    );

    await expect(
      page.getByRole("dialog", { name: /aufgeben bestätigen/i })
    ).toBeVisible();
  });

  test('"Abbrechen" in surrender dialog closes it and keeps the user on the battle page', async ({
    page,
  }) => {
    await injectMockWebSocket(page);
    await mockLoggedIn(page);
    await page.goto(BATTLE_URL, { waitUntil: "domcontentloaded" });

    await emitPickCategory(page);
    await expect(
      page.getByRole("button", { name: /aufgeben/i })
    ).toBeVisible({ timeout: 3000 });

    await page.evaluate(() =>
      window.dispatchEvent(new PopStateEvent("popstate"))
    );
    await expect(
      page.getByRole("dialog", { name: /aufgeben bestätigen/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /abbrechen/i }).click();

    await expect(
      page.getByRole("dialog", { name: /aufgeben bestätigen/i })
    ).toHaveCount(0);
    expect(page.url()).toContain("/battle/");
  });
});
