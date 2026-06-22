import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows the Quizard of Oz heading", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /quizzard of oz/i })
    ).toBeVisible();
  });

  test("page title is set correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/quizard of oz/i);
  });

  test("navbar shows the brand name", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /quizzard of oz/i })).toBeVisible();
  });

  test("navbar shows the login button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /anmelden/i })).toBeVisible();
  });

  test("shows the subtitle", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/beweise dein wissen\. besiege deine rivalen\./i)
    ).toBeVisible();
  });

  test("shows the main game mode buttons", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /ranked battle/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /übung/i })).toBeVisible();
  });

  test("Ranked button is prominent above the other two", async ({ page }) => {
    await page.goto("/");
    const ranked = page.getByRole("button", { name: /ranked battle/i });
    const training = page.getByRole("button", { name: /übung/i });
    const rankedBox = await ranked.boundingBox();
    const trainingBox = await training.boundingBox();
    expect(rankedBox!.y).toBeLessThan(trainingBox!.y);
  });
});
