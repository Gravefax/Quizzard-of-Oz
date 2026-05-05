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

## ADR 7: Authentication with Google OAuth

**Context**

The project currently uses Google OAuth for authentication, but the team is evaluating whether to keep that setup or move to a different authentication approach. A major concern is testability: a custom provider would be easier to control and mock in Playwright than Google OAuth.

**Decision**

The current implementation uses Google OAuth for sign-in, and the backend creates and refreshes application sessions after a successful login. The long-term authentication strategy is still under review, with better automated testability as one of the key decision factors.

**Status**

Pending

**Consequences**

- Positive: reduces custom security work compared with a fully self-managed
  credential flow.
- Positive: a custom provider would be easier to mock in Playwright-based end-
  to-end tests.
- Negative: continuing with Google keeps the auth flow dependent on an
  external service and makes browser automation harder to isolate.
- Neutral: the backend still manages application sessions and authorization
  for protected routes.