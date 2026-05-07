# CRBOX SEO, GEO, AEO & LLM Discoverability Strategy
**Last updated:** 2026-05-07  
**Scope:** Public website at crbox.cr (seven public HTML pages)

---

## 1. What Already Existed (Preserved)

The foundational SEO layer from Task #1 was preserved and built upon:

| Asset | Status |
|---|---|
| Canonical URLs on all public pages | ✅ Preserved |
| Open Graph / Facebook tags | ✅ Preserved + extended to afiliate.html |
| Twitter Card tags | ✅ Preserved + extended to afiliate.html |
| Schema.org Organization + LocalBusiness + WebSite (index.html) | ✅ Preserved + telephone corrected |
| Schema.org FAQPage on como-funciona.html | ✅ Preserved + expanded |
| Schema.org HowTo on como-funciona.html | ✅ Preserved |
| Schema.org FAQPage on tarifas.html | ✅ Preserved + expanded |
| Schema.org WebApplication on calculadora.html | ✅ Preserved |
| Schema.org LocalBusiness on contacto.html | ✅ Preserved |
| Schema.org ItemList+Service on servicios.html | ✅ Preserved |
| GEO meta tags (geo.region, geo.placename, geo.position, ICBM) | ✅ Preserved on all pages |
| robots.txt with Disallow for portal pages | ✅ Preserved |
| sitemap.xml with all 7 public pages | ✅ Preserved |
| GTM-5WD8N53F on all pages | ✅ Preserved |
| Favicon set and web manifest | ✅ Preserved |
| Accessibility: skip-to-content links | ✅ Preserved |
| Visual breadcrumbs on interior pages | ✅ Preserved |

---

## 2. What Was Fixed

### 2.1 `afiliate.html` — Promoted to Public Conversion Page

**Problem:** The primary registration/signup page was marked `noindex, nofollow` and listed in `privatePages` in `seo-config.js`. This prevented Google and AI crawlers from discovering CRBOX's main conversion entry point.

**Fix:**
- Removed `<meta name="robots" content="noindex, nofollow">`
- Added `<link rel="canonical" href="https://crbox.cr/afiliate.html">`
- Added full Open Graph (og:type, og:url, og:title, og:description, og:image, og:locale, og:site_name)
- Added Twitter Card tags
- Added GEO targeting meta tags (geo.region, geo.placename, geo.position, ICBM)
- Added `<meta name="theme-color">`
- Added Schema.org JSON-LD: `WebPage` with `potentialAction: RegisterAction` + `BreadcrumbList`
- Sharpened `<meta name="description">` for search intent
- Moved from `privatePages` to `publicPages` in `seo-config.js`
- Upgraded `sitemap.xml` priority to 0.9 (from 0.8)

### 2.2 `seo-config.js` — GTM Placeholder Fixed

**Problem:** `gtmId` was set to the placeholder string `'YOUR_GTM_CONTAINER_ID'` rather than the real container ID.

**Fix:** Replaced with `'GTM-5WD8N53F'`.

### 2.3 `index.html` — Telephone Number Inconsistency

**Problem:** The Organization and LocalBusiness JSON-LD on `index.html` used telephone `+506-8979-4418`, while `seo-config.js` and `contacto.html` both use `+506-4000-1114`.

**Fix:** Updated all three occurrences in `index.html` (Organization, LocalBusiness, ContactPoint) to `+506-4000-1114` to match the site's publicly visible contact information.

### 2.4 `sitemap.xml` — Updated `<lastmod>` Dates

**Problem:** All `<lastmod>` entries showed `2026-04-24`, predating the current optimization work.

**Fix:** Updated all `<lastmod>` entries to `2026-05-07`.

---

## 3. What Was Added

### 3.1 `llms.txt` — LLM & Agent Discoverability File

Created `/llms.txt` following the llmstxt.org convention. The file provides:
- Clear description of what CRBOX is and what it does
- Complete service catalog with factual details (delivery times, pricing model, restrictions)
- Step-by-step "how it works" for agent extraction
- Key facts optimized for AI system extraction (volumetric weight formula, consolidation, billing model)
- Branch locations with opening hours
- Contact information
- All 7 public page URLs
- Explicit statement of what is NOT accessible (portal pages, admin, private data)

### 3.2 BreadcrumbList JSON-LD — All Interior Pages

Added `BreadcrumbList` structured data schema to all 6 interior public pages:

| Page | BreadcrumbList Added |
|---|---|
| servicios.html | ✅ Inicio → Servicios de Courier y Casillero Virtual |
| como-funciona.html | ✅ Inicio → Cómo Funciona el Casillero Virtual |
| tarifas.html | ✅ Inicio → Tarifas de Envío desde USA a Costa Rica |
| calculadora.html | ✅ Inicio → Calculadora de Envíos desde USA a Costa Rica |
| contacto.html | ✅ Inicio → Contacto — Sucursales y Atención al Cliente |
| afiliate.html | ✅ Inicio → Afíliate Gratis |

These breadcrumb names use descriptive, keyword-rich labels rather than generic page names.

### 3.3 Expanded FAQPage — `como-funciona.html`

Expanded from 4 questions to 9 questions. Added:
- **¿Qué es CRBOX?** — Entity definition for AI/search extraction
- **¿Cómo funciona un casillero virtual?** — Core concept explanation
- **¿Cuál es la diferencia entre carga aérea y carga marítima?** — Service comparison
- **¿Cómo me registro en CRBOX?** — Conversion funnel with link to afiliate.html
- **¿Cómo contacto al servicio al cliente de CRBOX?** — Contact extraction

### 3.4 Expanded FAQPage — `tarifas.html`

Expanded from 4 questions to 6 questions. Added:
- **¿Cuál es la diferencia de precio entre carga aérea y marítima?** — Pricing comparison with link to calculadora.html
- **¿Cómo me registro para empezar a usar el casillero virtual de CRBOX?** — Conversion CTA with link to afiliate.html

---

## 4. Public / Private Page Taxonomy (Final State)

### Public Pages (indexed, in sitemap)

| Page | Priority | Schema Types |
|---|---|---|
| index.html | 1.0 | Organization, LocalBusiness, WebSite |
| servicios.html | 0.9 | ItemList (Service ×4), BreadcrumbList, FAQPage (7Q) |
| afiliate.html | 0.9 | WebPage (RegisterAction), BreadcrumbList |
| como-funciona.html | 0.8 | FAQPage (9Q), HowTo (4 steps), BreadcrumbList |
| tarifas.html | 0.8 | FAQPage (6Q), BreadcrumbList |
| calculadora.html | 0.7 | WebApplication, BreadcrumbList |
| contacto.html | 0.7 | LocalBusiness, BreadcrumbList |

### Private / Protected Pages (noindex, disallowed in robots.txt)

| Page | robots.txt Disallow | Noindex |
|---|---|---|
| login.html | ✅ | Should confirm noindex in <head> |
| dashboard.html | ✅ | Portal — auth gated |
| mis-paquetes.html | ✅ | Portal — auth gated |
| mis-facturas.html | ✅ | Portal — auth gated |
| mi-cuenta.html | ✅ | Portal — auth gated |
| privacidad.html | Not disallowed but absent from sitemap | Correctly absent |
| terminos.html | Not disallowed but absent from sitemap | Correctly absent |

---

## 5. Structured Data Inventory (Per Page)

### `index.html`
```json
{
  "@graph": [
    { "@type": "Organization" },
    { "@type": "LocalBusiness" },
    { "@type": "WebSite" }
  ]
}
```

### `servicios.html`
```json
{ "@type": "ItemList" /* 4 Service items */ }
{ "@type": "BreadcrumbList" }
{ "@type": "FAQPage" /* 7 questions */ }
```

### `como-funciona.html`
```json
{ "@type": "FAQPage" /* 9 questions */ }
{ "@type": "HowTo" /* 4 steps */ }
{ "@type": "BreadcrumbList" }
```

### `tarifas.html`
```json
{ "@type": "FAQPage" /* 6 questions */ }
{ "@type": "BreadcrumbList" }
```

### `calculadora.html`
```json
{ "@type": "WebApplication" }
{ "@type": "BreadcrumbList" }
```

### `contacto.html`
```json
{ "@type": "LocalBusiness" /* with openingHoursSpecification, contactPoint */ }
{ "@type": "BreadcrumbList" }
```

### `afiliate.html`
```json
{
  "@graph": [
    { "@type": "WebPage", "potentialAction": { "@type": "RegisterAction" } },
    { "@type": "BreadcrumbList" }
  ]
}
```

---

## 6. LLM / Agent Discoverability Approach

### 6.1 `llms.txt`
The `/llms.txt` file at the site root follows the emerging llmstxt.org convention. It is:
- Plain text, machine-readable, and structured with Markdown-style headings
- Comprehensive but factual — only verified information from the site
- Explicitly lists what is NOT available (portal pages, admin, private data)
- Includes URLs for all public entry points

### 6.2 Schema.org for AI Extraction
The `FAQPage` schemas on `como-funciona.html` (9 questions) and `tarifas.html` (6 questions) are specifically optimized for Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO). These answer the most common user questions about CRBOX services:
- What is a casillero virtual?
- How does the service work?
- What are the delivery times?
- What is the pricing model?
- How do I sign up?
- How do I contact support?

### 6.3 RegisterAction Markup
The `RegisterAction` potentialAction on `afiliate.html` signals to AI agents that this page is the entry point for creating an account — enabling agents to direct users who ask "how do I sign up for CRBOX?" to the correct page.

---

## 7. Local SEO Signals

The following local SEO signals are consistently applied across all public pages:

- `geo.region: CR-SJ` (San José, Costa Rica)
- `geo.placename: San José, Costa Rica`
- `geo.position: 9.9281;-84.0907`
- `ICBM: 9.9281, -84.0907`
- Organization telephone: `+506-4000-1114` (consistent across JSON-LD and seo-config.js)
- Address: 50 metros al Oeste del ICE, Edificio Torres del Parque, planta baja, Local #6, Sabana Norte, San José, CR
- Opening hours: Mon–Fri 07:00–16:30, Sat 09:00–12:30
- `areaServed: "CR"` on all Service and ContactPoint schemas
- Both branch locations (Sabana Norte, Calle Blancos) mentioned in `llms.txt`

---

## 8. Heading Hierarchy Audit

All 7 public pages have exactly one `<h1>` with descriptive, keyword-relevant text:

| Page | H1 |
|---|---|
| index.html | Tu casillero virtual gratuito en Miami |
| servicios.html | Nuestros Servicios |
| como-funciona.html | (Content-contextual heading present) |
| tarifas.html | Nuestras Tarifas |
| calculadora.html | Calcula tu envío. Descubre cuánto ahorras. |
| contacto.html | Contáctanos |
| afiliate.html | (Simplifica tus compras internacionales / registration form heading) |

H2/H3 hierarchy is logical on all pages: H2 sections introduce major content areas, H3 elements cover sub-items within sections.

---

## 9. Image Alt Text Audit

**Current status:** Key images on all pages have descriptive alt text. No images are missing alt attributes.

Notable alt attributes present:
- Logos: `alt="CRBOX Logo"` on all pages
- Hero/mascot images: `alt="CRBOX Delivery"`, `alt="CRBOX mascot"`, `alt="CRBOX mascot con calculadora"`
- Service images: `alt="Casillero Virtual"`, `alt="Compras por Encargo"`, `alt="Carga Aérea"`, `alt="Carga Marítima"`
- Brand logos on index.html: Amazon, Temu, Walmart, BestBuy, Target, Apple — all have specific alt text

**Recommendation:** Add `loading="lazy"` to below-fold images (service images, brand logos, logistics/map images) to improve LCP metrics. Decorative SVG icons (Font Awesome) correctly have no alt attributes.

---

## 10. Internal Linking Assessment

**Current internal link flows (via navigation):**
- All pages link to each other via the sticky header navigation
- "Afíliate Gratis" CTA appears in both desktop and mobile nav headers on all public pages
- "Calcular Envío" CTA appears in both desktop and mobile nav headers

**Contextual links in page content:**
- `index.html`: Hero CTAs link to afiliate.html and como-funciona.html
- `como-funciona.html` FAQ schema now references afiliate.html and contacto.html in answer text
- `tarifas.html` FAQ schema now references calculadora.html and afiliate.html in answer text
- `servicios.html` includes navigation to tarifas.html and afiliate.html via header

**Recommendation:** Consider adding a contextual "Ver Tarifas →" text link within the servicios.html service description sections, and a "¿Cuánto cuesta mi envío? Usá la calculadora →" link in tarifas.html body content.

---

## 11. Robots.txt & Sitemap Consistency Check (Final)

### robots.txt
```
User-agent: *
Allow: /
Disallow: /login.html
Disallow: /dashboard.html
Disallow: /mis-paquetes.html
Disallow: /mis-facturas.html
Disallow: /mi-cuenta.html
Sitemap: https://crbox.cr/sitemap.xml
```

**Status:** ✅ Consistent with public/private taxonomy. `afiliate.html` is correctly NOT disallowed.

### sitemap.xml
All 7 public pages present. All `<lastmod>` updated to 2026-05-07.
`privacidad.html` and `terminos.html` correctly absent.
Portal pages correctly absent.

---

## 12. Recommended Next Steps

### High Priority
1. **Add `loading="lazy"` to below-fold images** — Particularly service images, brand logos, and map/logistics illustrations across all pages. This improves Core Web Vitals (LCP) without affecting above-fold content.
2. **Verify login.html and portal pages have `<meta name="robots" content="noindex, nofollow">`** — robots.txt disallows them but explicit noindex is belt-and-suspenders protection.
3. **Submit updated sitemap to Google Search Console** — After these changes, manually trigger a re-crawl of afiliate.html. This requires team action.
4. **Add `width` and `height` attributes to `<img>` tags** — Prevents layout shift (CLS) and aids browser paint performance.

### Medium Priority
5. **Add `og:image:width` and `og:image:height` to Open Graph tags** — Helps social media renderers pre-size images correctly.
6. **Create a dedicated testimonials or case studies page** — CRBOX has +20 years of experience; a page with real customer stories would support E-E-A-T signals.
7. **Add structured data `sameAs` links** — Once CRBOX establishes social media presence, add them to the Organization schema's `sameAs` array in `index.html` and `seo-config.js`.
8. **~~Add a FAQ section to `servicios.html`~~** — ✅ Done (Task #373): FAQPage JSON-LD (7 questions) + visible accordion section added.

### Low Priority / Ongoing
9. **Monthly content update to `llms.txt`** — Keep it current if services, hours, or pricing change.
10. **Monitor Google Search Console for FAQ rich results** — FAQPage schemas on como-funciona.html and tarifas.html should trigger rich result previews in 2–4 weeks after crawl.
11. **Test structured data with Google Rich Results Test** — Validate all 7 pages at search.google.com/test/rich-results after deployment.

---

## 13. QA Checklist

Before each deployment, verify:

- [ ] `robots.txt` accessible at `https://crbox.cr/robots.txt`
- [ ] `sitemap.xml` accessible at `https://crbox.cr/sitemap.xml`
- [ ] `llms.txt` accessible at `https://crbox.cr/llms.txt`
- [ ] `afiliate.html` returns HTTP 200 and is crawlable (no noindex meta)
- [ ] Google Rich Results Test passes for como-funciona.html, tarifas.html, and afiliate.html
- [ ] No console errors on any public page
- [ ] All 7 public pages pass W3C HTML validator (no structural errors)
- [ ] Open Graph preview renders correctly (use opengraph.xyz or similar)
- [ ] sitemap.xml `<lastmod>` reflects the actual last modification date
- [ ] `seo-config.js` `gtmId` matches the GTM container ID on all pages (`GTM-5WD8N53F`)
- [ ] Portal pages (dashboard, mis-paquetes, mis-facturas, mi-cuenta) are NOT in sitemap.xml
