# RDS Frontend Logging Instrumentation Plan

**Status:** Planning document — no production code changed.  
**Prepared:** 2026-05-14  
**Scope:** `server.py` (`_handle_portal_my_packages`, `_handle_portal_invoices_rds`, `_handle_portal_profile_rds`), `js/portal-api.js` (`getPackagesRDS`, `getBillsRDS`, `getProfileRDS`), and page-level fallback callers in `mis-paquetes.html`, `mis-facturas.html`, `mi-cuenta.html`.

---

## Section 1 — Gap Analysis

Current logging across all three RDS frontend paths was reviewed against the gaps listed in the task brief. Each gap is classified as **Blocking**, **Recommended**, or **Future**.

### 1.1 Backend gaps (server.py)

| Gap | Handlers affected | Classification | Evidence |
|-----|------------------|----------------|---------|
| **No `duration_ms` timing** | All three (`MY-PACKAGES`, `PORTAL-INVOICES-RDS`, `PORTAL-PROFILE-RDS`) | **Blocking** | No `time.time()` start capture anywhere in the three handlers. Without timing, a slow RDS connection is invisible until a timeout fires. |
| **No structured JSON log output** | All three | **Blocking** | All existing log lines use plain `print(f"[MODULE] text: {exc}")`. Machine parsing (grep, log aggregator, alert rules) is unreliable against free-form strings. |
| **No success log line** | All three | **Blocking** | When a request completes normally (200 OK), nothing is printed. Errors can be observed but healthy traffic cannot. This makes a silent data regression undetectable from logs alone. |
| **No `fallback_reason` propagation** | All three | **Blocking** | The 503 `feature_disabled` and 502 `rds_error` responses carry a `code` field in the JSON body, but no server-side log records *why* the 503 or 502 was emitted. The frontend never sends its fallback reason back to the server. |
| **No `db_guard_result: pass` log on success** | `MY-PACKAGES`, `PORTAL-INVOICES-RDS` (implicit via `_rds_query_invoices`) | **Recommended** | When the database guard passes (active DB matches `EXPECTED_RDS_DATABASE`), nothing is logged. Only the failure path is observable. |
| **Unsanitized `{exc}` interpolation** | All three | **Blocking** | `print(f'[MY-PACKAGES] query error: {exc}')`, `print(f'[PORTAL-INVOICES-RDS] RDS error: {exc}')`, `print(f'[PORTAL-INVOICES-RDS] recibos batch query failed (degraded): {exc}')`, `print(f'[PORTAL-PROFILE-RDS] wrong database: {exc}')`, `print(f'[PORTAL-PROFILE-RDS] RDS error: {exc}')`. Depending on the exception class, `str(exc)` can include DB connection strings with hostnames and credentials, SQL query fragments with parameter values, or email addresses. This is a data-exposure risk. |
| **Inconsistent module labels** | All three | **Recommended** | `[MY-PACKAGES]` (two words) vs `[PORTAL-INVOICES-RDS]` vs `[PORTAL-PROFILE-RDS]`. Makes grep-based alerting require three separate patterns. A unified `[RDS-FRONTEND]` prefix with a per-event `module` field would simplify filtering. |
| **No `error_type` / exception class classification** | All three | **Recommended** | Errors are logged as raw exception text only. There is no structured distinction between `OperationalError` (connectivity), `ProgrammingError` (schema mismatch), `TimeoutError`, or `_RdsWrongDatabaseError`. |
| **No request-level `request_id`** | All three | **Future** | No per-request trace ID is generated or propagated. Cross-referencing a backend error with a frontend console.debug line is currently impossible without wall-clock timestamp correlation. |
| **No `environment` field in logs** | All three | **Future** | Logs from a Replit dev container and from a production deployment are indistinguishable by log content alone. |

### 1.2 Frontend gaps (portal-api.js)

| Gap | Functions affected | Classification | Evidence |
|-----|--------------------|----------------|---------|
| **No `rdsErrorCategory` / `fallbackReason` on non-auth errors** | `getPackagesRDS`, `getBillsRDS`, `getProfileRDS` | **Blocking** | Non-auth errors are thrown with `isAuthError=false` and `_rdsStatus` (HTTP status), but no structured category or human-readable reason is attached. The page-level `.catch` receives only `err.message` — a raw English string — which it logs via `console.debug`. |
| **`console.debug` swallows the error object** | `mis-paquetes.html`, `mis-facturas.html`, `mi-cuenta.html` | **Recommended** | `console.debug('[CRBOX] RDS packages failed, falling back to legacy:', rdsErr && rdsErr.message)` logs only the `.message` string, not the error category, status, or any structured field. |
| **No fallback timing** | All three page callers | **Recommended** | The time between the RDS attempt failing and the legacy call completing is not recorded. There is no way to know whether the fallback adds latency for the user. |
| **No PII/sensitive data risk at present — but no explicit guard either** | All three | **Future** | No tracking numbers, invoice numbers, or email addresses appear in current console logs. However, there is no explicit `safeLog` wrapper that would prevent a future developer from accidentally adding such fields. |

### 1.3 Summary counts

- **Blocking:** 6 gaps (5 backend + 1 frontend — must be fixed before enabling any frontend flag)
- **Recommended:** 5 gaps (3 backend + 2 frontend — should be fixed in the same logging PR)
- **Future:** 3 gaps (2 backend + 1 frontend — nice-to-have; a separate, lower-priority task)

---

## Section 2 — File and Function Change Table

Every file and function that will require instrumentation changes, with the exact code path and risk level.

| File | Function / location | Code path | Change needed | Risk | QA needed |
|------|--------------------|-----------|-----------|----|---------|
| `server.py` | `_handle_portal_my_packages` | Request entry (before flag gate) | Capture `t0 = time.monotonic()` | Low | Verify `t0` is defined before any `return` |
| `server.py` | `_handle_portal_my_packages` | Flag disabled (line ~13661) | Emit structured `feature_disabled` log | Low | Check log emitted on 503 response |
| `server.py` | `_handle_portal_my_packages` | Auth failure (line ~13671) | Emit structured `auth_error` log | Low | Check log emitted on 401 response |
| `server.py` | `_handle_portal_my_packages` | DB guard pass (line ~13755 inline) | Emit structured `db_guard_result: pass` log | Low | Check log present when guard passes |
| `server.py` | `_handle_portal_my_packages` | DB guard fail (`_RdsWrongDatabaseError`, line ~13803) | Replace raw `{exc}` with sanitized class name | **Medium** | Confirm no DB connection string in output |
| `server.py` | `_handle_portal_my_packages` | RDS query error (`except Exception`, line ~13809) | Replace raw `{exc}` with `type(exc).__name__` + allowlist message | **Medium** | Confirm no SQL fragment or email in output |
| `server.py` | `_handle_portal_my_packages` | Success (line ~13844) | Emit structured success log with `count`, `duration_ms` | Low | Verify log present on 200 response |
| `server.py` | `_handle_portal_invoices_rds` | Request entry | Capture `t0` | Low | As above |
| `server.py` | `_handle_portal_invoices_rds` | Flag disabled (line ~14025) | Emit structured `feature_disabled` log | Low | As above |
| `server.py` | `_handle_portal_invoices_rds` | Auth failure (line ~14033) | Emit structured `auth_error` log | Low | As above |
| `server.py` | `_handle_portal_invoices_rds` | DB guard fail (`_RdsWrongDatabaseError`, line ~14090) | Sanitize `{exc}` | **Medium** | As above |
| `server.py` | `_handle_portal_invoices_rds` | RDS main query error (`except Exception`, line ~14096) | Sanitize `{exc}` | **Medium** | As above |
| `server.py` | `_handle_portal_invoices_rds` | Recibos batch error (line ~14110) | Sanitize `{exc}`, add `degraded: true` flag in log | **Medium** | As above |
| `server.py` | `_handle_portal_invoices_rds` | Success (line ~14123) | Emit structured success log with `count`, `duration_ms` | Low | Verify log on 200 response |
| `server.py` | `_handle_portal_profile_rds` | Request entry | Capture `t0` | Low | As above |
| `server.py` | `_handle_portal_profile_rds` | Flag disabled (line ~14156) | Emit structured `feature_disabled` log | Low | As above |
| `server.py` | `_handle_portal_profile_rds` | Auth failure (line ~14166) | Emit structured `auth_error` log | Low | As above |
| `server.py` | `_handle_portal_profile_rds` | DB guard fail (`_RdsWrongDatabaseError`, line ~14181) | Sanitize `{exc}` | **Medium** | As above |
| `server.py` | `_handle_portal_profile_rds` | RDS query error (`except Exception`, line ~14187) | Sanitize `{exc}` | **Medium** | As above |
| `server.py` | `_handle_portal_profile_rds` | Success (line ~14220) | Emit structured success log with `duration_ms` | Low | Verify log on 200 response |
| `js/portal-api.js` | `getPackagesRDS` (line ~470) | Non-auth error throw | Attach `rdsErrorCategory` + `fallbackReason` to thrown error | Low | Confirm fields present on caught error in page |
| `js/portal-api.js` | `getBillsRDS` (line ~587) | Non-auth error throw | Attach `rdsErrorCategory` + `fallbackReason` | Low | As above |
| `js/portal-api.js` | `getProfileRDS` (line ~987) | Non-auth error throw | Attach `rdsErrorCategory` + `fallbackReason` | Low | As above |
| `mis-paquetes.html` | RDS fallback catch (line ~2764) | Fallback invoked | Log `rdsErr.rdsErrorCategory` + `rdsErr.fallbackReason` instead of bare `rdsErr.message` | Low | Verify structured fields in console |
| `mis-facturas.html` | RDS fallback catch (line ~1123) | Fallback invoked | Log `rdsErr.rdsErrorCategory` + `rdsErr.fallbackReason` | Low | As above |
| `mi-cuenta.html` | RDS fallback catch (line ~1361) | Fallback invoked | Log `rdsErr.rdsErrorCategory` + `rdsErr.fallbackReason` | Low | As above |

---

## Section 3 — Safe Log Schema

### 3.1 Allowed JSON fields

All structured log lines MUST be emitted as a single `print(json.dumps({...}))` call using only the fields from this allowlist. Frontend console logs MUST use only the corresponding subset.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ts` | ISO-8601 string | Yes | UTC timestamp at log emission. Backend: `datetime.utcnow().isoformat() + 'Z'`. |
| `event` | string | Yes | Dot-namespaced event name, e.g. `rds.packages.success`, `rds.packages.error`, `rds.packages.feature_disabled`. |
| `module` | string | Yes | Consistent short label. Use `rds.packages`, `rds.invoices`, `rds.profile`. |
| `endpoint` | string | Yes | URL path without query string. E.g. `/api/portal/my-packages`. |
| `status_code` | int | Yes (on response) | HTTP status code of the response being sent. |
| `duration_ms` | int | Yes (on success/error) | `round((time.monotonic() - t0) * 1000)`. Always an integer milliseconds. |
| `flag_state` | bool | Yes | Value of the relevant `USE_RDS_*_FRONTEND` env var at time of request. |
| `source` | string | Yes (on success) | Always `"rds"` for these endpoints. |
| `fallback_triggered` | bool | Frontend only | `true` when the page fell back to the legacy path. |
| `fallback_reason` | string | Frontend only (when `fallback_triggered: true`) | Short enum string from the allowlist: `feature_disabled`, `rds_error`, `schema_error`, `timeout`, `network`, `unknown`. |
| `error_type` | string | On error | Sanitized exception class name only (see Section 6). |
| `db_guard_result` | string | On guard check | `"pass"` when guard succeeds; guard failure is already an error path. |
| `count` | int | On success (packages/invoices) | Number of rows returned. |
| `environment` | string | Future | `"production"` or `"development"`. Not required in initial implementation. |
| `request_id` | string | Future | Per-request UUID. Not required in initial implementation. |

### 3.2 Forbidden fields

The following fields MUST NEVER appear in any log line, regardless of context:

| Forbidden field / pattern | Reason |
|--------------------------|--------|
| `email` / `verified_email` / `X-Casillero-Email` header value | Direct PII — email address |
| `idConsignee` / `id_consignee` / `cas_id` | Internal account identifier — see ruling below |
| `token` / `Authorization` header value | Authentication credential |
| Raw exception text: `str(exc)` / `f"... {exc}"` | Can contain DB connection strings, SQL with parameter values, hostnames with credentials |
| `trackingNumber` / tracking number values | Package-level PII |
| Invoice numbers / `factura` field values | Financial PII |
| SQL query fragments or parameter values | Operational security |
| Full stack traces | May contain DB hostnames, SQL, or local file paths |
| Any field from the `consignee` table beyond `idConsignee` | Direct PII |

### 3.3 Ruling on `idConsignee`

**`idConsignee` MUST NOT appear in frontend RDS log lines (backend or browser).**

Justification:
1. `idConsignee` is the CRBOX portal's primary account identifier. Combined with a timestamp and endpoint path, it allows correlation of an individual user's activity across log lines — i.e. it is a unique, persistent user-level identifier.
2. The security model for these endpoints deliberately avoids sending `idConsignee` from the browser (`getPackagesRDS`, `getBillsRDS`, and `getProfileRDS` never include it in requests). Logging it server-side would re-introduce the identifier into an output channel (logs) that may have broader access than the application tier.
3. The aggregate `count` field (number of rows returned) is sufficient for operational monitoring without identifying any individual user.
4. The only place `idConsignee` is appropriate is in the admin/shadow-compare endpoints, which are separately auth-gated and not covered by this plan.

**Decision:** `idConsignee` is **excluded** from all log output covered by this plan. It may not appear in `print()` calls, `console.log()` calls, GA4 events, or any other logging destination within the three RDS frontend handlers and their corresponding frontend callers.

---

## Section 4 — Backend Instrumentation Plan

All examples below use fake/safe values. All log lines are emitted as `print(json.dumps({...}))`. Raw exception text is never logged; only the sanitized exception class name is used (see Section 6).

### 4.1 `_handle_portal_my_packages`

**Request start** (add immediately after function entry, before flag gate):
```json
{"ts": "2026-05-14T10:00:00.000Z", "event": "rds.packages.request_received", "module": "rds.packages", "endpoint": "/api/portal/my-packages", "flag_state": true}
```

**Feature disabled** (replaces silent 503):
```json
{"ts": "2026-05-14T10:00:00.001Z", "event": "rds.packages.feature_disabled", "module": "rds.packages", "endpoint": "/api/portal/my-packages", "status_code": 503, "flag_state": false, "duration_ms": 1}
```

**Auth error** (replaces implicit 401 with no log):
```json
{"ts": "2026-05-14T10:00:00.005Z", "event": "rds.packages.auth_error", "module": "rds.packages", "endpoint": "/api/portal/my-packages", "status_code": 401, "flag_state": true, "duration_ms": 5}
```

**DB guard pass** (new — add after guard check succeeds):
```json
{"ts": "2026-05-14T10:00:00.020Z", "event": "rds.packages.db_guard_pass", "module": "rds.packages", "endpoint": "/api/portal/my-packages", "db_guard_result": "pass", "flag_state": true}
```

**DB guard fail** (replaces `print(f'[MY-PACKAGES] wrong database: {exc}')`):
```json
{"ts": "2026-05-14T10:00:00.022Z", "event": "rds.packages.error", "module": "rds.packages", "endpoint": "/api/portal/my-packages", "status_code": 503, "error_type": "RdsWrongDatabaseError", "flag_state": true, "duration_ms": 22}
```

**RDS query error** (replaces `print(f'[MY-PACKAGES] query error: {exc}')`):
```json
{"ts": "2026-05-14T10:00:00.350Z", "event": "rds.packages.error", "module": "rds.packages", "endpoint": "/api/portal/my-packages", "status_code": 502, "error_type": "OperationalError", "flag_state": true, "duration_ms": 350}
```

**Success**:
```json
{"ts": "2026-05-14T10:00:00.180Z", "event": "rds.packages.success", "module": "rds.packages", "endpoint": "/api/portal/my-packages", "status_code": 200, "source": "rds", "count": 12, "flag_state": true, "duration_ms": 180}
```

### 4.2 `_handle_portal_invoices_rds`

Same structure as packages. Additional path: recibos batch failure (degraded response, still 200):
```json
{"ts": "2026-05-14T10:00:00.290Z", "event": "rds.invoices.recibos_degraded", "module": "rds.invoices", "endpoint": "/api/portal/invoices-rds", "error_type": "OperationalError", "flag_state": true}
```

**Success**:
```json
{"ts": "2026-05-14T10:00:00.310Z", "event": "rds.invoices.success", "module": "rds.invoices", "endpoint": "/api/portal/invoices-rds", "status_code": 200, "source": "rds", "count": 4, "flag_state": true, "duration_ms": 310}
```

### 4.3 `_handle_portal_profile_rds`

Same structure as packages. Profile has no `count` field (single-user response):
```json
{"ts": "2026-05-14T10:00:00.140Z", "event": "rds.profile.success", "module": "rds.profile", "endpoint": "/api/portal/profile-rds", "status_code": 200, "source": "rds", "flag_state": true, "duration_ms": 140}
```

**RDS not found (authenticated user absent from RDS — triggers 503 fallback):**
```json
{"ts": "2026-05-14T10:00:00.098Z", "event": "rds.profile.not_found", "module": "rds.profile", "endpoint": "/api/portal/profile-rds", "status_code": 503, "error_type": "RdsEmailNotFoundError", "flag_state": true, "duration_ms": 98}
```

### 4.4 Raw exception text constraint

Every `except Exception as exc:` block in all three handlers must be updated. The pattern `str(exc)` and f-string `{exc}` are both forbidden. The only safe alternative:

```python
_safe_type = type(exc).__name__
```

`_safe_type` is the only exception-derived value that may appear in a log line. See Section 6 for the full sanitization plan.

---

## Section 5 — Frontend Fallback Instrumentation Plan

### 5.1 `portal-api.js` — error category attachment

Each of the three RDS functions (`getPackagesRDS`, `getBillsRDS`, `getProfileRDS`) currently throws errors with `isAuthError=false` and sometimes `_rdsStatus`. A future implementation must add `rdsErrorCategory` and `fallbackReason` to every non-auth error before re-throwing it.

The mapping from HTTP status / exception type to `fallbackReason` (a safe enum, no user data):

| Condition | `rdsErrorCategory` | `fallbackReason` |
|-----------|-------------------|-----------------|
| HTTP 503 response from server | `feature_disabled` | `feature_disabled` |
| HTTP 5xx other than 503 | `server_error` | `rds_error` |
| JSON parse failure | `schema_error` | `schema_error` |
| Unexpected response shape / missing array | `schema_error` | `schema_error` |
| `AbortError` / timeout | `timeout` | `timeout` |
| Network error (no response) | `network` | `network` |
| Catch-all | `unknown` | `unknown` |

These fields contain no PII, no tracking numbers, no invoice numbers, and no internal identifiers.

### 5.2 Page-level fallback callers

Each page's fallback `.catch` block must be updated to log the structured fields instead of `rdsErr.message`.

**Current pattern (all three pages):**
```javascript
console.debug('[CRBOX] RDS packages failed, falling back to legacy:', rdsErr && rdsErr.message);
```

**Planned pattern:**
```javascript
console.debug('[CRBOX:rds] packages fallback', {
  fallbackReason: (rdsErr && rdsErr.fallbackReason) || 'unknown',
  rdsErrorCategory: (rdsErr && rdsErr.rdsErrorCategory) || 'unknown',
  status: (rdsErr && rdsErr._rdsStatus) || null
});
```

No user data, tracking numbers, email addresses, or `idConsignee` values appear in this log.

### 5.3 Auth error behavior (current behavior is correct — no change needed)

Auth errors (`isAuthError=true`) are already propagated directly:
```javascript
if (rdsErr && rdsErr.isAuthError) throw rdsErr; // auth — do not fall back
```
`_handleAuthFailure` clears the session and redirects to `login.html?msg=session-expired`. This behavior is correct and must not be changed. Auth errors must NEVER trigger a fallback to the legacy path.

### 5.4 Recommended logging destination

**Browser `console.debug` only** — for RDS fallback events.

Rationale:
- `console.debug` is suppressed by default in production DevTools; a user watching the console actively must have enabled verbose level.
- GA4/GTM is not appropriate for fallback events: these are operational signals, not user behavior events. Adding fallback counts to GA4 requires careful schema review and risks creating a misleading "error rate" metric that doesn't reflect user-visible failures (because fallback is transparent).
- Server-side reporting of client-side fallback events (sending a beacon back to `/api/log`) introduces a new attack surface and complexity. This is a Future improvement that requires a separate security review.

**Verdict:** browser `console.debug` only for the initial implementation. Server-side aggregation of fallback events can be added as a follow-up task once the log schema is validated.

### 5.5 PII confirmation

No PII check failures found in the current fallback log paths. The planned structured fields (`fallbackReason`, `rdsErrorCategory`, `status`) are all safe. The following must remain absent from any console log call in the fallback path: email addresses, tracking numbers, invoice numbers, `idConsignee`.

---

## Section 6 — Exception Sanitization Plan

### 6.1 Sanitizer output (allowed)

A future `_safe_exc(exc)` helper (or inline equivalent) must produce one of:

1. **Exception class name only:** `type(exc).__name__`  
   Examples: `"OperationalError"`, `"ProgrammingError"`, `"InterfaceError"`, `"TimeoutError"`, `"ValueError"`, `"RdsWrongDatabaseError"`, `"RdsEmailNotFoundError"`

2. **Generic category** mapped from class name:
   | Class name contains | Category |
   |---------------------|----------|
   | `Operational` | `connectivity` |
   | `Programming` | `schema_mismatch` |
   | `Interface` | `driver_error` |
   | `Timeout` | `timeout` |
   | `NotFound` | `not_found` |
   | `WrongDatabase` | `wrong_database` |
   | anything else | `unknown_error` |

3. **Short safe message from a static allowlist** (not derived from `str(exc)`):
   - `"RDS connection failed"`
   - `"RDS query timed out"`
   - `"Unexpected database active"`
   - `"RDS schema mapping error"`
   - `"Email not found in RDS"`

### 6.2 Forbidden sanitizer output

| Pattern | Why forbidden |
|---------|--------------|
| `str(exc)` | Contains DB connection strings, SQL fragments, hostnames with credentials |
| `repr(exc)` | Same as above plus Python object details |
| `exc.args` | Connection string, SQL, or parameter values appear in args |
| `traceback.format_exc()` | Full stack trace with file paths and local variable values |
| Any f-string containing `{exc}` directly | Equivalent to `str(exc)` |
| `exc.__cause__` or `exc.__context__` stringified | Chained exception may expose underlying driver error |

### 6.3 Before / after for each current `{exc}` pattern

**Pattern 1 — `_handle_portal_my_packages` wrong database:**
```python
# BEFORE (forbidden)
print(f'[MY-PACKAGES] wrong database: {exc}')

# AFTER (safe)
print(json.dumps({"ts": _ts(), "event": "rds.packages.error",
    "module": "rds.packages", "endpoint": "/api/portal/my-packages",
    "status_code": 503, "error_type": type(exc).__name__,
    "flag_state": _flag, "duration_ms": _elapsed_ms(t0)}))
```

**Pattern 2 — `_handle_portal_my_packages` query error:**
```python
# BEFORE (forbidden)
print(f'[MY-PACKAGES] query error: {exc}')

# AFTER (safe)
print(json.dumps({"ts": _ts(), "event": "rds.packages.error",
    "module": "rds.packages", "endpoint": "/api/portal/my-packages",
    "status_code": 502, "error_type": type(exc).__name__,
    "flag_state": _flag, "duration_ms": _elapsed_ms(t0)}))
```

**Pattern 3 — `_handle_portal_invoices_rds` wrong database:**
```python
# BEFORE (forbidden)
print(f'[PORTAL-INVOICES-RDS] wrong database: {exc}')

# AFTER (safe)
print(json.dumps({"ts": _ts(), "event": "rds.invoices.error",
    "module": "rds.invoices", "endpoint": "/api/portal/invoices-rds",
    "status_code": 502, "error_type": type(exc).__name__,
    "flag_state": _flag, "duration_ms": _elapsed_ms(t0)}))
```

**Pattern 4 — `_handle_portal_invoices_rds` RDS error:**
```python
# BEFORE (forbidden)
print(f'[PORTAL-INVOICES-RDS] RDS error: {exc}')

# AFTER (safe)
print(json.dumps({"ts": _ts(), "event": "rds.invoices.error",
    "module": "rds.invoices", "endpoint": "/api/portal/invoices-rds",
    "status_code": 502, "error_type": type(exc).__name__,
    "flag_state": _flag, "duration_ms": _elapsed_ms(t0)}))
```

**Pattern 5 — `_handle_portal_invoices_rds` recibos degraded:**
```python
# BEFORE (forbidden)
print(f'[PORTAL-INVOICES-RDS] recibos batch query failed (degraded): {exc}')

# AFTER (safe)
print(json.dumps({"ts": _ts(), "event": "rds.invoices.recibos_degraded",
    "module": "rds.invoices", "endpoint": "/api/portal/invoices-rds",
    "error_type": type(exc).__name__, "flag_state": _flag}))
```

**Pattern 6 — `_handle_portal_profile_rds` wrong database:**
```python
# BEFORE (forbidden)
print(f'[PORTAL-PROFILE-RDS] wrong database: {exc}')

# AFTER (safe)
print(json.dumps({"ts": _ts(), "event": "rds.profile.error",
    "module": "rds.profile", "endpoint": "/api/portal/profile-rds",
    "status_code": 502, "error_type": type(exc).__name__,
    "flag_state": _flag, "duration_ms": _elapsed_ms(t0)}))
```

**Pattern 7 — `_handle_portal_profile_rds` RDS error:**
```python
# BEFORE (forbidden)
print(f'[PORTAL-PROFILE-RDS] RDS error: {exc}')

# AFTER (safe)
print(json.dumps({"ts": _ts(), "event": "rds.profile.error",
    "module": "rds.profile", "endpoint": "/api/portal/profile-rds",
    "status_code": 502, "error_type": type(exc).__name__,
    "flag_state": _flag, "duration_ms": _elapsed_ms(t0)}))
```

Helper signatures (to be defined once as module-level utility, not per-handler):

```python
import datetime as _dt, time as _time, json as _json

def _ts():
    return _dt.datetime.utcnow().isoformat() + 'Z'

def _elapsed_ms(t0):
    return round((_time.monotonic() - t0) * 1000)
```

---

## Section 7 — Before/After Log Examples

All values are fake. No real user data, tracking numbers, or identifiers are used.

### Example 1 — Successful packages response (RDS)

**Before** (nothing emitted on success path):
```
(silence)
```

**After:**
```json
{"ts": "2026-05-14T10:15:33.421Z", "event": "rds.packages.success", "module": "rds.packages", "endpoint": "/api/portal/my-packages", "status_code": 200, "source": "rds", "count": 7, "flag_state": true, "duration_ms": 94}
```

---

### Example 2 — Successful invoices response (RDS)

**Before** (silence):

**After:**
```json
{"ts": "2026-05-14T10:16:01.892Z", "event": "rds.invoices.success", "module": "rds.invoices", "endpoint": "/api/portal/invoices-rds", "status_code": 200, "source": "rds", "count": 3, "flag_state": true, "duration_ms": 211}
```

---

### Example 3 — Successful profile response (RDS)

**Before** (silence):

**After:**
```json
{"ts": "2026-05-14T10:17:44.003Z", "event": "rds.profile.success", "module": "rds.profile", "endpoint": "/api/portal/profile-rds", "status_code": 200, "source": "rds", "flag_state": true, "duration_ms": 133}
```

---

### Example 4 — Feature disabled fallback (packages flag is off)

**Before:**
```
(silence — the 503 is returned but nothing is logged)
```

**After:**
```json
{"ts": "2026-05-14T10:18:00.005Z", "event": "rds.packages.feature_disabled", "module": "rds.packages", "endpoint": "/api/portal/my-packages", "status_code": 503, "flag_state": false, "duration_ms": 1}
```

**Frontend fallback console.debug (mis-paquetes.html):**
```
[CRBOX:rds] packages fallback { fallbackReason: "feature_disabled", rdsErrorCategory: "feature_disabled", status: 503 }
```

---

### Example 5 — Wrong database guard triggered

**Before:**
```
[MY-PACKAGES] wrong database: 1049 (42000): Unknown database 'wrong_db_name_here'
```
*(exposes DB name in plain text)*

**After:**
```json
{"ts": "2026-05-14T10:19:05.047Z", "event": "rds.packages.error", "module": "rds.packages", "endpoint": "/api/portal/my-packages", "status_code": 503, "error_type": "RdsWrongDatabaseError", "flag_state": true, "duration_ms": 47}
```

---

### Example 6 — RDS connection error (packages)

**Before:**
```
[MY-PACKAGES] query error: (2003, "Can't connect to MySQL server on 'fake-rds-host.example.com' ([Errno 111] Connection refused)")
```
*(exposes hostname)*

**After:**
```json
{"ts": "2026-05-14T10:20:12.604Z", "event": "rds.packages.error", "module": "rds.packages", "endpoint": "/api/portal/my-packages", "status_code": 502, "error_type": "OperationalError", "flag_state": true, "duration_ms": 604}
```

---

### Example 7 — Schema mapping error (invoices)

**Before:**
```
[PORTAL-INVOICES-RDS] RDS error: 'NoneType' object is not subscriptable
```

**After:**
```json
{"ts": "2026-05-14T10:21:33.288Z", "event": "rds.invoices.error", "module": "rds.invoices", "endpoint": "/api/portal/invoices-rds", "status_code": 502, "error_type": "TypeError", "flag_state": true, "duration_ms": 288}
```

---

### Example 8 — Legacy fallback success (packages)

User transparently receives data from the legacy `getPackages` path. No server-side log is emitted for the legacy call (it is unchanged). Frontend console:

```
[CRBOX:rds] packages fallback { fallbackReason: "rds_error", rdsErrorCategory: "server_error", status: 502 }
```

Followed immediately by the existing success console.log from mis-paquetes.html line 2776:
```
[CRBOX mis-paquetes] getPackages raw response → type=array[5] keys=n/a [...]
```

---

## Section 8 — QA Checklist

### 8.1 Backend QA

- [ ] A `rds.*.success` log line is emitted for every successful 200 response from each of the three handlers.
- [ ] `duration_ms` is present in every log line that includes `status_code`.
- [ ] `duration_ms` is a positive integer (not `null`, not a float with many decimals, not negative).
- [ ] No raw exception text (`str(exc)`, `repr(exc)`, or any f-string `{exc}`) appears in any log line produced by the three handlers.
- [ ] No raw PII appears in any log line: no email addresses, no tracking numbers, no invoice numbers, no `idConsignee` values, no DB connection strings.
- [ ] `count` is present and is a non-negative integer in packages and invoices success logs.
- [ ] `error_type` is present and is a single class name string (no colon, no message text) in every error log.
- [ ] `db_guard_result: "pass"` is logged when the database guard passes for packages and invoices handlers.
- [ ] The `feature_disabled` event is logged when the relevant env var is absent or not `"true"`.
- [ ] Auth error log is emitted when `_portal_auth_full()` returns `(None, None)`.
- [ ] All log lines are valid JSON (parseable by `json.loads`).
- [ ] Module labels use the new consistent schema (`rds.packages`, `rds.invoices`, `rds.profile`) — old labels (`[MY-PACKAGES]`, `[PORTAL-INVOICES-RDS]`, `[PORTAL-PROFILE-RDS]`) no longer appear.

### 8.2 Frontend QA

- [ ] When RDS returns a non-auth error, the caught error object carries both `rdsErrorCategory` and `fallbackReason` as string properties.
- [ ] Auth errors (`isAuthError=true`) still redirect to `login.html?msg=session-expired` without triggering a fallback — this behavior must be unchanged.
- [ ] Non-auth RDS errors trigger the legacy fallback; the user sees their data (no blank screen, no error banner).
- [ ] The `console.debug` fallback log emits the structured object `{ fallbackReason, rdsErrorCategory, status }` — not a raw error message or any user data.
- [ ] `fallbackReason` value is one of: `feature_disabled`, `rds_error`, `schema_error`, `timeout`, `network`, `unknown`.
- [ ] No tracking numbers, invoice numbers, email addresses, or `idConsignee` values appear in any console output on the packages, invoices, or profile pages.
- [ ] No PII appears in any GA4/GTM event payload (check Network tab for requests to `google-analytics.com` and `googletagmanager.com`).

### 8.3 Regression QA

- [ ] All three data types still load correctly when the respective flags are `true` and RDS is healthy.
- [ ] All three data types still load correctly when the respective flags are `false` (flags-off path unchanged).
- [ ] All three data types still load correctly when RDS returns a non-auth error and the frontend falls back (data comes from legacy path, no user-visible disruption).
- [ ] The existing `console.log('[CRBOX mis-paquetes] getPackages raw response →', ...)` line continues to fire on both the RDS and legacy paths.
- [ ] No sensitive data is exposed on any code path (manually inspect browser console, network tab, and server logs after a test request).
- [ ] The `window.__crboxRdsProfileRaw` QA hook in `portal-api.js` continues to be set for RDS profile responses (no regression in dev QA tooling).

---

## Section 9 — Rollback Plan

### 9.1 If instrumentation causes issues

1. **Revert the commit** containing the logging changes. All three handlers and `portal-api.js` changes are in a single PR; a single `git revert` restores the prior state.
2. **Leave all three flags off** (`USE_RDS_PACKAGES_FRONTEND`, `USE_RDS_INVOICES_FRONTEND`, `USE_RDS_PROFILE_FRONTEND` remain unset or `false`). The frontend falls back to legacy automatically.
3. **Confirm legacy paths are working** by loading `mis-paquetes.html`, `mis-facturas.html`, and `mi-cuenta.html` and verifying data loads without error.
4. **Confirm no sensitive logs were emitted** by reviewing server logs for the window between deploy and revert:
   - Search for any line containing `@` (email), `idConsignee`, connection strings (`mysql://`, `host=`), or SQL fragments (`SELECT`, `WHERE`).
   - If found, proceed to Section 9.2.
5. **Document what went wrong** in a brief post-mortem note in `docs/`.

### 9.2 Incident procedure if PII was inadvertently logged

If a log line is found to contain email addresses, `idConsignee`, tracking numbers, invoice numbers, or DB connection strings:

1. **Immediately rotate any DB credentials** that appeared in logs.
2. **Delete or redact the log lines** from the logging provider (Replit console) if possible.
3. **Notify the project owner** (not via a public channel) with the exact lines affected.
4. **Do not re-enable any RDS flags** until the sanitization plan in Section 6 has been re-reviewed and the specific gap that caused the exposure has been closed.
5. **Update Section 6** of this document with the root cause and the new safeguard added.

---

## Section 10 — Monitoring Coverage Plan

Flags must be enabled **one at a time**, in order: packages first, then invoices, then profile. Never enable two simultaneously.

### 10.1 Who watches

The same person who enables the flag must be available for the full two-hour window. A second person must be on standby and reachable (message or call) during the window.

### 10.2 Monitoring protocol — packages flag (first)

**Pre-enablement (T-15 min):**
- Confirm `USE_RDS_PACKAGES_FRONTEND` is currently unset.
- Confirm server logs are streaming and readable.
- Note current baseline: number of log lines per minute.

**Enablement (T+0):**
- Set `USE_RDS_PACKAGES_FRONTEND=true`.
- Restart the application server.
- Load `mis-paquetes.html` in a test browser session (do not use a real customer session).

**Check cadence (T+0 to T+120):**
- Every 10 minutes: scan server logs for `rds.packages.error` events.
- Every 10 minutes: scan server logs for any line containing `@`, `idConsignee`, or connection string patterns.
- Every 30 minutes: check browser console for any PII in fallback logs.

**Log patterns to watch:**
```
# Good — expected
{"event": "rds.packages.success", ...}

# Investigate — fallback but not fatal
{"event": "rds.packages.feature_disabled", ...}

# Alert — RDS connectivity problem
{"event": "rds.packages.error", "error_type": "OperationalError", ...}

# STOP — PII in logs (should be impossible but must watch)
any line with "@" in log output from these handlers
```

**Thresholds that trigger immediate rollback:**
- Any log line containing PII.
- More than 3 `rds.packages.error` events in any 5-minute window.
- Any user-visible error banner on `mis-paquetes.html` (check via test session).
- `duration_ms` consistently above 2 000 ms (RDS connection saturated).
- Any JavaScript exception in browser console that was not present before enablement.

**Evidence to capture:**
- Screenshot of a successful `rds.packages.success` log line with `duration_ms`.
- Screenshot of the test session showing packages load correctly.
- Confirmation that no error appeared in the 2-hour window, or full incident report if rollback was triggered.

**Post-window documentation:**
- Add a dated entry to `docs/rds-packages-browser-qa-report.md` with: flag enable time, number of success/error events in window, median `duration_ms`, any anomalies.

### 10.3 Monitoring protocol — invoices flag (second, after packages is stable for ≥48 h)

Identical to packages protocol. Log patterns use `rds.invoices.*`. Browser page is `mis-facturas.html`. Post-window doc goes to `docs/rds-invoices-browser-qa-report.md`.

Do not enable invoices flag until:
- Packages flag has been stable for at least 48 hours with no rollbacks.
- The packages `rds.packages.success` log baseline is established and normal.

### 10.4 Monitoring protocol — profile flag (third, after invoices is stable for ≥48 h)

Identical to packages protocol. Log patterns use `rds.profile.*`. Browser page is `mi-cuenta.html`. Profile has no `count` field; success is confirmed by `"event": "rds.profile.success"` in logs and correct display of name and casillero number in the test session.

Do not enable profile flag until:
- Invoices flag has been stable for at least 48 hours.

---

## Section 11 — Final Recommendation

### 11.1 Summary of this document

This document describes the complete instrumentation work needed before enabling the three RDS frontend feature flags. It covers:

- **5 Blocking gaps** and 5 Recommended gaps found across `server.py` and `portal-api.js`.
- A **safe JSON log schema** with 15 explicitly allowed fields and a comprehensive forbidden-fields list.
- An **explicit ruling** that `idConsignee` must not appear in any log line covered by this plan, with justification.
- **Before/after log examples** for every code path using only fake/safe values.
- A **QA checklist** covering backend (12 items), frontend (8 items), and regression (6 items).
- A **rollback plan** covering both normal revert and the PII-exposure incident procedure.
- A **2-hour monitoring protocol** for each flag, enabled one at a time in order.

### 11.2 Files and functions planned for future changes

| File | Function(s) |
|------|-------------|
| `server.py` | `_handle_portal_my_packages`, `_handle_portal_invoices_rds`, `_handle_portal_profile_rds` |
| `js/portal-api.js` | `getPackagesRDS`, `getBillsRDS`, `getProfileRDS` |
| `mis-paquetes.html` | RDS fallback `.catch` block (~line 2764) |
| `mis-facturas.html` | RDS fallback `.catch` block (~line 1123) |
| `mi-cuenta.html` | RDS fallback `.catch` block (~line 1361) |

### 11.3 Gaps found

| Type | Count | Blocking | Recommended | Future |
|------|-------|----------|-------------|--------|
| Backend (server.py) | 10 | 5 | 3 | 2 |
| Frontend (portal-api.js + HTML) | 4 | 1 | 2 | 1 |
| **Total** | **14** | **6** | **5** | **3** |

### 11.4 Schema

Defined in Section 3. Key decisions:
- All backend log lines emitted as `print(json.dumps({...}))` (machine-parseable).
- Frontend fallback events logged via `console.debug` only (browser console, not server-side, not GA4).
- `idConsignee` excluded from all log output.
- Raw exception text (`str(exc)`, f-string `{exc}`) entirely replaced with `type(exc).__name__`.

### 11.5 Recommendation

**Recommendation B: Implement the listed small logging changes before enabling the frontend RDS flags.**

The blocking gaps — particularly the unsanitized `{exc}` interpolation in all three handlers and the total absence of success log lines — represent meaningful risk. Without success logs, a silent data regression cannot be detected by monitoring alone. Without exception sanitization, a future RDS connectivity error could expose a DB hostname or connection string in production logs.

None of the changes required are large or risky in isolation. The total implementation scope is:
- 7 `print()` call replacements in `server.py` (the forbidden `{exc}` patterns).
- 6 new structured `print(json.dumps(...))` log lines in `server.py` (success + feature_disabled + auth_error).
- 3 helper functions (`_ts`, `_elapsed_ms`, and optionally `_safe_exc`) defined once in `server.py`.
- 3 small error-object enrichments in `portal-api.js` (`rdsErrorCategory` + `fallbackReason`).
- 3 one-line `console.debug` updates in the HTML fallback catch blocks.

This work can be completed in a single focused PR and verified with the QA checklist in Section 8 before any flag is enabled. Enabling any flag before this work is done is not recommended.
