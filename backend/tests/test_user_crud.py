from unittest.mock import MagicMock
from uuid import uuid4

from app.crud import user as crud_user


def _make_db():
    return MagicMock(name="db")


def test_get_user_returns_matching_user():
    db = _make_db()
    expected = object()
    db.query.return_value.filter.return_value.first.return_value = expected

    result = crud_user.get_user(db, uuid4())

    assert result is expected


def test_get_user_returns_none_when_not_found():
    db = _make_db()
    db.query.return_value.filter.return_value.first.return_value = None

    assert crud_user.get_user(db, uuid4()) is None


def test_get_user_by_username_returns_matching_user():
    db = _make_db()
    expected = object()
    db.query.return_value.filter.return_value.first.return_value = expected

    result = crud_user.get_user_by_username(db, "alice")

    assert result is expected


def test_get_user_by_username_returns_none_when_not_found():
    db = _make_db()
    db.query.return_value.filter.return_value.first.return_value = None

    assert crud_user.get_user_by_username(db, "nobody") is None


def test_get_user_by_keycloak_sub_returns_matching_user():
    db = _make_db()
    expected = object()
    db.query.return_value.filter.return_value.first.return_value = expected

    result = crud_user.get_user_by_keycloak_sub(db, "sub-abc-123")

    assert result is expected


def test_get_user_by_keycloak_sub_returns_none_when_not_found():
    db = _make_db()
    db.query.return_value.filter.return_value.first.return_value = None

    assert crud_user.get_user_by_keycloak_sub(db, "unknown-sub") is None


def test_create_user_persists_and_returns():
    db = _make_db()

    user = crud_user.create_user(
        db, username="bob", keycloak_sub="sub-bob", email="bob@example.com"
    )

    db.add.assert_called_once_with(user)
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(user)
    assert user.username == "bob"
    assert user.keycloak_sub == "sub-bob"
    assert user.email == "bob@example.com"
