# CRBOX Agent Architecture

**Document type:** Public technical reference  
**Status:** Stable — v1.0  
**Last updated:** 2026-05-13  
**Audience:** AI agent developers, LLM integration teams, MCP client builders

---

## A. Purpose

This document describes the intended architecture for AI agents, LLMs, and automated tools that interact with CRBOX services. It defines:

- Which public resources agents may access without authentication
- The contract for each public "tool" (input, output, data source, risk)
- Private tool stubs reserved for authenticated customer flows (not yet implemented)
- Security rules that must be enforced by any MCP server or agent framework
- A phased roadmap for expanding machine-readable access
- A "what must never be exposed" list

CRBOX's public layer is designed so that any AI assistant can accurately answer common questions about CRBOX services, pricing guidance, and processes — without hallucinating, without accessing private customer data, and without requiring authentication.

---

## B. Layered Architecture

```
Layer 0 — Human Website (HTML, always the canonical source of truth)
  https://crbox.cr/  •  /servicios.html  •  /como-funciona.html
  /tarifas.html  •  /calculadora.html  •  /contacto.html  •  /afiliate.html

Layer 1 — AI-Readable Static Resources (no auth, CORS open, cacheable)
  /llms.txt           → LLM discoverability summary (llmstxt.org format)
  /ai-context.json    → Full structured JSON context for agents
  /sitemap.xml        → Page discovery for crawlers

Layer 2 — Public Read-Only API (no auth, CORS *, max-age=3600)
  /api/public/overview          → Brand overview, public page map
  /api/public/services          → Service catalog
  /api/public/how-it-works      → Step-by-step shipping process
  /api/public/faqs              → Frequently asked questions
  /api/public/contact           → Contact info and branch locations
  /api/public/rates-guidance    → Air freight table, handling fees, delivery zones

Layer 3 — Future MCP / Authenticated Customer Tools (NOT YET IMPLEMENTED)
  get_my_packages               → Requires customer auth token
  get_my_invoices               → Requires customer auth token
  track_package_authenticated   → Requires customer auth token
  upload_invoice                → Requires customer auth token
  update_profile                → Requires customer auth token
  request_consolidation         → Requires customer auth token
  manage_delivery_preferences   → Requires customer auth token

Layer 4 — Internal / Admin Tools (NEVER exposed to external agents)
  Admin dashboard, solicitudes management, SMTP health, DB ops
  These have no public API surface and must never be exposed.
```

---

## C. Public Tool Contracts

All public tools are read-only, require no authentication, are CORS-open (`Access-Control-Allow-Origin: *`), and cached for 1 hour (`Cache-Control: public, max-age=3600`). All data is sourced from `knowledge/crbox-kb.json`.

---

### `get_crbox_overview`

| Property | Value |
|---|---|
| **Endpoint** | `GET https://crbox.cr/api/public/overview` |
| **Purpose** | Brand overview: name, tagline, description, experience, service area, public page map, machine-readable resource URLs |
| **Privacy level** | Public — no customer data |
| **Auth required** | No |
| **Risk level** | None |
| **Cache** | public, max-age=3600 |

**Example response (abbreviated):**
```json
{
  "schemaVersion": "1.0",
  "name": "CRBOX",
  "tagline": "Tu casillero virtual gratuito en Miami",
  "experienceYears": 20,
  "serviceArea": "USA → Costa Rica",
  "warehouseLocation": "Miami, Florida, EE.UU.",
  "publicPages": {
    "home": "https://crbox.cr/",
    "calculator": "https://crbox.cr/calculadora.html"
  }
}
```

---

### `get_services`

| Property | Value |
|---|---|
| **Endpoint** | `GET https://crbox.cr/api/public/services` |
| **Purpose** | Full service catalog: casillero, compras por encargo, carga aérea, carga marítima, logística internacional |
| **Privacy level** | Public |
| **Auth required** | No |
| **Risk level** | None |

**Example response (abbreviated):**
```json
{
  "schemaVersion": "1.0",
  "services": [
    {
      "id": "casillero",
      "name": "Casillero Virtual",
      "cost": "GRATIS",
      "transitDays": null,
      "url": "https://crbox.cr/servicios.html#casillero"
    },
    {
      "id": "carga_aerea",
      "name": "Carga Aérea",
      "transitDays": "2–4 días hábiles"
    }
  ]
}
```

---

### `get_how_it_works`

| Property | Value |
|---|---|
| **Endpoint** | `GET https://crbox.cr/api/public/how-it-works` |
| **Purpose** | Step-by-step process for using CRBOX: register → get Miami address → buy → notify → receive |
| **Privacy level** | Public |
| **Auth required** | No |
| **Risk level** | None |

---

### `get_public_faqs`

| Property | Value |
|---|---|
| **Endpoint** | `GET https://crbox.cr/api/public/faqs` |
| **Purpose** | Full FAQ list: pricing, weight, transit times, tracking, invoices, consolidation, restrictions |
| **Privacy level** | Public |
| **Auth required** | No |
| **Risk level** | None |

---

### `get_contact_options`

| Property | Value |
|---|---|
| **Endpoint** | `GET https://crbox.cr/api/public/contact` |
| **Purpose** | Contact info: phone, WhatsApp, email addresses, contact form URL, branch addresses and hours |
| **Privacy level** | Public |
| **Auth required** | No |
| **Risk level** | None |

---

### `get_branch_locations`

| Property | Value |
|---|---|
| **Endpoint** | `GET https://crbox.cr/api/public/contact` → `.branches[]` |
| **Purpose** | Physical branch addresses and opening hours |
| **Privacy level** | Public |
| **Auth required** | No |
| **Risk level** | None |

---

### `get_public_rates`

| Property | Value |
|---|---|
| **Endpoint** | `GET https://crbox.cr/api/public/rates-guidance` |
| **Purpose** | Air freight rate table, handling fees by declared value, home delivery fees by zone, sea freight summary |
| **Privacy level** | Public |
| **Auth required** | No |
| **Risk level** | Low — always include the disclaimer |
| **Mandatory disclaimer** | "Valores de referencia. El precio final puede variar. Confirmar en https://crbox.cr/calculadora.html" |

**Critical rule:** Rates returned by this endpoint are reference values. The agent **must** include the disclaimer and direct users to the official calculator for binding estimates.

---

### `calculate_shipping_estimate`

| Property | Value |
|---|---|
| **Endpoint** | N/A — client-side calculator at `https://crbox.cr/calculadora.html` |
| **Purpose** | Interactive weight/volume/value calculator for detailed shipping cost estimates |
| **Privacy level** | Public |
| **Auth required** | No |
| **Note** | The calculator runs in the browser. There is no programmatic API for exact estimates; agents should direct users to the URL. |

---

### `explain_registration_steps`

| Property | Value |
|---|---|
| **Endpoint** | `GET https://crbox.cr/api/public/how-it-works` step 1 + registration URL |
| **Purpose** | Explain how to sign up for a free CRBOX account |
| **Privacy level** | Public |
| **Auth required** | No |
| **Registration URL** | `https://crbox.cr/afiliate.html` |

---

### `get_required_purchase_information`

| Property | Value |
|---|---|
| **Endpoint** | `GET https://crbox.cr/api/public/how-it-works` → invoice note |
| **Purpose** | Explain invoice requirements for customs (Aduanas de Costa Rica) |
| **Privacy level** | Public |
| **Auth required** | No |

---

### `get_ai_context_document`

| Property | Value |
|---|---|
| **Endpoint** | `GET https://crbox.cr/ai-context.json` |
| **Purpose** | Complete structured JSON context document combining all public facts, agent guidance, rates, FAQs, compliance, and service descriptions |
| **Privacy level** | Public |
| **Auth required** | No |
| **Cache** | public, max-age=3600 |
| **Note** | Preferred entry point for agents that want to pre-load all public context in one request |

---

## D. Private Tool Stubs (Future — Not Yet Implemented)

The following tools are planned for a future authenticated phase. They are **not available yet**. No MCP server, agent, or external system should attempt to access private customer data through any current CRBOX endpoint.

| Tool | Purpose | Auth requirement |
|---|---|---|
| `get_my_packages` | List authenticated customer's packages | CRBOX customer session token |
| `get_my_invoices` | List authenticated customer's invoices | CRBOX customer session token |
| `get_my_account` | Retrieve account details (casillero number, Miami address) | CRBOX customer session token |
| `upload_invoice` | Submit a purchase invoice for a package | CRBOX customer session token |
| `update_profile` | Update customer profile details | CRBOX customer session token |
| `request_consolidation` | Request package consolidation | CRBOX customer session token |
| `track_package_authenticated` | Get real-time tracking for a specific package | CRBOX customer session token |
| `manage_delivery_preferences` | Set delivery vs. pickup preferences | CRBOX customer session token |

**Implementation note:** When these tools are implemented, they must use a short-lived, scoped token obtained through the CRBOX authentication flow (`https://crbox.cr/login.html`). No long-lived API keys or shared credentials are acceptable for customer-scoped operations.

---

## E. Authentication and Security Requirements

### For Public Tools (Layer 2)

- No authentication required
- No rate limiting enforced (but reasonable use expected)
- Must not return any customer-specific, package-specific, or invoice-specific data
- All data sourced from `knowledge/crbox-kb.json` (static, curated, admin-controlled)
- CORS: `Access-Control-Allow-Origin: *` (no credentials)

### For Future Private Tools (Layer 3)

- All private tool calls must use a customer-scoped auth token
- Token must be obtained through the official CRBOX login flow
- Token must be short-lived (session-scoped)
- No shared credentials, service account tokens, or admin tokens for customer-facing tools
- Every private tool must enforce: the token owner can only access their own data
- Failed auth returns 401; forbidden data access returns 403

---

## F. MCP Security Rules

If a future CRBOX MCP server is built, the following rules are mandatory:

1. **No arbitrary code execution.** MCP tools must be narrowly scoped functions — no shell access, no file system writes, no database DDL/DML outside designated safe operations.
2. **No unrestricted database access.** MCP tools that query the database must use read-only parameterized queries scoped to the authenticated customer's data.
3. **No secrets in prompts or tool responses.** API keys, passwords, tokens, customer PII, and session cookies must never appear in tool input/output.
4. **Strict tool allowlisting.** The MCP server must enumerate and whitelist every allowed tool explicitly. Wildcard or catch-all tool routing is forbidden.
5. **Prompt injection resistance.** Tool inputs from the user must be sanitized and validated before use. User-supplied strings must never be interpolated into SQL queries, shell commands, or system prompts.
6. **Rate limiting per customer.** Private tools must enforce per-customer rate limits to prevent abuse.
7. **Audit logging.** All private tool calls (tool name, customer ID, timestamp, result code) must be logged for security review.
8. **Admin tools are never MCP tools.** No admin dashboard functions, no solicitudes management, no SMTP health, no DB inspection tools are ever exposed through an MCP interface.

---

## G. Phased Roadmap

### Phase A — Complete (current state)
- `llms.txt` public discoverability file
- `robots.txt` with correct public/private split
- `sitemap.xml` covering all public pages
- `ai-context.json` comprehensive structured context document
- Six public read-only API endpoints (`/api/public/*`)
- JSON-LD structured data on all public pages (Organization, WebSite, WebPage, FAQPage, HowTo, Service, BreadcrumbList)
- `docs/crbox-agent-architecture.md` (this document)

### Phase B — Recommended next
- Google Search Console submission and structured data validation
- Rich result testing for FAQPage and HowTo schemas
- Lighthouse performance baseline
- Schema.org validator pass for all public pages

### Phase C — Calculator API
- Implement a server-side `POST /api/public/calculate-estimate` endpoint that accepts `{weightKg, heightCm, widthCm, lengthCm, valuedUsd, zone}` and returns a deterministic shipping estimate with disclaimer
- This removes the need to direct users to the browser calculator for simple estimates

### Phase D — Authenticated MCP prototype
- Define the OAuth/token exchange flow for CRBOX customer authentication
- Implement `get_my_packages` and `get_my_invoices` as the first private tools
- Deploy with strict allowlisting, rate limits, and audit logging
- Security review before public availability

### Phase E — Full agent integration
- Complete private tool suite (upload_invoice, request_consolidation, track_package_authenticated)
- Published MCP server specification
- Agent SDK examples (Python, TypeScript)

---

## H. What Must Never Be Exposed

The following data categories must **never** appear in any public file, API response, schema markup, `llms.txt`, `ai-context.json`, agent context, or MCP tool output:

| Category | Examples |
|---|---|
| Customer PII | Names, emails, phone numbers, ID numbers, passport numbers |
| Package data | Package IDs, tracking numbers, arrival dates, package contents, weights |
| Invoice data | Purchase receipts, declared values, invoice files, customs documents |
| Account data | Casillero numbers, Miami suite addresses, account passwords, session tokens |
| Financial data | Payment amounts, transaction IDs, credit card info |
| Backend secrets | API keys, SMTP credentials, service account passwords, database connection strings |
| Admin data | Solicitudes (purchase requests), consultas, admin login credentials |
| Internal pricing | Any pricing arrangement negotiated with specific customers or businesses |
| Private business data | Employee info, internal operations data, vendor contracts |

**Rule:** If a piece of data is not already on the public CRBOX website and in `knowledge/crbox-kb.json`, it must not appear in any machine-readable public resource.

---

*This document is maintained by the CRBOX development team. For questions about agent integration, contact ventas@crbox.cr.*
