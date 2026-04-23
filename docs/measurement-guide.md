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
- [ ] Calculator funnel: `calculator_start` → `calculator_query` → `calculator_result` — which step has the biggest drop-off? Check against the alert thresholds in Section 9; escalate if any step falls below its alert threshold.
- [ ] Contact funnel: `form_start` → `contact_form_submit` — check each form against its threshold (Section 9): `contact-form` ≤ 40% and `maritimo-quote-form` ≤ 35% are alert levels. Flag any form below its threshold for investigation.

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
- [ ] Open the saved **`CRBOX — Calculator Funnel`** exploration in GA4 Explore (see Section 7.1 to build it if not yet saved). Identify the weakest step by comparing completion rates across `calculator_start` → `calculator_query` → `calculator_result` → `cta_afiliate_click`. Compare each step against the alert thresholds in **Section 9**; any step at or below its alert threshold requires an investigation ticket before the next monthly review.
- [ ] Compare `shipping_mode = aereo` vs `shipping_mode = maritimo` on `calculator_result` — which service has more demand?
- [ ] Review `destination` dimension on `calculator_result` — which provinces drive the most calculator completions?

### Content Performance
- [ ] Which FAQ questions (`faq_question` param) are clicked most? These reveal user confusion.
- [ ] Which service card names appear most in `service_card_click`? Align marketing emphasis.
- [ ] Review `scroll_depth` by page — identify pages where most users drop below 50%.

### Form Friction Review
- [ ] Open the saved **`CRBOX — Contact Funnel`** exploration in GA4 Explore (see Section 7.2 to build it if not yet saved). Review the `form_id` breakdown to compare `contact-form` vs `maritimo-quote-form` completion rates. Check both against the alert thresholds in **Section 9**; if either form falls at or below its alert threshold, raise it as a priority action item.
- [ ] `form_start` vs `contact_form_submit` gap on `contact-form` — is it improving month over month?
- [ ] `form_start` vs submit gap on `maritimo-quote-form` — same analysis.

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

## 5. GTM Setup — Import the Container File (Recommended)

The fastest way to configure GTM is to import the pre-built container export file. It contains 1 Constant variable (GA4 Measurement ID) + 24 Data Layer Variables, 17 Custom Event triggers, and 18 tags (1 GA4 Configuration + 17 GA4 Event tags) already wired together.

### Import steps

1. Go to **GTM** → your workspace → **Admin** → **Import Container**.
2. Choose file: `docs/gtm-container-export.json`.
3. Select **Existing workspace** (or create a new one) and choose **Merge** → **Rename conflicting tags, triggers, and variables**.
4. Click **Confirm**.
5. In the Variables panel, open **GA4 Measurement ID** and replace `G-XXXXXXXXXX` with your real GA4 Measurement ID.
6. Verify the container ID placeholder `GTM-XXXXXXX` in all 6 HTML pages has already been replaced with your real container ID.
7. Click **Submit** to publish.

> **Note:** The import creates all variables, triggers, and tags in a draft state. Always preview and verify before submitting.

---

## 6. GTM Setup — Manual Checklist (alternative to import)

Use this if you prefer to build the container by hand or need to add items to an existing workspace.

### Container
- Container ID: `GTM-XXXXXXX` — replace in every public HTML page before go-live.
- The snippet is already in place on all six public pages (head + noscript body tag).

### Constant Variable

Create one **Constant** variable:

| GTM Variable Name     | Value           |
|-----------------------|-----------------|
| `GA4 Measurement ID`  | `G-XXXXXXXXXX`  |

Replace `G-XXXXXXXXXX` with your real GA4 Measurement ID.

### Data Layer Variables

Create one **Data Layer Variable** for each field that GA4 tags will read. All use Data Layer Version 2.

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
| `dlv - shipping_usd`     | `shipping_usd`          |
| `dlv - handling_usd`     | `handling_usd`          |
| `dlv - taxes_usd`        | `taxes_usd`             |
| `dlv - depth_percent`    | `depth_percent`         |
| `dlv - section_id`       | `section_id`            |
| `dlv - form_id`          | `form_id`               |
| `dlv - faq_question`     | `faq_question`          |
| `dlv - service_name`     | `service_name`          |
| `dlv - contact_subject`  | `contact_subject`       |
| `dlv - phone_number`     | `phone_number`          |
| `dlv - email_address`    | `email_address`         |
| `dlv - nav_label`        | `nav_label`             |
| `dlv - nav_destination`  | `nav_destination`       |
| `dlv - to_mode`          | `to_mode`               |

### Custom Event Triggers

Create one **Custom Event** trigger per event name (use exact match, not regex):

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

### GA4 Tags

Create one **GA4 Configuration** tag (type: Google Tag) firing on All Pages, using `{{GA4 Measurement ID}}`.

Create one **GA4 Event** tag per trigger, named `GA4 - <event_name>`. Each tag:
- Uses measurement ID: `{{GA4 Measurement ID}}`
- Sets event name to the exact event name (e.g. `cta_afiliate_click`)
- Maps all standard parameters (`page_path`, `page_name`, `page_type`) plus event-specific parameters from their DLVs

See `docs/gtm-container-export.json` for the complete parameter mapping per tag.

### GA4 Conversions to Mark

After publishing the container and letting events flow for a session, mark these events as conversions in GA4 (`Admin → Events → toggle "Mark as conversion"`):

| Event                   | Reason                                   |
|------------------------|------------------------------------------|
| `cta_afiliate_click`   | Primary acquisition signal               |
| `contact_form_submit`  | Lead generation                          |
| `calculator_result`    | High-intent engagement                   |
| `whatsapp_click`       | Direct sales channel contact             |

> GA4 only shows events in the Events list after they have been received at least once. If you don't see an event yet, trigger it from a live page first (using GTM Preview Mode with your published container or by visiting the site), then return to GA4 Admin → Events to mark it as a conversion.

---

## 7. GA4 Explore Funnels — Build, Save, and Share

GA4 Explore funnels are the fastest way to spot drop-off in the two highest-value user journeys. Build each funnel once, save it, and share it so the whole team can open it without recreating it.

> **Prerequisite:** Events must have been received by GA4 at least once before they appear as options in Explore. If an event is missing from the step picker, trigger it from a live page (using GTM Preview Mode or a real visit) and wait up to 24 hours for it to appear.

---

### 7.1 Calculator Funnel — `calculator_start → calculator_query → calculator_result → cta_afiliate_click`

#### Build steps

1. In GA4, click **Explore** in the left sidebar.
2. Click **Create a new exploration** → choose **Funnel exploration** as the technique.
3. Name the exploration: **`CRBOX — Calculator Funnel`**.
4. Under **Steps**, click **+ Add step** four times and configure each step:

   | Step # | Step name (label) | Condition |
   |--------|-------------------|-----------|
   | 1 | Calculator Start | Event name `exactly matches` `calculator_start` |
   | 2 | Calculator Query | Event name `exactly matches` `calculator_query` |
   | 3 | Calculator Result | Event name `exactly matches` `calculator_result` |
   | 4 | Affiliate CTA Click | Event name `exactly matches` `cta_afiliate_click` |

5. Set **Make steps indirect** (allow other events between steps) — leave it enabled so users who take a non-linear path are still counted.
6. Under **Breakdowns**, click **+ Add dimension** and select **`shipping_mode`** (custom dimension — register it first if not already visible; see the note in Section 7.3).
7. Leave the date range at the default **Last 28 days** for a recurring view; switch to **Last 7 days** for weekly reviews.
8. Click **Save** (the floppy-disk icon at the top right).

#### Share with the team

1. Open the saved exploration.
2. Click the **Share** icon (person with a + symbol, top right).
3. Choose **Share with property** → confirm. All GA4 users with at least Viewer access to the property can now open it from the Explore library.

---

### 7.2 Contact Funnel — `form_start → contact_form_submit`

#### Build steps

1. In GA4, click **Explore** → **Create a new exploration** → choose **Funnel exploration**.
2. Name the exploration: **`CRBOX — Contact Funnel`**.
3. Under **Steps**, click **+ Add step** twice:

   | Step # | Step name (label) | Condition |
   |--------|-------------------|-----------|
   | 1 | Form Start | Event name `exactly matches` `form_start` |
   | 2 | Form Submit | Event name `exactly matches` `contact_form_submit` |

4. Under **Breakdowns**, click **+ Add dimension** and select **`form_id`** (custom dimension — register if not yet visible; see Section 7.3). This splits the funnel by `contact-form` vs `maritimo-quote-form` so you can see which form has higher drop-off.
5. Enable **Make steps indirect** to account for users who navigate between sections before submitting.
6. Click **Save**.

#### Share with the team

1. Open the saved exploration.
2. Click the **Share** icon → **Share with property** → confirm.

---

### 7.3 Registering Custom Dimensions and Custom Metrics (required for all parameters)

GA4 does not automatically surface custom event parameters in Explore or standard reports. Every parameter must be registered once in GA4 Admin before it becomes selectable in funnels, segments, and explorations. Parameters arrive in GA4 without this step but remain invisible in the reporting UI.

> **GA4 limit:** GA4 allows up to 50 event-scoped Custom Dimensions and 50 Custom Metrics per property on the free tier. The tables below use 14 dimensions and 7 metrics, well within that limit.

---

#### 7.3.1 Custom Dimensions (string parameters)

1. Go to **GA4 Admin** → **Property** → **Custom definitions** → **Custom dimensions** tab.
2. Click **Create custom dimension** for each row below. Set **Scope** to **Event** for all of them.
3. Click **Save** after each one.

| Dimension name    | Scope | Event parameter    | Used by events |
|-------------------|-------|--------------------|----------------|
| CTA Location      | Event | `cta_location`     | cta_afiliate_click, cta_calculadora_click, whatsapp_click, phone_click, email_click |
| CTA Label         | Event | `cta_label`        | cta_afiliate_click, cta_calculadora_click |
| Shipping Mode     | Event | `shipping_mode`    | calculator_start, calculator_query, calculator_result |
| Destination       | Event | `destination`      | calculator_query, calculator_result |
| To Mode           | Event | `to_mode`          | calculator_tab_switch |
| Page Type         | Event | `page_type`        | all events |
| Page Name         | Event | `page_name`        | all events |
| Form ID           | Event | `form_id`          | form_start, form_abandon |
| FAQ Question      | Event | `faq_question`     | faq_engage |
| Section ID        | Event | `section_id`       | faq_engage, section_visible |
| Nav Label         | Event | `nav_label`        | nav_click |
| Nav Destination   | Event | `nav_destination`  | nav_click |
| Service Name      | Event | `service_name`     | service_card_click |
| Contact Subject   | Event | `contact_subject`  | contact_form_submit |

> **PII exclusion:** `phone_number` and `email_address` are direct personal identifiers. GA4's Terms of Service prohibit sending PII to GA4. These parameters must **not** be registered as Custom Dimensions, and their GTM tags should suppress those fields before sending to GA4. See the GTM tag for `phone_click` and `email_click` — confirm `phone_number` and `email_address` are omitted from the GA4 Event tag parameter mappings.

> Custom dimensions can take up to 24 hours to start populating in reports and Explore after they are registered.

---

#### 7.3.2 Custom Metrics (numeric parameters)

1. Go to **GA4 Admin** → **Property** → **Custom definitions** → **Custom metrics** tab.
2. Click **Create custom metric** for each row below. Set **Scope** to **Event** and **Unit of measurement** as shown.
3. Click **Save** after each one.

| Metric name          | Scope | Unit of measurement | Event parameter       | Used by events |
|----------------------|-------|---------------------|-----------------------|----------------|
| Package Weight (kg)  | Event | Standard (number)   | `package_weight_kg`   | calculator_query, calculator_result |
| Purchase Value (USD) | Event | Currency            | `purchase_value_usd`  | calculator_query |
| Total USD            | Event | Currency            | `total_usd`           | calculator_result |
| Shipping USD         | Event | Currency            | `shipping_usd`        | calculator_result |
| Handling USD         | Event | Currency            | `handling_usd`        | calculator_result |
| Taxes USD            | Event | Currency            | `taxes_usd`           | calculator_result |
| Scroll Depth %       | Event | Standard (number)   | `depth_percent`       | scroll_depth |

> **Currency metrics** will display with the currency symbol in reports once your GA4 property currency is configured (Admin → Property settings → Currency).

---

#### 7.3.3 Verifying registration in Explore

After saving all definitions:

1. Go to **GA4 Explore** → open any exploration (or create a new blank one).
2. In the **Variables** panel on the left, click **+** next to **Dimensions**.
3. Search for `cta_location`, `shipping_mode`, `form_id`, etc. — each should appear under **Custom → Event-scoped**.
4. Click **+** next to **Metrics** and search for `total_usd`, `depth_percent`, etc. — they should appear under **Custom**.
5. If a parameter is missing, verify you saved the Custom Definition in step 7.3.1/7.3.2 and wait up to 24 hours for it to propagate.

---

### 7.4 How to Interpret the Calculator Funnel

Open **`CRBOX — Calculator Funnel`** in Explore and look at:

| What to check | Healthy signal | Concerning signal |
|---------------|---------------|-------------------|
| **Step 1 → 2 drop-off** (`calculator_start` → `calculator_query`) | > 70% of starters submit a query | < 50% — users are interacting with inputs but not clicking "Calcular". Check for UX friction (button hard to find, form validation errors). |
| **Step 2 → 3 drop-off** (`calculator_query` → `calculator_result`) | > 90% — results almost always display after a query | Significant drop here indicates a JavaScript error in the result-display logic. Check the browser console on calculadora.html. |
| **Step 3 → 4 drop-off** (`calculator_result` → `cta_afiliate_click`) | > 25% of result viewers click the affiliate CTA | < 10% — users see the result but don't convert. The result page may not have a visible CTA or the price may be creating friction. |
| **`shipping_mode` breakdown** | Both `aereo` and `maritimo` complete the funnel at similar rates | If one mode has much lower completion, its UX or pricing may be broken or unclear. |

**Monthly action:** Compare the `aereo` vs `maritimo` rows in the breakdown — whichever mode has a higher completion rate is likely the stronger product-market fit. Use this to guide content and marketing emphasis.

---

### 7.5 How to Interpret the Contact Funnel

Open **`CRBOX — Contact Funnel`** in Explore and look at:

| What to check | Healthy signal | Concerning signal |
|---------------|---------------|-------------------|
| **Step 1 → 2 drop-off** (`form_start` → `contact_form_submit`) | > 60% of starters submit | < 40% — high abandon rate. The form may be too long, ask for unnecessary information, or have unclear field labels. |
| **`form_id` breakdown — `contact-form`** | High completion | Most traffic; if low, the main contact form has friction. Review field count and required fields. |
| **`form_id` breakdown — `maritimo-quote-form`** | Lower absolute volume, similar completion rate | If `maritimo-quote-form` completes at a much lower rate than `contact-form`, the maritime quote form likely has more friction (it asks for more fields). |
| **Absolute step-1 volume vs page sessions** | `form_start` should be at least 30–40% of `contacto.html` page sessions | Very low `form_start` volume means users aren't scrolling to the form or aren't motivated to start. Consider moving the form higher or adding a mid-page CTA. |

**Monthly action:** Track the `form_start → contact_form_submit` completion rate month over month. If you make form changes (remove a field, change copy), compare before/after in this funnel to measure the impact.

---

## 8. Preview and Debug

1. Open **GTM Preview Mode** (Submit → Preview).
2. Visit each of the 6 public pages and verify the expected events fire in the Tag Assistant panel:
   - **index.html** — scroll depth, section_visible (main-content, stats, servicios, cta-afiliate), nav_click, cta_afiliate_click, cta_calculadora_click, whatsapp_click
   - **servicios.html** — section_visible (servicios-destacados, casillero, compras, carga-aerea, carga-maritima), service_card_click, nav_click
   - **como-funciona.html** — section_visible (proceso, faq, cta-como-funciona), faq_engage, nav_click
   - **tarifas.html** — section_visible (aerea, maritima, cta-tarifas), scroll_depth, nav_click
   - **calculadora.html** — calculator_start, calculator_tab_switch, calculator_query, calculator_result, section_visible (aero-calculator), form_start, form_abandon
   - **contacto.html** — contact_form_submit, form_start, form_abandon, phone_click, email_click, whatsapp_click, section_visible (sucursales, formulario)
3. Confirm `page_type` is correct on each page (check the dataLayer variable in Tag Assistant).
4. Test scroll depth by scrolling slowly to 25%, 50%, 75%, and 90% on a long page (e.g., tarifas.html).
5. Test the full calculator flow: interact with a field (calculator_start) → click calculate (calculator_query) → verify result appears (calculator_result).
6. Submit a test contact form and confirm `contact_form_submit` fires.
7. Open the browser console and run `window.dataLayer` to inspect all pushed events.
8. Use GA4 DebugView (`Admin → DebugView`) to confirm parameters are arriving correctly.

---

## 9. Drop-off Alert Thresholds

Use this table during every weekly and monthly review. If any funnel step's completion rate reaches or drops below the **Alert Threshold**, stop and investigate before moving on. Do not wait until the next review cycle.

> **How to calculate a step rate:** Divide the completing-step event count by the entering-step event count for the same date range in GA4 Explore. Use **Last 7 days** for weekly reviews and **Last 28 days** for monthly reviews.

### 9.1 Calculator Funnel Thresholds

| Funnel Step | Metric | Healthy Baseline | Alert Threshold | When to Escalate |
|-------------|--------|-----------------|-----------------|-----------------|
| **Step 1 → 2:** `calculator_start` → `calculator_query` | % of starters who submit a query | > 70% | ≤ 50% | Users interact with inputs but don't click "Calcular" — check for UX friction, button visibility, or form validation errors |
| **Step 2 → 3:** `calculator_query` → `calculator_result` | % of queries that return a result | > 90% | ≤ 80% | Significant drop signals a JavaScript error in the result-display logic — check the browser console on calculadora.html |
| **Step 3 → 4:** `calculator_result` → `cta_afiliate_click` | % of result viewers who click the affiliate CTA | > 25% | ≤ 10% | Users see results but don't convert — the CTA may not be visible or the displayed price is creating friction |

**Weekly check:** Look at steps 1→2 and 3→4. Step 2→3 dropping below 80% always indicates a code regression — treat it as urgent.

**Monthly check:** Compare `aereo` vs `maritimo` rows in the `shipping_mode` breakdown. If either mode's step 1→2 rate drops below 50%, investigate that mode's UX and pricing presentation separately.

---

### 9.2 Contact Funnel Thresholds

| Funnel Step | Metric | Healthy Baseline | Alert Threshold | When to Escalate |
|-------------|--------|-----------------|-----------------|-----------------|
| **Step 1 → 2 (`contact-form`):** `form_start` → `contact_form_submit` | % of starters who submit the main contact form | > 60% | ≤ 40% | Form is too long, fields are unclear, or a required field is blocking submission — review field count and labels |
| **Step 1 → 2 (`maritimo-quote-form`):** `form_start` → `contact_form_submit` | % of starters who submit the maritime quote form | > 50% | ≤ 35% | The quote form asks for more fields; a lower rate is expected, but a sustained drop suggests a specific friction point (e.g. a new required field) |
| **`form_start` volume vs page sessions** | `form_start` count ÷ `contacto.html` sessions | ≥ 30% | < 20% | Users aren't scrolling to the form or aren't motivated to start — consider moving the form higher or adding a mid-page CTA |

**Weekly check:** If `contact_form_submit` count drops week-over-week, check both form completion rates against their thresholds: `contact-form` alert threshold is ≤ 40%; `maritimo-quote-form` alert threshold is ≤ 35%. Flag either form that breaches its threshold immediately.

**Monthly check:** Track the `contact-form` completion rate month over month. Any form-copy or field changes should be evaluated using a before/after comparison in the Contact Funnel exploration.

---

### 9.3 Escalation Protocol

When any threshold is breached:

1. **Note the date** and the exact rate observed — record it in a shared log (e.g. a sheet or Notion page).
2. **Check for zero-event anomalies first** — a tag that stopped firing will produce an artificially low rate. Verify in GA4 DebugView or GTM Preview Mode.
3. **Check the browser console** on the relevant page for JavaScript errors.
4. **Create an investigation ticket** describing which step breached, the observed rate, and the date. Assign it before closing the review session.
5. **Follow up the next week** — if the rate has not recovered, escalate to a full UX or code review of the affected step.
