import { test, expect, type Page } from "@playwright/test";
import {
  loginViaKeycloak,
  generateTestUser,
  createKeycloakUser,
  deleteKeycloakUser,
  startTwoPlayerBattle,
} from "./auth-helpers";

const BATTLE_URL = "/battle/test-match-001";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function gotoAndWait(page: Page) {
  await page.goto(BATTLE_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
  await expect(page.getByText(/quizzard of oz/i).first()).toBeVisible({
    timeout: 5_000,
  });
}

// ── Navbar leave guard ────────────────────────────────────────────────────────

test.describe("Battle Leave Guard – Navbar dialog", () => {
  test("shows leave dialog when logo is clicked during a battle", async ({
    page,
  }) => {
    await gotoAndWait(page);
    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i }),
    ).toBeVisible();
  });

  test("leave dialog body contains ELO-penalty warning", async ({ page }) => {
    await gotoAndWait(page);
    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i }),
    ).toBeVisible();
    await expect(page.getByText(/elo-punkte/i)).toBeVisible();
  });

  test("leave dialog shows Verlassen and Weiterspielen buttons", async ({
    page,
  }) => {
    await gotoAndWait(page);
    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /verlassen/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /weiterspielen/i }),
    ).toBeVisible();
  });

  test('"Weiterspielen" closes the dialog and keeps the user on the battle page', async ({
    page,
  }) => {
    await gotoAndWait(page);
    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /weiterspielen/i }).click();

    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i }),
    ).toHaveCount(0);
    expect(page.url()).toContain("/battle/");
  });

  test('"Verlassen" navigates away from the battle page', async ({ page }) => {
    await gotoAndWait(page);
    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /verlassen/i }).click();

    await page.waitForURL("/", { timeout: 5_000 });
    expect(page.url()).not.toContain("/battle/");
  });

  test("shows leave dialog when Leaderboard link is clicked during a battle", async ({
    page,
  }) => {
    await gotoAndWait(page);
    await page.getByRole("link", { name: /leaderboard/i }).click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i }),
    ).toBeVisible();
  });

  test("Leaderboard confirm navigates to /leaderboard", async ({ page }) => {
    await gotoAndWait(page);
    await page.getByRole("link", { name: /leaderboard/i }).click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: /verlassen/i }).click();

    await page.waitForURL("**/leaderboard", { timeout: 5_000 });
    expect(page.url()).toContain("/leaderboard");
  });

  test("shows leave dialog when Abmelden is clicked during a battle (logged in)", async ({
    page,
  }) => {
    const user = generateTestUser();
    const userId = await createKeycloakUser(user);
    try {
      await loginViaKeycloak(page, user);
      await page.goto(BATTLE_URL, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/quizzard of oz/i).first()).toBeVisible({
        timeout: 5_000,
      });

      await page
        .getByRole("button", { name: new RegExp(user.username, "i") })
        .click();
      await page.getByRole("menuitem", { name: /abmelden/i }).click();

      await expect(
        page.getByRole("dialog", { name: /battle verlassen/i }),
      ).toBeVisible();
    } finally {
      await deleteKeycloakUser(userId);
    }
  });

  test("no leave dialog when logo is clicked outside of battle routes", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i }),
    ).toHaveCount(0);
  });
});

// ── beforeunload / popstate guards ────────────────────────────────────────────
//
// These guards activate only when canSurrender = true (phase pick_category or
// later). Two real authenticated users are placed in the queue so the backend
// creates a match and advances to the pick_category phase.

test.describe("Battle Leave Guard – beforeunload / popstate", () => {
  // These tests share two fixed test accounts in the ranked queue.
  // Serial mode prevents queue conflicts when workers > 1.
  // 120s: two sequential Keycloak logins (~40s) + queue match + pick_category WS.
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async () => {
    test.setTimeout(120_000);
  });
  test("beforeunload event is cancelled during an active match phase", async ({
    browser,
  }) => {
    const { context1, context2, page1, page2, userId1, userId2 } =
      await startTwoPlayerBattle(browser);
    try {
      // Keep page2 alive so the backend considers the match active
      void page2;

      // The "Aufgeben" button confirms canSurrender = true (pick_category phase)
      await page1
        .getByRole("button", { name: /aufgeben/i })
        .waitFor({ state: "visible", timeout: 60_000 });

      const wasCancelled = await page1.evaluate(() => {
        const event = new Event("beforeunload", {
          cancelable: true,
        }) as BeforeUnloadEvent;
        Object.defineProperty(event, "returnValue", {
          writable: true,
          value: "",
        });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      });

      expect(wasCancelled).toBe(true);
    } finally {
      await context1.close();
      await context2.close();
      await Promise.all([
        deleteKeycloakUser(userId1),
        deleteKeycloakUser(userId2),
      ]);
    }
  });

  test("popstate triggers the surrender confirm dialog during an active match phase", async ({
    browser,
  }) => {
    const { context1, context2, page1, page2, userId1, userId2 } =
      await startTwoPlayerBattle(browser);
    try {
      void page2;

      await page1
        .getByRole("button", { name: /aufgeben/i })
        .waitFor({ state: "visible", timeout: 60_000 });

      await page1.evaluate(() =>
        window.dispatchEvent(new PopStateEvent("popstate")),
      );

      await expect(
        page1.getByRole("dialog", { name: /aufgeben bestätigen/i }),
      ).toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
      await Promise.all([
        deleteKeycloakUser(userId1),
        deleteKeycloakUser(userId2),
      ]);
    }
  });

  test('"Abbrechen" in surrender dialog closes it and keeps the user on the battle page', async ({
    browser,
  }) => {
    const { context1, context2, page1, page2, userId1, userId2 } =
      await startTwoPlayerBattle(browser);
    try {
      void page2;

      await page1
        .getByRole("button", { name: /aufgeben/i })
        .waitFor({ state: "visible", timeout: 60_000 });

      await page1.evaluate(() =>
        window.dispatchEvent(new PopStateEvent("popstate")),
      );
      await expect(
        page1.getByRole("dialog", { name: /aufgeben bestätigen/i }),
      ).toBeVisible();

      await page1.getByRole("button", { name: /abbrechen/i }).click();

      await expect(
        page1.getByRole("dialog", { name: /aufgeben bestätigen/i }),
      ).toHaveCount(0);
      expect(page1.url()).toContain("/battle/");
    } finally {
      await context1.close();
      await context2.close();
      await Promise.all([
        deleteKeycloakUser(userId1),
        deleteKeycloakUser(userId2),
      ]);
    }
  });
});
