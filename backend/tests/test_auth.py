import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from types import SimpleNamespace
from datetime import datetime, timedelta, timezone
from uuid import uuid4

# Patch DB engine creation before importing main
with patch("sqlalchemy.create_engine") as mock_engine:
    mock_engine.return_value = MagicMock()
    with patch("app.database.Base.metadata.create_all"):
        from main import app

from app.database import get_db
from app.routers import auth as auth_router

client = TestClient(app)


def _make_user(*, user_id=None, username="Ada Lovelace", email="ada@example.com"):
    return SimpleNamespace(
        id=user_id or uuid4(),
        username=username,
        email=email,
        keycloak_sub="sub-123",
    )


def _make_session(*, session_id=None, user_id=None, expires_at=None):
    return SimpleNamespace(
        id=session_id or uuid4(),
        user_id=user_id or uuid4(),
        expires_at=expires_at or datetime.now(timezone.utc) + timedelta(hours=1),
    )


@pytest.fixture(autouse=True)
def override_db():
    db = MagicMock(name="db")

    def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    yield db
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def clear_client_cookies():
    client.cookies.clear()
    yield
    client.cookies.clear()


@pytest.fixture
def fixed_time():
    return datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


def test_login_missing_bearer():
    response = client.post("/auth/login")
    assert response.status_code == 400
    assert response.json()["detail"] == "Missing bearer token"


def test_login_empty_bearer_token():
    response = client.post(
        "/auth/login",
        headers={"Authorization": "Bearer "},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Missing bearer token"


def test_login_invalid_token(monkeypatch):
    monkeypatch.setattr(
        auth_router,
        "_verify_token",
        MagicMock(side_effect=ValueError("bad token")),
    )

    response = client.post(
        "/auth/login",
        headers={"Authorization": "Bearer bad"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"


def test_login_existing_user_sets_cookie(monkeypatch, fixed_time):
    user = _make_user()
    session = _make_session(session_id=uuid4(), user_id=user.id, expires_at=fixed_time)

    monkeypatch.setattr(auth_router, "_session_expiry", lambda: fixed_time)
    monkeypatch.setattr(
        auth_router,
        "_verify_token",
        MagicMock(
            return_value={
                "sub": "sub-123",
                "preferred_username": "ada_lovelace",
                "email": "ada@example.com",
            }
        ),
    )
    monkeypatch.setattr(
        auth_router.crud_user,
        "get_user_by_keycloak_sub",
        MagicMock(return_value=user),
    )
    create_user_mock = MagicMock()
    monkeypatch.setattr(auth_router.crud_user, "create_user", create_user_mock)
    monkeypatch.setattr(
        auth_router.crud_session,
        "create_session",
        MagicMock(return_value=session),
    )

    response = client.post(
        "/auth/login",
        headers={"Authorization": "Bearer good"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "username": user.username,
        "email": user.email,
        "expires_at": int(fixed_time.timestamp()),
    }
    set_cookie = response.headers.get("set-cookie", "")
    assert f"{auth_router.SESSION_COOKIE_NAME}={session.id}" in set_cookie
    assert "HttpOnly" in set_cookie
    create_user_mock.assert_not_called()


def test_login_creates_user_when_missing(monkeypatch, fixed_time):
    user = _make_user(username="Ada Lovelace")
    session = _make_session(session_id=uuid4(), user_id=user.id, expires_at=fixed_time)

    monkeypatch.setattr(auth_router, "_session_expiry", lambda: fixed_time)
    monkeypatch.setattr(
        auth_router,
        "_verify_token",
        MagicMock(
            return_value={
                "sub": "sub-456",
                "preferred_username": "ada_lovelace",
                "email": "ada@example.com",
            }
        ),
    )
    monkeypatch.setattr(
        auth_router.crud_user,
        "get_user_by_keycloak_sub",
        MagicMock(return_value=None),
    )
    create_user_mock = MagicMock(return_value=user)
    monkeypatch.setattr(auth_router.crud_user, "create_user", create_user_mock)
    monkeypatch.setattr(
        auth_router.crud_session,
        "create_session",
        MagicMock(return_value=session),
    )

    response = client.post(
        "/auth/login",
        headers={"Authorization": "Bearer good"},
    )

    assert response.status_code == 200
    assert response.json()["username"] == "Ada Lovelace"
    create_user_mock.assert_called_once()
    assert create_user_mock.call_args.kwargs["username"] == "ada_lovelace"


def test_refresh_missing_cookie():
    client.cookies.clear()
    response = client.get("/auth/refresh")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing session"


def test_refresh_invalid_cookie_uuid():
    client.cookies.set(auth_router.SESSION_COOKIE_NAME, "not-a-uuid")
    response = client.get("/auth/refresh")
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid session"


def test_refresh_session_not_found(monkeypatch):
    session_id = uuid4()
    monkeypatch.setattr(
        auth_router.crud_session,
        "get_session",
        MagicMock(return_value=None),
    )

    client.cookies.set(auth_router.SESSION_COOKIE_NAME, str(session_id))
    response = client.get("/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Session not found"


def test_refresh_session_expired_deletes_session(monkeypatch, override_db):
    session_id = uuid4()
    session = _make_session(
        session_id=session_id,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    monkeypatch.setattr(
        auth_router.crud_session,
        "get_session",
        MagicMock(return_value=session),
    )
    delete_mock = MagicMock()
    monkeypatch.setattr(auth_router.crud_session, "delete_session", delete_mock)

    client.cookies.set(auth_router.SESSION_COOKIE_NAME, str(session_id))
    response = client.get("/auth/refresh")

    assert response.status_code == 403
    assert response.json()["detail"] == "Session expired"
    delete_mock.assert_called_once_with(override_db, session_id)


def test_refresh_user_not_found(monkeypatch, override_db):
    session_id = uuid4()
    session = _make_session(session_id=session_id)
    monkeypatch.setattr(
        auth_router.crud_session,
        "get_session",
        MagicMock(return_value=session),
    )
    delete_mock = MagicMock()
    monkeypatch.setattr(auth_router.crud_session, "delete_session", delete_mock)
    monkeypatch.setattr(auth_router.crud_user, "get_user", MagicMock(return_value=None))

    client.cookies.set(auth_router.SESSION_COOKIE_NAME, str(session_id))
    response = client.get("/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "User not found"
    delete_mock.assert_called_once_with(override_db, session_id)


def test_refresh_success_extends_session(monkeypatch, fixed_time, override_db):
    session_id = uuid4()
    user = _make_user()
    session = _make_session(session_id=session_id, user_id=user.id)

    monkeypatch.setattr(auth_router, "_session_expiry", lambda: fixed_time)
    monkeypatch.setattr(
        auth_router.crud_session,
        "get_session",
        MagicMock(return_value=session),
    )
    extend_mock = MagicMock(return_value=session)
    monkeypatch.setattr(auth_router.crud_session, "extend_session", extend_mock)
    monkeypatch.setattr(auth_router.crud_user, "get_user", MagicMock(return_value=user))

    client.cookies.set(auth_router.SESSION_COOKIE_NAME, str(session_id))
    response = client.get("/auth/refresh")

    assert response.status_code == 200
    assert response.json() == {
        "username": user.username,
        "email": user.email,
        "expires_at": int(fixed_time.timestamp()),
    }
    set_cookie = response.headers.get("set-cookie", "")
    assert f"{auth_router.SESSION_COOKIE_NAME}={session_id}" in set_cookie
    extend_mock.assert_called_once_with(override_db, session, expires_at=fixed_time)


def test_logout_with_valid_cookie(monkeypatch, override_db):
    session_id = uuid4()
    delete_mock = MagicMock()
    monkeypatch.setattr(auth_router.crud_session, "delete_session", delete_mock)

    client.cookies.set(auth_router.SESSION_COOKIE_NAME, str(session_id))
    response = client.post("/auth/logout")

    assert response.status_code == 204
    delete_mock.assert_called_once_with(override_db, session_id)
    assert "Max-Age=0" in response.headers.get("set-cookie", "")


def test_logout_with_invalid_cookie(monkeypatch):
    delete_mock = MagicMock()
    monkeypatch.setattr(auth_router.crud_session, "delete_session", delete_mock)

    client.cookies.set(auth_router.SESSION_COOKIE_NAME, "not-a-uuid")
    response = client.post("/auth/logout")

    assert response.status_code == 204
    delete_mock.assert_not_called()
    assert "Max-Age=0" in response.headers.get("set-cookie", "")
