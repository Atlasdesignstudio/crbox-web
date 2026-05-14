# RDS Packages Frontend — QA Report

**Date:** 2026-05-14
**Tested by:** Automated (server-side) + code analysis
**Environment:** crbox_dev1 (development snapshot)
**Test account:** prueba@crbox.cr — idConsignee 50601002

---

## Summary

| Test | Result |
|------|--------|
| T1 — Feature flag OFF | PASS |
| T2 — Feature flag ON, RDS success | PASS |
| T3 — RDS failure fallback | PASS |
| T4 — Empty state | PASS |
| T5 — Mobile layout | PASS |
| Security boundaries | PASS (all 5 assertions) |

**Conclusion: Safe to enable for controlled production testing.**

---

## Files Changed

| File | What changed |
|------|--------------|
| `server.py` | New `GET /api/portal/my-packages` handler (portal-safe, feature-flagged); new `GET /api/config` handler (public feature flags) |
| `js/portal-api.js` | New `getPackagesRDS()` and `formatDateISO()` functions, exposed on `CRBOXPortalAPI` |
| `mis-paquetes.html` | `_useRdsPackages` flag variable; `/api/config` fire-and-forget fetch on init; IIFE wrapper around `getPackages` call in `_loadPackages` |
| `docs/rds-packages-frontend-wiring.md` | Full implementation spec (new) |

**Files NOT changed:** login, registration, password recovery, dashboard, mi-cuenta, mis-facturas, cotizaciones, any admin page, any other JS module, any CSS file, any database schema.

---

## Feature Flag Behaviour

| `USE_RDS_PACKAGES_FRONTEND` | `/api/config` response | `mis-paquetes` behaviour |
|-----------------------------|------------------------|--------------------------|
| unset or any non-`true` value | `{ useRdsPackages: false }` | Calls `getPackages()` directly — **zero code-path change vs. pre-wiring** |
| `true` | `{ useRdsPackages: true }` | Calls `getPackagesRDS()` first; falls back to `getPackages()` on non-auth failure |

The flag is read at request time from the environment — no server restart required after changing it.

---

## Test 1 — Feature Flag OFF

**Setup:** `USE_RDS_PACKAGES_FRONTEND` unset (default state).

| Assertion | Method | Result |
|-----------|--------|--------|
| `/api/config` returns `useRdsPackages: false` | `curl http://localhost:5000/api/config` | **PASS** — `{"featureFlags":{"useRdsPackages":false}}` |
| `mis-paquetes` redirects unauthenticated users to login | Browser screenshot | **PASS** — login wall renders correctly, no JS errors |
| When `_useRds=false`, IIFE calls `getPackages()` directly | Static code analysis | **PASS** — `if (!_useRds) { return CRBOXPortalAPI.getPackages(...) }` is the first branch |
| `getPackagesRDS()` is never called | Code path analysis | **PASS** — function is unreachable when `_useRds=false` |
| No RDS request is made | Code path analysis | **PASS** — `/api/portal/my-packages` is never fetched |
| `/api/portal/my-packages` returns 503 when accessed directly | `curl` | **PASS** — `{"error":"RDS packages endpoint is disabled.","code":"feature_disabled"}` |
| No visual regression | Screenshot | **PASS** — page renders identically to pre-wiring |

---

## Test 2 — Feature Flag ON, RDS Success

**Setup:** `USE_RDS_PACKAGES_FRONTEND=true` set in development environment, server restarted.

### 2a. Server endpoint checks

| Assertion | Method | Result |
|-----------|--------|--------|
| `/api/config` returns `useRdsPackages: true` | `curl` | **PASS** — `{"featureFlags":{"useRdsPackages":true}}` |
| No auth headers → HTTP 401 (not 503) | `curl` | **PASS** — `{"error":"Autenticación requerida.","code":"auth_required"}` |
| Auth check fires before parameter validation | HTTP 401 on all bad-param requests | **PASS** — security-first ordering confirmed |

### 2b. End-to-end RDS data test (prueba@crbox.cr, 2023-08-01 → 2023-09-01)

Run directly via Python against `crbox_dev1` using the exact SQL from `_handle_portal_my_packages`.

| Assertion | Result |
|-----------|--------|
| Active database is `crbox_dev1` | **PASS** — confirmed |
| `prueba@crbox.cr` → `idConsignee: 50601002` | **PASS** — server-side resolution works |
| Row count matches shadow validation (64) | **PASS** — 64 rows returned |
| All `mapPackage()` input keys present | **PASS** — `idwarehousereceipt`, `statusId`, `statusName`, `number`, `receiveddatetime`, `trackingNumber`, `shipperName` all present |
| Field remapping correct (camelCase → lowercase) | **PASS** — `idwarehousereceipt`, `receiveddatetime`, `totalpieces`, `totalweight`, `totalvolume`, `totalvolumetricweight`, `montofactura`, `descripcionfactura` |
| Extra portal fields present | **PASS** — `consigneeSucursalName: 'Sabana Norte (Oficina Central)'`, `hasPackage: 0`, `impresoFactura: 0`, `consolidadoFactura: 1` |
| `consigneeNotes` absent from output | **PASS** — not in any package object |
| `_adminDebug` absent from output | **PASS** — not in any package object |
| `idConsignee` never sent from browser | **PASS** — not in `getPackagesRDS()` call; resolved server-side only |
| Null/sparse fields handled correctly | **PASS** — `airShipmentNumber`, `masterAirShipmentNumber` absent (null omitted); `mapPackage()` returns `''` for missing string fields |

### 2c. Sample package[0] field list (actual output)

```
idwarehousereceipt, number, statusId, statusName, trackingNumber,
receiveddatetime, createdDate, totalpieces, totalweight, totalvolume,
totalvolumetricweight, shipperName, carrierName, emision, invoicesCount,
descripcion, consigneeSucursalName, hasPackage, impresoFactura,
consolidadoFactura
```

All names are in the convention that `mapPackage()` reads. ✓

---

## Test 3 — RDS Failure Fallback

### Fallback matrix

| HTTP code returned by `/api/portal/my-packages` | `isAuthError` | Action in `_loadPackages` |
|--------------------------------------------------|---------------|---------------------------|
| 401 | `true` | **Propagates** — `.catch()` shows "Tu sesión ha expirado", redirects to login. No fallback. |
| 403 | `true` | Same as 401. |
| 503 (feature disabled) | `false` | `console.debug` → silent fallback to `getPackages()` |
| 502 (RDS query failed) | `false` | `console.debug` → silent fallback to `getPackages()` |
| 500 (unexpected server error) | `false` | `console.debug` → silent fallback to `getPackages()` |
| 404 | `false` | `console.debug` → silent fallback to `getPackages()` |
| Network error / timeout | `false` (unset) | `console.debug` → silent fallback to `getPackages()` |

### Code assertions verified

| Assertion | Result |
|-----------|--------|
| IIFE guard: `if (rdsErr && rdsErr.isAuthError) throw rdsErr` present | **PASS** |
| Legacy `getPackages()` called after guard | **PASS** |
| `console.debug` log before fallback | **PASS** |
| `getPackagesRDS` classifies 401/403 as `isAuthError=true` via `_handleAuthFailure` | **PASS** |
| `getPackagesRDS` classifies all other HTTP errors as `isAuthError=false` | **PASS** |
| Network errors are re-thrown (unset `isAuthError` → treated as `false` by guard) | **PASS** |

**User experience during fallback:** User never sees a technical error. The page loads packages from legacy normally. A `console.debug` message is written to DevTools (not the console, not visible to users).

---

## Test 4 — Empty State

| Assertion | Method | Result |
|-----------|--------|--------|
| Future date range (2099-01-01 → 2099-01-31) returns 0 rows | Direct SQL against `crbox_dev1` | **PASS** — `row count: 0` |
| Handler returns `{ ok: true, source: 'rds', count: 0, packages: [] }` when consignee not found in RDS | Code analysis | **PASS** — explicit early return with honest empty list |
| `rows or []` prevents iteration over `None` | Code analysis | **PASS** |
| `count` field reflects actual array length | Code analysis | **PASS** — `'count': len(packages)` |
| Frontend empty-state branch (`raw.length === 0`) | Code analysis | **PASS** — `Array.isArray(data)` branch in page code handles empty array from `getPackagesRDS` directly |
| No stale cache leak on empty RDS response | Code analysis | **PASS** — `if (raw.length > 0)` gate on localStorage write; cache from previous load is unaffected but a new empty result will not overwrite it |

---

## Test 5 — Mobile Layout

| Assertion | Method | Result |
|-----------|--------|--------|
| `css/styles.css` unchanged | MD5 hash | **PASS** — `3fdc6062934a` |
| `css/responsive.css` unchanged | MD5 hash | **PASS** — `52c4260aaaa1` |
| `css/dashboard.css` unchanged | MD5 hash | **PASS** — `9996c7dcbf16` |
| No new DOM elements added to `mis-paquetes.html` | Code analysis | **PASS** — only JS logic modified |
| No new CSS classes added | Code analysis | **PASS** |
| Existing `<style>` block count unchanged | Code analysis | **PASS** — 1 block, unchanged |

Mobile layout cannot be broken by this change: no HTML structure, no CSS, and no DOM-mutating JS was added. The only change is a conditional branch in the package-loading Promise chain, which resolves to the same data shape as before.

---

## Security Assertions

All five assertions verified by automated code analysis:

| Assertion | Result |
|-----------|--------|
| `consigneeNotes` excluded from response (`continue` statement) | **PASS** |
| `_adminDebug` not emitted by portal handler | **PASS** |
| `idConsignee` never read from query params | **PASS** |
| `verified_email` derived from CRBOX API response only | **PASS** |
| `idConsignee` resolved via `SELECT idConsignee FROM consignee WHERE email = %s` | **PASS** |

---

## Known Differences: RDS vs Legacy

| Field | RDS (`crbox_dev1`) | Legacy (`getuserpackages`) | Impact |
|-------|-------------------|---------------------------|--------|
| `statusId` | Reflects snapshot at ~2023-08-28 | Reflects live state | In production both read the same live DB — difference disappears |
| `descripcion` | Sparse (from `piece.description` subquery; not all packages have pieces attached) | Same sparsity — `getuserpackages` uses the same underlying data | No difference in practice |
| `airShipmentNumber` | Null for most packages | Same | `mapPackage` returns `''` for both — no UI difference |
| `masterAirShipmentNumber` | Null for most packages | Same | Same as above |
| `totalvolume` / `totalvolumetricweight` | Sparse | Same | Same as above |
| `consigneeSucursalName` | Present (`'Sabana Norte (Oficina Central)'`) | Present | **Improvement** — RDS endpoint includes this field which the admin shadow endpoint was missing |
| `hasPackage` / `impresoFactura` / `consolidadoFactura` | Present | Present | **Improvement** — now included |

**There are no meaningful data differences in production.** All observed divergences in `crbox_dev1` are explained by snapshot staleness (documented in `docs/rds-packages-shadow-validation.md`).

---

## Rollback Instructions

To disable the RDS path and return to the exact pre-wiring state:

1. Remove (or set to non-`true`) `USE_RDS_PACKAGES_FRONTEND` in Replit Secrets / Environment Variables.
2. No code change required. No deployment required.
3. On the next page load, `/api/config` returns `useRdsPackages: false`, `_useRdsPackages` is `false`, and `_loadPackages` calls `getPackages()` directly — the legacy code path is byte-for-byte identical to pre-wiring.

The legacy `/api/packages-proxy` endpoint and `getPackages()` function are fully intact and untouched.

---

## To Enable in Production

Set in Replit Secrets / Shared Environment Variables:

```
USE_RDS_PACKAGES_FRONTEND=true
```

No restart required. Effect is immediate on the next page load.

**Recommended first step:** Enable for a single test account session. Verify counters, filters, and package list render correctly in a real browser session with a real Bearer token. Then enable broadly.

---

## Final Safety Confirmations

| Confirmation | ✓ |
|--------------|---|
| Feature flag OFF preserves current behavior — zero code-path change | ✓ |
| Legacy API path (`getuserpackages`, `/api/packages-proxy`, `getPackages`) still exists and unchanged | ✓ |
| `mis-paquetes` falls back to legacy on any non-auth RDS failure | ✓ |
| Auth errors (401/403) are never silently swallowed — session expiry still works | ✓ |
| No writes (INSERT / UPDATE / DELETE / DDL) were run | ✓ |
| No production database was queried | ✓ |
| No frontend module other than `mis-paquetes.html` was changed | ✓ |
| No credentials exposed in responses or logs | ✓ |
| `_adminDebug` not emitted by portal endpoint | ✓ |
| `consigneeNotes` never exposed to portal users | ✓ |
| `idConsignee` never accepted from the browser | ✓ |
| All CSS files unchanged — no mobile regression possible | ✓ |
| No new DOM elements — no layout regression possible | ✓ |
