import { test, expect } from "@playwright/test";

const QUESTIONS = [
  {
    id: "q1",
    text: "Was ist die Hauptstadt von Frankreich?",
    answers: ["Paris", "London", "Berlin", "Madrid"],
    category: "Geografie",
    correctAnswer: "Paris",
  },
  {
    id: "q2",
    text: "Wie viele Beine haben Spinnen?",
    answers: ["6", "8", "10", "12"],
    category: "Natur",
    correctAnswer: "8",
  },
  {
    id: "q3",
    text: "In welchem Jahr fiel die Berliner Mauer?",
    answers: ["1987", "1988", "1989", "1990"],
    category: "Geschichte",
    correctAnswer: "1989",
  },
  {
    id: "q4",
    text: "Wer schrieb Faust?",
    answers: ["Goethe", "Schiller", "Kafka", "Brecht"],
    category: "Literatur",
    correctAnswer: "Goethe",
  },
  {
    id: "q5",
    text: "Was ist das chemische Symbol für Gold?",
    answers: ["Ag", "Au", "Fe", "Go"],
    category: "Wissenschaft",
    correctAnswer: "Au",
  },
  {
    id: "q6",
    text: "Wie viele Kontinente gibt es?",
    answers: ["5", "6", "7", "8"],
    category: "Geografie",
    correctAnswer: "6",
  },
  {
    id: "q7",
    text: "Welcher Planet ist der größte in unserem Sonnensystem?",
    answers: ["Mars", "Jupiter", "Saturn", "Neptun"],
    category: "Astronomie",
    correctAnswer: "Jupiter",
  },
  {
    id: "q8",
    text: "Welche Sprache wird in Brasilien gesprochen?",
    answers: ["Spanisch", "Französisch", "Portugiesisch", "Italienisch"],
    category: "Sprachen",
    correctAnswer: "Portugiesisch",
  },
  {
    id: "q9",
    text: "Wie viele Knochen hat ein erwachsener Mensch?",
    answers: ["186", "196", "206", "216"],
    category: "Biologie",
    correctAnswer: "206",
  },
  {
    id: "q10",
    text: "In welchem Jahr sank die Titanic?",
    answers: ["1910", "1912", "1914", "1916"],
    category: "Geschichte",
    correctAnswer: "1912",
  },
] as const;

const CORRECT_ANSWERS = QUESTIONS.map((question) => question.correctAnswer);

const TOTAL_QUESTIONS = CORRECT_ANSWERS.length;

test.describe("Practice Quiz", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/quiz/practice/questions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          QUESTIONS.map(({ correctAnswer, ...question }) => question),
        ),
      });
    });

    await page.route("**/quiz/practice/answer", async (route) => {
      const payload = route.request().postDataJSON() as {
        question_id: string;
        answer: string;
      };
      const question = QUESTIONS.find(({ id }) => id === payload.question_id);

      if (!question) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Question not found" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          correct: payload.answer === question.correctAnswer,
          correct_answer: question.correctAnswer,
        }),
      });
    });
  });

  test("navigates from landing page to Übungsmodus", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /übung/i }).click();
    await expect(page).toHaveURL(/trainings-modus/);
    await expect(
      page.getByRole("heading", { name: /übungsmodus/i })
    ).toBeVisible();
  });

  test("shows first question after starting quiz", async ({ page }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();
    await expect(
      page.getByText(new RegExp(`frage 1 / ${TOTAL_QUESTIONS}`, "i"))
    ).toBeVisible({ timeout: 5000 });
  });

  test("completes full quiz with all correct answers and shows perfect score", async ({
    page,
  }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();

    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      await expect(
        page.getByText(new RegExp(`frage ${i + 1} / ${TOTAL_QUESTIONS}`, "i"))
      ).toBeVisible({ timeout: 5000 });

      await page
        .getByRole("button", { name: CORRECT_ANSWERS[i], exact: true })
        .click();

      await expect(page.getByText(/✓ Richtig!/)).toBeVisible({ timeout: 5000 });

      const isLastQuestion = i === TOTAL_QUESTIONS - 1;
      const nextButton = page.getByRole("button", {
        name: isLastQuestion ? /ergebnis anzeigen/i : /nächste frage/i,
      });
      await expect(nextButton).toBeVisible({ timeout: 5000 });
      await nextButton.click();
    }

    await expect(
      page.getByText(`${TOTAL_QUESTIONS} / ${TOTAL_QUESTIONS}`)
    ).toBeVisible();
    await expect(page.getByText(/perfekt/i)).toBeVisible();
  });

  test("shows wrong feedback when answer is incorrect", async ({ page }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();
    await expect(
      page.getByText(new RegExp(`frage 1 / ${TOTAL_QUESTIONS}`, "i"))
    ).toBeVisible({ timeout: 5000 });

    // Click a wrong answer (London instead of Paris)
    await page.getByRole("button", { name: "London", exact: true }).click();

    await expect(
      page.getByText(/✗ Falsch – richtig wäre: Paris/)
    ).toBeVisible({ timeout: 5000 });
  });

  test("can restart quiz from result screen", async ({ page }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /quiz starten/i }).click();

    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      await expect(
        page.getByText(new RegExp(`frage ${i + 1} / ${TOTAL_QUESTIONS}`, "i"))
      ).toBeVisible({ timeout: 5000 });
      await page
        .getByRole("button", { name: CORRECT_ANSWERS[i], exact: true })
        .click();
      const isLastQuestion = i === TOTAL_QUESTIONS - 1;
      const nextButton = page.getByRole("button", {
        name: isLastQuestion ? /ergebnis anzeigen/i : /nächste frage/i,
      });
      await expect(nextButton).toBeVisible({ timeout: 5000 });
      await nextButton.click();
    }

    await page.getByRole("button", { name: /nochmal spielen/i }).click();

    await expect(
      page.getByText(new RegExp(`frage 1 / ${TOTAL_QUESTIONS}`, "i"))
    ).toBeVisible({ timeout: 5000 });
  });

  test("back button navigates to landing page", async ({ page }) => {
    await page.goto("/trainings-modus");
    await page.getByRole("button", { name: /zurück zur startseite/i }).click();
    await expect(page).toHaveURL("/");
  });
});
