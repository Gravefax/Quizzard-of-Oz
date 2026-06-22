import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Queue from "@/app/components/Queue";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

type MockMessageEvent = Pick<MessageEvent, "data">;
type MockCloseEvent = Pick<CloseEvent, "code">;
type MockErrorEvent = Pick<Event, "type">;

type MockWebSocketInstance = {
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onmessage: ((event: MockMessageEvent) => void) | null;
  onclose: ((event: MockCloseEvent) => void) | null;
  onerror: ((event: MockErrorEvent) => void) | null;
};

let socketInstances: MockWebSocketInstance[] = [];

beforeEach(() => {
  socketInstances = [];
  const MockWebSocket = class {
    send = vi.fn();
    close = vi.fn();
    onmessage: ((event: MockMessageEvent) => void) | null = null;
    onclose: ((event: MockCloseEvent) => void) | null = null;
    onerror: ((event: MockErrorEvent) => void) | null = null;

    constructor() {
      socketInstances.push(this);
    }
  };

  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
    MockWebSocket as unknown as typeof WebSocket;
  mockPush.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Ranked Mode Flow Integration", () => {
  it("goes from idle to searching to matched", async () => {
    const user = userEvent.setup();
    render(<Queue ranked />);

    await user.click(screen.getByRole("button", { name: /queue beitreten/i }));
    const ws = socketInstances[0];

    ws.onmessage?.({ data: JSON.stringify({ type: "queued" }) });
    await waitFor(() => {
      expect(screen.getByText(/gegner wird gesucht/i)).toBeInTheDocument();
    });

    ws.onmessage?.({ data: JSON.stringify({ type: "matched", match_id: "ranked-001" }) });
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/battle/ranked-001");
      },
      { timeout: 3000 }
    );
  });

  it("can cancel ranked queue", async () => {
    const user = userEvent.setup();
    render(<Queue ranked />);

    await user.click(screen.getByRole("button", { name: /queue beitreten/i }));
    const ws = socketInstances[0];
    ws.onmessage?.({ data: JSON.stringify({ type: "queued" }) });

    const cancelButton = await screen.findByRole("button", { name: /abbrechen/i });
    await user.click(cancelButton);

    expect(ws.close).toHaveBeenCalled();
  });

  it("shows backend error message on close code 1006", async () => {
    const user = userEvent.setup();
    render(<Queue ranked />);

    await user.click(screen.getByRole("button", { name: /queue beitreten/i }));
    const ws = socketInstances[0];
    ws.onclose?.({ code: 1006 });

    await waitFor(() => {
      expect(screen.getByText(/verbindung zum server fehlgeschlagen/i)).toBeInTheDocument();
    });
  });
});
