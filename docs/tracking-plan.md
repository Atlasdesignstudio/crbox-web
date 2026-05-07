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
