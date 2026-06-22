from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.dtos.trivia_types import QuestionFilters
from app.services import trivia_service as trivia_service_module
from app.services.trivia_client import TriviaUpstreamPayloadError, TriviaUpstreamResponseError
from app.services.trivia_service import TriviaInsufficientQuestionsError, TriviaQuestionService
from app.settings import load_trivia_settings


class FakeSession:
    def close(self) -> None:
        return None


class FakeTriviaClient:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def fetch_questions(self, filters, *, limit_override=None):
        self.calls.append({"filters": filters, "limit_override": limit_override})
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


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


def _cached_questions_for_category(category: str, prefix: str, count: int = 3):
    return [
        _cached_question(external_id=f"{prefix}-{index}", category=category)
        for index in range(count)
    ]


def _raw_questions_for_category(category: str, prefix: str, count: int = 3):
    return [
        _raw_question(external_id=f"{prefix}-{index}", category=category)
        for index in range(count)
    ]


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


def test_prepare_category_pool_fetches_questions_for_each_missing_public_category(monkeypatch):
    monkeypatch.setattr(
        trivia_service_module,
        "TRIVIA_PUBLIC_CATEGORY_FILTERS",
        ("Science", "History"),
    )
    repository = FakeQuestionCacheRepository()
    client = FakeTriviaClient(
        [
            _raw_questions_for_category("Science", "s"),
            _raw_questions_for_category("History", "h"),
        ]
    )
    service = _service(repository, client)

    service.prepare_category_pool(questions_per_category=3)

    assert [call["filters"].categories for call in client.calls] == [
        ("Science",),
        ("History",),
    ]
    assert [call["limit_override"] for call in client.calls] == [3, 3]
    assert {
        question.category
        for question in repository.questions
    } == {"Science", "History"}


def test_prepare_category_pool_skips_categories_that_are_already_ready(monkeypatch):
    monkeypatch.setattr(
        trivia_service_module,
        "TRIVIA_PUBLIC_CATEGORY_FILTERS",
        ("Science", "History"),
    )
    repository = FakeQuestionCacheRepository(
        _cached_questions_for_category("Science", "s")
    )
    client = FakeTriviaClient([_raw_questions_for_category("History", "h")])
    service = _service(repository, client)

    service.prepare_category_pool(questions_per_category=3)

    assert [call["filters"].categories for call in client.calls] == [("History",)]
    assert {
        question.category
        for question in repository.questions
    } == {"Science", "History"}


def test_prepare_category_pool_continues_when_one_category_seed_fails(monkeypatch):
    monkeypatch.setattr(
        trivia_service_module,
        "TRIVIA_PUBLIC_CATEGORY_FILTERS",
        ("Science", "History"),
    )
    repository = FakeQuestionCacheRepository()
    client = FakeTriviaClient(
        [
            TriviaUpstreamResponseError(400, "unsupported category"),
            _raw_questions_for_category("History", "h"),
        ]
    )
    service = _service(repository, client)

    service.prepare_category_pool(questions_per_category=3)

    assert [call["filters"].categories for call in client.calls] == [
        ("Science",),
        ("History",),
    ]
    assert {
        question.category
        for question in repository.questions
    } == {"History"}


def test_get_category_options_returns_all_available_categories():
    science_questions = _cached_questions_for_category("Science", "s")
    history_questions = _cached_questions_for_category("History", "h")
    repository = FakeQuestionCacheRepository(science_questions + history_questions)
    client = FakeTriviaClient([])
    service = _service(repository, client)

    categories = service.get_category_options(
        option_count=2,
        questions_per_category=3,
    )

    assert categories == ["Science", "History"]


def test_get_category_options_stays_at_three_unique_categories_after_repeated_selections():
    category_questions = {
        "Science": _cached_questions_for_category("Science", "s"),
        "History": _cached_questions_for_category("History", "h"),
        "Sports": _cached_questions_for_category("Sports", "sp"),
    }
    repository = FakeQuestionCacheRepository(
        [
            question
            for questions in category_questions.values()
            for question in questions
        ]
    )
    client = FakeTriviaClient([])
    service = _service(repository, client)

    for _ in ("Science", "History", "Sports"):
        categories = service.get_category_options(
            option_count=3,
            questions_per_category=3,
        )

        assert len(categories) == 3
        assert len({category.casefold() for category in categories}) == 3
        assert set(categories) == {"Science", "History", "Sports"}


def test_get_category_options_returns_available_unique_categories_when_fewer_than_requested():
    science_questions = _cached_questions_for_category("Science", "s")
    history_questions = _cached_questions_for_category("History", "h")
    repository = FakeQuestionCacheRepository(science_questions + history_questions)
    client = FakeTriviaClient([[], [], []])
    service = _service(repository, client)

    categories = service.get_category_options(
        option_count=3,
        questions_per_category=3,
    )

    assert categories == ["Science", "History"]


def test_get_category_options_prefers_categories_that_were_not_recently_offered():
    repository = FakeQuestionCacheRepository(
        [
            *_cached_questions_for_category("Science", "s"),
            *_cached_questions_for_category("History", "h"),
            *_cached_questions_for_category("Sports", "sp"),
            *_cached_questions_for_category("Art", "a"),
            *_cached_questions_for_category("Movies", "m"),
            *_cached_questions_for_category("Music", "mu"),
        ]
    )
    client = FakeTriviaClient([])
    service = _service(repository, client)

    first_offer = service.get_category_options(
        option_count=3,
        questions_per_category=3,
    )
    second_offer = service.get_category_options(
        option_count=3,
        questions_per_category=3,
        avoid_categories=tuple(first_offer),
    )

    assert len(first_offer) == 3
    assert len(second_offer) == 3
    assert len({category.casefold() for category in second_offer}) == 3
    assert set(first_offer).isdisjoint(second_offer)


def test_get_category_options_refills_to_find_fresh_categories():
    repository = FakeQuestionCacheRepository(
        [
            *_cached_questions_for_category("Science", "s"),
            *_cached_questions_for_category("History", "h"),
            *_cached_questions_for_category("Sports", "sp"),
        ]
    )
    client = FakeTriviaClient(
        [
            [
                *_raw_questions_for_category("Art", "a"),
                *_raw_questions_for_category("Movies", "m"),
                *_raw_questions_for_category("Music", "mu"),
            ]
        ]
    )
    service = _service(repository, client)

    categories = service.get_category_options(
        option_count=3,
        questions_per_category=3,
        avoid_categories=("Science", "History", "Sports"),
    )

    assert categories == ["Art", "Movies", "Music"]
    assert len(client.calls) == 1


def test_get_category_options_falls_back_to_repeats_when_no_fresh_categories_exist():
    repository = FakeQuestionCacheRepository(
        [
            *_cached_questions_for_category("Science", "s"),
            *_cached_questions_for_category("History", "h"),
            *_cached_questions_for_category("Sports", "sp"),
        ]
    )
    client = FakeTriviaClient([[], [], []])
    service = _service(repository, client)

    categories = service.get_category_options(
        option_count=3,
        questions_per_category=3,
        avoid_categories=("Science", "History", "Sports"),
    )

    assert len(categories) == 3
    assert len({category.casefold() for category in categories}) == 3
    assert set(categories) == {"Science", "History", "Sports"}


def test_get_category_options_deduplicates_category_names():
    repository = FakeQuestionCacheRepository(
        [
            *_cached_questions_for_category("Science", "s"),
            *_cached_questions_for_category("science", "sl"),
            *_cached_questions_for_category("History", "h"),
            *_cached_questions_for_category("Sports", "sp"),
        ]
    )
    client = FakeTriviaClient([])
    service = _service(repository, client)

    categories = service.get_category_options(
        option_count=3,
        questions_per_category=3,
    )

    assert categories == ["Science", "History", "Sports"]
