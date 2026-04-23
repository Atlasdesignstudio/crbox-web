# CRBOX Analytics — Measurement Guide

Practical reference for configuring GTM, setting up GA4, and interpreting data from the CRBOX event taxonomy.

---

## 1. GTM Setup Checklist

### Container
- Container ID: `GTM-XXXXXXX` — replace in every public HTML page before go-live.
- The snippet is already in place on all six public pages (head + noscript body tag).

### dataLayer Variables to expose in GTM

Create one **Data Layer Variable** for each field that GA4 tags will read:

| GTM Variable Name        | Data Layer Key          |
|--------------------------|-------------------------|
| `dlv - page_path`        | `page_path`             |
| `dlv - page_name`        | `page_name`             |
| `dlv - page_type`        | `page_type`             |
| `dlv - cta_location`     | `cta_location`          |
| `dlv - cta_label`        | `cta_label`             |
| `dlv - shipping_mode`    | `shipping_mode`         |
| `dlv - package_weight`   | `package_weight_kg`     |
| `dlv - destination`      | `destination`           |
| `dlv - purchase_value`   | `purchase_value_usd`    |
| `dlv - total_usd`        | `total_usd`             |
| `dlv - depth_percent`    | `depth_percent`         |
| `dlv - section_id`       | `section_id`            |
| `dlv - form_id`          | `form_id`               |
| `dlv - faq_question`     | `faq_question`          |
| `dlv - service_name`     | `service_name`          |
| `dlv - contact_subject`  | `contact_subject`       |

---

## 2. GTM Trigger Recommendations

Create one **Custom Event** trigger per event name. Use exact matching:

| Trigger Name                     | Event Name                |
|----------------------------------|---------------------------|
| `CE - cta_afiliate_click`        | `cta_afiliate_click`      |
| `CE - cta_calculadora_click`     | `cta_calculadora_click`   |
| `CE - whatsapp_click`            | `whatsapp_click`          |
| `CE - phone_click`               | `phone_click`             |
| `CE - email_click`               | `email_click`             |
| `CE - contact_form_submit`       | `contact_form_submit`     |
| `CE - form_start`                | `form_start`              |
| `CE - form_abandon`              | `form_abandon`            |
| `CE - faq_engage`                | `faq_engage`              |
| `CE - nav_click`                 | `nav_click`               |
| `CE - service_card_click`        | `service_card_click`      |
| `CE - calculator_start`          | `calculator_start`        |
| `CE - calculator_tab_switch`     | `calculator_tab_switch`   |
| `CE - calculator_query`          | `calculator_query`        |
| `CE - calculator_result`         | `calculator_result`       |
| `CE - scroll_depth`              | `scroll_depth`            |
| `CE - section_visible`           | `section_visible`         |

---

## 3. GA4 Tag Configuration

For each trigger above, create a **GA4 Event Tag**:

- **Tag type**: Google Analytics: GA4 Event
- **Configuration Tag**: your GA4 config tag (Measurement ID `G-XXXXXXXXXX`)
- **Event Name**: copy the event name exactly as listed above
- **Event Parameters**: map each relevant `dlv -` variable

### Recommended event parameters per GA4 tag

**`cta_afiliate_click`**
```
cta_location  → {{dlv - cta_location}}
cta_label     → {{dlv - cta_label}}
page_type     → {{dlv - page_type}}
```

**`calculator_query`**
```
shipping_mode      → {{dlv - shipping_mode}}
package_weight_kg  → {{dlv - package_weight}}
destination        → {{dlv - destination}}
purchase_value_usd → {{dlv - purchase_value}}
page_type          → {{dlv - page_type}}
```

**`calculator_result`** — same parameters plus:
```
total_usd    → {{dlv - total_usd}}
```

**`scroll_depth`**
```
depth_percent → {{dlv - depth_percent}}
page_name     → {{dlv - page_name}}
page_type     → {{dlv - page_type}}
```

**`section_visible`**
```
section_id → {{dlv - section_id}}
page_name  → {{dlv - page_name}}
```

---

## 4. GA4 Conversions

Mark these events as conversions in GA4 (`Admin → Events → Mark as conversion`):

| Event                   | Reason                                   |
|------------------------|------------------------------------------|
| `cta_afiliate_click`   | Primary acquisition signal               |
| `contact_form_submit`  | Lead generation                          |
| `calculator_result`    | High-intent engagement                   |
| `whatsapp_click`       | Direct sales channel contact             |

---

## 5. GA4 Audiences

Suggested audiences for remarketing and analysis:

| Audience                  | Logic                                                     |
|--------------------------|-----------------------------------------------------------|
| Calculator users          | Users who triggered `calculator_result` at least once     |
| High-intent (aereo)       | `calculator_result` where `shipping_mode = aereo`        |
| High-intent (maritimo)    | `calculator_result` where `shipping_mode = maritimo`     |
| FAQ readers               | Users who triggered `faq_engage` at least once            |
| Deep scroll (75%+)        | `scroll_depth` where `depth_percent >= 75`               |
| Afíliate CTA clickers     | `cta_afiliate_click` triggered                            |

---

## 6. Key Metrics and Interpretations

### Scroll depth — what each milestone means

| Milestone | Interpretation for CRBOX                                   |
|----------|-------------------------------------------------------------|
| 25%      | Passed the hero — basic awareness                          |
| 50%      | Reached mid-page content — engaged visitor                  |
| 75%      | Saw pricing/process sections — high consideration           |
| 90%      | Near-full consumption — strong intent, likely to convert   |

### Section visibility — priority sections to monitor

| Section ID          | Page              | What it tells you                              |
|--------------------|-------------------|------------------------------------------------|
| `stats`             | index             | Social proof exposure                          |
| `cta-afiliate`      | index             | Bottom CTA reach                               |
| `servicios-destacados` | servicios      | Service menu engagement                        |
| `carga-aerea`       | servicios         | Air freight awareness                          |
| `proceso`           | como-funciona     | Process flow read                              |
| `faq`               | como-funciona     | FAQ section engagement                         |
| `aerea`             | tarifas           | Pricing page air rates engagement              |
| `aero-calculator`   | calculadora       | Calculator tool visibility                     |
| `formulario`        | contacto          | Contact form reach                             |

### Form friction

- A high `form_start` : `contact_form_submit` ratio indicates form drop-off.
- `form_abandon` events (best-effort via `beforeunload`) supplement form_start data to estimate abandonment. Do not use as absolute counts — treat as a directional signal.

### Calculator funnel

```
calculator_start → calculator_query → calculator_result → cta_afiliate_click
```

Track each step's conversion rate to identify where users drop off.

---

## 7. Preview and Debug

Before publishing the GTM container:

1. Open **GTM Preview Mode** (Submit → Preview).
2. Visit each of the 6 public pages and verify the expected events fire in the GTM Tag Assistant panel.
3. Confirm `page_type` is correct on each page.
4. Test scroll depth by scrolling to 25%, 50%, 75%, and 90% on a long page (e.g., tarifas.html).
5. Test the calculator flow end-to-end: start → query → result.
6. Submit a test contact form and confirm `contact_form_submit` fires.
7. Open the browser console and run `window.dataLayer` to inspect all pushed events.
