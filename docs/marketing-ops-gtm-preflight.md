# CRBOX Marketing Ops GTM Pre-flight

Generated: 2026-06-11T22:38:19.773Z

Phase: **2G**

Mode: **read_only**

## Summary

- Plan validation passed: true
- GTM workspace readable: true
- GTM variables readable: true
- GTM triggers readable: true
- Required OAuth scope status: missing
- Future GTM actions checked: 11
- Already existing: 0
- Would create later: 11
- Duplicate risk: 0
- Blocked: 0
- Unknown due to read error: 0

## Workspace Read Status

- Account ID present: true
- Container ID present: true
- Account readable: true
- Container readable: true
- Workspace path present: true
- Workspace readable: true
- Variables readable: true
- Triggers readable: true
- Workspace: Default Workspace

## OAuth Scope Status

- Check method: `google_oauth_tokeninfo`
- Required scope: `https://www.googleapis.com/auth/tagmanager.edit.containers`
- Status: **missing**
- Available relevant scopes: `https://www.googleapis.com/auth/tagmanager.readonly`
- Missing relevant scopes: `https://www.googleapis.com/auth/tagmanager.edit.containers`
- Notes: Google token info was readable, but the required GTM container edit scope was not listed. No token value was logged or written.

## Future GTM Actions

| Action ID | Intended name | Key / event | Status | Risk | Notes |
|---|---|---|---|---|---|
| `gtm:create_data_layer_variable:DLV_-_utm_source` | DLV - utm_source | `utm_source` | **would_create** | low | No existing GTM variable matched the intended name or Data Layer Variable key. |
| `gtm:create_data_layer_variable:DLV_-_utm_medium` | DLV - utm_medium | `utm_medium` | **would_create** | low | No existing GTM variable matched the intended name or Data Layer Variable key. |
| `gtm:create_data_layer_variable:DLV_-_utm_campaign` | DLV - utm_campaign | `utm_campaign` | **would_create** | low | No existing GTM variable matched the intended name or Data Layer Variable key. |
| `gtm:create_data_layer_variable:DLV_-_utm_content` | DLV - utm_content | `utm_content` | **would_create** | low | No existing GTM variable matched the intended name or Data Layer Variable key. |
| `gtm:create_data_layer_variable:DLV_-_utm_term` | DLV - utm_term | `utm_term` | **would_create** | low | No existing GTM variable matched the intended name or Data Layer Variable key. |
| `gtm:create_data_layer_variable:DLV_-_gclid_present` | DLV - gclid_present | `gclid_present` | **would_create** | low | No existing GTM variable matched the intended name or Data Layer Variable key. |
| `gtm:create_data_layer_variable:DLV_-_fbclid_present` | DLV - fbclid_present | `fbclid_present` | **would_create** | low | No existing GTM variable matched the intended name or Data Layer Variable key. |
| `gtm:create_data_layer_variable:DLV_-_attribution_touch` | DLV - attribution_touch | `attribution_touch` | **would_create** | low | No existing GTM variable matched the intended name or Data Layer Variable key. |
| `gtm:create_custom_event_trigger:quote_request_submit_success` | CE - quote_request_submit_success | `quote_request_submit_success` | **would_create** | low/medium | No existing GTM trigger matched the intended name or Custom Event name. |
| `gtm:create_custom_event_trigger:contact_form_submit_success` | CE - contact_form_submit_success | `contact_form_submit_success` | **would_create** | low | No existing GTM trigger matched the intended name or Custom Event name. |
| `gtm:create_custom_event_trigger:quote_request_start` | CE - quote_request_start | `quote_request_start` | **would_create** | low | No existing GTM trigger matched the intended name or Custom Event name. |

## Duplicate Risk Summary

- No duplicate risks detected.

## Plan Safety

- Plan blocked-action records: 6
- Unsafe proposed actions blocked by preflight: 0
- GTM tag creation remains blocked.
- GTM version creation remains blocked.
- GTM publishing remains blocked.
- Raw `gclid` and raw `fbclid` variables remain blocked.

## Safety Assertions

- gtmWriteCallsMade: false
- gtmVariablesCreated: false
- gtmTriggersCreated: false
- gtmTagsCreated: false
- gtmVersionsCreated: false
- gtmPublished: false
- googleAdsTouched: false
- metaTouched: false
- websiteRuntimeFilesTouched: false
- secretsPrinted: false

## Recommendation

- Ready for future controlled create: **false**
- Reason: Required GTM edit scope status is missing.

## Mutation Statement

No GTM write calls were made. No variables, triggers, tags, versions, or publishes were created in this phase.
