from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session as DbSession

from app.models.session import Session


def create_session(db: DbSession, user_id: UUID, expires_at: datetime) -> Session:
	session = Session(user_id=user_id, expires_at=expires_at)
	db.add(session)
	db.commit()
	db.refresh(session)
	return session


def get_session(db: DbSession, session_id: UUID) -> Session | None:
	return db.query(Session).filter(Session.id == session_id).first()


def delete_session(db: DbSession, session_id: UUID) -> None:
	session = get_session(db, session_id)
	if session:
		db.delete(session)
		db.commit()


def extend_session(db: DbSession, session: Session, expires_at: datetime) -> Session:
	session.expires_at = expires_at
	db.add(session)
	db.commit()
	db.refresh(session)
	return session

