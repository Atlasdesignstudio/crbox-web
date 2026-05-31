# CRBOX Marketing Ops API Agent Runbook

## Purpose

Use this runbook to run read-only CRBOX paid media readiness checks across repository evidence, GA4 Admin API, and Google Tag Manager API.

## Preconditions

- Work only on the approved task branch.
- Keep `MARKETING_AGENT_MODE=read_only`.
- Keep `.env` local and ignored by Git.
- Never commit secrets.
- Never print `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, access tokens, or full credential values.

## Install

The Phase 2A checker uses only built-in Node.js modules. No dependency install is required.

## Local `.env`

The CLI automatically loads `.env` from the repository root.

Required GA4/GTM variables:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
GA4_PROPERTY_ID
GA4_MEASUREMENT_ID
GTM_ACCOUNT_ID
GTM_CONTAINER_ID
MARKETING_AGENT_MODE
```

The loader does not overwrite variables already set in the shell. This allows CI or local shell exports to take precedence over `.env`.

## Run All Checks

```bash
npm run marketing:check
```

This runs repository, GA4, GTM, Google Ads, and Meta checker modules. It writes:

```text
docs/marketing-ops-readiness-report.md
```

## Run Individual Checks

```bash
npm run marketing:check:repo
npm run marketing:check:ga4
npm run marketing:check:gtm
npm run marketing:check:ads
npm run marketing:check:meta
```

## Generate Report

```bash
npm run marketing:report
```

## Interpreting Results

- `PASS` means the static or read-only API check found expected evidence.
- `WARN` means the checker completed but found missing or inconsistent evidence.
- `SKIPPED` means credentials are missing or an endpoint is unavailable/permission-limited.

Missing credentials do not block repository checks.

## GA4 Read-Only Behavior

The GA4 checker may call only read-only Admin API endpoints, including property get/list-style checks for data streams, custom dimensions, and key events/conversion events.

It must not create or modify:

- Properties.
- Data streams.
- Custom dimensions.
- Key events or conversion events.

## GTM Read-Only Behavior

The GTM checker may call only read-only Tag Manager API endpoints, including account/container/workspace get/list calls and list calls for variables, triggers, and tags.

It must not create or modify:

- Workspaces.
- Variables.
- Triggers.
- Tags.
- Versions.
- Publications.

## Google Ads and Meta

Google Ads and Meta are intentionally skipped in Phase 2A. Do not add API calls for those platforms until a later approved task.

## Security Rules

- Never hardcode secrets.
- Never print secrets.
- Mask values that look like tokens, secrets, passwords, keys, refresh tokens, or access tokens.
- Do not create, update, publish, delete, or mutate GA4, GTM, Google Ads, or Meta objects.
- Do not upload customer data.

## Expected Limitations

- GA4 key events may be exposed as key events or conversion events depending on API version and property state.
- Some live checks may be skipped if the OAuth token lacks the required read-only scope.
- Repo checks are conservative static checks and are not a substitute for GTM Preview, GA4 DebugView, Google Ads diagnostics, or Meta Events Manager verification.
