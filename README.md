# How Wrong Am I?

**Think you’re good at predicting the future? Prove it.**

How Wrong Am I? is a calibration journal: users lock probability forecasts, resolve them when reality is known, and learn whether their confidence matches their accuracy. This repository currently contains a functional, privacy-first MVP mock with local demo data—no account data is transmitted.

## Project stages

1. Product architecture, primary-screen wireframes, privacy rules, and lifecycle documentation.
2. Interactive prediction journal and a statistically tested scoring engine.
3. Calibration dashboard, revision history, manual resolution, responsive polish, and verification.

## Local development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run test
npm run build
```

## Key documents

- [Architecture](docs/architecture.md)
- [Primary screen wireframes](docs/wireframes.md)
- [Prediction lifecycle](docs/prediction-lifecycle.md)
- [Privacy model](docs/privacy.md)

## Scope

The initial MVP deliberately focuses on binary forecasts, calibration measurement, resolutions, revisions, history, and privacy. Community feeds, automatic integrations, AI insights, and research tools are explicitly deferred until the statistical core has production backing.
