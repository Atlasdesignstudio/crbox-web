# CRBOX Marketing Ops GTM Create Result

Generated: 2026-06-12T07:53:44.390Z

Phase: **2J**

Mode: **controlled_create**

Status: **executed**

Platform: gtm
Mutation performed: true
GTM write calls made: true
GTM published: false
GTM version created: false
GTM variables created: 8
GTM triggers created: 3
GTM tags created: 0
Stopped on error: false
Selected actions: 11

## Execution Command

`MARKETING_AGENT_MODE=controlled_create MARKETING_AGENT_ENABLE_WRITES=true MARKETING_AGENT_GTM_CREATE_ENABLED=true npm run marketing:apply:gtm:create -- --platform gtm --all --confirm-human-approval`

## Pre-execution Verification

- Passed: true
- Approved actions: 11

## Created Variables

- DLV - utm_source (create_data_layer_variable): created
- DLV - utm_medium (create_data_layer_variable): created
- DLV - utm_campaign (create_data_layer_variable): created
- DLV - utm_content (create_data_layer_variable): created
- DLV - utm_term (create_data_layer_variable): created
- DLV - gclid_present (create_data_layer_variable): created
- DLV - fbclid_present (create_data_layer_variable): created
- DLV - attribution_touch (create_data_layer_variable): created

## Created Triggers

- CE - quote_request_submit_success (create_custom_event_trigger): created
- CE - contact_form_submit_success (create_custom_event_trigger): created
- CE - quote_request_start (create_custom_event_trigger): created

## Skipped Existing Actions

- None.

## Unsupported Actions

- None.

## Failed Actions

- None.

## Final Verification

Status: pass

## Post-execution Verification

- Already existing: 11
- Would create: 0
- Duplicate risk: 0
- Blocked: 0
- Required scope status: available
- Workspace readable: true
- Variables readable: true
- Triggers readable: true

## Safety Statement

- GTM tags created: false
- GTM versions created: false
- GTM published: false
- Google Ads touched: false
- Meta touched: false
- Website runtime files touched: false
- Secrets printed: false

GTM variables and triggers may have been created in the workspace, but GTM was not published.

## Mutation Statement

GTM controlled create executed selected approved workspace actions. No GTM version was created, no GTM container was published, and no Google Ads or Meta mutations were performed.
