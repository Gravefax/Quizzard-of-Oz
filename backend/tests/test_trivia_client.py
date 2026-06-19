import time

import httpx
import pybreaker
import pytest

from app.services.trivia_client import (
    TriviaApiClient,
    TriviaUpstreamPayloadError,
    TriviaUpstreamResponseError,
    TriviaUpstreamUnavailableError,
)
from app.services.trivia_types import QuestionFilters
from app.settings import load_trivia_settings

TRIVIA_ENV_KEYS = (
    "TRIVIA_API_BASE_URL",
    "TRIVIA_API_KEY",
    "TRIVIA_TIMEOUT_SECONDS",
    "TRIVIA_MAX_RETRIES",
    "TRIVIA_BACKOFF_SECONDS",
    "TRIVIA_REFILL_ATTEMPTS",
    "TRIVIA_REFILL_BATCH_SIZE",
    "TRIVIA_MAX_LIMIT",
    "TRIVIA_BREAKER_FAIL_MAX",
    "TRIVIA_BREAKER_RESET_TIMEOUT",
)


@pytest.fixture(autouse=True)
def clear_trivia_env(monkeypatch):
    for key in TRIVIA_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)


def _build_client(handler):
    settings = load_trivia_settings()
    transport = httpx.MockTransport(handler)
    http_client = httpx.Client(
        transport=transport,
        base_url=settings.api_base_url,
    )
    sleeps: list[float] = []
    client = TriviaApiClient(settings, client=http_client, sleeper=sleeps.append)
    return client, sleeps


def test_fetch_questions_maps_filters_and_query_params():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["request"] = request
        return httpx.Response(200, json=[{"id": "1"}])

    client, _ = _build_client(handler)
    payload = client.fetch_questions(
        QuestionFilters(
            limit=5,
            categories=("Science", "History"),
            difficulties=("easy", "hard"),
        )
    )

    assert payload == [{"id": "1"}]
    request = captured["request"]
    assert request.url.path == "/v2/questions"
    assert request.url.params["limit"] == "5"
    assert request.url.params["categories"] == "Science,History"
    assert request.url.params["difficulties"] == "easy,hard"
    assert "x-api-key" not in request.headers


def test_fetch_questions_omits_api_key_when_not_configured():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["request"] = request
        return httpx.Response(200, json=[])

    client, _ = _build_client(handler)
    client.fetch_questions(QuestionFilters(limit=1))

    assert "x-api-key" not in captured["request"].headers


def test_fetch_questions_retries_transient_transport_failures():
    attempts = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise httpx.ReadTimeout("timeout", request=request)
        return httpx.Response(200, json=[])

    client, sleeps = _build_client(handler)
    settings = client._settings
    payload = client.fetch_questions(QuestionFilters(limit=1))

    assert payload == []
    assert attempts["count"] == settings.max_retries + 1
    assert sleeps == [settings.backoff_seconds, settings.backoff_seconds * 2]


def test_fetch_questions_raises_for_non_retryable_http_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"detail": "bad request"})

    client, _ = _build_client(handler)

    with pytest.raises(TriviaUpstreamResponseError) as exc:
        client.fetch_questions(QuestionFilters(limit=1))

    assert exc.value.status_code == 400


def test_fetch_questions_raises_for_non_list_payload():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"unexpected": True})

    client, _ = _build_client(handler)

    with pytest.raises(TriviaUpstreamPayloadError):
        client.fetch_questions(QuestionFilters(limit=1))


def _build_client_with_breaker(handler, *, fail_max=2, reset_timeout=60.0):
    settings = load_trivia_settings()
    transport = httpx.MockTransport(handler)
    http_client = httpx.Client(transport=transport, base_url=settings.api_base_url)
    sleeps: list[float] = []
    breaker = pybreaker.CircuitBreaker(
        fail_max=fail_max,
        reset_timeout=reset_timeout,
        exclude=[TriviaUpstreamResponseError, TriviaUpstreamPayloadError],
        name="trivia_api_test",
    )
    client = TriviaApiClient(
        settings,
        client=http_client,
        sleeper=sleeps.append,
        breaker=breaker,
    )
    return client, breaker


def test_breaker_opens_after_consecutive_failures_and_fast_fails():
    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        raise httpx.ReadTimeout("timeout", request=request)

    client, breaker = _build_client_with_breaker(handler, fail_max=2)

    for _ in range(breaker.fail_max):
        with pytest.raises(TriviaUpstreamUnavailableError):
            client.fetch_questions(QuestionFilters(limit=1))

    assert breaker.current_state == "open"

    calls_before_short_circuit = calls["count"]
    with pytest.raises(TriviaUpstreamUnavailableError):
        client.fetch_questions(QuestionFilters(limit=1))

    # Open breaker short-circuits: no further upstream request is attempted.
    assert calls["count"] == calls_before_short_circuit


def test_breaker_recovers_after_cooldown():
    state = {"healthy": False}

    def handler(request: httpx.Request) -> httpx.Response:
        if not state["healthy"]:
            raise httpx.ReadTimeout("timeout", request=request)
        return httpx.Response(200, json=[])

    client, breaker = _build_client_with_breaker(handler, fail_max=2, reset_timeout=0.05)

    for _ in range(breaker.fail_max):
        with pytest.raises(TriviaUpstreamUnavailableError):
            client.fetch_questions(QuestionFilters(limit=1))
    assert breaker.current_state == "open"

    # Wait out the cooldown so the breaker transitions to half-open on the next call.
    state["healthy"] = True
    time.sleep(0.06)

    payload = client.fetch_questions(QuestionFilters(limit=1))

    assert payload == []
    assert breaker.current_state == "closed"


def test_non_retryable_response_error_does_not_trip_breaker():
    calls = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["count"] += 1
        return httpx.Response(400, json={"detail": "bad request"})

    client, breaker = _build_client_with_breaker(handler, fail_max=2)

    for _ in range(breaker.fail_max + 2):
        with pytest.raises(TriviaUpstreamResponseError):
            client.fetch_questions(QuestionFilters(limit=1))

    # Client errors are excluded from breaker accounting, so it stays closed and
    # keeps hitting the upstream instead of short-circuiting.
    assert breaker.current_state == "closed"
    assert calls["count"] == breaker.fail_max + 2


def test_trivia_settings_are_loaded_from_backend_env():
    settings = load_trivia_settings()

    assert settings.api_base_url == "https://the-trivia-api.com"
    assert settings.timeout_seconds == 5.0
    assert settings.max_retries == 2
    assert settings.backoff_seconds == 0.25
    assert settings.breaker_fail_max == 5
    assert settings.breaker_reset_timeout == 30.0
