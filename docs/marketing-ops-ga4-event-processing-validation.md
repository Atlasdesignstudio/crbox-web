# CRBOX GA4 Event Processing Validation

Generated: 2026-06-15T23:16:58.415Z

Phase: **3A-2**

Mode: **ga4_event_processing_validation_read_only**

## Executive Summary

- Validation status: **pass_with_limitations**
- GA4 property reachable: true
- Measurement ID confirmed: true
- Funnel validation: pass_with_limitations
- Page / flow validation: pass_with_limitations
- Attribution quality: pass_with_limitations
- Duplicate risk: low
- Unexpected / legacy event status: pass

## Scope

- Validate event volume and data quality after GTM version 4 publication.
- Analyze aggregate funnel ratios and page/flow placement.
- Analyze attribution quality through native GA4 dimensions and registered event-scoped custom dimensions.
- Avoid user identifiers, session identifiers, PII, raw `gclid`, and raw `fbclid`.
- Perform no GA4, GTM, Google Ads, Meta, or runtime writes.

## Source Of Truth

- `docs/marketing-ops-ga4-monitoring-readiness.json`: available
- `docs/marketing-ops-ga4-monitoring-readiness.md`: available
- `docs/marketing-ops-gtm-publish-result.json`: available
- `docs/marketing-ops-gtm-post-publish-smoke-test.json`: available
- `docs/measurement-map-v1.md`: available
- `docs/analytics-taxonomy.md`: available

## Date Ranges Analyzed

- Last 24 hours proxy: today to today
- Today: today to today
- Yesterday: yesterday to yesterday
- Last 7 days: 7daysAgo to today
- Limitation: GA4 Data API standard reports are date-based; today is used as the closest read-only proxy for last 24 hours.

## Event Volume Summary

| Event | Today | Yesterday | Last 7 days | Status |
|---|---:|---:|---:|---|
| `quote_request_start` | 5 | 0 | 6 | **low_volume_expected** |
| `quote_request_submit_success` | 0 | 0 | 1 | **low_volume_expected** |
| `contact_form_submit_success` | 0 | 0 | 1 | **low_volume_expected** |
| `signup_success` | 1 | 1 | 12 | **healthy_recent_volume** |
| `calculator_start` | 2 | 0 | 7 | **low_volume_expected** |
| `calculator_query` | 5 | 1 | 29 | **healthy_recent_volume** |
| `calculator_result` | 5 | 1 | 29 | **healthy_recent_volume** |
| `whatsapp_click` | 1 | 0 | 2 | **low_volume_expected** |
| `nav_click` | 45 | 9 | 370 | **healthy_recent_volume** |
| `cta_click` | 7 | 8 | 102 | **healthy_recent_volume** |
| `scroll_depth` | 352 | 75 | 3122 | **healthy_recent_volume** |
| `section_visible` | 258 | 75 | 2167 | **healthy_recent_volume** |
| `form_start` | 119 | 35 | 1081 | **healthy_recent_volume** |
| `portal_section_view` | 302 | 49 | 2688 | **healthy_recent_volume** |

## Core Conversion Health

- `quote_request_start`: low_volume_expected (6 in last 7 days)
- `quote_request_submit_success`: low_volume_expected (1 in last 7 days)
- `contact_form_submit_success`: low_volume_expected (1 in last 7 days)
- `signup_success`: healthy_recent_volume (12 in last 7 days)

## Funnel Validation

- Overall status: pass_with_limitations
- Quote funnel: pass
- Calculator funnel: pass_with_notes
- Contact funnel: pass_with_context

### Funnel Details

```json
{
  "quoteFunnel": {
    "name": "Quote funnel",
    "steps": {
      "starts": 6,
      "submits": 1,
      "submitStartRatio": 0.1667
    },
    "warnings": [],
    "status": "pass"
  },
  "calculatorFunnel": {
    "name": "Calculator funnel",
    "steps": {
      "calculatorStart": 7,
      "calculatorQuery": 29,
      "calculatorResult": 29,
      "quoteSubmit": 1,
      "calculatorResultStartRatio": 4.1429,
      "quoteSubmitCalculatorResultRatio": 0.0345
    },
    "warnings": [
      "calculator_result is higher than calculator_start; this may be normal if users run multiple calculations per start."
    ],
    "status": "pass_with_notes"
  },
  "contactFunnel": {
    "name": "Contact funnel",
    "steps": {
      "formStart": 1081,
      "contactSubmitSuccess": 1,
      "contactSuccessFormStartRatio": 0.0009
    },
    "warnings": [
      "form_start is global and may include non-contact forms."
    ],
    "status": "pass_with_context"
  },
  "status": "pass_with_limitations"
}
```

## Page / Flow Validation

Status: **pass_with_limitations**

| Event | Expected pages | Status |
|---|---|---|
| `quote_request_start` | `/calculadora.html`, `/cotizar.html` | **expected_page** |
| `quote_request_submit_success` | `/calculadora.html`, `/cotizar.html` | **expected_page** |
| `contact_form_submit_success` | `/contacto.html` | **expected_page** |
| `signup_success` | `/afiliate.html` | **expected_page** |
| `calculator_start` | `/calculadora.html` | **not_observed_on_expected_page** |
| `calculator_query` | `/calculadora.html` | **expected_page** |
| `calculator_result` | `/calculadora.html` | **expected_page** |
| `whatsapp_click` | `public/global` | **not_checked** |
| `nav_click` | `public/global` | **not_checked** |
| `cta_click` | `public/global` | **not_checked** |
| `scroll_depth` | `public/global` | **not_checked** |
| `section_visible` | `public/global` | **not_checked** |

## Attribution Quality

Status: **pass_with_limitations**

- Source/medium coverage: not checked%
- Campaign coverage: 92.86%
- UTM content coverage: 14.29%
- UTM term coverage: 14.29%
- gclid_present true count: 0
- fbclid_present true count: 0

UTM source, medium, and campaign are represented through native GA4 acquisition dimensions because they are not currently registered as event-scoped custom dimensions.

## Duplicate-risk Assessment

Risk level: **low**

- No aggregate duplicate-risk signal was detected.

## Unexpected / Legacy Event Check

Status: **pass**

- Expected observed: 31
- Expected not observed: 2
- Unexpected observed: 2
- Legacy aliases observed: 0

## Paid-media Readiness Interpretation

- GA4 reporting: ready
- Google Ads import planning: ready_with_limitations
- Looker Studio dashboard planning: ready
- Meta Pixel planning: ready_for_planning_only

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

The GA4 Data API `runReport` method uses HTTP POST to execute read-only report queries. No GA4 configuration write endpoint is called.

## Limitations

- `utm_source`, `utm_medium`, and `utm_campaign` are not currently registered as event-scoped custom dimensions, so native GA4 source, medium, and campaign dimensions are used instead.
- Only aggregate attribution dimensions are queried; raw `gclid`, raw `fbclid`, user identifiers, session identifiers, and PII are not queried.
- Exact duplicate detection is intentionally limited because this phase does not query user IDs, client IDs, session IDs, or PII.
- Multiple calculator_query or calculator_result events per calculator_start can be normal user behavior.

## Recommended Next Phase

Phase 3A-3 - Monitoring Dashboard Artifact
