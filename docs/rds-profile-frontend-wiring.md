# RDS Profile Frontend Wiring

**Status:** Write-path fix implemented. Pending final live browser QA of save flows before production enablement.
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

### Edit/password save flows — write-base separation (implemented 2026-05-14)

`window.__crboxUserInfo` is the display object — it may be RDS-mapped (masked values) when
the RDS path is active. All write flows now use a separate `window.__crboxUserInfoLegacy`
which is **always** populated from the real `CRBOXPortalAPI.getUserInfo()` response.

**How `__crboxUserInfoLegacy` is populated:**

| Scenario | How it is set |
|---|---|
| Legacy path active (`_useRds=false`) | `getUserInfo()` result → sets `__crboxUserInfoLegacy` then returns for display |
| RDS path active (`_useRds=true`) | Parallel fire-and-forget `getUserInfo()` → sets `__crboxUserInfoLegacy` independently of the RDS display call |
| RDS fallback to legacy | Fallback `getUserInfo()` result sets `__crboxUserInfoLegacy` before returning for display |
| bfcache restore (`crbox:pageresume`) | `getUserInfo()` result sets both `__crboxUserInfo` and `__crboxUserInfoLegacy` |
| After any successful save | Both `updateProfile().then` and post-save re-fetch update `__crboxUserInfoLegacy` |

**Write handler change (newsletter + password):**
```js
// Before: var rawInfo = window.__crboxUserInfo || {};
// After:
var rawInfo = window.__crboxUserInfoLegacy || window.__crboxUserInfo || {};
```
The `|| window.__crboxUserInfo` fallback guards against the race where the parallel
`getUserInfo()` has not yet resolved at the moment the user clicks save.

**Payload safety — before vs after fix (verified by automated test):**

| Field in `postedituser` payload | Before fix (RDS display object) | After fix (legacy object) |
|---|---|---|
| `Consignee.IdentificationNumber` | `****0649` (masked) | `1-0649-xxxx` (real) |
| `Phones[].phonenumber` | `****0222` (masked) | `88000222` (real) |
| `Consignee.BirthDate` | `""` (not in RDS) | real date |
| `Consignee.AlternativeEmail` | `""` (not in RDS) | real value |
| `CompanyCode` | `""` (not in RDS) | real value |

**Password additional fix:** client-side minimum length of 8 characters enforced before
any request is sent (validation order: empty → length → mismatch → submit).

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
- [ ] Newsletter save — `__crboxUserInfoLegacy` fix in place; live browser confirm pending
- [ ] Password change — `__crboxUserInfoLegacy` fix in place; live browser confirm pending (do not use real account)
- [ ] Profile-edit save (name, phone, address) — same fix applies; live browser confirm pending

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
- **Payload builder:** `CRBOXAuth.buildUpdateProfilePayload(window.__crboxUserInfoLegacy || window.__crboxUserInfo, { receivesNewsletter: <bool> })` ✅
- **Success feedback:** spinner → "¡Guardado!" checkmark, auto-reverts after 2 s ✅
- **Error feedback:** generic Spanish message in `#notifications-save-error`, auto-hides after 5 s, no PII exposed ✅
- **Post-save:** `clearUserInfoCache()` + `getUserInfo()` (legacy) re-fetch updates both `__crboxUserInfoLegacy` and `__crboxUserInfo` ✅
- **Analytics:** `profile_edit_start` + `profile_update_success/error` events fire ✅

### Write-base fix (implemented 2026-05-14) ✅

`rawInfo` now reads from `window.__crboxUserInfoLegacy` (full unmasked legacy object).
The `postedituser` payload will contain real ID, real phone, real birthDate, etc.
regardless of whether the display is driven by RDS or legacy.

**Verdict:** Wired and safe. Pending live browser confirmation of end-to-end save
(checkbox toggle → "Guardar Preferencias" → Network tab shows `postedituser` → value
persists on refresh).

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
| Minimum length (< 8 chars) | ✅ "La contraseña debe tener al menos 8 caracteres." (implemented 2026-05-14) |
| Mismatch | ✅ "Las contraseñas no coinciden. Verifica e intenta de nuevo." |
| Auth guard (not logged in) | ✅ Shows error, no request sent |
| Validation order | ✅ empty → length → mismatch → submit (no request sent on any failure) |
| Password strength indicator | ❌ No visual strength meter — acceptable for now |
| Current password confirmation | ❌ Not required by CRBOX API (API limitation, not a frontend gap) |

### Success / error messaging
- Success: clears both fields, button → "¡Contraseña actualizada!" (2.2 s), no PII in message ✅
- Error: generic Spanish message from API or fallback string, auto-hides, no PII ✅
- Post-save: `clearUserInfoCache()` + `getUserInfo()` re-fetch updates both `__crboxUserInfoLegacy` and `__crboxUserInfo` ✅

### Risk to test account
- **Clicking "Actualizar Contraseña" with filled fields WILL change the password.** There is no
  confirmation dialog. Do not test with `prueba@crbox.cr` or any live account unless specifically authorized.

### Write-base fix (implemented 2026-05-14) ✅

`rawInfo` now reads from `window.__crboxUserInfoLegacy` — identical fix to newsletter save.
The password field itself is set from `formEdits.password` (not from the base object), so
the masking issue never affected the password bit. The fix ensures the surrounding consignee
fields (ID, phone, birthDate, etc.) in the payload are also correct.

**Verdict:** Wired and safe. Pending live browser confirmation (do not test with real account).

### Remaining gap (non-blocking)
No visual password strength indicator. Minimum length (8) is now enforced. A strength meter
would improve UX but is not a safety blocker.

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
| Write-base separation | ✅ FIXED (2026-05-14) | `__crboxUserInfoLegacy` introduced; all save handlers use it as payload base |
| Newsletter save | ⚠️ Fix in place | Live browser e2e confirm pending (toggle checkbox → save → reload → state persists) |
| Password change | ⚠️ Fix in place | Live browser confirm pending; do NOT test with real account |
| Profile edit save | ⚠️ Fix in place | Same fix applies; live browser confirm pending |
| Password min-length validation | ✅ FIXED (2026-05-14) | 8-char minimum, correct validation order, no request sent on failure |
| RDS fallback to legacy | ✅ Verified at config level | Full browser fallback test pending (flag toggle) |
| Mobile layout | ✅ PASSED (code analysis) | Tab scroll, single-column layouts, no overflow risks |
| WhatsApp button overlap | ✅ PASSED | No conflict with save buttons |

### Final recommendation

**The RDS read integration is complete and correct.** The API fires, the security boundary
holds, all display fields render correctly, the fallback guarantee is intact, and the
write-path data safety issue is resolved.

**Files changed in write-path fix (`mi-cuenta.html` only):**
- Init sequence: parallel `getUserInfo()` fire-and-forget populates `__crboxUserInfoLegacy` when RDS path is active; legacy path and fallback also set it.
- bfcache restore: `__crboxUserInfoLegacy` kept in sync with `__crboxUserInfo`.
- Newsletter save handler: `rawInfo` reads from `__crboxUserInfoLegacy || __crboxUserInfo`; post-save re-fetch updates both.
- Password save handler: same pattern; plus ≥ 8 char minimum length check added before submission.
- No changes to `server.py`, `portal-api.js`, `auth.js`, or any other page.

**Remaining live browser checks before production enablement:**
1. With RDS enabled: confirm `window.__crboxUserInfoLegacy` exists after page load and is the full unmasked legacy object (check in console — no raw PII will be visible since it is not printed).
2. Newsletter: toggle checkbox → "Guardar Preferencias" → Network tab shows `postedituser` → reload → checkbox state persists.
3. Password: confirm validation messages fire for empty / < 8 chars / mismatch without sending any request (Network tab stays empty).
4. Fallback: set `USE_RDS_PROFILE_FRONTEND=false` in dev secrets → reload → profile loads via `getUserInfo()` with no visible error.
5. Logged-out: navigate to `mi-cuenta.html` without session → redirects correctly.

Once all five pass in a live browser session, set `USE_RDS_PROFILE_FRONTEND=true` in production.

---

## Activation for production
1. Complete remaining live browser checks listed above.
2. Set `USE_RDS_PROFILE_FRONTEND=true` in **production** Replit Secrets.
3. Restart the production server.
4. Verify `window._qaLoadProfile()` in browser console on the live site returns `source: 'rds'`.
5. Spot-check: confirm `window.__crboxUserInfoLegacy` is populated (object present, not undefined) without logging its contents.
