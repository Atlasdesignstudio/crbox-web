# RDS Invoices — Shadow Validation & Pre-Wiring Implementation Report

**Phase 1 completed:** 2026-05-14 (shadow compare + field parity)  
**Phase 2 completed:** 2026-05-14 (mapping fixes, response shaping, recibos)  
**Test accounts:** `prueba@crbox.cr` (idConsignee 50601002), `acct2` (idConsignee 50604342)  
**Source table:** `resumenmawb` (crbox_dev1, 260,322 rows)  
**Constraint:** read-only, crbox_dev1 only, no writes, no production DB  

---

## 1. Environment Checks

| Check | Result |
|-------|--------|
| `USE_RDS_PORTAL_API` | `true` ✅ |
| `USE_RDS_INVOICES_FRONTEND` | unset (correct — frontend not yet wired) ✅ |
| Active DB confirmed as `crbox_dev1` | ✅ |
| `GET /api/portal/invoices-rds` returns 503 when flag unset | ✅ |
| `GET /api/admin/rds-invoices-shadow-compare` returns 401 without session | ✅ |
| `GET /api/config` returns `useRdsInvoices: false` | ✅ |

---

## 2. Shadow Compare Results

Both methods were used:

- **Method A** — Python module level (`_rds_query_invoices` + `_compute_invoices_diff`)
- **Method B** — HTTP endpoint (`GET /api/admin/rds-invoices-shadow-compare`)

Legacy calls used the service account Bearer token from `/authtoken`
(`grant_type=password` → `access_token`).

### Account 1 — prueba@crbox.cr (idConsignee 50601002)

| Window | RDS | Legacy | countΔ | amountΔ | amtMismatch | recibosMismatch |
|--------|-----|--------|--------|---------|-------------|-----------------|
| 2021 full year | 2 / $34.31 | 2 / $34.31 | **0** | **$0.00** | `[]` | none |
| 2022 H1 (Jan–Jun, 180 d) | 3 / $66.69 | 3 / $66.69 | **0** | **$0.00** | `[]` | none |
| 2022 H2 (Jul–Dec, 172 d) | 3 / $35.50 | 3 / $35.50 | **0** | **$0.00** | `[]` | none |
| 2023 H1 (Jan–Jun, 179 d) | 0 / $0.00 | 0 / $0.00 | **0** | **$0.00** | `[]` | none |

All windows: **countDelta = 0, missingInRds = [], missingInLegacy = [],
amountMismatch = [], recibosMismatch = none**.

### Account 2 — idConsignee 50604342 (RDS-only, see note)

| Window | RDS count | RDS total | recibos |
|--------|-----------|-----------|---------|
| 2022 H1 (Jan–Jun, 179 d) | 5 | $228.77 | 1,1,1,3,1 |
| 2022 H2 (Jul–Dec, 173 d) | 4 | $370.37 | various |
| 2023 H1 (Jan–Jun, 179 d) | 11 | $639.89 | various |

**Note — Account 2 legacy comparison:** The service account Bearer token can call
`getfacturas` only for accounts it is explicitly authorised to access.
`prueba@crbox.cr` is a controlled test account; Account 2 is a real customer
account where the service account has no access. The legacy API returned 0
invoices for Account 2 in all windows — this is an authorisation limitation of
the shadow compare tooling, **not a data integrity issue**.

RDS-only validation for Account 2 confirmed:
- `billedDate` and `descuentoNombre` ('Mediana') populated correctly
- `masterAirShipment` and `isInvoiced` match expected values
- All `{Factura, Recibos}` shape assertions passed

---

## 3. Field-by-Field Parity (Account 1, 2022, n = 6 invoices)

| Field | Result |
|-------|--------|
| `total` | ✅ exact match all 6 |
| `weigth` | ✅ exact match all 6 |
| `volumentricWeigth` | ✅ exact match all 6 |
| `cantidadBultos` | ✅ exact match all 6 |
| `masterAirShipmentNumber` | ✅ identical (e.g. `'992 1533 6860'`) |
| `recibos count` | ✅ matches legacy: 0, 2, 1, 9, 4, 3 |
| hidden bill `*****` | ✅ present in both |
| `billedDate` / `createdDate` | ⚠️ legacy returns `null` — RDS is correct. Legacy .NET serialization bug. Switching to RDS **fixes** the date column. |
| `isInvoiced` | ⚠️ legacy returns `false` — RDS returns `true`. Same backing-field artifact. |

---

## 4. Mapping Fixes Implemented

### 4.1 `descuentoNombre` JOIN (required, now complete)

**SQL addition** to `_rds_query_invoices`:
```sql
LEFT JOIN descuentocorporativo d
  ON d.idDescuentoCorporativo = r.idDescuentoCorporativo
-- SELECT addition:
d.nombre AS descuentoNombre
```

**Response shaping** — `_shape_invoice_rds`:
```python
'descuentoCorporativo': {'nombre': desc_nombre} if desc_nombre else {}
```

`mapBill()` reads `disc._nombre || disc.nombre` — `'nombre'` key matches.
Coverage: 28% of prueba@crbox.cr invoices, 16% globally.
Empty string (`''`) when no discount (most accounts).

---

### 4.2 `recibos` — Batch WR Query (required, now complete)

**Join path** (confirmed via field parity test):
```
resumenmawb.guiasHijas  →  airshipment.airShipmentNumber
warehousereceipt.AirShipment = airshipment.idAirShipment
warehousereceipt.Consignee   = id_consignee      ← auth scope guard
```

**Multi-value guiasHijas finding:**
`guiasHijas` can contain multiple space-separated AWB tokens
(e.g. `'Haw-163848 Haw-163864'`). This affects **12.6% of resumenmawb rows
globally** (32,694 / 260,322) and is a common pattern, not a rare edge case.
The initial implementation used an exact-match JOIN which silently returned 0
recibos for these invoices. The revised implementation splits on whitespace
and queries by individual AWB token.

**Revised batch SQL** (in `_rds_query_invoice_recibos`):
```sql
SELECT
  a.airShipmentNumber,
  wr.number,
  wr.receivedDateTime,
  wr.totalWeight,
  wr.totalVolume,
  wr.totalVolumetricWeight,
  sg.statusName,
  sh.shipperName,
  cai.trackingNumber,
  ca.carrierName
FROM airshipment a
JOIN warehousereceipt wr
  ON wr.AirShipment = a.idAirShipment
 AND wr.Consignee   = :id_consignee
LEFT JOIN status_general    sg  ON sg.idStatus             = wr.Status
LEFT JOIN shipper           sh  ON sh.idShipper            = wr.Shipper
LEFT JOIN carrierinformation cai ON cai.idCarrierInformation = wr.CarrierInformation
LEFT JOIN carrier           ca  ON ca.idCarrier             = cai.Carrier
WHERE a.airShipmentNumber IN (:awb1, :awb2, …)
ORDER BY a.airShipmentNumber, wr.receivedDateTime
```

`status_general` is used here (same table as the `getwarehousereceipts` view).
`id_consignee` is bound server-side — never accepted from the client.

**Python AWB splitting** (before building the IN clause):
```python
for token in guias.split():           # splits on whitespace
    awb_to_inv_ids.setdefault(token, []).append(inv_id)
```

**Recibo shape** — each item pre-shaped to match `mapRecibo()` in `portal-api.js`:
```json
{
  "number":                "521927-2022",
  "receiveddatetime":      "2022-11-23T01:00:00",
  "totalweight":           4.54545,
  "totalvolume":           1.13889,
  "totalvolumetricweight": 5.3792,
  "status":                {"statusname": "Crbox"},
  "shipper":               {"shippername": ""},
  "carrierinformation":    {
    "trackingnumber": "1832/8448",
    "carrier":        {"carriername": "UPS"}
  }
}
```

**Coverage notes:**
- Invoices with null/empty `guiasHijas` (~0.5% globally) return `Recibos: []`.
  These are historical stub records with `Consignee = NULL` — not real user invoices.
- `'prueba analisis'` and similar test strings in `guiasHijas` split to tokens
  that match nothing in `airshipment` — correct result is `Recibos: []`.
- The recibos query is wrapped in a separate `try/except` with graceful
  degradation: if the batch query fails, invoices still render and the
  recibos column shows `—`.

---

### 4.3 Response Shaping — `{Factura, Recibos}` Envelope (required, now complete)

`mapBill()` in `portal-api.js` reads `raw.Factura` (nested object) and
`raw.Recibos` (array). `_unwrapBillsEnvelope()` looks for the `'facturas'`
key in the response envelope.

**Handler pipeline** (in `_handle_portal_invoices_rds`):

```
_rds_query_invoices(...)      → flat invoice rows + guiasHijas + descuentoNombre
_rds_query_invoice_recibos(…) → idResumenMAWB → [recibo, …] map
_shape_invoice_rds(inv, recs) → {Factura: {…}, Recibos: […]}
```

**Response shape** (confirmed via JSON round-trip + field assertions):
```json
{
  "ok":       true,
  "source":   "rds",
  "count":    6,
  "facturas": [
    {
      "Factura": {
        "factura":           "F-10230255",
        "billedDate":        "2022-12-07T09:02:17",
        "createdDate":       "2022-11-29T12:36:38",
        "masterAirShipment": {
          "masterairshipmentnumber": "992 1533 6860",
          "masterAirShipmentNumber": "992 1533 6860"
        },
        "weigth":            10.0,
        "volumentricWeigth": 14.0,
        "cantidadBultos":    4,
        "total":             34.5,
        "descuentoCorporativo": {"nombre": "Pequeña"},
        "isInvoiced":        true,
        "fileLocation":      ""
      },
      "Recibos": [
        {
          "number":                "521927-2022",
          "receiveddatetime":      "2022-11-23T01:00:00",
          "totalweight":           4.54545,
          "totalvolume":           1.13889,
          "totalvolumetricweight": 5.3792,
          "status":                {"statusname": "Crbox"},
          "shipper":               {"shippername": ""},
          "carrierinformation":    {"trackingnumber": "1832/8448",
                                    "carrier": {"carriername": "UPS"}}
        }
      ]
    }
  ]
}
```

**`_unwrapBillsEnvelope` compatibility:** The function checks keys
`['Facturas', 'facturas', ...]` — `'facturas'` is in the list. ✅

**`mapBill` compatibility** — all expected fields verified by assertion:

| `mapBill()` access path | Provided by RDS |
|-------------------------|-----------------|
| `raw.Factura.factura` | ✅ |
| `raw.Factura.billedDate` | ✅ (populated; legacy was null) |
| `raw.Factura.createdDate` | ✅ (populated; legacy was null) |
| `raw.Factura.masterAirShipment.masterairshipmentnumber` | ✅ |
| `raw.Factura.weigth` | ✅ |
| `raw.Factura.volumentricWeigth` | ✅ (typo matches mapBill's typo) |
| `raw.Factura.cantidadBultos` | ✅ |
| `raw.Factura.total` | ✅ |
| `raw.Factura.descuentoCorporativo.nombre` | ✅ |
| `raw.Factura.isInvoiced` (bool) | ✅ |
| `raw.Factura.fileLocation` → `invoiceFileUrl` | ✅ stubbed as `''` |
| `raw.Recibos[].status.statusname` | ✅ |
| `raw.Recibos[].shipper.shippername` | ✅ |
| `raw.Recibos[].carrierinformation.trackingnumber` | ✅ |
| `raw.Recibos[].carrierinformation.carrier.carriername` | ✅ |

**Internal fields excluded from `Factura`:** `guiasHijas`, `idResumenMAWB`,
`descuentoNombre` (folded into `descuentoCorporativo`). Verified by assertion.

---

### 4.4 `invoiceFileUrl` — Known Limitation (stubbed, permanent)

**Finding:** `invoiceFileUrl` / `fileLocation` is not available in `crbox_dev1`.

- `resumenmawb.enlace` — `tinyint` flag, not a URL
- `purchase_bill.location` — local upload table for customer-uploaded invoices
  managed by our own server (`/uploads/invoices/`); not the CRBOX PDF
- No PDF URL column found in any table in `crbox_dev1`

**Legacy comparison:** The legacy API also returned this field as empty/null
for both test accounts in all tested windows. No regression.

**Behaviour in `mis-facturas.html`:** Line 1230 checks
`var dlUrl = dlBill && dlBill.invoiceFileUrl`. If falsy, the download button
handler does nothing (no crash, no visible error). The invoice row still
renders fully.

**Stub:** `'fileLocation': ''` in `_shape_invoice_rds`. `mapBill()` checks
`f.fileLocation || f.FileLocation || f.invoiceFileUrl || …` — the empty string
resolves to `invoiceFileUrl: ''`.

---

## 5. Post-Fix Shadow Compare & Recibos Parity

Re-run after all mapping fixes applied:

| Window | countΔ | amtMismatch | recibosMismatch |
|--------|--------|-------------|-----------------|
| Account1 2022-H1 | 0 | `[]` | none ✅ |
| Account1 2022-H2 | 0 | `[]` | none ✅ |
| Account1 2021 full year | 0 | `[]` | none ✅ |
| Account1 2023-H1 | 0 | `[]` | none ✅ |

Recibos count parity detail (2022, n = 6 invoices):

| Factura | Legacy recibos | RDS recibos | Match |
|---------|---------------|-------------|-------|
| F-10221761 (multi-AWB) | 2 | 2 | ✅ |
| F-10221900 (test AWB) | 0 | 0 | ✅ |
| `*****` | 4 | 4 | ✅ |
| F-10226248 | 9 | 9 | ✅ |
| F-10226569 | 1 | 1 | ✅ |
| F-10230255 | 3 | 3 | ✅ |

F-10221761 was the key case: `guiasHijas = 'Haw-163848 Haw-163864'` (two AWBs).
The initial exact-match JOIN returned 0 recibos for this invoice. The revised
whitespace-split implementation returns the correct 2 recibos.

---

## 6. Remaining Pre-Wiring Steps

All backend mapping fixes are complete. The remaining work before
`mis-facturas.html` can be wired is **frontend-only**:

- [ ] **Remove `defer`** from `<script src="portal-api.js">` and
  `<script src="auth.js">` in `mis-facturas.html` (same fix as `mis-paquetes.html`).
  Without this, any inline IIFE that reads `window.CRBOXPortalAPI` at parse time
  will see `undefined`.
- [ ] **Add IIFE + feature flag check** in `mis-facturas.html`: check
  `window.__crboxConfig.useRdsInvoices`, call `portal.getBillsRDS()` (or the
  equivalent RDS endpoint), fall back to `portal.getBills()` if 503.
  Port the pattern from `mis-paquetes.html`.
- [ ] **`getBillsRDS()`** — add to `portal-api.js`: call
  `GET /api/portal/invoices-rds?start=...&end=...` then
  `data.facturas.map(mapBill)`. The `_unwrapBillsEnvelope` + `mapBill` chain
  already works; this is a thin wrapper.
- [ ] **Shadow compare on one more account** after wiring to verify
  real browser path works end-to-end.

---

## 7. Safety Confirmations

| Confirmation | ✓ |
|-------------|---|
| No writes (INSERT / UPDATE / DELETE / DDL) | ✓ |
| No production database queried | ✓ |
| `USE_RDS_INVOICES_FRONTEND` remains unset | ✓ |
| `mis-facturas.html` not modified | ✓ |
| `portal-api.js` not modified | ✓ |
| `id_consignee` never accepted from client | ✓ |
| `wr.Consignee = id_consignee` enforces auth scope in WR query | ✓ |
| `guiasHijas` excluded from portal response | ✓ |
| `idResumenMAWB` excluded from portal response | ✓ |
| Financial breakdown fields excluded | ✓ |
| Internal/operational fields excluded | ✓ |

---

## 8. Recommendation

### **A — Safe to proceed to feature-flagged `mis-facturas` frontend wiring**

All backend pre-wiring tasks are complete:

| Task | Status |
|------|--------|
| Shadow compare passes (countΔ=0, amtΔ=$0, missingInRds=[]) | ✅ |
| `descuentoNombre` JOIN implemented | ✅ |
| `recibos` batch query with multi-AWB support | ✅ |
| `{Factura, Recibos}` response shape — `mapBill` compatible | ✅ |
| `_unwrapBillsEnvelope` key `'facturas'` present | ✅ |
| All `mapBill` field access paths verified by assertion | ✅ |
| `invoiceFileUrl` stubbed as `''` (known limitation documented) | ✅ |
| Internal fields excluded from portal response | ✅ |
| `wr.Consignee = id_consignee` auth scope guard in WR query | ✅ |
| `USE_RDS_INVOICES_FRONTEND` unset — no live traffic affected | ✅ |

The remaining work is frontend-only (defer removal, IIFE + flag check,
`getBillsRDS()` thin wrapper) — standard patterns already established in
`mis-paquetes.html`. Once that is done and a smoke test passes,
`USE_RDS_INVOICES_FRONTEND=true` can be set.
