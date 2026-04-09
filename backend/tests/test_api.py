from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Patch DB engine creation before importing main
with patch("sqlalchemy.create_engine") as mock_engine:
    mock_engine.return_value = MagicMock()
    with patch("app.database.Base.metadata.create_all"):
        from main import app

from app.routers.quiz import get_quiz_service_dependency
from app.services.trivia_client import TriviaUpstreamUnavailableError
from app.services.trivia_service import TriviaInsufficientQuestionsError
from app.services.trivia_types import Question


client = TestClient(app)


class StubQuizService:
    def __init__(self, questions: list[Question] | None = None) -> None:
        self._questions = questions or []

    def get_questions(self, n: int | None = None, **kwargs) -> list[Question]:
        return list(self._questions[: n or len(self._questions)])

    def check_answer(self, question_id: str, answer: str) -> tuple[bool, str] | None:
        for question in self._questions:
            if question.id == question_id:
                return (answer == question.correct_answer, question.correct_answer)
        return None


class RaisingQuizService:
    def __init__(self, error: Exception) -> None:
        self._error = error

    def get_questions(self, n: int | None = None, **kwargs) -> list[Question]:
        raise self._error

    def check_answer(self, question_id: str, answer: str) -> tuple[bool, str] | None:
        return None


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def _practice_questions() -> list[Question]:
    return [
        Question(
            id=f"q{index}",
            text=f"Question {index}?",
            answers=["A", "B", "C", "D"],
            correct_answer="A",
            category="Science",
            difficulty="easy",
        )
        for index in range(1, 11)
    ]


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "API is running"}


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_practice_questions_returns_ten():
    app.dependency_overrides[get_quiz_service_dependency] = lambda: StubQuizService(_practice_questions())

    response = client.get("/quiz/practice/questions")

    assert response.status_code == 200
    assert len(response.json()) == 10


def test_get_practice_questions_shape():
    app.dependency_overrides[get_quiz_service_dependency] = lambda: StubQuizService(_practice_questions())

    response = client.get("/quiz/practice/questions")

    question = response.json()[0]
    assert "id" in question
    assert "text" in question
    assert "answers" in question
    assert "category" in question
    assert "correct_answer" not in question
    assert "difficulty" not in question


def test_check_answer_correct():
    questions = _practice_questions()
    app.dependency_overrides[get_quiz_service_dependency] = lambda: StubQuizService(questions)

    response = client.post(
        "/quiz/practice/answer",
        json={"question_id": questions[0].id, "answer": "A"},
    )

    assert response.status_code == 200
    assert response.json() == {"correct": True, "correct_answer": "A"}


def test_check_answer_wrong():
    questions = _practice_questions()
    app.dependency_overrides[get_quiz_service_dependency] = lambda: StubQuizService(questions)

    response = client.post(
        "/quiz/practice/answer",
        json={"question_id": questions[0].id, "answer": "B"},
    )

    assert response.status_code == 200
    assert response.json() == {"correct": False, "correct_answer": "A"}


def test_check_answer_unknown_question():
    app.dependency_overrides[get_quiz_service_dependency] = lambda: StubQuizService(_practice_questions())

    response = client.post(
        "/quiz/practice/answer",
        json={"question_id": "does_not_exist", "answer": "anything"},
    )

    assert response.status_code == 404


def test_get_practice_questions_returns_503_when_upstream_unavailable():
    app.dependency_overrides[get_quiz_service_dependency] = (
        lambda: RaisingQuizService(TriviaUpstreamUnavailableError("timeout"))
    )

    response = client.get("/quiz/practice/questions")

    assert response.status_code == 503
    assert response.json() == {"detail": "Trivia API is currently unavailable"}


def test_get_practice_questions_returns_503_when_questions_are_insufficient():
    app.dependency_overrides[get_quiz_service_dependency] = (
        lambda: RaisingQuizService(TriviaInsufficientQuestionsError("Not enough cached questions"))
    )

    response = client.get("/quiz/practice/questions")

    assert response.status_code == 503
    assert response.json() == {"detail": "Not enough cached questions"}
