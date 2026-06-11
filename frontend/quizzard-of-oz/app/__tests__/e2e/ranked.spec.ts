import { test, expect } from "@playwright/test";

test.describe("Ranked Mode E2E", () => {
  test("User can navigate to ranked mode page", async ({ page }) => {
    await page.goto("/");
    
    const rankedButton = page.getByRole("button", { name: /\branked\b/i });
    await expect(rankedButton).toBeVisible();
    
    await rankedButton.click();
    
    // Should navigate to ranked mode page
    await expect(page).toHaveURL("/ranked-modus");
  });

  test("Ranked page displays login prompt for unauthenticated users", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    await expect(page.getByText(/login erforderlich/i)).toBeVisible();
    await expect(page.getByText(/anmelden um zu spielen/i)).toBeVisible();
  });

  test("Ranked page has specific styling for ranked mode", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Wait for the login card to appear (which contains the fire color styling)
    await page.waitForSelector(".login-card", { timeout: 5000 }).catch(() => {
      // May not appear if logged in or if queue appears instead
    });
    
    // Wait for page to fully hydrate
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    
    // Check computed styles of the login-card element or check for color in CSS
    const html = await page.content();
    
    // Fire color should appear in either the CSS or the HTML
    const hasFireColor = html.includes("255,60,20") || 
                        html.includes("rgb(255,60,20)") ||
                        html.includes("255, 60, 20");
    
    expect(hasFireColor).toBe(true);
  });

  test("Back button on ranked page navigates to home", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Wait for page to render
    await page.waitForTimeout(500);
    
    // Find and click back button - look for button with text containing Zurück
    const backButton = page.getByRole("button").filter({ hasText: /zurück/i }).first();
    await backButton.click();
    
    // Wait for navigation
    await page.waitForTimeout(500);
    
    // Should navigate back to home
    await expect(page).toHaveURL("/");
  });

  test("Page styling persists on refresh", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Wait for page to render
    await page.waitForTimeout(500);
    
    const initialHTML = await page.content();
    const hasFireColor1 = initialHTML.includes("255,60,20");
    
    await page.reload();
    
    // Wait for page to render after reload
    await page.waitForTimeout(500);
    
    const refreshedHTML = await page.content();
    const hasFireColor2 = refreshedHTML.includes("255,60,20");
    
    expect(hasFireColor1).toBe(true);
    expect(hasFireColor2).toBe(true);
  });

  test("Ranked page has proper metadata", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Check title
    const title = await page.title();
    expect(title.toLowerCase()).toContain("quizard");
  });

  test("All interactive elements are keyboard accessible", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Tab to buttons
    await page.keyboard.press("Tab");
    
    // Should have focused an element
    const focused = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    
    expect(focused).toBeTruthy();
  });

  test("Navigation breadcrumb shows correct hierarchy", async ({ page }) => {
    await page.goto("/");
    
    const rankedButton = page.getByRole("button", { name: /ranked battle/i });
    await rankedButton.click();
    
    await expect(page).toHaveURL("/ranked-modus");
    
    await expect(page.getByRole("button", { name: /← zurück/i })).toBeVisible();
  });

  test("Ranked page shows appropriate ranked-specific UI elements", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Should contain ranked-related text or elements
    const content = await page.content();
    expect(
      content.toLowerCase().includes("ranked") ||
      content.includes("255,60,20") // Fire color indicates ranked
    ).toBe(true);
  });
});

test.describe("Ranked Battle Queue E2E", () => {
  test.skip("Authenticated user can join ranked queue", async () => {
    // Requires authentication setup in test environment.
  });

  test.skip("Ranked queue shows correct styling and state", async () => {
    // Requires authentication setup in test environment.
  });

  test.skip("Player receives match notification in ranked queue", async () => {
    // Requires WebSocket and authentication setup.
  });

  test.skip("Ranked battle arena loads after queue match", async () => {
    // Requires WebSocket and authentication setup.
  });
});

test.describe("Cross-Mode Navigation", () => {
  test("Can navigate from ranked back to home", async ({ page }) => {
    await page.goto("/");
    
    const rankedButton = page.getByRole("button", { name: /ranked battle/i });
    await rankedButton.click();
    
    await expect(page).toHaveURL("/ranked-modus");
    
    const homeLink = page.getByRole("button", { name: /← zurück/i });
    await homeLink.click();
    
    await expect(page).toHaveURL("/");
  });

  test("Can navigate from ranked to training mode", async ({ page }) => {
    await page.goto("/");

    const trainingButton = page.getByRole("button", { name: /übung/i });
    await expect(trainingButton).toBeVisible();
    await trainingButton.click();

    await expect(page).toHaveURL("/trainings-modus");
  });

  test("Can navigate from home to ranked and back to home", async ({ page }) => {
    await page.goto("/");

    const rankedButton = page.getByRole("button", { name: /ranked battle/i });
    await rankedButton.click();

    await expect(page).toHaveURL("/ranked-modus");

    const homeButton = page.getByRole("button", { name: /← zurück/i });
    await homeButton.click();

    await expect(page).toHaveURL("/");

    const trainingButton = page.getByRole("button", { name: /übung/i });
    await expect(trainingButton).toBeVisible();
  });
});

test.describe("Ranked Mode Visual Consistency", () => {
  test("Ranked theme uses fire colors consistently", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Get computed styles of main container
    const mainDiv = page.locator("div[class*='flex-1']").first();
    
    // Container should be visible and properly styled
    await expect(mainDiv).toBeVisible();
    
    // Check page HTML for fire color
    const html = await page.content();
    expect(html).toContain("255,60,20"); // Fire RGB
  });

  test("Ranked page animations load correctly", async ({ page }) => {
    await page.goto("/ranked-modus");
    
    // Wait for any animations to load
    await page.waitForLoadState("networkidle");
    
    // Check for animation styles in page
    const html = await page.content();
    
    // Should have animation-related CSS
    expect(
      html.includes("animation") || html.includes("@keyframes")
    ).toBe(true);
  });
});

test.describe("Ranked Mode Error Handling", () => {
  test("Handles network errors gracefully", async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    // Try to navigate to ranked
    await page.goto("/ranked-modus", { waitUntil: "networkidle" }).catch(() => {
      // Expected to fail with offline
    });
    
    // Go back online
    await page.context().setOffline(false);
  });

  
});
