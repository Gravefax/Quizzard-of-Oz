import { expect, test } from "@playwright/test";

const PAGE_ONE = {
  page: 1,
  page_size: 50,
  total_players: 55,
  entries: [
    {
      rank: 1,
      user_id: "u1",
      username: "Alpha",
      elo_rating: 1500,
      wins: 20,
      losses: 2,
      total_matches: 22,
      last_win_at: null,
    },
    {
      rank: 2,
      user_id: "u2",
      username: "Bravo",
      elo_rating: 1450,
      wins: 18,
      losses: 4,
      total_matches: 22,
      last_win_at: null,
    },
  ],
};

const PAGE_TWO = {
  page: 2,
  page_size: 50,
  total_players: 55,
  entries: [
    {
      rank: 51,
      user_id: "u51",
      username: "Zulu",
      elo_rating: 900,
      wins: 5,
      losses: 10,
      total_matches: 15,
      last_win_at: null,
    },
  ],
};

test.describe("Leaderboard page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/ranking/leaderboard?page=1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PAGE_ONE),
      });
    });

    await page.route("**/ranking/leaderboard?page=2", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PAGE_TWO),
      });
    });

    await page.route("**/ranking/leaderboard/search?**", async (route) => {
      const url = new URL(route.request().url());
      const query = (url.searchParams.get("username") ?? "").toLowerCase();
      const filtered = PAGE_ONE.entries.filter((entry) =>
        entry.username.toLowerCase().includes(query),
      );

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          page: 1,
          page_size: 50,
          total_players: filtered.length,
          entries: filtered,
        }),
      });
    });
  });

  test("opens via landing page and shows separate wins/losses columns", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /leaderboard/i }).click();

    await expect(page).toHaveURL(/\/leaderboard$/);
    await expect(page.getByRole("columnheader", { name: /wins/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /losses/i })).toBeVisible();
    const alphaRow = page.locator("tr", { hasText: "Alpha" });
    await expect(alphaRow.getByRole("cell", { name: "20", exact: true })).toBeVisible();
    await expect(alphaRow.getByRole("cell", { name: "2", exact: true })).toBeVisible();
  });

  test("uses server-side search and pagination", async ({ page }) => {
    await page.goto("/leaderboard");

    await expect(page.getByText("Alpha")).toBeVisible();
    await expect(page.getByText("Bravo")).toBeVisible();

    await page.getByLabel(/suche nach benutzername/i).fill("alp");
    await expect(page.getByText("Alpha")).toBeVisible();
    await expect(page.getByText("Bravo")).toHaveCount(0);

    await page.getByLabel(/suche nach benutzername/i).fill("");
    await expect(page.getByText("Bravo")).toBeVisible();

    await page.getByRole("button", { name: /naechste seite/i }).click();
    await expect(page.getByText("Zulu")).toBeVisible();
    await expect(page.getByText(/#51/i)).toBeVisible();
  });
});


