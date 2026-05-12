# Performance — External Actions Required

Items that cannot be fixed inside the repository and require infrastructure or tooling changes outside the codebase.

---

## 1. Enable Brotli / Gzip compression on the server

**Impact:** High — text assets (HTML, CSS, JS) typically compress 60–80%, cutting transfer size significantly.

**Action:** Enable Brotli (preferred) or Gzip on the hosting server / reverse proxy (nginx, Caddy, or cloud load balancer). The Flask dev server does not apply compression. For production this should be handled at the infrastructure layer.

**Reference:** [nginx ngx_http_brotli_module](https://github.com/google/ngx_brotli)

---

## 2. Replace Tailwind CDN with a purged production build

**Impact:** High — the Tailwind CDN build (`tailwind.min.css`, ~3 MB uncompressed / ~300 KB gzipped) includes every utility class. A purged build for this site would be under 20 KB.

**Action:** Add a build step using `tailwindcss` CLI or PostCSS with PurgeCSS configured to scan all HTML and JS files. Replace the CDN `<link>` on every page with the generated file, versioned and served with long-cache headers.

**Note:** This requires introducing a build pipeline (Node.js + npm/pnpm), which is intentionally out of scope for the current no-build architecture.

---

## 3. Self-host Font Awesome icons

**Impact:** Medium — reduces a third-party DNS lookup and allows long-cache control over the icon font files.

**Action:** Download Font Awesome 6 Free, host the CSS and webfont files in `css/vendor/` and `fonts/`, update all `<link>` tags. This also removes dependency on `cdnjs.cloudflare.com` for icons.

---

## 4. Serve images from a CDN with edge caching

**Impact:** Medium-High — images (`fotoindex.webp`, `character.webp`, service images) are served from the same Flask origin. A CDN (Cloudflare, BunnyCDN, etc.) with edge PoPs dramatically reduces latency for Costa Rica users connecting to a Miami or US-East origin.

**Action:** Put the site behind Cloudflare (free tier) or configure a CDN in front of the Flask server. Enable Cloudflare's built-in image optimization (Polish) to auto-serve WebP/AVIF.

---

## 5. Convert remaining PNG images to AVIF

**Impact:** Medium — AVIF offers 30–50% smaller files vs. WebP for equivalent quality. Primarily affects `img/crbox-logo.png` and any remaining `.png` assets.

**Action:** Run `npx @squoosh/cli --avif '{}' img/*.png` externally (or use Squoosh, ImageMagick with AVIF support, or Cloudflare Polish). Add `<picture>` elements with `<source type="image/avif">` fallback to `<img>` for all hero/LCP images once AVIF files are available.

---

## 6. Set long-cache headers for static assets via the server / proxy layer

**Impact:** Medium — `server.py` already sets `immutable, max-age=31536000` for versioned JS/CSS assets served through the custom handler. Verify this is being respected by the production reverse proxy (if any) and is not being overridden. If a CDN is in front, confirm it respects the `Cache-Control` origin header and is not stripping it.

---

## 7. Configure HTTP/2 or HTTP/3 on the production server

**Impact:** Medium — multiplexing eliminates head-of-line blocking for the many small JS and CSS files loaded per page. The Flask dev server (Werkzeug) serves HTTP/1.1 only. Production should use nginx or a cloud load balancer with HTTP/2 enabled.

---

## Summary table

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Brotli/Gzip compression | Low (infra config) | High |
| 2 | Purge Tailwind CSS | Medium (add build step) | High |
| 3 | Self-host Font Awesome | Low | Medium |
| 4 | CDN + edge caching | Low (Cloudflare free) | Medium-High |
| 5 | AVIF image conversion | Low (external tooling) | Medium |
| 6 | Verify proxy cache headers | Low | Medium |
| 7 | HTTP/2 on production | Low (infra config) | Medium |
