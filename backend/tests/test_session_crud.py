from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

from app.crud import session as crud_session


def test_create_session_persists_and_refreshes():
    db = MagicMock()
    user_id = uuid4()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    session = crud_session.create_session(db, user_id, expires_at)

    db.add.assert_called_once_with(session)
    db.commit.assert_called_once_with()
    db.refresh.assert_called_once_with(session)
    assert session.user_id == user_id
    assert session.expires_at == expires_at


def test_get_session_queries_first_matching_row():
    db = MagicMock()
    session_id = uuid4()
    expected = object()
    db.query.return_value.filter.return_value.first.return_value = expected

    result = crud_session.get_session(db, session_id)

    assert result is expected
    db.query.assert_called_once()
    db.query.return_value.filter.return_value.first.assert_called_once_with()


def test_delete_session_deletes_existing_session(monkeypatch):
    db = MagicMock()
    existing = object()
    get_session_mock = MagicMock(return_value=existing)
    monkeypatch.setattr(crud_session, "get_session", get_session_mock)

    crud_session.delete_session(db, uuid4())

    db.delete.assert_called_once_with(existing)
    db.commit.assert_called_once_with()


def test_delete_session_skips_missing_session(monkeypatch):
    db = MagicMock()
    monkeypatch.setattr(crud_session, "get_session", MagicMock(return_value=None))

    crud_session.delete_session(db, uuid4())

    db.delete.assert_not_called()
    db.commit.assert_not_called()


def test_extend_session_updates_expiry_and_refreshes():
    db = MagicMock()
    session = MagicMock()
    expires_at = datetime.now(timezone.utc) + timedelta(days=1)

    result = crud_session.extend_session(db, session, expires_at)

    assert result is session
    assert session.expires_at == expires_at
    db.add.assert_called_once_with(session)
    db.commit.assert_called_once_with()
    db.refresh.assert_called_once_with(session)
