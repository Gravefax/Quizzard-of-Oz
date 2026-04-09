from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.settings import load_trivia_settings
from app.services.trivia_client import TriviaUpstreamPayloadError
from app.services.trivia_service import TriviaInsufficientQuestionsError, TriviaQuestionService
from app.services.trivia_types import QuestionFilters


class FakeSession:
    def close(self) -> None:
        return None


class FakeTriviaClient:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def fetch_questions(self, filters, *, limit_override=None):
        self.calls.append({"filters": filters, "limit_override": limit_override})
        return self.responses.pop(0)


class FakeQuestionCacheRepository:
    def __init__(self, initial_questions=None):
        self.questions = list(initial_questions or [])
        self.upserted = []

    def get_random_questions(self, db, *, filters, limit, exclude_ids=()):
        matched = [
            question
            for question in self.questions
            if str(question.id) not in exclude_ids
            and (
                not filters.categories
                or question.category.lower() in {category.lower() for category in filters.categories}
            )
            and (
                not filters.difficulties
                or question.difficulty.lower() in {difficulty.lower() for difficulty in filters.difficulties}
            )
        ]
        return matched[:limit]

    def get_question(self, db, question_id):
        for question in self.questions:
            if str(question.id) == question_id:
                return question
        return None

    def upsert_questions(self, db, questions):
        self.upserted.extend(questions)
        by_external_id = {question.external_id: question for question in self.questions}

        for question in questions:
            existing = by_external_id.get(question.external_id)
            if existing is None:
                existing = SimpleNamespace(id=uuid4(), external_id=question.external_id)
                self.questions.append(existing)
                by_external_id[question.external_id] = existing

            existing.question_text = question.text
            existing.answers = question.answers
            existing.correct_answer = question.correct_answer
            existing.category = question.category
            existing.difficulty = question.difficulty

    def get_categories_with_minimum_questions(self, db, *, minimum_questions, exclude_ids=()):
        counts = {}
        for question in self.questions:
            if str(question.id) in exclude_ids:
                continue
            counts[question.category] = counts.get(question.category, 0) + 1

        return [category for category, count in counts.items() if count >= minimum_questions]


TRIVIA_ENV_KEYS = (
    "TRIVIA_API_BASE_URL",
    "TRIVIA_API_KEY",
    "TRIVIA_TIMEOUT_SECONDS",
    "TRIVIA_MAX_RETRIES",
    "TRIVIA_BACKOFF_SECONDS",
    "TRIVIA_REFILL_ATTEMPTS",
    "TRIVIA_REFILL_BATCH_SIZE",
    "TRIVIA_MAX_LIMIT",
)


@pytest.fixture(autouse=True)
def clear_trivia_env(monkeypatch):
    for key in TRIVIA_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)


def _service(repository, client):
    return TriviaQuestionService(
        client=client,
        repository=repository,
        session_factory=FakeSession,
        settings=load_trivia_settings(),
    )


def _cached_question(*, question_id=None, external_id="external-1", category="Science", difficulty="easy"):
    return SimpleNamespace(
        id=question_id or uuid4(),
        external_id=external_id,
        question_text="What is 2+2?",
        answers=["4", "3", "5", "6"],
        correct_answer="4",
        category=category,
        difficulty=difficulty,
    )


def _raw_question(*, external_id="external-1", category="Science", difficulty="easy"):
    return {
        "id": external_id,
        "question": "What is 2+2?",
        "correctAnswer": "4",
        "incorrectAnswers": ["3", "5", "6"],
        "category": category,
        "difficulty": difficulty,
    }


def test_get_questions_returns_cache_hit_without_upstream_call():
    repository = FakeQuestionCacheRepository([_cached_question()])
    client = FakeTriviaClient([])
    service = _service(repository, client)

    result = service.get_questions(filters=QuestionFilters(limit=1, categories=("Science",), difficulties=("easy",)))

    assert result.cache_hit is True
    assert len(result.questions) == 1
    assert client.calls == []


def test_get_questions_refills_cache_and_normalizes_response():
    repository = FakeQuestionCacheRepository()
    client = FakeTriviaClient([[_raw_question()]])
    service = _service(repository, client)

    result = service.get_questions(filters=QuestionFilters(limit=1))

    assert result.cache_hit is False
    assert len(result.questions) == 1
    assert result.questions[0].category == "Science"
    assert result.questions[0].difficulty == "easy"
    assert repository.upserted[0].external_id == "external-1"


def test_get_questions_discards_malformed_payload_items():
    repository = FakeQuestionCacheRepository()
    client = FakeTriviaClient(
        [[{"id": "broken", "incorrectAnswers": []}, _raw_question(external_id="external-2")]]
    )
    service = _service(repository, client)

    result = service.get_questions(filters=QuestionFilters(limit=1))

    assert len(result.questions) == 1
    assert len(repository.upserted) == 1
    assert repository.upserted[0].external_id == "external-2"


def test_get_questions_raises_payload_error_when_all_items_are_invalid():
    repository = FakeQuestionCacheRepository()
    client = FakeTriviaClient([[{"id": "broken"}], [{"id": "still-broken"}], [{"id": "broken-again"}]])
    service = _service(repository, client)

    with pytest.raises(TriviaUpstreamPayloadError):
        service.get_questions(filters=QuestionFilters(limit=1))


def test_get_questions_raises_insufficient_when_not_enough_valid_questions():
    repository = FakeQuestionCacheRepository()
    client = FakeTriviaClient([[_raw_question()], [_raw_question(external_id="external-2")], [_raw_question(external_id="external-3")]])
    service = _service(repository, client)

    with pytest.raises(TriviaInsufficientQuestionsError):
        service.get_questions(filters=QuestionFilters(limit=4))


def test_check_answer_uses_cached_question_by_internal_id():
    cached_question = _cached_question(question_id=uuid4())
    repository = FakeQuestionCacheRepository([cached_question])
    client = FakeTriviaClient([])
    service = _service(repository, client)

    assert service.check_answer(str(cached_question.id), "4") == (True, "4")
    assert service.check_answer(str(cached_question.id), "3") == (False, "4")
    assert service.check_answer("missing", "4") is None


def test_get_category_options_excludes_used_question_ids():
    science_questions = [_cached_question(external_id=f"s-{index}") for index in range(3)]
    history_questions = [
        _cached_question(external_id=f"h-{index}", category="History")
        for index in range(3)
    ]
    repository = FakeQuestionCacheRepository(science_questions + history_questions)
    client = FakeTriviaClient([])
    service = _service(repository, client)

    categories = service.get_category_options(
        option_count=2,
        questions_per_category=3,
        exclude_ids=(str(science_questions[0].id),),
    )

    assert categories == ["History"]
