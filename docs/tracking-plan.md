# CRBOX Analytics — Tracking Plan

All events are pushed to `window.dataLayer` and consumed by GTM container `GTM-5WD8N53F`.
GTM forwards each event to GA4 via a corresponding Custom Event trigger and GA4 Event tag.

Every push carries four automatic standard parameters in addition to event-specific ones.

---

## Standard Parameters (auto-injected on every push by `js/analytics.js`)

| Parameter         | Type   | Values                                                                                          |
|-------------------|--------|-------------------------------------------------------------------------------------------------|
| `page_path`       | string | `window.location.pathname`, e.g. `/calculadora.html`                                            |
| `page_name`       | string | `index` · `servicios` · `como_funciona` · `tarifas` · `calculadora` · `contacto` · `login` · `afiliate` · `dashboard` · `mi_cuenta` · `mis_paquetes` · `mis_facturas` · `mis_solicitudes` · `solicitud` · `cotizar` · `404` · `privacidad` · `terminos` |
| `page_type`       | string | See "page_type values" table below                                                               |
| `page_path_group` | string | `public` · `portal` · `quote` · `legal` · `utility`                                             |

### page_type registered values

| page_type              | Pages                                       | page_path_group |
|------------------------|---------------------------------------------|-----------------|
| `public_home`          | `index.html`, `/`                           | `public`        |
| `public_service`       | `servicios.html`                            | `public`        |
| `public_how_it_works`  | `como-funciona.html`                        | `public`        |
| `public_rates`         | `tarifas.html`                              | `public`        |
| `public_calculator`    | `calculadora.html`                          | `public`        |
| `public_contact`       | `contacto.html`                             | `public`        |
| `public_affiliate`     | `afiliate.html`                             | `public`        |
| `portal_auth`          | `login.html`                                | `portal`        |
| `portal`               | `dashboard.html`, `mi-cuenta.html`          | `portal`        |
| `portal_packages`      | `mis-paquetes.html`                         | `portal`        |
| `portal_invoices`      | `mis-facturas.html`                         | `portal`        |
| `portal_requests`      | `mis-solicitudes.html`, `solicitud.html`    | `portal`        |
| `portal_quotes`        | `cotizar.html`                              | `quote`         |
| `utility`              | `404.html`, `privacidad.html`, `terminos.html` | `utility` / `legal` |

---

## 24 Registered GA4 Custom Dimensions

All event-specific payloads are built exclusively from these parameter names.
No other parameter names are ever sent.

| # | Parameter name         | Type    | Registered values / notes                                                                      | Privacy |
|---|------------------------|---------|-----------------------------------------------------------------------------------------------|---------|
| 1 | `page_type`            | string  | See table above                                                                                | Safe    |
| 2 | `page_name`            | string  | Stable page slug, e.g. `mis_paquetes`                                                          | Safe    |
| 3 | `page_path`            | string  | URL path (no query string or fragment)                                                          | Safe    |
| 4 | `page_path_group`      | string  | `public` · `portal` · `quote` · `legal` · `utility`                                             | Safe    |
| 5 | `section_name`         | string  | Stable section id or portal section slug (e.g. `faq`, `packages_in_transit`, `mis_paquetes`)   | Safe    |
| 6 | `cta_id`               | string  | `afiliate_cta` · `calculadora_cta` · `whatsapp_float`                                          | Safe    |
| 7 | `cta_location`         | string  | Ancestor context: section id · `header` · `footer` · `nav` · `floating_button`                 | Safe    |
| 8 | `cta_text`             | string  | Only pre-approved controlled labels; never raw user-supplied text                               | Safe    |
| 9 | `destination_type`     | string  | `internal_page` · `external`                                                                    | Safe    |
| 10| `link_domain`          | string  | Outbound hostname only (e.g. `wa.me`, `amazon.com`, `phone`) — never full URL                  | Safe    |
| 11| `link_context`         | string  | Ancestor context: `nav` · `header` · `footer` · section id · `content`                         | Safe    |
| 12| `form_name`            | string  | `contact` · form element id (e.g. `maritimo-quote-form`)                                        | Safe    |
| 13| `service_type`         | string  | Normalized slug derived from service card h3 text (accents stripped, lowercased, underscored)  | Safe    |
| 14| `shipping_mode`        | string  | `aereo` · `maritimo` · `aereo_consolidado`                                                      | Safe    |
| 15| `weight_bucket`        | string  | `lt_1kg` · `1_5kg` · `5_15kg` · `15_30kg` · `gt_30kg`                                         | Safe    |
| 16| `value_bucket`         | string  | `lt_25` · `25_100` · `100_500` · `500_1000` · `gt_1000`                                        | Safe    |
| 17| `destination_country`  | string  | ISO 3166-1 alpha-2, e.g. `CR` (always Costa Rica for CRBOX)                                    | Safe    |
| 18| `status_category`      | string  | `all` · `miami` · `loaded` · `in_transit` · `sjo` · `crbox` · `pending_invoice` · `no_result` · `unknown` · `other` | Safe    |
| 19| `error_category`       | string  | `invalid_credentials` · `network` · `unknown` · `duplicate_email` · `duplicate_id` · `validation` · `upload_failed` · `bill_creation_failed` | Safe |
| 20| `account_type`         | string  | `personal` · `business`                                                                         | Safe    |
| 21| `step_name`            | string  | e.g. `personal_step_2` · `business_step_3`                                                     | Safe    |
| 22| `message_type`         | string  | `text` (always — no message content is ever captured)                                           | Safe    |
| 23| `file_type`            | string  | `pdf` · `jpg` · `png` · `gif` · `webp` · `unknown` (MIME normalized to extension)              | Safe    |
| 24| `depth_percent`        | integer | 25 · 50 · 75 · 90                                                                              | Safe    |

Every event sends only the 24 parameters listed above. No other parameter names appear in any `dataLayer.push` call.

---

## Event Catalogue

### cta_click

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `cta_click`                                                              |
| **Parameters**  | `cta_id` · `cta_location` · `destination_type` · `cta_text` (optional)  |
| **Trigger**     | Click on any affiliate or calculator CTA link                            |
| **Pages**       | All public pages                                                         |
| **Notes**       | Replaces the former separate `cta_afiliate_click` / `cta_calculadora_click` events. `cta_id` distinguishes the CTA type (`afiliate_cta`, `calculadora_cta`). `cta_text` is only set if the label is a controlled, pre-approved value — never free-form user text. Backward-compat aliases `afiliate_cta()` / `calculadora_cta()` in `CRBOX.track` forward to this method. |

---

### whatsapp_click

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `whatsapp_click`                                                         |
| **Parameters**  | `cta_location` · `link_domain: 'wa.me'` · `link_context`                |
| **Trigger**     | Click on the WhatsApp floating button or any `<a href="https://wa.me/…">` |
| **Pages**       | All pages with the WhatsApp button                                       |

---

### phone_click

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `phone_click`                                                            |
| **Parameters**  | `link_domain: 'phone'` · `link_context`                                  |
| **Trigger**     | Click on any `<a href="tel:…">`                                          |
| **Pages**       | Any page with tel: links                                                 |
| **Privacy**     | Raw phone number is **never captured**. Only the ancestor context (section id or `header`) is sent. |

---

### email_click

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `email_click`                                                            |
| **Parameters**  | `link_context`                                                           |
| **Trigger**     | Click on any `<a href="mailto:…">`                                       |
| **Pages**       | Any page with mailto: links                                              |
| **Privacy**     | Raw email address is **never captured**.                                 |

---

### contact_form_submit

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `contact_form_submit`                                                    |
| **Parameters**  | `form_name: 'contact'`                                                   |
| **Trigger**     | Submit of `#contact-form`                                                |
| **Pages**       | `contacto.html`                                                          |
| **Privacy**     | Raw subject field value (`contact_subject`) is **never captured**.       |

---

### form_start

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `form_start`                                                             |
| **Parameters**  | `form_name` (element id of the form, e.g. `contact`, `maritimo-quote-form`) |
| **Trigger**     | First input/change interaction inside a tracked form                     |
| **Pages**       | `contacto.html` (and any page with a tracked form element)               |

---

### form_abandon

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `form_abandon`                                                           |
| **Parameters**  | `form_name`                                                              |
| **Trigger**     | Page unload when a form was started but not submitted                    |
| **Pages**       | `contacto.html`                                                          |
| **Note**        | Best-effort — not guaranteed on all browsers/mobile.                     |

---

### faq_engage

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `faq_engage`                                                             |
| **Parameters**  | `section_name` (id of the containing `<section>`, e.g. `faq`, `cta-como-funciona`) |
| **Trigger**     | Click on any `.faq-item` element                                         |
| **Pages**       | `como-funciona.html`, `tarifas.html`, any page with FAQ items            |
| **Privacy**     | Raw question text (`faq_question`) is **never captured**. Only the section identifier is sent. |

---

### nav_click

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `nav_click`                                                              |
| **Parameters**  | `link_context` · `destination_type`                                      |
| **Trigger**     | Click on header nav links                                                |
| **Pages**       | All pages with a `<header>`                                              |
| **Privacy**     | Raw link label (`nav_label`) and raw href (`nav_destination`) are **never captured**. |

---

### service_card_click

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `service_card_click`                                                     |
| **Parameters**  | `service_type` (normalized slug: lowercase, accents stripped, underscores) |
| **Trigger**     | Click on any `.service-card` element                                     |
| **Pages**       | `servicios.html`, any page with service cards                            |
| **Privacy**     | Raw h3 text is normalized to a stable slug. The slug is max 40 chars, contains no accents, and is safe for dimension cardinality. |

---

### calculator_start

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `calculator_start`                                                       |
| **Parameters**  | `shipping_mode` (`aereo` · `maritimo`)                                   |
| **Trigger**     | First focus/input on weight, value, or dimension fields                  |
| **Pages**       | `calculadora.html`, `cotizar.html`                                       |

---

### calculator_tab_switch

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `calculator_tab_switch`                                                  |
| **Parameters**  | `shipping_mode` (`aereo` · `maritimo`)                                   |
| **Trigger**     | Click on aéreo/marítimo tab toggle                                       |
| **Pages**       | `calculadora.html`                                                       |
| **Notes**       | Parameter was formerly named `to_mode`; renamed to `shipping_mode` to align with the registered GA4 custom dimension. |

---

### calculator_query

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `calculator_query`                                                       |
| **Parameters**  | `shipping_mode`                                                          |
| **Trigger**     | Multi-item consolidation calculation in `calculadora.html`               |
| **Pages**       | `calculadora.html`                                                       |
| **Privacy**     | Raw weight (`package_weight_kg`), destination text, and purchase value (`purchase_value_usd`) are **never captured**. Only `shipping_mode` (registered) is sent. |

---

### calculator_result

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `calculator_result`                                                      |
| **Parameters**  | `shipping_mode` · `weight_bucket` · `value_bucket` · `destination_country` |
| **Trigger**     | `calcSinglePackage()` or `calcConsolidated()` returns a result (in `js/calculator-engine.js`) |
| **Pages**       | `calculadora.html`, `cotizar.html`, `mis-solicitudes.html`               |
| **Privacy**     | Raw monetary outputs (`total_usd`, `shipping_usd`, `handling_usd`, `taxes_usd`) are **never captured**. Only bucketed dimensions are sent. Weights and values are in discrete bucket strings (no exact figures). |

#### weight_bucket values

| Bucket     | Range            |
|------------|------------------|
| `lt_1kg`   | < 1 kg           |
| `1_5kg`    | 1 – 5 kg         |
| `5_15kg`   | 5 – 15 kg        |
| `15_30kg`  | 15 – 30 kg       |
| `gt_30kg`  | > 30 kg          |

#### value_bucket values

| Bucket      | Range (USD)   |
|-------------|---------------|
| `lt_25`     | < $25         |
| `25_100`    | $25 – $100    |
| `100_500`   | $100 – $500   |
| `500_1000`  | $500 – $1,000 |
| `gt_1000`   | > $1,000      |

---

### scroll_depth

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `scroll_depth`                                                           |
| **Parameters**  | `depth_percent` (25 · 50 · 75 · 90)                                     |
| **Trigger**     | User scrolls past each milestone (debounced 200 ms, fires once per milestone per page load) |
| **Pages**       | All pages                                                                |

---

### section_visible

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `section_visible`                                                        |
| **Parameters**  | `section_name` (element id of the section)                               |
| **Trigger**     | 40% of a tracked section enters the viewport (IntersectionObserver, fires once per section per page load) |
| **Pages**       | Public pages with tracked section IDs                                    |
| **Notes**       | Parameter was formerly named `section_id`; renamed to `section_name` to align with the registered GA4 custom dimension. |

---

### outbound_click

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `outbound_click`                                                         |
| **Parameters**  | `link_domain` (hostname only) · `link_context`                           |
| **Trigger**     | Click on any `<a>` pointing to a different hostname                      |
| **Pages**       | All pages                                                                |
| **Privacy**     | Only the domain is captured — no path, query params, or fragment are ever sent. |

---

### login_start

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `login_start`                                                            |
| **Parameters**  | _(none beyond standard)_                                                 |
| **Trigger**     | `CRBOXAuth.doLogin()` is called (login form submit)                      |
| **Pages**       | `login.html`                                                             |

---

### login_success

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `login_success`                                                          |
| **Parameters**  | _(none beyond standard)_                                                 |
| **Trigger**     | `doLogin()` resolves with a valid access token                           |
| **Pages**       | `login.html`                                                             |

---

### login_error

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `login_error`                                                            |
| **Parameters**  | `error_category` (`invalid_credentials` · `network` · `unknown`)        |
| **Trigger**     | `doLogin()` rejects                                                      |
| **Pages**       | `login.html`                                                             |

---

### signup_start

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `signup_start`                                                           |
| **Parameters**  | _(none beyond standard)_                                                 |
| **Trigger**     | User advances from step 1 in the personal or business registration form for the first time |
| **Pages**       | `afiliate.html`                                                          |

---

### signup_step

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `signup_step`                                                            |
| **Parameters**  | `step_name` (e.g. `personal_step_2` · `business_step_3`)               |
| **Trigger**     | User advances to each subsequent step                                    |
| **Pages**       | `afiliate.html`                                                          |

---

### signup_success

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `signup_success`                                                         |
| **Parameters**  | `account_type` (`personal` · `business`)                                |
| **Trigger**     | `doRegister()` returns `StatusResult === 'OK'`                           |
| **Pages**       | `afiliate.html`                                                          |

---

### signup_error

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `signup_error`                                                           |
| **Parameters**  | `error_category` (`duplicate_email` · `duplicate_id` · `validation` · `network` · `unknown`) |
| **Trigger**     | `doRegister()` returns an error or rejects                               |
| **Pages**       | `afiliate.html`                                                          |

---

### package_search

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `package_search`                                                         |
| **Parameters**  | _(none beyond standard)_                                                 |
| **Trigger**     | User types in the `#search-input` field (debounced 600 ms) with a non-empty query |
| **Pages**       | `mis-paquetes.html`                                                      |
| **Privacy**     | No query text and no query length is captured — the event name alone records the search signal. `query_length_bucket` and `search_used` are not registered GA4 custom dimensions and are not sent. |

---

### package_search_result

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `package_search_result`                                                  |
| **Parameters**  | `status_category` — normalized to controlled set from raw API status: `miami` · `loaded` · `in_transit` · `sjo` · `crbox` · `pending_invoice` · `unknown` · `no_result` |
| **Trigger**     | `_loadPackages()` completes with a search filter active                  |
| **Pages**       | `mis-paquetes.html`                                                      |

---

### package_detail_view

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `package_detail_view`                                                    |
| **Parameters**  | _(none beyond standard)_                                                 |
| **Trigger**     | User opens the package detail modal                                      |
| **Pages**       | `mis-paquetes.html`                                                      |

---

### invoice_upload_start

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `invoice_upload_start`                                                   |
| **Parameters**  | `file_type` (`pdf` · `jpg` · `png` · `gif` · `webp` · `unknown`)       |
| **Trigger**     | Invoice form passes client-side validation and begins the two-step upload |
| **Pages**       | `mis-paquetes.html`                                                      |
| **Privacy**     | MIME type normalized to extension string — no filename, raw MIME, size, or invoice content captured. |

---

### invoice_upload_success

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `invoice_upload_success`                                                 |
| **Parameters**  | _(none beyond standard)_                                                 |
| **Trigger**     | Both write steps (upload + bill creation) succeed                        |
| **Pages**       | `mis-paquetes.html`                                                      |

---

### invoice_upload_error

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `invoice_upload_error`                                                   |
| **Parameters**  | `error_category` (`upload_failed` · `bill_creation_failed` · `unknown`) |
| **Trigger**     | Any step of the invoice upload pipeline fails                            |
| **Pages**       | `mis-paquetes.html`                                                      |

---

### quote_start

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `quote_start`                                                            |
| **Parameters**  | `service_type` (e.g. `aereo` · `maritimo`)                              |
| **Trigger**     | User selects a service type and begins the quote flow                    |
| **Pages**       | `cotizar.html`                                                           |

---

### quote_submit

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `quote_submit`                                                           |
| **Parameters**  | `service_type` · `destination_country` (ISO code)                       |
| **Trigger**     | Quote form (`/api/solicitudes`) responds with `ok: true`                 |
| **Pages**       | `cotizar.html`                                                           |
| **Privacy**     | No PII — no email, name, item description, or raw value. `has_dimensions` and `item_count_bucket` are not registered GA4 custom dimensions and are not sent. |

---

### portal_section_view

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `portal_section_view`                                                    |
| **Parameters**  | `section_name` · `page_name` · `page_type` · `status_category` (optional) |
| **Trigger**     | (1) Auto-fired on every portal page load (DOMContentLoaded in `analytics.js`) · (2) Tab switch in `mis-paquetes.html` · (3) Entry card click from `dashboard.html` |
| **Pages**       | All portal pages                                                         |
| **section_name values** | `dashboard` · `mi_cuenta` · `mis_paquetes` · `mis_facturas` · `mis_solicitudes` · `solicitud` · `cotizar` · `packages_all` · `packages_miami` · `packages_loaded` · `packages_in_transit` · `packages_sjo` · `packages_crbox` · `packages_pending_invoice` · `packages_other` · `mi_cuenta_personal_info` · `mi_cuenta_address_info` · `mi_cuenta_security` · `mi_cuenta_notifications` · `mi_cuenta_other` |
| **status_category** | Only set on tab-switch events in `mis-paquetes.html`: `all` · `miami` · `loaded` · `in_transit` · `sjo` · `crbox` · `pending_invoice` · `other` |
| **Auto-fire scope** | Fires automatically on all portal app pages (`portal` · `portal_packages` · `portal_invoices` · `portal_requests` · `portal_quotes`). Explicitly **excluded** from `portal_auth` (`login.html`) — that page is not part of the portal navigation set. |
| **Method signature** | Accepts either a plain string (backward-compat) or an object `{ section_name, page_name, page_type, status_category }`. |

---

### chat_open

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `chat_open`                                                              |
| **Parameters**  | _(none beyond standard)_                                                 |
| **Trigger**     | User opens the chat panel for the first time per session                 |
| **Pages**       | All pages where `chat-panel.js` is loaded                                |

---

### chat_message_sent

| Field           | Detail                                                                   |
|-----------------|--------------------------------------------------------------------------|
| **Event name**  | `chat_message_sent`                                                      |
| **Parameters**  | `message_type: 'text'` (always — hardcoded in `analytics.js`)           |
| **Trigger**     | User sends a message via the chat panel                                  |
| **Pages**       | All pages where `chat-panel.js` is loaded                                |
| **Privacy**     | No message content is ever captured. Widget-type hints (`calculator`, `quote`) that `chat-panel.js` may pass as the argument are intentionally ignored — the method always emits `'text'`. |

---

## Privacy Principles

1. **No PII** — never capture email addresses, phone numbers, names, ID numbers, tracking numbers, invoice numbers, MAWB/HAWB, or any raw user-supplied string.
2. **Bucket sensitive numbers** — weights and purchase values are always rounded to discrete bucket strings (see `calculator_result`). Raw monetary outputs are never sent.
3. **No query text** — search queries are not measured by content or length. Only the event name (`package_search`) is recorded; no query-derived fields are sent.
4. **No raw URLs in outbound links** — only the hostname is captured (`link_domain`).
5. **No file content or filenames** — invoice uploads capture MIME type normalized to extension string only (`file_type`).
6. **Controlled labels** — free-form user text in form fields (subjects, questions, descriptions) is never captured. Only pre-defined enumerated values are sent.
7. **Service card normalization** — raw service card h3 text is converted to a lowercase underscore slug; never sent verbatim.
8. **Guard all calls** — every analytics call is wrapped in `try/catch` and checks `window.CRBOX && CRBOX.track` to be resilient to load-order issues.

---

## Pages Coverage

| Page                  | `analytics.js` | Events wired                                                                                                  |
|-----------------------|---------------|---------------------------------------------------------------------------------------------------------------|
| `index.html`          | ✅ `defer`    | `cta_click`, `whatsapp_click`, `phone_click`, `email_click`, `nav_click`, `faq_engage`, `scroll_depth`, `section_visible`, `outbound_click` |
| `servicios.html`      | ✅ `defer`    | + `service_card_click`                                                                                        |
| `como-funciona.html`  | ✅ `defer`    | + `faq_engage`                                                                                                |
| `tarifas.html`        | ✅ `defer`    | + `faq_engage`                                                                                                |
| `calculadora.html`    | ✅ `defer`    | + `calculator_start`, `calculator_tab_switch`, `calculator_query`, `calculator_result`                        |
| `contacto.html`       | ✅ `defer`    | + `contact_form_submit`, `form_start`, `form_abandon`                                                         |
| `afiliate.html`       | ✅ `defer`    | `signup_start`, `signup_step`, `signup_success`, `signup_error`                                               |
| `login.html`          | ✅ `defer`    | `login_start`, `login_success`, `login_error` (wired in `js/auth.js`)                                        |
| `dashboard.html`      | ✅ `defer`    | `portal_section_view` (auto + entry card delegation), `outbound_click`, `nav_click`, `scroll_depth`          |
| `mis-paquetes.html`   | ✅ `defer`    | `portal_section_view` (auto + tab switch), `package_search`, `package_search_result`, `invoice_upload_start`, `invoice_upload_success`, `invoice_upload_error` |
| `mis-facturas.html`   | ✅ `defer`    | `portal_section_view` (auto), `outbound_click`, `scroll_depth`                                                |
| `mis-solicitudes.html`| ✅ `defer`    | `portal_section_view` (auto), `calculator_result` (from `calculator-engine.js`)                               |
| `mi-cuenta.html`      | ✅ `defer`    | `portal_section_view` (auto), `outbound_click`, `scroll_depth`                                                |
| `cotizar.html`        | ✅ `defer`    | `portal_section_view` (auto), `quote_start`, `quote_submit`, `calculator_result`                              |
| `solicitud.html`      | ✅ `defer`    | `portal_section_view` (auto), `outbound_click`, `scroll_depth`                                                |
| `404.html`            | ✅ `defer`    | `outbound_click`, `scroll_depth`                                                                              |
| `privacidad.html`     | ✅ `defer`    | `outbound_click`, `scroll_depth`                                                                              |
| `terminos.html`       | ✅ `defer`    | `outbound_click`, `scroll_depth`                                                                              |
| All pages (chat)      | via `chat-panel.js` | `chat_open`, `chat_message_sent`                                                                        |

---

## GTM Setup Notes

- **Container:** `GTM-5WD8N53F`
- All events arrive as custom dataLayer events with the four standard context parameters (`page_path`, `page_name`, `page_type`, `page_path_group`).
- GA4 Configuration tag should forward all custom events. Recommend a GA4 Event trigger with "All custom events" scope plus individual parameter mappings via dataLayer variables for the 24 registered custom dimensions.
- The `cta_click` event replaces the former separate `cta_afiliate_click` and `cta_calculadora_click` events. Update any GA4 / Looker Studio reports referencing the old event names. GTM triggers CE-101 and CE-102 should be updated to match `cta_click` and use `cta_id` to distinguish the two flows.
- `calculator_tab_switch`: the DLV variable for this tag should now read `shipping_mode` instead of the former `to_mode`.
- `section_visible`: the DLV variable for this tag should now read `section_name` instead of the former `section_id`.
- `form_start` / `form_abandon`: the DLV variable should now read `form_name` instead of the former `form_id`.
- `faq_engage`: the DLV variable should read `section_name` (the containing section id); the `faq_question` variable is now removed.
- `nav_click`: DLV variables should read `link_context` and `destination_type`; the former `nav_label` and `nav_destination` variables are removed.
- `phone_click`: DLV should read `link_domain` and `link_context`; the former `phone_number` variable is removed.
- `email_click`: DLV should read `link_context`; the former `email_address` variable is removed.
- `contact_form_submit`: DLV should read `form_name`; the former `contact_subject` variable is removed.
- `calculator_result`: DLV variables `total_usd`, `shipping_usd`, `handling_usd`, `taxes_usd` are removed. Only `weight_bucket`, `value_bucket`, `destination_country`, `shipping_mode` remain.
- `portal_section_view`: DLV variables should include `section_name`, `page_name`, `page_type`, and optionally `status_category`.

---

## GTM Preview Verification Checklist

To verify events end-to-end after publishing the updated GTM container:

1. Go to [tagmanager.google.com](https://tagmanager.google.com), open container **GTM-5WD8N53F**.
2. Click **Preview** → enter the live site URL → **Connect**.
3. Open **GA4 DebugView** in a parallel tab (Admin → DebugView).
4. For each event below, perform the action and confirm:
   - The event appears in the GTM **dataLayer** panel.
   - The `page_type` and `page_path_group` match the expected values for the current page.
   - No PII fields appear in any push.
   - Parameter names match the registered custom dimension names exactly.

| # | Event                    | Action to trigger                                        | Expected `page_type`       |
|---|--------------------------|----------------------------------------------------------|----------------------------|
| 1 | `cta_click`              | Click any "Afiliate" or "Calcular Envío" button          | `public_*`                 |
| 2 | `whatsapp_click`         | Click the floating WhatsApp button                       | any                        |
| 3 | `phone_click`            | Click a tel: link                                        | any                        |
| 4 | `email_click`            | Click a mailto: link                                     | any                        |
| 5 | `nav_click`              | Click a header navigation link                           | any                        |
| 6 | `service_card_click`     | Click a service card on `servicios.html`                 | `public_service`           |
| 7 | `faq_engage`             | Click a FAQ accordion item                               | `public_how_it_works` etc. |
| 8 | `contact_form_submit`    | Submit the contact form on `contacto.html`               | `public_contact`           |
| 9 | `form_start`             | Type in the contact form and navigate away               | `public_contact`           |
| 10| `calculator_start`       | Focus on a weight or value field in the calculator       | `public_calculator`        |
| 11| `calculator_tab_switch`  | Click the Marítimo tab in the calculator                 | `public_calculator`        |
| 12| `calculator_query`       | Run a multi-item consolidation calc                      | `public_calculator`        |
| 13| `calculator_result`      | Complete a single or multi-item calculation              | `public_calculator`        |
| 14| `scroll_depth`           | Scroll down past 25% of any page                         | any                        |
| 15| `section_visible`        | Let a tracked section scroll into view                   | `public_*`                 |
| 16| `outbound_click`         | Click an external link                                   | any                        |
| 17| `login_start`            | Click the login button on `login.html`                   | `portal_auth`              |
| 18| `login_success`          | Complete a successful login                              | `portal_auth`              |
| 19| `login_error`            | Enter wrong credentials                                  | `portal_auth`              |
| 20| `portal_section_view`    | Load any portal page; switch tabs in `mis-paquetes.html` | `portal*`                  |
| 21| `package_search`         | Type in the search box on `mis-paquetes.html`            | `portal_packages`          |
| 22| `invoice_upload_start`   | Select a valid file in the invoice upload form           | `portal_packages`          |
| 23| `quote_submit`           | Submit a quote on `cotizar.html`                         | `portal_quotes`            |
| 24| `chat_open`              | Open the chat panel for the first time                   | any                        |
