import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    keycloak_sub = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=False)
    username = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
