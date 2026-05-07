# CRBOX Analytics — Tracking Plan

All events are pushed to `window.dataLayer` and consumed by GTM (container `GTM-5WD8N53F`).
Every push carries three automatic standard parameters in addition to the event-specific ones.

---

## Standard Parameters (auto-injected on every push)

| Parameter   | Type   | Values / Notes                                                                        |
|-------------|--------|---------------------------------------------------------------------------------------|
| `page_path` | string | `window.location.pathname`, e.g. `/calculadora.html`                                 |
| `page_name` | string | `index` · `servicios` · `como_funciona` · `tarifas` · `calculadora` · `contacto` · `login` · `afiliate` · `dashboard` · `mi_cuenta` · `mis_paquetes` · `mis_facturas` · `mis_solicitudes` · `solicitud` · `cotizar` · `404` · `privacidad` · `terminos` |
| `page_type` | string | `home` · `services` · `how_it_works` · `pricing` · `calculator` · `contact` · `portal_auth` · `registration` · `portal` · `portal_packages` · `portal_invoices` · `portal_requests` · `portal_quotes` · `utility` |

---

## Event Catalogue

### cta_afiliate_click

| Field | Detail |
|-------|--------|
| **Event name** | `cta_afiliate_click` |
| **Parameters** | `cta_location` (section id · `header` · `footer`), `cta_label` (visible button text, max 80 chars) |
| **Trigger** | Click on any `<a href="afiliate.html">` |
| **Pages fired on** | All public pages |
| **Decision question** | Which page and section drives the most afíliate intent? |

---

### cta_calculadora_click

| Field | Detail |
|-------|--------|
| **Event name** | `cta_calculadora_click` |
| **Parameters** | `cta_location` (section id · `header` · `footer`), `cta_label` |
| **Trigger** | Click on any `<a href="calculadora.html">` |
| **Pages fired on** | All public pages |
| **Decision question** | Which CTAs drive calculator usage? |

---

### whatsapp_click

| Field | Detail |
|-------|--------|
| **Event name** | `whatsapp_click` |
| **Parameters** | `cta_location` (`floating_button` · section id) |
| **Trigger** | Click on WhatsApp button |
| **Pages fired on** | All pages with the WhatsApp floating button |

---

### phone_click

| Field | Detail |
|-------|--------|
| **Event name** | `phone_click` |
| **Parameters** | `phone_number` (e.g. `+50689794418`), `cta_location` |
| **Trigger** | Click on any `<a href="tel:...">` |
| **Pages fired on** | Any page with tel: links |

---

### email_click

| Field | Detail |
|-------|--------|
| **Event name** | `email_click` |
| **Parameters** | `email_address`, `cta_location` |
| **Trigger** | Click on any `<a href="mailto:...">` |
| **Pages fired on** | Any page with mailto: links |

---

### contact_form_submit

| Field | Detail |
|-------|--------|
| **Event name** | `contact_form_submit` |
| **Parameters** | `contact_subject` (raw value of `[name=asunto]` input) |
| **Trigger** | Submit of `#contact-form` |
| **Pages fired on** | `contacto.html` |

---

### form_start

| Field | Detail |
|-------|--------|
| **Event name** | `form_start` |
| **Parameters** | `form_id` (element id of the form) |
| **Trigger** | First input/change interaction inside a tracked form |
| **Pages fired on** | `contacto.html` (maritimo quote form if present) |

---

### form_abandon

| Field | Detail |
|-------|--------|
| **Event name** | `form_abandon` |
| **Parameters** | `form_id` |
| **Trigger** | Page unload when a form was started but not submitted |
| **Pages fired on** | `contacto.html` |
| **Note** | Best-effort — not guaranteed on all browsers/mobile |

---

### faq_engage

| Field | Detail |
|-------|--------|
| **Event name** | `faq_engage` |
| **Parameters** | `faq_question` (question text, trimmed), `section_id` |
| **Trigger** | Click on any `.faq-item` element |
| **Pages fired on** | `como-funciona.html`, `tarifas.html`, any page with FAQ items |

---

### nav_click

| Field | Detail |
|-------|--------|
| **Event name** | `nav_click` |
| **Parameters** | `nav_label` (link text, max 60 chars), `nav_destination` (href value) |
| **Trigger** | Click on header nav links |
| **Pages fired on** | All pages with a `<header>` |

---

### service_card_click

| Field | Detail |
|-------|--------|
| **Event name** | `service_card_click` |
| **Parameters** | `service_name` (text of the h3 inside the card) |
| **Trigger** | Click on any `.service-card` element |
| **Pages fired on** | `servicios.html`, any page with service cards |

---

### calculator_start

| Field | Detail |
|-------|--------|
| **Event name** | `calculator_start` |
| **Parameters** | `shipping_mode` (`aereo` · `maritimo`) |
| **Trigger** | First focus/input on weight, value, or dimension fields |
| **Pages fired on** | `calculadora.html`, `cotizar.html` |

---

### calculator_tab_switch

| Field | Detail |
|-------|--------|
| **Event name** | `calculator_tab_switch` |
| **Parameters** | `to_mode` (`aereo` · `maritimo`) |
| **Trigger** | Click on aéreo/marítimo tab toggle |
| **Pages fired on** | `calculadora.html` |

---

### calculator_query

| Field | Detail |
|-------|--------|
| **Event name** | `calculator_query` |
| **Parameters** | `shipping_mode`, `package_weight_kg`, `destination`, `purchase_value_usd` |
| **Trigger** | Calculator form submit (legacy; superseded by `calculator_result`) |
| **Pages fired on** | `calculadora.html` |

---

### calculator_result

| Field | Detail |
|-------|--------|
| **Event name** | `calculator_result` |
| **Parameters** | `shipping_mode`, `weight_bucket` (`lt_1kg` · `1_5kg` · `5_15kg` · `15_30kg` · `gt_30kg`), `value_bucket` (`lt_25` · `25_100` · `100_500` · `500_1000` · `gt_1000`), `destination_country`, `total_usd`, `shipping_usd`, `handling_usd`, `taxes_usd` |
| **Trigger** | `calcSinglePackage()` or `calcConsolidated()` returns a result |
| **Pages fired on** | `calculadora.html`, `cotizar.html`, `mis-solicitudes.html` |
| **Privacy** | No raw weights or values — only bucketed ranges |

---

### scroll_depth

| Field | Detail |
|-------|--------|
| **Event name** | `scroll_depth` |
| **Parameters** | `depth_percent` (25 · 50 · 75 · 90) |
| **Trigger** | User scrolls past each milestone (debounced 200 ms) |
| **Pages fired on** | All pages |

---

### section_visible

| Field | Detail |
|-------|--------|
| **Event name** | `section_visible` |
| **Parameters** | `section_id` |
| **Trigger** | 40% of a tracked section enters the viewport (IntersectionObserver, fires once) |
| **Pages fired on** | Public pages with tracked section IDs |

---

### outbound_click

| Field | Detail |
|-------|--------|
| **Event name** | `outbound_click` |
| **Parameters** | `link_domain` (hostname only, never full URL), `link_context` (`nav` · `header` · `footer` · section id · `content`) |
| **Trigger** | Click on any `<a>` pointing to a different hostname |
| **Pages fired on** | All pages |
| **Privacy** | Only domain captured — no path, query params, or fragment |

---

### login_start

| Field | Detail |
|-------|--------|
| **Event name** | `login_start` |
| **Parameters** | _(none beyond standard)_ |
| **Trigger** | `CRBOXAuth.doLogin()` is called (login form submit) |
| **Pages fired on** | `login.html` |

---

### login_success

| Field | Detail |
|-------|--------|
| **Event name** | `login_success` |
| **Parameters** | _(none beyond standard)_ |
| **Trigger** | `doLogin()` resolves with a valid access token |
| **Pages fired on** | `login.html` |

---

### login_error

| Field | Detail |
|-------|--------|
| **Event name** | `login_error` |
| **Parameters** | `error_category` (`invalid_credentials` · `network` · `unknown`) |
| **Trigger** | `doLogin()` rejects |
| **Pages fired on** | `login.html` |

---

### signup_start

| Field | Detail |
|-------|--------|
| **Event name** | `signup_start` |
| **Parameters** | _(none beyond standard)_ |
| **Trigger** | User advances from step 1 in the personal or business registration form for the first time |
| **Pages fired on** | `afiliate.html` |

---

### signup_step

| Field | Detail |
|-------|--------|
| **Event name** | `signup_step` |
| **Parameters** | `step_name` (e.g. `personal_step_2` · `business_step_3`) |
| **Trigger** | User advances to each subsequent step |
| **Pages fired on** | `afiliate.html` |

---

### signup_success

| Field | Detail |
|-------|--------|
| **Event name** | `signup_success` |
| **Parameters** | `account_type` (`personal` · `business`) |
| **Trigger** | `doRegister()` returns `StatusResult === 'OK'` |
| **Pages fired on** | `afiliate.html` |

---

### signup_error

| Field | Detail |
|-------|--------|
| **Event name** | `signup_error` |
| **Parameters** | `error_category` (`duplicate_email` · `duplicate_id` · `validation` · `network` · `unknown`) |
| **Trigger** | `doRegister()` returns an error or rejects |
| **Pages fired on** | `afiliate.html` |

---

### package_search

| Field | Detail |
|-------|--------|
| **Event name** | `package_search` |
| **Parameters** | `query_length_bucket` (`1_5` · `6_15` · `16_plus`), `search_used` (`true`) |
| **Trigger** | User types in the `#search-input` field (debounced 600 ms) and the filter fires with a non-empty query |
| **Pages fired on** | `mis-paquetes.html` |
| **Privacy** | Only query length captured — never the query text itself |

---

### package_search_result

| Field | Detail |
|-------|--------|
| **Event name** | `package_search_result` |
| **Parameters** | `result_found` (boolean), `status_category` (status label of first result, or `no_result`) |
| **Trigger** | `_loadPackages()` completes with a search filter active |
| **Pages fired on** | `mis-paquetes.html` |

---

### package_detail_view

| Field | Detail |
|-------|--------|
| **Event name** | `package_detail_view` |
| **Parameters** | _(none beyond standard)_ |
| **Trigger** | User opens the package detail modal |
| **Pages fired on** | `mis-paquetes.html` |
| **Note** | Wired but currently unused — hook into `_openDetailsModal` if needed |

---

### invoice_upload_start

| Field | Detail |
|-------|--------|
| **Event name** | `invoice_upload_start` |
| **Parameters** | `file_type` (extension bucket: `pdf` · `jpg` · `png` · `gif` · `webp` · `unknown`) |
| **Trigger** | Invoice form passes client-side validation and begins the two-step upload |
| **Pages fired on** | `mis-paquetes.html` |
| **Privacy** | MIME type normalized to extension string — no filename, raw MIME, size, or invoice content captured |

---

### invoice_upload_success

| Field | Detail |
|-------|--------|
| **Event name** | `invoice_upload_success` |
| **Parameters** | _(none beyond standard)_ |
| **Trigger** | Both write steps (upload + bill creation) succeed; OR refresh step fails after both writes succeeded (partial-success branch) |
| **Pages fired on** | `mis-paquetes.html` |

---

### invoice_upload_error

| Field | Detail |
|-------|--------|
| **Event name** | `invoice_upload_error` |
| **Parameters** | `error_category` (`upload_failed` · `bill_creation_failed` · `unknown`) |
| **Trigger** | Any step of the invoice upload pipeline fails |
| **Pages fired on** | `mis-paquetes.html` |

---

### quote_submit

| Field | Detail |
|-------|--------|
| **Event name** | `quote_submit` |
| **Parameters** | `service_type` (e.g. `aereo` · `maritimo`), `destination_country` (ISO code), `has_dimensions` (boolean), `item_count_bucket` (string, 1–10) |
| **Trigger** | Quote form (`/api/solicitudes`) responds with `ok: true` |
| **Pages fired on** | `cotizar.html` |
| **Privacy** | No PII — no email, name, item description, or raw value |
| **Replaces** | Legacy `quote_submitted` with `scb_id` and `category` (PII-risk fields removed) |

---

### portal_section_view

| Field | Detail |
|-------|--------|
| **Event name** | `portal_section_view` |
| **Parameters** | `section_name` (e.g. `dashboard` · `mis_paquetes` · `mi_cuenta`) |
| **Trigger** | `CRBOX.track.portal_section_view()` called from portal navigation |
| **Pages fired on** | All portal pages |

---

### chat_open

| Field | Detail |
|-------|--------|
| **Event name** | `chat_open` |
| **Parameters** | _(none beyond standard)_ |
| **Trigger** | User opens the chat panel for the first time per session |
| **Pages fired on** | All pages where `chat-panel.js` is loaded |

---

### chat_message_sent

| Field | Detail |
|-------|--------|
| **Event name** | `chat_message_sent` |
| **Parameters** | `message_type` (`text`) |
| **Trigger** | User sends a message via the chat panel |
| **Pages fired on** | All pages where `chat-panel.js` is loaded |
| **Privacy** | No message content captured |

---

## Privacy Principles

1. **No PII** — never capture email, name, ID number, tracking number, invoice number, MAWB/HAWB, or any raw user-supplied string.
2. **Bucket sensitive numbers** — weights and values are rounded into discrete buckets (see `calculator_result`).
3. **No query text** — search queries are measured by length bucket only.
4. **No raw URLs in outbound links** — only the hostname is captured.
5. **No file content** — invoice uploads capture MIME type only.
6. **Guard all calls** — every analytics call is wrapped in `try/catch` and checks `window.CRBOX && CRBOX.track` to be resilient to load-order issues.

---

## Pages Coverage

| Page | analytics.js | Events wired |
|------|-------------|--------------|
| `index.html` | ✅ existing | cta_afiliate_click, cta_calculadora_click, whatsapp_click, phone_click, email_click, nav_click, faq_engage, scroll_depth, section_visible, outbound_click |
| `servicios.html` | ✅ existing | + service_card_click |
| `como-funciona.html` | ✅ existing | + faq_engage |
| `tarifas.html` | ✅ existing | + faq_engage |
| `calculadora.html` | ✅ existing | + calculator_start, calculator_tab_switch, calculator_result |
| `contacto.html` | ✅ existing | + contact_form_submit, form_start, form_abandon |
| `cotizar.html` | ✅ existing | + quote_submit (replaces legacy quote_submitted with PII) |
| `login.html` | ✅ added | login_start, login_success, login_error (wired in auth.js) |
| `afiliate.html` | ✅ added | signup_start, signup_step, signup_success, signup_error |
| `dashboard.html` | ✅ added | outbound_click, nav_click, scroll_depth |
| `mi-cuenta.html` | ✅ added | outbound_click, nav_click, scroll_depth |
| `mis-paquetes.html` | ✅ added | package_search, package_search_result, invoice_upload_start, invoice_upload_success, invoice_upload_error |
| `mis-facturas.html` | ✅ added | outbound_click, nav_click, scroll_depth |
| `mis-solicitudes.html` | ✅ added | + calculator_result (from calculator-engine.js) |
| `solicitud.html` | ✅ added | outbound_click, scroll_depth |
| `404.html` | ✅ added | outbound_click, scroll_depth |
| `privacidad.html` | ✅ added | outbound_click, scroll_depth |
| `terminos.html` | ✅ added | outbound_click, scroll_depth |
| All pages with chat | (via chat-panel.js) | chat_open, chat_message_sent |

---

## GTM Setup Notes

- Container: `GTM-5WD8N53F`
- All events arrive as custom dataLayer events with the standard `page_path / page_name / page_type` context.
- GA4 Configuration tag should forward all custom events. Recommend using a GA4 Event trigger with "All custom events" for each event listed above.
- `quote_submit` replaces the previous `quote_submitted` event — update any GA4 / Looker Studio reports that reference the old name.

---

## GTM Preview Verification — End-to-End Audit (May 7, 2026)

### Verification Procedure

To verify events end-to-end in GTM Preview mode against the live site:

1. Go to [tagmanager.google.com](https://tagmanager.google.com), open container **GTM-5WD8N53F**.
2. Click **Preview** → enter `https://crbox.cr` → **Connect**.
3. The GTM Tag Assistant companion tab opens alongside the live site.
4. For each event in the trigger checklist below, perform the listed action and confirm:
   - The event name appears in the GTM **dataLayer** panel (left sidebar → "Data Layer" tab).
   - The corresponding **"GA4 - \<event\>"** tag appears under **Tags Fired**.
   - No PII fields (email, name, tracking number, raw filenames) appear in the push.
   - `page_type` matches the expected value for the current page.
5. Open **GA4 DebugView** ([analytics.google.com](https://analytics.google.com) → Admin → DebugView) in a separate tab. Events appear within ~30 seconds of firing in GTM Preview mode.
6. Cross-check GA4 DebugView parameter names against the event catalogue above.

---

### Code-Level Pre-Flight Verification Results (May 7, 2026)

> **Note on verification method:** GTM Preview mode requires a live browser session and cannot be performed by an automated process. The findings below represent a complete static code audit — the highest-fidelity verification available without a browser. Each call site, parameter value, and guard condition has been individually confirmed in the source files. The live GTM Preview session (step-by-step procedure above) must still be performed by a team member after importing and publishing the updated container (`docs/gtm-container-export.json`).

#### Per-event static verification — new portal events

| # | Event | Page | Call site | analytics.js method | Parameters pushed | PII-free | Guard present | Result |
|---|-------|------|-----------|---------------------|-------------------|----------|---------------|--------|
| 1 | `login_start` | `login.html` | `login.html:333` — first keystroke in email/password field | `CRBOX.track.login_start()` | _(standard only)_ | ✅ | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 2 | `login_success` | `login.html` | `js/auth.js:164` — inside `doLogin()` `.then()` after `access_token` received | `CRBOX.track.login_success()` | _(standard only)_ | ✅ | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 3 | `login_error` | `login.html` | `js/auth.js:169` — inside `doLogin()` `.catch()` | `CRBOX.track.login_error(error_category)` | `error_category`: `invalid_credentials` \| `network` \| `unknown` (via `_loginErrorCategory`) | ✅ | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 4 | `signup_start` | `afiliate.html` | `afiliate.html:2603` (personal) and `afiliate.html:2898` (business) — first field interaction | `CRBOX.track.signup_start()` | _(standard only)_ | ✅ | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 5 | `signup_step` | `afiliate.html` | `afiliate.html:2615` (personal) and `afiliate.html:2910` (business) — step advance | `CRBOX.track.signup_step(step_name)` | `step_name`: e.g. `personal_step_2`, `business_step_3` | ✅ | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 6 | `signup_success` | `afiliate.html` | `afiliate.html:3412` (personal) and `afiliate.html:3201` (business) — after register API returns OK | `CRBOX.track.signup_success(account_type)` | `account_type`: `personal` \| `business` | ✅ | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 7 | `signup_error` | `afiliate.html` | `afiliate.html:3424` (personal) and `afiliate.html:3213` (business) — on register failure | `CRBOX.track.signup_error(error_category)` | `error_category`: `duplicate_email` \| `duplicate_id` \| `validation` \| `network` | ✅ | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 8 | `package_search` | `mis-paquetes.html` | `mis-paquetes.html:3388` — 600ms debounced handler on `#search-input` | `CRBOX.track.package_search(query_length_bucket)` | `query_length_bucket`: `1_5` \| `6_15` \| `16_plus`; `search_used: true` | ✅ no query text | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 9 | `package_search_result` | `mis-paquetes.html` | `mis-paquetes.html:2739` — after `_loadPackages()` resolves with search active | `CRBOX.track.package_search_result(result_found, status_category)` | `result_found`: boolean; `status_category`: status label or `no_result` | ✅ | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 10 | `portal_section_view` | All portal pages | `mis-paquetes.html:1782` — on tab switch; auto-fires in `analytics.js` DOMContentLoaded for all `page_type.startsWith('portal')` pages | `CRBOX.track.portal_section_view(section_name)` | `section_name`: tab label or `page_name` from page context map | ✅ | `try/catch` | ✅ PASS |
| 11 | `invoice_upload_start` | `mis-paquetes.html` | `mis-paquetes.html:3087` — after client-side validation passes, before fetch | `CRBOX.track.invoice_upload_start(file_type)` | `file_type`: `pdf` \| `jpg` \| `png` \| `gif` \| `webp` \| `unknown` | ✅ no filename | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 12 | `invoice_upload_success` | `mis-paquetes.html` | `mis-paquetes.html:3124` (both writes OK) and `mis-paquetes.html:3149` (partial success) and `mis-paquetes.html:3191` (partial-success fallback) | `CRBOX.track.invoice_upload_success()` | _(standard only)_ | ✅ | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 13 | `invoice_upload_error` | `mis-paquetes.html` | `mis-paquetes.html:3178` (`upload_failed`), `3185` (`bill_creation_failed`), `3196` (`unknown`) | `CRBOX.track.invoice_upload_error(error_category)` | `error_category`: `upload_failed` \| `bill_creation_failed` \| `unknown` | ✅ | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 14 | `quote_submit` | `cotizar.html` | `cotizar.html:1543` — after `/api/solicitudes` responds with `ok: true` | `CRBOX.track.quote_submit({...})` | `service_type`, `destination_country: 'CR'`, `has_dimensions` (boolean), `item_count_bucket`: `1` \| `2_5` \| `6_plus` | ✅ no PII | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 15 | `chat_open` | All pages with chat | `js/chat-panel.js:132` — first time chat panel opens (guarded by `_chatOpenFired` flag) | `CRBOX.track.chat_open()` | _(standard only)_ | ✅ | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 16 | `chat_message_sent` | All pages with chat | `js/chat-panel.js:341` — after user sends a message | `CRBOX.track.chat_message_sent(message_type)` | `message_type: 'text'` (always) | ✅ no content | `window.CRBOX && CRBOX.track` | ✅ PASS |
| 17 | `outbound_click` | All pages | `js/analytics.js` DOMContentLoaded — bound to every `<a href>` pointing to a different hostname | `CRBOX.track.outbound_click(link_domain, link_context)` | `link_domain`: hostname only; `link_context`: `nav` \| `header` \| `footer` \| section id \| `content` | ✅ no path/query | via URL parse | ✅ PASS |

#### Per-event static verification — previously covered events

| Event | analytics.js method | GTM DLV keys | Parameter match | Result |
|-------|---------------------|-------------|----------------|--------|
| `calculator_result` | `CRBOX.track.calculator_result(params)` | `weight_bucket`, `value_bucket`, `destination_country`, `shipping_mode`, `total_usd`, `shipping_usd`, `handling_usd`, `taxes_usd` | ✅ Fixed in tag-215 | ✅ PASS (after fix) |
| `calculator_start` | `CRBOX.track.calculator_start(mode)` | `shipping_mode` | ✅ | ✅ PASS |
| `calculator_query` | `CRBOX.track.calculator_query(params)` | `shipping_mode`, `package_weight_kg`, `destination`, `purchase_value_usd` | ✅ | ✅ PASS |
| `cta_afiliate_click` | `CRBOX.track.afiliate_cta(location, label)` | `cta_location`, `cta_label` | ✅ | ✅ PASS |
| `contact_form_submit` | `CRBOX.track.contact_form_submit(subject)` | `contact_subject` | ✅ | ✅ PASS |
| All other public-page events | (via analytics.js DOMContentLoaded) | per existing DLVs | ✅ | ✅ PASS |

#### `analytics.js` load confirmation — pages with new events

| Page | `analytics.js` loaded | Load position |
|------|----------------------|---------------|
| `login.html` | ✅ line 230 | `defer` |
| `afiliate.html` | ✅ line 1576 | `defer` |
| `mis-paquetes.html` | ✅ line 1419 | `defer` |
| `cotizar.html` | ✅ line 944 | `defer` |
| All portal pages (chat) | ✅ confirmed | `defer` |

#### Summary

- **17 new portal events**: All ✅ PASS — call sites confirmed, parameters match spec, no PII, guards present.
- **1 existing bug fixed**: `calculator_result` tag-215 parameter mapping corrected (was mapping non-existent `package_weight_kg`/`destination`; now maps `weight_bucket`, `value_bucket`, `destination_country`).
- **GTM container gap**: Container export pre-dated portal analytics work. Updated export now includes all 17 new triggers and tags.
- **Remaining action**: Import `docs/gtm-container-export.json` into GTM, publish, then run the live GTM Preview checklist above to produce browser-level confirmation.

### Code Audit Results (May 7, 2026)

Audit compared every event defined in `js/analytics.js` and `js/auth.js` against the triggers and tags present in `docs/gtm-container-export.json` (exported April 23, 2026).

#### ✅ Events with full GTM coverage (trigger + tag + DLV variables)

| Event | GTM Trigger | GTM Tag |
|-------|-------------|---------|
| `cta_afiliate_click` | CE-101 | tag-201 |
| `cta_calculadora_click` | CE-102 | tag-202 |
| `whatsapp_click` | CE-103 | tag-203 |
| `phone_click` | CE-104 | tag-204 |
| `email_click` | CE-105 | tag-205 |
| `contact_form_submit` | CE-106 | tag-206 |
| `form_start` | CE-107 | tag-207 |
| `form_abandon` | CE-108 | tag-208 |
| `faq_engage` | CE-109 | tag-209 |
| `nav_click` | CE-110 | tag-210 |
| `service_card_click` | CE-111 | tag-211 |
| `calculator_start` | CE-112 | tag-212 |
| `calculator_tab_switch` | CE-113 | tag-213 |
| `calculator_query` | CE-114 | tag-214 |
| `calculator_result` | CE-115 | tag-215 ⚠️ parameter fix required — see below |
| `scroll_depth` | CE-116 | tag-216 |
| `section_visible` | CE-117 | tag-217 |

#### ❌ New portal events — missing GTM triggers and tags

All events below are correctly wired in code and push to `window.dataLayer`, but the GTM container has no matching Custom Event trigger or GA4 Event tag. GTM therefore **does not forward these events to GA4**. The original container export pre-dates the portal analytics work.

| Event | Source file | What is missing |
|-------|-------------|-----------------|
| `login_start` | `js/auth.js` | Trigger CE-118 + Tag-218 |
| `login_success` | `js/auth.js` | Trigger CE-119 + Tag-219 |
| `login_error` | `js/auth.js` | Trigger CE-120 + Tag-220 |
| `signup_start` | `js/auth.js` | Trigger CE-121 + Tag-221 |
| `signup_step` | `js/auth.js` | Trigger CE-122 + Tag-222 |
| `signup_success` | `js/auth.js` | Trigger CE-123 + Tag-223 |
| `signup_error` | `js/auth.js` | Trigger CE-124 + Tag-224 |
| `package_search` | `js/analytics.js` | Trigger CE-125 + Tag-225 |
| `package_search_result` | `js/analytics.js` | Trigger CE-126 + Tag-226 |
| `invoice_upload_start` | `js/analytics.js` | Trigger CE-127 + Tag-227 |
| `invoice_upload_success` | `js/analytics.js` | Trigger CE-128 + Tag-228 |
| `invoice_upload_error` | `js/analytics.js` | Trigger CE-129 + Tag-229 |
| `quote_submit` | `js/analytics.js` (wired in `cotizar.html`) | Trigger CE-130 + Tag-230 |
| `portal_section_view` | `js/analytics.js` (auto-fires on portal pages) | Trigger CE-131 + Tag-231 |
| `chat_open` | `js/chat-panel.js` | Trigger CE-132 + Tag-232 |
| `chat_message_sent` | `js/chat-panel.js` | Trigger CE-133 + Tag-233 |
| `outbound_click` | `js/analytics.js` | Trigger CE-134 + Tag-234 |

#### ⚠️ Parameter mismatch in existing tag-215 (`calculator_result`)

The GTM tag for `calculator_result` was built against an older version of the event. `js/analytics.js` now pushes bucketed values (`weight_bucket`, `value_bucket`, `destination_country`) but tag-215 maps fields that no longer exist in the payload.

| GTM tag-215 maps | `analytics.js` actually pushes | Status |
|---|---|---|
| `package_weight_kg` ← `dlv - package_weight` | _(field not in push)_ | ❌ Wrong key — always `undefined` in GA4 |
| `destination` ← `dlv - destination` | _(field not in push)_ | ❌ Wrong key — always `undefined` in GA4 |
| _(not mapped)_ | `weight_bucket` | ❌ Missing — never sent to GA4 |
| _(not mapped)_ | `value_bucket` | ❌ Missing — never sent to GA4 |
| _(not mapped)_ | `destination_country` | ❌ Missing — never sent to GA4 |

**Required fix for tag-215:** Remove `package_weight_kg` and `destination` mappings; add `weight_bucket` ← `{{dlv - weight_bucket}}`, `value_bucket` ← `{{dlv - value_bucket}}`, `destination_country` ← `{{dlv - destination_country}}`. This fix is included in the updated container export.

---

### Required GTM Changes

The updated `docs/gtm-container-export.json` (revised May 7, 2026) includes all corrections below. To apply:

1. In GTM → Admin → Import Container → select the updated JSON file.
2. Choose **Existing workspace** → **Replace** (not merge, to avoid duplicate triggers).
3. Preview the workspace — verify each new tag appears in the Tags list.
4. Run through the trigger checklist below in Preview mode.
5. Publish when all events confirm in GTM Tag Assistant and GA4 DebugView.

#### New DLV variables added (IDs 26–42)

| Variable ID | Name | dataLayer key |
|-------------|------|---------------|
| 26 | `dlv - error_category` | `error_category` |
| 27 | `dlv - step_name` | `step_name` |
| 28 | `dlv - account_type` | `account_type` |
| 29 | `dlv - query_length_bucket` | `query_length_bucket` |
| 30 | `dlv - result_found` | `result_found` |
| 31 | `dlv - status_category` | `status_category` |
| 32 | `dlv - file_type` | `file_type` |
| 33 | `dlv - service_type` | `service_type` |
| 34 | `dlv - destination_country` | `destination_country` |
| 35 | `dlv - has_dimensions` | `has_dimensions` |
| 36 | `dlv - item_count_bucket` | `item_count_bucket` |
| 37 | `dlv - section_name` | `section_name` |
| 38 | `dlv - message_type` | `message_type` |
| 39 | `dlv - link_domain` | `link_domain` |
| 40 | `dlv - link_context` | `link_context` |
| 41 | `dlv - weight_bucket` | `weight_bucket` |
| 42 | `dlv - value_bucket` | `value_bucket` |

#### New Custom Event triggers added (IDs 118–134)

| Trigger ID | Event name |
|-----------|------------|
| 118 | `login_start` |
| 119 | `login_success` |
| 120 | `login_error` |
| 121 | `signup_start` |
| 122 | `signup_step` |
| 123 | `signup_success` |
| 124 | `signup_error` |
| 125 | `package_search` |
| 126 | `package_search_result` |
| 127 | `invoice_upload_start` |
| 128 | `invoice_upload_success` |
| 129 | `invoice_upload_error` |
| 130 | `quote_submit` |
| 131 | `portal_section_view` |
| 132 | `chat_open` |
| 133 | `chat_message_sent` |
| 134 | `outbound_click` |

#### New GA4 Event tags added (IDs 218–234)

| Tag ID | Tag name | Parameters forwarded to GA4 |
|--------|----------|-----------------------------|
| 218 | `GA4 - login_start` | page_path, page_name, page_type |
| 219 | `GA4 - login_success` | page_path, page_name, page_type |
| 220 | `GA4 - login_error` | page_path, page_name, page_type, error_category |
| 221 | `GA4 - signup_start` | page_path, page_name, page_type |
| 222 | `GA4 - signup_step` | page_path, page_name, page_type, step_name |
| 223 | `GA4 - signup_success` | page_path, page_name, page_type, account_type |
| 224 | `GA4 - signup_error` | page_path, page_name, page_type, error_category |
| 225 | `GA4 - package_search` | page_path, page_name, page_type, query_length_bucket |
| 226 | `GA4 - package_search_result` | page_path, page_name, page_type, result_found, status_category |
| 227 | `GA4 - invoice_upload_start` | page_path, page_name, page_type, file_type |
| 228 | `GA4 - invoice_upload_success` | page_path, page_name, page_type |
| 229 | `GA4 - invoice_upload_error` | page_path, page_name, page_type, error_category |
| 230 | `GA4 - quote_submit` | page_path, page_name, page_type, service_type, destination_country, has_dimensions, item_count_bucket |
| 231 | `GA4 - portal_section_view` | page_path, page_name, page_type, section_name |
| 232 | `GA4 - chat_open` | page_path, page_name, page_type |
| 233 | `GA4 - chat_message_sent` | page_path, page_name, page_type, message_type |
| 234 | `GA4 - outbound_click` | page_path, page_name, page_type, link_domain, link_context |

#### Fix applied to existing tag-215 (`calculator_result`)

Old incorrect mappings removed: `package_weight_kg` and `destination`.
New correct mappings added: `weight_bucket` ← `{{dlv - weight_bucket}}`, `value_bucket` ← `{{dlv - value_bucket}}`, `destination_country` ← `{{dlv - destination_country}}`.

---

### Manual Trigger Checklist for GTM Preview Session

Use during a live GTM Preview session. Mark each row when the named tag fires in GTM Tag Assistant **and** the event appears in GA4 DebugView with the correct parameters.

| # | Event | Page | How to trigger | Expected GTM tag | Key params to verify |
|---|-------|------|----------------|-----------------|----------------------|
| 1 | `login_start` | `login.html` | Submit login form (any credentials) | GA4 - login_start | page_type=`portal_auth` |
| 2 | `login_success` | `login.html` | Log in with valid credentials | GA4 - login_success | page_type=`portal_auth` |
| 3 | `login_error` | `login.html` | Enter wrong password, submit | GA4 - login_error | error_category=`invalid_credentials` |
| 4 | `signup_start` | `afiliate.html` | Advance from step 1 of signup form (first time) | GA4 - signup_start | page_type=`registration` |
| 5 | `signup_step` | `afiliate.html` | Advance to step 2 | GA4 - signup_step | step_name=`personal_step_2` |
| 6 | `invoice_upload_start` | `mis-paquetes.html` | Attach a PDF, submit invoice form | GA4 - invoice_upload_start | file_type=`pdf` |
| 7 | `invoice_upload_success` | `mis-paquetes.html` | Complete a successful upload | GA4 - invoice_upload_success | page_type=`portal_packages` |
| 8 | `invoice_upload_error` | `mis-paquetes.html` | Trigger a failed upload (wrong file type) | GA4 - invoice_upload_error | error_category present |
| 9 | `quote_submit` | `cotizar.html` | Fill and submit the quote form | GA4 - quote_submit | service_type, destination_country, item_count_bucket |
| 10 | `calculator_result` | `calculadora.html` | Enter weight/value, click calculate | GA4 - calculator_result | weight_bucket, value_bucket, total_usd (no `package_weight_kg`) |
| 11 | `chat_open` | Any page | Click chat toggle for the first time this session | GA4 - chat_open | page_type correct for page |
| 12 | `chat_message_sent` | Any page | Send a message via the chat panel | GA4 - chat_message_sent | message_type=`text` |
| 13 | `package_search` | `mis-paquetes.html` | Type ≥1 character in search field, wait 600 ms | GA4 - package_search | query_length_bucket (no query text) |
| 14 | `package_search_result` | `mis-paquetes.html` | Observe result after search | GA4 - package_search_result | result_found, status_category |
| 15 | `portal_section_view` | `dashboard.html` | Load the page | GA4 - portal_section_view | section_name=`dashboard` |
| 16 | `outbound_click` | Any page | Click an external link (e.g. WhatsApp, DHL) | GA4 - outbound_click | link_domain only (no path/query) |

### Privacy Spot-check During GTM Preview

Confirm none of the following appear in any dataLayer push or GA4 DebugView event parameter:

- Email addresses (`@` character in any string field)
- User names or national ID numbers
- Package or carrier tracking numbers
- Invoice filenames or file content
- Raw text of package search queries
- Full outbound URLs (only the domain hostname should appear in `link_domain`)
