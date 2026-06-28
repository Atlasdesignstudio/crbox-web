# Google Ads Manual Mapping Decision

## Executive Summary

Phase 3G-Review records the owner's manual Google Ads conversion mapping decisions before any Phase 3H execution.

Overall status: **owner_mapping_decisions_recorded_pre_execution**

Apply allowed: **false**

Execute now: **false**

Phase 3H executed: **false**

## Owner Decision Summary

- Approved reuse/map count: 2
- Approved create-secondary count: 4
- Blocked count: 1
- Remaining manual decisions: 0

## Manual Mapping Decisions

| Event | Proposed Google Ads action | Decision | Recommendation | Include in conversions | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| quote_request_submit_success | CRBOX - Quote Request Submitted | APPROVE_REUSE_EXISTING_AS_PRIMARY | reuse_existing | true | medium | approved_to_map_existing |
| signup_success | CRBOX - Signup Completed | APPROVE_REUSE_EXISTING_QUALITY_PENDING | reuse_existing_quality_pending | quality_dependent_not_primary_bidding_until_confirmed | medium | approved_to_map_existing_quality_pending |
| contact_form_submit_success | CRBOX - Contact Form Submitted | APPROVE_CREATE_SECONDARY_EXCLUDED | create_secondary_excluded | false | low | approved_to_create_secondary_excluded |
| calculator_result | CRBOX - Calculator Result Generated | APPROVE_CREATE_SECONDARY_EXCLUDED | create_secondary_excluded | false | low | approved_to_create_secondary_excluded |
| whatsapp_click | CRBOX - WhatsApp Click | APPROVE_CREATE_SECONDARY_EXCLUDED | create_secondary_excluded | false | low | approved_to_create_secondary_excluded |
| email_click | CRBOX - Email Click | APPROVE_CREATE_SECONDARY_EXCLUDED | create_secondary_excluded | false | low | approved_to_create_secondary_excluded |
| phone_click | CRBOX - Phone Click | KEEP_BLOCKED | block_until_call_tracking | false | medium | blocked |

## Specific Mapping Decisions

### quote_request_submit_success

Use/map the existing action **CRBOX Website (web) quote_request_submit_success** as the canonical quote lead conversion. Do not create a duplicate.

### signup_success

Use/map the existing action **CRBOX Website (web) signup_success**. Do not create a duplicate. Keep conversion-column inclusion quality-dependent and do not use as primary bidding until signup quality is confirmed.

## Pre-Execution Decision

Phase 3H is not executed by this artifact. Phase 3H may proceed only to dry-run/apply-plan review. Google Ads writes require separate explicit approval.

## Recommended Next Step

Proceed to Phase 3H dry-run/apply-plan review only. Do not execute Google Ads writes until separately approved.

## Safety Confirmations

- No GA4 writes made.
- No GTM writes made.
- GTM not published.
- Google Ads not touched.
- Google Ads writes made: false.
- Google Ads conversion actions created: false.
- Google Ads conversions imported: false.
- Google Ads campaigns created: false.
- Meta not touched.
- Runtime files not touched.
- No secrets printed.
- No tokens printed.
- No PII printed.
- No raw click IDs printed.
