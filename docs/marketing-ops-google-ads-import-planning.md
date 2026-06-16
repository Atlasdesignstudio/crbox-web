# CRBOX Google Ads Import Planning

## Executive summary

- Phase: 3C
- Mode: google_ads_import_planning_only
- Generated: 2026-06-16T08:29:21.925Z
- Overall status: ready_for_google_ads_import_planning_with_limitations
- Google Ads is ready for import planning only.
- No Google Ads changes are made in this phase.
- No conversion actions are created.
- No campaigns are created.
- This document is the approval artifact before any Google Ads execution phase.

## Scope

- Planning/preflight only.
- No Google Ads linking, conversion import, conversion action creation, or campaign setup is performed.
- No GA4, GTM, Meta, or runtime changes are performed.

## Source artifacts

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

## Recommended import set

| Event | Category | Import recommendation | Conversion action name | Conversions column | Bidding use | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| quote_request_submit_success | primary_import_candidate | yes_primary | CRBOX - Quote Request Submitted | true | primary_bidding | low |
| signup_success | primary_import_candidate | yes_primary | CRBOX - Signup Completed | later_quality_dependent | primary_bidding_or_secondary_observation | medium_quality_dependent |
| contact_form_submit_success | secondary_observation | yes_secondary_observation | CRBOX - Contact Form Submitted | false | secondary_observation | medium_if_used_for_bidding |
| calculator_result | secondary_observation | yes_secondary_observation | CRBOX - Calculator Result Generated | false | remarketing_signal | medium_if_used_for_bidding |
| whatsapp_click | secondary_observation | yes_secondary_observation | CRBOX - WhatsApp Click | false | secondary_observation | medium_if_used_for_bidding |
| email_click | secondary_observation | yes_secondary_observation | CRBOX - Email Click | false | secondary_observation | medium_if_used_for_bidding |
| phone_click | later_blocked_candidate | later_requires_call_tracking | CRBOX - Phone Click | false | no | blocked_until_call_tracking |

Do-not-import candidates:
- scroll_depth: Optimizing to scroll can inflate engagement quality.
- section_visible: Passive visibility signal.
- nav_click: Generic navigation signal.
- portal_section_view: Can inflate performance or represent low-value/existing-client behavior.
- login_success: Can inflate performance or represent low-value/existing-client behavior.
- login_error: Can inflate performance or represent low-value/existing-client behavior.
- invoice_upload_error: Can inflate performance or represent low-value/existing-client behavior.
- package_search: Can inflate performance or represent low-value/existing-client behavior.
- package_detail_view: Can inflate performance or represent low-value/existing-client behavior.
- package_search_result: Can inflate performance or represent low-value/existing-client behavior.
- outbound_click: Can inflate performance or represent low-value/existing-client behavior.
- form_abandon: Can inflate performance or represent low-value/existing-client behavior.
- signup_error: Can inflate performance or represent low-value/existing-client behavior.

## Proposed conversion action names

| Event | Proposed Google Ads conversion action name |
| --- | --- |
| quote_request_submit_success | CRBOX - Quote Request Submitted |
| signup_success | CRBOX - Signup Completed |
| contact_form_submit_success | CRBOX - Contact Form Submitted |
| calculator_result | CRBOX - Calculator Result Generated |
| whatsapp_click | CRBOX - WhatsApp Click |
| email_click | CRBOX - Email Click |
| phone_click | CRBOX - Phone Click |

Naming rationale:
- Use business-readable and platform-readable names.
- Prefix each action with CRBOX to avoid generic names such as Lead.
- Avoid duplicate names and duplicate actions for the same GA4 event.
- Keep names stable so reporting and future import payloads do not drift.

## Include-in-conversions-column plan

| Event | Include in conversions column | Reasoning |
| --- | --- | --- |
| quote_request_submit_success | true | Clearest lead outcome; keep primary bidding focused on final quote request submission. |
| signup_success | quality_dependent | Quality-dependent; include only after activation/lead quality is acceptable, or start as secondary observation. |
| contact_form_submit_success | false | Useful for reporting and observation, but excluding initially avoids inflating conversions and bidding toward shallow actions. |
| calculator_result | false | Useful for reporting and observation, but excluding initially avoids inflating conversions and bidding toward shallow actions. |
| whatsapp_click | false | Useful for reporting and observation, but excluding initially avoids inflating conversions and bidding toward shallow actions. |
| email_click | false | Useful for reporting and observation, but excluding initially avoids inflating conversions and bidding toward shallow actions. |
| phone_click | false | Blocked until call tracking confirms completed and qualified calls. |
| scroll_depth | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |
| section_visible | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |
| nav_click | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |
| portal_section_view | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |
| login_success | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |
| login_error | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |
| invoice_upload_error | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |
| package_search | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |
| package_detail_view | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |
| package_search_result | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |
| outbound_click | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |
| form_abandon | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |
| signup_error | false | Diagnostic/internal/error/broad event; exclude from the conversions column. |

## Bidding use plan

- quote_request_submit_success: primary_bidding
- signup_success: primary_bidding_or_secondary_observation_depending_on_quality
- contact_form_submit_success: secondary_observation
- calculator_result: remarketing_signal_or_secondary_observation
- whatsapp_click: secondary_observation
- email_click: secondary_observation
- phone_click: blocked_until_call_tracking
- diagnosticEvents: do_not_import

## Attribution and duplicate-risk planning

Risks:
- Imported GA4 conversions may be attributed differently inside Google Ads.
- GA4 and Google Ads attribution models may differ.
- Duplicate conversion actions can inflate performance if the same event is imported multiple ways.
- Secondary events can inflate the conversions column if included too early.
- Importing both shallow and final events as primary conversions can train bidding toward low-value actions.
- Portal/internal lifecycle events should not be imported as acquisition conversions.

Controls:
- Check existing Google Ads conversions before creating or importing new ones.
- Match by conversion action name and GA4 event source.
- Never create duplicate conversion actions for the same GA4 event without explicit approval.
- Use one primary quote submit conversion action initially.
- Keep secondary conversions as observation first.
- Exclude diagnostic and portal/internal events from import.

## Account/linking prerequisites

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

## Execution-readiness checklist

- [ ] Review Phase 3B conversion map.
- [ ] Approve the Google Ads import set.
- [ ] Confirm Google Ads account ID.
- [ ] Confirm no duplicate conversion actions.
- [ ] Confirm GA4-Google Ads link status.
- [ ] Confirm key events in GA4.
- [ ] Confirm conversion action names.
- [ ] Confirm which conversions are included in the conversions column.
- [ ] Confirm values are set to no value / no fake value initially.
- [ ] Confirm secondary conversions are observation-only.
- [ ] Confirm rollback / no-op plan.

## Rollback / no-op plan

- Phase 3C action: no_rollback_performed_planning_only
- If conversion actions are created incorrectly, pause or remove them from the conversions column.
- Rename/deprecate incorrect actions if needed; do not delete without approval.
- If duplicate conversion actions exist, exclude duplicates from the conversions column and document the canonical action.
- If event quality is poor, move the action from primary bidding to secondary observation.
- If signup quality is poor, exclude signup_success from the conversions column until a quality loop exists.

## Conversion value strategy

- Strategy: no_fake_values
- Do not assign fake conversion values.
- Start with no value or the default platform setting only if required.
- Do not use dynamic values until backend/admin source of truth exists.
- Use offline values only in a future approved phase.
- Quote submit and signup can later receive values from lead quality or shipment/revenue proxies.

## Future execution sequence

1. Read-only Google Ads account preflight.
2. Verify GA4-Google Ads linking status.
3. List existing Google Ads conversion actions.
4. Compare existing actions against planned action names.
5. Produce final apply payload review.
6. Controlled import/create only after explicit approval.
7. Post-import verification.
8. Observe for several days before using conversions for automated bidding.

## Recommended next phase

Recommended next phase: Phase 3D - Google Ads Import Payload Review

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
