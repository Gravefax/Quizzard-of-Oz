# Usage

This page describes the main features of Quizzard of Oz from a user perspective. Follow the [Installation](installation.md) guide first to get the application running.

## Registration and Login

Quizzard of Oz uses Keycloak for identity. No passwords are stored in the application database — all credentials are managed by Keycloak.

1. Open **http://localhost:3000**.
2. Click **Register** in the navigation bar to open the Keycloak registration page.
3. Enter a username and password. No email verification is required for the default local setup.
4. After registration, log in with the same credentials.
5. You are redirected back to the application and your username appears in the navigation bar.

Login state is stored as a backend session cookie. The session is valid for 36 hours by default (`SESSION_EXP_MINUTES=2160` in `.env`). Closing the browser does not log you out.

## Practice Mode (Übungsmodus)

Practice mode lets you answer trivia questions solo without an opponent or ranking implications.

1. Click **Übungsmodus** in the navigation bar (login not required).
2. Ten random trivia questions are loaded from the backend's question cache.
3. Select one answer per question. After submitting, the correct answer is revealed immediately.
4. Your result is shown at the end of the 10-question round.

Questions are served from the local PostgreSQL cache. On cache miss the backend fetches new questions from The Trivia API automatically.

## Ranked Battle (Ranked-Modus)

Ranked battles are real-time 1v1 matches over WebSocket. Results affect your Elo rating.

### Entering the Queue

1. Log in to your account.
2. Click **Ranked-Modus** in the navigation bar.
3. Click **Play** to enter the matchmaking queue.
4. The backend matches you with the closest opponent by Elo rating. The allowed Elo difference starts at 75 and grows by 50 every 5 seconds.
5. Once a second player joins, both players receive a match invitation and are redirected to the Battle Arena.

> **Tip for local testing:** Open two separate browser sessions (e.g. normal window + incognito) with two different accounts to test a full match.

### Battle Arena

The battle arena implements a best-of-five format:

| Phase | Description |
| --- | --- |
| Category pick | One player receives three category options and has 30 seconds to choose. |
| Questions | Three questions are asked for the chosen category. Each question has a 20-second answer deadline. |
| Round result | After all three questions, the round winner is shown. Ties are broken by answer time. |
| Game over | The first player to win 3 rounds wins the match. Elo ratings update immediately after game over. |

If the opponent disconnects or surrenders during an active round, you receive a forfeit win and rankings update.

### Elo Rating

The application uses the [Elo rating system](https://en.wikipedia.org/wiki/Elo_rating_system) with `K_FACTOR = 32`. Both players' ratings are updated after every match — including forfeits. New players start with a default Elo rating. Wins increase your rating; losses decrease it proportional to the expected outcome.

## Leaderboard

The public leaderboard is available without login at **http://localhost:3000/leaderboard** (or via the navigation bar).

- Players are ranked by Elo rating. Fully tied players share the same rank.
- The leaderboard shows username, Elo, wins, losses, total matches, and last win time.
- Use the search box to find a specific player by username.
- Results are paginated with 50 entries per page.

## Logout

Click your username in the navigation bar and select **Logout**. The backend session is deleted and the session cookie is cleared. You are redirected to the landing page.
