# CODEX RULES — Read before making any changes

## Branch

You are working on the `codex/marketing-ops-agent` branch only.

Never commit to `main`.
Never modify the files listed under DO NOT TOUCH.

## You may create or modify

- `scripts/marketing-ops/`
- `docs/marketing-ops-readiness-report.md`
- `docs/marketing-ops-api-agent.md`
- `docs/marketing-ops-api-agent-runbook.md`
- `package.json`
- `.env.example`
- `.gitignore`
- `CODEX_RULES.md`

## Package rules

This project currently has no `package.json`.

If you create one:

- keep it minimal
- use it only for marketing-ops CLI scripts
- do not introduce frontend build tooling
- do not change how the existing Flask/static website runs
- do not modify deployment behavior

## Do not touch

- Any `.html` file
- Any `.css` file
- `js/analytics.js`
- `js/auth.js`
- `js/main.js`
- `js/portal-api.js`
- `js/calculator-engine.js`
- `server.py`
- `healthcheck.py`
- `gtm.config.json`
- `scripts/inject-gtm.js`
- `docs/measurement-map-v1.md`
- `docs/tracking-plan.md`
- `docs/analytics-taxonomy.md`
- `docs/measurement-guide.md`
- `docs/paid-media-launch-gate-phase-1.md`
- `docs/gtm-container-export.json`
- `scripts/*.py`
- `scripts/e2e-*.js`

## Secrets

Never hardcode any secret, API key, password, refresh token, access token, client secret, or private credential.

Use `process.env.VARIABLE_NAME` for all credentials.

Document required env vars only in `.env.example` with empty placeholder values.

Never print secrets to logs.

Mask tokens if any error message contains them.

## First task scope

The first task is read-only.

Do not create, update, publish, delete, or mutate platform objects.

No GTM variables, triggers, or tags should be created yet.

No GA4 custom dimensions should be created yet.

No Google Ads conversions should be created yet.

No Meta Pixel should be created yet.

Only build the checker and report generator.
