import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BattleArena from "@/app/components/battle/BattleArena";
import useAuthStore from "@/app/stores/authStore";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/lib/utils/wsUrl", () => ({
  getWsUrl: (path: string) => `ws://localhost:8000${path}`,
}));

const CREDENTIAL = {
  email: "test@example.com",
  username: "TestPlayer",
  expiresAt: 9_999_999_999,
};

// ── Mock WebSocket ──────────────────────────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  readyState = 1; // OPEN

  send = vi.fn();
  close = vi.fn(() => {
    this.onclose?.(new CloseEvent("close", { code: 1000 }));
  });

  constructor(public readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  emit(data: object) {
    this.onmessage?.(
      new MessageEvent("message", { data: JSON.stringify(data) })
    );
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function renderArena(matchId = "match-001") {
  render(<BattleArena matchId={matchId} />);
  // Flush initial mount effects (WebSocket creation, etc.)
  await act(async () => {});
}

// Emits pick_category, which is the first message that sets canSurrender = true
async function advanceToActivePhase() {
  await act(async () => {
    MockWebSocket.instances[MockWebSocket.instances.length - 1].emit({
      type: "pick_category",
      categories: ["Wissenschaft", "Geschichte", "Sport"],
      round: 1,
      your_wins: 0,
      opponent_wins: 0,
    });
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("BattleArena – beforeunload guard", () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.instances = [];
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    act(() => {
      useAuthStore.setState({ credential: CREDENTIAL });
    });
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  it("registers a beforeunload listener when canSurrender becomes true", async () => {
    const spy = vi.spyOn(window, "addEventListener");
    await renderArena();
    await advanceToActivePhase();

    const registeredEvents = spy.mock.calls.map(([ev]) => ev);
    expect(registeredEvents).toContain("beforeunload");
  });

  it("removes the beforeunload listener when the component unmounts", async () => {
    const spy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<BattleArena matchId="match-002" />);
    await act(async () => {});
    await advanceToActivePhase();
    unmount();

    const removedEvents = spy.mock.calls.map(([ev]) => ev);
    expect(removedEvents).toContain("beforeunload");
  });

  it("does NOT register a beforeunload listener before the match turns active", async () => {
    const spy = vi.spyOn(window, "addEventListener");
    // Render but never emit pick_category → canSurrender stays false
    render(<BattleArena matchId="match-003" />);
    await act(async () => {});

    const registeredEvents = spy.mock.calls.map(([ev]) => ev);
    expect(registeredEvents).not.toContain("beforeunload");
  });
});

describe("BattleArena – popstate / browser-back guard", () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.instances = [];
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    act(() => {
      useAuthStore.setState({ credential: CREDENTIAL });
    });
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  it("registers a popstate listener when canSurrender becomes true", async () => {
    const spy = vi.spyOn(window, "addEventListener");
    await renderArena();
    await advanceToActivePhase();

    const registeredEvents = spy.mock.calls.map(([ev]) => ev);
    expect(registeredEvents).toContain("popstate");
  });

  it("removes the popstate listener when the component unmounts", async () => {
    const spy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<BattleArena matchId="match-004" />);
    await act(async () => {});
    await advanceToActivePhase();
    unmount();

    const removedEvents = spy.mock.calls.map(([ev]) => ev);
    expect(removedEvents).toContain("popstate");
  });

  it("shows the surrender confirm dialog when popstate fires during an active phase", async () => {
    await renderArena();
    await advanceToActivePhase();

    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(
      screen.getByRole("dialog", { name: /aufgeben bestätigen/i })
    ).toBeInTheDocument();
  });

  it("'Abbrechen' closes the dialog without navigating away", async () => {
    const user = userEvent.setup();
    await renderArena();
    await advanceToActivePhase();

    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() =>
      screen.getByRole("dialog", { name: /aufgeben bestätigen/i })
    );
    await user.click(screen.getByRole("button", { name: /abbrechen/i }));

    expect(
      screen.queryByRole("dialog", { name: /aufgeben bestätigen/i })
    ).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does NOT register a popstate listener before the match turns active", async () => {
    const spy = vi.spyOn(window, "addEventListener");
    render(<BattleArena matchId="match-005" />);
    await act(async () => {});

    const registeredEvents = spy.mock.calls.map(([ev]) => ev);
    expect(registeredEvents).not.toContain("popstate");
  });
});
