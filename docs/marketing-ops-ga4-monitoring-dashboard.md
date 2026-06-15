# CRBOX GA4 Monitoring Dashboard Artifact

## Executive summary

- Project: CRBOX
- Phase: 3A-3
- Dashboard type: GA4 Monitoring Dashboard Artifact
- Generated: 2026-06-15T23:46:34.723Z
- Overall status: READY WITH LIMITATIONS
- GA4 reporting and Looker Studio planning are ready.
- Google Ads import planning is ready with limitations and requires a conversion map before execution.
- Meta Pixel is ready for planning only.
- Attribution is usable but not fully enriched because some UTM fields are not registered as event-scoped GA4 custom dimensions.

## System health

| Check |Status |Detail |
| --- | --- | --- |
| GA4 Data API available | PASS | pass |
| GA4 property reachable | PASS | 534288079 |
| Measurement ID confirmed | PASS | G-B5BPHFRR18 |
| GTM Version 4 published | PASS | 4 |
| Previous GTM version 3 captured | PASS | 3 |
| Rollback available | PASS | yes |
| Phase 2R smoke test | PASS | 2R |
| Phase 3A-1 readiness | PASS | 3A-1 |
| Phase 3A-2 validation | READY WITH LIMITATIONS | 3A-2 |

## Conversion health

| Event |Observed recently |Key event |Recent volume |Page/flow |Paid-media relevance |
| --- | --- | --- | --- | --- | --- |
| quote_request_start | yes | optional | LOW VOLUME EXPECTED | EXPECTED PAGE | Funnel start / micro-conversion |
| quote_request_submit_success | yes | yes | LOW VOLUME EXPECTED | EXPECTED PAGE | Primary conversion |
| contact_form_submit_success | yes | optional | LOW VOLUME EXPECTED | EXPECTED PAGE | Secondary lead-intent conversion |
| signup_success | yes | yes | HEALTHY RECENT VOLUME | EXPECTED PAGE | Primary conversion |

## Funnel health

- Overall funnel status: READY WITH LIMITATIONS
- Quote funnel: PASS. Quote submit/start ratio is useful directionally, but volume is still low.
- Calculator funnel: PASS WITH NOTES. Calculator ratios are directional; multiple queries/results per calculator start can be normal.
- Contact funnel: PASS WITH CONTEXT. Contact ratio is directional because form_start is global and may include non-contact forms.

## Attribution quality

- Status: READY WITH LIMITATIONS
| Field |Observed |Note |
| --- | --- | --- |
| source | yes | Native GA4 source is available. |
| medium | yes | Native GA4 medium is available. |
| campaign | yes | Native GA4 campaign is available. |
| utm_content | yes | Registered event-scoped custom dimension. |
| utm_term | yes | Registered event-scoped custom dimension. |
| gclid_present | yes | Boolean click-ID presence only; raw ID is excluded. |
| fbclid_present | yes | Boolean click-ID presence only; raw ID is excluded. |
| attribution_touch | yes | Registered attribution touch custom dimension. |

Limitations:
- `utm_source`, `utm_medium`, and `utm_campaign` are not currently registered as GA4 event-scoped custom dimensions.
- Native GA4 source, medium, and campaign are available.
- Attribution is usable but not fully enriched yet.

## Paid-media readiness

| Area |Status |Available now |Remaining before execution |
| --- | --- | --- | --- |
| ga4Reporting | READY | Core conversion events, event volume, funnels, attribution, and taxonomy coverage are readable. | Continue monitoring low-volume conversion events as paid traffic scales. |
| googleAdsImportPlanning | READY WITH LIMITATIONS | Primary conversion candidates are visible and key-event configuration exists for quote_request_submit_success and signup_success. | Finalize the conversion map before importing or optimizing against ad-platform conversions. |
| lookerStudioDashboardPlanning | READY | Dashboard-ready aggregate fields exist for health, funnels, attribution, and data quality. | Define audience-specific views and reporting cadence. |
| metaPixelPlanning | READY FOR PLANNING ONLY | Meta planning can use the validated event taxonomy and conversion priority map. | Do not implement Meta events until a separate approved planning/execution phase. |

## Event taxonomy coverage

- Status: PASS
- Expected events observed: 31
- Expected events not observed: phone_click, invoice_upload_error
- Legacy aliases observed: 0
- Unexpected events observed: package_search_result, outbound_click

Interpretation:
- phone_click not observed is not critical unless phone CTA becomes a paid-media KPI.
- invoice_upload_error not observed is expected during healthy operation because it is an error event.

## Data quality

- Duplicate risk: LOW
- No aggregate duplicate-risk signal was detected.
- No raw gclid/fbclid queried or printed.
- No PII queried or printed.
- No user, client, or session identifiers are included in the dashboard artifact.

## Limitations

- The dashboard is generated from existing local read-only artifacts and does not independently re-query GA4.
- Some conversion events are low-volume before paid campaigns launch.
- Attribution is partially observable; utm_source, utm_medium, and utm_campaign are not directly queryable as event-scoped custom dimensions.
- Duplicate-risk checks are aggregate and privacy-safe, not user-level duplicate detection.

## Recommended next actions

Immediate monitoring:
- Monitor GA4 Realtime.
- Monitor GA4 DebugView.
- Monitor key events.
- Monitor unexpected spikes or drops.
- Monitor duplicate behavior.

Recommended next phase: Phase 3B - Paid Media Conversion Map
- Define primary conversions.
- Define secondary conversions.
- Define diagnostic events.
- Define optimization rules.
- Decide what should and should not be imported into ad platforms before connecting Google Ads.

## Safety confirmations

- No GA4 writes made.
- No GTM writes made.
- GTM not published.
- No Google Ads touched.
- No Meta touched.
- No Replit/runtime files touched.
- No website runtime files touched.
- No secrets printed.
- No tokens printed.
- No PII printed.
- No raw click IDs printed.
