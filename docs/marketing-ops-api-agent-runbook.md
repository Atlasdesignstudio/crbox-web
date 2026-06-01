# CRBOX Marketing Ops API Agent Runbook

## Purpose

Use this runbook to run read-only CRBOX paid media readiness checks, generate dry-run setup plans for GA4 and Google Tag Manager, validate controlled apply readiness, and run GA4-only controlled create when explicitly approved.

## Preconditions

- Work only on the approved task branch.
- Keep `MARKETING_AGENT_MODE=read_only` or `dry_run`.
- Keep `.env` local and ignored by Git.
- Never commit secrets.
- Never print `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, access tokens, or full credential values.
- Do not run any create/update/delete/archive/publish endpoint without a separate approved task.
- Treat preview apply commands as validation-only. They must refuse execution.
- Run GA4 controlled create only after separate human approval.

## Install

The Phase 2D checker, planner, apply scaffold, and GA4 create executor use only built-in Node.js modules. No dependency install is required.

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
MARKETING_AGENT_ENABLE_WRITES
```

The loader does not overwrite variables already set in the shell. This allows CI or local shell exports to take precedence over `.env`.

`MARKETING_AGENT_ENABLE_WRITES` must stay `false` or blank unless GA4 controlled create has been explicitly approved.

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

## Generate Dry-Run Plans

```bash
npm run marketing:plan
npm run marketing:plan:ga4
npm run marketing:plan:gtm
```

`marketing:plan` runs GA4 and GTM read-only checks, then writes the complete dry-run plan:

```text
docs/marketing-ops-dry-run-plan.md
docs/marketing-ops-dry-run-plan.json
```

`marketing:plan:ga4` refreshes only the GA4 section of the plan.

`marketing:plan:gtm` refreshes only the GTM section of the plan.

## Generate Report

```bash
npm run marketing:report
```

The readiness report references the latest dry-run plan summary if the plan JSON exists.

## Validate Controlled Apply Readiness

```bash
npm run marketing:apply:validate
```

This command loads `.env`, validates `docs/marketing-ops-dry-run-plan.json`, writes the readiness report, and performs no platform writes.

The validation checks:

- Plan mode is `dry_run`.
- `mutationPerformed` is `false`.
- Human approval is required.
- Every proposed action is GA4 or GTM only.
- Every proposed action is in the allowlist.
- Raw `gclid` and raw `fbclid` GTM variables are not proposed.
- `calculator_result` and `whatsapp_click` are not proposed as key events/conversions.
- GTM publish, version, tag, customer-data, Google Ads, and Meta actions are not proposed.
- No credential-like fields or values are present in the plan JSON.

## Preview Future Apply Execution

```bash
npm run marketing:apply
npm run marketing:apply:ga4
npm run marketing:apply:gtm
```

These commands validate the plan, print eligible action counts, generate future execution previews, and refuse execution with:

```text
Controlled create execution is not enabled in Phase 2C-Prep. No platform mutations were performed.
```

The preview commands recognize selection flags such as `--platform`, `--action-id`, `--all`, and `--confirm-human-approval`, but they do not execute writes.

## GA4 Controlled Create

The GA4-only controlled create command is intentionally verbose:

```bash
MARKETING_AGENT_MODE=controlled_create MARKETING_AGENT_ENABLE_WRITES=true npm run marketing:apply:ga4:create -- --platform ga4 --all --confirm-human-approval
```

Do not run that command unless a human has approved execution.

The command can create:

- GA4 custom dimension `gclid_present`
- GA4 custom dimension `fbclid_present`
- GA4 custom dimension `attribution_touch`
- GA4 custom dimension `utm_content`
- GA4 custom dimension `utm_term`
- GA4 key event `signup_success`
- GA4 key event `quote_request_submit_success`

Required gates:

- `MARKETING_AGENT_MODE=controlled_create`
- `MARKETING_AGENT_ENABLE_WRITES=true`
- `--platform ga4`
- `--confirm-human-approval`
- `--all` or explicit `--action-id` values
- Valid `docs/marketing-ops-dry-run-plan.json`

The executor performs duplicate checks immediately before each create action. If an object already exists, it records `skipped_existing`. If an API error occurs, execution stops and writes the failed action into:

```text
docs/marketing-ops-ga4-create-result.md
docs/marketing-ops-ga4-create-result.json
```

The key event create endpoint is implemented through the GA4 Admin API `properties/{propertyId}/keyEvents` create method. If credentials lack the required edit scope or the property rejects the call, the command records a failure and stops.

## Interpreting Results

- `PASS` means the static or read-only API check found expected evidence.
- `WARN` means the checker completed but found missing or inconsistent evidence.
- `SKIPPED` means credentials are missing or an endpoint is unavailable/permission-limited.
- Dry-run proposed actions are not executed.
- `wouldMutate: true` means the action would mutate a platform if later approved, not that it was executed.
- Future execution previews describe potential API calls only; they are not API calls.
- GA4 controlled create result artifacts describe what happened locally and must not contain secrets.

## GA4 Read-Only Behavior

The GA4 checker may call only read-only Admin API endpoints, including property get/list-style checks for data streams, custom dimensions, and key events/conversion events.

It must not create or modify:

- Properties.
- Data streams.

Custom dimensions and key events may only be created by the dedicated GA4 controlled create command after every safety gate passes.

## GTM Read-Only Behavior

The GTM checker may call only read-only Tag Manager API endpoints, including account/container/workspace get/list calls and list calls for variables, triggers, and tags.

It must not create or modify:

- Workspaces.
- Variables.
- Triggers.
- Tags.
- Versions.
- Publications.

## Reviewing the Dry-Run Plan

Review both files:

```text
docs/marketing-ops-dry-run-plan.md
docs/marketing-ops-dry-run-plan.json
```

Before any future write phase, a human must approve:

- GA4 custom dimension display names, parameter names, scope, and descriptions.
- GA4 key event/conversion names and optimization role.
- GTM Data Layer Variable names, dataLayer keys, and default values.
- GTM Custom Event trigger names and event names.
- The explicit exclusion of raw `gclid` and raw `fbclid` variables.

## Google Ads and Meta

Google Ads and Meta are intentionally skipped in Phase 2D. Do not add API calls for those platforms until a later approved task.

## Controlled Apply Safety

Before GA4 controlled create, a human must approve the exact action IDs from the JSON plan and the command invocation.

GTM publish is not part of Phase 2D. A later task must separately review workspace changes, container versioning, and publishing approval.

Google Ads and Meta remain out of scope for controlled apply.

## Security Rules

- Never hardcode secrets.
- Never print secrets.
- Mask values that look like tokens, secrets, passwords, keys, refresh tokens, or access tokens.
- Do not create, update, publish, delete, archive, or mutate GA4, GTM, Google Ads, or Meta objects.
- Do not upload customer data.

## Expected Limitations

- GA4 key events may be exposed as key events or conversion events depending on API version and property state.
- Some live checks may be skipped if the OAuth token lacks the required read-only scope.
- Dry-run planning is only a proposed action list; it is not an implementation or approval.
- Controlled apply in Phase 2C-Prep is validation and preview only; it is not a write implementation.
- GA4 controlled create is implemented but must not be run without explicit approval and the required env/flag gates.
- Repo checks are conservative static checks and are not a substitute for GTM Preview, GA4 DebugView, Google Ads diagnostics, or Meta Events Manager verification.

## Rollback Note

GA4 custom dimensions and key events should not be casually deleted after creation. If a mistake occurs, document the issue and use the GA4 admin process to disable, archive, or remediate the configuration if supported.
