from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from app.crud.question_cache import QuestionCacheRepository
from app.services.trivia_types import CachedQuestionRecord, QuestionFilters


class FakeQuery:
    def __init__(self, *, all_result=None, first_result=None):
        self.all_result = list(all_result or [])
        self.first_result = first_result
        self.filters = []
        self.order_by_args = []
        self.limit_value = None
        self.group_by_args = []
        self.having_args = []

    def filter(self, *args):
        self.filters.extend(args)
        return self

    def order_by(self, *args):
        self.order_by_args.extend(args)
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def group_by(self, *args):
        self.group_by_args.extend(args)
        return self

    def having(self, *args):
        self.having_args.extend(args)
        return self

    def all(self):
        return list(self.all_result)

    def first(self):
        return self.first_result


def _cached_record(*, external_id: str, category: str = "Science", difficulty: str = "easy"):
    return CachedQuestionRecord(
        external_id=external_id,
        text=f"{external_id}?",
        answers=["A", "B", "C", "D"],
        correct_answer="A",
        category=category,
        difficulty=difficulty,
    )


def test_get_random_questions_applies_filters_exclusions_and_limit():
    repository = QuestionCacheRepository()
    query = FakeQuery(all_result=["q1", "q2"])
    db = MagicMock()
    db.query.return_value = query
    excluded_id = str(uuid4())

    result = repository.get_random_questions(
        db,
        filters=QuestionFilters(limit=2, categories=("Science",), difficulties=("Easy",)),
        limit=2,
        exclude_ids=(excluded_id, "not-a-uuid"),
    )

    assert result == ["q1", "q2"]
    assert len(query.filters) == 3
    assert query.limit_value == 2
    assert len(query.order_by_args) == 1


def test_get_question_returns_none_for_invalid_uuid():
    repository = QuestionCacheRepository()

    assert repository.get_question(MagicMock(), "not-a-uuid") is None


def test_get_question_returns_first_matching_record():
    repository = QuestionCacheRepository()
    expected = object()
    query = FakeQuery(first_result=expected)
    db = MagicMock()
    db.query.return_value = query

    result = repository.get_question(db, str(uuid4()))

    assert result is expected
    assert len(query.filters) == 1


def test_upsert_questions_returns_empty_list_when_no_questions():
    repository = QuestionCacheRepository()
    db = MagicMock()

    result = repository.upsert_questions(db, [])

    assert result == []
    db.commit.assert_not_called()


def test_upsert_questions_creates_and_updates_records():
    repository = QuestionCacheRepository()
    existing = SimpleNamespace(
        external_id="existing",
        question_text="old",
        answers=["X"],
        correct_answer="X",
        category="Old",
        difficulty="hard",
        cached_at=None,
    )
    existing_query = FakeQuery(all_result=[existing])
    db = MagicMock()
    db.query.return_value = existing_query
    records = [
        _cached_record(external_id="existing", category="Science", difficulty="easy"),
        _cached_record(external_id="new", category="History", difficulty="medium"),
        _cached_record(external_id="new", category="Duplicate", difficulty="hard"),
    ]

    persisted = repository.upsert_questions(db, records)

    assert len(persisted) == 2
    assert existing.question_text == "existing?"
    assert existing.answers == ["A", "B", "C", "D"]
    assert existing.correct_answer == "A"
    assert existing.category == "Science"
    assert existing.difficulty == "easy"
    assert isinstance(existing.cached_at, datetime)
    assert db.add.call_count == 2
    db.commit.assert_called_once_with()


def test_get_categories_with_minimum_questions_applies_having_and_exclusions():
    repository = QuestionCacheRepository()
    query = FakeQuery(all_result=[("Science",), ("History",)])
    db = MagicMock()
    db.query.return_value = query

    result = repository.get_categories_with_minimum_questions(
        db,
        minimum_questions=3,
        exclude_ids=(str(uuid4()), "invalid"),
    )

    assert result == ["Science", "History"]
    assert len(query.group_by_args) == 1
    assert len(query.having_args) == 1
    assert len(query.filters) == 1


def test_parse_ids_ignores_invalid_values():
    valid_id = uuid4()

    result = QuestionCacheRepository._parse_ids((str(valid_id), "bad-id"))

    assert result == [valid_id]
