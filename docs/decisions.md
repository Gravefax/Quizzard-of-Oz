# Architecture Decisions

## ADR 1: Adoption of Next.js as Frontend Framework

**Context**

The project needs a modern frontend framework with server-side rendering, good
performance, SEO support, scalability, and simple deployment. The team
evaluated React, Angular, Vue, and Next.js.

**Decision**

The frontend will use Next.js because it provides built-in SSR, SSG, routing,
and API routes that align well with the project requirements.

**Status**

Accepted

**Consequences**

- Positive: better performance, stronger SEO support, a mature ecosystem, and
  simpler routing and full-stack integration
- Negative: a learning curve for developers new to Next.js and a more
  opinionated project structure
- Neutral: continued dependency on the React ecosystem

## ADR 2: Adoption of Python with FastAPI for Backend Services

**Context**

The project needs a backend that is performant, maintainable, scalable,
type-safe, and easy to document. The team evaluated Node.js, Java, and Python
frameworks including Django and Flask.

**Decision**

The backend will use Python with FastAPI because it offers high performance,
async support, Pydantic validation, automatic OpenAPI documentation, and a
clean developer experience.

**Status**

Accepted

**Consequences**

- Positive: fast async request handling, generated API documentation, strong
  validation, and rapid development in Python
- Negative: a smaller ecosystem than some enterprise frameworks and a need to
  understand async patterns
- Neutral: dependency on the Python runtime and ecosystem

## ADR 3: Usage of pnpm as Package Manager

**Context**

The project needs a package manager that is performant, maintainable,
scalable, and easy to use. The team evaluated npm, yarn, and pnpm.

**Decision**

The project currently leans toward pnpm as the package manager for frontend
workflows and dependency management.

**Status**

Accepted

**Consequences**

- Positive: pnpm is fast and efficient with a smaller disk footprint
- Negative: it has a smaller ecosystem footprint than npm
- Neutral: adoption continues to grow and the tooling is actively maintained


## ADR 4: Database Technology

**Context**

The project needs a persistent database for users, sessions, and match data.
The main decision is NoSQL versus relational storage. The team evaluated MongoDB
for NoSQL and MariaDB/PostgreSQL for relational options.

**Decision**

The project will use a relational database. The domain model is strongly
structured (users, matches, scores, and session relations), and consistency is
important for game state and ranking data. PostgreSQL was selected because it
is reliable, well-known by the team, and provides strong SQL capabilities for
future analytics and reporting needs.

**Status**

Accepted

**Consequences**

- Positive: strong data integrity guarantees, rich querying, and mature
  operational tooling
- Negative: schema migrations and relational modeling add design and
  maintenance overhead
- Neutral: development workflows include SQL and migration tooling as standard
  practice


## ADR 5: ORM vs Writing SQL Queries

**Context**

The backend needs a consistent and maintainable way to access relational data.
The team evaluated two approaches: writing raw SQL queries for all operations
or using an ORM with typed schemas and validation.

**Decision**

The project will use an ORM-first approach with SQLAlchemy for data access and
Pydantic for request/response and domain validation. Raw SQL can still be used
for performance-critical or highly specialized queries when needed.

**Status**

Accepted

**Consequences**

- Positive: improves developer productivity, consistency, and readability in
  CRUD and relationship-heavy operations
- Negative: adds ORM abstraction overhead and requires careful query tuning to
  avoid performance pitfalls
- Neutral: team workflows include SQLAlchemy models and Pydantic schemas as
  standard backend patterns

## ADR 6: WebSocket vs API Polling for Game Communication

**Context**

The project needs a communication pattern for the multiplayer game mode.
Gameplay events such as match state updates, countdowns, and answer submissions
must be delivered with low latency and in near real time.

**Decision**

The project will use WebSockets as the primary communication channel for battle
mode runtime events. HTTP API endpoints remain in use for non-realtime
operations such as authentication, setup, and historical data retrieval.

**Status**

Accepted

**Consequences**

- Positive: supports bidirectional low-latency communication and improves
  realtime user experience in matches
- Negative: introduces additional complexity for connection lifecycle,
  reconnect handling, scaling, and monitoring
- Neutral: requires team familiarity with event-driven patterns while existing
  REST endpoints continue to be used where appropriate

## ADR 7: Authentication with Keycloak

**Context**

The project initially used Google OAuth for authentication. Key concerns were testability (Google's login flow is difficult to automate in Playwright), dependency on an external commercial service and the inability to support custom registration flows with minimal required fields.

**Decision**

Replace Google OAuth with a self-hosted Keycloak instance (Authorization Code + PKCE flow via `keycloak-js`). Keycloak runs as a Docker service and is automatically configured via a realm import on startup. The backend verifies Keycloak access tokens using JWKS public-key validation (`PyJWT` + `PyJWKClient`). Application sessions remain backend-managed via HttpOnly cookies in PostgreSQL — only the identity provider changes.

**Status**

Accepted

**Consequences**

- Positive: login and registration are fully controllable and mockable in E2E tests without external service dependencies.
- Positive: registration requires only username and password — no Google account needed.
- Positive: Keycloak is open-source and self-hosted, removing the dependency on Google API policies.
- Negative: adds a Keycloak container to the deployment stack, which must be kept healthy and configured.
- Neutral: the backend continues to manage application sessions and authorization for protected routes.

## ADR 8: Initial Google Login

**Context**

The project needed an authentication mechanism for registered players. Google
OAuth was considered because it provides a familiar login flow and avoids
building password handling directly into the application.

**Decision**

Use Google login as the initial identity-provider approach for player
authentication.

**Status**

Overruled by ADR 7

**Consequences**

- Positive: users with an existing Google account would have had a familiar
  login experience
- Positive: the application team would not have needed to operate a separate
  identity provider
- Negative: automated E2E tests would have depended on an external commercial
  login flow that is difficult to control in Playwright
- Negative: registration would have required a Google account and would not
  have supported the project's minimal username/password registration goal
- Neutral: this decision is kept as historical context; the implemented system
  uses Keycloak as defined in ADR 7

## ADR 9: Backend-Managed Sessions with HttpOnly Cookies

**Context**

Keycloak provides identity and access tokens, but the application still needs a
stable session concept for protected REST calls, queue WebSockets, and battle
WebSockets. The frontend should not have to store or manage an application
session secret in JavaScript.

**Decision**

After the frontend receives a Keycloak access token, it sends the token to
`POST /auth/login`. The backend verifies the token through the Keycloak JWKS,
creates or refreshes a local user, creates a session record in PostgreSQL, and
sets an HttpOnly session cookie. REST endpoints and WebSocket handshakes that
need authentication validate this backend session cookie.

**Status**

Accepted

**Consequences**

- Positive: application sessions can be revoked and refreshed independently of
  the Keycloak browser state
- Positive: the same session mechanism works for HTTP requests and WebSocket
  authentication
- Positive: the session cookie is not directly accessible to frontend
  JavaScript
- Negative: the backend must persist, expire, refresh, and delete session
  records correctly
- Negative: CORS, cookie domain, SameSite, Secure, and local-development
  settings must be configured carefully
- Neutral: Keycloak remains responsible for identity, while the backend remains
  responsible for application authorization and session lifecycle

## ADR 10: Process-Local Matchmaking and Battle State

**Context**

Ranked battles require low-latency state transitions, timers, player
connections, answer handling, surrender handling, and result publication. The
current system persists users, sessions, rankings, question cache entries, and
completed match results, but active matchmaking and battle state is runtime
state owned by the backend process.

**Decision**

Keep active queue, match, timer, and battle state in memory inside the backend
services. Persist durable outcomes such as match results and ranking changes to
PostgreSQL after the battle is completed or forfeited.

**Status**

Accepted for the current project scope

**Consequences**

- Positive: the implementation stays simple and fast for the current
  single-backend deployment model
- Positive: battle logic can keep direct references to active WebSocket
  connections and timers without a distributed coordination layer
- Negative: active matches are lost when the backend process restarts
- Negative: horizontal scaling would require sticky routing, shared state, or a
  dedicated coordination mechanism
- Negative: E2E battle tests need controlled sequential execution because the
  queue and battle state are shared through the backend process
- Neutral: completed match results and ranking updates remain persistent in
  PostgreSQL
