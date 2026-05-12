# CRBOX Security Hardening Report
**Date:** 2026-05-12  
**Scope:** Full codebase — public site, client portal, forms, APIs, AI/chat modules

---

## Executive Summary

A full security audit of the CRBOX codebase was performed. Most high-risk areas were already well-defended: SSRF protection exists on the server, all portal pages have auth gates, CDN scripts use SRI hashes, and security headers are in place. Eight concrete fixes were applied directly. Items requiring infrastructure or hosting configuration are documented below.

---

## Findings and Fixes Applied

### HIGH

#### H1 — AI Extractor: No client-side URL protocol validation
**File:** `js/ai-extractor.js` → `runExtraction()`  
**Risk:** Without client-side validation, `javascript:`, `data:`, `file://`, and similar URLs could be submitted to the `/api/extract-url` endpoint. The server has SSRF protection (`_is_ssrf_safe()`), but sending these URLs adds noise and exposes the validation burden exclusively to the backend.  
**Attack scenario:** A user pastes `javascript:alert(1)` or `file:///etc/passwd` in the product URL field.  
**Fix applied:** Added protocol allowlist check (`^https?://` only) and 2000-char length limit in `runExtraction()` before the fetch call. Invalid URLs show a user-friendly message and abort the request immediately.  
**Testing:** Paste `javascript:alert(1)` in the product URL field → should show "URL no válida" banner and not send a network request.

---

### MEDIUM

#### M1 — Login form: no client-side cooldown after repeated failures
**File:** `login.html`  
**Risk:** Without any delay after failed attempts, an automated script can hammer the login form. Real protection must be server-side, but a client-side throttle adds a meaningful UX-layer deterrent.  
**Attack scenario:** Credential stuffing via the login form.  
**Fix applied:** Added exponential backoff throttle after each failed login: failures 1-2 have no delay; failure 3 → 5s; failure 4 → 15s; failure 5 → 30s; failure 6+ → 60s. Counter resets on page reload.  
**External action required:** Configure Cloudflare/WAF rate limiting on POST to `/authtoken` (5 attempts / 60s per IP), and consider Turnstile CAPTCHA after 3 failures.  
**Testing:** Fail login 3+ times → submit button should show cooldown message.

#### M2 — Contact form: missing maxlength and honeypot
**File:** `contacto.html`  
**Risk:** No input length limits allow very large payloads through the form. No bot detection at all.  
**Attack scenario:** A bot submits thousands of contact requests, flooding the inbox and database.  
**Fixes applied:**
- Added `maxlength` to all text inputs: nombre (100), correo (200), telefono (20), mensaje (2000).
- Added hidden honeypot field `#contact-hp-website`; submission is silently dropped if it is non-empty.  
**External action required:** Add server-side rate limiting on POST `/api/consultas` (e.g. 5/min per IP).

#### M3 — Registration form: missing maxlength and honeypot
**File:** `afiliate.html`  
**Risk:** Same as M2 — unbounded text inputs, no bot detection on a high-value flow.  
**Fixes applied:**
- Added `maxlength` to: first_name (100), last_name_1 (100), last_name_2 (100), contact_name_1 (200), contact_name_2 (200), address_details[] (500).
- Added honeypot fields `#personal-hp-website` and `#biz-hp-website` on both forms; checked in `handlePersonalRegistration()` and `handleBusinessRegistration()` before any processing.  
**External action required:** Add server-side rate limiting on registration endpoints; Cloudflare CAPTCHA on repeated registration attempts from the same IP.

#### M4 — robots.txt: private pages not Disallowed
**File:** `robots.txt`  
**Risk:** `/afiliate.html`, `/mis-solicitudes.html`, `/cotizar.html`, `/solicitud.html`, `/admin/`, `/uploads/` were not Disallowed. Well-behaved crawlers could index registration/quote flows and upload paths.  
**Fix applied:** Added all missing private paths to `Disallow`.

#### M5 — noindex missing on afiliate.html and cotizar.html
**Files:** `afiliate.html`, `cotizar.html`  
**Risk:** Registration and quote flows appearing in search results is undesirable and could attract scraper traffic.  
**Fix applied:** Added `<meta name="robots" content="noindex, nofollow">` to both pages.

---

### LOW

#### L1 — chat-calculator.js: target=_blank without rel=noopener
**File:** `js/chat-calculator.js` line 95  
**Risk:** Even for same-origin links, `target="_blank"` without `rel="noopener noreferrer"` allows the opened tab to access `window.opener`. Minor risk for same-origin but best practice to always include it.  
**Fix applied:** Added `link.rel = 'noopener noreferrer'`.

#### L2 — Invoice upload: misleading error message
**File:** `server.py` → `_handle_invoice_upload()`  
**Risk:** Error message said "máx. 12 MB" but the actual limit (`_INVOICE_MAX_BYTES = _MAX_BODY_UPLOAD`) is 2 MB. Misleading user-facing error.  
**Fix applied:** Updated message to "máx. 2 MB".

---

## Items Already Well-Defended (No Action Needed)

| Area | Status |
|------|--------|
| SSRF protection | `_is_ssrf_safe()` + `_SafeRedirectHandler` cover all redirect hops |
| Portal auth gates | `enforceAuthGate()` runs on DOMContentLoaded, pageshow, visibilitychange for all 6 PROTECTED_PAGES |
| Invoice upload auth | `_portal_auth()` required; UUID filenames; MIME type validation |
| XSS in DOM templates | All innerHTML uses wrap user data with `_esc()`/`_escHtml()` |
| chat-panel.js AI output | `_formatText()` escapes before setting innerHTML; newlines only |
| CDN script integrity | All `<script>` and `<link>` CDN tags include `integrity=` SRI hashes |
| Security headers | nosniff, HSTS, Referrer-Policy, Permissions-Policy, X-Frame-Options, CSP all served by `server.py` |
| Portal page noindex | All 5 portal pages have `<meta name="robots" content="noindex, nofollow">` |
| Token storage note | localStorage use documented in auth.js; acceptable given Safari iOS sessionStorage limitation |
| WhatsApp _blank links | All have `rel="noopener noreferrer"` |
| AI extractor SSRF | Server validates every URL and each redirect hop against private network blocklist |
| Error messages | Backend errors are caught and replaced with safe user-facing messages throughout |

---

## Requires External / Infrastructure Action

These items **cannot be fixed inside this repo** and require action in Cloudflare, your hosting platform, or the CRBOX backend:

### Infrastructure — CRITICAL priority

1. **Server-side rate limiting on login (`POST /authtoken`):**  
   Configure WAF/Cloudflare rule: max 5 attempts per IP per 60 seconds. Block or challenge after 10 failures.

2. **Server-side rate limiting on registration:**  
   Limit new account creation to 3 per IP per hour. Alert on spikes.

3. **Server-side rate limiting on contact form (`POST /api/consultas`):**  
   Limit to 5 submissions per IP per 5 minutes.

4. **Server-side rate limiting on quote/AI endpoints:**  
   `/api/extract-url`, `/api/classify` — limit to 20 requests per IP per minute; tie to portal token where possible.

5. **Cloudflare bot score challenge for suspicious registration/login traffic:**  
   Enable JS challenge or Turnstile for IPs with bot score above threshold.

### Infrastructure — HIGH priority

6. **Malware scanning for uploaded invoices:**  
   Uploaded files are stored locally but not scanned. Integrate ClamAV or a cloud scanning service before files are relayed to the CRBOX WordPress backend.

7. **Private storage for invoice uploads:**  
   `/uploads/invoices/` is currently served as static files (though paths are UUID-based). Consider moving to signed URLs or access-controlled storage.

8. **CAPTCHA on login after 3 failures:**  
   Cloudflare Turnstile or similar, triggered only on suspicious behavior, not by default.

### CSP Improvement Path (phased)

The current CSP uses `'unsafe-inline'` for both `script-src` and `style-src` because the site relies heavily on inline scripts and styles. This is a known limitation.

- **Phase 1 (now):** Current `'unsafe-inline'` CSP is in place and all other directives are strict.
- **Phase 2:** Move all inline `<script>` blocks to external `.js` files and generate nonces per request.
- **Phase 3:** Remove `'unsafe-inline'`, add `'nonce-{value}'` to `script-src`. This eliminates the remaining XSS amplification surface.

### Privacy / Analytics

9. **Verify analytics events do not include PII:**  
   Review all `CRBOX.track.*` calls in `js/analytics.js` to confirm tracking events contain no email, ID number, name, or token data before firing to GTM/GA.

10. **Cookie consent:**  
    If serving EU/EEA users, a cookie consent banner is required before firing GTM/GA.

---

## Testing Checklist

After deployment, verify the following:

- [ ] Paste `javascript:alert(1)` in product URL field in cotizar.html → should show "URL no válida" and make no network request
- [ ] Submit contact form with honeypot field filled (via DevTools) → no success/error message, no network request
- [ ] Submit registration form with honeypot field filled (via DevTools) → silently ignored
- [ ] Fail login 3+ times in quick succession → cooldown message appears
- [ ] Confirm `afiliate.html` and `cotizar.html` return `noindex` in `<head>`
- [ ] Confirm `robots.txt` disallows all private paths
- [ ] Upload a 3 MB file to invoice upload → error with "máx. 2 MB" message
- [ ] Open chat calculator widget → "Calculadora completa" link opens in new tab (no opener)
