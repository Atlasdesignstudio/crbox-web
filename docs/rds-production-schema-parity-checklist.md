# RDS Production Schema Parity Checklist

**Purpose:** Validate that the production `CrBox` database contains every table, view, and column required by the three portal modules before enabling any production RDS frontend feature flag.

**Run using:** `crbox_portal_ro` only — connect to production RDS, execute `docs/rds-production-schema-parity.sql`, then fill in the Pass/Fail and Notes columns below.

**Prerequisite:** `crbox_portal_ro` MySQL user must be created and verified (Task #541 / `docs/crbox-portal-ro-setup.sql`).

**Created:** 2026-05-14  
**Status:** ⏳ Awaiting execution — `crbox_portal_ro` not yet created on production RDS

---

## Operator checklist before starting

- [ ] Connected as `crbox_portal_ro` — not as `CrBoxUser` or any admin user
- [ ] `SELECT DATABASE();` returned exactly `CrBox` — if not, stop immediately
- [ ] No row-level queries executed, no `SELECT *`, no DML, no DDL
- [ ] No customer data (emails, IDs, phone numbers) in output
- [ ] Results will not be pasted into public channels

---

## Case-sensitivity reference

| Name | Correct form | Common wrong form | Note |
|---|---|---|---|
| Database | `CrBox` | `crbox`, `Crbox`, `CRBOX` | Must match `EXPECTED_RDS_DATABASE=CrBox` |
| Table | `Sucursal` | `sucursal` | Capital S — MySQL is case-insensitive on Linux by default, but verify |
| Column | `weigth` | `weight` | Intentional typo in `resumenmawb` — this IS the DB column name |
| Column | `volumetricWeigth` | `volumetricWeight` | Intentional typo in `resumenmawb` — DB column name |
| Response key | `volumentricWeigth` | `volumetricWeigth` | Response key differs from DB column — remapped in `server.py` FIELD_REMAP |
| FK column | `warehousereceipt.AirShipment` | `airShipment` | Capital A — confirm capitalisation |
| FK column | `warehousereceipt.Consignee` | `consignee` | Capital C |
| FK column | `warehousereceipt.Status` | `status` | Capital S |
| FK column | `warehousereceipt.Shipper` | `shipper` | Capital S |
| FK column | `warehousereceipt.CarrierInformation` | `carrierInformation` | Capital C |
| FK column | `resumenmawb.Consignee` | `consignee` | Capital C |
| FK column | `resumenmawb.MasterAirshipment` | `masterAirShipment` | Mixed case — verify exact form |
| FK column | `phone.PhoneType` | `phoneType` | Capital P,T |
| FK column | `address.AddressType` | `addressType` | Capital A,T |
| Label column | `addresstype.type` | `AddressType` | Label column is `type`, not the table name |
| Label column | `phonetype.type` | `PhoneType` | Label column is `type`, not the table name |
| Label column | `identificationtype.type` | `identificationType` | Label column is `type` |
| Name column | `Sucursal.name` | `NombreSucursal`, `nombre` | Confirmed `name` in dev |

---

## Section 1 — Shared Objects

Objects used by more than one module.

### 1.1 `consignee` (Table)

**Used by:** packages, invoices, profile  
**Role:** Resolves `idConsignee` from authenticated email (all modules). Profile reads full row.

| Column | Purpose | Required by | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|---|
| `idConsignee` | Primary key — resolved server-side from email | packages, invoices, profile | **Blocking** | | |
| `email` | Auth lookup key — `WHERE email = ?` | packages, invoices, profile | **Blocking** | | |
| `consigneeName` | Profile first name | profile | **Blocking** | | |
| `consigneeLastName1` | Profile first surname | profile | **Blocking** | | |
| `consigneeLastName2` | Profile second surname | profile | Non-blocking | | NULL acceptable |
| `isCompany` | Company account flag — `bit(1)` in dev | profile | **Blocking** | | Dev note: `bit(1)` returns `bytes` in pymysql — handled in server.py |
| `idSucursal` | FK → `Sucursal.idSucursal` | profile | **Blocking** | | NULL means no branch assigned |
| `idPlan` | FK → `plan.idPlan` | profile | Non-blocking | | NULL means no plan assigned |
| `idClient` | FK → `client.idClient` | profile | Non-blocking | | NULL means no client record |
| `codigoFacturacion` | Casillero number shown in portal | profile | **Blocking** | | varchar(150) in dev |
| `receivesNewsletter` | Newsletter preference | profile | Non-blocking | | Known limitation: legacy persistence unconfirmed |
| `identificationNumber` | ID number — masked `****<last4>` in response | profile | Non-blocking | | Never returned raw |
| `identificationType` | ID type label string | profile | Non-blocking | | Fallback used if `identificationtype` table absent |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 1.2 `status_general` (Table)

**Used by:** packages (via `getwarehousereceipts` view), invoices recibos join  
**Role:** Resolves `statusName` from `idStatus` integer.

| Column | Purpose | Required by | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|---|
| `idStatus` | PK — join key (`wr.Status = sg.idStatus`) | packages, invoices | **Blocking** | | |
| `statusName` | Human-readable status label | packages, invoices | **Blocking** | | |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

## Section 2 — Packages Objects

Module: `mis-paquetes` · Endpoint: `GET /api/portal/my-packages` · Flag: `USE_RDS_PACKAGES_FRONTEND`

### 2.1 `getwarehousereceipts` (View) — CRITICAL

**Used by:** packages only  
**Role:** Primary data source for all package records. If this view is missing or has missing columns, the packages module cannot function.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idConsignee` | Filter — `WHERE idConsignee = ?` | **Blocking** | | |
| `idWarehouseReceipt` | Primary key / diff key | **Blocking** | | |
| `number` | Package number displayed in UI | **Blocking** | | |
| `statusId` | Status integer — filter and diff | **Blocking** | | |
| `statusName` | Status label — displayed in UI | **Blocking** | | |
| `trackingNumber` | Tracking — search and display | **Blocking** | | |
| `receivedDateTime` | Date filter, sort, display | **Blocking** | | |
| `createdDate` | Display | Non-blocking | | NULL acceptable |
| `totalPieces` | Display | Non-blocking | | NULL acceptable |
| `totalWeight` | Display | Non-blocking | | NULL acceptable |
| `totalVolume` | Display | Non-blocking / documented | | NULL expected for some packages |
| `totalVolumetricWeight` | Display | Non-blocking / documented | | NULL expected for some packages |
| `shipperName` | Display | Non-blocking | | NULL acceptable |
| `carrierName` | Display | Non-blocking | | NULL acceptable |
| `airShipmentNumber` | Grouping / display | Non-blocking | | NULL acceptable |
| `masterAirShipmentNumber` | Grouping / display | Non-blocking | | NULL acceptable |
| `emision` | Display | Non-blocking | | NULL acceptable |
| `invoicesCount` | Display | Non-blocking | | NULL acceptable |
| `descripcion` | Display | Non-blocking / documented | | NULL expected for some packages |
| `montoFactura` | Display | Non-blocking / documented | | NULL expected for some packages |
| `descripcionFactura` | Display | Non-blocking | | NULL acceptable |
| `consigneeNotes` | Admin debug only — withheld from portal | Non-blocking | | Security boundary: never in portal response |

**View definition check (`SHOW CREATE VIEW`):**  
☐ View definition retrieved and reviewed  
☐ View references `status_general`, `consignee`, or other tables — list any dependencies found: ___

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

## Section 3 — Invoices Objects

Module: `mis-facturas` · Endpoint: `GET /api/portal/invoices-rds` · Flag: `USE_RDS_INVOICES_FRONTEND`

### 3.1 `resumenmawb` (Table) — CRITICAL

**Used by:** invoices only  
**Role:** Primary invoices table. All invoice records are sourced from this table.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idResumenMAWB` | Primary key | **Blocking** | | |
| `factura` | Invoice number — diff key | **Blocking** | | |
| `billedDate` | Date filter, sort, display | **Blocking** | | |
| `createdDate` | Display | Non-blocking | | NULL acceptable |
| `total` | Invoice total — diff check | **Blocking** | | |
| `weigth` | Weight display — **intentional typo** | Non-blocking | | If missing, check for `weight` (correct spelling) — mapping review needed |
| `volumetricWeigth` | Volumetric weight — **intentional typo** | Non-blocking | | Remapped to `volumentricWeigth` in response; if missing, check alternative spellings |
| `cantidadBultos` | Bultos count — display | **Blocking** | | |
| `isInvoiced` | Invoiced flag — display | Non-blocking | | tinyint(1), cast to bool |
| `guiasHijas` | AWB tokens for recibos join | **Blocking** | | Can contain multiple space-separated AWBs; ~0.5% NULL — acceptable |
| `Consignee` | FK → `idConsignee` — auth scope | **Blocking** | | Capital C — verify column name casing |
| `MasterAirshipment` | FK → `masterairshipment.idMasterAirShipment` | **Blocking** | | Mixed case — verify exact name |
| `idDescuentoCorporativo` | FK → `descuentocorporativo` | Non-blocking | | NULL means no discount |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 3.2 `masterairshipment` (Table) — CRITICAL

**Used by:** invoices  
**Role:** LEFT JOIN to resolve `masterAirShipmentNumber` for display.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idMasterAirShipment` | PK — join key | **Blocking** | | |
| `masterAirShipmentNumber` | MAWB number displayed in invoices | **Blocking** | | |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 3.3 `descuentocorporativo` (Table)

**Used by:** invoices  
**Role:** LEFT JOIN to resolve corporate discount name.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idDescuentoCorporativo` | PK — join key | **Blocking** | | |
| `nombre` | Discount name — displayed in invoice detail | Non-blocking | | NULL/absent → empty string in response |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 3.4 `airshipment` (Table)

**Used by:** invoices (recibos sub-query)  
**Role:** Bridge table — `airShipmentNumber` from `guiasHijas` tokens → `idAirShipment` for `warehousereceipt` join.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idAirShipment` | PK — join key for `warehousereceipt.AirShipment` | **Blocking** | | |
| `airShipmentNumber` | Matched against `guiasHijas` tokens | **Blocking** | | |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 3.5 `warehousereceipt` (Table)

**Used by:** invoices (recibos sub-query)  
**Role:** Individual recibo records nested under each invoice.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `AirShipment` | FK → `airshipment.idAirShipment` — **capital A** | **Blocking** | | Verify exact casing |
| `Consignee` | FK → `idConsignee` auth-scope guard — **capital C** | **Blocking** | | Verify exact casing |
| `number` | Recibo number — displayed | **Blocking** | | |
| `receivedDateTime` | Recibo date — displayed | Non-blocking | | NULL acceptable |
| `totalWeight` | Recibo weight — displayed | Non-blocking | | NULL cast to 0.0 |
| `totalVolume` | Recibo volume — displayed | Non-blocking | | NULL cast to 0.0 |
| `totalVolumetricWeight` | Recibo volumetric weight | Non-blocking | | NULL cast to 0.0 |
| `Status` | FK → `status_general.idStatus` — **capital S** | Non-blocking | | Verify casing; statusName '' if absent |
| `Shipper` | FK → `shipper.idShipper` — **capital S** | Non-blocking | | Verify casing; shipperName '' if absent |
| `CarrierInformation` | FK → `carrierinformation.idCarrierInformation` — **capital C** | Non-blocking | | Verify casing |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 3.6 `shipper` (Table)

**Used by:** invoices (recibos sub-query)  
**Role:** LEFT JOIN to resolve shipper name for each recibo.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idShipper` | PK — join key | **Blocking** | | |
| `shipperName` | Shipper name — displayed in recibo | Non-blocking | | '' if NULL |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 3.7 `carrierinformation` (Table)

**Used by:** invoices (recibos sub-query)  
**Role:** LEFT JOIN via `warehousereceipt.CarrierInformation` — provides tracking number and carrier FK.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idCarrierInformation` | PK — join key | **Blocking** | | |
| `trackingNumber` | Carrier tracking number — displayed in recibo | Non-blocking | | '' if NULL |
| `Carrier` | FK → `carrier.idCarrier` — **capital C** | Non-blocking | | Verify casing; carrierName '' if absent |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 3.8 `carrier` (Table)

**Used by:** invoices (recibos sub-query)  
**Role:** LEFT JOIN via `carrierinformation.Carrier` — provides carrier display name.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idCarrier` | PK — join key | **Blocking** | | |
| `carrierName` | Carrier name — displayed in recibo | Non-blocking | | '' if NULL |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

## Section 4 — Profile Objects

Module: `mi-cuenta` · Endpoint: `GET /api/portal/profile-rds` · Flag: `USE_RDS_PROFILE_FRONTEND`

### 4.1 `identificationtype` (Table)

**Used by:** profile  
**Role:** Resolves ID type label from `consignee.identificationType` string. Query is wrapped in try/except — raw string is the fallback if this table is absent.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idIdentificationType` | PK | Non-blocking | | Not used in the query (lookup by `type` value) |
| `type` | Label value — **column name is `type`**, not `identificationType` | Non-blocking / mapping review | | If column name differs, fallback applies |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 4.2 `Sucursal` (Table) — capital S

**Used by:** profile  
**Role:** Resolves branch name from `consignee.idSucursal`. Query is wrapped in try/except.  
**CASING NOTE:** Table name is `Sucursal` with capital S. Verify this exactly.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idSucursal` | PK — join key | **Blocking** | | |
| `name` | Branch display name — **column is `name`**, not `NombreSucursal` | **Blocking** | | If column name differs, branch name will be NULL in response |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 4.3 `client` (Table)

**Used by:** profile  
**Role:** Account tier info — resolved from `consignee.idClient`. Query is wrapped in try/except.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idClient` | PK — join key | **Blocking** | | |
| `name` | Client/company name | Non-blocking | | NULL acceptable |
| `accountType` | Account type label | Non-blocking | | NULL acceptable |
| `cedulaJuridica` | Company legal ID — withheld from portal response | Non-blocking | | Fetched but not exposed to users |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 4.4 `plan` (Table)

**Used by:** profile  
**Role:** Plan tier info — resolved from `consignee.idPlan`. Query is wrapped in try/except.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idPlan` | PK — join key | **Blocking** | | |
| `nombre` | Plan display name — **column is `nombre`**, not `name` | **Blocking** | | If column name differs, planName will be NULL in response |
| `descuento` | Discount rate (float) | Non-blocking | | NULL acceptable |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 4.5 `address` (Table)

**Used by:** profile  
**Role:** CR delivery addresses — joined via `consignee_has_address`. Query is wrapped in try/except.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idAddress` | PK — join key | **Blocking** | | |
| `line1` | Address line 1 | **Blocking** | | |
| `line2` | Address line 2 | Non-blocking | | NULL acceptable |
| `city` | City | Non-blocking | | NULL acceptable |
| `zipCode` | Zip / postal code | Non-blocking | | NULL acceptable |
| `provincia` | Province — **column is `provincia`** | Non-blocking | | NULL acceptable; note: may display as code not label |
| `isPrimary` | Primary address flag — tinyint(1) **on this table** | **Blocking** | | Sort key; NOT on junction table |
| `isActive` | Active flag — tinyint(1) **on this table** | Non-blocking | | |
| `AddressType` | FK → `addresstype.idAddressType` — **capital A,T** | Non-blocking | | Verify casing |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 4.6 `consignee_has_address` (Table)

**Used by:** profile  
**Role:** Junction table linking `consignee` to `address`.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idConsignee` | FK — scopes addresses to authenticated user | **Blocking** | | |
| `idAddress` | FK → `address.idAddress` | **Blocking** | | |

**Note:** No `isPrimary` or `isActive` on this junction table — those flags are on `address` itself.

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 4.7 `addresstype` (Table)

**Used by:** profile  
**Role:** LEFT JOIN via `address.AddressType` — provides address type label.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idAddressType` | PK — join key | **Blocking** | | |
| `type` | Label — **column is `type`**, not `AddressType` | Non-blocking / mapping review | | If column name differs, label will be NULL in response |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 4.8 `phone` (Table)

**Used by:** profile  
**Role:** Phone numbers — joined via `consignee_has_phone`. Phone numbers are masked `****<last4>` before returning. Query is wrapped in try/except.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idPhone` | PK — join key | **Blocking** | | |
| `phoneNumber` | Phone number — masked before returning | **Blocking** | | Raw value never in response |
| `isPrimary` | Primary phone flag — tinyint(1) **on this table** | **Blocking** | | Sort key; NOT on junction table |
| `isActive` | Active flag — tinyint(1) **on this table** | Non-blocking | | |
| `PhoneType` | FK → `phonetype.idPhoneType` — **capital P,T** | Non-blocking | | Verify casing |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 4.9 `consignee_has_phone` (Table)

**Used by:** profile  
**Role:** Junction table linking `consignee` to `phone`.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idConsignee` | FK — scopes phones to authenticated user | **Blocking** | | |
| `idPhone` | FK → `phone.idPhone` | **Blocking** | | |

**Note:** No `isPrimary` or `isActive` on this junction table — those flags are on `phone` itself.

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

### 4.10 `phonetype` (Table)

**Used by:** profile  
**Role:** LEFT JOIN via `phone.PhoneType` — provides phone type label.

| Column | Purpose | Blocking? | Pass/Fail | Notes |
|---|---|---|---|---|
| `idPhoneType` | PK — join key | **Blocking** | | |
| `type` | Label — **column is `type`**, not `PhoneType` | Non-blocking / mapping review | | If column name differs, label will be NULL in response |

**Object exists?** ☐ Yes / ☐ No  
**All blocking columns present?** ☐ Yes / ☐ No  
**Overall:** ☐ Pass / ☐ Fail

---

## Summary Table

| # | Object | Type | Module(s) | Object exists? | Blocking cols present? | Blocking? | Overall |
|---|---|---|---|---|---|---|---|
| A1 | `consignee` | Table | packages, invoices, profile | ☐ | ☐ | **Blocking** | ☐ Pass / ☐ Fail |
| A2 | `status_general` | Table | packages, invoices | ☐ | ☐ | **Blocking** | ☐ Pass / ☐ Fail |
| B1 | `getwarehousereceipts` | View | packages | ☐ | ☐ | **Blocking** | ☐ Pass / ☐ Fail |
| C1 | `resumenmawb` | Table | invoices | ☐ | ☐ | **Blocking** | ☐ Pass / ☐ Fail |
| C2 | `masterairshipment` | Table | invoices | ☐ | ☐ | **Blocking** | ☐ Pass / ☐ Fail |
| C3 | `descuentocorporativo` | Table | invoices | ☐ | ☐ | Non-blocking | ☐ Pass / ☐ Fail |
| C4 | `airshipment` | Table | invoices | ☐ | ☐ | **Blocking** | ☐ Pass / ☐ Fail |
| C5 | `warehousereceipt` | Table | invoices | ☐ | ☐ | **Blocking** | ☐ Pass / ☐ Fail |
| C6 | `shipper` | Table | invoices | ☐ | ☐ | Non-blocking | ☐ Pass / ☐ Fail |
| C7 | `carrierinformation` | Table | invoices | ☐ | ☐ | Non-blocking | ☐ Pass / ☐ Fail |
| C8 | `carrier` | Table | invoices | ☐ | ☐ | Non-blocking | ☐ Pass / ☐ Fail |
| D1 | `identificationtype` | Table | profile | ☐ | ☐ | Non-blocking | ☐ Pass / ☐ Fail |
| D2 | `Sucursal` | Table | profile | ☐ | ☐ | **Blocking** | ☐ Pass / ☐ Fail |
| D3 | `client` | Table | profile | ☐ | ☐ | Non-blocking | ☐ Pass / ☐ Fail |
| D4 | `plan` | Table | profile | ☐ | ☐ | Non-blocking | ☐ Pass / ☐ Fail |
| D5 | `address` | Table | profile | ☐ | ☐ | **Blocking** | ☐ Pass / ☐ Fail |
| D6 | `consignee_has_address` | Table | profile | ☐ | ☐ | **Blocking** | ☐ Pass / ☐ Fail |
| D7 | `addresstype` | Table | profile | ☐ | ☐ | Non-blocking | ☐ Pass / ☐ Fail |
| D8 | `phone` | Table | profile | ☐ | ☐ | **Blocking** | ☐ Pass / ☐ Fail |
| D9 | `consignee_has_phone` | Table | profile | ☐ | ☐ | **Blocking** | ☐ Pass / ☐ Fail |
| D10 | `phonetype` | Table | profile | ☐ | ☐ | Non-blocking | ☐ Pass / ☐ Fail |

**Total objects:** 21 (1 view + 20 tables)

---

## Final Classification

Review every row in the Summary Table above, then assign one overall result:

### A — Schema parity confirmed ✅
All objects exist. All **Blocking** columns present with correct names. No critical missing objects.  
**Next step:** Proceed to production shadow compare (Section 6 of `docs/rds-production-readiness-plan.md`).

### B — Minor differences found ⚠️
All objects exist, and all **Blocking** columns present — but one or more column names differ from the dev assumption (e.g., `weigth` spelled differently, label columns named differently). A `server.py` mapping update is required before shadow compare can proceed.  
**Next step:** Open a new task to update `server.py` column mappings for the affected tables. Do not enable any frontend flag until remapping is confirmed correct.

### C — Critical missing object or column 🛑
One or more **Blocking** objects do not exist, or one or more **Blocking** columns are absent from a critical table.  
**Next step:** Stop. Notify CRBOX infra team. Do not proceed with shadow compare or flag enablement.

---

**Result assigned by operator:** ☐ A / ☐ B / ☐ C

**Completed by:**  
**Date:**  
**Connected as:** `crbox_portal_ro`  
**Notes:**
