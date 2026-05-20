# RDS Observability Implementation Report

**Date:** 2026-05-20
**Step:** 5 — Structured logging and frontend fallback classification
**Status:** COMPLETE

---

## 1. Files Changed

| File | Change |
|---|---|
| `server.py` | Added `_rds_emit_log()` module-level helper; added safety comment blocks, timing setup, and structured log calls to `_handle_portal_my_packages`, `_handle_portal_invoices_rds`, `_handle_portal_profile_rds` |
| `mis-paquetes.html` | Added `_classifyRdsFallback()`, replaced raw `rdsErr.message` log, added `window.__crboxLastRdsFallback` sentinel |
| `mis-facturas.html` | Same pattern as mis-paquetes.html |
| `mi-cuenta.html` | Same pattern as mis-paquetes.html |

No other files were changed. No env vars, secrets, DNS, or deployment settings were touched. No RDS write paths were introduced.

---

## 2. Functions Changed

### server.py — new

**`_rds_emit_log(module, endpoint, flag, result, duration_ms, rows, db_guard, extra)`**
- Module-level helper (added before `_compute_packages_diff`, around line 15566)
- Emits one `[RDS-EVENT]` line to stdout per call
- `extra` parameter is optional; used for `recibos=ok|degraded` on the invoices handler

### server.py — modified

**`_handle_portal_my_packages`**
- Added read-path safety comment block
- Added `_t0 = time.monotonic()`, `_dur` lambda, `_flag` variable at entry
- Flag gate now uses `_flag != 'enabled'` (derived once at entry)
- `_rds_emit_log()` called at: feature_disabled gate, auth failure, DB guard fail (×2), consignee not found (success rows=0), `_RdsWrongDatabaseError` except, generic `Exception` except, success path
- Raw `print(f'... {exc}')` calls removed from all except branches; `as exc` binding removed to prevent accidental future logging

**`_handle_portal_invoices_rds`**
- Same safety comment, `_t0`/`_dur`/`_flag` pattern as packages
- `_recibos_ok = True` flag added before the recibos try block; set to `False` on exception
- Raw `print(f'[PORTAL-INVOICES-RDS] recibos batch query failed (degraded): {exc}')` removed
- `_rds_emit_log()` called at: feature_disabled gate, auth failure, `_RdsEmailNotFoundError` (success rows=0), `_RdsWrongDatabaseError` except, generic `Exception` except, success path (includes `recibos=ok|degraded`)

**`_handle_portal_profile_rds`**
- Same safety comment, `_t0`/`_dur`/`_flag` pattern as packages
- `_rds_emit_log()` called at: feature_disabled gate, auth failure, `_RdsEmailNotFoundError` (rds_not_found), `_RdsWrongDatabaseError` except, generic `Exception` except, success path (rows=1)

### HTML pages — modified

`mis-paquetes.html`, `mis-facturas.html`, `mi-cuenta.html`: each fallback `.catch()` block now:
1. Calls `_classifyRdsFallback(rdsErr)` to derive a safe reason code
2. Logs `console.debug('[CRBOX-RDS] fallback module=X reason=Y')`
3. Sets `window.__crboxLastRdsFallback = { module, reason, ts }`

---

## 3. Exact Log Format

### Server-side (`[RDS-EVENT]`)

One line per request, emitted to stdout via `print()`.

```
[RDS-EVENT] module=packages endpoint=/api/portal/my-packages flag=disabled result=feature_disabled duration_ms=0 rows=- db_guard=skip
[RDS-EVENT] module=packages endpoint=/api/portal/my-packages flag=enabled result=auth_error duration_ms=45 rows=- db_guard=skip
[RDS-EVENT] module=packages endpoint=/api/portal/my-packages flag=enabled result=rds_wrong_db duration_ms=12 rows=- db_guard=fail
[RDS-EVENT] module=packages endpoint=/api/portal/my-packages flag=enabled result=success duration_ms=84 rows=102 db_guard=pass
[RDS-EVENT] module=invoices endpoint=/api/portal/invoices-rds flag=enabled result=success duration_ms=110 rows=8 db_guard=pass recibos=ok
[RDS-EVENT] module=invoices endpoint=/api/portal/invoices-rds flag=enabled result=success duration_ms=95 rows=8 db_guard=pass recibos=degraded
[RDS-EVENT] module=profile endpoint=/api/portal/profile-rds flag=enabled result=rds_not_found duration_ms=31 rows=- db_guard=pass
[RDS-EVENT] module=profile endpoint=/api/portal/profile-rds flag=enabled result=success duration_ms=55 rows=1 db_guard=pass
```

Field reference:

| Field | Values |
|---|---|
| `module` | `packages` / `invoices` / `profile` |
| `endpoint` | `/api/portal/my-packages` / `/api/portal/invoices-rds` / `/api/portal/profile-rds` |
| `flag` | `enabled` / `disabled` |
| `result` | `feature_disabled` / `auth_error` / `bad_request` / `rds_not_found` / `rds_wrong_db` / `rds_error` / `success` |
| `duration_ms` | integer (monotonic, milliseconds) |
| `rows` | integer count or `-` when not reached |
| `db_guard` | `pass` / `fail` / `skip` |
| `recibos` (invoices only) | `ok` / `degraded` (omitted on non-success paths) |

### Browser-side (`[CRBOX-RDS]`)

```
[CRBOX-RDS] fallback module=packages reason=feature_disabled
[CRBOX-RDS] fallback module=invoices reason=rds_error
[CRBOX-RDS] fallback module=profile reason=timeout
```

Reason codes: `feature_disabled` / `rds_error` / `auth_error` / `timeout` / `schema_error` / `unknown`

QA sentinel (readable in DevTools Console):
```javascript
window.__crboxLastRdsFallback
// → { module: 'packages', reason: 'feature_disabled', ts: 1716208423000 }
```

---

## 4. PII Prevention

### Server-side

- `_rds_emit_log()` accepts only safe pre-classified strings; it never receives user-supplied data
- `endpoint` is a compile-time constant string per handler — no query string, no header value
- `result` and `flag` are derived from env var or exception type — never from user input
- `rows` is an integer count — not IDs, not content
- `duration_ms` is a timing integer
- Raw exception bindings (`as exc`) removed from all except branches in the three handlers — the previous `print(f'... {exc}')` pattern that could have leaked DB error messages is gone
- No email, token, ID number, phone, tracking number, invoice number, casillero number, SQL text, or SQL parameters appear in any log line

### Frontend

- `_classifyRdsFallback()` only inspects `err._rdsStatus` (an integer set by `portal-api.js`) and a substring match on safe keywords (`'timeout'`, `'network'`, `'schema'`, `'json'`) in `err.message`
- The message text itself is never passed to `console.debug` or stored in `window.__crboxLastRdsFallback`
- `window.__crboxLastRdsFallback` contains only `module` (constant string), `reason` (category code), and `ts` (timestamp integer)

---

## 5. Testing with Production Flags OFF

**No flag changes were made.** All three production RDS frontend flags (`USE_RDS_PACKAGES_FRONTEND`, `USE_RDS_INVOICES_FRONTEND`, `USE_RDS_PROFILE_FRONTEND`) remain `false` or unset in production throughout this step.

**Why `feature_disabled` logs are not noisy in production:**
The frontend reads `/api/config` on page load and sets `_useRdsPackages` / `_useRdsInvoices` / `_useRdsProfile` to `false` when flags are off. The frontend then calls the legacy endpoints directly — it never calls the RDS endpoints. The server-side `feature_disabled` gate fires only on direct API calls (e.g., curl, admin testing), not on normal user page loads.

**Development verification path:**
In the development environment, `USE_RDS_PACKAGES_FRONTEND=true` etc. are set (per `.replit` `userenv.development`). Loading a portal page in dev exercises the full RDS path and produces `[RDS-EVENT] flag=enabled result=success ...` lines in the `Start application` workflow console. The `window.__crboxLastRdsFallback` sentinel is inspectable in browser DevTools.

**Syntax verification:**
The `Start application` workflow was restarted after all edits to confirm Python parses server.py without errors.

---

## 6. No Flags / Env / Secrets / Database Data Changed

- No environment variables created, modified, or deleted
- No secrets accessed or changed
- No DNS or deployment configuration changed
- No database rows read, inserted, updated, or deleted by this change
- `_rds_emit_log()` calls only `print()` — no DB interaction of any kind

---

## 7. No RDS Writes Introduced

All three handlers are read-only by design. This step adds only:
- `time.monotonic()` timing calls (CPU only)
- `_rds_emit_log()` calls that invoke only `print()` (stdout only)
- A `_recibos_ok` boolean variable in `_handle_portal_invoices_rds`

No INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, GRANT, or REVOKE statements exist in any of the three handlers before or after this change.

---

## Safety Comment Added to All Three Handlers

```python
# ── RDS portal read-path safety ───────────────────────────────────────────
# This handler is READ-ONLY by design. It must never execute INSERT, UPDATE,
# DELETE, DROP, ALTER, CREATE, TRUNCATE, GRANT, REVOKE, or any schema/data
# mutation. If a broad-permission DB user is temporarily used by business
# decision, this code path must remain strictly read-only. Any future RDS
# write service requires separate design review and approval.
# ─────────────────────────────────────────────────────────────────────────
```
