# RDS Profile Frontend Wiring

**Status:** Implemented — feature flag off by default (`USE_RDS_PROFILE_FRONTEND` unset).
**Date:** 2026-05-14
**Pattern:** Identical to `mis-paquetes` (RDS packages) and `mis-facturas` (RDS invoices).

---

## Overview

`mi-cuenta.html` can now load the authenticated user's profile from either:

- **Legacy path** (default): `CRBOXPortalAPI.getUserInfo()` → CRBOX `/getuserinfo/<email>`
- **RDS path** (feature-flagged): `CRBOXPortalAPI.getProfileRDS()` → `GET /api/portal/profile-rds`

The selection is controlled by `USE_RDS_PROFILE_FRONTEND=true` in Replit Secrets, surfaced via
`GET /api/config` → `featureFlags.useRdsProfile`. When the flag is off (or `/api/config` fails),
the legacy path is used with zero code-path difference.

---

## Endpoint: `GET /api/portal/profile-rds`

### Auth
Bearer token + `X-Casillero-Email` header, validated via CRBOX `/getuserinfo/<email>`.
Identity is always resolved server-side from the CRBOX API response.

### Feature flag
`USE_RDS_PROFILE_FRONTEND=true` in Replit Secrets. Returns `503 feature_disabled` when
unset, which the frontend treats as "use legacy instead."

### Response shape
```json
{
  "ok": true,
  "source": "rds",
  "profile": {
    "idConsignee": 50601002,
    "email": "user@example.com",
    "name": "Juan",
    "lastName1": "Pérez",
    "lastName2": null,
    "fullName": "Juan Pérez",
    "identificationType": "Cedula ó Residencia",
    "identificationNumberMasked": "****0649",
    "isCompany": false,
    "casillero": "00481",
    "receivesNewsletter": true,
    "branch": { "id": 1, "name": "Sabana Norte (Oficina Central)" },
    "phones": [
      { "phoneMasked": "****0222", "phoneType": "Celular", "isPrimary": true }
    ],
    "addresses": [
      {
        "address1": "Calle 123",
        "address2": null,
        "city": "San José",
        "province": "S",
        "addressType": "Casa",
        "isPrimary": true
      }
    ]
  }
}
```

### Security boundary (enforced by `_rds_query_profile` + handler)
| Field | Treatment |
|---|---|
| `identificationNumber` (raw) | Never returned — masked as `identificationNumberMasked` |
| `phoneNumber` (raw) | Never returned — masked as `phoneMasked` per phone entry |
| `client.cedulaJuridica` | Not returned (Tier 4 — admin only) |
| `plan` | Not returned (not displayed in mi-cuenta.html phase 1) |
| `joinValidationStatus`, `failedJoins`, `_withheldFields` | Not returned (admin/shadow only) |
| `birthDate`, `alternativeEmail`, `residenceCountry`, `contactName*` | Withheld entirely by `_rds_query_profile` |

### Error codes
| Status | Code | Frontend action |
|---|---|---|
| 503 | `feature_disabled` | Silent fallback to legacy |
| 503 | `rds_not_found` | Silent fallback to legacy |
| 401 | `auth_required` | Propagate — redirect already in flight |
| 502 | `rds_error` / `unexpected_database` | `isAuthError=false` → silent fallback |

---

## Field mapping: RDS → `_applyProfile` (legacy-compatible)

`_mapRdsProfile()` in `js/portal-api.js` converts the RDS response into the same shape
that `_applyProfile` in `mi-cuenta.html` already handles, so the renderer needs no changes.

| `_applyProfile` reads | Legacy source | RDS source | Notes |
|---|---|---|---|
| `c.consigneename` | `Consignee.consigneeName` | `profile.name` | |
| `c.consigneelastname1` | `Consignee.consigneeLastName1` | `profile.lastName1` | |
| `c.idconsignee` | `Consignee.idConsignee` | `profile.idConsignee` | Numeric portal ID |
| `c.email` | `Consignee.email` | `profile.email` | |
| `c.phones[0].phonenumber` | Raw phone | `profile.phones[0].phoneMasked` | **Masked in RDS path** |
| `c.identificationnumber` | Raw ID number | `profile.identificationNumberMasked` | **Masked in RDS path** |
| `c.identificationtype` | Type label | `profile.identificationType` | |
| `c.receivesNewsletter` | Boolean | `profile.receivesNewsletter` | |
| `c.sucursal._name` | Branch name | `profile.branch.name` | |
| `raw.Addresses[].address1` | `Address1` | `profile.addresses[].address1` | |
| `raw.Addresses[].city` | `City` | `profile.addresses[].city` | |
| `raw.Addresses[].province` | Province string | `profile.addresses[].province` | Single-char code or null |

### Known behavioral differences (RDS path vs legacy)

| Field / Element | Legacy | RDS | Accepted? |
|---|---|---|---|
| `profile-id-number` | Raw ID (e.g. `1-0649-xxxx`) | Masked `****0649` | Yes — privacy improvement |
| `profile-phone` | Raw phone (e.g. `8800-0222`) | Masked `****0222` | Yes — privacy improvement |
| Discount badge | Shows `PendingDiscount` % if > 0 | Always hidden (no such column in RDS) | Yes — field did not exist in DB |
| Province display | Full string from CRBOX API | Single-char code (e.g. `"S"`) or `null` | Acceptable — legacy also un-translated |

---

## Frontend wiring (`mi-cuenta.html`)

### Init sequence (DOMContentLoaded)
1. `/api/config` fetch fires immediately (fire-and-forget, non-critical).
2. RDS-first call starts after config fetch completes (sub-10 ms; CRBOX API takes 300–800 ms so flag is always set in time).
3. If `_useRdsProfile` is true: `getProfileRDS()` → on any non-auth error, silent fallback to `getUserInfo()`.
4. If `_useRdsProfile` is false: `getUserInfo()` directly — zero code-path difference.

### Fallback guarantee
- 401/403 from either path → `isAuthError=true` → redirect (already in flight from `portal-api.js`).
- Any other RDS failure → `isAuthError=false` → silent `console.debug` + fallback to legacy.
- Config fetch failure → `_useRdsProfile` stays `false` → legacy path unchanged.

### bfcache restore (`crbox:pageresume`)
Intentionally kept on legacy `getUserInfo()`. bfcache restores are timing-sensitive and the
async config flag may not be set when the handler fires.

### Edit/password save flows
`CRBOXPortalAPI.getUserInfo()` calls in the profile-edit and password-save handlers are
intentionally unchanged — write flows remain on the legacy path in this phase.

---

## QA

### Enable the flag (dev only)
Set `USE_RDS_PROFILE_FRONTEND=true` in Replit Secrets, restart the server.

### Browser console helpers
```js
// Check which path is active and log the normalised profile
window._qaLoadProfile()

// Inspect the raw RDS response (all fields already masked by server)
window.__crboxRdsProfileRaw

// Force-reload the profile from whichever path is active
CRBOXPortalAPI.getProfileRDS()   // RDS directly
CRBOXPortalAPI.getUserInfo()     // Legacy directly
```

### Checklist
- [ ] `USE_RDS_PROFILE_FRONTEND=false` (unset): page loads normally, no console errors.
- [ ] `USE_RDS_PROFILE_FRONTEND=true`: name, email, casillero, phone, ID, sucursal all render.
- [ ] `USE_RDS_PROFILE_FRONTEND=true`: profile-edit save still works (legacy write path unchanged).
- [ ] `USE_RDS_PROFILE_FRONTEND=true`: password-change save still works.
- [ ] `_qaLoadProfile()` logs `source: 'rds'` when flag is on, `source: 'legacy'` when off.
- [ ] `window.__crboxRdsProfileRaw` is populated when RDS path runs; no raw PII visible.
- [ ] Discount badge hidden on RDS path (expected — no PendingDiscount in RDS).
- [ ] Province field shows raw code or blank (not an error) — matches legacy un-translated behaviour.
- [ ] Logged-out user: page redirects correctly (auth guard unchanged).

---

## Activation for production
1. Confirm QA checklist above passes on dev.
2. Set `USE_RDS_PROFILE_FRONTEND=true` in **production** Replit Secrets.
3. Restart the production server.
4. Verify `window._qaLoadProfile()` in browser console on the live site.
