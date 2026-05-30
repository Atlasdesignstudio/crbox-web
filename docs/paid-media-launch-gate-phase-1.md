# CRBOX — Paid Media Launch Gate: Phase 1

**Status:** Implementation complete — awaiting manual platform setup before spend  
**Date:** 2026-05-29  
**Source of truth:** `docs/measurement-map-v1.md`  
**GA4 Property:** G-B5BPHFRR18  
**GTM Container:** GTM-5WD8N53F  

---

## Table of Contents

1. [What changed](#1-what-changed)
2. [Files changed](#2-files-changed)
3. [UTM attribution behavior](#3-utm-attribution-behavior)
4. [First-touch vs last-touch rules](#4-first-touch-vs-last-touch-rules)
5. [Updated event payload examples](#5-updated-event-payload-examples)
6. [New parameters — dataLayer-ready status](#6-new-parameters--dataLayer-ready-status)
7. [Which parameters still require GTM/GA4 setup](#7-which-parameters-still-require-gtmga4-setup)
8. [Google Ads conversion readiness](#8-google-ads-conversion-readiness)
9. [Meta Pixel readiness](#9-meta-pixel-readiness)
10. [Manual platform setup required](#10-manual-platform-setup-required)
11. [QA checklist](#11-qa-checklist)
12. [Launch gate checklist](#12-launch-gate-checklist)
13. [Known limitations](#13-known-limitations)
14. [What remains for Phase 2](#14-what-remains-for-phase-2)

---

## 1. What changed

### `js/analytics.js`

**New: UTM attribution capture module** (`_crboxCaptureAttribution`, `_crboxAttribution`)

A self-contained attribution layer was added to the centralized analytics utility. It:

- Reads `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, and `fbclid` from the current page URL immediately on script parse (before `DOMContentLoaded`)
- Stores first-touch attribution in `sessionStorage` under `crbox_utm_first_touch` — written once per session, never overwritten
- Stores last-touch attribution in `sessionStorage` under `crbox_utm_last_touch` — updated every time a URL with UTM params is loaded within the session
- Stores the raw `gclid` value in `sessionStorage.crbox_gclid` and raw `fbclid` in `sessionStorage.crbox_fbclid` for future server-side CAPI / offline conversion matching — these raw values are **never pushed to `dataLayer`**
- Exposes `CRBOX.attribution()` as a public debug function that returns the current safe attribution payload

**Modified: `push()` method**

Every `CRBOX.track.*` event now automatically includes attribution parameters when sessionStorage contains attribution data. The merge order is:

```
{ event } → _crboxPageCtx() → _crboxAttribution() → event-specific params
```

Event-specific params win over attribution params in any key collision — existing event behavior is fully preserved.

**New public debug interface**

```javascript
CRBOX.attribution()  // returns current safe attribution payload
CRBOX.getFirstTouch() // returns raw first-touch sessionStorage object
CRBOX.getLastTouch()  // returns raw last-touch sessionStorage object
```

### `docs/paid-media-launch-gate-phase-1.md`

This file (what you are reading now).

---

## 2. Files changed

| File | Type of change | What changed |
|------|---------------|--------------|
| `js/analytics.js` | **Modified** | Attribution capture module added; `push()` updated to merge attribution into every event; file header comment updated; `CRBOX.attribution`, `CRBOX.getFirstTouch`, `CRBOX.getLastTouch` debug helpers exposed |
| `docs/paid-media-launch-gate-phase-1.md` | **Created** | This document |

**Files NOT changed** (by design):

- All `.html` files — no inline tracking changes
- `server.py` — no backend changes
- `docs/measurement-map-v1.md` — source of truth, not modified
- `docs/tracking-plan.md` — event catalogue, not modified
- `docs/analytics-taxonomy.md` — taxonomy registry, not modified
- `docs/gtm-container-export.json` — GTM export, not modified (GTM changes are documented below as manual tasks)
- Any CSS, image, or portal logic file

---

## 3. UTM attribution behavior

### Which URL parameters are captured

Only a strict allowlist is ever read from the URL:

| Parameter | Stored in sessionStorage | Sent to dataLayer | Notes |
|-----------|--------------------------|-------------------|-------|
| `utm_source` | Yes — in first/last touch objects | Yes — as `utm_source` | Sanitized, max 200 chars |
| `utm_medium` | Yes | Yes | Sanitized, max 200 chars |
| `utm_campaign` | Yes | Yes | Sanitized, max 200 chars |
| `utm_content` | Yes | Yes | Sanitized, max 200 chars |
| `utm_term` | Yes | Yes | Sanitized, max 200 chars |
| `gclid` | Yes — `sessionStorage.crbox_gclid` | **No** — only `gclid_present: true` | Raw value for future CAPI |
| `fbclid` | Yes — `sessionStorage.crbox_fbclid` | **No** — only `fbclid_present: true` | Raw value for future CAPI |
| **All other params** | **No** | **No** | `?email=`, `?token=`, `?id=` etc. are ignored |

### What is stored

**`sessionStorage.crbox_utm_first_touch`** (JSON object, written once):

```json
{
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "crbox-2026-q2-brand",
  "utm_content": "hero-registro-cta",
  "utm_term": "casillero miami",
  "gclid_present": true,
  "landing_page_path": "/afiliate.html"
}
```

**`sessionStorage.crbox_utm_last_touch`** (JSON object, updated on each page with UTM params):

```json
{
  "utm_source": "meta",
  "utm_medium": "paid_social",
  "utm_campaign": "crbox-2026-q2-retargeting",
  "utm_content": "carousel-calculator",
  "fbclid_present": true,
  "landing_page_path": "/calculadora.html"
}
```

**`sessionStorage.crbox_gclid`** (raw string — NEVER sent to dataLayer):

```
EAIaIQobChMI...
```

**`sessionStorage.crbox_fbclid`** (raw string — NEVER sent to dataLayer):

```
IwAR2...
```

### Sanitization

- All values are trimmed and capped at 200 characters
- Only the whitelisted keys listed above are ever read from the URL
- `landing_page_path` captures `window.location.pathname` only — no query string, no fragment

### Failure behavior

All `sessionStorage` operations are wrapped in `try/catch`. If `sessionStorage` throws (e.g., private browsing mode, storage quota exceeded, browser restriction), the `_crboxCaptureAttribution()` call is silently skipped, `_crboxAttribution()` returns `{}`, and every event fires normally with no attribution params. The website never breaks.

---

## 4. First-touch vs last-touch rules

| Rule | Behavior |
|------|----------|
| **First-touch written** | On first page load in the session that contains UTM or click ID params. Written to `crbox_utm_first_touch`. |
| **First-touch preserved** | Never overwritten, even if the user navigates to another UTM-tagged URL within the same session. |
| **Last-touch updated** | On every page load within the session that contains UTM or click ID params. Written to `crbox_utm_last_touch`. |
| **Last-touch omitted** | If the user lands directly (no UTM params), `crbox_utm_last_touch` is not written on that page load. The previous last-touch value persists in sessionStorage from the previous UTM-tagged page. |
| **Session boundary** | `sessionStorage` is tab/window scoped and cleared when the tab closes. A new tab or new browser window starts a fresh attribution session. This is the correct behavior for paid media attribution. |
| **Both available** | If the user arrived via a first UTM and then clicked a second UTM link within the same session, both are stored. `attribution_touch: 'both_available'` is included in the dataLayer payload. |
| **Active payload** | `_crboxAttribution()` always returns last-touch values when available, falling back to first-touch. This means every event is attributed to the most recent known campaign. |

### Touch model in `attribution_touch` parameter

| Value | Meaning |
|-------|---------|
| `'first_touch'` | Only first-touch is stored; last-touch not set (user had one UTM entry point) |
| `'last_touch'` | Both are stored but they are identical (user only clicked one campaign link) |
| `'both_available'` | First-touch and last-touch differ (user clicked multiple campaign links in session) |
| `'none'` | No attribution stored (direct session, no UTM params seen) — this value is **not sent** in the payload; attribution params are simply absent |

---

## 5. Updated event payload examples

### `signup_success` — with Google Ads click attribution

```json
{
  "event": "signup_success",
  "page_path": "/afiliate.html",
  "page_name": "afiliate",
  "page_type": "public_affiliate",
  "page_path_group": "public",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "crbox-2026-q2-brand",
  "utm_content": "hero-registro",
  "utm_term": "casillero miami",
  "gclid_present": true,
  "attribution_touch": "first_touch",
  "account_type": "personal"
}
```

### `quote_request_submit_success` — with Meta click attribution

```json
{
  "event": "quote_request_submit_success",
  "page_path": "/cotizar.html",
  "page_name": "cotizar",
  "page_type": "portal_quotes",
  "page_path_group": "quote",
  "utm_source": "meta",
  "utm_medium": "paid_social",
  "utm_campaign": "crbox-2026-q2-retargeting",
  "utm_content": "carousel-v2",
  "fbclid_present": true,
  "attribution_touch": "both_available",
  "service_type": "aereo",
  "destination_country": "CR"
}
```

### `calculator_result` — direct session (no UTM)

```json
{
  "event": "calculator_result",
  "page_path": "/calculadora.html",
  "page_name": "calculadora",
  "page_type": "public_calculator",
  "page_path_group": "public",
  "shipping_mode": "aereo",
  "weight_bucket": "1_5kg",
  "value_bucket": "100_500",
  "destination_country": "CR"
}
```

_(No attribution params — direct session. Existing event behavior fully preserved.)_

### `whatsapp_click` — with email/organic attribution

```json
{
  "event": "whatsapp_click",
  "page_path": "/index.html",
  "page_name": "index",
  "page_type": "public_home",
  "page_path_group": "public",
  "utm_source": "email",
  "utm_medium": "newsletter",
  "utm_campaign": "crbox-may-2026-reactivation",
  "attribution_touch": "last_touch",
  "cta_location": "floating_button",
  "link_domain": "wa.me",
  "link_context": "floating_button"
}
```

---

## 6. New parameters — dataLayer-ready status

All new parameters are injected through `_crboxAttribution()` into the `push()` method. They reach `window.dataLayer` on every event — no GTM changes needed for the dataLayer push itself. However, **GTM must be configured to read these variables** before they are available in GA4 custom reports, Meta Pixel tags, or Google Ads conversion tags.

| Parameter | Type | Values | In dataLayer | GTM DLV needed | GA4 custom dim needed | Notes |
|-----------|------|--------|:---:|:---:|:---:|-------|
| `utm_source` | string | `google`, `meta`, `email`, etc. | ✅ | Recommended | No — GA4 built-in | GA4 auto-populates `session_source` from UTM |
| `utm_medium` | string | `cpc`, `paid_social`, `email`, etc. | ✅ | Recommended | No — GA4 built-in | GA4 auto-populates `session_medium` |
| `utm_campaign` | string | Controlled naming convention | ✅ | Recommended | No — GA4 built-in | GA4 auto-populates `session_campaign` |
| `utm_content` | string | Creative/ad label | ✅ | Recommended | Optional | Not a GA4 built-in dimension |
| `utm_term` | string | Search keyword slug | ✅ | Recommended | Optional | Not a GA4 built-in dimension |
| `gclid_present` | boolean | `true` | ✅ | Yes | **Required** | Identifies Google Ads sessions |
| `fbclid_present` | boolean | `true` | ✅ | Yes | **Required** | Identifies Meta Ads sessions |
| `attribution_touch` | string | `first_touch` / `last_touch` / `both_available` | ✅ | Yes | **Required** | Attribution model indicator |

---

## 7. Which parameters still require GTM/GA4 setup

### GTM Data Layer Variables (DLVs) to create

In GTM → Variables → User-Defined Variables → Data Layer Variable:

| DLV name (suggested) | Data Layer Variable Name | Default Value |
|---------------------|--------------------------|---------------|
| `DLV - utm_source` | `utm_source` | `(not set)` |
| `DLV - utm_medium` | `utm_medium` | `(not set)` |
| `DLV - utm_campaign` | `utm_campaign` | `(not set)` |
| `DLV - utm_content` | `utm_content` | `(not set)` |
| `DLV - utm_term` | `utm_term` | `(not set)` |
| `DLV - gclid_present` | `gclid_present` | `false` |
| `DLV - fbclid_present` | `fbclid_present` | `false` |
| `DLV - attribution_touch` | `attribution_touch` | `none` |

These variables are needed by:
- Google Ads conversion tags (to pass `utm_campaign`, `gclid_present`)
- Meta Pixel tags (to pass `utm_source`, `fbclid_present` as custom data)
- GA4 event parameters (for `gclid_present`, `fbclid_present`, `attribution_touch`)

### GA4 Custom Dimensions to register

In GA4 Admin → Custom Definitions → Custom Dimensions → Create:

| Dimension Name | Scope | Parameter Name | Required before spend |
|---------------|-------|----------------|----------------------|
| Click ID — Google present | Event | `gclid_present` | Yes — for Google Ads attribution reports |
| Click ID — Meta present | Event | `fbclid_present` | Yes — for Meta attribution reports |
| Attribution Touch | Event | `attribution_touch` | Yes — for cross-channel analysis |
| UTM Content | Event | `utm_content` | Optional — for ad creative reporting |
| UTM Term | Event | `utm_term` | Optional — for keyword reporting |

> **Note:** `utm_source`, `utm_medium`, and `utm_campaign` do **not** need new custom dimensions. GA4 automatically captures these as `session_source`, `session_medium`, and `session_campaign` from UTM URL parameters. The dataLayer params serve as GTM variables for Meta and Google Ads tags.

---

## 8. Google Ads conversion readiness

### Recommended approach: GA4 Import (Phase 1)

**Recommendation: Import GA4 key events into Google Ads, not direct GTM conversion tags.**

| Factor | GA4 Import | Direct GTM Google Ads Tag |
|--------|-----------|--------------------------|
| Setup time | ~10 min — no new GTM code | ~2–4 hours — new tags + QA |
| Cross-device measurement | Yes — Google Signals | No |
| Attribution model support | All Google Ads models | Last-click only in tag |
| Historical data | Yes — from when GA4 key event was first created | No — only from tag deploy date |
| Maintenance | Low — events auto-flow | Medium — separate tag per conversion |
| Risk of double counting | Low if GA4 is the single source | Higher — easy to double count |
| Recommended for Phase 1 | **Yes** | No — use in Phase 2 if needed |

**Phase 1 path:** Mark GA4 events as Key Events → Link GA4 to Google Ads → Import as conversion actions.

### Conversion action configuration

#### Primary conversions (optimize campaigns toward these)

| Conversion Action Name | Source | GA4 Key Event | Count | Value | Account Default Goal |
|------------------------|--------|---------------|-------|-------|---------------------|
| `CRBOX - Registro Completado` | GA4 import | `signup_success` | One per session | USD 5.00 (placeholder) | **Yes** |
| `CRBOX - Cotización Enviada` | GA4 import | `quote_request_submit_success` | One per session | USD 15.00 (placeholder) | **Yes** |

Both events are backend-gated (fire only after confirmed API 2xx) — safe for primary optimization.

#### Secondary conversions (measure only — do NOT set as account default goals)

| Conversion Action Name | Source | GA4 Key Event | Account Default Goal | Purpose |
|------------------------|--------|---------------|----------------------|---------|
| `CRBOX - Formulario Contacto` | GA4 import | `contact_form_submit_success` | **No** | Measure demand; not primary KPI |
| `CRBOX - Calculadora Resultado` | GA4 import | `calculator_result` | **No** | Intent signal for audience; too soft for bidding |
| `CRBOX - WhatsApp Click` | GA4 import | `whatsapp_click` | **No** | Audience building only — never optimize toward |

> **Warning:** Do not set `calculator_result` or `whatsapp_click` as account-default goals. Campaigns will optimize toward users who calculate or click WhatsApp, not users who register — a fundamentally different audience.

### Google Ads setup steps

1. **Verify GA4–Google Ads link:** Google Ads → Tools → Linked accounts → Google Analytics 4 → confirm linked. If not linked, link now.
2. **Mark events as Key Events in GA4:** GA4 → Admin → Events → mark `signup_success` and `quote_request_submit_success` as Key Events.
3. **Import to Google Ads:** Google Ads → Tools → Conversions → + New → Import → Google Analytics 4 → select `signup_success` and `quote_request_submit_success`.
4. **Configure conversion windows:** Registration: 30 days click / 1 day view. Quote: 30 days click / 1 day view.
5. **Set attribution model:** Data-driven (preferred) or Linear. Do not use Last Click.
6. **Set conversion values:** Use placeholder values until real revenue data is available (e.g., $5 per registration, $15 per quote). Update once 90-day LTV cohorts are measured.
7. **Do not set secondary events as default goals.**

### GTM tags required for Google Ads (manual — future Phase 2 only)

If you later switch from GA4 import to direct Google Ads GTM tags (not recommended for Phase 1), you will need:

- One **Google Ads Conversion Tracking** tag per primary conversion event
- A **Google Ads Remarketing** tag on all pages (using the DLVs above)
- Conversion IDs and labels from Google Ads account — insert after the conversion actions are created

The GTM DLVs from Section 7 must be created first before any Google Ads GTM tag can use them.

### QA — Google Ads (using Google Tag Assistant)

1. Install Google Tag Assistant Chrome extension
2. Visit `https://your-domain/?utm_source=google&utm_medium=cpc&utm_campaign=qa-test&gclid=test123`
3. Open Tag Assistant → confirm GTM fires, GA4 configuration tag fires
4. Complete registration flow → confirm `signup_success` fires in Tag Assistant with correct params
5. In GA4 DebugView: confirm `signup_success` appears with `utm_source: google`, `utm_campaign: qa-test`, `gclid_present: true`, `attribution_touch: first_touch`
6. In Google Ads: check Conversions → Conversion actions → `CRBOX - Registro Completado` → confirm status transitions from "Unverified" to "Recording conversions" within 48h

### Launch gate — Google Ads

- [ ] GA4–Google Ads account link confirmed active
- [ ] `signup_success` marked as Key Event in GA4
- [ ] `quote_request_submit_success` marked as Key Event in GA4
- [ ] Both imported as conversion actions in Google Ads
- [ ] Secondary events imported as non-default goals
- [ ] Attribution model set (not Last Click)
- [ ] Conversion windows configured
- [ ] `gclid_present` GA4 custom dimension registered
- [ ] QA test session shows `signup_success` with correct attribution params in GA4 DebugView
- [ ] Google Ads conversion status shows "Recording conversions" (or "Unverified" pending first real conversion)

---

## 9. Meta Pixel readiness

### Recommended approach: GTM-managed Pixel tag

Meta Pixel must be installed via GTM. Do **not** hardcode the `fbq(...)` snippet in HTML files — this breaks the existing single-source analytics architecture and makes consent management impossible later.

**Phase 1 Pixel: public pages only.** The Pixel fires on the 7 public pages (`index`, `servicios`, `como-funciona`, `tarifas`, `calculadora`, `contacto`, `afiliate`). It does **not** fire on portal pages — portal users are already customers, and firing the Pixel there risks audience contamination.

### Event mapping

| CRBOX Event | Meta Standard Event | Optimization use | Audience use | Phase |
|-------------|--------------------|--------------------|--------------|-------|
| GTM Page Load (all public) | `PageView` | No — too broad | Yes | 1 |
| `signup_success` | `CompleteRegistration` | **Yes — primary** | Yes | 1 |
| `quote_request_submit_success` | `Lead` | **Yes — primary** | Yes | 1 |
| `contact_form_submit_success` | `Lead` | Secondary / audience only | Yes | 1 |
| `calculator_result` | `ViewContent` | **No** — too soft | Yes | 1 |
| `whatsapp_click` | `Contact` | **No** — click ≠ conversation | Yes | 1 |
| `signup_start` | Custom: `SignupStart` | No | Yes — warm intent audience | 1 |
| `invoice_upload_success` | — | Do not send to Pixel | CAPI only | 2 |
| `first_package_registered` | — | Future CAPI only | — | 3 |

> **Warning:** Do not optimize Meta campaigns toward `calculator_result`, `whatsapp_click`, or `contact_form_submit_success` in Phase 1. These events occur too early in the funnel. Meta's algorithm will find people who look like "calculators" or "WhatsApp clickers," not people who register accounts.

### GTM tags required for Meta Pixel

Create these tags in the GTM workspace (GTM-5WD8N53F):

#### Tag 1: Meta Pixel — Base Code + PageView

- **Tag type:** Custom HTML
- **Pixel ID:** Insert manually from Meta Events Manager (see Section 10)
- **Trigger:** All Pages — BUT apply a page exclusion for all portal pages (`page_type` starts with `portal`)
  - Create a GTM trigger: Page View — `page_path_group` does not equal `portal` AND `page_path_group` does not equal `quote`
- **HTML template:**

```html
<!-- Meta Pixel Base Code — managed via GTM -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{{Meta Pixel ID}}');
fbq('track', 'PageView');
</script>
```

- Create a GTM Constant variable `{{Meta Pixel ID}}` — leave blank until Pixel ID is obtained from Meta Events Manager.

#### Tag 2: Meta — CompleteRegistration (signup_success)

- **Tag type:** Custom HTML
- **Trigger:** Custom Event trigger on `signup_success`
- **HTML:**

```html
<script>
if (typeof fbq === 'function') {
  fbq('track', 'CompleteRegistration', {
    content_name: 'crbox_account',
    currency: 'USD',
    value: 5.00
  });
}
</script>
```

#### Tag 3: Meta — Lead (quote_request_submit_success)

- **Tag type:** Custom HTML
- **Trigger:** Custom Event trigger on `quote_request_submit_success`
- **HTML:**

```html
<script>
if (typeof fbq === 'function') {
  fbq('track', 'Lead', {
    content_name: 'crbox_quote',
    currency: 'USD',
    value: 15.00
  });
}
</script>
```

#### Tag 4: Meta — ViewContent (calculator_result)

- **Tag type:** Custom HTML
- **Trigger:** Custom Event trigger on `calculator_result`
- **HTML:**

```html
<script>
if (typeof fbq === 'function') {
  fbq('track', 'ViewContent', {
    content_type: 'shipping_calculator',
    content_name: 'crbox_calculator_result'
  });
}
</script>
```

- **Use:** Audience building only. Do **not** optimize campaigns toward this event.

#### Tag 5: Meta — Contact (whatsapp_click)

- **Tag type:** Custom HTML
- **Trigger:** Custom Event trigger on `whatsapp_click`
- **HTML:**

```html
<script>
if (typeof fbq === 'function') {
  fbq('track', 'Contact', {
    content_name: 'whatsapp_click'
  });
}
</script>
```

- **Use:** Audience building only. Do **not** optimize campaigns toward this event.

### GTM triggers to create

| Trigger Name | Trigger Type | Fires on |
|-------------|-------------|----------|
| `CE - signup_success` | Custom Event | Event name equals `signup_success` |
| `CE - quote_request_submit_success` | Custom Event | Event name equals `quote_request_submit_success` |
| `CE - contact_form_submit_success` | Custom Event | Event name equals `contact_form_submit_success` |
| `CE - calculator_result` | Custom Event | Event name equals `calculator_result` |
| `CE - whatsapp_click` | Custom Event | Event name equals `whatsapp_click` |
| `PV - Public Pages Only` | Page View | `page_path_group` equals `public` |

> **Important:** Custom Event triggers in GTM match against the `event` key in `window.dataLayer`. All CRBOX events push their event name as the `event` key — the triggers above will fire correctly with no HTML changes.

### Pixel placement rules

| Page group | Pixel fires | Events fired |
|-----------|------------|-------------|
| Public pages (7 pages) | Yes | PageView + event-specific |
| `afiliate.html` (registration) | Yes | PageView + CompleteRegistration |
| Portal pages (`dashboard`, `mis-paquetes`, etc.) | **No** | None |
| `cotizar.html` | Yes (it's `portal_quotes` but accessible pre-login) | PageView + Lead |
| `login.html` | No | None |

### QA — Meta Pixel (using Meta Pixel Helper)

1. Install Meta Pixel Helper Chrome extension
2. Visit homepage with `?utm_source=meta&utm_medium=paid_social&utm_campaign=qa-test&fbclid=test456`
3. Confirm Pixel Helper shows Pixel ID, `PageView` fires, no errors
4. Navigate to `calculadora.html` → run a calculation → confirm `ViewContent` fires in Pixel Helper
5. Navigate to `afiliate.html` → complete registration → confirm `CompleteRegistration` fires
6. Navigate to any portal page (`dashboard.html`) → confirm Pixel Helper shows **no Pixel events** (Pixel must not fire on portal pages)
7. Open Meta Events Manager → Test Events → enter your domain → verify events appear in real time
8. Check for deduplication issues: each conversion event should appear once per user action

### Launch gate — Meta Pixel

- [ ] Meta Business Manager account created (or access confirmed)
- [ ] Meta Pixel created in Events Manager — Pixel ID obtained
- [ ] `{{Meta Pixel ID}}` GTM Constant variable updated with real Pixel ID
- [ ] Base code + PageView tag deployed in GTM (public pages only)
- [ ] CompleteRegistration tag deployed and tested
- [ ] Lead tag (quote) deployed and tested
- [ ] ViewContent tag (calculator) deployed and tested
- [ ] Contact tag (WhatsApp) deployed and tested
- [ ] Pixel Helper confirms Pixel fires on public pages and NOT on portal pages
- [ ] Events Manager shows events in Test Events view
- [ ] GTM container published after all tags are configured and verified in Preview mode

---

## 10. Manual platform setup required

The following items **cannot be completed from the codebase**. They require manual action in external platforms.

### Google Analytics 4 (G-B5BPHFRR18)

| Action | Where | Priority |
|--------|-------|----------|
| Mark `signup_success` as a Key Event | GA4 Admin → Events | P0 before spend |
| Mark `quote_request_submit_success` as a Key Event | GA4 Admin → Events | P0 before spend |
| Register custom dimension: `gclid_present` (Event scope, `gclid_present`) | GA4 Admin → Custom Definitions | P0 |
| Register custom dimension: `fbclid_present` (Event scope, `fbclid_present`) | GA4 Admin → Custom Definitions | P0 |
| Register custom dimension: `attribution_touch` (Event scope, `attribution_touch`) | GA4 Admin → Custom Definitions | P0 |
| Register custom dimension: `utm_content` (Event scope, `utm_content`) | GA4 Admin → Custom Definitions | P1 |
| Register custom dimension: `utm_term` (Event scope, `utm_term`) | GA4 Admin → Custom Definitions | P1 |
| Set data retention to 14 months | GA4 Admin → Data Settings → Data Retention | P1 |
| Enable BigQuery export | GA4 Admin → Integrations → BigQuery | P1 |
| Confirm live container matches `docs/gtm-container-export.json` | GA4 DebugView + GTM Preview | P0 |

### Google Tag Manager (GTM-5WD8N53F)

| Action | Where | Priority |
|--------|-------|----------|
| Create 8 Data Layer Variables from Section 7 | GTM → Variables | P0 |
| Create 6 Custom Event triggers from Section 9 | GTM → Triggers | P0 |
| Create `PV - Public Pages Only` Page View trigger | GTM → Triggers | P0 |
| Create Meta Pixel base tag (Tag 1) | GTM → Tags | P0 |
| Create Meta Pixel event tags (Tags 2–5) | GTM → Tags | P0 |
| **Publish the GTM container** | GTM → Submit | P0 — nothing works until published |
| Verify in GTM Preview mode before publishing | GTM → Preview | P0 |

### Google Ads

| Action | Where | Priority |
|--------|-------|----------|
| Verify GA4–Google Ads account link | Google Ads → Tools → Linked accounts | P0 |
| Create conversion action: `CRBOX - Registro Completado` (import from GA4) | Google Ads → Tools → Conversions | P0 |
| Create conversion action: `CRBOX - Cotización Enviada` (import from GA4) | Google Ads → Tools → Conversions | P0 |
| Create conversion actions for secondary events (non-default goals) | Google Ads → Tools → Conversions | P1 |
| Set attribution model to Data-driven or Linear | Conversion action settings | P0 |
| Set placeholder conversion values | Conversion action settings | P0 |
| Verify domain in Google Search Console (required for some ad types) | Google Search Console | P1 |
| Set up audience lists from GA4 segments | Google Ads → Audience manager | P2 |

### Meta Business Manager / Events Manager

| Action | Where | Priority |
|--------|-------|----------|
| Create or verify Meta Business Manager account | business.facebook.com | P0 |
| Create Meta Pixel in Events Manager | Events Manager → Connect Data Sources | P0 |
| Copy Pixel ID and insert into GTM `{{Meta Pixel ID}}` variable | GTM + Events Manager | P0 |
| Verify domain in Events Manager (prevents Pixel signal loss on iOS 14+) | Events Manager → Settings → Domains | P0 |
| Enable Aggregated Event Measurement for the domain | Events Manager → Settings → AEM | P0 |
| Prioritize events in AEM (max 8): set `CompleteRegistration` as event 1, `Lead` as event 2 | Events Manager → AEM → Configure | P0 |
| Enable automatic advanced matching (optional) | Events Manager → Pixel settings | P1 |

---

## 11. QA checklist

### A. Attribution capture — positive tests

- [ ] **UTM capture:** Load `/?utm_source=google&utm_medium=cpc&utm_campaign=test-campaign&utm_content=hero&utm_term=casillero`. Open browser DevTools → Application → Session Storage. Confirm `crbox_utm_first_touch` and `crbox_utm_last_touch` both exist and contain the expected values.
- [ ] **gclid handling:** Load `/?gclid=EAIaIQ_test_gclid_value`. Confirm `sessionStorage.crbox_gclid` contains the raw value. Confirm `sessionStorage.crbox_utm_last_touch` contains `"gclid_present": true`. Open DevTools → Console → type `CRBOX.attribution()` → confirm `gclid_present: true` in the returned object. Confirm the raw gclid string does NOT appear in the object.
- [ ] **fbclid handling:** Same as above with `?fbclid=IwAR_test_fbclid`. Confirm `fbclid_present: true` in attribution, raw value in `sessionStorage.crbox_fbclid`, raw value absent from `CRBOX.attribution()`.
- [ ] **First-touch preservation:** Load page 1 with `?utm_source=google&utm_medium=cpc&utm_campaign=first`. Navigate to page 2 with `?utm_source=meta&utm_medium=paid_social&utm_campaign=second`. Confirm `sessionStorage.crbox_utm_first_touch` still shows `utm_source: google`. Confirm `sessionStorage.crbox_utm_last_touch` shows `utm_source: meta`. Confirm `CRBOX.attribution()` returns `attribution_touch: 'both_available'`.
- [ ] **Last-touch update:** In the same session, navigate to page 3 with no UTM params. Run `CRBOX.attribution()` in console. Confirm it returns `utm_source: meta` (last-touch persists).
- [ ] **Attribution in events:** With a UTM session active, trigger a `signup_success` event. Open GTM Preview → confirm the event payload includes `utm_source`, `utm_campaign`, `gclid_present` (if applicable), and `attribution_touch`. Open GA4 DebugView → confirm the same params appear on the `signup_success` event.

### B. Attribution capture — negative tests

- [ ] **No UTM:** Load the page with no query params. Confirm `sessionStorage.crbox_utm_first_touch` and `crbox_utm_last_touch` are absent. Run `CRBOX.attribution()` → confirm it returns `{}`. Trigger an event → confirm the event payload has no `utm_source` / `attribution_touch` fields.
- [ ] **Unknown query params:** Load `/?email=test@example.com&token=secret123&custom_param=foo`. Open Session Storage → confirm none of these appear in `crbox_utm_first_touch` or `crbox_utm_last_touch`. Open DevTools Console → `CRBOX.attribution()` → confirm it returns `{}`.
- [ ] **Suspicious params:** Load `/?utm_source=&utm_medium=   &utm_campaign=legit`. Confirm empty/whitespace-only utm_source and utm_medium are absent from stored attribution (they are falsy after trim). Confirm `utm_campaign: 'legit'` is stored.
- [ ] **Long value truncation:** Load `/?utm_campaign=` followed by 300 characters. Confirm the stored value is exactly 200 characters.
- [ ] **sessionStorage unavailable:** Simulate blocked sessionStorage by overriding in DevTools Console: `Object.defineProperty(window, 'sessionStorage', { get: function() { throw new Error('blocked'); } })`. Reload the page. Confirm the page loads normally, no JavaScript errors appear, and events still fire (without attribution params). _(Note: this test requires a specific DevTools approach — alternatively test in a browser private window with storage restrictions.)_

### C. Existing event integrity tests

- [ ] **signup_success integrity:** Complete registration → confirm event fires once, only after API success, contains `account_type`, does NOT contain email/name/ID number. Confirm page_path, page_name, page_type, page_path_group are all present.
- [ ] **signup_success NOT on failed registration:** Attempt registration with a duplicate email → confirm `signup_success` does NOT fire. Confirm `signup_error` fires with `error_category: duplicate_email`.
- [ ] **quote_request_submit_success integrity:** Submit a quote form → confirm event fires once, only after API success, contains `service_type` and `destination_country`. Confirm no solicitud ID, user ID, or invoice data appears.
- [ ] **quote NOT on failed quote:** Disconnect network → submit quote form → confirm `quote_request_submit_success` does NOT fire.
- [ ] **contact_form_submit_success integrity:** Submit contact form → confirm event fires only after API 2xx response.
- [ ] **calculator_result:** Run a calculation → confirm event fires with `shipping_mode`, `weight_bucket`, `value_bucket`, `destination_country`. Confirm no exact peso/dollar amounts appear.
- [ ] **whatsapp_click:** Click WhatsApp button → confirm event fires with `cta_location: floating_button`, `link_domain: wa.me`. Confirm phone number does NOT appear.
- [ ] **invoice_upload_success:** Upload an invoice → confirm event fires. Confirm file name and file path do NOT appear.
- [ ] **portal_section_view:** Navigate to `mis-paquetes.html` → confirm `portal_section_view` fires with `section_name: mis_paquetes`. Confirm casillero ID, package tracking numbers, user email do NOT appear.

### D. Standard parameters integrity

- [ ] Every event payload contains `page_path`, `page_name`, `page_type`, `page_path_group`
- [ ] `page_path` is the pathname only (e.g., `/afiliate.html`) — no query string, no fragment
- [ ] `page_name` uses stable slugs from the page map (e.g., `afiliate`, `calculadora`)
- [ ] `page_type` uses registered values (e.g., `public_affiliate`, `portal_packages`)

### E. No duplicate events

- [ ] Click WhatsApp button once → exactly one `whatsapp_click` event in GTM Preview
- [ ] Complete registration → exactly one `signup_success` in GTM Preview (not two)
- [ ] Navigate to calculator → one `calculator_start` on first field interaction
- [ ] Run calculation multiple times → one `calculator_result` per submit, no extras

### F. GA4 DebugView

- [ ] Enable GA4 DebugView (add `?gtm_debug=...` parameter via GTM Preview, or `?_ga_debug=1`)
- [ ] Confirm events appear in real time in GA4 DebugView
- [ ] Confirm attribution params appear on conversion events
- [ ] Confirm no "unknown" event names (all should match the approved 45-event taxonomy)

---

## 12. Launch gate checklist

This is the minimum gate before any paid media budget is activated.

### Code (already implemented)

- [x] UTM capture implemented in `js/analytics.js`
- [x] First-touch / last-touch storage implemented
- [x] Attribution params automatically injected into all `CRBOX.track` events
- [x] gclid/fbclid stored as presence booleans only in dataLayer
- [x] Raw gclid/fbclid stored in sessionStorage only
- [x] All sessionStorage operations wrapped in try/catch
- [x] Existing event behavior fully preserved
- [x] No PII captured or pushed to dataLayer
- [x] Attribution gracefully omitted when sessionStorage is unavailable

### GA4 — required before spend

- [ ] `signup_success` marked as Key Event
- [ ] `quote_request_submit_success` marked as Key Event
- [ ] 3 new custom dimensions registered (`gclid_present`, `fbclid_present`, `attribution_touch`)
- [ ] Data retention set to 14 months
- [ ] GA4–Google Ads link confirmed active

### GTM — required before spend

- [ ] 8 Data Layer Variables created (Section 7)
- [ ] 6 Custom Event triggers created (Section 9)
- [ ] `PV - Public Pages Only` trigger created
- [ ] Meta Pixel base tag created and tested in Preview mode
- [ ] Meta Pixel event tags (Tags 2–5) created and tested
- [ ] **GTM container published**

### Google Ads — required before spend

- [ ] GA4–Google Ads account link active
- [ ] `CRBOX - Registro Completado` conversion action created (GA4 import)
- [ ] `CRBOX - Cotización Enviada` conversion action created (GA4 import)
- [ ] Secondary conversions imported as non-default goals
- [ ] Attribution model configured
- [ ] Conversion status showing "Recording conversions" (or verified via test)

### Meta — required before spend

- [ ] Meta Pixel ID obtained and inserted in GTM
- [ ] Domain verified in Events Manager
- [ ] Aggregated Event Measurement enabled and events prioritized
- [ ] Pixel Helper confirms correct events on public pages and no events on portal pages
- [ ] Events visible in Events Manager Test Events

### QA — required before spend

- [ ] Section 11A (attribution positive tests) all pass
- [ ] Section 11B (attribution negative tests) all pass
- [ ] Section 11C (existing event integrity) all pass
- [ ] Section 11E (no duplicate events) all pass
- [ ] GA4 DebugView confirms events with attribution params
- [ ] GTM Preview mode confirms all tags fire on correct triggers

---

## 13. Known limitations

| Limitation | Impact | Workaround / Future fix |
|------------|--------|------------------------|
| sessionStorage is tab-scoped | A user who opens a second tab starts a new attribution session | Acceptable for Phase 1; localStorage-based cross-tab first-touch is Phase 2 |
| sessionStorage cleared on tab close | Multi-day sessions lose attribution | Sessions typically complete on the same day; Phase 2 can add localStorage backup |
| No server-side attribution | Landing page attribution is not stored in the database linked to the user registration | Phase 3: capture `sessionStorage.crbox_gclid` in registration POST payload |
| Meta Pixel is client-side only | iOS 14+ ATT restrictions reduce signal | Phase 2: implement Meta CAPI via `server.py` |
| No UTM campaign naming convention enforced yet | Campaigns with inconsistent names will produce fragmented GA4 reports | Publish UTM naming convention before any live campaign |
| `utm_content` and `utm_term` not GA4 built-in dimensions | These only appear in GA4 if custom dimensions are registered | Register before spend or they are invisible in GA4 |
| gclid is present-only in GA4 | Cannot match GA4 conversions to specific Google Ads clicks for offline conversion import | Phase 3: pass raw gclid from `sessionStorage.crbox_gclid` in registration API call |
| fbclid is present-only in GA4 | Cannot perform Meta CAPI deduplication against browser Pixel events | Phase 2: implement CAPI with `server.py` using `sessionStorage.crbox_fbclid` |
| Meta Pixel fires client-side only on `cotizar.html` | Users who submit quotes from the portal interior won't fire Pixel if they never hit the public page | Acceptable for Phase 1; CAPI solves this in Phase 2 |
| No consent management platform (CMP) | Legally required for GDPR regions; currently safe for Costa Rica only | Do not run EU/EEA campaigns until CMP is implemented |
| GTM container export (`gtm-container-export.json`) does not reflect live container state | Cannot verify from code whether live GTM matches the export | Manual GTM Preview verification required before spend |

---

## 14. What remains for Phase 2

| Item | Description | Blocker |
|------|-------------|---------|
| **Meta CAPI** | Server-side conversion API via `server.py`. Required for iOS 14+ signal recovery, event deduplication, and reducing dependence on browser Pixel | None — Phase 1 Pixel must be live and validated first |
| **localStorage first-touch backup** | Cross-tab, cross-session first-touch attribution using `localStorage.crbox_utm_first_touch` | Phase 1 sessionStorage must be validated first |
| **gclid passthrough to backend** | Include `sessionStorage.crbox_gclid` in the registration POST body so the database links Google Ads clicks to CRBOX accounts — enables offline conversion import | Requires backend schema change in `server.py` |
| **fbclid passthrough to backend** | Same for Meta fbclid — required for CAPI event deduplication | Same backend requirement |
| **Offline conversion import** | Export `signup_success` + `gclid` pairs from the database to Google Ads offline conversion upload — eliminates dependence on client-side tag firing | gclid passthrough required first |
| **UTM naming convention doc** | A published, team-enforced campaign naming convention to prevent `GA Source / (other)` fragmentation in reports | Marketing team alignment required |
| **GA4 Looker Studio dashboard** | Connect GA4 to Looker Studio; build conversion funnel, UTM breakdown, and channel comparison reports | 30+ days of GA4 data with attribution needed |
| **Consent Management Platform** | Required for GDPR compliance before any EU/EEA campaigns. Consent mode v2 integration with GTM | Legal decision required |
| **Direct Google Ads GTM tags** | If GA4 import proves insufficient (attribution gaps, latency), switch to direct Google Ads conversion tags in GTM using the DLVs from Section 7 | GA4 import must run for at least 30 days first |
| **invoice_upload_success to Meta CAPI** | Post-registration quality signal for Meta audience optimization | CAPI implementation (Phase 2 item above) |
| **Phase 3 backend quality signals** | `first_package_registered`, `first_package_arrived_miami`, `first_package_delivered` webhooks → offline conversion import | Backend team coordination; see `docs/measurement-map-v1.md` Section 22 |
