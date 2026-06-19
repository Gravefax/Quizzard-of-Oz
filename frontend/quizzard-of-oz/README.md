
## Frontend Environment Variables

Create a local environment file before starting the frontend:

1. Copy `.env.example` to `.env`
2. Adjust values if needed

### Required variables

- `NEXT_PUBLIC_KEYCLOAK_URL`
	- URL of the Keycloak server.
	- Example: `http://localhost:8080`
- `NEXT_PUBLIC_KEYCLOAK_REALM`
	- Keycloak realm name.
	- Example: `quizzard`
- `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID`
	- Keycloak client ID for the frontend.
	- Example: `quizzard-frontend`
- `NEXT_PUBLIC_API_BASE`
	- Base URL for API requests from the frontend.
	- Use `/api` for local setup behind the Next.js proxy.
	- Example: `/api`
- `NEXT_PUBLIC_WS_BASE`
	- Base URL for WebSocket connections (battle/match updates).
	- Example: `ws://localhost:8000`

### Optional variables

- `BACKEND_URL`
	- Backend origin used in Next.js server/proxy configuration.
	- Default example: `http://localhost:8000`
- `API_SECRET`
	- Optional secret for `app/api/protected/route.ts` (mainly used in tests).
	- Default example: `secret-token`

## Keycloak Setup

Authentication is handled by Keycloak. For local development, Keycloak starts automatically via `docker-compose up` — no manual setup required.

The realm `quizzard` and client `quizzard-frontend` are auto-imported from `keycloak/realm-export.json` on first startup.

### Accessing the Keycloak Admin Console

- URL: `http://localhost:8080`
- Username: `admin`
- Password: `admin`
