# MVP architecture

## Product boundary

The initial product is a client-side, interactive mock designed to validate the complete forecasting loop. It persists data in browser storage and ships seeded data as **Demo data**. The data-access boundary is intentionally isolated so it can be replaced by authenticated API calls and PostgreSQL without rewriting domain logic or UI.

## Layers

```text
Route screens
  └─ feature components (dashboard, journal, prediction form, detail)
       ├─ state/store boundary (demo seed + browser persistence)
       ├─ validation boundary (input constraints and lifecycle guards)
       └─ domain library
            ├─ prediction lifecycle
            └─ statistics (Brier, buckets, calibration, sharpness, categories)
```

## Chosen stack

- React + TypeScript + Vite for a fast, self-contained mock.
- Vanilla CSS with design tokens for a bespoke visual system and zero component-library lock-in.
- Vitest for deterministic scoring and lifecycle tests.
- Browser local storage only for the mock data repository.

## Production replacement path

The mock repository maps cleanly to a typed Next.js / PostgreSQL service later:

| Mock boundary | Production replacement |
| --- | --- |
| `forecastStore` | authenticated typed API + Postgres repository |
| browser `localStorage` | PostgreSQL, row-level user authorization |
| seeded demo forecaster | account-scoped user records |
| client-side validation | Zod validation on both client and server |
| derived dashboard selectors | server-side aggregate/cache backed by raw forecasts |

## MVP data model

`User` owns many `Prediction` records. A prediction may have many `ForecastRevision` records and at most one `Resolution` record. A prediction’s current probability, selected outcome, deadline, reasoning, visibility, and lifecycle status are stored on the prediction; its historical changes are immutable revisions.

```text
User 1 ── * Prediction 1 ── * ForecastRevision
                    └──── 0..1 Resolution
```

For the eventual relational schema:

| Entity | Essential fields |
| --- | --- |
| users | id, display_name, timezone, privacy_mode, created_at |
| predictions | id, user_id, text, probability, selected_outcome, deadline, reasoning, category, visibility, status, locked_at |
| prediction_revisions | id, prediction_id, previous_probability, new_probability, reason, created_at |
| prediction_resolutions | id, prediction_id, outcome, source, note, resolved_at, resolver_user_id |
| reflections | id, prediction_id, user_id, text, tag, created_at |

Raw predictions and resolution outcomes are the source of truth; all charts and metrics are derived from those records.

## Statistical contract

For an event predicted with probability `p` and binary outcome `o` (`1` for yes, `0` for no):

```text
Brier contribution = (p - o)²
```

Lower is better. The UI reports the mean Brier score and a 0–100 friendly score as `(1 - mean Brier) × 100`. Calibration buckets compare the average forecast probability to the observed event rate; every claim is sample-gated.
