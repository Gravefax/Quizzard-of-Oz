# Backend

## Environment

Required database variables:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `POSTGRES_HOST`

Trivia integration variables:

- `TRIVIA_API_BASE_URL`
  Default: `https://the-trivia-api.com`
- `TRIVIA_API_KEY`
  Optional. When unset, the backend omits the `x-api-key` header and relies on the Trivia API's documented noncommercial public access.
- `TRIVIA_TIMEOUT_SECONDS`
- `TRIVIA_MAX_RETRIES`
- `TRIVIA_BACKOFF_SECONDS`
- `TRIVIA_REFILL_ATTEMPTS`
- `TRIVIA_REFILL_BATCH_SIZE`
- `TRIVIA_MAX_LIMIT`

Copy `backend/.env.example` to `backend/.env` and adjust values for your machine.

## Local Run

From `backend/`:

```powershell
python -m uvicorn main:app --reload
```

Run tests with:

```powershell
python -m pytest tests -q
```

## Trivia Endpoints

New stable internal Trivia endpoint:

```http
GET /api/trivia/questions?limit=5&categories=Science,History&difficulties=easy,hard
```

Example response:

```json
{
  "questions": [
    {
      "id": "7cc1df8f-1c12-4d69-9b8f-5a1b7f28ec80",
      "text": "What is the chemical symbol for gold?",
      "answers": ["Go", "Au", "Gd", "Ag"],
      "category": "Science",
      "difficulty": "medium"
    }
  ],
  "meta": {
    "count": 1,
    "requested_limit": 5,
    "cache_hit": false
  }
}
```

Existing practice endpoints remain available:

- `GET /quiz/practice/questions`
- `POST /quiz/practice/answer`

Example answer request:

```json
{
  "question_id": "7cc1df8f-1c12-4d69-9b8f-5a1b7f28ec80",
  "answer": "Au"
}
```

## Assumptions

- The implementation targets the current official Trivia API `GET /v2/questions` contract.
- `query` is intentionally rejected with `400` in v1 even though the upstream site documents topic/semantic search features, because the feature may depend on paid plan capabilities.
- The backend exposes internal cached UUIDs to clients and keeps upstream question IDs private in storage.
- The question cache table is created by the existing `Base.metadata.create_all(...)` startup path; no separate migration tool is introduced in this change.
