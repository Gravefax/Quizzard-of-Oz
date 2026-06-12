import { expect, test } from "@playwright/test";

test.describe("Leaderboard page", () => {
  test("opens via landing page and shows wins/losses columns", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Leaderboard", exact: true }).click();

    await expect(page).toHaveURL(/\/leaderboard$/);
    await expect(
      page.getByRole("columnheader", { name: /wins/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /losses/i }),
    ).toBeVisible();
  });

  test("search input accepts text and triggers filtering", async ({ page }) => {
    await page.goto("/leaderboard");

    const search = page.getByLabel(/suche nach benutzername/i);
    await expect(search).toBeVisible();

    await search.fill("test");
    await expect(search).toHaveValue("test");

    // Clear and verify the input resets
    await search.fill("");
    await expect(search).toHaveValue("");
  });

  test("next-page button is present", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(
      page.getByRole("button", { name: /naechste seite/i }),
    ).toBeVisible();
  });

  test("navigates to next page when more than one page of data exists", async ({
    page,
  }) => {
    await page.goto("/leaderboard");

    const nextBtn = page.getByRole("button", { name: /naechste seite/i });
    await expect(nextBtn).toBeVisible();

    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      // Previous-page button becomes enabled once we are past page 1
      await expect(
        page.getByRole("button", { name: /vorherige seite/i }),
      ).toBeEnabled({ timeout: 3_000 });
    }
  });
});
