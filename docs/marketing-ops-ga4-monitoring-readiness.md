# CRBOX GA4 Monitoring Validation Readiness

Generated: 2026-06-15T22:10:09.867Z

Phase: **3A-1**

Mode: **ga4_monitoring_readiness_read_only**

## Executive Summary

- Readiness status: **pass**
- Readiness detail: **pass**
- GA4 property reachable: true
- Measurement ID confirmed: true
- Recent expected events observed: 14
- Expected key events configured: 2/5

## Scope

- Verify local auth and required GA4 read scope.
- Read GA4 Admin configuration for the property, web stream, custom dimensions, and key events.
- Read aggregate recent event counts through the GA4 Data API.
- Check aggregate attribution-dimension observability without storing dimension values.
- Perform no platform or runtime mutations.

## Source Of Truth

- `docs/marketing-ops-gtm-publish-result.json`: available
- `docs/marketing-ops-gtm-post-publish-smoke-test.json`: available
- `docs/measurement-map-v1.md`: available
- `docs/analytics-taxonomy.md`: available

## GA4 Property And Access Readiness

- Property ID: `534288079`
- Measurement ID: `G-B5BPHFRR18`
- Property reachable: true
- Measurement ID confirmed by web-stream list: true
- Credentials available: true
- Access token retrieved without printing: true
- Required read scope available: true
- Write scopes required by this phase: false

## Expected Custom Dimensions Status

| Parameter | Required | Status | Scope |
|---|---:|---|---|
| `gclid_present` | true | **present** | EVENT |
| `fbclid_present` | true | **present** | EVENT |
| `attribution_touch` | true | **present** | EVENT |
| `utm_content` | true | **present** | EVENT |
| `utm_term` | true | **present** | EVENT |

## Expected Key Events Status

| Event | Required | Status |
|---|---:|---|
| `quote_request_submit_success` | true | **configured** |
| `signup_success` | true | **configured** |
| `contact_form_submit_success` | false | **missing** |
| `quote_request_start` | false | **missing** |
| `calculator_result` | false | **missing** |

## Recent Event Observability Summary

Status: **pass**

| Event | Today | Last 7 days | Status |
|---|---:|---:|---|
| `quote_request_start` | 5 | 6 | **seen_recently** |
| `quote_request_submit_success` | 0 | 1 | **seen_recently** |
| `contact_form_submit_success` | 0 | 1 | **seen_recently** |
| `calculator_start` | 2 | 7 | **seen_recently** |
| `calculator_query` | 5 | 29 | **seen_recently** |
| `calculator_result` | 5 | 29 | **seen_recently** |
| `signup_success` | 1 | 12 | **seen_recently** |
| `whatsapp_click` | 1 | 2 | **seen_recently** |
| `nav_click` | 42 | 367 | **seen_recently** |
| `cta_click` | 7 | 102 | **seen_recently** |
| `scroll_depth` | 335 | 3105 | **seen_recently** |
| `section_visible` | 243 | 2152 | **seen_recently** |
| `form_start` | 115 | 1077 | **seen_recently** |
| `portal_section_view` | 289 | 2675 | **seen_recently** |

GA4 Data API standard reports use property-date ranges; this is not a rolling 24-hour query.

## Attribution Observability Summary

Status: **partial**

| Requested dimension | GA4 Data API name | Aggregate metric | Status | Rows with value | Count with value |
|---|---|---|---|---:|---:|
| `source` | `source` | `keyEvents` | **observed** | 5 | 13 |
| `medium` | `medium` | `keyEvents` | **observed** | 5 | 13 |
| `campaign` | `campaignName` | `keyEvents` | **observed** | 5 | 13 |
| `utm_source` | `customEvent:utm_source` | `eventCount` | **not_checked** | 0 | 0 |
| `utm_medium` | `customEvent:utm_medium` | `eventCount` | **not_checked** | 0 | 0 |
| `utm_campaign` | `customEvent:utm_campaign` | `eventCount` | **not_checked** | 0 | 0 |
| `utm_content` | `customEvent:utm_content` | `eventCount` | **observed** | 1 | 1 |
| `utm_term` | `customEvent:utm_term` | `eventCount` | **observed** | 1 | 1 |
| `gclid_present` | `customEvent:gclid_present` | `eventCount` | **observed** | 1 | 1 |
| `fbclid_present` | `customEvent:fbclid_present` | `eventCount` | **observed** | 1 | 1 |
| `attribution_touch` | `customEvent:attribution_touch` | `eventCount` | **observed** | 1 | 1 |

## Safety Confirmations

- ga4WritesMade: false
- gtmWritesMade: false
- gtmPublished: false
- googleAdsTouched: false
- metaTouched: false
- runtimeFilesTouched: false
- websiteRuntimeFilesTouched: false
- secretsPrinted: false
- tokensPrinted: false
- piiQueried: false
- piiPrinted: false
- rawClickIdsQueried: false
- rawClickIdsPrinted: false

The GA4 Data API `runReport` method uses HTTP POST to execute a read-only report query. No GA4 configuration write endpoint is called.

## Limitations

- Only aggregate row and event-count signals are retained; dimension values are not written to artifacts.
- Unregistered event parameters cannot be queried directly through the GA4 Data API.
- No raw gclid or fbclid dimension is requested.

## Recommended Next Phase

Phase 3A-2 - GA4 Event Processing Validation
