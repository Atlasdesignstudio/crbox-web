# CRBOX Marketing Ops API Agent Runbook

## Purpose

Use this runbook to run read-only CRBOX paid media readiness checks, generate dry-run setup plans for GA4 and Google Tag Manager, validate controlled apply readiness, run GA4 controlled create when explicitly approved, and prepare GTM controlled create without publishing.

## Preconditions

- Work only on the approved task branch.
- Keep `MARKETING_AGENT_MODE=read_only` or `dry_run`.
- Keep `.env` local and ignored by Git.
- Never commit secrets.
- Never print `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, access tokens, or full credential values.
- Do not run any create/update/delete/archive/publish endpoint without a separate approved task.
- Treat preview apply commands as validation-only. They must refuse execution.
- Run GA4 controlled create only after separate human approval.
- Do not run GTM controlled create without separate future approval.
- Never publish GTM through this agent.

## Install

The checker, planner, apply scaffold, GA4 create executor, and GTM create prep use only built-in Node.js modules. No dependency install is required.

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
MARKETING_AGENT_GTM_CREATE_ENABLED
```

The loader does not overwrite variables already set in the shell. This allows CI or local shell exports to take precedence over `.env`.

`MARKETING_AGENT_ENABLE_WRITES` must stay `false` or blank unless GA4 controlled create has been explicitly approved.

`MARKETING_AGENT_GTM_CREATE_ENABLED` must stay `false` during Phase 2F prep. Future GTM controlled create requires this GTM-specific gate in addition to the general write flag. It does not apply to GA4 controlled create.

## OAuth Re-Authorization for GA4 Controlled Create

If GA4 controlled create fails with `ACCESS_TOKEN_SCOPE_INSUFFICIENT`, obtain a new Google OAuth refresh token for the same OAuth client already configured in local `.env`.

Required scopes for the replacement refresh token:

```text
https://www.googleapis.com/auth/analytics.edit
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/tagmanager.readonly
```

Scope boundaries:

- Keep GTM read-only with `tagmanager.readonly`.
- Do not add a Tag Manager edit scope.
- Do not add Google Ads scopes.
- Do not add Meta scopes.

Operator steps:

1. Use the same `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` that are already present in local `.env`.
2. Complete a Google OAuth consent flow for the exact scopes listed above.
3. Copy only the new refresh token from the OAuth result.
4. Replace only `GOOGLE_REFRESH_TOKEN` in local `.env`.
5. Do not print the refresh token in terminal output, chat, reports, screenshots, or docs.
6. Do not commit `.env`.

After replacing the token, run only safe checks first:

```bash
npm run marketing:check:ga4
npm run marketing:apply:validate
npm run marketing:apply:ga4:create
```

The last command must be run without write-enabled environment variables during token verification, so it should refuse execution while confirming that the OAuth token can refresh and read GA4 state.

## OAuth Re-Authorization for Future GTM Controlled Create

GTM controlled create will require a future refresh token for the same OAuth client with this additional scope:

```text
https://www.googleapis.com/auth/tagmanager.edit.containers
```

Scope boundaries:

- Keep existing analytics scopes as needed for GA4 checks and GA4 controlled create.
- Do not add Google Ads scopes.
- Do not add Meta scopes.
- Do not add broader Tag Manager scopes unless a later approved task explicitly requires them.

This GTM edit scope is not needed for Phase 2F prep validation. Add it only before a future approved GTM real create execution.

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
npm run marketing:apply:gtm:create
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

## GTM Controlled Create Prep

The future GTM controlled create command is intentionally verbose:

```bash
MARKETING_AGENT_MODE=controlled_create MARKETING_AGENT_ENABLE_WRITES=true MARKETING_AGENT_GTM_CREATE_ENABLED=true npm run marketing:apply:gtm:create -- --platform gtm --all --confirm-human-approval
```

Do not run that command unless a human has approved a future GTM execution task.

The command is prepared to create:

- GTM Data Layer Variable `DLV - utm_source`
- GTM Data Layer Variable `DLV - utm_medium`
- GTM Data Layer Variable `DLV - utm_campaign`
- GTM Data Layer Variable `DLV - utm_content`
- GTM Data Layer Variable `DLV - utm_term`
- GTM Data Layer Variable `DLV - gclid_present`
- GTM Data Layer Variable `DLV - fbclid_present`
- GTM Data Layer Variable `DLV - attribution_touch`
- GTM Custom Event trigger `CE - quote_request_submit_success`
- GTM Custom Event trigger `CE - contact_form_submit_success`
- GTM Custom Event trigger `CE - quote_request_start`

Required future gates:

- `MARKETING_AGENT_MODE=controlled_create`
- `MARKETING_AGENT_ENABLE_WRITES=true`
- `MARKETING_AGENT_GTM_CREATE_ENABLED=true`
- `--platform gtm`
- `--confirm-human-approval`
- `--all` or explicit `--action-id` values
- Valid `docs/marketing-ops-dry-run-plan.json`
- Selected actions are GTM only
- Selected action types are `create_data_layer_variable` or `create_custom_event_trigger`

The executor performs duplicate checks immediately before each future create action. If a variable or trigger already exists, it records `skipped_existing`. It blocks raw `gclid` and raw `fbclid` variables.

The refusal/prep result is written to:

```text
docs/marketing-ops-gtm-create-result.md
docs/marketing-ops-gtm-create-result.json
```

GTM publish is intentionally not part of GTM controlled create. After any future GTM create execution, manually check Variables and Triggers in the GTM workspace, use GTM Preview for QA, and obtain separate explicit approval for any publish phase.

## Phase 2G GTM Pre-flight

Run the read-only GTM pre-flight with:

```bash
npm run marketing:gtm:preflight
```

The pre-flight:

- Validates `docs/marketing-ops-dry-run-plan.json`.
- Reads the configured GTM account, container, workspace, variables, and triggers.
- Uses Google OAuth token info to inspect granted scopes when available without printing or writing the access token.
- Checks for the future required scope:
  `https://www.googleapis.com/auth/tagmanager.edit.containers`
- Classifies each approved future GTM action as `already_exists`, `would_create`, `duplicate_risk`, `blocked`, or `unknown_due_to_read_error`.
- Checks duplicates by GTM name and underlying Data Layer Variable key or Custom Event name.
- Writes:
  - `docs/marketing-ops-gtm-preflight.md`
  - `docs/marketing-ops-gtm-preflight.json`

Successful read-only GTM list calls do not prove the GTM edit scope is present. If direct token scope inspection is unavailable, the report uses `requiredScopeStatus: unknown` and does not declare readiness.

Phase 2G never calls GTM create, update, delete, version, or publish endpoints. Keep `MARKETING_AGENT_GTM_CREATE_ENABLED=false`.

## Phase 2H GTM OAuth Re-authorization

Phase 2H prepares a replacement local Google OAuth refresh token with the GTM container edit scope. It does not execute GTM controlled create.

Current verified local status:

- OAuth reauthorization completed successfully.
- `requiredScopeStatus` is `available`.
- GTM workspace, variables, and triggers remain readable.
- 11 future actions remain classified as `would_create`.
- Duplicate risks and blocked unsafe proposals are both zero.
- The system is ready for human review before future controlled create, not automatic execution.
- No GTM write call, object creation, version creation, or publishing occurred.

Add the OAuth redirect URI registered for the existing Google OAuth client to local `.env`:

```text
GOOGLE_OAUTH_REDIRECT_URI=
```

Do not guess this value. It must exactly match an authorized redirect URI configured for the same `GOOGLE_CLIENT_ID`.

Generate the consent URL locally:

```bash
npm run marketing:oauth:gtm-edit-url
```

The command writes the complete URL to the gitignored local file:

```text
.oauth-gtm-edit-url.local.txt
```

It does not print the full client ID, access token, refresh token, or client secret. The requested scope set is exactly:

```text
https://www.googleapis.com/auth/analytics.edit
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/tagmanager.readonly
https://www.googleapis.com/auth/tagmanager.edit.containers
```

Complete Google consent with the same OAuth client used by local `.env`. Exchange the authorization code using the operator's trusted OAuth tool or existing Google OAuth workflow. Phase 2H intentionally does not add an authorization-code exchange command because that would handle refresh-token values.

Replace only `GOOGLE_REFRESH_TOKEN` in local `.env`. Never commit `.env`, the authorization URL file, authorization codes, or token results.

Keep these values disabled:

```text
MARKETING_AGENT_MODE=read_only
MARKETING_AGENT_ENABLE_WRITES=false
MARKETING_AGENT_GTM_CREATE_ENABLED=false
```

After manually replacing the refresh token, run only:

```bash
npm run marketing:gtm:preflight
npm run marketing:report
```

Expected verification:

- `requiredScopeStatus` becomes `available`.
- GTM workspace, variables, and triggers remain readable.
- 11 future GTM actions remain classified without duplicate risks.
- A ready result means ready for human review before a future controlled-create phase. It is not execution approval.
- GTM tag creation, version creation, and publishing remain blocked.

Even after successful scope verification, GTM controlled create still requires a separate approved task and every environment, CLI, plan-validation, and human-approval gate.

## Phase 2Q-A GTM Version/Publish OAuth Scope

Phase 2Q-A prepares a replacement local refresh token that retains the existing Analytics and Tag Manager scopes and adds:

```text
https://www.googleapis.com/auth/tagmanager.edit.containerversions
```

Generate the consent URL locally:

```bash
npm run marketing:oauth:gtm-publish-url
```

The command writes the complete URL to `.oauth-gtm-publish-url.local.txt` with restricted file permissions. The file is ignored by Git. The helper does not print the full URL, access the client secret or current refresh token, exchange an authorization code, or call GTM APIs.

The requested scope set is:

```text
https://www.googleapis.com/auth/analytics.edit
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/tagmanager.readonly
https://www.googleapis.com/auth/tagmanager.edit.containers
https://www.googleapis.com/auth/tagmanager.edit.containerversions
```

Open the local file, complete Google consent, and exchange the authorization code manually through OAuth Playground or the configured trusted redirect flow. Replace only `GOOGLE_REFRESH_TOKEN` in local `.env`. Never share or commit the authorization code, access token, refresh token, client secret, full client ID, full OAuth URL, or `.env`.

After replacement, perform a separate read-only token scope and GTM readiness verification. Do not create a container version or publish GTM as part of reauthorization.

Phase 2Q-B completed that read-only verification. Google token info confirmed all five requested scopes, including `tagmanager.edit.containerversions`. The GTM workspace remained readable with 14 approved pending changes, zero unexpected changes, zero duplicate risk, and no forbidden parameters, PII, or raw click IDs. No GTM write call, version creation, or publish was performed. This result permits a separately approved Phase 2Q retry; it does not execute or approve publish by itself.

## Interpreting Results

- `PASS` means the static or read-only API check found expected evidence.
- `WARN` means the checker completed but found missing or inconsistent evidence.
- `SKIPPED` means credentials are missing or an endpoint is unavailable/permission-limited.
- Dry-run proposed actions are not executed.
- `wouldMutate: true` means the action would mutate a platform if later approved, not that it was executed.
- Future execution previews describe potential API calls only; they are not API calls.
- GA4 controlled create result artifacts describe what happened locally and must not contain secrets.
- GTM controlled create result artifacts describe either refused/not-executed prep status or future execution status and must not contain secrets.

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
- Tags.
- Versions.
- Publications.

Variables and triggers may only be created by the dedicated future GTM controlled create command after every safety gate passes. GTM publish remains separate and blocked.

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

Google Ads and Meta are intentionally skipped. Do not add API calls for those platforms until a later approved task.

## Controlled Apply Safety

Before GA4 or GTM controlled create, a human must approve the exact action IDs from the JSON plan and the command invocation.

GTM publish is not part of Phase 2F. A later task must separately review workspace changes, container versioning, preview QA, and publishing approval.

Google Ads and Meta remain out of scope for controlled apply.

## Security Rules

- Never hardcode secrets.
- Never print secrets.
- Mask values that look like tokens, secrets, passwords, keys, refresh tokens, or access tokens.
- Do not create, update, publish, delete, archive, or mutate GA4, GTM, Google Ads, or Meta objects.
- Do not create GTM versions or publish GTM.
- Do not upload customer data.

## Expected Limitations

- GA4 key events may be exposed as key events or conversion events depending on API version and property state.
- Some live checks may be skipped if the OAuth token lacks the required read-only scope.
- Dry-run planning is only a proposed action list; it is not an implementation or approval.
- Controlled apply in Phase 2C-Prep is validation and preview only; it is not a write implementation.
- GA4 controlled create is implemented but must not be run without explicit approval and the required env/flag gates.
- GTM controlled create is prepared but must not be run without future explicit approval, GTM edit scope, and required env/flag gates.
- GTM publish is a separate future phase and remains blocked.
- Repo checks are conservative static checks and are not a substitute for GTM Preview, GA4 DebugView, Google Ads diagnostics, or Meta Events Manager verification.

## Rollback Note

GA4 custom dimensions and key events should not be casually deleted after creation. If a mistake occurs, document the issue and use the GA4 admin process to disable, archive, or remediate the configuration if supported.
