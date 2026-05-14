# RDS Portal Observability & Fallback Monitoring Plan

**Status:** Pre-production planning document — no production flags changed.  
**Scope:** Packages, invoices, and profile modules; `/api/config` flag endpoint; `EXPECTED_RDS_DATABASE` guard.  
**Last reviewed:** May 2026

---

## 1. Current Activation Model

### 1.1 Feature Flags

Four environment variables control activation. All default to disabled (unset or any value other than `"true"`).

| Variable | Controls | Default | Where checked |
|---|---|---|---|
| `USE_RDS_PORTAL_API` | Admin shadow/compare endpoints + admin diagnostic tools | disabled | `_rds_admin_gate()`, `_handle_portal_packages_rds()`, compare handlers |
| `USE_RDS_PACKAGES_FRONTEND` | `/api/portal/my-packages` (portal-user-facing) | disabled | `_handle_portal_my_packages()` |
| `USE_RDS_INVOICES_FRONTEND` | `/api/portal/invoices-rds` (portal-user-facing) | disabled | `_handle_portal_invoices_rds()` |
| `USE_RDS_PROFILE_FRONTEND` | `/api/portal/profile-rds` (portal-user-facing) | disabled | `_handle_portal_profile_rds()` |

**Evaluation rule:** Each flag is read at request time via `os.environ.get(FLAG, '').strip().lower() == 'true'`. Changes take effect immediately without a server restart.

**`/api/config` endpoint:** A public, unauthenticated GET endpoint that reads the three frontend flags and returns them as `featureFlags.useRdsPackages`, `featureFlags.useRdsInvoices`, and `featureFlags.useRdsProfile`. No secrets or operational state are exposed. The frontend (`portal-api.js`) may call this endpoint to decide which data path to use.

### 1.2 EXPECTED_RDS_DATABASE Guard

`EXPECTED_RDS_DATABASE` is a required safety env var. Before every RDS data query, `server.py` runs `SELECT DATABASE() AS db` and compares the result against this env var. If the env var is unset **or** the active database does not match, the query is aborted immediately and a `503 unexpected_database` is returned. This prevents accidental queries against a wrong RDS environment (e.g. dev schema connected to production secrets).

This guard is enforced independently inside every RDS handler (`_handle_portal_my_packages`, the `_rds_query_packages` helper, `_rds_query_invoices`, `_rds_query_profile`, and the admin shadow endpoints). It raises `_RdsWrongDatabaseError`, which every caller catches and logs before returning a safe 503.

### 1.3 Legacy Fallback Paths

**Packages (`getPackagesRDS` in `portal-api.js`):**  
The frontend calls `getPackagesRDS()` first when `featureFlags.useRdsPackages` is true. On any non-auth error (network, 5xx, wrong-database 503, etc.), the caller falls back to `getPackages()` → `getuserpackages` legacy API. On 401/403, `error.isAuthError = true` is set and the session is terminated; no fallback to legacy occurs.

**Invoices (`getBillsRDS` in `portal-api.js`):**  
Same contract. `getBillsRDS()` is called first; any non-auth failure allows fallback to `getBills()` → `getfacturas` legacy API.

**Profile (`getProfileRDS` in `portal-api.js`):**  
`getProfileRDS()` is called first; any non-auth failure (including 503 `rds_not_found` when the user has no RDS record) allows fallback to `getUserInfo()` → `getuserinfo` legacy API.

**Auth error behavior:** All three RDS functions in `portal-api.js` handle 401/403 via `_handleAuthFailure()`, which clears the session token and redirects to `login.html?msg=session-expired`. This redirect is unconditional — no fallback to legacy is attempted after an auth failure.

**Feature-disabled 503:** When a frontend flag is `false`, the RDS endpoint returns HTTP 503 with `code: "feature_disabled"`. The frontend interprets any non-auth failure as a signal to use legacy. No user-visible error is shown.

---

## 2. What Must Be Observable

### 2.1 Packages Module (`/api/portal/my-packages`)

| Event | Why it matters |
|---|---|
| Request received | Volume baseline; correlate with legacy call rate |
| Feature flag state at request time | Confirm flag is active when expected |
| Auth outcome (success / failure) | Distinguish auth problems from data problems |
| `EXPECTED_RDS_DATABASE` guard pass/fail | Safety boundary — any failure must be immediately visible |
| RDS connection success/failure | Connectivity health |
| Query duration (ms) | Latency baseline; detect regression |
| Row count returned | Data completeness signal |
| Empty-result for authenticated user | May indicate data sync gap |
| Fallback triggered (client-side) | Signal that RDS path is not serving users |
| Error type | Root-cause classification |

### 2.2 Invoices Module (`/api/portal/invoices-rds`)

| Event | Why it matters |
|---|---|
| Request received | Volume baseline |
| Feature flag state | Confirm activation state |
| Auth outcome | Distinguish from data errors |
| `EXPECTED_RDS_DATABASE` guard pass/fail | Safety boundary |
| RDS connection success/failure | Connectivity health |
| Invoice query duration (ms) | Latency; recibos join adds overhead |
| Recibos batch-query success/failure (degraded path) | Recibos failure is non-fatal but degrades the UI |
| Invoice count returned | Data completeness signal |
| Fallback triggered | Signal that RDS path is not serving users |
| Error type | Root-cause classification |

### 2.3 Profile Module (`/api/portal/profile-rds`)

| Event | Why it matters |
|---|---|
| Request received | Volume baseline |
| Feature flag state | Confirm activation state |
| Auth outcome | Session integrity |
| `EXPECTED_RDS_DATABASE` guard pass/fail | Safety boundary |
| RDS query success/failure | Connectivity health |
| Query duration (ms) | Latency baseline |
| `rds_not_found` (email not in RDS) | Data sync gap — user has portal account but no RDS record |
| Masking applied (PII confirmation) | Confirm masked fields were produced, not raw values |
| Fallback triggered | Signal that RDS path is not serving users |
| Error type | Root-cause classification |

### 2.4 `/api/config` Endpoint

| Event | Why it matters |
|---|---|
| Request received | Understand how often frontend re-reads flags |
| Flags returned | Confirm expected activation state is being served |

---

## 3. Logging Rules

### 3.1 What Is Allowed in Logs

The following fields may safely appear in any log line or structured log entry:

- `endpoint` — the request path (e.g. `/api/portal/my-packages`)
- `module` — short label: `packages` | `invoices` | `profile` | `config`
- `status_code` — HTTP response status integer
- `duration_ms` — integer milliseconds from request start to response
- `flag_state` — boolean value of the relevant feature flag at request time
- `fallback_triggered` — boolean; true when RDS path failed and legacy path is being used
- `fallback_reason` — enum string (see Section 5); only set when `fallback_triggered = true`
- `error_type` — one of the ten categories defined in Section 5
- `db_guard_result` — `"pass"` | `"fail"` | `"env_not_set"`
- `id_consignee` — the resolved integer casillero ID (safe; not a secret)
- `count` — integer row count returned
- `environment` — `"production"` | `"staging"` | `"development"`
- `source` — `"rds"` | `"legacy"` | `"proxy"`
- `request_id` (future) — correlation ID once instrumentation is added

### 3.2 What Is Forbidden in Logs

The following must **never** appear in any log line, structured log entry, or error message — even in truncated or partial form:

| Forbidden field | Why |
|---|---|
| Bearer tokens / JWT values | Credential exposure |
| Raw passwords or secrets | Credential exposure |
| Raw `identificationNumber` (cédula) | PII — government ID |
| Raw `phoneNumber` | PII |
| Full postal addresses | PII |
| Full names (first + last combined) | PII in context |
| Email addresses | PII — use only `id_consignee` or a hashed form for correlation |
| Tracking numbers | Business-sensitive; could expose shipment patterns |
| Invoice numbers (`factura`) | Business-sensitive |
| Full request/response payloads | May contain any of the above |
| `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD` values | Credential exposure |
| `EXPECTED_RDS_DATABASE` value in plain text | Exposes infrastructure topology |

**Masking rule for `id_consignee` in logs:** The numeric casillero ID (`idConsignee`) is safe to log because it is an internal sequence number with no independent external meaning. Do not log the email string that was used to resolve it.

---

## 4. Structured Log Format

All log entries should be emitted as a single JSON object per line to standard output (stdout). The prefix in square brackets identifies the subsystem for grep-based filtering.

### 4.1 Normal RDS Request (Success)

```json
{
  "ts": "2026-05-14T10:23:45.123Z",
  "module": "packages",
  "endpoint": "/api/portal/my-packages",
  "event": "rds_request_success",
  "status_code": 200,
  "duration_ms": 87,
  "flag_state": true,
  "db_guard_result": "pass",
  "id_consignee": 4821,
  "count": 14,
  "fallback_triggered": false,
  "environment": "production"
}
```

### 4.2 Fallback Event (RDS Failed, Legacy Served User)

This entry is emitted by the **frontend** (browser console) when `getPackagesRDS`, `getBillsRDS`, or `getProfileRDS` catches a non-auth error and re-calls the legacy path. A corresponding server-side entry (4.3 or 4.4) will have already been emitted for the failed RDS attempt.

```json
{
  "ts": "2026-05-14T10:24:01.887Z",
  "module": "packages",
  "event": "legacy_fallback_triggered",
  "fallback_triggered": true,
  "fallback_reason": "rds_connection_error",
  "rds_status": 502,
  "environment": "production"
}
```

### 4.3 Auth Error (Server-Side)

```json
{
  "ts": "2026-05-14T10:25:12.004Z",
  "module": "profile",
  "endpoint": "/api/portal/profile-rds",
  "event": "auth_error",
  "status_code": 401,
  "duration_ms": 312,
  "flag_state": true,
  "error_type": "auth_error",
  "fallback_triggered": false,
  "environment": "production"
}
```

### 4.4 Wrong-Database Guard Trigger

```json
{
  "ts": "2026-05-14T10:26:44.221Z",
  "module": "packages",
  "endpoint": "/api/portal/my-packages",
  "event": "wrong_database_guard_triggered",
  "status_code": 503,
  "duration_ms": 18,
  "flag_state": true,
  "db_guard_result": "fail",
  "error_type": "wrong_database",
  "fallback_triggered": false,
  "environment": "production"
}
```

Note: The active database name and the expected database name are **not** included in this log entry. Their presence in a log line would expose infrastructure topology. The fact that the guard fired is sufficient signal; the engineer investigating can inspect the env var directly in the secrets manager.

---

## 5. Error Classification

The following ten categories cover every failure mode across all three RDS modules.

### 5.1 `auth_error`

**Meaning:** The CRBOX API returned 401 or 403 when validating the user's Bearer token, or the token was absent. The session is definitively invalid.  
**User impact:** Immediate redirect to login. User must re-authenticate.  
**Alert?** Yes — if rate exceeds 5% of requests for 10 consecutive minutes. Isolated spikes are normal (expired sessions); sustained high rate may indicate a token validation outage.  
**Trigger rollback?** No — this is an auth infrastructure issue, not an RDS data issue. Disabling the RDS flag would not help.

### 5.2 `feature_disabled`

**Meaning:** The request arrived at an RDS endpoint while the corresponding feature flag is false. The server returned 503 intentionally.  
**User impact:** None — the frontend silently falls back to the legacy path. The user sees data normally.  
**Alert?** No — this is expected behavior. It appears in logs only as a confirmation that the flag is off.  
**Trigger rollback?** Not applicable — the feature is already disabled.

### 5.3 `wrong_database`

**Meaning:** `SELECT DATABASE()` returned a value that does not match `EXPECTED_RDS_DATABASE`, or `EXPECTED_RDS_DATABASE` is unset. Every query was aborted for safety.  
**User impact:** Packages/invoices/profile load from legacy path (if frontend flag is on and fallback works). If legacy also fails, the user sees an error state.  
**Alert?** **Immediate / critical.** A single occurrence in production is a P1 incident. It indicates either a misconfiguration, an infrastructure event (failover to wrong database), or a deployment error.  
**Trigger rollback?** **Yes, immediately.** Unset all three frontend flags (`USE_RDS_PACKAGES_FRONTEND`, `USE_RDS_INVOICES_FRONTEND`, `USE_RDS_PROFILE_FRONTEND`) until the root cause is identified and verified.

### 5.4 `rds_connection_error`

**Meaning:** The `rds_client` module could not establish a TCP connection to the RDS host. Typical causes: network ACL change, RDS instance restart, secret rotation not yet applied, or connectivity loss.  
**User impact:** All three modules fall back to legacy. Users are served normally as long as legacy is available.  
**Alert?** Yes — if sustained for more than 2 minutes. A brief burst (< 60 s) may be a transient restart; sustained means the instance is unreachable.  
**Trigger rollback?** Yes, if sustained beyond 5 minutes without a known infrastructure reason.

### 5.5 `rds_timeout`

**Meaning:** The RDS query started but did not return a result within the configured timeout. Causes: slow query due to missing index, lock contention, or oversized date window.  
**User impact:** Fallback to legacy. Users are served normally.  
**Alert?** Yes — if p95 response time exceeds 3 seconds for any module for 10 consecutive minutes. Investigate query plans; do not leave a slow query in production.  
**Trigger rollback?** If p95 exceeds 5 seconds for a module, disable that module's frontend flag until the query is optimized.

### 5.6 `schema_mapping_error`

**Meaning:** The RDS query succeeded but the response shape was unexpected: a required column was missing, a type was wrong, or an internal mapping function raised an exception. Likely cause: a schema change in RDS was not reflected in the server code.  
**User impact:** Fallback to legacy. Users are served normally.  
**Alert?** Yes — any occurrence of `schema_mapping_error` for a module that is in production (frontend flag enabled) must be investigated before the next deployment.  
**Trigger rollback?** Yes — if a `schema_mapping_error` is repeating (more than 3 occurrences in 5 minutes), disable the affected module's frontend flag. A schema mismatch will affect all users of that module.

### 5.7 `empty_result`

**Meaning:** RDS returned an empty list for a user who has data in the legacy system. This is not an error in the traditional sense — it may mean the user's records are not yet in the RDS database, or the date window does not match. The server returns HTTP 200 with `count: 0`.  
**User impact:** The user sees "no packages" or "no invoices" even though legacy would show records. This is a data-quality issue, not a system error.  
**Alert?** Monitor as a ratio — if more than 20% of authenticated requests for a module return count=0 when the same user has legacy data (detectable only in shadow compare), investigate the data sync.  
**Trigger rollback?** Yes — if shadow compare consistently shows countDelta > 0 (RDS returning fewer records than legacy for the same period), do not enable the frontend flag for that module until the sync is validated.

### 5.8 `legacy_fallback_success`

**Meaning:** The RDS call failed (for any non-auth reason) and the frontend successfully fell back to the legacy API. The user was served data via the legacy path.  
**User impact:** None — the user sees data normally, though the RDS path did not serve them.  
**Alert?** Track the **rate** of this event. If fallback rate exceeds 10% of requests for a module over a 10-minute window, investigate the root cause of the RDS failures.  
**Trigger rollback?** If fallback rate for a module exceeds 25% sustained for 10 minutes, disable that module's frontend flag.

### 5.9 `legacy_fallback_failure`

**Meaning:** The RDS call failed AND the subsequent legacy call also failed. The user saw an error state.  
**User impact:** The user cannot load their packages, invoices, or profile. They see an error message.  
**Alert?** **Immediate** — any sustained occurrence (more than 3 in 5 minutes for the same module) means users are blocked. This is a P2 incident.  
**Trigger rollback?** Yes — disable the affected module's frontend flag immediately. Investigate both the RDS failure and the legacy failure independently.

### 5.10 `unexpected_exception`

**Meaning:** An unhandled exception in the request handler that was not classified as one of the above. Caught by the outer `except Exception as exc` block in each handler.  
**User impact:** User receives a 502 error. If the frontend flag is enabled, fallback to legacy is attempted.  
**Alert?** Yes — any occurrence should be reviewed. A repeating `unexpected_exception` from the same module is a code defect.  
**Trigger rollback?** If repeating (more than 5 in 10 minutes from the same module), disable that module's frontend flag and file a bug.

---

## 6. Alerting Thresholds

The following rules should be implemented in whatever monitoring or log-query tool is in use. Thresholds are intentionally conservative — the RDS paths are new and trust must be established before relaxing them.

| Rule | Threshold | Severity | Action |
|---|---|---|---|
| `wrong_database` guard triggered | Any single occurrence in production | P1 / Critical | Page on-call immediately. Disable all three frontend flags. Do not re-enable until root cause is confirmed. |
| Overall RDS error rate (any module) | > 5% of requests for 10 continuous minutes | P2 / High | Investigate immediately. Disable the affected module's frontend flag if root cause is not identified within 15 minutes. |
| Fallback rate (any module) | > 10% of requests for 10 continuous minutes | P2 / High | Investigate. If root cause is not identified, disable the affected module's frontend flag. |
| `legacy_fallback_failure` | > 3 in 5 minutes for any module | P2 / High | Users are blocked. Disable the affected module's frontend flag immediately. |
| p95 response time (any module) | > 3 seconds for 10 continuous minutes | P3 / Medium | Performance review. Examine query plans. Disable flag if p95 exceeds 5 seconds. |
| `schema_mapping_error` (repeating) | > 3 in 5 minutes for any module | P2 / High | Likely schema drift. Disable the affected module's frontend flag. |
| `unexpected_exception` (repeating) | > 5 in 10 minutes from any module | P3 / Medium | Code defect. Disable the affected module's frontend flag. File a bug. |
| Raw PII detected in logs | Any occurrence | P1 / Critical | Stop logging immediately. Audit the log entries. Rotate any secrets that may have been captured. File an incident. |
| `rds_connection_error` | Sustained > 2 minutes | P2 / High | RDS connectivity issue. Disable all frontend flags if not resolved within 5 minutes. |

---

## 7. Rollback Triggers

### 7.1 Module-Level Rollback (Unset a Single Frontend Flag)

Unset `USE_RDS_PACKAGES_FRONTEND`, `USE_RDS_INVOICES_FRONTEND`, or `USE_RDS_PROFILE_FRONTEND` when **any** of the following conditions is true for that module:

1. A `wrong_database` guard trigger is observed.
2. Error rate exceeds 5% for 10 continuous minutes and root cause is not identified.
3. Fallback rate exceeds 25% for 10 continuous minutes.
4. `legacy_fallback_failure` rate exceeds 3 events in 5 minutes.
5. p95 response time exceeds 5 seconds for 10 continuous minutes.
6. Any repeating `schema_mapping_error` (more than 3 in 5 minutes).
7. Any repeating `unexpected_exception` (more than 5 in 10 minutes).
8. Shadow compare (run post-flag-enable) shows `countDelta > 0` consistently.
9. A known schema migration is in progress on the RDS database.

**How to disable:** Remove (or set to any value other than `"true"`) the relevant env var in Replit Secrets. The change takes effect on the next request — no restart required.

### 7.2 Master API Rollback (Unset `USE_RDS_PORTAL_API`)

Unset `USE_RDS_PORTAL_API` when:

1. A `wrong_database` guard triggers on an admin shadow/compare endpoint (separate from frontend endpoints, but uses the same guard).
2. The admin shadow-compare endpoints themselves begin returning errors that prevent validation work.
3. An infrastructure investigation requires isolating all RDS traffic.

Note: Unsetting `USE_RDS_PORTAL_API` does **not** affect the three frontend endpoints, which have their own flags. It only disables the admin diagnostic/shadow-compare tools and the admin-session-gated shadow packages endpoint.

### 7.3 Recovery Procedure

Before re-enabling any flag after a rollback:

1. Confirm the root cause is fully resolved and documented.
2. Verify `EXPECTED_RDS_DATABASE` matches the intended production database.
3. Run the production smoke checklist for the affected module (Section 8).
4. Re-enable the flag.
5. Monitor for 30 minutes at the thresholds in Section 6 before declaring the re-enable stable.

---

## 8. Production Smoke Checklist

These checks are to be run manually by the engineer enabling a frontend flag in production. Each item must pass before the module is considered live. Run immediately after setting the flag to `"true"`.

### 8.1 Pre-Activation (All Modules)

- [ ] Confirm `EXPECTED_RDS_DATABASE` is set and matches the intended production database name (check Replit Secrets).
- [ ] Confirm `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` are all set in Replit Secrets.
- [ ] Confirm `USE_RDS_PORTAL_API=true` (required for admin diagnostic tools to be available during rollout).
- [ ] Hit `GET /api/admin/rds-health` from the admin panel and confirm `status: "ok"`.
- [ ] Confirm `GET /api/config` returns the expected flag value (`true`) for the module being enabled.
- [ ] Open server logs. Confirm no `wrong_database` entries appear in the last 5 minutes.

### 8.2 Packages Module (`USE_RDS_PACKAGES_FRONTEND`)

- [ ] Log in to the portal as a test account that has known packages.
- [ ] Navigate to the packages page. Confirm packages load without an error banner.
- [ ] Confirm the data is visually consistent with what the legacy path would show (use shadow compare to verify ahead of time).
- [ ] Open the browser network tab. Confirm the successful request was to `/api/portal/my-packages` (not the legacy proxy).
- [ ] Verify the response contains `"source": "rds"` and `"count"` > 0 for the test account.
- [ ] Apply a status filter and confirm filtered results load correctly.
- [ ] Apply a tracking number prefix filter and confirm results are scoped correctly.
- [ ] Check server logs: confirm a successful `[MY-PACKAGES]` log entry appeared with no `wrong database` or `query error` lines.
- [ ] Log in as a test account that has **no** packages. Confirm the empty state renders cleanly (no error banner).
- [ ] Temporarily disconnect the test session (clear token). Confirm the page redirects to login (not a fallback to legacy).

### 8.3 Invoices Module (`USE_RDS_INVOICES_FRONTEND`)

- [ ] Log in as a test account that has known invoices.
- [ ] Navigate to the invoices page. Confirm invoices load without an error banner.
- [ ] Confirm invoice data (amounts, dates, factura numbers) is consistent with what the legacy path shows.
- [ ] Open browser network tab. Confirm the successful request was to `/api/portal/invoices-rds`.
- [ ] Verify the response contains `"source": "rds"` and `"count"` > 0.
- [ ] Confirm recibos (linked package receipts) are populated where expected, or confirm the degraded-mode (recibos = `—`) is acceptable if the recibos batch query had a prior known gap.
- [ ] Check server logs: confirm `[PORTAL-INVOICES-RDS]` log entry appeared with no `wrong database` or `RDS error` lines.
- [ ] Log in as a test account with no invoices. Confirm the empty state renders cleanly.

### 8.4 Profile Module (`USE_RDS_PROFILE_FRONTEND`)

- [ ] Log in as a test account that has a known profile.
- [ ] Navigate to the profile/account page. Confirm profile data loads without an error banner.
- [ ] Confirm name, branch, and masked ID number are displayed correctly.
- [ ] Confirm `identificationNumber` is displayed in masked form (`****XXXX`) — raw value must not appear.
- [ ] Confirm phone numbers are displayed in masked form (`****XXXX`) — raw values must not appear.
- [ ] Open browser network tab. Confirm the successful request was to `/api/portal/profile-rds`.
- [ ] Verify the response contains `"source": "rds"` and `profile.idConsignee` is a positive integer.
- [ ] Check server logs: confirm `[PORTAL-PROFILE-RDS]` log appeared with no `wrong database` or `RDS error` lines.
- [ ] Log in as a test account that exists in the CRBOX portal but is **not** yet in the RDS database. Confirm the page falls back silently to legacy (no error banner, profile still loads).

---

## 9. Dashboard / Reporting Recommendation

A simple log-query view should be configured to give the team a single-screen summary of RDS portal health. The following columns/panels are recommended for any log aggregation tool (e.g. Datadog, CloudWatch Logs Insights, Loki, or a manual grep-based script).

### 9.1 Recommended Dashboard Panels

| Panel | Query / Derivation |
|---|---|
| **Requests by module (last 1h)** | Count log entries where `event` is any of `rds_request_success`, `auth_error`, `rds_connection_error`, etc., grouped by `module` |
| **Success / error / fallback rate (%)** | Count by event type per module; compute percentages against total requests |
| **p50 / p95 response time by module** | Percentile of `duration_ms` grouped by `module` |
| **Last `wrong_database` event** | Most recent timestamp of any entry where `error_type = "wrong_database"` |
| **Last fallback event + reason** | Most recent entry where `fallback_triggered = true`, showing `fallback_reason` and module |
| **Top error type (last 1h)** | Most frequent `error_type` value across all modules |
| **Current flag state** | Poll `GET /api/config` every 5 minutes; display `featureFlags.useRdsPackages/Invoices/Profile` |
| **`db_guard_result` distribution** | Ratio of `pass` / `fail` / `env_not_set` across all requests |
| **`rds_not_found` rate (profile)** | Count of `rds_not_found` events for the profile module; indicates how many users have portal accounts but no RDS record |

### 9.2 Recommended Log Grep Patterns (Command-Line)

For teams using the Replit console log stream directly:

```bash
# Any wrong-database event
grep -E '\[MY-PACKAGES\].*wrong database|\[PORTAL-INVOICES-RDS\].*wrong database|\[PORTAL-PROFILE-RDS\].*wrong database'

# All RDS query errors
grep -E '\[MY-PACKAGES\].*query error|\[PORTAL-INVOICES-RDS\].*RDS error|\[PORTAL-PROFILE-RDS\].*RDS error'

# All RDS compare wrong-database events (admin endpoints)
grep -E '\[RDS-COMPARE\].*wrong database|\[RDS-INVOICES-COMPARE\].*wrong database|\[RDS-PROFILE-SHADOW\].*wrong database|\[RDS-PROFILE-COMPARE\].*wrong database'
```

---

## 10. Future Instrumentation Recommendations

The following code changes are recommended before any frontend flag is enabled in production. They are listed here for planning purposes only — **none are implemented by this document**.

### 10.1 Central Safe Logger Helper

Add a `_rds_log(module, event, **fields)` function in `server.py` that:
- Serializes only allow-listed fields (Section 3.1).
- Runs a PII sanitizer pass before emitting (see 10.6).
- Writes a single JSON line to stdout with a consistent prefix.
- Accepts an optional `request_id` field for correlation.

### 10.2 Consistent Module Labels

Every RDS handler should use a consistent `module` label (`"packages"`, `"invoices"`, `"profile"`, `"config"`) in all log output, replacing the current ad-hoc prefix strings (`[MY-PACKAGES]`, `[PORTAL-INVOICES-RDS]`, etc.). This makes log aggregation and alerting queries simpler and more reliable.

### 10.3 Correlation ID Per Request

Generate a short UUID or random hex token at the start of each request (`request_id`) and include it in all log entries for that request. This allows correlating the server-side log entries for a single request (e.g. the auth step, the db-guard step, the query step, the response step) without needing to rely on timestamps.

### 10.4 Duration Timing Wrapper

Capture `start_time = time.monotonic()` at the beginning of each RDS handler (after the flag check) and compute `duration_ms = int((time.monotonic() - start_time) * 1000)` before writing the final log entry. This is the only reliable way to populate the `duration_ms` field defined in Section 4.

### 10.5 Fallback Reason Enum

Define a `FallbackReason` enum (or string constants) in `server.py` (or document it for the frontend) with values matching the ten error categories in Section 5:
`auth_error`, `feature_disabled`, `wrong_database`, `rds_connection_error`, `rds_timeout`, `schema_mapping_error`, `empty_result`, `legacy_fallback_success`, `legacy_fallback_failure`, `unexpected_exception`.

The frontend should emit the `fallback_reason` string (from the caught error's `errorCategory` or a new `rdsErrorCategory` field) when it triggers the legacy fallback path.

### 10.6 No-PII Sanitizer

A lightweight sanitizer function that scans a dict for any key matching a deny-list (e.g. `email`, `phone`, `address`, `identification`, `token`, `password`, `factura`, `tracking`) and either removes the field or replaces the value with `"[REDACTED]"` before the log entry is emitted. Acts as a last-resort guardrail against accidentally logging a PII field.

### 10.7 Optional Admin-Only Health Endpoint

An authenticated (admin-session-gated) endpoint, e.g. `GET /api/admin/rds-portal-health`, that returns a real-time snapshot of: flag states, last-known `db_guard_result`, recent error counts per module (from an in-memory ring buffer), and `EXPECTED_RDS_DATABASE` value (without exposing credentials). This would give an on-call engineer a single endpoint to check during an incident.

---

## 11. Final A/B/C Recommendation (Two-Level)

### 11.1 Level 1 — Production Shadow Compare (No Frontend Flags Enabled)

**Definition of this phase:** `USE_RDS_PORTAL_API=true`, all three `USE_RDS_*_FRONTEND` flags remain `false`. Admin shadow-compare endpoints are active; no real users are served from RDS.

**Gap analysis:**

The current logging in `server.py` for this phase consists of unstructured prefix-based `print()` calls:
- `[RDS-PACKAGES] wrong database detected: {exc}`
- `[RDS-COMPARE] wrong database: {exc}` / `[RDS-COMPARE] RDS error: {exc}` / `[RDS-COMPARE] legacy HTTP {code}`
- `[RDS-INVOICES-COMPARE] wrong database: {exc}` / `[RDS-INVOICES-COMPARE] RDS error: {exc}`
- `[RDS-PROFILE-SHADOW] wrong database: {exc}` / `[RDS-PROFILE-COMPARE] wrong database: {exc}`
- `[RDS-HEALTH] connection failed: {exc}`
- `[RDS-TABLES] query failed: {exc}` / `[RDS-COLUMNS] query failed: {exc}` / `[RDS-COUNT] query failed: {exc}`

**What these logs provide:**
- Wrong-database events are consistently surfaced with the `wrong database` keyword — greppable.
- General RDS errors and legacy HTTP errors are surfaced — sufficient to detect failures during shadow testing.
- The shadow-compare response body itself contains structured data (`countDelta`, `statusIdDistribution`, `sample`, `legacyError`) that is the primary validation signal in this phase.

**What is missing:**
- No `duration_ms` — cannot detect slow queries during shadow testing.
- No `module` label or `event` classification — only prefix strings.
- No `db_guard_result: "pass"` confirmation — only failures are logged; successful guard passes are silent.
- No `count` returned in shadow endpoint logs.

**Verdict: A — Sufficient to proceed with production shadow compare**, with the following acceptance conditions:
1. At least one successful `[RDS-HEALTH] ok` is observed after connecting to production RDS.
2. Shadow compare responses show `countDelta = 0` or a documented, understood delta across a representative test set (≥ 10 diverse accounts, ≥ 3 date ranges).
3. No `wrong database` log entries appear during the shadow compare session.
4. Any `rds_error` or `legacy HTTP` entries in logs are explained and resolved before proceeding to Level 2.

The existing prefix-based console logs are adequate for the shadow phase because: (a) an admin is actively watching the output during shadow runs, (b) the shadow-compare endpoint response body provides structured diff data directly, and (c) the wrong-database guard log is greppable and immediately visible.

---

### 11.2 Level 2 — Production Frontend Flag Enablement

**Definition of this phase:** One or more of `USE_RDS_PACKAGES_FRONTEND`, `USE_RDS_INVOICES_FRONTEND`, `USE_RDS_PROFILE_FRONTEND` is set to `"true"`. Real portal users begin receiving data from RDS endpoints (with automatic legacy fallback on failure).

**Gap analysis:**

The stronger observability bar required for this phase — and the specific gaps in the current implementation — are:

| Required capability | Current state | Gap |
|---|---|---|
| `duration_ms` per request | Not measured or logged | **Missing.** No timing instrumentation exists anywhere in the RDS handlers. Without this, latency regressions are invisible until users complain. |
| Structured JSON log format | Unstructured `print()` strings | **Missing.** All current log output is free-form text. Log aggregation, alerting queries, and dashboard panels require a parseable format. |
| `fallback_reason` field | Not emitted by server or frontend | **Missing.** When a fallback occurs, there is currently no field in any log entry identifying *why* the fallback happened. The error category exists in the `_request()` catch chain in `portal-api.js` but is not propagated to any log output. |
| `module` label (consistent) | Ad-hoc prefix strings only | **Missing.** Each handler uses a different prefix string. Querying "all packages errors" requires knowing every prefix variant. A consistent `module` field enables simpler, reliable queries. |
| `db_guard_result: "pass"` logged | Only failures logged | **Gap.** In production, silent guard passes are acceptable during shadow compare (low volume) but should be confirmed in a log entry during the first hours of a live frontend flag to ensure the guard is running on every request. |
| No-PII audit of log output | Not audited | **Gap.** The existing log lines in the wrong-database and query-error handlers emit `{exc}` which may include connection strings, query fragments, or partial data depending on the exception type. These must be reviewed and sanitized before real user traffic is logged. |
| Error type classification in logs | Not present | **Missing.** Current log lines do not include an `error_type` field. Alerting rules (Section 6) require it. |
| Rollback trigger monitoring | Manual only | **Gap.** There is no automated check against the thresholds in Section 6. A human must watch logs. Until automated alerting is in place, a dedicated engineer must monitor logs during the initial flag-enable window (minimum 2 hours). |

**Verdict: B — Specific small logging improvements are required before any frontend flag is enabled in production.**

The minimum set of changes required before enabling any frontend flag:

1. **Add `duration_ms` timing** to each of the three frontend handlers (`_handle_portal_my_packages`, `_handle_portal_invoices_rds`, `_handle_portal_profile_rds`). Record `time.monotonic()` at the start of the handler (after the feature flag check) and emit elapsed time in the final log line for both success and error paths.

2. **Emit a structured success log line** for each successful RDS response — at minimum: module, event, status_code, duration_ms, count, db_guard_result. The current code emits nothing on success; this makes it impossible to compute a success rate from logs.

3. **Add `fallback_reason` propagation** in `portal-api.js`: when `getPackagesRDS`, `getBillsRDS`, or `getProfileRDS` catches a non-auth error and is about to fall back, emit a `console.warn` or structured log entry with the error category string. This is the only observable signal that a user was served by the legacy path.

4. **Sanitize `{exc}` in log lines** in the three frontend handlers. The current pattern `print(f'[PORTAL-PROFILE-RDS] RDS error: {exc}')` can emit database exception messages that may contain connection string fragments. Replace with a sanitized version that logs only the exception class name and a truncated, safe message.

5. **Dedicate a monitoring engineer** for the first 2 hours after enabling any frontend flag, watching for the alert conditions in Section 6. Automated alerting at the thresholds in Section 6 should be set up before any flag is enabled; if it is not in place, a human must substitute.

These five improvements are small in scope — changes to three handler functions in `server.py` and one addition in `portal-api.js`. They are not architectural changes. They can be implemented and reviewed in a single focused session.

Changes 1–4 are **blocking** for production frontend flag enablement. Change 5 (monitoring coverage) is an operational requirement, not a code change. Once all five are in place, a re-assessment against Section 6 thresholds should confirm readiness.
