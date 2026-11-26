# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep route and display concerns in React components under `src/components`, use the shared `src/api/client.ts` helper for every `/api/*` request, and provide explicit loading, success, empty, and accessible error states. The workout view will request suggestions by the seeded Mona email and render its returned workout data.
- Logic tier decision: Keep Express route handlers thin: validate and translate HTTP input in `src/routes/api.ts`, delegate persistence and feature calculations to `src/services/octofitService.ts`, and return JSON with deliberate 4xx statuses for expected client or lookup failures rather than allowing 500 cast errors.
- Data tier decision: Define required Mongoose fields and sensible defaults in `src/models`; run the seed through stable business keys such as email and team name, remove users from a previous team when their team changes, and preserve unrelated existing data.
- Activity tracking approach: Validate `userId` and `teamId` as ObjectIds before querying, require a matching existing user and team, require valid activity fields, and store computed positive points plus an `occurredAt` timestamp. Reject missing or malformed references with 400 and nonexistent references with another deliberate 4xx.
- Team management approach: Require `name` and `mascot` at the model and API boundaries, default `members` to an empty array, and preserve submitted names and mascots. Accept member ObjectIds, convert them to model references safely, and expose teams with their member IDs.
- Leaderboard approach: Aggregate `Activity.points` by team, join or look up team names, sum totals, sort descending, and assign 1-based ranks. Include teams with no activity only if the API contract or existing UI convention requires it; otherwise return entries for teams represented by activity records.
- Workout suggestions approach: Find the user by decoded email, calculate a focus from the user's `fitnessGoal` or most recent activity type, select a matching workout, and include a human-readable reason. Return a deliberate 404 when no user matches.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
- API command: `npm run test:api --prefix octofit-tracker/backend`
- Frontend command: `npm test --prefix octofit-tracker/frontend`
- Backend build command: `npm run build --prefix octofit-tracker/backend`
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
