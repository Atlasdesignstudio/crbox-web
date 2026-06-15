# CRBOX Marketing Ops GTM Post-publish Smoke Test

Generated: 2026-06-15T21:06:39Z

Phase: **2R**

Mode: **post_publish_smoke_test**

## Summary

The live smoke test passed for the approved CRBOX GA4 conversion-event setup published in GTM container version 4.

- GTM container: `GTM-5WD8N53F`
- GA4 measurement ID: `G-B5BPHFRR18`
- Published version: `4`
- Previous live version: `3`
- Rollback available: true
- Final status: **pass**

No GTM write APIs were called during Phase 2R. No version was created and GTM was not published again.

## Published Version Verified

The Phase 2Q audit artifacts confirm that GTM container version `4` was created and published successfully, with version `3` retained as the previous live version for rollback.

## Backend CORS Fix Note

The Replit backend CORS allowlist issue was fixed and redeployed before this smoke test. The successful cotizar main-form backend submission confirms that the tested submission path completed after that deployment.

## Cotizar Flow 2 Tracking Fix Note

The `cotizar.html` AI chat inline quote tracking gap was fixed and redeployed. Live Tag Assistant evidence then confirmed both `quote_request_start` and `quote_request_submit_success`, with their corresponding GA4 tags completing.

## Manual Smoke Test Evidence

| Page or flow | Evidence | Result |
|---|---|---|
| Calculator - `https://crbox.cr/calculadora.html` | `quote_request_start` and `quote_request_submit_success` observed; both GA4 tags completed | PASS |
| Contact - `https://crbox.cr/contacto.html` | `contact_form_submit_success` observed; GA4 tag completed | PASS |
| Cotizar main form - `https://crbox.cr/cotizar.html` | Backend submission succeeded, UI displayed an SCB reference, and Flow 1 instrumentation was confirmed in the correct success branch | PASS |
| Cotizar AI chat inline quote - `https://crbox.cr/cotizar.html` | `quote_request_start` and `quote_request_submit_success` observed; both GA4 tags completed | PASS |

The cotizar main-form evidence validates backend success and the location of Flow 1 instrumentation. The supplied evidence does not claim a separate Tag Assistant event observation for that main-form test.

## Event-by-event Results

| Event | Page or flow | dataLayer observed | GA4 tag fired | Tag completed | Status |
|---|---|---:|---:|---:|---|
| `quote_request_start` | Calculator | true | true | true | **pass** |
| `quote_request_submit_success` | Calculator | true | true | true | **pass** |
| `contact_form_submit_success` | Contact form | true | true | true | **pass** |
| `quote_request_start` | Cotizar AI chat inline quote | true | true | true | **pass** |
| `quote_request_submit_success` | Cotizar AI chat inline quote | true | true | true | **pass** |

Duplicate firing, PII, and raw click-ID exposure were not independently assessed in the supplied Phase 2R manual evidence. Continued monitoring is recommended for those conditions.

## Safety Confirmation

- GTM writes made in Phase 2R: false
- GTM version created again: false
- GTM published again: false
- Google Ads touched: false
- Meta touched: false
- Runtime files touched by the GTM publish: false
- Secrets printed: false

## Rollback Readiness

Rollback is available to previous live GTM container version `3`.

If unexpected tracking behavior is detected:

1. Revert to the previous GTM container version.
2. Verify the core GA4 Configuration tag and existing events.
3. Re-run GTM Preview before republishing.
4. Keep the Replit runtime unchanged unless a separate runtime issue is confirmed.

## Monitoring Recommendations

- Monitor GA4 Realtime for the three conversion-intent events.
- Monitor GA4 DebugView during controlled follow-up tests.
- Monitor GA4 key-event counts and conversion reporting.
- Watch for duplicate firing across the calculator, contact, and cotizar flows.
- Roll back to version `3` if unexpected production behavior is observed.

## Final Status

**PASS**

Phase 2R confirms the supplied live smoke-test evidence for the approved GTM version 4 conversion-event setup.
