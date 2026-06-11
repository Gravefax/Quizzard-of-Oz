import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BattleArena from "@/app/components/battle/BattleArena";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

type MockMessageEvent = Pick<MessageEvent, "data">;
type MockCloseEvent = Pick<CloseEvent, "code">;
type MockErrorEvent = Pick<Event, "type">;

type MockWebSocketInstance = {
  url: string;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onmessage: ((event: MockMessageEvent) => void) | null;
  onclose: ((event: MockCloseEvent) => void) | null;
  onerror: ((event: MockErrorEvent) => void) | null;
};

type MockWebSocketClass = {
  new (url: string): MockWebSocketInstance;
  readonly instance: {
    current: MockWebSocketInstance | null;
  };
};

let mockWebSocket!: MockWebSocketInstance;
let mockWebSocketClass: MockWebSocketClass;
let originalApiBase: string | undefined;

beforeEach(() => {
  originalApiBase = process.env.NEXT_PUBLIC_API_BASE;

  mockWebSocketClass = class MWS {
    static readonly instance = { current: null as MockWebSocketInstance | null };
    url: string;
    send = vi.fn();
    close = vi.fn();
    onmessage: ((event: MockMessageEvent) => void) | null = null;
    onclose: ((event: MockCloseEvent) => void) | null = null;
    onerror: ((event: MockErrorEvent) => void) | null = null;
    constructor(url: string) {
      this.url = url;
      MWS.instance.current = this;
    }
  };

  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
    mockWebSocketClass as unknown as typeof WebSocket;

  mockWebSocket = undefined as unknown as MockWebSocketInstance;
  mockPush.mockClear();
});

afterEach(() => {
  if (originalApiBase === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE;
  } else {
    process.env.NEXT_PUBLIC_API_BASE = originalApiBase;
  }

  vi.useRealTimers();
  vi.clearAllMocks();
});

const renderArena = (matchId: string) => {
  render(<BattleArena matchId={matchId} />);
  mockWebSocket = mockWebSocketClass.instance.current as MockWebSocketInstance;
};

const emitMessage = async (payload: Record<string, unknown>) => {
  await act(async () => {
    mockWebSocket.onmessage?.({
      data: JSON.stringify(payload),
    });
  });
};

const emitClose = async (code: number) => {
  await act(async () => {
    mockWebSocket.onclose?.({ code });
  });
};

describe("BattleArena Component Tests", () => {
  it("shows connecting state initially", () => {
    renderArena("match-123");
    expect(screen.getByText(/verbinde mit battle/i)).toBeInTheDocument();
  });

  it("shows category buttons after pick_category message", async () => {
    renderArena("match-123");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "pick_category",
        categories: ["Science", "History"],
        round: 1,
        your_wins: 0,
        opponent_wins: 0,
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/wähle eine kategorie/i)).toBeInTheDocument();
      expect(screen.getByText("Science")).toBeInTheDocument();
    });
  });

  it("shows question with category in question phase", async () => {
    renderArena("match-123");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "question",
        question_number: 1,
        total_questions: 3,
        question_id: "q1",
        text: "What is H2O?",
        answers: ["Water", "Oxygen", "Hydrogen", "Salt"],
        category: "Science",
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/what is h2o\?/i)).toBeInTheDocument();
      expect(screen.getByText("SCIENCE")).toBeInTheDocument();
    });
  });

  it("shows game over state", async () => {
    renderArena("match-123");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "game_over",
        winner: "Alice",
        you_won: true,
        your_wins: 3,
        opponent_wins: 1,
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/victory/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /zurück zur lobby/i })).toBeInTheDocument();
    });
  });

  it("shows waiting for opponent state", async () => {
    renderArena("match-234");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({ type: "waiting_for_opponent" }),
    });

    await waitFor(() => {
      expect(screen.getByText(/warte auf gegner/i)).toBeInTheDocument();
    });
  });

  it("shows waiting for category state", async () => {
    renderArena("match-345");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: false,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "waiting_for_category",
        round: 1,
        your_wins: 0,
        opponent_wins: 0,
        picker_username: "Bob",
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/bob wählt kategorie/i)).toBeInTheDocument();
      expect(screen.getByText(/warte auf auswahl/i)).toBeInTheDocument();
    });
  });

  it("shows chosen category state", async () => {
    renderArena("match-456");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "category_chosen",
        category: "Science",
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/kategorie/i)).toBeInTheDocument();
      expect(screen.getByText("Science")).toBeInTheDocument();
    });
  });

  it("sends category_pick when clicking a category", async () => {
    const user = userEvent.setup();
    renderArena("match-567");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "pick_category",
        categories: ["Science"],
        round: 1,
        your_wins: 0,
        opponent_wins: 0,
      }),
    });

    const categoryButton = await screen.findByRole("button", { name: /science/i });
    await user.click(categoryButton);
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "pick_category", category: "Science" })
    );
  });

  it("shows waiting spinner after answer_received without revealing the solution", async () => {
    renderArena("match-678");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "question",
        question_number: 1,
        total_questions: 3,
        question_id: "q1",
        text: "What is H2O?",
        answers: ["Water", "Oxygen", "Hydrogen", "Salt"],
        category: "Science",
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "answer_received",
        your_answer: "Water",
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/warte auf gegner/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/warte auf gegner/i)).toBeInTheDocument();
    });
    // Solution must stay hidden until both players answered.
    expect(screen.queryByText("✓")).not.toBeInTheDocument();
    expect(screen.queryByText(/richtig/i)).not.toBeInTheDocument();
  });

  it("reveals the correct answer to both players after question_result", async () => {
    renderArena("match-679");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "question",
        question_number: 1,
        total_questions: 3,
        question_id: "q1",
        text: "What is H2O?",
        answers: ["Water", "Oxygen", "Hydrogen", "Salt"],
        category: "Science",
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "question_result",
        correct: false,
        correct_answer: "Water",
        your_answer: "",
        your_score_this_round: 0,
        reveal_seconds: 4,
      }),
    });

    await waitFor(() => {
      expect(screen.getByText("✓")).toBeInTheDocument();
      expect(screen.getByText(/zeit abgelaufen/i)).toBeInTheDocument();
      expect(screen.getByText(/nächste frage gleich/i)).toBeInTheDocument();
    });
  });

  it("shows round_result and next picker", async () => {
    renderArena("match-789");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "round_result",
        round: 1,
        outcome: "win",
        your_score: 2,
        opponent_score: 1,
        your_total_wins: 1,
        opponent_total_wins: 0,
        next_picker: "Bob",
        game_over: false,
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/runde gewonnen/i)).toBeInTheDocument();
      expect(screen.getByText(/nächste runde/i)).toBeInTheDocument();
    });
  });

  it("shows forfeit victory when opponent leaves an active match", async () => {
    renderArena("match-forfeit");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "opponent_forfeit",
        winner: "Alice",
        you_won: true,
        your_wins: 1,
        opponent_wins: 0,
        message: "Gegner hat das Spiel verlassen – du gewinnst!",
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/victory/i)).toBeInTheDocument();
      expect(
        screen.getByText(/gegner hat das spiel verlassen – du gewinnst!/i),
      ).toBeInTheDocument();
    });
  });

  it("shows opponent disconnected state", async () => {
    renderArena("match-890");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({ type: "opponent_disconnected" }),
    });

    await waitFor(() => {
      expect(screen.getByText(/gegner hat aufgegeben/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /zurück zur lobby/i })).toBeInTheDocument();
    });
  });

  it("shows error state for auth close", async () => {
    renderArena("match-901");

    mockWebSocket.onclose?.({ code: 4001 });

    await waitFor(() => {
      expect(screen.getByText(/verbindungsfehler/i)).toBeInTheDocument();
      expect(screen.getByText(/login erforderlich/i)).toBeInTheDocument();
    });
  });

  it("uses NEXT_PUBLIC_API_BASE when building the websocket url", () => {
    process.env.NEXT_PUBLIC_API_BASE = "https://example.test/api/";

    renderArena("match-902");

    expect(mockWebSocket.url).toBe("wss://example.test/api/battle/ws/match-902");
  });

  it("falls back to window location when NEXT_PUBLIC_API_BASE is unset", () => {
    delete process.env.NEXT_PUBLIC_API_BASE;

    renderArena("match-903");

    expect(mockWebSocket.url).toContain("/battle/ws/match-903");
    expect(mockWebSocket.url.startsWith("ws://")).toBe(true);
  });

  it("counts down the question timer", async () => {
    vi.useFakeTimers();
    renderArena("match-904");

    await emitMessage({
      type: "match_ready",
      your_username: "Alice",
      opponent_username: "Bob",
      you_pick_first: true,
      rounds_to_win: 3,
    });

    await emitMessage({
      type: "question",
      question_number: 1,
      total_questions: 3,
      question_id: "q1",
      text: "What is H2O?",
      answers: ["Water", "Oxygen", "Hydrogen", "Salt"],
      category: "Science",
    });

    expect(screen.getByText("20")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText("19")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(19000);
    });

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows wrong answer feedback and ignores duplicate submissions", async () => {
    const user = userEvent.setup();
    renderArena("match-905");

    await emitMessage({
      type: "match_ready",
      your_username: "Alice",
      opponent_username: "Bob",
      you_pick_first: true,
      rounds_to_win: 3,
    });

    await emitMessage({
      type: "question",
      question_number: 1,
      total_questions: 3,
      question_id: "q1",
      text: "What is H2O?",
      answers: ["Water", "Oxygen", "Hydrogen", "Salt"],
      category: "Science",
    });

    const oxygenButton = await screen.findByRole("button", { name: /oxygen/i });
    const saltButton = await screen.findByRole("button", { name: /salt/i });

    await user.click(oxygenButton);
    await user.click(saltButton);

    expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "answer", question_id: "q1", answer: "Oxygen" })
    );

    await emitMessage({
      type: "answer_received",
      your_answer: "Oxygen",
    });

    await waitFor(() => {
      expect(screen.getByText(/warte auf gegner/i)).toBeInTheDocument();
    });

    await emitMessage({
      type: "question_result",
      correct: false,
      correct_answer: "Water",
      your_answer: "Oxygen",
      your_score_this_round: 0,
      reveal_seconds: 4,
    });

    await waitFor(() => {
      expect(screen.getByText(/falsch\./i)).toBeInTheDocument();
      expect(screen.getByText("✗")).toBeInTheDocument();
    });
  });

  it("shows loss and tie round results", async () => {
    renderArena("match-906");

    await emitMessage({
      type: "match_ready",
      your_username: "Alice",
      opponent_username: "Bob",
      you_pick_first: true,
      rounds_to_win: 3,
    });

    await emitMessage({
      type: "round_result",
      round: 1,
      outcome: "loss",
      your_score: 1,
      opponent_score: 2,
      your_total_wins: 0,
      opponent_total_wins: 1,
      next_picker: "Bob",
      game_over: false,
    });

    await waitFor(() => {
      expect(screen.getByText(/runde verloren/i)).toBeInTheDocument();
      expect(screen.getByText(/nächste runde/i)).toBeInTheDocument();
    });

    renderArena("match-907");

    await emitMessage({
      type: "match_ready",
      your_username: "Alice",
      opponent_username: "Bob",
      you_pick_first: true,
      rounds_to_win: 3,
    });

    await emitMessage({
      type: "round_result",
      round: 1,
      outcome: "tie",
      your_score: 1,
      opponent_score: 1,
      your_total_wins: 0,
      opponent_total_wins: 0,
      next_picker: "Bob",
      game_over: false,
    });

    await waitFor(() => {
      expect(screen.getByText(/unentschieden/i)).toBeInTheDocument();
    });
  });

  it("shows defeat in game over state", async () => {
    renderArena("match-908");

    await emitMessage({
      type: "match_ready",
      your_username: "Alice",
      opponent_username: "Bob",
      you_pick_first: true,
      rounds_to_win: 3,
    });

    await emitMessage({
      type: "game_over",
      winner: "Bob",
      you_won: false,
      your_wins: 1,
      opponent_wins: 3,
    });

    await waitFor(() => {
      expect(screen.getByText(/defeat/i)).toBeInTheDocument();
      expect(screen.getByText(/bob hat gewonnen/i)).toBeInTheDocument();
    });
  });

  it("shows connection error for unexpected close codes", async () => {
    renderArena("match-909");

    await emitClose(1006);

    await waitFor(() => {
      expect(screen.getByText(/verbindungsfehler/i)).toBeInTheDocument();
      expect(screen.getByText(/verbindung unterbrochen/i)).toBeInTheDocument();
    });
  });
});
