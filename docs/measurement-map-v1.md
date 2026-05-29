# CRBOX Measurement Map v1 + Tracking Implementation Plan

**Date:** 2026-05-29  
**Author:** Growth Measurement Audit (automated)  
**Status:** Foundational document — no implementation. Read-only audit.  
**Source of truth for:** GA4 · GTM · Google Ads · Meta Pixel · Meta CAPI · Looker Studio · CRM · n8n · AI optimization workflows · offline conversion imports · paid media · CRO

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Measurement Philosophy and Business Logic](#2-measurement-philosophy-and-business-logic)
3. [Current Tracking Findings](#3-current-tracking-findings)
4. [Funnel and Measurement Stages](#4-funnel-and-measurement-stages)
5. [CRBOX Measurement Map v1](#5-crbox-measurement-map-v1)
6. [Conversion Priority Model](#6-conversion-priority-model)
7. [Event Taxonomy and Naming Convention](#7-event-taxonomy-and-naming-convention)
8. [Event Parameter Schema](#8-event-parameter-schema)
9. [Data Contract](#9-data-contract)
10. [Client-side vs Server-side Tracking Boundary](#10-client-side-vs-server-side-tracking-boundary)
11. [Deduplication and Event Integrity Plan](#11-deduplication-and-event-integrity-plan)
12. [UTM and Attribution Foundation](#12-utm-and-attribution-foundation)
13. [Consent, Privacy, and PII Safety](#13-consent-privacy-and-pii-safety)
14. [Page-by-page Tracking Plan](#14-page-by-page-tracking-plan)
15. [Recommended Technical Architecture](#15-recommended-technical-architecture)
16. [Platform Mapping: GA4, Google Ads, Meta](#16-platform-mapping-ga4-google-ads-meta)
17. [Conversion Value and Quality Scoring](#17-conversion-value-and-quality-scoring)
18. [Dashboard and Reporting Readiness](#18-dashboard-and-reporting-readiness)
19. [AI / n8n Automation Readiness](#19-ai--n8n-automation-readiness)
20. [QA Checklist](#20-qa-checklist)
21. [QA Evidence Requirements](#21-qa-evidence-requirements)
22. [Implementation Phases](#22-implementation-phases)
23. [Files to Modify](#23-files-to-modify)
24. [Risks / Open Questions](#24-risks--open-questions)
25. [What Not To Track Yet](#25-what-not-to-track-yet)
26. [What Not To Automate Yet](#26-what-not-to-automate-yet)
27. [Recommended Next Action](#27-recommended-next-action)

---

## 1. Executive Summary

### Measurement Readiness Rating: **PARTIALLY READY — solid foundation, critical gaps remain**

CRBOX already has a mature client-side analytics stack. The GTM container (GTM-5WD8N53F) is live on all six public pages, GA4 property G-B5BPHFRR18 is receiving events, a 30+-method centralized tracking utility (`js/analytics.js`) with the `CRBOX.track` namespace is in place, 24 custom dimensions are registered, and the three primary conversion events (`signup_success`, `quote_request_submit_success`, `contact_form_submit_success`) fire only on confirmed API success. This is significantly more advanced than a typical pre-paid-media site.

### What is ready for paid media right now

- GA4 is receiving behavioral events from all public pages and the portal
- The three primary conversions are backend-confirmed (no false positives on button click)
- Calculator funnel is fully tracked (`calculator_start` → `calculator_query` → `calculator_result`)
- Registration funnel is fully tracked with step granularity
- Portal activation events exist (`invoice_upload_success`, `portal_section_view`)
- All tracked parameters are PII-free and validated against a 24-dimension registry
- GTM triggers and tags are documented in `docs/gtm-container-export.json`

### Biggest measurement gaps before scaling paid media

1. **No Meta Pixel** — zero pixel code exists anywhere in the codebase. All Meta audience building, conversion tracking, and CAPI integration requires a full Pixel installation before any Meta Ads spend.
2. **No Google Ads conversion tags** — no `gtag('event', 'conversion', {...})` or GTM Google Ads Conversion tags exist. Campaigns cannot optimize without them.
3. **No UTM capture or persistence** — UTM parameters arriving with paid traffic are not stored in `sessionStorage`/`localStorage`, not attached to conversion events, and not forwarded to GA4 custom parameters. Attribution is blind.
4. **No cookie consent banner** — GTM/GA4 fire on page load for all users regardless of consent. This is acceptable in Costa Rica today but would be a legal and platform risk if EU/EEA users are ever targeted.
5. **No quality events past activation** — `first_package_registered`, `first_package_delivered`, and `repeat_package` do not exist. Paid media optimization can only reach registration/quote quality, not actual customer quality.
6. **GTM container export may be out of sync** — the JSON export in `docs/gtm-container-export.json` reflects a planned state, not necessarily the live published container. The live GTM workspace must be independently verified before any paid media goes live.

### Conversion events safe to use NOW

- `signup_success` — fires only on `StatusResult === 'OK'` from the CRBOX API
- `quote_request_submit_success` — fires only on `res.ok && data.ok && data.id` from `/api/solicitudes`
- `contact_form_submit_success` — fires only on `data.ok === true` from `/api/consultas`
- `calculator_result` — reliable client-side signal, appropriate as a micro-conversion / smart bidding signal (not a primary conversion)

### Conversion events NOT safe for optimization yet

- `whatsapp_click` — click fires but does not confirm the user actually messaged or converted. Using as an optimization goal will drive clicks to the WhatsApp button from low-quality users.
- `calculator_start` — top-of-funnel signal only; optimizing for it will attract window shoppers
- Any portal event — portal events require a logged-in session; they are not accessible to ad platforms for optimization without CAPI

### What must be fixed before meaningful budget is invested

| Priority | Item |
|----------|------|
| P0 | Install Meta Pixel on all 6 public pages via GTM |
| P0 | Create Google Ads conversion actions in GTM for `signup_success` and `quote_request_submit_success` |
| P0 | Implement UTM capture and persistence in `js/analytics.js` |
| P1 | Verify live GTM container matches the JSON export — run GTM Preview against production |
| P1 | Confirm GA4 is receiving all three primary conversions in DebugView |
| P1 | Define campaign naming convention before any UTM-tagged campaigns go live |

---

## 2. Measurement Philosophy and Business Logic

### CRBOX is a service business, not a lead-gen funnel

Shipping customers have ongoing relationships. They register, they ship packages repeatedly, they upload invoices. Optimizing for clicks or cheap leads trains the ad algorithm to find users who click but never ship. The measurement system must evolve alongside the business from visitor → lead → customer → repeat customer.

### Why registration_success is useful but incomplete

`signup_success` confirms a real user created a real CRBOX account (backend-confirmed via `StatusResult === 'OK'`). It is the strongest signal currently available from the client side. However, many registrations never result in a shipment — users may register out of curiosity, encounter address or ID friction, or never use the locker. Optimizing only for `signup_success` could yield campaigns that find people who register but never ship, especially if the algorithm finds a shortcut audience profile.

**Recommended evolution:** Use `signup_success` as the primary acquisition conversion for the first 30–60 days. Then layer in `invoice_upload_success` and eventually `first_package_registered` (requires backend integration) as supplemental quality signals.

### Why calculator_complete is a useful but risky optimization signal

`calculator_result` is a strong intent signal — a user who completed a cost calculation clearly has shipping intent. However, the result depends on what price they see. If the calculated price is higher than they expected, they bounce. This is normal. Optimizing for `calculator_result` risks attracting users who run calculations but are ultimately price-sensitive and never convert to registration. Use it as a secondary bidding signal or a Smart Bidding signal, not as the primary conversion for Budget optimization.

### Why WhatsApp clicks can be useful but risky

WhatsApp click volume tells you how many people had enough intent to want to talk to a human. But click ≠ conversation ≠ sale. A campaign optimized for WhatsApp clicks will buy the cheapest possible click — not the most likely sale. WhatsApp data belongs in behavioral analysis and remarketing audience building, not in campaign conversion optimization.

### Why invoice_upload_success, first_package_registered, and repeat_package are the real signals

- `invoice_upload_success` — confirms the user is an active customer in the middle of a real shipment workflow. This is post-registration activation.
- `first_package_registered` — confirms the CRBOX system has a real package linked to this user (requires backend event). This is the moment the relationship becomes commercially active.
- `first_package_delivered` — confirms successful end-to-end service delivery. The highest quality signal. If you can send this to Google Ads or Meta, campaigns can optimize toward customers who actually received packages.
- `repeat_package` — the strongest retention signal. A user who ships more than once is a high-lifetime-value customer. Campaigns optimized for repeat behavior find similar audiences.

### How measurement should evolve

```
Phase 1 (now):      registration_success + quote_submit → acquisition optimization
Phase 2 (30-60d):   + invoice_upload_success → activation quality layer
Phase 3 (60-120d):  + first_package_registered/delivered (backend) → quality optimization
Phase 4 (6mo+):     + repeat_package, LTV signals → value-based bidding
```

### Why paid media should move from soft to quality conversions over time

Starting with soft conversions (`calculator_result`, `whatsapp_click`) allows the ad algorithm to learn quickly. But the algorithm only gets smarter if you progressively tell it what the business actually values. The plan must include a migration path from soft signals to quality signals. Every campaign that runs for 3+ months without migrating toward a quality conversion wastes budget finding users who look like registrations but behave like visitors.

---

## 3. Current Tracking Findings

### GA4

| Item | Status |
|------|--------|
| GA4 Measurement ID | **G-B5BPHFRR18** — confirmed in GTM container export |
| GA4 installed | **Yes** — via GTM, not via direct `gtag.js` snippet |
| GA4 receiving events | **Presumed yes** — GTM container is live; actual live verification required in DebugView |
| Key events marked | `signup_success`, `quote_request_submit_success`, `contact_form_submit_success` (per `analytics-taxonomy.md`) |
| 24 custom dimensions registered | **Documented** — must be verified in GA4 Admin → Custom Definitions |
| BigQuery export enabled | **Unknown** — not confirmed; required for Looker Studio and advanced reporting |
| Data retention set to 14 months | **Unknown** — default is 2 months; must be changed in GA4 Admin → Data Settings |

### GTM

| Item | Status |
|------|--------|
| GTM container ID | **GTM-5WD8N53F** — confirmed in `gtm.config.json` and all 6 public HTML pages |
| GTM snippet | Present on all 6 public pages (head + noscript body) — confirmed by file audit |
| Portal pages | GTM snippet present on all portal pages (`dashboard.html`, `mis-paquetes.html`, `mi-cuenta.html`, `mis-facturas.html`, `mis-solicitudes.html`, `solicitud.html`, `login.html`, `afiliate.html`, `cotizar.html`) |
| Container export | `docs/gtm-container-export.json` — v3, 25 DLV variables, 35 CE triggers, 36 tags |
| Live container state | **Unknown** — JSON export is a plan artifact; live GTM workspace must be verified via Preview mode |

### Google Ads

| Item | Status |
|------|--------|
| Google Ads conversion tag | **Not found** — no `gtag('event', 'conversion')` calls in any HTML or JS file |
| Google Ads Linker | **Not found** |
| Remarketing tag | **Not found** |
| Status | **Not ads-ready** — Google Ads integration requires new tags and conversion actions before any campaign can optimize |

### Meta Pixel

| Item | Status |
|------|--------|
| Meta Pixel script | **Not found** — no `fbq(...)` calls, no `connect.facebook.net` references in any file |
| Meta CAPI | **Not configured** |
| Status | **No Meta tracking whatsoever** — full Pixel installation required before any Meta spend |

### Centralized analytics utility

| Item | Status |
|------|--------|
| `js/analytics.js` | **Present and mature** — `CRBOX.track` namespace, 30+ event methods, auto-injects 4 standard params on every push, bound on `DOMContentLoaded` |
| Event delivery mechanism | `window.dataLayer.push(...)` — GTM intercepts and forwards to GA4 |
| Direct GA4 calls | None — all events go through GTM |
| PII filter | **Enforced by convention** — no PII field ever appears in any `dataLayer.push` call; verified in `docs/tracking-plan.md` |

### Events currently tracked (confirmed in `js/analytics.js` + tracking-plan.md)

**Public site:**
`cta_click`, `whatsapp_click`, `phone_click`, `email_click`, `outbound_click`, `nav_click`, `service_card_click`, `contact_form_submit_success`, `form_start`, `form_abandon`, `faq_engage`, `scroll_depth`, `section_visible`, `calculator_start`, `calculator_tab_switch`, `calculator_query`, `calculator_result`

**Registration / auth:**
`signup_start`, `signup_step`, `signup_success`, `signup_error`, `account_type_select`, `login_start`, `login_success`, `login_error`, `logout`, `session_expired`

**Portal:**
`portal_section_view`, `package_search`, `package_search_result`, `package_detail_view`, `package_filter_use`, `invoice_upload_start`, `invoice_upload_success`, `invoice_upload_error`, `invoice_filter_use`, `quote_request_start`, `quote_request_submit_success`, `profile_edit_start`, `profile_update_success`, `profile_update_error`, `api_error`, `chat_open`, `chat_message_sent`

**Total: 37 distinct event names** — comprehensive coverage of the current user journey.

### Meaningful actions NOT currently tracked

| Missing event | Why it matters | Barrier |
|---------------|---------------|---------|
| `first_package_registered` | Strongest quality signal after signup | Requires backend webhook or API response flag |
| `first_package_arrived_miami` | Confirms package is in transit | Requires backend webhook |
| `first_package_delivered` | End-to-end service success | Requires backend webhook |
| `repeat_package` | Retention/LTV signal | Requires backend webhook or CRM flag |
| UTM parameter capture | Attribution is currently blind | No code — requires `js/analytics.js` addition |
| Meta Pixel events | Required for any Meta campaign | No Pixel installed |
| Google Ads conversion events | Required for any Google Ads optimization | No tag configured |

### Event quality assessment

| Finding | Assessment |
|---------|-----------|
| Duplicate events | **None found** — all events fire from `CRBOX.track.*` methods in `js/analytics.js`; no inline `dataLayer.push` calls found in HTML files |
| False positives on success events | **None** — `signup_success`, `quote_request_submit_success`, `contact_form_submit_success`, `invoice_upload_success` all fire on confirmed API success responses |
| Button-click-only conversions | **None** — all conversion events are backend-gated |
| Form success/error state tracking | **Present** — `signup_error`, `login_error`, `invoice_upload_error`, `profile_update_error` all use categorized `error_category` dimension |

### UTM capture

| Item | Status |
|------|--------|
| UTM parameters captured | **No** |
| UTM persistence during session | **No** |
| UTM attached to conversion events | **No** |
| Attribution clarity | **Blind** — all conversions are attributed to the most recent GA4 channel, which may not match the paid campaign that drove the user |

### Privacy / PII risk

- **No PII found in any event payload** — confirmed by audit of all 24 registered custom dimensions and all `CRBOX.track.*` method implementations
- `error_category` is always a pre-defined slug, never a raw API message
- No email, name, phone, ID number, exact monetary value, tracking number, or package ID enters the dataLayer
- Minor log-exposure risk: `server.py` logs the full email on upstream CRBOX API errors (findings C-14 and C-15 in `docs/auth-registration-password-recovery-audit.md`)

### Ads-readiness assessment

| Platform | Readiness |
|----------|-----------|
| GA4 reporting | **Partially ready** — events flowing, but UTM gap and BigQuery export unverified |
| Google Ads optimization | **Not ready** — no conversion tags, no remarketing tag |
| Meta Pixel tracking | **Not ready** — no Pixel |
| Meta CAPI | **Not ready** |
| Looker Studio | **Not ready** — requires BigQuery export enabled and data retention set |

---

## 4. Funnel and Measurement Stages

### Stage A — Awareness / Engagement

**What it means:** User arrived and is exploring. Has not shown intent to purchase or register.

**Events belonging here:**
- `page_view` (GA4 automatic)
- `scroll_depth` (25%, 50%, 75%, 90%)
- `section_visible` (content sections entering viewport)
- `nav_click`
- `service_card_click`
- `faq_engage`
- `outbound_click`

**For analysis:** Identify which pages and sections hold attention. Scroll depth distribution. Section visibility rates on tarifas and como-funciona.

**For optimization:** None. These are too broad to bid toward.

**Should NOT be used for optimization:** Scroll depth will attract users who scroll, not users who ship.

---

### Stage B — Education / Consideration

**What it means:** User is actively learning about CRBOX's service — reading rates, understanding the process, comparing shipping modes.

**Events belonging here:**
- `calculator_start`
- `calculator_tab_switch`
- `cta_click` (to tarifas, calculadora, como-funciona pages)
- `portal_section_view` (for logged-in users exploring)

**For analysis:** Calculator funnel entry rates by mode (aereo vs maritimo). Which CTA locations drive the most calculator interactions.

**For optimization:** `calculator_start` can be used as a Smart Bidding signal (not primary conversion). Represents declared interest in pricing.

**Should NOT be used for optimization as primary:** Too many users start calculators and never convert.

---

### Stage C — Intent

**What it means:** User has completed a meaningful intent action — ran a calculation, started a quote, clicked WhatsApp, or visited the affiliate page.

**Events belonging here:**
- `calculator_result` — completed a real cost calculation
- `calculator_query` — submitted inputs for calculation
- `whatsapp_click` — chose to contact directly
- `phone_click` — chose to call
- `quote_request_start` — entered the quote funnel
- `cta_click` (cta_id: `afiliate_cta`) — clicked to register

**For analysis:** Conversion rate from intent signals to acquisition. Calculator-to-registration funnel drop-off. WhatsApp click volume by page and section.

**For optimization:** `calculator_result` is appropriate as a secondary Smart Bidding signal. `quote_request_start` can be used as a micro-conversion signal. `whatsapp_click` only for audience building/remarketing — not for conversion bidding.

---

### Stage D — Acquisition

**What it means:** User completed a lead or registration action that is confirmed by the backend.

**Events belonging here:**
- `signup_success` — primary acquisition conversion
- `quote_request_submit_success` — commercial intent confirmed
- `contact_form_submit_success` — lead capture via contact form
- `signup_start`, `signup_step` (funnel micro-steps)
- `signup_error` (failure signal)

**For analysis:** Registration funnel drop-off by step, by account type. Quote submission volume by service type. Contact form conversion rate.

**For optimization:** `signup_success` and `quote_request_submit_success` are the primary conversions for all paid media in Phase 1. Use both but weight `signup_success` as the higher-value signal.

---

### Stage E — Activation

**What it means:** User logged in and performed a real portal action — uploaded an invoice, tracked a package, interacted with their account. This is post-acquisition engagement.

**Events belonging here:**
- `login_success`
- `portal_section_view`
- `invoice_upload_start`, `invoice_upload_success`, `invoice_upload_error`
- `package_search`, `package_search_result`, `package_detail_view`
- `package_filter_use`
- `profile_update_success`
- `quote_request_start`, `quote_request_submit_success` (for logged-in users)

**For analysis:** Activation rate (what % of registered users upload an invoice within 7 days). Portal engagement depth. Invoice upload success rate.

**For optimization:** `invoice_upload_success` should be configured as a secondary conversion once volume is sufficient. Not appropriate for Google Ads bidding directly (portal action, not reachable pre-registration), but excellent for Meta CAPI and lifecycle automation.

---

### Stage F — Quality / Revenue Proxy

**What it means:** User has a real package in the system or has completed a repeat transaction. This is the signal that confirms business value.

**Events belonging here (future — require backend integration):**
- `first_package_registered` — package entered CRBOX system
- `first_package_arrived_miami` — package is physically in Miami warehouse
- `first_package_delivered` — end-to-end success
- `repeat_package` — second+ shipment

**For analysis:** Time-to-first-package after registration. Delivery success rate. Repeat customer rate.

**For optimization (future):** These are the signals that enable value-based bidding. Import as offline conversions to Google Ads and Meta once backend webhooks are in place.

---

## 5. CRBOX Measurement Map v1

> Column definitions: **Stage** = funnel stage (A–F). **Trigger type** = how the event fires. **Opt. readiness** = `ready` / `caution` / `future`. **Req. data** = `frontend` / `backend` / `CRM`.

### Public site events

| Event name | Stage | User action | Page | Trigger type | GA4 event | Meta event | Google Ads | Key parameters | Priority | Opt. readiness | Req. data | Status | Dedup | PII risk |
|------------|-------|-------------|------|-------------|-----------|-----------|-----------|----------------|----------|---------------|-----------|--------|-------|---------|
| `page_view` | A | Page loads | All | Page load (GA4 auto) | `page_view` | `PageView` | No | `page_type`, `page_name`, `page_path` | Analysis | — | Frontend | Live | GA4 auto-deduplicates | None |
| `scroll_depth` | A | Scrolls past 25/50/75/90% | All | Scroll listener, once per milestone | `scroll_depth` | No | No | `depth_percent` | Analysis | No | Frontend | Live | Fires once per milestone per load | None |
| `section_visible` | A | Section enters viewport | Public pages | IntersectionObserver, once per section | `section_visible` | No | No | `section_name` | Analysis | No | Frontend | Live | Fires once per section per load | None |
| `nav_click` | A | Clicks header nav link | All | Click | `nav_click` | No | No | `link_context`, `destination_type` | Analysis | No | Frontend | Live | None needed | None |
| `service_card_click` | A | Clicks service card | servicios.html | Click on `.service-card` | `service_card_click` | No | No | `service_type` | Analysis | No | Frontend | Live | None needed | None |
| `faq_engage` | A | Opens FAQ item | como-funciona.html, tarifas.html | Click on `.faq-item` | `faq_engage` | No | No | `section_name` | Analysis | No | Frontend | Live | None needed | None |
| `outbound_click` | A | Clicks external link | All | Click on outbound `<a>` | `outbound_click` | No | No | `link_domain`, `link_context` | Analysis | No | Frontend | Live | None needed | None |
| `email_click` | A | Clicks email link | All | Click on `mailto:` | `email_click` | No | No | `link_context` | Analysis | No | Frontend | Live | None needed | None |
| `cta_click` (afiliate_cta) | C | Clicks "Afíliate" CTA | All public | Click on `[data-cta]` with afiliate_cta | `cta_click` | `InitiateCheckout` | Secondary | `cta_id`, `cta_location`, `destination_type` | Secondary | Caution | Frontend | Live | None needed | None |
| `cta_click` (calculadora_cta) | B | Clicks calculator CTA | All public | Click on `[data-cta]` with calculadora_cta | `cta_click` | No | No | `cta_id`, `cta_location`, `destination_type` | Analysis | No | Frontend | Live | None needed | None |
| `whatsapp_click` | C | Clicks WhatsApp button | All | Click on `a[href^="https://wa.me"]` | `whatsapp_click` | `Contact` | No (audience only) | `cta_location`, `link_domain` | Secondary | Caution | Frontend | Live | None needed | None |
| `phone_click` | C | Clicks phone link | All | Click on `a[href^="tel:"]` | `phone_click` | `Contact` | No | `link_context` | Secondary | No | Frontend | Live | None needed | None |
| `calculator_start` | B | First input in calculator | calculadora.html, cotizar.html | Focus/input on weight/value field | `calculator_start` | `ViewContent` | Secondary signal | `shipping_mode` | Secondary | Caution | Frontend | Live | Fires once per session | None |
| `calculator_tab_switch` | B | Switches aereo/maritimo tab | calculadora.html | Tab button click | `calculator_tab_switch` | No | No | `shipping_mode` | Analysis | No | Frontend | Live | None needed | None |
| `calculator_query` | C | Submits calculation inputs | calculadora.html | Calculator submit action | `calculator_query` | No | No | `shipping_mode` | Secondary | No | Frontend | Live | None needed | None |
| `calculator_result` | C | Sees a cost result | calculadora.html, cotizar.html | Result render | `calculator_result` | `ViewContent` | Secondary smart bidding | `shipping_mode`, `weight_bucket`, `value_bucket`, `destination_country` | Secondary | Caution | Frontend | Live | None needed | None |
| `form_start` | C | First field interaction in form | contacto.html | First `input`/`change` in tracked form | `form_start` | No | No | `form_name` | Analysis | No | Frontend | Live | Session flag per form | None |
| `form_abandon` | C | Leaves page after starting form | contacto.html | Page unload after form_start | `form_abandon` | No | No | `form_name` | Analysis | No | Frontend | Live | Best-effort only | None |
| `contact_form_submit_success` | D | Contact form confirmed sent | contacto.html | `POST /api/consultas` → `data.ok === true` | `contact_form_submit_success` | `Lead` | Primary | `form_name` | Primary | Ready | Backend API response | Live | API success gate prevents reload dupe | None |

### Registration / auth events

| Event name | Stage | User action | Page | Trigger type | GA4 event | Meta event | Google Ads | Key parameters | Priority | Opt. readiness | Req. data | Status | Dedup | PII risk |
|------------|-------|-------------|------|-------------|-----------|-----------|-----------|----------------|----------|---------------|-----------|--------|-------|---------|
| `account_type_select` | D | Clicks personal / business tab | afiliate.html | Tab button click | `account_type_select` | No | No | `account_type` | Analysis | No | Frontend | Live | None needed | None |
| `signup_start` | D | First field input in reg form | afiliate.html | First `input`/`change` | `signup_start` | `InitiateCheckout` | Secondary | — | Secondary | Caution | Frontend | Live | Fires once per form per load | None |
| `signup_step` | D | Advances registration step | afiliate.html | "Siguiente" button click | `signup_step` | No | No | `step_name` | Analysis | No | Frontend | Live | Session step guard | None |
| `signup_success` | D | Registration confirmed | afiliate.html | `doRegister()` → `StatusResult === 'OK'` | `signup_success` | `CompleteRegistration` | **Primary** | `account_type` | **Primary** | **Ready** | Backend API response | Live | API success gate | None |
| `signup_error` | D | Registration failed | afiliate.html | `doRegister()` rejects or error response | `signup_error` | No | No | `error_category` | Analysis | No | Frontend | Live | None needed | None |
| `login_start` | E | Login form submitted | login.html | `doLogin()` called | `login_start` | No | No | — | Analysis | No | Frontend | Live | None needed | None |
| `login_success` | E | Login token received | login.html | `doLogin()` resolves with token | `login_success` | No | No | — | Analysis | No | Backend API response | Live | Token-gate prevents reload | None |
| `login_error` | E | Login failed | login.html | `doLogin()` rejects | `login_error` | No | No | `error_category` | Analysis | No | Frontend | Live | None needed | None |
| `logout` | E | User explicitly logs out | All portal | `logout()` called before `clearToken()` | `logout` | No | No | — | Analysis | No | Frontend | Live | Session ends | None |
| `session_expired` | E | Token invalid / 401 received | All portal | 401/403 API response or missing token | `session_expired` | No | No | — | Analysis | No | Frontend | Live | Once per expiry event | None |

### Portal events

| Event name | Stage | User action | Page | Trigger type | GA4 event | Meta event | Google Ads | Key parameters | Priority | Opt. readiness | Req. data | Status | Dedup | PII risk |
|------------|-------|-------------|------|-------------|-----------|-----------|-----------|----------------|----------|---------------|-----------|--------|-------|---------|
| `portal_section_view` | E | Navigates portal section | All portal | DOMContentLoaded + tab switch | `portal_section_view` | No | No | `section_name`, `page_name`, `page_type`, `cta_location` | Analysis | No | Frontend | Live | One auto-fire per page load | None |
| `package_search` | E | Types search query | mis-paquetes.html | Search input, debounced 600ms | `package_search` | No | No | — | Analysis | No | Frontend | Live | Debounced | None |
| `package_search_result` | E | Search results rendered | mis-paquetes.html | `_loadPackages()` with active filter | `package_search_result` | No | No | `status_category` | Analysis | No | Frontend | Live | None needed | None |
| `package_detail_view` | E | Opens package detail modal | mis-paquetes.html | Row expand click | `package_detail_view` | No | No | — | Analysis | No | Frontend | Live | None needed | None |
| `package_filter_use` | E | Changes package filter | mis-paquetes.html | `change` event on status/date/sort | `package_filter_use` | No | No | `filter_type` | Analysis | No | Frontend | Live | None needed | None |
| `invoice_upload_start` | E | Begins invoice upload | mis-paquetes.html | Form passes client validation | `invoice_upload_start` | No | No | `file_type` | Analysis | No | Frontend | Live | None needed | None |
| `invoice_upload_success` | E | Invoice upload + bill confirmed | mis-paquetes.html | Both API write steps succeed | `invoice_upload_success` | `Purchase` (future CAPI) | No (portal only) | — | Secondary | Caution | Backend API response | Live | API success gate | None |
| `invoice_upload_error` | E | Invoice upload failed | mis-paquetes.html | Any step fails | `invoice_upload_error` | No | No | `error_category` | Analysis | No | Frontend | Live | None needed | None |
| `invoice_filter_use` | E | Applies invoice date filter | mis-facturas.html | "Buscar Facturas" / Enter | `invoice_filter_use` | No | No | `filter_type` | Analysis | No | Frontend | Live | None needed | None |
| `quote_request_start` | C | First interaction in quote form | cotizar.html | First input/change/focus, once per session | `quote_request_start` | `InitiateCheckout` | Secondary | `service_type` | Secondary | Caution | Frontend | Live | `sessionStorage` flag | None |
| `quote_request_submit_success` | D | Quote submitted and confirmed | cotizar.html | `POST /api/solicitudes` → `res.ok && data.ok && data.id` | `quote_request_submit_success` | `Lead` | **Primary** | `service_type`, `destination_country` | **Primary** | **Ready** | Backend API response | Live | API success + `data.id` gate | None |
| `profile_edit_start` | E | Edits profile section | mi-cuenta.html | First input/change in section | `profile_edit_start` | No | No | `section_name`, `portal_area` | Analysis | No | Frontend | Live | Once-per-section guard | None |
| `profile_update_success` | E | Profile save confirmed | mi-cuenta.html | `updateProfile()` resolves | `profile_update_success` | No | No | `section_name`, `portal_area` | Analysis | No | Backend API response | Live | API success gate | None |
| `profile_update_error` | E | Profile save failed | mi-cuenta.html | `updateProfile()` rejects | `profile_update_error` | No | No | `section_name`, `portal_area`, `error_category` | Analysis | No | Frontend | Live | None needed | None |
| `api_error` | E | Main portal data load failed | dashboard, mis-paquetes, mis-facturas | `.catch()` in main API load | `api_error` | No | No | `error_category` | Analysis | No | Frontend | Live | None needed | None |
| `chat_open` | A | Opens chat panel | All pages with chat-panel.js | First chat toggle per session | `chat_open` | No | No | — | Analysis | No | Frontend | Live | Once per session | None |
| `chat_message_sent` | A | Sends chat message | All pages with chat-panel.js | Message submit | `chat_message_sent` | No | No | `message_type` | Analysis | No | Frontend | Live | None needed | None |

### Future events (require backend integration)

| Event name | Stage | Description | Req. data | Platform | Priority |
|------------|-------|-------------|-----------|---------|---------|
| `first_package_registered` | F | User's first real package in CRBOX system | Backend webhook / CRM | GA4 (offline import), Meta CAPI, Google Ads offline | High — Phase 3 |
| `first_package_arrived_miami` | F | Package physically arrived in Miami warehouse | Backend webhook | GA4, lifecycle trigger | Medium — Phase 3 |
| `first_package_delivered` | F | Package delivered to customer in Costa Rica | Backend webhook / CRM | GA4 (offline), Meta CAPI, Google Ads offline | High — Phase 3 |
| `repeat_package` | F | User's second+ package registered | Backend webhook / CRM | GA4 (offline), Meta CAPI, value-based bidding | High — Phase 4 |

---

## 6. Conversion Priority Model

### A. Primary conversions for initial paid media

#### `signup_success`

- **Why it matters:** The strongest currently-available, backend-confirmed acquisition signal. Fires only when CRBOX API returns `StatusResult === 'OK'`. No false positives.
- **Risk:** Registered users may never ship. The algorithm will find users who register, not necessarily users who become active customers.
- **Google Ads:** Use as primary conversion action. Set as account-default goal. Use Target CPA bidding once you have 30+ conversions per 30-day window.
- **Meta:** Send as `CompleteRegistration` standard event via Pixel. Separate `custom_event_type: registration_success` for CAPI later.
- **When to downgrade:** When `invoice_upload_success` volume is sufficient (30+ per 30 days), shift primary weight to activation; keep `signup_success` as a secondary signal.
- **Future quality supplement:** `first_package_registered` (backend webhook required).

#### `quote_request_submit_success`

- **Why it matters:** Backend-confirmed intent to purchase a shipping service. The user filled out a detailed form specifying product, value, and destination — strong commercial intent.
- **Risk:** Users who submit quotes but don't register afterward may inflate conversion counts without producing business value. Quote submissions are also low-volume compared to registrations.
- **Google Ads:** Use as co-primary conversion alongside `signup_success`. Assign higher value weight if quote-to-registration conversion rate is confirmed. Account-default goal.
- **Meta:** `Lead` standard event. Strong signal for lookalike audiences.
- **When to downgrade:** Only if quote submissions prove to be unrelated to shipment activity (verify by comparing quote submitters to first-package users in CRM).
- **Future quality supplement:** Track whether quote submitters become `first_package_registered` users.

#### `contact_form_submit_success`

- **Why it matters:** Backend-confirmed lead generation. User reached out with a specific inquiry. Lower-intent than a quote but higher-intent than a calculator run.
- **Risk:** Contact form submissions include a wide range of intent — from genuine shipping leads to general questions, partnership inquiries, and complaints. Not all are acquisition-quality.
- **Google Ads:** Use as secondary conversion (not account-default). Useful as a supplemental signal.
- **Meta:** `Lead` standard event. Useful for audience segmentation.
- **When to downgrade:** If analysis shows contact form submitters have significantly lower downstream activation rates than registration, reduce its weight in bidding.
- **Future quality supplement:** Add a `subject` category dimension that anonymously distinguishes shipping intent from other inquiry types (without capturing raw text).

---

### B. Secondary conversions

#### `whatsapp_click`

- **Why useful:** Indicates intent strong enough to want a direct conversation. High-intent users prefer WhatsApp in the Costa Rica market. Volume is trackable as a behavioral KPI.
- **Why NOT the main optimization goal:** A click does not confirm a conversation or a sale. Optimizing for clicks drives low-quality traffic toward the button.
- **Use in reporting:** Track weekly volume and trend. Track by `cta_location` to identify which page sections drive the most intent.
- **Use in remarketing:** Build a `whatsapp_clickers` audience in GA4 → use for remarketing campaigns (not conversion optimization).

#### `signup_start`

- **Why useful:** Leading indicator for registration funnel health. If `signup_start` volumes drop, registration will follow 2–3 days later.
- **Why NOT the main goal:** Many users start registration and abandon. Optimizing for `signup_start` trains the algorithm on starters, not completers.
- **Use:** Funnel analysis. Top-of-funnel comparison across channels.

#### `calculator_start` / `calculator_result`

- **Why useful:** Calculator users have explicit shipping intent — they asked "how much would this cost?"
- **Why NOT the main goal:** Price sensitivity can cause many calculator users to abandon without registering.
- **Use `calculator_result`:** As a Smart Bidding secondary signal in Google Ads (set in conversion goals with low value). As a `ViewContent` Meta Pixel event for remarketing.

#### `affiliate_page_view` (page_view on afiliate.html)

- **Why useful:** Visiting the registration page is strong intent-to-register signal.
- **Why NOT the main goal:** A page_view has zero friction — any traffic strategy that drives landing on the affiliate page will qualify.
- **Use:** Funnel step tracking. Audience building for remarketing.

#### `rates_page_view` (page_view on tarifas.html)

- **Why useful:** Users comparing pricing are in consideration stage.
- **Use:** Behavioral analysis. Audience building.

---

### C. Future quality conversions

#### `invoice_upload_success`

- **Backend data required:** Already confirmed via client-side API response (`saveBill` success in `mis-paquetes.html`). Both upload step and CRBOX bill creation must succeed. This event **already fires** in the current codebase — it is not a future implementation gap.
- **Why it's a stronger signal:** A user who uploaded an invoice is actively buying a product to ship through CRBOX. This is the most concrete activation signal currently available.
- **Google Ads:** Cannot be used directly as a standard online conversion (requires the user to already be in the portal). Import via offline conversion upload linked to the session's GCLID (requires GCLID capture in the portal session).
- **Meta:** Suitable for CAPI `Purchase` event once CAPI is configured. Do not send via Pixel (portal is behind auth).
- **Lifecycle:** Trigger post-activation email sequence. Trigger n8n workflow to check for first package status.

#### `first_package_registered`

- **Backend data required:** Webhook from CRBOX backend when a package is first linked to the user's casillero. Not currently available client-side.
- **Why it's a stronger signal:** Confirms the user completed the entire import flow — registration → purchase → shipping label → package receipt in Miami.
- **Google Ads:** Import as offline conversion linked to GCLID stored at registration time.
- **Meta:** Import via CAPI as `Purchase` or `CustomEvent`.
- **Lifecycle:** Trigger "your package is on its way" welcome sequence.

#### `first_package_delivered`

- **Backend data required:** Delivery confirmation from CRBOX backend. Highest quality signal.
- **Google Ads:** Ideal offline conversion for value-based bidding. Assign shipping value as conversion value.
- **Meta:** CAPI `Purchase` with value.
- **Lifecycle:** Trigger loyalty/referral campaign.

#### `repeat_package`

- **Backend data required:** Second package confirmed in the CRBOX system for the same user.
- **Why it matters:** Repeat shippers have the highest LTV. Finding more of them with paid media is the ultimate goal.
- **Google Ads:** Use as a separate conversion action with 2× value weight. Feed into value-based bidding.
- **Meta:** CAPI custom event with value. Lookalike audience from repeat_package users.

---

### D. Analysis-only events

**Examples:** `scroll_depth`, `faq_engage`, `nav_click`, `section_visible`, `chat_open`, `chat_message_sent`, `tab_switch`, `service_card_click`

- **For behavioral analysis:** These reveal how users engage with content, what sections they reach, how they navigate. Use in GA4 Explore for CRO decisions.
- **For CRO decisions:** If 80% of users reach the calculator section but only 20% start it, the CTA placement or calculator UX needs work. `section_visible` and `scroll_depth` together reveal this.
- **Why NOT optimization goals:** These events have zero business friction — a scroll is not a commitment. Training ad algorithms on scrollers finds scrollers, not customers.

---

## 7. Event Taxonomy and Naming Convention

### Core rules

1. **Lowercase snake_case** — all characters. No uppercase, no hyphens, no camelCase.
2. **English only** — no Spanish inside event names. Event names are system identifiers, not UX copy.
3. **No dynamic values inside the event name** — use parameters for variable data. `calculator_result` is correct; `calculator_result_aereo_5kg` is wrong.
4. **No PII inside event names** — never an email, name, ID, or user-specific value in the event name string.
5. **Verb-noun or noun-verb structure** — the action should be clear from the name alone.
6. **Use parameters for what, where, how** — the event name is the type; parameters carry the specifics.

### Good event names
```
signup_success         ← verb + noun, backend-confirmed, clear stage
calculator_result      ← noun + noun, describes what happened
invoice_upload_error   ← noun + verb + noun, failure state
portal_section_view    ← noun + noun + verb, portal context
quote_request_submit_success ← longer but unambiguous; preferred over just "quote_submit"
```

### Bad event names
```
RegistrationSuccess    ← PascalCase
registro_exitoso       ← Spanish
signup_success_personal_san_jose_2026  ← dynamic data in name
click                  ← too generic
button_clicked         ← too generic, no business context
formSubmit             ← camelCase
```

### Naming structure by category

| Category | Prefix pattern | Examples |
|----------|---------------|---------|
| CTA events | `cta_` | `cta_click` |
| Calculator events | `calculator_` | `calculator_start`, `calculator_result`, `calculator_tab_switch` |
| Registration events | `signup_` | `signup_start`, `signup_step`, `signup_success`, `signup_error` |
| Auth events | `login_`, `logout`, `session_` | `login_success`, `logout`, `session_expired` |
| Quote events | `quote_request_` | `quote_request_start`, `quote_request_submit_success` |
| Portal navigation | `portal_` | `portal_section_view` |
| Package events | `package_` | `package_search`, `package_detail_view`, `package_filter_use` |
| Invoice events | `invoice_` | `invoice_upload_start`, `invoice_upload_success`, `invoice_filter_use` |
| Contact events | `contact_form_`, `phone_`, `email_`, `whatsapp_` | `contact_form_submit_success`, `whatsapp_click` |
| Profile events | `profile_` | `profile_edit_start`, `profile_update_success` |
| System events | `api_`, `session_` | `api_error`, `session_expired` |
| Lifecycle events (future) | `first_`, `repeat_` | `first_package_registered`, `repeat_package` |
| Engagement | `scroll_`, `section_`, `faq_`, `nav_`, `chat_` | `scroll_depth`, `section_visible`, `chat_open` |

---

## 8. Event Parameter Schema

### Global parameters (auto-injected by `js/analytics.js` on every event)

| Parameter | Type | Values | Privacy | Notes |
|-----------|------|--------|---------|-------|
| `page_path` | string | URL path, e.g. `/calculadora.html` | Safe | No query string or fragment |
| `page_name` | string | Stable slug: `index`, `calculadora`, `mis_paquetes`, etc. | Safe | 17 defined values |
| `page_type` | string | `public_home`, `public_calculator`, `portal`, `portal_packages`, etc. | Safe | 14 defined types |
| `page_path_group` | string | `public`, `portal`, `quote`, `legal`, `utility` | Safe | Group for segmentation |

### Parameters to ADD (UTM — not yet implemented)

| Parameter | Type | Values | Privacy | Source |
|-----------|------|--------|---------|--------|
| `utm_source` | string | `google`, `meta`, `email`, `direct`, etc. | Safe | URL parameter capture |
| `utm_medium` | string | `cpc`, `paid_social`, `email`, `organic` | Safe | URL parameter capture |
| `utm_campaign` | string | Controlled naming convention (see Section 12) | Safe | URL parameter capture |
| `utm_content` | string | Creative ID or ad label | Safe | URL parameter capture |
| `utm_term` | string | Search keyword (Google Ads auto-tag) | Safe | URL parameter capture |
| `user_status` | string | `anonymous`, `logged_in`, `new_session` | Safe | From `localStorage` check |

### CTA parameters

| Parameter | Type | Values | Privacy |
|-----------|------|--------|---------|
| `cta_id` | string | `afiliate_cta`, `calculadora_cta`, `whatsapp_float` | Safe |
| `cta_location` | string | `hero`, `nav`, `footer`, `header`, `floating_button`, section id | Safe |
| `destination_type` | string | `internal_page`, `external` | Safe |
| `cta_text` | string | Pre-approved controlled labels only — never raw user text | Safe |

### Calculator parameters

| Parameter | Type | Values | Privacy |
|-----------|------|--------|---------|
| `shipping_mode` | string | `aereo`, `maritimo`, `aereo_consolidado` | Safe |
| `weight_bucket` | string | `lt_1kg`, `1_5kg`, `5_15kg`, `15_30kg`, `gt_30kg` | Safe |
| `value_bucket` | string | `lt_25`, `25_100`, `100_500`, `500_1000`, `gt_1000` | Safe |
| `destination_country` | string | ISO 3166-1 alpha-2, e.g. `CR` | Safe |

### Registration parameters

| Parameter | Type | Values | Privacy |
|-----------|------|--------|---------|
| `account_type` | string | `personal`, `business` | Safe |
| `step_name` | string | `personal_step_1`, `business_step_2`, etc. | Safe |
| `error_category` | string | `duplicate_email`, `duplicate_id`, `validation`, `network`, `unknown` | Safe |

### Quote parameters

| Parameter | Type | Values | Privacy |
|-----------|------|--------|---------|
| `service_type` | string | Normalized service slug: `aereo`, `maritimo` | Safe |
| `destination_country` | string | ISO code | Safe |

### WhatsApp parameters

| Parameter | Type | Values | Privacy |
|-----------|------|--------|---------|
| `cta_location` | string | `floating_button`, section id | Safe |
| `link_domain` | string | `wa.me` (hostname only, never full URL) | Safe |

### Portal / package / invoice parameters

| Parameter | Type | Values | Privacy |
|-----------|------|--------|---------|
| `section_name` | string | `dashboard`, `mis_paquetes`, `packages_in_transit`, etc. | Safe |
| `status_category` | string | `all`, `miami`, `loaded`, `in_transit`, `sjo`, `crbox`, `pending_invoice`, `unknown` | Safe |
| `file_type` | string | `pdf`, `jpg`, `png`, `gif`, `webp`, `unknown` | Safe |
| `filter_type` | string | `status`, `date`, `sort`, `date_range` | Safe |
| `portal_area` | string | `mi_cuenta` | Safe |
| `error_category` | string | `upload_failed`, `bill_creation_failed`, `network`, `api_error`, `unknown` | Safe |

### Privacy rule (non-negotiable)

> **Never send:** email addresses, phone numbers, names, ID numbers (national/foreign), physical addresses, invoice numbers, tracking numbers, package IDs, casillero IDs, access tokens, session tokens, exact declared values (USD), exact package weights, raw error messages, API response bodies, server log content, or any field that could identify a specific individual.
>
> **Use ranges instead of exact values** for any numeric dimension.
>
> **Use pre-defined slugs** for any dimension derived from user-generated text (service type, form name, section).

---

## 9. Data Contract

### Contract format

Each event defines: required params, optional params, allowed values, data types, example payload, platform eligibility, and PII risk.

---

### `cta_click`

| Field | Value |
|-------|-------|
| **Required params** | `cta_id`, `cta_location`, `destination_type` + 4 global params |
| **Optional params** | `cta_text` (controlled labels only) |
| **Allowed values** | `cta_id`: `afiliate_cta` · `calculadora_cta` · `whatsapp_float` |
| **Source of truth** | `js/analytics.js` → `CRBOX.track.cta_click()` |
| **GA4** | Yes |
| **Meta** | `InitiateCheckout` for afiliate_cta; otherwise no |
| **Google Ads** | No (secondary signal only) |
| **PII risk** | None |

```json
{
  "event": "cta_click",
  "cta_id": "afiliate_cta",
  "cta_location": "hero",
  "destination_type": "internal_page",
  "page_path": "/index.html",
  "page_name": "index",
  "page_type": "public_home",
  "page_path_group": "public"
}
```

---

### `calculator_start`

| Field | Value |
|-------|-------|
| **Required params** | `shipping_mode` + 4 global params |
| **Optional params** | None |
| **Allowed values** | `shipping_mode`: `aereo` · `maritimo` |
| **Source of truth** | `js/analytics.js` → `CRBOX.track.calculator_start()` |
| **GA4** | Yes — micro-conversion |
| **Meta** | `ViewContent` |
| **Google Ads** | Secondary smart bidding signal |
| **PII risk** | None |

```json
{
  "event": "calculator_start",
  "shipping_mode": "aereo",
  "page_path": "/calculadora.html",
  "page_name": "calculadora",
  "page_type": "public_calculator",
  "page_path_group": "public"
}
```

---

### `calculator_result`

| Field | Value |
|-------|-------|
| **Required params** | `shipping_mode`, `weight_bucket`, `value_bucket`, `destination_country` + 4 global params |
| **Optional params** | None |
| **Allowed values** | See Section 8 for bucket definitions |
| **Source of truth** | `js/analytics.js` → `CRBOX.track.calculator_result()` |
| **GA4** | Yes — micro-conversion |
| **Meta** | `ViewContent` |
| **Google Ads** | Secondary smart bidding signal |
| **PII risk** | None — exact values are never sent, only bucket strings |

```json
{
  "event": "calculator_result",
  "shipping_mode": "aereo",
  "weight_bucket": "1_5kg",
  "value_bucket": "100_500",
  "destination_country": "CR",
  "page_path": "/calculadora.html",
  "page_name": "calculadora",
  "page_type": "public_calculator",
  "page_path_group": "public"
}
```

---

### `signup_start`

| Field | Value |
|-------|-------|
| **Required params** | 4 global params only |
| **Optional params** | None |
| **Source of truth** | `js/analytics.js` → `CRBOX.track.signup_start()` |
| **GA4** | Yes |
| **Meta** | `InitiateCheckout` |
| **Google Ads** | Secondary signal only |
| **PII risk** | None |

```json
{
  "event": "signup_start",
  "page_path": "/afiliate.html",
  "page_name": "afiliate",
  "page_type": "public_affiliate",
  "page_path_group": "public"
}
```

---

### `signup_success`

| Field | Value |
|-------|-------|
| **Required params** | `account_type` + 4 global params |
| **Optional params** | None |
| **Trigger condition** | `doRegister()` → CRBOX API returns `StatusResult === 'OK'` |
| **Source of truth** | `afiliate.html` (post-register handler) |
| **GA4** | Yes — **primary conversion** |
| **Meta** | `CompleteRegistration` — **primary conversion** |
| **Google Ads** | **Primary conversion action** |
| **PII risk** | None — `account_type` is `personal` or `business` only |

```json
{
  "event": "signup_success",
  "account_type": "personal",
  "page_path": "/afiliate.html",
  "page_name": "afiliate",
  "page_type": "public_affiliate",
  "page_path_group": "public"
}
```

---

### `quote_request_submit_success`

| Field | Value |
|-------|-------|
| **Required params** | `service_type`, `destination_country` + 4 global params |
| **Optional params** | None |
| **Trigger condition** | `POST /api/solicitudes` → `res.ok && data.ok && data.id` (backend confirms record created) |
| **Source of truth** | `cotizar.html` (form success handler) |
| **GA4** | Yes — **primary conversion** |
| **Meta** | `Lead` — **primary conversion** |
| **Google Ads** | **Primary conversion action** |
| **PII risk** | None — no product description, name, email, or value is sent |

```json
{
  "event": "quote_request_submit_success",
  "service_type": "aereo",
  "destination_country": "CR",
  "page_path": "/cotizar.html",
  "page_name": "cotizar",
  "page_type": "portal_quotes",
  "page_path_group": "quote"
}
```

---

### `whatsapp_click`

| Field | Value |
|-------|-------|
| **Required params** | `cta_location`, `link_domain` + 4 global params |
| **Optional params** | None |
| **Allowed values** | `link_domain`: always `wa.me` |
| **Source of truth** | `js/analytics.js` → `CRBOX.track.whatsapp_click()` |
| **GA4** | Yes — micro-conversion |
| **Meta** | `Contact` — audience building only |
| **Google Ads** | No (audience signal only, do not use for bidding) |
| **PII risk** | None — phone number never captured |

```json
{
  "event": "whatsapp_click",
  "cta_location": "floating_button",
  "link_domain": "wa.me",
  "page_path": "/index.html",
  "page_name": "index",
  "page_type": "public_home",
  "page_path_group": "public"
}
```

---

### `invoice_upload_success`

| Field | Value |
|-------|-------|
| **Required params** | 4 global params only |
| **Optional params** | None |
| **Trigger condition** | Both write steps succeed: file upload to `/upload-invoice` + bill creation via CRBOX `postcreatepurchasebill` API |
| **Source of truth** | `mis-paquetes.html` → `saveBill()` success handler |
| **GA4** | Yes — secondary conversion |
| **Meta** | Future CAPI `Purchase` (not via Pixel — portal is auth-gated) |
| **Google Ads** | Offline conversion import only (requires GCLID capture at registration) |
| **PII risk** | None — no invoice number, package ID, or monetary value is sent |

```json
{
  "event": "invoice_upload_success",
  "page_path": "/mis-paquetes.html",
  "page_name": "mis_paquetes",
  "page_type": "portal_packages",
  "page_path_group": "portal"
}
```

---

## 10. Client-side vs Server-side Tracking Boundary

### Client-side acceptable (fire based on frontend state)

| Event | Justification |
|-------|--------------|
| `page_view` | No success state to confirm — landing = view |
| `cta_click` | Click is the action; destination visit can be tracked separately |
| `calculator_start` / `calculator_tab_switch` | Pure frontend interaction |
| `calculator_result` | Calculation result is computed client-side by `js/calculator-engine.js` |
| `whatsapp_click` / `phone_click` / `email_click` | Click is the measurable unit |
| `faq_engage` / `nav_click` / `scroll_depth` / `section_visible` | Pure engagement |
| `form_start` / `form_abandon` | UI state only |
| `signup_start` / `signup_step` | Funnel step entry |
| `chat_open` / `chat_message_sent` | Frontend-only action |
| `package_search` / `package_filter_use` / `package_detail_view` | Portal navigation |
| `invoice_filter_use` / `profile_edit_start` | Portal navigation |

### Backend-confirmed required (must NOT fire on button click)

| Event | What confirms success | Where it fires | Do NOT trigger on |
|-------|----------------------|---------------|-------------------|
| `signup_success` | `doRegister()` resolves with `StatusResult === 'OK'` from CRBOX API | `afiliate.html` post-register success handler | Form submit click — the API may fail |
| `login_success` | `doLogin()` resolves with a valid access token | `login.html` post-login success handler | Login button click |
| `contact_form_submit_success` | `POST /api/consultas` → `data.ok === true` | `contacto.html` fetch success handler | Submit button click |
| `quote_request_submit_success` | `POST /api/solicitudes` → `res.ok && data.ok && data.id` | `cotizar.html` fetch success handler | Submit button click |
| `invoice_upload_start` | Client-side validation passes | `mis-paquetes.html` validation check | File selection dialog open |
| `invoice_upload_success` | Both upload + bill-creation succeed | `mis-paquetes.html` `saveBill()` success callback | Upload button click |
| `profile_update_success` | `updateProfile()` resolves | `mi-cuenta.html` API success callback | Save button click |
| `api_error` | `.catch()` fires on main data load | Portal page catch blocks | Any recoverable UI state |

### Avoiding duplicate firing on reload / retry

- **Registration:** The CRBOX API rejects duplicate emails/IDs with an error, so a retry will produce `signup_error`, not a second `signup_success`. Safe by design.
- **Quote submit:** The CRBOX backend returns `data.id` (a unique solicitud ID). Gate the `dataLayer.push` on `data.id` existence. Store the ID in `sessionStorage` after firing; check before firing on any retry.
- **Contact form:** The form is reset after successful submission. A reload starts a fresh form. No special guard needed, but the backend deduplicates by email + content if spam protection is in place.
- **Invoice upload:** The backend creates a bill record; a second upload for the same package will create a second record. The UX should prevent accidental double-submission (disable upload button after start). The event fires on API success — each successful upload is a distinct business event.

---

## 11. Deduplication and Event Integrity Plan

### Duplicate page_view prevention

GA4 automatically tracks page_view via the GA4 Configuration tag (fired on All Pages). No manual `page_view` push is needed in `js/analytics.js`. If a manual push is ever added, guard it with a `_pageFired` boolean.

### Duplicate conversion events

| Conversion | Guard mechanism |
|------------|----------------|
| `signup_success` | API response gate — CRBOX API rejects duplicate registrations |
| `quote_request_submit_success` | `sessionStorage` flag `crbox_quote_submitted_<solicitudId>`; check before pushing |
| `contact_form_submit_success` | Form reset on success prevents re-submission without re-filling |
| `invoice_upload_success` | UX: disable upload button during processing; re-enable only on failure |

### Double-firing from inline scripts and centralized utility

**Rule:** Never push to `window.dataLayer` directly from HTML files. All event pushes must go through `CRBOX.track.*` methods in `js/analytics.js`. This is currently enforced by convention in the codebase. Enforce it as a PR review checklist item.

### Success events firing on button click before API success

Currently avoided in all conversion events — verified in the codebase audit. The pattern `async function → await fetch → if success → CRBOX.track.*()` is consistent across all backend-confirmed events.

### WhatsApp click deduplication

No deduplication needed — each intentional click to WhatsApp is a distinct user action. If double-click spam is a concern, a 1-second debounce guard can be added to the click handler.

### Duplicate `quote_request_start` events

Guarded by `sessionStorage` flag `crbox_quote_start_fired`. Only fires once per browser session per `cotizar.html` load.

### Event IDs for future deduplication

For events sent to Meta CAPI in Phase 4, every event must have a unique `event_id` field to enable deduplication between Pixel (client-side) and CAPI (server-side). The format should be: `{event_name}_{userId_hash}_{timestamp_ms}`. No PII. The `userId_hash` can be a one-way hash of the casillero ID (not the email).

### Debug logging

All `CRBOX.track.*` calls log a `[CRBOX.track] event_name {...}` message to the console in non-production environments. In production, the console log should be suppressed. Gate on `window.CRBOX_DEBUG_MODE === true` rather than `NODE_ENV` (which is not available client-side without a build step).

### Safe no-op behavior

The `CRBOX.track` namespace is already designed so that if `window.dataLayer` is unavailable, the push simply fails silently (array push on undefined). This is acceptable. Consider adding: `if (!window.dataLayer) return;` at the top of the `push()` helper to make the no-op explicit and self-documenting.

---

## 12. UTM and Attribution Foundation

### Current gap

UTM parameters are **not captured** anywhere in the current codebase. When a user clicks a paid ad that appends `?utm_source=google&utm_medium=cpc&utm_campaign=shipping_cr`, those parameters are visible in the URL but not stored anywhere, not attached to events, and not forwarded to GA4 as custom parameters. GA4's built-in session source/medium uses its own cookie-based attribution, but custom UTM parameters for campaign-level analysis require explicit capture.

### Recommended UTM naming convention

| Parameter | Rule | Examples |
|-----------|------|---------|
| `utm_source` | Lowercase, the traffic platform | `google`, `meta`, `email`, `organic`, `direct` |
| `utm_medium` | Lowercase, the channel type | `cpc`, `paid_social`, `display`, `video`, `email`, `retargeting` |
| `utm_campaign` | Lowercase snake_case, describes objective + audience | `shipping_cr_acquisition`, `reactivation_inactive_users`, `remarketing_calculator` |
| `utm_content` | Lowercase, creative variant ID | `hero_v1`, `carousel_servicecard_a`, `video_15s_whatsapp` |
| `utm_term` | Keyword (auto-populated by Google Ads via `{keyword}` ValueTrack) | `casillero usa costa rica`, `envios amazon costa rica` |

### How UTMs should be captured

Implement in `js/analytics.js` on page load:

```javascript
// Pseudocode — do not implement yet
function _captureUTMs() {
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const captured = {};
  utmKeys.forEach(k => { if (params.get(k)) captured[k] = params.get(k); });
  if (Object.keys(captured).length > 0) {
    // Store first-touch in localStorage (persist across pages)
    if (!localStorage.getItem('crbox_utm_first')) {
      localStorage.setItem('crbox_utm_first', JSON.stringify(captured));
    }
    // Always overwrite last-touch in sessionStorage
    sessionStorage.setItem('crbox_utm_last', JSON.stringify(captured));
  }
}
```

### How UTMs should persist and attach to conversions

- **First-touch:** Store in `localStorage` on first UTM-bearing visit. Never overwrite.
- **Last-touch:** Store in `sessionStorage`. Overwrite on each new UTM-bearing page load.
- **Attach to conversions:** On every `CRBOX.track.*` call for primary conversions (`signup_success`, `quote_request_submit_success`, `contact_form_submit_success`), read the last-touch UTMs from `sessionStorage` and include them as event parameters.
- **Do not send UTM values that may contain PII** — `utm_term` from search can occasionally contain personal queries. Validate that keyword values are within an expected character set before pushing.

### First-touch vs last-touch

GA4 uses last-touch by default in its standard reports. For paid media, last-touch is usually appropriate. For brand-building analysis, first-touch matters. Store both, attach last-touch to conversion events, and use GA4 Explore's data-driven attribution model for comparison.

### What not to do

- Do not store UTMs in cookies (requires consent in some jurisdictions)
- Do not send UTMs to Meta or Google Ads as event parameters (they have their own attribution systems)
- Do not use UTMs to infer or reconstruct user identity
- Do not expose UTM-captured data on server-side logs

---

## 13. Consent, Privacy, and PII Safety

### Current consent mechanism

**None.** GTM fires on page load for all users without any consent check or gate. No cookie banner exists on any public or portal page.

### Risk assessment

| Jurisdiction | Current risk | Action required |
|-------------|-------------|----------------|
| Costa Rica | Low — Law 8968 (PRODHAB) applies; current analytics do not process PII in events | Review if UTM persistence in localStorage triggers data controller obligations |
| EU/EEA | High — GDPR requires consent before GA4 fires | Do not target EU users in paid media until CMP is in place |
| USA (CCPA) | Low-Medium — GA4 data collection may trigger CCPA if California users are served | Review if CA is in the paid media target geography |

### Recommended approach for Costa Rica-only campaigns

- No consent banner required for the initial campaign launch targeting Costa Rica only
- If UTM data is stored in `localStorage`, verify this does not trigger PRODHAB obligations
- If EU audiences are ever added to campaigns, implement a Consent Mode v2 compatible CMP before any traffic is driven

### Google Consent Mode v2

When a CMP is added in the future:
- Implement GTM Consent Mode with default denied for `analytics_storage` and `ad_storage`
- Use `gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied' })`
- GTM will model conversions for denied users — this is acceptable and recommended

### What must never be sent to analytics platforms

| Data type | Never send to |
|-----------|-------------|
| Email addresses | GA4, Meta, Google Ads, dataLayer, Looker Studio |
| Phone numbers | GA4, Meta, Google Ads, dataLayer |
| Full names | GA4, Meta, Google Ads |
| ID numbers (cédula, passport) | GA4, Meta, Google Ads |
| Casillero / consignee IDs | GA4, Meta, Google Ads |
| Access tokens / session tokens | GA4, Meta, Google Ads |
| Exact USD values (declared, purchase) | GA4 (use buckets) |
| Package tracking numbers | GA4, Meta |
| Invoice numbers / bill IDs | GA4, Meta |
| Raw API error messages | GA4, dataLayer |

### What can be sent as a range or category

| Data | Safe form |
|------|----------|
| Package value | `value_bucket`: `lt_25`, `25_100`, `100_500`, `500_1000`, `gt_1000` |
| Package weight | `weight_bucket`: `lt_1kg`, `1_5kg`, `5_15kg`, `15_30kg`, `gt_30kg` |
| Error type | `error_category`: pre-defined slug only |
| Account type | `personal` or `business` only |
| File type | MIME-normalized extension only: `pdf`, `jpg`, etc. |

### What can be sent as anonymous state

| Data | Safe form |
|------|----------|
| Login state | `user_status`: `anonymous`, `logged_in` |
| Registration step | `step_name`: `personal_step_1` (no user data) |
| Portal section | `section_name`: controlled slug only |

### What should stay backend-only

- CRBOX casillero ID
- CRBOX bearer token
- Package API responses
- Invoice file content
- User profile data (address, birth date, contact info)

### PII verification checklist

Before any new event is added to `js/analytics.js`:
- [ ] Does the event name contain any user data? (It should not — event names are static)
- [ ] Are all parameter values pulled from a pre-defined allowed list, not from user input?
- [ ] If a value comes from an API response, is it a system slug or a user-provided field?
- [ ] Does the parameter value have bounded cardinality? (GA4 custom dimensions degrade at >500 unique values)

---

## 14. Page-by-page Tracking Plan

### index.html (Homepage)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: public_home` | 1 | Yes | Yes (PageView) | Yes (remarketing) | None |
| `cta_click` (afiliate_cta) | Click hero/mid/footer CTA | `cta_id`, `cta_location` | 1 | Yes | InitiateCheckout | Secondary | None |
| `whatsapp_click` | Click floating WhatsApp | `cta_location: floating_button` | 1 | Yes | Contact | No | None |
| `scroll_depth` | 25/50/75/90% scroll | `depth_percent` | 1 | Yes | No | No | None |
| `section_visible` | Hero, features, CTA sections | `section_name` | 1 | Yes | No | No | None |
| `nav_click` | Header nav links | `link_context`, `destination_type` | 1 | Yes | No | No | None |
| `service_card_click` | Service cards if present | `service_type` | 2 | Yes | No | No | None |
| UTM capture | Page load with UTM params | All UTMs | 1 | Yes | No | No | **NOT IMPLEMENTED** |

---

### servicios.html (Services)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: public_service` | 1 | Yes | Yes | Yes | None |
| `service_card_click` | Service card click | `service_type` | 1 | Yes | No | No | None |
| `cta_click` | CTA button clicks | `cta_id`, `cta_location` | 1 | Yes | Yes | Secondary | None |
| `scroll_depth` | Scroll milestones | `depth_percent` | 1 | Yes | No | No | None |
| `section_visible` | Service sections | `section_name` | 1 | Yes | No | No | None |

---

### como-funciona.html (How It Works)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: public_how_it_works` | 1 | Yes | Yes | Yes | None |
| `faq_engage` | FAQ item click | `section_name` | 1 | Yes | No | No | None |
| `cta_click` | CTA clicks | `cta_id`, `cta_location` | 1 | Yes | Yes | Secondary | None |
| `scroll_depth` | Scroll milestones | `depth_percent` | 1 | Yes | No | No | None |
| `whatsapp_click` | WhatsApp links/button | `cta_location` | 1 | Yes | Contact | No | None |

---

### tarifas.html (Rates)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: public_rates` | 1 | Yes | Yes | Yes | None |
| `faq_engage` | FAQ click | `section_name` | 1 | Yes | No | No | None |
| `cta_click` | CTA clicks | `cta_id`, `cta_location` | 1 | Yes | Yes | Secondary | None |
| `scroll_depth` | Scroll milestones | `depth_percent` | 1 | Yes | No | No | None |
| `calculator_start` | **Should link to calculadora** — track as `cta_click` if a calculator CTA exists | `cta_id` | 1 | Yes | ViewContent | Secondary | None |

---

### calculadora.html (Calculator)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: public_calculator` | 1 | Yes | Yes | Yes | None |
| `calculator_start` | First input in calculator | `shipping_mode` | 1 | Yes | ViewContent | Secondary | None |
| `calculator_tab_switch` | Aereo/marítimo tab toggle | `shipping_mode` | 1 | Yes | No | No | None |
| `calculator_query` | Submit calculation | `shipping_mode` | 1 | Yes | No | No | None |
| `calculator_result` | Result renders | `shipping_mode`, `weight_bucket`, `value_bucket`, `destination_country` | 1 | Yes | ViewContent | Secondary | None |
| `cta_click` (afiliate after result) | CTA after seeing result | `cta_id`, `cta_location` | 1 | Yes | InitiateCheckout | Secondary | None |

---

### afiliate.html (Registration)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: public_affiliate` | 1 | Yes | Yes | Yes | None |
| `account_type_select` | Tab click (personal/business) | `account_type` | 1 | Yes | No | No | None |
| `signup_start` | First field interaction | — | 1 | Yes | InitiateCheckout | Secondary | None |
| `signup_step` | Each step advance | `step_name` | 1 | Yes | No | No | None |
| `signup_success` | CRBOX API confirms registration | `account_type` | 1 | Yes | CompleteRegistration | **Primary** | Low — API-gated |
| `signup_error` | Registration fails | `error_category` | 1 | Yes | No | No | None |

---

### contacto.html (Contact)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: public_contact` | 1 | Yes | Yes | Yes | None |
| `form_start` | First form field interaction | `form_name: contact` | 1 | Yes | No | No | None |
| `form_abandon` | Page unload after form_start | `form_name: contact` | 1 | Yes | No | No | Unreliable on mobile |
| `contact_form_submit_success` | Backend confirms message sent | `form_name: contact` | 1 | Yes | Lead | Secondary | None — API-gated |
| `whatsapp_click` | WhatsApp links in page | `cta_location` | 1 | Yes | Contact | No | None |
| `phone_click` | Phone link click | `link_context` | 1 | Yes | Contact | No | None |

---

### login.html (Portal Login)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: portal_auth` | 2 | Yes | No | No | None |
| `login_start` | Form submit | — | 2 | Yes | No | No | None |
| `login_success` | Token received from CRBOX API | — | 2 | Yes | No | No | None |
| `login_error` | Auth fails | `error_category` | 2 | Yes | No | No | None |

---

### dashboard.html (Portal Dashboard)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: portal` | 2 | Yes | No | No | None |
| `portal_section_view` | DOMContentLoaded | `section_name: dashboard` | 2 | Yes | No | No | None |
| `cta_click` | Dashboard quick-action CTAs | `cta_id`, `cta_location` | 2 | Yes | No | No | None |
| `api_error` | `getPackages()` catch | `error_category: network` | 2 | Yes | No | No | None |

---

### mis-paquetes.html (My Packages)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: portal_packages` | 2 | Yes | No | No | None |
| `portal_section_view` | DOMContentLoaded | `section_name: mis_paquetes` | 2 | Yes | No | No | None |
| `package_filter_use` | Filter dropdown change | `filter_type` | 2 | Yes | No | No | None |
| `package_search` | Search input (debounced) | — | 2 | Yes | No | No | None |
| `package_search_result` | Results rendered | `status_category` | 2 | Yes | No | No | None |
| `package_detail_view` | Package row expanded | — | 2 | Yes | No | No | None |
| `invoice_upload_start` | Upload begins | `file_type` | 2 | Yes | No | No | None |
| `invoice_upload_success` | Both API writes confirm | — | 2 | Yes | No (auth-gated) | Offline import only | None |
| `invoice_upload_error` | Any step fails | `error_category` | 2 | Yes | No | No | None |
| `api_error` | Main load fails | `error_category` | 2 | Yes | No | No | None |

---

### mis-facturas.html (My Invoices)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: portal_invoices` | 2 | Yes | No | No | None |
| `portal_section_view` | DOMContentLoaded | `section_name: mis_facturas` | 2 | Yes | No | No | None |
| `invoice_filter_use` | Date filter applied | `filter_type: date_range` | 2 | Yes | No | No | None |
| `api_error` | `getBills()` fails | `error_category` | 2 | Yes | No | No | None |

---

### mi-cuenta.html (My Account)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: portal` | 2 | Yes | No | No | None |
| `portal_section_view` | Tab switch | `section_name` (e.g. `mi_cuenta_security`) | 2 | Yes | No | No | None |
| `profile_edit_start` | First field interaction per section | `section_name`, `portal_area` | 2 | Yes | No | No | None |
| `profile_update_success` | `updateProfile()` resolves | `section_name`, `portal_area` | 2 | Yes | No | No | None |
| `profile_update_error` | `updateProfile()` rejects | `section_name`, `portal_area`, `error_category` | 2 | Yes | No | No | None |

---

### mis-solicitudes.html (My Purchase Requests)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: portal_requests` | 2 | Yes | No | No | None |
| `portal_section_view` | DOMContentLoaded | `section_name: mis_solicitudes` | 2 | Yes | No | No | None |
| `api_error` | Request list fails to load | `error_category: network` | 2 | Yes | No | No | None |

**Notes:** This page lists the user's purchase/quote requests. The calculator-powered estimate widget inside `mis-solicitudes.html` fires `calculator_result` if the user runs a calculation from within the solicitud detail. No purchase or payment confirmation events exist here — purchase intent is captured upstream in `cotizar.html` via `quote_request_submit_success`.

---

### solicitud.html (Purchase Request Detail)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: portal_requests` | 2 | Yes | No | No | None |
| `portal_section_view` | DOMContentLoaded | `section_name: solicitud` | 2 | Yes | No | No | None |
| `calculator_result` | User runs in-page calculator | `shipping_mode`, `weight_bucket`, `value_bucket`, `destination_country` | 2 | Yes | No | No | None |
| `api_error` | Solicitud detail fails to load | `error_category: network` | 2 | Yes | No | No | None |

**Notes:** This is the detail page for a single purchase request. It contains an embedded calculator. No new conversion event is needed here — the original `quote_request_submit_success` was already fired when the solicitud was created in `cotizar.html`. Do not re-fire a conversion event when the user views an existing request.

---

### cotizar.html (Quote / Purchase Request Form)

| Event | Trigger | Parameters | Phase | GA4 | Meta | Google Ads | Risk |
|-------|---------|-----------|-------|-----|------|-----------|------|
| `page_view` | Page load | `page_type: portal_quotes` | 1 | Yes | Yes | Yes | None |
| `portal_section_view` | DOMContentLoaded | `section_name: cotizar` | 2 | Yes | No | No | None |
| `quote_request_start` | First input/focus in quote form (once per session) | `service_type` | 1 | Yes | InitiateCheckout | Secondary | None |
| `calculator_start` | First input in embedded calculator | `shipping_mode` | 1 | Yes | ViewContent | Secondary | None |
| `calculator_result` | Calculator produces a result | `shipping_mode`, `weight_bucket`, `value_bucket`, `destination_country` | 1 | Yes | ViewContent | Secondary | None |
| `quote_request_submit_success` | `POST /api/solicitudes` → `res.ok && data.ok && data.id` | `service_type`, `destination_country` | 1 | Yes | Lead | **Primary** | None — API-gated |
| `api_error` | Solicitud POST fails | `error_category: network` | 2 | Yes | No | No | None |

**Notes:** `cotizar.html` is accessible to both logged-in users (portal flow) and referred users. The `quote_request_start` session guard uses `sessionStorage` key `crbox_quote_start_fired` — verified in `docs/analytics-taxonomy.md`. This is one of the two highest-value conversion pages alongside `afiliate.html`.

---

## 15. Recommended Technical Architecture

### Current state (already good)

The existing architecture is sound:

```
HTML pages → CRBOX.track.*(params)
              → js/analytics.js → window.dataLayer.push({ event, ...params })
                → GTM (GTM-5WD8N53F) → GA4 Event Tags → GA4 (G-B5BPHFRR18)
```

This is the correct architecture. The separation of concerns is clean: business logic in page files, analytics utility in `js/analytics.js`, tag management in GTM, storage in GA4.

### What to add to `js/analytics.js`

**UTM capture module (new):**

```javascript
// CRBOX.track.captureUTMs() — call on every page load
// Stores first-touch in localStorage, last-touch in sessionStorage
// Attach last-touch to conversion events
```

**Meta Pixel bridge (new, after Pixel install):**

```javascript
// CRBOX.track.metaEvent(eventName, params) — safe wrapper around fbq()
// Checks if fbq is defined before calling (no-op if Pixel not loaded)
// Called internally from existing CRBOX.track methods for relevant events
```

**Google Ads conversion bridge (new, after GA Ads tags installed):**
All Google Ads conversions should go through GTM (not direct `gtag` calls). No changes needed in `js/analytics.js` — GTM handles Google Ads tags via Custom Event triggers on the existing dataLayer events.

**User status parameter (new):**

```javascript
// Add to the _push() global params injection:
// user_status: CRBOXAuth.isLoggedIn() ? 'logged_in' : 'anonymous'
```

### Functions the utility should expose (already present or needed)

| Function | Status |
|----------|--------|
| `CRBOX.track.cta_click(params)` | Live |
| `CRBOX.track.calculator_start(params)` | Live |
| `CRBOX.track.calculator_result(params)` | Live |
| `CRBOX.track.signup_start()` | Live |
| `CRBOX.track.signup_success(params)` | Live |
| `CRBOX.track.quote_request_submit_success(params)` | Live |
| `CRBOX.track.whatsapp_click(params)` | Live |
| `CRBOX.track.portal_section_view(params)` | Live |
| `CRBOX.track.invoice_upload_success()` | Live |
| `CRBOX.track.captureUTMs()` | **Missing — Phase 1** |
| `CRBOX.track.metaEvent(name, params)` | **Missing — Phase 1 (after Pixel)** |

### Safety requirements

- **Analytics must never break UX.** Every `CRBOX.track.*` call is wrapped so that any exception inside the analytics utility does not propagate to the page. The `try/catch` wrapping should be at the `push()` level.
- **No-op behavior:** If `window.dataLayer` is undefined (e.g., GTM was blocked by an ad blocker), the push silently fails. This is acceptable.
- **No synchronous external calls.** The analytics utility must not make synchronous HTTP requests that could block page rendering.
- **Meta Pixel calls must also be no-ops** if `window.fbq` is not defined.

---

## 16. Platform Mapping: GA4, Google Ads, Meta

### GA4 platform mapping

| Event | Send to GA4 | Mark as key event | Key parameters for Explore |
|-------|------------|------------------|--------------------------|
| `signup_success` | Yes | **Yes — primary** | `account_type` |
| `quote_request_submit_success` | Yes | **Yes — primary** | `service_type`, `destination_country` |
| `contact_form_submit_success` | Yes | **Yes — primary** | `form_name` |
| `calculator_result` | Yes | Yes — micro | `shipping_mode`, `weight_bucket`, `value_bucket` |
| `calculator_start` | Yes | Yes — micro | `shipping_mode` |
| `quote_request_start` | Yes | Yes — micro | `service_type` |
| `signup_start` | Yes | Yes — micro | — |
| `whatsapp_click` | Yes | Yes — micro | `cta_location` |
| `phone_click` | Yes | Yes — micro | — |
| `invoice_upload_success` | Yes | Yes — micro | — |
| All other events | Yes | No | Per event schema |

### Google Ads platform mapping

| Event | Import as conversion | Primary/secondary | Account-default | Bidding | Conversion value |
|-------|---------------------|------------------|-----------------|---------|-----------------|
| `signup_success` | **Yes — via GTM Google Ads tag** | **Primary** | Yes | Target CPA when ≥30 conv/30d | Static value: $10 (proxy, adjust) |
| `quote_request_submit_success` | **Yes — via GTM Google Ads tag** | **Primary** | Yes | Target CPA shared with signup | Static value: $15 (proxy, adjust) |
| `contact_form_submit_success` | Yes — via GTM | Secondary | No | Do not use for bidding alone | Static value: $5 |
| `calculator_result` | Yes — as secondary goal | Secondary | No | Smart Bidding signal only | Static value: $1 |
| `invoice_upload_success` | Future — offline import | Secondary | No | Future offline CPA | Value from shipment data |
| `first_package_delivered` | Future — offline import | Primary (Phase 4) | Future | Value-based bidding | Actual shipment value |

**Implementation note:** All Google Ads conversion tags must be added to the GTM container as new tags (Google Ads Conversion Tracking tag type). Do not add `gtag` calls directly to HTML files. Trigger each Google Ads tag from the same Custom Event triggers that fire the GA4 Event tags.

### Meta platform mapping

| Event | Standard/Custom | Optimization | Custom audiences | Remarketing | Future CAPI |
|-------|----------------|-------------|-----------------|-------------|------------|
| `page_view` | Standard: `PageView` | No | Yes — base audience | Yes | Yes |
| `signup_success` | Standard: `CompleteRegistration` | **Yes — primary** | Yes | Yes | Yes |
| `quote_request_submit_success` | Standard: `Lead` | **Yes — primary** | Yes | Yes | Yes |
| `contact_form_submit_success` | Standard: `Lead` | Secondary | Yes | Yes | Yes |
| `calculator_result` | Standard: `ViewContent` | Secondary signal | Yes | Yes — "calculated price" audience | Yes |
| `calculator_start` | Standard: `ViewContent` | Secondary | Yes | Yes | Yes |
| `whatsapp_click` | Standard: `Contact` | No (audiences only) | Yes | Yes | No |
| `signup_start` | Custom: `SignupStart` | No | Yes | Yes | No |
| `invoice_upload_success` | No Pixel (auth-gated) | No via Pixel | No via Pixel | No via Pixel | **Yes — CAPI only** |

**Meta Pixel installation note:** The Pixel should be added via GTM on all public pages. The Pixel must NOT fire inside the authenticated portal (the Pixel base code fires on all pages including those with sensitive financial/shipping data). Gate Meta Pixel tags in GTM to fire only when `{{page_path_group}}` equals `public` (use the existing DLV for `page_path_group`).

---

## 17. Conversion Value and Quality Scoring

### Why not to invent revenue values yet

CRBOX's revenue per customer depends on shipping frequency, declared value, and shipping mode — none of which are currently available as real-time conversion parameters. Inventing a fixed revenue value per registration would give bidding algorithms a false signal.

### Recommended relative scoring model

| Event | Score tier | Relative value | Rationale |
|-------|-----------|---------------|-----------|
| `calculator_start` | Engagement | $0.50 | Top-of-funnel intent |
| `calculator_result` | Intent | $1.00 | Completed price calculation |
| `quote_request_start` | Intent | $2.00 | Entered quote funnel |
| `contact_form_submit_success` | Acquisition | $5.00 | Confirmed lead |
| `signup_success` | Acquisition | $10.00 | Real registration |
| `quote_request_submit_success` | Acquisition | $15.00 | Highest-intent lead |
| `invoice_upload_success` | Activation | $25.00 | Active customer |
| `first_package_registered` (future) | Quality | $50.00 | First real shipment |
| `first_package_delivered` (future) | Revenue proxy | $75.00+ | Delivered service value |
| `repeat_package` (future) | Retention | $100.00+ | Confirmed LTV |

**Important:** These values are **proxy signals for algorithm training**, not accounting revenue. Update them quarterly based on actual data (average conversion-to-activation rate, average shipment value).

### How this evolves into value-based bidding

- **Phase 1–2:** Use static values per event as described above. Google Ads optimizes toward the highest-value conversions with Target ROAS.
- **Phase 3:** When backend shipment data is available, import offline conversions with real shipment revenue. Replace static values with actual revenue per customer.
- **Phase 4:** Enable value-based bidding (Target ROAS) across Google Ads once offline conversion volume exceeds 30 per week.

---

## 18. Dashboard and Reporting Readiness

### Required before any dashboard is reliable

| Item | Status | Action |
|------|--------|--------|
| BigQuery export enabled | Unknown | GA4 Admin → Integrations → BigQuery Link → Enable |
| Data retention set to 14 months | Unknown | GA4 Admin → Data Settings → Data Retention → 14 months |
| All 24 custom dimensions registered | Documented, live status unknown | GA4 Admin → Custom Definitions → verify all 24 |
| Key events marked | Documented, live status unknown | GA4 Admin → Events → verify toggle for 3 primary + micro-conversions |

### Dashboard modules and required events

#### Acquisition overview
Required events: `page_view`, `cta_click`, `signup_success`, `quote_request_submit_success`, `contact_form_submit_success`
Required params: `page_type`, `page_name`, UTM parameters (not yet captured)

#### Funnel overview
GA4 Explore → Funnel Exploration:
- Calculator funnel: `calculator_start` → `calculator_query` → `calculator_result` → `cta_click`
- Registration funnel: `signup_start` → `signup_step` → `signup_success`
- Quote funnel: `quote_request_start` → `quote_request_submit_success`
- Contact funnel: `form_start` → `contact_form_submit_success`

#### Campaign performance readiness
Blocked by: UTM capture not implemented. Without UTM parameters on conversion events, channel-level campaign performance cannot be compared in Looker Studio.

#### Landing page performance
Required: `page_view` by `page_name`, `scroll_depth` by `page_name`, `cta_click` by `page_name`
Available now after BigQuery export.

#### Calculator funnel
Available now. Events: `calculator_start`, `calculator_tab_switch`, `calculator_query`, `calculator_result`, broken down by `shipping_mode`, `weight_bucket`, `value_bucket`.

#### Registration funnel
Available now. Events: `account_type_select`, `signup_start`, `signup_step`, `signup_success`, `signup_error` broken down by `account_type`, `step_name`, `error_category`.

#### Quote funnel
Available now. Events: `quote_request_start`, `quote_request_submit_success` broken down by `service_type`, `destination_country`.

#### WhatsApp funnel
Available now. Events: `whatsapp_click` by `cta_location`, `page_name`. No downstream confirmation available.

#### Portal activation
Events: `login_success`, `portal_section_view`, `invoice_upload_start`, `invoice_upload_success`. Activation rate = `invoice_upload_success` / `signup_success` cohorted by registration date.

#### Invoice/package quality signals
Events: `invoice_upload_success`, `invoice_upload_error` by `error_category`, `package_filter_use`, `package_detail_view`.

#### Conversion quality by channel
**Blocked** by UTM capture gap. Once UTM capture is implemented: compare `signup_success` rate by `utm_source` / `utm_medium` / `utm_campaign`.

#### Weekly learning log inputs
- Conversion volume by event (all three primaries)
- Funnel conversion rates (calculator_start → calculator_result, signup_start → signup_success)
- Error rates (`signup_error`, `invoice_upload_error`, `login_error`) by `error_category`
- Session counts by page type (public vs portal)

---

## 19. AI / n8n Automation Readiness

### What this tracking system enables for AI/n8n

#### Daily performance summary inputs
- GA4 Data API: daily event counts for all primary and micro-conversion events
- Breakdowns by `page_type`, `shipping_mode`, `account_type`
- Comparison to prior 7-day rolling average

#### Weekly learning loop inputs
- Funnel conversion rates (step-by-step)
- Error rate trends by `error_category`
- Calculator usage patterns by `shipping_mode` and `weight_bucket`
- Quote submission volume by `service_type`
- Invoice upload success rate

#### Anomaly detection inputs
- Any primary conversion event with 0 fires in a 24-hour window (likely a tracking break)
- `api_error` volume spike (likely a backend issue)
- `session_expired` spike (likely an auth issue)
- `signup_error` spike with `error_category: network` (likely CRBOX API outage)

#### Creative performance inputs (future, requires UTM capture)
- Conversion rate by `utm_content` (ad creative identifier)
- Calculator engagement rate by landing page

#### Landing page opportunity inputs
- `scroll_depth` drop-off pattern per `page_name`
- `section_visible` rates for CTA sections
- `form_abandon` rate vs `form_start` rate on contacto.html

#### Search query mining inputs (future, Google Ads)
- `utm_term` values from paid search conversions
- Which keyword themes produce `signup_success` vs `calculator_result` only

#### Campaign QA inputs
- Verify `signup_success` fires within expected range per day
- Verify `quote_request_submit_success` fires within expected range
- Flag any conversion event showing 0 fires for 48+ hours

#### Lead quality inputs
- `invoice_upload_success` count as a percentage of `signup_success` cohort (7-day and 30-day windows)
- Compare `account_type: business` vs `personal` on `signup_success` → `invoice_upload_success` rate

#### Lifecycle opportunity inputs
- Users with `invoice_upload_success` but no `login_success` in 30 days (re-engagement trigger)
- Users with `signup_success` but no `invoice_upload_success` in 14 days (activation nudge)

### What AI can recommend (safe)

- Increase budget toward campaigns where `signup_success` CPA is below target
- Pause keyword themes or ad sets where `calculator_result` volume is high but `signup_success` is zero
- Suggest landing page copy changes based on scroll depth drop-off pattern
- Flag funnel steps with completion rates below threshold
- Surface the `error_category` driving the most `signup_error` events
- Recommend which service type to emphasize based on `quote_request_submit_success` by `service_type`

### What AI should NOT execute automatically (requires human approval)

- Budget changes in Google Ads or Meta Ads
- Pausing or enabling campaigns
- Launching new campaigns or ad sets
- Changing conversion goals in Google Ads
- Publishing new ad creative
- Modifying bid strategies
- Sending mass CRM messages
- Changing UTM naming conventions mid-campaign
- Modifying GTM container (tag/trigger/variable changes)
- Modifying GA4 conversion event configuration
- Any action that changes what data is collected

### Automation-safe vs human-required matrix

| Action | AI can surface | Human must approve |
|--------|---------------|-------------------|
| Budget recommendation | Yes | Execution |
| Campaign pause recommendation | Yes | Execution |
| Creative performance report | Yes | Creative decisions |
| Anomaly alert | Yes | Investigation |
| Funnel report | Yes | Optimization decisions |
| UTM tracking issue | Yes | Fix execution |
| New conversion event proposal | Yes | Implementation |

---

## 20. QA Checklist

### Pre-paid-media tracking QA checklist

Use GTM Preview + GA4 DebugView for all items below. Run from a clean incognito session with ad blockers disabled.

#### Setup verification
- [ ] GTM Preview connects to the live production URL without error
- [ ] GA4 Measurement ID in GTM container is `G-B5BPHFRR18`
- [ ] GA4 Configuration tag fires on all pages under "Tags Fired" in GTM Preview
- [ ] GA4 DebugView receives `page_view` within 3 seconds of page load

#### Primary conversions
- [ ] `signup_success` fires in DebugView only after a real registration API success (not on submit click)
- [ ] `signup_success` has `account_type` parameter correctly populated
- [ ] `signup_success` has blue star (key event flag) in DebugView
- [ ] `quote_request_submit_success` fires only after `res.ok && data.ok && data.id` confirm
- [ ] `quote_request_submit_success` has `service_type` and `destination_country`
- [ ] `quote_request_submit_success` has key event flag
- [ ] `contact_form_submit_success` fires only after `data.ok === true`
- [ ] `contact_form_submit_success` has key event flag
- [ ] **Negative:** Disconnecting network before form submit → no success event fires

#### Secondary / micro-conversions
- [ ] `calculator_result` fires with `shipping_mode`, `weight_bucket`, `value_bucket`, `destination_country`
- [ ] `calculator_start` fires once per session on first field interaction
- [ ] `whatsapp_click` fires on floating button click with `cta_location: floating_button`
- [ ] `whatsapp_click` — no phone number appears in any event parameter
- [ ] `quote_request_start` fires once per session (sessionStorage guard active)

#### Registration funnel
- [ ] `account_type_select` fires when user switches personal/business tabs
- [ ] `signup_start` fires on first field interaction
- [ ] `signup_step` fires on each "Siguiente" advance with correct `step_name`
- [ ] `signup_error` fires (not `signup_success`) when using a known duplicate email

#### Portal tracking
- [ ] `login_success` fires only after token received from CRBOX API
- [ ] `login_error` fires with correct `error_category` on failed login
- [ ] `portal_section_view` fires on DOMContentLoaded on all portal pages
- [ ] `invoice_upload_success` fires only after both API write steps confirm
- [ ] `invoice_upload_error` fires with `error_category` on any step failure
- [ ] `package_filter_use` fires with correct `filter_type` for each filter dropdown

#### No duplicate events
- [ ] `calculator_start` fires exactly once per session (not on each calculation)
- [ ] `quote_request_start` fires exactly once per session
- [ ] `signup_success` fires exactly once per registration flow
- [ ] `login_success` fires exactly once per login

#### PII verification
- [ ] No email address visible in any dataLayer push (inspect `window.dataLayer` in browser console)
- [ ] No phone number in `whatsapp_click` or `phone_click` events
- [ ] No name, ID number, or casillero ID in any event
- [ ] `error_category` values are slugs only (no raw API messages)
- [ ] No exact USD values — only bucket strings

#### UTM capture (currently missing — run after implementation)
- [ ] Landing on `index.html?utm_source=google&utm_medium=cpc&utm_campaign=test` → UTMs captured in sessionStorage
- [ ] UTMs appear in `signup_success` event parameters
- [ ] UTMs appear in `quote_request_submit_success` event parameters
- [ ] First-touch UTMs in localStorage not overwritten by subsequent page navigation

#### Meta Pixel (after installation)
- [ ] Meta Pixel Helper browser extension confirms Pixel fires on all 6 public pages
- [ ] `PageView` event fires on every public page
- [ ] `CompleteRegistration` fires on `signup_success` only
- [ ] `Lead` fires on `quote_request_submit_success` and `contact_form_submit_success`
- [ ] Pixel does NOT fire on portal pages (`dashboard.html`, `mis-paquetes.html`, etc.)

#### Analytics failure safety
- [ ] Comment out `dataLayer.push` → the user flow (registration, quote, form) still completes normally
- [ ] Block `googletagmanager.com` in DevTools → page loads without JavaScript errors

---

## 21. QA Evidence Requirements

For each event, when implemented or verified, provide:

### Evidence format

| Evidence type | Format | Required for |
|--------------|--------|-------------|
| GA4 DebugView screenshot | PNG showing event name, parameters, and key event flag | All primary conversions |
| GTM Preview "Tags Fired" screenshot | PNG showing tag name and dataLayer values | All conversion events |
| Console log in debug mode | Copy of `window.dataLayer` array showing the specific push | New events only |
| Negative test result | Screenshot showing NO event in DebugView after failed submission | All backend-confirmed events |
| PII confirmation | Written statement: "Event X payload does not contain any PII — verified against Section 8 parameter schema" | All events |
| Deduplication test | Screenshot or log showing event fires exactly once on repeated trigger | Dedup-guarded events |

### Required test cases per event type

#### For all backend-confirmed conversions (`signup_success`, `quote_request_submit_success`, `contact_form_submit_success`, `invoice_upload_success`)

1. **Success path:** Complete the action → event fires in DebugView → all parameters present → key event flag present
2. **Failure path:** Induce API failure (network disconnect or invalid data) → event does NOT fire → no false positive
3. **Reload path:** Reload the page after a successful conversion → event does NOT fire again

#### For session-scoped events (`calculator_start`, `quote_request_start`)

1. **First trigger:** First interaction → event fires
2. **Repeat trigger:** Same session, repeat the interaction → event does NOT fire again
3. **New session:** Open incognito tab → event fires again

#### For funnel events (`signup_step`)

1. **Forward step:** Advance → correct `step_name` fires
2. **Back navigation:** Go back to prior step → no duplicate event for the revisited step

---

## 22. Implementation Phases

### Phase 1 — Critical pre-paid-media tracking *(must complete before any spend)*

**Objective:** Ensure all three primary conversions are verified, UTM capture is live, Meta Pixel is installed, and Google Ads conversion tags are configured.

| Task | File(s) | Risk | Notes |
|------|---------|------|-------|
| Verify GTM live container matches JSON export | GTM workspace | Low | Run Preview against production; fix any discrepancies |
| Verify GA4 receiving all 3 primary conversions | GA4 DebugView | Low | Do not proceed until all 3 confirmed |
| Mark all key events in GA4 Admin | GA4 Admin | None | Toggle signup_success, quote_request_submit_success, contact_form_submit_success, and micro-conversions |
| Set GA4 data retention to 14 months | GA4 Admin | None | Admin → Data Settings |
| Enable BigQuery export | GA4 Admin | None | Required for Looker Studio |
| Implement UTM capture in `js/analytics.js` | `js/analytics.js` | Low | Store first/last-touch, attach to conversion events |
| Install Meta Pixel via GTM | GTM workspace | Low | Public pages only; gate on `page_path_group == public` |
| Configure Meta standard events in GTM | GTM workspace | Low | PageView, CompleteRegistration, Lead, ViewContent, Contact |
| Add Google Ads conversion tags in GTM | GTM workspace | Low | One tag per primary conversion; triggered by existing CE triggers |
| Define campaign UTM naming convention | Docs | None | See Section 12 |
| Run full QA checklist from Section 20 | All | Low | Document evidence per Section 21 |

**What must be true before Phase 2:** All 3 primary conversions firing reliably. UTM capture live. Meta Pixel confirmed via Pixel Helper. Google Ads conversion tags verified in Google Tag Assistant. QA evidence documented.

---

### Phase 2 — Portal and activation tracking *(already partially live)*

**Objective:** Ensure portal events are verified and activation funnel is reportable.

| Task | File(s) | Risk | Notes |
|------|---------|------|-------|
| Verify all portal events in GA4 DebugView | GA4 DebugView | Low | login_success, invoice_upload_*, portal_section_view, package_* |
| Add GTM triggers for portal events if missing | GTM workspace | Low | Check live container vs JSON export |
| Build GA4 Explore funnels | GA4 Explore | None | Calculator, registration, quote, login, invoice funnels |
| Set up GCLID capture at registration | `afiliate.html`, `js/analytics.js` | Medium | Required for Google Ads offline conversion import later |
| Document invoice_upload_success as offline conversion candidate | Docs | None | Define the import format and data linkage plan |

**What must be true before Phase 3:** Portal events verified. GA4 Explore funnels built and reviewed. Activation rate baseline established (invoice_upload_success / signup_success in first 30 days).

---

### Phase 3 — Quality / offline conversion readiness *(backend work required)*

**Objective:** Add backend-confirmed quality signals that represent real shipment activity.

| Task | File(s) | Risk | Notes |
|------|---------|------|-------|
| Define webhook spec with CRBOX backend team | Docs | None | Events: first_package_registered, first_package_arrived_miami, first_package_delivered |
| Implement server-side webhook receiver in `server.py` | `server.py` | Medium | Validate signature, match to user via stored GCLID/FBC, push offline conversion |
| Set up Google Ads offline conversion import | Google Ads | Low | Link GCLID to `signup_success` timestamp; import `first_package_delivered` |
| Set up Meta CAPI for `invoice_upload_success` and `first_package_delivered` | Meta Events Manager | Medium | Requires server-side event sending, event deduplication |
| Add `repeat_package` webhook handling | `server.py` | Medium | Count packages per user; fire on Nth package |

**What must be true before Phase 4:** Backend webhooks live. Offline conversions importing to Google Ads. CAPI events confirmed in Meta Events Manager. At least 30 offline conversion events per 30 days.

---

### Phase 4 — Ads platform optimization readiness

**Objective:** Enable value-based bidding using real shipment data.

| Task | Notes |
|------|-------|
| Replace static conversion values with real shipment values | Pull from backend webhook payload |
| Enable Target ROAS bidding in Google Ads | Requires stable offline conversion volume |
| Enable value-based optimization in Meta | CAPI Purchase events with real or proxy value |
| Build Looker Studio campaign performance dashboard | Requires UTM in BigQuery + offline conversions |
| Implement enhanced conversions in Google Ads | Requires hashed email at point of conversion |

---

### Phase 5 — AI / reporting readiness

**Objective:** Structure data outputs for automated analysis and recommendation engines.

| Task | Notes |
|------|-------|
| Set up GA4 Data API connection for n8n | Daily event count export |
| Build weekly learning log automation | n8n workflow: GA4 → Google Sheets → review |
| Build anomaly detection rules | Alert if primary conversion drops to 0 for 48h |
| Define creative performance report structure | Requires UTM + Meta Pixel with `utm_content` |
| Build Looker Studio lifetime dashboard | Combines GA4, offline conversions, CRM |

---

## 23. Files to Modify

> No modifications in this audit. This is a plan only.

| File | Why it needs changes | Events to add | Risk | Phase | Affects |
|------|---------------------|--------------|------|-------|---------|
| `js/analytics.js` | UTM capture, Meta Pixel bridge, `user_status` global param | `captureUTMs()`, `metaEvent()`, `user_status` injection | Low | 1 | All pages |
| `afiliate.html` | GCLID capture at registration time for offline conversion linkage | GCLID storage on page load | Low | 2 | Registration flow |
| `server.py` | Webhook receiver for backend quality events (Phase 3) | `first_package_registered`, `first_package_delivered` handlers | Medium | 3 | Backend |
| GTM workspace | Meta Pixel tags, Google Ads conversion tags, new Custom Event triggers | PageView, CompleteRegistration, Lead, ViewContent, Contact, Conversion | Low | 1 | All public pages |
| `docs/crbox-measurement-map-v1.md` | This file — keep updated as phases progress | — | None | Ongoing | Documentation |

---

## 24. Risks / Open Questions

| # | Risk / Question | Category | Severity | Recommended action |
|---|-----------------|----------|----------|-------------------|
| R01 | Live GTM container may not match the JSON export | Tracking integrity | **High** | Run GTM Preview against production; compare tag/trigger list before any spend |
| R02 | GA4 custom dimensions may not all be registered | Data quality | **High** | Verify all 24 in GA4 Admin → Custom Definitions |
| R03 | UTM parameters are not captured — attribution is blind | Attribution | **High** | Implement UTM capture in Phase 1 before any paid campaign launches |
| R04 | Meta Pixel not installed — zero Meta measurement | Platform coverage | **High** | Install via GTM in Phase 1 |
| R05 | Google Ads conversion tags not configured — campaigns cannot optimize | Platform coverage | **High** | Add in GTM in Phase 1 |
| R06 | `first_package_registered` and `first_package_delivered` require backend webhooks not yet designed | Quality signals | Medium | Define webhook spec with CRBOX backend team; do not promise to Google Ads until available |
| R07 | `form_abandon` uses `beforeunload` — unreliable on mobile | Data reliability | Low | Use as trend signal only; do not build business decisions on it |
| R08 | `whatsapp_click` volume as a KPI may mislead — click ≠ customer | Optimization risk | Medium | Never use as primary conversion for paid media bidding |
| R09 | `invoice_upload_success` is auth-gated — cannot be used as Meta Pixel event | Platform limitation | Medium | Use CAPI only; do not add Pixel to portal pages |
| R10 | BigQuery export not confirmed — Looker Studio dashboards cannot be built | Reporting blocker | Medium | Enable in GA4 Admin before Phase 2 reporting work |
| R11 | Admin email addresses in client-side source code (`js/nav-auth.js`) | Information disclosure | Low | See security audit C-05; server-side gate is correct |
| R12 | GCLID is not stored at registration — offline conversion linkage impossible without it | Attribution gap | Medium | Implement GCLID capture before Phase 3 |
| R13 | Cookie consent mechanism absent — risk if EU/EEA audiences are targeted | Legal / platform | Medium | Do not target EU users without implementing Consent Mode v2 |
| R14 | Server logs email addresses on upstream CRBOX API errors (C-14 in security audit) | Privacy | Low | Replace with redacted log as documented |
| R15 | `signup_success` registrations may have low activation rate — algorithm may find wrong audience | Campaign quality | Medium | Monitor `signup_success` → `invoice_upload_success` ratio in the first 30 days; be ready to adjust |
| R16 | Multiple autoscale instances share a PostgreSQL sequence but analytics events are client-side — no conflict | Architecture | None | No action needed; analytics is fully client-side |

---

## 25. What Not To Track Yet

| Data / Event | Why not yet | When to add |
|-------------|-------------|------------|
| Exact declared product value | PII-adjacent; not needed for optimization when buckets suffice | Never (buckets only) |
| Exact package weight | Not needed for optimization | Never (buckets only) |
| Invoice number or bill ID | PII; no analytics value | Never |
| Casillero / consignee ID | Identifies specific user | Never in client-side analytics; backend only |
| Package tracking number | Sensitive shipment data | Never in analytics |
| User email address or hash (for enhanced conversions) | Requires careful consent and technical implementation | Phase 4, with consent review |
| `first_package_registered` | Backend webhook not yet designed | Phase 3 |
| `first_package_delivered` | Backend webhook not yet designed | Phase 3 |
| `repeat_package` | Backend webhook not yet designed | Phase 3 |
| Chat message content | Privacy-sensitive; `message_type` is sufficient | Never |
| FAQ question text | Free-form text; cardinality and PII risk | Never — `section_name` is sufficient |
| Form field values (contact subject, name, message) | PII; forms have confirmation-only tracking | Never |
| Raw error messages from CRBOX API | May contain PII or sensitive system info | Never |
| Admin dashboard events | Not relevant to paid media; admin paths should be excluded from all tags | Excluded from all tags |
| Pricing calculator exact output (total_usd, shipping_usd) | Not needed with bucket-based dimensions | Never in analytics |
| `quote_submit_error` raw payload | API error details may leak | Only use `error_category` slug |
| Profile field values | PII | Never |

---

## 26. What Not To Automate Yet

| Action | Why not | When it may become appropriate |
|--------|---------|-------------------------------|
| Budget changes in Google Ads or Meta | Too early; no stable baseline; algorithm needs learning period | After 90 days of stable conversion data, with human-defined guardrails |
| Pausing campaigns automatically | A bad rule can kill all traffic instantly | After stable performance baselines are defined; with min-spend floor guardrail |
| Launching new campaigns | Requires human creative review, audience approval, budget sign-off | Never fully automated; AI can draft, human must approve |
| Publishing new ads | Creative requires brand and compliance review | Never fully automated |
| Changing conversion goals or primary conversions in Google Ads | Triggers algorithm re-learning; can collapse campaign performance | Only with deliberate human planning; not triggered by anomaly detection |
| Sending mass CRM messages | Risk of unsubscribes, spam reports, delivery rate damage | After list hygiene, suppression logic, and consent framework are in place |
| Making pricing claims to users | TICA tariff rates change; dynamic pricing claims create legal risk | Never automate pricing claims; always serve from controlled rate data |
| Making customs or tax promises | Compliance varies by product category and value; cannot be reliably automated | Never |
| Optimizing toward unvalidated WhatsApp leads | `whatsapp_click` does not confirm a real lead or sale | Only use WhatsApp as an audience signal; never as a primary bidding conversion |
| Modifying GTM container | Tag changes can break all measurement instantly | Human-reviewed only; test in GTM Preview before publish |
| CAPI event deduplication logic | Incorrect dedup can suppress real conversions | Human-tested before enabling |
| GA4 custom dimension changes | Changes affect historical data segmentation | Human-reviewed only |
| Conversion value rule changes in Google Ads | Affects bidding behavior across all campaigns | Human decision; documented change log required |

---

## 27. Recommended Next Action

**The single next action is: run a full GTM Preview verification against production, then install Meta Pixel and Google Ads conversion tags in GTM.**

Specifically:

1. **Today:** Open GTM → Preview → enter `https://crbox.cr` (or the production domain). Confirm GA4 Configuration tag fires. Confirm all three primary conversion events appear in Tags Fired when triggered. Confirm the dataLayer push for each contains no PII. Document screenshots.

2. **This week — Phase 1 implementation (no paid media yet):**
   - Add Meta Pixel base code to GTM (All Pages tag, filtered to `page_path_group == public`)
   - Add Meta standard event tags (CompleteRegistration on CE-signup_success, Lead on CE-quote_request_submit_success and CE-contact_form_submit_success, ViewContent on CE-calculator_result, Contact on CE-whatsapp_click)
   - Add Google Ads Conversion Tracking tags for `signup_success` and `quote_request_submit_success`
   - Implement UTM capture in `js/analytics.js`
   - Define and document the campaign UTM naming convention

3. **Before any paid media goes live:** Run the complete QA checklist from Section 20. Verify every item. Document evidence per Section 21. Only after all checkboxes are cleared should budget be committed.

Do not launch any campaign before the QA checklist is complete. Launching with an unverified tracking stack wastes budget and teaches the algorithm on bad signals that are difficult to correct later.

---

*Document version: 1.0 | Last updated: 2026-05-29 | Next review: after Phase 1 QA completion*
