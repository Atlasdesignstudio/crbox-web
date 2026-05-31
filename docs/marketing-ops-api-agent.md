# CRBOX Marketing Ops API Agent

Status: Phase 2A read-only GA4/GTM checker.

This Node.js CLI inspects CRBOX paid media readiness from two sources:

- Static repository evidence for the tracking foundation.
- Live read-only GA4 Admin API and Google Tag Manager API checks when local credentials are present.

Google Ads and Meta remain skipped placeholders in Phase 2A.

## Safety Boundary

- Mode is `read_only`.
- No GA4, GTM, Google Ads, or Meta write endpoints are called.
- No GTM workspaces, variables, triggers, tags, versions, or publications are created.
- No GA4 custom dimensions, properties, streams, or key events are created or changed.
- No Google Ads conversions, campaigns, budgets, bidding settings, audiences, or assets are created or changed.
- No Meta pixels, events, campaigns, ad sets, ads, audiences, domains, or CAPI integrations are created.
- No customer data is uploaded.
- `.env` is local only, ignored by Git, and never written into reports.

## CLI Structure

```text
scripts/marketing-ops/
  index.js
  config.js
  env-loader.js
  google-auth.js
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

## Environment Loading

The CLI loads `.env` from the repository root before checks run.

The loader:

- Uses built-in Node.js modules only.
- Supports simple `KEY=VALUE` lines.
- Ignores blank lines and comments.
- Does not overwrite existing `process.env` values.
- Does not log loaded values.
- Does not write secrets to files or reports.

## Required GA4/GTM Credentials

The Phase 2A live checks require:

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

`GA4_MEASUREMENT_ID` is expected to be `G-B5BPHFRR18`.
`MARKETING_AGENT_MODE` should remain `read_only`.

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

## Repository Checks

The repo checker performs conservative static checks against:

- `docs/paid-media-launch-gate-phase-1.md`
- `docs/tracking-plan.md`
- `docs/analytics-taxonomy.md`
- `docs/measurement-guide.md`
- `docs/measurement-map-v1.md`
- `docs/gtm-container-export.json`
- `gtm.config.json`
- `js/analytics.js`

It looks for the expected GA4 Measurement ID, GTM Container ID, approved UTM keys, `gclid`, `fbclid`, `CRBOX.track`, `dataLayer`, sessionStorage attribution persistence, selected paid-media events, and raw click ID safety signals.

## GA4 Read-Only Checks

When credentials are present, the GA4 checker uses read-only Admin API calls to verify:

- Property accessibility for `GA4_PROPERTY_ID`.
- Web data stream with measurement ID `G-B5BPHFRR18`.
- Event-scoped custom dimensions:
  - `gclid_present`
  - `fbclid_present`
  - `attribution_touch`
  - `utm_content`
  - `utm_term`
- Key events/conversions:
  - `signup_success`
  - `quote_request_submit_success`

If key-event endpoints are unavailable or permission-limited, the checker reports a skipped/warn state rather than failing hard.

## GTM Read-Only Checks

When credentials are present, the GTM checker uses read-only API calls to verify:

- GTM account accessibility.
- GTM container accessibility.
- Workspace listing.
- Data Layer Variables for approved attribution keys.
- Custom Event triggers for approved CRBOX paid-media events.
- GA4-related tag presence.
- Meta-related tag presence/planning signal.
- Raw `gclid`/`fbclid` exposure risk in GTM variables.

The checker never creates a workspace, variable, trigger, tag, version, or publication.

## Google Ads and Meta

Google Ads and Meta remain skipped in Phase 2A. Their modules are preserved for future read-only checks, but no API calls are made to those platforms yet.

## Reporting

The readiness report includes:

- Timestamp.
- Mode.
- Repo checks.
- GA4 live API checks.
- GTM live API checks.
- Google Ads skipped status.
- Meta skipped status.
- Missing GA4 custom dimensions.
- Missing GA4 key events/conversions.
- Missing GTM Data Layer Variables.
- Missing GTM triggers.
- Warnings and permission/scope issues.
- Explicit no-mutation statement.
