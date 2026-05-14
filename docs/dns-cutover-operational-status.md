# DNS Cutover — Operational Status

**Document date:** 2026-05-14  
**Last updated:** 2026-05-14 (Route 53 confirmed; TTL resolved; RDS flag scope corrected)  
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
| 5 | Old hosting confirmed preserved for 2–4 weeks post-cutover | Yes | ❌ **Open** — AWS instance owner has not confirmed longevity |
| 6 | Replit production deployment target (custom domain IP/CNAME) | Yes | ❌ **Open** — not yet added to Replit; target value unknown |
| 7 | SSL auto-provisioning confirmed | Yes | ❌ **Open** — depends on item 6 |
| 8 | TTL at ~300 s | Yes (rollback risk) | ✅ **Confirmed** — already 300 s on all records; no change needed; no 24 h wait required |
| 9 | Technical rollback owner (with Route 53 access) assigned | Yes | ⚠️ **Partial** — Route 53 access confirmed for user; formal rollback owner assignment still needed |
| 10 | Communication channel for cutover window designated | Yes | ⚠️ **Partial** — WhatsApp + phone confirmed as method; group not yet set up |

**Current overall rating: B**  
**Confirmed resolved: 5 / 10 hard blockers** (items 1, 2, 3, 4, 8)  
**Path to A:** All 10 items above must reach ✅.  
**DNS cutover cannot be scheduled yet.**

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

## 5. Old Hosting Preservation for Rollback Window

**Status: ❌ Open — AWS instance owner has not confirmed the instance will stay live**

The rollback target is `98.90.3.205` (AWS EC2). If that instance is stopped or decommissioned after the cutover, rollback becomes impossible.

**Required action:**
- [ ] The person who controls the AWS EC2 instance at `98.90.3.205` must confirm in writing that it will remain running and reachable for at least **2–4 weeks** after the cutover date.
- [ ] Document who that person is and how to reach them.

**Risk if not resolved:** If the old instance goes down after cutover and a rollback trigger fires, the rollback target no longer exists. This converts a recoverable incident into an extended outage.

---

## 6. Replit Production Deployment Target

**Status: ❌ Open — custom domain not yet added to Replit; DNS target value unknown**

### What is confirmed

- Replit autoscale deployment is configured for this project.
- Dev/preview deployment exists and is being used for testing.

### What remains open

- [ ] **Publish a production deployment** in Replit (Deploy → Publish) if not already done.
- [ ] **Add `crbox.cr` as a custom domain** in Replit deployment settings (Deployments → Custom Domains → Add domain).
- [ ] **Add `www.crbox.cr` as a custom domain** (same process).
- [ ] **Record the A record IP or CNAME target** that Replit provides for each domain. This is the value that goes into Route 53 at cutover time.
- [ ] **Do not change DNS** until these values are in hand and SSL provisioning status is confirmed (item 7).

**Note:** Replit displays the required DNS record (A record IP or CNAME) on the custom domain setup screen. That value is the cutover target. Until it is known, the cutover A record value is undefined.

---

## 7. SSL Auto-Provisioning

**Status: ❌ Open — depends on item 6**

Replit automatically provisions a TLS certificate for custom domains once:
1. The custom domain is added in Replit deployment settings, and
2. DNS is pointing to Replit's target (so Replit can complete ACME/Let's Encrypt verification).

**This means SSL is not confirmed until the DNS change is live.** The confirmation step is:
- [ ] After DNS propagation, verify `https://crbox.cr/` loads with a valid certificate (no browser warning).
- [ ] This is part of the minute-0 smoke test in the cutover window (Section 5 of the go-live checklist).

**Important:** Do not open the cutover window unless `crbox.cr` and `www.crbox.cr` are already added as custom domains in Replit, even if DNS isn't pointed there yet. Replit needs the domain pre-registered to provision SSL immediately upon propagation.

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

## 9. Rollback Owner Assignment

**Status: ❌ Open — technical rollback owner must be the person with Route 53 access**

| Role | Person | Contact | Status |
|---|---|---|---|
| **Decision authority** (calls the rollback) | User / project coordinator | TBD | ⚠️ Identified but not formally assigned |
| **Technical rollback owner** (executes the DNS change) | Person with AWS Route 53 access | TBD | ❌ Not yet identified/confirmed |
| **Backup rollback owner** | TBD | TBD | ❌ Not assigned |

**Key clarification from user (2026-05-14):** The user can coordinate the rollback decision but should not be listed as technical rollback owner unless they have Route 53 access. The technical owner must be whoever can actually edit records in the Route 53 hosted zone.

**Action required:**
- [ ] Identify and name the person with Route 53 access to the `crbox.cr` hosted zone.
- [ ] Confirm they are available for the full cutover window plus a 2-hour rollback watch period.
- [ ] Identify a backup (someone who can also access Route 53 in an emergency).
- [ ] Record both names and contact details in this document before scheduling the cutover.

---

## 10. Communication Channel

**Status: ⚠️ Partial — method confirmed; specific group not yet set up**

| Item | Value | Status |
|---|---|---|
| Communication method | WhatsApp group + direct phone call | ✅ Confirmed as method |
| Cutover WhatsApp group | Not yet created | ❌ Open |
| Required members | Decision authority + technical rollback owner + backup | ❌ Open (rollback owner not yet assigned) |

**Action required:**
- [ ] Once rollback owner is assigned (item 9), create a WhatsApp group with: decision authority, technical rollback owner, backup rollback owner.
- [ ] Confirm all members are active in the group before the cutover window opens.
- [ ] Document direct phone numbers as a fallback if WhatsApp is unavailable.

---

## Pre-Cutover Action Checklist (ordered)

The following actions must be completed before DNS can be changed. Steps 1 and 8 are already done.

1. ✅ **~~Confirm Route 53 access~~** — confirmed 2026-05-14. (Item 1)
2. ✅ **~~Export full Route 53 zone backup~~** — downloaded 2026-05-14 (`crbox-cr-route53-backup-2026-05-14.json`, 21 record sets). (Item 2)
3. [ ] **Publish Replit production deployment** and add `crbox.cr` + `www.crbox.cr` as custom domains. Record the exact A record IP or CNAME that Replit provides. (Items 6, 7, 11)
4. [ ] **Confirm old AWS instance at `98.90.3.205` will stay live** for 2–4 weeks post-cutover. Get written confirmation from whoever controls that EC2 instance. (Item 5)
5. [ ] **Assign rollback owner** (the Route 53 access holder, confirmed in step 1) and backup. Document names and phone numbers. (Item 9)
6. [ ] **Create cutover WhatsApp group** with decision authority, technical rollback owner, and backup. Confirm all members active. (Item 10)
7. [ ] **Run pre-cutover smoke test** (Section 5 of go-live checklist) against the Replit production URL.
8. ✅ **~~TTL pre-lowering wait~~** — eliminated. TTL already at 300 s. No wait required. (Item 8)
9. [ ] **Open the cutover window** — all owners on WhatsApp, Route 53 access confirmed live, Replit custom domain target in hand.

---

## Final Readiness Assessment — 2026-05-14 (latest)

| Operational blocker | Status |
|---|---|
| DNS owner / Route 53 access confirmed | ✅ Confirmed |
| DNS records exported (full zone) | ✅ Confirmed — `crbox-cr-route53-backup-2026-05-14.json`, 21 record sets |
| Protected subdomains confirmed safe | ✅ Confirmed |
| Old hosting rollback IP documented | ✅ Confirmed (`98.90.3.205`) |
| Old hosting preserved for rollback window | ❌ Open |
| Replit production deployment target confirmed | ❌ Open |
| SSL confirmation | ❌ Open (depends on Replit custom domain) |
| TTL at 300 s | ✅ Confirmed — already 300 s; no action needed |
| Technical rollback owner assigned | ⚠️ Partial — Route 53 access confirmed; formal assignment pending |
| Communication channel confirmed | ⚠️ Partial — method confirmed; WhatsApp group not yet set up |

**Rating: B**  
**Hard blockers confirmed resolved: 5 / 10** (DNS owner, zone backup, protected subdomains, rollback IP, TTL)  
**DNS cutover cannot be scheduled until all 10 items reach ✅.**

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
