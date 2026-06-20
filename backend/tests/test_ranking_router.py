from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

with patch("sqlalchemy.create_engine"):
    with patch("app.database.Base.metadata.create_all"):
        from main import app

from app.database import get_db

client = TestClient(app)


def test_get_user_ranking_not_found():
    db = MagicMock()
    app.dependency_overrides[get_db] = lambda: db

    with patch("app.routers.ranking.user_service.get_user", return_value=None):
        response = client.get(f"/ranking/users/{uuid4()}")

    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_get_user_ranking_success():
    db = MagicMock()
    user_id = uuid4()
    app.dependency_overrides[get_db] = lambda: db

    ranking = MagicMock()
    ranking.user_id = user_id
    ranking.elo_rating = 1234
    ranking.wins = 12
    ranking.losses = 3
    ranking.total_matches = 15
    ranking.last_win_at = None
    ranking.updated_at = datetime.now(timezone.utc)

    with patch("app.routers.ranking.user_service.get_user", return_value=MagicMock()):
        with patch("app.routers.ranking.get_user_ranking", return_value=ranking):
            response = client.get(f"/ranking/users/{user_id}")

    assert response.status_code == 200
    assert response.json()["elo_rating"] == 1234
    app.dependency_overrides.clear()


def test_get_leaderboard_pagination_defaults_and_page_size():
    db = MagicMock()
    app.dependency_overrides[get_db] = lambda: db

    ranking = MagicMock()
    ranking.user_id = uuid4()
    ranking.elo_rating = 1400
    ranking.wins = 20
    ranking.losses = 5
    ranking.total_matches = 25
    ranking.last_win_at = None

    rows = [(ranking, "PlayerA", 51)]

    with patch("app.routers.ranking.get_leaderboard_page", return_value=(rows, 120)):
        response = client.get("/ranking/leaderboard?page=2")

    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 2
    assert body["page_size"] == 50
    assert body["total_players"] == 120
    assert body["entries"][0]["rank"] == 51
    app.dependency_overrides.clear()


def test_search_leaderboard_by_username():
    db = MagicMock()
    app.dependency_overrides[get_db] = lambda: db

    ranking = MagicMock()
    ranking.user_id = uuid4()
    ranking.elo_rating = 1500
    ranking.wins = 30
    ranking.losses = 2
    ranking.total_matches = 32
    ranking.last_win_at = None

    rows = [(ranking, "Alpha", 1)]

    with patch("app.routers.ranking.get_leaderboard_page", return_value=(rows, 1)) as mock_service:
        response = client.get("/ranking/leaderboard/search?username=alp&page=1")

    assert response.status_code == 200
    body = response.json()
    assert body["entries"][0]["username"] == "Alpha"
    mock_service.assert_called_once_with(db, page=1, username_query="alp")
    app.dependency_overrides.clear()

