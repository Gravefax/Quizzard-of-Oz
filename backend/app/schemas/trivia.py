from pydantic import BaseModel


class TriviaQuestionResponse(BaseModel):
    id: str
    text: str
    answers: list[str]
    category: str
    difficulty: str


class TriviaQuestionsMetaResponse(BaseModel):
    count: int
    requested_limit: int
    cache_hit: bool


class TriviaQuestionsResponse(BaseModel):
    questions: list[TriviaQuestionResponse]
    meta: TriviaQuestionsMetaResponse
