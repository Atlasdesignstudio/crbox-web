# mis-facturas — RDS Integration: Final Browser QA Report

**QA date:** 2026-05-14  
**QA performed by:** Manual browser session (account owner)  
**Tested account:** `prueba@crbox.cr`  
**Tested range:** 2022-01-01 → 2022-06-30  
**Status: PASS — Ready for controlled enablement**

---

## Test Summary

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Invoice count | 3 | 3 | ✅ |
| Total facturado | $66.69 | $66.69 | ✅ |
| RDS endpoint fires first | `/api/portal/invoices-rds` | Confirmed | ✅ |
| Legacy `getfacturas` does not fire | Absent from Network tab | Confirmed absent | ✅ |
| Legacy fallback available | Fires on RDS failure | Confirmed | ✅ |
| Internal fields absent | `guiasHijas`, `idResumenMAWB` absent | Confirmed absent | ✅ |
| Mobile layout | Correct | Correct | ✅ |

---

## Endpoint Behavior

### `/api/config`
Returns `{ featureFlags: { useRdsInvoices: true } }` when `USE_RDS_INVOICES_FRONTEND=true`.  
Returns `{ featureFlags: { useRdsInvoices: false } }` when flag is unset or any other value.

### `/api/portal/invoices-rds?start=YYYY-MM-DD&end=YYYY-MM-DD`
- Auth: `Authorization: Bearer <token>` + `X-Casillero-Email` header
- `idConsignee` resolved server-side from verified email — never accepted from the browser
- Response: `{ ok: true, source: "rds", count: N, facturas: [{ Factura: {…}, Recibos: […] }] }`
- Called before legacy `getfacturas` when `useRdsInvoices: true`

### Confirmed working:
- Invoice rows render with correct factura numbers, dates, totals, peso, bultos
- `billedDate` and `createdDate` populated correctly (legacy was returning null — RDS is an improvement)
- Summary cards (total facturas, total facturado) match rendered rows
- `descuentoCorporativo.nombre` displays correctly when present; empty/blank when no discount
- `_qaLoadBills(new Date('2022-01-01'), new Date('2022-06-30'))` helper works from browser console

---

## Recibos / Invoice Detail

- "Ver factura" expands inline recibos detail correctly
- Recibo count per invoice matches shadow-compare validated data
- Recibo fields render: Recibo #, Tracking, Estado, Recibido, Tienda, Carrier, Peso, Peso vol., "Ver paquete →" link

---

## Fallback Behavior

| Condition | Behavior | Confirmed |
|-----------|----------|-----------|
| RDS returns 503 / network error | `console.debug` + silent fallback to `getfacturas` | ✅ |
| RDS returns 401 / 403 | Auth error propagated; no fallback; session-expired redirect fires | ✅ |
| Flag off (`USE_RDS_INVOICES_FRONTEND` unset) | Legacy `getfacturas` only; zero code-path change | ✅ |

---

## Fields / Security Confirmation

| Check | Result |
|-------|--------|
| `guiasHijas` absent from portal response | ✅ Confirmed absent |
| `idResumenMAWB` absent from portal response | ✅ Confirmed absent |
| `descuentoNombre` (raw DB field) absent — only `descuentoCorporativo.nombre` | ✅ Confirmed |
| No Bearer token or email exposed in response body | ✅ Confirmed |
| `idConsignee` not accepted from browser — resolved server-side | ✅ Confirmed |
| `wr.Consignee = id_consignee` DB-level auth scope guard on warehouse receipt query | ✅ Confirmed (server.py) |

---

## Known Limitation — `invoiceFileUrl` Empty

**Finding:** `invoiceFileUrl` / `fileLocation` is not available in `crbox_dev1`. The field is permanently stubbed as `''` in `_shape_invoice_rds`.

**Behavior:** Clicking the download icon on any invoice row shows the toast "No hay archivo disponible para esta factura." No crash, no JS error, no broken URL.

**Legacy comparison:** The legacy `getfacturas` API also returned this field as empty/null for both test accounts in all tested windows. No regression.

**Resolution required:** None at this time. If CRBOX exposes invoice PDF URLs in a future API version or RDS column, the stub can be replaced with the real value with no frontend changes.

---

## Mobile Layout

- Invoice table scrolls horizontally at 375px viewport. No horizontal overflow on page body.
- Summary cards stack correctly on small screens.
- Recibos detail panel readable on mobile.

**Result: ✅ Pass**

---

## Console / Analytics Notes

- Google Analytics / CSP console errors were observed but are unrelated to the invoices flow (pre-existing, present on the legacy path as well).
- No `CRBOXPortalAPI is not defined` or `CRBOXAuth is not defined` errors.
- No `CRBOXPortalAPI.getBillsRDS is not defined` error.
- No `undefined` or `[object Object]` rendering issues.

---

## Files Changed (Complete List)

### `server.py`
- `_rds_query_invoices` — added `LEFT JOIN descuentocorporativo` for `descuentoNombre`; added `guiasHijas` to SELECT
- `_rds_query_invoice_recibos(rds, id_consignee, inv_rows)` — new: batch WR query with whitespace-split multi-AWB support; `wr.Consignee = id_consignee` auth scope guard
- `_shape_invoice_rds(inv, recibos)` — new: reshapes flat RDS row into `{Factura, Recibos}` envelope matching `mapBill()` field expectations
- `_handle_portal_invoices_rds` — updated to call new helpers; returns `'facturas'` key
- `_handle_admin_rds_invoices_shadow_compare` — shadow compare endpoint (admin-only, read-only)

### `js/portal-api.js` (version `v=4`)
- `getBillsRDS(startDate, endDate)` — new function; calls `/api/portal/invoices-rds`; auth classification matches getPackagesRDS contract
- `getBillsRDS` exported on `CRBOXPortalAPI`

### `mis-facturas.html`
- `portal-api.js` script tag: `defer` removed, version bumped to `v=4`
- `auth.js` script tag: `defer` removed
- `var _useRdsInvoices = false` flag variable added
- `/api/config` fetch on DOMContentLoaded (fire-and-forget, sets `_useRdsInvoices`)
- `_loadBills` — RDS-first IIFE pattern (identical structure to mis-paquetes)
- `window._qaLoadBills(start, end)` QA helper added

### `docs/rds-invoices-shadow-validation.md`
Full shadow compare report: SQL, response shape, recibos parity table, recommendation A.

### `docs/rds-invoices-browser-qa-checklist.md`
Pre-QA checklist: sections A–E (flag off, flag on, fallback, field security, script loading).

### `docs/rds-invoices-browser-qa-report.md` *(this file)*
Post-QA final report.

---

## Feature Flag Behavior

| `USE_RDS_INVOICES_FRONTEND` value | Behavior |
|-----------------------------------|----------|
| Unset / empty / any value ≠ `"true"` | Legacy `getBills` / `getfacturas` path only. Zero code-path change from before this integration. |
| `"true"` | RDS endpoint tried first (`/api/portal/invoices-rds`). On non-auth failure: silent `console.debug` + fallback to `getBills`. On 401/403: auth error propagated, session-expired redirect. |

The flag is **read once per page load** from `/api/config`. No page reload required when toggling the flag in production — the next page load picks up the new value automatically.

---

## Rollback

**Immediate (no code change):**
1. Unset `USE_RDS_INVOICES_FRONTEND` (delete the environment variable or set it to any value other than `"true"`)
2. Restart the server
3. Next page load: `/api/config` returns `useRdsInvoices: false` → `_useRdsInvoices` stays `false` → legacy `getBills` / `getfacturas` path resumes

No code change, no deploy, no database operation required. Rollback is instant.

---

## Safety Invariants

| Invariant | Confirmed |
|-----------|-----------|
| No DB writes (INSERT / UPDATE / DELETE / DDL) | ✅ |
| No DB schema changes | ✅ |
| No production DB queries | ✅ |
| No AWS settings changed | ✅ |
| Legacy `getBills` / `getfacturas` endpoint untouched and intact | ✅ |
| `mis-paquetes.html` not modified | ✅ |
| `mi-cuenta.html` not modified | ✅ |
| `dashboard.html` not modified | ✅ |
| `login.html` not modified | ✅ |
| Registration / password recovery not modified | ✅ |
| No Bearer token or credentials in portal response | ✅ |
| No internal DB fields (`guiasHijas`, `idResumenMAWB`) in portal response | ✅ |
| `idConsignee` resolved server-side; never accepted from browser | ✅ |
| `wr.Consignee = id_consignee` DB-level auth scope on WR query | ✅ |

---

## Final Recommendation

> **mis-facturas RDS integration: Ready for controlled enablement.**
>
> All shadow compare windows passed (countΔ = 0, amtΔ = $0.00, recibos parity exact).  
> All browser QA checks passed (3 invoices / $66.69 total, all fields correct, fallback confirmed).  
> Safety invariants confirmed. Rollback is instant with no code change.
>
> To enable in production: set `USE_RDS_INVOICES_FRONTEND=true` in the **production** environment variable and restart. Monitor the first few production loads via server logs for any unexpected 503 responses (which would trigger the silent legacy fallback).
>
> To enable for all environments simultaneously: move the flag to the **shared** environment.
