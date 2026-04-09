from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from app.schemas.trivia import (
    TriviaQuestionResponse,
    TriviaQuestionsMetaResponse,
    TriviaQuestionsResponse,
)
from app.services.trivia_client import (
    TriviaUpstreamPayloadError,
    TriviaUpstreamResponseError,
    TriviaUpstreamUnavailableError,
)
from app.services.trivia_service import (
    TriviaInsufficientQuestionsError,
    TriviaQuestionService,
    get_trivia_question_service,
)
from app.services.trivia_types import QuestionFilters


router = APIRouter(prefix="/api/trivia", tags=["trivia"])

_ALLOWED_QUERY_PARAMS = {"limit", "categories", "difficulties", "query"}
_VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def get_trivia_question_service_dependency() -> TriviaQuestionService:
    return get_trivia_question_service()


def parse_trivia_question_filters(request: Request) -> QuestionFilters:
    query_params = request.query_params
    unknown_params = sorted(set(query_params.keys()) - _ALLOWED_QUERY_PARAMS)
    if unknown_params:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported query parameters: {', '.join(unknown_params)}",
        )

    if "query" in query_params:
        raise HTTPException(status_code=400, detail="The query parameter is not supported in v1")

    limit_values = query_params.getlist("limit")
    if len(limit_values) > 1:
        raise HTTPException(status_code=400, detail="limit may only be provided once")

    if limit_values:
        raw_limit = limit_values[0].strip()
        if not raw_limit:
            raise HTTPException(status_code=400, detail="limit must not be empty")
        try:
            limit = int(raw_limit)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="limit must be an integer") from exc
        if limit < 1 or limit > 50:
            raise HTTPException(status_code=400, detail="limit must be between 1 and 50")
    else:
        limit = 10

    categories = _parse_multi_value_query(query_params, "categories")
    difficulties = [difficulty.lower() for difficulty in _parse_multi_value_query(query_params, "difficulties")]

    invalid_difficulties = sorted(set(difficulties) - _VALID_DIFFICULTIES)
    if invalid_difficulties:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported difficulties: {', '.join(invalid_difficulties)}",
        )

    return QuestionFilters(
        limit=limit,
        categories=tuple(categories),
        difficulties=tuple(difficulties),
    )


@router.get(
    "/questions",
    response_model=TriviaQuestionsResponse,
    responses={
        400: {"description": "Invalid query parameters"},
        502: {"description": "Unexpected upstream response"},
        503: {"description": "Upstream unavailable"},
    },
)
def get_trivia_questions(
    filters: Annotated[QuestionFilters, Depends(parse_trivia_question_filters)],
    service: Annotated[TriviaQuestionService, Depends(get_trivia_question_service_dependency)],
):
    try:
        batch = service.get_questions(filters=filters)
    except TriviaInsufficientQuestionsError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except TriviaUpstreamUnavailableError as exc:
        raise HTTPException(status_code=503, detail="Trivia API is currently unavailable") from exc
    except (TriviaUpstreamResponseError, TriviaUpstreamPayloadError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return TriviaQuestionsResponse(
        questions=[
            TriviaQuestionResponse(
                id=question.id,
                text=question.text,
                answers=question.answers,
                category=question.category,
                difficulty=question.difficulty,
            )
            for question in batch.questions
        ],
        meta=TriviaQuestionsMetaResponse(
            count=len(batch.questions),
            requested_limit=batch.requested_limit,
            cache_hit=batch.cache_hit,
        ),
    )


def _parse_multi_value_query(request_query, key: str) -> list[str]:
    raw_values = request_query.getlist(key)
    if not raw_values:
        return []

    parsed_values: list[str] = []

    for raw_value in raw_values:
        for item in raw_value.split(","):
            cleaned_item = item.strip()
            if not cleaned_item:
                raise HTTPException(status_code=400, detail=f"{key} must not contain empty values")
            if cleaned_item.casefold() not in {existing.casefold() for existing in parsed_values}:
                parsed_values.append(cleaned_item)

    return parsed_values
