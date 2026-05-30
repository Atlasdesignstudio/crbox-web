# CRBOX Marketing Ops API Agent Runbook

## Purpose

Use this runbook to run the first read-only marketing operations checker for CRBOX paid media readiness.

## Preconditions

- Work only on branch `codex/marketing-ops-agent`.
- Confirm the working tree is clean before starting new implementation work.
- Keep `MARKETING_AGENT_MODE=read_only`.
- Do not add secrets to the repository.

## Install

This first version uses only built-in Node.js modules. No dependency install is required.

## Run All Checks

```bash
npm run marketing:check
```

This runs repository, GA4, GTM, Google Ads, and Meta checker modules. It also writes:

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

- `PASS` means the static or local check found expected evidence.
- `WARN` means the checker completed but found missing or inconsistent evidence.
- `SKIPPED` means the platform check is intentionally not executed yet or credentials are missing.

Missing credentials should not block repository checks.

## Security Rules

- Never hardcode secrets.
- Never print secrets.
- Values that look like tokens, secrets, passwords, keys, refresh tokens, or access tokens are masked in output.
- Do not create, update, publish, delete, or mutate GA4, GTM, Google Ads, or Meta objects.
- Do not upload customer data.

## Expected First-Version Limitations

- Platform checks are placeholders until read-only API clients are added.
- Repo checks are conservative static checks and are not a substitute for GTM Preview, GA4 DebugView, Google Ads conversion diagnostics, or Meta Events Manager verification.
- The checker does not load `.env` files. Export environment variables in the shell or CI environment before running future API checks.
