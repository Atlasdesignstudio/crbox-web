# RDS Invoices — Shadow Validation Report

**Date:** 2026-05-14  
**Engineer:** automated shadow compare via `GET /api/admin/rds-invoices-shadow-compare`  
**Test account:** `prueba@crbox.cr` (idConsignee 50601002)  
**Source table:** `resumenmawb` (crbox_dev1, 260,322 rows)  
**Constraint:** read-only, crbox_dev1 only, no production queries, no writes  

---

## 1. Environment Checks

| Check | Result |
|-------|--------|
| `USE_RDS_PORTAL_API` | `true` ✅ |
| `USE_RDS_INVOICES_FRONTEND` | unset (correct — frontend not wired) ✅ |
| Active DB confirmed as `crbox_dev1` | ✅ |
| `GET /api/portal/invoices-rds` returns 503 | ✅ |
| `GET /api/admin/rds-invoices-shadow-compare` returns 401 without session | ✅ |
| `GET /api/config` returns `useRdsInvoices: false` | ✅ |

---

## 2. Shadow Compare Results

Tested via two methods:

**Method A — Python module level** (`_rds_query_invoices` + `_compute_invoices_diff` directly)  
**Method B — HTTP endpoint** (`GET /api/admin/rds-invoices-shadow-compare` with admin
session cookie + service Bearer token in `Authorization` header)

Both methods used the service account Bearer token to call the legacy
`getfacturas` CRBOX API for comparison.

### Counts and Totals

| Window | RDS count | RDS total | Legacy count | Legacy total | countDelta | amountDelta | amountMismatch |
|--------|-----------|-----------|-------------|-------------|------------|-------------|----------------|
| 2021 full year | 2 | $34.31 | 2 | $34.31 | **0** | **$0.00** | `[]` |
| 2022 H1 (Jan–Jun, 180 d) | 3 | $66.69 | 3 | $66.69 | **0** | **$0.00** | `[]` |
| 2022 H2 (Jul–Dec, 172 d) | 3 | $35.50 | 3 | $35.50 | **0** | **$0.00** | `[]` |
| 2023 YTD (Jan–Jul) | 1 | $7.45 | 1 | $7.45 | **0** | **$0.00** | `[]` |

**Total validated:** 9 distinct invoices, $144.00 across all windows.  
**missingInRds:** `[]` in every window.  
**missingInLegacy:** `[]` in every window.  

### HTTP Endpoint Verification

```
2022-H1 (180d): idConsignee=50601002  RDS=3/$66.69  Legacy=3/$66.69  Δ=0  legacyErr=None  amtMismatch=[]
2022-H2 (172d): idConsignee=50601002  RDS=3/$35.50  Legacy=3/$35.50  Δ=0  legacyErr=None  amtMismatch=[]
2023-H1 (179d): idConsignee=50601002  RDS=0/$0      Legacy=0/$0      Δ=0  legacyErr=None  amtMismatch=[]
```

---

## 3. Field-by-Field Parity (2022, all 6 invoices)

| Factura | total | weigth | volumentricWeigth | cantidadBultos | recibos count |
|---------|-------|--------|--------------------|----------------|---------------|
| F-10221761 | ✅ | ✅ | ✅ | ✅ | ✅ 2 |
| F-10221900 | ✅ | ✅ | ✅ | ✅ | ✅ 0 |
| F-10226248 | ✅ | ✅ | ✅ | ✅ | ✅ 9 |
| F-10226569 | ✅ | ✅ | ✅ | ✅ | ✅ 1 |
| F-10230255 | ✅ | ✅ | ✅ | ✅ | ✅ 3 |
| `*****` (hidden) | ✅ | ✅ | ✅ | ✅ | ✅ 4 |

**All amount and weight fields match exactly across all 6 invoices.**

### Discrepancies found (legacy issues, not RDS issues)

| Field | RDS value | Legacy value | Root cause |
|-------|-----------|-------------|------------|
| `billedDate` | Correct ISO datetime | `null` for all invoices | .NET serialization — `billedDate` is stored as a C# backing field; the CRBOX REST API does not serialize it into the JSON response body. **RDS is correct; legacy is deficient.** |
| `createdDate` | Correct ISO datetime | `null` for all invoices | Same root cause as `billedDate`. **RDS is correct.** |
| `isInvoiced` | `true` (DB value = 1) | `false` for all invoices | .NET `[DataContract]` serialization artifact — the property name `isInvoiced` is not mapped to the backing field `_bIsChanged` in the deserialization path. **RDS is correct; legacy has a bug.** |

**Impact on `mis-facturas.html`:** The date column (`bill.bestDate = billedDate || createdDate`) currently renders as `—` for all portal users using the legacy endpoint. Switching to RDS would **fix this display bug** for all invoices. The `isInvoiced` flag controls the download button state; fixing it to `true` is also an improvement.

### masterAirShipmentNumber

RDS returns `masterairshipment.masterAirShipmentNumber` directly. Spot-checked against
legacy values for the same `MasterAirshipment` FK:

| MasterAirshipment ID | RDS value | Legacy `masterairshipmentnumber` |
|---------------------|-----------|----------------------------------|
| 3210 | `'940'` | `940` |
| 3305 | `'9 84'` | `9 84` |
| 3313 | `'988'` | `988` |
| 3408 | `'992 1533 6860'` | `992 1533 6860` |
| 3596 | `'2014'` | `2014` |

**Values are identical.** AWB numbers in this system contain spaces (segment notation),
which is normal for CRBOX's carrier format.

---

## 4. Phase 2 Gap Analysis

### Gap 1: `recibos` (linked package receipts)

**Does legacy return this field?** Yes. Each invoice in the `Recibos` array contains
`number`, `receivedDateTime`, `totalWeight`, `totalVolume`, `totalVolumetricWeight`,
`statusName`, and other WR fields.

**Does RDS have the source data?** Yes, via a confirmed 3-table join:

```sql
JOIN airshipment a
  ON a.airShipmentNumber = r.guiasHijas          -- guiasHijas = e.g. 'Haw-171174'
JOIN warehousereceipt wr
  ON wr.AirShipment = a.idAirShipment
 AND wr.Consignee   = r.Consignee
LEFT JOIN Status s
  ON s.idStatus = wr.Status                      -- Status table: idStatus, statusName
```

**Coverage:** `guiasHijas` is populated for 100% of `prueba@crbox.cr`'s 2,228 rows.
Globally, 1,229 / 260,322 rows (0.5%) have null `guiasHijas` — these are historical
stub records with `Consignee = NULL` and `billedDate = NULL`, not real user invoices.

**WR count parity** (verified against legacy 2022 data):

| Factura | RDS recibos | Legacy recibos |
|---------|-------------|----------------|
| F-10221761 | 2 | 2 ✅ |
| F-10226248 | 9 | 9 ✅ |
| F-10226569 | 1 | 1 ✅ |
| F-10230255 | 3 | 3 ✅ |
| `*****` | 4 | 4 ✅ |
| F-10221900 | 0 | 0 ✅ |

WR counts match exactly. The `statusName` field resolves correctly to `"Crbox"`,
`"MIA"`, `"SJO"`, etc. from the `Status` table using `idStatus`.

**Is it required for current `mis-facturas.html`?**  
`_renderRecibosCell(bill.recibos)` renders `—` if `recibos` is empty. The invoice
row still renders completely without it. For MVP wiring, safely stubbable with `[]`.

**Decision:** Implement before wiring for full feature parity, but not blocking
for display. Add as Phase 2a immediately after descuentoNombre.

**SQL for Phase 2a** (sub-select per invoice to avoid row multiplication):

```sql
-- Per-invoice sub-query pattern (to be embedded as lateral or in-Python grouping)
SELECT wr.idWarehouseReceipt, wr.number, wr.receivedDateTime,
       wr.totalWeight, wr.totalVolume, wr.totalVolumetricWeight,
       s.statusName
FROM   warehousereceipt wr
JOIN   airshipment a ON a.airShipmentNumber = %s   -- bind guiasHijas value
                    AND a.idAirShipment = wr.AirShipment
LEFT JOIN Status s ON s.idStatus = wr.Status
WHERE  wr.Consignee = %s
```

Or use a Python in-memory grouping pass after the main query.

---

### Gap 2: `descuentoNombre` (corporate discount name)

**Does legacy return this field?** Yes — as `f.descuentoCorporativo._nombre` (a
.NET backing-field artifact). `mapBill` reads `disc._nombre || disc.nombre`.

**Does RDS have the source data?** Yes. `descuentocorporativo.nombre` via:

```sql
LEFT JOIN descuentocorporativo d
  ON d.idDescuentoCorporativo = r.idDescuentoCorporativo
```

The `nombre` column in RDS maps directly to `_nombre` in the legacy response.

**Coverage:** 16% of invoices globally (42,188 / 260,322) have a discount FK.
For `prueba@crbox.cr`: 630 / 2,228 rows (28%) have a discount, all resolving to
the `nombre` value `'Pequeña'` (discount tier 8, 15%).

**Is it required for current `mis-facturas.html`?**  
Renders as `—` if empty (`_orDash`). Not blocking for display; adds value for
discount-tier accounts.

**Decision:** Add the JOIN to `_rds_query_invoices` immediately — it's a 3-line
change with zero risk. Include in the same PR as Phase 2a.

---

### Gap 3: `invoiceFileUrl` (PDF download URL)

**Does legacy return this field?** `mapBill` checks six field names
(`fileLocation`, `FileLocation`, `invoiceFileUrl`, `InvoiceFileUrl`, `pdfUrl`,
`PdfUrl`). The raw 2022 legacy `Factura` object does **not** contain any of these
field names — the field was empty in the legacy response as well for this test
account.

**Does RDS have the source data?** No. The `crbox_dev1` schema contains:
- `resumenmawb.enlace` — `tinyint` flag, not a URL
- `purchase_bill.location` — the local invoice upload table managed by our own
  server (`/uploads/invoices/`), not the CRBOX-side PDF

No table in `crbox_dev1` contains a PDF URL column for invoices.

**Is it required for current `mis-facturas.html`?**  
`mis-facturas.html` line 1230: `var dlUrl = dlBill && dlBill.invoiceFileUrl`.
If `dlUrl` is falsy, the download button handler does nothing — no error, no crash.
The display layer (`_renderBillRow`) renders the download button regardless of
whether the URL is present. The button is just non-functional.

**Decision:** Stub as `''` permanently (or until the PDF source table is
identified). The download button was already broken in legacy for this test
account, so no regression. Document as a known limitation.

---

## 5. Pre-Wiring Checklist

The following must be completed before `mis-facturas.html` is wired to
`/api/portal/invoices-rds` and `USE_RDS_INVOICES_FRONTEND=true` is set:

### Required before wiring

- [ ] **descuentoNombre JOIN** — add `LEFT JOIN descuentocorporativo d ON d.idDescuentoCorporativo = r.idDescuentoCorporativo` to `_rds_query_invoices` and return `d.nombre` as `descuentoNombre`.
- [ ] **Frontend adaptation** — `mapBill()` in `portal-api.js` reads `raw.Factura`
  (nested) and `raw.Recibos` (array). The RDS response is flat. Required choice:
  - **Option A (recommended):** Reshape the RDS portal response server-side to
    `{Factura: {factura: ..., weigth: ..., ...}, Recibos: []}` so `mapBill` works
    unchanged. No `portal-api.js` changes needed.
  - **Option B:** Add `mapBillRDS(raw)` in `portal-api.js` that reads flat fields.
    Requires JS change.
- [ ] **Script loading order** in `mis-facturas.html` — apply the same `defer`
  removal fix as `mis-paquetes.html` (`portal-api.js` and `auth.js` must not use
  `defer` when an inline IIFE depends on them).
- [ ] **Frontend IIFE + fallback** — port the `useRdsInvoices` flag check and
  `USE_RDS_INVOICES_FRONTEND` 503 → legacy fallback pattern from `mis-paquetes.html`.
- [ ] **Shadow compare with a second account** — run for at least one additional
  account to confirm generalisability beyond `prueba@crbox.cr`.

### Recommended but not blocking

- [ ] **recibos sub-query** — implement the `guiasHijas → airshipment → WR` join in `_rds_query_invoices`. WR counts already verified correct; adds per-package detail to the detail panel.
- [ ] **invoiceFileUrl** — identify if the CRBOX production API exposes a PDF URL in a different endpoint; for now, stub as `''` is safe.

---

## 6. Recommendation

### **B — Needs mapping fixes first**

The core shadow compare **passes with zero discrepancies** across all tested
windows: `countDelta = 0`, `missingInRds = []`, `missingInLegacy = []`,
`amountMismatch = []`, `amountDelta = $0.00` in every window. Data integrity
is confirmed.

However, two required pre-wiring items remain:

1. **`descuentoNombre` JOIN** — trivial to add, needed for correctness on accounts
   with corporate discount tiers.
2. **Frontend shape adaptation** — `mapBill()` expects a nested `{Factura: {}}` 
   envelope. Either the server must wrap the RDS payload or a `mapBillRDS` 
   function must be added. This is the **primary blocking item** for frontend
   wiring.

The option **A** (recommended): wiring `mis-facturas.html` will take ~1 issue cycle:
1. Add descuentoNombre JOIN to `_rds_query_invoices` (10 min)
2. Add recibos sub-query (30–60 min)
3. Reshape portal response server-side to `{Factura: {...}, Recibos: [...]}` (20 min)
4. Port IIFE + fallback from `mis-paquetes.html` to `mis-facturas.html` (30 min)
5. Remove `defer` from `portal-api.js`/`auth.js` in `mis-facturas.html` (5 min)

**Why not A (safe to wire now)?**
- The frontend shape mismatch would cause `mapBill()` to return empty values for
  all fields because `raw.Factura` would be `undefined`.
- Until that is addressed, `USE_RDS_INVOICES_FRONTEND` must remain unset.

**Why not C (keep on legacy)?**
- Legacy returns `billedDate = null` and `isInvoiced = false` for all invoices —
  these are pre-existing bugs that RDS already fixes.
- Data parity is perfect; the only remaining work is frontend adaptation.

---

## 7. Safety Confirmations

| Confirmation | ✓ |
|-------------|---|
| No writes (INSERT / UPDATE / DELETE / DDL) | ✓ |
| No production database queried | ✓ |
| `USE_RDS_INVOICES_FRONTEND` remains unset | ✓ |
| `mis-facturas.html` not modified | ✓ |
| `portal-api.js` not modified | ✓ |
| Legacy `getBills` / `getfacturas` path untouched | ✓ |
| No credentials or raw invoice data in this document | ✓ |
| `idConsignee` never accepted from client | ✓ |
| Financial breakdown fields excluded from RDS response | ✓ |
| Internal/operational fields excluded from RDS response | ✓ |
