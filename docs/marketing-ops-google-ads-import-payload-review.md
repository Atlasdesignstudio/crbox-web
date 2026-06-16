# CRBOX Google Ads Import Payload Review

## Executive summary

- Phase: 3D
- Mode: google_ads_import_payload_review_only
- Generated: 2026-06-16T09:40:27.002Z
- Overall status: ready_for_payload_review_with_manual_prerequisites
- Payload validation status: pass_with_manual_prerequisites
- Google Ads import payload has been prepared for review.
- No Google Ads changes are made in this phase.
- No conversion actions are created.
- No conversions are imported.
- No campaigns are created.
- The payload is not approved for execution yet.
- Account/linking prerequisites still require manual confirmation.

## Scope

- Payload review only.
- No Google Ads linking, conversion import, conversion action creation, campaign setup, or audience setup is performed.
- No GA4, GTM, Meta, or runtime changes are performed.
- applyAllowed: false
- executeNow: false

## Source artifacts

- docs/marketing-ops-google-ads-import-planning.json: available
- docs/marketing-ops-google-ads-import-planning.md: available
- docs/marketing-ops-paid-media-conversion-map.json: available
- docs/marketing-ops-paid-media-conversion-map.md: available
- docs/marketing-ops-ga4-monitoring-readiness.json: available
- docs/marketing-ops-ga4-event-processing-validation.json: available
- docs/marketing-ops-ga4-monitoring-dashboard.json: available
- docs/marketing-ops-gtm-publish-result.json: available
- docs/marketing-ops-gtm-post-publish-smoke-test.json: available
- docs/measurement-map-v1.md: available
- docs/analytics-taxonomy.md: available
- docs/tracking-plan.md: available
- docs/paid-media-launch-gate-phase-1.md: available

## Payload scope

- mode: review_only_no_apply
- applyAllowed: false
- requiresExplicitApprovalBeforeApply: true
- requiresGoogleAdsAccountConfirmation: true
- requiresDuplicateCheckBeforeApply: true
- requiresGA4GoogleAdsLinkConfirmation: true
- requiresConversionGoalReview: true

## Proposed conversion action payload

## Primary candidates

| Event | Action name | Type | Conversions column | Bidding use | Value strategy | Execution |
| --- | --- | --- | --- | --- | --- | --- |
| quote_request_submit_success | CRBOX - Quote Request Submitted | primary_import_candidate | true | primary_bidding | no_fake_value_initially | not_executed |
| signup_success | CRBOX - Signup Completed | primary_quality_dependent_candidate | quality_dependent | primary_bidding_or_secondary_observation | no_fake_value_initially | not_executed |

## Secondary observation candidates

| Event | Action name | Type | Conversions column | Bidding use | Value strategy | Execution |
| --- | --- | --- | --- | --- | --- | --- |
| contact_form_submit_success | CRBOX - Contact Form Submitted | secondary_observation_candidate | false | secondary_observation | no_fake_value_initially | not_executed |
| calculator_result | CRBOX - Calculator Result Generated | secondary_observation_candidate | false | remarketing_signal_or_secondary_observation | no_fake_value_initially | not_executed |
| whatsapp_click | CRBOX - WhatsApp Click | secondary_observation_candidate | false | secondary_observation | no_fake_value_initially | not_executed |
| email_click | CRBOX - Email Click | secondary_observation_candidate | false | secondary_observation | no_fake_value_initially | not_executed |

## Blocked candidates

| Event | Action name | Type | Conversions column | Bidding use | Value strategy | Execution |
| --- | --- | --- | --- | --- | --- | --- |
| phone_click | CRBOX - Phone Click | blocked_until_call_tracking | false | blocked_until_call_tracking | no_fake_value_initially | blocked_not_executed |

## Explicit excluded events

| Event | Import allowed | Conversions column | Bidding use | Reason | Risk if imported |
| --- | --- | --- | --- | --- | --- |
| scroll_depth | false | false | do_not_import | Broad engagement/navigation signal that can inflate performance and optimize toward shallow behavior. | Could inflate conversion counts and train bidding toward low-value engagement. |
| section_visible | false | false | do_not_import | Broad engagement/navigation signal that can inflate performance and optimize toward shallow behavior. | Could inflate conversion counts and train bidding toward low-value engagement. |
| nav_click | false | false | do_not_import | Broad engagement/navigation signal that can inflate performance and optimize toward shallow behavior. | Could inflate conversion counts and train bidding toward low-value engagement. |
| portal_section_view | false | false | do_not_import | Portal/internal lifecycle or operational event, not an acquisition conversion. | Could optimize acquisition campaigns toward existing-client or operational behavior. |
| login_success | false | false | do_not_import | Portal/internal lifecycle or operational event, not an acquisition conversion. | Could optimize acquisition campaigns toward existing-client or operational behavior. |
| login_error | false | false | do_not_import | Portal/internal lifecycle or operational event, not an acquisition conversion. | Could optimize toward broken or failed sessions. |
| invoice_upload_error | false | false | do_not_import | Portal/internal lifecycle or operational event, not an acquisition conversion. | Could optimize toward broken or failed sessions. |
| package_search | false | false | do_not_import | Portal/internal lifecycle or operational event, not an acquisition conversion. | Could optimize acquisition campaigns toward existing-client or operational behavior. |
| package_detail_view | false | false | do_not_import | Portal/internal lifecycle or operational event, not an acquisition conversion. | Could optimize acquisition campaigns toward existing-client or operational behavior. |
| package_search_result | false | false | do_not_import | Portal/internal lifecycle or operational event, not an acquisition conversion. | Could optimize acquisition campaigns toward existing-client or operational behavior. |
| outbound_click | false | false | do_not_import | Broad engagement/navigation signal that can inflate performance and optimize toward shallow behavior. | Could inflate conversion counts and train bidding toward low-value engagement. |
| form_abandon | false | false | do_not_import | Failure or abandonment signal; useful diagnostically, unsafe as an optimization goal. | Could inflate conversion counts and train bidding toward low-value engagement. |
| signup_error | false | false | do_not_import | Failure or abandonment signal; useful diagnostically, unsafe as an optimization goal. | Could optimize toward broken or failed sessions. |

## Payload validation rules

- Google Ads account ID must be confirmed.: required_before_apply
- GA4-Google Ads link status must be confirmed.: required_before_apply
- Existing conversion actions must be listed.: required_before_apply
- Planned conversion action names must be checked against existing actions.: required_before_apply
- Duplicate action names must block execution.: required_before_apply
- Duplicate GA4 event imports must block execution unless explicitly approved.: required_before_apply
- quote_request_submit_success must remain the only immediate primary bidding candidate unless explicitly changed.: required_before_apply
- Secondary conversions must not be included in conversions column initially.: required_before_apply
- signup_success must not be included in conversions column unless quality is approved.: required_before_apply
- phone_click must remain blocked until call tracking exists.: required_before_apply
- Do-not-import events must not appear in the apply payload.: required_before_apply
- No fake conversion values.: required_before_apply
- No PII or raw click IDs.: required_before_apply
- No campaigns created in import apply phase.: required_before_apply

## Account prerequisites

| Prerequisite | Status |
| --- | --- |
| Confirm Google Ads account ID | requires_manual_confirmation |
| Confirm manager account / MCC relationship if applicable | requires_manual_confirmation |
| Confirm GA4 property is linked or can be linked | requires_manual_confirmation |
| Confirm user permissions | requires_manual_confirmation |
| Confirm whether auto-tagging is enabled | requires_manual_confirmation |
| Confirm imported GA4 key events are available in Google Ads | requires_manual_confirmation |
| Confirm Google Ads conversion goals UI status | requires_manual_confirmation |
| Confirm whether existing conversion actions already exist | requires_manual_confirmation |
| Confirm timezone and currency if available | requires_manual_confirmation |
| Confirm whether enhanced conversions are desired later | requires_manual_confirmation |
| Confirm consent requirements | requires_manual_confirmation |

## Future apply payload summary

- Mode: review_only
- Platform: google_ads
- Operation type: conversion_import_or_create_review
- Account ID: requires_manual_confirmation
- GA4 property link: requires_manual_confirmation
- Planned actions: 7
- Excluded events: 13
- Apply allowed: false
- Execute now: false

## Human approval checklist

- [ ] Approve Google Ads account ID.
- [ ] Approve GA4-Google Ads link.
- [ ] Approve canonical conversion action names.
- [ ] Approve primary conversion set.
- [ ] Decide signup handling: primary immediately, secondary observation first, or exclude until quality validated.
- [ ] Approve secondary observation events.
- [ ] Confirm phone click remains blocked.
- [ ] Confirm do-not-import events.
- [ ] Confirm no fake values.
- [ ] Confirm no campaigns are created.
- [ ] Confirm rollback/no-op plan.

## Rollback / no-op interpretation

- Phase 3D performs no rollback because it performs no execution.
- If a future apply creates something incorrectly, do not delete automatically.
- Exclude incorrect or duplicate actions from the conversions column.
- Rename or deprecate incorrect actions if needed.
- Document the canonical conversion action.
- Pause or remove incorrect actions from bidding use.
- Review before deletion.

## Recommended next phase

Recommended next phase: Phase 3E - Google Ads Read-only Account Preflight

- Read the Google Ads account safely before producing an executable apply.
- Confirm account ID, access, existing conversion actions, duplicate risks, GA4 link status, conversion goals state, timezone, and currency.
- Do not recommend execution until account prerequisites are confirmed.

## Safety confirmations

- GA4 writes made: false
- GTM writes made: false
- GTM published: false
- Google Ads touched: false
- Google Ads conversion actions created: false
- Google Ads conversions imported: false
- Google Ads campaigns created: false
- Meta touched: false
- Runtime files touched: false
- Secrets printed: false
- Tokens printed: false
- PII printed: false
- Raw click IDs printed: false
- Apply allowed: false
- Execute now: false
