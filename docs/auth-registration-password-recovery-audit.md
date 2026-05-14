# Auth, Registration & Password Recovery — Forensic Audit

**Task:** #545  
**Date:** 2026-05-14  
**Scope:** Login, signup (personal & business), password recovery, password change, admin portal access  
**Mode:** Read-only forensic audit. No code changes. No live account creation or secret access.  
**Output discipline:** No raw tokens, passwords, or PII in this document.

---

## Table of Contents

- [A. Files & Endpoints Audited](#a-files--endpoints-audited)
- [B. Login Flow](#b-login-flow)
- [C. Signup Flow (Personal & Business)](#c-signup-flow-personal--business)
- [D. Password Recovery Flow](#d-password-recovery-flow)
- [E. Password Change (Authenticated)](#e-password-change-authenticated)
- [F. Admin Portal Access](#f-admin-portal-access)
- [G. Token Storage & Session Management](#g-token-storage--session-management)
- [H. Findings Summary & Cutover Table](#h-findings-summary--cutover-table)

---

## A. Files & Endpoints Audited

### Source files

| File | Lines | Role |
|------|-------|------|
| `js/auth.js` | 535 | Core auth: token storage, login, register, session validation, bfcache |
| `js/portal-api.js` | 1047 | Portal API client: recoverPassword, updateProfile, getUserInfo, _request wrapper |
| `js/nav-auth.js` | 154 | Desktop/mobile nav: admin badge injection, admin portal redirect |
| `js/mobile-drawer.js` | 351 | Mobile side drawer: admin/portal nav, user info caching |
| `login.html` | 587 | Login form, password reset modal, inline JS |
| `afiliate.html` | 3979 | Multi-step signup: personal + business forms, payload assembly |
| `mi-cuenta.html` | ~1300 | Portal account settings: personal info tab, security tab (password change) |
| `server.py` | 16504 | Backend: `/crbox-svc-token` proxy, `/admin/portal-login` bridge, admin session management |

### External API endpoints contacted

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `https://clients.crbox.cr/authtoken` | POST | None (credentials in body) | OAuth2 password grant — user login |
| `https://clients.crbox.cr/api/crboxwebapi/postregisteruser` | POST | Bearer service account token | New account registration |
| `https://clients.crbox.cr/api/crboxwebapi/getuserpasswordrecovery/{email}` | GET | None (`skipAuth: true`) | Trigger password reset email |
| `https://clients.crbox.cr/api/crboxwebapi/getuserinfo/{email}` | GET | Bearer user token | Fetch user profile |
| `https://clients.crbox.cr/api/crboxwebapi/postedituser` | POST | Bearer user token | Update profile / change password |

### Local proxy endpoints (server.py)

| Endpoint | Handler | Purpose |
|----------|---------|---------|
| `POST /crbox-svc-token` | `_handle_svc_token` | Fetches CRBOX service-account token; keeps credentials server-side |
| `GET /admin/portal-login` | `_handle_admin_portal_login` | Validates portal Bearer token via CRBOX API; issues admin session cookie |

---

## B. Login Flow

### B.1 Step-by-step trace

1. **Form submission** (`login.html`): User enters email + password. Optional "remember me" checkbox.
2. **`doLogin(email, password, remember)`** in `js/auth.js` (line 157) is called.
3. **Direct browser POST** to `https://clients.crbox.cr/authtoken`:
   - `Content-Type: application/x-www-form-urlencoded`
   - Body: `grant_type=password&username=<email>&password=<password>`
   - No intermediate server proxy — credentials travel browser → CRBOX API directly over HTTPS.
4. **On success** (HTTP 200, `access_token` present):
   - `saveToken(data.access_token, data.expires_in || 86399, remember)` stores to localStorage.
   - Four localStorage keys are written: `crbox_access_token`, `crbox_expires_at`, `crbox_remember`, `crbox_email`.
   - Default expiry: 86,399 seconds (~24 hours) when the API omits `expires_in`.
5. **Redirect** to `dashboard.html`.
6. **On failure**: error message derived from API response; no distinction made between "wrong password" and "account not found" in the displayed UI string (good practice for enumeration resistance). Actual error category is available in `_registerErrorCategory` but not exposed to users.

### B.2 Session enforcement

- **`PROTECTED_PAGES`** = `['dashboard.html', 'mis-paquetes.html', 'mi-cuenta.html', 'mis-facturas.html', 'mis-solicitudes.html', 'solicitud.html']`
- `enforceAuthGate()` runs on `DOMContentLoaded` on every protected page. If `isLoggedIn()` returns false, it calls `clearToken()` and redirects to `login.html?msg=session-expired`.
- **bfcache restore** (`pageshow` event, `e.persisted === true`): re-validates token expiry. Expired → `clearToken()` + redirect to `login.html?msg=session-expired`. Valid → fires `crbox:pageresume` custom event.
- **Tab visibility resume** (`visibilitychange` event, `document.visibilityState === 'visible'`): same re-validation logic, fires `crbox:pageresume` with `reason: 'visibilitychange'`.

### B.3 Security observations

| Observation | Detail |
|-------------|--------|
| No CSRF protection | Login POSTs directly to an external third-party API (`clients.crbox.cr`). CSRF tokens are not applicable to cross-origin POSTs — the browser's SameSite/CORS model is the guard. |
| No MFA | Single-factor only (email + password). MFA would require CRBOX API support. |
| Credential transit | Credentials travel over HTTPS browser-to-CRBOX; never touch the Flask server. |
| Login error messages | UI message does not differentiate "wrong password" from "no account" for end users — consistent with enumeration resistance. |
| Token expiry default | If CRBOX API omits `expires_in`, the client assumes 86,399 s. This means a token could live longer than intended if the API changes its default. |

---

## C. Signup Flow (Personal & Business)

### C.1 Form architecture

`afiliate.html` presents two parallel multi-step flows (selected by a "Personal" / "Empresa" tab):

**Personal account** (3 logical steps):
1. Name, email, ID type + number, birth date, phone, password + confirm password
2. Preferred pick-up branch (`Sucursal`) or home delivery (province/canton/district)
3. Terms acceptance + newsletter opt-in → submit

**Business account** (similar structure):
1. Company name, contact representatives, email, tax ID (cédula jurídica), phone, password + confirm password
2. Branch selection
3. Terms + submit

### C.2 Service account token proxy

Before calling the CRBOX registration endpoint the browser must present a service account bearer token. The client cannot hold these credentials, so the flow uses a server-side proxy:

1. `afiliate.html` calls `_getSvcToken()` (defined in `js/auth.js`).
2. `_getSvcToken()` POSTs to the local endpoint `/crbox-svc-token`.
3. `_handle_svc_token` in `server.py` (line 11404):
   - Reads `CRBOX_SVC_EMAIL` and `CRBOX_SVC_PASSWORD` from environment variables (never from the request).
   - POSTs `grant_type=password` to `https://clients.crbox.cr/authtoken`.
   - Returns `{ access_token: "<short-lived token>" }` to the browser.
4. The browser uses this token as `Authorization: Bearer <svc_token>` on the `postregisteruser` call.

**Rate limiting on `/crbox-svc-token`**: governed by the shared `_check_rate_limit(ip)` function — `_RATE_LIMIT = 10` requests per `_RATE_SECONDS = 60` seconds per source IP. This window is shared with the quote-email submission endpoint, not dedicated solely to token vending.

**Origin/Referer check**: intentionally removed. The documented rationale (server.py lines 11405–11414) is that Replit's reverse proxy strips non-standard ports from the `Host` header, causing a mismatch with the browser's `Origin` header and blocking all legitimate form submissions. The removal is considered acceptable because: (a) the rate limiter is in place, (b) credentials stay server-side, and (c) the returned token is usable only for the narrow registration call.

### C.3 Registration payload

Both personal and business forms assemble a `URLSearchParams` payload and pass it as a string to `CRBOXAuth.doRegister(payloadString)` (auth.js line 227).

Key payload fields sent to `postregisteruser`:

```
Consignee.ConsigneeName        — first name (or company name for business)
Consignee.ConsigneeLastName1   — last name (empty string for business)
Consignee.Email                — account email
ConfirmEmail                   — duplicate of Email
Password                       — chosen password (plain text in URL-encoded body over HTTPS)
ConfirmPassword                — duplicate of Password
Consignee.IdentificationType   — 'nacional' | 'extranjero' | 'juridica'
Consignee.IdentificationNumber — national ID, passport, or tax ID
Consignee.IsCompany            — 'true' | 'false'
Consignee.ResidenceCountry     — default 'CR'
Consignee.ReceivesNewsletter   — 'true' | 'false'
Consignee.Sucursal.IdSucursal  — resolved branch ID (numeric)
CompanyCode                    — promo code (may be empty)
Phones                         — JSON array with phone object
Addresses                      — JSON array with address object (home delivery path only)
```

`doRegister()` does not send any CSRF token or nonce because the call is authenticated solely by the service account bearer token. The CRBOX API is responsible for validating payload integrity server-side.

### C.4 Post-registration auto-login

On a successful `StatusResult === 'OK'` response, `afiliate.html` immediately calls `CRBOXAuth.doLogin(email, password, false)` to auto-log the user in and redirect to `dashboard.html`. This means the user's chosen password is briefly held in a closure in the browser's JavaScript heap — unavoidable given the UX requirement of frictionless activation.

### C.5 Client-side validation

| Check | Enforced |
|-------|----------|
| Password minimum length | 8 characters (client-side only) |
| Password match | `setCustomValidity` on confirm field |
| Terms acceptance | Required checkbox; submit button disabled until checked |
| ID number format | Normalised (hyphens stripped) |
| Email format | HTML5 `type="email"` |
| Required fields | HTML5 `required` attributes |

No server-side password complexity policy is visible in the client code. Whether the CRBOX API enforces additional rules is not known from the frontend audit alone.

---

## D. Password Recovery Flow

### D.1 Mechanism

Triggered from the password reset modal in `login.html`. Calls `CRBOXPortalAPI.recoverPassword(email)` (portal-api.js line 749):

```
GET https://clients.crbox.cr/api/crboxwebapi/getuserpasswordrecovery/{email}
Authorization: (none — skipAuth: true)
```

The email address is embedded directly in the **URL path**, not in a query string or request body.

The function resolves to `{ ok: true|false, message: string }`. The `ok` flag is `true` when the API response message (uppercased) equals `'OK'`.

### D.2 Security observations

| # | Observation | Severity |
|---|-------------|----------|
| D-1 | **Email in URL path** | Low-Medium |
| | The account email is part of the URL path (`/getuserpasswordrecovery/user@example.com`). Web server access logs, CDN edge logs, proxy logs, and browser history all record the full URL. Any system with access to HTTP access logs can harvest account emails from recovery requests. This is a data exposure risk independent of whether the account exists. | |
| D-2 | **Account existence inference** | Low |
| | A response of `ok: true` (`Message === 'OK'`) indicates the email is registered and a reset email was dispatched. A differing response indicates no account. This allows a caller to enumerate whether a given email has a CRBOX account by inspecting the boolean result. No frontend rate limiter is applied before making this call. | |
| D-3 | **No frontend rate limiting** | Low |
| | `recoverPassword()` is a direct browser → CRBOX API call (`skipAuth: true`, no proxy). There is no per-IP or per-session counter on the local server for this endpoint. Rate limiting relies entirely on CRBOX API throttle controls, which are not visible from the frontend. | |
| D-4 | **GET semantics for state-changing action** | Informational |
| | Triggering a password reset email is a state-changing action (generates and dispatches a token). Using HTTP GET for this conflicts with REST conventions and means the action could be inadvertently triggered by prefetch crawlers or link-preview agents. However, the CRBOX API owns this design, not the CRBOX.cr frontend. | |

---

## E. Password Change (Authenticated)

### E.1 Mechanism

Located in the "Seguridad" tab of `mi-cuenta.html`. The user sees two fields: **Nueva Contraseña** and **Confirmar Nueva Contraseña**. There is no **current password** field.

Validation (client-side only):
- Both fields must be non-empty.
- Minimum 8 characters.
- Both values must match.

On submit, the page calls `CRBOXAuth.buildUpdateProfilePayload(rawApiResponse, { password: newPwd, confirmPassword: confPwd })` (auth.js line 252), then passes the result to `CRBOXPortalAPI.updateProfile(payload)` (portal-api.js line 306).

`buildUpdateProfilePayload` includes the following in the URL-encoded body sent to `postedituser`:

```
Token            — current bearer token value (duplicates Authorization header)
Password         — new password (only included when non-empty)
ConfirmPassword  — new password confirmation
... all other profile fields (name, ID, phones, addresses, etc.)
```

### E.2 Security observations

| # | Observation | Severity |
|---|-------------|----------|
| E-1 | **No current password re-authentication** | Medium |
| | A valid bearer token is sufficient to change the account password. An attacker who steals a live token (e.g. via XSS, shared device, or physical access) can permanently lock out the legitimate owner by changing the password — all without knowing the original. The protection is the bearer token's TTL (~24 h default) and whatever session revocation the CRBOX API provides on password change. | |
| E-2 | **Token in request body (`Token` field)** | Informational |
| | `buildUpdateProfilePayload` sets `params.set('Token', getToken())` in the URL-encoded body, in addition to the `Authorization: Bearer <token>` header that `_request()` also attaches. The body field appears to be a CRBOX API requirement (it is present in the `postedituser` payload contract). This doubles the token's surface area in the HTTP body but does not create a new attack vector beyond what token theft already implies. |

---

## F. Admin Portal Access

### F.1 Client-side admin detection

Two independent client-side lists determine whether a logged-in user sees admin UI elements:

| File | Variable | Value |
|------|----------|-------|
| `js/nav-auth.js` | `ADMIN_EMAILS` | 5 emails: `prueba@crbox.cr`, `ventas@crbox.cr`, `compras@crbox.cr`, `servicioalcliente@crbox.cr`, `esteban@crbox.cr` |
| `js/mobile-drawer.js` | `ADMIN_EMAIL` | Single string: `'prueba@crbox.cr'` only |

**Consequence of the inconsistency**: the four accounts other than `prueba@crbox.cr` will see the admin panel icon in the desktop navigation (via `nav-auth.js`) but will **not** see a "Panel Admin" link in the mobile side drawer (via `mobile-drawer.js`). They can still reach the admin portal on desktop or by navigating directly. This is a UX gap, not a security gap — the server-side gate is independent of both lists.

These client-side checks control only **UI decoration** (button visibility). They cannot grant or deny actual admin access.

### F.2 Admin portal login bridge (`/admin/portal-login`)

When a user clicks the admin button, the browser calls:

```
GET /admin/portal-login
Authorization: Bearer <user_token>
X-Casillero-Email: <email_from_localStorage>
```

`_handle_admin_portal_login` in `server.py` (line 11500) processes this:

1. Calls `_portal_auth_email_only()` (line 11550), which:
   - Extracts the `Authorization` header (must start with `Bearer `, minimum length 10).
   - Extracts the `X-Casillero-Email` header (must contain `@`).
   - Uses `X-Casillero-Email` **only to construct the URL** for the CRBOX `/getuserinfo/{email}` call — never as the authoritative email.
   - Makes an authenticated request to the CRBOX API: `GET /getuserinfo/{header_email}` with the user's bearer token.
   - Parses the API response for `Consignee.email` / `Consignee.Email` / `Consignee.correo`.
   - If the API returns no email field → returns `None` (access denied).
   - Returns the API-derived email as the authoritative identity.

2. Compares the API-derived email (lowercased, stripped) against the server-side set `_PORTAL_ADMIN_EMAILS` (5 entries, defined inline in the handler — identical to `nav-auth.js`).

3. **On success**: issues a `302 → /admin/solicitudes` with `Set-Cookie: admin_session=<token>; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800; [Secure]`.

4. **On failure**: responds `403` with `Content-Length: 0` and no `Set-Cookie` header.

### F.3 Admin session properties

| Property | Value |
|----------|-------|
| Storage | In-memory Python dict (`_admin_sessions`) — does not survive server restart |
| Token format | `secrets.token_hex(32)` (64 hex chars, 256-bit entropy) |
| TTL | 8 hours (`_ADMIN_SESSION_TTL = 8 * 3600`), sliding: refreshed on each authenticated admin request |
| Cookie flags | `HttpOnly`, `SameSite=Strict`, `Secure` (when `X-Forwarded-Proto: https`), `Path=/` |
| Revocation | `_admin_clear_session(token)` on logout; also auto-expires by TTL |

### F.4 Security observations

| # | Observation | Severity |
|---|-------------|----------|
| F-1 | **Server-side admin gate is correctly implemented** | Positive |
| | Identity is derived exclusively from the CRBOX API response. The client-supplied `X-Casillero-Email` cannot be used to escalate privilege — if it is spoofed to an admin email, the CRBOX API token validation will return the actual account's email, which will not match the spoofed one unless the attacker also controls a valid token for that account. | |
| F-2 | **Mobile drawer admin inconsistency** | Low |
| | `mobile-drawer.js` shows "Panel Admin" only for `prueba@crbox.cr`. The other 4 admin accounts lack this mobile shortcut. This is a UX gap only. | |
| F-3 | **Admin sessions are in-memory only** | Informational |
| | Server restarts invalidate all admin sessions silently. Users are redirected to the login page on the next request (TTL check returns false). No data loss risk, but admin users may experience unexpected session drops during deployments. | |
| F-4 | **`Secure` cookie flag is conditional** | Informational |
| | The `Secure` flag is set only when `X-Forwarded-Proto: https` or `X-Forwarded-Ssl: on` is present. In the Replit hosted environment these headers are reliably set by the proxy. In a development HTTP environment the flag is absent, which is acceptable for local dev. |

---

## G. Token Storage & Session Management

### G.1 Storage keys

All session state lives in `localStorage` (never `sessionStorage` for new sessions):

| Key | Content |
|-----|---------|
| `crbox_access_token` | CRBOX OAuth2 bearer token |
| `crbox_expires_at` | Unix timestamp (ms) when the token expires |
| `crbox_remember` | `'true'` / `'false'` — user's remember-me preference |
| `crbox_email` | Account email address |
| `crbox_display_name` | Full name cache (set by mobile-drawer.js / portal pages) |
| `crbox_casillero_num` | `'Casillero #NNN'` cache |
| User data keys (several) | Cleared on logout via `USER_DATA_KEYS` array in auth.js |

### G.2 Design rationale for localStorage

Documented in `js/auth.js` (lines 8–18): Safari on iOS silently wipes `sessionStorage` when the browser sends the app to background. A user who background-tabs and returns would find themselves unexpectedly logged out. `localStorage` is persistent across backgrounding. The comment explicitly acknowledges that this increases XSS exposure versus `HttpOnly` cookies, and notes that `HttpOnly` cookies are not viable because client-side JavaScript must read the token to attach `Authorization` headers to direct API calls.

### G.3 Session validation logic

`isLoggedIn()` in auth.js returns `true` only when:
- `crbox_access_token` is non-empty in localStorage (or old sessionStorage migration).
- `crbox_expires_at` is in the future (compared to `Date.now()`).

Expired tokens call `clearToken()` which removes all four core keys plus user data keys from both `localStorage` and `sessionStorage`.

### G.4 Migration from sessionStorage

`getToken()` and `getEmail()` first check `localStorage`, then fall back to `sessionStorage` (lines 77–84). This is a one-way migration: values found in `sessionStorage` are used but not re-written to `localStorage`. They will be naturally cleared when the session ends. No explicit migration upgrade path; old sessions just expire.

### G.5 Re-validation events

| Event | Trigger | Action on expired token |
|-------|---------|------------------------|
| `pageshow` (bfcache) | `e.persisted === true` | `clearToken()` + redirect to `login.html?msg=session-expired` |
| `visibilitychange` | `document.visibilityState === 'visible'` | `clearToken()` + redirect to `login.html?msg=session-expired` |

Both events also dispatch the `crbox:pageresume` CustomEvent when the session is still valid, allowing portal page scripts to re-hydrate stale data without a full reload.

---

## H. Findings Summary & Cutover Table

### H.1 Finding register

| ID | Finding | File(s) | Severity | Exploitability | Recommendation |
|----|---------|---------|----------|---------------|----------------|
| F-01 | Password recovery email in URL path | `js/portal-api.js` line 750 | **Low-Medium** | Low — requires log access | Ideally move email to POST body or query parameter; blocked by CRBOX API design. Document log-retention policy for access logs on CRBOX CDN/proxy. |
| F-02 | Password change requires no current password | `mi-cuenta.html`, `js/auth.js` line 297 | **Medium** | Medium — requires stolen live token | Add a "current password" field to the security tab. Include it in the `postedituser` payload if the CRBOX API supports it. Token theft is still a prerequisite, but this limits blast radius. |
| F-03 | No frontend rate limiting on password recovery | `js/portal-api.js` line 750 | **Low** | Low — relies on CRBOX API throttle | Add a simple in-memory or localStorage-based per-session cooldown (e.g. 60 s between attempts) on the `login.html` reset modal. |
| F-04 | `/crbox-svc-token` has no Origin/Referer check | `server.py` line 11404 | **Low** | Low — mitigated by rate limiting + token scope | Existing mitigations are adequate. Consider a dedicated rate limit bucket separate from the quote-email limit so aggressive registration attempts cannot exhaust the shared window. |
| F-05 | Mobile drawer admin button missing for 4 of 5 admin accounts | `js/mobile-drawer.js` line 11 | **Low** (UX gap) | Not applicable — server gate is correct | Update `ADMIN_EMAIL` to an `ADMIN_EMAILS` array matching `nav-auth.js`. |
| F-06 | Bearer token stored in `localStorage` (XSS surface) | `js/auth.js` lines 51–65 | **Low** (accepted) | Low — requires XSS vector | Design choice is documented and justified. Conduct periodic CSP review to harden against XSS. No action required unless XSS is found. |
| F-07 | `Token` field duplicates `Authorization` header in `postedituser` body | `js/auth.js` line 297 | **Informational** | None additional | No action needed; CRBOX API appears to require both. |
| F-08 | No MFA on any login path | `js/auth.js` `doLogin()` | **Informational** | Not applicable | Track whether CRBOX API adds MFA support. |
| F-09 | Password complexity: 8-char minimum only, client-side | `afiliate.html`, `mi-cuenta.html` | **Informational** | Low | Consider adding a visual strength meter. Confirm whether CRBOX API applies server-side complexity rules. |
| F-10 | Admin sessions stored in-memory; lost on restart | `server.py` line 4681 | **Informational** | None additional | Document expected behaviour in operator runbook. Acceptable given admin session TTL is 8 h and deployments are infrequent. |

### H.2 Severity key

| Severity | Meaning |
|----------|---------|
| **Medium** | Realistic attack path with non-trivial impact; recommended to address before next public launch |
| **Low-Medium** | Real risk, lower immediate impact or requires secondary precondition |
| **Low** | Mitigated or requires privileged position to exploit |
| **Informational** | Design note or best-practice gap; no direct exploit path |

### H.3 Positive security controls confirmed

| Control | Evidence |
|---------|---------|
| Admin identity derived from CRBOX API response only | `_portal_auth_email_only()` returns `None` if API response lacks email field; `X-Casillero-Email` is never trusted for the access decision |
| Service account credentials never reach the browser | `_handle_svc_token` reads only from env vars; token endpoint returns a short-lived token, not the credentials |
| Admin session cookie: HttpOnly + SameSite=Strict | `server.py` line 11535 |
| Logout clears all storage keys | `clearToken()` iterates both `localStorage` and `sessionStorage` |
| bfcache and tab-resume session re-validation | `pageshow` + `visibilitychange` handlers with immediate redirect on expiry |
| SSRF protection on product URL fetch | `_is_ssrf_safe()` + `_SafeRedirectHandler` block private network ranges on redirect chains |
| Registration error messages do not disambiguate missing vs wrong credentials | `doLogin()` error handling; consistent UI message |

---

*Audit completed: 2026-05-14. No code was modified during this audit. No production accounts were created or modified. No secrets were accessed or logged.*
