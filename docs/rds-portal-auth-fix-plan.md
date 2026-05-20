# RDS Portal Auth Fix Plan

**Status:** Planning only — no code changes, no env var changes, no production flags enabled.  
**Date:** 2026-05-20  
**Preceded by:** `docs/rds-packages-production-enablement-report.md`  
**Scope:** `_portal_auth_full()`, `_handle_portal_my_packages()`, and any other RDS read endpoint using the same auth model.

---

## 1. Root Cause Summary

### What happened (chain of causation)

```
Browser                  Production VM              CRBOX API
  │                           │                          │
  │─ GET /api/portal/my-pkgs ─►                          │
  │  Authorization: Bearer T  │                          │
  │  X-Casillero-Email: E     │                          │
  │                           │─ GET /getuserinfo/E ────►│
  │                           │  Authorization: Bearer T │
  │                           │◄─── 401 ────────────────│
  │                           │                          │
  │◄── HTTP 401 ──────────────│                          │
  │                           │                          │
  │ _handleAuthFailure(401):  │                          │
  │   clearToken()            │                          │
  │   → login.html?session-expired                       │
```

```
Browser                  CRBOX API (direct, legacy path)
  │                           │
  │─ GET /getuserpackages/id ─►
  │  Authorization: Bearer T  │
  │◄─── 200 OK ───────────────│
  │    (same token T works)   │
```

### Why the token was valid for browser but rejected for the VM

The CRBOX API at `clients.crbox.cr` returned **401** when `_portal_auth_full()` in `server.py` relayed the user's Bearer token server-side via `urllib.request.urlopen`. The same token succeeded in the direct browser-originated `getuserpackages` call.

This pattern is consistent with one or more of:

| Cause | Mechanism | Certainty |
|---|---|---|
| **IP-based restriction** | CRBOX may require `getuserinfo` calls with a user Bearer token to originate from a browser/residential IP; cloud/datacenter IPs are rejected | Most likely |
| **Token binding** | CRBOX may issue tokens bound to the originating client IP or TLS fingerprint; relay from a different IP causes CRBOX to reject as spoofing attempt | Possible |
| **User-agent gate** | CRBOX may check `User-Agent`; `urllib.request` sends a Python user-agent, not a browser string | Less likely but testable |
| **CORS/referer enforcement** | CRBOX may reject bearer-token calls from non-browser origins at the API layer | Possible |

**Critical structural issue:** All of these cause CRBOX to return `401` or `403` for the server-side relay call. `_portal_auth_full()` catches `HTTPError` with code 401/403 at line 10675 and returns `(None, None)`. The handler at line 14498 converts any `(None, None)` — whether from missing headers, a genuine expired token, a CRBOX 5xx, or a network timeout — into an HTTP 401 response. The frontend cannot distinguish these cases and always treats 401 as a session expiry.

### Failure mode taxonomy (all currently return HTTP 401 to the browser)

| Case | Code path | True meaning | Correct server response |
|---|---|---|---|
| A | Missing `Authorization` header (line 10659) | Client has no session | **401** ← correct |
| B | Missing/malformed `X-Casillero-Email` (line 10661) | Client sent incomplete request | **401** ← correct |
| C | CRBOX returns 401/403 (line 10675) | Token rejected by CRBOX — could be expired OR IP-blocked | **Ambiguous** — currently 401, see below |
| D | CRBOX returns other HTTP error (line 10677) | CRBOX infrastructure problem | **503** ← should be 503 |
| E | Network/timeout exception (line 10680) | Network failure between VM and CRBOX | **503** ← should be 503 |
| F | CRBOX returns 200 but no `casillero_id` (line 10689) | CRBOX response malformed or schema changed | **503** ← should be 503 |

**Case C is the crux.** Production almost certainly hit Case C: CRBOX returned 401 for the server's IP-originated relay call, even though the token was valid. The problem cannot be solved purely by fixing D/E/F — because CRBOX is returning a genuine 401 that happens to be caused by network policy, not token expiry.

The only way to preserve session safety for Case C is to change the verification mechanism (Options A or C) or to accept that Case C always falls back to legacy (Option B), relying on the legacy path to perform its own token check and clear the session if the token is truly expired.

---

## 2. Option Analysis

### Option A — Find/confirm a CRBOX API endpoint the production VM can call safely

**Concept:** Identify a CRBOX API endpoint that accepts the user's bearer token from a server-side relay and confirms identity, without the IP/origin restrictions on `getuserinfo`.

**What endpoint could be used?**  
This is unknown without CRBOX documentation or cooperation. Candidates:
- A dedicated server-to-server token introspection endpoint (OAuth2 `POST /token/introspect` pattern)
- An endpoint that accepts a service-account credential plus the user's token for validation
- A `/getuserpackages/{id}` call that verifies the token as a side effect (but requires knowing the ID upfront)

None of these are documented in the current codebase. The API base is `https://clients.crbox.cr/api/crboxwebapi` and only `authtoken`, `getuserinfo`, `getuserpackages`, `getuserpasswordrecovery`, `postregisteruser`, and `postedituser` are known endpoints (from `portal-api.js` and `server.py`).

**Does it require service credentials?** Likely yes — if user-token relay is IP-restricted, a service-account credential is the standard bypass mechanism.

**Does it preserve user identity?** Only if the endpoint returns the user's `idconsignee`; otherwise the server must trust the client-provided email without cryptographic binding.

**Security:** Unknown — depends entirely on what access scope the endpoint grants.

**What needs testing?** Discovery call from the production VM IP to identify which endpoints are accessible. This requires CRBOX cooperation or a controlled probe, and cannot be done safely from production.

| Dimension | Assessment |
|---|---|
| Security risk | Unknown — blocked by CRBOX API opacity |
| Implementation complexity | Unknown — requires CRBOX infra discovery |
| Prevents session wipe | Only if an accessible endpoint is found |
| Preserves fallback | Yes — if no endpoint found, stays on legacy |
| Testable without production flags | Partially — can probe endpoints in dev |
| Requires CRBOX support | **Yes** |
| **Verdict** | Cannot be scoped or relied upon without CRBOX cooperation. Not a near-term option. |

---

### Option B — Change failure classification in `_portal_auth_full()` so infrastructure failures return 503 instead of 401 ✓ RECOMMENDED

**Concept:** `_portal_auth_full()` currently collapses all failure reasons into `(None, None)`, and the handler converts any `(None, None)` into 401. Change the handler to return 503 (with code `verify_error`) for all server-side verification failures except unambiguously missing/malformed client headers.

The frontend `_classifyRdsFallback()` in `mis-paquetes.html` already maps `err._rdsStatus === 503` to `feature_disabled` → legacy fallback, **without session wipe**. This requires zero frontend changes.

**How to distinguish true auth failure vs server-side verification failure:**

| Failure mode | Proposed response | Rationale |
|---|---|---|
| `Authorization` header missing or malformed | **401** | Client has definitively sent no credential; this is client's fault |
| `X-Casillero-Email` header missing or malformed | **401** | Same — client sent incomplete request; likely not a real user session |
| CRBOX returns 401 or 403 | **503** | May be IP policy, not token expiry; cannot distinguish reliably |
| CRBOX returns other HTTP error (5xx) | **503** | CRBOX infrastructure failure |
| Network error / timeout reaching CRBOX | **503** | Network infrastructure failure |
| CRBOX response missing `casillero_id` | **503** | CRBOX schema issue, not auth issue |

**What happens to genuinely expired tokens?**  
If the user's token is truly expired:
1. RDS path → `_portal_auth_full()` → CRBOX returns 401/403 → server returns 503 → browser falls back to legacy
2. Legacy path (`getPackages()`) → browser sends same expired token directly to CRBOX → CRBOX returns 401 → `_handleAuthFailure()` in `portal-api.js` fires → `clearToken()` → `login.html?msg=session-expired`

The session **is still cleared** for expired tokens. The clear happens via the legacy fallback path, not the RDS path. This satisfies the hard requirement: _"True expired sessions should still redirect to login."_

**Implementation:** Modify `_portal_auth_full()` to return a sentinel value for server-side failures — e.g., a `_VerifyError` singleton constant defined at module level — and modify `_handle_portal_my_packages()` (and any other RDS handler using the same auth model) to check for this sentinel and return 503 when it is present.

The same pattern must be applied to `_portal_auth()` (simpler variant, used by non-RDS endpoints like `_handle_solicitudes_list`) only if those endpoints are also RDS-backed. Currently the solicitudes endpoints use SQLite, not RDS, so this is not urgent there — but for consistency the change should be applied to `_portal_auth_full()` only, which is the one called by all RDS handlers.

**`_rds_emit_log` result field:** A new result value `verify_error` should be added to the docstring's allowed values to distinguish infrastructure auth failures from `auth_error` (missing headers). This makes the observability log actionable: `auth_error` always means a client with no credential; `verify_error` means the server-side relay failed.

**User-agent consideration (easy additional hardening):**  
`urllib.request` by default sends `Python-urllib/3.x`. CRBOX may reject this. Adding a realistic `User-Agent` header to the `urllib.request.Request` in `_portal_auth_full()` is a low-risk, zero-complexity improvement that may resolve the CRBOX 401 without any other changes, if the restriction is user-agent–based rather than IP-based. This should be added alongside the failure-classification fix as a first-pass attempt.

| Dimension | Assessment |
|---|---|
| Security risk | Low — client headers still never trusted; idConsignee always server-derived when verification succeeds; expired token still clears session via legacy path |
| Implementation complexity | Low — 3–5 targeted lines in `_portal_auth_full()`, ~8 lines in the handler |
| Prevents session wipe | Yes — for all infrastructure failures (Cases C–F) |
| Preserves fallback | Yes — 503 → legacy path → works for valid sessions |
| Testable without production flags | Yes — full unit-level test in dev with `USE_RDS_PACKAGES_FRONTEND=true` in dev env var |
| Requires CRBOX support | No |
| **Verdict** | **Recommended primary fix.** Smallest change, no new dependencies, preserves all security properties, immediately testable. |

---

### Option C — Service-account verification

**Concept:** Use `CRBOX_SVC_EMAIL`/`CRBOX_SVC_PASSWORD` to obtain a service token (same as `_handle_svc_token`), then call `getuserinfo/<email>` using the service token instead of relaying the user's Bearer token.

**How it would work:**  
1. Server receives user's `Authorization: Bearer T` + `X-Casillero-Email: E`
2. Server ignores `T` for verification; instead authenticates as the service account to get `SvcToken`
3. Server calls `GET /getuserinfo/E` with `Authorization: Bearer SvcToken`
4. If the CRBOX API returns the user's profile, the server derives `casillero_id`
5. Server proceeds to query RDS using that `casillero_id`

**Critical security flaw:** This approach **verifies that the email exists** but does **not verify that the caller holds a valid token for that account.** Any request that includes a valid registered email in the `X-Casillero-Email` header would succeed — no bearer token validation occurs at all. An unauthenticated attacker who knows a valid email address could retrieve any user's package list.

This violates the hard requirement: _"Do not trust client-provided email without server verification."_ The service account cannot verify the user's identity — it can only confirm the email is registered.

**Can it be salvaged?** Only by verifying BOTH that `casillero_id` matches the email (via service account) AND that the user's bearer token is valid via a separate mechanism. But this reduces to Option A (finding an endpoint the VM can call with the user's token).

**Additional risks:**
- Service account credentials used in more code paths → higher blast-radius if leaked
- Service account may have broader write access than intended for this use case
- If the service account's getuserinfo access is unrestricted, a compromised server process could enumerate the entire user database

| Dimension | Assessment |
|---|---|
| Security risk | **High** — does not validate user's bearer token; allows cross-account access with only a known email |
| Implementation complexity | Medium |
| Prevents session wipe | Yes |
| Preserves fallback | Yes |
| Testable without production flags | Yes |
| Requires CRBOX support | No |
| **Verdict** | **Not recommended.** Violates core security requirement: "Do not trust client-provided email without server verification." |

---

### Option D — Session bootstrap / server-side session cache

**Concept:** After a successful login (or first authenticated RDS request where CRBOX is reachable), cache the verified `(token_hash → casillero_id, email, expiry)` mapping server-side. Subsequent RDS requests check this cache instead of calling CRBOX again.

**How it would work:**  
1. First successful `_portal_auth_full()` call stores `SHA-256(token) → {casillero_id, email, expires_at}` in a server-side dict with a short TTL (e.g., 5 minutes)
2. Subsequent calls: hash the incoming token, check the dict, return cached identity if still valid
3. Cache miss or expired → attempt live CRBOX call → if successful, cache result; if not → 503 (fallback)

**Spoofing prevention:**
- The cache key is a cryptographic hash of the token, not the token itself (no raw token in memory longer than necessary)
- A caller cannot forge a cache hit by presenting a fake email — the cached `casillero_id` and `email` are from the CRBOX-verified initial lookup, never from client headers
- `X-Casillero-Email` is still used only to build the CRBOX URL for the first call; it is validated by CRBOX response match on first verification

**Is it safe?**  
Conditionally. Risks:
- **Token revocation lag:** If CRBOX revokes a token (e.g., logout from another device), the cache serves stale identity for up to the TTL. Mitigated by a short TTL (≤5 minutes) and by checking CRBOX on every cache miss.
- **VM restart:** In-memory cache is lost on every VM restart — next request falls through to live CRBOX call. If CRBOX is still blocking, falls back to legacy via 503. Not a problem, just slightly less efficient.
- **Cache size:** Unbounded growth if many users are active. Needs an LRU eviction or size cap.
- **Does not solve the root cause for the first request:** The very first RDS call per session still requires a successful `_portal_auth_full()`. If CRBOX is blocking the VM IP, the first call still gets Case C (CRBOX returns 401), and with Option B's fix, falls back to 503. Without Option B, the first call still wipes the session. **Option D only helps for repeated requests after a first successful auth; Option B is still needed for the first-call case.**

**Requires signed server-side session state?**  
The cache dict requires no signing — it is server-side only, not sent to the client. The token hash is the lookup key; the client cannot forge it without the actual token.

| Dimension | Assessment |
|---|---|
| Security risk | Low-Medium — requires short TTL and size cap; does not help if first call to CRBOX is always rejected |
| Implementation complexity | Medium — new in-memory dict, TTL management, cache invalidation, LRU eviction |
| Prevents session wipe | **Partially** — only after first successful verification; first call is unaffected |
| Preserves fallback | Yes — cache miss → live call → failure → 503 → fallback |
| Testable without production flags | Yes |
| Requires CRBOX support | No |
| **Verdict** | Useful supplementary optimization once Option B is in place, but does not solve the root cause. Not a standalone fix. |

---

## 3. Recommended Fix

### Primary fix: Option B (failure-classification change)

**Two changes, both in `server.py`:**

#### Change 1 — `_portal_auth_full()` — add a sentinel return value for server-side failures

**Location:** `server.py`, function `_portal_auth_full()`, lines 10648–10699

Current behavior: all failure paths return `(None, None)`.

Proposed change: define a module-level sentinel at the top of `server.py`:

```python
# Sentinel: server-side verification failure (CRBOX unreachable or rejected relay).
# Distinct from (None, None) which means headers were missing/malformed.
class _VerifyError:
    """Singleton sentinel returned by _portal_auth_full on infrastructure failure."""
_VERIFY_ERROR = _VerifyError()
```

Then change the failure branches in `_portal_auth_full()`:

| Lines | Current | Change |
|---|---|---|
| 10659–10662 | `return None, None` (headers missing) | Keep `return None, None` — these are unambiguous client failures |
| 10675–10676 | `return None, None` (CRBOX 401/403) | Change to `return _VERIFY_ERROR, None` |
| 10677–10678 | `return None, None` (CRBOX other error) | Change to `return _VERIFY_ERROR, None` |
| 10680–10681 | `return None, None` (network/exception) | Change to `return _VERIFY_ERROR, None` |
| 10689–10690 | `return None, None` (no casillero_id) | Change to `return _VERIFY_ERROR, None` |

#### Change 1a — Add User-Agent header to CRBOX relay call (low-risk complementary)

In `_portal_auth_full()` at line 10668, add a `User-Agent` header matching a standard browser string to the `urllib.request.Request`. If the CRBOX 401 is user-agent–based, this alone resolves the issue. If not, the failure-classification fix still catches it.

```python
req = urllib.request.Request(
    api_url,
    headers={
        'Authorization': auth_header,
        'User-Agent':    'Mozilla/5.0 (compatible; CRBOX-portal-proxy/1.0)',
    }
)
```

This change is transparent: if CRBOX starts accepting the relay call, `_portal_auth_full()` returns a real `(casillero_id, email)` and the RDS path succeeds normally without any fallback.

#### Change 2 — `_handle_portal_my_packages()` — distinguish sentinel from missing headers

**Location:** `server.py`, `_handle_portal_my_packages()`, lines 14497–14502

Current code:
```python
cas_id, verified_email = self._portal_auth_full()
if not cas_id or not verified_email:
    _rds_emit_log('packages', ..., 'auth_error', ...)
    self._json_error(401, 'Autenticación requerida.', code='auth_required')
    return
```

Proposed change:
```python
_auth_result = self._portal_auth_full()
cas_id, verified_email = _auth_result

if isinstance(_auth_result[0], _VerifyError):
    # Server-side relay failure — not the client's fault; fall back safely
    _rds_emit_log('packages', '/api/portal/my-packages', _flag,
                  'verify_error', _dur(), db_guard='skip')
    self._json_error(503,
        'No se pudo verificar la sesión en este momento.',
        code='verify_error')
    return

if not cas_id or not verified_email:
    # Headers missing or definitively malformed — genuine auth failure
    _rds_emit_log('packages', '/api/portal/my-packages', _flag,
                  'auth_error', _dur(), db_guard='skip')
    self._json_error(401, 'Autenticación requerida.', code='auth_required')
    return
```

#### Apply same pattern to every other RDS handler using `_portal_auth_full()`

Search `server.py` for all callers of `_portal_auth_full()` (confirmed call sites: `_handle_portal_my_packages` at line 14497; check for others at the my-invoices and my-profile handlers per line 14836 note "auth model: identical to /api/portal/my-packages"). Apply the same sentinel check and 503 return to each.

#### Update `_rds_emit_log` docstring

Add `verify_error` to the allowed `result` values:
```
result — feature_disabled / auth_error / verify_error / bad_request /
          rds_not_found / rds_wrong_db / rds_error / success
```

---

## 4. Exact Files and Functions Affected

| File | Function | Change |
|---|---|---|
| `server.py` | Module level (near top) | Add `_VerifyError` sentinel class and `_VERIFY_ERROR` constant |
| `server.py` | `_portal_auth_full()` (lines 10648–10699) | Return `(_VERIFY_ERROR, None)` for Cases C–F; keep `(None, None)` for Cases A–B; add `User-Agent` header |
| `server.py` | `_handle_portal_my_packages()` (lines 14469+) | Add `isinstance(_auth_result[0], _VerifyError)` guard; return 503 for sentinel |
| `server.py` | Any other RDS handler calling `_portal_auth_full()` | Same guard pattern (confirm by searching for `_portal_auth_full`) |
| `server.py` | `_rds_emit_log` docstring (line 15639) | Add `verify_error` to result vocabulary |
| `mis-paquetes.html` | `_classifyRdsFallback()` (line 2851) | **No change needed** — 503 already maps to `feature_disabled` → fallback |
| `js/portal-api.js` | `getPackagesRDS()` (line 427) | **No change needed** — 503 path already handled |

**Total scope:** ~25 lines of net-new code in `server.py`. Zero frontend changes.

---

## 5. Test Plan

All tests can be run in the development environment with `USE_RDS_PACKAGES_FRONTEND=true` in the **development** env var (already set). No production flags need to be enabled.

### Test T1 — Infrastructure failure → 503 → legacy fallback (core of the fix)

**Setup:** Temporarily override `_portal_auth_full()` in a test harness or patch `_CRBOX_API_BASE` to an unreachable host (e.g., `https://localhost:0`) so the CRBOX call always fails with a network error.

**Expected:**
- `/api/portal/my-packages` returns HTTP 503 with `code: verify_error`
- `_rds_emit_log` emits `result=verify_error db_guard=skip`
- In `mis-paquetes.html`: `_classifyRdsFallback(err)` returns `'feature_disabled'`
- `window.__crboxLastRdsFallback = { module: 'packages', reason: 'feature_disabled', ts: ... }`
- Legacy `getPackages()` called and packages render
- **Session is NOT wiped; user stays logged in**

### Test T2 — CRBOX returns 401 for relay → 503 → legacy fallback

**Setup:** Patch `_CRBOX_API_BASE` to a local mock server that returns HTTP 401 for `getuserinfo` requests (simulating IP restriction).

**Expected:** Same as T1 — server returns 503, browser falls back to legacy.

### Test T3 — Missing `Authorization` header → 401 → session cleared

**Setup:** Call `/api/portal/my-packages` without the `Authorization` header (or with malformed value).

**Expected:**
- Server returns HTTP 401 with `code: auth_required`
- `_rds_emit_log` emits `result=auth_error`
- Frontend `_handleAuthFailure(401)` fires → `clearToken()` → redirect to `login.html?msg=session-expired`

### Test T4 — Missing `X-Casillero-Email` header → 401 → session cleared

**Setup:** Call `/api/portal/my-packages` without the `X-Casillero-Email` header.

**Expected:** Same as T3.

### Test T5 — Genuinely expired token → session still cleared via legacy path

**Setup:** Use a known-expired token in both `Authorization` and the browser's `localStorage`.

**Expected (with Option B fix applied):**
1. RDS path → CRBOX returns 401 for relay → server returns 503 → browser falls back to legacy
2. Legacy `getPackages()` → browser sends expired token directly to CRBOX → CRBOX returns 401 → `_handleAuthFailure()` in `portal-api.js` fires → `clearToken()` → `login.html?msg=session-expired`

**Critical assertion:** Session IS cleared, redirect IS triggered. Clearing happens via legacy path, not RDS path.

### Test T6 — User-Agent header change (Change 1a) resolves the 401

**Setup:** Without any other changes, add the `User-Agent` header to `_portal_auth_full()` and test against the real dev CRBOX API from the Replit dev VM.

**Expected:** If CRBOX accepts the relay call with a browser-like User-Agent, `_portal_auth_full()` returns a valid `(casillero_id, email)` and the RDS path succeeds without any fallback.

**Implication:** If T6 passes, the root cause was user-agent–based, not IP-based. The sentinel change (Change 1) remains in place as a defense-in-depth layer regardless.

### Test T7 — Production smoke test (after implementation, before re-enabling production flag)

**Precondition:** `USE_RDS_PACKAGES_FRONTEND=false` in production (current state).

**Test:** Enable the flag in the **development** env var only and exercise the full page flow including filter changes. Confirm no session wipe occurs for any interaction. Confirm packages load via RDS or fall back cleanly.

**Pass criteria:**
- No `clearToken()` call from the RDS path under any failure scenario
- No `login.html?msg=session-expired` redirect caused by RDS path
- Packages render in all test cases (either via RDS or legacy fallback)
- `window.__crboxLastRdsFallback` is set when fallback occurs; absent when RDS succeeds

---

## 6. Rollback Plan

**During development (before any production change):**  
No production env vars are being changed. `USE_RDS_PACKAGES_FRONTEND=false` in production. The dev env remains at `true` and is the test environment. No rollback action needed.

**If a production re-enablement attempt fails after the fix is implemented:**  
Set `USE_RDS_PACKAGES_FRONTEND=false` in the production env var and Publish. Identical to the rollback already executed on 2026-05-20. ETA to execute: < 5 minutes.

**Code rollback:** The fix is isolated to `_portal_auth_full()` and the RDS handler guards. A git revert to commit `c48e547674d17069f097bf9dd908fa028fb4f815` (current HEAD) restores pre-fix behavior. No database, no schema, no secrets changes to reverse.

---

## 7. What Requires Approval Before Implementation

The following decisions must be confirmed before any code is written:

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | **Return code for server-side verification failure** | 503 (uses existing frontend fallback path for `feature_disabled`) vs 502 (uses `rds_error` fallback path) | **503** — already handled correctly by `_classifyRdsFallback`; semantically "service unavailable" matches infrastructure failure |
| 2 | **User-Agent header change (Change 1a)** | Add browser-like `User-Agent` to CRBOX relay call, or skip it | **Add it** — zero-risk, may resolve the issue without any fallback logic, tests in dev at no cost |
| 3 | **Scope of sentinel change** | Apply only to `_portal_auth_full()` (RDS handlers only) vs also apply to `_portal_auth()` (legacy endpoints) | **`_portal_auth_full()` only** — legacy endpoints (solicitudes) use SQLite not RDS and their 401 behavior is correct |
| 4 | **Test T6 (User-Agent probe) priority** | Run T6 before writing sentinel code (to see if User-Agent alone resolves) vs write full fix and test everything together | **Run T6 first** — if User-Agent resolves CRBOX acceptance, the sentinel is still needed for defense-in-depth but T6 validates the root cause |
| 5 | **`_rds_emit_log` new result value** | Add `verify_error` to docstring only, or also add it to a constants list | **Docstring only** — `_rds_emit_log` accepts free-form string; no validation code to change |
| 6 | **Re-enablement staging** | After fix: enable in dev only and test, then enable in production | **Yes** — same gate as original Step 6 activation; re-enable in dev first, then production only after T1–T7 pass |

---

## 8. Hard Requirements Compliance Check

Verification that the recommended fix (Option B) satisfies all stated hard requirements:

| Requirement | Satisfied? | How |
|---|---|---|
| Do not let browser send arbitrary `idConsignee` | ✓ | `idConsignee` is still always derived from CRBOX API response; client headers never supply it |
| Do not trust client-provided email without server verification | ✓ | When verification succeeds, `email` comes from CRBOX response. When it fails (→ 503), no identity decision is made. The browser's own legacy call performs its own CRBOX verification. |
| Do not expose tokens or PII in logs | ✓ | `_rds_emit_log` remains PII-free. `_portal_auth_full()` currently logs `[PORTAL_AUTH] CRBOX API error {exc.code}` (code only, no token/email). No change to this. |
| Do not introduce RDS writes | ✓ | Only `_portal_auth_full()` and the auth guard in the handler are changed. No DB interaction. |
| Do not break legacy fallback | ✓ | 503 → `_classifyRdsFallback` → `feature_disabled` → `getPackages()`. Identical to how the feature-flag 503 already works. |
| True expired sessions should still redirect to login | ✓ | Expired token → RDS path returns 503 → browser falls back to legacy `getPackages()` → CRBOX returns 401 → `_handleAuthFailure()` fires → `clearToken()` + redirect |
| Infrastructure verification failures should fall back to legacy | ✓ | This is precisely what Option B implements |
| Keep `USE_RDS_PACKAGES_FRONTEND=false` until fix is tested | ✓ | No production env var changes in this plan; production remains at `false` |
| Keep invoices/profile flags false | ✓ | Not touched in this plan |

---

## Appendix — Supporting Technical Detail

### `_portal_auth_full()` current failure topology (server.py lines 10648–10699)

```
_portal_auth_full()
  │
  ├─ [line 10659] auth_header missing/malformed → return (None, None)   ← Case A: keep 401
  ├─ [line 10661] header_email missing/malformed → return (None, None)  ← Case B: keep 401
  │
  ├─ urllib.request.urlopen()  [6s timeout]
  │    │
  │    ├─ HTTPError 401/403 [line 10675] → return (None, None)          ← Case C: change to VERIFY_ERROR
  │    ├─ HTTPError other   [line 10677] → return (None, None)          ← Case D: change to VERIFY_ERROR
  │    └─ Exception         [line 10680] → return (None, None)          ← Case E: change to VERIFY_ERROR
  │
  └─ no casillero_id in response [line 10689] → return (None, None)     ← Case F: change to VERIFY_ERROR
```

### Frontend fallback behavior on different status codes (existing, no changes needed)

```
getPackagesRDS() → HTTP 401/403 → _handleAuthFailure() → clearToken() → login.html ← session wipe
getPackagesRDS() → HTTP 503     → err._rdsStatus=503   → _classifyRdsFallback() → 'feature_disabled' → getPackages() ← safe fallback
getPackagesRDS() → HTTP 502     → err._rdsStatus=502   → _classifyRdsFallback() → 'rds_error'        → getPackages() ← safe fallback
getPackagesRDS() → other error  → _classifyRdsFallback() → 'unknown'             → getPackages() ← safe fallback
```

The 503 path is confirmed safe in the existing codebase — it is already the response code used when `USE_RDS_PACKAGES_FRONTEND=false` (feature gate at line 14486–14492), and `mis-paquetes.html` has been handling it correctly since Step 3.

---

*Plan authored: 2026-05-20. No code changes made. All production flags remain at `false`. Awaiting approval of items in Section 7 before implementation.*
