# CRBOX Marketing Ops API Agent

Status: first read-only scaffold.

This agent is a minimal Node.js CLI for CRBOX paid media readiness checks. It is designed to inspect repository evidence today and provide clean module boundaries for future read-only API validation of GA4, GTM, Google Ads, and Meta.

## Safety Boundary

- Mode is `read_only`.
- No GA4, GTM, Google Ads, or Meta write endpoints are called.
- No GTM workspaces, variables, triggers, tags, versions, or publications are created.
- No GA4 custom dimensions, properties, streams, or key events are created or changed.
- No Google Ads conversions, campaigns, budgets, bidding settings, audiences, or assets are created or changed.
- No Meta pixels, events, campaigns, ad sets, ads, audiences, domains, or CAPI integrations are created.
- No customer data is uploaded.

## CLI Structure

```text
scripts/marketing-ops/
  index.js
  config.js
  utils.js
  checks/
    repo-check.js
    ga4-check.js
    gtm-check.js
    google-ads-check.js
    meta-check.js
  report/
    markdown-report.js
```

## Commands

```bash
npm run marketing:check
npm run marketing:check:repo
npm run marketing:check:ga4
npm run marketing:check:gtm
npm run marketing:check:ads
npm run marketing:check:meta
npm run marketing:report
```

`marketing:check` and `marketing:report` update `docs/marketing-ops-readiness-report.md`.

## Current Repository Checks

The repo checker performs conservative static checks against:

- `docs/paid-media-launch-gate-phase-1.md`
- `docs/tracking-plan.md`
- `docs/analytics-taxonomy.md`
- `docs/measurement-guide.md`
- `docs/measurement-map-v1.md`
- `docs/gtm-container-export.json`
- `gtm.config.json`
- `js/analytics.js`

It looks for the expected GA4 Measurement ID, GTM Container ID, approved UTM keys, `gclid`, `fbclid`, `CRBOX.track`, `dataLayer`, sessionStorage attribution persistence, and selected paid-media events.

## Future GA4 Read-Only Checks

- Property exists.
- Web stream exists.
- Measurement ID matches `G-B5BPHFRR18`.
- Required custom dimensions exist.
- Key events are marked as conversions/key events.
- Event names align with the tracking taxonomy.

## Future GTM Read-Only Checks

- Account exists.
- Container exists.
- Workspace exists or can be created later.
- GA4 configuration tag exists.
- Data Layer Variables exist for approved event parameters.
- Triggers exist for approved CRBOX events.
- Meta Pixel base/event tags exist or are planned.
- Raw `gclid`/`fbclid` is not exposed through GTM variables unless explicitly approved.

## Future Google Ads Read-Only Checks

- Customer ID is accessible.
- GA4 imported conversions exist.
- Conversion action names match planned CRBOX events.
- Auto-tagging status can be read.
- No campaign changes are made by this agent.

## Future Meta Read-Only Checks

- Business is accessible.
- Ad account is accessible.
- Pixel exists.
- Domain verification status can be read.
- AEM/event priority can be reviewed manually or through the API if available.
- No audience/customer data is uploaded by this agent.

## Environment Variables

Required variables are documented in `.env.example` with empty placeholders only. Secrets must be provided through environment variables and must never be committed.
