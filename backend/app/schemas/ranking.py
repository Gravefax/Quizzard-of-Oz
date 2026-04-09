from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class RankingUserResponse(BaseModel):
    user_id: UUID
    elo_rating: int
    wins: int
    losses: int
    total_matches: int
    last_win_at: datetime | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeaderboardEntryResponse(BaseModel):
    rank: int
    user_id: UUID
    username: str
    elo_rating: int
    wins: int
    losses: int
    total_matches: int
    last_win_at: datetime | None


class LeaderboardResponse(BaseModel):
    page: int
    page_size: int
    total_players: int
    entries: list[LeaderboardEntryResponse]

