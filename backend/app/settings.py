from __future__ import annotations

import json
import os
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_FILE = os.path.join(BACKEND_ROOT, ".env")


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        extra="ignore",
    )

    cors_origins: list[str] = Field(default=["http://localhost:3000", "https://localhost:3443"])

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return json.loads(v)
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


def load_app_settings(env_file: str | None = None) -> AppSettings:
    return AppSettings(_env_file=env_file or ENV_FILE)  # type: ignore[call-arg]


@lru_cache
def get_app_settings() -> AppSettings:
    return load_app_settings()


class TriviaSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        env_prefix="TRIVIA_",
        extra="ignore",
    )

    api_base_url: str = "https://the-trivia-api.com"
    api_key: str | None = None
    timeout_seconds: float = Field(default=5.0, gt=0)
    max_retries: int = Field(default=2, ge=0)
    backoff_seconds: float = Field(default=0.25, ge=0)
    refill_attempts: int = Field(default=3, ge=1)
    refill_batch_size: int = Field(default=20, ge=1)
    max_limit: int = Field(default=50, ge=1)


def load_trivia_settings(env_file: str | None = None) -> TriviaSettings:
    return TriviaSettings(_env_file=env_file or ENV_FILE)  # type: ignore[call-arg]


@lru_cache
def get_trivia_settings() -> TriviaSettings:
    return load_trivia_settings()
