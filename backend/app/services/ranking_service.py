from __future__ import annotations

from datetime import datetime, timezone
from math import pow
from uuid import UUID

from sqlalchemy.orm import Session

from app.crud import ranking as crud_ranking
from app.models.match_result import ENDED_AS_NORMAL
from app.models.ranking import Ranking

K_FACTOR = 32
LEADERBOARD_PAGE_SIZE = 50


def _expected_score(player_elo: int, opponent_elo: int) -> float:
    return 1.0 / (1.0 + pow(10.0, (opponent_elo - player_elo) / 400.0))


def _updated_elo(current_elo: int, expected: float, actual: float) -> int:
    return round(current_elo + K_FACTOR * (actual - expected))


def _ensure_ranking(db: Session, user_id: UUID) -> Ranking:
    return crud_ranking.get_or_create_ranking(db, user_id)


def apply_match_result(
    db: Session,
    *,
    winner_id: UUID,
    loser_id: UUID,
    ended_as: str = ENDED_AS_NORMAL,
) -> tuple[Ranking, Ranking]:
    winner = _ensure_ranking(db, winner_id)
    loser = _ensure_ranking(db, loser_id)

    winner_expected = _expected_score(winner.elo_rating, loser.elo_rating)
    loser_expected = _expected_score(loser.elo_rating, winner.elo_rating)

    winner.elo_rating = _updated_elo(winner.elo_rating, winner_expected, 1.0)
    loser.elo_rating = _updated_elo(loser.elo_rating, loser_expected, 0.0)

    now = datetime.now(timezone.utc)
    winner.wins += 1
    winner.total_matches += 1
    winner.last_win_at = now

    loser.losses += 1
    loser.total_matches += 1

    # Match history entry, staged via CRUD and committed together with both
    # rankings in one transaction (see save_rankings).
    crud_ranking.create_match_result(
        db,
        winner_id=winner_id,
        loser_id=loser_id,
        ended_as=ended_as,
    )

    crud_ranking.save_rankings(db, winner, loser)
    return winner, loser


def get_user_ranking(db: Session, *, user_id: UUID) -> Ranking:
    return _ensure_ranking(db, user_id)


def get_leaderboard_page(
    db: Session,
    *,
    page: int,
    username_query: str | None = None,
) -> tuple[list[tuple[Ranking, str, int]], int]:
    if page < 1:
        raise ValueError("page must be >= 1")

    rows = crud_ranking.list_leaderboard_page(
        db,
        page=page,
        page_size=LEADERBOARD_PAGE_SIZE,
        username_query=username_query,
    )
    total = crud_ranking.count_rankings(db, username_query=username_query)

    ranked_rows: list[tuple[Ranking, str, int]] = []
    offset = (page - 1) * LEADERBOARD_PAGE_SIZE
    prev_tie_key: tuple | None = None
    prev_rank = 0

    for idx, (ranking, username) in enumerate(rows):
        tie_key = crud_ranking.leaderboard_tiebreak_values(ranking)
        absolute_position = offset + idx + 1
        if prev_tie_key is not None and tie_key == prev_tie_key:
            rank = prev_rank
        else:
            rank = absolute_position

        ranked_rows.append((ranking, username, rank))
        prev_tie_key = tie_key
        prev_rank = rank

    return ranked_rows, total
