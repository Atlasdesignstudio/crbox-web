# RDS Production Validation Results

**Validation date:** 2026-05-20
**Validated by:** Agent-assisted read-only validation plan
**Scope:** Pre-enablement checks for `USE_RDS_PACKAGES_FRONTEND`, `USE_RDS_INVOICES_FRONTEND`, `USE_RDS_PROFILE_FRONTEND`

---

## Hard guarantees across all steps

The following statements are true for the entire validation period:

- No writes, DDL, or DML were executed against any database.
- No schema changes were made.
- No environment variable or secret changes were made.
- No code changes were made.
- No DNS or infrastructure changes were made.
- No production frontend RDS flags were enabled. All three flags remained `OFF` throughout.
- No PII (emails, ID numbers, phone numbers, addresses, tracking numbers, invoice numbers, tokens, passwords, or credentials) appears in this document.
- `CrBoxUser` was used only as a temporary read-only exception during Step 3 (see note below). It is not the intended production DB user and is not part of the final architecture.

---

## Step 1A — Production frontend RDS flags confirmed OFF

**Method:** `GET /api/config` against the production deployment (`crbox-web.replit.app`).

**Result:** PASS

All three production frontend flags confirmed `false`:

| Flag | Value |
|---|---|
| `USE_RDS_PACKAGES_FRONTEND` | `false` |
| `USE_RDS_INVOICES_FRONTEND` | `false` |
| `USE_RDS_PROFILE_FRONTEND`  | `false` |

No changes made. No queries run.

---

## Step 1B — CrBoxUser temporary DB guard

**Method:** Direct `pymysql` connection using `CrBoxUser` credentials (`MYSQL_HOST` / `MYSQL_USER` / `MYSQL_PASSWORD`). Executed `SELECT DATABASE() AS db`.

**Result:** PASS

`SELECT DATABASE()` returned `'CrBox'` — confirming the direct connection lands in the correct database.

**Note on CrBoxUser:** This user was used only as a temporary read-only exception to unblock validation while `crbox_portal_ro` is pending creation by CRBOX infrastructure. `CrBoxUser` is not the intended production read path. The final architecture requires `crbox_portal_ro`, and all production RDS traffic will go through that user once it exists.

---

## Step 2 — Production schema parity

**Method:** Schema parity SQL script (`docs/rds-production-schema-parity.sql`) executed via CrBoxUser direct connection.

**Result:** PASS — Grade A

All 21 required objects (tables and views) confirmed present. All required columns on key tables confirmed present. One apparent column name difference (`consigneeName` / `consigneeLastName1` / `consigneeLastName2` vs. a legacy naming convention) was investigated and resolved as a non-issue: `server.py` uses the RDS column names consistently throughout.

No schema changes were made during or after this check.

---

## Step 3 — Shadow compare (packages, invoices, profile)

**Method:** One-off direct Python validation script. CrBoxUser `pymysql` connection to `CrBox` for RDS-side data. Live legacy API calls to `clients.crbox.cr` using a Bearer token obtained by authenticating a real production account (email and password not recorded here). `SELECT DATABASE()` guard confirmed `'CrBox'` before any data query. No production shadow-compare endpoints were used (those require `crbox_portal_ro`, which does not exist yet).

**Date ranges used:**
- Packages: 90 days back from 2026-05-20
- Invoices: 180 days back from 2026-05-20

---

### 3A — Packages

| Metric | Value |
|---|---|
| RDS record count | 102 |
| Legacy record count | 102 |
| countDelta | 0 |
| missingInRds | 0 |
| missingInLegacy | 0 |
| statusMismatches | 0 |
| **Result** | **PASS** |

Primary match key: `idWarehouseReceipt`. Perfect record-for-record agreement between RDS and legacy.

---

### 3B — Invoices

| Metric | Value |
|---|---|
| RDS record count | 1 |
| Legacy record count | 1 |
| countDelta | 0 |
| amountDelta | 0.00 |
| missingInRds | 0 |
| missingInLegacy | 0 |
| amountMismatch | 0 |
| **Result** | **PASS** |

Primary match key: `factura`. Perfect count and amount agreement between RDS and legacy.

---

### 3C — Profile

| Field | Result |
|---|---|
| name | MATCH |
| lastName1 | MATCH |
| lastName2 | MATCH |
| isCompany | MATCH |
| branch | MATCH |
| casillero (`codigoFacturacion`) | Legacy API gap — see below |

**Core fields result:** PASS

**Casillero finding:**
- Account type: real production account.
- RDS `consignee.codigoFacturacion`: value present.
- Legacy `getuserinfo` `Consignee.codigoFacturacion`: `null` — the legacy API does not expose this value for the same real account.
- The value `'00481'` does not appear anywhere in the full legacy API response payload.
- **Classification:** Legacy API gap / RDS completeness difference. This is not an RDS data error. RDS exposes a more complete canonical database value for this field than the legacy API does.
- **Pre-enablement requirement:** Before enabling `USE_RDS_PROFILE_FRONTEND` broadly, product/business acceptance must be obtained that the RDS profile will surface `codigoFacturacion` in cases where the legacy API previously returned `null`. This is an improvement in data completeness, but the change in visible behaviour needs explicit acceptance before go-live.

**Overall Step 3 conclusion:** No blocking RDS data issue found from this account.

---

## Remaining gates before production flag enablement

| Gate | Status |
|---|---|
| Step 1A — production flags confirmed OFF | ✅ Complete |
| Step 1B — DB guard confirmed `CrBox` | ✅ Complete |
| Step 2 — schema parity Grade A | ✅ Complete |
| Step 3 — shadow compare (packages, invoices, profile) | ✅ Complete |
| **CRBOX infra creates `crbox_portal_ro`** | ⏳ Pending — external CRBOX infrastructure action |
| **Step 4 — final-architecture connectivity check with `crbox_portal_ro`** | ⏳ Blocked — must use `crbox_portal_ro`, not `CrBoxUser` |
| Step 5 — logging / observability instrumentation or written acceptance | ⏳ Blocked on Step 4 |
| Casillero pre-enablement acceptance (product/business) | ⏳ Required before profile flag goes live |
| Step 6 — staged flag enablement | ⏳ Blocked on Steps 4 and 5 |

**Step 4 must not proceed with `CrBoxUser`.** It is specifically the final-architecture connectivity check using `crbox_portal_ro` against the production RDS instance. It remains fully blocked until CRBOX infrastructure creates that user.

---

## Reference documents

| Document | Purpose |
|---|---|
| `docs/rds-production-readiness-plan.md` | Full step-by-step enablement plan and gate definitions |
| `docs/rds-production-schema-parity.sql` | Schema parity verification script (Step 2) |
| `docs/crbox-portal-ro-setup.sql` | SQL for CRBOX infra to create `crbox_portal_ro` |
