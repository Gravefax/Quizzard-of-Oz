import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PracticeQuiz from "@/app/trainings-modus/PracticeQuiz";
import { fetchPracticeQuestions, checkPracticeAnswer } from "@/app/lib/api/quiz";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/lib/api/quiz", () => ({
  fetchPracticeQuestions: vi.fn(),
  checkPracticeAnswer: vi.fn(),
}));

const MOCK_QUESTIONS = [
  {
    id: "q1",
    text: "Was ist die Hauptstadt von Frankreich?",
    answers: ["Paris", "London", "Berlin", "Madrid"],
    category: "Geografie",
  },
  {
    id: "q2",
    text: "Wie viele Seiten hat ein Hexagon?",
    answers: ["5", "6", "7", "8"],
    category: "Mathematik",
  },
];

describe("PracticeQuiz – Idle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the Übungsmodus heading", () => {
    render(<PracticeQuiz />);
    expect(screen.getByRole("heading", { name: /übungsmodus/i })).toBeInTheDocument();
  });

  it("renders the Quiz starten button", () => {
    render(<PracticeQuiz />);
    expect(screen.getByRole("button", { name: /quiz starten/i })).toBeInTheDocument();
  });

  it("renders the back button", () => {
    render(<PracticeQuiz />);
    expect(screen.getByRole("button", { name: /zurück zur startseite/i })).toBeInTheDocument();
  });

  it("clicking back navigates to /", async () => {
    const user = userEvent.setup();
    render(<PracticeQuiz />);
    await user.click(screen.getByRole("button", { name: /zurück zur startseite/i }));
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});

describe("PracticeQuiz – Loading", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading text while fetching questions", async () => {
    vi.mocked(fetchPracticeQuestions).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<PracticeQuiz />);
    await user.click(screen.getByRole("button", { name: /quiz starten/i }));
    expect(screen.getByText(/fragen werden geladen/i)).toBeInTheDocument();
  });
});

describe("PracticeQuiz – Error", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows error heading when fetch fails", async () => {
    vi.mocked(fetchPracticeQuestions).mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();
    render(<PracticeQuiz />);
    await user.click(screen.getByRole("button", { name: /quiz starten/i }));
    await waitFor(() =>
      expect(screen.getByText(/verbindungsfehler/i)).toBeInTheDocument()
    );
  });

  it("shows retry button on error", async () => {
    vi.mocked(fetchPracticeQuestions).mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();
    render(<PracticeQuiz />);
    await user.click(screen.getByRole("button", { name: /quiz starten/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /erneut versuchen/i })).toBeInTheDocument()
    );
  });

  it("retry button calls fetchPracticeQuestions again", async () => {
    vi.mocked(fetchPracticeQuestions)
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce(MOCK_QUESTIONS);
    const user = userEvent.setup();
    render(<PracticeQuiz />);
    await user.click(screen.getByRole("button", { name: /quiz starten/i }));
    await waitFor(() => screen.getByRole("button", { name: /erneut versuchen/i }));
    await user.click(screen.getByRole("button", { name: /erneut versuchen/i }));
    await waitFor(() =>
      expect(screen.getByText(MOCK_QUESTIONS[0].text)).toBeInTheDocument()
    );
  });
});

describe("PracticeQuiz – Playing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPracticeQuestions).mockResolvedValue(MOCK_QUESTIONS);
  });

  async function startQuiz() {
    const user = userEvent.setup();
    render(<PracticeQuiz />);
    await user.click(screen.getByRole("button", { name: /quiz starten/i }));
    await waitFor(() => screen.getByText(MOCK_QUESTIONS[0].text));
    return user;
  }

  it("shows the first question text", async () => {
    await startQuiz();
    expect(screen.getByText(MOCK_QUESTIONS[0].text)).toBeInTheDocument();
  });

  it("shows the question category", async () => {
    await startQuiz();
    expect(screen.getByText(MOCK_QUESTIONS[0].category)).toBeInTheDocument();
  });

  it("shows progress counter for first question", async () => {
    await startQuiz();
    expect(screen.getByText(/frage 1 \/ 2/i)).toBeInTheDocument();
  });

  it("renders all four answer buttons", async () => {
    await startQuiz();
    for (const answer of MOCK_QUESTIONS[0].answers) {
      expect(screen.getByRole("button", { name: answer })).toBeInTheDocument();
    }
  });
});

describe("PracticeQuiz – Answered", () => {
  beforeEach(() => vi.clearAllMocks());

  async function answerQuestion(correct: boolean) {
    vi.mocked(fetchPracticeQuestions).mockResolvedValue(MOCK_QUESTIONS);
    vi.mocked(checkPracticeAnswer).mockResolvedValue({
      correct,
      correct_answer: "Paris",
    });
    const user = userEvent.setup();
    render(<PracticeQuiz />);
    await user.click(screen.getByRole("button", { name: /quiz starten/i }));
    await waitFor(() => screen.getByRole("button", { name: "Paris" }));
    await user.click(screen.getByRole("button", { name: "Paris" }));
    await waitFor(() =>
      expect(vi.mocked(checkPracticeAnswer)).toHaveBeenCalledWith("q1", "Paris")
    );
    return user;
  }

  it("disables all answer buttons after selecting", async () => {
    await answerQuestion(true);
    for (const answer of MOCK_QUESTIONS[0].answers) {
      expect(screen.getByRole("button", { name: answer })).toBeDisabled();
    }
  });

  it("shows correct feedback text", async () => {
    await answerQuestion(true);
    expect(screen.getByText(/✓ Richtig!/)).toBeInTheDocument();
  });

  it("shows wrong feedback text with correct answer", async () => {
    vi.mocked(fetchPracticeQuestions).mockResolvedValue(MOCK_QUESTIONS);
    vi.mocked(checkPracticeAnswer).mockResolvedValue({
      correct: false,
      correct_answer: "Paris",
    });
    const user = userEvent.setup();
    render(<PracticeQuiz />);
    await user.click(screen.getByRole("button", { name: /quiz starten/i }));
    await waitFor(() => screen.getByRole("button", { name: "London" }));
    await user.click(screen.getByRole("button", { name: "London" }));
    await waitFor(() =>
      expect(screen.getByText(/✗ Falsch – richtig wäre: Paris/)).toBeInTheDocument()
    );
  });

  it("shows Nächste Frage button after answering", async () => {
    await answerQuestion(true);
    expect(screen.getByRole("button", { name: /nächste frage/i })).toBeInTheDocument();
  });

  it("advances to the next question on click", async () => {
    const user = await answerQuestion(true);
    await user.click(screen.getByRole("button", { name: /nächste frage/i }));
    await waitFor(() =>
      expect(screen.getByText(MOCK_QUESTIONS[1].text)).toBeInTheDocument()
    );
  });

  it("increments progress counter after advancing", async () => {
    const user = await answerQuestion(true);
    await user.click(screen.getByRole("button", { name: /nächste frage/i }));
    await waitFor(() =>
      expect(screen.getByText(/frage 2 \/ 2/i)).toBeInTheDocument()
    );
  });
});

describe("PracticeQuiz – Finished", () => {
  beforeEach(() => vi.clearAllMocks());

  async function finishQuiz(correct: boolean) {
    const single = [MOCK_QUESTIONS[0]];
    vi.mocked(fetchPracticeQuestions).mockResolvedValue(single);
    vi.mocked(checkPracticeAnswer).mockResolvedValue({
      correct,
      correct_answer: "Paris",
    });
    const user = userEvent.setup();
    render(<PracticeQuiz />);
    await user.click(screen.getByRole("button", { name: /quiz starten/i }));
    await waitFor(() => screen.getByRole("button", { name: "Paris" }));
    await user.click(screen.getByRole("button", { name: "Paris" }));
    await waitFor(() => screen.getByRole("button", { name: /ergebnis anzeigen/i }));
    await user.click(screen.getByRole("button", { name: /ergebnis anzeigen/i }));
    await waitFor(() => screen.getByRole("button", { name: /nochmal spielen/i }));
    return user;
  }

  it("shows score after finishing", async () => {
    await finishQuiz(true);
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });

  it("shows perfect message when all correct", async () => {
    await finishQuiz(true);
    expect(screen.getByText(/perfekt/i)).toBeInTheDocument();
  });

  it("shows encouragement message when score is low", async () => {
    await finishQuiz(false);
    expect(screen.getByText(/nicht aufgeben/i)).toBeInTheDocument();
  });

  it("Nochmal spielen restarts to first question", async () => {
    const user = await finishQuiz(true);
    await user.click(screen.getByRole("button", { name: /nochmal spielen/i }));
    await waitFor(() =>
      expect(screen.getByText(MOCK_QUESTIONS[0].text)).toBeInTheDocument()
    );
  });

  it("Zurück zur Startseite navigates to /", async () => {
    const user = await finishQuiz(true);
    await user.click(screen.getByRole("button", { name: /zurück zur startseite/i }));
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
