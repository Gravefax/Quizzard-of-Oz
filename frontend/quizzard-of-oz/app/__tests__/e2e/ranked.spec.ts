import { test, expect } from "@playwright/test";
import {
  loginViaKeycloak,
  generateTestUser,
  createKeycloakUser,
  deleteKeycloakUser,
} from "./auth-helpers";

test.describe("Ranked Mode E2E", () => {
  test("user can navigate to ranked mode page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /ranked battle/i }).click();
    await expect(page).toHaveURL("/ranked-modus");
  });

  test("ranked page displays login prompt for unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/ranked-modus");
    await expect(page.getByText(/login erforderlich/i)).toBeVisible();
    await expect(page.getByText(/anmelden um zu spielen/i)).toBeVisible();
  });

  test("back button on ranked page navigates to home", async ({ page }) => {
    await page.goto("/ranked-modus");
    await page
      .getByRole("button")
      .filter({ hasText: /zurück/i })
      .first()
      .click();
    await expect(page).toHaveURL("/");
  });

  test("ranked page shows back button with ← arrow", async ({ page }) => {
    await page.goto("/ranked-modus");
    await expect(
      page.getByRole("button", { name: /← zurück/i }),
    ).toBeVisible();
  });
});

test.describe("Ranked Battle Queue E2E", () => {
  test("authenticated user sees Queue component with join button", async ({
    page,
  }) => {
    const user = generateTestUser();
    const userId = await createKeycloakUser(user);
    try {
      await loginViaKeycloak(page, user);
      await page.goto("/ranked-modus");
      await expect(
        page.getByRole("button", { name: /queue beitreten/i }),
      ).toBeVisible();
    } finally {
      await deleteKeycloakUser(userId);
    }
  });

  test("authenticated user can join and cancel the ranked queue", async ({
    page,
  }) => {
    const user = generateTestUser();
    const userId = await createKeycloakUser(user);
    try {
      await loginViaKeycloak(page, user);
      await page.goto("/ranked-modus");

      await page.getByRole("button", { name: /queue beitreten/i }).click();

      // Queue transitions to "searching" — a cancel/back button should appear
      await expect(
        page.getByRole("button", { name: /zurück/i }),
      ).toBeVisible({ timeout: 5_000 });

      // Cancel queue
      await page.getByRole("button", { name: /zurück/i }).click();
      await expect(page).toHaveURL("/");
    } finally {
      await deleteKeycloakUser(userId);
    }
  });

  test("queue shows ranked battle label after joining", async ({ page }) => {
    const user = generateTestUser();
    const userId = await createKeycloakUser(user);
    try {
      await loginViaKeycloak(page, user);
      await page.goto("/ranked-modus");

      await page.getByRole("button", { name: /queue beitreten/i }).click();

      // The Queue component displays "Ranked Battle" text while searching
      await expect(page.getByText(/ranked battle/i)).toBeVisible({
        timeout: 5_000,
      });

      // Clean up: navigate away
      await page.goto("/");
    } finally {
      await deleteKeycloakUser(userId);
    }
  });
});

test.describe("Cross-Mode Navigation", () => {
  test("can navigate from ranked back to home", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /ranked battle/i }).click();
    await expect(page).toHaveURL("/ranked-modus");
    await page.getByRole("button", { name: /← zurück/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("can navigate from home to training mode", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /übung/i }).click();
    await expect(page).toHaveURL("/trainings-modus");
  });

  test("can navigate home → ranked → home and return to home buttons", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /ranked battle/i }).click();
    await expect(page).toHaveURL("/ranked-modus");
    await page.getByRole("button", { name: /← zurück/i }).click();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("button", { name: /übung/i }),
    ).toBeVisible();
  });
});
