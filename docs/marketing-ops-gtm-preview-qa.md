# CRBOX Marketing Ops GTM Preview QA Report

Generated: 2026-06-12T09:32:01.027Z

Phase: **2K**

Mode: **manual_qa_report**

## Summary

- Tag Assistant connected successfully and detected the expected GTM and GA4 identifiers.
- The Phase 2J Data Layer Variables read default and UTM-attributed values correctly.
- `quote_request_start` and `contact_form_submit_success` were observed with readable variables.
- `quote_request_submit_success` was not observed after a successful quote UI state.
- No GA4 tag firing was observed for the new conversion-intent events.
- GTM was not published during QA.

## Context

- Phase 2J created 8 Data Layer Variables and 3 Custom Event triggers.
- Phase 2J created no tags or versions and did not publish GTM.
- This report records manual Tag Assistant evidence supplied after QA against `crbox.cr`.

## Manual QA Evidence

- Tag Assistant connected: true
- GTM container detected: `GTM-5WD8N53F`
- GA4 measurement detected: `G-B5BPHFRR18`
- Preview mode active: true
- GTM published during QA: false

## Results

| Area | Status | Evidence |
|---|---|---|
| `quote_request_start` | `pass_with_no_ga4_tag_firing` | Event and dataLayer push observed; variables readable; no tags fired. |
| UTM variables | `pass` | Test UTMs and `attribution_touch=both_available` were readable; no raw click IDs observed. |
| `contact_form_submit_success` | `pass_with_no_ga4_tag_firing` | Event and dataLayer push observed with UTM values; no tags fired. |
| `quote_request_submit_success` | `fail_not_observed` | Successful quote UI observed, but the expected event was not present in Tag Assistant. |
| GA4 hits | `partial` | General GA4 hits observed; new conversion-intent hits were not confirmed. |

## Detailed Findings

### quote_request_start

- Event observed: true
- dataLayer push observed: true
- Variables readable: true
- `attribution_touch`: `none`
- `gclid_present`: `false`
- `fbclid_present`: `false`
- UTM variables: `(not set)` without URL UTMs.
- Tags fired: none observed.
- GA4 event tag: not configured / not firing.

### UTM Data Layer And Variables

Test URL: `https://crbox.cr/cotizar.html?utm_source=test_source&utm_medium=test_medium&utm_campaign=test_campaign&utm_content=test_content&utm_term=test_term`

- `utm_source`: `test_source`
- `utm_medium`: `test_medium`
- `utm_campaign`: `test_campaign`
- `utm_content`: `test_content`
- `utm_term`: `test_term`
- `attribution_touch`: `both_available`
- `gclid_present`: `false`
- `fbclid_present`: `false`
- Raw click IDs exposed: false
- Page: `/cotizar.html` / `cotizar` / `portal_quotes`

### contact_form_submit_success

- Event observed: true
- dataLayer push observed: true
- Variables readable: true
- All five test UTM values and `attribution_touch=both_available` were available.
- `gclid_present` and `fbclid_present` remained false.
- Tags fired: none observed.
- GA4 event tag: not configured / not firing.

### quote_request_submit_success

- Quote UI success observed: true
- Quote UI message observed: `¡Solicitud enviada!`
- Example reference observed: `#SCB-0026`
- Event observed: false
- Status: `fail_not_observed`
- Notes: Successful quote UI was observed, but quote_request_submit_success was not observed in Tag Assistant.

### GA4 Hits

- General hits observed: true
- New conversion-intent hits confirmed: false
- Status: `partial`
- General events included: `Desplazamiento`, `portal_section_view`, `Vista de una página`, `nav_click`, `Interacción del usuario`, `section_visible`
- Unconfirmed new events: `quote_request_start`, `contact_form_submit_success`, `quote_request_submit_success`

## Blockers Before Publish

- quote_request_submit_success was not observed after successful quote submission.
- No GA4 tags fired on quote_request_start or contact_form_submit_success.
- GA4 hits for the new conversion-intent events were not confirmed.

## Recommendation

- Publish approved: **false**
- Next phase: Plan GA4 event tags and/or verify runtime emission before publish.

## Safety Statement

- noGtmWrites: true
- noGtmVersionCreated: true
- noGtmPublish: true
- googleAdsTouched: false
- metaTouched: false
- websiteRuntimeFilesTouched: false
- secretsPrinted: false

GTM publish is not approved after Phase 2K QA.
