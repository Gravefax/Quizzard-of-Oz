from __future__ import annotations

import logging
import random
from contextlib import contextmanager
from functools import lru_cache
from typing import Any, Iterator

from sqlalchemy.orm import Session

from app.crud.question_cache import QuestionCacheRepository
from app.database import SessionLocal
from app.models.question_cache import QuestionCache
from app.settings import TriviaSettings, get_trivia_settings
from app.services.trivia_client import TriviaApiClient, TriviaUpstreamPayloadError
from app.services.trivia_types import CachedQuestionRecord, Question, QuestionBatch, QuestionFilters


VALID_DIFFICULTIES = {"easy", "medium", "hard"}
_secure_rng = random.SystemRandom()


class TriviaInsufficientQuestionsError(Exception):
    """Raised when the cache cannot satisfy a question request after refills."""


class TriviaQuestionService:
    def __init__(
        self,
        *,
        client: TriviaApiClient,
        repository: QuestionCacheRepository,
        session_factory,
        settings: TriviaSettings,
        logger: logging.Logger | None = None,
        rng: random.Random | None = None,
    ) -> None:
        self._client = client
        self._repository = repository
        self._session_factory = session_factory
        self._settings = settings
        self._logger = logger or logging.getLogger("uvicorn.error")
        self._rng = rng or _secure_rng

    def get_questions(
        self,
        *,
        filters: QuestionFilters,
        exclude_ids: tuple[str, ...] = (),
        db: Session | None = None,
    ) -> QuestionBatch:
        with self._session_scope(db) as session:
            cached_questions = self._repository.get_random_questions(
                session,
                filters=filters,
                limit=filters.limit,
                exclude_ids=exclude_ids,
            )

            if len(cached_questions) >= filters.limit:
                self._logger.info(
                    "Trivia cache hit requested_limit=%s count=%s categories=%s difficulties=%s",
                    filters.limit,
                    len(cached_questions),
                    list(filters.categories),
                    list(filters.difficulties),
                )
                return QuestionBatch(
                    questions=[self._to_question(question) for question in cached_questions],
                    requested_limit=filters.limit,
                    cache_hit=True,
                )

            self._logger.info(
                "Trivia cache refill required requested_limit=%s cached_count=%s categories=%s difficulties=%s",
                filters.limit,
                len(cached_questions),
                list(filters.categories),
                list(filters.difficulties),
            )

            saw_invalid_items = False
            valid_records_added = 0
            refill_limit = max(filters.limit, self._settings.refill_batch_size)

            for attempt in range(1, self._settings.refill_attempts + 1):
                raw_questions = self._client.fetch_questions(filters, limit_override=refill_limit)
                normalized_questions = self._normalize_questions(raw_questions)
                saw_invalid_items = saw_invalid_items or len(normalized_questions) < len(raw_questions)
                valid_records_added += len(normalized_questions)

                self._logger.info(
                    "Trivia cache refill attempt=%s upstream_count=%s normalized_count=%s",
                    attempt,
                    len(raw_questions),
                    len(normalized_questions),
                )

                self._repository.upsert_questions(session, normalized_questions)
                cached_questions = self._repository.get_random_questions(
                    session,
                    filters=filters,
                    limit=filters.limit,
                    exclude_ids=exclude_ids,
                )

                if len(cached_questions) >= filters.limit:
                    return QuestionBatch(
                        questions=[self._to_question(question) for question in cached_questions],
                        requested_limit=filters.limit,
                        cache_hit=False,
                    )

            if valid_records_added == 0 and saw_invalid_items:
                raise TriviaUpstreamPayloadError("Trivia API returned no valid questions")

            raise TriviaInsufficientQuestionsError(
                f"Only {len(cached_questions)} cached questions matched the requested filters"
            )

    def get_question(self, question_id: str, *, db: Session | None = None) -> Question | None:
        with self._session_scope(db) as session:
            cached_question = self._repository.get_question(session, question_id)
            if cached_question is None:
                return None
            return self._to_question(cached_question)

    def check_answer(
        self,
        question_id: str,
        answer: str,
        *,
        db: Session | None = None,
    ) -> tuple[bool, str] | None:
        question = self.get_question(question_id, db=db)
        if question is None:
            return None
        return (answer == question.correct_answer, question.correct_answer)

    def get_category_options(
        self,
        *,
        option_count: int,
        questions_per_category: int,
        exclude_ids: tuple[str, ...] = (),
        db: Session | None = None,
    ) -> list[str]:
        with self._session_scope(db) as session:
            categories = self._repository.get_categories_with_minimum_questions(
                session,
                minimum_questions=questions_per_category,
                exclude_ids=exclude_ids,
            )
            if categories:
                return self._sample_categories(categories, option_count)

            generic_limit = max(
                option_count * questions_per_category,
                self._settings.refill_batch_size,
            )
            generic_filters = QuestionFilters(limit=generic_limit)

            for attempt in range(1, self._settings.refill_attempts + 1):
                raw_questions = self._client.fetch_questions(
                    generic_filters,
                    limit_override=generic_limit,
                )
                normalized_questions = self._normalize_questions(raw_questions)
                self._repository.upsert_questions(session, normalized_questions)

                categories = self._repository.get_categories_with_minimum_questions(
                    session,
                    minimum_questions=questions_per_category,
                    exclude_ids=exclude_ids,
                )
                if categories:
                    self._logger.info(
                        "Trivia categories prepared attempt=%s available_categories=%s",
                        attempt,
                        len(categories),
                    )
                    return self._sample_categories(categories, option_count)

            raise TriviaInsufficientQuestionsError("No categories with enough cached questions are available")

    def _normalize_questions(self, raw_questions: list[dict[str, Any]]) -> list[CachedQuestionRecord]:
        normalized_questions: list[CachedQuestionRecord] = []

        for raw_question in raw_questions:
            normalized_question = self._normalize_question(raw_question)
            if normalized_question is None:
                continue
            normalized_questions.append(normalized_question)

        return normalized_questions

    def _normalize_question(self, raw_question: Any) -> CachedQuestionRecord | None:
        if not isinstance(raw_question, dict):
            self._logger.warning("Trivia payload item skipped reason=not_object")
            return None

        external_id = self._clean_string(raw_question.get("id"))
        category = self._clean_string(raw_question.get("category"))
        correct_answer = self._clean_string(raw_question.get("correctAnswer"))
        question_text = self._extract_question_text(raw_question.get("question"))
        difficulty = self._clean_string(raw_question.get("difficulty")).lower()

        incorrect_answers = raw_question.get("incorrectAnswers")
        if (
            not external_id
            or not category
            or not correct_answer
            or not question_text
            or difficulty not in VALID_DIFFICULTIES
            or not isinstance(incorrect_answers, list)
            or len(incorrect_answers) != 3
        ):
            self._logger.warning(
                "Trivia payload item skipped reason=missing_or_invalid_fields external_id=%s",
                external_id,
            )
            return None

        cleaned_incorrect_answers = [self._clean_string(answer) for answer in incorrect_answers]
        if any(not answer for answer in cleaned_incorrect_answers):
            self._logger.warning(
                "Trivia payload item skipped reason=invalid_answer_option external_id=%s",
                external_id,
            )
            return None

        shuffled_answers = cleaned_incorrect_answers + [correct_answer]
        deduped_answers = {answer.casefold() for answer in shuffled_answers}
        if len(deduped_answers) != 4:
            self._logger.warning(
                "Trivia payload item skipped reason=duplicate_answers external_id=%s",
                external_id,
            )
            return None

        self._rng.shuffle(shuffled_answers)

        return CachedQuestionRecord(
            external_id=external_id,
            text=question_text,
            answers=shuffled_answers,
            correct_answer=correct_answer,
            category=category,
            difficulty=difficulty,
        )

    @staticmethod
    def _extract_question_text(raw_question_text: Any) -> str:
        if isinstance(raw_question_text, str):
            return raw_question_text.strip()

        if isinstance(raw_question_text, dict):
            text = raw_question_text.get("text")
            if isinstance(text, str):
                return text.strip()

        return ""

    @staticmethod
    def _clean_string(value: Any) -> str:
        if not isinstance(value, str):
            return ""
        return value.strip()

    @staticmethod
    def _to_question(question: QuestionCache) -> Question:
        return Question(
            id=str(question.id),
            text=question.question_text,
            answers=list(question.answers),
            correct_answer=question.correct_answer,
            category=question.category,
            difficulty=question.difficulty,
        )

    def _sample_categories(self, categories: list[str], option_count: int) -> list[str]:
        if len(categories) <= option_count:
            return list(categories)
        return self._rng.sample(categories, option_count)

    @contextmanager
    def _session_scope(self, db: Session | None) -> Iterator[Session]:
        if db is not None:
            yield db
            return

        session = self._session_factory()
        try:
            yield session
        finally:
            session.close()


@lru_cache
def get_question_cache_repository() -> QuestionCacheRepository:
    return QuestionCacheRepository()


@lru_cache
def get_trivia_api_client() -> TriviaApiClient:
    return TriviaApiClient(get_trivia_settings())


@lru_cache
def get_trivia_question_service() -> TriviaQuestionService:
    return TriviaQuestionService(
        client=get_trivia_api_client(),
        repository=get_question_cache_repository(),
        session_factory=SessionLocal,
        settings=get_trivia_settings(),
    )


def close_trivia_resources() -> None:
    if get_trivia_api_client.cache_info().currsize:
        get_trivia_api_client().close()
