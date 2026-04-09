from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.question_cache import QuestionCache
from app.services.trivia_types import CachedQuestionRecord, QuestionFilters


class QuestionCacheRepository:
    def get_random_questions(
        self,
        db: Session,
        *,
        filters: QuestionFilters,
        limit: int,
        exclude_ids: tuple[str, ...] = (),
    ) -> list[QuestionCache]:
        query = db.query(QuestionCache)

        if filters.categories:
            query = query.filter(
                func.lower(QuestionCache.category).in_(
                    [category.lower() for category in filters.categories]
                )
            )

        if filters.difficulties:
            query = query.filter(
                func.lower(QuestionCache.difficulty).in_(
                    [difficulty.lower() for difficulty in filters.difficulties]
                )
            )

        parsed_exclude_ids = self._parse_ids(exclude_ids)
        if parsed_exclude_ids:
            query = query.filter(~QuestionCache.id.in_(parsed_exclude_ids))

        return query.order_by(func.random()).limit(limit).all()

    def get_question(self, db: Session, question_id: str) -> QuestionCache | None:
        try:
            parsed_question_id = UUID(str(question_id))
        except ValueError:
            return None

        return db.query(QuestionCache).filter(QuestionCache.id == parsed_question_id).first()

    def upsert_questions(
        self,
        db: Session,
        questions: list[CachedQuestionRecord],
    ) -> list[QuestionCache]:
        if not questions:
            return []

        deduped_questions: dict[str, CachedQuestionRecord] = {
            question.external_id: question for question in questions
        }
        existing_questions = {
            question.external_id: question
            for question in db.query(QuestionCache)
            .filter(QuestionCache.external_id.in_(list(deduped_questions)))
            .all()
        }

        persisted_questions: list[QuestionCache] = []
        now = datetime.now(timezone.utc)

        for question in deduped_questions.values():
            cached_question = existing_questions.get(question.external_id)

            if cached_question is None:
                cached_question = QuestionCache(
                    external_id=question.external_id,
                    question_text=question.text,
                    answers=question.answers,
                    correct_answer=question.correct_answer,
                    category=question.category,
                    difficulty=question.difficulty,
                    cached_at=now,
                )
            else:
                cached_question.question_text = question.text
                cached_question.answers = question.answers
                cached_question.correct_answer = question.correct_answer
                cached_question.category = question.category
                cached_question.difficulty = question.difficulty
                cached_question.cached_at = now

            db.add(cached_question)
            persisted_questions.append(cached_question)

        db.commit()
        return persisted_questions

    def get_categories_with_minimum_questions(
        self,
        db: Session,
        *,
        minimum_questions: int,
        exclude_ids: tuple[str, ...] = (),
    ) -> list[str]:
        query = db.query(QuestionCache.category).group_by(QuestionCache.category)

        parsed_exclude_ids = self._parse_ids(exclude_ids)
        if parsed_exclude_ids:
            query = query.filter(~QuestionCache.id.in_(parsed_exclude_ids))

        query = query.having(func.count(QuestionCache.id) >= minimum_questions)
        return [row[0] for row in query.all()]

    @staticmethod
    def _parse_ids(ids_to_parse: tuple[str, ...]) -> list[UUID]:
        parsed_ids: list[UUID] = []

        for item in ids_to_parse:
            try:
                parsed_ids.append(UUID(str(item)))
            except ValueError:
                continue

        return parsed_ids
