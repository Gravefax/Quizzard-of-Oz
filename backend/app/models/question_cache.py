import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class QuestionCache(Base):
    __tablename__ = "question_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String, nullable=False, unique=True, index=True)
    question_text = Column(Text, nullable=False)
    answers = Column(JSON, nullable=False)
    correct_answer = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    difficulty = Column(String, nullable=False, index=True)
    cached_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=func.now(),
    )
