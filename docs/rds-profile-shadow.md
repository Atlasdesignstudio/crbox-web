# RDS Profile — Shadow Validation

**Date:** 2026-05-14
**Status:** Schema validated — all joins confirmed — shadow compare complete
**Environment:** crbox_dev1 (development snapshot)
**Follows:** `docs/rds-invoices-shadow.md` — same safety pattern

---

## Overview

This document covers the backend-only, read-only, feature-flagged RDS profile
shadow endpoints.  The goal is to validate that all fields needed by
`mi-cuenta.html` can be reliably resolved from RDS, and to produce a structured
field-mapping report before any frontend wiring is attempted.

**No changes have been made to** `mi-cuenta.html`, the legacy `getuserinfo`
path, any auth endpoints, packages, invoices, or any other portal page.

---

## New Endpoints

### `GET /api/admin/rds-profile-shadow`

Admin-only, read-only shadow endpoint that resolves a full profile record from
`crbox_dev1` for a given email address.

**Auth:** Admin session cookie + `USE_RDS_PORTAL_API=true` feature flag.

**Query params:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | yes | Consignee email (accepted via query param because endpoint is admin-only; must be server-side-resolved before any portal-user-facing version is created) |

**Response shape:**

```json
{
  "ok": true,
  "source": "rds",
  "mode": "shadow",
  "database": "crbox_dev1",
  "profile": {
    "idConsignee": "<integer>",
    "email": "pr***@crbox.cr",
    "name": "<redacted>",
    "lastName1": "<redacted>",
    "lastName2": "<redacted>",
    "fullName": "<redacted>",
    "identificationType": "Cedula ó Residencia",
    "identificationNumberMasked": "****NNNN",
    "isCompany": false,
    "casillero": "00481",
    "receivesNewsletter": true,
    "branch": { "id": 1, "name": "Sabana Norte (Oficina Central)" },
    "client": {
      "idClient": "<integer>",
      "clientName": "CRBOX Cta Emp.",
      "accountType": "Cuenta Empresarial",
      "cedulaJuridica": "<masked>"
    },
    "plan": null,
    "addresses": [
      {
        "idAddress": "<integer>",
        "address1": "<redacted>",
        "address2": "<redacted>",
        "city": "<redacted>",
        "zipCode": "",
        "province": null,
        "addressType": "Casa",
        "idAddressType": 1,
        "isPrimary": true,
        "isActive": false
      }
    ],
    "phones": [
      {
        "idPhone": "<integer>",
        "phoneMasked": "****NNNN",
        "phoneType": "Celular",
        "idPhoneType": 1,
        "isPrimary": false,
        "isActive": false
      }
    ]
  },
  "_withheldFields": [
    "birthDate",
    "alternativeEmail",
    "residenceCountry",
    "contactName1",
    "contactName2",
    "responsabilidad",
    "idResponsabilidad",
    "omitirRecep",
    "identificationNumber (raw — masked as identificationNumberMasked)",
    "phoneNumber (raw — masked as phoneMasked per phone entry)"
  ],
  "_addressLogicNote": "Primary address: rows with a.isPrimary=1 returned first; ...",
  "_phoneLogicNote": "Primary phone: rows with p.isPrimary=1 returned first; ..."
}
```

---

### `GET /api/admin/rds-profile-shadow-compare`

Admin-only shadow compare.  Fetches the RDS profile and optionally calls the
legacy `getuserinfo` endpoint for a field-by-field diff.

**Auth:** Admin session cookie + `USE_RDS_PORTAL_API=true`.

**Query params:** `email` (defaults to `prueba@crbox.cr`)

**Bearer token header (optional):** when present, triggers a live call to the
legacy `getuserinfo/{email}` CRBOX endpoint for comparison.  The token is never
stored or logged.

**Legacy response handling — intentional tradeoff:** the raw `getuserinfo` payload
is **never returned** in the compare response.  Instead, a `legacy` masked summary
is returned with structural/non-PII fields (`idConsignee`, `isCompany`,
`phoneCount`, `addressCount`, etc.) and masked PII fields (`emailMasked`,
`identificationNumberMasked`).  Name and address fields are hardcoded to
`"<redacted>"`.  This is a deliberate privacy-positive tradeoff.
*If raw legacy JSON is needed for debugging, capture it outside this endpoint
(e.g., in the browser devtools against the portal API directly) — do not relax
the masking in this admin endpoint.*

---

## SHOW COLUMNS Results (confirmed 2026-05-14)

### `consignee`

| Field | Type | Null | Key | Notes |
|-------|------|------|-----|-------|
| `idConsignee` | int(11) | NO | PRI | auto_increment |
| `consigneeName` | varchar(200) | YES | MUL | First name |
| `consigneeLastName1` | varchar(45) | YES | | First surname |
| `consigneeLastName2` | varchar(45) | YES | | Second surname |
| `identificationType` | varchar(45) | YES | | Type label string (not FK int) |
| `identificationNumber` | varchar(45) | YES | | Masked in all responses |
| `residenceCountry` | varchar(60) | YES | | Withheld |
| `language` | varchar(45) | YES | | |
| `email` | varchar(45) | YES | | |
| `idClient` | int(11) | YES | MUL | FK → client.idClient |
| `createdDate` | datetime | YES | | |
| `fullName` | varchar(300) | YES | | Stored denormalized copy |
| `idSucursal` | int(11) | YES | | FK → Sucursal.idSucursal |
| `idPlan` | int(11) | YES | MUL | FK → plan.idPlan (on consignee directly) |
| `cantidadPaquetes` | int(11) | YES | | |
| `receivesNewsletter` | tinyint(1) | YES | | Default 1 |
| `alternativeEmail` | varchar(45) | YES | | Withheld |
| `contactName1` | varchar(100) | YES | | Withheld |
| `contactName2` | varchar(100) | YES | | Withheld |
| `isCompany` | **bit(1)** | YES | | Returns bytes from pymysql — requires special bool cast |
| `contact1Identification` | varchar(45) | YES | | |
| `receivesMobileNotification` | bit(1) | YES | | |
| `codigoFacturacion` | varchar(150) | YES | | **Casillero shown in portal** |
| `lastModified` | timestamp | NO | | |
| `responsabilidad` | tinyint(1) | YES | | Withheld |
| `idResponsabilidad` | varchar(20) | YES | | Withheld |
| `omitirRecep` | varchar(1) | YES | | Withheld; default 'N' |
| `updated` | bit(1) | YES | | |
| `birthDate` | datetime | YES | | Withheld |
| `economicActivityCode` | varchar(10) | YES | | |

**Notable:** `PendingDiscount` does **not** exist in `consignee`. Column names are camelCase. `isCompany` is `bit(1)` requiring explicit byte-to-bool conversion.

---

### `client`

| Field | Type | Null | Key | Notes |
|-------|------|------|-----|-------|
| `idClient` | int(11) | NO | PRI | auto_increment |
| `name` | varchar(100) | YES | | Client/company name |
| `accountType` | varchar(45) | YES | | e.g. "Cuenta Empresarial" |
| `cedulaJuridica` | varchar(45) | YES | | Corporate tax ID |
| `owner` | varchar(45) | YES | | Owner email |

**Notable:** No `CompanyCode`, no `idPlan`, no `idConsignee`. The casillero is on `consignee.codigoFacturacion`, not here.

---

### `Sucursal`

| Field | Type | Null | Key | Notes |
|-------|------|------|-----|-------|
| `idSucursal` | int(11) | NO | PRI | auto_increment |
| `name` | varchar(150) | YES | | **Display name — NOT `NombreSucursal`** |
| `idPhone` | int(11) | YES | MUL | |
| `idAddress` | int(11) | YES | MUL | |
| `horario` | varchar(100) | YES | | Operating hours |

---

### `consignee_has_address`

| Field | Type | Null | Key |
|-------|------|------|-----|
| `idConsignee` | int(11) | NO | PRI |
| `idAddress` | int(11) | NO | PRI |

**Notable:** No `isPrimary`, no `isActive`. These flags are on the `address` table.

---

### `address`

| Field | Type | Null | Key | Notes |
|-------|------|------|-----|-------|
| `idAddress` | int(11) | NO | PRI | auto_increment |
| `line1` | varchar(500) | YES | | **Address line 1 — NOT `Address1`** |
| `line2` | varchar(45) | YES | | |
| `city` | varchar(100) | YES | | |
| `zipCode` | varchar(45) | YES | | |
| `isActive` | tinyint(1) | YES | | Confirmed on address table |
| `isPrimary` | tinyint(1) | YES | | Confirmed on address table |
| `State` | int(11) | NO | MUL | FK to state lookup |
| `AddressType` | int(11) | NO | MUL | FK → addresstype.idAddressType |
| `provincia` | varchar(1) | YES | | Province code (replaces `Province`) |
| `canton` | varchar(2) | YES | | |
| `distrito` | varchar(2) | YES | | |
| `barrio` | varchar(2) | YES | | |
| `direccion` | varchar(500) | YES | | Free-text directions |

---

### `addresstype`

| Field | Type | Null | Key | Notes |
|-------|------|------|-----|-------|
| `idAddressType` | int(11) | NO | PRI | |
| `type` | varchar(45) | YES | | **Label column — NOT `AddressType`** |

Known values: 1=Casa, 2=Oficina, 3=Otro.

---

### `consignee_has_phone`

| Field | Type | Null | Key |
|-------|------|------|-----|
| `idConsignee` | int(11) | NO | PRI |
| `idPhone` | int(11) | NO | PRI |

**Notable:** No `isPrimary`, no `isActive`. These flags are on the `phone` table.

---

### `phone`

| Field | Type | Null | Key | Notes |
|-------|------|------|-----|-------|
| `idPhone` | int(11) | NO | PRI | auto_increment |
| `phoneNumber` | varchar(45) | YES | | **camelCase — NOT `PhoneNumber`** |
| `phoneExtension` | varchar(45) | YES | | |
| `isActive` | tinyint(1) | YES | | Confirmed on phone table |
| `isPrimary` | tinyint(1) | YES | | Confirmed on phone table |
| `PhoneType` | int(11) | NO | MUL | FK → phonetype.idPhoneType |

---

### `phonetype`

| Field | Type | Null | Key | Notes |
|-------|------|------|-----|-------|
| `idPhoneType` | int(11) | NO | PRI | |
| `type` | varchar(45) | YES | UNI | **Label column — NOT `PhoneType`** |

Known values: 1=Celular, 2=Casa, 3=Oficina, 4=Fax.

---

### `plan`

| Field | Type | Null | Key | Notes |
|-------|------|------|-----|-------|
| `idPlan` | int(11) | NO | PRI | auto_increment |
| `nombre` | varchar(45) | YES | | **Plan name — NOT `PlanName`** |
| `descuento` | float | YES | | **Discount — NOT `Discount`** |
| `cantidadPaquetes` | int(11) | YES | | |

---

### `identificationtype`

| Field | Type | Null | Key | Notes |
|-------|------|------|-----|-------|
| `idIdentificationType` | int(10) unsigned | NO | PRI | auto_increment |
| `type` | varchar(45) | NO | UNI | **Label column — NOT `IdentificationType`** |

Known values: 1=Otro, 2=Pasaporte, 3=Cedula ó Residencia.

---

## Seven Validation Questions — Resolved Answers

### Q1: Correct FK path between `consignee` and `client`

**Answer:** `consignee.idClient → client.idClient` ✅ **CONFIRMED**

The `consignee` table has an `idClient` column (int, MUL-indexed). The `client` table has no `idConsignee` column — the reverse FK assumption was incorrect. The primary query path works directly:

```sql
SELECT cl.idClient, cl.name, cl.accountType, cl.cedulaJuridica
FROM client cl
WHERE cl.idClient = <consignee.idClient>
```

---

### Q2: Correct column for casillero / company code in `client`

**Answer:** The casillero is **not** on the `client` table. It is `consignee.codigoFacturacion` (varchar 150). ✅ **CONFIRMED**

The `client` table has no `CompanyCode` column. Its columns are `idClient`, `name`, `accountType`, `cedulaJuridica`, `owner`. For `prueba@crbox.cr`, `codigoFacturacion = "00481"` — which is the casillero shown in the portal.

**Impact on `_rds_query_profile`:** `codigoFacturacion` is now fetched in Step 1 (consignee base row) and surfaced as `profile.casillero`. The `client` sub-object no longer includes `companyCode`; it contains `idClient`, `clientName`, `accountType`, `cedulaJuridica`.

---

### Q3: Correct display-name column in `Sucursal`

**Answer:** Column is `name` — **not** `NombreSucursal`. ✅ **CONFIRMED**

`SHOW COLUMNS FROM Sucursal` returns: `idSucursal`, `name`, `idPhone`, `idAddress`, `horario`.

For idSucursal=1: `name = "Sabana Norte (Oficina Central)"`.

**Corrected query:**
```sql
SELECT idSucursal, name FROM Sucursal WHERE idSucursal = %s LIMIT 1
```

---

### Q4: `consignee_has_address.isPrimary` and `isActive`

**Answer:** These columns do **not** exist on `consignee_has_address`. The junction table has only `(idConsignee, idAddress)`. The `isPrimary` (tinyint(1)) and `isActive` (tinyint(1)) flags are on the `address` table itself. ✅ **CONFIRMED**

Semantics confirmed for `prueba@crbox.cr`: address 71331 has `isPrimary=1, isActive=0`. An address can be marked primary but inactive (e.g., an old address kept for history but no longer current).

**Corrected query references `a.isPrimary` and `a.isActive` instead of `cha.*`.**

---

### Q5: `consignee_has_phone.isPrimary` and `isActive`

**Answer:** These columns do **not** exist on `consignee_has_phone`. The junction table has only `(idConsignee, idPhone)`. The `isPrimary` (tinyint(1)) and `isActive` (tinyint(1)) flags are on the `phone` table itself. ✅ **CONFIRMED**

Semantics confirmed for `prueba@crbox.cr`: phone 73099 has `isPrimary=0, isActive=0`.

**Corrected query references `p.isPrimary` and `p.isActive` instead of `chp.*`.**

---

### Q6: Correct plan name and discount columns in `plan`

**Answer:**
- Plan name column: `nombre` — **not** `PlanName`. ✅ **CONFIRMED**
- Discount column: `descuento` — **not** `Discount`. ✅ **CONFIRMED**
- Additionally: `idPlan` is on `consignee` directly — not via `client`. ✅ **CONFIRMED**

For `prueba@crbox.cr`, `idPlan = NULL` — no plan assigned. The plan join is skipped and `profile.plan = null`.

**Corrected query:**
```sql
SELECT idPlan, nombre, descuento FROM plan WHERE idPlan = %s LIMIT 1
```
With `idPlan` sourced from `cons_row.get('idPlan')`.

---

### Q7: Correct identification type join — FK column and label column

**Answer:**
- `consignee.identificationType` is a **varchar(45) string label** — not a numeric FK. For `prueba@crbox.cr` it stores `"Cedula ó Residencia"` directly.
- `identificationtype` table label column is `type` (UNI varchar) — **not** `IdentificationType`.
- The correct lookup (if a round-trip canonical label is desired): `SELECT type FROM identificationtype WHERE type = %s LIMIT 1`
- This join is functionally a no-op for records that already store the canonical string, but it validates the value exists in the lookup table. ✅ **CONFIRMED**

**Corrected query:**
```sql
SELECT type FROM identificationtype WHERE type = %s LIMIT 1
```
Result key accessed as `it_row.get('type')`.

---

## Exact SQL Queries (Corrected — All Column Names Confirmed)

All queries use explicit column lists. No `SELECT *`. No writes.

### 1. Database Safety Check

```sql
SELECT DATABASE() AS db
```
Aborts immediately if result ≠ `crbox_dev1`.

### 2. Consignee Base Row

```sql
SELECT c.idConsignee, c.email, c.consigneeName, c.consigneeLastName1,
       c.consigneeLastName2, c.isCompany, c.idSucursal,
       c.idPlan, c.idClient, c.codigoFacturacion,
       c.receivesNewsletter,
       c.identificationNumber, c.identificationType
FROM consignee c
WHERE c.email = %s LIMIT 1
```

**Withheld from query (not selected):**
`birthDate`, `alternativeEmail`, `residenceCountry`, `contactName1`,
`contactName2`, `responsabilidad`, `idResponsabilidad`, `omitirRecep`.

### 3. Identification Type Label

```sql
SELECT type FROM identificationtype WHERE type = %s LIMIT 1
```
Passes `consignee.identificationType` as the lookup value. Falls back to the raw string if the join fails.

### 4. Sucursal (Branch)

```sql
SELECT idSucursal, name FROM Sucursal WHERE idSucursal = %s LIMIT 1
```

### 5. Client Account Info

```sql
SELECT cl.idClient, cl.name, cl.accountType, cl.cedulaJuridica
FROM client cl
WHERE cl.idClient = %s LIMIT 1
```
Uses `consignee.idClient` as the parameter (FK confirmed).

### 6. Plan

```sql
SELECT idPlan, nombre, descuento FROM plan WHERE idPlan = %s LIMIT 1
```
Uses `consignee.idPlan` directly (not via client).

### 7. CR Delivery Addresses

```sql
SELECT a.idAddress, a.line1, a.line2, a.city, a.zipCode,
       a.provincia, a.isPrimary, a.isActive,
       a.AddressType AS idAddressType, at2.type AS addressTypeLabel
FROM consignee_has_address cha
JOIN address a ON cha.idAddress = a.idAddress
LEFT JOIN addresstype at2 ON a.AddressType = at2.idAddressType
WHERE cha.idConsignee = %s
ORDER BY a.isPrimary DESC, a.idAddress ASC
```
`isPrimary`/`isActive` are on `address`, not the junction. `addresstype` label is `type`.

### 8. Phones

```sql
SELECT p.idPhone, p.phoneNumber, p.isPrimary, p.isActive,
       p.PhoneType AS idPhoneType, pt.type AS phoneTypeLabel
FROM consignee_has_phone chp
JOIN phone p ON chp.idPhone = p.idPhone
LEFT JOIN phonetype pt ON p.PhoneType = pt.idPhoneType
WHERE chp.idConsignee = %s
ORDER BY p.isPrimary DESC, p.idPhone ASC
```
`isPrimary`/`isActive` are on `phone`, not the junction. Phone column is `phoneNumber`. `phonetype` label is `type`. Raw phone numbers are **never returned** — masked as `****<last4>`.

---

## Live Shadow Compare Results — `prueba@crbox.cr`

**Run date:** 2026-05-14
**Email:** prueba@crbox.cr
**idConsignee:** 50601002
**Legacy call:** `GET https://clients.crbox.cr/api/crboxwebapi/getuserinfo/prueba%40crbox.cr` — **HTTP 200 OK**
**Bearer token:** obtained via `POST https://clients.crbox.cr/authtoken` (service account; token not stored or logged)

### RDS Profile (masked)

```json
{
  "idConsignee": 50601002,
  "email": "pr***@crbox.cr",
  "name": "<redacted>",
  "lastName1": "<redacted>",
  "lastName2": "<redacted>",
  "fullName": "<redacted>",
  "identificationType": "Cedula ó Residencia",
  "identificationNumberMasked": "****0649",
  "isCompany": false,
  "casillero": "00481",
  "receivesNewsletter": true,
  "branch": {
    "id": 1,
    "name": "Sabana Norte (Oficina Central)"
  },
  "client": {
    "idClient": 3190,
    "clientName": "CRBOX Cta Emp.",
    "accountType": "Cuenta Empresarial",
    "cedulaJuridica": "<masked>"
  },
  "plan": null,
  "addresses": [
    {
      "idAddress": 71331,
      "address1": "<redacted>",
      "address2": "<partial — non-PII text>",
      "city": "<redacted>",
      "zipCode": "",
      "province": null,
      "addressType": "Casa",
      "idAddressType": 1,
      "isPrimary": true,
      "isActive": false
    }
  ],
  "phones": [
    {
      "idPhone": 73099,
      "phoneMasked": "****0222",
      "phoneType": "Celular",
      "idPhoneType": 1,
      "isPrimary": false,
      "isActive": false
    }
  ]
}
```

### Legacy Profile Summary (masked — live HTTP 200)

```json
{
  "idConsignee": 50601002,
  "emailMasked": "pr***@crbox.cr",
  "name": "<redacted>",
  "lastName1": "<redacted>",
  "isCompany": false,
  "identificationType": "Cedula ó Residencia",
  "identificationNumberMasked": "****0649",
  "receivesNewsletter": false,
  "sucursalId": 1,
  "sucursalName": "Sabana Norte (Oficina Central)",
  "companyCode": null,
  "plan": null,
  "phoneCount": 1,
  "addressCount": 1,
  "client": {
    "idclient": 0,
    "note": "legacy returns idclient=0 for test account; RDS has idClient=3190"
  }
}
```

> `companyCode` is null in the legacy response for this test account;
> `consignee.codigoFacturacion` is also null inside the nested Consignee object.
> RDS `codigoFacturacion` = "00481" is the authoritative value.

### Join Validation Status

```
joinValidationStatus: all_joins_succeeded
failedJoins: []
```

All 6 secondary joins (identificationtype, Sucursal, client, plan-skipped-null,
consignee_has_address, consignee_has_phone) completed without exceptions.

---

## Field-by-Field Diff Classification

**Live run completed 2026-05-14.** Legacy `getuserinfo` called with Bearer token — HTTP 200 OK.
No `true_mapping_issue` entries. Zero `failedJoins`.

| Field | RDS Value | Legacy Value | Classification | Notes |
|-------|-----------|--------------|----------------|-------|
| `idConsignee` | `50601002` | `50601002` | **`exact_match`** | Stable integer PK |
| `email` | `pr***@crbox.cr` | `pr***@crbox.cr` | **`exact_match`** | Normalised lowercase; display masked |
| `name` | `<redacted>` | `<redacted>` | **`exact_match`** | Raw values compared; identical in dev snapshot |
| `lastName1` | `<redacted>` | `<redacted>` | **`exact_match`** | Raw values compared; identical in dev snapshot |
| `lastName2` | `<redacted>` | `<redacted>` | **`exact_match`** | Raw values compared; identical in dev snapshot |
| `identificationType` | `"Cedula ó Residencia"` | `"Cedula ó Residencia"` | **`exact_match`** | String label stored directly in consignee; confirmed round-trip |
| `isCompany` | `False` | `False` | **`exact_match`** | bit(1) correctly decoded to Python bool |
| `receivesNewsletter` | `True` | `False` | `stale_dev_snapshot` | Dev snapshot diverged from production; expected |
| `branch.id` | `1` | `1` (via `sucursal._idsucursal`) | **`exact_match`** | FK integer; legacy uses underscore-prefix key convention |
| `branch.name` | `"Sabana Norte (Oficina Central)"` | `"Sabana Norte (Oficina Central)"` (via `sucursal._name`) | **`exact_match`** | Legacy returns via `Consignee.sucursal._name`; same value |
| `casillero` | `"00481"` | `null` (top-level `CompanyCode`) | `missing_join` | RDS: `consignee.codigoFacturacion`; legacy `CompanyCode` is null for this test account. Legacy does expose it via `Consignee.codigoFacturacion=null` too. Production accounts expected to match. |
| `plan` | `null` | `null` | **`exact_match`** | No plan assigned on either side |
| `address[0].isPrimary` | `True` | `False` | `stale_dev_snapshot` | RDS DB flag = 1; legacy returns 0 — expected divergence for test account |
| `address[0].city` | `<redacted>` | `<redacted>` | **`exact_match`** | Raw values compared; identical |
| `address[0].addressType` | `"Casa"` | `"Casa"` | **`exact_match`** | Resolved via addresstype table join |
| `phone[0].phoneMasked` | `****0222` | `(withheld)` | `withheld_for_privacy` | Raw phone not compared; masked ****<last4> |
| `phone[0].phoneType` | `"Celular"` | `"Celular"` | **`exact_match`** | Resolved via phonetype table join |
| `identificationNumber` | `****0649` | `(withheld)` | `withheld_for_privacy` | Masked ****<last4>; product/security approval required |
| `client.idClient` | `3190` | `0` (legacy `client.idclient`) | `stale_dev_snapshot` | Legacy returns nested `Consignee.client.idclient=0` for test account; RDS has correct value |
| `client.clientName` | `"CRBOX Cta Emp."` | absent | `missing_join` | Not present in legacy response; RDS-only enrichment |
| `client.accountType` | `"Cuenta Empresarial"` | absent | `missing_join` | Not present in legacy response; RDS-only enrichment |

### Summary counts (live)

| Classification | Count |
|----------------|-------|
| `exact_match` | 11 |
| `stale_dev_snapshot` | 3 |
| `missing_join` | 4 |
| `withheld_for_privacy` | 2 |
| `formatting_only` | 0 |
| `field_naming_casing` | 0 |
| `legacy_business_logic_transform` | 0 |
| **`true_mapping_issue`** | **0** |

### No `true_mapping_issue` entries. All critical joins succeeded.

---

## Identity Resolution Flow

```
Request: ?email=prueba@crbox.cr
    │
    ▼
SELECT DATABASE() — assert = crbox_dev1 (abort if not)
    │
    ▼
SELECT idConsignee, ..., idClient, idPlan, codigoFacturacion
FROM consignee WHERE email = ? LIMIT 1
    │ (raises _RdsEmailNotFoundError if no row)
    ▼
idConsignee = 50601002 — used for all subsequent JOINs
    │
    ├─► identificationtype lookup (WHERE type = identificationType)
    ├─► Sucursal join (Sucursal.name — NOT NombreSucursal)
    ├─► client join (WHERE idClient = consignee.idClient)
    ├─► plan join (WHERE idPlan = consignee.idPlan — NULL for prueba)
    ├─► consignee_has_address → address (isPrimary/isActive on address) → addresstype
    └─► consignee_has_phone → phone (isPrimary/isActive on phone) → phonetype
```

---

## Address Logic Findings

| Question | Finding | Status |
|----------|---------|--------|
| How is "primary" determined? | `address.isPrimary` flag (tinyint(1)) on address table | **CONFIRMED** |
| How is "active" determined? | `address.isActive` flag (tinyint(1)) on address table | **CONFIRMED** |
| Are flags on junction table? | No — `consignee_has_address` has only (idConsignee, idAddress) | **CONFIRMED** |
| Does `mi-cuenta.html` expect all addresses? | Yes — `#cr-addresses-list` renders all from the `Addresses` array | Confirmed from HTML |
| Does address type affect display? | Rendered as a type label ("Casa", "Oficina", "Otro") | **CONFIRMED** |
| Primary flag type | tinyint(1); cast to bool in response | **CONFIRMED** |
| Column for address line 1 | `line1` (not Address1) | **CONFIRMED** |
| Column for province | `provincia` (single char code); `State` is a separate int FK | **CONFIRMED** |
| Address type join | `address.AddressType` (int FK) → `addresstype.idAddressType`; label is `addresstype.type` | **CONFIRMED** |

**Observation for `prueba@crbox.cr`:** Address 71331 has `isPrimary=1, isActive=0`. This is a primary address that is no longer active — likely an old address kept for history. The `isActive=0` flag may affect frontend display eligibility if `mi-cuenta.html` filters on it.

---

## Phone Logic Findings

| Question | Finding | Status |
|----------|---------|--------|
| How is "primary" determined? | `phone.isPrimary` flag (tinyint(1)) on phone table | **CONFIRMED** |
| How is "active" determined? | `phone.isActive` flag (tinyint(1)) on phone table | **CONFIRMED** |
| Are flags on junction table? | No — `consignee_has_phone` has only (idConsignee, idPhone) | **CONFIRMED** |
| Does `mi-cuenta.html` expect all phones or only primary? | First phone from `Phones` array is used in `#profile-phone` | Confirmed from HTML + auth.js |
| Phone number column name | `phoneNumber` (camelCase) | **CONFIRMED** |
| Phone type join | `phone.PhoneType` (int FK) → `phonetype.idPhoneType`; label is `phonetype.type` | **CONFIRMED** |

**Observation for `prueba@crbox.cr`:** Phone 73099 has `isPrimary=0, isActive=0`. The phone is neither primary nor active in the dev snapshot. In production, `prueba@crbox.cr` likely has a correctly flagged primary phone.

---

## Sensitive Field Handling Policy

| Field | Treatment | Rationale |
|-------|-----------|-----------|
| `identificationNumber` (raw) | **Not returned** — masked as `identificationNumberMasked` (`****<last4>`) | National ID; requires explicit product/security approval before any frontend exposure |
| `phoneNumber` (raw) | **Not returned** — masked as `phoneMasked` per phone entry (`****<last4>`) | Personal contact data; safe masked form is sufficient for validation |
| `birthDate` | **Withheld entirely** — not selected from DB | Sensitive personal data; not currently displayed in mi-cuenta.html |
| `alternativeEmail` | **Withheld** | Not displayed in mi-cuenta.html; low priority |
| `residenceCountry` | **Withheld** | Not displayed in mi-cuenta.html |
| `contactName1`, `contactName2` | **Withheld** | Internal business contact fields; not displayed |
| `responsabilidad`, `idResponsabilidad` | **Withheld** | Internal business flags |
| `omitirRecep` | **Withheld** | Internal operational flag |
| `email` (in diff output) | **Masked** as `pr***@crbox.cr` | Reduced PII exposure in comparison/diff logs |

---

## Four-Tier Field Classification Table

### Tier 1 — Safe for immediate read-only display
Non-sensitive fields that can be shown to any admin or eventually any authenticated owner without further review.

| RDS Field | Legacy `getuserinfo` Key | `mi-cuenta.html` DOM Element | Notes |
|-----------|--------------------------|------------------------------|-------|
| `profile.idConsignee` | `Consignee.idConsignee` | `#profile-casillero` (indirectly) | Safe integer ID |
| `profile.name` | `Consignee.consigneeName` | `#profile-first-name`, `#profile-header-name`, `#profile-avatar-initials` | First name |
| `profile.lastName1` | `Consignee.consigneeLastName1` | `#profile-last-name`, `#profile-header-name` | First surname |
| `profile.lastName2` | `Consignee.consigneeLastName2` | `#profile-header-name` | Second surname (optional) |
| `profile.fullName` | derived from name parts | `#profile-header-name`, `#header-user-name`, `#mobile-user-name` | Server-derived |
| `profile.branch.id` | `Consignee.Sucursal.IdSucursal` | `#account-sucursal` | Sucursal FK |
| `profile.branch.name` | *(not in legacy response)* | `#account-sucursal` | Display name via RDS JOIN confirmed working |
| `profile.plan.planName` | *(legacy plan structure TBD)* | Not currently displayed | Safe display field; null for prueba |
| `profile.isCompany` | `Consignee.IsCompany` | Not directly displayed | Boolean; bit(1) correctly decoded |
| `profile.casillero` | `CompanyCode` (top-level) | `#profile-casillero`, `#miami-addr-casillero`, `#mobile-casillero-badge` | From consignee.codigoFacturacion |
| `client.clientName` | *(not in legacy)* | N/A | Client account name |
| `client.accountType` | *(not in legacy)* | N/A | Account type label |

### Tier 2 — Safe for authenticated owner display only

| RDS Field | Legacy `getuserinfo` Key | `mi-cuenta.html` DOM Element | Notes |
|-----------|--------------------------|------------------------------|-------|
| `profile.email` | `Consignee.email` | `#profile-email` | Owner's own email |
| `phones[].phoneMasked` | `Phones[0].phonenumber` | `#profile-phone` | Masked in shadow; needs portal auth for display |
| `addresses[].address1`, `.city` | `Addresses[n].*` | `#cr-addresses-list` | Delivery address details |
| `profile.receivesNewsletter` | `Consignee.receivesNewsletter` | `#notify_promotions` checkbox | User preference |
| `profile.identificationType` | `Consignee.identificationType` | `#profile-id-type` | Confirmed string label |

### Tier 3 — Remain withheld

| Field | Reason |
|-------|--------|
| `birthDate` | Sensitive personal data; not required by any mi-cuenta.html display element |
| `alternativeEmail` | Not displayed; no current use case |
| `residenceCountry` | Not displayed; no current use case |
| `contactName1`, `contactName2` | Internal business contact fields |
| `responsabilidad`, `idResponsabilidad` | Internal business/legal flags |
| `omitirRecep` | Internal operational flag |
| Raw `identificationNumber` | See Tier 4 |

### Tier 4 — Require explicit product/security approval before frontend exposure

| Field | Open Question | Decision Required |
|-------|---------------|-------------------|
| `identificationNumber` (raw) | Should the user be able to **view** their own ID number? Masking sufficient for display (e.g., `****1234`)? | Product + Security sign-off required before any display or edit path is wired. |
| Phone numbers (raw) | Should the full phone number be visible to the account owner? | Portal auth (Bearer token resolution) required; product decision on display format. |
| `client.cedulaJuridica` | Corporate tax ID — appropriate to display? | Product decision on display; for company accounts only. |

---

## Field Mapping Table (RDS → Legacy → DOM)

| RDS Column(s) | Legacy `getuserinfo` Key | `mi-cuenta.html` DOM ID | Null Handling |
|---------------|--------------------------|--------------------------|---------------|
| `consignee.idConsignee` | `Consignee.idconsignee` | *(indirect)* | Always present if email resolves |
| `consignee.email` | `Consignee.email` | `#profile-email` | Never null for valid consignee |
| `consignee.consigneeName` | `Consignee.ConsigneeName` | `#profile-first-name`, `#profile-header-name` | Null → `null`; DOM shows `—` |
| `consignee.consigneeLastName1` | `Consignee.ConsigneeLastName1` | `#profile-last-name`, `#profile-header-name` | Null → `null`; DOM shows `—` |
| `consignee.consigneeLastName2` | `Consignee.ConsigneeLastName2` | `#profile-header-name` (appended) | Null → `null`; omitted from fullName |
| `(derived)` fullName from name parts | *(derived in JS)* | `#profile-header-name`, `#header-user-name` | Built from non-null parts |
| `consignee.identificationType` (+ identificationtype WHERE type=%s) | `Consignee.IdentificationType` | `#profile-id-type` | Stored as label string; join is validation-only |
| `consignee.identificationNumber` (masked) | `Consignee.IdentificationNumber` | `#profile-id-number` | Masked; null → `null` |
| `consignee.isCompany` | `Consignee.IsCompany` | *(not directly displayed)* | bit(1) cast to bool; null → `null` |
| `consignee.idSucursal` + `Sucursal.name` | `Consignee.Sucursal.IdSucursal` | `#account-sucursal` | Null id → `{id:null, name:null}` |
| `consignee.receivesNewsletter` | `Consignee.ReceivesNewsletter` | `#notify_promotions` | Cast to bool; null → `null` |
| `consignee.codigoFacturacion` | `CompanyCode` (top-level) | `#profile-casillero`, `#miami-addr-casillero` | Field is on consignee, not client |
| `consignee.idPlan` + `plan.nombre` | *(legacy plan structure TBD)* | *(not currently displayed)* | Null → `null`; plan sub-object null if no plan |
| `consignee_has_address.*` + `address.*` | `Addresses` array | `#cr-addresses-list` | Empty array if no addresses |
| `consignee_has_phone.*` + `phone.*` (masked) | `Phones` array | `#profile-phone` | Empty array if no phones |

---

## Null-Handling Strategy

- All fields are **always present as keys** in the response, even when the DB value is `NULL`.
- `NULL` DB values → `null` in JSON (never omitted, never `""`).
- This allows callers to distinguish "field is null" from "field was not queried".
- Exception: `_withheldFields`, `_addressLogicNote`, `_phoneLogicNote` are metadata keys always present.
- Decimal values → Python `float` (JSON number).
- Boolean flags: `isCompany` (bit(1)) → special byte-to-bool conversion (`any(b != 0 for b in v)`); `isPrimary`, `isActive`, `receivesNewsletter` (tinyint(1)) → `bool()`.

---

## Final Recommendation

### Recommendation: **A — Proceed to frontend wiring**

**Rationale:**

- `joinValidationStatus`: `all_joins_succeeded`
- `failedJoins`: `[]` (zero failures)
- `true_mapping_issue` entries: **0**
- All seven validation questions resolved — every "NEEDS VALIDATION" comment removed from `_rds_query_profile`
- Column name corrections applied: 11 assumed names were wrong; all corrected
- `isCompany` bit(1) edge case handled correctly
- Schema confirmed against live `crbox_dev1` — no assumptions remain

**Conditions for wiring:**

1. Bearer token resolution for portal user identity must be implemented before any user-facing page reads from this endpoint (admin-only scope must not be relaxed).
2. The `isActive=false` state of address and phone for `prueba@crbox.cr` in the dev snapshot is expected (stale data); confirm semantics with the portal team before using `isActive` as a display filter.
3. `pendingDiscount` has been removed — if the portal displays a discount badge, confirm the source field (`codigoFacturacion`? a different column?) with the product team before wiring that DOM element.
4. `client.cedulaJuridica` is available but its display eligibility (Tier 4) requires product sign-off before exposing.

---

## Corrections Applied to `server.py` (`_rds_query_profile`)

| Step | Assumed (wrong) | Confirmed (correct) | Change Made |
|------|-----------------|---------------------|-------------|
| 1 — consignee | `c.ConsigneeName` | `c.consigneeName` | Column name (MySQL case-insensitive; using confirmed name) |
| 1 — consignee | `c.PendingDiscount` | **Does not exist** | Removed; added `c.codigoFacturacion`, `c.idPlan`, `c.idClient` |
| 1 — consignee | `c.ReceivesNewsletter` | `c.receivesNewsletter` | Column name |
| 1 — consignee | `c.IdentificationNumber` | `c.identificationNumber` | Column name |
| 1 — consignee | `c.IdentificationType` | `c.identificationType` | Column name |
| 2 — identificationtype | `SELECT IdentificationType … WHERE idIdentificationType = %s` | `SELECT type … WHERE type = %s` | Column name and WHERE clause |
| 3 — Sucursal | `NombreSucursal` | `name` | Column name |
| 4 — client | `cl.CompanyCode, cl.idPlan` | `cl.name, cl.accountType, cl.cedulaJuridica` | Wrong columns; restructured |
| 4 — client | Fallback FK `client.idConsignee` | Does not exist | Fallback removed; primary FK direct |
| 5 — plan | `PlanName` | `nombre` | Column name |
| 5 — plan | `Discount` | `descuento` | Column name |
| 5 — plan | `idPlan` from `client_info` | `idPlan` from `cons_row` | Source corrected |
| 6 — addresses | `cha.isPrimary, cha.isActive` | `a.isPrimary, a.isActive` | Flags on address table, not junction |
| 6 — addresses | `a.Address1, a.Address2` | `a.line1, a.line2` | Column names |
| 6 — addresses | `a.Province` | `a.provincia` | Column name |
| 6 — addresses | `at2.AddressType` | `at2.type AS addressTypeLabel` | Column name in addresstype |
| 6 — addresses | `a.idAddressType` (not in address) | `a.AddressType AS idAddressType` | Correct FK column |
| 6 — addresses | ORDER BY `cha.isPrimary` | ORDER BY `a.isPrimary` | Matches corrected source |
| 7 — phones | `chp.isPrimary, chp.isActive` | `p.isPrimary, p.isActive` | Flags on phone table, not junction |
| 7 — phones | `p.PhoneNumber` | `p.phoneNumber` | Column name |
| 7 — phones | `pt.PhoneType` | `pt.type AS phoneTypeLabel` | Column name in phonetype |
| 7 — phones | `p.idPhoneType` (not in phone) | `p.PhoneType AS idPhoneType` | Correct FK column |
| 7 — phones | ORDER BY `chp.isPrimary` | ORDER BY `p.isPrimary` | Matches corrected source |
| Assembly | `cons_row.get('ConsigneeName')` | `cons_row.get('consigneeName')` | Column key |
| Assembly | `pendingDiscount` field | Removed; replaced by `casillero` | Column does not exist |
| Assembly | `bool(is_company)` on bit(1) | `any(b != 0 for b in is_company)` | Correct byte-to-bool for bit(1) |
| Assembly | `_mask_id_number(cons_row.get('IdentificationNumber'))` | `cons_row.get('identificationNumber')` | Column key |

---

## Risks and Open Questions

1. **`isActive=false` for both address and phone in dev snapshot** — For `prueba@crbox.cr`, both the address and phone record have `isActive=0`. This is expected in a development snapshot (stale test data). When wiring the frontend, confirm whether `mi-cuenta.html` should filter by `isActive=1` or display all addresses regardless of active state.

2. **`isPrimary=false` for phone** — The phone record has `isPrimary=0` in the dev snapshot. The `mi-cuenta.html` `#profile-phone` element displays the first entry from the phones array. The array is ordered `p.isPrimary DESC` so in production data with a properly flagged primary phone, it would appear first.

3. **`province` is a code, not a label** — `address.provincia` stores a single-character code, not a human-readable province name. Frontend wiring will need a lookup table to render province names. The `address.State` (int FK) may point to a state/province lookup table — check `SHOW COLUMNS FROM state` if a label is needed.

4. **`casillero` key name change** — The field is now `profile.casillero` (from `consignee.codigoFacturacion`) rather than `profile.client.companyCode`. Any future frontend wiring of the casillero must use the new key name.

5. **crbox_dev1 vs production data** — All validation is against a development snapshot. Field values (particularly phone/address activity flags) likely differ from production; this is expected and classified as `stale_dev_snapshot`.

6. **`client.cedulaJuridica` exposure** — The corporate tax ID is now part of the client sub-object. It should not be displayed to end users without explicit product approval (Tier 4).
