#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/../../.."
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

# Load .env so the backend webServer process gets the DB credentials
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT_DIR/.env"
  set +a
fi

CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-quizbattle-db}"

# ── 1. Free port 8000 so Playwright always starts a fresh backend ────────────
echo "[e2e] Clearing port 8000..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# ── 2. Start database ────────────────────────────────────────────────────────
echo "[e2e] Starting database..."
docker compose -f "$COMPOSE_FILE" up -d postgres

# ── 3. Wait for PostgreSQL to be ready ──────────────────────────────────────
echo "[e2e] Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY=0
until docker exec "$CONTAINER_NAME" pg_isready -U "${POSTGRES_USER:-quizbattle}" -q; do
  RETRY=$((RETRY + 1))
  if [[ "$RETRY" -ge "$MAX_RETRIES" ]]; then
    echo "[e2e] PostgreSQL did not become ready in time. Aborting."
    exit 1
  fi
  sleep 1
done
echo "[e2e] PostgreSQL is ready."

# ── 4. Run E2E tests ─────────────────────────────────────────────────────────
EXIT_CODE=0
pnpm exec playwright test "$@" || EXIT_CODE=$?

# ── 5. Stop database (skip if DB was already running before this script) ─────
if [[ "${KEEP_DB:-false}" != "true" ]]; then
  echo "[e2e] Stopping database..."
  docker compose -f "$COMPOSE_FILE" stop postgres
fi

exit $EXIT_CODE
