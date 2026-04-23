# CRBOX Analytics — GTM vs GA4 Reference

This document clarifies the responsibility boundary between Google Tag Manager (GTM) and Google Analytics 4 (GA4) in the CRBOX measurement stack, and explains what each layer does and does not do.

---

## Architecture Overview

```
Browser
  └── js/analytics.js  (fires on user interactions)
        └── window.dataLayer.push({ event, ...params })
              └── GTM (listens to dataLayer, fires tags)
                    └── GA4 Event Tags (send hits to GA4)
                          └── GA4 Reports & Explore
```

---

## Layer Responsibilities

### js/analytics.js

**What it does:**
- Defines `CRBOX.track.*` helper methods.
- Injects standard page context (`page_path`, `page_name`, `page_type`) on every push.
- Binds DOM events automatically on `DOMContentLoaded` (CTAs, tel links, email links, nav, FAQs, service cards, forms, calculator interactions).
- Tracks scroll depth milestones via a debounced scroll listener.
- Tracks section visibility via `IntersectionObserver`.

**What it does NOT do:**
- Does not send data to any analytics platform directly.
- Does not read or write cookies.
- Does not depend on GA4, GTM, or any third-party SDK being present.

---

### Google Tag Manager (GTM)

**What it does:**
- Listens to `window.dataLayer` for custom events pushed by `analytics.js`.
- Reads event parameters from the dataLayer via Data Layer Variables.
- Fires GA4 Event Tags based on Custom Event triggers.
- Can fire additional vendor tags (Meta Pixel, LinkedIn Insight Tag, etc.) without touching `analytics.js`.

**What it does NOT do:**
- GTM does not define the event schema — that is owned by `analytics.js` and documented in `docs/tracking-plan.md`.
- GTM does not collect or store data — it is a tag dispatcher only.

**Container ID:** `YOUR_GTM_CONTAINER_ID` (replace before go-live in all 6 public pages).

---

### Google Analytics 4 (GA4)

**What it does:**
- Receives event hits forwarded by GTM tags.
- Stores events and user data for reporting.
- Provides the Realtime, Explore, and standard reports.
- Powers audiences for Google Ads and remarketing.

**What it does NOT do:**
- GA4 does not receive events that are not forwarded by GTM.
- GA4 does not know about `window.dataLayer` directly — GTM is the bridge.

---

## Event Flow Example — Calculator Query

```
1. User clicks "Calcular Envío Aéreo"
2. calculadora.html calls CRBOX.track.calculator_query({ mode: 'aereo', ... })
3. analytics.js runs push():
     window.dataLayer.push({
       event:              'calculator_query',
       page_path:          '/calculadora.html',
       page_name:          'calculadora',
       page_type:          'calculator',
       shipping_mode:      'aereo',
       package_weight_kg:  5,
       destination:        'sanjose',
       purchase_value_usd: 150
     })
4. GTM detects event 'calculator_query' via Custom Event trigger
5. GTM reads DLVs: dlv-shipping_mode = 'aereo', dlv-total_usd = ..., etc.
6. GTM fires GA4 Event Tag "GA4 - calculator_query"
7. GA4 records the event under the Measurement ID G-B5BPHFRR18
```

---

## Naming Conventions

| Layer            | Convention            | Example                      |
|-----------------|-----------------------|------------------------------|
| JS method        | `snake_case`          | `CRBOX.track.calculator_query` |
| dataLayer event  | `lowercase_snake_case`| `calculator_query`           |
| GTM trigger name | `CE - event_name`     | `CE - calculator_query`      |
| GTM variable     | `dlv - param_name`    | `dlv - shipping_mode`        |
| GA4 event name   | `lowercase_snake_case`| `calculator_query`           |
| GA4 parameter    | `lowercase_snake_case`| `shipping_mode`              |

---

## Debugging Checklist

| Check | How |
|-------|-----|
| Events reaching dataLayer | Browser console: `window.dataLayer` |
| GTM firing correctly | GTM Preview Mode / Tag Assistant |
| GA4 receiving events | GA4 Realtime report → Events |
| Parameters present | GA4 DebugView (enable `debug_mode` via GTM) |
| Scroll depth firing | Scroll slowly on a long page, watch console |
| Section visible firing | Scroll to each tracked section, watch console |

---

## What to Do When an Event Is Missing in GA4

1. Confirm the event fires in `window.dataLayer` (browser console).
2. If it is in the dataLayer but not in GTM Tag Assistant → check the trigger condition (event name exact match).
3. If it is in GTM preview but not in GA4 → check the GA4 Event Tag configuration and Measurement ID.
4. If it is not in the dataLayer → check the DOM element exists with the expected selector or ID.

---

## Extending the Event Taxonomy

To add a new event:

1. Add the method to `CRBOX.track` in `js/analytics.js`.
2. Document it in `docs/tracking-plan.md`.
3. In GTM: create a Custom Event trigger + GA4 Event Tag + any needed DLVs.
4. In GA4: confirm the event appears and register it as a conversion if needed.

Do **not** push events directly to `window.dataLayer` from HTML files. Always go through `CRBOX.track.*` to ensure standard page context is included.
