# RDS Profile — Shadow Validation

**Date:** 2026-05-14
**Status:** Shadow-mode only — no frontend wiring yet
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
    "identificationType": "Cédula Nacional",
    "identificationNumberMasked": "****NNNN",
    "isCompany": false,
    "pendingDiscount": null,
    "receivesNewsletter": true,
    "branch": { "id": 1, "name": "<branch display name>" },
    "client": {
      "idClient": "<integer>",
      "companyCode": "CRBOX-NNNN",
      "idPlan": "<integer>"
    },
    "plan": {
      "idPlan": "<integer>",
      "planName": "<plan name>",
      "discount": 0.0
    },
    "addresses": [
      {
        "idAddress": "<integer>",
        "address1": "<redacted>",
        "address2": null,
        "city": "<redacted>",
        "province": "<redacted>",
        "addressType": "<type label>",
        "idAddressType": "<integer>",
        "isPrimary": true,
        "isActive": true
      }
    ],
    "phones": [
      {
        "idPhone": "<integer>",
        "phoneMasked": "****NNNN",
        "phoneType": "<type label>",
        "idPhoneType": "<integer>",
        "isPrimary": true,
        "isActive": true
      }
    ]
  },
  "_withheldFields": [
    "BirthDate",
    "AlternativeEmail",
    "ResidenceCountry",
    "ContactName1",
    "ContactName2",
    "Responsabilidad",
    "IdResponsabilidad",
    "OmitirReceptor",
    "IdentificationNumber (raw — masked as identificationNumberMasked)",
    "PhoneNumber (raw — masked as phoneMasked per phone entry)"
  ],
  "_addressLogicNote": "Primary address: rows with cha.isPrimary=1 returned first; ...",
  "_phoneLogicNote": "Primary phone: rows with chp.isPrimary=1 returned first; ..."
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

**Email comparison note:** both sides of the email diff are masked via
`_mask_email_addr` before entry into the diff.  Minor local-part differences
(e.g., `user+tag@` vs `user@`) would both appear as `us***@domain.tld` and
be classified `exact_match` when they are not.  Acceptable for the current
single-user (`prueba@crbox.cr`) shadow validation; if compare scope expands
to multiple users this should be revisited.

**Response shape (abbreviated):**

> **PII handling note:** The `rds` profile object is returned with full field values
> (name, address, email) because this endpoint is admin-only and scoped to a single
> controlled test user.  PII redaction (`<redacted>`) applies only to the `diff`
> entries, where values are stored for logging and review — never in the raw profile
> object itself.  If raw profile access needs to be restricted in future, add a
> separate query-param flag; do not modify the diff redaction logic.

```json
{
  "email": "prueba@crbox.cr",
  "idConsignee": "<integer>",
  "rds": { "...full profile fields — admin-only; see profile schema above..." },
  "legacy": {
    "idConsignee": "<integer>",
    "emailMasked": "pr***@crbox.cr",
    "name": "<redacted>",
    "lastName1": "<redacted>",
    "isCompany": false,
    "identificationNumberMasked": "****NNNN",
    "phoneCount": 1,
    "addressCount": 1,
    "_note": "Masked summary only — raw getuserinfo payload not returned."
  },
  "legacyError": null,
  "joinValidationStatus": "all_joins_succeeded",
  "failedJoins": [],
  "diff": {
    "status": "compared",
    "matched": [...],
    "formattingOnly": [...],
    "mismatched": [...],
    "missingInRds": [...],
    "missingInLegacy": [...],
    "withheld": [...]
  },
  "_withheldFields": [...],
  "_addressLogicNote": "...",
  "_phoneLogicNote": "..."
}
```

---

## Identity Resolution Flow

```
Request: ?email=prueba@crbox.cr
    │
    ▼
SELECT DATABASE() — assert = crbox_dev1 (abort if not)
    │
    ▼
SELECT idConsignee FROM consignee WHERE email = ? LIMIT 1
    │ (raises _RdsEmailNotFoundError if no row)
    ▼
idConsignee = integer — used for all subsequent JOINs
    │
    ├─► consignee base row (name, identificationType, isCompany, etc.)
    ├─► identificationtype lookup (label from type code)
    ├─► Sucursal join (branch display name)
    ├─► client join (companyCode / casillero, idPlan)
    ├─► plan join (planName, discount)
    ├─► consignee_has_address → address → addresstype (CR delivery addresses)
    └─► consignee_has_phone → phone → phonetype (phone numbers, masked)
```

---

## Exact SQL Queries

All queries use explicit column lists. No `SELECT *`. No writes.

### 1. Database Safety Check

```sql
SELECT DATABASE() AS db
```
Aborts immediately if result ≠ `crbox_dev1`.

### 2. Consignee Base Row

```sql
SELECT c.idConsignee, c.email, c.ConsigneeName, c.ConsigneeLastName1,
       c.ConsigneeLastName2, c.isCompany, c.idSucursal,
       c.PendingDiscount, c.ReceivesNewsletter,
       c.IdentificationNumber, c.IdentificationType
FROM consignee c
WHERE c.email = %s LIMIT 1
```

**Withheld from query (not selected):**
`BirthDate`, `AlternativeEmail`, `ResidenceCountry`, `ContactName1`,
`ContactName2`, `Responsabilidad`, `IdResponsabilidad`, `OmitirReceptor`.

### 3. Identification Type Label

```sql
SELECT IdentificationType
FROM identificationtype
WHERE idIdentificationType = %s LIMIT 1
```
⚠️ **NEEDS VALIDATION:** Column name `IdentificationType` in both `consignee`
and `identificationtype` table assumed from naming conventions.  If the FK is a
different column name, the label falls back to the raw code from `consignee`.

### 4. Sucursal (Branch)

```sql
SELECT idSucursal, NombreSucursal
FROM Sucursal
WHERE idSucursal = %s LIMIT 1
```
⚠️ **NEEDS VALIDATION:** `NombreSucursal` is the assumed display-name column.
Run `SHOW COLUMNS FROM Sucursal` to confirm.

### 5. Client Account Info

```sql
SELECT cl.idClient, cl.CompanyCode, cl.idPlan
FROM client cl
JOIN consignee c ON cl.idClient = c.idClient
WHERE c.idConsignee = %s LIMIT 1
```
⚠️ **NEEDS VALIDATION:** FK assumed to be `consignee.idClient → client.idClient`.
Fallback query attempted if this fails:
```sql
SELECT idClient, CompanyCode, idPlan
FROM client WHERE idConsignee = %s LIMIT 1
```
The `CompanyCode` column maps to the user's casillero number shown throughout
the portal.

### 6. Plan

```sql
SELECT idPlan, PlanName, Discount
FROM plan
WHERE idPlan = %s LIMIT 1
```
⚠️ **NEEDS VALIDATION:** `PlanName` and `Discount` column names assumed.
Run `SHOW COLUMNS FROM plan` to confirm.

### 7. CR Delivery Addresses

```sql
SELECT cha.isPrimary, cha.isActive,
       a.idAddress, a.Address1, a.Address2, a.City, a.Province,
       at2.idAddressType, at2.AddressType
FROM consignee_has_address cha
JOIN address a ON cha.idAddress = a.idAddress
LEFT JOIN addresstype at2 ON a.idAddressType = at2.idAddressType
WHERE cha.idConsignee = %s
ORDER BY cha.isPrimary DESC, a.idAddress ASC
```
⚠️ **NEEDS VALIDATION — address logic:**
- `isPrimary`: assumed `tinyint(1)` boolean.
- `isActive`: assumed to exist; controls whether address is still current.
- `AddressType`: label column name unconfirmed.
- Sort: primary addresses first (DESC); then by insertion order.

### 8. Phones

```sql
SELECT chp.isPrimary, chp.isActive,
       p.idPhone, p.PhoneNumber,
       pt.idPhoneType, pt.PhoneType
FROM consignee_has_phone chp
JOIN phone p ON chp.idPhone = p.idPhone
LEFT JOIN phonetype pt ON p.idPhoneType = pt.idPhoneType
WHERE chp.idConsignee = %s
ORDER BY chp.isPrimary DESC, p.idPhone ASC
```
⚠️ **NEEDS VALIDATION — phone logic:**
- `isPrimary`: assumed `tinyint(1)` boolean.
- `isActive`: assumed to exist; semantics unconfirmed.
- `PhoneNumber`: assumed column name (may be `phoneNumber` or `phone`).
- Raw phone numbers are **never returned** — masked as `****<last4>`.

---

## Address Logic Findings

| Question | Finding | Status |
|----------|---------|--------|
| How is "primary" determined? | `consignee_has_address.isPrimary` flag | NEEDS VALIDATION |
| How is "active" determined? | `consignee_has_address.isActive` flag | NEEDS VALIDATION |
| Does `mi-cuenta.html` expect all addresses? | Yes — `#cr-addresses-list` renders all from the `Addresses` array | Confirmed from HTML |
| Does address type affect display? | Rendered as a type label in each card | Confirmed from HTML |
| Primary flag type | Assumed `tinyint(1)`; cast to bool in response | NEEDS VALIDATION |

---

## Phone Logic Findings

| Question | Finding | Status |
|----------|---------|--------|
| How is "primary" determined? | `consignee_has_phone.isPrimary` flag | NEEDS VALIDATION |
| How is "active" determined? | `consignee_has_phone.isActive` flag | NEEDS VALIDATION |
| Does `mi-cuenta.html` expect all phones or only primary? | First phone from `Phones` array is used in `#profile-phone` | Confirmed from HTML + auth.js |
| What phone types exist? | Resolved via `phonetype` LEFT JOIN | NEEDS VALIDATION |

---

## Sucursal Join Confirmation

`consignee.idSucursal` → `Sucursal.idSucursal` is a straightforward FK join.
The display name column (`NombreSucursal`) is **unconfirmed** — requires
`SHOW COLUMNS FROM Sucursal` to validate the exact name.

---

## Sensitive Field Handling Policy

| Field | Treatment | Rationale |
|-------|-----------|-----------|
| `identificationNumber` (raw) | **Not returned** — masked as `identificationNumberMasked` (`****<last4>`) | National ID; Requires explicit product/security approval before any frontend exposure |
| `PhoneNumber` (raw) | **Not returned** — masked as `phoneMasked` per phone entry (`****<last4>`) | Personal contact data; safe masked form is sufficient for validation |
| `BirthDate` | **Withheld entirely** — not selected from DB | Sensitive personal data; not currently displayed in mi-cuenta.html |
| `AlternativeEmail` | **Withheld** | Not displayed in mi-cuenta.html; low priority |
| `ResidenceCountry` | **Withheld** | Not displayed in mi-cuenta.html |
| `ContactName1`, `ContactName2` | **Withheld** | Internal business contact fields; not displayed |
| `Responsabilidad`, `IdResponsabilidad` | **Withheld** | Internal business flags |
| `OmitirReceptor` | **Withheld** | Internal operational flag |
| `email` (in diff output) | **Masked** as `fi***@domain` | Reduced PII exposure in comparison/diff logs |

---

## Four-Tier Field Classification Table

### Tier 1 — Safe for immediate read-only display
Non-sensitive fields that can be shown to any admin or eventually any authenticated owner without further review.

| RDS Field | Legacy `getuserinfo` Key | `mi-cuenta.html` DOM Element | Notes |
|-----------|--------------------------|------------------------------|-------|
| `profile.idConsignee` | `Consignee.idConsignee` | `#profile-casillero` (indirectly, via CompanyCode) | Safe integer ID |
| `profile.name` | `Consignee.ConsigneeName` | `#profile-first-name`, `#profile-header-name`, `#profile-avatar-initials` | First name |
| `profile.lastName1` | `Consignee.ConsigneeLastName1` | `#profile-last-name`, `#profile-header-name` | First surname |
| `profile.lastName2` | `Consignee.ConsigneeLastName2` | `#profile-header-name` | Second surname (optional) |
| `profile.fullName` | derived from name parts | `#profile-header-name`, `#header-user-name`, `#mobile-user-name` | Server-derived |
| `profile.branch.id` | `Consignee.Sucursal.IdSucursal` | `#account-sucursal` | Sucursal FK |
| `profile.branch.name` | *(not in legacy response)* | `#account-sucursal` | Display name via RDS JOIN |
| `profile.plan.planName` | *(legacy plan structure TBD)* | Not currently displayed | Safe display field |
| `profile.isCompany` | `Consignee.IsCompany` | Not directly displayed | Boolean flag |
| `profile.pendingDiscount` | `Consignee.PendingDiscount` | `#account-discount-badge` | Discount amount |
| `client.companyCode` | `CompanyCode` (top-level) | `#profile-casillero`, `#miami-addr-casillero`, `#mobile-casillero-badge` | Casillero number |

### Tier 2 — Safe for authenticated owner display only
These fields are legitimate for the user to view but must only be exposed to the verified account owner (requires portal Bearer token resolution before any frontend wiring).

| RDS Field | Legacy `getuserinfo` Key | `mi-cuenta.html` DOM Element | Notes |
|-----------|--------------------------|------------------------------|-------|
| `profile.email` | `Consignee.Email` | `#profile-email` | Owner's own email |
| `phones[].phoneMasked` | `Phones[0].phonenumber` | `#profile-phone` | Phone number (masked in shadow; needs portal auth for display) |
| `addresses[].address1`, `.city`, `.province` | `Addresses[n].*` | `#cr-addresses-list` | Delivery address details |
| `profile.receivesNewsletter` | `Consignee.ReceivesNewsletter` | `#notify_promotions` checkbox | User preference |
| `profile.identificationType` | `Consignee.IdentificationType` | `#profile-id-type` | ID type label |

### Tier 3 — Remain withheld
Fields that should not appear in any frontend display path at this time.

| Field | Reason |
|-------|--------|
| `BirthDate` | Sensitive personal data; not required by any mi-cuenta.html display element |
| `AlternativeEmail` | Not displayed; no current use case |
| `ResidenceCountry` | Not displayed; no current use case |
| `ContactName1`, `ContactName2` | Internal business contact fields |
| `Responsabilidad`, `IdResponsabilidad` | Internal business/legal flags |
| `OmitirReceptor` | Internal operational flag |
| Raw `IdentificationNumber` | See Tier 4 |

### Tier 4 — Require explicit product/security approval before frontend exposure
Fields where the decision is non-trivial and requires a product/security decision.

| Field | Open Question | Decision Required |
|-------|---------------|-------------------|
| `identificationNumber` (raw) | Should the user be able to **view** their own ID number? Should they be able to **edit** it, or is editing restricted to CRBOX staff? Is masking sufficient for display (e.g., `****1234`) or do we need to show the full number? | Product + Security sign-off required before any display or edit path is wired. |
| Phone numbers (raw) | Should the full phone number be visible to the account owner? Currently only masked `****<last4>` is returned by this endpoint. | Portal auth (Bearer token resolution) required; product decision on display format. |

---

## Field Mapping Table (RDS → Legacy → DOM)

| RDS Column(s) | Legacy `getuserinfo` Key | `mi-cuenta.html` DOM ID | Null Handling |
|---------------|--------------------------|--------------------------|---------------|
| `consignee.idConsignee` | `Consignee.idconsignee` / `IdConsignee` | *(indirect)* | Always present if email resolves |
| `consignee.email` | `Consignee.email` | `#profile-email` | Never null for valid consignee |
| `consignee.ConsigneeName` | `Consignee.ConsigneeName` | `#profile-first-name`, `#profile-header-name` | Null → `null` in response; DOM shows `—` |
| `consignee.ConsigneeLastName1` | `Consignee.ConsigneeLastName1` | `#profile-last-name`, `#profile-header-name` | Null → `null`; DOM shows `—` |
| `consignee.ConsigneeLastName2` | `Consignee.ConsigneeLastName2` | `#profile-header-name` (appended) | Null → `null`; omitted from fullName |
| `(derived)` fullName from name parts | *(derived in JS)* | `#profile-header-name`, `#header-user-name` | Built from non-null parts |
| `consignee.IdentificationType` (+ identificationtype JOIN) | `Consignee.IdentificationType` | `#profile-id-type` | Null → `null`; DOM shows `—` |
| `consignee.IdentificationNumber` (masked) | `Consignee.IdentificationNumber` | `#profile-id-number` | Masked; null → `null` |
| `consignee.isCompany` | `Consignee.IsCompany` | *(not directly displayed)* | Cast to bool; null → `null` |
| `consignee.idSucursal` + `Sucursal.NombreSucursal` | `Consignee.Sucursal.IdSucursal` | `#account-sucursal` | Null id → `{id:null, name:null}` |
| `consignee.ReceivesNewsletter` | `Consignee.ReceivesNewsletter` | `#notify_promotions` | Cast to bool; null → `null` |
| `consignee.PendingDiscount` | `Consignee.PendingDiscount` | `#account-discount-badge` | Cast to float; null → `null` |
| `client.CompanyCode` | `CompanyCode` (top-level) | `#profile-casillero`, `#miami-addr-casillero` | Null → `null`; join may fail (see NEEDS VALIDATION) |
| `client.idPlan` + `plan.PlanName` | *(legacy plan structure TBD)* | *(not currently displayed)* | Null → `null`; plan sub-object omitted if query fails |
| `consignee_has_address.*` + `address.*` | `Addresses` array | `#cr-addresses-list` | Empty array if no addresses |
| `consignee_has_phone.*` + `phone.*` (masked) | `Phones` array | `#profile-phone` | Empty array if no phones |

---

## Null-Handling Strategy

- All fields are **always present as keys** in the response, even when the DB value is `NULL`.
- `NULL` DB values → `null` in JSON (never omitted, never `""`).
- This allows callers to distinguish "field is null" from "field was not queried".
- Exception: `_withheldFields`, `_addressLogicNote`, `_phoneLogicNote` are metadata keys always present.
- Decimal values → Python `float` (JSON number).
- Boolean flags (`isCompany`, `isPrimary`, `isActive`, `receivesNewsletter`) → Python `bool` (JSON `true`/`false`), cast from `tinyint(1)`.

---

## Comparison Results Summary

> **Status:** Pre-run static analysis — endpoint has not yet been executed against a live Bearer token.
> Actual results must be recorded in a follow-up after running `GET /api/admin/rds-profile-shadow-compare`
> as `prueba@crbox.cr` with a valid portal Bearer token.  This section documents the expected
> classification for each field based on code analysis, schema research, and known data-source differences.
> Fill in the **Observed** column when the first real run is complete.

### Sensitive field policy in diff output

All personal name and address fields are represented as `<redacted>` in diff entries — raw values
are used internally for classification but never stored in the response payload.  The classification
bucket (`exact_match`, `stale_dev_snapshot`, etc.) conveys the outcome without exposing PII.

| Field | In diff `rds`/`legacy` columns | Rationale |
|-------|-------------------------------|-----------|
| `name`, `lastName1`, `lastName2`, `fullName` | `<redacted>` | Personal name (Tier 2 PII) |
| `primaryAddress.address1`, `primaryAddress.city` | `<redacted>` | Delivery address (Tier 2 PII) |
| `email` | `fi***@domain.tld` | Masked via `_mask_email_addr` |
| `identificationNumber` | `****NNNN` | Masked; in `withheld` bucket |
| `primaryPhone` | `****NNNN` | Masked; in `withheld` bucket |

### Pre-run expected classification analysis

| Field | Expected Classification | Rationale / Assumptions |
|-------|-------------------------|-------------------------|
| `idConsignee` | `exact_match` | Stable integer PK; same record on both sides |
| `email` | `exact_match` | Normalised to lowercase on both sides; display masked |
| `name`, `lastName1`, `lastName2` | `exact_match` or `stale_dev_snapshot` | May differ if crbox_dev1 snapshot is stale |
| `fullName` | `exact_match` or `formatting_only` | Derived from name parts; normalization may catch casing gaps |
| `identificationType` | `exact_match` or `formatting_only` | Label vs raw code depending on identificationtype join |
| `isCompany` | `exact_match` | Boolean; both sides normalise to `str(bool(...))` |
| `receivesNewsletter` | `exact_match` or `stale_dev_snapshot` | User preference may have changed in prod since snapshot |
| `branch.id` | `exact_match` | FK integer from `consignee.idSucursal` |
| `branch.name` | `missingInLegacy` | Legacy `getuserinfo` does not return branch display name |
| `client.companyCode` | `exact_match` or `missing_join` | Depends on client FK validation (NEEDS VALIDATION) |
| `primaryAddress.address1` | `exact_match` or `stale_dev_snapshot` | Dev snapshot may not match current address |
| `primaryAddress.city` | `exact_match` or `stale_dev_snapshot` | Same as above |
| `primaryPhone` | `withheld_for_privacy` | Masked in diff; no plaintext comparison |
| `identificationNumber` | `withheld_for_privacy` | Masked; requires product/security approval before exposure |

### Join validation status

The response includes a `joinValidationStatus` field (`all_joins_succeeded` / `partial_joins_failed`)
and a `failedJoins` array listing any secondary join that raised an exception during Steps 2–7.
A status of `partial_joins_failed` means one or more optional joins (Sucursal, client, plan,
addresses, phones) failed — check `failedJoins` for per-join error strings to diagnose column
name or schema mismatches.

### Observed results template *(fill in after first live run)*

```
Run date:       YYYY-MM-DD
Run by:         <admin username>
joinValidationStatus:  <all_joins_succeeded | partial_joins_failed>
failedJoins:    <none | list join names>

matched fields:       <list>
formattingOnly fields:<list>
mismatched fields:    <list>
missingInRds fields:  <list>
missingInLegacy fields:<list>
withheld fields:      identificationNumber, primaryPhone (expected)

Notes / surprises:
- (fill in)
```

### Mismatch classification guide

| Classification | Meaning | Action |
|----------------|---------|--------|
| `exact_match` | Values identical | No action needed |
| `formatting_only` | Same value, different whitespace/casing | No action needed |
| `field_naming_casing` | Same value, different key name | Document mapping only |
| `missing_join` | Field absent in one side | Investigate join path |
| `stale_dev_snapshot` | Value differs due to dev vs prod data | Expected; no code fix needed |
| `legacy_business_logic_transform` | Legacy applies business rule | Document the rule; replicate if needed |
| `withheld_for_privacy` | Masked field; comparison skipped | No action needed |
| `true_mapping_issue` | Genuine mismatch | Must be resolved before wiring |

---

## Risks and Open Questions

1. **Client table FK (`NEEDS VALIDATION`)** — The join path `consignee → client`
   uses an assumed FK column name.  If the join fails, `companyCode` (the
   casillero number shown throughout the portal) will be `null`.  This is the
   most critical gap before frontend wiring.

2. **Sucursal display name column (`NEEDS VALIDATION`)** — `NombreSucursal` is
   assumed.  Run `SHOW COLUMNS FROM Sucursal` to confirm.

3. **Address/Phone primary and active flags (`NEEDS VALIDATION`)** — The
   `isPrimary` / `isActive` semantics are inferred from the column names.
   Incorrect interpretation could cause the wrong address or phone to be shown
   as "primary."

4. **`identificationtype` join** — If the FK from `consignee.IdentificationType`
   (string code) to `identificationtype.idIdentificationType` does not match
   directly, the label resolution will fall back to the raw code.  This is safe
   but produces a less human-readable value.

5. **Plan table schema** — `PlanName` and `Discount` column names are assumed.
   The plan structure in the legacy response is not yet reverse-engineered.

6. **crbox_dev1 vs production data** — All validation is against a development
   snapshot.  Field values may differ from production; this is expected and
   classified as `stale_dev_snapshot` in the diff.

---

## Future Frontend Wiring Plan

When the shadow compare passes and the following approvals are in place, the
wiring path to `mi-cuenta.html` would be:

1. **Resolve `client.companyCode` (`NEEDS VALIDATION`)** — Confirm FK join.
2. **Confirm address/phone logic** — Validate `isPrimary`/`isActive` semantics.
3. **Product/security approval** for `identificationNumber` display (Tier 4).
4. **New portal-user-facing endpoint** `GET /api/portal/profile-rds`:
   - Auth: Bearer token + `X-Casillero-Email`, validated via `getuserinfo`.
   - `idConsignee` resolved server-side; never from browser.
   - Feature flag: `USE_RDS_PROFILE_FRONTEND=true` (unset by default).
5. **Wire `mi-cuenta.html`** to new endpoint with legacy fallback (same IIFE
   pattern as `mis-paquetes.html`).
6. **Run shadow compare** against multiple real accounts before enabling flag.

**Approval gates before Step 5:**
- Shadow compare: all fields classified (no unclassified `true_mapping_issue`).
- NEEDS VALIDATION items resolved.
- Security review for Tier 4 fields (identificationNumber).
- Explicit sign-off from product team.

---

## Rollback / Fallback Approach

- Both new endpoints (`rds-profile-shadow` and `rds-profile-shadow-compare`)
  are admin-only and require `USE_RDS_PORTAL_API=true`.  Setting
  `USE_RDS_PORTAL_API=false` (or removing the secret) disables them immediately
  without any code change.
- No portal page, no customer-facing endpoint, and no authentication flow is
  modified by this task.
- The legacy `getuserinfo` path remains the sole data source for `mi-cuenta.html`.

---

## Safety Confirmation Checklist

- [x] Only `crbox_dev1` is touched — `SELECT DATABASE()` guard on every request.
- [x] No `SELECT *` — all queries list explicit columns.
- [x] No write operations — only `rds_client.fetch_one()` and `fetch_all()`.
- [x] `identificationNumber` never returned raw — always `****<last4>` mask.
- [x] `PhoneNumber` never returned raw — always `****<last4>` mask per entry.
- [x] Sensitive fields (`BirthDate`, etc.) withheld entirely from queries.
- [x] No PII in log output — only `[RDS-PROFILE-SHADOW] error: ...` format.
- [x] No frontend files modified (`mi-cuenta.html` untouched).
- [x] No invoices/packages/auth endpoints touched.
- [x] Legacy API called at most once per compare request (only with Bearer token).
- [x] Bearer token never stored or logged.
- [x] Admin session gate via `_rds_admin_gate()` on both endpoints.
- [x] `?email=` accepted only because endpoint is admin-gated; server-side ID resolution for any future portal-user-facing version is documented.
- [x] Test user limited to `prueba@crbox.cr` in compare endpoint default.

---

## Final Recommendation

### **B — Needs mapping fixes / validation before wiring**

The RDS profile data is resolvable from `crbox_dev1` with the queries above, but
several **NEEDS VALIDATION** items must be confirmed before a portal-user-facing
endpoint is safe to build:

1. **`client` table FK** — Without this, `companyCode` (casillero number) is
   null, which breaks the core portal identity display.
2. **`Sucursal.NombreSucursal`** — Column name must be confirmed.
3. **`consignee_has_address.isPrimary` / `isActive`** — Semantics must be
   validated to avoid showing wrong primary address.
4. **`consignee_has_phone.isPrimary` / `isActive`** — Same as addresses.
5. **`identificationNumber` display policy** — Requires explicit product/security
   approval (Tier 4 field).

**Path to `A` (safe to wire):**
- Run `SHOW COLUMNS FROM` on `client`, `Sucursal`, `consignee_has_address`,
  `consignee_has_phone`, `plan` to confirm all column names.
- Run `rds-profile-shadow-compare?email=prueba@crbox.cr` with a live Bearer
  token and confirm no `true_mapping_issue` entries in the diff.
- Resolve or document the client FK join result.
- Obtain product/security sign-off on the Tier 4 `identificationNumber` policy.

**Recommend against `C` (keep on legacy):** The field mapping is well-understood
and the queries are straightforward.  The blockers are schema-validation items
that can be resolved quickly with `SHOW COLUMNS` queries, not fundamental gaps.
