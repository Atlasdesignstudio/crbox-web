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

### CTA — Afíliate Gratis

| Field         | Value / Notes                             |
|--------------|-------------------------------------------|
| **Event**     | `cta_afiliate_click`                      |
| `cta_location`| Section ID where the link lives (e.g. `cta-afiliate`, `header`, `footer`) |
| `cta_label`   | Visible button text, max 80 chars         |

**Trigger**: any `<a href="afiliate.html">` click across all public pages.

---

### CTA — Calculadora de Envíos

| Field         | Value / Notes                             |
|--------------|-------------------------------------------|
| **Event**     | `cta_calculadora_click`                   |
| `cta_location`| Section ID of the originating link        |
| `cta_label`   | Visible button text, max 80 chars         |

**Trigger**: any `<a href="calculadora.html">` click across all public pages.

---

### WhatsApp Click

| Field         | Value / Notes                             |
|--------------|-------------------------------------------|
| **Event**     | `whatsapp_click`                          |
| `cta_location`| `floating_button` (default)              |

**Trigger**: click on any `<a href^="https://wa.me/">`.

---

### Phone Click

| Field          | Value / Notes                                |
|---------------|----------------------------------------------|
| **Event**      | `phone_click`                                |
| `phone_number` | Raw number from `href`, e.g. `+50640001114` |
| `cta_location` | Section ID or `header` / `footer`            |

**Trigger**: click on any `<a href^="tel:">`.

---

### Email Click

| Field           | Value / Notes                                |
|----------------|----------------------------------------------|
| **Event**       | `email_click`                                |
| `email_address` | Address from `href`                          |
| `cta_location`  | Section ID or `header` / `footer`            |

**Trigger**: click on any `<a href^="mailto:">`.

---

### Navigation Click

| Field             | Value / Notes                    |
|------------------|----------------------------------|
| **Event**         | `nav_click`                      |
| `nav_label`       | Visible link text, max 60 chars  |
| `nav_destination` | `href` attribute value           |

**Trigger**: click on any link inside the `<nav>` or desktop action area in `<header>`.

---

### Service Card Click

| Field          | Value / Notes                      |
|---------------|------------------------------------|
| **Event**      | `service_card_click`               |
| `service_name` | Text of the card's `<h3>` heading  |

**Trigger**: click on any `.service-card` element on `servicios.html`.

---

### FAQ Engagement

| Field          | Value / Notes                        |
|---------------|--------------------------------------|
| **Event**      | `faq_engage`                         |
| `faq_question` | Text of the FAQ `<h3>` heading       |
| `section_id`   | ID of the enclosing `<section>`      |

**Trigger**: click on any `.faq-item` element.

---

### Contact Form Submit

| Field             | Value / Notes                              |
|------------------|--------------------------------------------|
| **Event**         | `contact_form_submit`                      |
| `contact_subject` | Value of the `[name="asunto"]` field, or `unknown` |

**Trigger**: `submit` event on `#contact-form` (contacto.html).

---

### Form Start

| Field     | Value / Notes                            |
|----------|------------------------------------------|
| **Event** | `form_start`                             |
| `form_id` | `contact-form` · `maritimo-quote-form`   |

**Trigger**: first `input` or `change` event on a tracked form. Fires once per form per session.

---

### Form Abandon

| Field     | Value / Notes                                          |
|----------|--------------------------------------------------------|
| **Event** | `form_abandon`                                         |
| `form_id` | `contact-form` · `maritimo-quote-form`                 |

**Trigger**: `beforeunload` when a form was started but not submitted.  
**Limitation**: `beforeunload` is not guaranteed in all browsers/devices (mobile Safari, bfcache). Use as a directional signal only.

---

### Calculator Start

| Field           | Value / Notes         |
|----------------|-----------------------|
| **Event**       | `calculator_start`    |
| `shipping_mode` | `aereo` · `maritimo`  |

**Trigger**: first `input` or `focus` event on `#aero-weight`, `#aero-purchase-value`, `#aero-length`, or `#nombre` (maritime first field). Fires once per page load.

---

### Calculator Tab Switch

| Field      | Value / Notes         |
|-----------|-----------------------|
| **Event**  | `calculator_tab_switch` |
| `to_mode`  | `aereo` · `maritimo`  |

**Trigger**: click on `#toggle-aero` or `#toggle-maritimo`.

---

### Calculator Query

| Field                | Value / Notes                       |
|---------------------|-------------------------------------|
| **Event**            | `calculator_query`                  |
| `shipping_mode`      | `aereo` · `maritimo`                |
| `package_weight_kg`  | Applied weight (real or volumetric) |
| `destination`        | Province slug, e.g. `sanjose`       |
| `purchase_value_usd` | Declared purchase value in USD      |

**Trigger**: click on "Calcular Envío Aéreo" button; maritime form submit.

---

### Calculator Result

| Field               | Value / Notes                            |
|--------------------|------------------------------------------|
| **Event**           | `calculator_result`                      |
| `shipping_mode`     | `aereo` · `maritimo`                     |
| `package_weight_kg` | Applied weight                           |
| `destination`       | Province slug                            |
| `total_usd`         | Estimated total cost                     |
| `shipping_usd`      | Freight component                        |
| `handling_usd`      | Handling fee component                   |
| `taxes_usd`         | Estimated tax component                  |

**Trigger**: fires immediately after `calculator_query` once the result is displayed.

---

### Scroll Depth

| Field           | Value / Notes         |
|----------------|-----------------------|
| **Event**       | `scroll_depth`        |
| `depth_percent` | `25` · `50` · `75` · `90` |

**Trigger**: debounced scroll listener (200 ms). Each milestone fires at most once per page load.

---

### Section Visible

| Field        | Value / Notes                                              |
|-------------|-----------------------------------------------------------|
| **Event**    | `section_visible`                                         |
| `section_id` | HTML `id` attribute of the observed section element       |

**Trigger**: IntersectionObserver at ~40% visibility threshold. Fires once per section per page load.

**Observed sections:**

| Page           | Section IDs tracked                                                    |
|---------------|------------------------------------------------------------------------|
| index          | `main-content`, `stats`, `servicios`, `cta-afiliate`                  |
| servicios      | `main-content`, `servicios-destacados`, `casillero`, `compras`, `carga-aerea`, `carga-maritima` |
| como-funciona  | `main-content`, `proceso`, `faq`, `cta-como-funciona`                 |
| tarifas        | `main-content`, `aerea`, `maritima`, `cta-tarifas`                    |
| calculadora    | `main-content`, `aero-calculator`                                      |
| contacto       | `main-content`, `sucursales`, `formulario`                             |

---

## JavaScript API Reference

All methods live on `window.CRBOX.track`. Loaded via `js/analytics.js` (deferred, before `</body>`).

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

All auto-bind events fire without extra code in the HTML. Manual calls are only needed when custom business logic must decide the exact moment to fire (e.g., calculator results from inline JS in calculadora.html).
