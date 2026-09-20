# Privacy rules

## Default posture

Forecasts default to **private**. They are visible only to their owner. Public sharing must be an explicit, per-forecast opt-in; dashboard metrics never expose private forecasts to other users.

## Enforcement contract

- Every server read and mutation is authorized by the authenticated owner ID, not a client-supplied user ID.
- Visibility is checked on every public query. A direct URL never bypasses privacy.
- Reasoning, pre-mortems, reflections, revisions, and resolution notes are private by default even if the forecast headline is shared.
- Exports include only the requesting user’s records and are generated after authorization.
- Deletion removes or irreversibly anonymizes user-linked records according to the retention policy; derived aggregates must be rebuilt.
- Demo data is synthetic, visibly labeled, and kept separate from account data.

## Mock behavior

This prototype keeps records only in the current browser’s local storage. It does not implement authentication, remote sync, public profiles, or external analytics. Clearing browser storage deletes mock records; the reset-demo control restores only the synthetic seed.

## Data minimization

Collect only information necessary to establish authorship, present forecasts, resolve them, and compute calibration. Do not infer personality traits or make psychological claims. Insights are limited to metrics with adequate sample size and state their evidence level.
