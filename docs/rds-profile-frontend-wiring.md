# RDS Profile Frontend Wiring

**Status:** Dev QA complete — write-path data safety issue identified. Production enablement BLOCKED pending fix.
**Wiring date:** 2026-05-14
**Dev flag enabled:** 2026-05-14
**Last QA update:** 2026-05-14
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

### Edit/password save flows — current state

The `updateProfile()` call itself (→ `postedituser`) is unchanged from pre-RDS.
However, **`window.__crboxUserInfo` is now the RDS-mapped object when the RDS path is active.**
`buildUpdateProfilePayload` in `auth.js` reads `window.__crboxUserInfo` as its base, which means:

| Field in payload | Legacy value | RDS value | Risk |
|---|---|---|---|
| `Consignee.IdentificationNumber` | Raw (e.g. `1-0649-xxxx`) | Masked `****0649` | **Corrupts ID in CRBOX if API overwrites** |
| `Phones[].phonenumber` | Raw (e.g. `88000222`) | Masked `****0222` | **Corrupts phone in CRBOX if API overwrites** |
| `Consignee.BirthDate` | Real value from CRBOX | `""` (not in RDS) | May null out field |
| `Consignee.AlternativeEmail` | Real value | `""` (not in RDS) | May null out field |
| `CompanyCode` | Real value | `""` (not in RDS) | May null out field |

**This is a blocking issue.** The newsletter checkbox save and password change both use this path.
The fix is to maintain a separate legacy raw object for write operations, distinct from the RDS
display object. Fix must happen before production enablement.

---

## QA

### Flag status
`USE_RDS_PROFILE_FRONTEND=true` is **active in `development` environment**.
Production is off — will be enabled after blocking issue is resolved.

### Browser console helpers
```js
// Check which path is active and log the normalised profile
window._qaLoadProfile()

// Inspect the raw RDS response (all fields already masked by server)
window.__crboxRdsProfileRaw

// Force-reload from a specific path
CRBOXPortalAPI.getProfileRDS()   // RDS directly
CRBOXPortalAPI.getUserInfo()     // Legacy directly
```

### Manual QA checklist — `mi-cuenta.html` RDS integration

> Open browser DevTools → Network tab before loading `mi-cuenta.html`.
> Log in as a test account. Run `window._qaLoadProfile()` in the console after load.

**API / network checks**
- [x] `/api/config` response contains `useRdsProfile: true`
- [x] `/api/portal/profile-rds` fires on page load (visible in Network tab)
- [x] `/api/portal/profile-rds` response contains `"source": "rds"`
- [x] `/api/portal/profile-rds` response contains **no** `identificationNumber` (raw)
- [x] `/api/portal/profile-rds` response contains **no** `phoneNumber` (raw)
- [x] `/api/portal/profile-rds` response contains **no** `cedulaJuridica`
- [x] `/api/portal/profile-rds` response contains **no** `joinValidationStatus`, `failedJoins`, or `_withheldFields`
- [x] `/api/portal/profile-rds` response contains **no** `birthDate`, `responsabilidad`, `omitirReceptor`, `_bIsDeleted`, `_bIsChanged`

**Profile render — desktop**
- [x] Profile data renders correctly from RDS (name, email, casillero, branch, addresses)
- [x] Phone field renders masked (e.g. `****0222`) — privacy improvement, expected
- [x] Identification number renders masked (e.g. `****0649`) — privacy improvement, expected
- [x] Newsletter checkbox reflects `receivesNewsletter` value correctly
- [x] Discount badge is hidden (expected — `PendingDiscount` column does not exist in RDS)
- [x] Province field: single-char code or blank is acceptable (not a regression)

**Console / QA helpers**
- [x] `_qaLoadProfile()` logs `source: 'rds'` when flag is on
- [x] `window.__crboxRdsProfileRaw` populated; no raw PII visible

**Edit / save flows**
- [ ] Newsletter save — see Newsletter UI section below (**BLOCKED**)
- [ ] Password change — see Password UI section below (**BLOCKED**)
- [ ] Profile-edit save (name, phone, address) — **BLOCKED** (same root cause)

**Auth / fallback**
- [ ] Fallback: set `USE_RDS_PROFILE_FRONTEND=false`, reload — profile loads via `getUserInfo()`
- [ ] Logged-out user: page redirects correctly

**Mobile layout**
- [ ] Mobile: tab nav scrolls horizontally without overflow
- [ ] Mobile: Newsletter tab renders correctly (checkbox + label + button)
- [ ] Mobile: Security tab renders correctly (two password inputs + button)
- [ ] WhatsApp floating button does not obscure "Guardar Preferencias" / "Actualizar Contraseña"

---

## Newsletter / Promociones UI — Audit

**Section:** "Canales de Notificación" / "Suscripciones" / "Guardar Preferencias"

### Checkbox initialization
- **Read path:** `_applyProfile` reads `c.receivesNewsletter || c.ReceivesNewsletter`.
  `_mapRdsProfile` sets both keys from `profile.receivesNewsletter`. ✅
- `receivesNewsletter: true` → checkbox checked ✅
- `receivesNewsletter: false` → checkbox unchecked ✅

### Save wiring
- **Button:** `#save-notifications-btn`
- **Endpoint:** `postedituser` via `CRBOXPortalAPI.updateProfile()` (legacy write path, unchanged)
- **Auth:** Bearer token (same as all portal write ops)
- **Method:** POST, `application/x-www-form-urlencoded`, credentials in body only ✅
- **Payload builder:** `CRBOXAuth.buildUpdateProfilePayload(window.__crboxUserInfo, { receivesNewsletter: <bool> })`
- **Success feedback:** spinner → "¡Guardado!" checkmark, auto-reverts after 2 s ✅
- **Error feedback:** generic Spanish message in `#notifications-save-error`, auto-hides after 5 s, no PII exposed ✅
- **Post-save:** `clearUserInfoCache()` + `getUserInfo()` (legacy) re-fetch to confirm server state ✅
- **Analytics:** `profile_edit_start` + `profile_update_success/error` events fire ✅

### ⚠️ Blocking issue — masked/missing fields in write payload
When RDS path is active, `window.__crboxUserInfo` is the `_mapRdsProfile` output.
`buildUpdateProfilePayload` reads all consignee fields from it, producing:

```
Consignee.IdentificationNumber = "****0649"   ← masked, not raw
Phones                         = [{"phonenumber":"****0222"}]  ← masked
Consignee.BirthDate            = ""           ← not in RDS object
Consignee.AlternativeEmail     = ""           ← not in RDS object
CompanyCode                    = ""           ← not in RDS object
```

The newsletter boolean itself (`Consignee.ReceivesNewsletter`) **would save correctly**.
However, the surrounding fields are corrupted. If `postedituser` performs a full overwrite
(likely), pressing "Guardar Preferencias" could corrupt the user's ID number, phone,
birthdate, and alternative email in the CRBOX backend.

**Verdict:** Functionally wired. Newsletter bit would save. **Not safe for production use**
until write flows are decoupled from the RDS display object.

**Required fix (before production):** Maintain a separate `window.__crboxUserInfoLegacy`
populated from `getUserInfo()` (always legacy) to use as the base for all
`buildUpdateProfilePayload` calls, regardless of which read path populated the display.

---

## Change Password UI — Audit

**Section:** "Cambiar Contraseña" / "Actualizar Contraseña"

### Form structure
- Fields: `#new_password`, `#confirm_password` — both `type="password"` with toggle-visibility buttons ✅
- No `current_password` field in the HTML (CRBOX API accepts session token + new password; no server-side current-password verification enforced)
- `autocomplete="new-password"` on both inputs ✅

### Endpoint
- **Same path as newsletter:** `postedituser` via `CRBOXPortalAPI.updateProfile()`
- **Auth:** Bearer token from `CRBOXAuth.getToken()` ✅
- **Method:** POST, `application/x-www-form-urlencoded`
- **Password in body only** (`Password=...&ConfirmPassword=...`), never in URL ✅
- Password fields only appended to payload when non-empty (guarded in `buildUpdateProfilePayload`) ✅

### Client-side validation
| Check | Status |
|---|---|
| Empty fields | ✅ "Por favor ingresa la nueva contraseña y su confirmación." |
| Mismatch | ✅ "Las contraseñas no coinciden. Verifica e intenta de nuevo." |
| Auth guard (not logged in) | ✅ Shows error, no request sent |
| Minimum length | ❌ No length check — single character accepted |
| Password strength | ❌ No strength indicator or enforcement |
| Current password confirmation | ❌ Not required (API limitation, not a frontend gap) |

### Success / error messaging
- Success: clears both fields, button → "¡Contraseña actualizada!" (2.2 s), no PII in message ✅
- Error: generic Spanish message from API or fallback string, auto-hides, no PII ✅
- Post-save: `clearUserInfoCache()` + `getUserInfo()` re-fetch (same pattern as newsletter) ✅

### Risk to test account
- **Clicking "Actualizar Contraseña" with filled fields WILL change the password.** There is no
  confirmation dialog. Do not test with `prueba@crbox.cr` or any live account unless specifically authorized.

### ⚠️ Blocking issue — same as newsletter
Identical root cause: `buildUpdateProfilePayload` reads masked ID, masked phone, and empty
fields from `window.__crboxUserInfo` when RDS path is active. The password field itself
would be set correctly, but the surrounding payload fields are corrupted.

**Verdict:** Functionally wired. Password bit would change. **Not safe for production use**
for the same reasons as the newsletter save. Same fix required.

### Additional gap (non-blocking, UX)
No minimum password length validation. Recommend adding a ≥ 8 character check with a
visible strength indicator before production, independent of the RDS fix.

---

## Mobile layout — Assessment

### Tab navigation
- Container: `flex overflow-x-auto no-scrollbar` with `whitespace-nowrap` on each button ✅
- Tabs scroll horizontally on narrow screens without clipping ✅
- Four tabs (Personal, Dirección, Seguridad, Notificaciones) fit in a scrollable row ✅

### Notifications tab (mobile)
- Single-column layout: checkbox + label block, then button below ✅
- `p-6` padding on mobile (reduces to 2px at very narrow — acceptable) ✅
- No overflow risk: checkbox row uses `flex items-start` which wraps cleanly ✅

### Security tab (mobile)
- Two password inputs stacked vertically, each `w-full` ✅
- Toggle-visibility buttons: `absolute right-3` positioning — no overflow on narrow ✅
- "Actualizar Contraseña" button is full-width, not near bottom edge ✅

### WhatsApp floating button
- Fixed `bottom-right` (standard pattern across all pages) ✅
- "Guardar Preferencias" and "Actualizar Contraseña" buttons are mid-page, not bottom-right ✅
- No z-index conflict with tab content ✅
- On very narrow (320 px) screens: could overlap inline links in Delete Account section,
  but that section has no actionable form elements — acceptable ✅

### Long-value overflow
- `overflow-wrap: anywhere` applied to `.account-tab` region in `dashboard.css` (line 1308) ✅
- Masked values (`****0649`, `****0222`) are short — no overflow risk ✅

**Mobile verdict:** Layout is structurally sound. No regressions from RDS wiring changes.

---

## Final QA Report — `mi-cuenta.html` RDS Integration

| Area | Result | Notes |
|---|---|---|
| RDS profile read | ✅ PASSED | Endpoint fires, data renders, source: 'rds' confirmed |
| Secure response boundary | ✅ PASSED | No raw ID, phone, cedulaJuridica, joinValidationStatus, birthDate, responsabilidad, omitirReceptor, _bIsDeleted, _bIsChanged |
| Checkbox from RDS | ✅ PASSED | `receivesNewsletter` maps correctly, checkbox reflects state |
| Newsletter save | ⚠️ WIRED, BLOCKED | Functionally wired to `postedituser`. Unsafe for production: masked/missing fields in `buildUpdateProfilePayload` base object could corrupt ID, phone, birthDate in CRBOX backend |
| Password change | ⚠️ WIRED, BLOCKED | Same root cause. Also missing minimum length validation (separate gap) |
| Profile edit save | ⚠️ WIRED, BLOCKED | Same root cause as newsletter/password |
| RDS fallback to legacy | ✅ Verified at config level | Full browser fallback test pending (flag toggle) |
| Mobile layout | ✅ PASSED (code analysis) | Tab scroll, single-column layouts, no overflow risks |
| WhatsApp button overlap | ✅ PASSED | No conflict with save buttons |

### Final recommendation

**The RDS read integration is complete and correct.** The API fires, the security boundary
holds, all display fields render correctly, and the fallback guarantee is intact.

**Production enablement is BLOCKED** by a single root-cause issue: write flows
(`updateProfile` for newsletter, password, and profile-edit) use `window.__crboxUserInfo`
as the base for `buildUpdateProfilePayload`. When the RDS path is active, that object
contains masked ID/phone values and omits fields like `birthDate`, `alternativeEmail`, and
`CompanyCode`. Sending this payload to `postedituser` could corrupt user data in the
CRBOX backend.

**Required fix before production:**

Maintain a separate `window.__crboxUserInfoLegacy` variable, always populated from
`CRBOXPortalAPI.getUserInfo()` (the legacy `getuserinfo` call), and use it exclusively
as the base for all `buildUpdateProfilePayload` calls. The RDS-mapped object
(`window.__crboxUserInfo`) remains used only for display rendering.

This ensures:
- All three save flows (newsletter, password, profile-edit) always send correct raw values
- The RDS display path is fully decoupled from the write path
- No CRBOX backend data is at risk during a newsletter or password save

Once that fix is implemented and confirmed in dev QA, re-run the full checklist and
set `USE_RDS_PROFILE_FRONTEND=true` in production.

---

## Activation for production
1. Fix write-path data safety issue (see "Required fix" above).
2. Confirm all checklist items pass (including save flows).
3. Set `USE_RDS_PROFILE_FRONTEND=true` in **production** Replit Secrets.
4. Restart the production server.
5. Verify `window._qaLoadProfile()` in browser console on the live site returns `source: 'rds'`.
