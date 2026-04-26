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
| `css/styles.css` | v=5 | All pages |
| `css/responsive.css` | v=14 | All pages (portal pages use higher version) |
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
- **Mi Cuenta profile header**: orange gradient `.profile-banner` band at top of card; `.profile-avatar` floats up with `margin-top: -2rem` to overlap banner; white `border + box-shadow` ring for depth
- **Mi Cuenta account-section-title**: elevated from tiny uppercase eyebrow (0.6875rem gray) to 0.9375rem gray-800 heading with `border-bottom: 1px solid #F3F4F6` separator; specificity overrides for `mb-0` / `mb-4` Tailwind combinations
- **Mi Cuenta coming-soon blocks**: replaced `bg-gray-50 border-gray-200` with `.account-coming-soon` (amber-50 tint, orange clock icon)
- **Mi Cuenta inner tab strip**: `.account-inner-tab-strip` provides `bg-gray-50` tray; intentionally kept as bottom-border (distinct from portal-level pill nav)
- **Mi Cuenta delete account**: `.account-danger-zone` with `border: 1px solid #FEE2E2` and `border-left: 4px solid #FCA5A5` red accent

## Signup & Activation Flow (Task #113)

**Signup (`afiliate.html`)** — segmented tab strip switches between *Personal* and *Business*.
- Personal: 3-step stepper (`.signup-stepper` + `.signup-step-panel` panels)
  1. Personal info — `first_name`, `last_name`, `email`, `id_type`, `id_number`, `phone_number[]` (single, hidden `phone_type[]=movil`), `password`
  2. Delivery in CR — `delivery_service[]` (sucursal or `domicilio`), single residential address (hidden `address_type[]=residencial`), `province[]/canton[]/district[]`, optional `postal_code[]`, `neighborhood[]`, required `address_details[]`
  3. Confirm — auto-rendered summary, optional `promo_code`, required `terms`, optional `newsletter`
- Submit handler is unchanged (still flattens via `paramsFromForm`); on `OK` it calls `showRegSuccess(form, email, password)` which sets `localStorage.crbox_onboarding='1'`, attempts `CRBOXAuth.doLogin(email, password, true)`, and on success redirects to `dashboard.html?onboarding=1`. On failure it falls back to a "Iniciar Sesión →" link with email pre-filled.
- Business: contact-card CTA (WhatsApp `wa.me/50689794418` + `mailto:ventas@crbox.cr`); the old empresa form, its submit handler, and the SweetAlert2 loader were removed.

**Account state model (client-side)** — derived from `getUserInfo()` response:
- `incomplete` — missing any of: name, identification number, at least one phone, at least one address
- `activated` — all of the above present

**Dashboard activation card** (`#activation-card` in `dashboard.html`) — appears above the welcome banner when:
- `?onboarding=1` is in the URL, **or**
- `localStorage.crbox_onboarding === '1'`, **or**
- `getUserInfo()` returns an `incomplete` profile

  …**unless** `localStorage.crbox_onboarding_dismissed === '1'`. Three checklist items (profile, address, first shipment) link to `mi-cuenta.html?setup=1&tab=…` or `calculadora.html`. Per-step completion is computed from the same fields as the state model. Dismiss button sets `crbox_onboarding_dismissed=1` and clears `crbox_onboarding`.

**Mi Cuenta setup mode** (`mi-cuenta.html`) — when arriving with `?setup=1`, the `.setup-banner` above the inner tab strip explains what to complete; with `&tab=personal-info|address-info|security|notifications` it auto-activates that tab and rewrites the banner copy. Dismissing the banner strips the query params via `history.replaceState`.

**localStorage keys**
- `crbox_onboarding` — set to `'1'` immediately after a successful signup; consumed by the dashboard activation card and cleared on dismiss
- `crbox_onboarding_dismissed` — set to `'1'` when the user closes the activation card (sticky)

## Docs

Additional documentation lives in the `docs/` directory.
