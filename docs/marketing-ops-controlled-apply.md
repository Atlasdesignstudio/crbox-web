# CRBOX Marketing Ops Controlled Apply Prep

Status: Phase 2C-Prep validation scaffold. No platform writes are enabled.

## Purpose

This document describes the controlled apply framework that validates `docs/marketing-ops-dry-run-plan.json` and previews future GA4/GTM setup actions. It prepares the safety gates for a later approved create phase, but it does not create, update, delete, publish, archive, or mutate any GA4, GTM, Google Ads, or Meta object.

## What Apply Commands Do Today

```bash
npm run marketing:apply:validate
npm run marketing:apply
npm run marketing:apply:ga4
npm run marketing:apply:gtm
```

- `marketing:apply:validate` validates the dry-run plan and writes the readiness report.
- `marketing:apply` validates all proposed GA4/GTM actions, summarizes eligible actions, and refuses execution.
- `marketing:apply:ga4` validates GA4 actions and prints future GA4 execution previews.
- `marketing:apply:gtm` validates GTM actions and prints future GTM execution previews.

All apply commands preserve this boundary:

```text
Controlled create execution is not enabled in Phase 2C-Prep. No platform mutations were performed.
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

These action types are validated only. They are not executed in Phase 2C-Prep.

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

Human approval is required because every proposed action has `wouldMutate: true` even though Phase 2C-Prep does not execute it.

## Environment Safety

`MARKETING_AGENT_MODE` must remain `read_only` or `dry_run` for this task.

`MARKETING_AGENT_ENABLE_WRITES=false` is documented as a future feature flag placeholder. Phase 2C-Prep refuses execution even if this flag is changed.

Never commit `.env`. Never include secrets in reports, plans, logs, or docs.

## Why GTM Publish Is Excluded

Publishing changes a live GTM container version and has a broader blast radius than creating draft workspace resources. GTM publish requires a separate review of workspace diffs, version naming, QA evidence, rollback strategy, and explicit approval.

## Mutation Statement

No controlled apply mutations were performed. Phase 2C-Prep validates apply readiness only.
