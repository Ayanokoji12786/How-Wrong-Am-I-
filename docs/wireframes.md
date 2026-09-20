# Primary screen wireframes

These layouts establish information hierarchy, not final pixels. The implementation uses the same six routes/panels in a compact app shell.

## 1. Landing

```text
┌─────────────────────────────────────────────────────────────────┐
│ HOW WRONG AM I?                                  Sign in  [Demo] │
│ Think you’re good at predicting the future? Prove it.             │
│ [Test your calibration]    See how it works                       │
│                                                                    │
│          calibration curve / dots / diagonal expectation          │
│                                                                    │
│  FORECAST → ASSIGN PROBABILITY → WAIT FOR REALITY → LEARN         │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Dashboard

```text
┌─────────────┬───────────────────────────────────────────────────┐
│ Logo        │ Good afternoon, Alex              [+ Forecast]     │
│ Dashboard   │ ┌─────────────┐ ┌────────┐ ┌─────────────────────┐ │
│ Journal     │ │ Calibration │ │ Brier  │ │ Resolved forecasts │ │
│ Calibration │ │ 82 / 100    │ │ .146   │ │ 184                 │ │
│ Learn       │ └─────────────┘ └────────┘ └─────────────────────┘ │
│             │ ┌─────────────────────────┐ ┌───────────────────┐ │
│             │ │ Calibration curve       │ │ Upcoming reality  │ │
│             │ └─────────────────────────┘ └───────────────────┘ │
└─────────────┴───────────────────────────────────────────────────┘
```

## 3. New prediction

```text
┌─────────────┬───────────────────────────────────────────────────┐
│ Navigation  │ New forecast                    Step 2 of 2         │
│             │ Will [the event occur?________________________]    │
│             │ I predict [YES]  with confidence                   │
│             │                    72%                             │
│             │ ───────────────●──────────── probability slider    │
│             │ Deadline [date]  Category [Technology]             │
│             │ Reasoning [____________________________________]   │
│             │ [Lock forecast]                                    │
└─────────────┴───────────────────────────────────────────────────┘
```

## 4. Prediction detail

```text
┌─────────────┬───────────────────────────────────────────────────┐
│ Navigation  │ FORECAST #042       Locked Sep 12 · Private         │
│             │ Will ...?                                             │
│             │ YES  72%                 Reality check: Open        │
│             │ Reasoning and forecast timeline                      │
│             │ [Update belief]  [Resolve outcome]                   │
└─────────────┴───────────────────────────────────────────────────┘
```

## 5. Calibration

```text
┌─────────────┬───────────────────────────────────────────────────┐
│ Navigation  │ Your calibration                                     │
│             │ [curve: expected diagonal / observed blue dots]     │
│             │ Buckets: 0–9 ... 90–100 with n, avg, accuracy       │
│             │ [confidence distribution histogram]                 │
└─────────────┴───────────────────────────────────────────────────┘
```

## 6. Journal

```text
┌─────────────┬───────────────────────────────────────────────────┐
│ Navigation  │ Forecast journal            Search [____________]   │
│             │ [Open] [Resolved] [High confidence] [All categories]│
│             │ ┌─────────────────────────────────────────────────┐ │
│             │ │ 82% YES  Will ...?        OPEN · due Oct 04     │ │
│             │ ├─────────────────────────────────────────────────┤ │
│             │ │ 64% NO   Will ...?        RESOLVED · .130 Brier │ │
│             │ └─────────────────────────────────────────────────┘ │
└─────────────┴───────────────────────────────────────────────────┘
```
