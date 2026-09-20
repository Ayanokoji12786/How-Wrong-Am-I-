# Prediction lifecycle

```text
DRAFT ── lock ──> LOCKED ── publish/activate ──> OPEN
  │                   │                            │
  └── discard ────────┴── void ────────────────────┼──> VOID
                                                     │
                                                     ├── resolve ──> RESOLVED
                                                     │                 │
                                                     └── dispute ───> DISPUTED
                                                                        │
                                      uphold resolution ───────────────┤
                                      void ────────────────────────────┘
```

## State rules

- `DRAFT`: locally editable and never scored.
- `LOCKED`: immutable forecast snapshot with a lock timestamp. It may be activated as `OPEN` when the deadline is valid.
- `OPEN`: eligible for a manual resolution. A belief update appends an immutable revision; it does not overwrite the original lock or create a new prediction.
- `RESOLVED`: outcome and source are recorded; its Brier contribution is included in aggregates.
- `VOID`: excluded from all scoring and calibration aggregates. It retains an audit reason.
- `DISPUTED`: scoring is paused until the resolution is upheld or voided.

The mock creates a `LOCKED` forecast and presents it as active/open immediately. It only allows revision and resolution from the open state. A production service must enforce every transition server-side, preserve audit timestamps, and recompute derived analytics after a resolution change.
