import { test, expect, type Page } from "@playwright/test";
import { startTwoPlayerBattle, deleteKeycloakUser } from "./auth-helpers";

// ── Shared helpers ─────────────────────────────────────────────────────────────

/**
 * Waits for whichever page is the designated category picker and clicks a
 * category. Promise.any resolves on the first visible page and absorbs the
 * other page's eventual timeout rejection.
 */
async function pickCategory(page1: Page, page2: Page): Promise<void> {
  const picker = await Promise.any([
    page1
      .locator('[class*="category-btn"]')
      .first()
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => page1),
    page2
      .locator('[class*="category-btn"]')
      .first()
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => page2),
  ]);
  await picker.locator('[class*="category-btn"]').first().click();
}

/**
 * Plays rounds until "BATTLE BEENDET" is visible or maxRounds is reached.
 *
 * Each iteration:
 *  1. Waits for pick_category phase by racing both pages for category buttons
 *     (Promise.any absorbs the losing page's eventual timeout rejection).
 *  2. Clicks a category on the picker page.
 *  3. Has both players answer with different options (guarantees one wins).
 *  4. Waits for answer buttons to disappear as the round-complete signal.
 */
async function playUntilGameOver(
  page1: Page,
  page2: Page,
  maxRounds = 20,
): Promise<void> {
  for (let i = 0; i < maxRounds; i++) {
    if (await page1.getByText(/battle beendet/i).isVisible()) return;
    if (await page2.getByText(/battle beendet/i).isVisible()) return;

    // Wait for the actual pick_category phase on whichever page is the picker.
    // Promise.any resolves with the first page whose buttons become visible and
    // silently absorbs the other page's timeout rejection.
    let picker: Page;
    try {
      picker = await Promise.any([
        page1
          .locator('[class*="category-btn"]')
          .first()
          .waitFor({ state: "visible", timeout: 30_000 })
          .then(() => page1),
        page2
          .locator('[class*="category-btn"]')
          .first()
          .waitFor({ state: "visible", timeout: 30_000 })
          .then(() => page2),
      ]);
    } catch {
      return; // AggregateError: neither page showed category buttons → game over
    }

    await picker.locator('[class*="category-btn"]').first().click();

    // Wait for answer buttons on both pages before clicking
    await page1
      .locator('[class*="answer-btn"]')
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
    await page2
      .locator('[class*="answer-btn"]')
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });

    // Different answers guarantee one player wins each round
    await page1.locator('[class*="answer-btn"]').nth(0).click();
    await page2.locator('[class*="answer-btn"]').nth(1).click();

    // Answer buttons disappearing signals round complete (reveal → next phase)
    await page1
      .locator('[class*="answer-btn"]')
      .first()
      .waitFor({ state: "hidden", timeout: 30_000 });
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe("Battle Arena – URL and navigation", () => {
  test("battle page loads at the correct URL", async ({ page }) => {
    const matchId = "test-match-001";
    await page.goto(`/battle/${matchId}`, { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain(`/battle/${matchId}`);
  });

  test("battle page renders the Navbar", async ({ page }) => {
    await page.goto("/battle/test-match-001", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/quizzard of oz/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("leave guard dialog appears when navigating away from battle page", async ({
    page,
  }) => {
    await page.goto("/battle/test-match-001", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(/quizzard of oz/i).first()).toBeVisible({
      timeout: 5_000,
    });

    await page.getByText(/quizzard of oz/i).first().click();
    await expect(
      page.getByRole("dialog", { name: /battle verlassen/i }),
    ).toBeVisible();
  });

  test("battle page accepts various UUID-style match IDs", async ({ page }) => {
    const ids = ["match-123", "ranked-abc-001", "a1b2c3d4-e5f6-7890-abcd-ef1234567890"];

    for (const id of ids) {
      await page.goto(`/battle/${id}`, { waitUntil: "domcontentloaded" });
      expect(page.url()).toContain(`/battle/${id}`);
    }
  });
});

test.describe("Battle Arena – live match (requires two authenticated players)", () => {
  // Serial: each test creates a real matched game; parallel execution would
  // cause queue self-matches or leftover matches interfering with each other.
  test.describe.configure({ mode: "serial" });
  test.beforeEach(() => test.setTimeout(120_000));

  test("battle arena displays player names after connection", async ({
    browser,
  }) => {
    const { context1, context2, page1, page2, user1, user2, userId1, userId2 } =
      await startTwoPlayerBattle(browser);
    try {
      void page2;
      // Aufgeben button appearing means pick_category phase — WS fully established
      await page1
        .getByRole("button", { name: /aufgeben/i })
        .waitFor({ state: "visible", timeout: 60_000 });

      await expect(page1.getByText(new RegExp(user1.username, "i")).first()).toBeVisible();
      await expect(page1.getByText(new RegExp(user2.username, "i")).first()).toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
      await Promise.all([
        deleteKeycloakUser(userId1),
        deleteKeycloakUser(userId2),
      ]);
    }
  });

  test("category selection buttons appear in pick_category phase", async ({
    browser,
  }) => {
    const { context1, context2, page1, page2, userId1, userId2 } =
      await startTwoPlayerBattle(browser);
    try {
      await page1
        .getByRole("button", { name: /aufgeben/i })
        .waitFor({ state: "visible", timeout: 60_000 });

      // Exactly one page shows category buttons (the designated picker)
      const count1 = await page1.locator('[class*="category-btn"]').count();
      const count2 = await page2.locator('[class*="category-btn"]').count();
      expect(count1 + count2).toBeGreaterThan(0);
    } finally {
      await context1.close();
      await context2.close();
      await Promise.all([
        deleteKeycloakUser(userId1),
        deleteKeycloakUser(userId2),
      ]);
    }
  });

  test("question displays with answer options in question phase", async ({
    browser,
  }) => {
    const { context1, context2, page1, page2, userId1, userId2 } =
      await startTwoPlayerBattle(browser);
    try {
      await page1
        .getByRole("button", { name: /aufgeben/i })
        .waitFor({ state: "visible", timeout: 60_000 });

      await pickCategory(page1, page2);

      // Both players should see 4 answer buttons
      await expect(page1.locator('[class*="answer-btn"]')).toHaveCount(4, {
        timeout: 15_000,
      });
      await expect(page2.locator('[class*="answer-btn"]')).toHaveCount(4, {
        timeout: 15_000,
      });
    } finally {
      await context1.close();
      await context2.close();
      await Promise.all([
        deleteKeycloakUser(userId1),
        deleteKeycloakUser(userId2),
      ]);
    }
  });

  test("answer feedback shows correct/wrong status", async ({ browser }) => {
    const { context1, context2, page1, page2, userId1, userId2 } =
      await startTwoPlayerBattle(browser);
    try {
      await page1
        .getByRole("button", { name: /aufgeben/i })
        .waitFor({ state: "visible", timeout: 60_000 });

      await pickCategory(page1, page2);

      await page1
        .locator('[class*="answer-btn"]')
        .first()
        .waitFor({ state: "visible", timeout: 15_000 });
      await page2
        .locator('[class*="answer-btn"]')
        .first()
        .waitFor({ state: "visible", timeout: 15_000 });
      // Both players must answer before the backend triggers the reveal phase
      await page1.locator('[class*="answer-btn"]').nth(0).click();
      await page2.locator('[class*="answer-btn"]').nth(1).click();

      // Reveal phase shows ✓ Richtig! or ✗ Falsch. on each player's screen
      await expect(
        page1.getByText(/✓ Richtig!|✗ Falsch\./),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await context1.close();
      await context2.close();
      await Promise.all([
        deleteKeycloakUser(userId1),
        deleteKeycloakUser(userId2),
      ]);
    }
  });

  test("game over screen appears after ROUNDS_TO_WIN", async ({ browser }) => {
    const { context1, context2, page1, page2, userId1, userId2 } =
      await startTwoPlayerBattle(browser);
    try {
      await page1
        .getByRole("button", { name: /aufgeben/i })
        .waitFor({ state: "visible", timeout: 60_000 });

      await playUntilGameOver(page1, page2);

      await expect(page1.getByText(/battle beendet/i)).toBeVisible({
        timeout: 5_000,
      });
      await expect(page1.getByText(/victory|defeat/i)).toBeVisible({
        timeout: 5_000,
      });
      await expect(
        page1.getByRole("button", { name: /zurück zur lobby/i }),
      ).toBeVisible({ timeout: 5_000 });
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
