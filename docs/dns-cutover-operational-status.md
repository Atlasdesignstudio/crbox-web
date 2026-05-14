# DNS Cutover — Operational Status

**Document date:** 2026-05-14  
**Purpose:** Tracks the resolution status of the 7 operational blockers identified in `docs/final-domain-cutover-go-live-checklist.md` Section 4 before Stage 3 (DNS change) can proceed.  
**Mode:** Operational planning document. No DNS, hosting, code, or secret changes were made in producing this document.  
**Output discipline:** No raw credentials, passwords, or personally identifying information.

---

## Summary

| Blocker | Status | Confirmed by |
|---|---|---|
| B1 — DNS owner identified | ❓ **Needs user input** | — |
| B-DNS — Current DNS records exported/backed up | ⚠️ **Partial** — A records confirmed, full zone backup needs registrar login | External DNS resolution |
| B-PROT — Protected subdomains confirmed separate | ✅ **Confirmed** | Python `socket` + HTTP reachability check, 2026-05-14 |
| B9 — Old hosting rollback target documented | ✅ **Confirmed** | DNS resolution, 2026-05-14 |
| B4 — New Replit custom domain target documented | ❓ **Needs user input** — Replit custom domain not yet confirmed | — |
| B5 — SSL confirmation | ❓ **Needs user input** — depends on Replit custom domain setup | — |
| B8 — TTL lowered or scheduled | ❓ **Needs user input** — current TTL unknown without registrar access | — |
| B7 — Old hosting preserved for rollback | ❓ **Needs user input** — need confirmation site won't be decommissioned | — |
| B6 — Production env vars confirmed | ❓ **Needs user input** — requires Replit Secrets check | — |
| B13 — Rollback owner assigned | ❓ **Needs user input** | — |
| B14 — Communication channel confirmed | ❓ **Needs user input** | — |

---

## 1. DNS Owner

**Status: ❓ Needs user input**

Cannot be determined from the codebase or DNS lookups. Required information:

- [ ] Name of the person / team with registrar or DNS provider login access
- [ ] DNS provider / registrar name (e.g. Cloudflare, Route 53, GoDaddy, Namecheap)
- [ ] Confirmation they are available during the intended cutover window
- [ ] Emergency contact method (phone / WhatsApp / email) for the cutover window

---

## 2. Current DNS Records

**Status: ⚠️ Partial — A records confirmed via external resolution; full zone backup requires registrar login**

### A Records — confirmed 2026-05-14

| Record | Type | Current value | Notes |
|---|---|---|---|
| `crbox.cr` | A | `98.90.3.205` | Old CRBOX site on AWS EC2 (`ec2-98-90-3-205.compute-1.amazonaws.com`) |
| `www.crbox.cr` | A | `98.90.3.205` | Same AWS EC2 instance; returns HTTP 301 → `crbox.cr` |
| `clients.crbox.cr` | A | `100.50.198.105` | Legacy CRBOX API + client system on AWS EC2 (`ec2-100-50-198-105.compute-1.amazonaws.com`) — **separate IP, must not be changed** |
| `admin.crbox.cr` | A | `100.50.198.105` | Internal operations/admin tool — same server as clients — **must not be changed** |

### MX / TXT / NS Records — not yet confirmed

The DNS provider must export:
- [ ] All MX records (email routing — must be preserved exactly)
- [ ] All TXT records (SPF, DKIM, domain verification tokens — redact values if sensitive, but preserve structure)
- [ ] NS records (nameservers — must not be changed unless full zone is migrated)
- [ ] Any other records: CNAME, SRV, CAA

**Action required:** Log into the DNS provider and export a full zone backup. Store it in a shared location accessible to the rollback owner.

---

## 3. Protected Subdomains — ✅ Confirmed Safe

**Status: ✅ Confirmed — 2026-05-14**

Both protected subdomains resolve and are reachable:

| Subdomain | Resolved IP | HTTP status | Same as apex? | Safe from apex DNS change? |
|---|---|---|---|---|
| `clients.crbox.cr` | `100.50.198.105` | 302 (active) | **No** — separate IP | **Yes** ✅ |
| `admin.crbox.cr` | `100.50.198.105` | 302 (active) | **No** — separate IP | **Yes** ✅ |

**Key finding:** `clients.crbox.cr` and `admin.crbox.cr` are on a completely different IP (`100.50.198.105`) from the apex/www (`98.90.3.205`). Changing only the A record for `crbox.cr` and `www.crbox.cr` will have zero effect on either subdomain under any normal DNS change. ✅

**Caveat:** This confirmation applies to a simple A-record change. If nameservers are moved or the entire DNS zone is transferred, all records must be explicitly recreated in the new zone before the switch completes. The protection above does **not** apply to a nameserver migration that omits these records.

---

## 4. Old Hosting Rollback Target — ✅ Confirmed

**Status: ✅ Confirmed — 2026-05-14**

| Item | Value | Source |
|---|---|---|
| Rollback A record for `crbox.cr` | `98.90.3.205` | DNS resolution + HTTP 200 verification |
| Rollback A record for `www.crbox.cr` | `98.90.3.205` | DNS resolution + HTTP 301 → apex verification |
| Old site currently serving | Yes — "Servicio de Casillero desde Miami a Costa Rica - CR Box" | HTTP content check |
| Old hosting provider | AWS EC2 (`compute-1.amazonaws.com`, us-east-1 region) | Reverse DNS |

**Rollback procedure (if needed):** Set `crbox.cr` A record → `98.90.3.205`. Set `www.crbox.cr` A record → `98.90.3.205`. Do not touch any other records.

**Still needs user confirmation:**
- [ ] Confirm the old hosting (AWS EC2 `98.90.3.205`) will remain active and not be decommissioned for at least 2–4 weeks after the cutover date.
- [ ] Confirm who controls the old hosting instance and can keep it running.

---

## 5. Replit Production Deployment Target

**Status: ❓ Needs user input**

The new CRBOX site runs on Replit. To execute the DNS cutover, the exact A record IP or CNAME hostname that Replit provides for the custom domain must be confirmed.

Required information:
- [ ] Has `crbox.cr` been added as a custom domain in the Replit deployment settings? (Settings → Custom Domains)
- [ ] What A record IP or CNAME value does Replit provide for the custom domain? (Replit shows this in the custom domain setup screen)
- [ ] Is the Replit deployment published (production, not just dev preview)?
- [ ] What is the production deployment URL currently? (e.g. `crbox-…-replit.app`)

**Note:** Replit autoscale deployments typically provision an A record IP or a CNAME target. This value must be confirmed before the DNS change. The cutover A record for `crbox.cr` will change from `98.90.3.205` (AWS) to the Replit-provided target.

---

## 6. TTL Plan

**Status: ❓ Needs user input — current TTL cannot be determined without registrar access**

The current TTL for `crbox.cr` and `www.crbox.cr` could not be read from this environment (no `dig`/`host` available). The DNS provider must confirm this value.

| Item | Status | Notes |
|---|---|---|
| Current TTL for `crbox.cr` | ❓ Unknown | Check in DNS provider panel |
| Current TTL for `www.crbox.cr` | ❓ Unknown | Check in DNS provider panel |
| Target TTL before cutover | ~300 seconds | Must be set at least 24 h before the cutover window |
| When to lower TTL | At least 24 h before cutover | After lowering, wait the full current TTL before changing the A record |

**Action required:**
1. Log into the DNS provider and check the current TTL for `crbox.cr` and `www.crbox.cr`.
2. If TTL is currently high (e.g. 3600 s = 1 h, or 86400 s = 24 h), lower it to 300 s at least 24 h before the planned cutover window.
3. Document the lowering time so the 24-hour wait can be tracked.

**Risk if TTL is not lowered:** A rollback to the old hosting IP may take up to the full current TTL to propagate globally. For a 3600-second TTL that is up to 1 hour of potential downtime during rollback. For a 86400-second TTL that is up to 24 hours.

---

## 7. Rollback Owner and Communication Channel

**Status: ❓ Needs user input**

Required decisions:

| Item | Status |
|---|---|
| Rollback owner (primary) — name and contact | ❓ Not assigned |
| Rollback owner (backup) — name and contact | ❓ Not assigned |
| Communication channel during cutover | ❓ Not designated |
| Authority to call rollback | ❓ Not documented |
| Cutover window date/time | ❓ Not scheduled |

**Recommendation:** Schedule the cutover during a low-traffic period (e.g. early morning Costa Rica time, Tuesday–Thursday). Avoid Monday mornings and Friday afternoons.

---

## 8. Final Readiness Assessment

| Operational blocker | Hard DNS blocker? | Status |
|---|---|---|
| DNS owner identified | Yes | ❓ Open |
| DNS records exported / backed up | Yes | ⚠️ Partial (A records confirmed; full zone export needed) |
| Protected subdomains confirmed safe | Yes | ✅ **Confirmed** |
| Old hosting rollback target documented | Yes | ✅ **Confirmed** (`98.90.3.205`) |
| Old hosting confirmed preserved for rollback | Yes | ❓ Needs user confirmation |
| Replit production deployment target confirmed | Yes | ❓ Open |
| SSL confirmation | Yes | ❓ Depends on Replit custom domain setup |
| TTL lowered to ~300 s | Yes (rollback risk) | ❓ Open |
| Rollback owner assigned | Yes (safety) | ❓ Open |
| Communication channel confirmed | Yes (safety) | ❓ Open |

**Current rating: B — 2 of 10 hard DNS cutover blockers confirmed resolved.**  
**Path to A:** Resolve the 8 remaining items above.

---

*Produced: 2026-05-14. No DNS records were changed. No hosting was changed. No code was modified. No secrets were accessed.*
