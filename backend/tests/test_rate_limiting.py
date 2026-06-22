from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

with patch("sqlalchemy.create_engine") as mock_engine:
    mock_engine.return_value = MagicMock()
    with patch("app.database.Base.metadata.create_all"):
        from main import app

from app.database import get_db

client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def override_db():
    db = MagicMock(name="db")

    def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    yield db
    app.dependency_overrides.clear()


def test_login_allows_requests_within_limit():
    for _ in range(5):
        response = client.post("/auth/login", headers={"Authorization": "Bearer token"})
        assert response.status_code != 429


def test_login_blocks_after_limit_exceeded():
    for _ in range(5):
        client.post("/auth/login", headers={"Authorization": "Bearer token"})

    response = client.post("/auth/login", headers={"Authorization": "Bearer token"})
    assert response.status_code == 429


def test_login_rate_limit_response_has_retry_after_header():
    for _ in range(5):
        client.post("/auth/login", headers={"Authorization": "Bearer token"})

    response = client.post("/auth/login", headers={"Authorization": "Bearer token"})
    assert response.status_code == 429
    assert "retry-after" in response.headers


def test_login_rate_limit_response_body():
    for _ in range(5):
        client.post("/auth/login", headers={"Authorization": "Bearer token"})

    response = client.post("/auth/login", headers={"Authorization": "Bearer token"})
    assert response.status_code == 429
    body = response.json()
    assert "error" in body or "detail" in body


def test_refresh_allows_requests_within_limit():
    for _ in range(3):
        response = client.get("/auth/refresh")
        assert response.status_code != 429


def test_trivia_questions_allows_requests_within_limit():
    from app.dtos.trivia_types import Question, QuestionBatch
    from app.routers.trivia import get_trivia_question_service_dependency
    from app.services.trivia_service import TriviaQuestionService

    mock_service = MagicMock(spec=TriviaQuestionService)
    mock_service.get_questions.return_value = QuestionBatch(
        questions=[
            Question(
                id="q1",
                text="What is 2+2?",
                answers=["3", "4", "5", "6"],
                correct_answer="4",
                category="Math",
                difficulty="easy",
            )
        ],
        requested_limit=1,
        cache_hit=False,
    )
    app.dependency_overrides[get_trivia_question_service_dependency] = lambda: mock_service

    try:
        for _ in range(3):
            response = client.get("/api/trivia/questions?limit=1")
            assert response.status_code != 429
    finally:
        app.dependency_overrides.pop(get_trivia_question_service_dependency, None)


def test_quiz_practice_allows_requests_within_limit():
    from app.routers.quiz import get_quiz_service_dependency
    from app.services.quiz_service import QuizService

    mock_service = MagicMock(spec=QuizService)
    mock_service.get_questions.return_value = []
    app.dependency_overrides[get_quiz_service_dependency] = lambda: mock_service

    try:
        for _ in range(3):
            response = client.get("/quiz/practice/questions")
            assert response.status_code != 429
    finally:
        app.dependency_overrides.pop(get_quiz_service_dependency, None)


def test_leaderboard_allows_requests_within_limit():
    from app.services.ranking_service import get_leaderboard_page

    with patch("app.routers.ranking.get_leaderboard_page") as mock_lb:
        mock_lb.return_value = ([], 0)
        for _ in range(3):
            response = client.get("/ranking/leaderboard")
            assert response.status_code != 429


def test_leaderboard_search_allows_requests_within_limit():
    with patch("app.routers.ranking.get_leaderboard_page") as mock_lb:
        mock_lb.return_value = ([], 0)
        for _ in range(3):
            response = client.get("/ranking/leaderboard/search?username=ada")
            assert response.status_code != 429
