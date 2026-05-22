# CRBOX Strategic Modernization Roadmap

**Status:** Planning document only — analysis and recommendation.
No code changes. No env var changes. No flag changes. No database writes. No deployments.

**Date:** 2026-05-22
**Authored by:** Replit Agent — synthesized from all RDS discovery, shadow validation, QA, production enablement, rollback, and fix-plan documents.
**Preceded by:** `rds-packages-production-enablement-report.md`, `rds-portal-auth-fix-plan.md`, `rds-portal-rollout-dependency-review.md`, `rds-production-readiness-plan.md`, `rds-discovery-report.md`

---

## 1. Current Architecture

### 1.1 Layers overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BROWSER  (client portal or admin browser tab)                          │
└───────────────────────┬───────────────────────┬────────────────────────┘
                        │                       │
         Portal pages   │                       │  Admin pages
         (mis-paquetes, │                       │  (/admin/*)
          mis-facturas, │                       │
          mi-cuenta)    │                       │
                        ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  REPLIT APP  (server.py — Python Flask / BaseHTTPRequestHandler)        │
│                                                                         │
│  • Serves all static HTML, CSS, JS                                      │
│  • /api/portal/my-packages  (RDS proxy — currently off in production)   │
│  • /api/portal/invoices-rds (RDS proxy — currently off in production)   │
│  • /api/portal/profile-rds  (RDS proxy — currently off in production)   │
│  • /api/proxy/saveBill      (WordPress upload proxy)                    │
│  • /api/invoice-email       (invoice send email proxy)                  │
│  • /admin/*                 (new admin dashboard — uses our PostgreSQL)  │
│  • /api/solicitudes/*       (quote request management)                  │
│  • /api/config              (feature flags)                             │
│                                                                         │
│  OWN DATABASE: Replit PostgreSQL                                        │
│    - quote_requests (solicitudes)                                       │
│    - general_inquiries (consultas)                                      │
│    - package_groups (enviar-juntos)                                     │
│    - arrival dedup log                                                   │
└──────────┬───────────────────────┬─────────────────┬───────────────────┘
           │                       │                 │
           │ Bearer relay          │ Read-only SQL   │ WP REST API
           │ (auth verify)         │ (RDS path)      │ (file upload)
           ▼                       ▼                 ▼
┌──────────────────┐  ┌──────────────────────┐  ┌───────────────────────┐
│  CRBOX CORE API  │  │  AMAZON RDS MySQL 5.7 │  │  WORDPRESS            │
│  clients.crbox.cr│  │  crbox_dev1 (dev)     │  │  wp.crbox.cr          │
│  /api/crboxwebapi│  │  CrBox (production)   │  │  98.90.3.205          │
│                  │  │                       │  │                       │
│  • authtoken     │  │  91 tables            │  │  Stores invoice PDFs  │
│  • getuserinfo   │  │  477K+ warehouserecpt │  │  via wp/v2/media      │
│  • getuserpackgs │  │  202K+ purchase_bill  │  │  Files served via     │
│  • getfacturas   │  │  257K+ resumenmawb    │  │  crbox.cr/wp-content/ │
│  • postedituser  │  │  31K+ consignee       │  │  uploads/...          │
│  • postregister  │  │  .NET + Hangfire bg   │  │                       │
│  • postcreate    │  │  jobs writing to it   │  │                       │
│    purchasebill  │  │                       │  │                       │
└──────────────────┘  └──────────────────────┘  └───────────────────────┘
```

### 1.2 Layer-by-layer analysis

**Legacy API (`clients.crbox.cr/api/crboxwebapi`)**
The CRBOX operations backbone. A .NET backend that owns all authentication, all customer writes, and all package/invoice read endpoints. It is the system of record for every account, package, invoice, and purchase bill. It is not ours to modify. All portal auth still flows through it — the Bearer token the browser holds is issued by this system. It is a black box: we cannot inspect its source code, its firewall rules, or its database schema through this service directly.

**Amazon RDS MySQL 5.7 (production: `CrBox`, dev: `crbox_dev1`)**
The underlying operational database that the CRBOX .NET backend writes to. We have a separate, direct read connection (`CrBoxUser` for temporary validation; `crbox_portal_ro` is the planned read-only user for production). This is the data source we are progressively moving portal reads to. 91 tables, mature multi-year schema. The old CRBOX admin (their warehouse tooling) also writes to this directly.

**CRBOX old admin (their warehouse system)**
CRBOX's own operational tooling — warehouse staff use it to receive packages, update statuses, create invoices, record arrival dates, manage labels, and write purchase bills. It writes directly to RDS. We must never break its write path, and any read-only views we build on top of RDS must not interfere with those writes.

**New website / client portal (this codebase)**
`mis-paquetes.html`, `mis-facturas.html`, `mi-cuenta.html`, `dashboard.html`, and supporting pages. Currently all portal reads (packages, invoices, profile) go from the browser to `clients.crbox.cr` via the CRBOX Core API. The RDS path exists as a proxy through `server.py` and is controlled by feature flags — all currently `false` in production.

**New admin platform (`/admin/*` in `server.py`)**
Our admin dashboard for managing solicitudes (quotes) and consultas (general inquiries). It reads from our own Replit PostgreSQL, not from RDS. It does not yet have a direct read connection to RDS. It talks to the CRBOX Core API only indirectly (e.g., replying to users goes to email, not back to CRBOX).

**WordPress file storage (`wp.crbox.cr` / `98.90.3.205`)**
A legacy WordPress installation that acts purely as a file store. Invoice PDFs uploaded by customers go through our `/api/proxy/saveBill` → WP REST `wp-json/wp/v2/media` → file lands at `crbox.cr/wp-content/uploads/...`. The pathname (not the full URL) is stored as `FileLocation` in the `purchase_bill` table in RDS. The CRBOX admin tooling reconstructs the full URL by prepending `https://crbox.cr`. This dependency is tightly coupled: files live on the WP server and the path convention is baked into the CRBOX admin.

**Upload factura flow (end-to-end)**
```
User selects file in mis-paquetes.html
  → POST /api/proxy/saveBill (multipart, our server)
    → POST wp-json/wp/v2/media (WP REST, Basic auth via WP_APP_USER + WP_APP_PASS)
      ← fileUrl: https://wp.crbox.cr/wp-content/uploads/...
  ← {url: "https://crbox.cr/wp-content/uploads/..."} (url normalized)
User calls postcreatepurchasebill (directly browser → CRBOX Core API)
  with FileLocation = pathname only (/wp-content/uploads/...)
    → CRBOX Core API writes purchase_bill row to RDS
```

**Auth/session flow**
```
Login → POST clients.crbox.cr/api/crboxwebapi/authtoken
  ← Bearer token T (stored in localStorage by js/auth.js)

Portal page load → Authorization: Bearer T + X-Casillero-Email: E
  → sent to our server for RDS proxy endpoints
    → server relays to clients.crbox.cr/getuserinfo/E with Bearer T
      ← 200 + idConsignee (success path)
      ← 401/403 (rejection path — FAILED IN PRODUCTION)
```

The root cause of the production rollback: the Bearer token relay from the Replit production VM to `clients.crbox.cr` was rejected (401), almost certainly due to IP-based origin restriction. The VM's datacenter IP is not a browser — CRBOX may reject Bearer token verification calls that do not originate from known browser/residential IP ranges.

---

## 2. Cloned / Staging Database Strategy

### 2.1 Current situation

The dev environment uses `crbox_dev1` — a separate database on the same RDS instance, used as a development snapshot. Shadow validation of packages, invoices, and profile all passed against `crbox_dev1`. Production is `CrBox`.

There is no current staging clone of `CrBox` (production) that exactly mirrors its state.

### 2.2 Why a staging clone is useful

A staging clone of the production database is the most impactful infrastructure investment for the entire modernization roadmap. Here is what it unlocks specifically:

| Capability | Without clone | With clone |
|---|---|---|
| Test admin write queries without risk | ✗ Must avoid all writes | ✓ Full write test freedom |
| Test schema changes (new columns, indexes) | ✗ Run on dev snapshot (may differ) | ✓ Run against production-equivalent schema |
| Reproduce exact production bugs | ✗ Limited by dev snapshot age | ✓ Same data, same schema, same edge cases |
| Performance test large-table queries | ✗ Dev has smaller row counts | ✓ Same 477K+ warehousereceipts |
| Test upload factura / purchase_bill writes | ✗ Writes hit production | ✓ Safe write target |
| Develop invoiceFileUrl resolution | ✗ Dev doesn't have the URL column | ✓ May find it in production clone |
| Develop new admin read-only views | ✓ Possible on dev snapshot | ✓ Realistic data volumes |
| Validate new `crbox_portal_ro` grants | ✗ Need production CRBOX cooperation | ✓ Test on clone first |

### 2.3 What a staging clone should and should not be used for

**Should be used for:**
- Testing all write service designs before they ever touch production
- Schema migration dry-runs (adding columns, indexes, views)
- Performance profiling queries that touch large tables
- Developing the new admin read-only dashboard against realistic data volumes
- Resolving the `invoiceFileUrl` gap — confirming whether the column exists in production schema
- Testing `purchase_bill` insert behavior with real FKs and constraint behavior
- Training the team on the RDS schema without risking production

**Should not be used for:**
- Serving live portal traffic (it lags behind production data)
- Replacing the development snapshot (`crbox_dev1`) — keep both
- Storing real PII without anonymization review
- Long-running experiments that may corrupt the schema before it mirrors production again

### 2.4 PII and anonymization

The production database contains 31K+ `consignee` rows (names, emails, identification numbers, addresses, phone numbers) and 477K+ `warehousereceipt` rows. Before the clone is used for development work beyond performance testing, a PII review should decide:
- Whether to anonymize `consignee`, `address`, `consignee_has_phone`, `purchase_bill` in the clone
- Minimum: hash or truncate email/identification columns so individual records can't be traced back to customers
- Operational tables (warehousereceipt, resumenmawb, piece) are generally safe for dev without full anonymization

### 2.5 Should it become the new production database?

No — not directly. The staging clone's role is as a safe test target and a development mirror. If a major schema migration or modernization of the underlying database ever happens (e.g., moving to a different cloud provider, PostgreSQL, etc.), the clone would be part of that process — but that is Phase 7 territory, years away. For now: clone = safe sandbox, `CrBox` = production system of record.

### 2.6 How to keep it synchronized

A clone is only useful if it's refreshed regularly. Options, in order of operational complexity:
1. **Periodic snapshot restore:** CRBOX infra creates a weekly or monthly RDS snapshot restore into a separate instance. Simple, requires no ongoing tooling.
2. **Read replica:** RDS supports read replicas natively. A replica stays continuously in sync. Useful for performance testing and admin dashboards.
3. **Manual backup restore:** CRBOX exports a `.sql` dump periodically. Less automated but sufficient for schema testing.

Option 1 is the right starting point — it matches the existing `crbox_dev1` model and requires CRBOX infra to do one action, not ongoing maintenance.

---

## 3. Client Portal Modernization

### 3.1 What has already been done

This is further along than it may appear. The core read infrastructure is complete:
- RDS connection layer (`rds_client.py`) — read-only, SQL-injection-safe, DB identity guard enforced
- All three proxy endpoints built and QA-passed in dev: `/api/portal/my-packages`, `/api/portal/invoices-rds`, `/api/portal/profile-rds`
- Shadow validation passed (packages: 102 records, countDelta=0, statusMismatches=0; invoices: amountDelta=0.00; profile: core fields all MATCH)
- Production schema parity Grade A — all 21 required objects confirmed
- Feature flag infrastructure in place — one flag per module, independent rollback

### 3.2 What is blocking production enablement right now

Two blockers, in priority order:

**Blocker 1 (code — we can fix now):** `_portal_auth_full()` does not distinguish "server couldn't reach CRBOX" from "token genuinely expired." Both return 401, which wipes the user's session. The fix is fully designed in `docs/rds-portal-auth-fix-plan.md` (Option B) — approximately 25 lines in `server.py`, zero frontend changes. This must be implemented before any RDS flag is re-enabled in production.

**Blocker 2 (infrastructure — requires CRBOX infra):** `crbox_portal_ro` — the dedicated read-only MySQL user for production RDS — has not yet been created. The SQL to create it is already written in `docs/crbox-portal-ro-setup.sql`. CRBOX infra needs to run it once. Until this exists, the production connection still uses `CrBoxUser`, which was a temporary validation exception.

### 3.3 Recommended re-enablement sequence (after both blockers are resolved)

**Step A — mis-paquetes (lowest risk)**
- `USE_RDS_PACKAGES_FRONTEND=true` in production
- Lowest risk: read-only, already shadow-validated, field mapping is exact, fallback is fully wired
- User-visible change: none (field names preserved)
- If auth fix works and CRBOX accepts the relay: full RDS path
- If CRBOX still blocks the relay: 503 → silent fallback to legacy → user never notices
- Rollback: set flag to `false`, restart. Instant.

**Step B — mis-facturas (second, after packages stable for 1–2 weeks)**
- `USE_RDS_INVOICES_FRONTEND=true` in production
- One known gap: `invoiceFileUrl` is not in the RDS schema as we have mapped it. Invoice PDF download becomes a no-op on the RDS path until this column is found or mapped.
- Pre-condition: product must explicitly accept the PDF download regression OR the column must be located in the production schema (check after the staging clone / `crbox_portal_ro` exist)
- All financial amounts validated: amountDelta=0.00

**Step C — mi-cuenta (third, after invoices stable)**
- `USE_RDS_PROFILE_FRONTEND=true` in production
- Known behavior difference: `codigoFacturacion` (casillero box number) is present in RDS but was `null` in legacy API. RDS shows more complete data — this is a net improvement, but must be explicitly accepted by product.
- Profile writes (`postedituser`) remain legacy throughout. Even when this flag is on, `mi-cuenta.html` fires a parallel legacy `getUserInfo()` call as its write base.

### 3.4 What stays legacy-backed throughout all three phases

All writes: `postedituser`, password change, newsletter preferences, registration. These call `clients.crbox.cr` directly from the browser and are not touched by any RDS flag.

---

## 4. Upload Factura / File Storage Modernization

### 4.1 Current state

The invoice upload flow works correctly in production. The path is:

```
browser → /api/proxy/saveBill → wp-json/wp/v2/media (WP Basic auth)
  → file at https://crbox.cr/wp-content/uploads/FacturaCompra-WR<id>.<ext>
  → browser calls postcreatepurchasebill with FileLocation = /wp-content/uploads/...
  → RDS purchase_bill row created by CRBOX Core API
```

The 500/502 errors seen in production logs during the rollback window were pre-existing retry noise from a client — not caused by the RDS work and not a structural problem with the flow.

The critical invariant: `FileLocation` must be a **pathname only**, not a full URL. The CRBOX admin prepends `https://crbox.cr` — a full URL would produce a broken double-hostname link. This is correctly handled in `mis-paquetes.html` via the `_filePath` variable.

### 4.2 Why WordPress is a risk

WordPress was never designed as a file storage service. The risks of keeping it as the upload target are:

| Risk | Severity | Likelihood |
|---|---|---|
| WP plugin update breaks the REST API or auth behavior | Medium | Medium |
| WP installation needs security patching and nobody owns that process | High | Growing over time |
| WP disk fills up (no automatic scaling) | High | Low but possible at 202K+ purchase_bill records |
| WP server goes down = invoice upload is completely broken | Critical | Low but possible |
| Application Password credentials rotate = upload stops working until secrets updated | High | Medium |
| Path convention changes in future WP version | Low | Low |

### 4.3 Modern storage alternatives

Three realistic candidates:

| Option | Pros | Cons |
|---|---|---|
| **Cloudflare R2** | Free egress, S3-compatible API, very cheap, works with public CDN | New infrastructure to manage |
| **AWS S3** (same region as RDS) | Native RDS integration, IAM auth (no rotating creds), AWS ecosystem | Cost for egress, more AWS lock-in |
| **Supabase Storage** | Postgres-native metadata, easy auth integration | Less battle-tested for binary files at scale |

R2 is the practical recommendation: zero egress cost means serving old WP files through an R2 CDN would be cheaper than S3, and the S3-compatible API means migration tooling exists.

### 4.4 What modernizing file storage requires

Before moving away from WordPress, all of the following must be solved:

1. **Metadata table:** A new table (either in our PostgreSQL or in a migration to RDS) must record `(wr_id, file_key, uploaded_at, uploader_casillero_id, storage_backend, original_url)`. This allows tracking old WP files and new R2 files during a transition period, and gives the admin visibility into every upload.

2. **FileLocation convention:** The CRBOX admin system reads `purchase_bill.FileLocation` and prepends `https://crbox.cr`. Any new storage URL format MUST continue to be a path that works when prepended with `https://crbox.cr`, OR the `postcreatepurchasebill` call must be updated to store a full URL and the admin must accept a different path format. This requires explicit coordination with CRBOX to avoid breaking their admin tooling.

3. **Old file access:** All 202K+ existing `purchase_bill` rows reference WP paths. These files must remain accessible at `crbox.cr/wp-content/uploads/...` indefinitely (or until each file is migrated). The existing reverse-proxy in `server.py` that forwards `/wp-content/uploads/*` to the WP IP must remain active. Do not remove it until migration is confirmed complete for all old files.

4. **Migration tool:** A script that reads every `purchase_bill.FileLocation` from RDS, fetches the file from WP, uploads to new storage, and updates the record. This touches production RDS writes — it cannot be done until a write service design is reviewed and approved.

5. **Gradual rollover:** New uploads go to new storage; old files stay on WP until migrated. A dual-proxy serves both paths. Only after 100% of old files are confirmed migrated and accessible on new storage can WP be retired.

### 4.5 What not to do yet

Do not touch the upload factura flow until the client portal read path (Phase 1) is stable. The upload flow is working. Modernizing it is a Phase 2 initiative — it requires coordination with CRBOX about FileLocation format, and it must not disrupt the active 202K+ existing records.

---

## 5. New Admin Platform Modernization

### 5.1 Current state of the admin platform

The new admin (`/admin/*` in `server.py`) currently reads exclusively from our own Replit PostgreSQL. It manages:
- Quote requests (solicitudes) — our own table, full CRUD
- General inquiries (consultas) — our own table, with reply capability just added
- A dashboard with KPI counts (all from our PostgreSQL)

It does not currently connect to RDS. Any package, customer, or invoice data shown in admin comes from the CRBOX Core API via browser-side proxy calls or from our own PostgreSQL.

### 5.2 Benefits of connecting the admin to RDS (read-only first)

| View | Current path | RDS benefit |
|---|---|---|
| Package search by tracking number | Browser → CRBOX Core API | Direct SQL: instant, no API rate limits, more filter options |
| Customer record lookup by casillero | Browser → getuserinfo | Direct SQL: all 30 consignee columns available |
| Invoice history for a customer | Browser → getfacturas | Direct SQL: full resumenmawb detail, amount totals, status |
| Purchase bill visibility | Not currently in admin | SQL join: warehousereceipt + purchase_bill + FileLocation |
| Dashboard volume metrics | Our PostgreSQL only | SQL aggregates: real shipment volumes, revenue proxies |
| Package aging analysis | Not available | SQL: time since arrival, status transitions |

Performance benefit is significant: the CRBOX Core API has inherent latency from the external network hop and its own processing. A direct RDS query from the Replit VM to the RDS instance eliminates that hop for read operations, and can use joins that the Core API doesn't expose.

### 5.3 Risks of connecting admin to RDS

| Risk | Mitigation |
|---|---|
| Admin queries affect RDS performance, impacting warehouse operations | Use `crbox_portal_ro` (read-only), add query timeouts, avoid `SELECT *` on large tables, use paginated queries |
| Admin shows stale data if RDS lags behind Core API | Acceptable for admin dashboards — add a "data as of" timestamp |
| Admin accidentally exposes sensitive fields (consigneeNotes, cedulaJuridica) | Same field-masking layer as portal endpoints; never expose raw identification, raw phone |
| Connection credentials shared between admin and portal | Best practice: separate DB user for admin reads (e.g., `crbox_admin_ro`) with more permissive SELECT grants than `crbox_portal_ro` |

### 5.4 Why writes should wait

The CRBOX operational database is the system of record for a live business. Package status changes trigger downstream effects: notifications, label printing, billing events, Hangfire background jobs. The `warehousereceipt` table alone has 10 foreign keys. Writing to it incorrectly can corrupt invoice totals, notify customers prematurely, or break the warehouse scan flow.

Before any write from our admin can safely touch RDS:
- A complete business rules audit is needed (see Section 6)
- A dual-write strategy must be designed (writes go to both CRBOX Core API and RDS, or are coordinated via Core API only)
- Audit logging must be in place
- CRBOX must approve every write operation type and its semantics

Admin read-only first is the safe path. It delivers real value (fast search, package visibility, customer lookup) without any risk to the operational database.

---

## 6. Future Admin Write Services

### 6.1 What "write" means in this context

Any operation that creates or modifies a row in the RDS operational database: creating a package record, updating a package status, changing a consignee profile field, inserting a purchase bill, marking an invoice paid, etc.

### 6.2 Pre-conditions that must all be true before any write service is introduced

**Business rules layer:**
Every write to RDS has implied downstream business logic that lives in the CRBOX .NET backend (and its Hangfire job queue). For example:
- Changing a `warehousereceipt.status` may trigger a customer notification email (via Hangfire `HangfireJob`)
- Inserting an `articulo` row without corresponding `resumenmawb` records may break invoice generation
- Creating a `consignee` record without the correct `client` relationship breaks the casillero hierarchy
- Updating `piece` dimensions recalculates volumetric weight, which feeds the invoice amount

None of these business rules are documented for us. They live in the .NET backend. Introducing writes without understanding them risks silent data corruption.

**Write design requirements (checklist):**

| Requirement | Why |
|---|---|
| Identify every FK constraint for the target table | Writes must respect all foreign key relationships |
| Map every Hangfire job that reacts to the target table | Ensure we don't trigger jobs prematurely or skip required jobs |
| Define status transition rules | Not every status can transition to every other status |
| Define label/notification side effects | Status changes may trigger label print requests or SMS |
| Audit log every write | Who changed what, when, from which user ID |
| Rollback mechanism | Every write service must have an undo path |
| CRBOX compatibility approval | The old admin must still work correctly after any write |
| Dual-write strategy | If Core API also writes the same table, a conflict resolution strategy is required |

**Invoice relationship complexity:**
The `resumenmawb` (invoice) table is the most complex financial table: 257K rows, 45 columns, connected to `articulo`, `descripcionfactura`, `consecutivo_facturacion`, and `airshipment`. Any write to invoice records must be coordinated with CRBOX's billing team to avoid corrupt invoice totals.

**Recommendation:** Write services should begin with the lowest-risk, most isolated write target. The safest first write candidates are:
1. Internal admin notes (a new table we create, no FK to operational tables)
2. `purchase_bill` inserts (already done by `postcreatepurchasebill` via Core API — could eventually bypass the API once rules are documented)
3. Status annotations (if CRBOX approves a "soft status" approach where we write to a separate table rather than modifying `warehousereceipt.status`)

Do not start with `warehousereceipt`, `resumenmawb`, or `consignee` writes. These are the highest-risk tables.

---

## 7. Modern Authentication

### 7.1 Current auth model

The auth trust anchor is the CRBOX Core API:
- Login: `POST /authtoken` → Bearer token stored in localStorage
- Token verification: `GET /getuserinfo/<email>` with Bearer token (relayed server-side for RDS endpoints)
- Logout: `CRBOXAuth.clearToken()` (localStorage clear only — no server-side session revocation)

This is a stateless bearer token model. The token's validity period, rotation policy, and binding behavior (IP binding, user-agent binding) are controlled entirely by CRBOX and are not documented.

### 7.2 Where modern auth fits in the roadmap

**Modern auth should come after, not before, the RDS read rollout is stable.**

The reasons:

1. **RDS read endpoints depend on the current auth model.** `_portal_auth_full()` validates users by relaying their Bearer token to `getuserinfo`. Replacing the auth system while the RDS proxy is being deployed creates two moving parts simultaneously — any failure is ambiguous (is it auth? is it RDS?).

2. **Auth replacement does not fix the IP-relay problem.** Even with a modern auth provider (Supabase Auth, Auth0, Clerk, etc.), the RDS proxy still needs to validate the user's identity server-side. A JWT from a modern auth provider is actually _easier_ to verify server-side (static signing key, no upstream call needed) — which is a strong argument for modern auth eventually. But it's a separate project.

3. **The portal read path must be stable before auth can migrate.** Migration by login (each user migrates on their next login) requires confidence that the portal works correctly post-migration. Without a stable RDS read path, a post-migration regression is harder to diagnose.

### 7.3 Migration path when auth modernization is ready

Modern auth can be introduced without breaking the CRBOX old admin because the old admin does not use our auth system — it uses its own CRBOX credentials separately.

The migration approach:
1. **New auth provider (e.g., Supabase Auth) runs in parallel** with the existing CRBOX bearer model
2. **Migration by login:** When a user logs in with CRBOX credentials for the first time after the migration starts, create a new auth record linked to their `idConsignee` and `idClient`. Store the mapping in our PostgreSQL.
3. **idConsignee linkage:** The `consignee.idConsignee` is the stable identity anchor across the entire RDS schema. All portal read queries are already keyed on this. A modern auth user record simply needs to carry `idConsignee` as a claim or a linked field.
4. **Token verification simplified:** A signed JWT from a modern auth provider can be verified with a static public key — no upstream call, no IP-relay problem, no session-wipe risk.
5. **CRBOX writes still go via Core API:** Even after modern auth, `postedituser`, `postcreatepurchasebill`, etc. would still need a CRBOX Bearer token for the Core API calls. During a transition period, both tokens coexist. Writes are the last thing to migrate off the Core API.

### 7.4 Requirements before auth modernization begins

- RDS read path (packages, invoices, profile) stable in production for ≥30 days
- `idConsignee` → new auth user mapping table designed and approved
- Decision on whether CRBOX writes will bypass Core API (write services, Phase 4) or continue to use it (requires maintaining CRBOX token alongside new token)
- Password recovery and registration flows redesigned for the new auth provider

---

## 8. Recommended Phased Roadmap

---

### Phase 1 — Stabilize RDS client portal reads

**Objective:** Get the RDS read path reliably working in production for all three portal modules, without any session-wiping risk.

**What changes:**
- `_portal_auth_full()` is fixed to return `_VerifyError` (503) for server-side infrastructure failures vs. 401 for missing/malformed headers only (approximately 25 lines in `server.py`)
- `User-Agent` header added to CRBOX relay call in `_portal_auth_full()` (may resolve the IP block)
- Same sentinel pattern applied to `_handle_portal_invoices_rds()` and `_handle_portal_profile_rds()`
- Once CRBOX infra creates `crbox_portal_ro`: connection string updated from `CrBoxUser` to `crbox_portal_ro`
- `USE_RDS_PACKAGES_FRONTEND=true` in production → monitored for 1–2 weeks
- `USE_RDS_INVOICES_FRONTEND=true` → after packages stable (with accepted `invoiceFileUrl` gap)
- `USE_RDS_PROFILE_FRONTEND=true` → after invoices stable (with accepted casillero behavior difference)

**What remains legacy:**
Everything else. Login, registration, profile writes, password recovery, invoice uploads, purchase bills.

**Database impact:**
Read-only queries to production RDS via `crbox_portal_ro`. No writes. No schema changes.

**Risk level:** Low — auth fix is the most critical part; the data path was already validated.

**Dependencies:**
- Auth fix implemented and tested in dev
- CRBOX infra creates `crbox_portal_ro` on production RDS
- Explicit product acceptance of `invoiceFileUrl` regression (or column found in production schema)
- Explicit product acceptance of `codigoFacturacion` display change

**Rollback:** Set the relevant flag to `false`, restart. Each module is independent. Instant.

---

### Phase 2 — Modernize upload factura / file storage

**Objective:** Remove WordPress as the file storage dependency for invoice uploads. Make uploads more reliable, cheaper to operate, and not dependent on WP credentials or WP uptime.

**What changes:**
- New file storage service provisioned (Cloudflare R2 recommended)
- `/api/proxy/saveBill` updated to POST to R2 instead of WP REST API
- `FileLocation` format decision made with CRBOX: continue pathname convention, or switch to full URL with CRBOX admin updated
- New file metadata table created (in our PostgreSQL or a dedicated service) recording `(wr_id, file_key, storage_backend, uploaded_at)`
- New uploads go to R2; old WP files remain accessible via the existing reverse proxy

**What remains legacy:**
`postcreatepurchasebill` still calls CRBOX Core API. Old WP files are not migrated yet (Phase 6).

**Database impact:**
No RDS writes. Our PostgreSQL gets a new metadata table. WP database is not touched.

**Risk level:** Medium — the upload flow is currently working; any change to the storage target must be tested end-to-end before enabling in production. The FileLocation format change (if needed) requires CRBOX cooperation and is the highest-risk sub-task.

**Dependencies:**
- Phase 1 stable (proves the overall infrastructure pattern; reduces concurrent risk)
- CRBOX coordination on FileLocation format convention
- R2 bucket created and credentials configured
- End-to-end test: upload → R2 → postcreatepurchasebill → verify CRBOX admin displays the file correctly

**Rollback:** Revert `/api/proxy/saveBill` to WP path. New files since migration would need re-upload if WP is already down; otherwise instant.

---

### Phase 3 — Connect new admin read-only to RDS

**Objective:** Give the CRBOX admin team fast, powerful package/customer/invoice search and visibility directly from our admin platform, powered by RDS queries rather than Core API calls.

**What changes:**
- New RDS read endpoints in `server.py` behind admin authentication: package search, customer lookup, invoice history, purchase bill visibility
- New admin dashboard sections: package search by tracking/date/status, customer record view, invoice explorer
- Dedicated `crbox_admin_ro` MySQL user requested from CRBOX infra (broader SELECT grants than `crbox_portal_ro`)
- Query timeout and pagination enforced on all admin queries to protect RDS operational performance

**What remains legacy:**
All writes from admin still go via Core API (or don't exist yet). Old admin tooling (CRBOX warehouse) is completely unaffected.

**Database impact:**
Read-only queries from a new DB user. No schema changes. Performance impact should be monitored.

**Risk level:** Low-Medium — read-only, but admin queries can be heavy. The risk is performance, not correctness.

**Dependencies:**
- Phase 1 stable (RDS connection layer proven in production under portal load)
- `crbox_admin_ro` MySQL user created by CRBOX infra
- Staging clone available for query performance testing before enabling in production

**Rollback:** Disable admin RDS sections behind a flag. Instant.

---

### Phase 4 — Introduce controlled write services

**Objective:** Enable the new admin to create or modify select operational records, starting with the safest, most isolated write targets.

**What changes (minimum viable):**
- Internal admin notes table (our PostgreSQL — no RDS writes, just annotates records visible from admin)
- Purchase bill insert (direct to RDS once business rules are documented with CRBOX)
- Status annotation table (soft status layer in our PostgreSQL, separate from `warehousereceipt.status`)

**What must be completed before this phase begins:**
- Full business rules audit for every target table (Hangfire job mapping, FK analysis, status transitions)
- Audit log table for every write operation
- Write rollback mechanism per operation type
- CRBOX approval of each write type and its semantics
- Dual-write strategy for any table the Core API also writes

**What remains legacy:**
`warehousereceipt` status writes, `resumenmawb` writes, `consignee` profile writes — all remain via Core API.

**Database impact:**
First RDS writes from our system. Highest-risk database impact of any phase. Requires staging clone for dry-run.

**Risk level:** High — requires careful scoping and CRBOX cooperation. Do not rush this phase.

**Dependencies:**
- Phase 3 stable (admin read path proven; team familiar with RDS data shape)
- Business rules documentation from CRBOX
- Staging clone operational
- Write service design reviewed and approved

**Rollback:** Per-operation rollback mechanism built into each write service. If a write corrupts data, the staging clone is used to reproduce and verify the fix.

---

### Phase 5 — Modern authentication

**Objective:** Replace the CRBOX Bearer token as the portal trust anchor with a modern auth provider (JWT-based), eliminating the IP-relay problem permanently and enabling future auth features (2FA, OAuth, SSO).

**What changes:**
- New auth provider provisioned (Supabase Auth, Clerk, or Auth0 — decision to be made)
- `idConsignee` linkage table in our PostgreSQL (maps new auth user ID → `consignee.idConsignee`)
- Migration by login: users migrate on next login; both auth systems coexist during transition
- `_portal_auth_full()` redesigned to verify a signed JWT instead of relaying to CRBOX API
- CRBOX Core API calls (writes) continue to use CRBOX Bearer token alongside new auth token (dual-token period)
- Registration flow updated to create both a CRBOX account (via `postregisteruser`) and a new auth account

**What remains legacy:**
CRBOX Core API write calls. Old admin. Password recovery for CRBOX-only accounts.

**Database impact:**
New user table in our PostgreSQL. No RDS writes.

**Risk level:** High — auth migration is always high-risk. Strictly controlled rollout (percentage-based, one user at a time in testing).

**Dependencies:**
- Phase 1 stable for ≥30 days (RDS read path proven reliable)
- Phase 3 operational (admin has enough visibility to diagnose post-migration issues)
- `idConsignee` mapping design approved
- CRBOX cooperation for dual-token period (we still need their token for writes)

**Rollback:** Fall back to CRBOX Bearer model. Requires keeping both paths active during transition.

---

### Phase 6 — Migrate old WordPress files

**Objective:** Move all 202K+ existing `purchase_bill` files from WordPress to the new storage service (introduced in Phase 2) and retire the WP file storage dependency entirely.

**What changes:**
- Migration script reads every `purchase_bill.FileLocation` from RDS
- Fetches the file from WP at `crbox.cr/wp-content/uploads/...`
- Uploads to R2 (or chosen storage)
- Updates `purchase_bill.FileLocation` in RDS with the new path
- This is an RDS write — must go through the write service layer introduced in Phase 4
- The `/wp-content/uploads/*` reverse proxy in `server.py` is kept until migration is fully confirmed

**What remains legacy:**
WordPress installation can be kept as read-only archive during migration. Nothing else.

**Database impact:**
Bulk update to `purchase_bill.FileLocation` — 202K+ rows. Must be batched, monitored, and reversible.

**Risk level:** High — any file that fails to migrate and has its record updated incorrectly becomes permanently inaccessible from the CRBOX admin. Must be done with checksums and verification.

**Dependencies:**
- Phase 2 operational (new storage proven for new uploads)
- Phase 4 write service for `purchase_bill` updates
- CRBOX approval of the new FileLocation format
- Staging clone used for dry-run migration

**Rollback:** WP proxy kept active throughout. If migration fails, the old URLs still work via the proxy. Files are never deleted from WP until migration is verified 100% complete.

---

### Phase 7 — Reduce and retire legacy dependencies

**Objective:** Progressively remove the remaining hard dependencies: WordPress for file serving, CRBOX Core API as the sole write backend, and eventually the legacy read API entirely.

**What changes:**
- WordPress decommissioned after Phase 6 migration confirmed complete
- CRBOX Core API write calls replaced by direct RDS write services (Phase 4 expanded)
- Legacy `getPackages`, `getfacturas`, `getUserInfo` read paths removed from portal code after RDS paths have been the sole active path for ≥90 days
- `clients.crbox.cr` dependency limited to auth only (or fully eliminated if Phase 5 is complete)

**Risk level:** Low by this point — all modernization has been validated in phases. This is cleanup.

**Dependencies:** All previous phases complete and stable.

**Rollback:** Not applicable at this stage — this phase only removes dead code after the live systems no longer need it.

---

## 9. What Not To Do Yet

| Do Not | Why |
|---|---|
| Redesign the RDS schema | The schema is written by CRBOX's .NET backend. Any structural change without CRBOX coordination will break their write paths. Foreign key constraints and Hangfire jobs depend on the current layout. |
| Move all writes to RDS at once | Business rules for every table are undocumented. Mass write migration without a rules audit will corrupt operational data. |
| Replace auth before the portal read path is stable | Two moving parts fail ambiguously. Auth migration requires ≥30 days of stable RDS reads to have a baseline. |
| Remove WordPress before file migration is solved | 202K+ existing `purchase_bill.FileLocation` records point to WP paths. The WP reverse proxy in `server.py` must remain until every single file has been migrated and verified. |
| Break old admin compatibility | The CRBOX warehouse staff use their own admin for daily operations. Any schema change or write from our side that disrupts their tooling halts warehouse operations. |
| Enable multiple RDS frontend flags simultaneously | Each flag is an independent risk. Enabling packages + invoices + profile at the same time makes a failure impossible to attribute and impossible to roll back cleanly. |
| Write to `warehousereceipt`, `resumenmawb`, or `consignee` before Phase 4 | These are the highest-complexity, highest-risk tables. 10 FKs, 45 columns, Hangfire job triggers. No write should touch them before a full business rules audit. |
| Use service account (`CRBOX_SVC_EMAIL`) for user identity verification | The service account can confirm an email exists, but cannot verify the caller holds a valid token for that email. This creates a cross-account access vulnerability. (Explicitly documented as rejected in `rds-portal-auth-fix-plan.md`, Option C.) |

---

## 10. Recommended Next Concrete Tasks

### Task 1 — Fix `_portal_auth_full()` (Immediate — required before any RDS re-enablement)

**Scope:** ~25 lines in `server.py`. No frontend changes. Fully designed in `docs/rds-portal-auth-fix-plan.md`.

**What to do:**
1. Add `_VerifyError` sentinel class at module level in `server.py`
2. Modify `_portal_auth_full()` to return `(_VERIFY_ERROR, None)` for Cases C–F (CRBOX 401/403, CRBOX other error, network timeout, no `casillero_id`); keep `(None, None)` only for Cases A–B (missing/malformed headers)
3. Add `User-Agent: Mozilla/5.0 (compatible; CRBOX-portal-proxy/1.0)` header to the relay call — may resolve the block if CRBOX filters by user-agent
4. Update `_handle_portal_my_packages()` to check for `_VerifyError` and return 503 with `code: verify_error`
5. Apply same check to `_handle_portal_invoices_rds()` and `_handle_portal_profile_rds()`
6. Update `_rds_emit_log` docstring to include `verify_error` in result vocabulary
7. Test in dev with `USE_RDS_PACKAGES_FRONTEND=true` (already set in dev): verify 503 → silent fallback, no session wipe

**Outcome:** Production can safely re-enable packages without any session-wiping risk, even if the CRBOX IP restriction is still present.

---

### Task 2 — Coordinate `crbox_portal_ro` creation with CRBOX infra (External action — cannot be done by us)

**Scope:** Zero code changes. One email / message to CRBOX IT.

**What to ask for:**
Run `docs/crbox-portal-ro-setup.sql` against the production RDS instance. This creates the `crbox_portal_ro` read-only user and grants SELECT on the specific tables needed. The SQL file is already written and reviewed.

**Outcome:** Removes the last blocker for production RDS connection. After this, the connection can be switched from `CrBoxUser` (temporary) to `crbox_portal_ro` (permanent, scoped, read-only).

---

### Task 3 — Request a staging clone from CRBOX infra (External action — unlocks all future phases)

**Scope:** One coordination request to CRBOX IT.

**What to ask for:**
An RDS snapshot restore of the production `CrBox` database into a separate RDS instance (or a separate database on the same instance). A weekly or monthly refresh schedule. Credentials for a staging read-write user (for testing writes safely).

**Why now:** The staging clone unblocks: finding the `invoiceFileUrl` column in production schema (unblocks Phase 1 Step B), performance testing admin queries (Phase 3), and every write service design (Phase 4). It is the single infrastructure addition that has the highest leverage across all future work.

---

*Document produced: 2026-05-22. Author: Replit Agent.*
*Based on: rds-discovery-report.md, rds-portal-rollout-dependency-review.md, rds-production-readiness-plan.md, rds-packages-production-enablement-report.md, rds-portal-auth-fix-plan.md*
*No code, env var, database, flag, or deployment changes were made as part of producing this document.*
