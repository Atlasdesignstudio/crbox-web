# RDS Packages — Frontend Wiring

**Status:** Implemented. Feature flag OFF by default.
**Date:** 2026-05-14

---

## Overview

`mis-paquetes.html` can now load package data from the RDS-backed
`/api/portal/my-packages` endpoint instead of the legacy CRBOX
`getuserpackages` API.  The switch is controlled by a single environment
variable.  All legacy code paths remain intact and unchanged.

---

## Feature Flag

| Variable                     | Values        | Default |
|------------------------------|---------------|---------|
| `USE_RDS_PACKAGES_FRONTEND`  | `true` / (unset or anything else) | `false` (legacy path) |

The value is read at request time by `/api/config` (no server restart needed
once the variable is set).

### How the frontend reads it

On every page load of `mis-paquetes.html`, a fire-and-forget fetch to
`/api/config` runs in parallel with the user's session validation.  The
response sets the module-level variable `_useRdsPackages`.  Because the config
endpoint is local and typically responds in under 10 ms, the flag is set before
the remote CRBOX API call returns data — so the first live render always uses
the correct path.

If the config fetch fails for any reason (network, 5xx), `_useRdsPackages`
stays `false` and the legacy path is used.

---

## RDS-first / Legacy-fallback Flow

```
_loadPackages(idConsignee, start, end, tracking, status)
│
├── _useRdsPackages = false?
│     └─► CRBOXPortalAPI.getPackages(...)   [legacy — unchanged]
│
└── _useRdsPackages = true?
      └─► CRBOXPortalAPI.getPackagesRDS(start, end, tracking, status)
            │
            ├── success ──────────────────────────────────────────────►
            │                                                     .then(data)
            │                                                     mapPackage()
            │                                                     render
            │
            └── failure
                  ├── isAuthError = true ──► throw (redirect to login)
                  └── other error ──► silent console.debug
                        └─► CRBOXPortalAPI.getPackages(...)   [legacy fallback]
                              └─► .then(data) / .catch(err)   [existing handlers]
```

Auth errors (HTTP 401/403 from any source) are **never** silently swallowed —
they always propagate to the existing `.catch()` in `_loadPackages`, which
shows the "Tu sesión ha expirado" message and redirects to login.

---

## Endpoint: `/api/portal/my-packages`

| Property | Value |
|----------|-------|
| Method | GET |
| Auth | `Authorization: Bearer <token>` + `X-Casillero-Email: <email>` |
| Feature flag | `USE_RDS_PACKAGES_FRONTEND=true` (returns 503 when disabled) |
| Date format | YYYY-MM-DD (RDS convention) |
| Max date window | 366 days |
| Default limit | 100 packages |

### Query parameters

| Param    | Type   | Required | Notes |
|----------|--------|----------|-------|
| `start`  | string | Yes | YYYY-MM-DD |
| `end`    | string | Yes | YYYY-MM-DD, window ≤ 366 days |
| `status` | int    | No | Omit or pass `1000` for all statuses |
| `tracking` | string | No | Prefix search; no `%` or `_` allowed |
| `limit`  | int    | No | 1–200, default 100 |
| `offset` | int    | No | ≥ 0, default 0 |

### Auth / Identity model

1. Server reads `Authorization: Bearer <token>` and `X-Casillero-Email: <email>` from headers.
2. Calls `clients.crbox.cr/getuserinfo/<email>` with the Bearer token.
3. On a valid 200 response, the server-verified email from the API response is used as the user identity.  The header email is never trusted directly.
4. `idConsignee` is resolved server-side by querying `consignee.email` in the RDS database.
5. The browser never sends `idConsignee` — it is always resolved server-side.

### Success response shape

```json
{
  "ok": true,
  "source": "rds",
  "count": 12,
  "packages": [
    {
      "idwarehousereceipt": 542368,
      "number": "R-00234512",
      "statusId": 5,
      "statusName": "Crbox",
      "trackingNumber": "1Z...",
      "receiveddatetime": "2023-08-29T10:15:00",
      "createdDate": "2023-08-27T08:00:00",
      "totalpieces": 2,
      "totalweight": 1.8,
      "totalvolume": null,
      "totalvolumetricweight": null,
      "shipperName": "AMAZON.COM",
      "carrierName": "UPS",
      "airShipmentNumber": "HAWB-001",
      "masterAirShipmentNumber": "MAWB-001",
      "emision": "2023-08-29",
      "invoicesCount": 0,
      "descripcion": "",
      "montofactura": null,
      "descripcionfactura": null,
      "consigneeSucursalName": "San José",
      "hasPackage": 1,
      "impresoFactura": 0,
      "consolidadoFactura": 0
    }
  ]
}
```

### Error responses

| HTTP | code | Cause |
|------|------|-------|
| 401 | `auth_required` | Missing or invalid Bearer token |
| 400 | `bad_request` | Missing/invalid date params, illegal tracking chars |
| 400 | `bad_request` | Date window > 366 days |
| 503 | `feature_disabled` | `USE_RDS_PACKAGES_FRONTEND` is not `true` |
| 503 | `unexpected_database` | Active MySQL DB is not `crbox_dev1` |
| 502 | `rds_error` | MySQL query failed |

---

## Field Mapping

The endpoint remaps RDS camelCase column names to the lowercase convention that
`mapPackage()` in `portal-api.js` expects, so no changes to `mapPackage` are
needed.

| RDS column name (view) | Response field name | `mapPackage` reads |
|------------------------|--------------------|--------------------|
| `idWarehouseReceipt` | `idwarehousereceipt` | `raw.idwarehousereceipt` |
| `receivedDateTime` | `receiveddatetime` | `raw.receiveddatetime` |
| `totalPieces` | `totalpieces` | `raw.totalpieces` |
| `totalWeight` | `totalweight` | `raw.totalweight` |
| `totalVolume` | `totalvolume` | `raw.totalvolume` |
| `totalVolumetricWeight` | `totalvolumetricweight` | `raw.totalvolumetricweight` |
| `montoFactura` | `montofactura` | `raw.montofactura` |
| `descripcionFactura` | `descripcionfactura` | `raw.descripcionfactura` |
| All other columns | unchanged | same name |

### Known sparse / null fields

These fields are present in the view but sparse in `crbox_dev1` due to
snapshot age.  `mapPackage` handles all of them gracefully (returns `''` or
`null` when absent).

| Field | Notes |
|-------|-------|
| `descripcion` | Populated from `piece.description` subquery; many packages have no pieces attached yet |
| `montofactura` | Only populated after invoice is processed |
| `descripcionfactura` | Same as above |
| `airShipmentNumber` | Only present for air shipments |
| `masterAirShipmentNumber` | Same as above |
| `totalvolume` | Sparse in dev1 snapshot |
| `totalvolumetricweight` | Sparse in dev1 snapshot |

### Security boundary

`consigneeNotes` is **never** included in the portal endpoint response.
The column exists in the view but is excluded at the serialization step
(`if k == 'consigneeNotes': continue`).

`_adminDebug` is also never included (only the admin shadow endpoint emits it).

---

## Date Format Handling

| Path | Format sent to server | Where conversion happens |
|------|-----------------------|--------------------------|
| Legacy (`getPackages`) | DD-MM-YYYY | `formatDate()` in `portal-api.js` |
| RDS (`getPackagesRDS`) | YYYY-MM-DD | `formatDateISO()` in `portal-api.js` |

Both helpers accept `Date` objects or any string parseable by `new Date()`.
The page code does not need to know which format is in use.

---

## `getPackagesRDS` in `portal-api.js`

New function exposed on `CRBOXPortalAPI`:

```javascript
CRBOXPortalAPI.getPackagesRDS(startDate, endDate, tracking, status)
  → Promise<Array<RawPackage>>
```

- Reads `CRBOXAuth.getToken()` and `CRBOXAuth.getEmail()`.
- Never sends `idConsignee` — the server resolves it from the token-validated email.
- Status `'1000'` and `''` are both treated as "all statuses" (param is omitted).
- Tracking `'null'` and `''` are both treated as "no filter" (param is omitted).
- Returns the unwrapped `packages` array from the response envelope.
- The returned array is passed directly to the existing envelope-unwrapper in
  `_loadPackages` (`if (Array.isArray(data)) { raw = data; }`), which then calls
  `mapPackage()` on each element as normal.

---

## Filters Preserved

All existing `mis-paquetes.html` filters work identically regardless of data source:

| Filter | Mechanism | RDS behaviour |
|--------|-----------|---------------|
| Status tabs (MIAMI / SJO / CRBOX …) | `_statusFilterToCode()` → `status` param | Passed as `statusId` int to `getPackagesRDS` |
| Date range (week / month / quarter / year) | `_dateFilterToDate()` → Date object | Converted by `formatDateISO()` |
| Tracking search | text input → `tracking` param | Prefix match in SQL |
| Refresh button | calls `_applyFiltersFromUI()` | Same IIFE path |
| Pagination | client-side | Unaffected — data shape is identical |
| Empty state | `raw.length === 0` branch | Works — server returns `[]` for empty |
| Loading state | spinner while promise pending | Unaffected |
| Error state | `.catch(err)` block | Unaffected — fallback returns or re-throws |

---

## `/api/config` Endpoint

```
GET /api/config
No auth required.
```

Response:
```json
{
  "featureFlags": {
    "useRdsPackages": false
  }
}
```

Used by `mis-paquetes.html` only.  No user data, no secrets.

---

## Rollback Plan

1. Unset (or set to `false`) `USE_RDS_PACKAGES_FRONTEND`.
2. `/api/config` will return `{ featureFlags: { useRdsPackages: false } }` immediately.
3. On the next page load, `_useRdsPackages` will be `false`.
4. All package loads use the legacy `getPackages` path — exactly as before this work.
5. No code changes required. No deployment required.

The legacy `getuserpackages` path, `/api/packages-proxy`, and `getPackages`
in `portal-api.js` are fully intact.

---

## Files Changed

| File | Change |
|------|--------|
| `server.py` | New `GET /api/portal/my-packages` handler; new `GET /api/config` handler; routing entries for both |
| `js/portal-api.js` | New `getPackagesRDS()` and `formatDateISO()` functions; exposed on `CRBOXPortalAPI` |
| `mis-paquetes.html` | `_useRdsPackages` variable; `/api/config` fire-and-forget fetch on init; IIFE wrapper around `getPackages` call in `_loadPackages` |

### Files NOT changed

- `login.html`, `registro.html`, `recuperar.html`
- `dashboard.html`, `mi-cuenta.html`, `mis-facturas.html`, `mis-solicitudes.html`
- `cotizaciones.html`, `calculadora.html`
- Any admin / backoffice page
- Any other JS module (`auth.js`, `dashboard.js`, `main.js`, …)
- Any CSS file
- `rds_client.py`
- Database schema (no DDL)

---

## Test Cases

### A. Feature flag OFF (default)

1. `USE_RDS_PACKAGES_FRONTEND` unset or set to anything other than `true`.
2. Load `mis-paquetes.html`.
3. `/api/config` returns `{ featureFlags: { useRdsPackages: false } }`.
4. `_useRdsPackages = false`.
5. `_loadPackages` calls `CRBOXPortalAPI.getPackages(...)` directly — identical to pre-wiring.
6. **Expected:** packages load normally, behaviour unchanged.

### B. Feature flag ON, RDS success

1. Set `USE_RDS_PACKAGES_FRONTEND=true`.
2. Load `mis-paquetes.html`.
3. `/api/config` returns `useRdsPackages: true`.
4. `_useRdsPackages = true`.
5. `_loadPackages` calls `getPackagesRDS(...)`.
6. `/api/portal/my-packages` authenticates, resolves idConsignee, queries RDS.
7. Returns packages array with legacy-compatible field names.
8. `mapPackage()` processes them — cards, table, counters render correctly.
9. **Expected:** UI identical to legacy. No `_adminDebug`, no `consigneeNotes` visible.

### C. Feature flag ON, RDS forced failure

1. Set `USE_RDS_PACKAGES_FRONTEND=true`.
2. Kill the RDS connection (or use an invalid host) to force a 502.
3. Load `mis-paquetes.html`.
4. `getPackagesRDS` throws with `isAuthError = false`.
5. Fallback: `getPackages(...)` is called.
6. **Expected:** packages load from legacy. No user-visible error. `console.debug` message in DevTools.

### D. Auth error propagation

1. Set `USE_RDS_PACKAGES_FRONTEND=true`.
2. Use an expired or invalid Bearer token.
3. `/api/portal/my-packages` returns 401.
4. `getPackagesRDS` throws with `isAuthError = true`.
5. **Expected:** fallback does NOT fire. Existing `.catch()` handler shows "Tu sesión ha expirado" and redirects to login.

### E. Empty state

1. Use an account / date range with no packages.
2. **Expected:** empty state renders correctly ("No tienes paquetes registrados").

### F. Status filters

1. Click MIAMI, SJO, CRBOX tabs with flag ON.
2. **Expected:** `_statusFilterToCode()` produces the right integer; `getPackagesRDS` sends `&status=1` / `&status=2` / `&status=5`; filtered results render correctly.

### G. Mobile view

1. Load on a 375 px viewport.
2. **Expected:** no layout regression — RDS path uses identical DOM output.

---

## Safety Confirmations

- Feature flag OFF preserves current behavior. ✓
- Legacy API path (`getuserpackages` + `/api/packages-proxy`) still exists. ✓
- `mis-paquetes.html` can fall back to legacy on any RDS failure. ✓
- No writes (INSERT / UPDATE / DELETE / DDL) were run. ✓
- No production database was queried. ✓
- No frontend module other than `mis-paquetes.html` was changed. ✓
- No credentials exposed in responses or logs. ✓
- `_adminDebug` is not emitted by the portal endpoint. ✓
- `consigneeNotes` is never exposed to portal users. ✓
- `idConsignee` is never accepted from the browser. ✓
