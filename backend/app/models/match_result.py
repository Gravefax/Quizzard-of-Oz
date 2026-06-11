import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base

# How a match concluded; forfeits are recorded distinctly from regular losses.
ENDED_AS_NORMAL = "normal"
ENDED_AS_FORFEIT = "forfeit"


class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    winner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    loser_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    ended_as = Column(String(16), nullable=False, default=ENDED_AS_NORMAL, server_default=ENDED_AS_NORMAL)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
