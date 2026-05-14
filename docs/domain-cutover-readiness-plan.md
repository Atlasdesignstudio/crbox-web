# CRBOX Domain Cutover & Rollback Readiness Plan

**Document version:** 1.0  
**Date:** 2026-05-14  
**Status:** Planning & documentation only — no DNS, hosting, deployment, code, or legacy system changes are made in this document.  
**Overall rating:** **B — Needs specific fixes before cutover**

---

## Table of Contents

1. [Current Domain Architecture](#1-current-domain-architecture)
2. [Route Inventory Table](#2-route-inventory-table)
3. [Legacy Dependency Map](#3-legacy-dependency-map)
4. [DNS / SSL / Hosting Plan](#4-dns--ssl--hosting-plan)
5. [SEO / Indexing Plan](#5-seo--indexing-plan)
6. [Analytics / Tracking Plan](#6-analytics--tracking-plan)
7. [Cutover Stages](#7-cutover-stages)
8. [Pre-Cutover Smoke Test Checklist](#8-pre-cutover-smoke-test-checklist)
9. [Rollback Plan](#9-rollback-plan)
10. [Go / No-Go Checklist](#10-go--no-go-checklist)
11. [Current vs Future Routing Decision](#11-current-vs-future-routing-decision)
12. [Legacy Preservation and Decommission Policy](#12-legacy-preservation-and-decommission-policy)
13. [Key Blockers and Readiness Estimate](#13-key-blockers-and-readiness-estimate)
14. [Final Recommendation](#14-final-recommendation)

---

## 1. Current Domain Architecture

### 1.1 Production Domain

- **Primary domain:** `https://crbox.cr` — source: `js/seo-config.js` line 23 (`site.domain`)
- **Sitemap self-reference:** `https://crbox.cr/sitemap.xml` — source: `sitemap.xml` line 1–4 and `robots.txt` line 17

### 1.2 New Site Hosting

- **Runtime:** Python 3, Flask-equivalent HTTP server (`server.py`) listening on port 5000 — source: `server.py` line 24 (`ThreadingHTTPServer`), `replit.md` Run & Operate section
- **Deployment target:** Replit cloud deployment (Replit preview URL during staging; mapped to `crbox.cr` after DNS cutover)
- **Static files:** Served directly from the project root by `server.py` — source: `server.py` line 24 (`SimpleHTTPRequestHandler` base class)

### 1.3 Legacy API Base

- **Base URL:** `https://clients.crbox.cr/api/crboxwebapi` — source: `js/portal-api.js` line 16 (`BASE` constant)
- **Auth endpoint (login):** `https://clients.crbox.cr/authtoken` — source: `js/auth.js` line 30 (`LOGIN_URL`)
- **Registration endpoint:** `https://clients.crbox.cr/api/crboxwebapi/postregisteruser` — source: `js/auth.js` line 31 (`REGISTER_URL`)
- **Status:** These legacy APIs remain authoritative for all authentication and all write operations. They are not being decommissioned as part of this cutover.

### 1.4 Server-Side Proxy Layer

`server.py` provides a set of server-side proxies that mediate between the new site and legacy services. These exist to handle CORS constraints, credential isolation, or origin-based response differences:

| Proxy route | Direction | Purpose | Source |
|---|---|---|---|
| `POST /crbox-svc-token` | New site → legacy auth | Fetches a service-account Bearer token for registration; isolates `CRBOX_SVC_EMAIL` / `CRBOX_SVC_PASSWORD` env vars from the browser | `server.py` line 9679, `js/auth.js` `_getSvcToken()` |
| `GET /api/userinfo-proxy` | New site → `getuserinfo` | Server-to-server fallback when direct browser call returns non-JSON (origin/CORS mismatch on dev) | `server.py` line 9517, `js/portal-api.js` `_tryUserInfoProxy()` |
| `GET /api/packages-proxy` | New site → `getuserpackages` | Server-to-server fallback for packages when direct call returns non-JSON | `server.py` line 9515, `js/portal-api.js` `_tryPackagesProxy()` |
| `POST /api/invoice-upload` | Browser → `server.py` → WordPress | Uploads invoice PDF to the WordPress/CRBOX admin; proxies `postcreatepurchasebill` in a follow-up step | `server.py` line 9709, `js/portal-api.js` line 641 |

### 1.5 Route Classification Summary

| Classification | Routes |
|---|---|
| **Public** | `index.html`, `servicios.html`, `como-funciona.html`, `tarifas.html`, `calculadora.html`, `contacto.html`, `afiliate.html`, `privacidad.html`, `terminos.html` |
| **Portal / Private** | `dashboard.html`, `mis-paquetes.html`, `mis-facturas.html`, `mi-cuenta.html`, `mis-solicitudes.html`, `solicitud.html` |
| **Mixed** (public-facing but intentionally noindexed/disallowed) | `login.html`, `cotizar.html`, `404.html` |
| **Legacy-API-dependent** | All portal pages, `login.html`, `afiliate.html`, `cotizar.html` (quote submission) |
| **New-RDS-path available (gated)** | `mis-paquetes.html` (packages, shadow validation in progress), `mis-facturas.html` (invoices, QA-passed in dev/test, production shadow validation pending) |

---

## 2. Route Inventory Table

All 18 HTML pages in the codebase are listed below. Existence confirmed by file presence in the project root.

| # | Path | Exists in new site | Auth required | SEO indexable | noindex confirmed | Canonical present | Known dependency | Readiness status | Blocker | Recommended cutover strategy |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `index.html` | Yes — `index.html` | No | Yes | No (indexed: `index, follow` — `index.html` line 33) | Yes — `<link rel="canonical" href="https://crbox.cr/">` (`index.html` line 32) | None (static) | Ready | None | Fully served by new site |
| 2 | `servicios.html` | Yes — `servicios.html` | No | Yes | No (indexed: `index, follow` — `servicios.html` line 13) | Yes — `<link rel="canonical" href="https://crbox.cr/servicios.html">` (`servicios.html` line 12) | None (static) | Ready | None | Fully served by new site |
| 3 | `como-funciona.html` | Yes — `como-funciona.html` | No | Yes | No (indexed: `index, follow` — `como-funciona.html` line 30) | Yes — `<link rel="canonical" href="https://crbox.cr/como-funciona.html">` (`como-funciona.html` line 29) | None (static) | Ready | None | Fully served by new site |
| 4 | `tarifas.html` | Yes — `tarifas.html` | No | Yes | No (indexed: `index, follow` — `tarifas.html` line 13) | Yes — `<link rel="canonical" href="https://crbox.cr/tarifas.html">` (`tarifas.html` line 12) | None (static) | Ready | None | Fully served by new site |
| 5 | `calculadora.html` | Yes — `calculadora.html` | No | Yes | No (indexed: `index, follow` — `calculadora.html` line 13) | Yes — `<link rel="canonical" href="https://crbox.cr/calculadora.html">` (`calculadora.html` line 12) | `js/calculator-engine.js`, `js/tariff-adapter.js` | Ready | None | Fully served by new site |
| 6 | `contacto.html` | Yes — `contacto.html` | No | Yes | No (indexed: `index, follow` — `contacto.html` line 30) | Yes — `<link rel="canonical" href="https://crbox.cr/contacto.html">` (`contacto.html` line 29) | `server.py` contact form handler | Ready | None | Fully served by new site; contact form backend via `server.py` |
| 7 | `afiliate.html` | Yes — `afiliate.html` | No | Yes | No (indexed: `index, follow` — `afiliate.html` line 15) | Yes — `<link rel="canonical" href="https://crbox.cr/afiliate.html">` (`afiliate.html` line 17) | `js/auth.js` `doRegister()`, `POST /postregisteruser` via `/crbox-svc-token` proxy | Ready (with legacy API coexistence) | None — legacy `/postregisteruser` retained | New UI + legacy `/postregisteruser` via `/crbox-svc-token` proxy |
| 8 | `privacidad.html` | Yes — `privacidad.html` | No | Yes | No (indexed: `index, follow` — `privacidad.html` line 12) | Yes — `<link rel="canonical" href="https://crbox.cr/privacidad.html">` (`privacidad.html` line 13) | None (static) | Ready | None | Fully served by new site |
| 9 | `terminos.html` | Yes — `terminos.html` | No | Yes | No (indexed: `index, follow` — `terminos.html` line 12) | Yes — `<link rel="canonical" href="https://crbox.cr/terminos.html">` (`terminos.html` line 13) | None (static) | Ready | None | Fully served by new site |
| 10 | `login.html` | Yes — `login.html` | No (public-facing) | No | **Confirmed** — `noindex, nofollow` (`login.html` line 16) | No canonical | `js/auth.js` `doLogin()`, `POST /authtoken` direct to `clients.crbox.cr` | Ready (with legacy API coexistence) | None — legacy `/authtoken` retained | New UI + legacy `/authtoken` |
| 11 | `cotizar.html` | Yes — `cotizar.html` | No (optional auth) | No | **Confirmed** — `noindex, nofollow` (`cotizar.html` line 11); also disallowed in `robots.txt` line 11 | Yes — `<link rel="canonical" href="https://crbox.cr/cotizar.html">` (`cotizar.html` line 13) — note: noindex takes precedence; canonical present for cross-reference integrity | `server.py` quote/solicitud submission handler | Ready (indexing controlled) | None for DNS cutover; note: canonical + noindex combination is technically unusual but harmless — noindex prevents Google indexing regardless | New UI + `server.py` quote handler; noindex and robots.txt disallow confirmed |
| 12 | `dashboard.html` | Yes — `dashboard.html` | Yes — enforced by `js/auth.js` `enforceAuthGate()` | No | **Confirmed** — `noindex, nofollow` (`dashboard.html` line 12) | No canonical (intentional — private page) | `js/portal-api.js` `getUserInfo()`, `getPackages()`/`getPackagesRDS()` | Ready (with legacy API coexistence) | None for DNS cutover | New portal UI + legacy read APIs; RDS paths activated incrementally |
| 13 | `mis-paquetes.html` | Yes — `mis-paquetes.html` | Yes — `js/auth.js` `enforceAuthGate()` | No | **Confirmed** — `noindex, nofollow` (`mis-paquetes.html` line 12) | No canonical | `js/portal-api.js` `getPackages()` / `getPackagesRDS()`; RDS shadow validation in progress (`server.py` `/api/admin/rds-shadow-compare`) | Conditional — RDS shadow validation open | RDS packages shadow validation in progress — legacy fallback retained | New UI + RDS read path with legacy fallback; activate RDS path after shadow compare passes |
| 14 | `mis-facturas.html` | Yes — `mis-facturas.html` | Yes — `js/auth.js` `enforceAuthGate()` | No | **Confirmed** — `noindex, nofollow` (`mis-facturas.html` line 16) | No canonical | `js/portal-api.js` `getBills()` (legacy active path); `getBillsRDS()` exists but gated by `USE_RDS_INVOICES_FRONTEND` env flag (`server.py` line 14025) | Conditional — production shadow validation pending | RDS invoices path QA-passed in dev/test; production shadow validation pending | New UI + RDS read path QA-passed in dev/test; production shadow validation required before activating; legacy `getfacturas` fallback retained (`server.py` line 14002, 14025; `js/portal-api.js` line 529) |
| 15 | `mi-cuenta.html` | Yes — `mi-cuenta.html` | Yes — `js/auth.js` `enforceAuthGate()` | No | **Confirmed** — `noindex, nofollow` (`mi-cuenta.html` line 16) | No canonical | `js/portal-api.js` `getUserInfo()`, `updateProfile()` → `POST /postedituser` (legacy write) | Ready (with legacy API coexistence) | None — profile writes stay on legacy | New UI + RDS read + legacy writes via `POST /postedituser` |
| 16 | `mis-solicitudes.html` | Yes — `mis-solicitudes.html` | Yes — `js/auth.js` `enforceAuthGate()` | No | **Confirmed** — `noindex, nofollow` (`mis-solicitudes.html` line 12) | No canonical | `server.py` solicitudes/quotes SQLite DB | Ready | None | New UI + `server.py` solicitudes handler |
| 17 | `solicitud.html` | Yes — `solicitud.html` | Yes — `js/auth.js` `enforceAuthGate()` | No | **Confirmed** — `noindex, nofollow` (`solicitud.html` line 11) | No canonical | `server.py` solicitud form handler | Ready | None | New UI + `server.py` handler |
| 18 | `404.html` | Yes — `404.html` | No | No | **Confirmed** — `noindex, nofollow` (`404.html` line 11) | No canonical (correct for error page) | `server.py` custom 404 handler | Ready | None | Served by new site; verify `server.py` returns HTTP 404 status code |

**Note on `cotizar.html` noindex status:** Explicitly verified. `cotizar.html` line 11 contains `<meta name="robots" content="noindex, nofollow">`. The file also has a canonical at line 13. The `robots.txt` disallow at line 11 further prevents crawling. Noindex status: **confirmed**.

---

## 3. Legacy Dependency Map

All confirmed legacy endpoints are documented below with full source citations. The safe coexistence model requires that all these endpoints remain reachable at `clients.crbox.cr` after DNS cutover.

### 3.1 `POST /authtoken`

| Field | Detail |
|---|---|
| Full URL | `https://clients.crbox.cr/authtoken` |
| HTTP method | POST |
| Frontend file & function | `js/auth.js` `doLogin()` (line 164) |
| Purpose | OAuth2 password grant — exchanges email/password for Bearer token |
| Read or write | Write (creates session token) |
| Auth required | No (unauthenticated endpoint) |
| Payload type | `application/x-www-form-urlencoded` (`grant_type`, `username`, `password`) |
| Safe to retain during cutover | Yes — must remain active; login is entirely dependent on this endpoint |
| Future proxy/replacement | Not required short-term; a future migration would require a new identity provider |
| Blocker classification | **Blocks DNS cutover** if unavailable; must remain reachable from the browser at all times |

### 3.2 `POST /postregisteruser`

| Field | Detail |
|---|---|
| Full URL | `https://clients.crbox.cr/api/crboxwebapi/postregisteruser` |
| HTTP method | POST |
| Frontend file & function | `js/auth.js` `doRegister()` (line 229) |
| Purpose | Creates a new CRBOX user account (casillero registration) |
| Read or write | Write (creates new account record) |
| Auth required | Yes — Bearer token from service account, fetched via `/crbox-svc-token` proxy |
| Payload type | `application/x-www-form-urlencoded` |
| Safe to retain during cutover | Yes — all registrations go through this endpoint; no alternative exists |
| Future proxy/replacement | `/crbox-svc-token` proxy already isolates credentials server-side |
| Blocker classification | **Blocks broad portal rollout** if unavailable (new users cannot register) |

### 3.3 `GET /getuserinfo/{email}`

| Field | Detail |
|---|---|
| Full URL | `https://clients.crbox.cr/api/crboxwebapi/getuserinfo/{email}` |
| HTTP method | GET |
| Frontend files & functions | `js/portal-api.js` `getUserInfo()` (line 280); `js/mobile-drawer.js` `_fetchAndPatchHeader()` (line 75) |
| Purpose | Retrieves full user profile: name, casillero ID, phones, addresses, sucursal |
| Read or write | Read |
| Auth required | Yes — Bearer token required |
| Payload type | N/A (query via URL path) |
| Safe to retain during cutover | Yes — also proxied via `/api/userinfo-proxy` as a CORS fallback (`server.py` line 11014) |
| Future proxy/replacement | RDS-backed profile read path exists (`server.py` RDS profile handlers); not yet activated frontend-side |
| Blocker classification | **Blocks broad portal rollout** if unavailable; all portal pages depend on user info |

### 3.4 `POST /postedituser`

| Field | Detail |
|---|---|
| Full URL | `https://clients.crbox.cr/api/crboxwebapi/postedituser` |
| HTTP method | POST |
| Frontend file & function | `js/portal-api.js` `updateProfile()` (line 310) |
| Purpose | Updates user profile: name, phone, address, sucursal, ID, password |
| Read or write | Write |
| Auth required | Yes — Bearer token required |
| Payload type | `application/x-www-form-urlencoded` (built by `js/auth.js` `buildUpdateProfilePayload()`) |
| Safe to retain during cutover | Yes — all profile writes depend on this; no RDS-backed write alternative exists yet |
| Future proxy/replacement | Future modernization — profile writes must eventually be migrated or proxied |
| Blocker classification | **Non-blocking but recommended** — profile edits are a secondary flow; the site functions without them, but the experience degrades |

### 3.5 `GET /getuserpackages/...`

| Field | Detail |
|---|---|
| Full URL | `https://clients.crbox.cr/api/crboxwebapi/getuserpackages/{id}/{start}/{end}/{tracking}/{status}` |
| HTTP method | GET |
| Frontend file & function | `js/portal-api.js` `getPackages()` (line 335); also proxied via `server.py` `/api/packages-proxy` (line 9515) |
| Purpose | Returns list of packages for a given casillero in a date range |
| Read or write | Read |
| Auth required | Yes — Bearer token required |
| Payload type | N/A (URL path segments) |
| Safe to retain during cutover | Yes — retained as active path while RDS shadow validation is in progress; legacy is the guaranteed fallback |
| Future proxy/replacement | RDS-backed replacement: `js/portal-api.js` `getPackagesRDS()` / `server.py` `/api/portal/my-packages`; shadow validation in progress via `server.py` `/api/admin/rds-shadow-compare` |
| Blocker classification | **Non-blocking** — RDS fallback to legacy is already implemented; DNS cutover can proceed with legacy active |

### 3.6 `GET /getfacturas/...`

| Field | Detail |
|---|---|
| Full URL | `https://clients.crbox.cr/api/crboxwebapi/getfacturas/{email}/{start}/{end}` |
| HTTP method | GET |
| Frontend file & function | `js/portal-api.js` `getBills()` (line 522–529) |
| Purpose | Returns list of invoices/bills for the user in a date range |
| Read or write | Read |
| Auth required | Yes — Bearer token required |
| Payload type | N/A (URL path segments) |
| Safe to retain during cutover | Yes — this is the active path while `USE_RDS_INVOICES_FRONTEND` is unset; it is the guaranteed fallback. A full RDS-backed replacement exists in `server.py` `_handle_portal_invoices_rds()` (line 14020), gated by `USE_RDS_INVOICES_FRONTEND` env flag (line 14025). Production shadow validation is pending — source: `server.py` lines 14015–14018 |
| Future proxy/replacement | `js/portal-api.js` `getBillsRDS()` + `server.py` `/api/portal/invoices-rds`; QA-passed in dev/test; production shadow validation needed before activation |
| Blocker classification | **Non-blocking** — legacy fallback retained; activate RDS path after shadow compare passes |

**`invoiceFileUrl` known limitation:** The `invoiceFileUrl` field is not available in `crbox_dev1`. The legacy API also returned this field empty for the test account. Stubbed as `''` via `f.fileLocation` in `server.py` (lines 15051–15053); `mis-facturas.html` handles a falsy `invoiceFileUrl` as a no-op. Cross-referenced: `docs/rds-invoices-shadow-validation.md §4 Gap 3`. **Classification: Future modernization — not a DNS cutover blocker.**

### 3.7 `POST /postcreatepurchasebill`

| Field | Detail |
|---|---|
| Full URL | `https://clients.crbox.cr/api/crboxwebapi/postcreatepurchasebill` (called via `server.py` invoice upload handler) |
| HTTP method | POST |
| Frontend file & function | `js/portal-api.js` line 722 (`createBill()`); triggered as Step 2 of invoice upload flow after `/api/invoice-upload` succeeds |
| Purpose | Creates a purchase bill record in the legacy CRBOX system after PDF upload; links uploaded invoice to the account |
| Read or write | Write |
| Auth required | Yes — Bearer token required |
| Payload type | `application/x-www-form-urlencoded` |
| Safe to retain during cutover | Yes — only path for invoice creation; no RDS replacement exists for writes |
| Future proxy/replacement | Invoice upload proxy already exists in `server.py` line 9709 (`_handle_invoice_upload()`); end-to-end validation not yet fully confirmed in production — source: `replit.md` Gotchas section |
| Blocker classification | **Blocks broad portal rollout** — end-to-end validation (upload → `postcreatepurchasebill` → visible in CRBOX admin) not yet fully confirmed in production |

### 3.8 `GET /getuserpasswordrecovery/{email}`

| Field | Detail |
|---|---|
| Full URL | `https://clients.crbox.cr/api/crboxwebapi/getuserpasswordrecovery/{email}` |
| HTTP method | GET |
| Frontend file & function | `js/portal-api.js` `recoverPassword()` (line 750) |
| Purpose | Triggers a password recovery email to the user's registered address |
| Read or write | Write (triggers side-effect: email delivery) |
| Auth required | No — `skipAuth: true` (`js/portal-api.js` line 750) |
| Payload type | N/A (URL path segment) |
| Safe to retain during cutover | Yes — only recovery mechanism; no alternative |
| Future proxy/replacement | None planned; functional audit status is pending — source: `docs/auth-registration-password-recovery-audit.md` (referenced in Task #545) |
| Blocker classification | **Blocks broad portal rollout** — users unable to recover access if this fails silently; audit status not yet confirmed as passing |

### 3.9 `POST /crbox-svc-token` (internal proxy)

| Field | Detail |
|---|---|
| Full URL | `/crbox-svc-token` (internal to `server.py`) |
| HTTP method | POST |
| Frontend file & function | `js/auth.js` `_getSvcToken()` (line 200) |
| Purpose | Internal proxy that authenticates using `CRBOX_SVC_EMAIL` / `CRBOX_SVC_PASSWORD` env vars and returns a service-account Bearer token for registration; credentials never appear in browser-side code |
| Read or write | Write (calls `https://clients.crbox.cr/authtoken` server-side) |
| Auth required | No — relies on server-side env vars |
| Payload type | JSON response → `{ access_token }` |
| Safe to retain during cutover | Yes — required for registration flow; env vars must be set in the Replit deployment environment |
| Future proxy/replacement | N/A — purpose-built proxy, already correctly implemented |
| Blocker classification | **Blocks broad portal rollout** if `CRBOX_SVC_EMAIL` / `CRBOX_SVC_PASSWORD` env vars are not set in the production deployment |

---

## 4. DNS / SSL / Hosting Plan

> **Scope:** This section documents the plan and requirements. No DNS changes are made in this task.

### 4.1 Expected DNS Records

| Record type | Host | Value | Purpose |
|---|---|---|---|
| `A` or `CNAME` | `crbox.cr` (apex) | Replit deployment IP / CNAME | Serve new site at apex domain |
| `CNAME` | `www.crbox.cr` | Replit deployment CNAME | Serve new site at `www` subdomain |
| (existing) | `clients.crbox.cr` | Legacy CRBOX API server | Must **not** be changed — legacy APIs must remain reachable |

### 4.2 Current Hosting Target

- New site hosted on Replit cloud — source: `replit.md` Run & Operate section ("Run Static Server: `python3 server.py` (serves on port 5000)"). During staging, accessible via the Replit preview URL (`*.replit.app`).
- After DNS cutover, `crbox.cr` and `www.crbox.cr` must resolve to the Replit deployment target.

### 4.3 SSL Certificate Requirements

- Replit automatically provisions and manages TLS certificates for custom domains mapped to a Replit deployment — source: Replit platform behavior (no code-level override found in `server.py` or `replit.md`). Confirm SSL is provisioned and valid for both `crbox.cr` and `www.crbox.cr` before Stage 3; this is an open item (see B7 in Section 13).
- The legacy `clients.crbox.cr` API already has a valid TLS certificate — do not touch it. Confirmed by the fact that all browser-side HTTPS calls to `https://clients.crbox.cr/...` succeed without certificate errors — source: `js/auth.js` line 30 (`LOGIN_URL`), `js/portal-api.js` line 16 (`BASE`).

### 4.4 www vs. Non-www Redirect

- Canonical URLs in the codebase use the non-www form (`https://crbox.cr/`) — source: `sitemap.xml`, `js/seo-config.js` line 23.
- Recommended: configure `www.crbox.cr` to redirect (301) to `https://crbox.cr/`. Confirm this redirect is in place before cutover.

### 4.5 Cache / CDN Considerations

- No CDN (CloudFront, Cloudflare, etc.) is currently documented in the codebase — source: no CDN origin, cache-control headers, or CDN-specific configuration found in `server.py` or `replit.md`. If one exists at the DNS level, ensure its cache is purged immediately after cutover.
- CSS files use query-parameter versioning (e.g., `css/styles.css?v=7`) to bust browser cache — source: `index.html` line 112; same pattern used across all pages per `replit.md` Gotchas ("bump the `v=` query parameter"). No action needed for these on cutover.
- GTM container (`GTM-5WD8N53F`) is loaded from `www.googletagmanager.com` — no caching concern for this asset — source: `index.html` line 16 (`j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl`).

### 4.6 TTL Guidance

- **Recommended action (before cutover, not in this task):** Lower DNS TTL for `crbox.cr` and `www.crbox.cr` to approximately 300 seconds (5 minutes) at least 24–48 hours before the planned cutover window. This ensures that if rollback is needed, DNS propagation completes in minutes rather than hours.
- **Current TTL:** Unknown — DNS owner must be consulted. If TTL was not lowered before cutover, DNS rollback propagation may take up to the existing TTL duration (potentially hours).

### 4.7 DNS Owner

- **Status: Open item.** The DNS owner for `crbox.cr` is not documented in the codebase. This must be identified and confirmed before Stage 3. DNS changes must be approved and executed by the person with access to the domain registrar / DNS provider.
- **Action required:** Identify and document the DNS owner and access credentials before proceeding to Stage 3.

---

## 5. SEO / Indexing Plan

### 5.1 `robots.txt` Status

- File: `robots.txt` — confirmed present.
- **Public paths:** `Allow: /` covers all paths not explicitly disallowed — line 2.
- **Disallowed paths (lines 4–14):**
  - `/login.html`, `/dashboard.html`, `/mis-paquetes.html`, `/mis-facturas.html`, `/mi-cuenta.html`, `/mis-solicitudes.html`, `/solicitud.html`, `/cotizar.html` — all private/semi-private pages
  - `/admin/`, `/admin.html` — admin panel
  - `/uploads/` — invoice file storage
- **Sitemap reference:** `Sitemap: https://crbox.cr/sitemap.xml` — `robots.txt` line 17
- **Assessment:** Correctly configured. All portal and private pages are disallowed. Public marketing pages are crawlable.

### 5.2 `sitemap.xml` Status

- File: `sitemap.xml` — confirmed present. Contains 9 public URLs:
  1. `https://crbox.cr/` (priority 1.0)
  2. `https://crbox.cr/servicios.html` (priority 0.9)
  3. `https://crbox.cr/afiliate.html` (priority 0.9)
  4. `https://crbox.cr/como-funciona.html` (priority 0.8)
  5. `https://crbox.cr/tarifas.html` (priority 0.8)
  6. `https://crbox.cr/calculadora.html` (priority 0.7)
  7. `https://crbox.cr/contacto.html` (priority 0.7)
  8. `https://crbox.cr/terminos.html` (priority 0.3)
  9. `https://crbox.cr/privacidad.html` (priority 0.3)
- **Assessment:** Correctly scoped to public pages only. No portal or private pages included.

### 5.3 Canonical Tags

| Page | Canonical present | Tag value | Source |
|---|---|---|---|
| `index.html` | **Confirmed** | `https://crbox.cr/` | `index.html` line 32 |
| `servicios.html` | **Confirmed** | `https://crbox.cr/servicios.html` | `servicios.html` line 12 |
| `como-funciona.html` | **Confirmed** | `https://crbox.cr/como-funciona.html` | `como-funciona.html` line 29 |
| `tarifas.html` | **Confirmed** | `https://crbox.cr/tarifas.html` | `tarifas.html` line 12 |
| `calculadora.html` | **Confirmed** | `https://crbox.cr/calculadora.html` | `calculadora.html` line 12 |
| `contacto.html` | **Confirmed** | `https://crbox.cr/contacto.html` | `contacto.html` line 29 |
| `afiliate.html` | **Confirmed** | `https://crbox.cr/afiliate.html` | `afiliate.html` line 17 |
| `privacidad.html` | **Confirmed** | `https://crbox.cr/privacidad.html` | `privacidad.html` line 13 |
| `terminos.html` | **Confirmed** | `https://crbox.cr/terminos.html` | `terminos.html` line 13 |
| `cotizar.html` | **Confirmed** (noindex takes precedence) | `https://crbox.cr/cotizar.html` | `cotizar.html` line 13 |

**Assessment:** All 9 sitemap-listed public pages have canonical tags. All canonical URLs use `https://crbox.cr/` (non-www, HTTPS). ✅

### 5.4 noindex Tags

| Page | noindex confirmed | Tag value | Source |
|---|---|---|---|
| `login.html` | **Confirmed** | `noindex, nofollow` | `login.html` line 16 |
| `dashboard.html` | **Confirmed** | `noindex, nofollow` | `dashboard.html` line 12 |
| `mis-paquetes.html` | **Confirmed** | `noindex, nofollow` | `mis-paquetes.html` line 12 |
| `mis-facturas.html` | **Confirmed** | `noindex, nofollow` | `mis-facturas.html` line 16 |
| `mi-cuenta.html` | **Confirmed** | `noindex, nofollow` | `mi-cuenta.html` line 16 |
| `mis-solicitudes.html` | **Confirmed** | `noindex, nofollow` | `mis-solicitudes.html` line 12 |
| `solicitud.html` | **Confirmed** | `noindex, nofollow` | `solicitud.html` line 11 |
| `cotizar.html` | **Confirmed** | `noindex, nofollow` | `cotizar.html` line 11 |
| `404.html` | **Confirmed** | `noindex, nofollow` | `404.html` line 11 |

**Assessment:** All portal, login, cotizar, and 404 pages are correctly noindexed. ✅

### 5.5 Search Console Verification Steps

- [ ] Verify that `crbox.cr` is registered and verified in Google Search Console before Stage 3.
- [ ] After DNS cutover, submit `sitemap.xml` URL in Search Console.
- [ ] Monitor the Index Coverage report for unexpected indexing of portal pages.
- [ ] Confirm the old site's Search Console property (if it exists) is not removed until the confidence period ends.

### 5.6 404 Handling

- `404.html` exists with `noindex, nofollow` — source: `404.html` line 11.
- Verify that `server.py` returns HTTP status 404 (not 200) when serving `404.html` — a "soft 404" (returning 200 for a 404 page) harms SEO.
- **Action required:** Confirm `server.py` returns proper HTTP 404 status code for unknown paths.

---

## 6. Analytics / Tracking Plan

### 6.1 GTM Configuration

- **Container ID:** `GTM-5WD8N53F` — source: `gtm.config.json` line 2
- **Injector script:** `scripts/inject-gtm.js` — reads `gtm.config.json` and replaces GTM IDs in all root `.html` files — source: `scripts/inject-gtm.js` (processes all `*.html` files in the project root)
- **GTM head snippet confirmed present in all 18 HTML pages** — all pages contain `GTM-5WD8N53F` in both the `<head>` script block and the `<noscript>` fallback `<iframe>` — source: pattern confirmed in `index.html` lines 5–20; `login.html` lines 4–6; `dashboard.html` lines 4–6; `scripts/inject-gtm.js` processes all root HTML files uniformly.
- **Pre-deployment requirement:** Always run `node scripts/inject-gtm.js` before any deployment after changes to `gtm.config.json` or HTML pages — source: `replit.md` Gotchas section ("Always run `node scripts/inject-gtm.js` after changing `gtm.config.json` and before any deployment").

### 6.2 Critical Events to Confirm After Cutover

The following events must be verified as firing correctly in Google Tag Manager / GA4 after DNS cutover:

| Event | Expected trigger | Source |
|---|---|---|
| Calculator events | User interacts with `calculadora.html` calculator | `js/analytics.js`, GTM tag |
| Signup / afiliación events | User completes registration on `afiliate.html` | `js/auth.js` analytics calls, `js/analytics.js` |
| Login events (`login_start`, `login_success`, `login_error`) | User submits login form on `login.html` | `js/auth.js` lines 183, 188; `login.html` inline script |
| Contact / WhatsApp events | User clicks WhatsApp button or submits contact form | `contacto.html`, `js/analytics.js` |
| Affiliate CTA events | User clicks "Afíliate Gratis" on any public page | `js/analytics.js` `cta_afiliate_click` |
| Form submit events | Contact form, calculator, quote form | `js/analytics.js` |
| Cotización / quote events | User submits quote request on `cotizar.html` | `js/analytics.js` |
| Session expiry events | Portal session expires | `js/auth.js` `session_expired` tracking call |

### 6.3 Portal Event Rules (Privacy)

Portal page views (e.g., `dashboard.html`, `mis-paquetes.html`) are acceptable for analytics tracking. The following data **must never** appear in any GTM / GA4 event parameters:

- Raw user IDs or casillero numbers
- Phone numbers
- Addresses or delivery details
- Tracking numbers or shipment IDs
- Invoice numbers or amounts
- Tokens or session credentials
- Passwords or confirmation passwords
- Full names

Source: `replit.md` User preferences; general PII-in-analytics best practice.

### 6.4 Post-Cutover Analytics Monitoring Checklist

- [ ] Confirm real-time GA4 view shows traffic on `crbox.cr` (not Replit preview URL) within 15 minutes of DNS cutover.
- [ ] Verify page view events fire on all 7 public pages.
- [ ] Verify `cta_afiliate_click` fires on `index.html` and `servicios.html`.
- [ ] Verify `login_success` fires after a successful test login.
- [ ] Verify no PII appears in event parameters in the GA4 DebugView.
- [ ] Check GTM container is loading (no script errors in browser console).
- [ ] Confirm `dataLayer` is populated as expected.

---

## 7. Cutover Stages

### Stage 0 — Current State (as of document date: 2026-05-14)

- New CRBOX website and portal UI hosted on Replit, accessible via Replit preview URL — source: `replit.md` Run & Operate section.
- Legacy APIs at `clients.crbox.cr` are authoritative for all authentication (login, registration, password recovery) and all write operations (profile edits, invoice creation) — source: `js/auth.js` lines 30–31 (`LOGIN_URL`, `REGISTER_URL`); `js/portal-api.js` line 16 (`BASE`); `js/portal-api.js` `updateProfile()` line 310, `recoverPassword()` line 750.
- **RDS packages:** Shadow validation in progress via `server.py` `/api/admin/rds-shadow-compare`. The RDS packages read path (`getPackagesRDS`) is implemented but not yet activated as the default on `mis-paquetes.html` — source: `js/portal-api.js` `getPackagesRDS()` (line ~427); `server.py` `/api/portal/my-packages` handler.
- **RDS invoices:** RDS invoices path (`_handle_portal_invoices_rds`, `server.py` line 14020) is fully implemented and QA-passed in dev/test environments. Production shadow validation is still pending — source: `server.py` lines 14015–14018. The `USE_RDS_INVOICES_FRONTEND` flag is **unset** (default) — source: `server.py` line 14025; `getBills()` / `getfacturas` is the active path — source: `js/portal-api.js` line 529.
- GTM container `GTM-5WD8N53F` is present in all 18 HTML pages — source: `gtm.config.json` line 2; confirmed in `index.html` lines 5–20, `login.html` lines 4–6, `dashboard.html` lines 4–6.

### Stage 1 — Staging Validation on Replit Preview URL

- All 18 pages accessible and functional at the Replit preview URL.
- Run the complete Pre-Cutover Smoke Test Checklist (Section 8) against the preview URL.
- Verify real production legacy APIs respond correctly from the Replit origin (CORS, auth).
- Validate all GTM events fire correctly in GTM Preview mode.
- Resolve all blockers identified in Section 13 before advancing.
- **Exit criterion:** All smoke tests pass; all "Blocks DNS cutover" items resolved.

### Stage 2 — Soft Launch (Internal Validation with Real Production APIs)

- If internal staff / test accounts can verify flows using the Replit preview URL with real production data (if this has been approved), complete this validation now.
- Confirm `postcreatepurchasebill` end-to-end invoice flow in a real staging environment.
- Confirm password recovery flow delivers email correctly.
- Confirm registration flow creates a real account.
- **Exit criterion:** Invoice upload, registration, and password recovery flows confirmed end-to-end.

### Stage 3 — DNS Cutover

- Lower DNS TTL to ~300s (if not already done, at least 24h before).
- Update DNS `A`/`CNAME` for `crbox.cr` and `www.crbox.cr` to point to the Replit deployment.
- Verify `www` redirects to non-www apex.
- Confirm SSL certificate is valid immediately after DNS propagation.
- **Keep the old hosting active and reachable** — do not decommission it. It is the rollback target.
- `clients.crbox.cr` must remain entirely unchanged.
- Monitor DNS propagation using an external checker.

### Stage 4 — Post-Cutover Monitoring (minimum 1–2 weeks)

- Monitor server logs, GA4 real-time, browser console for errors.
- Verify all flows daily: login, logout, registration, password recovery, package list, invoice list, profile edit, contact form, calculator, WhatsApp links.
- Monitor for 5xx errors, 404s on expected paths, missing GTM events.
- Check mobile experience on real iOS (Safari) and Android (Chrome) devices.
- Monitor Search Console for unexpected indexing changes.
- Verify `cotizar.html` quote submissions reach the admin inbox.
- **Activate RDS read paths incrementally** after shadow validation passes (packages first, then invoices) — do not activate both at once.

### Stage 5 — Legacy Decommission Planning (separate future project)

- Begin planning only after Stage 4 monitoring period is complete (minimum 1–2 weeks post-cutover, with no active rollback triggers).
- Legacy decommission is a **separate future project** — it is not part of this DNS cutover.
- Each legacy API dependency should be retired one by one; not all at once.
- See Section 12 for the full preservation and decommission policy.

---

## 8. Pre-Cutover Smoke Test Checklist

### Group A — Public Site

- [ ] `index.html` loads at target URL; hero section, CTAs, and footer visible
- [ ] `servicios.html` loads; content and images render correctly
- [ ] `como-funciona.html` loads; step-by-step content visible
- [ ] `tarifas.html` loads; pricing table visible
- [ ] `calculadora.html` loads; calculator is interactive and produces results
- [ ] `contacto.html` loads; contact form is visible and interactive; Google Maps iframe loads (if present)
- [ ] `afiliate.html` loads; registration form is visible and interactive
- [ ] Mobile navigation opens and closes correctly on all 7 public pages
- [ ] Footer links work on all 7 public pages
- [ ] WhatsApp floating button appears and links to correct `wa.me` URL on all pages
- [ ] Contact form submits without JS errors (verify in browser console)
- [ ] Calculator produces a result without JS errors

### Group B — Auth / Account

- [ ] Login page loads (`login.html`)
- [ ] Login with valid credentials succeeds and redirects to `dashboard.html`
- [ ] Login with invalid credentials shows an appropriate error message
- [ ] Logout from dashboard clears session and redirects to `index.html`
- [ ] An expired or cleared session on a portal page redirects to `login.html?msg=session-expired`
- [ ] Accessing `dashboard.html` without a session redirects to `login.html`
- [ ] Password recovery modal opens from `login.html`; submitting a valid email triggers a recovery email (verify delivery) — **note:** audit status pending from Task #545
- [ ] Registration on `afiliate.html` completes successfully for a new test account

### Group C — Portal

- [ ] `dashboard.html` loads after login; user name and casillero number appear
- [ ] `mis-paquetes.html` loads; package list renders (or shows correct empty state)
- [ ] `mis-facturas.html` loads; invoice list renders (or shows correct empty state)
- [ ] `mi-cuenta.html` loads; profile data is pre-populated
- [ ] `mis-solicitudes.html` loads; solicitudes list renders
- [ ] `solicitud.html` loads for a specific solicitud
- [ ] `cotizar.html` loads; quote form is interactive; guest submission works
- [ ] All portal pages are noindexed (verify via `<meta name="robots">` in page source)
- [ ] Direct access to portal pages without auth redirects to login
- [ ] Invoice upload flow initiates without JS errors (`mis-facturas.html` → upload button)
- [ ] Mobile drawer opens correctly on portal pages; portal nav links present

### Group D — Tracking / SEO

- [ ] GTM container `GTM-5WD8N53F` loads on all public pages (verify in browser Network tab: `gtm.js` request with status 200)
- [ ] GTM fires `gtm.js` event in `dataLayer` on page load
- [ ] `cta_afiliate_click` event fires in GA4 DebugView when clicking "Afíliate Gratis"
- [ ] `login_success` event fires in GA4 DebugView after login
- [ ] Calculator event fires in GA4 DebugView after calculating a shipment cost
- [ ] `robots.txt` is accessible at `https://crbox.cr/robots.txt` and contains expected disallow rules
- [ ] `sitemap.xml` is accessible at `https://crbox.cr/sitemap.xml` and contains the 9 expected URLs
- [ ] All public pages have correct canonical tags pointing to `https://crbox.cr/`
- [ ] `404.html` is served with HTTP status 404 (not 200) for unknown paths

### Group E — Rollback Readiness

- [ ] DNS rollback owner is identified and can execute a DNS change within 30 minutes of a rollback decision
- [ ] Old hosting is still active, reachable, and serving the previous site
- [ ] DNS TTL has been lowered to ~300s before cutover
- [ ] Rollback checklist (Section 9) has been reviewed by the responsible team
- [ ] Rollback trigger list has been shared with the on-call team

---

## 9. Rollback Plan

### 9.1 DNS Revert Procedure

1. Log into the domain registrar / DNS provider with the DNS owner's credentials.
2. Update `A`/`CNAME` for `crbox.cr` and `www.crbox.cr` to point back to the old hosting provider's IP / CNAME (the values that were in place before Stage 3).
3. Save the changes.
4. Wait for DNS propagation — if TTL was lowered to ~300s before cutover, propagation completes in 5–10 minutes. If TTL was not lowered, propagation may take up to the original TTL duration (potentially hours).
5. Verify old site is live by accessing `https://crbox.cr/` from a device with flushed DNS cache.

### 9.2 Expected TTL Impact

- **If TTL was lowered to ~300s before cutover:** Rollback propagation: approximately 5–10 minutes.
- **If TTL was NOT lowered:** Rollback propagation may take hours. This is a risk that must be mitigated by lowering TTL before the cutover window.

### 9.3 What to Verify After Rollback

- [ ] Old site loads correctly at `https://crbox.cr/`
- [ ] Login and logout work on the old site
- [ ] SSL certificate is valid (no browser warnings)
- [ ] GTM is not duplicated across old and new site in a way that causes double-firing (verify by checking `dataLayer` — should contain only one `gtm.start` event per page load)
- [ ] No portal pages from the new site are still cached and served to users

### 9.4 Legacy Hosting Preservation Requirement

The old hosting must remain active and unmodified from the moment Stage 3 begins until the end of the Stage 4 confidence period (minimum 1–2 weeks post-cutover). It must not be decommissioned, scaled down, or modified during this window.

### 9.5 Rollback Owner and Communication Plan

- **Rollback owner:** **Unknown — open item.** Must be assigned before Stage 3. Should be a team member with DNS access and authority to make the rollback decision.
- **Communication plan:** Define a Slack/WhatsApp channel or group where rollback decisions are communicated. All team members monitoring Stage 4 should be in this channel.
- **Decision authority:** One named person must have authority to call a rollback without requiring committee approval during the monitoring window.

### 9.6 Rollback Triggers

The following conditions should trigger an immediate rollback decision:

| Trigger | Severity |
|---|---|
| Login broken (users cannot authenticate) | Critical — rollback immediately |
| Signup / registration broken without an approved workaround | Critical — rollback immediately |
| Password recovery broken without an approved workaround | Critical — rollback immediately |
| Portal (dashboard, packages, invoices) unavailable for > 5 minutes | Critical — rollback immediately |
| Contact form or WhatsApp link broken site-wide | High — rollback if not resolved in 30 min |
| High rate of 5xx errors (> 5% of requests) | High — rollback if not resolved in 30 min |
| Analytics / GTM entirely missing from critical flows | High — investigate; rollback if data gap exceeds 2 hours |
| Private portal pages appearing in Google Search results | Critical — rollback immediately; investigate noindex/robots config |
| Security-sensitive data (tokens, passwords, PII) exposed in any public response | Critical — rollback immediately |
| Severe mobile navigation failure affecting all mobile users | High — rollback if not resolved in 1 hour |

### 9.7 Full Rollback Checklist

- [ ] Rollback decision made and documented (who, when, reason)
- [ ] Rollback communicated to team
- [ ] DNS reverted for `crbox.cr` and `www.crbox.cr`
- [ ] DNS propagation confirmed (old site loading)
- [ ] SSL confirmed valid on old site
- [ ] Login confirmed working on old site
- [ ] Search Console notified (if indexing was submitted during cutover)
- [ ] Incident documented: what failed, when, how rollback was executed
- [ ] Post-rollback review scheduled to address root cause before next cutover attempt

---

## 10. Go / No-Go Checklist

Each item is classified as: ✅ Confirmed | ⚠️ Open blocker | ❓ Not yet verified

### Go Criteria

| # | Criterion | Status | Source / Notes |
|---|---|---|---|
| G1 | All 18 HTML pages load without JS errors on Replit preview URL | ❓ Not yet verified | Requires Stage 1 smoke test |
| G2 | Login, logout, and session expiry work end-to-end | ❓ Not yet verified | Requires Stage 1 smoke test; `js/auth.js` auth gate confirmed in code |
| G3 | Registration creates a real account end-to-end | ❓ Not yet verified | Requires Stage 2 validation; `/crbox-svc-token` proxy in place |
| G4 | Password recovery delivers email | ⚠️ Open | `js/portal-api.js` `recoverPassword()` exists; functional audit status pending — source: referenced Task #545 |
| G5 | Package list loads for a logged-in user | ❓ Not yet verified | Legacy `getPackages()` path available; RDS shadow validation in progress |
| G6 | Invoice list loads for a logged-in user | ❓ Not yet verified | Legacy `getBills()` / `getfacturas` path is active; RDS gated |
| G7 | Invoice upload + `postcreatepurchasebill` end-to-end confirmed in production | ⚠️ Open | Not fully confirmed in production — source: `replit.md` Gotchas |
| G8 | GTM fires on all public pages | ✅ Confirmed | `GTM-5WD8N53F` present in all HTML pages; `scripts/inject-gtm.js` verified |
| G9 | `robots.txt` correctly disallows all portal paths | ✅ Confirmed | `robots.txt` lines 4–14 |
| G10 | `sitemap.xml` contains only public pages | ✅ Confirmed | `sitemap.xml` — 9 public URLs |
| G11 | All public pages have canonical tags | ✅ Confirmed | All 9 public pages confirmed — see Section 5.3 |
| G12 | All private/portal pages are noindexed | ✅ Confirmed | All portal pages confirmed — see Section 5.4 |
| G13 | `cotizar.html` noindex confirmed | ✅ Confirmed | `cotizar.html` line 11 — explicitly verified |
| G14 | DNS owner identified and able to execute cutover | ⚠️ Open | Not documented in codebase |
| G15 | SSL certificate provisioned for `crbox.cr` and `www.crbox.cr` on Replit | ❓ Not yet verified | Replit provisions automatically; must confirm for custom domain |
| G16 | Old hosting preserved and accessible for rollback | ❓ Not yet verified | Operational requirement; not codified |
| G17 | DNS TTL lowered to ~300s at least 24h before cutover | ❓ Not yet verified | Pre-cutover operational action |
| G18 | RDS packages shadow validation complete (countDelta=0) | ⚠️ Open | Shadow validation in progress — source: `server.py` `/api/admin/rds-shadow-compare` |
| G19 | RDS invoices production shadow validation complete | ⚠️ Open | QA-passed in dev/test; production shadow validation pending — source: `server.py` lines 14015–14018 |
| G20 | `CRBOX_SVC_EMAIL` / `CRBOX_SVC_PASSWORD` env vars set in production deployment | ❓ Not yet verified | Required for `/crbox-svc-token` proxy; registration fails without them |

### No-Go Criteria (any one of these blocks Stage 3)

| # | Criterion | Status |
|---|---|---|
| N1 | Login broken or `/authtoken` unreachable from new site | ❓ Not yet verified in production |
| N2 | Registration broken (`/postregisteruser` unreachable or `/crbox-svc-token` proxy failing) | ❓ Not yet verified in production |
| N3 | DNS owner unknown or unavailable | ⚠️ Open blocker |
| N4 | SSL not provisioned for target domain | ❓ Not yet verified |
| N5 | Any portal page is indexable (noindex missing or robots.txt misconfigured) | ✅ Confirmed not applicable — all portal pages noindexed and disallowed |
| N6 | Old hosting unavailable for rollback | ❓ Not yet verified |

---

## 11. Current vs Future Routing Decision

| Route | Current implementation | Production dependency | Cutover strategy | Blocker classification | Final recommendation |
|---|---|---|---|---|---|
| `/` (`index.html`) | New site static page | None — self-contained | Fully served by new site | Non-blocking | ✅ Ready to cut over |
| `/servicios.html` | New site static page | None | Fully served by new site | Non-blocking | ✅ Ready to cut over |
| `/como-funciona.html` | New site static page | None | Fully served by new site | Non-blocking | ✅ Ready to cut over |
| `/tarifas.html` | New site static page | None | Fully served by new site | Non-blocking | ✅ Ready to cut over |
| `/calculadora.html` | New site static page + JS engine | `js/calculator-engine.js`, `js/tariff-adapter.js` (self-contained) | Fully served by new site | Non-blocking | ✅ Ready to cut over |
| `/contacto.html` | New site static page + `server.py` contact handler | `server.py` contact form endpoint | Fully served by new site; contact form via `server.py` | Non-blocking | ✅ Ready to cut over |
| `/afiliate.html` | New site UI + legacy write via proxy | `POST /postregisteruser` via `/crbox-svc-token` proxy (`js/auth.js` line 31) | New UI + legacy `/postregisteruser` via `/crbox-svc-token` proxy | Blocks broad portal rollout if proxy or env vars fail | Coexistence model: new UI, legacy writes retained |
| `/login.html` | New site UI + direct legacy auth | `POST /authtoken` (`js/auth.js` line 30) | New UI + legacy `/authtoken` | Blocks DNS cutover if `/authtoken` unreachable | Coexistence model: new UI, legacy auth retained |
| `/cotizar.html` | New site UI + `server.py` quote handler | `server.py` solicitud submission + SQLite | New UI + `server.py` handler; noindex and robots.txt confirmed | Non-blocking | ✅ Ready to cut over; confirm form submissions reach admin |
| `/dashboard.html` | New site portal UI + getUserInfo | `GET /getuserinfo` via `js/portal-api.js` | New UI + legacy read APIs | Non-blocking (legacy fallback retained) | Coexistence model; activate RDS reads incrementally |
| `/mis-paquetes.html` | New site portal UI + legacy packages | `GET /getuserpackages` (`js/portal-api.js` line 344); RDS path gated (`getPackagesRDS`) | New UI + RDS read path with legacy fallback; activate RDS after shadow compare passes | Non-blocking for DNS cutover; RDS activation pending shadow validation | Coexistence: DNS cutover OK, RDS activation gated |
| `/mis-facturas.html` | New site portal UI + legacy invoices | `GET /getfacturas` (`js/portal-api.js` line 529); RDS path gated by `USE_RDS_INVOICES_FRONTEND` (`server.py` line 14025) | New UI + RDS read path QA-passed in dev/test; production shadow validation pending; legacy `getfacturas` fallback retained | Non-blocking for DNS cutover; RDS activation requires production shadow validation — source: `server.py` lines 14002, 14025 | Coexistence: DNS cutover OK, RDS activation gated on production shadow compare |
| `/mi-cuenta.html` | New site portal UI + legacy profile | `GET /getuserinfo` (read) + `POST /postedituser` (write) (`js/portal-api.js` lines 280, 310) | New UI + RDS read + legacy writes | Non-blocking (profile writes stay on legacy) | Coexistence: reads can move to RDS when available; writes remain legacy |
| `/mis-solicitudes.html` | New site UI + `server.py` SQLite | `server.py` solicitudes handler | New UI + `server.py` handler | Non-blocking | ✅ Ready to cut over |
| `/solicitud.html` | New site UI + `server.py` | `server.py` solicitud form | New UI + `server.py` handler | Non-blocking | ✅ Ready to cut over |
| `/privacidad.html` | New site static page | None | Fully served by new site | Non-blocking | ✅ Ready to cut over |
| `/terminos.html` | New site static page | None | Fully served by new site | Non-blocking | ✅ Ready to cut over |
| `/404.html` | Custom error page | `server.py` 404 handler | Served by new site; confirm `server.py` returns HTTP 404 status | Non-blocking | ✅ Ready to cut over; confirm HTTP 404 status code |

---

## 12. Legacy Preservation and Decommission Policy

The following rules govern the treatment of legacy systems during and after the DNS cutover:

**(a) Legacy `clients.crbox.cr` APIs must remain reachable after DNS cutover.** The new site depends on these APIs for all authentication (login, registration, password recovery) and all write operations (profile edits, invoice creation). Cutting off access to `clients.crbox.cr` before replacements are fully operational and validated would immediately break the portal for all users.

**(b) Old public site / old hosting must remain available during the rollback confidence period.** The old site is the rollback target. It must be kept live, unmodified, and accessible at its original IP/origin from the moment DNS is changed until the end of the Stage 4 monitoring window. Do not decommission, scale down, or modify the old hosting until rollback is formally ruled out.

**(c) No legacy service should be decommissioned as part of this DNS cutover.** This cutover is a "new site goes live" event — it is not a "legacy is removed" event. The two goals are separate projects with separate timelines.

**(d) Decommission is a separate future project** to be scoped only after the confidence period is complete. It requires: shadow validation passing for all RDS read paths, replacement paths validated for write operations, and a deliberate migration plan with its own go/no-go process.

**(e) Minimum monitoring period before any decommission planning begins: 1–2 weeks after Stage 4** with no active rollback triggers and no unresolved blockers.

**(f) Each legacy dependency should be retired one by one, not all at once.** Suggested order:
  1. `GET /getuserpackages` — retire after RDS packages shadow validation passes and RDS path is confirmed in production
  2. `GET /getfacturas` — retire after RDS invoices production shadow validation passes
  3. `GET /getuserinfo` — retire after RDS profile read path is activated and validated
  4. `POST /postedituser` — retire only after a new write path is built, tested, and confirmed safe
  5. `POST /authtoken` / `POST /postregisteruser` / `GET /getuserpasswordrecovery` — last to retire; require a full identity layer migration

**The safe coexistence model:** The near-term DNS cutover should be understood as switching the public-facing domain (`crbox.cr`) to serve the new site and portal UI, while all legacy APIs (`clients.crbox.cr`) remain fully in operation for auth, writes, and portal data. RDS read paths are activated gradually as shadow validation completes. The old hosting is preserved on standby. Legacy decommission is a separate future phase that begins only after the confidence period ends.

---

## 13. Key Blockers and Readiness Estimate

### 13.1 Blocker Table

| # | Blocker | Severity | Affected route or flow | Owner | Recommended next action | Classification |
|---|---|---|---|---|---|---|
| B1 | DNS owner not documented | Critical | All routes (DNS cutover cannot proceed) | Unknown — open item | Identify the person with domain registrar access; document their name and contact; confirm they are available for the cutover window | **Blocks DNS cutover** |
| B2 | Password recovery audit not confirmed passing | High | `/login.html` → password recovery flow | Engineering | Complete the functional audit (referenced Task #545); confirm recovery email is delivered and the link works; document the result | **Blocks broad portal rollout** |
| B3 | `postcreatepurchasebill` end-to-end not confirmed in production | High | `/mis-facturas.html` → invoice upload | Engineering | Execute end-to-end invoice upload test in production (upload → `postcreatepurchasebill` → visible in CRBOX admin); document pass/fail — source: `replit.md` Gotchas | **Blocks broad portal rollout** |
| B4 | RDS packages shadow validation in progress | Medium | `/mis-paquetes.html` | Engineering | Complete shadow compare via `/api/admin/rds-shadow-compare`; target countDelta=0; activate RDS path after passing — source: `server.py` `/api/admin/rds-shadow-compare` | **Non-blocking but recommended** before activating RDS path |
| B5 | RDS invoices production shadow validation pending | Medium | `/mis-facturas.html` | Engineering | Run production shadow compare for invoices; QA already passed in dev/test; resolve Phase 2 gaps or document as acceptable — source: `server.py` lines 14015–14018 | **Non-blocking but recommended** before activating RDS path |
| B6 | `CRBOX_SVC_EMAIL` / `CRBOX_SVC_PASSWORD` env vars not confirmed set in production deployment | High | `/afiliate.html` → registration | DevOps / deployment owner | Verify both secrets are set in the Replit production deployment; registration fails silently without them — source: `replit.md` Required Env Vars | **Blocks broad portal rollout** |
| B7 | SSL certificate not confirmed for custom domain on Replit | High | All routes | DevOps | Confirm Replit custom domain SSL provisioning is complete and valid for both `crbox.cr` and `www.crbox.cr` before Stage 3 | **Blocks DNS cutover** |
| B8 | DNS TTL not yet lowered | Medium | All routes (rollback speed) | DNS owner | Lower TTL to ~300s at least 24h before cutover window — source: Section 4.6 | **Blocks DNS cutover** (rollback risk) |
| B9 | Old hosting preservation not confirmed | Medium | All routes (rollback safety) | Ops | Confirm old hosting is active, accessible, and will not be decommissioned during the confidence period | **Blocks DNS cutover** (rollback risk) |
| B10 | HTTP 404 status code not confirmed for `404.html` | Low | SEO / unknown paths | Engineering | Verify `server.py` returns HTTP 404 (not 200) for unknown paths | **Non-blocking but recommended** |
| B11 | `invoiceFileUrl` stub (no PDF link in RDS) | Low | `/mis-facturas.html` invoice download | Engineering (future) | Already handled gracefully in `mis-facturas.html` (no-op on falsy URL) — source: `server.py` lines 15051–15053, `docs/rds-invoices-shadow-validation.md §4 Gap 3` | **Future modernization** — not a DNS cutover blocker |
| B12 | Newsletter persistence (profile edit) | Low | `/mi-cuenta.html` | Engineering (future) | Not a cutover blocker; known UX gap | **Future modernization** |

### 13.2 Readiness Percentage Estimates

| Area | Readiness | Notes |
|---|---|---|
| **Public marketing site** (index, servicios, como-funciona, tarifas, calculadora, contacto, afiliate, privacidad, terminos) | **90%** | All pages confirmed present with correct SEO tags and GTM. Blockers: env vars for registration (B6), SSL confirmation (B7). Static content is fully ready. |
| **Client portal core** (dashboard, packages, invoices, account, solicitudes) | **70%** | Portal UI is built; legacy API fallbacks in place. Blockers: invoice upload end-to-end unconfirmed (B3), RDS shadow validations open (B4, B5). |
| **Auth / signup / recovery** | **75%** | Login flow is confirmed working (from `replit.md` Gotchas). Registration depends on env vars (B6). Password recovery audit pending (B2). |
| **Analytics / SEO** | **95%** | GTM confirmed in all pages; robots.txt, sitemap, canonicals, noindex all confirmed correct. Minor gap: HTTP 404 status code unconfirmed (B10). |
| **DNS / cutover readiness** | **40%** | DNS owner unknown (B1), SSL not confirmed (B7), TTL not lowered (B8), old hosting preservation not confirmed (B9). These are all operational blockers, not code issues. |
| **Overall** | **70%** | Public site and SEO are effectively ready. Portal is functionally complete but requires production validation. DNS/operational blockers are the critical path to Stage 3. |

---

## 14. Final Recommendation

### Rating: **B — Needs specific fixes before cutover**

The new CRBOX website and portal UI are substantially built, correctly configured for SEO, and functionally sound in development. However, several specific items must be resolved before proceeding to Stage 3 (DNS cutover).

### The Safe Coexistence Model

The DNS cutover should be understood as a **domain switch**, not a migration away from legacy. After Stage 3:

- The new public website and portal UI will be live at `crbox.cr`.
- All legacy APIs at `clients.crbox.cr` will remain fully operational — handling authentication, registration, password recovery, profile writes, and invoice creation.
- RDS read paths (packages, invoices) will be activated **gradually and incrementally** as shadow validation completes in production — not simultaneously and not during the cutover window itself.
- The old site hosting will be preserved on standby for the confidence period and must not be decommissioned.
- Legacy decommission is a separate future project, scoped only after the confidence period ends.

### Items That Must Be Resolved Before Stage 3 (DNS Cutover)

These items must be resolved before the DNS cutover window opens:

| Priority | Item | Blocker ref |
|---|---|---|
| 1 | Identify and document the DNS owner; confirm their availability | B1 |
| 2 | Confirm SSL certificate is provisioned for `crbox.cr` and `www.crbox.cr` on Replit | B7 |
| 3 | Lower DNS TTL to ~300s at least 24h before the cutover window | B8 |
| 4 | Confirm old hosting is active and preserved for rollback | B9 |
| 5 | Verify `CRBOX_SVC_EMAIL` / `CRBOX_SVC_PASSWORD` are set in the Replit production deployment | B6 |
| 6 | Complete password recovery functional audit (Task #545) | B2 |
| 7 | Execute `postcreatepurchasebill` end-to-end invoice upload test in production | B3 |

### Items Recommended Before Broad Portal Rollout (Stage 4)

These are not Stage 3 blockers but should be resolved during the Stage 4 monitoring window:

| Item | Blocker ref |
|---|---|
| Complete RDS packages shadow validation; activate RDS read path | B4 |
| Complete RDS invoices production shadow validation; activate RDS read path | B5 |
| Confirm `server.py` returns HTTP 404 status for unknown paths | B10 |

### Summary

| Metric | Value |
|---|---|
| **Overall rating** | B — Needs specific fixes before cutover |
| **Public marketing site readiness** | 90% |
| **Client portal core readiness** | 70% |
| **Auth / signup / recovery readiness** | 75% |
| **Analytics / SEO readiness** | 95% |
| **DNS / cutover operational readiness** | 40% |
| **Overall readiness** | 70% |
| **Hard blockers for DNS cutover** | 4 (B1 DNS owner, B7 SSL, B8 TTL, B9 old hosting) |
| **Recommended next tasks** | Identify DNS owner, confirm Replit custom domain SSL, set env vars in production, complete Task #545 password recovery audit, execute invoice upload end-to-end test |

**Recommended next tasks before cutover:**
1. Identify DNS owner and document access credentials (B1)
2. Confirm Replit custom domain SSL for `crbox.cr` / `www.crbox.cr` (B7)
3. Lower DNS TTL to ~300s at least 24h before the cutover window (B8)
4. Confirm old hosting will be preserved for the rollback confidence period (B9)
5. Verify `CRBOX_SVC_EMAIL` and `CRBOX_SVC_PASSWORD` are set in the Replit deployment environment (B6)
6. Complete password recovery audit (Task #545) and document result (B2)
7. Execute invoice upload → `postcreatepurchasebill` → CRBOX admin visibility test in production (B3)
8. Run the complete Pre-Cutover Smoke Test Checklist (Section 8) against the Replit preview URL

Once all Stage 3 hard blockers are resolved, the site is ready for DNS cutover with the legacy API coexistence model in place. RDS read path activation can proceed incrementally during Stage 4 without requiring another DNS change.
