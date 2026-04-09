from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.services.quiz_service import QuizService, get_quiz_service
from app.services.trivia_client import (
    TriviaUpstreamPayloadError,
    TriviaUpstreamResponseError,
    TriviaUpstreamUnavailableError,
)
from app.services.trivia_service import TriviaInsufficientQuestionsError

router = APIRouter(prefix="/quiz", tags=["quiz"])


class QuestionResponse(BaseModel):
    id: str
    text: str
    answers: list[str]
    category: str


class AnswerRequest(BaseModel):
    question_id: str
    answer: str


class AnswerResponse(BaseModel):
    correct: bool
    correct_answer: str


def get_quiz_service_dependency() -> QuizService:
    return get_quiz_service()


@router.get(
    "/practice/questions",
    response_model=list[QuestionResponse],
    responses={
        502: {"description": "Trivia upstream returned an invalid response"},
        503: {"description": "Trivia questions are temporarily unavailable"},
    },
)
def get_practice_questions(
    service: Annotated[QuizService, Depends(get_quiz_service_dependency)],
):
    try:
        questions = service.get_questions(n=10)
    except TriviaInsufficientQuestionsError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except TriviaUpstreamUnavailableError as exc:
        raise HTTPException(status_code=503, detail="Trivia API is currently unavailable") from exc
    except (TriviaUpstreamResponseError, TriviaUpstreamPayloadError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return [
        QuestionResponse(
            id=q.id,
            text=q.text,
            answers=q.answers,
            category=q.category,
        )
        for q in questions
    ]


@router.post(
    "/practice/answer",
    response_model=AnswerResponse,
    responses={404: {"description": "Question not found"}},
)
def check_answer(
    body: AnswerRequest,
    service: Annotated[QuizService, Depends(get_quiz_service_dependency)],
):
    result = service.check_answer(body.question_id, body.answer)
    if result is None:
        raise HTTPException(status_code=404, detail="Question not found")
    correct, correct_answer = result
    return AnswerResponse(correct=correct, correct_answer=correct_answer)
