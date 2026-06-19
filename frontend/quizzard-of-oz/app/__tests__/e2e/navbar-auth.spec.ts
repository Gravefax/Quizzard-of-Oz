import { test, expect } from "@playwright/test";
import {
  loginViaKeycloak,
  generateTestUser,
  createKeycloakUser,
  deleteKeycloakUser,
} from "./auth-helpers";

test.describe("Navbar Auth Menü", () => {
  test("zeigt LoginButton im ausgeloggten Zustand", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /anmelden/i })).toBeVisible();
  });

  test("versteckt LoginButton und zeigt User-Menü im eingeloggten Zustand", async ({ page }) => {
    const user = generateTestUser();
    const userId = await createKeycloakUser(user);
    try {
      await loginViaKeycloak(page, user);

      await expect(
        page.getByRole("button", { name: new RegExp(user.username, "i") }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /anmelden/i })).toHaveCount(0);
    } finally {
      await deleteKeycloakUser(userId);
    }
  });

  test("öffnet und schließt das User-Menü", async ({ page }) => {
    const user = generateTestUser();
    const userId = await createKeycloakUser(user);
    try {
      await loginViaKeycloak(page, user);

      const trigger = page.getByRole("button", {
        name: new RegExp(user.username, "i"),
      });

      await trigger.click();
      await expect(page.getByRole("menuitem", { name: /abmelden/i })).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("menuitem", { name: /abmelden/i })).toBeHidden();

      await trigger.click();
      await expect(page.getByRole("menuitem", { name: /abmelden/i })).toBeVisible();

      await page.getByText(/quizzard of oz/i).first().click();
      await expect(page.getByRole("menuitem", { name: /abmelden/i })).toBeHidden();
    } finally {
      await deleteKeycloakUser(userId);
    }
  });

  test("meldet über Menüpunkt Abmelden ab", async ({ page }) => {
    const user = generateTestUser();
    const userId = await createKeycloakUser(user);
    try {
      await loginViaKeycloak(page, user);

      await page
        .getByRole("button", { name: new RegExp(user.username, "i") })
        .click();
      await page.getByRole("menuitem", { name: /abmelden/i }).click();

      // logout() calls keycloak.logout() which redirects through Keycloak back to the app
      await page.waitForURL(/localhost:3000/, { timeout: 15_000 });

      await expect(
        page.getByRole("button", { name: /anmelden/i }),
      ).toBeVisible({ timeout: 5_000 });
      await expect(
        page.getByRole("button", { name: new RegExp(user.username, "i") }),
      ).toHaveCount(0);
    } finally {
      await deleteKeycloakUser(userId);
    }
  });
});
