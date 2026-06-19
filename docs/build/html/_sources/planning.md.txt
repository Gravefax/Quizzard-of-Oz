# Planning

## QuizBattle Concept Document

### Product Vision

QuizBattle is a web-based multiplayer quiz platform with two main styles of
play: a relaxed asynchronous mode in the spirit of Quizduell and a competitive
real-time ranked mode. Registered users build a persistent player identity
 through match history and leaderboard progress.

## Game Modes

### Practice Mode (Casual Duel)

A player receives 10 questions from a random mix of categories.

### Unranked (Best of Five Battle)

Five rounds are played. Each round contains three questions from one chosen
category. The loser of the previous round chooses the next category from three
proposed options. This mode is also available to guest players.

### Ranked (Best of Five Battle)

Five rounds are played. Each round contains three questions from one chosen
category. The loser of the previous round chooses the next category from three
proposed options. Elo adjustments are applied after the match ends.

## Website Pages

### Public

- Leaderboard
- Practice mode
- Unranked mode
- Session settings

### Login Only

- Ranked mode
- User settings
- User profile

## Session Flow

![Ranked session flow](images/ranked_session_flow.svg)

## Database

### `user`

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `username` | `varchar(50)` | NOT NULL |
| `password_hash` | `varchar` | NOT NULL |
| `created_at` | `timestamp` | DEFAULT now() |

### `session`

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `mode` | `enum('ranked','unranked')` | NOT NULL |
| `status` | `enum('waiting','active','finished')` | NOT NULL |
| `used_categories` | `json` |  |
| `started_at` | `timestamp` |  |
| `finished_at` | `timestamp` |  |

### `match_participant`

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `session_id` | `uuid` | FK -> `session.id` |
| `user_id` | `uuid` | FK -> `user.id` |
| `score` | `int` | DEFAULT 0 |
| `rounds_won` | `int` | DEFAULT 0 |
| `is_category_picker` | `boolean` | DEFAULT false |

### `session_question`

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `session_id` | `uuid` | FK -> `session.id` |
| `question_id` | `uuid` | FK -> `question_cache.id` |
| `round_number` | `int` | NOT NULL |
| `category` | `varchar` | NOT NULL |

### `question_cache`

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `external_id` | `varchar` | UNIQUE |
| `question_text` | `text` | NOT NULL |
| `answers` | `json` | NOT NULL |
| `correct_answer` | `varchar` | NOT NULL |
| `category` | `varchar` | NOT NULL |
| `difficulty` | `varchar` |  |
| `cached_at` | `timestamp` | DEFAULT now() |

### `leaderboard_entry`

| Column | Type | Constraint |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK -> `user.id`, UNIQUE |
| `elo_rating` | `int` | DEFAULT 1000 |
| `wins` | `int` | DEFAULT 0 |
| `losses` | `int` | DEFAULT 0 |
| `total_matches` | `int` | DEFAULT 0 |
| `updated_at` | `timestamp` | DEFAULT now() |

## Technical Additions

### Question Caching

Responses from `the-trivia-api.com` are stored in `question_cache`. Before each
API call, the backend checks whether enough unused questions already exist for
the requested category. This reduces latency and avoids rate limit pressure.

### Matchmaking

For unranked mode, a simple FIFO queue is sufficient. Ranked mode should use
Elo-based matchmaking where players are matched within a tolerance window of
about +/-150 Elo, expanding after longer wait times.

### Real-Time Communication

Unranked and ranked sessions should use WebSocket-based communication so both
players can see progress and answers in sync.

### Authentication

JWT tokens manage sessions, and passwords are hashed using bcrypt.
