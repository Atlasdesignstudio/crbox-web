# CRBOX Analytics Event Taxonomy

**Last updated:** 2026-05-12
**Layer:** GA4 via Google Tag Manager (`js/analytics.js` → `window.dataLayer`)
**Scope:** All events are fired client-side through `CRBOX.track.<method>()`. No PII is ever sent. Raw user input, email addresses, phone numbers, URLs with tokens, and raw error messages are never included in event payloads.

---

## Table of Contents

1. [Analytics Inventory](#1-analytics-inventory)
2. [Final Event Taxonomy](#2-final-event-taxonomy)
3. [Funnel Mapping](#3-funnel-mapping)
4. [GA4 Custom Dimensions to Register](#4-ga4-custom-dimensions-to-register)
5. [GA4 Key Events / Conversions to Mark](#5-ga4-key-events--conversions-to-mark)
6. [Tableau Readiness Checklist](#6-tableau-readiness-checklist)
7. [Manual QA Script](#7-manual-qa-script)
8. [PII Policy](#8-pii-policy)
9. [Backward-Compat Aliases](#9-backward-compat-aliases)

---

## 1. Analytics Inventory

### Page / Flow Audit

| Page | Events Previously Tracked | Issues Found | Actions Taken |
|---|---|---|---|
| `index.html` | `page_view`, `cta_click`, `whatsapp_click`, `scroll_depth`, `section_visible` | GTM noscript confirmed present | No change needed |
| `como-funciona.html` | `page_view`, `cta_click`, `faq_engage`, `scroll_depth` | GTM noscript confirmed present | No change needed |
| `contacto.html` | `contact_form_submit` on DOM `submit` event | Event fired before backend confirmation — false positives on network errors | Moved to `contact_form_submit_success`; fires only on `data.ok === true` |
| `afiliate.html` | `signup_start`, `signup_step`, `signup_success`, `signup_error` | No `account_type_select` when user switches personal/business tabs | Added `account_type_select` to tab button click handlers |
| `cotizar.html` | `quote_submit` (success-gated), `portal_section_view` | No funnel-start event; `quote_submit` needed renaming | Added `quote_request_start` (session-scoped); renamed to `quote_request_submit_success` |
| `mi-cuenta.html` | `portal_section_view` on tab switch | No profile edit or save outcome events | Added `profile_edit_start`, `profile_update_success`, `profile_update_error` |
| `mis-paquetes.html` | `package_search`, `package_search_result`, `package_detail_view`, `invoice_upload_*` | Filter dropdowns (status, date, sort) not tracked | Added `package_filter_use` on each filter's `change` event; added `api_error` on main data-load failure |
| `mis-facturas.html` | `portal_section_view` (filter_applied slug), `invoice_upload_*` | Filter events used wrong event name for reporting | Added `invoice_filter_use` alongside existing `portal_section_view`; added `api_error` on `getBills` failure |
| `dashboard.html` | `portal_section_view`, `cta_click` | Main `getPackages` failure had no error event | Added `api_error('network')` in catch block |
| `login.html` | `login_start`, `login_success`, `login_error` | Already correct — no change needed | No change |
| `js/auth.js` | `login_success`, `login_error` | No `logout` event; no `session_expired` before redirect | Added `logout()` before `clearToken()`; added `session_expired()` in all three redirect paths |
| `js/portal-api.js` | (previously no tracking) | 401/403 responses and incoherent token state had no tracking | Added `session_expired()` in `_handleAuthFailure()` (covers all 401/403 API responses) and in `getUserInfo()` token-without-email path |

---

## 2. Final Event Taxonomy

### Legend

- **Conversion** = recommended to mark as a GA4 Key Event
- **Micro-conversion** = recommended to mark as a GA4 micro-conversion
- **PII risk** = Confirmed None (all values are hardcoded slugs or numeric counts)

| Event Name | Purpose | Primary Trigger | Key Parameters | Type | Tableau Relevant |
|---|---|---|---|---|---|
| `cta_click` | Any CTA button click | `[data-cta]` element click | `cta_id`, `cta_location`, `destination_type` | Standard | Yes |
| `whatsapp_click` | WhatsApp link click | `a[href^="https://wa.me"]` click | `cta_location`, `destination_type` | Micro-conversion | Yes |
| `phone_click` | Phone link click | `a[href^="tel:"]` click | `cta_location`, `destination_type` | Micro-conversion | Yes |
| `email_click` | Email link click | `a[href^="mailto:"]` click | `cta_location`, `destination_type` | Standard | No |
| `outbound_click` | External link click | Outbound `<a>` click | `cta_location`, `destination_type` | Standard | No |
| `nav_click` | Header nav link click | `<nav> a` click | `cta_location`, `destination_type` | Standard | No |
| `service_card_click` | Service card click | `.service-card` click | `service_type` | Standard | Yes |
| `contact_form_submit_success` | Contact form: confirmed backend success | `POST /api/consultas` → `data.ok === true` | `form_name` | **Conversion** | Yes |
| `form_start` | Form first interaction | First `input`/`change` inside form | `form_name` | Standard | No |
| `form_abandon` | Form abandoned after start | Page unload after `form_start` but no submit | `form_name` | Standard | No |
| `faq_engage` | FAQ item expanded | FAQ item click | `section_name` | Standard | No |
| `calculator_start` | Calculator became interactive | Calculator mount / first render | `shipping_mode` | Micro-conversion | Yes |
| `calculator_tab_switch` | Calculator mode switched | Tab button click | `shipping_mode` | Standard | No |
| `calculator_query` | Calculation submitted | Calculator submit action | `service_type`, `shipping_mode` | Standard | Yes |
| `calculator_result` | Calculation result rendered | Result render | `service_type`, `shipping_mode` | Micro-conversion | Yes |
| `scroll_depth` | Page scroll milestone | IntersectionObserver / scroll listener | `depth_percent` | Standard | No |
| `section_visible` | Content section entered viewport | IntersectionObserver | `section_name` | Standard | No |
| `login_start` | Login form active | Login form first interaction | — | Standard | No |
| `login_success` | Login confirmed | Auth API success | — | Standard | Yes |
| `login_error` | Login failed | Auth API error | `error_category` | Standard | No |
| `logout` | User logged out | `logout()` called, before `clearToken()` | — | Standard | Yes |
| `signup_start` | Registration started | First field input in registration form | — | Standard | Yes |
| `signup_step` | Registration step advanced | "Next" button in stepper | `step_name` | Standard | Yes |
| `signup_success` | Registration confirmed | `StatusResult === 'OK'` from API | `account_type` | **Conversion** | Yes |
| `signup_error` | Registration failed | API or validation error | `error_category` | Standard | No |
| `account_type_select` | Account type chosen during signup | Tab button click (personal / business) | `account_type` | Standard | Yes |
| `session_expired` | Session invalidated | 401/403 API response or missing token/email before redirect | — | Standard | Yes |
| `quote_request_start` | Quote funnel entered | First input/change/focus in quote widget (once per session) | `service_type` | Micro-conversion | Yes |
| `quote_request_submit_success` | Quote submitted and confirmed | `POST /api/solicitudes` → `res.ok && data.ok && data.id` | `service_type`, `destination_country` | **Conversion** | Yes |
| `profile_edit_start` | Profile edit started | First input/change in profile section (once per section/load) | `section_name`, `portal_area` | Standard | No |
| `profile_update_success` | Profile save confirmed | `CRBOXPortalAPI.updateProfile()` resolved | `section_name`, `portal_area` | Standard | Yes |
| `profile_update_error` | Profile save failed | `CRBOXPortalAPI.updateProfile()` rejected | `section_name`, `portal_area`, `error_category` | Standard | No |
| `package_search` | Package search query | Search input non-empty + filter change | — | Standard | No |
| `package_search_result` | Search results rendered | After search result render | — | Standard | No |
| `package_detail_view` | Package detail expanded | Row expand click | — | Standard | Yes |
| `package_filter_use` | Package filter changed | `change` on status/date/sort dropdowns | `filter_type` | Standard | Yes |
| `invoice_upload_start` | Invoice upload dialog opened | Upload button click | `file_type` | Standard | Yes |
| `invoice_upload_success` | Invoice upload confirmed | Bill created in CRBOX admin | — | Micro-conversion | Yes |
| `invoice_upload_error` | Invoice upload failed | Upload or bill-creation failure | `error_category` | Standard | No |
| `invoice_filter_use` | Invoice filter applied | "Buscar Facturas" button / Enter on date input | `filter_type` | Standard | Yes |
| `portal_section_view` | Portal section navigated | Tab switch, section open, filter apply | `section_name`, `page_name`, `page_type`, `cta_location` | Standard | Yes |
| `api_error` | Main portal data load failed | `getPackages` / `getBills` / API `.catch()` | `error_category` | Standard | Yes |
| `chat_open` | Chat panel opened | Chat toggle click | — | Standard | Yes |
| `chat_message_sent` | Chat message sent | Message submit | `message_type` | Standard | Yes |

---

## 3. Funnel Mapping

### Calculator → Quote Funnel
```
calculator_start
  → calculator_query
    → calculator_result
      → cta_click (cta_id: 'cotizar_cta' / 'afiliate_cta')
        → quote_request_start          ← enters quote funnel
          → quote_request_submit_success  ← CONVERSION
```

### Registration Funnel
```
cta_click (cta_id: 'afiliate_cta')
  → account_type_select
    → signup_start
      → signup_step (step 1 → 2 → ...)
        → signup_success               ← CONVERSION
```
Error path: `signup_error` (category: `duplicate_email`, `duplicate_id`, `validation`, `network`)

### Contact Form Funnel
```
form_start (form_name: 'contact-form')
  → [user fills form]
    → contact_form_submit_success      ← CONVERSION
```
Abandon path: `form_abandon`

### Login / Portal Funnel
```
login_start
  → login_success
    → portal_section_view (dashboard, mis-paquetes, mis-facturas, etc.)
      → [portal interactions: package_filter_use, invoice_filter_use, package_detail_view, invoice_upload_*]
        → logout (or session_expired if token invalid)
```
Error paths: `login_error`, `api_error`, `session_expired`

### Package / Invoice Funnel
```
portal_section_view (mis_paquetes or mis_facturas)
  → package_filter_use / invoice_filter_use
    → package_search / package_search_result
      → package_detail_view
        → invoice_upload_start
          → invoice_upload_success     ← MICRO-CONVERSION
```

---

## 4. GA4 Custom Dimensions to Register

Register these as **Event-scoped** custom dimensions in GA4 Admin → Data Display → Custom Definitions → Custom Dimensions.

> These must be registered before they are available in Explorations, Tableau exports, or audiences. Registering a dimension does not backfill historical data.

| Parameter Name | Suggested Display Name | Scope | Sample Values |
|---|---|---|---|
| `page_type` | Page Type | Event | `public`, `portal`, `portal_invoices`, `portal_quotes`, `auth` |
| `page_name` | Page Name | Event | `index`, `cotizar`, `dashboard`, `mis_paquetes`, `mi_cuenta` |
| `section_name` | Section Name | Event | `hero`, `mis_facturas_filter_applied`, `mi_cuenta_security` |
| `journey_stage` | Journey Stage | Event | (reserved for future use — not yet populated) |
| `user_state` | User State | Event | (reserved — not yet populated) |
| `cta_id` | CTA ID | Event | `afiliate_cta`, `calculadora_cta`, `whatsapp_cta` |
| `cta_location` | CTA Location | Event | `hero`, `nav`, `footer`, `filter_bar`, `other` |
| `destination_type` | Destination Type | Event | `internal_page`, `external`, `whatsapp`, `phone`, `email` |
| `form_name` | Form Name | Event | `contact-form`, `maritimo-quote-form` |
| `flow_name` | Flow Name | Event | (reserved — not yet populated) |
| `step_name` | Step Name | Event | `personal_step_1`, `business_step_2` |
| `account_type` | Account Type | Event | `personal`, `business` |
| `shipping_mode` | Shipping Mode | Event | `aereo`, `maritimo` |
| `service_type` | Service Type | Event | `aereo`, `maritimo`, `express` |
| `portal_area` | Portal Area | Event | `mi_cuenta` |
| `error_category` | Error Category | Event | `network`, `invalid_credentials`, `duplicate_email`, `api_error` |
| `weight_bucket` | Weight Bucket | Event | (reserved — not yet populated) |
| `value_bucket` | Value Bucket | Event | (reserved — not yet populated) |
| `destination_country` | Destination Country | Event | `CR` |
| `file_type` | File Type | Event | MIME-type category slug, e.g. `image`, `pdf` |
| `filter_type` | Filter Type | Event | `status`, `date`, `sort`, `date_range` |
| `depth_percent` | Scroll Depth % | Event | `25`, `50`, `75`, `100` |
| `link_domain` | Outbound Domain | Event | (reserved — not yet populated) |

**Priority for immediate registration:** `service_type`, `destination_country`, `account_type`, `section_name`, `page_name`, `page_type`, `cta_id`, `cta_location`, `error_category`, `filter_type`, `portal_area`.

---

## 5. GA4 Key Events / Conversions to Mark

Mark these in GA4 Admin → Data Display → Events → toggle "Mark as key event":

### Primary Conversions
| Event Name | Reason |
|---|---|
| `signup_success` | Core business conversion — new registered user |
| `quote_request_submit_success` | Primary commercial intent signal |
| `contact_form_submit_success` | Lead capture via contact form |

### Micro-conversions
| Event Name | Reason |
|---|---|
| `calculator_start` | Top-of-funnel engagement |
| `calculator_result` | User received a price estimate — high intent signal |
| `quote_request_start` | Quote funnel entry — intent declared |
| `signup_start` | Registration funnel entry |
| `whatsapp_click` | Direct commercial intent via WhatsApp |
| `phone_click` | Direct commercial intent via phone |
| `invoice_upload_success` | Existing customer completing a purchase |

---

## 6. Tableau Readiness Checklist

### Available Now (after GA4 BigQuery export is enabled)

- [x] All events listed in Section 2 are firing in the correct positions (post-confirmation, success-gated where applicable)
- [x] `service_type` and `destination_country` are present on `quote_request_submit_success` — enabling shipment-mode and country breakdown
- [x] `account_type` is present on `signup_success` — enabling personal vs. business breakdown
- [x] `section_name`, `page_name`, `page_type`, `cta_location` are present on `portal_section_view` — enabling portal navigation analysis
- [x] `filter_type` is present on `package_filter_use` and `invoice_filter_use` — enabling filter usage analysis
- [x] `error_category` is present on `login_error`, `signup_error`, `invoice_upload_error`, `profile_update_error`, `api_error` — enabling error funnel analysis
- [x] `portal_area` and `section_name` are present on profile events — enabling profile completion analysis
- [x] Funnel steps exist for calculator → quote, registration, contact, and portal engagement flows (Section 3)

### Required Before Tableau Can Use the Data

- [ ] **Enable BigQuery Export** in GA4 Admin → Integrations → BigQuery Link. Without this, raw event data is not accessible to Tableau
- [ ] **Register custom dimensions** in GA4 Admin → Custom Definitions (see Section 4). Until registered, parameters are captured but not indexed for reporting
- [ ] **Mark key events** in GA4 Admin → Events (see Section 5). Until marked, conversions are not counted in conversion reports
- [ ] **Update GTM triggers** for any tags that reference the deprecated event names `quote_submit` or `quote_start` — update these to `quote_request_submit_success` and `quote_request_start` respectively
- [ ] **Verify GA4 DebugView** for all events in the QA script below before relying on Tableau data
- [ ] **Set GA4 data retention** to 14 months (Admin → Data Settings → Data Retention) to allow year-over-year Tableau analysis

### Tableau Dashboard Readiness by Topic

| Dashboard Topic | Status | Blocker |
|---|---|---|
| Quote funnel (start → submit) | Ready after BigQuery export | Enable BigQuery export |
| Registration funnel (start → success by account type) | Ready after BigQuery export | Enable BigQuery export |
| Contact form conversions | Ready after BigQuery export | Enable BigQuery export |
| CTA performance by location | Ready after BigQuery export | Enable BigQuery export |
| Calculator engagement | Ready after BigQuery export | Enable BigQuery export |
| Portal filter usage | Ready after BigQuery export | Enable BigQuery export |
| Error / reliability monitoring | Ready after BigQuery export | Enable BigQuery export |
| Session expiry / auth reliability | Ready after BigQuery export | Enable BigQuery export |
| Invoice upload funnel | Ready after BigQuery export | Enable BigQuery export |

---

## 7. Manual QA Script

Use **GTM Preview mode** and **GA4 DebugView** (Admin → DebugView) to verify each event. Steps for GTM Preview: open tagmanager.google.com → your container → Preview → enter site URL.

---

### QA-01 — Contact Form Submit Success (`contacto.html`)

**Goal:** Confirm the event fires only on real backend success, not on submit click.

1. Open `contacto.html` in GTM Preview mode.
2. Fill in all required fields (name, email, subject, message) with test values.
3. Click "Enviar mensaje".
4. In GTM Preview → Data Layer, confirm `contact_form_submit_success` appears **after** the fetch response, not immediately on click.
5. In GA4 DebugView, confirm the event with `form_name: "contact"`.
6. **Negative test:** Block the network request (DevTools → Network → throttle to Offline) and click submit. Confirm `contact_form_submit_success` does **not** appear. Only a network error is shown to the user.

---

### QA-02 — Quote Funnel (`cotizar.html`)

**Goal:** Confirm `quote_request_start` fires once per session on first interaction, and `quote_request_submit_success` fires only on confirmed API success.

1. Open `cotizar.html` in a fresh browser tab (clear sessionStorage first: DevTools → Application → Session Storage → clear `crbox_quote_start_fired`).
2. Click or type in any field inside the quote widget.
3. In GA4 DebugView, confirm `quote_request_start` fires with `service_type: "aereo"`.
4. Navigate away and return (same tab). Interact with the form again. Confirm `quote_request_start` does **not** fire again (sessionStorage guard is active).
5. Complete a full quote submission. In GA4 DebugView, confirm `quote_request_submit_success` with `service_type` and `destination_country: "CR"`.
6. Verify `quote_request_submit_success` does **not** appear after a submission that results in a server error.

---

### QA-03 — Registration (`afiliate.html`)

**Goal:** Confirm `account_type_select`, `signup_start`, `signup_step`, and `signup_success` fire in order.

1. Open `afiliate.html`.
2. Click the "Empresa" tab. In GA4 DebugView, confirm `account_type_select` with `account_type: "business"`.
3. Click the "Personal" tab. Confirm `account_type_select` with `account_type: "personal"`.
4. Begin filling in the personal registration form. Confirm `signup_start` fires on the first field interaction.
5. Click the "Siguiente" step button. Confirm `signup_step` fires with a `step_name` like `personal_step_2`.
6. Complete a test registration. Confirm `signup_success` fires with `account_type: "personal"` only after the API returns `StatusResult: "OK"`.
7. **Negative:** Use a throwaway email. Confirm `signup_error` fires with `error_category: "duplicate_email"` or `"validation"`. Confirm `signup_success` does **not** fire.

---

### QA-04 — Logout and Session Events (`js/auth.js`)

**Goal:** Confirm `logout` and `session_expired` fire in the right conditions.

1. Log in to any portal page.
2. Click the logout button. In GA4 DebugView, confirm `logout` fires **before** the page redirects to `index.html`.
3. To test `session_expired`: open DevTools → Application → Local Storage, delete the auth token key (search for `crbox_token` or equivalent). Switch to a portal page tab or reload. Confirm `session_expired` fires in GA4 DebugView before the redirect to `login.html`.

---

### QA-05 — Profile Events (`mi-cuenta.html`)

**Goal:** Confirm `profile_edit_start`, `profile_update_success`, and `profile_update_error` fire correctly.

1. Log in and open `mi-cuenta.html`.
2. Click the "Seguridad" tab. Toggle one of the password fields. In GA4 DebugView, confirm `profile_edit_start` fires with `section_name: "security"`, `portal_area: "mi_cuenta"`.
3. Toggle the field again. Confirm `profile_edit_start` does **not** fire again (once-per-section guard).
4. Enter a valid new password and confirm. Click "Actualizar contraseña". In GA4 DebugView, confirm `profile_update_success` with `section_name: "security"`.
5. Click the "Notificaciones" tab. Toggle the newsletter checkbox. Confirm `profile_edit_start` fires with `section_name: "notifications"`.
6. Click "Guardar preferencias". Confirm `profile_update_success` with `section_name: "notifications"`.
7. **Negative:** Disconnect from the network and click save. Confirm `profile_update_error` fires with `error_category: "api_error"`. Confirm no raw error message is in the event payload.

---

### QA-06 — Package Filters (`mis-paquetes.html`)

**Goal:** Confirm `package_filter_use` fires with the correct `filter_type` for each filter.

1. Log in and open `mis-paquetes.html`.
2. Change the "Estado" dropdown. In GA4 DebugView, confirm `package_filter_use` with `filter_type: "status"`.
3. Change the "Período" dropdown. Confirm `package_filter_use` with `filter_type: "date"`.
4. Change the "Ordenar por" dropdown. Confirm `package_filter_use` with `filter_type: "sort"`.
5. Confirm no user-selected values (e.g. the dropdown text) appear anywhere in the event payload.

---

### QA-07 — Invoice Filter (`mis-facturas.html`)

**Goal:** Confirm `invoice_filter_use` fires when the user applies the date filter.

1. Log in and open `mis-facturas.html`.
2. Change the "Desde" date input and click "Buscar Facturas".
3. In GA4 DebugView, confirm `invoice_filter_use` with `filter_type: "date_range"`.
4. Confirm `portal_section_view` also fires in the same interaction (both events are expected).
5. Press Enter inside the "Hasta" date input. Confirm `invoice_filter_use` fires again with `filter_type: "date_range"`.

---

### QA-08 — API Errors (`mis-paquetes.html`, `mis-facturas.html`, `dashboard.html`)

**Goal:** Confirm `api_error` fires when the main portal data load fails.

1. Log in and open `mis-paquetes.html`.
2. In DevTools → Network, block requests matching `*getpackages*` or `*api*`.
3. Reload the page. Confirm `api_error` fires in GA4 DebugView with `error_category: "network"`.
4. Confirm the event payload contains only `error_category` — no URLs, status codes, response bodies, or user data.
5. Repeat for `mis-facturas.html` and `dashboard.html`.

---

### QA-09 — CTA Clicks (`index.html`, `como-funciona.html`, `calculadora.html`)

**Goal:** Confirm `cta_click` fires with correct `cta_id` and `cta_location` for the main CTAs.

1. Open `index.html`. Click the hero "Afíliate Gratis" button. In GA4 DebugView, confirm `cta_click` with `cta_id: "afiliate_cta"`, `cta_location: "hero"`, `destination_type: "internal_page"`.
2. Click the nav "Afíliate Gratis" button. Confirm `cta_click` with `cta_location: "nav"`.
3. Click any WhatsApp link. Confirm `whatsapp_click` fires. Confirm no phone number appears in the payload.

---

### QA-10 — Backward-Compat Aliases

**Goal:** Confirm deprecated event names still work without JavaScript errors.

1. Open the browser console on any page that loads `js/analytics.js`.
2. Run: `CRBOX.track.quote_start('aereo')`. Confirm no error and that `quote_request_start` fires in GA4 DebugView.
3. Run: `CRBOX.track.quote_submit({ service_type: 'aereo', destination_country: 'CR' })`. Confirm `quote_request_submit_success` fires.
4. Run: `CRBOX.track.contactFormSubmit()`. Confirm `contact_form_submit` fires (legacy — not wired to conversion reporting, but must not throw).

---

## 8. PII Policy

The following rules apply to all event parameters across the entire analytics layer:

- **No email addresses, phone numbers, names, identification numbers**, or any other personally identifiable information is ever sent as an event parameter.
- **`error_category`** is always a pre-defined, categorized slug (e.g. `network`, `invalid_credentials`, `duplicate_email`). Raw error messages, stack traces, HTTP response bodies, API response text, or URLs containing tokens are never used.
- **`filter_type`** and **`section_name`** are always hardcoded slugs. The actual value selected by the user (e.g. the filter dropdown text, the search query) is never sent.
- **`form_name`** uses the HTML element's `id` attribute — a developer-controlled value — never field contents.
- **`step_name`** uses a pattern like `personal_step_1` — never a user-visible label or field value.
- **`file_type`** uses a MIME-type category slug (e.g. `image`, `pdf`) — never the actual filename.
- **GTM Preview / DebugView QA:** All events should be reviewed against this policy during QA. Any event that appears to carry user data should be treated as a blocking issue.

---

## 9. Backward-Compat Aliases

These aliases exist in `js/analytics.js` so call sites in cached scripts or legacy GTM tags continue to work without error. They forward to the canonical implementations.

| Alias | Forwards to | Notes |
|---|---|---|
| `quote_start(st)` | `quote_request_start(st)` | Update GTM triggers referencing `quote_start` |
| `quote_submit(p)` | `quote_request_submit_success(p)` | Update GTM triggers referencing `quote_submit` |
| `contact_form_submit()` | `contact_form_submit()` | Kept as method; no longer auto-bound to DOM submit |
| `contactFormSubmit()` | `contact_form_submit()` | Camel-case legacy alias |
| `afiliate_cta(l)` | `cta_click({ cta_id: 'afiliate_cta', ... })` | |
| `calculadora_cta(l)` | `cta_click({ cta_id: 'calculadora_cta', ... })` | |
| `afiliateCTA(l)` | `afiliate_cta(l)` | |
| `calculadoraCTA(l)` | `calculadora_cta(l)` | |
| `whatsappClick(l)` | `whatsapp_click(l)` | |
| `phoneClick(l)` | `phone_click(l)` | |
| `emailClick(l)` | `email_click(l)` | |
| `faqEngage(s)` | `faq_engage(s)` | |
| `calculatorQuery(p)` | `calculator_query(p)` | |
| `calculatorResult(p)` | `calculator_result(p)` | |

---

## 10. Measurement Gaps Closed (Sprint #478)

| Gap | Root Cause | Resolution |
|---|---|---|
| `contact_form_submit` fired on DOM `submit` (before backend confirm) | Auto-bound to form `submit` event | Replaced with `contact_form_submit_success`; fires only on `data.ok === true` in `contacto.html` |
| No `quote_request_start` funnel entry event | Event missing | Added; session-scoped via `sessionStorage` guard; fires on first widget interaction |
| `quote_submit` fired regardless of API outcome | Correct position already, wrong name | Renamed to `quote_request_submit_success` inside `res.ok && data.ok && data.id` branch |
| No `account_type_select` event during signup | Event missing | Added to `personal-tab-btn` and `business-tab-btn` click handlers in `afiliate.html` |
| No `logout` event | Event missing | Added to `logout()` in `auth.js` before `clearToken()` |
| No `session_expired` event | Event missing | Added to all five redirect paths: `_handleAuthFailure()` and `getUserInfo()` in `portal-api.js` (covers 401/403 and incoherent token state); three redirect branches in `auth.js` (page-load gate, bfcache restore, visibilitychange) |
| No profile funnel events | Events missing | Added `profile_edit_start` (once per section), `profile_update_success`, `profile_update_error` in `mi-cuenta.html` |
| Package status/date/sort filter changes not tracked | Event missing | Added `package_filter_use` with `filter_type` slug on each filter `change` in `mis-paquetes.html` |
| Invoice filter used wrong event for reporting | `portal_section_view` used as proxy | Added `invoice_filter_use('date_range')` alongside existing call in `mis-facturas.html` |
| No `api_error` call sites | Stub existed but not wired | Added `api_error('network')` to main data-load `.catch()` in `mis-paquetes.html`, `mis-facturas.html`, `dashboard.html` |
| `quote_request_start` fired per page load instead of per session | No sessionStorage guard | Fixed with `sessionStorage.getItem/setItem('crbox_quote_start_fired')` guard |
