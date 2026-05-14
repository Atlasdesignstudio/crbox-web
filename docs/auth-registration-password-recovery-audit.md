# Auth, Registration & Password Recovery — Forensic Audit

**Task:** #545  
**Audit date:** 2026-05-14  
**Scope:** Login, signup (personal & business), password recovery, password change, admin portal access  
**Mode:** Read-only forensic audit. No code changes. No live account creation. No secret access.  
**Output discipline:** Zero raw tokens, passwords, credentials, email addresses, ID numbers, phone numbers, or other PII anywhere in this document. Shapes and patterns only.

---

## A. Executive Summary

### Current state

All three flows (login, registration, password recovery) are **fully wired to the CRBOX production API** at `clients.crbox.cr`. There is no mock, stub, or test-environment fallback anywhere in the client or server code for these flows. Every form submission that reaches the submit handler makes a real API call against the production CRBOX backend.

### What is real and working

- **Login** — direct browser POST to the CRBOX OAuth2 token endpoint. Token stored in `localStorage`. Session re-validation on bfcache restore and tab focus. Fully wired.
- **Signup (personal + business)** — both tracks call the same `doRegister()` function which hits the production registration endpoint using a server-proxied service-account token. Fully wired.
- **Password recovery** — `GET` to a CRBOX API endpoint with the email in the URL path. No local proxy. Fully wired but carries log-exposure risk.
- **Password change** — authenticated POST to `postedituser` via the profile update path. No current-password re-auth check.
- **Admin portal access** — server-side gate validates the CRBOX bearer token against the live API; identity derived from API response, not from client headers.

### What is unknown from the frontend audit

- Whether the CRBOX API enforces password complexity beyond what is checked client-side.
- Whether the CRBOX API invalidates all existing sessions when a password is changed via `postedituser`.
- Rate-limiting and lockout behaviour on the CRBOX side for repeated failed logins or recovery requests.
- Whether `getuserpasswordrecovery` distinguishes registered vs unregistered emails server-side and whether the CRBOX API itself guards against enumeration.

### Key risks (summary)

1. **Password recovery email appears in the URL path** — visible in access logs and browser history. (Low-Medium; blocked by CRBOX API design, not locally fixable without a proxy.)
2. **Password change requires no current-password re-authentication** — a stolen live token is sufficient to change the password permanently. (Medium.)
3. **Admin email list in client-side source** — source-inspectable; reveals role configuration. Low-Medium information disclosure; server-side gate is correct and independent. (Low-Medium.)
4. **Mobile drawer shows admin shortcut only for one of the admin accounts** — UX gap, not a security gap. (Low.)

### What is safe to keep for domain cutover

With the single recommended fix (see Section G), the current auth/signup/recovery stack is safe to keep in its current form for a domain cutover. No flow needs a rebuild; risks are rated Low-Medium or below at steady state.

---

## B. Flow Maps

### B.1 Login

| Property | Value |
|----------|-------|
| **Files** | `login.html`, `js/auth.js` |
| **Key symbols** | `doLogin`, `saveToken`, `getToken`, `clearToken`, `enforceAuthGate`, `PROTECTED_PAGES`, `LOGIN_URL` |
| **Endpoint** | `POST https://clients.crbox.cr/authtoken` |
| **Auth** | None — credentials in body |
| **Payload format** | `application/x-www-form-urlencoded` |
| **Payload fields** | `grant_type=password`, `username`, `password` |
| **Response fields** | `access_token`, `expires_in` (seconds) |

**Storage on success:**

| Key | Content | Expiry |
|-----|---------|--------|
| `crbox_access_token` | Bearer token string | See below |
| `crbox_expires_at` | Unix timestamp (ms) | Same |
| `crbox_remember` | `'true'` / `'false'` | Persists |
| `crbox_email` | Account email address | Persists |

**Expiry logic (`saveToken`):**  
- `remember = false` → uses `expires_in` from API (default `86399` s, ~24 h, applied when API omits the field)  
- `remember = true` → client overrides to 30 days (2,592,000 s), regardless of the API value

**Post-login redirect:**  
After a successful `doLogin()`, `login.html` calls `/api/solicitudes/check-orphaned` (Bearer + `X-Casillero-Email` headers). If the response returns `data.count > 0`, the user is sent to `dashboard.html?link_guest=1` so the dashboard can immediately surface the orphaned-request link prompt. Any network failure falls through cleanly to `dashboard.html`.

**Login failure handling:**  
Consecutive failures accumulate in a `_loginFailCount` counter; a `_LOGIN_COOLDOWNS` array applies a client-side lockout delay (escalating). The error message shown is either the API message (if it matches an approved string pattern) or a generic fallback — backend detail does not leak to the user.

**Auth gate — four partial-state cases (`enforceAuthGate`):**

| Token present | Email present | Token expired? | Action |
|:---:|:---:|:---:|--------|
| Yes | Yes | No | Proceed normally |
| Yes | No | — | `clearToken()` + redirect to `login.html?msg=session-expired` |
| No | Yes | — | `clearToken()` + redirect to `login.html?msg=session-expired` |
| No | No | — | Redirect to `login.html` (clean, no `msg` param) |

**Protected pages (enforced on `DOMContentLoaded`):**  
`dashboard.html`, `mis-paquetes.html`, `mi-cuenta.html`, `mis-facturas.html`, `mis-solicitudes.html`, `solicitud.html`

**Redirect-after-login:** The original destination URL is **not preserved**. All redirects land unconditionally on `dashboard.html` (or `dashboard.html?link_guest=1`). A user following a deep link to a protected page will be redirected to the login page and then always land on `dashboard.html` after auth.

**Logout (`clearToken`):**  
Removes `crbox_access_token`, `crbox_expires_at`, `crbox_remember`, `crbox_email`, and all cached user-data keys from both `localStorage` and `sessionStorage`. Redirects to `index.html`.

**bfcache and tab-resume re-validation:**  
- `pageshow` event with `e.persisted === true` → re-checks `isLoggedIn()`. Expired → `clearToken()` + redirect. Valid → dispatches `crbox:pageresume` custom event with `{ reason: 'bfcache' }`.  
- `visibilitychange` → `visible` → same logic with `{ reason: 'visibilitychange' }`.  
- Pages confirmed to have a `crbox:pageresume` listener (verified by source search): `dashboard.html`, `mis-paquetes.html`, `mis-facturas.html`, `mi-cuenta.html`. `mis-solicitudes.html` and `solicitud.html` do **not** have this listener and will not rehydrate on tab-resume — they rely on `DOMContentLoaded` only.

---

### B.2 Signup — Personal Account

| Property | Value |
|----------|-------|
| **Files** | `afiliate.html`, `js/auth.js` |
| **Key symbols** | `doRegister`, `_getSvcToken`, `REGISTER_URL`, `SUCURSAL_ID_MAP`, `PENDING` |
| **Endpoint** | `POST https://clients.crbox.cr/api/crboxwebapi/postregisteruser` |
| **Auth** | Bearer service-account token (obtained via `/crbox-svc-token` proxy) |
| **Payload format** | `application/x-www-form-urlencoded` |

**Form steps and fields:**

| Step | Fields |
|------|--------|
| 1 — Identity | First name, last name (×2), email, ID type (national/foreign/N/A), ID number, birth date, phone, password, confirm password |
| 2 — Branch | Preferred pick-up branch (sucursal) OR home delivery (province/canton/district) |
| 3 — Consent | Terms and conditions checkbox (required), newsletter opt-in (optional) → submit |

**Client-side validation:**  
Password minimum 8 characters; password match enforced via `setCustomValidity`; terms checkbox required; ID number hyphens stripped before submission; email validated via HTML5 `type="email"`.

**SUCURSAL_ID_MAP** (confirmed values in `js/auth.js`):  

| Key | ID |
|-----|----|
| `sabana_norte` | 1 |
| `guadalupe` | 12 |
| `domicilio` | 13 |
| `guachipelin_escazu` / `guachipelín` | 14 |

**Payload fields sent to `postregisteruser`** (shape only, no values):  
`Consignee.ConsigneeName`, `Consignee.ConsigneeLastName1`, `Consignee.ConsigneeLastName2`, `Consignee.Email`, `ConfirmEmail`, `Password`, `ConfirmPassword`, `Consignee.IdentificationType`, `Consignee.IdentificationNumber`, `Consignee.IsCompany` (`false`), `Consignee.ResidenceCountry`, `Consignee.ReceivesNewsletter`, `Consignee.Responsabilidad`, `Consignee.AlternativeEmail`, `Consignee.BirthDate`, `Consignee.Sucursal.IdSucursal`, `CompanyCode`, `Phones` (JSON array), `Addresses` (JSON array — home delivery path only).

**Registration environment:** `REGISTER_URL` is hardcoded to the **production** CRBOX endpoint in `js/auth.js`. There is no test or staging fallback path anywhere in `afiliate.html`, `js/auth.js`, or `server.py`. Registration always hits the production backend.

**Service-account proxy (`/crbox-svc-token`):**  
- `_getSvcToken()` in `js/auth.js` calls the local `POST /crbox-svc-token` endpoint.  
- `_handle_svc_token` in `server.py` reads `CRBOX_SVC_EMAIL` and `CRBOX_SVC_PASSWORD` exclusively from environment variables — they are never read from the request, never returned in any response field, and no `print()` statement logs them.  
- The endpoint returns only `{ access_token: "<short-lived token>" }` — minimum necessary.  
- Rate limit: shared `_check_rate_limit(ip)` — constants `_RATE_LIMIT = 10` requests per `_RATE_SECONDS = 60` seconds per source IP (defined at `server.py` lines 3927–3928). The rate check is applied in `do_POST` to all POST paths that are neither under `/admin` nor in the `_global_rate_exempt` set; `/crbox-svc-token` is subject to this limit.  
- No Origin/Referer check (intentionally removed; documented rationale in `server.py` lines 11405–11414: Replit proxy strips non-standard port from `Host`, causing mismatch with browser `Origin`).

**Response shape:** `StatusResult` field. `StatusResult !== undefined` → success path. Missing or unexpected shape → `'Respuesta inesperada del servidor'` error.

**Auto-login after registration:**  
On `StatusResult` success, `afiliate.html` immediately calls `CRBOXAuth.doLogin(email, password, false)`. The password is briefly held in a JS closure; there is no alternative given the UX requirement. Auto-login failure is caught and surfaced as a message; the user can then log in manually.

**Error states (client-side reporting):** duplicate email (CRBOX API message surfaced), duplicate ID number, throwaway email domain (CRBOX API rejection), network failure (generic message), validation failure per field.

---

### B.3 Signup — Business Account

| Property | Value |
|----------|-------|
| **Files** | `afiliate.html`, `js/auth.js` |
| **Key symbols** | Same as personal: `doRegister`, `_getSvcToken`, `REGISTER_URL` — same submit path |
| **Endpoint** | Same production endpoint: `POST https://clients.crbox.cr/api/crboxwebapi/postregisteruser` |

**Form fields unique to business:**  
Company name (maps to `Consignee.ConsigneeName`), tax ID (cédula jurídica, type `juridica`), contact representative names (`ContactName1`, `ContactName2`), alternative email. Last-name fields are sent as empty strings.

**Key differences vs personal:**  
`Consignee.IsCompany = 'true'`, `Consignee.IdentificationType` = `juridica` code, `Consignee.BirthDate` = empty string.

Both personal and business flows call the same `CRBOXAuth.doRegister(params.toString())` function with a `URLSearchParams` string argument. The payload shape differs only in the fields above.

---

### B.4 Password Recovery

| Property | Value |
|----------|-------|
| **Files** | `login.html`, `js/portal-api.js` |
| **Key symbols** | `recoverPassword`, `#password-reset-modal` |
| **Endpoint** | `GET https://clients.crbox.cr/api/crboxwebapi/getuserpasswordrecovery/{email}` |
| **Auth** | None — `skipAuth: true` |
| **Email placement** | URL path (not query string, not body) |

**Modal lifecycle:**  
Triggered by clicking "¿Olvidaste tu contraseña?" (matches text containing "Olvidaste" / "olvidaste"). Dismissed by three handlers only: close button (`#close-modal`), "Volver al inicio de sesión" link (`#back-to-login`), and backdrop click (click on the modal overlay itself, line ~531 in `login.html`). There is **no Escape-key handler** and the modal does **not auto-close on success** — the success path updates the form UI with a confirmation message but leaves the modal visible until the user closes it manually.

**Response handling:**  
`(data.Message || data.message || '').toUpperCase() === 'OK'` → `{ ok: true }`. Any other value → `{ ok: false }`.

**Account enumeration:** The `ok: true` response is returned only when the CRBOX API confirms the account exists and a reset email was sent. A caller can infer account existence by comparing the boolean result. No frontend rate limiting is applied before making this call.

**UI message pattern:** The current implementation shows a distinct success message when `ok === true` and an error message otherwise. This does **not** follow the recommended "if this email is registered, instructions have been sent" uniform-response pattern, which would prevent enumeration at the UI level.

---

### B.5 Logout

| Property | Value |
|----------|-------|
| **File** | `js/auth.js` |
| **Key symbol** | `logout`, `clearToken` |
| **Action** | Clears `localStorage` and `sessionStorage` keys; fires GTM `logout` event if available; redirects to `index.html` |

Logout buttons in portal pages dispatch the click to a shared handler that calls `logout()`. The mobile drawer logout delegates to the real `#mobile-logout-button` element if present, falling back to `CRBOXAuth.logout()` directly.

---

### B.6 Protected Page Redirect

All pages in `PROTECTED_PAGES` call `enforceAuthGate()` on `DOMContentLoaded`. The gate uses `getToken()` (which already validates expiry and returns `null` for expired tokens) and `getEmail()`. See the four partial-state table in B.1.

**Browser back button / bfcache concern:** The `pageshow` handler fires on bfcache restore and re-validates immediately. If the token expired while the page was in cache, it calls `clearToken()` and replaces the history entry with `login.html?msg=session-expired`. This mitigates the risk of accessing stale protected content via the back button.

---

## C. Security Findings Table

| # | Finding | Severity | Evidence (file + symbol) | Risk | Recommendation | Blocking for domain cutover? |
|---|---------|----------|--------------------------|------|----------------|------------------------------|
| C-01 | Password recovery email in URL path | Low-Medium | `js/portal-api.js` `recoverPassword` line ~750 | Access logs, CDN logs, browser history capture full URL including email address | Add a server-side proxy that accepts email in POST body and calls the legacy GET internally | No — log-exposure risk accepted short-term; log-retention review recommended |
| C-02 | Password change requires no current-password re-auth | Medium | `mi-cuenta.html` security tab; `js/auth.js` `buildUpdateProfilePayload` | Stolen live token → permanent password change without knowing original password | Add a "current password" field; include it in `postedituser` payload if CRBOX API supports it | No — blocked by CRBOX API capability; document as accepted risk |
| C-03 | No frontend rate limit on password recovery | Low | `js/portal-api.js` `recoverPassword`; no matching proxy endpoint | Enumeration or spam without per-client throttle | Add per-session cooldown on the login modal reset form (e.g. 60 s between attempts) | No |
| C-04 | `/crbox-svc-token` has no Origin/Referer check | Low | `server.py` `_handle_svc_token`; comment lines 11405–11414 | Any client can request a service-account token; mitigated by rate limit + narrow token scope | Dedicate a separate rate-limit bucket for token vending, separate from the quote-email window | No |
| C-05 | Admin email list in client-side JS (information disclosure) | Low-Medium | `js/nav-auth.js` `ADMIN_EMAILS`; `js/mobile-drawer.js` `ADMIN_EMAIL` | Source inspection reveals which email addresses have admin role | Move admin email config to a server-side environment variable in a future hardening pass | No — server-side gate is correct and independent |
| C-06 | Mobile drawer shows admin shortcut for only one admin account | Low (UX gap) | `js/mobile-drawer.js` `ADMIN_EMAIL` (single string vs array) | Four admin accounts lack mobile "Panel Admin" link | Change `ADMIN_EMAIL` to an array matching `nav-auth.js` `ADMIN_EMAILS` | No |
| C-07 | Bearer token in `localStorage` (XSS surface) | Low (accepted) | `js/auth.js` `saveToken`; header comment lines 8–18 | XSS vector could exfiltrate token; HttpOnly cookie not viable for client-side API calls | Periodic CSP audit; see C-08 | No — design rationale documented |
| C-08 | CSP `unsafe-inline` in `script-src` | Low | `login.html` and `afiliate.html` `<meta http-equiv="Content-Security-Policy">` | Weakens script injection protection; `unsafe-inline` negates hash/nonce XSS guards | Migrate inline scripts to external files; use nonces or hashes | No |
| C-09 | `connect-src` covers `https://clients.crbox.cr` and `'self'` only | Positive / Informational | `login.html` CSP meta; `afiliate.html` CSP meta | Both pages restrict fetch targets to the expected origins. No unintended domains present | No action needed; confirm `connect-src` is updated if new API origins are added | — |
| C-10 | Token expiry default: 86,399 s assumed when API omits `expires_in` | Informational | `js/auth.js` `doLogin` → `saveToken` | Token could survive longer than intended if CRBOX changes its default | Log a warning if `expires_in` is absent; consider a shorter safe default | No |
| C-11 | `console.warn` in `login.html` may log recovery error message | Informational | `login.html` line ~522: `console.warn('[CRBOX] recoverPassword error:', err && err.message)` | Error message only (not token or email); low risk | Verify `err.message` never contains raw email in CRBOX API error payloads | No |
| C-12 | Auto-login after registration holds password in JS closure briefly | Informational | `afiliate.html` post-register success handler | No practical attack surface beyond what any SPA registration flow exposes | No action — unavoidable given UX requirement | No |
| C-13 | `Token` body field duplicates `Authorization` header in `postedituser` | Informational | `js/auth.js` `buildUpdateProfilePayload` `params.set('Token', getToken())` | CRBOX API appears to require both; no additional attack surface beyond token theft | No action needed | No |

---

## D. Fake/Simulated Behavior Scan

Explicit status for every auth-adjacent UI as required:

| UI / Action | Status | Evidence |
|-------------|--------|---------|
| Login form submission | **Fully wired** | `doLogin()` → real POST to CRBOX `authtoken`; token saved; redirect to `dashboard.html` |
| Registration — personal account form submission | **Fully wired** | `/crbox-svc-token` proxy → `postregisteruser` production endpoint; `StatusResult` checked |
| Registration — business account form submission | **Fully wired** | Same `doRegister()` path as personal; different payload shape; same endpoint |
| Password recovery modal submission | **Fully wired** | `recoverPassword()` → real GET to CRBOX `getuserpasswordrecovery`; `Message === 'OK'` checked |
| Password change in mi-cuenta (Security tab) | **Fully wired** | `buildUpdateProfilePayload` includes `Password`/`ConfirmPassword`; `updateProfile()` → real POST to `postedituser` |
| Admin portal badge / link | **Fully wired (UX layer only)** | Badge injected client-side for UX; clicking triggers real `/admin/portal-login` validation against CRBOX API |
| Logout button(s) | **Fully wired** | `clearToken()` clears all storage; redirects to `index.html`; portal and mobile drawer buttons both delegate to the same `logout()` function |

**No fake or simulated states were found.** Every form submission that reaches its submit handler makes a real API call. There is no "demo mode", mock response, or UI that shows success before the backend confirms.

**Fields confirmed in payload (registration fake-field scan):**  
All fields rendered in both personal and business forms are included in the `URLSearchParams` payload constructed in `afiliate.html` before calling `doRegister()`. Specifically confirmed: name fields, email, ID type, ID number, birth date, phone (in `Phones` JSON array), password, confirm password, country, is-company flag, newsletter opt-in, terms checkbox (gate only — not sent to API), sucursal ID / address (in `Addresses` JSON array). No rendered field was found that is omitted from the submitted payload.

---

## E. Legacy Dependency Map

Classification per auth/account endpoint found:

| Endpoint | Protocol | Owner / Source | Classification | Notes |
|----------|----------|----------------|----------------|-------|
| `POST https://clients.crbox.cr/authtoken` | External CRBOX API | CRBOX platform | **Keep legacy for now** | OAuth2 password grant; no local alternative; well-tested |
| `GET https://clients.crbox.cr/api/crboxwebapi/getuserinfo/{email}` | External CRBOX API | CRBOX platform | **Keep legacy for now** | Used for user profile, drawer caching, admin auth validation |
| `POST https://clients.crbox.cr/api/crboxwebapi/postregisteruser` | External CRBOX API | CRBOX platform | **Keep legacy for now** | Production-only; no test path exists |
| `GET https://clients.crbox.cr/api/crboxwebapi/getuserpasswordrecovery/{email}` | External CRBOX API | CRBOX platform | **Proxy through new backend later** | Email-in-URL-path risk; a local proxy that accepts POST body and calls this GET internally would eliminate log exposure |
| `POST https://clients.crbox.cr/api/crboxwebapi/postedituser` | External CRBOX API | CRBOX platform | **Keep legacy for now** | Profile + password update; no local alternative |
| `POST /crbox-svc-token` (local proxy) | Local `server.py` | CRBOX website | **Keep legacy for now** | Service-account proxy pattern is correct; consider dedicated rate-limit bucket |
| `GET /admin/portal-login` (local bridge) | Local `server.py` | CRBOX website | **Keep legacy for now** | Server-side gate is correctly implemented; identity from API response |
| `GET /api/solicitudes/check-orphaned` | Local `server.py` | CRBOX website | **Keep legacy for now** | Post-login UX enhancement; failure falls through gracefully |

---

## F. Recommendations

### Tier 1 — Must fix before domain cutover

There are **no blocking fixes** required for domain cutover. All auth flows are functional and the server-side security gate is correctly implemented. The two most significant findings (C-01, C-02) are blocked by CRBOX API design constraints and must be accepted as-is for the cutover period.

However, the following action is strongly recommended as a pre-cutover measure because it is low-effort and directly reduces information exposure:

- **Add a per-session cooldown on the password recovery modal** (C-03) — a simple 60-second client-side guard prevents the most obvious enumeration pattern with minimal code.

### Tier 2 — Recommended before broad launch

| Item | Finding ref | Action |
|------|-------------|--------|
| Add server-side proxy for password recovery | C-01 | Accept POST body with email → call legacy GET internally → relay response. Eliminates email from URL and log exposure. |
| Fix mobile drawer admin list inconsistency | C-06 | Change `ADMIN_EMAIL` single string to an array in `js/mobile-drawer.js` matching `nav-auth.js`. |
| Add password strength indicator | — | Visual complexity feedback beyond the 8-character minimum improves security hygiene. |
| Confirm CRBOX API behaviour on password change | C-02 | Test whether existing sessions are invalidated when `postedituser` updates the password. Document the result. |
| Resolve `unsafe-inline` in CSP | C-08 | Move inline scripts to external files with nonces or hashes. Reduces XSS blast radius for token exposure (C-07). |

### Tier 3 — Future modernisation

| Item | Detail |
|------|--------|
| HTTP-only cookie session | Replace `localStorage` token storage with an HttpOnly, SameSite=Strict session cookie managed server-side. Requires a server-side session proxy layer and eliminates the XSS token-exfiltration risk (C-07). Safari iOS bfcache issue would need a separate mitigation strategy. |
| Current-password re-auth for password change | If the CRBOX API adds support, require the current password before accepting a new one (C-02). |
| Server-side admin email config | Move the admin email list from client-side JS arrays to a server-side environment variable. Eliminates C-05 entirely (C-06 goes away as a side effect). |
| Email verification on registration | Confirm whether CRBOX requires email verification post-registration. If not, consider a local verification step to prevent fake-email registrations. |
| Audit log for auth events | Log login success/failure, registration, and password-change events (IP, timestamp, outcome) server-side for forensic purposes. No PII in logs. |
| Dedicated rate-limit bucket for `/crbox-svc-token` | Separate the svc-token rate window from the quote-email window so registration bursts do not affect quote submission (C-04). |
| Preserve original destination through auth redirect | Store the intended URL before redirect to `login.html` and restore it post-login, rather than always landing on `dashboard.html`. |

---

## G. Final A/B/C Recommendation

**Recommendation: B — Safe for domain cutover after the listed fixes.**

The current login, signup, and password recovery flows are all fully wired to the production CRBOX backend. No credential leaks, no fake states, no bypassed server-side gates, and no blocking security issues were found.

The recommended pre-cutover fixes are:
1. Add a 60-second client-side cooldown on the password recovery modal to limit the most trivial enumeration path.
2. Update `mobile-drawer.js` to use the same admin-accounts list as `nav-auth.js` (UX consistency, not security).

Both are small, isolated changes. Neither is an architectural requirement.

The two Medium/Low-Medium findings (C-01 email-in-URL, C-02 no current-password re-auth) are real and should be tracked, but neither is a blocker for domain cutover:
- C-01 is a CRBOX API design constraint; a proxy workaround is Tier 2.
- C-02 is partially mitigated by the ~24 h token TTL and the fact that any password-change attempt requires a valid live session.

---

## H. Cutover Decision Summary

| Flow | Current status | Safe for domain cutover? | Required fix before cutover | Can remain legacy temporarily? | Future modernisation recommendation |
|------|---------------|-------------------------|---------------------------|-------------------------------|-------------------------------------|
| Login | Direct browser POST to CRBOX OAuth2 endpoint; token in `localStorage`; bfcache and tab-resume re-validation in place | **Yes** | None | Yes | HTTP-only cookie session; preserve original destination URL through redirect |
| Logout | `clearToken()` wipes all storage keys; redirects to `index.html`; portal and mobile drawer buttons both wired | **Yes** | None | Yes | Server-side session invalidation if HTTP-only cookie is adopted |
| Protected page redirect | `enforceAuthGate()` handles all four token/email partial-state cases; bfcache restore re-validates immediately | **Yes** | None | Yes | Preserve original destination URL |
| Signup — personal account | Multi-step form; production-only `postregisteruser` via service-account proxy; auto-login on success; all fields wired | **Yes** | None | Yes | Email verification step; dedicated rate-limit bucket for svc-token proxy |
| Signup — business account | Same `doRegister()` path as personal; different payload shape; production-only endpoint | **Yes** | None | Yes | Same as personal |
| Password recovery | GET with email in URL path; no auth required; response distinguishes found/not-found accounts | **Yes with fixes** | Add 60-second client-side cooldown on recovery modal (C-03) | Yes | Server-side proxy to move email out of URL path (C-01); uniform "if registered, email sent" response to prevent enumeration |
| Password change | Authenticated POST to `postedituser`; no current-password re-auth; valid bearer token sufficient | **Yes** | Document accepted risk; confirm CRBOX session-invalidation behaviour on password change | Yes | Add current-password field if CRBOX API supports it (C-02) |
| Admin portal access | Client badge is UX-only; server gate derives identity exclusively from CRBOX API response; admin session cookie is HttpOnly + SameSite=Strict + 8 h TTL | **Yes with fixes** | Fix mobile drawer admin list to match desktop list (C-06 — UX only, not security) | Yes | Move admin email config to server-side environment variable (C-05) |

---

*Audit completed: 2026-05-14. No code was modified. No production accounts were created or modified. No secrets were accessed or logged.*
