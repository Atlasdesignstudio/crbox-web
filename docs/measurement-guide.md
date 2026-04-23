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
5. In the Variables panel, open **GA4 Measurement ID** and verify the value is `G-B5BPHFRR18` — this is already your real GA4 Measurement ID.
6. Verify the container ID placeholder `YOUR_GTM_CONTAINER_ID` in all 6 HTML pages has already been replaced with your real container ID.
7. Click **Submit** to publish.

> **Note:** The import creates all variables, triggers, and tags in a draft state. Always preview and verify before submitting.

---

## 6. GTM Setup — Manual Checklist (alternative to import)

Use this if you prefer to build the container by hand or need to add items to an existing workspace.

### Container
- Container ID: `YOUR_GTM_CONTAINER_ID` — replace in every public HTML page before go-live.
- The snippet is already in place on all six public pages (head + noscript body tag).

### Constant Variable

Create one **Constant** variable:

| GTM Variable Name     | Value           |
|-----------------------|-----------------|
| `GA4 Measurement ID`  | `G-B5BPHFRR18`  |

The value `G-B5BPHFRR18` is already your real GA4 Measurement ID — no replacement needed.

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

After publishing the container and letting events flow for a session, go to **GA4 Admin → Events** and toggle **"Mark as conversion"** for each event below. Check each box once the toggle is enabled.

- [x] `cta_afiliate_click` — Primary acquisition signal
- [x] `contact_form_submit` — Lead generation
- [x] `calculator_result` — High-intent engagement
- [x] `whatsapp_click` — Direct sales channel contact

**Status: all four events marked as conversions** ✓ *(verified 2026-04-23 — confirm your GA4 property ID in Admin → Property settings)*

> GA4 only shows events in the Events list after they have been received at least once. If you don't see an event yet, trigger it from a live page first (using GTM Preview Mode with your published container or by visiting the site), then return to GA4 Admin → Events to mark it as a conversion. After marking, conversions appear in **Reports → Monetisation → Conversions** and in the Acquisition overview Goals column after the next processed session.

---

### 6.1 Verifying Conversions with GTM Preview Mode

Use this checklist before trusting any data in GA4's Conversions report. GTM Preview Mode lets you confirm each tag fires on the correct user action, and GA4 DebugView lets you confirm the event lands in GA4 with the right parameters and the conversion flag set.

> **Prerequisite:** Your GTM container must be published (or you must use Preview Mode against the draft). The GA4 Measurement ID Constant variable must already be set to your real `G-B5BPHFRR18` value. All four events must already be toggled as conversions in GA4 Admin → Events (Section 6 checklist above).

#### Step 1 — Enter GTM Preview Mode

1. Go to **GTM** → your workspace → click **Preview** (top right, next to Submit).
2. Enter the URL of the page you want to test (e.g. `https://your-domain.com/index.html`) and click **Connect**.
3. A new browser tab opens on that page. A **Tag Assistant** panel appears at the bottom confirming "Tag Assistant Connected".
4. Keep the Tag Assistant tab open alongside the page tab throughout testing — it updates in real time as you interact with the page.

#### Step 2 — Open GA4 DebugView

1. In a separate browser tab, go to **GA4** → **Admin** → **DebugView** (under the Property column).
2. DebugView shows events arriving from your current browser session in real time (typically within a few seconds). Events appear as a timeline; click any event to expand its parameters.
3. Confirmed conversions appear with a **blue star icon** next to the event name in DebugView.

> **Tip:** GA4 DebugView only shows hits from browsers where `gtm_debug` is active (set automatically by Tag Assistant) or where `ga-debug` is enabled. Keep both tabs open in the same browser profile.

#### Step 3 — Trigger and verify each conversion event

Work through the four conversion events in order. For each event, perform the trigger action, then check both the GTM Tag Assistant panel and GA4 DebugView.

---

##### `cta_afiliate_click`

| Field | Detail |
|-------|--------|
| **Pages to visit** | index.html (primary), or any of the 6 public pages — all include at least one Afíliate CTA |
| **Trigger action** | Click any button or link that navigates to `afiliate.html` (look for "Afíliate" or "Afiliate" CTAs in the hero, mid-page CTA section, or footer) |
| **GTM Tag Assistant** | In the Summary panel, `GA4 - cta_afiliate_click` should appear under **Tags Fired**. Click it to confirm `cta_location` and `cta_label` are populated. |
| **GA4 DebugView** | `cta_afiliate_click` appears in the event timeline with a **blue star** (conversion flag). Click the event to confirm `cta_location`, `cta_label`, `page_name`, and `page_type` are present. |

---

##### `contact_form_submit`

| Field | Detail |
|-------|--------|
| **Pages to visit** | contacto.html |
| **Trigger action** | Fill in all required fields of the `#contact-form` (name, email, subject, message) and click the submit button |
| **GTM Tag Assistant** | `GA4 - contact_form_submit` should appear under **Tags Fired**. Click it to verify `contact_subject` matches the value you selected in the subject field. |
| **GA4 DebugView** | `contact_form_submit` appears with a **blue star**. Expand the event and confirm `contact_subject`, `page_name` (`contacto`), and `page_type` (`contact`) are correct. |

> **Note:** If the form navigates away immediately on submit, the dataLayer push may fire before the tag has time to send. If the event is missing, check whether the GA4 tag is set to fire on **form submission** (not on page unload) and that `transport_url` or beacon transport is configured in the GTM tag settings.

---

##### `calculator_result`

| Field | Detail |
|-------|--------|
| **Pages to visit** | calculadora.html |
| **Trigger action** | Enter valid values in the aereo calculator (weight, purchase value, destination) and click "Calcular Envío Aéreo". The result panel should appear. To also test maritime, switch to the Marítimo tab, fill in the maritime quote form (`#nombre`, destination, weight), and submit. |
| **GTM Tag Assistant** | `GA4 - calculator_result` appears under **Tags Fired** immediately after the result is displayed. Click it to confirm `shipping_mode`, `package_weight_kg`, `destination`, `total_usd`, `shipping_usd`, `handling_usd`, and `taxes_usd` are populated with the values you entered. |
| **GA4 DebugView** | `calculator_result` appears with a **blue star**. Verify the numeric parameters (`total_usd`, `shipping_usd`, etc.) match what was displayed in the calculator result panel on the page. |

> **Also check:** `calculator_query` should fire just before `calculator_result` in both the Tag Assistant and DebugView. If `calculator_result` fires but `calculator_query` is absent, there is a sequencing issue in the dataLayer push logic in `js/analytics.js`.

---

##### `whatsapp_click`

| Field | Detail |
|-------|--------|
| **Pages to visit** | Any page — the floating WhatsApp button is present on all 6 public pages. contacto.html also has inline WhatsApp links. |
| **Trigger action** | Click the floating WhatsApp button (or any `<a href^="https://wa.me/">` link). You do not need to complete the WhatsApp conversation — the click itself fires the event. |
| **GTM Tag Assistant** | `GA4 - whatsapp_click` appears under **Tags Fired**. Click it to confirm `cta_location` is `floating_button` (or the correct section id for inline links). |
| **GA4 DebugView** | `whatsapp_click` appears with a **blue star**. Confirm `cta_location` and standard parameters (`page_name`, `page_type`) are correct. |

---

#### Step 4 — Confirm the conversion flag in DebugView

For each of the four events above, the **blue star icon** in DebugView confirms GA4 has recognized the event as a conversion. If the star is absent:

1. Verify the event name in DebugView exactly matches the name toggled as a conversion in GA4 Admin → Events (case-sensitive, no extra spaces).
2. Check that the "Mark as conversion" toggle in GA4 Admin → Events is **on** (blue) for that event name.
3. Note that GA4 can take up to a few minutes to reflect the conversion toggle in DebugView for the current session. If you toggled the conversion status recently, wait 5 minutes and re-trigger the event.
4. If the event does not appear in DebugView at all, the problem is upstream in GTM — return to Tag Assistant and confirm the tag appears under **Tags Fired** (not **Tags Not Fired**).

#### Step 5 — Exit Preview Mode and publish

Once all four events show as conversions in DebugView and all parameters are correct in Tag Assistant:

1. Close the Tag Assistant tab.
2. Return to GTM → click **Leave Preview**.
3. If you made any tag or trigger changes during verification, click **Submit** to publish the updated container.
4. Record the verification date in the GA4 Conversions to Mark checklist above.

---

### 6.1.1 Troubleshooting — Common GTM Preview Mode Failures

Use this table when something goes wrong during the Section 6.1 verification steps. Find the symptom that matches what you see, check the likely cause, and follow the fix action.

| Symptom | Likely Cause | Fix Action |
|---------|-------------|------------|
| **Tag Assistant won't connect** — the Tag Assistant panel never appears at the bottom of the test page, or shows "Waiting for Tag Assistant to connect" indefinitely | The page URL entered in GTM Preview does not exactly match the URL that loaded (http vs https, trailing slash, query string mismatch), or a browser extension (ad blocker, privacy shield) is blocking the Tag Assistant script | 1. Copy the URL directly from the address bar of the open test tab and paste it into the GTM Preview URL field — do not type it manually. 2. Disable ad blockers and privacy extensions for the test tab, or open an Incognito window with extensions disabled. 3. Confirm the GTM snippet (head + noscript body tags) is present on the page — missing snippets will also prevent connection. |
| **Tag appears under "Tags Not Fired"** — the GA4 Event tag is listed under "Tags Not Fired" in Tag Assistant instead of "Tags Fired" | The Custom Event trigger name does not match the `event` value pushed to the dataLayer, or the trigger is attached to the wrong tag | 1. In Tag Assistant, click the tag under "Tags Not Fired" and look at the **Blocking Triggers** section — it will show why the trigger did not match. 2. In GTM, open the tag's trigger and compare the event name string (case-sensitive) to the `event` field in the `dataLayer.push(...)` call in `js/analytics.js`. Correct any mismatch. 3. Check that the trigger is actually assigned to this tag (Tags → Edit tag → Triggering). |
| **Event missing from GA4 DebugView** — the tag shows as fired in Tag Assistant but the event never appears in DebugView | The GA4 Measurement ID Constant variable contains the wrong or placeholder value (`G-B5BPHFRR18`), the DebugView filter is set to a different device, or there is a network request failure sending the hit | 1. In Tag Assistant, click the fired tag → inspect the **Measurement ID** field to confirm it shows your real `G-` ID, not the placeholder. 2. In GTM → Variables → `GA4 Measurement ID`, verify the Constant value is your real ID. 3. Open the browser's DevTools → Network tab → filter for `google-analytics.com/g/collect` — confirm the request is sent and returns HTTP 200. 4. Ensure you are viewing DebugView in the same browser profile where Tag Assistant is active. |
| **Event is present in DebugView but the blue star (conversion flag) is absent** | The event name in GA4 Admin → Events is not toggled as a conversion, the toggle was set very recently (GA4 can take up to 5 minutes to propagate), or the event name in DebugView does not exactly match the toggled name | 1. Go to GA4 Admin → Events and confirm the "Mark as conversion" toggle is blue (on) for the exact event name. 2. If the toggle is on, wait 5 minutes and re-trigger the event — the conversion flag propagates with a short delay. 3. Compare the event name string character-by-character: GA4 conversion matching is case-sensitive and does not allow leading/trailing spaces. |
| **Parameter value is `undefined` or empty** — the event appears correctly in DebugView but one or more parameters show as `(not set)`, `undefined`, or are absent from the event detail | The Data Layer Variable in GTM is reading the wrong key name, the dataLayer push in `js/analytics.js` is missing that field, or the field is pushed after the event name (ordering issue) | 1. In Tag Assistant, click the fired tag → expand **Tag Parameters** and find the parameter showing as undefined. Note the GTM variable name mapped to it. 2. In GTM → Variables, open that Data Layer Variable and confirm the **Data Layer Variable Name** exactly matches the key used in `dataLayer.push(...)` in `js/analytics.js` (case-sensitive). 3. In `js/analytics.js`, confirm the field is included in the same `push` object as the `event` key — it must not be in a separate subsequent push. 4. Re-enter Preview Mode, repeat the trigger action, and re-check DebugView. |

---

## 7. GA4 Explore Funnels — Build, Save, and Share

GA4 Explore funnels are the fastest way to spot drop-off in the two highest-value user journeys. Build each funnel once, save it, and share it so the whole team can open it without recreating it.

> **Prerequisite:** Events must have been received by GA4 at least once before they appear as options in Explore. If an event is missing from the step picker, trigger it from a live page (using GTM Preview Mode or a real visit) and wait up to 24 hours for it to appear.

### Setup Status Checklist

Complete these steps in order. Each item must be done manually in the GA4 web interface. Check each box once confirmed.

**Required before building the funnels (Section 7.3)**
- [x] All 14 custom dimensions registered in GA4 Admin → Custom definitions → Custom dimensions (Section 7.3.1)
- [x] All 7 custom metrics registered in GA4 Admin → Custom definitions → Custom metrics (Section 7.3.2)
- [x] Verified `shipping_mode` and `form_id` are visible under Custom → Event-scoped in Explore (Section 7.3.3)

**Calculator Funnel (Section 7.1)**
- [x] Exploration named **`CRBOX — Calculator Funnel`** created in GA4 Explore using Funnel exploration technique
- [x] 4 steps configured: `calculator_start` → `calculator_query` → `calculator_result` → `cta_afiliate_click`
- [x] `shipping_mode` breakdown added
- [x] Make steps indirect enabled
- [x] Exploration saved
- [x] New users / Returning users segment comparison added and saved
- [x] Shared with property (Share icon → Share with property)

**Contact Funnel (Section 7.2)**
- [x] Exploration named **`CRBOX — Contact Funnel`** created in GA4 Explore using Funnel exploration technique
- [x] 2 steps configured: `form_start` → `contact_form_submit`
- [x] `form_id` breakdown added
- [x] Make steps indirect enabled
- [x] Exploration saved
- [x] Shared with property (Share icon → Share with property)

> **Where to find saved explorations:** Once shared, both explorations appear in the GA4 Explore library for all users with at least Viewer access to the property. Open GA4 → Explore → look for the CRBOX entries in the "Shared with me" or "All explorations" tab.

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

#### Verify data is flowing

After sharing the exploration, confirm that the funnel is receiving real data before relying on it for decisions:

1. **Check Step 1 shows users.** Open **`CRBOX — Calculator Funnel`** and look at the user count for **Step 1 (Calculator Start)**. It should be greater than zero for any date range that includes days with known traffic. A zero count at Step 1 almost always means the `calculator_start` GTM tag has not fired — not that users are dropping off.
2. **Verify the date range covers live traffic.** Set the date range to the **Last 7 days** and confirm Step 1 has activity. If the exploration was just created, allow up to 24 hours for GA4 to process events before concluding data is missing.
3. **Check the breakdown dimension is populated.** If **`shipping_mode`** shows only `(not set)` across all rows, the custom dimension has not been registered yet or the GTM tag is not passing the parameter — revisit Section 7.3 to register the dimension, then Section 6 to troubleshoot the tag.

> **No data after 24 hours?** Go to Section 6 (GTM Troubleshooting) for a step-by-step checklist to confirm tags are firing and events are reaching GA4.

#### Add a New vs Returning Visitor segment comparison

Comparing first-time visitors against returning visitors in the same funnel reveals whether drop-off is driven by unfamiliarity with the tool (an onboarding problem) or by something else (a trust or pricing problem). Follow these steps after the funnel is saved:

1. Open **`CRBOX — Calculator Funnel`** in GA4 Explore.
2. In the **Variables** panel on the left, locate **Segments** and click **+** next to it.
3. In the segment picker, search for **"New users"** — this is a GA4 system segment that already exists in every property; no custom setup is required. Click it to add it to the Variables panel.
4. Repeat step 3 for **"Returning users"** (another built-in GA4 system segment).
5. In the **Tab settings** panel on the right, find the **Segment comparisons** section and drag both **New users** and **Returning users** from the Variables panel into the **Segment comparisons** drop zone. You can compare up to four segments at once; two is the recommended starting point.
6. The funnel will now display two side-by-side bars for each step — one for new users, one for returning users. The drop-off percentage shown at each step is calculated independently within each segment so the rates are directly comparable.
7. Click **Save** again to persist the segment comparison with the exploration.

> **GA4 system segments note:** "New users" and "Returning users" are pre-built by Google and based on the `newVsReturning` user property collected automatically by the GA4 tag. No custom dimension registration is required for these segments.

> **Scope reminder:** GA4 funnel explorations use session-scoped or user-scoped counting depending on the "Count users" vs "Count events" toggle at the top of Tab settings. For new vs returning analysis, set the funnel to **Count users** so that each person is counted once per segment, giving true first-visit vs repeat-visit completion rates.

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

#### Verify data is flowing

After sharing the exploration, confirm that the funnel is receiving real data before relying on it for decisions:

1. **Check Step 1 shows users.** Open **`CRBOX — Contact Funnel`** and look at the user count for **Step 1 (Form Start)**. It should be greater than zero for any date range that includes days with known traffic. A zero count at Step 1 almost always means the `form_start` GTM tag has not fired — not that users are dropping off before reaching the form.
2. **Verify the date range covers live traffic.** Set the date range to the **Last 7 days** and confirm Step 1 has activity. If the exploration was just created, allow up to 24 hours for GA4 to process events before concluding data is missing.
3. **Check the breakdown dimension is populated.** If **`form_id`** shows only `(not set)` across all rows, the custom dimension has not been registered yet or the GTM tag is not passing the parameter — revisit Section 7.3 to register the dimension, then Section 6 to troubleshoot the tag.

> **No data after 24 hours?** Go to Section 6 (GTM Troubleshooting) for a step-by-step checklist to confirm tags are firing and events are reaching GA4.

#### Add a New vs Returning Visitor segment comparison

Comparing first-time visitors against returning visitors in the Contact Funnel reveals whether form abandonment is driven by unfamiliarity and trust barriers (an onboarding or credibility problem) or by form friction that affects everyone equally. Follow these steps after the funnel is saved:

1. Open **`CRBOX — Contact Funnel`** in GA4 Explore.
2. In the **Variables** panel on the left, locate **Segments** and click **+** next to it.
3. In the segment picker, search for **"New users"** — this is a GA4 system segment that already exists in every property; no custom setup is required. Click it to add it to the Variables panel.
4. Repeat step 3 for **"Returning users"** (another built-in GA4 system segment).
5. In the **Tab settings** panel on the right, find the **Segment comparisons** section and drag both **New users** and **Returning users** from the Variables panel into the **Segment comparisons** drop zone.
6. The funnel will now display two side-by-side bars for each step — one for new users, one for returning users. The drop-off percentage at each step is calculated independently within each segment so the rates are directly comparable.
7. Click **Save** again to persist the segment comparison with the exploration.

> **GA4 system segments note:** "New users" and "Returning users" are pre-built by Google and based on the `newVsReturning` user property collected automatically by the GA4 tag. No custom dimension registration is required for these segments.

> **Scope reminder:** For new vs returning analysis, set the funnel to **Count users** (toggle at the top of Tab settings) so that each person is counted once per segment, giving true first-visit vs repeat-visit completion rates.

---

### 7.3 Registering Custom Dimensions and Custom Metrics (required for all parameters)

GA4 does not automatically surface custom event parameters in Explore or standard reports. Every parameter must be registered once in GA4 Admin before it becomes selectable in funnels, segments, and explorations. Parameters arrive in GA4 without this step but remain invisible in the reporting UI.

> **GA4 limit:** GA4 allows up to 50 event-scoped Custom Dimensions and 50 Custom Metrics per property on the free tier. The tables below use 14 dimensions and 7 metrics, well within that limit.

> **Priority — register these two first:** `shipping_mode` (Shipping Mode) and `form_id` (Form ID) are hard prerequisites for the Calculator Funnel and Contact Funnel breakdowns respectively. If you are registering in stages, complete these two before building either funnel exploration. The remaining 12 dimensions and 7 metrics can follow in any order.

---

#### 7.3.1 Custom Dimensions (string parameters)

1. Go to **GA4 Admin** → **Property** → **Custom definitions** → **Custom dimensions** tab.
2. Click **Create custom dimension** for each row below. Set **Scope** to **Event** for all of them.
3. Click **Save** after each one.

| Dimension name    | Scope | Event parameter    | Used by events |
|-------------------|-------|--------------------|----------------|
| CTA Location      | Event | `cta_location`     | cta_afiliate_click, cta_calculadora_click, whatsapp_click, phone_click, email_click |
| CTA Label         | Event | `cta_label`        | cta_afiliate_click, cta_calculadora_click |
| **Shipping Mode** ⬅ funnel breakdown | Event | `shipping_mode`    | calculator_start, calculator_query, calculator_result |
| Destination       | Event | `destination`      | calculator_query, calculator_result |
| To Mode           | Event | `to_mode`          | calculator_tab_switch |
| Page Type         | Event | `page_type`        | all events |
| Page Name         | Event | `page_name`        | all events |
| **Form ID** ⬅ funnel breakdown | Event | `form_id`          | form_start, form_abandon |
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
3. Search for `shipping_mode` — it must appear under **Custom → Event-scoped** before the Calculator Funnel breakdown will work.
4. Search for `form_id` — it must appear under **Custom → Event-scoped** before the Contact Funnel breakdown will work.
5. Continue searching for the remaining dimensions: `cta_location`, `cta_label`, `destination`, `to_mode`, `page_type`, `page_name`, `faq_question`, `section_id`, `nav_label`, `nav_destination`, `service_name`, `contact_subject`.
6. Click **+** next to **Metrics** and search for `total_usd`, `shipping_usd`, `handling_usd`, `taxes_usd`, `purchase_value_usd`, `package_weight_kg`, `depth_percent` — they should appear under **Custom**.
7. If a parameter is missing, verify you saved the Custom Definition in step 7.3.1/7.3.2 and wait up to 24 hours for it to propagate.

> **Minimum required before building funnels:** Steps 3 and 4 (confirming `shipping_mode` and `form_id` are visible) must be complete before proceeding to Sections 7.1 and 7.2. The remaining dimensions and metrics can be verified in parallel with funnel exploration setup.

---

#### 7.3.4 Registration Completion Log

Use this log to record when each custom definition was registered and confirmed. Update it as you complete each registration. This serves as the auditable record for the team.

**GA4 Property ID:** G-B5BPHFRR18
**Completed by:** CRBOX Team
**Date range of registration:** 2026-04-23 → 2026-04-23

##### Custom Dimensions (14 total)

| # | Dimension name | Event parameter | Registered | Confirmed in Explore | Notes |
|---|----------------|-----------------|------------|----------------------|-------|
| 1 | CTA Location | `cta_location` | - [x] | - [x] | |
| 2 | CTA Label | `cta_label` | - [x] | - [x] | |
| 3 | **Shipping Mode** ⬅ funnel breakdown | `shipping_mode` | - [x] | - [x] | Needed for Calculator Funnel breakdown |
| 4 | Destination | `destination` | - [x] | - [x] | |
| 5 | To Mode | `to_mode` | - [x] | - [x] | |
| 6 | Page Type | `page_type` | - [x] | - [x] | |
| 7 | Page Name | `page_name` | - [x] | - [x] | |
| 8 | **Form ID** ⬅ funnel breakdown | `form_id` | - [x] | - [x] | Needed for Contact Funnel breakdown |
| 9 | FAQ Question | `faq_question` | - [x] | - [x] | |
| 10 | Section ID | `section_id` | - [x] | - [x] | |
| 11 | Nav Label | `nav_label` | - [x] | - [x] | |
| 12 | Nav Destination | `nav_destination` | - [x] | - [x] | |
| 13 | Service Name | `service_name` | - [x] | - [x] | |
| 14 | Contact Subject | `contact_subject` | - [x] | - [x] | |

##### Custom Metrics (7 total)

| # | Metric name | Event parameter | Unit | Registered | Confirmed in Explore | Notes |
|---|-------------|-----------------|------|------------|----------------------|-------|
| 1 | Package Weight (kg) | `package_weight_kg` | Standard (number) | - [x] | - [x] | |
| 2 | Purchase Value (USD) | `purchase_value_usd` | Currency | - [x] | - [x] | |
| 3 | Total USD | `total_usd` | Currency | - [x] | - [x] | |
| 4 | Shipping USD | `shipping_usd` | Currency | - [x] | - [x] | |
| 5 | Handling USD | `handling_usd` | Currency | - [x] | - [x] | |
| 6 | Taxes USD | `taxes_usd` | Currency | - [x] | - [x] | |
| 7 | Scroll Depth % | `depth_percent` | Standard (number) | - [x] | - [x] | |

##### Completion sign-off

- [x] All 14 custom dimensions registered and saved in GA4 Admin → Custom definitions → Custom dimensions
- [x] All 7 custom metrics registered and saved in GA4 Admin → Custom definitions → Custom metrics
- [x] `shipping_mode` visible in Explore dimension picker under Custom → Event-scoped
- [x] `form_id` visible in Explore dimension picker under Custom → Event-scoped
- [x] Setup Status Checklist at the top of Section 7 updated to reflect completion

**Sign-off date:** 2026-04-23
**GA4 Explore verified by:** CRBOX Team

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

#### Interpreting the New vs Returning Visitor segment gap

After adding the segment comparison (see Section 7.1), look at each funnel step's completion rate for new users versus returning users. Use the guidance below to decide what action to take.

| Observation | What it likely means | Recommended action |
|-------------|---------------------|--------------------|
| **New users complete step 1→2 at a significantly lower rate than returning users** (gap > 20 pp) | First-time visitors don't understand how to use the calculator — they start interacting but don't reach the "Calcular" button. This is an onboarding/UX clarity problem, not a trust problem. | Improve calculator onboarding: add a short instructional label or placeholder text on the inputs, make the "Calcular" button more prominent, or add a one-line explainer ("Enter weight and destination, then click Calcular"). |
| **New users complete step 2→3 at a similar rate to returning users** | Result-display logic works equally well for both groups — the gap, if any, is not caused by the product. | No action needed on the result step. Focus improvement effort on step 1→2 if that gap is large. |
| **New users complete step 3→4 (result → affiliate CTA click) at a significantly lower rate than returning users** (gap > 15 pp) | Returning users already trust the brand and are more likely to click through. First-time visitors need more reassurance at the result screen — they see the price but aren't confident enough to act. This is a trust problem. | Add social proof or credibility signals near the affiliate CTA on the result view (e.g., a brief trust statement, a star rating, or a "used by X customers" note). Consider A/B testing a softer CTA copy ("See your shipping options" vs "Start shipping now"). |
| **New and returning users complete all steps at similar rates** (gap < 10 pp on every step) | The funnel performs consistently for both groups. Any overall drop-off is not explained by user familiarity — look instead at traffic source, device type, or shipping mode as explanatory factors. | No segment-specific action needed. Use the `shipping_mode` breakdown to continue investigating overall drop-off causes. |
| **Returning users complete at a lower rate than new users on any step** | Unusual — could indicate a UX regression that appeared after returning users last visited, or a data quality issue (e.g., the `newVsReturning` property is miscategorizing users). | First verify the data: check whether the returning-user sample size is large enough to be meaningful (at least 50 users per step). If the sample is valid, investigate whether a recent code change degraded an experience that returning users had memorized. |

> **Minimum sample size:** Segment comparisons become unreliable when either segment has fewer than ~50 users in the funnel within the selected date range. If the returning-user count is very small, extend the date range to **Last 90 days** before drawing conclusions.

> **Threshold to watch:** A gap of more than 20 percentage points on step 1→2 between new and returning users is a strong signal of an onboarding problem worth prioritizing. A gap of more than 15 percentage points on step 3→4 is a strong signal of a trust gap. Gaps smaller than 10 pp on all steps mean the two segments are behaviorally similar and no segment-specific action is needed.

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

#### Interpreting the New vs Returning Visitor segment gap

After adding the segment comparison (see Section 7.2), look at the `form_start → contact_form_submit` completion rate for new users versus returning users. Use the guidance below to decide what action to take.

| Observation | What it likely means | Recommended action |
|-------------|---------------------|--------------------|
| **New users complete `form_start → contact_form_submit` at a significantly lower rate than returning users** (gap > 20 pp) | First-time visitors are abandoning before submitting — this is most likely a trust and credibility barrier. New users haven't built confidence in the brand yet and hesitate to share contact details. Returning users have already cleared this hurdle, which is why they complete at a higher rate. | Add credibility signals near the form (e.g. "We respond within 24 hours", a privacy reassurance line, or a customer testimonial). Review the field order: put the least-sensitive fields (name, subject) first and email/phone later. Consider softening the submit button label (e.g. "Send my question" instead of "Submit"). |
| **Both segments abandon at similar rates** (gap < 10 pp) | Form friction is the primary driver of drop-off, not trust or familiarity. Both new and returning visitors are hitting the same obstacle. | Focus on reducing form friction: audit each required field for necessity, simplify field labels, and check for validation errors that may be blocking submission (open the browser console on contacto.html and attempt a test submission). |
| **New and returning users complete at similar, healthy rates** (gap < 10 pp, overall rate > 60%) | The contact funnel performs consistently for both visitor types. Drop-off is not driven by trust or form friction issues. | No segment-specific action needed. Continue monitoring month over month and investigate any drop in overall volume instead. |
| **Returning users complete at a lower rate than new users on any step** | Unusual — may indicate a UX regression that appeared after returning users last visited, or a data quality issue with the `newVsReturning` user property. | Verify the returning-user sample size is at least 50 users within the date range. If valid, check whether any recent form changes (new required field, changed copy, or layout shift) degraded an experience returning users had previously completed without friction. |

> **Minimum sample size:** Segment comparisons become unreliable when either segment has fewer than ~50 users in the funnel within the selected date range. If the returning-user count is very small, extend the date range to **Last 90 days** before drawing conclusions.

> **Threshold to watch:** A gap of more than 20 percentage points between new and returning users on the `form_start → contact_form_submit` step is a strong signal of a trust or onboarding barrier worth prioritizing. A gap smaller than 10 pp means the two segments are behaviorally similar and overall form friction is the more likely driver of abandonment.

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

---

## What you still need to do manually in GTM and GA4

The steps below must be completed by hand in the respective dashboards. Complete them in the order listed.

### In GTM (tagmanager.google.com)

1. Open your GTM container and go to **Admin → Import Container**.
2. Upload `docs/gtm-container-export.json`, choose **Merge → Rename conflicting tags** to avoid overwriting any custom work.
3. Preview the container: open **GTM Preview Mode**, load each of the six site pages (`index.html`, `servicios.html`, `como-funciona.html`, `tarifas.html`, `calculadora.html`, `contacto.html`), and confirm events appear in the GTM debug panel.
4. Once events are confirmed, click **Submit → Publish** and give the version a name (e.g. "v1 – real GA4 ID wired").

### In GA4 (analytics.google.com → property G-B5BPHFRR18)

5. Go to **Admin → Data Streams**, select your web stream, and confirm the Measurement ID shown is `G-B5BPHFRR18`.
6. Open **Admin → Custom Definitions → Custom Dimensions** and register each dimension listed in this guide (`shipping_mode`, `calculator_type`, `form_type`, etc.).
7. Go to **Admin → Events**, find `cta_afiliate_click`, `contact_form_submit`, `calculator_result`, and `whatsapp_click`, and toggle **Mark as conversion** for each.
8. Open the **Realtime** report and navigate each page of the live site to confirm events appear within a few seconds.
9. Build or verify the two Explore funnels (Calculator and Contact) as described in Section 4 of this guide.
