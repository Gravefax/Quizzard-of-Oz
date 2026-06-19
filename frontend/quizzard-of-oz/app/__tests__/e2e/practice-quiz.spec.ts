import { test, expect, type Page } from "@playwright/test";

// Answer buttons are rendered with the practice-answer CSS module class.
// CSS Modules generate names like "practice_practice-answer-btn__<hash>",
// so a partial attribute match reliably selects them.
async function clickFirstAnswer(page: Page): Promise<void> {
  const btn = page.locator('[class*="practice-answer-btn"]').first();
  await btn.waitFor({ state: "visible", timeout: 5_000 });
  await btn.click();
}

// Reads "Frage 1 / N" and returns N.
async function readTotalQuestions(page: Page): Promise<number> {
  const text = await page
    .getByText(/frage 1 \/ \d+/i)
    .textContent({ timeout: 15_000 });
  return parseInt(text?.match(/\/\s*(\d+)/)?.[1] ?? "10", 10);
}

// Answers every question with the first available answer.
async function completeFullQuiz(page: Page): Promise<void> {
  const total = await readTotalQuestions(page);

  for (let i = 0; i < total; i++) {
    await expect(
      page.getByText(new RegExp(`frage ${i + 1} \\/ ${total}`, "i")),
    ).toBeVisible({ timeout: 5_000 });

    await clickFirstAnswer(page);

    // Wait for correct or wrong feedback before advancing
    await expect(page.getByText(/✓ Richtig!|✗ Falsch/)).toBeVisible({
      timeout: 5_000,
    });

    const isLastQuestion = i === total - 1;
    const nextBtn = page.getByRole("button", {
      name: isLastQuestion ? /ergebnis anzeigen/i : /nächste frage/i,
    });
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    await nextBtn.click();
  }
}

test.describe("Practice Quiz", () => {
  test("navigates from landing page to Übungsmodus", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /übung/i }).click();
    await expect(page).toHaveURL(/trainings-modus/);
    await expect(
      page.getByRole("heading", { name: /übungsmodus/i }),
    ).toBeVisible();
  });

  test("shows first question after starting quiz", async ({ page }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();
    // Real backend may need to fetch from Trivia API on first run
    await expect(page.getByText(/frage 1 \/ \d+/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows answer feedback after selecting an answer", async ({ page }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();
    await expect(page.getByText(/frage 1 \/ \d+/i)).toBeVisible({
      timeout: 15_000,
    });

    await clickFirstAnswer(page);

    await expect(page.getByText(/✓ Richtig!|✗ Falsch/)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("answer buttons are disabled after selecting an answer", async ({
    page,
  }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();
    await expect(page.getByText(/frage 1 \/ \d+/i)).toBeVisible({
      timeout: 15_000,
    });

    await clickFirstAnswer(page);

    // All answer buttons should now be disabled
    const answerBtns = page.locator('[class*="practice-answer-btn"]');
    const count = await answerBtns.count();
    for (let i = 0; i < count; i++) {
      await expect(answerBtns.nth(i)).toBeDisabled();
    }
  });

  test("completes full quiz and shows result screen with score", async ({
    page,
  }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();
    await expect(page.getByText(/frage 1 \/ \d+/i)).toBeVisible({
      timeout: 15_000,
    });

    const total = await readTotalQuestions(page);
    await completeFullQuiz(page);

    // Result screen shows "X / total"
    await expect(
      page.getByText(new RegExp(`\\d+ / ${total}`)),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("can restart quiz from result screen", async ({ page }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();
    await expect(page.getByText(/frage 1 \/ \d+/i)).toBeVisible({
      timeout: 15_000,
    });

    await completeFullQuiz(page);

    await page.getByRole("button", { name: /nochmal spielen/i }).click();

    await expect(page.getByText(/frage 1 \/ \d+/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("back button navigates to landing page", async ({ page }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /zurück zur startseite/i }).click();
    await expect(page).toHaveURL("/");
  });
});
