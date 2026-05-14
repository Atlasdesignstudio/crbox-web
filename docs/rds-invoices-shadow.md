# RDS Invoices — Shadow Validation

**Date:** 2026-05-14
**Status:** Shadow-mode only — no frontend wiring yet
**Environment:** crbox_dev1 (development snapshot)
**Follows:** `docs/rds-packages-shadow-validation.md` — same safety pattern

---

## Overview

This document covers the backend-only, read-only, feature-flagged RDS invoice
endpoint and its admin shadow compare endpoint.  No changes have been made to
`mis-facturas.html`, the legacy `getBills` / `getfacturas` path, or any other
portal page.

---

## New Endpoints

### `GET /api/portal/invoices-rds`

Portal-user-facing endpoint (stub).  Returns **503** unless
`USE_RDS_INVOICES_FRONTEND=true`.  The frontend is not wired to this endpoint
yet — that wiring is a separate task.

**Auth:** Bearer token + `X-Casillero-Email` header, validated via CRBOX
`getuserinfo`.  `idConsignee` is resolved server-side; never accepted from
the browser.

**Query params:**

| Param | Type | Default | Constraint |
|-------|------|---------|------------|
| `start` | YYYY-MM-DD | required | — |
| `end` | YYYY-MM-DD | required | window ≤ 366 days |
| `limit` | int | 50 | 1–200 |
| `offset` | int | 0 | ≥ 0 |

**Response shape:**

```json
{
  "ok": true,
  "source": "rds",
  "count": 12,
  "invoices": [
    {
      "idResumenMAWB": 260150,
      "factura": "F-10237497",
      "billedDate": "2023-07-26T13:12:26",
      "createdDate": "2023-07-25T13:46:36",
      "total": 7.45,
      "weigth": 0.5,
      "volumentricWeigth": 1.0,
      "cantidadBultos": 1,
      "isInvoiced": true,
      "masterAirShipmentNumber": "MIA-2023-...",
      "recibos": [],
      "descuentoNombre": "",
      "invoiceFileUrl": "",
      "bestDate": "2023-07-26T13:12:26"
    }
  ]
}
```

**Feature flag:** `USE_RDS_INVOICES_FRONTEND` (unset by default — endpoint
returns 503 until explicitly enabled).

---

### `GET /api/admin/rds-invoices-shadow-compare`

Admin-only shadow compare.  Requires an active admin session cookie.

**Query params:** `email`, `start` (YYYY-MM-DD), `end` (YYYY-MM-DD)  
**Date window:** 180 days maximum (matches legacy `getBills` 6-month default)  
**Bearer token header (optional):** when present, triggers a live call to the
legacy `getfacturas` CRBOX endpoint for comparison

**Response shape:**

```json
{
  "email": "prueba@crbox.cr",
  "idConsignee": 50601002,
  "dateRange": { "start": "2023-01-01", "end": "2023-06-30" },
  "rds": {
    "count": 15,
    "totalSum": 423.80,
    "facturaNums": ["F-10228...", "F-10231...", "..."],
    "sample": [...]
  },
  "legacy": {
    "count": 15,
    "totalSum": 423.80,
    "facturaNums": ["F-10228...", "F-10231...", "..."],
    "sample": [...]
  },
  "legacyError": null,
  "diff": {
    "primaryKey": "factura",
    "countDelta": 0,
    "missingInRds": [],
    "missingInLegacy": [],
    "amountMismatch": []
  },
  "phase2Gaps": [
    "recibos (linked package receipts) — not yet joined",
    "descuentoNombre — descuentocorporativo table not yet joined",
    "invoiceFileUrl — PDF location not yet found in schema"
  ]
}
```

---

## Source Table: `resumenmawb`

**Rows (crbox_dev1):** ~257,019 total  
**Test account (prueba@crbox.cr, idConsignee 50601002):** 2,228 rows  
**Date range in snapshot:** 2013-09-18 → 2023-07-26

### Selected columns (explicit — no SELECT *)

| Column | Type | Maps to (mapBill) | Note |
|--------|------|-------------------|------|
| `idResumenMAWB` | int PK | `idResumenMAWB` | Internal ID |
| `factura` | varchar | `factura` | Invoice number, e.g. F-10237497 |
| `billedDate` | datetime | `billedDate` | Primary sort key |
| `createdDate` | datetime | `createdDate` | Fallback date |
| `total` | float | `total` | Total amount billed |
| `weigth` | float | `weigth` | Physical weight (kg) — typo preserved |
| `volumetricWeigth` | float | `volumentricWeigth` | **Typo mismatch** — see below |
| `cantidadBultos` | int | `cantidadBultos` | Number of packages |
| `isInvoiced` | tinyint | `isInvoiced` | Serialised as bool |

**Joined column:**

| Table | Column | Maps to (mapBill) |
|-------|--------|-------------------|
| `masterairshipment` | `masterAirShipmentNumber` | `masterAirShipmentNumber` |

**Join:** `resumenmawb.MasterAirshipment = masterairshipment.idMasterAirShipment` (LEFT JOIN — sparse, not all rows have a master AWB)

### Excluded columns and reasons

| Column | Reason |
|--------|--------|
| `flete`, `recargoCombustible`, `MANBOD`, `AGAD`, `DAI`, `selectivo`, `impuestos`, `pickup`, `exoneracion`, `entrega`, `SED`, `seguro`, `financiamiento`, `unoporciento`, `treceporciento`, `mastercharge`, `declaracionValor`, `procomer`, `IVA` | Financial breakdown — not needed by portal display layer |
| `hiddenBill`, `codigoFacturacion`, `paymentDate`, `referenceNumber`, `paymentMethod`, `paymentRegistrationDate`, `enlace` | Internal/operational — not for portal users |
| `notas`, `comments` | Internal notes — not for portal users |
| `clientName`, `Consignee` | Already known from auth |
| `idDescuentoCorporativo`, `Airshipment` | Phase 2 — join not yet implemented |

---

## Critical Field Mapping Note

Two typos interact in a non-obvious way:

| Location | Field name | Typo |
|----------|------------|------|
| DB column (`resumenmawb`) | `volumetricWeigth` | missing 'e' in "Weigth" |
| `mapBill()` in `portal-api.js` | `volumentricWeigth` | extra 'n' in "volumentric" |

These are **different typos**.  `_rds_query_invoices` remaps:

```python
FIELD_REMAP = { 'volumetricWeigth': 'volumentricWeigth' }
```

This ensures the response key matches what `mapBill()` expects when the frontend
is eventually wired.  Do not "fix" either typo without updating both the DB query
and the frontend rendering code simultaneously.

---

## Phase 2 Gaps

Three fields are returned as safe empty values and must be resolved before
frontend wiring:

### 1. `recibos` — linked package receipts (returned as `[]`)

`mapBill()` expects `recibos` to be an array of package receipts, each with:
`number`, `trackingnumber`, `receiveddatetime`, `totalweight`, `statusname`, etc.

**Investigation status:**
- `resumenmawb.Airshipment` → `airshipment.idAirShipment` — this FK is NULL for
  most rows in the dev snapshot
- `resumenmawb.MasterAirshipment` → `masterairshipment.idMasterAirShipment` →
  `airshipment.idMasterAirShipment` → `warehousereceipt.AirShipment` — this is
  a viable multi-hop join path but needs validation
- `resumenmawb.guiasHijas` — varchar containing linked receipt numbers
  (e.g. "Haw-600000") — may be the simplest linkage

**Action required before wiring:** validate that the multi-hop join (or
`guiasHijas` parse) returns the same receipts as the legacy `Recibos` array.
If recibos are not critical for the MVP display (they show in the detail view
only), this can be deferred to a follow-up.

### 2. `descuentoNombre` — corporate discount name (returned as `""`)

Requires a JOIN on the `descuentocorporativo` table via
`resumenmawb.idDescuentoCorporativo`.  The table exists in crbox_dev1.  Most
invoices have no discount (`idDescuentoCorporativo IS NULL`), so this is a
sparse field.

**Action required before wiring:** add the JOIN and verify the discount name is
populated correctly for accounts that have corporate discounts.  For accounts
without discounts, the field renders as `—` in the UI (handled by `_orDash`).

### 3. `invoiceFileUrl` — PDF invoice URL (returned as `""`)

`mapBill()` reads from `f.fileLocation || f.FileLocation || f.invoiceFileUrl ||
f.InvoiceFileUrl || f.pdfUrl || f.PdfUrl`.  None of these columns appear in
`resumenmawb` or in the two crbox_dev1 views.  The PDF URL likely lives in a
separate documents/files table not yet identified in the schema.

**Action required before wiring:** identify the table holding invoice PDFs and
confirm it is accessible via crbox_dev1.  If not accessible, the download button
in mis-facturas can fall back to the legacy endpoint for the file URL only.

---

## Legacy Endpoint Reference

The legacy `getBills` in `portal-api.js` calls:

```
GET https://clients.crbox.cr/api/crboxwebapi/getfacturas/<email>/<DD-MM-YYYY>/<DD-MM-YYYY>
Authorization: Bearer <token>
```

Response envelope: `{ Facturas: [...] }` (also checked: `facturas`, `Bills`,
`bills`, `data`, `Data`, `Result`, `result`).  Each element has shape:

```json
{ "Factura": { "factura": "F-...", "billedDate": "...", ... }, "Recibos": [...] }
```

The admin shadow compare calls this endpoint server-side using the Bearer token
passed in the `Authorization` header.

---

## Shadow Compare — How to Run

1. Log in to the admin panel (`/admin`).
2. Open DevTools → Network tab.
3. Capture a Bearer token from any portal API call (e.g. copy from
   `/api/portal/my-packages` request).
4. Run from the browser console or `curl`:

```bash
curl -s \
  "https://<dev-domain>/api/admin/rds-invoices-shadow-compare?email=prueba@crbox.cr&start=2023-01-01&end=2023-06-30" \
  -H "X-Admin-Session: <admin-session-token>" \
  -H "Authorization: Bearer <user-bearer-token>" \
  | python3 -m json.tool
```

Or from the browser console while logged in as admin:

```javascript
fetch('/api/admin/rds-invoices-shadow-compare?email=prueba@crbox.cr&start=2023-01-01&end=2023-06-30', {
  headers: { Authorization: 'Bearer <user-bearer-token>' }
}).then(r => r.json()).then(d => {
  console.log('RDS count:',    d.rds?.count);
  console.log('Legacy count:', d.legacy?.count);
  console.log('countDelta:',   d.diff?.countDelta);
  console.log('amountMismatch:', d.diff?.amountMismatch?.length);
});
```

### Pass criteria

| Metric | Target |
|--------|--------|
| `diff.countDelta` | 0 |
| `diff.missingInRds` | `[]` |
| `diff.missingInLegacy` | `[]` |
| `diff.amountMismatch` | `[]` |

---

## Before Frontend Wiring — Checklist

Do not modify `mis-facturas.html` until all of these are confirmed:

- [ ] Shadow compare passes (countDelta=0, amountMismatch=[]) for a recent
      3-month range using `prueba@crbox.cr`
- [ ] Shadow compare passes for at least one additional account
- [ ] Phase 2 gap decision made for each of the three gaps:
  - [ ] `recibos` — resolved or deferred with explicit decision
  - [ ] `descuentoNombre` — resolved or deferred with explicit decision
  - [ ] `invoiceFileUrl` — resolved or deferred with explicit decision
- [ ] `mis-facturas.html` script loading order is sound (apply same
      `defer`-removal fix as `mis-paquetes.html` if needed)
- [ ] Frontend IIFE + fallback pattern from `mis-paquetes` is applied
- [ ] `USE_RDS_INVOICES_FRONTEND` defaults to off; rollback is instant

---

## Safety Confirmations

| Confirmation | ✓ |
|--------------|---|
| No writes (INSERT / UPDATE / DELETE / DDL) | ✓ |
| No production database queried | ✓ |
| `USE_RDS_INVOICES_FRONTEND` unset by default → 503 → legacy path | ✓ |
| `idConsignee` never accepted from client | ✓ |
| Financial breakdown fields excluded from response | ✓ |
| Internal/operational fields excluded from response | ✓ |
| Legacy `getBills` / `getfacturas` path unchanged | ✓ |
| `mis-facturas.html` unchanged | ✓ |
| No other portal page modified | ✓ |
| `USE_RDS_PORTAL_API` gate still required for shadow compare | ✓ |

---

## Rollback

To revert to legacy-only at any point:

1. Leave `USE_RDS_INVOICES_FRONTEND` unset (or set to non-`true`).
2. No server restart required. No code change required.
3. `/api/portal/invoices-rds` returns 503 on the next request; frontend
   continues to call `getBills` / `getfacturas` directly.
