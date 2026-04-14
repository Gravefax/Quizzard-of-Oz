
## Frontend Environment Variables

Create a local environment file before starting the frontend:

1. Copy `.env.example` to `.env`
2. Adjust values if needed

### Required variables

- `GOOGLE_CLIENT_ID`
	- Google OAuth client ID used by login and Google OAuth provider.
	- Example: `your_client_id_here`
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

## Google OAuth Setup

This guide explains how to create a Google OAuth client for local development.

### 1. Create or select a Google Cloud project

1. Open https://console.cloud.google.com/cloud-resource-manager
2. Create a new project.
3. Enter a project name and click **Create**.
4. Wait until the project is fully created.

### 2. Configure the OAuth consent screen

1. Open https://console.cloud.google.com/auth/overview
2. In the top-left project selector, choose your project.
3. Click **Get started** (or **First steps**) in the OAuth overview.
4. Enter an app name (for example: `QOO`).
5. Enter a support email address.
6. Click **Next**.
7. Select **External** as user type.
8. Enter a developer contact email.
9. Finish and create the consent screen configuration.

### 3. Create an OAuth client

1. In the OAuth overview, create a new OAuth client.
2. For application type, select **Web application**.
3. Enter a name (for example: `QOO-OAuth`).
4. Add the following authorized origin for local development:
	- `http://localhost:3000`
5. Click **Create**.

### 4. Copy credentials to environment files

After creation, Google shows the client credentials in a popup.

Use the **Client ID** in both backend and frontend environment files:

- `backend/.env`
- `frontend/quizzard-of-oz/.env`

Set:

- `GOOGLE_CLIENT_ID=<your-client-id>`





