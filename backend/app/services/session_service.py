from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session as DbSession

from app.crud import session as crud_session
from app.models.session import Session


def create_session(db: DbSession, user_id: UUID, expires_at: datetime) -> Session:
    return crud_session.create_session(db, user_id=user_id, expires_at=expires_at)


def get_session(db: DbSession, session_id: UUID) -> Session | None:
    return crud_session.get_session(db, session_id)


def delete_session(db: DbSession, session_id: UUID) -> None:
    crud_session.delete_session(db, session_id)


def extend_session(db: DbSession, session: Session, expires_at: datetime) -> Session:
    return crud_session.extend_session(db, session, expires_at=expires_at)
