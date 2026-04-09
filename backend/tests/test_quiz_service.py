from unittest.mock import MagicMock

from app.services.quiz_service import QuizService
from app.services.trivia_types import Question, QuestionBatch


def test_get_questions_delegates_to_trivia_service():
    trivia_service = MagicMock()
    questions = [
        Question(
            id="q1",
            text="Test?",
            answers=["A", "B", "C", "D"],
            correct_answer="A",
            category="Science",
            difficulty="easy",
        )
    ]
    trivia_service.get_questions.return_value = QuestionBatch(
        questions=questions,
        requested_limit=5,
        cache_hit=False,
    )

    service = QuizService(trivia_service)
    result = service.get_questions(
        n=5,
        categories=["Science"],
        difficulties=["easy"],
        exclude_ids=("used-id",),
    )

    assert result == questions
    trivia_service.get_questions.assert_called_once()
    call_kwargs = trivia_service.get_questions.call_args.kwargs
    assert call_kwargs["exclude_ids"] == ("used-id",)
    assert call_kwargs["filters"].limit == 5
    assert call_kwargs["filters"].categories == ("Science",)
    assert call_kwargs["filters"].difficulties == ("easy",)


def test_check_answer_delegates_to_trivia_service():
    trivia_service = MagicMock()
    trivia_service.check_answer.return_value = (True, "A")

    service = QuizService(trivia_service)
    result = service.check_answer("question-id", "A")

    assert result == (True, "A")
    trivia_service.check_answer.assert_called_once_with("question-id", "A")


def test_get_category_options_delegates_to_trivia_service():
    trivia_service = MagicMock()
    trivia_service.get_category_options.return_value = ["Science", "History"]

    service = QuizService(trivia_service)
    result = service.get_category_options(
        option_count=2,
        questions_per_category=3,
        exclude_ids=("used-id",),
    )

    assert result == ["Science", "History"]
    trivia_service.get_category_options.assert_called_once_with(
        option_count=2,
        questions_per_category=3,
        exclude_ids=("used-id",),
    )
