from __future__ import annotations

import logging
import time
from typing import Any, Callable

import httpx

from app.settings import TriviaSettings
from app.services.trivia_types import QuestionFilters


TRIVIA_QUESTIONS_PATH = "/v2/questions"
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


class TriviaClientError(Exception):
    """Base error for Trivia API integration failures."""


class TriviaUpstreamUnavailableError(TriviaClientError):
    """Raised when the upstream is unavailable or times out."""


class TriviaUpstreamResponseError(TriviaClientError):
    """Raised when the upstream returns a non-retryable error response."""

    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code


class TriviaUpstreamPayloadError(TriviaClientError):
    """Raised when the upstream returns an unexpected payload shape."""


class TriviaApiClient:
    def __init__(
        self,
        settings: TriviaSettings,
        *,
        client: httpx.Client | None = None,
        sleeper: Callable[[float], None] = time.sleep,
        logger: logging.Logger | None = None,
    ) -> None:
        self._settings = settings
        self._logger = logger or logging.getLogger("uvicorn.error")
        self._sleeper = sleeper
        self._owns_client = client is None
        self._client = client or httpx.Client(
            base_url=self._settings.api_base_url.rstrip("/"),
            timeout=self._settings.timeout_seconds,
        )

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def fetch_questions(
        self,
        filters: QuestionFilters,
        *,
        limit_override: int | None = None,
    ) -> list[dict[str, Any]]:
        params = self._build_query_params(filters, limit_override=limit_override)
        attempts = self._settings.max_retries + 1

        for attempt in range(1, attempts + 1):
            self._logger.info(
                "Trivia upstream request attempt=%s limit=%s categories=%s difficulties=%s",
                attempt,
                params["limit"],
                params.get("categories", ""),
                params.get("difficulties", ""),
            )

            try:
                response = self._request_questions(params)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                if attempt < attempts:
                    self._log_retry("transport", attempt, attempts, exc)
                    self._sleep_before_retry(attempt)
                    continue
                raise TriviaUpstreamUnavailableError("Trivia API request failed") from exc

            if response.status_code in RETRYABLE_STATUS_CODES:
                if attempt < attempts:
                    self._log_retry(f"status_{response.status_code}", attempt, attempts)
                    self._sleep_before_retry(attempt)
                    continue
                raise TriviaUpstreamUnavailableError(
                    f"Trivia API unavailable with status {response.status_code}"
                )

            return self._parse_questions_payload(response)

        raise TriviaUpstreamUnavailableError("Trivia API request failed")

    def _build_headers(self) -> dict[str, str]:
        headers = {"accept": "application/json"}
        if self._settings.api_key:
            headers["x-api-key"] = self._settings.api_key
        return headers

    @staticmethod
    def _build_query_params(
        filters: QuestionFilters,
        *,
        limit_override: int | None = None,
    ) -> dict[str, str]:
        params = {"limit": str(limit_override or filters.limit)}

        if filters.categories:
            params["categories"] = ",".join(filters.categories)

        if filters.difficulties:
            params["difficulties"] = ",".join(filters.difficulties)

        return params

    def _sleep_before_retry(self, attempt: int) -> None:
        if self._settings.backoff_seconds <= 0:
            return

        self._sleeper(self._settings.backoff_seconds * (2 ** (attempt - 1)))

    def _request_questions(self, params: dict[str, str]) -> httpx.Response:
        return self._client.get(
            TRIVIA_QUESTIONS_PATH,
            params=params,
            headers=self._build_headers(),
        )

    @staticmethod
    def _parse_questions_payload(response: httpx.Response) -> list[dict[str, Any]]:
        if response.status_code >= 400:
            raise TriviaUpstreamResponseError(
                response.status_code,
                f"Trivia API returned status {response.status_code}",
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise TriviaUpstreamPayloadError("Trivia API returned invalid JSON") from exc

        if not isinstance(payload, list):
            raise TriviaUpstreamPayloadError("Trivia API returned a non-list payload")

        return payload

    def _log_retry(
        self,
        reason: str,
        attempt: int,
        attempts: int,
        exc: Exception | None = None,
    ) -> None:
        self._logger.warning(
            "Trivia upstream retry scheduled reason=%s attempt=%s max_attempts=%s error=%s",
            reason,
            attempt,
            attempts,
            exc,
        )
