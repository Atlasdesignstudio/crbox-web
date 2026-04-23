# CRBOX Analytics — Tracking Plan

All events are pushed to `window.dataLayer` and consumed by GTM (container `GTM-XXXXXXX`).  
Every push carries three automatic standard parameters in addition to the event-specific ones.

---

## Standard Parameters (auto-injected on every push)

| Parameter    | Type   | Values / Notes                                                    |
|-------------|--------|-------------------------------------------------------------------|
| `page_path`  | string | `window.location.pathname`, e.g. `/calculadora.html`             |
| `page_name`  | string | `index` · `servicios` · `como_funciona` · `tarifas` · `calculadora` · `contacto` |
| `page_type`  | string | `home` · `services` · `how_it_works` · `pricing` · `calculator` · `contact` |

---

## Event Catalogue

### cta_afiliate_click

| Field | Detail |
|-------|--------|
| **Event name** | `cta_afiliate_click` |
| **Parameters** | `cta_location` (section id · `header` · `footer`), `cta_label` (visible button text, max 80 chars) |
| **Trigger** | Click on any `<a href="afiliate.html">` |
| **Pages fired on** | All 6 public pages |
| **Decision question** | Which page and section drives the most afíliate intent? Use to prioritize CTA placement and copy tests. |

---

### cta_calculadora_click

| Field | Detail |
|-------|--------|
| **Event name** | `cta_calculadora_click` |
| **Parameters** | `cta_location` (section id · `header` · `footer`), `cta_label` (visible button text, max 80 chars) |
| **Trigger** | Click on any `<a href="calculadora.html">` |
| **Pages fired on** | All 6 public pages |
| **Decision question** | Which pages and sections funnel the most traffic to the calculator? Use to strengthen calculator-discovery paths. |

---

### whatsapp_click

| Field | Detail |
|-------|--------|
| **Event name** | `whatsapp_click` |
| **Parameters** | `cta_location` (default: `floating_button`) |
| **Trigger** | Click on any `<a href^="https://wa.me/">` |
| **Pages fired on** | All pages that include a WhatsApp link (contacto, floating button on all pages) |
| **Decision question** | Is WhatsApp a significant acquisition channel? Compare volume to `contact_form_submit` to understand preferred contact method. |

---

### phone_click

| Field | Detail |
|-------|--------|
| **Event name** | `phone_click` |
| **Parameters** | `phone_number` (raw number), `cta_location` (section id · `header` · `footer`) |
| **Trigger** | Click on any `<a href^="tel:">` |
| **Pages fired on** | contacto.html (primary), any page with a tel: link |
| **Decision question** | Are users clicking to call? High volume suggests phone support is important and should be prominently featured. |

---

### email_click

| Field | Detail |
|-------|--------|
| **Event name** | `email_click` |
| **Parameters** | `email_address` (from href), `cta_location` (section id · `header` · `footer`) |
| **Trigger** | Click on any `<a href^="mailto:">` |
| **Pages fired on** | contacto.html (primary), any page with a mailto: link |
| **Decision question** | Do users prefer email over the contact form? If email_click >> contact_form_submit, the form may have friction. |

---

### contact_form_submit

| Field | Detail |
|-------|--------|
| **Event name** | `contact_form_submit` |
| **Parameters** | `contact_subject` (value of `[name="asunto"]` field, or `unknown`) |
| **Trigger** | `submit` event on `#contact-form` |
| **Pages fired on** | contacto.html |
| **Decision question** | Which contact subjects are most common? Use to prioritize FAQ content and pre-qualification messaging. |

---

### form_start

| Field | Detail |
|-------|--------|
| **Event name** | `form_start` |
| **Parameters** | `form_id` (`contact-form` · `maritimo-quote-form`) |
| **Trigger** | First `input` or `change` event on a tracked form. Fires once per form per page load. |
| **Pages fired on** | contacto.html (`contact-form`), calculadora.html (`maritimo-quote-form`) |
| **Decision question** | What share of form visitors actually start filling in fields? Low `form_start / page_visit` ratio means users aren't reaching or aren't motivated to use the form. |

---

### form_abandon

| Field | Detail |
|-------|--------|
| **Event name** | `form_abandon` |
| **Parameters** | `form_id` (`contact-form` · `maritimo-quote-form`) |
| **Trigger** | `beforeunload` when a form was started but not submitted. Best-effort — not guaranteed in all browsers (especially mobile Safari). |
| **Pages fired on** | contacto.html, calculadora.html |
| **Decision question** | Are users dropping out mid-form? Use with `form_start` as a directional abandon rate. Investigate which fields cause abandonment by pairing with field-level heatmap tools. |

---

### faq_engage

| Field | Detail |
|-------|--------|
| **Event name** | `faq_engage` |
| **Parameters** | `faq_question` (text of the FAQ `<h3>`), `section_id` (enclosing section id) |
| **Trigger** | Click on any `.faq-item` element |
| **Pages fired on** | como-funciona.html (primary), any page with `.faq-item` |
| **Decision question** | Which questions do users click most? The top questions reveal gaps in the main page copy or pre-sales objections to address directly. |

---

### nav_click

| Field | Detail |
|-------|--------|
| **Event name** | `nav_click` |
| **Parameters** | `nav_label` (visible link text, max 60 chars), `nav_destination` (href value) |
| **Trigger** | Click on any link inside the `<nav>` or desktop action area in `<header>` |
| **Pages fired on** | All 6 public pages |
| **Decision question** | Which navigation items drive the most clicks? Low clicks on a key page (e.g. Tarifas) suggest users aren't finding it or don't need it — inform IA and CTA strategy. |

---

### service_card_click

| Field | Detail |
|-------|--------|
| **Event name** | `service_card_click` |
| **Parameters** | `service_name` (text of the card's `<h3>` heading) |
| **Trigger** | Click on any `.service-card` element |
| **Pages fired on** | servicios.html |
| **Decision question** | Which services attract the most clicks? Prioritize content depth, pricing detail, and CTAs for top-clicked services. |

---

### calculator_start

| Field | Detail |
|-------|--------|
| **Event name** | `calculator_start` |
| **Parameters** | `shipping_mode` (`aereo` · `maritimo`) |
| **Trigger** | First `input` or `focus` on `#aero-weight`, `#aero-purchase-value`, `#aero-length`, or `#nombre` (maritime). Fires once per page load. |
| **Pages fired on** | calculadora.html |
| **Decision question** | How many visitors who reach the calculator actually start using it? Low `calculator_start / section_visible[aero-calculator]` ratio means the tool is visible but not compelling. |

---

### calculator_tab_switch

| Field | Detail |
|-------|--------|
| **Event name** | `calculator_tab_switch` |
| **Parameters** | `to_mode` (`aereo` · `maritimo`) |
| **Trigger** | Click on `#toggle-aero` or `#toggle-maritimo` |
| **Pages fired on** | calculadora.html |
| **Decision question** | How many aero users switch to maritime and vice versa? High switching suggests users are exploring both options — consider showing a comparison or guiding them to the right mode. |

---

### calculator_query

| Field | Detail |
|-------|--------|
| **Event name** | `calculator_query` |
| **Parameters** | `shipping_mode` (`aereo` · `maritimo`), `package_weight_kg` (applied weight), `destination` (province slug), `purchase_value_usd` (declared value) |
| **Trigger** | Click on "Calcular Envío Aéreo" button; maritime form submit |
| **Pages fired on** | calculadora.html |
| **Decision question** | What are the most common weight ranges and destinations? Use to validate tariff table coverage and identify the typical customer profile for pricing and marketing decisions. |

---

### calculator_result

| Field | Detail |
|-------|--------|
| **Event name** | `calculator_result` |
| **Parameters** | `shipping_mode`, `package_weight_kg`, `destination`, `total_usd`, `shipping_usd`, `handling_usd`, `taxes_usd` |
| **Trigger** | Fires immediately after `calculator_query` when results are displayed |
| **Pages fired on** | calculadora.html |
| **Decision question** | What is the typical estimated cost? Use to validate competitiveness, identify high-value shipments, and understand whether result totals align with actual invoices. Mark as a conversion in GA4. |

---

### scroll_depth

| Field | Detail |
|-------|--------|
| **Event name** | `scroll_depth` |
| **Parameters** | `depth_percent` (`25` · `50` · `75` · `90`) |
| **Trigger** | Debounced scroll listener (200 ms). Each milestone fires at most once per page load. |
| **Pages fired on** | All 6 public pages |
| **Decision question** | How far do users read on each page? Pages with high 25% but low 75% rates have content that drops off — investigate copy quality, page length, or CTA placement mid-page. |

---

### section_visible

| Field | Detail |
|-------|--------|
| **Event name** | `section_visible` |
| **Parameters** | `section_id` (HTML id of the observed section) |
| **Trigger** | IntersectionObserver at ~40% visibility threshold. Fires once per section per page load then disconnects. |
| **Pages fired on** | All 6 public pages (only sections with IDs listed below are observed) |
| **Decision question** | Which high-value sections are actually being seen? Low visibility on `cta-afiliate` or `formulario` means users aren't scrolling far enough — consider page restructuring or mid-page CTAs. |

**Observed sections by page:**

| Page           | Section IDs observed                                                                                |
|---------------|------------------------------------------------------------------------------------------------------|
| index          | `main-content`, `stats`, `servicios`, `cta-afiliate`                                               |
| servicios      | `main-content`, `servicios-destacados`, `casillero`, `compras`, `carga-aerea`, `carga-maritima`     |
| como-funciona  | `main-content`, `proceso`, `faq`, `cta-como-funciona`                                              |
| tarifas        | `main-content`, `aerea`, `maritima`, `cta-tarifas`                                                 |
| calculadora    | `main-content`, `aero-calculator`                                                                   |
| contacto       | `main-content`, `sucursales`, `formulario`                                                          |

---

## JavaScript API Reference

All methods live on `window.CRBOX.track`. Loaded via `js/analytics.js` (deferred, before `</body>` on all 6 public pages).

```js
CRBOX.track.afiliate_cta(location, label)
CRBOX.track.calculadora_cta(location, label)
CRBOX.track.whatsapp_click(location)
CRBOX.track.phone_click(phone, location)
CRBOX.track.email_click(email, location)
CRBOX.track.contact_form_submit(subject)
CRBOX.track.form_start(form_id)
CRBOX.track.form_abandon(form_id)
CRBOX.track.faq_engage(question, section_id)
CRBOX.track.nav_click(label, destination)
CRBOX.track.service_card_click(service_name)
CRBOX.track.calculator_start(mode)
CRBOX.track.calculator_tab_switch(to_mode)
CRBOX.track.calculator_query(params)
CRBOX.track.calculator_result(params)
CRBOX.track.scroll_depth(depth_percent)
CRBOX.track.section_visible(section_id)
```

All events in this catalogue fire automatically via DOM binding in `DOMContentLoaded`. Manual calls from HTML files are limited to calculator results in `calculadora.html` where the result value is only available after inline computation.
