# RDS Portal Rollout — Dependency Review & Recommended Strategy

**Date:** 2026-05-20
**Status:** Planning document only — no code, env, database, flag, or config changes made or proposed for immediate execution.

---

## Context

Steps 1–3 of the RDS production validation plan are complete:

- Step 1A: production frontend RDS flags confirmed OFF via `/api/config`.
- Step 1B: `SELECT DATABASE()` via CrBoxUser direct connection returned `CrBox`.
- Step 2: production schema parity Grade A — all 21 required objects and columns confirmed present.
- Step 3: shadow compare passed for packages and invoices; profile core fields passed; casillero documented as legacy API gap / RDS completeness difference.

Full validation results are recorded in `docs/rds-production-validation-results.md`.

**All three production frontend RDS flags (`USE_RDS_PACKAGES_FRONTEND`, `USE_RDS_INVOICES_FRONTEND`, `USE_RDS_PROFILE_FRONTEND`) remain OFF.**

---

## Remaining Steps Before Any Flag Enablement

| Step | Description | Status |
|---|---|---|
| Step 4 | Final-architecture connectivity check using `crbox_portal_ro` | ⏳ **Blocked — CRBOX infra must create `crbox_portal_ro` first** |
| Step 5 | Logging / observability instrumentation, or written acceptance of the observability gap | ⏳ Blocked on Step 4 |
| Step 6 | Staged production flag enablement, one module at a time | ⏳ Blocked on Steps 4 and 5 |

**Step 4 must use `crbox_portal_ro` — not `CrBoxUser`.** CrBoxUser was a temporary read-only exception used for validation only. The final architecture requires `crbox_portal_ro`.

---

## Recommended Rollout Strategy

Enable one module at a time, in the following order:

1. **mis-paquetes** (`USE_RDS_PACKAGES_FRONTEND`) — first
2. **mis-facturas** (`USE_RDS_INVOICES_FRONTEND`) — second, after packages are stable and the invoiceFileUrl gap is explicitly accepted
3. **mi-cuenta** (`USE_RDS_PROFILE_FRONTEND`) — third, after invoices are stable and the casillero behavior difference is explicitly accepted

Do not enable multiple flags simultaneously. Each flag is independent and rolls back independently (flag-off + restart).

---

## Module-by-Module Rationale

### mis-paquetes — Enable First (Lowest Risk)

**What is validated:** Step 3 shadow compare passed with countDelta=0, missingInRds=0, missingInLegacy=0, statusMismatches=0 across 102 packages.

**User-facing behavior change:** None expected. Field names are mapped to match the legacy `mapPackage()` convention exactly. The dashboard summary also uses the packages RDS path as its primary source — it will switch automatically when this flag is enabled, using the same silent legacy fallback on failure.

**Fallback:** Flag-off + restart. Immediate. No data migration required.

**Adjacent flows unaffected:** Login, registration, profile writes, invoice uploads, and PDF downloads are all legacy-backed and not changed by this flag.

---

### mis-facturas — Enable Second

**What is validated:** Step 3 shadow compare passed with countDelta=0, amountDelta=0.00, missingInRds=0, missingInLegacy=0, amountMismatch=0 across 1 invoice.

**Known gap — invoiceFileUrl / invoice PDF download:**
- The RDS schema does not currently expose the invoice file URL (`invoiceFileUrl`).
- The RDS invoices endpoint stubs this field as empty (`''`).
- The download button in `mis-facturas.html` handles a falsy `invoiceFileUrl` gracefully — it becomes a no-op (button does nothing rather than showing an error).
- This is a regression for users who have uploaded invoice PDFs and expect to download them.
- **Pre-enablement requirement:** Product/business must explicitly accept that invoice PDF downloads will be unavailable via the RDS path until the column is located or mapped in the production RDS schema.
- Optionally: after Step 4 passes and `crbox_portal_ro` exists, inspect whether the production RDS schema carries a file URL column. If it does, the gap can be closed before enabling this flag.

**`recibos` (linked package receipts):** Implemented via a batch join query. Degrades gracefully to empty on failure; invoices still render.

**`descuentoNombre` (corporate discount name):** Implemented via LEFT JOIN on `descuentocorporativo`.

**Fallback:** Flag-off + restart. Immediate.

---

### mi-cuenta — Enable Third

**What is validated:** Step 3 profile core fields — name, lastName1, lastName2, isCompany, branch — all MATCH.

**Known difference — codigoFacturacion (casillero):**
- RDS `consignee.codigoFacturacion` contains the canonical value for the validated production account.
- Legacy `getuserinfo` returned `null` for the same field on the same account.
- This is a legacy API gap / RDS completeness difference, not an RDS data error. RDS exposes a more complete value.
- When the profile flag is enabled, `mi-cuenta.html` will show `codigoFacturacion` where legacy previously showed nothing.
- **Pre-enablement requirement:** Product/business must explicitly accept that RDS may show `codigoFacturacion` where the legacy API previously returned null.

**`PendingDiscount` / discount badge:**
- Not available in the RDS profile schema. The discount badge in `mi-cuenta.html` is hidden for RDS-sourced profiles.
- This is intentional and acceptable. Confirm with product before enabling if the discount badge is important to retain.

**Profile write base — not affected:**
- Even when the RDS profile flag is ON, `mi-cuenta.html` fires a parallel `getUserInfo()` call (legacy) as its "write base" to ensure the profile edit form has the full unmasked data set.
- All profile writes (`postedituser`) continue to go to the legacy CRBOX API. Enabling this flag does not change that.

**Identification number and phone number:** Returned as masked values (`****<last4>`) in the RDS path — identical to display behavior in legacy.

**Fallback:** Flag-off + restart. Immediate.

---

## Legacy Dependency Confirmation

The following flows are legacy-backed and remain so throughout and after this rollout. No RDS path exists for any of them. No flag change affects them.

| Flow | Backend | RDS involved? |
|---|---|---|
| Login / logout / session bootstrap | CRBOX Core API (`authtoken`, `getuserinfo`) | No |
| Registration (personal and business) | CRBOX Core API (`postregisteruser`) | No |
| Profile writes (`postedituser`) | CRBOX Core API | No |
| Password change / recovery | CRBOX Core API | No |
| Newsletter preferences | CRBOX Core API (part of `postedituser`) | No |
| Upload factura (`saveBill`) | WordPress proxy (`/api/proxy/saveBill` → `wp.crbox.cr`) | No |
| `createPurchaseBill` | CRBOX Core API (`postcreatepurchasebill`) | No |
| Invoice PDF file storage and download | WordPress / `crbox.cr/wp-content/uploads/` | No |

**No RDS writes are introduced at any point in this rollout.** All writes remain legacy-backed. A future RDS write service would require a separate design review and approval before any write can touch the RDS database.

---

## Safety Requirements Before Enabling Any Flag

1. `crbox_portal_ro` exists and Step 4 connectivity check passes.
2. Production frontend flags confirmed `false` via `/api/config` immediately before any enablement.
3. Logging instrumentation is implemented, or the observability gap is explicitly accepted in writing (Step 5).
4. One module is enabled at a time, in the sequence: packages → invoices → profile.
5. Rollback path: flag-off + app restart. Immediate. No data migration needed.
6. No RDS writes are introduced.
7. All writes (profile edits, invoice uploads, purchase bills) remain legacy-backed throughout.
8. invoiceFileUrl gap must be explicitly accepted before enabling `USE_RDS_INVOICES_FRONTEND`.
9. Casillero behavior difference must be explicitly accepted before enabling `USE_RDS_PROFILE_FRONTEND`.

---

## What Should Not Be Migrated Yet

| Area | Reason |
|---|---|
| Profile writes | No RDS write service exists. Requires a separate design, dual-write strategy, and approval process |
| Invoice PDF file storage | File URL not in RDS schema. WordPress upload pipeline is working in production and should not be disturbed |
| Auth / session | Legacy `authtoken` is the trust anchor for all portal security, including the RDS endpoints themselves. No migration path is needed or proposed |
| Registration | Accounts are created in CRBOX Core as the system of record. Migration requires a new write service |

---

## Long-Term Modernization (Simple Phases)

| Phase | Scope | Status |
|---|---|---|
| Phase 1 — Read path | Enable packages, invoices, profile RDS flags one at a time | Current — blocked on Step 4 |
| Phase 2 — Fill read gaps | Locate/add `invoiceFileUrl` column in production RDS after `crbox_portal_ro` exists | Future — after Phase 1 |
| Phase 3 — Write service | Design RDS-backed profile write service (separate approval required) | Future — after Phase 1 is stable |
| Phase 4 — Auth modernization | Platform-level decision; out of current scope | Long-term |

---

## Reference Documents

| Document | Purpose |
|---|---|
| `docs/rds-production-validation-results.md` | Step 1–3 validation results |
| `docs/rds-production-readiness-plan.md` | Full step-by-step enablement plan and gate definitions |
| `docs/crbox-portal-ro-setup.sql` | SQL for CRBOX infra to create `crbox_portal_ro` |
| `docs/rds-production-schema-parity.sql` | Schema parity verification script (Step 2) |
