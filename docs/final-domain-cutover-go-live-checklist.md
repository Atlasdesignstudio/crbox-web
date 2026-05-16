# Final Domain Cutover Go-Live Checklist

**Document date:** 2026-05-14  
**Scope:** DNS cutover from Replit preview URL to `crbox.cr` / `www.crbox.cr`  
**Mode:** Planning and execution reference only. No code, DNS, hosting, RDS flags, AWS, secrets, or legacy systems were changed in producing this document.  
**Output discipline:** Zero raw tokens, passwords, credentials, email addresses, ID numbers, or other PII anywhere in this document.

---

## Table of Contents

1. Final Cutover Model
2. Current Readiness Summary
3. Protected Domains and Subdomains
4. Final Hard Blockers Before DNS Change
5. Pre-Cutover Smoke Test
6. DNS Cutover Execution Plan
7. Post-Cutover Smoke Test
8. Rollback Plan
9. Production RDS Position During Cutover
10. Auth / Signup / Password Recovery Position During Cutover
11. Final Go / No-Go Decision Table
12. Final Recommendation

---

## 1. Final Cutover Model

The domain cutover is a **controlled domain switch**, not a migration away from legacy systems. The model is:

| Layer | Before cutover | After cutover |
|---|---|---|
| Public website | Replit preview URL | `https://crbox.cr` |
| Client portal UI | Replit preview URL | `https://crbox.cr` (same Replit deployment) |
| Legacy client API | `clients.crbox.cr` | `clients.crbox.cr` — **unchanged** |
| Internal operations/admin | `admin.crbox.cr` | `admin.crbox.cr` — **unchanged** |
| Auth / login | Backed by `clients.crbox.cr/authtoken` | Same — **unchanged** |
| Signup / registration | Backed by `clients.crbox.cr` via server proxy | Same — **unchanged** |
| Password recovery | Backed by `clients.crbox.cr/getuserpasswordrecovery` | Same — **unchanged** |
| Profile writes | Backed by `clients.crbox.cr/postedituser` | Same — **unchanged** |
| Invoice uploads | Backed by `clients.crbox.cr/postcreatepurchasebill` | Same — **unchanged** |
| RDS read paths | Feature flags off | Feature flags remain off during cutover |
| Old hosting | Active | Preserved on standby for rollback |
| Legacy decommission | Not started | Separate future project — not part of this cutover |

**Explicit policy: Do not migrate login, signup, or password recovery to a new database for this cutover.** All three flows remain legacy-backed through `clients.crbox.cr`. Future auth modernization is a separate project scoped only after the confidence period ends.

---

## 2. Current Readiness Summary

Sources: `docs/domain-cutover-readiness-plan.md` (updated 2026-05-14), `docs/auth-registration-password-recovery-audit.md` (Task #545, 2026-05-14), `docs/rds-observability-fallback-plan.md` (Task #547, 2026-05-14).

| Area | Readiness | Key facts |
|---|---|---|
| **Public marketing site** | **90%** | All 9 public pages (`index.html`, `servicios.html`, `como-funciona.html`, `tarifas.html`, `calculadora.html`, `contacto.html`, `afiliate.html`, `privacidad.html`, `terminos.html`) present with correct GTM tags, canonical tags, and no blocking issues. Remaining gap: registration env vars not confirmed in Replit production deployment. |
| **Client portal UI** | **70%** | Portal pages built; legacy API fallbacks active. Open item: invoice upload end-to-end not confirmed in production. RDS shadow validation separate and not required for DNS cutover if legacy fallback remains active. |
| **Auth / signup / recovery** | **92%** | Task #545 complete. Final recommendation **A — Safe for domain cutover with documented legacy limitations.** Login, signup, password recovery, and logout are all fully wired to production CRBOX API. 60-second in-memory recovery cooldown implemented. Remaining gap (8%): registration env vars not confirmed in production deployment. |
| **SEO / indexing / analytics** | **95%** | GTM `GTM-5WD8N53F` confirmed in all 18 HTML pages (`scripts/inject-gtm.js` verified). `robots.txt` disallows all 9 portal paths + `/admin/` + `/uploads/`. `sitemap.xml` contains exactly 9 public URLs. All 9 public pages have canonical tags. All portal + private pages are `noindex`. `cotizar.html` is explicitly `noindex`. Minor gap: HTTP 404 status code not confirmed for unknown paths (`server.py`). |
| **DNS / SSL / operational** | **40%** | All four remaining blockers are operational, not code issues: DNS owner unknown, SSL not confirmed, TTL not lowered, old hosting preservation not confirmed. These are the critical path to Stage 3. |
| **RDS production readiness** | **Not required for DNS cutover** | RDS frontend flags must remain off during DNS cutover. Legacy fallback is active for packages, invoices, and profile. RDS activation is a separate post-cutover incremental gate. Observability plan (Task #547) identifies 5 gaps that block frontend flag enablement — these are separate from the DNS cutover. |
| **Rollback readiness** | **Partial** | Rollback procedure is documented (Section 8 of this document and `docs/domain-cutover-readiness-plan.md` Section 9). Rollback owner and communication channel not yet assigned. Old hosting preservation not yet confirmed. |
| **Overall** | **73%** | Public site and SEO are effectively ready. Auth is confirmed ready. DNS/operational blockers are the critical path. |

**Overall domain cutover plan recommendation:** B — Needs specific operational fixes before Stage 3.  
**Auth / signup / recovery recommendation:** A — Safe for domain cutover with documented legacy limitations.  
**Auth is a DNS cutover blocker?** No.

---

## 3. Protected Domains and Subdomains

The DNS cutover scope is limited to **`crbox.cr` and `www.crbox.cr` only**.

| Domain / Subdomain | Purpose | Cutover action |
|---|---|---|
| `crbox.cr` | New public website and client portal | **Target — change DNS record to point to Replit** |
| `www.crbox.cr` | Public website alias | **Target — add/update to redirect to or resolve same as `crbox.cr`** |
| `clients.crbox.cr` | Legacy CRBOX client API / portal backend | **Do NOT change — any disruption breaks all auth and portal data** |
| `admin.crbox.cr` | Internal CRBOX operations and admin tool | **Do NOT change — any disruption breaks the internal admin system** |

**MX / email records:** Do not touch. Any email-sending or receiving infrastructure must be preserved exactly.

**⚠️ Nameserver / full zone move warning:** If nameservers or the entire DNS zone are transferred to a new provider:
1. Export all current DNS records (A, CNAME, MX, TXT, SRV, etc.) for the entire `crbox.cr` zone **before** making any change.
2. Recreate every record in the new zone and verify each one individually.
3. Confirm `clients.crbox.cr` and `admin.crbox.cr` resolve correctly in the new zone before lowering TTLs or switching nameservers.
4. Do not complete the nameserver switch until the full zone has been verified.

Failure to preserve `clients.crbox.cr` would break all logins, signups, password recoveries, profile updates, and invoice uploads immediately upon DNS propagation.

---

## 4. Final Hard Blockers Before DNS Change

| # | Item | Classification | Status | Notes |
|---|---|---|---|---|
| 1 | DNS owner / Route 53 access holder identified and available for cutover window | **Blocks DNS cutover** | ✅ **Confirmed 2026-05-14** | Route 53 access confirmed — user retrieved all hosted zone records directly. Registrar: dominios.cr / NIC Costa Rica. Authoritative DNS: AWS Route 53. Nameservers: `ns-1400.awsdns-47.org`, `ns-148.awsdns-18.com`, `ns-1718.awsdns-22.co.uk`, `ns-725.awsdns-26.net`. All cutover changes go in Route 53 only — do not touch dominios.cr. Source: Route 53 record export + `docs/dns-cutover-operational-status.md`. |
| 2 | Current DNS records exported and backed up | **Blocks DNS cutover** | ✅ **Confirmed 2026-05-14** | Full Route 53 zone backup downloaded: `crbox-cr-route53-backup-2026-05-14.json` (21 record sets, valid JSON). Contains: all 4 A records (confirmed), MX records (Google Workspace — do not touch), TXT/SPF records (do not touch), NS and SOA (do not touch), Mailgun notification records (do not touch), additional subdomains: blog, ftp, newsletter, services, staging, test.clients. No DNS records were changed. Source: Route 53 zone export 2026-05-14 + `docs/dns-cutover-operational-status.md`. |
| 3 | Old hosting rollback target documented | **Blocks DNS cutover** | ✅ **Confirmed 2026-05-14** | Rollback A record: `98.90.3.205` (AWS EC2 `ec2-98-90-3-205.compute-1.amazonaws.com`, us-east-1). Old site confirmed serving HTTP 200. `www.crbox.cr` 301 → apex, same IP. Source: `docs/dns-cutover-operational-status.md`. |
| 4 | New Replit custom domain target documented and configured | **Blocks DNS cutover** | ✅ **Confirmed 2026-05-16** | `crbox.cr` and `www.crbox.cr` added as custom domains in Replit. DNS target: A record `34.111.179.208` for both apex and www. TXT verification token: `replit-verify=1d390f47-9fd7-473d-8920-c938bd454134` (same token for both). TXT must be added as an additional value on `crbox.cr` (existing SPF/Google TXT must be preserved). New TXT record set needed for `www.crbox.cr`. No DNS changes made yet. Source: `docs/dns-cutover-operational-status.md` Section 6. |
| 5 | SSL certificate provisioned or auto-provisioning confirmed for `crbox.cr` and `www.crbox.cr` on Replit | **Blocks DNS cutover** | ❌ Open — domain pre-registered ✅; SSL provisions on DNS propagation | Domains pre-registered in Replit (required pre-condition met). Replit will auto-provision SSL once DNS points to `34.111.179.208` and ACME verification completes using the TXT token. Cannot be confirmed until DNS change is live. Confirmation is part of minute-0 smoke test. Source: `docs/dns-cutover-operational-status.md` Section 7. |
| 6 | DNS TTL for `crbox.cr` and `www.crbox.cr` already at ~300 s | **Blocks DNS cutover (rollback risk)** | ✅ **Confirmed 2026-05-14 — no action required** | Both records confirmed at TTL 300 s directly in Route 53. No TTL change needed. No 24-hour pre-lowering wait required. Rollback propagation window is already ≤5 minutes. Source: Route 53 record export 2026-05-14 + `docs/dns-cutover-operational-status.md`. |
| 7 | Old hosting preserved and confirmed reachable for rollback window | **Blocks DNS cutover (rollback safety)** | ❌ Open — AWS instance owner has not confirmed longevity | Old site at `98.90.3.205` is currently serving. However, the owner of that AWS EC2 instance has not confirmed it will remain live for 2–4 weeks post-cutover. Must be confirmed in writing before cutover is scheduled. Source: user confirmation 2026-05-14 + `docs/dns-cutover-operational-status.md`. |
| 8 | `clients.crbox.cr` confirmed reachable | **Blocks DNS cutover** | ✅ **Confirmed 2026-05-14** | Resolves to `100.50.198.105` (separate IP from apex). Returns HTTP 302. A change to apex A record cannot affect this subdomain. Source: `docs/dns-cutover-operational-status.md`. |
| 9 | `admin.crbox.cr` confirmed reachable | **Blocks DNS cutover** | ✅ **Confirmed 2026-05-14** | Resolves to `100.50.198.105` (same separate IP as `clients`). Returns HTTP 302. A change to apex A record cannot affect this subdomain. Source: `docs/dns-cutover-operational-status.md`. |
| 10 | `CRBOX_SVC_EMAIL` and `CRBOX_SVC_PASSWORD` confirmed set in Replit production deployment | **Blocks broad portal rollout** | ⚠️ Open | Registration fails silently without these. Source: `replit.md` Required Env Vars, `server.py` `_handle_svc_token`. For DNS cutover of the public site this is acceptable with a documented limitation; for broad portal rollout (registration live) this is a hard requirement. |
| 11 | Replit production deployment verified live and stable (not just preview) | **Blocks DNS cutover** | ✅ **Confirmed 2026-05-16** | Production deployment published 2026-05-16 (checkpoint `15656d1f`). App live at `crbox-web.replit.app`. Custom domains `crbox.cr` and `www.crbox.cr` pre-registered in Replit deployment settings. |
| 12 | Pre-cutover smoke test (Section 5) completed and passed | **Blocks DNS cutover** | ⚠️ Open — Not yet run | Must be run against the Replit preview or production URL before the DNS change window opens. |
| 13 | Rollback owner assigned and confirmed available during cutover window | **Blocks DNS cutover (rollback safety)** | ❌ Open — technical owner must have Route 53 access | User confirmed 2026-05-14: decision authority (project coordinator) identified but should not be listed as technical rollback owner without Route 53 access. Technical rollback owner = the person who can actually edit Route 53 records. That person has not yet been identified or confirmed available. Backup rollback owner also needed. Source: `docs/dns-cutover-operational-status.md`. |
| 14 | Rollback communication channel confirmed | **Blocks DNS cutover (rollback safety)** | ⚠️ Partial — method confirmed; group not yet set up | User confirmed 2026-05-14: WhatsApp group + direct phone call will be used. Group must be created and all owners confirmed active before the cutover window opens. Cannot be created until rollback owner (item 13) is assigned. |
| 15 | Invoice upload end-to-end test (`postcreatepurchasebill` → visible in CRBOX admin) either passed or explicitly accepted as a non-blocking limitation for initial DNS cutover | **Blocks broad portal rollout** | ⚠️ Open | Does **not** block DNS cutover of the public marketing site if invoice upload is treated as a documented limitation. Blocks broad portal promotion if invoice upload is a critical user flow. Source: `replit.md` Gotchas. |
| 16 | ~~Password recovery functional audit~~ | ~~Blocks broad portal rollout~~ | ✅ **Resolved 2026-05-14** | Task #545 complete. Recommendation A. 60-second cooldown implemented. Source: `docs/auth-registration-password-recovery-audit.md`. |

**Hard DNS cutover blockers (must all be resolved before Stage 3):** Items 1–9, 11–14  
**Broad portal rollout blockers (may be accepted as limitations for initial DNS cutover):** Items 10, 15  

**Status as of 2026-05-16 (latest update — Replit DNS targets confirmed; production deployment live):**  
✅ Confirmed resolved: items 1, 2, 3, 4, 6, 8, 9, 11, 16  
⚠️ Partially confirmed: items 13, 14  
❌ Open: items 5, 7, 12  
**Overall rating: B+ — DNS cutover cannot be scheduled yet (items 5, 7, 12, 13 must all reach ✅).**  
**See `docs/dns-cutover-operational-status.md` for full detail and ordered action checklist.**

**RDS production flag state (corrected 2026-05-14):**  
`USE_RDS_PACKAGES_FRONTEND` moved from shared → development only. All three user-facing RDS frontend flags are now development-only. Production packages, invoices, and profile use legacy/fallback paths. `USE_RDS_PORTAL_API` remains in shared — admin-session-gated, no user-facing impact. See `docs/dns-cutover-operational-status.md` Section 11.

---

## 5. Pre-Cutover Smoke Test

Run this checklist against the Replit production deployment URL before opening the DNS cutover window. Mark each item ✅ Pass / ❌ Fail / ⚠️ Partial.

### Group A — Public Site

- [ ] `index.html` loads without JS errors in console
- [ ] `servicios.html` loads
- [ ] `como-funciona.html` loads, carousel/tabs work
- [ ] `tarifas.html` loads, rate tables visible
- [ ] `calculadora.html` loads and produces a cost result
- [ ] `contacto.html` loads, contact form submits without error
- [ ] `afiliate.html` loads, both personal and business tabs present
- [ ] `privacidad.html` loads
- [ ] `terminos.html` loads
- [ ] Navigating to a non-existent path shows a 404 page and the server returns HTTP 404 (not 200)
- [ ] Mobile navigation (hamburger / drawer) opens and closes correctly
- [ ] Footer links navigate correctly
- [ ] WhatsApp CTA links open correct number
- [ ] Calculator produces a correct result for a known test item weight
- [ ] No major JS errors in browser console on any public page
- [ ] Page titles and meta descriptions are present on all public pages

### Group B — Auth / Account

- [ ] `login.html` loads without errors
- [ ] Valid credentials produce a successful login and redirect to `dashboard.html`
- [ ] Invalid credentials show a controlled Spanish-language error message (not a raw error or blank page)
- [ ] Logout clears the session and redirects to `index.html`
- [ ] Accessing a portal page while logged out redirects to `login.html` with an appropriate message
- [ ] A browser back-button press after logout does not reveal portal content (bfcache gate fires)
- [ ] Password recovery modal opens via "¿Olvidaste tu contraseña?"
- [ ] Password recovery submits and shows confirmation or "account not found" message
- [ ] A second recovery attempt within 60 seconds is blocked client-side with the Spanish-language cooldown message (no network request made)
- [ ] `afiliate.html` personal signup form validates required fields
- [ ] `afiliate.html` business signup form validates required fields
- [ ] If registration test is approved: registration completes and auto-login works. If not approved: document as accepted limitation — registration depends on `CRBOX_SVC_EMAIL` / `CRBOX_SVC_PASSWORD` being set in the production deployment.

### Group C — Portal

- [ ] `dashboard.html` loads after login and shows account data
- [ ] `mis-paquetes.html` loads and shows packages (via legacy fallback — RDS flag off)
- [ ] `mis-facturas.html` loads and shows invoices (via legacy fallback — RDS flag off)
- [ ] `mi-cuenta.html` loads and shows profile data
- [ ] `mis-solicitudes.html` loads
- [ ] `solicitud.html` loads
- [ ] `cotizar.html` loads
- [ ] All portal pages are `noindex` (check `<meta name="robots" content="noindex">` in source)
- [ ] Mobile portal drawer opens, shows correct nav items for logged-in user
- [ ] Admin badge / "Panel Admin" link appears for admin accounts and not for non-admin accounts
- [ ] Newsletter persistence limitation is documented as a known non-blocking UX gap (`mi-cuenta.html`)

### Group D — SEO / Indexing

- [ ] `robots.txt` accessible at `/robots.txt` and contains all 9 disallow rules + `Sitemap:` directive
- [ ] `sitemap.xml` accessible at `/sitemap.xml` and contains exactly 9 public URLs
- [ ] All 9 public pages have `<link rel="canonical" ...>` pointing to `https://crbox.cr/...`
- [ ] `cotizar.html` has `<meta name="robots" content="noindex">`
- [ ] All portal pages (`dashboard.html`, `mis-paquetes.html`, `mis-facturas.html`, `mi-cuenta.html`, `mis-solicitudes.html`, `solicitud.html`, `login.html`) are `noindex`
- [ ] Unknown path returns HTTP 404 status code (not 200 with a custom page)
- [ ] Google Search Console access or plan confirmed for post-cutover verification

### Group E — Analytics

- [ ] GTM container `GTM-5WD8N53F` loads on all public pages (check Network tab for `gtm.js`)
- [ ] GA4 receives a page view event (check GA4 Realtime or DebugView)
- [ ] At least one CTA click event fires correctly (check GTM Preview mode)
- [ ] Calculator result event fires after a calculation
- [ ] Login success event fires after a successful login
- [ ] Contact / WhatsApp click event fires
- [ ] No PII (email, name, ID number) appears in any event parameter in GA4 or GTM

### Group F — Protected Subdomains

- [ ] `https://clients.crbox.cr` is reachable and returns expected API responses
- [ ] `https://admin.crbox.cr` is reachable and the admin login page loads
- [ ] No planned DNS change has been applied to either subdomain
- [ ] Confirm both subdomains will not be affected by the upcoming `crbox.cr` DNS change

---

## 6. DNS Cutover Execution Plan

### 6.1 Before Cutover (Preparation — complete at least 24 h before cutover window)

1. **Export current DNS zone.** Obtain a full record export for the `crbox.cr` zone from the current registrar/DNS provider. At minimum document: A / CNAME records for `crbox.cr`, `www.crbox.cr`, `clients.crbox.cr`, `admin.crbox.cr`; MX records; TXT records (SPF, DKIM, domain verification tokens).
2. **Store the DNS backup.** Save the export to a shared location accessible to the rollback owner.
3. **Lower TTL.** Change the TTL for `crbox.cr` and `www.crbox.cr` records to ~300 seconds. Wait the full current TTL before proceeding (if current TTL is 3600 s, wait at least 1 h before changing records).
4. **Document the rollback target.** Write down the exact IP address or hostname of the old hosting target. Store alongside the DNS backup.
5. **Document the new Replit target.** Confirm the exact A record IP or CNAME target that Replit requires for the custom domain. Confirm the custom domain has been added in the Replit deployment settings.
6. **Confirm SSL auto-provisioning.** Verify that Replit will auto-provision an SSL certificate for `crbox.cr` and `www.crbox.cr` when the DNS record is pointed at Replit. If manual provisioning is needed, confirm the process.
7. **Assign rollback owner.** Document the name and contact method of the person responsible for executing rollback if a trigger fires.
8. **Confirm communication channel.** Designate a channel for the cutover team to communicate during the window. All participants confirmed available.
9. **Verify protected subdomains.** Confirm `clients.crbox.cr` and `admin.crbox.cr` are both reachable and working correctly.
10. **Run the Pre-Cutover Smoke Test (Section 5).** All items in Groups A–F must pass or have documented accepted limitations. Do not proceed to cutover with any unresolved ❌ Fail items in Groups A–E.
11. **Confirm RDS flags are off.** Verify `USE_RDS_PACKAGES_FRONTEND`, `USE_RDS_INVOICES_FRONTEND`, `USE_RDS_PROFILE_FRONTEND`, and `USE_RDS_PORTAL_API` are all unset or `false` in the Replit production deployment secrets.

### 6.2 During Cutover (Execution window — aim for low-traffic period, e.g. early morning CRI time)

1. **Change only `crbox.cr` A/CNAME record** to point to the Replit production deployment target. Do not touch any other records.
2. **Change only `www.crbox.cr` record** to redirect to or resolve identically to `crbox.cr`. Do not touch any other records.
3. **Do not modify `clients.crbox.cr`.** Any change here breaks all auth and portal data immediately.
4. **Do not modify `admin.crbox.cr`.** Any change here breaks the internal admin tool immediately.
5. **Do not modify MX, TXT, SRV, or any other records.** Scope is strictly limited to `crbox.cr` and `www.crbox.cr`.
6. **Do not move nameservers** unless the full zone was previously copied and verified (see Section 3 warning).
7. **Monitor DNS propagation.** Use a tool such as `dig` or `nslookup` from multiple locations to confirm the new record is propagating. Expect full global propagation within ~10 minutes with a 300-second TTL.
8. **Verify SSL.** Once the domain resolves to Replit, confirm `https://crbox.cr/` loads with a valid SSL certificate (green padlock / no browser warning).
9. **Verify apex and www.** Confirm both `https://crbox.cr/` and `https://www.crbox.cr/` load or redirect correctly.
10. **Run the Post-Cutover Smoke Test (Section 7).** Begin immediately after propagation is confirmed.

### 6.3 After Cutover (Monitoring — minimum 1–2 weeks)

1. Run the Post-Cutover Smoke Test (Section 7) immediately.
2. Monitor Replit server logs for 5xx error spikes.
3. Monitor GA4 Realtime for traffic arriving at the new domain.
4. Monitor GTM for expected events (page view, CTA click, login).
5. Monitor login / signup / password recovery flows for errors.
6. Monitor portal pages (packages, invoices, profile) for load failures.
7. Keep old hosting active and do not decommission it during the confidence period.
8. **Do not enable RDS frontend flags** (`USE_RDS_PACKAGES_FRONTEND`, `USE_RDS_INVOICES_FRONTEND`, `USE_RDS_PROFILE_FRONTEND`) during the DNS cutover window or confidence period unless explicitly approved as a separate gated step.
9. After a minimum confidence period with no rollback triggers, plan the legacy decommission as a separate future project.

---

## 7. Post-Cutover Smoke Test

Run immediately after DNS propagation is confirmed for `crbox.cr`.

- [ ] `https://crbox.cr/` loads the new CRBOX homepage
- [ ] `https://www.crbox.cr/` resolves correctly (either same page or redirects to apex)
- [ ] SSL certificate valid for `crbox.cr` — no browser security warnings
- [ ] SSL certificate valid for `www.crbox.cr`
- [ ] `servicios.html`, `como-funciona.html`, `tarifas.html`, `calculadora.html` all load
- [ ] `contacto.html` loads and contact form submits
- [ ] `afiliate.html` loads (signup visible; live registration test only if approved)
- [ ] Login with a valid account succeeds and lands on `dashboard.html`
- [ ] Logout clears session and redirects to `index.html`
- [ ] Password recovery modal opens; cooldown blocks a second attempt within 60 s
- [ ] `dashboard.html` loads after login
- [ ] `mis-paquetes.html` loads (legacy fallback — packages visible)
- [ ] `mis-facturas.html` loads (legacy fallback — invoices visible)
- [ ] `mi-cuenta.html` loads (profile data visible)
- [ ] Calculator on `calculadora.html` produces a correct result
- [ ] WhatsApp CTA links open correctly
- [ ] GTM `GTM-5WD8N53F` fires (check Network for `gtm.js`)
- [ ] GA4 Realtime shows at least one page view from the `crbox.cr` domain
- [ ] `https://crbox.cr/robots.txt` is accessible and contains disallow rules
- [ ] `https://crbox.cr/sitemap.xml` is accessible and contains 9 public URLs
- [ ] Portal pages remain `noindex` (spot-check `dashboard.html` source)
- [ ] `https://clients.crbox.cr` is still reachable and returning valid API responses
- [ ] `https://admin.crbox.cr` is still reachable and the admin login page loads

---

## 8. Rollback Plan

### 8.1 Rollback Triggers

Initiate rollback immediately if any of the following are observed after DNS cutover:

| Trigger | Severity |
|---|---|
| Login broken — users cannot authenticate | P0 — Rollback immediately |
| Signup broken with no workaround | P0 — Rollback immediately |
| Password recovery broken with no workaround | P0 — Rollback immediately |
| `clients.crbox.cr` unreachable due to DNS misconfiguration | P0 — Rollback immediately |
| `admin.crbox.cr` unreachable due to DNS misconfiguration | P0 — Rollback immediately |
| SSL invalid — browser shows security warning for `crbox.cr` | P0 — Rollback immediately |
| Public site unavailable (5xx or no response) | P1 — Rollback immediately |
| Portal pages indexable (noindex missing or robots.txt misconfigured) | P1 — Rollback immediately |
| High 5xx error rate (>10% of requests) sustained for >5 minutes | P1 — Rollback immediately |
| Security-sensitive data exposed (tokens, PII in responses or logs) | P1 — Rollback immediately |
| Portal unavailable for logged-in users | P1 — Rollback within 15 minutes if not resolved |
| Severe mobile navigation failure on public pages | P2 — Evaluate within 30 minutes |
| Contact or WhatsApp links broken globally | P2 — Evaluate within 30 minutes |

### 8.2 Rollback Steps

1. Announce rollback decision in the designated team channel immediately.
2. Revert the `crbox.cr` DNS record to the previously documented old-hosting target.
3. Revert the `www.crbox.cr` DNS record to the previously documented old-hosting target.
4. **Do not touch `clients.crbox.cr`.** Do not touch `admin.crbox.cr`. Do not touch MX records.
5. Confirm the old-hosting DNS records are saved correctly in the registrar panel.
6. Wait for DNS propagation (with 300-second TTL, expect ~5 minutes globally).
7. Confirm `https://crbox.cr/` loads the old site.
8. Confirm SSL is valid on the old site.
9. Confirm login works on the old site.
10. Confirm public pages load on the old site.
11. Monitor for at least 1 hour after rollback completes.
12. Document the incident: what triggered rollback, timeline, root cause, and corrective steps before retry.

### 8.3 TTL Impact on Rollback Speed

| TTL state at rollback | Expected rollback propagation time |
|---|---|
| TTL lowered to ~300 s before cutover | ~5–10 minutes globally |
| TTL not lowered (e.g. 3600 s) | Up to 1 hour; some resolvers may cache longer |
| TTL not lowered (e.g. 86400 s) | Up to 24 hours; do not proceed without lowering TTL first |

**This is why lowering TTL before cutover is a hard blocker.** A rollback without a low TTL may leave users on a broken site for hours.

---

## 9. Production RDS Position During Cutover

### 9.1 Required State for DNS Cutover

All four RDS feature flags **must be off** (unset or any value other than `"true"`) in the Replit production deployment during the entire DNS cutover window and confidence period:

| Flag | Controls | Required state for cutover |
|---|---|---|
| `USE_RDS_PACKAGES_FRONTEND` | `/api/portal/my-packages` (user-facing packages) | **false / unset** |
| `USE_RDS_INVOICES_FRONTEND` | `/api/portal/invoices-rds` (user-facing invoices) | **false / unset** |
| `USE_RDS_PROFILE_FRONTEND` | `/api/portal/profile-rds` (user-facing profile) | **false / unset** |
| `USE_RDS_PORTAL_API` | Admin shadow/compare endpoints | **false / unset** |

Flags are read at request time via `os.environ.get(FLAG, '').strip().lower() == 'true'` — changes take effect immediately without a server restart. Source: `docs/rds-observability-fallback-plan.md` Section 1.1.

### 9.2 Legacy Fallback Remains Active

With all flags off, all portal data flows use the legacy CRBOX API:
- Packages → `clients.crbox.cr/getuserpackages/...` via `getPackages()` in `js/portal-api.js`
- Invoices → `clients.crbox.cr/getfacturas/...` via `getBills()` in `js/portal-api.js`
- Profile → `clients.crbox.cr/getuserinfo/{email}` via `getUserInfo()` in `js/portal-api.js`

No user-visible degradation occurs when RDS flags are off and legacy is active.

### 9.3 EXPECTED_RDS_DATABASE Guard

`EXPECTED_RDS_DATABASE` must remain set correctly in any environment where RDS flags are eventually enabled. This guard aborts all RDS queries and returns a safe 503 if the active database does not match the expected value. Source: `docs/rds-observability-fallback-plan.md` Section 1.2.

### 9.4 Post-Cutover RDS Activation Sequence

After the DNS cutover stabilizes and the confidence period ends, RDS reads may be enabled incrementally as a separate gated step — **not during the cutover window**:

1. Enable `USE_RDS_PACKAGES_FRONTEND` — validate via shadow compare and observability plan
2. Enable `USE_RDS_INVOICES_FRONTEND` — validate via shadow compare and observability plan
3. Enable `USE_RDS_PROFILE_FRONTEND` — validate via shadow compare and observability plan

Each step requires the acceptance conditions defined in `docs/rds-observability-fallback-plan.md` Section 11 (Level 2 verdict: B — five logging gaps must be resolved before frontend flag enablement).

**No RDS writes are part of this cutover or the post-cutover RDS activation sequence.**

---

## 10. Auth / Signup / Password Recovery Position During Cutover

**Auth audit final recommendation: A — Safe for domain cutover with documented legacy limitations.** Source: `docs/auth-registration-password-recovery-audit.md`, Task #545, 2026-05-14.

| Flow | Endpoint | Direction | State for cutover |
|---|---|---|---|
| Login | `POST clients.crbox.cr/authtoken` | Direct browser → CRBOX API | Legacy-backed — **no change** |
| Logout | `clearToken()` + redirect | Client-side | Fully working — **no change** |
| Signup (personal) | `POST clients.crbox.cr/postregisteruser` via `/crbox-svc-token` proxy | Browser → `server.py` → CRBOX API | Legacy-backed — **no change** |
| Signup (business) | Same as personal | Same | Legacy-backed — **no change** |
| Password recovery | `GET clients.crbox.cr/getuserpasswordrecovery/{email}` | Direct browser → CRBOX API | Legacy-backed — 60-second cooldown implemented — **no change** |
| Password change | `POST clients.crbox.cr/postedituser` via `buildUpdateProfilePayload` | Browser → CRBOX API | Legacy-backed — **no change** |
| Admin portal access | `GET /admin/portal-login` → validates bearer token against CRBOX API | Browser → `server.py` → CRBOX API | Server-side gate — **no change** |
| Protected page redirect | `enforceAuthGate()` on `DOMContentLoaded` | Client-side | Fully working, bfcache-safe — **no change** |

**Documented legacy limitations accepted for cutover:**

- Password recovery sends the email address in the URL path (CRBOX API design constraint). Visible in access logs and browser history. Accepted as-is; proxy workaround is Tier 2.
- Password change requires no current-password re-authentication. Accepted as-is; blocked by CRBOX API capability.
- Admin email lists are in client-side JS source (information disclosure, Low-Medium). Server-side gate is correct and independent. Mobile and desktop lists are now aligned.

**Policy: Do not migrate auth to a new database for this cutover.** Future auth modernization (HTTP-only cookie sessions, direct database, server-side session management) is a separate project scoped only after the confidence period ends.

---

## 11. Final Go / No-Go Decision Table

| Area | Status | Blocks DNS cutover? | Blocks broad portal rollout? | Decision |
|---|---|---|---|---|
| Public website (all 9 pages) | ✅ Ready | — | — | **Go** |
| SEO / indexing / robots.txt / sitemap | ✅ Confirmed | — | — | **Go** |
| Analytics (GTM `GTM-5WD8N53F`) | ✅ Confirmed in all 18 pages | — | — | **Go** |
| Auth / login | ✅ Confirmed working | No | No | **Go** |
| Signup / registration | ⚠️ Env vars not confirmed in production | No (public site unaffected) | Yes | **Go with accepted limitation** — signup may fail in production if env vars are missing; document and verify before broad portal rollout |
| Password recovery | ✅ Audit complete (Task #545, rec. A) | No | No | **Go** — email in URL path is accepted risk |
| Portal UI (dashboard, packages, invoices, account, solicitudes) | ✅ Built; legacy fallbacks active | No | Partially | **Go** — legacy fallbacks handle all data flows during cutover |
| RDS data path | ⬛ Flags off; not required for cutover | No | No (fallback active) | **Go** — flags remain off; activation is a separate post-cutover gated step |
| Legacy APIs (`clients.crbox.cr`) | ✅ Active; not changed | No | No | **Go** |
| Protected subdomains (`clients.crbox.cr`, `admin.crbox.cr`) | ⚠️ Not yet re-verified pre-cutover | Yes (must verify before cutover) | Yes | **No-Go until verified** immediately before the cutover window |
| DNS owner | ⚠️ Not identified | Yes | Yes | **No-Go until resolved** |
| SSL certificate (`crbox.cr`, `www.crbox.cr`) | ⚠️ Not confirmed | Yes | Yes | **No-Go until confirmed** |
| TTL lowered to ~300 s | ⚠️ Not done | Yes (rollback risk) | — | **No-Go until done** — risk may be accepted with explicit documentation |
| Old hosting rollback target | ⚠️ Not confirmed | Yes (rollback safety) | — | **No-Go until confirmed** |
| Production service env vars (`CRBOX_SVC_EMAIL`, `CRBOX_SVC_PASSWORD`) | ⚠️ Not confirmed in production | No (public site) | Yes (registration) | **Go with accepted limitation** for DNS cutover — **No-Go** for broad portal registration promotion |
| Invoice upload end-to-end test | ⚠️ Not confirmed in production | **No** — legacy path available | Yes (if invoice upload is promoted as a critical flow) | **Go with accepted limitation** for DNS cutover — **No-Go** for broad portal promotion of invoice upload as a key flow |
| Pre-cutover smoke test | ⚠️ Not yet run | Yes | Yes | **No-Go until passed** |
| Rollback owner assigned | ⚠️ Not assigned | Yes (rollback safety) | — | **No-Go until assigned** |

**Hard No-Go items for DNS cutover:** DNS owner (unknown), SSL confirmation, protected subdomains pre-verification, production deployment confirmed live, pre-cutover smoke test, rollback owner assignment, old hosting rollback target confirmed.  
**TTL:** No-Go unless risk is explicitly documented and accepted.  
**Broad portal rollout only (not DNS cutover):** Env vars, invoice upload E2E.

---

## 12. Final Recommendation

### Rating: **B — Ready for controlled DNS cutover after specific operational fixes**

The new CRBOX public website and portal UI are substantially complete, correctly configured for SEO, and functionally sound:

- All 9 public pages are present with correct GTM tags, canonical tags, and content.
- Auth/signup/recovery are confirmed safe for cutover (Task #545, recommendation A). Auth is not a blocker.
- The server-side admin gate is correctly implemented.
- Legacy API fallbacks are active for all portal data flows.
- RDS frontend flags are off and do not need to be on for this cutover.

**The rating is B, not A, because the following operational items have not yet been resolved:**

| # | Item | Severity |
|---|---|---|
| 1 | DNS owner not identified | Critical — nothing can proceed without this |
| 2 | SSL certificate not confirmed for `crbox.cr` / `www.crbox.cr` | High |
| 3 | DNS TTL not lowered | High (rollback risk) |
| 4 | Old hosting rollback target not confirmed | High (rollback safety) |
| 5 | Replit production deployment not verified live | High |
| 6 | Pre-cutover smoke test not yet run | High |
| 7 | Rollback owner not assigned | High (rollback safety) |

None of these are code issues. All are operational actions.

**Once items 1–7 are resolved, the recommendation upgrades to A — Ready for controlled DNS cutover.**

### Remaining open items (broad portal rollout only, not DNS cutover blockers)

| Item | Notes |
|---|---|
| `CRBOX_SVC_EMAIL` / `CRBOX_SVC_PASSWORD` confirmed in production | Registration depends on these |
| Invoice upload end-to-end test in production | If invoice upload is promoted as a critical flow |
| RDS frontend flag activation (packages, invoices, profile) | Separate gated steps; follow `docs/rds-observability-fallback-plan.md` |

### Protected subdomains

`clients.crbox.cr` and `admin.crbox.cr` **must not be changed** under any circumstances during this cutover. The DNS scope is `crbox.cr` and `www.crbox.cr` only.

### Confirmation: no production changes made

This document was produced by reading existing source files and documentation. No DNS records were changed. No hosting was changed. No nameservers were changed. No RDS feature flags were changed. No AWS or RDS configuration was changed. No code was modified. No production secrets were changed. No legacy systems (`clients.crbox.cr`, `admin.crbox.cr`) were touched. No live accounts were created or modified.

---

*Document produced: 2026-05-14. Sources: `docs/domain-cutover-readiness-plan.md`, `docs/auth-registration-password-recovery-audit.md`, `docs/rds-observability-fallback-plan.md`, `robots.txt`, `sitemap.xml`, `gtm.config.json`, `replit.md`, `js/auth.js`, `js/portal-api.js`, `js/mobile-drawer.js`, `js/nav-auth.js`, `scripts/inject-gtm.js`, `server.py`.*
