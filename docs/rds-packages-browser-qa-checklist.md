# mis-paquetes — RDS Packages Browser QA Checklist

**Account:** prueba@crbox.cr
**Flag:** `USE_RDS_PACKAGES_FRONTEND=true`
**Scope:** `mis-paquetes.html` only — read-only, no writes, no production DB changes
**Date written:** 2026-05-14

---

## Pre-conditions

Before starting, complete all of these or the tests will give misleading results.

### 1. Enable the feature flag

In Replit → Secrets, add (or set):

```
USE_RDS_PACKAGES_FRONTEND = true
```

Restart the server. Confirm with:

```
curl https://<your-dev-domain>/api/config
```

Expected: `{"featureFlags":{"useRdsPackages":true}}`

### 2. Know your test data

The dev RDS snapshot (`crbox_dev1`) holds data **through 2023-09-01** for `prueba@crbox.cr` (16 006 total packages, oldest 2010-11-02, newest 2023-09-01). The UI date picker tops out at "Último año" (last 365 days from today), which won't reach 2023 data.

**Workaround for dev environment — run this once in DevTools Console after login:**

```javascript
// Force-load a known date range with packages
window.__qaOverride = true;
_loadPackages(
  window._cachedConsigneeId || document.querySelector('[data-consignee-id]')?.dataset.consigneeId,
  new Date('2023-08-01'),
  new Date('2023-09-01')
);
```

> In **production**, `prueba@crbox.cr` should have recent packages so the default 30-day picker works without this workaround.

### 3. Open DevTools

- **Network tab** → filter by `Fetch/XHR`
- **Console tab** → set level to `Verbose` (to see `console.debug` messages)
- Keep both tabs visible throughout. Clear Network log before each test step.

---

## Test 1 — `/api/config` returns `useRdsPackages: true`

**Goal:** Confirm the flag is live and reaches the page.

**Steps:**
1. In the browser, navigate to `/api/config` directly.
2. Verify the response body is exactly: `{"featureFlags":{"useRdsPackages":true}}`
3. Navigate to `mis-paquetes.html`. In DevTools Console, before the page finishes loading, run: `_useRdsPackages`

**Pass criteria:**
- `/api/config` returns `useRdsPackages: true` ✓
- `_useRdsPackages` evaluates to `true` in the console after the config fetch resolves ✓

**Fail criteria:**
- `/api/config` returns `false` → flag not set; check Replit Secrets
- `_useRdsPackages` is `false` after page load → config fetch may have failed; check Console for fetch errors

---

## Test 2 — `/api/portal/my-packages` is called before legacy

**Goal:** Confirm the RDS endpoint is tried first and the legacy proxy is not called.

**Steps:**
1. Clear the Network log.
2. Load or reload `mis-paquetes.html` while logged in.
3. In the Network tab, look for requests to:
   - `/api/portal/my-packages` — the new RDS endpoint
   - `/api/packages-proxy` — the legacy endpoint

**Pass criteria:**
- `/api/portal/my-packages` appears in the Network log ✓
- `/api/packages-proxy` does **not** appear ✓
- The request to `/api/portal/my-packages` includes:
  - Header `Authorization: Bearer <token>` ✓
  - Header `X-Casillero-Email: prueba@crbox.cr` ✓
  - Query params `start=YYYY-MM-DD&end=YYYY-MM-DD` ✓
  - No `idConsignee` param in the URL ✓

**Fail criteria:**
- Both endpoints appear → IIFE fallback is firing (check Console for `[CRBOX] RDS packages failed`)
- Only `/api/packages-proxy` appears → `_useRdsPackages` is `false`; re-check Test 1

---

## Test 3 — Packages render correctly

**Goal:** Confirm the data returned by the RDS endpoint is parsed and displayed without field mapping errors.

**Steps:**
1. After load, scan the package list for any card that shows:
   - `undefined` where a value should be
   - `[object Object]`
   - Empty package number or date
2. Open one package card's detail view (or expand it). Check:
   - Package number (`number`) — should look like `R-XXXXXX`
   - Received date (`receiveddatetime`) — should be a human-readable date, not raw ISO string
   - Status (`statusName`) — e.g. "CRBOX", "EN TRÁNSITO", etc.
   - Weight (`totalweight`) — a number with units, e.g. `5.5 kg`
   - Tracking number (`trackingNumber`) — alphanumeric or `—` if none

**Pass criteria:**
- All visible fields contain real values or a clean "—" placeholder ✓
- No `undefined` or `[object Object]` anywhere in the list ✓
- Dates are displayed as human-readable strings (not raw ISO) ✓

**Fail criteria:**
- `undefined` in any card → `mapPackage()` key mismatch; compare displayed field name against the field list in `docs/rds-packages-frontend-wiring.md`

---

## Test 4 — Counters and summary cards match the package list

**Goal:** Confirm the `#total-paquetes`, `#showing-count`, and `#total-count-display` values are consistent with the rendered list.

**Steps:**
1. After packages load, note the values in:
   - The summary card labelled "Total Paquetes" (element `#total-paquetes`)
   - The "Mostrando X de Y" text (`#showing-count` / `#total-count-display`)
2. Manually count the visible package cards.
3. Apply a status filter (see Test 5). Confirm the counter updates to the filtered count, not the original total.
4. Clear the filter. Confirm the counter returns to the original total.

**Pass criteria:**
- Counter values match the rendered card count before and after filtering ✓
- Pagination (if present) correctly reflects total pages for the current filtered set ✓

---

## Test 5 — Status filters work

**Goal:** Confirm each status option narrows the list and sends the correct param to the server.

**Steps:**
1. Clear the Network log. Select **CRBOX** from the status dropdown.
2. A new `/api/portal/my-packages` request fires. In Network, verify the URL includes `&status=CRBOX`.
3. Confirm the package list now shows only packages where `statusName = "CRBOX"`.
4. Repeat for at least one more status (e.g. **EN TRÁNSITO** → `&status=EN+TR%C3%81NSITO`).
5. Select **Todos los estados**. Verify the request has no `&status=` param and the full list returns.

**Status options and their expected query values:**

| UI Label | Expected `&status=` value |
|----------|--------------------------|
| Todos los estados | *(param omitted)* |
| MIAMI | `MIAMI` |
| CARGADO | `CARGADO` |
| EN ESPERA | `EN+ESPERA` (URL-encoded space) |
| EN TRÁNSITO | `EN+TR%C3%81NSITO` |
| SJO | `SJO` |
| CRBOX | `CRBOX` |

**Pass criteria:**
- Each filter sends exactly the expected `&status=` value ✓
- List contents match the selected status ✓
- "Todos" clears the filter (no `&status=` param) ✓

---

## Test 6 — Date filters work

**Goal:** Confirm changing the date picker fires a new request with updated date params.

**Steps:**
1. Note the current `start=` param in the last Network request.
2. Clear the Network log. Change the date picker from **Último mes** to **Últimos 3 meses**.
3. A new request fires. Verify `start=` moved ~90 days earlier.
4. Change to **Último año**. Verify `start=` moved ~365 days earlier.
5. Change back to **Último mes**. Verify the list updates.

**Expected `start` dates (approximate — relative to today 2026-05-14):**

| Picker value | Approx `start=` |
|--------------|-----------------|
| Última semana | 2026-05-07 |
| Último mes *(default)* | 2026-04-14 |
| Últimos 3 meses | 2026-02-13 |
| Último año | 2025-05-14 |

> **Dev snapshot note:** All four options return **0 packages** in the crbox_dev1 environment because the snapshot ends at 2023-09-01. This is expected and correct (see Test 8 for empty state). Use the DevTools console workaround from Pre-conditions §2 to load the 2023 data for Tests 3–7.

**Pass criteria:**
- Each picker change fires a new `/api/portal/my-packages` request ✓
- `start=` param shifts by the correct number of days ✓
- `end=` remains today's date ✓

---

## Test 7 — Tracking/package number search works

**Goal:** Confirm the search input filters the list and sends the `&tracking=` param correctly.

**Steps:**
1. Using the `#search-input` field (the search bar at the top of the package list):
   a. Type a **partial** package number (e.g. `R-005`) — the list should narrow to matching entries.
   b. Clear and type a **full** tracking number from one of the visible packages — one result should show.
   c. Clear the input — the full list should return.
2. In the Network tab, confirm:
   - Requests with a tracking value include `&tracking=<value>` in the URL.
   - Clearing the input fires a request without `&tracking=`.
3. **SQL injection guard:** Type `%` or `_` into the search field. The server should return HTTP 400. Confirm the UI falls back gracefully (either shows an error message or falls back to the legacy endpoint — no crash or blank page).

**Pass criteria:**
- Partial search narrows the list correctly ✓
- Full tracking number returns one package ✓
- Clearing returns the full list ✓
- `%` / `_` characters return a 400 (check Network tab) and the UI handles it without a crash ✓

---

## Test 8 — Empty state renders correctly

**Goal:** Confirm the page shows a clean empty state — not a blank page or a JS error — when no packages match.

**Steps:**

**Method A (natural — use the default date picker in dev):**
The default 30-day range in the dev environment returns 0 packages from crbox_dev1. Simply load `mis-paquetes.html` with the default date picker (do not apply the console workaround). The empty state should display.

**Method B (using status filter):**
With the 2023 data loaded (console workaround applied), select a status that has no packages for that period (e.g. **MIAMI** if none exist in the range). The empty state should display.

**Check:**
1. An empty-state message appears in the package list area (not just a blank white box).
2. No JS errors appear in the Console tab.
3. The counter shows `0` or `—`, not `undefined`.
4. The search and filter controls are still interactive (not frozen).

**Pass criteria:**
- Clean, user-friendly empty state message is shown ✓
- No JS errors in Console ✓
- Counters show `0` ✓
- Page remains interactive ✓

---

## Test 9 — Mobile layout is correct

**Goal:** Confirm that the RDS change causes no regression on small screens.

**Steps:**
1. In DevTools → click the **device toolbar** icon (or press `Ctrl+Shift+M` / `Cmd+Shift+M`).
2. Set the viewport to **375 × 812** (iPhone SE / iPhone 14 Mini).
3. Reload `mis-paquetes.html` and load some packages (using the console workaround if on dev).
4. Check:
   - Package cards stack in a single column (no overflow or truncation)
   - Date picker and status filter dropdowns are usable without scrolling horizontally
   - Summary cards (total paquetes, showing count) are readable
   - Search bar is full-width and tappable
5. Switch to **768 × 1024** (iPad). Confirm two-column or side-panel layout if applicable.

**Pass criteria:**
- No horizontal overflow at 375px ✓
- All controls are fully accessible on mobile ✓
- Package cards are readable (not truncated) ✓

> **Note:** No CSS files were changed in this wiring — any mobile regression here would be pre-existing, not caused by this feature.

---

## Test 10 — No `_adminDebug` or `consigneeNotes` in Network response

**Goal:** Confirm sensitive/admin fields are never exposed to portal users.

**Steps:**
1. In the Network tab, click on the `/api/portal/my-packages` request.
2. Click **Response** (or **Preview**) to view the raw JSON.
3. Use `Ctrl+F` / `Cmd+F` to search within the response for:
   - `_adminDebug`
   - `consigneeNotes`
   - `adminDebug`
   - `idConsignee` (should only appear if it was server-resolved; confirm it is **not** a field inside each package object)

**Pass criteria:**
- `_adminDebug` is absent from the entire response ✓
- `consigneeNotes` is absent from every package object ✓
- The top-level response shape is `{ ok, source, count, packages: [...] }` ✓
- Each package object contains only frontend-safe fields ✓

**Expected response shape:**

```json
{
  "ok": true,
  "source": "rds",
  "count": 64,
  "packages": [
    {
      "idwarehousereceipt": 542506,
      "number": "R-...",
      "statusId": 5,
      "statusName": "CRBOX",
      "trackingNumber": "...",
      "receiveddatetime": "2023-09-01T01:00:00",
      "totalpieces": 1,
      "totalweight": 5.45,
      "consigneeSucursalName": "Sabana Norte (Oficina Central)",
      "hasPackage": 0,
      "impresoFactura": 0,
      "consolidadoFactura": 1
      ...
    }
  ]
}
```

---

## Test 11 — Legacy fallback still works when RDS fails

**Goal:** Confirm the page continues to show packages via the legacy endpoint if `/api/portal/my-packages` is unavailable, and that the user sees no error.

### Method: Block the RDS endpoint via DevTools Request Blocking

1. In Chrome DevTools → **Network** tab → right-click on the `/api/portal/my-packages` request → **Block request URL**.
   *(In Firefox: DevTools → Network → right-click → Block URL.)*
2. Reload `mis-paquetes.html`.
3. In the Network tab:
   - `/api/portal/my-packages` appears with status **`(blocked)`** ✓
   - `/api/packages-proxy` fires immediately after ✓
4. In the **Console** tab (Verbose level), confirm:
   - A `[CRBOX] RDS packages failed, falling back to legacy:` message appears ✓
5. Packages load normally on the page — the user sees no error message or blank screen ✓

### Method B: Verify auth errors do NOT fall back

While the URL block is active, check Console. If you see a **session expiry error** (e.g. "Tu sesión ha expirado") rather than a fallback — that indicates the 401 path is working correctly (auth errors propagate; they do not trigger the legacy fallback).

To explicitly test: in the Console, run:

```javascript
// Manually fire getPackagesRDS with a dead token to confirm auth error propagates
var saved = CRBOXAuth.getToken;
CRBOXAuth.getToken = function() { return 'dead-token'; };
CRBOXPortalAPI.getPackagesRDS(new Date('2023-08-01'), new Date('2023-09-01'))
  .then(d => console.log('DATA (unexpected):', d))
  .catch(e => console.log('Error propagated (expected):', e.message, '| isAuthError:', e.isAuthError));
CRBOXAuth.getToken = saved; // restore
```

Expected console output: `Error propagated (expected): ... | isAuthError: true`

**Pass criteria:**
- Blocked RDS → `/api/packages-proxy` fires → packages load normally ✓
- `[CRBOX] RDS packages failed, falling back to legacy` appears in Console (Verbose) ✓
- Dead token → `isAuthError: true` → error propagates (no fallback) ✓
- User never sees a technical error in either case ✓

---

## Rollback (at any point)

To immediately revert to the legacy path without any code change:

1. In Replit Secrets, delete or set `USE_RDS_PACKAGES_FRONTEND` to anything other than `true`.
2. No server restart needed — takes effect on the next page load.
3. `/api/config` will return `useRdsPackages: false`, `_useRdsPackages` will be `false`, and `_loadPackages` calls `getPackages()` directly as before.

---

## Pass/Fail Summary Sheet

Fill this in as you run each test:

| # | Test | Pass ✓ / Fail ✗ / Notes |
|---|------|-------------------------|
| 1 | `/api/config` returns `useRdsPackages: true` | |
| 2 | `/api/portal/my-packages` called before legacy | |
| 3 | Packages render correctly (no `undefined`, no field errors) | |
| 4 | Counters/cards match package list | |
| 5 | Status filters — all 6 options + "Todos" | |
| 6 | Date filters — all 4 picker options | |
| 7 | Tracking/package number search + wildcard guard | |
| 8 | Empty state — clean message, no JS errors | |
| 9 | Mobile layout — 375px and 768px | |
| 10 | No `_adminDebug` / `consigneeNotes` in response | |
| 11a | Blocked RDS → legacy fallback loads packages | |
| 11b | Dead token → `isAuthError: true` propagates (no fallback) | |

---

## Pre-rollout Recommendation

### What was confirmed mechanically (automated QA)

All of the following were verified against the live server and crbox_dev1 database before writing this checklist:

- Field mapping: 64 packages returned with correct lowercase keys, no forbidden fields
- Auth ordering: auth gate fires before param validation (correct security posture)
- Fallback logic: 6-code error matrix verified; only 401/403 propagate; all others fall back
- Empty state: honest `{ count: 0, packages: [] }` returned, no NoneType risk
- Security boundaries: `consigneeNotes`, `_adminDebug`, `idConsignee` all absent from portal responses
- CSS/DOM integrity: all three CSS files unchanged; no layout regression possible

### What requires a live browser session (this checklist)

- Visual rendering of package cards with real data
- Counter/pagination consistency
- Filter interactions (UI events → correct query params)
- Empty state visual appearance
- Mobile layout at actual viewport sizes
- End-to-end fallback observable in DevTools

### Is it safe to keep enabled for a limited controlled test?

**Yes, with one condition: run this checklist in a logged-in browser session first.**

The automated QA confirmed that the data layer, security boundaries, and fallback logic are all correct. The remaining risk is purely visual — a field could be mapped correctly but displayed in the wrong UI slot, or a counter could be off by one. Those are caught in Tests 3–4 and are straightforward to fix without touching the backend.

The feature flag makes it trivially reversible at any moment. If any step above fails:

1. Note the test number and what you observed.
2. Remove `USE_RDS_PACKAGES_FRONTEND` from Secrets (instant rollback, no code change).
3. Report the finding — it will be a targeted fix in the frontend rendering layer only.

**There are no known blockers to a controlled production test with `prueba@crbox.cr`.**
