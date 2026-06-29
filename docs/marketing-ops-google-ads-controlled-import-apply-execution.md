# Google Ads Controlled Import Apply Execution Result

## Summary

Overall status: **controlled_apply_execution_complete**

Google Ads writes made: **true**

Account name: **CRBOX**

Duplicate status: **ready_with_duplicate_review_required**

## Operations

| Event | Planned operation | Status | Include in conversions | Write executed |
| --- | --- | --- | --- | --- |
| quote_request_submit_success | reuse_map_existing_no_duplicate | ready_existing_action_found | true | true |
| signup_success | reuse_map_existing_no_duplicate | ready_existing_action_found | quality_dependent_not_primary_bidding_until_confirmed | true |
| contact_form_submit_success | create_or_import_secondary_excluded | ready_existing_ga4_import_action_found | false | true |
| calculator_result | create_or_import_secondary_excluded | ready_existing_ga4_import_action_found | false | true |
| whatsapp_click | create_or_import_secondary_excluded | ready_existing_ga4_import_action_found | false | true |
| email_click | create_or_import_secondary_excluded | ready_existing_ga4_import_action_found | false | true |
| phone_click | blocked_no_operation | blocked_until_call_tracking | false | false |

## Blockers

No blockers.

## Rollback / No-Op Notes

- If unexpected behavior is observed, set affected conversion actions back to secondary/excluded or HIDDEN only after separate review.
- Do not create duplicate conversion actions for quote_request_submit_success or signup_success.
- Campaigns were not touched.

## Safety

- Approved Google Ads conversion-action writes were made within the Phase 3J scope.
- No campaigns were created.
- No GA4, GTM, Meta, Replit, Vercel, or runtime files were modified.
- No secrets or tokens were printed.
