# mis-facturas — RDS Frontend Wiring: Browser QA Checklist

**Date prepared:** 2026-05-14  
**Follows pattern:** `mis-paquetes` RDS wiring (same safety model)  
**Flag to enable:** `USE_RDS_INVOICES_FRONTEND=true`  
**Default state:** flag OFF — legacy `getBills` / `getfacturas` path used unchanged  

---

## Pre-flight: Environment Setup

Before starting any QA, confirm the following in the browser DevTools **Console** tab:

```javascript
// Should return false when flag is OFF, true when flag is ON
window._useRdsInvoices   // undefined until DOMContentLoaded fires; then boolean

// Fetch config manually to check flag value
fetch('/api/config').then(r=>r.json()).then(console.log)
// Expected: { featureFlags: { useRdsPackages: ..., useRdsInvoices: false|true } }
```

---

## Section A — Flag OFF (legacy path, default)

These checks verify that the flag-off state is **byte-for-byte identical** to the
behavior before this wiring was added. No regression is acceptable here.

| # | Step | Expected | Pass/Fail |
|---|------|----------|-----------|
| A1 | Open `mis-facturas.html` while logged in | Page loads, spinner appears briefly, then invoice rows render | |
| A2 | Open DevTools → Network tab; filter to `getfacturas` | Legacy `getfacturas` XHR fires (not `/api/portal/invoices-rds`) | |
| A3 | No request to `/api/portal/invoices-rds` in Network tab | Confirmed absent | |
| A4 | `/api/config` is fetched once on load | Visible in Network tab; returns `useRdsInvoices: false` | |
| A5 | Invoice rows render with correct columns | Factura number, date, amount, peso, bultos, discount, recibos count | |
| A6 | Click "Ver factura" on a row that has recibos | Inline recibos detail expands below the row | |
| A7 | Recibos detail shows: Recibo #, Tracking, Estado, Recibido, Tienda, Carrier, Peso, Peso vol., "Ver paquete →" link | All columns present | |
| A8 | "Ver paquete →" link navigates to `mis-paquetes.html?receipt=<number>` | Correct URL | |
| A9 | Click download icon on a row | Toast: "No hay archivo disponible para esta factura" (no crash, no broken URL) | |
| A10 | Change date range and click "Buscar Facturas" | Table re-fetches and renders new results | |
| A11 | Enter key in date inputs triggers reload | Same as clicking Buscar | |
| A12 | "Restablecer filtros" clears search input and resets date range | Confirmed | |
| A13 | Refresh button re-fetches and spins during load | Confirmed | |
| A14 | Summary cards (total facturas, importe total) update with each fetch | Match visible rows | |
| A15 | Mobile layout: table is scrollable horizontally | No horizontal overflow on the page body | |
| A16 | Mobile layout: invoice rows are readable at 375px viewport | Text not clipped | |

---

## Section B — Flag ON (`USE_RDS_INVOICES_FRONTEND=true`)

Enable the flag in environment variables, then restart the server.
Verify in DevTools Console that `fetch('/api/config')` returns `useRdsInvoices: true`.

| # | Step | Expected | Pass/Fail |
|---|------|----------|-----------|
| B1 | Open `mis-facturas.html` while logged in | Page loads normally; spinner → invoice rows | |
| B2 | Network tab: `/api/portal/invoices-rds` is called **first** | RDS endpoint fires before (or instead of) `getfacturas` | |
| B3 | Network tab: legacy `getfacturas` does **not** fire on a successful RDS load | Only one invoice fetch in Network tab | |
| B4 | RDS endpoint response is 200 with JSON body | Check in Network → Response tab; should contain `"ok":true,"source":"rds","facturas":[…]` | |
| B5 | Invoice rows render correctly | Same columns as flag-off; row count and totals match the flag-off baseline | |
| B6 | `billedDate` column renders a date (not "—" or empty) | RDS provides correct dates; legacy was returning null | |
| B7 | `createdDate` is populated (visible in detail / raw response) | Correctly set from RDS | |
| B8 | Invoice totals match the flag-off baseline | Same amounts to the cent | |
| B9 | Peso and peso volumétrico match | Same values | |
| B10 | Discount column (`descuentoNombre`) displays correctly when present | e.g. "Pequeña", "Mediana" appear in the Descuento cell | |
| B11 | Discount column shows "—" or is blank when no discount applies | No crash, no undefined displayed | |
| B12 | Click "Ver factura" to expand recibos detail | Detail row opens | |
| B13 | Recibos detail: correct count matches the RDS shadow compare validation data | e.g. F-10221761 shows 2 recibos | |
| B14 | Recibos detail: Estado, Tracking, Recibido, Tienda, Carrier, Peso, Peso vol. all populated | No "—" in data that exists in RDS | |
| B15 | Download icon on a row | Toast: "No hay archivo disponible para esta factura" — `invoiceFileUrl` is `''`, no crash | |
| B16 | "Buscar Facturas" with a custom date range re-fetches via RDS | `/api/portal/invoices-rds` appears again in Network tab with new `start`/`end` params | |
| B17 | QA helper override: in console run `_qaLoadBills(new Date('2022-01-01'), new Date('2022-06-30'))` | Table reloads with 2022 H1 data from RDS | |
| B18 | No internal fields exposed in browser | DevTools → Network → Response: confirm `guiasHijas`, `idResumenMAWB`, `descuentoNombre` (raw) are **absent** from the response | |
| B19 | Mobile layout renders correctly at 375px | Same as A15/A16 |  |

---

## Section C — Fallback Behavior

These checks verify that a non-auth RDS failure silently falls back to legacy,
and that auth failures do **not** fall back.

| # | Step | Expected | Pass/Fail |
|---|------|----------|-----------|
| C1 | Simulate RDS 503 (disable flag mid-session or temporarily break the endpoint) | Console shows `[CRBOX] RDS invoices failed, falling back to legacy: …`; legacy `getfacturas` fires; invoices still load | |
| C2 | After fallback, user sees no error message | Page renders invoice rows normally | |
| C3 | Simulate auth expiry (clear `localStorage` tokens, reload) | Redirected to `login.html`; no fallback to RDS with expired credentials | |
| C4 | Simulate 401 from RDS (tamper token) | Auth error propagated; redirect to login; no silent fallback | |

---

## Section D — No Internal Fields Exposed

| # | Step | Expected | Pass/Fail |
|---|------|----------|-----------|
| D1 | Inspect `/api/portal/invoices-rds` response in Network tab | `facturas[0]` contains only `Factura` and `Recibos` keys | |
| D2 | `Factura` object keys | Only: `factura`, `billedDate`, `createdDate`, `masterAirShipment`, `weigth`, `volumentricWeigth`, `cantidadBultos`, `total`, `descuentoCorporativo`, `isInvoiced`, `fileLocation` | |
| D3 | `guiasHijas` absent from response | Confirmed absent | |
| D4 | `idResumenMAWB` absent from response | Confirmed absent | |
| D5 | `descuentoNombre` (raw field) absent — only `descuentoCorporativo.nombre` present | Confirmed | |

---

## Section E — Script Loading

| # | Step | Expected | Pass/Fail |
|---|------|----------|-----------|
| E1 | DevTools Console: no `CRBOXPortalAPI is not defined` error | Clean console on load | |
| E2 | DevTools Console: no `CRBOXAuth is not defined` error | Clean console on load | |
| E3 | Check Network tab order: `portal-api.js?v=4` loads synchronously (before DOMContentLoaded fires) | No `defer` on this script | |
| E4 | `auth.js?v=3` also loads synchronously | No `defer` | |

---

## QA Helper Reference

Available in the browser console at any time (flag on or off):

```javascript
// Load a specific date range (useful for crbox_dev1 snapshot data)
_qaLoadBills(new Date('2022-01-01'), new Date('2022-06-30'))

// Full year 2022
_qaLoadBills(new Date('2022-01-01'), new Date('2022-12-31'))

// Check current flag state
fetch('/api/config').then(r=>r.json()).then(d=>console.log('useRdsInvoices:', d.featureFlags.useRdsInvoices))

// Check which function was used in the last call (console debug messages)
// When flag ON + RDS succeeded: no fallback debug message
// When flag ON + RDS failed:    "[CRBOX] RDS invoices failed, falling back to legacy: …"
// When flag OFF:                no RDS call at all
```

---

## Rollback Instructions

If any QA step fails and the issue cannot be quickly resolved:

1. **Immediate:** Unset `USE_RDS_INVOICES_FRONTEND` (or set it to anything other than `true`) and restart the server. The page immediately falls back to the legacy path — no code change required.

2. **Code rollback:** If needed, revert to the last checkpoint before this wiring was added. The legacy `getBills` / `getfacturas` path remains fully intact in `portal-api.js` and is called unchanged when `_useRdsInvoices` is `false`.

3. **No database writes were made.** No data migration or schema change is involved. Rollback has zero DB impact.

---

## Final Safety Confirmations

| Confirmation | ✓ |
|-------------|---|
| `USE_RDS_INVOICES_FRONTEND` is off by default | ✓ |
| Legacy `getBills` / `getfacturas` path intact and unmodified | ✓ |
| Auth errors propagate — no silent fallback on 401/403 | ✓ |
| No credentials or tokens exposed in JS or network responses | ✓ |
| No internal DB fields (`guiasHijas`, `idResumenMAWB`) in portal response | ✓ |
| `mi-cuenta.html`, `mis-paquetes.html`, dashboard, login unchanged | ✓ |
| No DB writes, no schema changes, no production DB queries | ✓ |
| `portal-api.js` version bumped to `v=4` (cache-bust for `getBillsRDS`) | ✓ |
