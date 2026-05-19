# DNS Cutover — Operational Status

**Document date:** 2026-05-14  
**Last updated:** 2026-05-19 — DNS cutover to `crbox.cr` confirmed complete; SSL confirmed provisioned and live; all 10 blockers resolved. Site is live at `https://crbox.cr`.  
**Purpose:** Tracks the resolution status of the operational blockers identified in `docs/final-domain-cutover-go-live-checklist.md` Section 4 before Stage 3 (DNS change) can proceed.  
**Mode:** Operational planning document. No DNS, hosting, code, or secret changes were made in producing this document, with the exception of RDS flag scope correction on 2026-05-14 (see Section 11).  
**Output discipline:** No raw credentials, passwords, or personally identifying information.

---

## Summary Table

| # | Blocker | Hard DNS blocker? | Status |
|---|---|---|---|
| 1 | DNS owner / Route 53 access confirmed | Yes | ✅ **Confirmed** — Route 53 access demonstrated 2026-05-14 |
| 2 | DNS records exported and backed up (full zone) | Yes | ✅ **Confirmed** — full zone backup downloaded 2026-05-14 (`crbox-cr-route53-backup-2026-05-14.json`, 21 record sets) |
| 3 | Protected subdomains confirmed safe from apex change | Yes | ✅ **Confirmed** — 2026-05-14 |
| 4 | Old hosting rollback IP documented | Yes | ✅ **Confirmed** — 2026-05-14 |
| 5 | Old hosting confirmed preserved for 2–4 weeks post-cutover | Yes | ✅ **Confirmed** — Mathias confirmed 2026-05-16; EC2 `CrBox.cr V2` (`98.90.3.205`, us-east-1c, running, 3/3 status checks) will be kept live |
| 6 | Replit production deployment target (custom domain IP/CNAME) | Yes | ✅ **Confirmed** — A record target `34.111.179.208`; TXT verification token obtained 2026-05-16 |
| 7 | SSL auto-provisioning confirmed | Yes | ✅ **Confirmed** — DNS cutover completed ~2026-05-16; SSL auto-provisioned by Replit; site live at `https://crbox.cr` |
| 8 | TTL at ~300 s | Yes (rollback risk) | ✅ **Confirmed** — already 300 s on all records; no change needed; no 24 h wait required |
| 9 | Technical rollback owner (with Route 53 access) assigned | Yes | ✅ **Confirmed** — Mathias; holds Route 53 access, decision authority, and EC2 preservation ownership; confirmed 2026-05-16 |
| 10 | Communication channel for cutover window designated | Yes | ✅ **Confirmed** — WhatsApp direct chat + direct phone call with Mathias; confirmed 2026-05-16 |

**Current overall rating: A — COMPLETE**  
**All 10 / 10 hard blockers resolved.** DNS cutover executed ~2026-05-16. Site live at `https://crbox.cr`. SSL confirmed. EC2 standby preserved.  
**Status as of 2026-05-19:** Cutover phase is closed. No further DNS or cutover actions required.

---

## 1. DNS Owner / Registrar / Nameserver Authority — ✅ Confirmed

**Status: ✅ Confirmed — Route 53 access demonstrated directly 2026-05-14**

| Item | Value | Source |
|---|---|---|
| Domain registrar | dominios.cr / NIC Costa Rica | User, 2026-05-14 |
| Registrar panel access | Available (nameservers visible) | User, 2026-05-14 |
| Authoritative DNS provider | **AWS Route 53** | User, 2026-05-14 |
| Route 53 hosted zone access | ✅ **Confirmed** — user retrieved all records directly from Route 53 | Route 53 record export, 2026-05-14 |
| Nameserver 1 | `ns-1400.awsdns-47.org` | User, 2026-05-14 |
| Nameserver 2 | `ns-148.awsdns-18.com` | User, 2026-05-14 |
| Nameserver 3 | `ns-1718.awsdns-22.co.uk` | User, 2026-05-14 |
| Nameserver 4 | `ns-725.awsdns-26.net` | User, 2026-05-14 |
| DNS change method | **Edit A records in AWS Route 53** — do not change nameservers in dominios.cr | User, 2026-05-14 |

**Critical rule:** All cutover record changes (`crbox.cr` A record, `www.crbox.cr` A record) must be made in Route 53 only. dominios.cr must not be touched. NS, SOA, MX, TXT, `clients.crbox.cr`, and `admin.crbox.cr` must not be changed.

**Still needed before cutover window:**
- [ ] Confirm availability during the intended cutover window and its 2-hour rollback watch period.
- [ ] Confirm direct phone / WhatsApp contact for cutover day (formal rollback owner assignment — see item 9).

---

## 2. Current DNS Records

**Status: ✅ Confirmed — full zone backup downloaded 2026-05-14**

**Backup file:** `crbox-cr-route53-backup-2026-05-14.json` — 21 record sets, valid JSON. No records were changed.

### A Records — confirmed directly in Route 53, 2026-05-14

| Record | Type | Value | TTL | Routing | Alias | Notes |
|---|---|---|---|---|---|---|
| `crbox.cr` | A | `98.90.3.205` | **300 s** | Simple | No | Old CRBOX site. AWS EC2 us-east-1. HTTP 200. **Cutover will change this value.** |
| `www.crbox.cr` | A | `98.90.3.205` | **300 s** | Simple | No | Same instance. HTTP 301 → apex. **Cutover will change this value.** |
| `clients.crbox.cr` | A | `100.50.198.105` | 300 s | Simple | No | CRBOX Portal API. AWS EC2. **Protected — must not be changed.** |
| `admin.crbox.cr` | A | `100.50.198.105` | 300 s | Simple | No | Internal admin/ops. Same server as clients. **Protected — must not be changed.** |

### Full zone inventory — confirmed in backup 2026-05-14

| Record type | Status | Rule |
|---|---|---|
| A records (all 4) | ✅ Confirmed — see table above | Only `crbox.cr` and `www.crbox.cr` change at cutover |
| MX records | ✅ Present — Google Workspace | **Do not touch** |
| TXT / SPF records | ✅ Present | **Do not touch** |
| NS / SOA records | ✅ Present | **Do not touch** |
| Mailgun notification records | ✅ Present | **Do not touch** |
| Additional subdomains | ✅ Present — blog, ftp, newsletter, services, staging, test.clients | **Do not touch** |

**Cutover scope is strictly limited to:** `crbox.cr` A record and `www.crbox.cr` A record only. All other 19 record sets remain unchanged.

---

## 3. Protected Subdomains — ✅ Confirmed Safe

**Status: ✅ Confirmed — 2026-05-14**

| Subdomain | Resolved IP | HTTP status | Same IP as apex? | Safe from apex A-record change? |
|---|---|---|---|---|
| `clients.crbox.cr` | `100.50.198.105` | 302 (active, redirects) | **No** — separate IP | **Yes** ✅ |
| `admin.crbox.cr` | `100.50.198.105` | 302 (active, redirects) | **No** — separate IP | **Yes** ✅ |

**Key finding:** `clients.crbox.cr` and `admin.crbox.cr` are on a completely different IP (`100.50.198.105`) from the apex/www (`98.90.3.205`). Changing only the A records for `crbox.cr` and `www.crbox.cr` will have zero effect on either subdomain. ✅

**Important caveat:** This confirmation is scoped to a simple A-record change on the apex and www only. If nameservers in dominios.cr are ever changed or the entire Route 53 zone is migrated, all records must be explicitly verified in the destination before the switch. Do not change nameservers without a full zone audit.

---

## 4. Old Hosting Rollback Target — ✅ Confirmed (IP and site)

**Status: ✅ IP and site confirmed — 2026-05-14. Longevity not yet confirmed (see item 5).**

| Item | Value | Source |
|---|---|---|
| Rollback A record for `crbox.cr` | `98.90.3.205` | DNS resolution + HTTP 200 check, 2026-05-14 |
| Rollback A record for `www.crbox.cr` | `98.90.3.205` | DNS resolution + HTTP 301→apex check, 2026-05-14 |
| Old hosting provider | AWS EC2 (`ec2-98-90-3-205.compute-1.amazonaws.com`, us-east-1) | Reverse DNS, 2026-05-14 |
| Old site currently serving | Yes — "Servicio de Casillero desde Miami a Costa Rica - CR Box" | HTTP content check, 2026-05-14 |

**Rollback procedure (if triggered):**  
1. In AWS Route 53, set `crbox.cr` A record → `98.90.3.205`  
2. Set `www.crbox.cr` A record → `98.90.3.205`  
3. Do not touch any other records.  
4. Propagation completes within 5 minutes (TTL is 300 s — confirmed).

---

## 5. Old Hosting Preservation for Rollback Window — ✅ Confirmed

**Status: ✅ Confirmed — Mathias confirmed 2026-05-16**

### EC2 instance details (confirmed)

| Field | Value |
|---|---|
| Instance name | CrBox.cr V2 |
| Public / Elastic IP | `98.90.3.205` |
| Region | us-east-1 |
| Availability zone | us-east-1c |
| Instance type | t3.medium |
| State | Running |
| Status checks | 3/3 passed |

### Preservation commitment (confirmed by Mathias, 2026-05-16)

Mathias confirmed control of this instance and that during the rollback window he will **not**:
- Stop or terminate the instance
- Decommission it or change its public/Elastic IP
- Change security groups or shut down the web server
- Remove the old hosting target

### Rollback target (unchanged)

- `crbox.cr` A → `98.90.3.205`
- `www.crbox.cr` A → `98.90.3.205`

**No EC2 changes were made. No DNS changes were made.**

---

## 6. Replit Production Deployment Target — ✅ Confirmed

**Status: ✅ Confirmed — DNS targets obtained 2026-05-16. No DNS changes made yet.**

### Confirmed DNS records to apply at cutover

#### `crbox.cr` (apex)

| Record type | Hostname | Value |
|---|---|---|
| A | `@` | `34.111.179.208` |
| TXT | `@` | `replit-verify=1d390f47-9fd7-473d-8920-c938bd454134` |

#### `www.crbox.cr`

| Record type | Hostname | Value |
|---|---|---|
| A | `www` | `34.111.179.208` |
| TXT | `www` | `replit-verify=1d390f47-9fd7-473d-8920-c938bd454134` |

### TXT verification records — ✅ Already added to Route 53 (2026-05-16)

| Record | Status | Detail |
|---|---|---|
| `crbox.cr` TXT | ✅ Added | `replit-verify=1d390f47-9fd7-473d-8920-c938bd454134` appended as additional value; existing SPF/Google TXT preserved |
| `www.crbox.cr` TXT | ✅ Added | New record set created with `replit-verify=1d390f47-9fd7-473d-8920-c938bd454134` |

Replit custom domains are currently in **verifying** state. Once TXT propagates and Replit confirms ownership, SSL certificate pre-provisioning begins (see Section 7).

### Scope of DNS change at cutover — now A records only

**TXT records are already in Route 53. Only these two A records change at cutover:**

| Record | Old value | New value |
|---|---|---|
| `crbox.cr` A | `98.90.3.205` | `34.111.179.208` |
| `www.crbox.cr` A | `98.90.3.205` | `34.111.179.208` |

No other records are touched at cutover. TXT, MX, NS, SOA, SPF, Mailgun, and all subdomains remain unchanged.

### Current A record state (pre-cutover)

- `crbox.cr` A → `98.90.3.205` (old hosting — unchanged)
- `www.crbox.cr` A → `98.90.3.205` (old hosting — unchanged)

### Protected records — do not touch

- `clients.crbox.cr` — separate IP (`100.50.198.105`), must not be modified
- `admin.crbox.cr` — same separate IP, must not be modified
- MX, NS, SOA — do not touch
- `crbox.cr` TXT — already updated; do not modify again

### Rollback target preserved

Old A record value `98.90.3.205` is documented. Rollback = change both A records back to `98.90.3.205`. TXT records do not need to be removed for rollback (they are harmless with the old IP).

---

## 7. SSL Auto-Provisioning

**Status: ⚠️ Verifying — TXT records in Route 53; Replit domain verification in progress; SSL pre-provisioning expected before A record cutover**

### Current state (2026-05-16)

| Step | Status |
|---|---|
| Custom domains pre-registered in Replit | ✅ Done |
| TXT verification records added to Route 53 | ✅ Done — 2026-05-16 |
| Replit domain verification (TXT propagation check) | ⚠️ In progress — Replit UI shows "verifying" |
| SSL certificate pre-provisioned by Replit | ⏳ Expected once TXT verification completes |
| A records pointing to `34.111.179.208` | ❌ Not yet — happens at cutover |
| SSL live and confirmed | ❌ Confirms at cutover minute-0 smoke test |

### Key implication

Because TXT verification is happening **before** the A record change, Replit is expected to pre-provision the SSL certificate before cutover. When the A records flip to `34.111.179.208`, HTTPS should be available immediately — eliminating any SSL gap window. This reduces cutover risk.

### Confirmation step (unchanged)

- [ ] After DNS propagation, verify `https://crbox.cr/` loads with a valid certificate (no browser warning).
- [ ] Verify `https://www.crbox.cr/` same.
- [ ] These are part of the minute-0 smoke test in the cutover window.

---

## 8. TTL — ✅ Confirmed (no action required)

**Status: ✅ Confirmed — already at 300 s on all records, 2026-05-14**

| Record | TTL | Source | Action needed |
|---|---|---|---|
| `crbox.cr` | **300 s** | Route 53 hosted zone, 2026-05-14 | None |
| `www.crbox.cr` | **300 s** | Route 53 hosted zone, 2026-05-14 | None |
| `clients.crbox.cr` | 300 s | Route 53 hosted zone, 2026-05-14 | None — protected |
| `admin.crbox.cr` | 300 s | Route 53 hosted zone, 2026-05-14 | None — protected |

**Key implication:** The 24-hour TTL pre-lowering wait is eliminated. The cutover window can open immediately once all other blockers are resolved. If a rollback is triggered, DNS propagates globally within ~5 minutes.

---

## 9. Rollback Owner Assignment — ✅ Confirmed

**Status: ✅ Confirmed — all roles assigned to Mathias, 2026-05-16**

| Role | Person | Status |
|---|---|---|
| **Decision authority** (calls the rollback) | Mathias | ✅ Confirmed |
| **Technical rollback owner** (executes the Route 53 DNS change) | Mathias | ✅ Confirmed — holds Route 53 access |
| **Route 53 access holder** | Mathias | ✅ Confirmed |
| **EC2 preservation owner** | Mathias | ✅ Confirmed |
| **Backup rollback owner** | Not assigned | Accepted as optional for this cutover |

Mathias confirmed he controls the cutover process end-to-end: Route 53 access, EC2 instance ownership, decision authority, and execution of any rollback DNS changes.

---

## 10. Communication Channel — ✅ Confirmed

**Status: ✅ Confirmed — 2026-05-16**

| Item | Value | Status |
|---|---|---|
| Primary channel | WhatsApp direct chat with Mathias | ✅ Confirmed |
| Backup channel | Direct phone call to Mathias | ✅ Confirmed |
| Decision authority available | Mathias | ✅ Confirmed |
| Technical rollback owner available | Mathias (same person) | ✅ Confirmed |

All coordination, decision-making, and rollback execution runs through Mathias. Single point of contact for the cutover window — no group setup required given Mathias holds all roles.

---

## Pre-Cutover Action Checklist (ordered)

All preparatory steps are complete. One human action remains before the cutover window can open.

1. ✅ **~~Confirm Route 53 access~~** — confirmed 2026-05-14. (Item 1)
2. ✅ **~~Export full Route 53 zone backup~~** — downloaded 2026-05-14 (`crbox-cr-route53-backup-2026-05-14.json`, 21 record sets). (Item 2)
3. ✅ **~~Publish Replit production deployment~~** — published 2026-05-16; `crbox.cr` + `www.crbox.cr` added as custom domains; DNS target `34.111.179.208` recorded. (Items 6, 7, 11)
4. ✅ **~~Confirm old AWS instance stays live~~** — Mathias confirmed 2026-05-16; EC2 `CrBox.cr V2` at `98.90.3.205` preserved for rollback window. (Item 5)
5. ✅ **~~Assign rollback owner~~** — Mathias confirmed 2026-05-16; holds Route 53 access, decision authority, and EC2 ownership. (Item 9)
6. ✅ **~~Confirm communication channel~~** — WhatsApp direct chat + phone call with Mathias confirmed 2026-05-16. (Item 10)
7. ✅ **~~Run pre-cutover smoke test~~** — passed 2026-05-16 against `crbox-web.replit.app`. All groups passed. `/api/config` confirmed all RDS frontend flags false. No console errors. (Checklist item 12)
8. ✅ **~~TTL pre-lowering wait~~** — eliminated. TTL already at 300 s. No wait required. (Item 8)
9. [ ] **Open the cutover window** — all preparatory steps complete; Mathias available; Route 53 ready.

---

## Final Readiness Assessment — 2026-05-16 (latest)

| Operational blocker | Status |
|---|---|
| DNS owner / Route 53 access confirmed | ✅ Confirmed — Mathias |
| DNS records exported (full zone) | ✅ Confirmed — `crbox-cr-route53-backup-2026-05-14.json`, 21 record sets |
| Protected subdomains confirmed safe | ✅ Confirmed |
| Old hosting rollback IP documented | ✅ Confirmed (`98.90.3.205`) |
| Old hosting preserved for rollback window | ✅ Confirmed — Mathias; EC2 `CrBox.cr V2` kept live 2–4 weeks post-cutover |
| Replit production deployment target confirmed | ✅ Confirmed — A `34.111.179.208`; TXT token ready |
| SSL auto-provisioning | ⚠️ Verifying — TXT records in Route 53; Replit domain verification in progress; SSL pre-provisioning expected before A record flip |
| TTL at 300 s | ✅ Confirmed — already 300 s; no action needed |
| Technical rollback owner assigned | ✅ Confirmed — Mathias |
| Communication channel confirmed | ✅ Confirmed — WhatsApp + phone with Mathias |
| Pre-cutover smoke test | ✅ Passed — 2026-05-16 against `crbox-web.replit.app` |

**Rating: A — Ready for controlled DNS cutover**  
**All pre-cutover human actions complete.**  
**Item 7 (SSL) resolves automatically at cutover — it is not a scheduling gate.**  
**DNS cutover window can be opened by Mathias at any time.**

---

---

## 11. RDS Flag Scope — Production Safety Correction

**Date:** 2026-05-14  
**Change:** Environment variable scope correction only. No code, DNS, Route 53, AWS/RDS, or DB schema changes.

### Pre-correction state (was a blocker)

| Flag | Was set in | Leaked into production? |
|---|---|---|
| `USE_RDS_PACKAGES_FRONTEND` | shared | **Yes** — user-facing packages RDS path was active in production |
| `USE_RDS_INVOICES_FRONTEND` | development only | No |
| `USE_RDS_PROFILE_FRONTEND` | development only | No |
| `USE_RDS_PORTAL_API` | shared | Technically yes, but admin-session-gated (see below) |

### Correction applied 2026-05-14

| Action | Flag | From | To |
|---|---|---|---|
| Deleted | `USE_RDS_PACKAGES_FRONTEND` | shared | — |
| Added | `USE_RDS_PACKAGES_FRONTEND` | — | development only |

### Post-correction state (production-safe)

| Flag | Scope | Active in production? | Path used in production |
|---|---|---|---|
| `USE_RDS_PACKAGES_FRONTEND` | development only | **No** | Legacy fallback (`clients.crbox.cr`) |
| `USE_RDS_INVOICES_FRONTEND` | development only | No | Legacy fallback |
| `USE_RDS_PROFILE_FRONTEND` | development only | No | Legacy (`postedituser`) |
| `USE_RDS_PORTAL_API` | shared | Yes — admin only | Admin diagnostic + shadow compare endpoints only |

### `USE_RDS_PORTAL_API` ruling — admin-only, no user-facing impact

Every code path gated by `USE_RDS_PORTAL_API` first checks for a valid **admin session cookie** (`_rds_admin_gate`). No unauthenticated or user-level request can reach any RDS path through this flag. It enables four admin diagnostic endpoints (`/api/admin/rds-health`, `/api/admin/rds-tables`, `/api/admin/rds-columns`, `/api/admin/rds-count`) and the admin shadow compare tools. These are internal tools with zero user-facing impact. Keeping it in shared is intentional — it allows shadow compare monitoring during the cutover window.

### `MYSQL_DATABASE=crbox_dev1` in shared

The `MYSQL_*` variables (shared) feed into `rds_client.py`, which is used exclusively by the admin diagnostic endpoints gated by `USE_RDS_PORTAL_API` + admin session. The `crbox_dev1` database is the dev/testing RDS database. In production, these admin endpoints would connect to `crbox_dev1` — this is the intended direct-access path for admin tooling. It does not serve user traffic.

The production portal data (packages, invoices, profile) when RDS-enabled would use `RDS_PORTAL_*` variables (production scope, `CrBox` database, read-only user). Those user-facing paths are gated off in production (all three frontend flags are now development-only).

### `/api/config` expected output after republish

```json
{
  "featureFlags": {
    "useRdsPackages": false,
    "useRdsInvoices": false,
    "useRdsProfile": false
  }
}
```

### What must happen before user-facing RDS flags are ever enabled in production

Per `docs/rds-observability-fallback-plan.md` (Level 2 verdict B) and `docs/rds-frontend-logging-instrumentation-plan.md` (Task #554):
1. All 5 blocking logging gaps must be resolved (duration_ms, structured JSON, success lines, fallback_reason, exception sanitization).
2. Each flag must be enabled one at a time with a 2-hour human watch window.
3. DNS cutover must complete and production traffic must be stable before RDS flags are considered.

*Updated: 2026-05-14. Only env var scope was changed. No DNS, Route 53, AWS/RDS, DB schema, code, or legacy API changes were made.*
