# CRBOX Paid Media Conversion Map

## Executive summary

- Phase: 3B
- Mode: paid_media_conversion_map_planning_only
- Generated: 2026-06-16T00:25:29.231Z
- Overall status: ready_for_import_planning_with_limitations
- This is the planning source of truth before connecting Google Ads, Meta, or any optimization platform.
- Google Ads is ready for import planning, not full execution.
- Meta is planning-only; no Pixel or CAPI implementation is approved here.

## Scope

- Define primary, secondary, micro-conversion, diagnostic-only, and do-not-optimize event groups.
- Define Google Ads import recommendations and Meta Pixel/CAPI planning recommendations.
- Define conservative conversion value, lead quality, privacy, and consent guidance.
- No GA4, GTM, Google Ads, Meta, or runtime writes are performed.

## Source artifacts

- docs/marketing-ops-ga4-monitoring-readiness.json: available
- docs/marketing-ops-ga4-event-processing-validation.json: available
- docs/marketing-ops-ga4-monitoring-dashboard.json: available
- docs/marketing-ops-gtm-publish-result.json: available
- docs/marketing-ops-gtm-post-publish-smoke-test.json: available
- docs/measurement-map-v1.md: available
- docs/analytics-taxonomy.md: available
- docs/tracking-plan.md: available
- docs/paid-media-launch-gate-phase-1.md: available

## Primary conversions

| Event | GA4 key event | Google Ads candidate | Meta candidate | Priority | Minimum volume guidance |
| --- | --- | --- | --- | --- | --- |
| quote_request_submit_success | configured | yes | yes_later | critical | At least 30-50 qualified conversions in a 30-day window per platform/campaign family. |
| signup_success | configured | yes_with_quality_validation | yes_later | high | At least 30-50 qualified conversions in a 30-day window, plus review of activation quality. |

## Secondary conversions

| Event | Google Ads recommendation | Meta recommendation | Secondary only | Risk |
| --- | --- | --- | --- | --- |
| contact_form_submit_success | yes_secondary_observation | secondary | yes | May include support or general inquiries unless form purpose is clearly commercial. |
| calculator_result | yes_secondary_observation | secondary | yes | Not a lead by itself; optimizing to it may favor price shoppers over qualified leads. |
| whatsapp_click | yes_secondary_observation | secondary | yes | Click does not confirm a conversation or qualified lead. |
| phone_click | later_requires_call_tracking | later | yes | Click does not confirm a completed call; call tracking is needed before optimization. |
| email_click | yes_secondary_observation | secondary | yes | Weaker than a confirmed form submission and does not confirm that an email was sent. |

## Micro-conversions

- quote_request_start: The user entered the quote funnel. Do not use as a primary optimization goal; it can over-optimize toward shallow engagement.
- calculator_start: The calculator became interactive. Do not use as a primary optimization goal; it can over-optimize toward shallow engagement.
- calculator_query: The user submitted a calculator query. Do not use as a primary optimization goal; it can over-optimize toward shallow engagement.
- signup_start: The user started registration. Do not use as a primary optimization goal; it can over-optimize toward shallow engagement.
- signup_step: The user progressed through registration steps. Do not use as a primary optimization goal; it can over-optimize toward shallow engagement.
- form_start: The user started a form. Do not use as a primary optimization goal; it can over-optimize toward shallow engagement.
- faq_engage: The user engaged with FAQ content. Do not use as a primary optimization goal; it can over-optimize toward shallow engagement.
- service_card_click: The user clicked a service card. Do not use as a primary optimization goal; it can over-optimize toward shallow engagement.
- cta_click: The user clicked a call-to-action. Do not use as a primary optimization goal; it can over-optimize toward shallow engagement.

## Diagnostic-only events

- scroll_depth: Engagement depth signal; can inflate performance if optimized.
- section_visible: Content visibility signal; useful for UX/CRO, not paid-media optimization.
- nav_click: Navigation behavior; too broad for conversion optimization.
- portal_section_view: Existing-client portal behavior; not new acquisition intent.
- login_start: Existing-user auth behavior; not acquisition conversion.
- login_success: Existing-user auth success; not acquisition conversion.
- login_error: Operational/auth issue signal; never an optimization target.
- package_search: Portal/internal package behavior; useful for product analytics.
- package_detail_view: Portal/internal package detail behavior; existing-client action.
- invoice_upload_start: Operational shipment workflow start; existing-client activation signal.
- invoice_upload_success: Operational activation event; future quality signal, not initial ad-platform import.
- invoice_upload_error: Error event; should not be optimized.
- chat_open: Support/chat engagement; diagnostic unless a future chat-lead strategy is approved.
- chat_message_sent: Support/chat engagement; diagnostic unless qualified lead capture is implemented.
- signup_error: Registration error; useful for diagnostics, never optimization.
- form_abandon: Funnel-friction signal; useful for CRO, not optimization.
- calculator_tab_switch: Calculator UI behavior; diagnostic only.
- package_search_result: Observed portal/internal event; diagnostic only.
- outbound_click: Observed external-click event; too broad for optimization.

## Do-not-optimize list

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

## Google Ads import recommendation

- Start with the smallest safe conversion set.
- Do not import all events.
- Do not include secondary events in the conversions column initially unless business quality is confirmed.
- Do not optimize toward diagnostic events.

## Meta Pixel / CAPI planning recommendation

- Meta remains planning-only.
- `quote_request_submit_success` maps best to Lead in a future Meta plan.
- `signup_success` maps best to CompleteRegistration in a future Meta plan.
- CAPI requires event IDs, consent review, and event match quality review before implementation.

## Conversion value strategy

- Do not assign fake revenue values.
- Start without conversion values.
- Later, use lead quality, activation, shipment, or revenue proxy values from backend/admin data if available.
- Dynamic or offline values require a separate discovery phase.

## Lead quality loop recommendation

- Status: future_phase_only
- Why: Raw leads can include curiosity, duplicates, support requests, spam, or low-quality registrations. Paid media should eventually optimize toward qualified and activated customers.
- Future statuses:
  - quote_submitted
  - contacted
  - quoted
  - converted
  - delivered
  - high_value_customer
  - spam
  - duplicate
  - unqualified
- Requirements:
  - Backend/admin source of truth.
  - Conversion upload or offline conversion API design.
  - Consent/privacy review.
  - Stable IDs or platform click IDs handled without exposing PII in analytics artifacts.

## Privacy and consent considerations

- No PII should be sent to GA4, GTM, Google Ads, or Meta analytics payloads.
- Raw gclid/fbclid should not be exposed in client-side analytics payloads.
- Only boolean flags such as gclid_present and fbclid_present are currently used.
- Meta CAPI or offline conversion upload requires a separate privacy-safe design.
- Consent Mode and Meta consent handling should be reviewed before implementation.

## Decision matrix

| Event | Category | Observability | GA4 key event | Google Ads import | Conversions column | Meta planning | Priority | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| quote_request_submit_success | primary_conversion | observed_recently | configured | yes_primary | true | yes | critical | low |
| signup_success | primary_conversion | observed_recently | configured | yes_primary | later_quality_dependent | yes | high | medium |
| contact_form_submit_success | secondary_conversion | observed_recently | missing | yes_secondary_observation | false | secondary | medium | low |
| calculator_result | secondary_conversion | observed_recently | not_available | yes_secondary_observation | false | secondary | medium | low |
| whatsapp_click | secondary_conversion | observed_recently | not_available | yes_secondary_observation | false | secondary | medium | low |
| phone_click | secondary_conversion | not_observed_recently | not_available | later_requires_call_tracking | false | later | medium | medium |
| email_click | secondary_conversion | observed_recently | not_available | yes_secondary_observation | false | secondary | medium | low |
| quote_request_start | micro_conversion | observed_recently | missing | no_micro_conversion | false | no | low | medium |
| calculator_start | micro_conversion | observed_recently | not_available | no_primary_import | false | no | low | medium |
| calculator_query | micro_conversion | observed_recently | not_available | no_primary_import | false | no | low | medium |
| signup_start | micro_conversion | observed_recently | not_available | no_primary_import | false | no | low | medium |
| signup_step | micro_conversion | observed_recently | not_available | no_primary_import | false | no | low | medium |
| form_start | micro_conversion | observed_recently | not_available | no_primary_import | false | no | low | medium |
| faq_engage | micro_conversion | observed_recently | not_available | no_primary_import | false | no | low | medium |
| service_card_click | micro_conversion | observed_recently | not_available | no_primary_import | false | no | low | medium |
| cta_click | micro_conversion | observed_recently | not_available | no_primary_import | false | no | low | medium |
| scroll_depth | diagnostic_only | observed_recently | not_available | no_diagnostic_only | false | no | none | high_if_optimized |
| section_visible | diagnostic_only | observed_recently | not_available | no_diagnostic_only | false | no | none | high_if_optimized |
| nav_click | diagnostic_only | observed_recently | not_available | no_diagnostic_only | false | no | none | high_if_optimized |
| portal_section_view | diagnostic_only | observed_recently | not_available | no_diagnostic_only | false | no | none | high_if_optimized |
| login_start | diagnostic_only | observed_recently | not_available | no_primary_import | false | no | none | high_if_optimized |
| login_success | diagnostic_only | observed_recently | not_available | no_diagnostic_only | false | no | none | high_if_optimized |
| login_error | diagnostic_only | observed_recently | not_available | no_diagnostic_only | false | no | none | high_if_optimized |
| package_search | diagnostic_only | observed_recently | not_available | no_diagnostic_only | false | no | none | high_if_optimized |
| package_detail_view | diagnostic_only | observed_recently | not_available | no_diagnostic_only | false | no | none | high_if_optimized |
| invoice_upload_start | diagnostic_only | observed_recently | not_available | no_primary_import | false | no | none | high_if_optimized |
| invoice_upload_success | diagnostic_only | observed_recently | not_available | no_primary_import | false | no | none | high_if_optimized |
| invoice_upload_error | diagnostic_only | not_observed_recently | not_available | no_diagnostic_only | false | no | none | high_if_optimized |
| chat_open | diagnostic_only | observed_recently | not_available | no_primary_import | false | no | none | high_if_optimized |
| chat_message_sent | diagnostic_only | observed_recently | not_available | no_primary_import | false | no | none | high_if_optimized |
| signup_error | diagnostic_only | observed_recently | not_available | no_diagnostic_only | false | no | none | high_if_optimized |
| form_abandon | diagnostic_only | observed_recently | not_available | no_diagnostic_only | false | no | none | high_if_optimized |
| calculator_tab_switch | diagnostic_only | observed_recently | not_available | no_primary_import | false | no | none | high_if_optimized |
| package_search_result | diagnostic_only | not_independently_assessed | not_available | no_diagnostic_only | false | no | none | high_if_optimized |
| outbound_click | diagnostic_only | not_independently_assessed | not_available | no_diagnostic_only | false | no | none | high_if_optimized |

## Recommended next phase

Recommended next phase: Phase 3C - Google Ads Import Planning
- Use this conversion map as the approval artifact before connecting Google Ads.
- Do not import all events.
- Do not optimize toward diagnostic events.
- Start with the smallest safe conversion set.
- Keep secondary events as observation/reporting first.

## Safety confirmations

- GA4 writes made: false
- GTM writes made: false
- GTM published: false
- Google Ads touched: false
- Meta touched: false
- Runtime files touched: false
- Secrets printed: false
- Tokens printed: false
- PII printed: false
- Raw click IDs printed: false
