"""
Battle Match Manager Service

Orchestrates the full lifecycle of ranked battle matches between two players.
Maintains match state, enforces game rules, handles WebSocket message routing,
and manages phase transitions from game start to completion.

Key Concepts:
  - Match: A complete game between two players (best-of-5 rounds)
  - Round: A single question set with a selected category (3 questions)
  - Phase: Current game state (waiting, picking, questions, finished)
  - Picker: The player who selects the category for the current round

Concurrency Model:
  Each MatchState has an asyncio.Lock to ensure thread-safe access to
  shared game state. All state mutations occur inside "async with state.lock",
  protecting concurrent player actions (e.g., both submitting answers simultaneously).

WebSocket Close Codes:
  - 4004 (Full): Match capacity reached (2 players already connected)
  - 4005 (Duplicate): Same user attempting to connect twice to the match

Match Flow (State Machine):
  1. connect() called by player 1
     → Phase: "waiting", send "waiting_for_opponent"
  2. connect() called by player 2
     → Trigger _start_game(), pick random first picker
  3. _start_game() sends "match_ready" to both
     → Trigger _start_round()
  4. _start_round() sends categories to picker, "waiting_for_category" to non-picker
     → Phase: "picking"
  5. picker chooses category → _handle_category_pick()
     → Phase: "questions", send "category_chosen", first question
  6. both players answer 3 questions (question → answer_result → next question)
  7. After 3 questions → _end_round()
     → Determine round winner, update round_wins, send "round_result"
  8. If a player reached ROUNDS_TO_WIN (3) → _end_game()
     → Otherwise loop to step 4 with next round

Message Protocol:

  INCOMING (client → server):
    {
      "type": "pick_category",
      "category": "Science"
    }
    {
      "type": "answer",
      "question_id": "<uuid>",
      "answer": "B"
    }

  OUTGOING (server → client):
    waiting_for_opponent: {}
    match_ready: {
      "your_username": str,
      "opponent_username": str,
      "you_pick_first": bool,
      "rounds_to_win": int
    }
    pick_category: {
      "categories": [str, ...],
      "round": int,
      "your_wins": int,
      "opponent_wins": int
    }
    waiting_for_category: {
      "picker_username": str,
      "round": int,
      "your_wins": int,
      "opponent_wins": int
    }
    category_chosen: {
      "category": str,
      "round": int
    }
    question: {
      "question_number": int,
      "total_questions": int,
      "question_id": str,
      "text": str,
      "answers": [str, ...],
      "category": str
    }
    answer_result: {
      "correct": bool,
      "correct_answer": str,
      "your_score_this_round": int
    }
    round_result: {
      "round": int,
      "outcome": "win" | "loss" | "tie",
      "your_score": int,
      "opponent_score": int,
      "your_total_wins": int,
      "opponent_total_wins": int,
      "next_picker": str,
      "game_over": bool
    }
    game_over: {
      "winner": str,
      "you_won": bool,
      "your_wins": int,
      "opponent_wins": int
    }
    opponent_disconnected: {
      "username": str
    }

Logging:
  All significant events are logged with match_id, user_id, username, and
  client IP for post-match debugging. Use: tail -f logs/uvicorn.error.log
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import secrets
from dataclasses import dataclass, field

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.ws_auth import authenticate_ws
from app.services.quiz_service import QuizService, get_quiz_service
from app.services.trivia_client import (
    TriviaUpstreamPayloadError,
    TriviaUpstreamResponseError,
    TriviaUpstreamUnavailableError,
)
from app.services.trivia_service import TriviaInsufficientQuestionsError
from app.services.trivia_types import Question

# WebSocket close codes for match-specific errors
_CLOSE_FULL      = 4004  # Second player cannot join; match is full
_CLOSE_DUPLICATE = 4005  # Same user attempting reconnection to active match
_CLOSE_INTERNAL  = 1011  # Internal question preparation failure
_PREPARE_QUESTIONS_ERROR = "Unable to prepare questions"

# Game configuration constants
QUESTIONS_PER_ROUND  = 3  # Questions per round (both players answer)
ROUNDS_TO_WIN        = 3  # Best-of-5 format: first player to 3 round wins
CATEGORIES_TO_OFFER  = 3  # Number of categories the picker can choose from

logger = logging.getLogger("uvicorn.error")
_quiz = get_quiz_service()


def _ws_id(websocket: WebSocket) -> str:
    """Stable short id for correlating websocket lifecycle logs."""
    return hex(id(websocket))


def _safe_log_value(value: object) -> str:
    """Return alphanumeric values as-is; encode everything else for safe logging."""
    text = str(value)
    if text.isalnum():
        return text
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


@dataclass
class MatchState:
    """Game state for one match. Protect mutations with state.lock."""
    players:         list[dict]     = field(default_factory=list)   # [{"ws": WebSocket, "user": User}, ...]
    round_wins:      dict[str, int] = field(default_factory=dict)   # user_id (str) → round wins (0-3)
    current_round:   int            = 0                              # Round number (1-5)
    picker_idx:      int            = 0                              # Index: which player picks category (0 or 1)
    phase:           str            = "waiting"                      # Game phase: waiting|picking|questions|finished
    round_questions: list[Question] = field(default_factory=list)   # Questions for current round (length 3)
    question_idx:    int            = 0                              # Current question index (0-2)
    round_scores:    dict[str, int] = field(default_factory=dict)   # user_id (str) → correct answers this round (0-3)
    current_answers: dict[str, str] = field(default_factory=dict)   # user_id (str) → answer letter (A/B/C/D)
    offered_categories: list[str]   = field(default_factory=list)   # Categories offered to the picker this round
    used_question_ids: set[str]     = field(default_factory=set)    # Avoid repeated questions inside one match
    lock:            asyncio.Lock   = field(default_factory=asyncio.Lock)  # Protects all mutations


class BattleManager:
    """Orchestrates full match lifecycle: auth, connections, phases, scoring."""

    def __init__(self, quiz_service: QuizService | None = None) -> None:
        self._matches: dict[str, MatchState] = {}
        self._quiz = quiz_service or _quiz

    # ── Authentication ───────────────────────────────────────────────────── #

    async def authenticate(self, websocket: WebSocket, db: Session) -> User | None:
        """Validate session and return user or None (closes socket on fail)."""
        return await authenticate_ws(websocket, db)

    # ── Connection management ────────────────────────────────────────────── #

    async def connect(self, websocket: WebSocket, match_id: str, user: User) -> bool:
        """Add player to match. Returns False if full or already connected."""
        state = self._matches.setdefault(match_id, MatchState())

        logger.info(
            "Battle connect requested match_id=%s user_id=%s username=%s ws=%s",
            match_id,
            user.id,
            user.username,
            _ws_id(websocket),
        )

        async with state.lock:
            if len(state.players) >= 2:
                logger.warning(
                    "Battle connect rejected: match full match_id=%s user_id=%s username=%s ws=%s",
                    match_id,
                    user.id,
                    user.username,
                    _ws_id(websocket),
                )
                await websocket.close(code=_CLOSE_FULL, reason="Match is full")
                return False

            if any(p["user"].id == user.id for p in state.players):
                logger.warning(
                    "Battle connect rejected: duplicate connection match_id=%s user_id=%s username=%s ws=%s",
                    match_id,
                    user.id,
                    user.username,
                    _ws_id(websocket),
                )
                await websocket.close(code=_CLOSE_DUPLICATE, reason="Already connected")
                return False

            state.players.append({"ws": websocket, "user": user})
            state.round_wins[str(user.id)] = 0

            if len(state.players) < 2:
                logger.info(
                    "Battle waiting for opponent match_id=%s user_id=%s username=%s players=%s",
                    match_id,
                    user.id,
                    user.username,
                    len(state.players),
                )
                try:
                    await websocket.send_json({"type": "waiting_for_opponent"})
                    return True
                except Exception:
                    logger.warning(
                        "Battle waiting message failed: socket disconnected match_id=%s user_id=%s username=%s ws=%s",
                        match_id,
                        user.id,
                        user.username,
                        _ws_id(websocket),
                    )
                    state.players[:] = [p for p in state.players if p["ws"] is not websocket]
                    if not state.players:
                        self._matches.pop(match_id, None)
                    return False

        logger.info("Battle match ready match_id=%s players=%s", match_id, len(state.players))
        try:
            await self._start_game(state, match_id)
        except Exception:
            logger.warning(
                "Battle game start aborted: WebSocket closed during startup match_id=%s user_id=%s username=%s ws=%s",
                match_id,
                user.id,
                user.username,
                _ws_id(websocket),
            )
            async with state.lock:
                state.players[:] = [p for p in state.players if p["ws"] is not websocket]
            return False
        return True

    async def disconnect(self, websocket: WebSocket, match_id: str, user: User) -> None:
        """Remove player from match and notify opponent. Delete if empty."""
        state = self._matches.get(match_id)
        if not state:
            logger.info(
                "Battle disconnect ignored: match not found match_id=%s user_id=%s username=%s ws=%s",
                match_id,
                user.id,
                user.username,
                _ws_id(websocket),
            )
            return

        async with state.lock:
            state.players[:] = [p for p in state.players if p["ws"] is not websocket]
            remaining = list(state.players)

        for p in remaining:
            await p["ws"].send_json({
                "type":     "opponent_disconnected",
                "username": user.username,
            })

        logger.info(
            "Battle disconnected match_id=%s user_id=%s username=%s remaining_players=%s",
            match_id,
            user.id,
            user.username,
            len(remaining),
        )

        if not remaining:
            self._matches.pop(match_id, None)
            logger.info("Battle match cleaned up match_id=%s", match_id)

    # ── Incoming client messages ─────────────────────────────────────────── #

    async def handle_message(self, match_id: str, user: User, raw: str) -> None:
        """Parse JSON and route to handler (pick_category or answer)."""
        state = self._matches.get(match_id)
        if not state:
            logger.warning("Battle message ignored: match not found")
            return

        try:
            data: dict = json.loads(raw)
        except ValueError:
            logger.warning("Battle message parse failed")
            return

        msg_type = data.get("type")
        logger.debug("Battle message received")

        if msg_type == "pick_category":
            await self._handle_category_pick(match_id, state, user, data)
        elif msg_type == "answer":
            await self._handle_answer(match_id, state, user, data)

    # ── Game flow ────────────────────────────────────────────────────────── #

    async def _start_game(self, state: MatchState, match_id: str = "unknown") -> None:
        """Pick random first picker and send match_ready to both players."""
        state.picker_idx    = secrets.randbelow(2)
        state.current_round = 1

        p1, p2 = state.players
        logger.info(
            "Battle game start match_id=%s player1=%s player2=%s picker=%s",
            match_id,
            p1["user"].username,
            p2["user"].username,
            state.players[state.picker_idx]["user"].username,
        )

        for current, opponent in ((p1, p2), (p2, p1)):
            await current["ws"].send_json({
                "type":              "match_ready",
                "your_username":     current["user"].username,
                "opponent_username": opponent["user"].username,
                "you_pick_first":    current is state.players[state.picker_idx],
                "rounds_to_win":     ROUNDS_TO_WIN,
            })

        await self._start_round(state, match_id)

    async def _start_round(self, state: MatchState, match_id: str = "unknown") -> None:
        """Reset round, sample categories, and send to picker and non-picker."""
        state.phase           = "picking"
        state.round_scores    = {str(p["user"].id): 0 for p in state.players}
        state.question_idx    = 0
        state.round_questions = []
        state.current_answers = {}
        state.offered_categories = []

        try:
            offered = self._quiz.get_category_options(
                option_count=CATEGORIES_TO_OFFER,
                questions_per_category=QUESTIONS_PER_ROUND,
                exclude_ids=tuple(state.used_question_ids),
            )
        except (
            TriviaInsufficientQuestionsError,
            TriviaUpstreamUnavailableError,
            TriviaUpstreamResponseError,
            TriviaUpstreamPayloadError,
        ) as exc:
            logger.error(
                "Battle round preparation failed match_id=%s round=%s error_type=%s",
                _safe_log_value(match_id),
                state.current_round,
                type(exc).__name__,
            )
            await self._abort_match(match_id, state, _PREPARE_QUESTIONS_ERROR)
            return

        if not offered:
            logger.error(
                "Battle round preparation failed match_id=%s round=%s reason=no_categories",
                _safe_log_value(match_id),
                state.current_round,
            )
            await self._abort_match(match_id, state, _PREPARE_QUESTIONS_ERROR)
            return

        state.offered_categories = offered

        logger.info("Battle round start")

        picker     = state.players[state.picker_idx]
        non_picker = state.players[1 - state.picker_idx]
        pid        = str(picker["user"].id)
        nid        = str(non_picker["user"].id)

        await picker["ws"].send_json({
            "type":          "pick_category",
            "categories":    offered,
            "round":         state.current_round,
            "your_wins":     state.round_wins.get(pid, 0),
            "opponent_wins": state.round_wins.get(nid, 0),
        })

        await non_picker["ws"].send_json({
            "type":            "waiting_for_category",
            "picker_username": picker["user"].username,
            "round":           state.current_round,
            "your_wins":       state.round_wins.get(nid, 0),
            "opponent_wins":   state.round_wins.get(pid, 0),
        })

    async def _handle_category_pick(
        self,
        match_id: str,
        state: MatchState,
        user: User,
        data: dict,
    ) -> None:
        """Validate picker, load questions for category, send to both players."""
        category = data.get("category", "")

        async with state.lock:
            if state.phase != "picking":
                logger.warning("Battle pick_category ignored: wrong phase")
                return
            if state.players[state.picker_idx]["user"].id != user.id:
                logger.warning("Battle pick_category ignored: not picker")
                return
            if category not in state.offered_categories:
                logger.warning("Battle pick_category ignored: category not offered")
                return
            state.phase = "questions"

        logger.info("Battle category picked")

        try:
            cat_q = self._quiz.get_questions(
                n=QUESTIONS_PER_ROUND,
                categories=[category],
                exclude_ids=tuple(state.used_question_ids),
            )
        except (
            TriviaInsufficientQuestionsError,
            TriviaUpstreamUnavailableError,
            TriviaUpstreamResponseError,
            TriviaUpstreamPayloadError,
        ) as exc:
            logger.error(
                "Battle category load failed match_id=%s round=%s error_type=%s",
                _safe_log_value(match_id),
                state.current_round,
                type(exc).__name__,
            )
            await self._abort_match(match_id, state, _PREPARE_QUESTIONS_ERROR)
            return

        state.round_questions = cat_q
        state.used_question_ids.update(question.id for question in cat_q)

        for p in state.players:
            await p["ws"].send_json({
                "type":     "category_chosen",
                "category": category,
                "round":    state.current_round,
            })

        await self._send_current_question(state)

    async def _send_current_question(self, state: MatchState) -> None:
        """Clear current_answers and send the current question to both players."""
        q                    = state.round_questions[state.question_idx]
        state.current_answers = {}

        logger.debug("Battle question sent")

        for p in state.players:
            await p["ws"].send_json({
                "type":            "question",
                "question_number": state.question_idx + 1,
                "total_questions": QUESTIONS_PER_ROUND,
                "question_id":     q.id,
                "text":            q.text,
                "answers":         q.answers,
                "category":        q.category,
            })

    async def _handle_answer(
        self, match_id: str, state: MatchState, user: User, data: dict
    ) -> None:
        """Validate answer, check correctness, increment score, advance if both answered."""
        uid    = str(user.id)
        q_id   = data.get("question_id", "")
        answer = data.get("answer", "")

        correct         = False
        correct_answer  = ""
        advance         = False
        done_with_round = False

        async with state.lock:
            if state.phase != "questions":
                logger.warning("Battle answer ignored: wrong phase")
                return
            if uid in state.current_answers:
                logger.warning("Battle answer ignored: duplicate answer")
                return
            if not state.round_questions or state.round_questions[state.question_idx].id != q_id:
                logger.warning("Battle answer ignored: question mismatch")
                return

            state.current_answers[uid] = answer

            result = self._quiz.check_answer(q_id, answer)
            if result:
                correct, correct_answer = result
                if correct:
                    state.round_scores[uid] = state.round_scores.get(uid, 0) + 1

            if len(state.current_answers) == len(state.players):
                advance         = True
                state.question_idx += 1
                done_with_round = state.question_idx >= len(state.round_questions)

        logger.debug("Battle answer processed")

        ws = next(p["ws"] for p in state.players if str(p["user"].id) == uid)
        await ws.send_json({
            "type":                  "answer_result",
            "correct":               correct,
            "correct_answer":        correct_answer,
            "your_score_this_round": state.round_scores.get(uid, 0),
        })

        if advance:
            if done_with_round:
                await self._end_round(match_id, state)
            else:
                await self._send_current_question(state)

    async def _end_round(self, match_id: str, state: MatchState) -> None:
        """Determine round winner, update wins, send result, or start next round."""
        p1, p2 = state.players
        id1    = str(p1["user"].id)
        id2    = str(p2["user"].id)
        s1     = state.round_scores.get(id1, 0)
        s2     = state.round_scores.get(id2, 0)

        if s1 > s2:
            round_winner_idx = 0
        elif s2 > s1:
            round_winner_idx = 1
        else:
            round_winner_idx = None  # tie – same picker continues

        if round_winner_idx is not None:
            winner_id = str(state.players[round_winner_idx]["user"].id)
            state.round_wins[winner_id] = state.round_wins.get(winner_id, 0) + 1
            state.picker_idx = 1 - round_winner_idx  # loser picks next

        w1               = state.round_wins.get(id1, 0)
        w2               = state.round_wins.get(id2, 0)
        game_over        = w1 >= ROUNDS_TO_WIN or w2 >= ROUNDS_TO_WIN
        next_picker_name = state.players[state.picker_idx]["user"].username

        logger.info(
            "Battle round result match_id=%s round=%s score=%s:%s wins=%s:%s",
            match_id,
            state.current_round,
            s1,
            s2,
            w1,
            w2,
        )

        for current, opponent in ((p1, p2), (p2, p1)):
            cid = str(current["user"].id)
            oid = str(opponent["user"].id)

            if round_winner_idx is None:
                outcome = "tie"
            elif str(state.players[round_winner_idx]["user"].id) == cid:
                outcome = "win"
            else:
                outcome = "loss"

            await current["ws"].send_json({
                "type":                "round_result",
                "round":               state.current_round,
                "outcome":             outcome,
                "your_score":          state.round_scores.get(cid, 0),
                "opponent_score":      state.round_scores.get(oid, 0),
                "your_total_wins":     state.round_wins.get(cid, 0),
                "opponent_total_wins": state.round_wins.get(oid, 0),
                "next_picker":         next_picker_name,
                "game_over":           game_over,
            })

        if game_over:
            await self._end_game(match_id, state)
        else:
            state.current_round += 1
            await self._start_round(state, match_id)

    async def _end_game(self, match_id: str, state: MatchState) -> None:
        """Send game_over to both players and delete match from memory."""
        state.phase = "finished"
        p1, p2      = state.players
        id1         = str(p1["user"].id)
        id2         = str(p2["user"].id)
        w1          = state.round_wins.get(id1, 0)
        w2          = state.round_wins.get(id2, 0)
        winner      = p1["user"].username if w1 >= w2 else p2["user"].username

        logger.info(
            "Battle game over match_id=%s winner=%s wins=%s:%s",
            match_id,
            winner,
            w1,
            w2,
        )

        for current, opponent in ((p1, p2), (p2, p1)):
            cid = str(current["user"].id)
            oid = str(opponent["user"].id)
            await current["ws"].send_json({
                "type":          "game_over",
                "winner":        winner,
                "you_won":       state.round_wins.get(cid, 0) > state.round_wins.get(oid, 0),
                "your_wins":     state.round_wins.get(cid, 0),
                "opponent_wins": state.round_wins.get(oid, 0),
            })

        self._matches.pop(match_id, None)

    async def _abort_match(self, match_id: str, state: MatchState, reason: str) -> None:
        """Close all sockets and remove the match when question preparation fails."""
        state.phase = "finished"
        players = list(state.players)

        for player in players:
            try:
                await player["ws"].close(code=_CLOSE_INTERNAL, reason=reason)
            except Exception:
                logger.warning(
                    "Battle abort close failed match_id=%s user_id=%s username=%s",
                    match_id,
                    player["user"].id,
                    player["user"].username,
                )

        self._matches.pop(match_id, None)
