import { test, expect, Page } from "@playwright/test";

async function mockLoggedInSession(page: Page) {
  await page.route("**/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        email: "user@example.com",
        username: "DummyUser",
        expires_at: 9999999999,
      }),
    });
  });
}

test.describe("Navbar Auth Menü", () => {
  test("zeigt LoginButton im ausgeloggten Zustand", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /anmelden/i })).toBeVisible();
  });

  test("versteckt LoginButton und zeigt User-Menü im eingeloggten Zustand", async ({ page }) => {
    await mockLoggedInSession(page);

    await page.goto("/");

    await expect(page.getByRole("button", { name: /dummyuser/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /anmelden/i })).toHaveCount(0);
  });

  test("öffnet und schließt das User-Menü", async ({ page }) => {
    await mockLoggedInSession(page);
    await page.goto("/");

    const trigger = page.getByRole("button", { name: /dummyuser/i });

    await trigger.click();
    await expect(page.getByRole("menuitem", { name: /abmelden/i })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitem", { name: /abmelden/i })).toBeHidden();

    await trigger.click();
    await expect(page.getByRole("menuitem", { name: /abmelden/i })).toBeVisible();

    await page.getByText(/quizzard of oz/i).first().click();
    await expect(page.getByRole("menuitem", { name: /abmelden/i })).toBeHidden();
  });

  test("meldet über Menüpunkt Abmelden ab", async ({ page }) => {
    await mockLoggedInSession(page);

    let logoutCalls = 0;
    await page.route("**/auth/logout", async (route) => {
      logoutCalls += 1;
      await route.fulfill({ status: 204, body: "" });
    });

    // After logout, ensure refresh endpoint returns 401 to prevent re-login
    let hasLoggedOut = false;
    await page.route("**/auth/refresh", async (route) => {
      if (hasLoggedOut) {
        await route.fulfill({ status: 401, body: "" });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            email: "user@example.com",
            username: "DummyUser",
            expires_at: 9999999999,
          }),
        });
      }
    });

    await page.goto("/");

    await page.getByRole("button", { name: /dummyuser/i }).click();
    await page.getByRole("menuitem", { name: /abmelden/i }).click();

    await expect.poll(() => logoutCalls).toBe(1);

    // Mark as logged out and wait for state update
    hasLoggedOut = true;
    await page.waitForTimeout(500);

    // Wait for user button to disappear
    await expect(page.getByRole("button", { name: /dummyuser/i })).toHaveCount(0, { timeout: 3000 });
    await expect(page.getByRole("menuitem", { name: /abmelden/i })).toHaveCount(0);
  });
});
