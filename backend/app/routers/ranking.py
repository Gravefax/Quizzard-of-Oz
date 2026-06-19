from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud import user as crud_user
from app.database import get_db
from app.schemas.ranking import (
    LeaderboardEntryResponse,
    LeaderboardResponse,
    RankingUserResponse,
)
from app.services.ranking_service import (
    LEADERBOARD_PAGE_SIZE,
    get_leaderboard_page,
    get_user_ranking,
)

router = APIRouter(prefix="/ranking", tags=["ranking"])


def _build_leaderboard_response(db: Session, page: int, username_query: str | None = None) -> LeaderboardResponse:
    rows, total_players = get_leaderboard_page(db, page=page, username_query=username_query)
    entries = [
        LeaderboardEntryResponse(
            rank=rank,
            user_id=ranking.user_id,
            username=username,
            elo_rating=ranking.elo_rating,
            wins=ranking.wins,
            losses=ranking.losses,
            total_matches=ranking.total_matches,
            last_win_at=ranking.last_win_at,
        )
        for ranking, username, rank in rows
    ]

    return LeaderboardResponse(
        page=page,
        page_size=LEADERBOARD_PAGE_SIZE,
        total_players=total_players,
        entries=entries,
    )


@router.get(
    "/users/{user_id}",
    response_model=RankingUserResponse,
    responses={404: {"description": "User not found"}},
)
def get_user_ranking_by_id(user_id: UUID, db: Annotated[Session, Depends(get_db)]):
    user = crud_user.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return get_user_ranking(db, user_id=user_id)


@router.get("/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
):
    return _build_leaderboard_response(db, page)


@router.get("/leaderboard/search", response_model=LeaderboardResponse)
def search_leaderboard(
    db: Annotated[Session, Depends(get_db)],
    username: Annotated[str, Query(min_length=1)],
    page: Annotated[int, Query(ge=1)] = 1,
):
    return _build_leaderboard_response(db, page, username_query=username)

