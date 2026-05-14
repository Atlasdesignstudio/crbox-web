# RDS Portal Core — Production Readiness Plan

**Created:** 2026-05-14  
**Scope:** `mis-paquetes`, `mis-facturas`, `mi-cuenta`  
**Author:** Agent (from QA-confirmed dev/test state)  
**Status:** Awaiting production read-only user creation — blocked on CRBOX infra team running `docs/crbox-portal-ro-setup.sql`  
**Last updated:** 2026-05-14 — Blocker 2 (read-only user + RDS_PORTAL_* wiring) ⏳ PARTIAL — see Section 3.5

---

## 1. Current State Summary

### 1.1 `mis-paquetes` — RDS Packages

| Field | Value |
|---|---|
| **Endpoint** | `GET /api/portal/my-packages` |
| **Frontend page** | `mis-paquetes.html` |
| **Feature flag (env var)** | `USE_RDS_PACKAGES_FRONTEND` |
| **Config key returned by `/api/config`** | `featureFlags.useRdsPackages` |
| **Dev/test flag** | `true` |
| **Production flag** | unset (legacy active) |
| **QA status** | ✅ PASSED — ready for controlled enablement |
| **Fallback** | Server returns `503 feature_disabled` if flag is off → frontend falls back to legacy `getuserpackages` |
| **Known limitations** | Fields `descripcion`, `montoFactura`, `totalVolume`, `totalVolumetricWeight` may be null for some records (dev snapshot age / packages without pieces). Maximum date range: 366 days. Tracking search is prefix-match only; `%` and `_` are blocked. `consigneeNotes` is intentionally withheld. |

---

### 1.2 `mis-facturas` — RDS Invoices

| Field | Value |
|---|---|
| **Endpoint** | `GET /api/portal/invoices-rds` |
| **Frontend page** | `mis-facturas.html` |
| **Feature flag (env var)** | `USE_RDS_INVOICES_FRONTEND` |
| **Config key returned by `/api/config`** | `featureFlags.useRdsInvoices` |
| **Dev/test flag** | `true` |
| **Production flag** | unset (legacy active) |
| **QA status** | ✅ PASSED — ready for controlled enablement |
| **Fallback** | Server returns `503 feature_disabled` if flag is off → frontend falls back to legacy invoices path |
| **Known limitations** | `invoiceFileUrl` is permanently stubbed as `''` — unavailable in dev DB (`crbox_dev1`). Clicking download shows toast "No hay archivo disponible para esta factura". Internal fields `guiasHijas`, `hiddenBill`, `paymentMethod`, `flete`, `impuestos`, `IVA` are withheld from the response. |

---

### 1.3 `mi-cuenta` — RDS Profile

| Field | Value |
|---|---|
| **Endpoint** | `GET /api/portal/profile-rds` |
| **Frontend page** | `mi-cuenta.html` |
| **Feature flag (env var)** | `USE_RDS_PROFILE_FRONTEND` |
| **Config key returned by `/api/config`** | `featureFlags.useRdsProfile` |
| **Dev/test flag** | `true` |
| **Production flag** | unset (legacy active) |
| **QA status** | ✅ PASSED (final manual QA 2026-05-14) — ready for controlled enablement |
| **Fallback** | Server returns `503 feature_disabled` if flag is off → frontend falls back to legacy `getUserInfo()` |
| **Known limitations** | Newsletter backend persistence not confirmed (`postedituser` returns OK but `getuserinfo` never confirms change — existing legacy platform limitation, non-blocking). Raw `identificationNumber` and `phoneNumber` are intentionally masked (`****<last4>`). Province may display as code rather than full label. Password change not live-tested with a successful real change (validation path confirmed). `birthDate`, `PendingDiscount`, `alternativeEmail`, `residenceCountry`, `contactName1/2`, `responsabilidad`, `omitirRecep` are withheld from RDS response. |

---

### 1.4 Production / shared flag status

All three frontend feature flags (`USE_RDS_PACKAGES_FRONTEND`, `USE_RDS_INVOICES_FRONTEND`, `USE_RDS_PROFILE_FRONTEND`) are **unset in production** as of this document's creation date. The legacy portal path is the active production path for all three modules.

The master backend flag `USE_RDS_PORTAL_API` must also be `true` in any environment where admin/shadow RDS endpoints are needed. It is independent of the three frontend flags.

---

## 2. Current Architecture

### 2.1 Safe pattern (all three modules)

When a feature flag is **off** (unset or `"false"`):

```
browser → legacy CRBOX API (clients.crbox.cr)
```

When a feature flag is **on** (`"true"`):

```
browser → GET /api/config → featureFlags.useRds* = true
       → GET /api/portal/<module-rds>
              → server verifies Bearer token (_portal_auth_full)
              → server resolves idConsignee from email in token (consignee table lookup)
              → server queries RDS (read-only)
              → returns masked/filtered response

       On non-auth failure (503, connection error, wrong DB guard):
              → frontend falls back to legacy CRBOX API

       On auth failure (401 / 403):
              → propagated to browser → login redirect (no silent fallback)
```

### 2.2 Key safety guarantees

- **The browser never sends `idConsignee`.** It is always resolved server-side by looking up the verified email from the Bearer token in the `consignee` table.
- **All RDS endpoints are read-only.** `rds_client.py` only exposes `fetch_one` and `fetch_all`. No write or update helpers exist in the module.
- **All writes remain legacy.** `postedituser`, password change, and newsletter preference all go directly to `clients.crbox.cr` — none are proxied through the RDS path.
- **Auth errors never silently fall back.** A 401/403 from `_portal_auth_full` is always propagated; it does not trigger the legacy fallback.
- **Sensitive fields are masked or withheld in `mi-cuenta`.** Raw identification number, raw phone, `cedulaJuridica`, `joinValidationStatus`, `birthDate`, `responsabilidad`, `omitirRecep`, `_bIsDeleted`, `_bIsChanged` are not present in the RDS profile response.
- **Database identity guard is enforced.** Before any data query, `server.py` runs `SELECT DATABASE()` and raises `_RdsWrongDatabaseError` if the active database does not match `EXPECTED_RDS_DATABASE`, or if that env var is unset. ✅ **Guard is now environment-driven — see Section 3.4.**

---

## 3. Production Database Requirements

### 3.1 Required database user

A dedicated **read-only** MySQL user must be created for the production RDS instance before any production connection is attempted.

**Required grants — packages only:**
```sql
GRANT SELECT ON <production_db>.getwarehousereceipts TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.consignee TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.status_general TO 'crbox_ro'@'%';
```

**Required grants — invoices only:**
```sql
GRANT SELECT ON <production_db>.resumenmawb TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.masterairshipment TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.descuentocorporativo TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.airshipment TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.warehousereceipt TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.shipper TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.carrierinformation TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.carrier TO 'crbox_ro'@'%';
```

**Required grants — profile only:**
```sql
GRANT SELECT ON <production_db>.consignee TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.identificationtype TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.Sucursal TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.client TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.plan TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.address TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.consignee_has_address TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.addresstype TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.phone TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.consignee_has_phone TO 'crbox_ro'@'%';
GRANT SELECT ON <production_db>.phonetype TO 'crbox_ro'@'%';
```

**Forbidden grants — must not be present:**
- `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `GRANT OPTION`
- Master / admin credentials must not be used
- Schema-level `ALL PRIVILEGES` must not be used

### 3.2 Network / security group

The production RDS security group must allow inbound TCP on port 3306 from the Replit deployment IP range (or the specific outbound IP of the deployment if static). This must be confirmed with the infrastructure team before any connection attempt.

### 3.3 Environment variables required

See Section 4 for the full list.

### 3.4 ✅ Database identity guard — RESOLVED (2026-05-14)

**Previous behavior (before this fix):** `server.py` compared `SELECT DATABASE()` against the hardcoded string `'crbox_dev1'`. This would always fail against any production database.

**Implemented change:** All four guard locations in `server.py` (the three helper functions `_rds_query_packages`, `_rds_query_invoices`, `_rds_query_profile`, and the inline admin packages handler) now read `EXPECTED_RDS_DATABASE` from the environment:

```python
_expected_db = os.environ.get('EXPECTED_RDS_DATABASE', '').strip()
if not _expected_db:
    raise _RdsWrongDatabaseError('EXPECTED_RDS_DATABASE not set')
if active_db != _expected_db:
    raise _RdsWrongDatabaseError(active_db)
```

**Fail-closed in all three cases:**
- `EXPECTED_RDS_DATABASE` not set → `_RdsWrongDatabaseError('EXPECTED_RDS_DATABASE not set')` — no query executes
- `EXPECTED_RDS_DATABASE` is empty string → same (`.strip()` normalises whitespace-only values)
- `SELECT DATABASE()` does not match → `_RdsWrongDatabaseError(<active_db>)` — no query executes

**Validated (2026-05-14) — all 5 guard scenarios pass:**

| Scenario | Result |
|---|---|
| `EXPECTED_RDS_DATABASE=crbox_dev1`, active DB = `crbox_dev1` | ✅ Guard passes — queries proceed |
| `EXPECTED_RDS_DATABASE=production_db`, active DB = `crbox_dev1` | ✅ Guard fails closed |
| `EXPECTED_RDS_DATABASE=""` (empty string) | ✅ Guard fails closed — "not set" |
| `EXPECTED_RDS_DATABASE` not set at all | ✅ Guard fails closed — "not set" |
| `EXPECTED_RDS_DATABASE=crbox_dev1`, active DB = `some_other_db` | ✅ Guard fails closed |

**Dev/test env var set:** `EXPECTED_RDS_DATABASE=crbox_dev1` (development environment, Replit Secrets).  
**Production:** `EXPECTED_RDS_DATABASE=CrBox` is set in the production environment. ✅ Done.

---

### 3.5 ⏳ Blocker 2 — Production read-only user creation (PARTIAL — 2026-05-14)

**What is done:**

| Item | Status |
|---|---|
| `rds_client.py` updated — dual `RDS_PORTAL_*` / `MYSQL_*` namespace with clean priority check | ✅ Done |
| Production env vars set: `RDS_PORTAL_HOST`, `RDS_PORTAL_PORT`, `RDS_PORTAL_DATABASE`, `RDS_PORTAL_USER`, `EXPECTED_RDS_DATABASE=CrBox` | ✅ Done |
| SQL script prepared for CRBOX infra team | ✅ `docs/crbox-portal-ro-setup.sql` |
| `RDS_PORTAL_PASSWORD` Replit secret | ⏳ Awaiting user to set secret |
| `crbox_portal_ro` MySQL user created on production RDS | ⏳ Awaiting CRBOX infra team to run SQL script |
| Dev environment (`MYSQL_*` / `crbox_dev1`) | ✅ Unaffected — verified clean restart |
| Frontend flags (`USE_RDS_PACKAGES_FRONTEND`, `USE_RDS_INVOICES_FRONTEND`, `USE_RDS_PROFILE_FRONTEND`) | ✅ All OFF in production |

**Why `CrBoxUser` cannot create the portal user:**  
`CrBoxUser` holds `ALL PRIVILEGES ON CrBox.*` but not the global `CREATE USER` privilege. On RDS, database-level `ALL PRIVILEGES` does not include user management — that requires the RDS master user. `CrBoxUser` cannot be used for this step.

**Required actions (CRBOX infra team):**

1. Connect to the production RDS instance as the master user (or any account with `CREATE USER`).
2. Retrieve `RDS_PORTAL_PASSWORD` value from the Replit production secrets UI.
3. Run `docs/crbox-portal-ro-setup.sql`, replacing `<RDS_PORTAL_PASSWORD>` with the actual secret value.
4. Confirm `SHOW GRANTS FOR 'crbox_portal_ro'@'%'` shows SELECT-only grants — no INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, GRANT OPTION, or ALL PRIVILEGES.
5. Optionally run the smoke-test queries listed at the bottom of the script.
6. Notify the CRBOX dev team that the user is ready so the production shadow compare can proceed (Stage 1 of Section 7).

**Required action (dev team / this agent):**

- Add `RDS_PORTAL_PASSWORD` as a Replit production secret (see below — request is in progress).

---

## 4. Production Configuration Plan

### 4.1 Environment variables

**Development** — uses `MYSQL_*` namespace (unchanged, no action required):

| Variable | Value | Scope |
|---|---|---|
| `MYSQL_HOST` | dev RDS endpoint | shared |
| `MYSQL_PORT` | `3306` | shared |
| `MYSQL_DATABASE` | `crbox_dev1` | shared |
| `MYSQL_USER` | `CrBoxUser` | shared |
| `MYSQL_PASSWORD` | (Replit global secret) | global secret |
| `EXPECTED_RDS_DATABASE` | `crbox_dev1` | development only |

**Production** — uses `RDS_PORTAL_*` namespace (activated by presence of `RDS_PORTAL_HOST`):

| Variable | Value | Scope | Status |
|---|---|---|---|
| `RDS_PORTAL_HOST` | `crboxdbserver.cvfe6dzk8nhz.us-east-1.rds.amazonaws.com` | production | ✅ Set |
| `RDS_PORTAL_PORT` | `3306` | production | ✅ Set |
| `RDS_PORTAL_DATABASE` | `CrBox` | production | ✅ Set |
| `RDS_PORTAL_USER` | `crbox_portal_ro` | production | ✅ Set |
| `RDS_PORTAL_PASSWORD` | (Replit secret — must be added) | global secret | ⏳ Pending |
| `EXPECTED_RDS_DATABASE` | `CrBox` | production | ✅ Set |

**Feature flags (both environments):**

| Variable | Development value | Production value | Required? |
|---|---|---|---|
| `USE_RDS_PORTAL_API` | `true` | `true` (needed for shadow admin endpoints) | Yes for shadow stage |
| `USE_RDS_PACKAGES_FRONTEND` | `true` | unset → `false` | Set per stage rollout |
| `USE_RDS_INVOICES_FRONTEND` | `true` | unset → `false` | Development only |
| `USE_RDS_PROFILE_FRONTEND` | `true` | unset → `false` | Development only |

### 4.2 Safe defaults

- All three frontend flags default to `false` (disabled) when unset — legacy remains active.
- `USE_RDS_PORTAL_API` defaulting to `false` disables shadow/admin endpoints — safe for environments where RDS is not yet configured.
- Setting `EXPECTED_RDS_DATABASE` to a value different from `MYSQL_DATABASE` intentionally hard-fails all RDS queries — use this as a safety lock during maintenance.
- No secrets or credential values should appear in code, logs, or documentation.

---

## 5. Schema Parity Validation Plan

**✅ Preparation complete (2026-05-14)** — artefacts ready for execution once `crbox_portal_ro` is confirmed created (Blocker 2, Section 3.5).

**Gate:** Schema parity execution requires `crbox_portal_ro` to exist on production RDS. Do not execute against production until Blocker 2 is fully resolved.

### 5.1 Artefacts

| Artefact | Location | Purpose |
|---|---|---|
| SQL script | `docs/rds-production-schema-parity.sql` | Ready-to-run schema inspection — `SHOW COLUMNS`, `DESCRIBE`, `SHOW CREATE VIEW` only. No row queries, no DML, no DDL. |
| Checklist | `docs/rds-production-schema-parity-checklist.md` | Fill in Pass/Fail per object after running the SQL. Includes Blocking? classification and final A/B/C result. |

### 5.2 Coverage

21 objects across all three portal modules:

| Section | Objects | Critical objects |
|---|---|---|
| Shared | `consignee`, `status_general` | Both blocking |
| Packages | `getwarehousereceipts` (view) | Blocking — entire packages module depends on this view |
| Invoices | `resumenmawb`, `masterairshipment`, `descuentocorporativo`, `airshipment`, `warehousereceipt`, `shipper`, `carrierinformation`, `carrier` | `resumenmawb`, `masterairshipment`, `airshipment`, `warehousereceipt` blocking |
| Profile | `identificationtype`, `Sucursal`, `client`, `plan`, `address`, `consignee_has_address`, `addresstype`, `phone`, `consignee_has_phone`, `phonetype` | `Sucursal`, `address`, `consignee_has_address`, `phone`, `consignee_has_phone` blocking |

### 5.3 Key casing and typo notes (documented in checklist)

- `CrBox` — database name; must match `EXPECTED_RDS_DATABASE=CrBox` exactly
- `Sucursal` — table name has capital S
- `weigth` — intentional typo in `resumenmawb` column (not `weight`)
- `volumetricWeigth` — DB column name (typo); remapped to `volumentricWeigth` (different typo) in API response to match `mapBill()` in frontend
- `warehousereceipt` FK columns: `AirShipment`, `Consignee`, `Status`, `Shipper`, `CarrierInformation` — all capitalised
- `resumenmawb` FK columns: `Consignee` (capital C), `MasterAirshipment` (mixed case)
- `phone.PhoneType`, `address.AddressType` — capitalised FK columns
- Label columns in `addresstype`, `phonetype`, `identificationtype` are named `type`, not the table name

### 5.4 Final classification rubric

- **A** — Schema parity confirmed, all blocking objects and columns present → proceed to Section 6 (shadow compare)
- **B** — Minor naming/mapping differences found, code update needed in `server.py` before shadow compare
- **C** — Critical object or blocking column missing → stop, notify CRBOX infra team

### 5.5 Execution rules

- Connect as `crbox_portal_ro` only — not as `CrBoxUser` or any admin user
- Run `SELECT DATABASE()` first — if result ≠ `CrBox`, stop immediately
- No row-level queries, no `SELECT *`, no DML, no DDL
- No customer data (emails, IDs, phone numbers) in output or shared documents

---

## 6. Production Shadow Compare Plan

Run after schema parity is confirmed and before enabling any frontend flag. Shadow compare uses the admin RDS shadow endpoints, not the user-facing portal endpoints. No frontend flags need to be enabled for shadow compare.

### 6.1 Test accounts

| Priority | Account | Condition |
|---|---|---|
| 1st | `prueba@crbox.cr` | Use only if this account exists and has meaningful data in production |
| 2nd | 2–3 controlled real accounts | Only with explicit written approval from the CRBOX team |

Do not use customer accounts without approval. Do not log or store raw PII from any production account.

### 6.2 Packages shadow compare — fields to validate

| Field | Notes |
|---|---|
| Total count | Must match legacy exactly (`countDelta = 0`) |
| `idWarehouseReceipt` | Cross-reference key |
| `trackingNumber` | Must match per record |
| `statusId` / `statusName` | Must match per record |
| `receivedDateTime` | Must match within acceptable precision |
| `totalWeight` | Must match |
| `invoicesCount` | Must match |
| `missingInRds` | Must be 0 |
| `missingInLegacy` | Must be 0 |
| `statusMismatch` | Must be 0 |

### 6.3 Invoices shadow compare — fields to validate

| Field | Notes |
|---|---|
| Total count | Must match legacy exactly (`countDelta = 0`) |
| `factura` number | Cross-reference key |
| `total` | Must match (within rounding tolerance if applicable) |
| `weigth` | Must match |
| `volumetricWeigth` | Must match |
| `cantidadBultos` | Must match |
| `masterAirShipmentNumber` | Must match |
| Recibos count | Must match |
| `missingInRds` | Must be 0 |
| `missingInLegacy` | Must be 0 |
| `amountMismatch` | Must be 0 |

### 6.4 Profile shadow compare — fields to validate

| Field | Notes |
|---|---|
| `idConsignee` | Must resolve for the test account |
| `email` | Must match |
| Name / surnames | Must match |
| `casillero` (codigoFacturacion) | Must match |
| Branch / `sucursal` | Must match |
| Addresses count | Must match |
| Phones count | Must match |
| Identification type | Must match |
| `isCompany` | Must match |
| `receivesNewsletter` | Observe only — do not assert as pass/fail given known legacy persistence issue |
| Raw ID / phone | Must NOT appear unmasked in any log or document |

### 6.5 Pass / No-Go criteria

| Criterion | Pass | No-Go |
|---|---|---|
| Package count delta | 0 | Any unexplained difference |
| Invoice count delta | 0 | Any unexplained difference |
| Missing in RDS | 0 | > 0 for critical records |
| Missing in legacy | 0 | > 0 |
| Status mismatches | 0 | > 0 for active/recent records |
| Amount mismatches | 0 | > 0 |
| Profile fields | All match | Any mapping error for name, casillero, branch, isCompany |
| PII in logs | None | Any raw ID or phone number in output |
| Sensitive fields absent | Confirmed | Any of the withheld fields appear in response |

**Acceptable / classifiable differences:**
- `descripcion`, `montoFactura`, `totalVolume`, `totalVolumetricWeight` null for older packages — expected
- `invoiceFileUrl` empty — documented, expected
- Province as code rather than label — documented limitation, non-blocking
- `receivesNewsletter` state — observation only, not a pass/fail criterion

---

## 7. Feature Flag Rollout Plan

### Stage 0 — Current state (now)

- All production frontend flags unset → legacy only
- RDS backend (`USE_RDS_PORTAL_API`) may be enabled for shadow admin work only
- No user traffic touches RDS

### Stage 1 — Production read-only shadow validation

**Prerequisites:** database guard configurable, production read-only user created, schema parity confirmed  
**Actions:**
- Set `MYSQL_HOST`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `EXPECTED_RDS_DATABASE` for production
- Set `USE_RDS_PORTAL_API=true`
- Do NOT set any frontend flags
- Run shadow compares against `prueba@crbox.cr` and 1–2 approved accounts
- Review results before proceeding

### Stage 2 — Enable packages for one controlled internal account

**Prerequisites:** Stage 1 shadow compares passed  
**Actions:**
- Set `USE_RDS_PACKAGES_FRONTEND=true`
- Monitor `/api/portal/my-packages` logs — success count, error count, fallback count
- Verify `/api/config` returns `useRdsPackages: true`
- Confirm packages render correctly for the controlled account
- Confirm fallback works by temporarily disconnecting RDS (test environment only)

### Stage 3 — Enable invoices

**Prerequisites:** Stage 2 stable, no anomalies  
**Actions:**
- Set `USE_RDS_INVOICES_FRONTEND=true`
- Monitor `/api/portal/invoices-rds` logs
- Confirm totals, cantidadBultos, and masterAirShipmentNumber render correctly
- Verify download graceful-failure toast appears (expected — `invoiceFileUrl` may still be empty in production)

### Stage 4 — Enable profile

**Prerequisites:** Stage 3 stable  
**Actions:**
- Set `USE_RDS_PROFILE_FRONTEND=true`
- Monitor `/api/portal/profile-rds` logs
- Confirm secure response boundary holds (no raw PII in browser network tab)
- Confirm writes (newsletter, profile save, password) still go to legacy
- Confirm newsletter "unconfirmed" amber card appears as expected

### Stage 5 — Broader enablement

**Prerequisites:** All Stage 2–4 checks stable, no discrepancies over ≥ 1 business day  
**Actions:**
- Continue monitoring
- Keep all three flags individually switchable
- Keep rollback procedure documented and rehearsed

### Per-user rollout

The current system does not support per-user feature flag rollout. Flags are global per environment. Before any broad production enablement, it is recommended to add an allowlist mechanism (e.g., a `RDS_ALLOWED_EMAILS` env var or a DB table) so the RDS path can be validated for a specific set of accounts before all users are affected.

---

## 8. Rollback Plan

All rollbacks are flag-only. No DB operation, no code change, no data migration, and no user-facing write impact is required for any rollback.

### 8.1 Packages rollback

1. Unset `USE_RDS_PACKAGES_FRONTEND` (or set to `false`) in Replit Secrets
2. Restart the production server
3. Verify `GET /api/config` returns `featureFlags.useRdsPackages: false`
4. Legacy `getuserpackages` path resumes for all users immediately

### 8.2 Invoices rollback

1. Unset `USE_RDS_INVOICES_FRONTEND` (or set to `false`) in Replit Secrets
2. Restart the production server
3. Verify `GET /api/config` returns `featureFlags.useRdsInvoices: false`
4. Legacy invoices path resumes for all users immediately

### 8.3 Profile rollback

1. Unset `USE_RDS_PROFILE_FRONTEND` (or set to `false`) in Replit Secrets
2. Restart the production server
3. Verify `GET /api/config` returns `featureFlags.useRdsProfile: false`
4. Legacy `getUserInfo()` path resumes for all users immediately

### 8.4 Full RDS backend rollback

If the RDS connection itself is unstable:

1. Unset all three frontend flags
2. Unset `USE_RDS_PORTAL_API`
3. Restart the production server
4. All RDS endpoints return `503 feature_disabled` — all users fall back to legacy automatically

### 8.5 Rollback guarantee conditions

The rollback guarantee holds as long as:
- The legacy CRBOX API (`clients.crbox.cr`) remains available
- The `USE_RDS_*` env var removal takes effect on next server restart
- The frontend's `fetch /api/config` → flag-check → fallback path is not modified

---

## 9. Monitoring / Observability Plan

### 9.1 Recommended metrics

| Metric | Description |
|---|---|
| `rds_request_success` | Count of successful RDS endpoint responses per module |
| `rds_request_error` | Count of non-auth errors per module |
| `rds_fallback_count` | Count of requests that fell back to legacy |
| `rds_auth_error_count` | Count of 401/403 errors (should match legacy auth error rate) |
| `rds_response_time_ms` | P50 / P95 response time per endpoint |
| `rds_db_connect_failure` | Count of `pymysql` connection failures |
| `rds_wrong_database_error` | Count of `_RdsWrongDatabaseError` — must be 0 in production |
| `rds_package_count_anomaly` | Flag if package count for an account changes by > N% vs. prior request |
| `rds_invoice_count_anomaly` | Flag if invoice count anomaly detected |
| `rds_profile_mapping_error` | Count of profile responses with missing critical fields |
| `rds_newsletter_unconfirmed` | Count of newsletter "unconfirmed" states (informational — known limitation) |

### 9.2 Log rules — mandatory

The following must never appear in any log line:

- Bearer tokens or fragments of them
- Raw identification numbers (cédula, DIMEX, passport number)
- Raw phone numbers
- Raw physical addresses
- Full profile response objects
- Full package or invoice response bodies
- Any field not needed to identify the error

Acceptable log content:
- `idConsignee` (internal integer — not raw PII)
- `email` (already used as the auth identity)
- HTTP status codes
- Endpoint names
- Error type and message (without stack trace in production)
- Timestamps
- Request duration

---

## 10. Performance Considerations

### 10.1 Current connection model

`rds_client.py` opens a **fresh connection per request** (no connection pooling). This is safe for current low-volume shadow testing and controlled internal use, but may become a bottleneck under production traffic.

**Recommendation before broad production enablement:** Introduce a connection pool (e.g., `DBUtils.PooledDB` with `pymysql`, or `SQLAlchemy` connection pool) with a conservative pool size (3–5 connections). Do not change this in the current task — document it here and address before Stage 5.

### 10.2 Query safety

| Endpoint | Risk | Mitigation |
|---|---|---|
| `my-packages` | Full table scan if no index on `idConsignee` in `getwarehousereceipts` view | Confirm index exists before production; date-range limit of 366 days enforced |
| `invoices-rds` | Multi-table join across 8 tables; could be slow for high-invoice accounts | Confirm indexes on `idConsignee`, `idResumenMAWB`, `idMasterAirShipment`; result already limited by date range |
| `profile-rds` | Low risk — point lookup by `idConsignee` across small joined tables | Confirm index on `consignee.email` for idConsignee resolution |

### 10.3 Timeouts

Current `rds_client.py` timeouts:
- `connect_timeout`: 10 seconds
- `read_timeout`: 30 seconds
- `write_timeout`: 10 seconds

A 30-second read timeout will cause the frontend fallback to trigger if RDS is slow. This is acceptable and intentional. The user will see their legacy data rather than an error.

### 10.4 Date range limits

- Packages: maximum 366 days enforced by `server.py`
- Invoices: confirm whether a similar limit is enforced; add one if not, before production enablement

---

## 11. Security Review

| Control | Status | Notes |
|---|---|---|
| Bearer token required | ✅ | All three endpoints use `_portal_auth_full`; unauthenticated requests return 401 |
| Email verified via token | ✅ | Email extracted from Bearer token; not accepted from request body or query params |
| `idConsignee` resolved server-side | ✅ | Looked up from `consignee` table using verified email; browser never sends it |
| `idConsignee` not accepted from browser | ✅ | Not present in any endpoint's request parsing |
| Raw identification number withheld | ✅ | Masked to `****<last4>` in `profile-rds` response |
| Raw phone number withheld | ✅ | Masked to `****<last4>` in `profile-rds` response |
| `cedulaJuridica` withheld | ✅ | Not present in `profile-rds` response |
| Internal admin fields withheld | ✅ | `joinValidationStatus`, `_bIsDeleted`, `_bIsChanged`, `responsabilidad`, `omitirRecep` withheld |
| `consigneeNotes` withheld | ✅ | Explicitly excluded from `my-packages` response |
| Financial breakdown withheld | ✅ | `flete`, `impuestos`, `IVA`, `hiddenBill`, `paymentMethod` withheld from invoices response |
| Writes remain legacy | ✅ | No write endpoints exist in the RDS path; `rds_client.py` has no write helpers |
| DB user should be read-only | ⚠️ Pending | Production read-only user not yet created — required before Stage 1 |
| Feature flags default off | ✅ | All flags default to `false`; empty string ≠ `"true"` |
| No secrets in code or logs | ✅ | All credentials via env vars; not logged |
| Database guard | ⚠️ Needs change | Currently hardcoded to `crbox_dev1`; must be made configurable before production connection |

**Newsletter persistence:** The fact that `postedituser` does not persist `receivesNewsletter` is a **legacy write limitation** — it is not an RDS read risk. The RDS profile endpoint correctly reads and reports the current value from the database. The limitation is in the legacy CRBOX platform write API, which is outside this system's control.

---

## 12. Known Limitations

### 12.1 Packages

- `descripcion`, `montoFactura`, `totalVolume`, `totalVolumetricWeight` may be null for records without sub-items (packages without piece records) or for older snapshot data. This is a data sparsity issue, not a mapping error.
- Date range is capped at 366 days. Older packages are not returned by the RDS path. Legacy path has its own limits — confirm they are consistent.
- Tracking search is prefix-match only. Substring search is not supported. Characters `%` and `_` are sanitized.

### 12.2 Invoices

- `invoiceFileUrl` is currently stubbed as `''` because the file location is not available in the dev DB (`crbox_dev1`). This must be validated against production — if the column or storage path is available in production, the stub should be replaced with the real value before Stage 3 enablement.
- Download click shows a graceful "No hay archivo disponible" toast rather than failing silently or crashing.
- Internal fields (`guiasHijas`, `hiddenBill`, `paymentMethod`, `flete`, `impuestos`, `IVA`) are permanently withheld from the portal response.

### 12.3 Profile

- **Newsletter backend persistence:** `postedituser` returns OK but `getuserinfo` does not confirm `receivesNewsletter` change. This is a pre-existing legacy platform limitation. The UI is honest about this state. Not a new regression; exists in production today. Resolution requires CRBOX platform team input.
- **Masked fields:** `identificationNumber` and `phoneNumber` are returned masked (`****<last4>`). This prevents the UI from displaying the full value. It is an intentional privacy improvement — the full value is never sent to the browser. Write operations use the unmasked value from `__crboxUserInfoLegacy` (the parallel legacy fetch).
- **Province labels:** Address province may display as a single-character code (e.g., `"S"` for San José) if the source data does not include the full label. This is a cosmetic limitation.
- **Password change not live-tested:** Client-side validation (empty / < 8 chars / mismatch / no request on failure) is confirmed. A successful real password change was not tested to avoid risk to the test account. The `__crboxUserInfoLegacy` write-base fix is in place.
- **`currentPassword` not required:** The legacy `postedituser` API does not require the current password for password changes. This is a platform API characteristic, not an RDS issue.
- **Withheld fields:** `birthDate`, `PendingDiscount`, `alternativeEmail`, `residenceCountry`, `contactName1/2`, `responsabilidad`, `omitirRecep` are not present in the RDS profile response. If any of these are needed by future features, they must be added to the endpoint's SELECT and response mapping.

---

## 13. Go / No-Go Checklist

### Go criteria (all must be met before any production shadow compare)

- [ ] Database identity guard made configurable (`EXPECTED_RDS_DATABASE` env var replaces hardcoded `crbox_dev1`)
- [ ] Production read-only MySQL user created with SELECT-only grants
- [ ] Production read-only user confirmed to have no write/admin permissions
- [ ] `EXPECTED_RDS_DATABASE` set to production DB name
- [ ] `MYSQL_DATABASE` set to production DB name
- [ ] Schema parity confirmed for all required tables/views/columns (Section 5)
- [ ] Shadow compare passes for packages — `countDelta = 0`, `missingInRds = 0`, `statusMismatch = 0`
- [ ] Shadow compare passes for invoices — `countDelta = 0`, `amountMismatch = 0`
- [ ] Profile read compare passes — all critical fields map correctly
- [ ] Secure response boundary confirmed in production (no raw PII in browser Network tab)
- [ ] Feature flags verified off by default (`/api/config` returns all false)
- [ ] Rollback tested — unset flag → restart → legacy resumes
- [ ] Logs confirmed free of PII and secrets
- [ ] Controlled production test account approved by CRBOX team

### No-Go criteria (any one blocks production shadow compare)

- [ ] Production DB user has INSERT, UPDATE, DELETE, DROP, ALTER, or GRANT permissions
- [x] ~~Database guard still hardcoded to `crbox_dev1`~~ — ✅ RESOLVED: guard now reads `EXPECTED_RDS_DATABASE`; hardcoded value removed
- [ ] Schema differs from dev assumptions (missing table, missing column, different column name)
- [ ] True field mapping errors (wrong data in a critical field)
- [ ] Count mismatches that cannot be explained by known limitations
- [ ] Fallback broken (RDS error does not trigger legacy path)
- [ ] Auth errors silently fall back (must propagate to login redirect)
- [ ] Raw PII (unmasked ID number, unmasked phone) appears in any log or response
- [ ] Rollback not tested or not confirmed to work

---

## 14. Final Recommendation

**A — Ready for production read-only shadow compare.**

All three portal modules (`mis-paquetes`, `mis-facturas`, `mi-cuenta`) have passed final manual QA in dev/test. The architecture is sound, the fallback guarantees hold, and the security boundary is confirmed.

**The system is not yet ready for broad production enablement.** One remaining action is required before the first production connection can be established:

### Blockers before Stage 1 (production shadow compare)

| # | Blocker | Status |
|---|---|---|
| 1 | **Database identity guard was hardcoded** | ✅ **RESOLVED (2026-05-14)** — guard now reads `EXPECTED_RDS_DATABASE`; all 5 guard scenarios validated |
| 2 | **Production read-only DB user does not exist** | ⏳ **OPEN** — CRBOX infrastructure team must create a SELECT-only MySQL user and provide credentials |

### Next steps (in order)

1. ~~Fix the database identity guard~~ ✅ Done
2. Confirm production DB name with the CRBOX team
3. Create production read-only MySQL user (Blocker 2 — infrastructure task)
4. Set production env vars (`MYSQL_HOST`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `EXPECTED_RDS_DATABASE`) in Replit **production** Secrets
5. Run schema parity validation (Section 5)
6. Run production shadow compare against `prueba@crbox.cr` (Section 6)
7. Review shadow compare results — if all pass, proceed to Stage 2 (packages frontend flag)

### Items that do not block production shadow compare

- `invoiceFileUrl` stub — read-only observation in shadow compare; address before Stage 3
- Newsletter persistence — existing platform limitation; non-blocking
- Connection pooling — low risk at current scale; address before Stage 5
- Per-user rollout support — recommended before broad enablement, not needed for controlled internal testing
