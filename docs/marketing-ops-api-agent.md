# CRBOX Marketing Ops API Agent

Status: Phase 2C-Prep read-only checker, dry-run setup planner, and controlled apply scaffold.

This Node.js CLI inspects CRBOX paid media readiness from two sources:

- Static repository evidence for the tracking foundation.
- Live read-only GA4 Admin API and Google Tag Manager API checks when local credentials are present.

It can also generate a dry-run setup plan for missing GA4 and GTM configuration. The dry-run planner produces proposed actions only; it never creates, updates, deletes, archives, or publishes platform objects.

Phase 2C-Prep adds controlled apply validation and future execution previews. Apply commands validate the dry-run plan and show what would be eligible in a later approved create phase, but execution is disabled and no write endpoints are called.

Google Ads and Meta remain skipped placeholders in Phase 2C-Prep.

## Safety Boundary

- Mode is `read_only` for checks and `dry_run` for planning.
- No GA4, GTM, Google Ads, or Meta write endpoints are called.
- No GTM workspaces, variables, triggers, tags, versions, or publications are created.
- No GA4 custom dimensions, properties, streams, or key events are created or changed.
- No Google Ads conversions, campaigns, budgets, bidding settings, audiences, or assets are created or changed.
- No Meta pixels, events, campaigns, ad sets, ads, audiences, domains, or CAPI integrations are created.
- No customer data is uploaded.
- `.env` is local only, ignored by Git, and never written into reports or plans.
- Human approval is mandatory before any future write/create phase.
- Controlled create execution is not implemented in this phase, even if `MARKETING_AGENT_MODE=controlled_create` or `MARKETING_AGENT_ENABLE_WRITES=true` is set locally.

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
  planner/
    dry-run-plan.js
    ga4-plan.js
    gtm-plan.js
    plan-writer.js
  apply/
    apply-runner.js
    apply-validator.js
    apply-policy.js
    ga4-apply.js
    gtm-apply.js
    apply-report.js
  report/
    markdown-report.js
```

## Environment Loading

The CLI loads `.env` from the repository root before checks or plans run.

The loader:

- Uses built-in Node.js modules only.
- Supports simple `KEY=VALUE` lines.
- Ignores blank lines and comments.
- Does not overwrite existing `process.env` values.
- Does not log loaded values.
- Does not write secrets to files, reports, or plans.

## Required GA4/GTM Credentials

The live read-only checks and dry-run planner can use:

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
`MARKETING_AGENT_MODE` should remain `read_only` or `dry_run`.

`MARKETING_AGENT_ENABLE_WRITES` is documented as a future safety flag and should remain `false`. Phase 2C-Prep refuses execution even if the flag is changed.

## Commands

```bash
npm run marketing:check
npm run marketing:check:repo
npm run marketing:check:ga4
npm run marketing:check:gtm
npm run marketing:check:ads
npm run marketing:check:meta
npm run marketing:plan
npm run marketing:plan:ga4
npm run marketing:plan:gtm
npm run marketing:apply:validate
npm run marketing:apply
npm run marketing:apply:ga4
npm run marketing:apply:gtm
npm run marketing:report
```

`marketing:check` and `marketing:report` update `docs/marketing-ops-readiness-report.md`.

`marketing:plan` writes:

```text
docs/marketing-ops-dry-run-plan.md
docs/marketing-ops-dry-run-plan.json
```

## Dry-Run Planning

Dry-run planning differs from read-only checks:

- Read-only checks inspect current GA4/GTM state.
- Dry-run planning converts missing read-only findings into proposed action objects.
- Proposed actions include `wouldMutate: true` and `executed: false`.
- The planner never calls create/update/delete/archive/publish endpoints.
- The JSON plan is machine-readable and contains no secrets.

The planner proposes:

- GA4 event-scoped custom dimensions for approved missing attribution parameters.
- GA4 key events/conversions for backend/API-gated primary events.
- GTM Data Layer Variables for approved dataLayer keys.
- GTM Custom Event triggers for approved missing CRBOX events.

The planner explicitly does not propose:

- Raw `gclid` or raw `fbclid` variables.
- `calculator_result` or `whatsapp_click` as primary conversions.
- Google Ads conversions/imports.
- Meta Pixel/event tags.
- GTM versions or publication.

## Controlled Apply Prep

Controlled apply commands are validation-only in Phase 2C-Prep:

- `marketing:apply:validate` validates `docs/marketing-ops-dry-run-plan.json` and updates the readiness report.
- `marketing:apply` validates all GA4/GTM proposed actions, summarizes eligible actions, and refuses execution.
- `marketing:apply:ga4` validates GA4 proposed actions and prints future GA4 execution previews.
- `marketing:apply:gtm` validates GTM proposed actions and prints future GTM execution previews.

The validator requires:

- `mode: dry_run`.
- `mutationPerformed: false`.
- `requiresHumanApproval: true`.
- Proposed actions only for `ga4` or `gtm`.
- Allowed GA4 actions: `create_custom_dimension`, `mark_key_event`.
- Allowed GTM actions: `create_data_layer_variable`, `create_custom_event_trigger`.
- `executed: false`, `wouldMutate: true`, and `humanApprovalRequired: true` on every proposed action.
- No raw `gclid` or raw `fbclid` GTM Data Layer Variables.
- No Google Ads, Meta, GTM publish/version/tag, or customer-data actions.

Future execution previews map proposed actions to the write endpoints that a later approved phase would need, but they do not call those endpoints.

## Repository Checks

The repo checker performs conservative static checks against existing tracking docs, `gtm.config.json`, and `js/analytics.js`. It looks for the expected GA4 Measurement ID, GTM Container ID, approved UTM keys, click ID safety, `CRBOX.track`, `dataLayer`, sessionStorage attribution persistence, and selected paid-media events.

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

## Reporting

The readiness report includes:

- Timestamp.
- Mode.
- Repo checks.
- GA4 live API checks.
- GTM live API checks.
- Google Ads skipped status.
- Meta skipped status.
- Missing GA4/GTM items.
- Dry-run plan summary when plan files exist.
- Controlled apply readiness summary when the dry-run plan exists.
- Warnings and permission/scope issues.
- Explicit no-mutation statement.
