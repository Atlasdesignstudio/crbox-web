# CRBOX Marketing Ops GA4 Event Tags Payload Review

Generated: 2026-06-12T14:40:56.066Z

Phase: **2M**

Mode: **review_only**

## Summary

- Current-batch tags reviewed: 3
- Would create: 0
- Already exists: 3
- Blocked: 0
- All required triggers exist: true
- All required variables exist: true
- Payloads follow the existing GTM `gaawe` GA4 Event tag pattern.
- Existing event tags use the current `G-B5BPHFRR18` measurement ID override.

## Context

- Phase 2J created the approved variables and triggers without tags, versions, or publication.
- Phase 2K blocked publish because new GA4 Event tags were absent.
- The Replit runtime gap was fixed manually after Phase 2K, and `quote_request_submit_success` was subsequently observed with safe parameters.

## Prerequisites

- phase2JConfirmed: true
- phase2KConfirmed: true
- runtimeGapFixedManuallyInReplit: true
- quoteRequestSubmitSuccessObservedAfterFix: true
- gtmPublished: false

## Existing GTM Resources Found

- Measurement ID variable: `GA4 Measurement ID`
- GA4 Configuration tag: `GA4 Configuration`
- Relevant variables found: 18
- Relevant triggers found: 6
- Existing GA4 Event tags audited: 38

## Proposed GA4 Event Tags

| Tag | GA4 event | Trigger | Status | Priority | Publish blocker |
|---|---|---|---|---|---|
| GA4 - quote_request_start | `quote_request_start` | CE - quote_request_start | **already_exists** | high | true |
| GA4 - quote_request_submit_success | `quote_request_submit_success` | CE - quote_request_submit_success | **already_exists** | critical | true |
| GA4 - contact_form_submit_success | `contact_form_submit_success` | CE - contact_form_submit_success | **already_exists** | high | true |

## Exact Payloads

### GA4 - quote_request_start

- Status: **already_exists**
- Trigger exists: true
- Purpose: Start of quote intent.
- Key Event candidate: false

```json
{
  "name": "GA4 - quote_request_start",
  "type": "gaawe",
  "parameter": [
    {
      "type": "boolean",
      "key": "sendEcommerceData",
      "value": "false"
    },
    {
      "type": "list",
      "key": "eventSettingsTable",
      "list": [
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_source"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_source}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_medium"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_medium}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_campaign"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_campaign}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_content"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_content}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_term"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_term}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "gclid_present"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - gclid_present}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "fbclid_present"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - fbclid_present}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "attribution_touch"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - attribution_touch}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "page_path"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{dlv - page_path}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "page_name"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{dlv - page_name}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "page_type"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{dlv - page_type}}"
            }
          ]
        }
      ]
    },
    {
      "type": "template",
      "key": "eventName",
      "value": "quote_request_start"
    },
    {
      "type": "template",
      "key": "measurementIdOverride",
      "value": "G-B5BPHFRR18"
    }
  ],
  "firingTriggerId": [
    "111"
  ]
}
```

### GA4 - quote_request_submit_success

- Status: **already_exists**
- Trigger exists: true
- Purpose: Successful quote request and primary conversion.
- Key Event candidate: true

```json
{
  "name": "GA4 - quote_request_submit_success",
  "type": "gaawe",
  "parameter": [
    {
      "type": "boolean",
      "key": "sendEcommerceData",
      "value": "false"
    },
    {
      "type": "list",
      "key": "eventSettingsTable",
      "list": [
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_source"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_source}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_medium"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_medium}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_campaign"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_campaign}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_content"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_content}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_term"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_term}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "gclid_present"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - gclid_present}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "fbclid_present"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - fbclid_present}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "attribution_touch"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - attribution_touch}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "page_path"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{dlv - page_path}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "page_name"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{dlv - page_name}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "page_type"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{dlv - page_type}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "service_type"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{dlv - service_type}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "shipping_mode"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{dlv - shipping_mode}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "destination_country"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{dlv - destination_country}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "weight_bucket"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{dlv - weight_bucket}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "value_bucket"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{dlv - value_bucket}}"
            }
          ]
        }
      ]
    },
    {
      "type": "template",
      "key": "eventName",
      "value": "quote_request_submit_success"
    },
    {
      "type": "template",
      "key": "measurementIdOverride",
      "value": "G-B5BPHFRR18"
    }
  ],
  "firingTriggerId": [
    "109"
  ]
}
```

### GA4 - contact_form_submit_success

- Status: **already_exists**
- Trigger exists: true
- Purpose: Successful contact form lead.
- Key Event candidate: false

```json
{
  "name": "GA4 - contact_form_submit_success",
  "type": "gaawe",
  "parameter": [
    {
      "type": "boolean",
      "key": "sendEcommerceData",
      "value": "false"
    },
    {
      "type": "list",
      "key": "eventSettingsTable",
      "list": [
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_source"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_source}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_medium"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_medium}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_campaign"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_campaign}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_content"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_content}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "utm_term"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - utm_term}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "gclid_present"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - gclid_present}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "fbclid_present"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - fbclid_present}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "attribution_touch"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{DLV - attribution_touch}}"
            }
          ]
        },
        {
          "type": "map",
          "map": [
            {
              "type": "template",
              "key": "parameter",
              "value": "form_name"
            },
            {
              "type": "template",
              "key": "parameterValue",
              "value": "{{dlv - form_name}}"
            }
          ]
        }
      ]
    },
    {
      "type": "template",
      "key": "eventName",
      "value": "contact_form_submit_success"
    },
    {
      "type": "template",
      "key": "measurementIdOverride",
      "value": "G-B5BPHFRR18"
    }
  ],
  "firingTriggerId": [
    "110"
  ]
}
```

## Parameter Mapping

### quote_request_start

| GA4 parameter | GTM variable | Exists |
|---|---|---|
| `utm_source` | `{{DLV - utm_source}}` | true |
| `utm_medium` | `{{DLV - utm_medium}}` | true |
| `utm_campaign` | `{{DLV - utm_campaign}}` | true |
| `utm_content` | `{{DLV - utm_content}}` | true |
| `utm_term` | `{{DLV - utm_term}}` | true |
| `gclid_present` | `{{DLV - gclid_present}}` | true |
| `fbclid_present` | `{{DLV - fbclid_present}}` | true |
| `attribution_touch` | `{{DLV - attribution_touch}}` | true |
| `page_path` | `{{dlv - page_path}}` | true |
| `page_name` | `{{dlv - page_name}}` | true |
| `page_type` | `{{dlv - page_type}}` | true |

### quote_request_submit_success

| GA4 parameter | GTM variable | Exists |
|---|---|---|
| `utm_source` | `{{DLV - utm_source}}` | true |
| `utm_medium` | `{{DLV - utm_medium}}` | true |
| `utm_campaign` | `{{DLV - utm_campaign}}` | true |
| `utm_content` | `{{DLV - utm_content}}` | true |
| `utm_term` | `{{DLV - utm_term}}` | true |
| `gclid_present` | `{{DLV - gclid_present}}` | true |
| `fbclid_present` | `{{DLV - fbclid_present}}` | true |
| `attribution_touch` | `{{DLV - attribution_touch}}` | true |
| `page_path` | `{{dlv - page_path}}` | true |
| `page_name` | `{{dlv - page_name}}` | true |
| `page_type` | `{{dlv - page_type}}` | true |
| `service_type` | `{{dlv - service_type}}` | true |
| `shipping_mode` | `{{dlv - shipping_mode}}` | true |
| `destination_country` | `{{dlv - destination_country}}` | true |
| `weight_bucket` | `{{dlv - weight_bucket}}` | true |
| `value_bucket` | `{{dlv - value_bucket}}` | true |

### contact_form_submit_success

| GA4 parameter | GTM variable | Exists |
|---|---|---|
| `utm_source` | `{{DLV - utm_source}}` | true |
| `utm_medium` | `{{DLV - utm_medium}}` | true |
| `utm_campaign` | `{{DLV - utm_campaign}}` | true |
| `utm_content` | `{{DLV - utm_content}}` | true |
| `utm_term` | `{{DLV - utm_term}}` | true |
| `gclid_present` | `{{DLV - gclid_present}}` | true |
| `fbclid_present` | `{{DLV - fbclid_present}}` | true |
| `attribution_touch` | `{{DLV - attribution_touch}}` | true |
| `form_name` | `{{dlv - form_name}}` | true |

## Excluded Fields And Actions

- raw gclid
- raw fbclid
- name
- email
- phone
- address
- company
- message
- item description
- reference number
- exact value
- exact weight
- GTM publish
- GTM version
- Google Ads
- Meta
- runtime files

## PII Safety Statement

The reviewed payloads exclude names, email addresses, phone numbers, addresses, companies, messages, item descriptions, reference numbers, exact values, exact weights, raw `gclid`, and raw `fbclid`. Only approved attribution flags, campaign values, page context, bucketed quote context, destination country, service type, shipping mode, and form name are included.

## Recommended Next Batch

- `calculator_result`: **already_exists_no_action**. Existing trigger CE - calculator_result and GA4 Event tag GA4 - calculator_result were confirmed by read-only GTM list calls.
- `signup_success`: **already_exists_no_action**. Existing trigger CE - signup_success and GA4 Event tag GA4 - signup_success were confirmed by read-only GTM list calls.
- `whatsapp_click`: **already_exists_no_action**. Existing trigger CE - whatsapp_click and GA4 Event tag GA4 - whatsapp_click were confirmed by read-only GTM list calls.

## Blockers Or Risks

- No payload prerequisites are blocked.

## Recommendation

- Ready for human review: **true**
- Ready for controlled create later: **false**
- Publish approved: **false**
- Next phase: Human review, then a separately approved controlled-create phase for the 3 GA4 Event tags, followed by GTM Preview validation. Publishing remains separate and blocked.

## Safety Statement

- noGtmWrites: true
- noGtmVersionCreated: true
- noGtmPublish: true
- rawGclidExcluded: true
- rawFbclidExcluded: true
- piiExcluded: true
- googleAdsTouched: false
- metaTouched: false
- websiteRuntimeFilesTouched: false
- secretsPrinted: false

This phase does not create GA4 tags and does not publish GTM.

GTM publish remains blocked until GA4 event tags are created and validated in GTM Preview.
