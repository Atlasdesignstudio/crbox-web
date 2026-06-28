# Google Ads Controlled Import Apply Execution Approval

## Executive Summary

Phase 3I is approval-only. It creates the final owner approval checklist before any real Google Ads conversion apply execution.

Overall status: **approval_required_before_controlled_apply_execution**

Apply allowed: **false**

Execute now: **false**

## Required Owner Approval Phrase

I approve Phase 3I controlled Google Ads conversion apply execution for CRBOX, limited to mapping existing quote_request_submit_success and signup_success actions, creating secondary excluded conversion actions for contact_form_submit_success, calculator_result, whatsapp_click, and email_click, and keeping phone_click blocked. I understand this will modify Google Ads conversions but will not create campaigns.

## Reuse / Map Existing Actions

| Event | Operation | Include in conversions | Risk | Allowed now |
| --- | --- | --- | --- | --- |
| quote_request_submit_success | map_existing_conversion_action | true | medium | false |
| signup_success | map_existing_conversion_action_quality_pending | quality_dependent_not_primary_bidding_until_confirmed | medium | false |

## Create Secondary Excluded Actions

| Event | Operation | Include in conversions | Risk | Allowed now |
| --- | --- | --- | --- | --- |
| contact_form_submit_success | create_or_import_secondary_excluded_conversion_action | false | low | false |
| calculator_result | create_or_import_secondary_excluded_conversion_action | false | low | false |
| whatsapp_click | create_or_import_secondary_excluded_conversion_action | false | low | false |
| email_click | create_or_import_secondary_excluded_conversion_action | false | low | false |

## Blocked Actions

| Event | Operation | Include in conversions | Risk | Allowed now |
| --- | --- | --- | --- | --- |
| phone_click | blocked_no_operation | false | medium | false |

## Approval Checklist

- Confirm Google Ads account is CRBOX and read-only preflight remains current.
- Confirm existing quote_request_submit_success action is mapped/reused and no duplicate is created.
- Confirm existing signup_success action is mapped/reused with quality-dependent handling.
- Confirm four secondary actions are excluded from conversions column initially.
- Confirm phone_click remains blocked.
- Confirm no campaigns will be created.
- Confirm rollback/no-op handling is accepted.

## Risks

- Mapping the wrong existing conversion action could affect reporting continuity.
- Creating duplicate same-event conversions could inflate reporting; the future apply must block duplicates.
- Secondary conversions must remain excluded from conversions column initially to avoid shallow optimization.
- signup_success remains quality-dependent until downstream quality is confirmed.

## Rollback Notes

- Do not delete conversion actions automatically.
- If an action is configured incorrectly, exclude it from conversions column and document the canonical action.
- If duplicate conversion actions are detected, keep only the approved canonical action active for reporting/bidding.
- If signup quality is poor, keep signup_success observation-only until a quality loop exists.

## Recommended Next Phase

Phase 3J - Google Ads Controlled Import Apply Execution

## Safety Confirmations

- No Google Ads writes were made.
- No conversion actions were created or imported.
- No campaigns were created.
- No GA4, GTM, Meta, or runtime files were modified.
- No secrets or tokens were printed.
