from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Patch DB engine creation before importing main
with patch("sqlalchemy.create_engine") as mock_engine:
    mock_engine.return_value = MagicMock()
    with patch("app.database.Base.metadata.create_all"):
        from main import app

from app.routers.trivia import get_trivia_question_service_dependency
from app.services.trivia_client import (
    TriviaUpstreamPayloadError,
    TriviaUpstreamUnavailableError,
)
from app.services.trivia_service import TriviaInsufficientQuestionsError
from app.services.trivia_types import Question, QuestionBatch


client = TestClient(app)


class RecordingTriviaService:
    def __init__(self, result=None, error=None) -> None:
        self.result = result
        self.error = error
        self.filters = None

    def get_questions(self, *, filters, exclude_ids=(), db=None):
        self.filters = filters
        if self.error:
            raise self.error
        return self.result


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def test_get_trivia_questions_maps_valid_request_and_response():
    service = RecordingTriviaService(
        result=QuestionBatch(
            questions=[
                Question(
                    id="internal-id",
                    text="What is the chemical symbol for gold?",
                    answers=["Go", "Au", "Gd", "Ag"],
                    correct_answer="Au",
                    category="Science",
                    difficulty="medium",
                )
            ],
            requested_limit=5,
            cache_hit=False,
        )
    )
    app.dependency_overrides[get_trivia_question_service_dependency] = lambda: service

    response = client.get(
        "/api/trivia/questions?limit=5&categories=Science,History&categories=Science&difficulties=Easy&difficulties=hard"
    )

    assert response.status_code == 200
    assert response.json() == {
        "questions": [
            {
                "id": "internal-id",
                "text": "What is the chemical symbol for gold?",
                "answers": ["Go", "Au", "Gd", "Ag"],
                "category": "Science",
                "difficulty": "medium",
            }
        ],
        "meta": {
            "count": 1,
            "requested_limit": 5,
            "cache_hit": False,
        },
    }
    assert service.filters.limit == 5
    assert service.filters.categories == ("Science", "History")
    assert service.filters.difficulties == ("easy", "hard")


def test_get_trivia_questions_rejects_invalid_limit():
    response = client.get("/api/trivia/questions?limit=abc")

    assert response.status_code == 400
    assert response.json()["detail"] == "limit must be an integer"


def test_get_trivia_questions_rejects_invalid_difficulties():
    response = client.get("/api/trivia/questions?difficulties=easy,legendary")

    assert response.status_code == 400
    assert "legendary" in response.json()["detail"]


def test_get_trivia_questions_rejects_query_parameter():
    response = client.get("/api/trivia/questions?query=greek+mythology")

    assert response.status_code == 400
    assert response.json()["detail"] == "The query parameter is not supported in v1"


def test_get_trivia_questions_maps_unavailable_error_to_503():
    service = RecordingTriviaService(error=TriviaUpstreamUnavailableError("down"))
    app.dependency_overrides[get_trivia_question_service_dependency] = lambda: service

    response = client.get("/api/trivia/questions")

    assert response.status_code == 503
    assert response.json()["detail"] == "Trivia API is currently unavailable"


def test_get_trivia_questions_maps_payload_error_to_502():
    service = RecordingTriviaService(error=TriviaUpstreamPayloadError("bad payload"))
    app.dependency_overrides[get_trivia_question_service_dependency] = lambda: service

    response = client.get("/api/trivia/questions")

    assert response.status_code == 502
    assert response.json()["detail"] == "bad payload"


def test_get_trivia_questions_maps_insufficient_questions_to_503():
    service = RecordingTriviaService(error=TriviaInsufficientQuestionsError("not enough"))
    app.dependency_overrides[get_trivia_question_service_dependency] = lambda: service

    response = client.get("/api/trivia/questions")

    assert response.status_code == 503
    assert response.json()["detail"] == "not enough"
