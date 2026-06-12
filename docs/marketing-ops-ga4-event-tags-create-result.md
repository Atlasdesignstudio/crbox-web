# CRBOX Marketing Ops GA4 Event Tags Create Result

Generated: 2026-06-12T14:40:37.257Z

Phase: **2N**

Mode: **controlled_create**

Status: **executed**

## Summary

- Mutation performed: true
- GTM write calls made: true
- Tags created: 3
- Skipped existing: 0
- Failed actions: 0
- Stopped on error: false
- GTM version created: false
- GTM published: false

## Execution Command

`MARKETING_AGENT_MODE=controlled_create MARKETING_AGENT_ENABLE_WRITES=true MARKETING_AGENT_GTM_CREATE_ENABLED=true npm run marketing:apply:gtm:ga4-tags:create -- --platform gtm --all --confirm-human-approval`

## Pre-execution Validation

- phase2MConfirmed: true
- approvedTags: 3
- blocked: 0
- allRequiredTriggersExist: true
- allRequiredVariablesExist: true
- rawGclidExcluded: true
- rawFbclidExcluded: true
- piiExcluded: true

## What Was Created

### GA4 - quote_request_start

- Event name: `quote_request_start`
- Trigger: CE - quote_request_start (ID `111`)
- GTM tag ID: `112`
- Status: **created**

Parameters:
- `utm_source` -> `{{DLV - utm_source}}`
- `utm_medium` -> `{{DLV - utm_medium}}`
- `utm_campaign` -> `{{DLV - utm_campaign}}`
- `utm_content` -> `{{DLV - utm_content}}`
- `utm_term` -> `{{DLV - utm_term}}`
- `gclid_present` -> `{{DLV - gclid_present}}`
- `fbclid_present` -> `{{DLV - fbclid_present}}`
- `attribution_touch` -> `{{DLV - attribution_touch}}`
- `page_path` -> `{{dlv - page_path}}`
- `page_name` -> `{{dlv - page_name}}`
- `page_type` -> `{{dlv - page_type}}`

### GA4 - quote_request_submit_success

- Event name: `quote_request_submit_success`
- Trigger: CE - quote_request_submit_success (ID `109`)
- GTM tag ID: `113`
- Status: **created**

Parameters:
- `utm_source` -> `{{DLV - utm_source}}`
- `utm_medium` -> `{{DLV - utm_medium}}`
- `utm_campaign` -> `{{DLV - utm_campaign}}`
- `utm_content` -> `{{DLV - utm_content}}`
- `utm_term` -> `{{DLV - utm_term}}`
- `gclid_present` -> `{{DLV - gclid_present}}`
- `fbclid_present` -> `{{DLV - fbclid_present}}`
- `attribution_touch` -> `{{DLV - attribution_touch}}`
- `page_path` -> `{{dlv - page_path}}`
- `page_name` -> `{{dlv - page_name}}`
- `page_type` -> `{{dlv - page_type}}`
- `service_type` -> `{{dlv - service_type}}`
- `shipping_mode` -> `{{dlv - shipping_mode}}`
- `destination_country` -> `{{dlv - destination_country}}`
- `weight_bucket` -> `{{dlv - weight_bucket}}`
- `value_bucket` -> `{{dlv - value_bucket}}`

### GA4 - contact_form_submit_success

- Event name: `contact_form_submit_success`
- Trigger: CE - contact_form_submit_success (ID `110`)
- GTM tag ID: `114`
- Status: **created**

Parameters:
- `utm_source` -> `{{DLV - utm_source}}`
- `utm_medium` -> `{{DLV - utm_medium}}`
- `utm_campaign` -> `{{DLV - utm_campaign}}`
- `utm_content` -> `{{DLV - utm_content}}`
- `utm_term` -> `{{DLV - utm_term}}`
- `gclid_present` -> `{{DLV - gclid_present}}`
- `fbclid_present` -> `{{DLV - fbclid_present}}`
- `attribution_touch` -> `{{DLV - attribution_touch}}`
- `form_name` -> `{{dlv - form_name}}`

## Skipped Existing Objects

- None.

## Failed Actions

- None.

## Post-create Verification

- Tags exist: true
- Duplicate risk: 0
- Unexpected created objects: 0
- Variables created: 0
- Triggers created: 0
- Tags created: 3
- Versions created: 0
- GTM published: false
- Final verification status: pass

## Safety Statement

- noGtmVersionCreated: true
- noGtmPublish: true
- googleAdsTouched: false
- metaTouched: false
- runtimeFilesTouched: false
- secretsPrinted: false
- rawClickIdsExcluded: true
- piiExcluded: true

## Remaining Blockers

- Validate the three new GA4 Event tags in GTM Preview.
- Confirm the expected GA4 events and safe parameters are received.
- Keep GTM version creation and publishing blocked until separately approved.

GTM publish is still not approved after Phase 2N.

## Mutation Statement

Only the selected approved GA4 Event tags were created in the GTM workspace. No variables, triggers, versions, publications, Google Ads objects, Meta objects, or runtime files were changed.
