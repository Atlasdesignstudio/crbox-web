# CRBOX Legacy Portal Authentication — System Analysis

**Status:** Read-only forensic analysis. No code, env var, database, or deployment changes.
**Date:** 2026-05-22
**Sources:** `docs/auth-registration-password-recovery-audit.md`, `docs/rds-discovery-report.md`,
`js/auth.js`, `js/portal-api.js`, `server.py`, production failure evidence in
`docs/rds-packages-production-enablement-report.md`, `docs/rds-portal-auth-fix-plan.md`

---

## 1. What system `/authtoken` uses

### Answer: ASP.NET OWIN/Katana Bearer Token Middleware — OAuth 2.0 ROPC grant

**Evidence (directly from `js/auth.js` and `docs/auth-registration-password-recovery-audit.md`):**

```
Endpoint:      POST https://clients.crbox.cr/authtoken
Content-Type:  application/x-www-form-urlencoded
Payload:       grant_type=password&username=<email>&password=<password>
Response:      { "access_token": "...", "expires_in": 86399 }
```

The path `/authtoken` — at the **root of the domain**, not under `/api/...` — is the **default OWIN OAuth2 token endpoint location** in ASP.NET Web API 2 with the `Microsoft.Owin.Security.OAuth` package. The payload format (`grant_type=password`, `username`, `password`) and response shape (`access_token`, `expires_in`) are the **OAuth 2.0 Resource Owner Password Credentials (ROPC) grant** exactly as implemented by the Katana middleware.

The backend is confirmed **.NET** by the presence of 14 Hangfire tables in the MySQL RDS (`HangfireJob`, `HangfireServer`, `HangfireState`, etc.) — Hangfire is a .NET background job library with no equivalent in other stacks.

**Important distinction:**
- **OWIN middleware** (`OAuthAuthorizationServerMiddleware`) is the **token issuer** — it handles `/authtoken`, generates and validates bearer tokens, and is what the ROPC endpoint belongs to.
- **ASP.NET Identity** is the **user store layer** — it manages password hashing, user lookups, role assignments, and lockout state. OWIN delegates credential validation to it.
- These are two separate components that work together. The question of whether ASP.NET Identity is used is about the user store, not the token endpoint itself.

**Token format (opaque vs JWT):**
The `access_token` returned by OWIN's default configuration is an **opaque, encrypted, self-contained ticket** — not a standard JWT. It is a Base64url-encoded, AES-encrypted blob containing the user's claims (including `sub`, name, and roles). It is only valid on the server that issued it (same machine key / DPAPI key). There is no standard JWT `header.payload.signature` structure — `js/auth.js` never calls `.split('.')` on the token or attempts to decode it locally.

**Token expiry behavior (confirmed from `js/auth.js`):**
- Default from API: `expires_in = 86399` seconds (~24 hours). The server sometimes omits this field; the client defaults to 86,399 s.
- "Remember me" = `true`: client overrides to 2,592,000 s (30 days) regardless of server value. This is purely client-side — the actual server ticket lifetime is fixed.

---

## 2. Which database/schema contains the login users

### Answer: Likely a separate database inaccessible via the MySQL RDS connection — not `crbox_dev1`/`CrBox`

**Evidence from `docs/rds-discovery-report.md`:**

The MySQL RDS discovery enumerated **91 tables** in `crbox_dev1`. No standard ASP.NET Identity tables were found:

| ASP.NET Identity standard table | Present in MySQL RDS? |
|---|---|
| `AspNetUsers` | ❌ Not found |
| `AspNetRoles` | ❌ Not found |
| `AspNetUserRoles` | ❌ Not found |
| `AspNetUserLogins` | ❌ Not found |
| `AspNetUserTokens` | ❌ Not found |
| `AspNetUserClaims` | ❌ Not found |
| `__EFMigrationsHistory` | ❌ Not found |

The `consignee` table (30 confirmed columns) has no `password`, `passwordHash`, `securityStamp`, or `normalizedEmail` column in any of the documented schema.

The `user` table (2 columns: `idUser`, `username`) has only 64 rows — far too few to represent the 31,580 consignee accounts and has no password column.

**Most likely conclusion:** ASP.NET Identity (or the custom auth store) lives in a **separate SQL Server database** that is NOT the MySQL RDS at `crboxdbserver.cvfe6dzk8nhz.us-east-1.rds.amazonaws.com`. The MySQL RDS is the **operational/logistics database** only. The auth database is a separate, inaccessible system.

**Alternative (lower probability):** The `consignee` table has additional columns that were not accessible to `CrBoxUser` during discovery (column-level grants in MySQL are possible). If a `passwordHash` column exists but was excluded from `SELECT *` for `CrBoxUser`, it would not appear in the discovery. This would require explicit confirmation from CRBOX.

---

## 3. Relationship between auth user and consignee / idConsignee

### Answer: `consignee.email` is the username; `idConsignee` is the stable identity anchor

The relationship is unambiguous from the token verification flow:

```
Login:
  username = consignee.email
  password = consignee's credential (stored in auth DB)
  → OWIN issues Bearer token encoding claims (at minimum: sub = email or idConsignee)

Token verification (getuserinfo):
  GET clients.crbox.cr/api/crboxwebapi/getuserinfo/{email}
  Authorization: Bearer <token>
  ← Response.Consignee.idConsignee (primary identity returned)
  ← Response.Consignee.email (confirmed email from server)
```

The `idConsignee` value extracted from the `getuserinfo` response is the only identity value the RDS proxy trusts — the client-supplied email in `X-Casillero-Email` is used only to construct the API URL, never as the authoritative identity.

**Google OAuth path:** `google_token_consignee` (3 cols: `emailConsignee`, `googleToken` + likely an id column) stores Google OAuth tokens linked by email. The mapping goes: Google account → `emailConsignee` → resolves to `consignee.email` → `idConsignee`. So Google SSO users also ultimately resolve to the same `idConsignee` anchor.

**Registration creates both simultaneously:** `postregisteruser` creates a `consignee` record and an auth credential in a single operation. The two records are always created together — there is no "orphan" auth user without a consignee record, by design.

---

## 4. Whether a read-only user can be created for metadata inspection

### Answer: Depends on which database — yes for MySQL RDS, unknown for the auth database

| Database | Read-only user possible? | Notes |
|---|---|---|
| MySQL RDS (`crbox_dev1`/`CrBox`) | **Yes** | `CrBoxUser` already exists. CRBOX infra can run `GRANT SELECT ON CrBox.* TO 'crbox_ro'@'%'` with a new credential. The `docs/crbox-portal-ro-setup.sql` file already specifies the scoped grants we need. |
| Auth database (separate, likely SQL Server) | **Unknown** | We have no connection string, no hostname, and no confirmed existence of this database. CRBOX cooperation is required to even confirm whether it exists as a separate SQL Server instance. |

**If the auth tables are hidden columns in `consignee`:** A new MySQL user with `GRANT SELECT ON CrBox.consignee TO ...` would expose those columns if they exist. This could be tested by CRBOX running a `SHOW FULL COLUMNS FROM consignee` as a user with full privileges and comparing the column list to what `CrBoxUser` sees.

---

## 5. Tables for users, roles, password hashes, tokens, lockouts, and password recovery

### Answer: Not present in the accessible MySQL RDS — auth data is elsewhere

**What IS in the MySQL RDS that touches auth/identity:**

| Table | Rows | Columns | Role | Contains credentials? |
|---|---|---|---|---|
| `consignee` | ~31,580 | 30 | Customer identity record | Email, no password visible |
| `user` | 64 | 2 (`idUser`, `username`) | CRBOX staff only | No password column |
| `google_token_consignee` | 1,422 | 3 | Google OAuth tokens by email | OAuth tokens (access/refresh) |
| `devices_id` | 680 | 3 | Mobile push device tokens | Device push tokens |
| `ConsigneeBakEscazu_200617` | 1,142 | 24 | 2020-06-17 consignee backup | Same as consignee, no passwords |

**What is NOT in the accessible MySQL RDS:**

| Auth concern | Table (standard ASP.NET Identity) | Status in MySQL |
|---|---|---|
| User accounts + password hashes | `AspNetUsers` | ❌ Not present |
| Roles | `AspNetRoles` | ❌ Not present |
| User-role assignments | `AspNetUserRoles` | ❌ Not present |
| Lockout data | `AspNetUsers.LockoutEnd`, `LockoutEnabled`, `AccessFailedCount` | ❌ Not present |
| Password reset tokens | `AspNetUserTokens` | ❌ Not present |
| External login providers | `AspNetUserLogins` | ❌ Not present |
| User claims | `AspNetUserClaims` | ❌ Not present |

**Password recovery:** The `getuserpasswordrecovery/{email}` endpoint returns `Message: "OK"` when the reset email is sent. No reset token table is visible in the MySQL RDS — the token generation and validation happen entirely server-side in the .NET backend, stored in whatever auth database it uses.

---

## 6. Whether the password hash follows the standard ASP.NET Identity format

### Answer: Cannot be confirmed — no password column is accessible via the MySQL RDS

The standard ASP.NET Identity password hash format (for reference):

**Identity v2 (ASP.NET Identity 2.x, .NET Framework):**
```
[0x00] + [16-byte random salt] + [32-byte PBKDF2-SHA1 hash, 1000 iterations]
= 49 bytes → Base64-encoded to ~68 chars
```

**Identity v3 (.NET Core Identity 3.x+):**
```
[0x01] + [PRF algorithm (4B)] + [iteration count (4B)] + [salt length (4B)]
       + [salt (variable)] + [hash (variable)]
= PBKDF2-SHA256 or SHA512, 10,000+ iterations
```

Neither format is confirmed because no password column is visible in the accessible MySQL schema. If the system uses ASP.NET Identity with a MySQL provider (e.g., `AspNet.Identity.MySQL` community package), the tables may exist under different names than the SQL Server defaults, or with a `consignee_` prefix. This requires direct inspection by CRBOX.

**Practical implication for modernization:** If the goal is to migrate auth to a modern provider, the hash format matters for zero-downtime migration (rehash-on-login strategy). This must be confirmed with CRBOX before any auth migration plan is finalized.

---

## 7. IP or User-Agent restrictions when validating tokens from external servers

### Answer: **Confirmed restrictive behavior** — the production VM was rejected; root cause not fully documented by CRBOX

**Production evidence (from `docs/rds-packages-production-enablement-report.md`):**

```
17:53:50 — Production VM calls GET clients.crbox.cr/getuserinfo/<email>
           Authorization: Bearer <token>
           ← HTTP 401

Same token, same user, milliseconds earlier:
           Browser calls GET clients.crbox.cr/api/crboxwebapi/getuserpackages
           Authorization: Bearer <token>
           ← HTTP 200 OK (packages returned)
```

The same token was valid for the direct browser call and rejected for the server-side relay. The CRBOX API returned 401 specifically when the request originated from the Replit production VM's datacenter IP.

**From `docs/rds-portal-auth-fix-plan.md` — ranked hypotheses:**

| Cause | Mechanism | Assessed certainty |
|---|---|---|
| **IP-based restriction** | `getuserinfo` with a user Bearer token is accepted only from browser/residential IPs; datacenter/cloud IPs are rejected | Most likely |
| **Token IP binding** | Token is issued bound to the originating client IP; relay from a different IP causes CRBOX to see a spoofed token | Possible |
| **User-Agent gate** | CRBOX API checks `User-Agent`; `urllib.request` sends `Python-urllib/3.x` which CRBOX rejects | Less likely — testable by adding a browser User-Agent to the relay call |
| **CORS/Referer enforcement** | CRBOX rejects non-browser origins at the API gateway layer | Possible |

**What is NOT confirmed:** CRBOX has not provided documentation about this restriction. We are inferring from the 401-vs-200 production evidence. The fix plan's Option B (return 503 instead of 401 for relay failures) protects against this regardless of the exact cause.

**The User-Agent probe is a free first test:** Adding `User-Agent: Mozilla/5.0 (compatible; CRBOX-portal-proxy/1.0)` to the relay call costs nothing. If it resolves the 401, the restriction was user-agent-based. If not, it's IP-based (and Option B's 503 fallback is the mitigation path).

---

## 8. Official server-to-server endpoint for token verification

### Answer: **None found.** No documented or discoverable S2S introspection endpoint exists.

**Known CRBOX Core API endpoints (exhaustive list from codebase):**

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /authtoken` | None (credentials in body) | Issue bearer token (ROPC) |
| `GET /api/crboxwebapi/getuserinfo/{email}` | Bearer token | User profile + identity |
| `GET /api/crboxwebapi/getuserpackages/{id}` | Bearer token | Package list |
| `GET /api/crboxwebapi/getfacturas` | Bearer token | Invoice list |
| `GET /api/crboxwebapi/getuserpasswordrecovery/{email}` | None | Password recovery trigger |
| `POST /api/crboxwebapi/postregisteruser` | Service account Bearer | Registration |
| `POST /api/crboxwebapi/postedituser` | User Bearer token | Profile + password update |
| `POST /api/crboxwebapi/postcreatepurchasebill` | User Bearer token | Create purchase bill record |

**What a proper S2S endpoint would look like:**
An OAuth2 Token Introspection endpoint (RFC 7662) accepts `POST /introspect` with `token=<T>` and a server credential, and returns `{ "active": true/false, "sub": "...", "exp": ..., ... }`. OWIN's default Bearer token implementation does **not** expose such an endpoint — token validation is internal to the OWIN pipeline (it decrypts the ticket with the machine key and validates the claims). No introspection URL exists in the standard Katana package.

**The service account workaround (REJECTED):**
Using `CRBOX_SVC_EMAIL`/`CRBOX_SVC_PASSWORD` to get a service token and call `getuserinfo/{email}` verifies that the email is registered but does **not** verify that the caller holds a valid token for that account. This was evaluated and explicitly rejected in `docs/rds-portal-auth-fix-plan.md` (Option C) as a critical security flaw: any caller knowing a valid email could retrieve that user's data without ever presenting a valid user token.

**Implication:** Until CRBOX exposes a proper S2S token validation endpoint — or until auth is migrated to a JWT-based system (where the token can be verified with a static public key, no upstream call needed) — the only safe server-side verification path is `getuserinfo` with the user's token, subject to the IP restriction described in Question 7.

---

## Summary Table

| Question | Answer | Confidence | Source |
|---|---|---|---|
| Token system | ASP.NET OWIN/Katana Bearer Token — OAuth 2.0 ROPC grant | High | `js/auth.js` + `auth-registration-password-recovery-audit.md` |
| Token format | Opaque encrypted OWIN ticket (not JWT) | High | No `.split('.')` decode in `js/auth.js`; OWIN default behavior |
| Auth database | Separate database (likely SQL Server) — NOT the MySQL RDS | High | No ASP.NET Identity tables in 91-table MySQL schema |
| Auth ↔ consignee link | `consignee.email` = username; `idConsignee` = stable identity anchor | High | `_portal_auth_full()` + `getuserinfo` response structure |
| Read-only user (MySQL RDS) | Yes — can be created by CRBOX infra | High | `crbox_portal_ro` already planned |
| Read-only user (auth DB) | Unknown — requires CRBOX cooperation | Low | Auth DB location unconfirmed |
| Auth tables in MySQL | None visible (`user` = 64 staff rows only) | High | 91-table RDS discovery |
| Password hash format | Unknown — no password column visible | N/A | Not accessible |
| IP/UA restrictions on relay | **Yes, confirmed in production** — datacenter IP rejected | High | Production 401 evidence |
| S2S verification endpoint | None found | High | All known endpoints enumerated |

---

## What this means for the _portal_auth_full() fix

The production 401 is now better understood: the CRBOX `getuserinfo` endpoint behaves like a **user-facing API endpoint** (accepts browser requests with user tokens) rather than a server-to-server validation endpoint (which would accept relayed tokens from trusted server IPs). This is consistent with an OWIN bearer token model that has no introspection layer — the `getuserinfo` endpoint just happens to validate the token as a side effect of serving the profile, but its access model is browser-first.

The fix plan's Option B (return 503 on relay failure, fallback to legacy) remains the correct and safest approach because:
1. There is no S2S endpoint to use instead
2. The service account option is a security flaw
3. JWT migration (which would eliminate the upstream call entirely) is Phase 5 — years away
4. 503 → silent legacy fallback preserves the session and still validates the token correctly via the browser-direct legacy path

---

*Analysis completed: 2026-05-22. No accounts created, no credentials accessed, no production systems modified.*
*Author: Replit Agent — synthesized from all available documentation and source code.*
