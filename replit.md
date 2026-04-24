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

### Auth integration (Task #53)

- **Proxy**: all auth requests go through same-origin proxy endpoints in `server.py` (`POST /api/auth/login`, `/api/auth/register`, `/api/auth/update`), which forward to the CRBOX backend via Python's `urllib.request` — no direct cross-origin browser fetch.
- **Login**: `CRBOXAuth.doLogin(email, password, remember)` POSTs to `/api/auth/login` (proxied to `https://clients.crbox.cr/authtoken`).
- **Register**: `CRBOXAuth.doRegister(payload)` POSTs to `/api/auth/register` (proxied to `https://test.clients.crbox.cr/api/crboxwebapi/postregisteruser`). Must inspect `StatusResult` — HTTP 200 alone is not success.
- **Session**: `sessionStorage` by default; `localStorage` if "Mantener sesión iniciada" is checked. Keys: `crbox_access_token`, `crbox_expires_at`, `crbox_remember`.
- **`PENDING_BACKEND_CONFIRMATION`** in `auth.js`: `newAddressId: 0` (unconfirmed), `newPhoneId: 0` (unconfirmed), `sucursalIdMap` all null (blocks submission until backend confirms IDs for Sabana Norte / Guadalupe / Domicilio).
- **Update Profile scaffold**: `CRBOXAuth.buildUpdateProfilePayload()` is intentionally blocked until a GET-user endpoint is available.
- **Script load order**: `cr-locations.js` → `auth.js` → `main.js` (all pages with shared header).

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/inject-gtm.js` | Injects GTM container ID from config into all public pages |
| `scripts/post-merge.sh` | Post-merge hook — runs inject-gtm.js automatically |

## Docs

Additional documentation lives in the `docs/` directory.
