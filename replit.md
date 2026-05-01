# Project Overview

Static HTML/CSS/JS website. No framework, no build pipeline, no package dependencies.

## GTM Container ID

The Google Tag Manager container ID is defined in a single place:

```
gtm.config.json  →  { "containerId": "GTM-XXXXXXXXX" }
```

To change the container ID:
1. Edit `containerId` in `gtm.config.json`
2. Run `node scripts/inject-gtm.js`

The script updates all six public HTML pages automatically. It must also be run before every deployment.

## Public Pages

| File | Purpose |
|------|---------|
| index.html | Home |
| servicios.html | Services |
| como-funciona.html | How it works |
| tarifas.html | Pricing |
| calculadora.html | Calculator |
| contacto.html | Contact |

## JavaScript Modules

| File | Purpose |
|------|---------|
| `js/main.js` | General UI: mobile menu, calculators, scroll animations, tabs |
| `js/auth.js` | Auth module: token storage, login, registration, header state, logout |
| `js/cr-locations.js` | Costa Rica INEC location code helpers (province/canton/district lookup) |
| `js/dashboard.js` | Dashboard-specific logic (packages, invoices, account) |
| `js/analytics.js` | Analytics event tracking |
| `js/enviar-juntos.js` | **[Task 316]** "Enviar paquetes juntos" grouping flow. Groups are stored server-side in the `package_groups` SQLite table (keyed to `casillero_id`), loaded via `GET /api/package-groups` on `init()`, and written via POST/PATCH/DELETE on each CRUD operation. An in-memory `_groups` array is kept for synchronous reads; writes are optimistic (cache updated immediately, API call fires in background). Falls back to localStorage on auth/network failure. |
| `js/seo-config.js` | SEO/structured data configuration |
| `js/tariff-adapter.js` | **[Task 131]** Tariff data-adapter layer. All duty/tax lookups go through `TARIFF_ADAPTER.getTariffRate(categoryCode)`. Returns `{ rate, source, pct }` where source is `local_estimated`, `official_tica`, or `user_override`. To wire in official TICA data, populate `OFFICIAL_RATES`. |
| `js/calculator-engine.js` | **[Task 131]** Pure calculation engine. Exposes `CALCULATOR_ENGINE.calcSinglePackage(item)`, `calcSeparate(items, dest)`, `calcConsolidated(items, dest)`. No formula changes — structural refactor and extension of original inline logic. |
| `js/ai-extractor.js` | **[Task 181/185/293]** AI product extraction module. Exposes `window.CRBOXAIExtractor` with `run(config)`, `reset(config)`, `allFieldsConfirmed()`, and `getLastResult()`. Calls `POST /api/ai/extract`, applies fields with confidence-appropriate badges (Verificar/Confirmar/Estimado), shows animated 3-step loader during analysis, renders compliance card (amber=RESTRICTED, red=PROHIBITED, blue=COURIER_RESTRICTED) via `complianceTarget` element, and marks estimated weight/dims with dashed-border + "Estimado" blue badge. Used in both `cotizar.html` and `mis-solicitudes.html`. |
| `knowledge/crbox-kb.json` | **[Task 300]** Single source of truth for all CRBox knowledge (company, services, air rates, handling fees, delivery fees, compliance rules, FAQ, page map with greetings). Read by `server.py` at startup to build the Gemini system prompt; also served as a static file at `/knowledge/crbox-kb.json` and fetched by `js/crbox-knowledge.js` at runtime. |
| `js/crbox-knowledge.js` | **[Task 300]** Fetches `/knowledge/crbox-kb.json` and exposes it as `window.CRBOX_KNOWLEDGE`. Used by `chat-panel.js` for page-specific greetings and context sent to the backend. |
| `js/chat-panel.js` | **[Task 300]** Chat assistant UI — floating bubble + slide-up panel. Sends history to `POST /api/chat` and renders reply, optional inline widget (calculator / quote-form / compliance), and deep-link button. |
| `js/chat-calculator.js` | **[Task 300]** Inline mini calculator widget rendered inside the chat panel. Reuses `CALCULATOR_ENGINE` logic. |
| `js/chat-quote.js` | **[Task 300]** Inline quote-request form rendered inside the chat panel. POSTs to `/api/solicitudes`. |
| `css/chat-panel.css` | **[Task 300]** All styles for the floating chat bubble, slide-up panel, message bubbles, typing indicator, and inline widgets. Brand orange `#FF6B00`. |

### Calculator page (calculadora.html) — Task 131 + Task 142 upgrade

The calculator is now a **premium multi-item shipment planner** with 6 features:

1. **Multi-item list** — users add named item cards with real weight, dimensions (auto-calculates volumetric weight inline), declared value, category, and optional product URL. Items can be edited or removed.
2. **URL-assisted entry** — users can paste a product URL; the system uses allorigins.win CORS proxy to read Open Graph/meta tags and pre-fills title + price. All inferred fields are badged "Pre-llenado — confirmar" in amber. The URL is stored in the item data model and flows into the quote payload.
3. **Comparison hero** — after calculating, a dark premium panel reveals the total cost of shipping each item separately vs. consolidated. When only one item exists, an educational state appears instead of "Ahorras $0.00".
4. **Results dossier** — a polished quote document with all line items, a pill-style toggle for Consolidated/Separate views, and a simplified "¿Cómo se calcula esto?" accordion focused on trust-building rather than mechanics.
5. **Estimate framing** — an amber notice bar explains that all values are estimates based on user-entered data and that CRBOX will confirm the final cost.
6. **Quote handoff to CRBOX** — a "Solicitar cotización a CRBOX" panel appears after calculating. Accepts email (required) and name (optional). Two channels:
   - **Email**: opens `mailto:ventas@crbox.cr` with subject + full body auto-generated from quote state (includes all per-article details + URL + estimated totals). User's email is CC'd.
   - **WhatsApp**: opens `https://wa.me/50689794418?text=<encoded>` with the same content formatted for chat.
   - After triggering, an honest confirmation state is shown: "Tu cotización está lista para enviarse a CRBOX. Revisa y envía el mensaje para completar tu solicitud."

All tariff lookups use `TARIFF_ADAPTER`. Tax figures carry provenance badges (amber = `local_estimated`, green = `official_tica`, blue = `user_override`).

### Tariff integration research

`docs/tariff-integration.md` — documents the Costa Rica DGA/TICA system, publicly accessible endpoints at hacienda.go.cr, recommended sync architecture (periodic import vs. live API), rate-change handling, and fallback behavior. No live API integration is wired (out of scope).

### Auth integration

- **Direct fetch**: all auth/API requests go directly to `https://clients.crbox.cr` from the browser (CORS enabled on backend). `server.py` is a plain static file server on port 5000.
- **Login**: `CRBOXAuth.doLogin(email, password, remember)` POSTs to `https://clients.crbox.cr/authtoken`.
- **Register**: `CRBOXAuth.doRegister(payload)` POSTs to `https://test.clients.crbox.cr/api/crboxwebapi/postregisteruser`. Must inspect `StatusResult`.
- **Session**: `sessionStorage` by default; `localStorage` if "Mantener sesión iniciada" is checked. Keys: `crbox_access_token`, `crbox_expires_at`, `crbox_remember`, `crbox_email`.
- **Script load order**: `cr-locations.js` → `portal-api.js` → `auth.js` → `main.js` (all portal pages).

### Portal API (Task #57)

`js/portal-api.js` — exposes `window.CRBOXPortalAPI` with:

| Method | Endpoint | Notes |
|--------|----------|-------|
| `getUserInfo(opts)` | `GET /getuserinfo/{email}` | Session-cached; `{ forceRefresh: true }` to bypass |
| `updateProfile(payload)` | `POST /postedituser` | Clears cache, re-fetches fresh info |
| `getPackages(idConsignee, start, end, track, status)` | `GET /getuserpackages/...` | Default start: 30 days back; empty track → `null` path segment |
| `getBills(email, start, end)` | `GET /getfacturas/...` | Default start: 30 days back |
| `saveBill(email, file, wrId)` | `POST /api/invoice-upload` (portal proxy) | Step 1 of invoice upload. Stores file on portal server under `uploads/invoices/<uuid>.<ext>`, returns `{url, type, file}` where `url` is the absolute public URL. Requires portal auth (Bearer + X-Casillero-Email). |
| `deleteInvoiceUpload(filename)` | `DELETE /api/invoice-upload/<filename>` | Best-effort cleanup. Called automatically when `createPurchaseBill` fails to remove orphaned uploads. |
| `createPurchaseBill(payload)` | `POST /postcreatepurchasebill` | Step 2. Creates the invoice record on `clients.crbox.cr` with `FileLocation` = absolute URL from step 1. |
| `recoverPassword(email)` | `GET /getuserpasswordrecovery/{email}` | No auth; returns `{ok: bool, message: str}`; rejects only on network error |
| `formatDate(date)` | — | Returns `DD-MM-YYYY` string |

### Invoice Upload Architecture

**Intentional architecture decision — not a temporary workaround.**

The original `saveBill` flow called `https://crbox.cr/wp-json/crbox/v1/saveBill` directly from the browser, sending `Authorization: Bearer <token>`. It failed with `{"Error":"The user is not logged in"}`.

**Cause-root (corrected):** The evidence shows the old request did carry a Bearer token — no WordPress session cookies were visible in the captured requests. The most likely failure reason is that the Bearer token issued by `clients.crbox.cr` is not recognised by the WordPress site (`crbox.cr`), combined with a possible origin/context restriction (the endpoint may only accept calls originating from within the `crbox.cr` context). The claim that this required a WordPress browser-session cookie is **not supported by the available evidence** and has been removed from this document.

The server-side proxy approach resolves this regardless of exact cause: a server-to-server call from our Python server bypasses both CORS and any origin-based restrictions that the WP endpoint may apply to browser requests.

⚠️ **End-to-end validation status:** the code has been verified structurally (auth guard rejects invalid tokens, files are saved, DELETE cleans up correctly). A full real-user end-to-end test — upload → `postcreatepurchasebill` returns OK → invoice is visible and usable downstream in the CRBOX admin — **has not been performed yet**. "API responded OK" and "invoice works downstream in CRBOX" are not the same thing and should be confirmed before treating this as production-ready.

The replacement stores invoice files on the portal server itself under `uploads/invoices/<uuid>.<ext>` and serves them over the portal's public HTTPS URL. This is appropriate because:

- **Auth**: `POST /api/invoice-upload` requires a valid CRBOX Bearer token verified server-side via the CRBOX API (`/getuserinfo`). Auth is not just a string check.
- **File validation**: MIME type must be PDF, JPG, JPEG, PNG, GIF, or WEBP. Max 12 MB. Both enforced server-side.
- **Orphan cleanup**: if `createPurchaseBill` (step 2) fails, the JS immediately calls `DELETE /api/invoice-upload/<filename>`. A background thread also sweeps files older than 30 days.
- **Privacy**: files are reachable by direct UUID path without auth. UUIDs provide 122 bits of entropy (enumeration-proof). This matches how the original WordPress URL model worked and is required so the CRBOX backend can fetch the file without portal credentials.
- **Production URL**: the `FileLocation` value is `window.location.origin + '/uploads/invoices/<uuid>.<ext>'`, which in production resolves to the deployed Replit HTTPS domain. Files persist as long as the deployment is running.
- **Upload directory**: `uploads/invoices/` — excluded from git via `.gitignore`, kept alive via `.gitkeep`.

Portal pages wired (all four now call real API on DOMContentLoaded):
- **dashboard.html** — header name, casillero, Miami address name, welcome h1
- **mis-paquetes.html** — header, stat cards, packages table (`#packages-tbody`)
- **mi-cuenta.html** — header, profile section, form pre-fill, save via `updateProfile`
- **mis-facturas.html** — header, bills table (`#bills-tbody`), "Buscar Facturas" button
- **login.html** — recovery modal uses real `recoverPassword` API

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/inject-gtm.js` | Injects GTM container ID from config into all public pages |
| `scripts/post-merge.sh` | Post-merge hook — runs inject-gtm.js automatically |

## CSS Versioning

Portal pages share these versioned stylesheets (bump query param when editing):

| File | Current version | Loaded on |
|------|----------------|-----------|
| `css/styles.css` | v=6 | All pages |
| `css/responsive.css` | v=15 | All pages (portal pages use higher version) |
| `css/dashboard.css` | v=6 | dashboard.html, mi-cuenta.html, afiliate.html |

Key CSS layers:
- `styles.css` — global tap-highlight removal (`* { -webkit-tap-highlight-color: transparent }`), `:focus-visible` ring in CRBOX orange
- `responsive.css` — portal tab bar pill style (desktop `min-width: 769px`), bill-row cardification, Mis Facturas expanded recibos stacked cards (mobile `max-width: 640px`)
- `dashboard.css` — glass-card / orange-card, shimmer, stat-card animations, copy-button focus fix; Mi Cuenta components (profile-banner, profile-avatar, account-section-title, account-coming-soon, account-danger-zone, account-inner-tab-strip)

## Portal UI Notes

- **Tab bar** (all 4 portal pages): flat bottom-border on mobile; segmented-control pill on desktop (white active pill + gray tray via responsive.css `@media (min-width: 769px)`)
- **Casillero card icon**: `bg-white text-orange-600` (white bg, orange icon) for clear contrast against the orange glass card
- **Copy button**: pill-shaped with `bg-white/15` frosted treatment; `active:scale-95` press feedback; no tap highlight
- **Mis Facturas expanded view**: on mobile, the 7-column nested recibo table becomes stacked key-value mini-cards (CSS display:block technique + `data-label` attributes)
- **Mis Paquetes**: edit button (`btn-edit`) removed from list view, grid view, and event handler
- **Factura → Paquete navigation (Task #126)**: each recibo row in the expanded factura detail table has a "Ver paquete →" link pointing to `mis-paquetes.html?receipt=<r.number>` (URI-encoded). Mis Paquetes reads the `?receipt=` URL param on init, pre-fills `#search-input`, and post-filters `_cachedPackages` client-side by `pkg.number === receiptParam` (Path B — API does not accept receipt numbers in the tracking search param). Link is omitted when `r.number` is null/empty.
- **Mi Cuenta profile header**: orange gradient `.profile-banner` band at top of card; `.profile-avatar` floats up with `margin-top: -2rem` to overlap banner; white `border + box-shadow` ring for depth
- **Mi Cuenta account-section-title**: elevated from tiny uppercase eyebrow (0.6875rem gray) to 0.9375rem gray-800 heading with `border-bottom: 1px solid #F3F4F6` separator; specificity overrides for `mb-0` / `mb-4` Tailwind combinations
- **Mi Cuenta coming-soon blocks**: replaced `bg-gray-50 border-gray-200` with `.account-coming-soon` (amber-50 tint, orange clock icon)
- **Mi Cuenta inner tab strip**: `.account-inner-tab-strip` provides `bg-gray-50` tray; intentionally kept as bottom-border (distinct from portal-level pill nav)
- **Mi Cuenta delete account**: `.account-danger-zone` with `border: 1px solid #FEE2E2` and `border-left: 4px solid #FCA5A5` red accent

## Server (`server.py`)

Static file server on port 5000 (`python3 server.py`). Custom endpoints:

| Path | Method | Purpose |
|------|--------|---------|
| `/health` | GET | Probes SMTP (connect + authenticate, no email sent). Returns `{"ok":true,"smtp":"ok"}` (200) or `{"ok":false,"smtp":"error","error":"..."}` (503). Use this URL with any external uptime monitor (UptimeRobot, Better Uptime, etc.). |
| `/crbox-svc-token` | POST | Authenticates with the CRBOX service account (credentials from env vars) and returns `{ access_token }`. Browser never sees the raw credentials. |
| `/send-quote` | POST | Sends the calculator quote form email via Google Workspace SMTP to `ventas@crbox.cr`, with the user CC'd. Returns `{"ok": true}` on success. Every call (success or failure) is appended to `quote_submissions.log` (JSONL). |
| `/api/ai/extract` | POST | AI product data extraction. Two-stage pipeline: (1) fetch page HTML via `_fetch_page` + Gemini HTML analysis; if page is bot-blocked (CAPTCHA/WAF), (2) Google Search fallback via `_call_gemini_search_fallback` using `types.Tool(google_search=...)`. After extraction, if weight or dimensions are still missing, `_call_gemini_estimate(product_name, category)` runs a third Gemini call to estimate them (provenance="estimated", confidence=0.55). Response always includes a `compliance` block: `{classification: ALLOWED/RESTRICTED/COURIER_RESTRICTED/PROHIBITED, risk_level, reason, authority, verdict}` — used by the frontend to show a compliance card and optionally block form submission. |
| `/api/solicitudes` | POST | Stores quote request in SQLite. Accepts `ai_extraction_result` (object) in the JSON body; serialized as `ai_extraction_json TEXT` in the DB for admin display. |
| `/admin/dashboard` | GET | **[Task 297+]** Admin dashboard home page (post-login landing). Shows 4 KPI cards (total, pending attention, completion rate, total declared value USD), a doughnut chart (status distribution via Chart.js 4.4.3 CDN), a bar chart (solicitudes per day — last 7 days), a horizontal-scroll kanban board (Nuevas / En Revisión / Respondidas / En Proceso / Completadas — top 4 mini-cards each), and a recent activity table. Login redirects here instead of `/admin/solicitudes`. `/admin` also serves this page. |
| `/admin/solicitudes` | GET | Admin list view with filter tabs, data-source badges (Manual / AI — completo / AI — parcial), and "Ver →" links per row. |
| `/admin/solicitudes/:id` | GET | **[Task 185]** Admin detail page. Shows customer block, product block, AI extraction snapshot with per-field confidence (amber highlight if < 0.80 or `needs_confirmation`), Estimado del sistema block, status history timeline, inline status update form, and **[Task 188]** Response Composer (embedded form for enviada/en_revision solicitudes to confirm price, availability, conditions, and send a structured response email; renders as read-only "Respuesta enviada" block once response_json is committed). |
| `/admin/solicitudes/:id/respond` | POST | **[Task 188]** Admin response composer handler. Validates fields, sends customer response email via SMTP, then commits: status→`respondida`, `responded_at`, `response_json` (stable JSON schema: `confirmed_shipping_price_usd`, `availability`, `delivery_timeline`, `conditions`, `difference_explanation`, `customer_message`, `sent_at`), and status history note. DB writes only committed after email success. |
| `/admin/solicitudes/:id/suggest-draft` | POST | **[Task 189]** Gemini draft assistance endpoint. Admin-only (requires `admin_session`). Accepts JSON `{availability, confirmed_price}`. Reads solicitud context (product, estimate, AI extraction confidence), builds structured Gemini prompt, returns `{customer_message, conditions, difference_explanation}` — never modifies DB. Returns `{error}` on Gemini failure. |
| `/api/package-groups` | GET | **[Task 316]** Returns all server-side package groups for the authenticated user. Requires Bearer + X-Casillero-Email. Returns `{"ok": true, "groups": [...]}`. |
| `/api/package-groups` | POST | **[Task 316]** Creates (or replaces) a group for the authenticated user. Body: full group JSON. Returns `{"ok": true, "group": {...}}`. |
| `/api/package-groups/:id` | PATCH | **[Task 316]** Replaces the stored data for a group. Body: full updated group JSON. Returns `{"ok": true, "group": {...}}`. |
| `/api/package-groups/:id` | DELETE | **[Task 316]** Removes a group for the authenticated user. Returns `{"ok": true}`. |
| `/api/faq-pregunta` | POST | **[Task 221]** Accepts `{nombre, correo, pregunta}` from the inline FAQ question form on `como-funciona.html`. Validates required fields, stores in `consultas_generales` via `_store_inquiry(...)`, then attempts email notification to `ventas@crbox.cr`. Email failure is non-fatal — record is preserved and email error logged; only DB failure returns `{"ok": false}`. |
| `/admin/consultas` | GET | **[Task 221]** Protected list view of `consultas_generales` (auth via same `_admin_validate_session` cookie as other admin routes; unauthenticated → 404). Shows all FAQ inquiries newest-first in table (desktop) + card (mobile) layout, consistent with `/admin/solicitudes` styling. Nav link added to admin solicitudes header. |

### SMTP Health Monitoring (Task #154)

`server.py` starts a **background daemon thread** on boot that checks SMTP connectivity every 5 minutes. If a check fails, an alert email is sent immediately to the team (at most once per hour to avoid flooding). The alert includes the exact error and remediation steps.

`healthcheck.py` — standalone script for manual checks or external cron jobs:
```
python3 healthcheck.py    # exits 0 if SMTP OK, 1 if failed; sends alert email on failure
```

**Cron example (check every 5 min, log to file):**
```
*/5 * * * * /usr/bin/python3 /path/to/healthcheck.py >> /var/log/crbox-health.log 2>&1
```

**External uptime monitor (recommended for immediate alerting independent of the server process):**
- Point any uptime monitor (UptimeRobot free tier, Better Uptime, etc.) at `GET /health`
- Alert threshold: 1 failure → notify immediately
- The endpoint returns HTTP 200 when SMTP is healthy, 503 when it is not

**Optional env vars:**

| Variable | Default | Description |
|----------|---------|-------------|
| `ALERT_EMAIL` | `ventas@crbox.cr` | Who receives failure alert emails |
| `SMTP_HEALTH_INTERVAL` | `300` | Seconds between background SMTP probes |

**Required env vars / secrets:**

| Variable | Type | Value | Description |
|----------|------|-------|-------------|
| `CRBOX_SVC_EMAIL` | secret | — | Email of the CRBOX service account used to authorize new-user registration |
| `CRBOX_SVC_PASSWORD` | secret | — | Password for the service account above |
| `SMTP_HOST` | env var (shared) | `smtp.gmail.com` | Google Workspace SMTP host |
| `SMTP_PORT` | env var (shared) | `587` | SMTP port (STARTTLS) |
| `SMTP_USER` | env var (shared) | `ventas@crbox.cr` | SMTP sender address |
| `SMTP_PASS` | secret | — | 16-character Google Workspace App Password for `ventas@crbox.cr`. Generate at myaccount.google.com → Security → 2-Step Verification → App passwords. If missing, `/send-quote` returns 503. |

**Why the proxy exists:** The CRBOX registration endpoint (`postregisteruser`) requires a valid Bearer token from an already-authenticated account. The browser calls `/crbox-svc-token`, receives only the time-limited token, then posts the registration payload with `Authorization: Bearer <token>`. Raw service-account credentials never appear in client-side code or logs.

**Abuse controls on `/crbox-svc-token` and `/send-quote`:**
- **IP rate limiting** — max 5 successful calls per IP per 60-second sliding window → 429 after limit. Implemented with an in-memory dict (`_rate_window`) guarded by a `threading.Lock`.

## Signup & Activation Flow (Task #113)

**Signup (`afiliate.html`)** — segmented tab strip switches between *Personal* and *Business*.

**Layout (Task #130 redesign):** Both forms use a `.signup-split` CSS grid layout — left `.signup-rail` (orange gradient, 248px wide) + right `.signup-panel` (white). Rail contains CRBOX wordmark, vertical `.rail-step` progress (synced with form step via `syncRail(n)` inside `initSignupStepper`), trust anchors, and a mobile `.rail-dot-bar`. Rail step state classes: `rs-active` (white dot), `rs-complete` (check icon), default (faded). Mobile (<768px) collapses to top bar with dot indicators. All split-panel CSS is inline in `afiliate.html`'s `<style>` block (lines ~157–450).

- Personal: 3-step stepper (`.signup-step-panel` panels), rail synced via `syncRail(n)` in `initSignupStepper` IIFE.
  1. **Cuenta** — `first_name`, `last_name_1`, optional `last_name_2`, `email`, `password`/`password_confirm`, optional `promo_code`
  2. **Identidad** — `id_type` (`.id-choice-card` buttons inside `#personal-id-type-pills` container with class `id-choice-cards`; JS `initIdTypePills` finds them by `[data-idtype]` selector; value written to sr-only `<select name="id_type" id="personal-id-type-select">`), `id_number`, `birth_date`, single `phone_number[]` (hidden `phone_type[]=movil`)
  3. **Entrega + términos** — `.delivery-rows` container with `.delivery-card` row-style buttons (horizontal: icon + body + badge + check ring); writes `delivery_service[]` to `#delivery-service-input`. Picking sucursal fills `.address-entry` from `BRANCH_ADDRESSES`; picking `domicilio` reveals `#domicilio-address-form` inside `.domicilio-panel` for province/canton/district cascade. Submit (`#signup-submit-btn`) disabled until card chosen. `terms` required; `newsletter` optional.
- Province→canton→district cascade: single `initAddressCascade()` IIFE (scoped per `.address-entry`), listens on `change` events, uses `locationDatabase` + `CRLocations.normalizeKey`. Replaces old broken `setupProvinceSelectors`/`setupCantonSelectors`/`setupDistrictSelectors` calls.
- Stepper navigation validates per step; on step 3 requires a delivery card and visible domicilio fields if applicable.
- On `OK` from registration, `showRegSuccess(form, email, password)` sets `localStorage.crbox_onboarding='1'` and attempts auto-login. Errors → `classifyAuthError`: network → soft fallback panel; lifecycle → amber `showLifecycleFailure` panel. Auto-login success → `dashboard.html?onboarding=1`.
- Business tab: **2-step split-panel form**. Step 1 — **Tu empresa**: `company_name`, `email`, `password`/`password_confirm`, optional `promo_code`. Step 2 — **Contacto y entrega**: `id_number` (hardcoded `IdentificationType='Otro'`), `contact_name_1` (required), `contact_name_2` (optional), `alt_email` (optional), `phone_number[]`, delivery card, terms.
- Business payload differences from personal: `IsCompany='1'`, `IdentificationType='Otro'`, `BirthDate=''`, blank `LastName1/2`, `ContactName1/2`, `AlternativeEmail`.
- Business stepper: `initBusinessStepper()` IIFE with `syncBizRail(n)` helper; delivery cards: `initBusinessDeliveryCards()` IIFE using `.biz-delivery-card` class + `#biz-delivery-service-input` + `#biz-domicilio-address-form`; submit: `handleBusinessRegistration(form)` on form submit; password toggle `.toggle-password` shared.

**Registration baseline — confirmed working (2026-04-26):**

This is the authoritative baseline. All future work builds on a confirmed working lifecycle. Do not revert the endpoint or remove `Consignee.BirthDate`.

**Validated lifecycle — FULLY CONFIRMED end-to-end (2026-04-26):**
1. **Registration** — `POST https://clients.crbox.cr/api/crboxwebapi/postregisteruser` → `StatusResult: OK`
2. **Auto-login** — `POST https://clients.crbox.cr/authtoken` → `bearer` token, `expires_in: 86399`
3. **getuserinfo** — coherent account object returned: `idconsignee`, `identificationnumber`, `sucursal._idsucursal`, `Phones[1]`, `Addresses[1]`, `birthDate` all present
4. **postedituser** — `POST /postedituser` with `Consignee.IdConsignee` → `StatusResult: OK`
5. **Old portal cross-check** — the account created by the new-site flow loads correctly in the existing fully-connected portal, confirming the record is valid and usable across the real system.

The registration foundation is **closed**. Do not re-investigate whether the backend lifecycle works. Future work is UX polish, onboarding refinement, and activation-state handling only.

**Fixed invariants — do not change:**
- `REGISTER_URL` in `js/auth.js` must stay on `https://clients.crbox.cr/...`. The staging `test.clients.crbox.cr` endpoint was separately broken and is no longer in use.
- `Consignee.BirthDate` must remain in the payload. It is required by the backend. The form collects it via `<input type="date" name="birth_date">` in Step 2 (Identidad).

**Debugging future registration failures (generic error `"Hubo un error..."`):**
This same error covers three distinct root causes — check in order:
1. **Throwaway email domain** — `@mailinator.com` and similar are blocked. Use a real domain (`@gmail.com`, `@proton.me`).
2. **Duplicate email** — the email is already registered.
3. **Duplicate ID number** — the `IdentificationNumber` is already in the system.
Never assume a payload field error before ruling out all three.

**Confirmed test account (created and validated 2026-04-26):**
- Email: `crboxqa.1777237329@proton.me`
- Password: `CrboxQA2026!`
- Full name: Ana Laura Rojas Campos
- ID type: Cédula ó Residencia / ID number: `377237329`
- Birth date: `1992-08-14` / Phone: `88112233`
- Sucursal: Sabana Norte (idSucursal: 1)
- idconsignee / casillero: **50635142**
- Account state: ACTIVATED (all profile fields present; activation toast fires once on first dashboard load)
- Cross-checked: loads correctly in both new-site portal and legacy portal.

**Note on `postedituser`:** confirmed working with the same payload structure as registration plus `Consignee.IdConsignee`. Mi Cuenta save-profile flow is structurally correct.

**Account state model (client-side)** — derived from `getUserInfo()` response:
- `created` — barebones record: name + email only
- `incomplete` — has name + ID number but missing phone or address
- `activated` — name + ID + ≥1 phone + ≥1 address all present

**Dashboard activation checklist** (`#activation-card` in `dashboard.html`) — **non-dismissable**. Visible whenever `_accountStateFrom(info)` returns `created` or `incomplete`. Hides only when state is `activated`, at which point a one-time `#activation-toast` slides up from the bottom (gated by `localStorage.crbox_activation_toast_shown`). Two checklist items (`profile`, `address`) deep-link into `mi-cuenta.html?setup=1&tab=personal-info|address-info`. A "first shipment" step was considered but removed — shipment history is not available from `getUserInfo`, so it would always render as incomplete. The legacy `crbox_onboarding_dismissed` localStorage key and dismiss button were removed.

**`hasAddress` heuristic** — both `_accountStateFrom` and `_maybeShowActivationCard` check for address completeness using `a.line1 || a.Line1 || a.direccion || a.Direccion` (the confirmed API field names from the Postman collection) as well as the legacy fallbacks `a.addressdetails || a.AddressDetails || a.address1 || a.Address1`. Prior to Task #115 only the legacy names were checked, which would have caused the address step to never clear for addresses submitted through the new signup form.

**E2E test script** — `scripts/e2e-signup-test.js` is a browser-runnable script (paste into DevTools console on any page that loads `auth.js` + `portal-api.js`) that exercises the full T1–T6 flow and prints PASS/FAIL for each assertion. Must be run against `clients.crbox.cr` (production). Use a real email domain — `@mailinator.com` and similar throwaway domains are blocked by the backend.

**Mi Cuenta deep-link + setup mode** (`mi-cuenta.html`):
- **Always-on** `?tab=<personal-info|address-info|security|notifications>` activates the matching tab and scrolls its button into view (works regardless of `setup`).
- `?setup=1` additionally renders `.setup-banner` (contextual title + body per `tab`), highlights the active tab panel via `.setup-active-tab`, applies `.setup-emphasis` (orange ring) + `.setup-emphasis-wrap` (left-rail accent) to the fields that matter for the requested step, scrolls the first emphasized field into view on mobile, and rewrites the active tab's primary CTA (`#save-profile-btn` or `#save-address-btn`) to "Guardar y continuar". A `MutationObserver` watches the button's success state ("¡Guardado!") and redirects back to `dashboard.html?onboarding=1` on save. Dismissing the banner strips `setup` from the URL and clears emphasis classes.

**localStorage keys**
- `crbox_onboarding` — set to `'1'` immediately after a successful signup; `_loadDashboard` reads this flag (and `?onboarding=1` URL param) on init: if either is set, once the activation card is revealed it is scrolled into view (`scrollIntoView` with 400 ms delay), then the flag is cleared from localStorage
- `crbox_activation_toast_shown` — set to `'1'` the first time the activation toast is shown so it never reappears

**CSS** — `dashboard.css` bumped to `?v=6` everywhere. New tokens: `.delivery-cards` / `.delivery-card` / `.delivery-card-icon|title|meta|tag|tag-alt` / `.is-selected`, `.activation-toast` / `.activation-toast-icon|text|close` / `.is-visible`, `.setup-emphasis` / `.setup-emphasis-wrap` / `.setup-active-tab` / `.setup-cta`. `afiliate.html` now also loads `dashboard.css` because the delivery cards live there.

## Docs

Additional documentation lives in the `docs/` directory.
