# DNS Cutover — Operational Status

**Document date:** 2026-05-14  
**Last updated:** 2026-05-14 (user responses incorporated)  
**Purpose:** Tracks the resolution status of the operational blockers identified in `docs/final-domain-cutover-go-live-checklist.md` Section 4 before Stage 3 (DNS change) can proceed.  
**Mode:** Operational planning document. No DNS, hosting, code, or secret changes were made in producing this document.  
**Output discipline:** No raw credentials, passwords, or personally identifying information.

---

## Summary Table

| # | Blocker | Hard DNS blocker? | Status |
|---|---|---|---|
| 1 | DNS owner / Route 53 access confirmed | Yes | ⚠️ **Partial** — registrar access confirmed; Route 53 hosted zone access not yet confirmed |
| 2 | DNS records exported and backed up (full zone) | Yes | ⚠️ **Partial** — A records confirmed; MX/TXT/NS zone export requires Route 53 login |
| 3 | Protected subdomains confirmed safe from apex change | Yes | ✅ **Confirmed** — 2026-05-14 |
| 4 | Old hosting rollback IP documented | Yes | ✅ **Confirmed** — 2026-05-14 |
| 5 | Old hosting confirmed preserved for 2–4 weeks post-cutover | Yes | ❌ **Open** — AWS instance owner has not confirmed longevity |
| 6 | Replit production deployment target (custom domain IP/CNAME) | Yes | ❌ **Open** — not yet added to Replit; target value unknown |
| 7 | SSL auto-provisioning confirmed | Yes | ❌ **Open** — depends on item 6 |
| 8 | TTL checked and lowered to ~300 s (24 h before cutover) | Yes (rollback risk) | ❌ **Open** — current TTL unknown; must be checked in Route 53 |
| 9 | Technical rollback owner (with Route 53 access) assigned | Yes | ❌ **Open** — must be the person with AWS Route 53 access |
| 10 | Communication channel for cutover window designated | Yes | ⚠️ **Partial** — WhatsApp + phone confirmed as method; group not yet set up |

**Current overall rating: B**  
**Confirmed resolved: 2 / 10 hard blockers**  
**Path to A:** All 10 items above must reach ✅.  
**DNS cutover cannot be scheduled yet.**

---

## 1. DNS Owner / Registrar / Nameserver Authority

**Status: ⚠️ Partial — registrar access confirmed; Route 53 hosted zone access not yet confirmed**

### What is confirmed

| Item | Value | Source |
|---|---|---|
| Domain registrar | dominios.cr / NIC Costa Rica | User, 2026-05-14 |
| Registrar panel access | Available (user can view/confirm nameservers) | User, 2026-05-14 |
| Authoritative DNS provider | **AWS Route 53** — domain is delegated to Route 53 nameservers | User, 2026-05-14 |
| Nameserver 1 | `ns-1400.awsdns-47.org` | User, 2026-05-14 |
| Nameserver 2 | `ns-148.awsdns-18.com` | User, 2026-05-14 |
| Nameserver 3 | `ns-1718.awsdns-22.co.uk` | User, 2026-05-14 |
| Nameserver 4 | `ns-725.awsdns-26.net` | User, 2026-05-14 |
| DNS change method | **Edit records in AWS Route 53 hosted zone** — do not change nameservers in dominios.cr | User, 2026-05-14 |

### Critical implication

All DNS record changes (the cutover A records for `crbox.cr` and `www.crbox.cr`, plus the TTL change) must be made in the **AWS Route 53 console**, not in dominios.cr. dominios.cr is only the domain registrar. Its nameserver delegation must remain untouched.

### What remains open

- [ ] **Identify the person who has AWS Route 53 access** to the `crbox.cr` hosted zone. This is the technical DNS owner for the cutover.
- [ ] **Confirm that person is available** during the intended cutover window and its rollback window.
- [ ] **Confirm their emergency contact** (WhatsApp / phone number) for the cutover window.

---

## 2. Current DNS Records

**Status: ⚠️ Partial — A records confirmed via external resolution; full zone export requires Route 53 login**

### A Records — confirmed 2026-05-14

| Record | Type | Current value | Host (reverse DNS) | Notes |
|---|---|---|---|---|
| `crbox.cr` | A | `98.90.3.205` | `ec2-98-90-3-205.compute-1.amazonaws.com` | Old CRBOX site, AWS EC2 us-east-1. HTTP 200. |
| `www.crbox.cr` | A | `98.90.3.205` | same | Same instance. HTTP 301 → `crbox.cr`. |
| `clients.crbox.cr` | A | `100.50.198.105` | `ec2-100-50-198-105.compute-1.amazonaws.com` | CRBOX Portal API. **Separate IP. Must not be changed.** |
| `admin.crbox.cr` | A | `100.50.198.105` | same | Internal admin/ops. **Separate IP. Must not be changed.** |

### Records that require Route 53 login to confirm

- [ ] **MX records** — email routing. Must be exported and preserved exactly.
- [ ] **TXT records** — SPF, DKIM, domain verification tokens. Export structure; redact sensitive values.
- [ ] **NS records** — should match the four nameservers above; must not be changed.
- [ ] **Any CNAME, SRV, CAA records** — must be inventoried before making any changes.

**Action required:** The person with Route 53 access must export a full zone backup (Route 53 → Hosted zones → crbox.cr → Export zone file) and store it in a location accessible to both the primary and backup rollback owners.

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
4. Propagation completes within the current TTL (see item 8 — reason TTL must be lowered first).

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

## 8. TTL Plan

**Status: ❌ Open — current TTL unknown; must be checked in Route 53**

The sandbox environment does not have `dig` or `host` available. The current TTL for `crbox.cr` and `www.crbox.cr` must be read directly from the Route 53 console.

| Item | Value | Notes |
|---|---|---|
| Current TTL for `crbox.cr` | ❓ Unknown | Check Route 53 → Hosted zones → crbox.cr → A record |
| Current TTL for `www.crbox.cr` | ❓ Unknown | Same |
| Target TTL before cutover | **300 seconds** | Standard pre-cutover value |
| When to lower | At least **24 hours** before the cutover window opens | After lowering, wait the full original TTL before changing A records |
| Earliest the A record can be changed | Original TTL seconds after lowering time | e.g. if original TTL is 3600 s and lowered at 08:00, earliest change is 09:00 the next day |

**Action required (in order):**
1. Log into Route 53 and note the current TTL for both records.
2. If TTL > 300 s, lower it to 300 s. Record the exact timestamp.
3. Wait the original TTL duration before proceeding with the cutover.
4. Document the lowering time in this file.

**Risk if TTL is not lowered first:**
- If current TTL is 3600 s (1 hour): rollback propagation takes up to 1 hour.
- If current TTL is 86400 s (24 hours): rollback propagation takes up to 24 hours.
- This risk may be explicitly accepted in writing, but it must be a conscious decision, not an oversight.

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

The following actions must be completed in this order before DNS can be changed:

1. **Identify Route 53 access holder** — who can edit `crbox.cr` hosted zone records. (Item 1, 9)
2. **Export full Route 53 zone backup** — MX, TXT, NS, all records. (Item 2)
3. **Publish Replit production deployment** and add `crbox.cr` + `www.crbox.cr` as custom domains. Record the DNS target value Replit provides. (Item 6)
4. **Check current TTL** for `crbox.cr` and `www.crbox.cr` in Route 53. (Item 8)
5. **Lower TTL to 300 s** — at least 24 hours before the intended cutover window. Record the timestamp. (Item 8)
6. **Confirm old AWS instance at `98.90.3.205` will stay live** for 2–4 weeks post-cutover. (Item 5)
7. **Assign rollback owner** (Route 53 access holder) and backup. (Item 9)
8. **Create cutover WhatsApp group** with all owners. (Item 10)
9. **Run pre-cutover smoke test** (Section 5 of go-live checklist) against the Replit preview/production URL.
10. **Open the cutover window** — minimum TTL wait has elapsed, all owners are on WhatsApp, Route 53 access is confirmed live.

---

## Final Readiness Assessment — 2026-05-14

| Operational blocker | Status |
|---|---|
| DNS owner identified | ⚠️ Partial — registrar confirmed; Route 53 holder not yet identified |
| DNS records exported (full zone) | ⚠️ Partial — A records confirmed; full Route 53 zone export needed |
| Protected subdomains confirmed safe | ✅ Confirmed |
| Old hosting rollback IP documented | ✅ Confirmed (`98.90.3.205`) |
| Old hosting preserved for rollback window | ❌ Open |
| Replit production deployment target confirmed | ❌ Open |
| SSL confirmation | ❌ Open (depends on Replit custom domain) |
| TTL lowered to ~300 s | ❌ Open (current TTL unknown) |
| Technical rollback owner assigned | ❌ Open |
| Communication channel confirmed | ⚠️ Partial |

**Rating: B**  
**Hard blockers confirmed resolved: 2 / 10**  
**DNS cutover cannot be scheduled until all 10 items reach ✅.**

---

*Produced: 2026-05-14. No DNS records were changed. No hosting was changed. No code was modified. No secrets were accessed.*
