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
     → Phase: "picking", starts CATEGORY_TIME_SECONDS deadline (_category_timeout)
  5. picker chooses category (or the deadline auto-picks one) → _apply_category_choice()
     → Phase: "questions", send "category_chosen", hold CATEGORY_REVEAL_SECONDS,
       then first question
  6. both players answer 3 questions:
     question → answer_received (ack, no solution) → once both answered or the
     question deadline (QUESTION_TIME_SECONDS) expires → question_result reveals
     the correct answer to both players simultaneously → after REVEAL_SECONDS
     the next question is sent automatically. Missing answers count as wrong.
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
    {
      "type": "surrender"
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
      "opponent_wins": int,
      "deadline_seconds": int   # countdown until the server auto-picks
    }
    waiting_for_category: {
      "picker_username": str,
      "round": int,
      "your_wins": int,
      "opponent_wins": int,
      "deadline_seconds": int   # same countdown shown to the waiting player
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
    answer_received: {
      "your_answer": str
    }
    question_result: {
      "correct": bool,
      "correct_answer": str,
      "your_answer": str,
      "your_score_this_round": int,
      "reveal_seconds": int
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
      "opponent_wins": int,
      "forfeit": bool (optional, set when the recipient surrendered),
      "message": str (optional)
    }
    opponent_disconnected: {
      "username": str
    }
    opponent_forfeit: {
      "winner": str,
      "you_won": bool,
      "your_wins": int,
      "opponent_wins": int,
      "message": str
    }

Logging:
  All significant events are logged without user-controlled values.
  Logs contain only internal state such as round numbers, player counts,
  and error classes for operational debugging. Use: tail -f logs/uvicorn.error.log
"""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
from dataclasses import dataclass, field

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.match_result import ENDED_AS_FORFEIT
from app.models.user import User
from app.services.ranking_service import apply_match_result
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
QUESTIONS_PER_ROUND   = 3   # Questions per round (both players answer)
ROUNDS_TO_WIN         = 3   # Best-of-5 format: first player to 3 round wins
CATEGORIES_TO_OFFER   = 3   # Number of categories the picker can choose from
QUESTION_TIME_SECONDS = 20  # Server-side answer deadline per question
CATEGORY_TIME_SECONDS = 30  # Server-side deadline for the picker to choose a category
CATEGORY_REVEAL_SECONDS = 2  # Both players see the chosen category this long before Q1
REVEAL_SECONDS        = 4   # Both players see the correct answer this long

logger = logging.getLogger("uvicorn.error")
_quiz = get_quiz_service()

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
    current_correct: dict[str, bool] = field(default_factory=dict)  # user_id (str) → answered correctly this question
    offered_categories: list[str]   = field(default_factory=list)   # Categories offered to the picker this round
    used_question_ids: set[str]     = field(default_factory=set)    # Avoid repeated questions inside one match
    revealing:       bool           = False                          # True while question_result reveal is in progress
    question_timer_task: asyncio.Task | None = None                 # Per-question deadline task
    category_timer_task: asyncio.Task | None = None                 # Category-pick deadline task
    picking_deadline: float | None = None                            # event-loop time when the category pick expires
    advance_task:    asyncio.Task | None = None                     # Delayed advance after reveal
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
            "Battle connect requested active_players=%s",
            len(state.players),
        )

        async with state.lock:
            if len(state.players) >= 2:
                logger.warning(
                    "Battle connect rejected: match full active_players=%s",
                    len(state.players),
                )
                await websocket.close(code=_CLOSE_FULL, reason="Match is full")
                return False

            if any(p["user"].id == user.id for p in state.players):
                logger.warning(
                    "Battle connect rejected: duplicate connection",
                )
                await websocket.close(code=_CLOSE_DUPLICATE, reason="Already connected")
                return False

            state.players.append({"ws": websocket, "user": user})
            state.round_wins[str(user.id)] = 0

            if len(state.players) < 2:
                logger.info(
                    "Battle waiting for opponent players=%s",
                    len(state.players),
                )
                try:
                    await websocket.send_json({"type": "waiting_for_opponent"})
                    return True
                except Exception:
                    logger.warning(
                        "Battle waiting message failed: socket disconnected",
                    )
                    state.players[:] = [p for p in state.players if p["ws"] is not websocket]
                    if not state.players:
                        self._matches.pop(match_id, None)
                    return False

        logger.info("Battle match ready players=%s", len(state.players))
        try:
            await self._start_game(state, match_id)
        except Exception:
            logger.warning(
                "Battle game start aborted: websocket closed during startup",
            )
            async with state.lock:
                state.players[:] = [p for p in state.players if p["ws"] is not websocket]
            return False
        return True

    async def disconnect(self, websocket: WebSocket, match_id: str, user: User) -> None:
        """Remove player. Forfeit if match active, else notify opponent and clean up."""
        state = self._matches.get(match_id)
        if not state:
            logger.info(
                "Battle disconnect ignored: match not found",
            )
            return

        forfeit_winner: User | None = None

        async with state.lock:
            # A match counts as active once the game has started (a player is
            # picking a category or answering questions). Leaving now — e.g. by
            # logging out — must immediately end the match as a forfeit.
            active = state.phase in ("picking", "questions")
            state.players[:] = [p for p in state.players if p["ws"] is not websocket]
            remaining = list(state.players)

            if active and remaining:
                # Claim the match as finished while holding the lock so a near
                # simultaneous second disconnect cannot trigger a second forfeit.
                state.phase = "finished"
                forfeit_winner = remaining[0]["user"]

        if forfeit_winner is not None:
            await self._forfeit_match(match_id, state, remaining, forfeit_winner, user)
            return

        # A running match cannot continue with one player; stop pending timers.
        self._cancel_task(state.question_timer_task)
        self._cancel_task(state.category_timer_task)
        self._cancel_task(state.advance_task)

        for p in remaining:
            try:
                await p["ws"].send_json({
                    "type":     "opponent_disconnected",
                    "username": user.username,
                })
            except Exception:
                logger.warning("Battle disconnect notify failed: socket closed")

        logger.info(
            "Battle disconnected remaining_players=%s",
            len(remaining),
        )

        if not remaining:
            self._matches.pop(match_id, None)
            logger.info("Battle match cleaned up")

    async def _forfeit_match(
        self,
        match_id: str,
        state: MatchState,
        remaining: list[dict],
        winner_user: User,
        loser_user: User,
    ) -> None:
        """Award the remaining player a forfeit win, persist the result, clean up.

        Mirrors _end_game: apply_match_result both adjusts Elo and records the
        match outcome in each player's win/loss/total_matches totals (the
        persistent match record in this codebase). The leaver loses points, the
        remaining player gains them, and the in-memory session is removed.
        """
        oid = str(loser_user.id)

        logger.info(
            "Battle forfeit: player left active match round=%s",
            state.current_round,
        )

        for p in remaining:
            cid = str(p["user"].id)
            try:
                await p["ws"].send_json({
                    "type":          "opponent_forfeit",
                    "winner":        winner_user.username,
                    "you_won":       True,
                    "your_wins":     state.round_wins.get(cid, 0),
                    "opponent_wins": state.round_wins.get(oid, 0),
                    "message":       "Gegner hat das Spiel verlassen – du gewinnst!",
                })
            except Exception:
                logger.warning("Battle forfeit notify failed: socket closed")

        try:
            db = SessionLocal()
            try:
                apply_match_result(
                    db,
                    winner_id=winner_user.id,
                    loser_id=loser_user.id,
                    ended_as=ENDED_AS_FORFEIT,
                )
            finally:
                db.close()
        except Exception:
            logger.exception(
                "Battle forfeit ranking update failed",
            )

        self._matches.pop(match_id, None)
        logger.info("Battle match cleaned up after forfeit")

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
        elif msg_type == "surrender":
            await self._handle_surrender(match_id, state, user)

    async def _handle_surrender(self, match_id: str, state: MatchState, user: User) -> None:
        """Explicit forfeit: count as loss with Elo penalty, opponent wins.

        Only allowed while the match is actively running (picking or questions),
        never during matchmaking or after the game finished.
        """
        async with state.lock:
            if state.phase not in ("picking", "questions"):
                logger.warning("Battle surrender ignored: match not active")
                return
            if not any(p["user"].id == user.id for p in state.players):
                logger.warning("Battle surrender ignored: user not in match")
                return
            if len(state.players) < 2:
                logger.warning("Battle surrender ignored: opponent missing")
                return

            opponent = next(p for p in state.players if p["user"].id != user.id)
            # Claim the match as finished while holding the lock so concurrent
            # answers, timers, or a second surrender cannot race this forfeit.
            state.phase = "finished"

        self._cancel_task(state.question_timer_task)
        self._cancel_task(state.category_timer_task)
        self._cancel_task(state.advance_task)

        uid = str(user.id)
        oid = str(opponent["user"].id)

        surrender_ws = next(p["ws"] for p in state.players if str(p["user"].id) == uid)
        try:
            await surrender_ws.send_json({
                "type":          "game_over",
                "winner":        opponent["user"].username,
                "you_won":       False,
                "your_wins":     state.round_wins.get(uid, 0),
                "opponent_wins": state.round_wins.get(oid, 0),
                "forfeit":       True,
                "message":       "Du hast aufgegeben – dein Gegner gewinnt.",
            })
        except Exception:
            logger.warning("Battle surrender notify failed: socket closed")

        await self._forfeit_match(match_id, state, [opponent], opponent["user"], user)

    # ── Game flow ────────────────────────────────────────────────────────── #

    async def _start_game(self, state: MatchState, match_id: str = "unknown") -> None:
        """Pick random first picker and send match_ready to both players."""
        state.picker_idx    = secrets.randbelow(2)
        state.current_round = 1

        p1, p2 = state.players
        logger.info(
            "Battle game start players=%s picker_idx=%s",
            len(state.players),
            state.picker_idx,
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
        self._cancel_task(state.category_timer_task)
        state.category_timer_task = None
        state.picking_deadline    = None

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
            logger.exception(
                "Battle round preparation failed round=%s error_type=%s",
                state.current_round,
                type(exc).__name__,
            )
            await self._abort_match(match_id, state, _PREPARE_QUESTIONS_ERROR)
            return

        if not offered:
            logger.error(
                "Battle round preparation failed round=%s reason=no_categories",
                state.current_round,
            )
            await self._abort_match(match_id, state, _PREPARE_QUESTIONS_ERROR)
            return

        state.offered_categories = offered
        state.picking_deadline   = asyncio.get_event_loop().time() + CATEGORY_TIME_SECONDS

        logger.info("Battle round start")

        picker     = state.players[state.picker_idx]
        non_picker = state.players[1 - state.picker_idx]
        pid        = str(picker["user"].id)
        nid        = str(non_picker["user"].id)

        await picker["ws"].send_json({
            "type":             "pick_category",
            "categories":       offered,
            "round":            state.current_round,
            "your_wins":        state.round_wins.get(pid, 0),
            "opponent_wins":    state.round_wins.get(nid, 0),
            "deadline_seconds": CATEGORY_TIME_SECONDS,
        })

        await non_picker["ws"].send_json({
            "type":             "waiting_for_category",
            "picker_username":  picker["user"].username,
            "round":            state.current_round,
            "your_wins":        state.round_wins.get(nid, 0),
            "opponent_wins":    state.round_wins.get(pid, 0),
            "deadline_seconds": CATEGORY_TIME_SECONDS,
        })

        # Server-side deadline: if the picker stalls, auto-pick a valid category
        # so the waiting player never gets stuck on "waiting_for_category".
        self._cancel_task(state.category_timer_task)
        state.category_timer_task = asyncio.create_task(
            self._category_timeout(match_id, state, state.current_round)
        )

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

        # Picker chose in time: stop the auto-pick deadline.
        self._cancel_task(state.category_timer_task)
        state.category_timer_task = None
        state.picking_deadline    = None

        logger.info("Battle category picked")
        await self._apply_category_choice(match_id, state, category)

    async def _category_timeout(self, match_id: str, state: MatchState, round_no: int) -> None:
        """Deadline for the category pick: auto-select a valid offered category.

        Prevents the waiting player from getting stuck if the picker never
        chooses. The chosen category comes from the same options the picker saw,
        so the round stays valid and both clients converge on the same state.
        """
        await asyncio.sleep(CATEGORY_TIME_SECONDS)

        async with state.lock:
            if state.phase != "picking" or state.current_round != round_no:
                return
            if not state.offered_categories:
                return
            category = secrets.choice(state.offered_categories)
            state.phase = "questions"

        state.category_timer_task = None
        state.picking_deadline    = None

        logger.info("Battle category auto-picked after deadline round=%s", round_no)
        await self._apply_category_choice(match_id, state, category)

    async def _apply_category_choice(
        self, match_id: str, state: MatchState, category: str
    ) -> None:
        """Load the round's questions, reveal the category, then send question one.

        Both players see the chosen category for CATEGORY_REVEAL_SECONDS before
        the first question is sent, so the reveal stays in sync across clients.
        """
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
            logger.exception(
                "Battle category load failed round=%s error_type=%s",
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

        await asyncio.sleep(CATEGORY_REVEAL_SECONDS)

        # The reveal pause is unlocked; bail out if the match ended meanwhile
        # (e.g. a player disconnected and forfeited during the reveal).
        if self._matches.get(match_id) is not state or len(state.players) < 2:
            logger.info("Battle category reveal skipped: match no longer active")
            return

        await self._send_current_question(state, match_id)

    async def _send_current_question(self, state: MatchState, match_id: str = "unknown") -> None:
        """Clear answers, send the current question to both players, start deadline."""
        q                     = state.round_questions[state.question_idx]
        state.current_answers = {}
        state.current_correct = {}
        state.revealing       = False

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

        self._cancel_task(state.question_timer_task)
        state.question_timer_task = asyncio.create_task(
            self._question_timeout(match_id, state, state.question_idx)
        )

    async def _handle_answer(
        self, match_id: str, state: MatchState, user: User, data: dict
    ) -> None:
        """Validate and record answer; reveal the solution once both answered."""
        uid    = str(user.id)
        q_id   = data.get("question_id", "")
        answer = data.get("answer", "")

        finish = False

        async with state.lock:
            if state.phase != "questions" or state.revealing:
                logger.warning("Battle answer ignored: wrong phase")
                return
            if uid in state.current_answers:
                logger.warning("Battle answer ignored: duplicate answer")
                return
            if not state.round_questions or state.round_questions[state.question_idx].id != q_id:
                logger.warning("Battle answer ignored: question mismatch")
                return

            state.current_answers[uid] = answer

            correct = False
            result  = self._quiz.check_answer(q_id, answer)
            if result:
                correct = result[0]
                if correct:
                    state.round_scores[uid] = state.round_scores.get(uid, 0) + 1
            state.current_correct[uid] = correct

            if len(state.current_answers) == len(state.players):
                state.revealing = True
                finish          = True

        logger.debug("Battle answer processed")

        ws = next(p["ws"] for p in state.players if str(p["user"].id) == uid)
        await ws.send_json({
            "type":        "answer_received",
            "your_answer": answer,
        })

        if finish:
            self._cancel_task(state.question_timer_task)
            state.question_timer_task = None
            await self._finish_question(match_id, state)

    async def _question_timeout(self, match_id: str, state: MatchState, q_idx: int) -> None:
        """Deadline per question: missing answers count as wrong, then reveal."""
        await asyncio.sleep(QUESTION_TIME_SECONDS)

        async with state.lock:
            if state.phase != "questions" or state.revealing or state.question_idx != q_idx:
                return

            for p in state.players:
                uid = str(p["user"].id)
                if uid not in state.current_answers:
                    state.current_answers[uid] = ""
                    state.current_correct[uid] = False

            state.revealing = True

        logger.info("Battle question deadline reached")
        await self._finish_question(match_id, state)

    async def _finish_question(self, match_id: str, state: MatchState) -> None:
        """Reveal the correct answer to both players, then advance after delay."""
        q = state.round_questions[state.question_idx]

        for p in state.players:
            uid = str(p["user"].id)
            await p["ws"].send_json({
                "type":                  "question_result",
                "correct":               state.current_correct.get(uid, False),
                "correct_answer":        q.correct_answer,
                "your_answer":           state.current_answers.get(uid, ""),
                "your_score_this_round": state.round_scores.get(uid, 0),
                "reveal_seconds":        REVEAL_SECONDS,
            })

        async with state.lock:
            state.question_idx += 1
            done_with_round = state.question_idx >= len(state.round_questions)

        self._cancel_task(state.advance_task)
        state.advance_task = asyncio.create_task(
            self._advance_after_reveal(match_id, state, done_with_round)
        )

    async def _advance_after_reveal(
        self, match_id: str, state: MatchState, done_with_round: bool
    ) -> None:
        """Hold the reveal for REVEAL_SECONDS, then continue the match."""
        await asyncio.sleep(REVEAL_SECONDS)

        if self._matches.get(match_id) is not state or len(state.players) < 2:
            logger.info("Battle advance skipped: match no longer active")
            return

        if done_with_round:
            await self._end_round(match_id, state)
        else:
            await self._send_current_question(state, match_id)

    @staticmethod
    def _cancel_task(task: asyncio.Task | None) -> None:
        """Cancel a pending asyncio task if it is still running."""
        if task and not task.done():
            task.cancel()

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
            "Battle round result round=%s score=%s:%s wins=%s:%s",
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
        self._cancel_task(state.question_timer_task)
        self._cancel_task(state.category_timer_task)
        self._cancel_task(state.advance_task)
        p1, p2      = state.players
        id1         = str(p1["user"].id)
        id2         = str(p2["user"].id)
        w1          = state.round_wins.get(id1, 0)
        w2          = state.round_wins.get(id2, 0)
        winner      = p1["user"].username if w1 >= w2 else p2["user"].username

        logger.info(
            "Battle game over wins=%s:%s",
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

        winner_user = p1["user"] if w1 >= w2 else p2["user"]
        loser_user = p2["user"] if w1 >= w2 else p1["user"]

        try:
            db = SessionLocal()
            try:
                apply_match_result(db, winner_id=winner_user.id, loser_id=loser_user.id)
            finally:
                db.close()
        except Exception:
            logger.exception(
                "Battle ranking update failed",
            )

        self._matches.pop(match_id, None)

    async def _abort_match(self, match_id: str, state: MatchState, reason: str) -> None:
        """Close all sockets and remove the match when question preparation fails."""
        state.phase = "finished"
        self._cancel_task(state.question_timer_task)
        self._cancel_task(state.category_timer_task)
        self._cancel_task(state.advance_task)
        players = list(state.players)

        for player in players:
            try:
                await player["ws"].close(code=_CLOSE_INTERNAL, reason=reason)
            except Exception:
                logger.warning(
                    "Battle abort close failed",
                )

        self._matches.pop(match_id, None)
