from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import case, desc
from sqlalchemy.orm import Query, Session

from app.models.ranking import Ranking
from app.models.user import User


def get_ranking_by_user_id(db: Session, user_id: UUID) -> Ranking | None:
    return db.query(Ranking).filter(Ranking.user_id == user_id).first()


def get_or_create_ranking(db: Session, user_id: UUID) -> Ranking:
    ranking = get_ranking_by_user_id(db, user_id)
    if ranking:
        return ranking

    ranking = Ranking(user_id=user_id)
    db.add(ranking)
    db.commit()
    db.refresh(ranking)
    return ranking


def save_rankings(db: Session, *rankings: Ranking) -> None:
    for ranking in rankings:
        db.add(ranking)
    db.commit()
    for ranking in rankings:
        db.refresh(ranking)


def _leaderboard_base_query(db: Session, username_query: str | None = None) -> Query:
    query = db.query(Ranking, User.username).join(User, User.id == Ranking.user_id)

    if username_query:
        query = query.filter(User.username.ilike(f"%{username_query}%"))

    return query


def list_leaderboard_page(
    db: Session,
    *,
    page: int,
    page_size: int,
    username_query: str | None = None,
) -> list[tuple[Ranking, str]]:
    """Return one leaderboard page with username for display."""
    offset = (page - 1) * page_size
    ratio_expr = case(
        (Ranking.losses == 0, Ranking.wins),
        else_=(Ranking.wins * 1.0) / Ranking.losses,
    )

    return (
        _leaderboard_base_query(db, username_query=username_query)
        .order_by(
            desc(Ranking.elo_rating),
            desc(ratio_expr),
            desc(Ranking.last_win_at),
            desc(Ranking.updated_at),
            Ranking.user_id.asc(),
        )
        .offset(offset)
        .limit(page_size)
        .all()
    )


def count_rankings(db: Session, username_query: str | None = None) -> int:
    return _leaderboard_base_query(db, username_query=username_query).count()


def leaderboard_tiebreak_values(ranking: Ranking) -> tuple[Any, ...]:
    """Build a comparison tuple used to assign shared ranks consistently."""
    ratio = ranking.wins if ranking.losses == 0 else ranking.wins / ranking.losses
    return (
        ranking.elo_rating,
        ratio,
        ranking.last_win_at,
    )
