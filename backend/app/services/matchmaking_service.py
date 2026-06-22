from __future__ import annotations

import asyncio
import time
import uuid
from typing import TypedDict

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.ranking_service import get_user_ranking
from app.services.ws_auth import authenticate_ws

_BASE_ELO_RANGE = 75
_ELO_RANGE_STEP = 50
_ELO_RANGE_STEP_SECONDS = 5


class QueueEntry(TypedDict):
    ws: WebSocket
    user: User
    elo: int
    queued_at: float
    seq: int


class MatchmakingService:
    """
    Manages the matchmaking queue for two-player battles.

    Flow:
      1. Player connects to the queue WebSocket and is authenticated.
      2. Player is added to the waiting queue; receives {"type": "queued"}.
      3. When a second player connects, both are matched:
         both receive {"type": "matched", "match_id": "<uuid>"}.
      4. Clients open /battle/ws/{match_id} to start the actual game.
      5. If a player disconnects before being matched they are removed cleanly.
    """

    def __init__(self) -> None:
        self._queue: list[QueueEntry] = []
        self._lock = asyncio.Lock()
        self._entry_seq = 0

    # ------------------------------------------------------------------ #
    #  Public API (called from the router)                                 #
    # ------------------------------------------------------------------ #

    async def authenticate(self, websocket: WebSocket, db: Session) -> User | None:
        return await authenticate_ws(websocket, db)

    async def join(self, websocket: WebSocket, user: User, db: Session) -> None:
        """
        Add the player to the queue.
        Blocks until the player is matched or disconnects.
        """
        ranking = get_user_ranking(db, user_id=user.id)
        entry: QueueEntry = {
            "ws": websocket,
            "user": user,
            "elo": ranking.elo_rating,
            "queued_at": time.monotonic(),
            "seq": self._entry_seq,
        }

        self._entry_seq += 1

        if await self._attempt_match_for_websocket(websocket, entry=entry):
            return

        # Not yet matched: tell this player they are queued and keep polling.
        await websocket.send_json({"type": "queued"})
        await self._poll_until_matched_or_disconnected(websocket)

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    async def _poll_until_matched_or_disconnected(self, websocket: WebSocket) -> None:
        try:
            while True:
                try:
                    await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                except asyncio.TimeoutError:
                    if await self._attempt_match_for_websocket(websocket):
                        return
        except WebSocketDisconnect:
            await self._remove(websocket)

    async def _attempt_match_for_websocket(
        self,
        websocket: WebSocket,
        *,
        entry: QueueEntry | None = None,
    ) -> bool:
        matched_pair: tuple[QueueEntry, QueueEntry] | None = None

        async with self._lock:
            if entry is not None:
                self._queue.append(entry)
            matched_pair = self._attempt_match_locked()

        if not matched_pair:
            return False

        self_matched = self._pair_contains_ws(matched_pair, websocket)
        await self._notify_matched(*matched_pair)
        return self_matched

    def _allowed_elo_delta(self, queued_at: float, now: float) -> int:
        wait_seconds = max(0.0, now - queued_at)
        growth_steps = int(wait_seconds // _ELO_RANGE_STEP_SECONDS)
        return _BASE_ELO_RANGE + growth_steps * _ELO_RANGE_STEP

    def _pair_contains_ws(
        self,
        pair: tuple[QueueEntry, QueueEntry],
        websocket: WebSocket,
    ) -> bool:
        return any(player["ws"] is websocket for player in pair)

    def _attempt_match_locked(self) -> tuple[QueueEntry, QueueEntry] | None:
        if len(self._queue) < 2:
            return None

        now = time.monotonic()
        best_pair: tuple[QueueEntry, QueueEntry] | None = None
        best_key: tuple[int, float, int] | None = None

        for left_idx in range(len(self._queue) - 1):
            left = self._queue[left_idx]
            left_elo = int(left["elo"])
            left_queued_at = float(left["queued_at"])
            left_delta = self._allowed_elo_delta(left_queued_at, now)

            for right_idx in range(left_idx + 1, len(self._queue)):
                right = self._queue[right_idx]
                right_elo = int(right["elo"])
                right_queued_at = float(right["queued_at"])
                right_delta = self._allowed_elo_delta(right_queued_at, now)

                elo_diff = abs(left_elo - right_elo)
                allowed_diff = max(left_delta, right_delta)
                if elo_diff > allowed_diff:
                    continue

                # Always prefer the closest Elo pair; then the oldest pair.
                candidate_key = (
                    elo_diff,
                    min(left_queued_at, right_queued_at),
                    min(int(left["seq"]), int(right["seq"])),
                )

                if best_key is None or candidate_key < best_key:
                    best_key = candidate_key
                    best_pair = (left, right)

        if best_pair is None:
            return None

        self._queue = [
            player
            for player in self._queue
            if player is not best_pair[0] and player is not best_pair[1]
        ]
        return best_pair

    async def _notify_matched(self, p1: QueueEntry, p2: QueueEntry) -> None:
        match_id = str(uuid.uuid4())
        for p in (p1, p2):
            ws = p["ws"]
            await ws.send_json({"type": "matched", "match_id": match_id})

    async def _remove(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._queue[:] = [p for p in self._queue if p["ws"] is not websocket]
