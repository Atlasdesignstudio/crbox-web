# CRBOX Analytics — Measurement Guide

Practical operating reference for interpreting CRBOX analytics data: priority KPIs, weekly and monthly review checklists, healthy vs concerning patterns, and GTM/GA4 configuration steps.

---

## 1. Priority KPIs

These are the metrics that matter most for CRBOX. Review them in this order every week.

| # | KPI | GA4 Location | Target (establish baseline first 30 days) |
|---|-----|--------------|-------------------------------------------|
| 1 | **Afíliate CTA click rate** | Events → `cta_afiliate_click` / Sessions | Trend up week-over-week |
| 2 | **Calculator completion rate** | `calculator_query` / `calculator_start` | > 60% of starts complete a query |
| 3 | **Contact form submission rate** | `contact_form_submit` / `form_start` | > 40% of starters submit |
| 4 | **WhatsApp click volume** | Events → `whatsapp_click` | Track absolute count + trend |
| 5 | **Scroll depth 75%+ rate** | `scroll_depth` where `depth_percent >= 75` / Sessions | > 30% of sessions on key pages |
| 6 | **Top section visibility** | `section_visible` grouped by `section_id` | `cta-afiliate`, `proceso`, `formulario` should appear in top 5 |
| 7 | **Form abandon rate** | `form_abandon` / `form_start` | < 40% (directional, see note) |

> **Note on form_abandon**: uses `beforeunload` which is not reliable in all browsers. Use as a trend signal only, not an absolute count.

---

## 2. Weekly Review Checklist

Run this review every Monday (15–20 minutes):

### Traffic Health
- [ ] Total sessions this week vs last week — up, flat, or down?
- [ ] Top pages by pageviews — any unexpected drops or surges?
- [ ] New vs returning users ratio — is acquisition growing?

### Conversion Events
- [ ] `cta_afiliate_click` count — compare to prior week.
- [ ] `contact_form_submit` count — compare to prior week.
- [ ] `whatsapp_click` count — compare to prior week.
- [ ] Calculator funnel: `calculator_start` → `calculator_query` → `calculator_result` — which step has the biggest drop-off?

### Content Engagement
- [ ] Which `section_id` values appear most in `section_visible` events? Are high-intent sections (e.g. `cta-afiliate`, `formulario`, `aero-calculator`) being reached?
- [ ] Scroll depth distribution on key pages (tarifas, calculadora) — are users reading the full page?

### Anomalies
- [ ] Any event count that dropped to zero? This may indicate a GTM tag stopped firing.
- [ ] Any page showing `page_type = unknown`? This indicates a URL not in the page context map in `js/analytics.js`.

---

## 3. Monthly Review Checklist

Run this deeper review once a month (45–60 minutes):

### Funnel Analysis
- [ ] Build the full acquisition funnel in GA4 Explore: `calculator_start` → `calculator_query` → `calculator_result` → `cta_afiliate_click`. Identify the weakest step.
- [ ] Compare `shipping_mode = aereo` vs `shipping_mode = maritimo` on `calculator_result` — which service has more demand?
- [ ] Review `destination` dimension on `calculator_result` — which provinces drive the most calculator completions?

### Content Performance
- [ ] Which FAQ questions (`faq_question` param) are clicked most? These reveal user confusion.
- [ ] Which service card names appear most in `service_card_click`? Align marketing emphasis.
- [ ] Review `scroll_depth` by page — identify pages where most users drop below 50%.

### Form Friction Review
- [ ] `form_start` vs `contact_form_submit` gap on `#contact-form` — is it improving month over month?
- [ ] `form_start` vs submit gap on `#maritimo-quote-form` — same analysis.

### KPI Baseline Update
- [ ] Update the weekly KPI targets based on the first 30 days of data.
- [ ] Flag any metric that has been declining for 2+ consecutive weeks for investigation.

---

## 4. Healthy vs Concerning Patterns

### Scroll Depth

| Pattern | Interpretation |
|---------|---------------|
| > 50% of sessions reach 75% scroll on tarifas.html | Healthy — users are reading pricing |
| < 20% of sessions reach 50% scroll on index.html | Concerning — hero may not be compelling enough |
| Spike in 25% scroll, sharp drop at 50% | Page may be too long or content not engaging below the fold |

### Calculator Funnel

| Pattern | Interpretation |
|---------|---------------|
| `calculator_result` / `calculator_start` > 60% | Healthy — most users complete the flow |
| `calculator_query` fired but `calculator_result` rarely fires | Potential JS error in the result display logic |
| High `calculator_tab_switch` from aereo to maritimo | Maritime service may need better positioning or its own landing page |

### Form Engagement

| Pattern | Interpretation |
|---------|---------------|
| `form_start` >> `contact_form_submit` (gap > 60%) | Form is too long or fields are unclear |
| `form_abandon` spikes with `form_start` | Users are starting then bouncing — check for friction fields |
| Zero `form_start` but page is visited | Form is below the fold and users aren't scrolling to it |

### Section Visibility

| Pattern | Interpretation |
|---------|---------------|
| `cta-afiliate` rarely appears in `section_visible` | Bottom CTA not being reached — consider moving it higher or adding mid-page CTA |
| `formulario` has low visibility on contacto.html | Contact form not reached — check if contact info section is too long |
| `aero-calculator` rarely visible on calculadora.html | Users may be bouncing from the hero without scrolling to the tool |

---

## 5. GTM Setup Checklist

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

### GTM Trigger Recommendations

Create one **Custom Event** trigger per event name:

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

### GA4 Conversions to Mark

Mark these events as conversions in GA4 (`Admin → Events → Mark as conversion`):

| Event                   | Reason                                   |
|------------------------|------------------------------------------|
| `cta_afiliate_click`   | Primary acquisition signal               |
| `contact_form_submit`  | Lead generation                          |
| `calculator_result`    | High-intent engagement                   |
| `whatsapp_click`       | Direct sales channel contact             |

---

## 6. Preview and Debug

1. Open **GTM Preview Mode** (Submit → Preview).
2. Visit each of the 6 public pages and verify the expected events fire in the Tag Assistant panel.
3. Confirm `page_type` is correct on each page.
4. Test scroll depth by scrolling to 25%, 50%, 75%, and 90% on a long page (e.g., tarifas.html).
5. Test the calculator flow: start → query → result.
6. Submit a test contact form and confirm `contact_form_submit` fires.
7. Open the browser console and run `window.dataLayer` to inspect all pushed events.
