# CRBOX Marketing Ops Dry-Run Plan

Generated: 2026-06-01T19:52:35.315Z

Mode: **dry_run**

> No GA4 or GTM mutations were performed. This is a dry-run plan only.

## Source Findings

- GA4 live state verified: true
- GTM live state verified: true
- GA4 property: 534288079
- GA4 measurement ID: G-B5BPHFRR18
- GTM account: 6351590751
- GTM container: 250367469
- GTM public container ID: GTM-5WD8N53F
- GTM workspace: Default Workspace

## Proposed GA4 Custom Dimensions

- `create_custom_dimension` — gclid_present (ga4, risk: low, executed: false)
- `create_custom_dimension` — fbclid_present (ga4, risk: low, executed: false)
- `create_custom_dimension` — attribution_touch (ga4, risk: low, executed: false)
- `create_custom_dimension` — utm_content (ga4, risk: low, executed: false)
- `create_custom_dimension` — utm_term (ga4, risk: low, executed: false)

## Proposed GA4 Key Events / Conversions

- `mark_key_event` — signup_success (ga4, risk: medium, executed: false)
- `mark_key_event` — quote_request_submit_success (ga4, risk: medium, executed: false)

## Proposed GTM Data Layer Variables

- `create_data_layer_variable` — DLV - utm_source (gtm, risk: low, executed: false)
- `create_data_layer_variable` — DLV - utm_medium (gtm, risk: low, executed: false)
- `create_data_layer_variable` — DLV - utm_campaign (gtm, risk: low, executed: false)
- `create_data_layer_variable` — DLV - utm_content (gtm, risk: low, executed: false)
- `create_data_layer_variable` — DLV - utm_term (gtm, risk: low, executed: false)
- `create_data_layer_variable` — DLV - gclid_present (gtm, risk: low, executed: false)
- `create_data_layer_variable` — DLV - fbclid_present (gtm, risk: low, executed: false)
- `create_data_layer_variable` — DLV - attribution_touch (gtm, risk: low, executed: false)

## Proposed GTM Custom Event Triggers

- `create_custom_event_trigger` — quote_request_submit_success (gtm, risk: low/medium, executed: false)
- `create_custom_event_trigger` — contact_form_submit_success (gtm, risk: low, executed: false)
- `create_custom_event_trigger` — quote_request_start (gtm, risk: low, executed: false)

## Items Explicitly Not Proposed

- GA4 custom dimensions for `utm_source`, `utm_medium`, and `utm_campaign` because GA4 has built-in acquisition dimensions.
- Primary conversion/key-event setup for `calculator_result` or `whatsapp_click`.
- Google Ads conversions or imports.
- Meta Pixel, Meta event tags, audiences, or CAPI setup.
- GTM variables for raw `gclid` or raw `fbclid`.

## Blocked Actions

- `gtm:create_data_layer_variable` — gclid: Raw gclid must remain private in sessionStorage and must not be exposed through GTM variables.
- `gtm:create_data_layer_variable` — fbclid: Raw fbclid must remain private in sessionStorage and must not be exposed through GTM variables.
- `ga4:mark_key_event` — calculator_result: calculator_result is a soft intent/audience event and must not be proposed as a primary conversion goal in this phase.
- `ga4:mark_key_event` — whatsapp_click: whatsapp_click is a soft contact intent event and must not be proposed as a primary conversion goal in this phase.
- `google_ads:create_conversion` — create_conversion: Google Ads conversion creation/import is out of scope for Phase 2B.
- `meta:create_pixel_or_event_tag` — create_pixel_or_event_tag: Meta Pixel and event tag setup remains a later phase.

## Risk Assessment

- low: 15
- medium: 2
- low/medium: 1

## Human Approval Checklist

- [ ] Confirm GA4 custom dimensions should be created exactly as proposed.
- [ ] Confirm GA4 key events/conversions should be marked exactly as proposed.
- [ ] Confirm GTM Data Layer Variables should be created exactly as proposed.
- [ ] Confirm GTM Custom Event triggers should be created exactly as proposed.
- [ ] Confirm no raw `gclid` or `fbclid` variables are introduced.
- [ ] Confirm no GTM version is created or published without separate approval.

## Warnings

- None.

## Mutation Statement

No GA4 or GTM mutations were performed. This is a dry-run plan only.
