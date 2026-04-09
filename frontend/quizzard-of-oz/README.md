# Quizzard of Oz Frontend

Next.js frontend for Quizzard of Oz.

## Local Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Environment Variables

See `.env.example` for defaults.

Main variables:

- `BACKEND_URL` (server-side rewrite target, e.g. `http://backend:8000` in Docker network)
- `NEXT_PUBLIC_API_BASE` (usually `/api`)
- `NEXT_PUBLIC_WS_BASE` (e.g. `ws://localhost:8000` or `wss://<domain>`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Google OAuth Client ID)
- `GOOGLE_CLIENT_ID` (fallback for server/runtime config)

## Portainer / Docker Deployment Notes

This project uses two env paths:

1. Build-time env (baked into JS bundle)
2. Runtime env (read by server in container)

`NEXT_PUBLIC_*` values are typically build-time in Next.js. For Google login in this project, the client ID is exposed through runtime config (`/api/runtime-config`) so Portainer environment variables can be used without rebuilding the image for every env change.

Practical effect:

- If `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in Portainer container env, login button gets the value at runtime.
- If missing, backend fallback `GOOGLE_CLIENT_ID` is used.
- If both are missing, Google login cannot initialize and OAuth fails with `client_id` errors.

## CI Docker Build

The GitHub workflow builds the image with stable defaults for API routing:

- `BACKEND_URL=http://backend:8000`
- `NEXT_PUBLIC_API_BASE=/api`
- `NEXT_PUBLIC_WS_BASE=ws://localhost:8000`

Google client ID is intentionally expected from runtime env in container deployment.
