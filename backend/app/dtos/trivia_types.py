from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Question:
    id: str
    text: str
    answers: list[str]
    correct_answer: str
    category: str
    difficulty: str = ""


@dataclass(frozen=True)
class CachedQuestionRecord:
    external_id: str
    text: str
    answers: list[str]
    correct_answer: str
    category: str
    difficulty: str


@dataclass(frozen=True)
class QuestionFilters:
    limit: int = 10
    categories: tuple[str, ...] = field(default_factory=tuple)
    difficulties: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class QuestionBatch:
    questions: list[Question]
    requested_limit: int
    cache_hit: bool
