# Test Concept

This document describes the testing strategy for Quizzard of Oz. It consolidates the tests that are currently visible in the repository and explains how they protect the main quality goals: reliable gameplay, secure authentication, maintainable architecture, and repeatable delivery.

## Purpose and Goals

The test concept defines which risks are covered by automated tests, which tools are used, and which checks should pass before changes are merged.

The main goals are:

- detect regressions in authentication, session handling, quiz flow, ranking, trivia caching, and battle WebSocket behavior
- keep frontend and backend behavior verifiable without relying on manual browser testing
- enforce architecture boundaries in both the frontend and the backend
- provide coverage reports for local feedback and SonarCloud
- keep CI results reproducible through pinned dependency files and explicit GitHub Actions jobs

## Test Pyramid Overview

The project follows the test pyramid by combining many fast, isolated tests with fewer cross-component and full-system tests. The table below names every level required for the project checklist and maps it to the concrete implementation in this repository.

| Pyramid Level | Tool / Framework | Test Location | Goal and Scope |
| --- | --- | --- | --- |
| Unit tests | Backend: `pytest`; frontend: Vitest with Testing Library and jsdom | Backend: `backend/tests/`; frontend: `frontend/quizzard-of-oz/app/__tests__/unit` | Verify individual functions, services, stores, API clients, and UI components in isolation. |
| Integration tests | Backend: `pytest` with FastAPI `TestClient`, dependency overrides, fake services; frontend: Vitest with Testing Library | Backend: `backend/tests/`; frontend: `frontend/quizzard-of-oz/app/__tests__/integration` | Verify interaction between routers, services, CRUD boundaries, frontend pages, and combined UI flows without requiring the complete deployed system. |
| End-to-end UI automation | Playwright with Chromium | `frontend/quizzard-of-oz/app/__tests__/e2e` | Verify user-visible browser flows such as navigation, practice quiz, ranked queue, battle behavior, leaderboard, authentication, and leave guards. |
| Penetration / security tests | Automated negative and authentication tests with `pytest`, Vitest, and Playwright | Backend auth/session tests in `backend/tests/`; frontend security tests in `frontend/quizzard-of-oz/app/__tests__/security`; auth E2E specs in `frontend/quizzard-of-oz/app/__tests__/e2e` | Validate unauthorized access handling, invalid tokens/cookies, expired sessions, protected route behavior, and authentication-related failure paths. These are automated security regression tests, not a full manual penetration test. |
| Architecture tests | Frontend: dependency-cruiser through Vitest; backend: import-linter driven from `pytest` | Frontend: `frontend/quizzard-of-oz/app/__tests__/arch`; backend: `backend/.importlinter` enforced by `backend/tests/test_architecture.py` | Enforce frontend dependency rules and backend layer boundaries (routers > services > crud > models), including a negative test that proves a deliberate violation breaks the build. |

## Test Scope

| Area | Covered Behavior |
| --- | --- |
| Authentication and sessions | Keycloak token exchange, backend session creation, refresh, logout, expired sessions, invalid cookies, WebSocket session validation. |
| Practice quiz | Question loading, answer checking, error states, frontend quiz progression, result screens. |
| Trivia integration | Request filter validation, upstream retries/errors, payload normalization, local question cache reads and writes. |
| Ranking and leaderboard | Elo updates, match result persistence, leaderboard ordering, tie ranks, search, pagination, frontend rendering. |
| Battle and matchmaking | Queue authentication, Elo-based pairing, match state transitions, category selection, answer acknowledgement, reveal timing, round result, surrender, disconnect, forfeit. |
| Frontend navigation and UI state | Landing page, ranked page, navbar, mobile menu, battle leave guard, Keycloak provider behavior, auth store, theme store. |
| Security checks | Protected API route behavior and backend session/JWKS validation paths. |
| Architecture rules | Frontend: no circular dependencies, no component imports from API routes, no production imports from test files. Backend: routers must reach persistence only through services, the CRUD layer must not import routers or services, and the layers routers > services > crud > models stay acyclic. |

Out of scope for the current automated test suite are production load testing, a full manual penetration test, browser compatibility beyond Chromium E2E, database migration testing, and infrastructure failover testing.

## Test Levels and Tools

### Static and Build Checks

| Check | Tool | Command | Purpose |
| --- | --- | --- | --- |
| Frontend linting | ESLint | `pnpm lint` from `frontend/quizzard-of-oz` | Detect TypeScript/React lint problems before runtime. |
| Frontend production build | Next.js | `pnpm build` from `frontend/quizzard-of-oz` | Verify the application compiles with configured public env vars. |
| Documentation build | Sphinx/MyST | `.\.venv\Scripts\python.exe -m sphinx -b html docs <output> -d <doctrees>` from repository root | Verify documentation syntax, links, toctree entries, and image references. |

### Backend Tests

Backend tests use `pytest`, `pytest-asyncio`, and `pytest-cov`. They live in `backend/tests`.

| Test Type | Files / Examples | Purpose |
| --- | --- | --- |
| API and router tests | `test_api.py`, `test_auth.py`, `test_battle.py`, `test_ranking_router.py`, `test_trivia_router.py`, `test_user_router.py` | Validate HTTP/WebSocket entry points, response codes, dependency overrides, and router-level error handling. |
| Service tests | `test_battle_manager.py`, `test_matchmaking_service.py`, `test_ranking_service.py`, `test_quiz_service.py`, `test_trivia_service.py`, `test_trivia_client.py`, `test_ws_auth.py` | Validate business logic and integration boundaries without requiring the full running stack. |
| CRUD and model-adjacent tests | `test_user_crud.py`, `test_session_crud.py`, `test_ranking_crud.py`, `test_question_cache_crud.py` | Validate SQLAlchemy query behavior through mocked sessions and repositories. |
| Configuration tests | `test_settings.py` | Validate environment parsing and defaults. |

Local command:

```powershell
cd backend
python -m pytest tests -q
```

CI command:

```bash
backend/.venv/bin/pytest backend/tests/ -v --cov=backend/app --cov-report=term-missing --cov-report=xml:backend/coverage.xml --cov-branch --cov-config=backend/.coveragerc
```

The backend coverage configuration is stored in `backend/.coveragerc`. CI uploads `backend/coverage.xml` as the `backend-coverage` artifact for SonarCloud.

### Frontend Unit, Integration, Security, and Architecture Tests

Frontend tests use Vitest, Testing Library, jsdom, dependency-cruiser, and V8 coverage. They live below `frontend/quizzard-of-oz/app/__tests__`.

| Test Type | Location | Purpose |
| --- | --- | --- |
| Unit tests | `app/__tests__/unit` | Validate components, API clients, providers, stores, utility functions, and page-level behavior in isolation. |
| Integration tests | `app/__tests__/integration` | Validate combined UI flows such as home, ranked, and battle interaction paths using mocked dependencies. |
| Security tests | `app/__tests__/security` | Validate security-relevant behavior such as protected API route responses for missing or wrong cookies. |
| Architecture tests | `app/__tests__/arch` | Enforce dependency rules with dependency-cruiser. |

Local commands:

```powershell
cd frontend/quizzard-of-oz
pnpm lint
pnpm test:coverage
pnpm test:arch
```

Vitest is configured in `vitest.config.ts` with jsdom, `vitest.setup.ts`, V8 coverage, and 80 percent thresholds for lines, functions, branches, and statements. Coverage reports are written to `frontend/quizzard-of-oz/test-results/coverage` as text, HTML, and lcov.

### Security and Penetration Test Approach

The current security test approach is automated and regression-oriented. It focuses on negative authentication and authorization paths that are important for this application:

- missing, malformed, invalid, or expired backend session cookies
- invalid Keycloak bearer tokens and missing `sub` claims
- WebSocket handshake rejection for unauthenticated or expired sessions
- protected route responses for missing or wrong cookies
- logout and battle-leave behavior that should not silently keep privileged state alive

These tests reduce the risk of accidental security regressions, but they do not replace a full manual penetration test, threat-modeling workshop, or external security assessment.

### Architecture Test Approach

Frontend architecture rules are implemented as executable tests with dependency-cruiser in `frontend/quizzard-of-oz/app/__tests__/arch/architecture.test.ts`. They currently enforce:

- no circular dependencies in `app/`
- no imports from `app/components` directly into `app/api`
- no production source imports from test files

Backend architecture rules are enforced with [import-linter](https://import-linter.readthedocs.io). The contracts live in `backend/.importlinter` and are executed both directly in CI (`lint-imports`) and through `pytest` in `backend/tests/test_architecture.py`. They enforce:

- **routers-no-direct-crud**: routers must not import the `app.crud` layer directly; persistence access goes through `app.services`. The `get_db` dependency from `app.database` is still allowed in routers, since it only injects the request-scoped session that is handed to the service layer.
- **crud-isolated**: the `app.crud` layer must not import `app.routers` or `app.services`; it stays a leaf of the dependency graph.
- **layers**: the layering `app.routers > app.services > app.crud > app.models` is enforced. Every reverse (lower-to-higher) import is rejected, which also guarantees there are no cyclic dependencies between these layers.

`backend/tests/test_architecture.py` additionally runs a negative test: it temporarily writes a router module that imports `app.crud` directly and asserts that `lint-imports` reports the contract as broken, proving the rules actually fail the build on a violation.

### End-to-End Tests

End-to-end tests use Playwright and Chromium. The specs live in `frontend/quizzard-of-oz/app/__tests__/e2e`.

| E2E Area | Examples |
| --- | --- |
| Home and navigation | Landing page, cross-mode navigation, ranked/practice navigation. |
| Practice quiz | Start quiz, answer questions, feedback, full quiz completion, restart, back navigation. |
| Leaderboard | Leaderboard rendering, pagination, search behavior. |
| Authentication and navbar | Keycloak login behavior, authenticated menu behavior, logout-related flows. |
| Ranked queue and battle | Queue join/cancel, match flow, battle arena behavior. |
| Battle leave guard | Navigation/logout protection during active battle routes. |

Local command:

```powershell
cd frontend/quizzard-of-oz
pnpm test:e2e
```

Playwright is configured in `playwright.config.ts` to:

- run tests from `app/__tests__/e2e`
- use Chromium
- start the Next.js dev server on `http://localhost:3000`
- start the backend on `http://127.0.0.1:8000`
- reuse existing servers locally when possible
- run with `workers: 1` and `fullyParallel: false`
- collect traces on first retry

Sequential E2E execution is intentional. WebSocket game tests share a backend, fixed test accounts, and queue state; parallel execution can create unexpected self-matches or flaky battle behavior.

## Test Environments

| Environment | Description | Responsibilities |
| --- | --- | --- |
| Local backend environment | Python virtual environment with `backend/requirements.txt`. | Run backend pytest suite and local FastAPI server. |
| Local frontend environment | Node.js and pnpm dependencies from `pnpm-lock.yaml`. | Run lint, Vitest, architecture tests, Next.js dev server, and Playwright. |
| Docker Compose stack | PostgreSQL, Keycloak, backend, and frontend services. | Manual full-stack checks and realistic local service wiring. |
| GitHub Actions backend job | Ubuntu runner with Python 3.12. | Install backend dependencies, run pytest with coverage, upload backend coverage XML. |
| GitHub Actions frontend job | Ubuntu runner with Node 22 and pnpm. | Build frontend, run lint, Vitest coverage, architecture tests, upload lcov. |
| GitHub Actions E2E job | Ubuntu runner with PostgreSQL service and Keycloak container. | Start required services, install browsers, run Playwright E2E. |
| SonarCloud | Uses uploaded backend and frontend coverage artifacts. | Aggregate static analysis and coverage reporting. |

## Test Data and Isolation

| Test Area | Isolation Strategy |
| --- | --- |
| Backend unit and service tests | Use mocks, dependency overrides, fake repositories, fake WebSockets, and patched database engine creation where needed. |
| Backend router tests | Use FastAPI `TestClient` and dependency overrides to avoid requiring a live database for most cases. |
| Trivia tests | Use fake upstream clients and fake cache repositories to cover cache hit, refill, invalid payload, and insufficient question paths. |
| Frontend unit/integration tests | Use Testing Library, jsdom, mocked API clients, mocked navigation, and mocked Keycloak behavior. |
| E2E tests | Use Playwright browser contexts, helper functions, Keycloak test users, and a real backend/Keycloak/PostgreSQL environment in CI. |
| Battle E2E tests | Run sequentially because the queue and match state are shared through the backend process. |

Test data should remain deterministic where possible. External services should be mocked in unit and component tests; live service interaction is reserved for E2E scenarios.

## CI Quality Gates

The GitHub Actions `ci.yml` workflow runs on pushes and pull requests to `dev` and `main`.

| Job | Gate |
| --- | --- |
| `frontend-build` | `pnpm install --frozen-lockfile` and `pnpm build` must pass. |
| `backend-test` | Backend `lint-imports` architecture contracts and pytest with branch coverage must pass and upload `backend/coverage.xml`. |
| `frontend-test` | `pnpm lint`, `pnpm test:coverage`, and `pnpm test:arch` must pass and upload frontend lcov. |
| `frontend-e2e` | Playwright tests must pass with PostgreSQL and Keycloak available. |
| `sonarcloud` | SonarCloud scan runs after backend and frontend test jobs and consumes coverage artifacts. |

For small documentation-only changes, the documentation build is the primary local verification. For changes touching auth, WebSockets, ranking, question handling, or navigation, run the affected backend/frontend tests plus E2E tests before merging.

## Coverage and Reporting

The project coverage target is at least 80 percent. Frontend coverage thresholds of 80 percent for lines, functions, branches, and statements are enforced in `vitest.config.ts`. Backend and frontend coverage are measured in CI and reported to SonarCloud; backend coverage does not currently define a separate numeric pytest threshold in the repository.

| Report | Location / Consumer |
| --- | --- |
| Backend terminal coverage | Printed by pytest in CI with `--cov-report=term-missing`. |
| Backend XML coverage | `backend/coverage.xml`, uploaded as `backend-coverage`, consumed by SonarCloud. |
| Frontend lcov coverage | `frontend/quizzard-of-oz/test-results/coverage/lcov.info`, uploaded as `frontend-coverage`, consumed by SonarCloud. |
| Frontend HTML coverage | `frontend/quizzard-of-oz/test-results/coverage`, useful for local inspection. |
| Playwright HTML report | `frontend/quizzard-of-oz/test-results/playwright-report`, useful for E2E debugging. |
| Playwright traces | Captured on first retry according to `playwright.config.ts`. |

SonarCloud is the central quality and coverage reporting tool in CI. The GitHub Actions workflow uploads backend XML coverage and frontend lcov coverage before running the SonarCloud scan.

## Recommended Local Test Selection

| Change Type | Recommended Checks |
| --- | --- |
| Documentation only | Sphinx build. |
| Backend router/service/CRUD change | `python -m pytest tests -q` and `lint-imports` from `backend`. |
| Frontend component/page/client change | `pnpm lint`, `pnpm test:coverage`, and `pnpm test:arch`. |
| Authentication/session change | Backend auth/WebSocket auth tests, frontend auth tests, and relevant Playwright auth scenarios. |
| Battle or matchmaking change | Backend battle/matchmaking tests, frontend battle tests, and Playwright battle scenarios. |
| CI/Docker/deployment change | Relevant GitHub Actions job locally where possible, plus Docker Compose smoke test. |

## Known Gaps and Risks

| Gap or Risk | Impact |
| --- | --- |
| No visible load or performance tests | Queue behavior, WebSocket scaling, and battle latency under many concurrent players are not measured. |
| No database migration tests | The backend currently creates tables with SQLAlchemy metadata; future schema migrations would need dedicated tests. |
| Backend architecture tests check static imports only | import-linter enforces the layering through the import graph; runtime-only coupling (e.g. dynamic imports or string-based lookups) is not covered. |
| Limited production observability tests | Logging is covered indirectly, but metrics, tracing, alerting, and log aggregation are not tested. |
| E2E tests depend on shared infrastructure | PostgreSQL, Keycloak, backend state, and WebSocket queues make isolation harder than pure unit tests. |
| Browser coverage is Chromium-only | Cross-browser behavior is not covered by the current Playwright configuration. |
| External Trivia API is mocked in most tests | This improves determinism but means provider contract changes require targeted integration checks. |

## Maintenance Rules

- Add or update tests in the same change when behavior changes.
- Prefer unit and service tests for detailed edge cases; reserve Playwright for user-critical end-to-end behavior.
- Keep architecture tests aligned with the actual frontend and backend layering rules.
- Keep test documentation updated when commands, CI jobs, coverage thresholds, or test folders change.
- Do not rely on manual verification as the only evidence for auth, ranking, battle, or persistence changes.
