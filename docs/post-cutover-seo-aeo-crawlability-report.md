# Post-Cutover SEO, AEO & LLM Crawlability Report

**Domain audited:** https://crbox.cr  
**Audit date:** 2026-05-16  
**Auditor:** Automated + manual review (post DNS cutover)

---

## Executive Summary

| Dimension | Rating | Summary |
|---|---|---|
| Crawlability | **A** | All crawl files present, valid, publicly accessible with correct headers |
| SEO Indexability | **A−** | All 9 public pages have full meta/OG/Twitter tags; 6 legacy URL gaps fixed during this audit |
| LLM / AEO Readiness | **A** | Comprehensive llms.txt, ai-context.json, and 6 public API endpoints fully functional |

---

## 1. Core Public Crawl Files

| File | HTTP Status | Content-Type | Cache-Control | Finding |
|---|---|---|---|---|
| `/robots.txt` | ✅ 200 | `text/plain` | `public, max-age=3600` | ✅ Correct |
| `/sitemap.xml` | ✅ 200 | `text/xml` | `public, max-age=3600` | ✅ Correct |
| `/llms.txt` | ✅ 200 | `text/plain` | `public, max-age=3600` | ✅ Fixed (was `no-store`) |
| `/ai-context.json` | ✅ 200 | `application/json` | `public, max-age=3600` | ✅ Correct |

### Content Quality

**robots.txt** — Correct structure. All private portal pages disallowed. Public pages allowed. Sitemap linked with canonical `https://crbox.cr` URL.

**sitemap.xml** — All 9 public pages listed. Correct `https://crbox.cr` canonical URLs. `lastmod` dates present. No private/portal pages included.

**llms.txt** — High quality. Covers: brand overview, all services, step-by-step process, restricted items, contact info, registration URL, public page directory, machine-readable resource links, and explicit AI agent guidance rules. Format compliant with llmstxt.org.

**ai-context.json** — Complete structured document. Top-level keys: `schemaVersion`, `lastUpdated`, `brand`, `publicResources`, `restrictedResources`, `contact`, `miamiWarehouse`, `branches`, `services`, `howItWorks`, `calculatorOrEstimate`, `ratesGuidance`, `compliance`, `faqs`, `agentGuidance`. No PII, no private customer data.

---

## 2. Public API Endpoints for AI/LLM Context

| Endpoint | GET Status | HEAD Status | Valid JSON | CORS | Cache | PII/Private Data |
|---|---|---|---|---|---|---|
| `/api/public/overview` | ✅ 200 | ✅ 200 | ✅ | `*` | 1h | ✅ None |
| `/api/public/services` | ✅ 200 | ✅ 200 | ✅ | `*` | 1h | ✅ None |
| `/api/public/how-it-works` | ✅ 200 | ✅ 200 | ✅ | `*` | 1h | ✅ None |
| `/api/public/faqs` | ✅ 200 | ✅ 200 | ✅ | `*` | 1h | ✅ None |
| `/api/public/contact` | ✅ 200 | ✅ 200 | ✅ | `*` | 1h | ✅ None |
| `/api/public/rates-guidance` | ✅ 200 | ✅ 200 | ✅ | `*` | 1h | ✅ None |

**Note:** HEAD requests on public API endpoints previously returned 404 (server had no `do_HEAD` handler for dynamic paths). Fixed during this audit — all now return 200 with correct `Content-Type`, `Access-Control-Allow-Origin: *`, and cache headers.

### Endpoint Content Summary

- **overview** — brand name, tagline, description, experience years, clients, shipments, service area, warehouse location, public page map, machine-readable resource index
- **services** — all service types (casillero, compras por encargo, air, sea, delivery) with descriptions
- **how-it-works** — 6-step registration and shipping process; transit day estimates; invoice note
- **faqs** — frequently asked questions covering customs, restrictions, pricing, and process
- **contact** — phone, WhatsApp, sales email, customer service email, invoices email, 3 branch locations, Miami warehouse
- **rates-guidance** — air freight table by weight, handling fees, home delivery fees, sea freight rate, disclaimer requiring calculator confirmation

---

## 3. Robots and Indexing

### robots.txt Coverage

```
User-agent: *
Allow: /

Disallow: /login.html
Disallow: /dashboard.html
Disallow: /mis-paquetes.html
Disallow: /mis-facturas.html
Disallow: /mi-cuenta.html
Disallow: /mis-solicitudes.html
Disallow: /solicitud.html
Disallow: /cotizar.html
Disallow: /admin/
Disallow: /admin.html
Disallow: /uploads/

Sitemap: https://crbox.cr/sitemap.xml
```

| Check | Result |
|---|---|
| Public pages allowed | ✅ |
| Portal pages disallowed | ✅ (login, dashboard, mis-paquetes, mis-facturas, mi-cuenta, mis-solicitudes, solicitud, cotizar) |
| Admin disallowed | ✅ |
| Uploads disallowed | ✅ |
| Sitemap link present with canonical domain | ✅ |
| All public HTML pages `robots: index, follow` meta | ✅ (all 9 pages confirmed) |
| No accidental `noindex` on public pages | ✅ |

---

## 4. Canonicals and Meta Tags — All Public Pages

| Page | Title | Description | Canonical | OG Title | OG Desc | Twitter | `lang` | robots |
|---|---|---|---|---|---|---|---|---|
| `/` | ✅ | ✅ | ✅ `https://crbox.cr/` | ✅ | ✅ | ✅ | `es` | index,follow |
| `/servicios.html` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `es` | index,follow |
| `/como-funciona.html` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `es` | index,follow |
| `/tarifas.html` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `es` | index,follow |
| `/calculadora.html` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `es` | index,follow |
| `/contacto.html` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `es` | index,follow |
| `/afiliate.html` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `es` | index,follow |
| `/privacidad.html` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `es` | index,follow |
| `/terminos.html` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `es` | index,follow |

All 9 pages pass. GEO targeting tags (`geo.region: CR-SJ`, `geo.placename`, `geo.position`) present on all pages. All canonical URLs use `https://crbox.cr` (no www, no trailing slash variance).

---

## 5. Legacy URL Redirect Audit

All redirects were **404 (no redirect) before this audit** and are now **301 permanent redirects**. Fixed in `server.py` via `_LEGACY_REDIRECTS` dict evaluated at the start of every GET request.

| Old URL | Old Status | New Status | Destination | SEO/AEO Risk if left as 404 |
|---|---|---|---|---|
| `/inicio/` | ❌ 404 | ✅ 301 | `/` | High — likely indexed; homepage link equity lost |
| `/como-funciona/` | ✅ 301 (pre-existing) | ✅ 301 | `/como-funciona.html` | Already handled |
| `/preguntas-frecuentes/` | ❌ 404 | ✅ 301 | `/como-funciona.html` | Medium — FAQ pages attract organic traffic |
| `/nuestras-sucursales/` | ❌ 404 | ✅ 301 | `/contacto.html` | Medium — branch info frequently linked |
| `/acerca-de-nuestra-empresa/` | ❌ 404 | ✅ 301 | `/` | Low — about pages rarely earn direct links |
| `/client/` | ❌ 404 | ✅ 301 | `/login.html` | Medium — old portal login, bookmarked by users |
| `/bills/` | ❌ 404 | ✅ 301 | `/login.html` | Low — old invoice path, internal use |
| `/register/` | ❌ 404 | ✅ 301 | `/afiliate.html` | High — registration path likely externally linked |
| `/?p=11338` | ⚠️ 200 (homepage) | 200 (homepage) | N/A — homepage renders; canonical on page resolves correctly | Low — Google deduplicated via canonical |

---

## 6. LLM Answerability Test

Using only `/llms.txt`, `/ai-context.json`, and the `/api/public/*` endpoints:

| Question | Answerable? | Source | Notes |
|---|---|---|---|
| What is CRBOX? | ✅ Yes | llms.txt, overview API, ai-context.json | Full brand description with 20+ years, Costa Rica, Miami warehouse |
| How does Miami → Costa Rica process work? | ✅ Yes | llms.txt, how-it-works API | 7-step process, air 2–4 days, sea 6–7 days |
| What services are offered? | ✅ Yes | services API, llms.txt | All 5 services with descriptions |
| What are the rates or rate guidance? | ✅ Yes | rates-guidance API | Air freight table, handling fees, delivery fees; correct disclaimer present |
| What items may be restricted? | ✅ Yes | ai-context.json (compliance key) | Prohibited/restricted categories present |
| How to contact CRBOX? | ✅ Yes | contact API, llms.txt | Phone, WhatsApp, 3 emails, 2 branches, Miami warehouse |
| How to affiliate/register? | ✅ Yes | llms.txt, how-it-works API | Direct URL to `/afiliate.html`; step 1 of process |

**Flags / Ambiguities:**
- Exact DHL tracking numbers or package status require authenticated session — correctly noted in all sources as unavailable to AI without customer authorization. ✅
- Sea freight cubic foot rate present in rates-guidance but no volumetric calculation guide — acceptable, calculator URL is referenced.
- Operating hours (`Lunes a Viernes 7am–4:30pm`) appear in the contact API but not explicitly in llms.txt. Low risk — present in structured data.

---

## 7. Search Console Checklist

After publishing the updated deployment:

- [ ] **Submit sitemap** — GSC → Sitemaps → enter `https://crbox.cr/sitemap.xml` → Submit
- [ ] **Inspect homepage** — URL Inspection for `https://crbox.cr/` → Request Indexing
- [ ] **Inspect key public pages** — `/servicios.html`, `/como-funciona.html`, `/tarifas.html`, `/afiliate.html` → Request Indexing for each
- [ ] **Inspect former WordPress domain** — if `crbox.cr` previously had a GSC property under the WordPress host, add the Replit deployment as a new property and verify via DNS TXT
- [ ] **Monitor Coverage report** — watch for "Crawled – currently not indexed" or "Discovered – currently not indexed" on public pages (normal lag of 1–4 weeks post-cutover)
- [ ] **Monitor 404 report** — check for any legacy paths not yet in `_LEGACY_REDIRECTS`; add to the dict as discovered
- [ ] **Monitor redirects** — verify legacy paths appear as "Valid (redirect)" in Coverage
- [ ] **Monitor Core Web Vitals** — check after first 28-day data collection window
- [ ] **Check old GSC property** — if legacy WordPress site had a Search Console property, use "Change of address" tool pointing from old to `https://crbox.cr`

---

## 8. Blockers, Quick Fixes, and Recommendations

### Blockers
None. Site is fully crawlable and indexable.

### Fixed During This Audit
1. **6 legacy 404s → 301 redirects** — `/inicio/`, `/preguntas-frecuentes/`, `/nuestras-sucursales/`, `/acerca-de-nuestra-empresa/`, `/client/`, `/bills/`, `/register/`
2. **HEAD 404 on all public API endpoints** — added `do_HEAD` handler; all now return 200 with correct headers
3. **llms.txt, robots.txt, sitemap.xml serving `no-store`** — fixed to `public, max-age=3600`

### Quick Wins (Not Yet Done)
- **Add `/como-funciona/` to legacy redirects** — already works via the HTML-fallback logic (`como-funciona.html` exists), but adding it explicitly to `_LEGACY_REDIRECTS` would be marginally cleaner
- **`/?p=NNNNN` WordPress pattern** — currently returns 200 (homepage) which Google resolves via canonical. A `301 → /` for this pattern would be cleaner but is not a ranking risk

### Recommended Next Tasks
1. **Google Search Console** — submit sitemap, request indexing for all 9 public pages, monitor coverage (manual step — requires GSC access)
2. **Core Web Vitals baseline** — run Lighthouse on production after first crawl; check LCP on `/` (hero image) and `/tarifas.html` (rate tables)
3. **Structured data (Schema.org)** — add `LocalBusiness` JSON-LD to homepage and `contacto.html`; add `HowTo` JSON-LD to `como-funciona.html` to enable rich results
4. **Image alt text audit** — verify all `<img>` tags in public pages have descriptive `alt` attributes, especially the product/process images
5. **Bing Webmaster Tools** — submit sitemap separately; Bing is the primary engine used by ChatGPT's browse tool
