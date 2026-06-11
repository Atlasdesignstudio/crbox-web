# CRBOX Marketing Ops Controlled Apply

Status: Phase 2F GTM controlled create prep is implemented behind explicit safety gates. GA4 controlled create is available when approved; GTM execution is prepared but must not be run in this prep phase. GTM publish, Google Ads, and Meta writes remain disabled.

## Purpose

This document describes the controlled apply framework that validates `docs/marketing-ops-dry-run-plan.json`, previews GA4/GTM setup actions, and can execute approved create actions only when every required safety gate is present. Phase 2F adds GTM controlled create preparation for workspace variables and triggers, but the real GTM write command is not approved to run in this prep task. GTM publish, Google Ads, and Meta writes are still blocked.

## What Apply Commands Do Today

```bash
npm run marketing:apply:validate
npm run marketing:apply
npm run marketing:apply:ga4
npm run marketing:apply:ga4:create
npm run marketing:apply:gtm
npm run marketing:apply:gtm:create
```

- `marketing:apply:validate` validates the dry-run plan and writes the readiness report.
- `marketing:apply` validates all proposed GA4/GTM actions, summarizes eligible actions, and refuses execution.
- `marketing:apply:ga4` validates GA4 actions and prints future GA4 execution previews.
- `marketing:apply:ga4:create` can execute GA4-only controlled create, but only with explicit env vars and flags.
- `marketing:apply:gtm` validates GTM actions and prints future GTM execution previews.
- `marketing:apply:gtm:create` validates GTM create gates and writes a local not-executed result artifact unless explicitly approved in a later task.

Preview commands preserve this boundary:

```text
Controlled create execution is disabled for this command. No platform mutations were performed.
```

## Required Validation Gates

The dry-run plan must satisfy all of these conditions:

- The plan file exists and parses as JSON.
- `mode` is `dry_run`.
- `mutationPerformed` is `false`.
- `requiresHumanApproval` is `true`.
- `ga4.proposedActions` and `gtm.proposedActions` are arrays.
- `blockedActions` is an array.
- Every proposed action has `mode: dry_run`, `executed: false`, `humanApprovalRequired: true`, and `wouldMutate: true`.
- Every proposed action uses platform `ga4` or `gtm`.
- Every proposed action is in the allowlist.
- No proposed action contains suspicious credential-like fields or values.

## Future Allowlist

GA4 action types:

- `create_custom_dimension`
- `mark_key_event`

GTM action types:

- `create_data_layer_variable`
- `create_custom_event_trigger`

GA4 action types may be executed only by `marketing:apply:ga4:create` when every safety gate passes. GTM action types may be executed only by `marketing:apply:gtm:create` in a future approved task when every safety gate passes; do not run the write-enabled GTM command during Phase 2F prep.

## Phase 2D GA4 Controlled Create

The GA4 create command is intentionally manual:

```bash
MARKETING_AGENT_MODE=controlled_create MARKETING_AGENT_ENABLE_WRITES=true npm run marketing:apply:ga4:create -- --platform ga4 --all --confirm-human-approval
```

Required gates:

- `MARKETING_AGENT_MODE=controlled_create`
- `MARKETING_AGENT_ENABLE_WRITES=true`
- `--platform ga4`
- `--confirm-human-approval`
- `--all` or explicit `--action-id` values from `docs/marketing-ops-dry-run-plan.json`
- Valid dry-run plan
- Selected actions must be GA4 only
- Selected actions must be `create_custom_dimension` or `mark_key_event`
- No GTM, Google Ads, Meta, raw click ID, publish, version, tag, or customer-data action can be selected

The executor re-checks GA4 state before each create call. Existing custom dimensions or key events are recorded as `skipped_existing`.

Implemented GA4 create endpoints:

- `POST https://analyticsadmin.googleapis.com/v1beta/properties/{propertyId}/customDimensions`
- `POST https://analyticsadmin.googleapis.com/v1beta/properties/{propertyId}/keyEvents`

The key event endpoint is implemented using the official GA4 Admin API v1beta keyEvents create method. If the API rejects a key event create call for permissions, scope, or property state, execution stops and records the failed action.

## Phase 2F GTM Controlled Create Prep

The future GTM create command is intentionally manual:

```bash
MARKETING_AGENT_MODE=controlled_create MARKETING_AGENT_ENABLE_WRITES=true MARKETING_AGENT_GTM_CREATE_ENABLED=true npm run marketing:apply:gtm:create -- --platform gtm --all --confirm-human-approval
```

Do not run that write-enabled command during Phase 2F prep.

Required future gates:

- `MARKETING_AGENT_MODE=controlled_create`
- `MARKETING_AGENT_ENABLE_WRITES=true`
- `MARKETING_AGENT_GTM_CREATE_ENABLED=true`
- `--platform gtm`
- `--confirm-human-approval`
- `--all` or explicit `--action-id` values from `docs/marketing-ops-dry-run-plan.json`
- Valid dry-run plan
- Selected actions must be GTM only
- Selected actions must be `create_data_layer_variable` or `create_custom_event_trigger`
- No GA4, Google Ads, Meta, raw click ID, publish, version, tag, or customer-data action can be selected

Prepared GTM create methods:

- `POST https://tagmanager.googleapis.com/tagmanager/v2/accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}/variables`
- `POST https://tagmanager.googleapis.com/tagmanager/v2/accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}/triggers`

The executor re-checks GTM workspace state before each future create call. Existing variables or triggers are recorded as `skipped_existing`. It also avoids duplicate Data Layer Variables by matching either the GTM variable name or the underlying data layer key, and avoids duplicate Custom Event triggers by matching either the trigger name or event name.

Approved future GTM actions:

- 8 Data Layer Variables: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid_present`, `fbclid_present`, and `attribution_touch`.
- 3 Custom Event triggers: `quote_request_submit_success`, `contact_form_submit_success`, and `quote_request_start`.

Raw `gclid` and raw `fbclid` variables remain blocked. GTM tag creation, version creation, and publishing remain impossible through this phase.

Future GTM controlled create requires a refresh token that includes:

```text
https://www.googleapis.com/auth/tagmanager.edit.containers
```

This scope is not needed for Phase 2F prep validation. Keep Google Ads and Meta scopes out of the OAuth token.

`MARKETING_AGENT_GTM_CREATE_ENABLED` is a GTM-specific execution gate in addition to the general write flag. It must remain `false` during Phase 2F prep. It is not required for GA4 controlled create.

## Blocked Actions

The apply validator blocks or rejects:

- Raw `gclid` GTM Data Layer Variables.
- Raw `fbclid` GTM Data Layer Variables.
- `calculator_result` as a key event/conversion.
- `whatsapp_click` as a key event/conversion.
- GTM container publishing.
- GTM version creation.
- GTM tag creation.
- Google Ads conversion creation.
- Meta Pixel or event tag creation.
- Customer-data uploads.

Google Ads and Meta remain out of scope.

## Future Execution Previews

GA4 previews include the action id, property id, parameter or event name, risk level, and the future write resource that would be needed, such as:

- `properties/{propertyId}/customDimensions:create`
- `properties/{propertyId}/keyEvents:create or conversionEvents:create`

GTM previews include the action id, account id, container id, workspace path, variable or trigger details, risk level, and the future write method that would be needed, such as:

- `tagmanager.accounts.containers.workspaces.variables.create`
- `tagmanager.accounts.containers.workspaces.triggers.create`

These previews are local objects only. No API write call is made.

## Human Approval Requirements

Before any future create phase, a human must approve:

- The exact JSON plan file.
- The exact action IDs to execute.
- The final GA4 custom dimension payloads.
- The final GA4 key event/conversion payloads.
- The final GTM variable and trigger payloads.
- The decision to keep raw `gclid` and raw `fbclid` out of GTM.

Human approval is required because every proposed action has `wouldMutate: true`.

## Environment Safety

`MARKETING_AGENT_MODE` should remain `read_only` or `dry_run` unless a human explicitly approves GA4 controlled create execution.

`MARKETING_AGENT_ENABLE_WRITES=false` is the safe default. Setting it to `true` is not sufficient by itself; the GA4 create command still requires the explicit CLI flags.

`MARKETING_AGENT_GTM_CREATE_ENABLED=false` is the GTM-specific safe default. Future GTM create execution requires both write flags plus every CLI and plan-validation gate.

Never commit `.env`. Never include secrets in reports, plans, logs, or docs.

## Why GTM Publish Is Excluded

Publishing changes a live GTM container version and has a broader blast radius than creating draft workspace resources. GTM publish requires a separate review of workspace diffs, version naming, QA evidence, rollback strategy, and explicit approval.

After any future GTM create execution, manually review the workspace Variables and Triggers, use GTM Preview for QA, and obtain a separate explicit approval before any publish phase.

## Mutation Statement

No GTM publish, Google Ads, or Meta controlled apply mutations are supported. GA4 controlled create mutations occur only when the dedicated GA4 command passes every safety gate. GTM controlled create mutations must not be run during Phase 2F prep and are limited to approved workspace variables and triggers in a future task.

## Rollback Note

GA4 custom dimensions and key events should not be casually deleted after creation. If a mistake occurs, document the issue and use the GA4 admin process to disable, archive, or otherwise remediate the configuration if supported.
