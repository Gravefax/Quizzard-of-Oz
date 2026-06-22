import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import BattleArena from "@/app/components/battle/BattleArena";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

type MockMessageEvent = Pick<MessageEvent, "data">;
type MockCloseEvent = Pick<CloseEvent, "code">;

type MockWebSocketInstance = {
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onmessage: ((event: MockMessageEvent) => void) | null;
  onclose: ((event: MockCloseEvent) => void) | null;
};

type MockWebSocketClass = {
  new (url: string): MockWebSocketInstance;
  readonly instance: MockWebSocketInstance | null;
};

let mockWebSocket!: MockWebSocketInstance;
let mockWebSocketClass: MockWebSocketClass;

beforeEach(() => {
  mockWebSocketClass = class MockWebSocket {
    private static _instance: MockWebSocketInstance | null = null;
    static get instance(): MockWebSocketInstance | null {
      return MockWebSocket._instance;
    }
    send = vi.fn();
    close = vi.fn();
    onmessage: ((event: MockMessageEvent) => void) | null = null;
    onclose: ((event: MockCloseEvent) => void) | null = null;
    constructor() {
      MockWebSocket._instance = this;
    }
  };

  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
    mockWebSocketClass as unknown as typeof WebSocket;

  mockWebSocket = undefined as unknown as MockWebSocketInstance;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Battle flow integration", () => {
  it("progresses to question phase with valid payload", async () => {
    render(<BattleArena matchId="flow-1" />);
    mockWebSocket = mockWebSocketClass.instance as MockWebSocketInstance;

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    } as MessageEvent);

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "pick_category",
        categories: ["Science"],
        round: 1,
        your_wins: 0,
        opponent_wins: 0,
      }),
    } as MessageEvent);

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
    } as MessageEvent);

    await waitFor(() => {
      expect(screen.getByText(/what is h2o\?/i)).toBeInTheDocument();
      expect(screen.getByText("SCIENCE")).toBeInTheDocument();
    });
  });

  it("shows game over victory screen", async () => {
    render(<BattleArena matchId="flow-2" />);
    mockWebSocket = mockWebSocketClass.instance as MockWebSocketInstance;

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    } as MessageEvent);

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "game_over",
        winner: "Alice",
        you_won: true,
        your_wins: 3,
        opponent_wins: 1,
      }),
    } as MessageEvent);

    await waitFor(() => {
      expect(screen.getByText(/victory/i)).toBeInTheDocument();
    });
  });
});
