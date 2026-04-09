from __future__ import annotations

from functools import lru_cache

from app.services.trivia_service import TriviaQuestionService, get_trivia_question_service
from app.services.trivia_types import Question, QuestionFilters


class QuizService:
    def __init__(self, trivia_service: TriviaQuestionService | None = None) -> None:
        self._trivia_service = trivia_service or get_trivia_question_service()

    def get_questions(
        self,
        n: int | None = None,
        *,
        categories: list[str] | tuple[str, ...] | None = None,
        difficulties: list[str] | tuple[str, ...] | None = None,
        exclude_ids: tuple[str, ...] = (),
    ) -> list[Question]:
        filters = QuestionFilters(
            limit=n or 10,
            categories=tuple(categories or ()),
            difficulties=tuple(difficulties or ()),
        )
        return self._trivia_service.get_questions(filters=filters, exclude_ids=exclude_ids).questions

    def get_question(self, question_id: str) -> Question | None:
        return self._trivia_service.get_question(question_id)

    def check_answer(self, question_id: str, answer: str) -> tuple[bool, str] | None:
        return self._trivia_service.check_answer(question_id, answer)

    def get_category_options(
        self,
        *,
        option_count: int,
        questions_per_category: int,
        exclude_ids: tuple[str, ...] = (),
    ) -> list[str]:
        return self._trivia_service.get_category_options(
            option_count=option_count,
            questions_per_category=questions_per_category,
            exclude_ids=exclude_ids,
        )


@lru_cache
def get_quiz_service() -> QuizService:
    return QuizService()
