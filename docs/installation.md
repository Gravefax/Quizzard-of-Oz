# Installation

## Prerequisites

| Tool | Version | Purpose |
| --- | --- | --- |
| [Docker](https://www.docker.com/) | ≥ 24 | Container runtime |
| Docker Compose | ≥ 2.20 (bundled with Docker Desktop) | Service orchestration |
| Git | any | Repository checkout |

No local Node.js or Python installation is required — all services run inside containers.

## Setup

**1. Clone the repository**

```bash
git clone https://github.com/Gravefax/SQS-Team-11
cd Quizzard-of-Oz
```

**2. Create the environment file**

```bash
cp .env.example .env
```

The default values in `.env.example` work out of the box for local development. The Keycloak `quizzard` realm is imported automatically on first startup — no manual configuration is required.

> **Note:** `TRIVIA_API_KEY` is optional. The Trivia API works without a key, but rate limits may apply for heavy usage. Leave the value empty to use the unauthenticated tier.

**3. Start all services**

```bash
docker compose up -d
```

Docker Compose starts four services in dependency order:

| Service | URL | Description |
| --- | --- | --- |
| PostgreSQL | — | Persistent database (internal only) |
| Keycloak | http://localhost:8080 | Identity provider; admin UI at `/auth/admin` |
| Backend | http://localhost:8000 | FastAPI backend; OpenAPI docs at `/docs` |
| Frontend | http://localhost:3000 | Next.js application |

The backend waits for PostgreSQL and Keycloak to pass their health checks before accepting traffic. The frontend starts after the backend is healthy.

**4. Open the application**

Navigate to **http://localhost:3000** and use the **Register** link to create an account via the Keycloak login page.

## Verifying the Stack

Check that all services are running:

```bash
docker compose ps
```

All four services should show `running` or `healthy`. Check the backend health endpoint:

```bash
curl http://localhost:8000/health
```

## Stopping and Cleaning Up

Stop all services (data is preserved in Docker volumes):

```bash
docker compose down
```

Stop and remove all data volumes (full reset):

```bash
docker compose down -v
```

## Local Development Without Docker

For development with hot reload, each component can be started individually. Prerequisites for this approach:

- Python 3.12+ (backend)
- Node.js 22+ and pnpm (frontend)
- A running PostgreSQL 18 instance and Keycloak 26

**Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend/quizzard-of-oz
pnpm install
pnpm dev
```

Ensure the `.env` values for `KEYCLOAK_URL`, `POSTGRES_HOST`, and `NEXT_PUBLIC_KEYCLOAK_URL` point to the correct host addresses for your local services.

## Keycloak Admin Access

The Keycloak admin console is available at **http://localhost:8080/auth/admin** with the default credentials `admin` / `admin` (configured in `.env` via `KEYCLOAK_ADMIN` and `KEYCLOAK_ADMIN_PASSWORD`).

The `quizzard` realm is automatically imported from `keycloak/realm-export.json` on startup. The `quizzard-frontend` client is pre-configured for PKCE login from `http://localhost:3000`.
