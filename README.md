# How Wrong Am I?

> A private calibration journal for turning confidence into evidence.

[**Open the live app**](https://how-wrong-am-i.vercel.app)

How Wrong Am I? helps you measure whether your confidence is deserved. Make a binary forecast, assign a probability, lock it before the outcome is known, and resolve it when reality arrives. Over time, the app turns those records into calibration charts, Brier scores, and evidence-based feedback.

The point is not to be right every time. It is to become reliably honest about uncertainty.

## What it does

- Create a personal account and keep a persistent, private forecasting journal.
- Record a clear yes/no prediction with a 50–99% confidence level, deadline, category, reasoning, and visibility choice.
- Lock each original forecast with a timestamp so your initial belief remains available for review.
- Update an open forecast when new evidence changes your mind; every confidence revision is preserved in its timeline.
- Resolve a forecast with the real outcome and a verification source.
- Review calibration, Brier score, calibration error, confidence distribution, category performance, and resolved-history data.
- Explore the full experience in local demo mode before creating an account.

## How the forecasting loop works

```text
1. Forecast        Write a testable yes/no claim.
2. Assign odds     State how confident you are, from 50% to 99%.
3. Lock it         Preserve the original estimate and its reasoning.
4. Update          Add a revision only when new information arrives.
5. Resolve         Record what actually happened and cite a source.
6. Learn           Compare your probabilities with the outcomes over time.
```

A forecast can be wrong and still be well calibrated. For example, a 72% forecast should still be wrong roughly 28 times out of 100 comparable predictions. The dashboard is designed to reveal the pattern, not judge one outcome in isolation.

## Scoring and calibration

For a forecast probability `p` and a binary outcome `o` (`1` when the event happens, otherwise `0`):

```text
Brier contribution = (p - o)²
```

The app averages those contributions into a Brier score; lower is better. It also groups forecasts into confidence buckets and compares their predicted probability with the observed outcome rate. The friendly calibration score is derived from the average Brier score:

```text
friendly score = (1 - mean Brier score) × 100
```

Insights are deliberately sample-aware: a single correct or incorrect prediction is not treated as evidence of a stable calibration pattern.

## Architecture

| Layer | Implementation |
| --- | --- |
| Frontend | React, TypeScript, Vite, and a bespoke responsive CSS design system |
| API | Vercel Serverless Functions |
| Database | Neon Postgres via `@neondatabase/serverless` |
| Authentication | Email/password accounts, scrypt password hashes, and signed HTTP-only sessions |
| Hosting | Vercel production deployment |
| Tests | Vitest tests for forecasting statistics and lifecycle logic |

### Data model

```text
User
 ├── Sessions
 └── Predictions
      ├── Forecast revisions
      └── Resolution details
```

Predictions are the source of truth. Dashboard scores, charts, and category comparisons are derived from the stored forecast and resolution records rather than saved as separate results.

## API overview

Authenticated API routes are intentionally small and ownership-scoped:

| Route | Purpose |
| --- | --- |
| `GET /api/auth/me` | Read the current signed-in user |
| `POST /api/auth/signup` | Create an account and session |
| `POST /api/auth/login` | Sign in and create a session |
| `POST /api/auth/logout` | End the current session |
| `GET /api/predictions` | List the current user’s forecasts and revisions |
| `POST /api/predictions` | Create and lock a new forecast |
| `PATCH /api/predictions/:id/revise` | Record a confidence update for an open forecast |
| `POST /api/predictions/:id/resolve` | Resolve an open forecast |

The server obtains ownership from the signed session rather than accepting a user ID from the client. Forecasts default to `private`; public visibility is an explicit per-forecast choice.

## Run it locally

### Prerequisites

- Node.js 20 or newer
- A Neon Postgres database for account-backed use
- A Vercel project if you want to deploy the API and frontend

### Install and start

```bash
git clone https://github.com/Ayanokoji12786/How-Wrong-Am-I-.git
cd "How-Wrong-Am-I-"
npm install
npm run dev
```

Open the local address printed by Vite. You can explore synthetic demo data without environment variables. To use signup, persistence, and forecast APIs locally, add a `.env.local` file:

```bash
DATABASE_URL=your_neon_postgres_connection_string
AUTH_SECRET=use_a_long_random_secret
```

Never commit `.env.local` or production credentials.

### Quality checks

```bash
npm run lint
npm run test
npm run build
```

## Deploy to Vercel

The production app is live at [how-wrong-am-i.vercel.app](https://how-wrong-am-i.vercel.app).

The repository is linked to Vercel, so pushes to `main` create a production deployment. Configure `DATABASE_URL` and `AUTH_SECRET` in the Vercel project’s Production environment before deploying a fresh instance.

## Project structure

```text
src/
  components/       Reusable interface components
  lib/              Forecast state, API client, types, and statistics
  data/             Synthetic demo forecasts
api/                Vercel Functions for authentication and forecasts
db/schema.sql       Postgres schema
tests/              Statistical test suite
docs/               Product architecture, lifecycle, privacy, and wireframes
```

## Privacy and product principles

- Private is the default.
- Forecast history is preserved so hindsight cannot rewrite the original estimate.
- Metrics describe evidence, not personality traits.
- Demo data is synthetic and kept separate from account-backed records.
- A public headline never automatically exposes private reasoning or revision notes.

## Current boundaries

This is a focused personal calibration tool. It does not yet provide password recovery, account deletion controls, social feeds, automatic source verification, public profiles, or collaborative forecasting. Those additions should be designed only after the core forecasting and privacy workflows are validated.

## License

No license has been specified yet. Add one before reusing or distributing this project outside its intended scope.
