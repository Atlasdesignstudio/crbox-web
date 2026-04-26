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
| `js/seo-config.js` | SEO/structured data configuration |

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
| `recoverPassword(email)` | `GET /getuserpasswordrecovery/{email}` | No auth; returns `{ok: bool, message: str}`; rejects only on network error |
| `formatDate(date)` | — | Returns `DD-MM-YYYY` string |

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
| `css/dashboard.css` | v=5 | dashboard.html, mi-cuenta.html |

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

## Signup & Activation Flow (Task #113)

**Signup (`afiliate.html`)** — segmented tab strip switches between *Personal* and *Business*.
- Personal: 3-step stepper (`.signup-stepper` + `.signup-step-panel` panels)
  1. **Cuenta** — single `full_name` (split client-side: token 1 → ConsigneeName, token 2 → ConsigneeLastName1, remainder → ConsigneeLastName2), `email`, `password`, `password_confirm`, optional `promo_code`
  2. **Identidad** — `id_type`, `id_number`, `birth_date` (→ `Consignee.BirthDate`, required by backend), single `phone_number[]` (hidden `phone_type[]=movil`)
  3. **Entrega + términos** — visual `.delivery-cards` radio group (4 cards) writes `delivery_service[]` to a hidden input. Picking a sucursal (`sabana_norte` / `guadalupe` / `guachipelin_escazu`) silently fills the single hidden `.address-entry` from the `BRANCH_ADDRESSES` constant (INEC-verified provincia/cantón/distrito); picking `domicilio` reveals `#domicilio-address-form` for `province[]`/`canton[]`/`district[]` + optional `postal_code[]`/`neighborhood[]` + required `address_details[]` (flagged via `data-domicilio-required`). Submit (`#signup-submit-btn`) is disabled until a card is chosen. `terms` required; `newsletter` optional.
- Stepper navigation validates per step (passwords match on step 1; ID-number Luhn-style not enforced; on step 3 it requires a card and any visible domicilio fields).
- On `OK` from registration, `showRegSuccess(form, email, password)` sets `localStorage.crbox_onboarding='1'` and attempts `CRBOXAuth.doLogin(email, password, true)`. Errors are routed through `classifyAuthError`: `TypeError` / "failed to fetch" / timeout → **network** → soft fallback panel with "Iniciar Sesión →"; everything else (HTTP errors, malformed token, lifecycle issues) → **lifecycle** → amber `showLifecycleFailure` panel with the raw error detail and a manual login link. Auto-login success redirects to `dashboard.html?onboarding=1`.
- Business tab is now a contact card (WhatsApp `wa.me/50689794418` + `mailto:ventas@crbox.cr`); the empresa form, its submit handler, and the SweetAlert2 loader were removed.

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
- `crbox_onboarding` — set to `'1'` immediately after a successful signup; signals the dashboard to keep the activation context fresh
- `crbox_activation_toast_shown` — set to `'1'` the first time the activation toast is shown so it never reappears

**CSS** — `dashboard.css` bumped to `?v=6` everywhere. New tokens: `.delivery-cards` / `.delivery-card` / `.delivery-card-icon|title|meta|tag|tag-alt` / `.is-selected`, `.activation-toast` / `.activation-toast-icon|text|close` / `.is-visible`, `.setup-emphasis` / `.setup-emphasis-wrap` / `.setup-active-tab` / `.setup-cta`. `afiliate.html` now also loads `dashboard.css` because the delivery cards live there.

## Docs

Additional documentation lives in the `docs/` directory.
