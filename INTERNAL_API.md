# CRBOX Internal Platform — Integration Reference

This document is the single source of truth for any new system (internal tool,
ops panel, back-office, automation) that needs to integrate with or understand
the existing CRBOX client portal (`crbox-portal`). Keep it updated whenever
endpoints, data models, or business rules change.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Map](#2-architecture-map)
3. [Authentication — All Four Layers](#3-authentication--all-four-layers)
4. [Client Portal API Endpoints](#4-client-portal-api-endpoints)
5. [Admin / Ventas Panel API Endpoints](#5-admin--ventas-panel-api-endpoints)
6. [External CRBOX Core API](#6-external-crbox-core-api)
7. [Data Models](#7-data-models)
8. [SQLite Database Schema](#8-sqlite-database-schema)
9. [Business Rules & Lifecycle States](#9-business-rules--lifecycle-states)
10. [Email & SMTP System](#10-email--smtp-system)
11. [Environment Variables & Secrets](#11-environment-variables--secrets)
12. [File & Page Structure](#12-file--page-structure)
13. [Brand & Design System](#13-brand--design-system)
14. [Integration Guide for the Internal Tool](#14-integration-guide-for-the-internal-tool)

---

## 1. System Overview

**CRBOX** is a Costa Rica–based courier. The portal is a static HTML/CSS/JS
site served by a single Python server (`server.py`, port from `$PORT`, default
`5000`). There is no framework — every HTML page is static, JavaScript is
vanilla ES5-compatible, and the Python server is a hand-rolled
`BaseHTTPRequestHandler`.

### What exists today

| System | Who uses it | Where it lives |
|---|---|---|
| **Client portal** | End customers (track packages, submit purchase requests, upload invoices, group shipments) | `crbox-portal` Replit project — public URL |
| **Ventas / Admin panel** | Sales staff (manage solicitudes, respond to quotes, update statuses) | Same `crbox-portal` project — at `/admin/*` routes, password-protected |
| **CRBOX Core API** | Everything (warehouse, logistics, package data) | `https://clients.crbox.cr/api/crboxwebapi` — external legacy system, not owned by this project |

### What the internal tool should be

A **separate** Replit project (different URL, different secrets, different
deployment). It will communicate with the portal project's API endpoints over
HTTP, using the `X-Sales-Token` or a new internal token for authenticated calls.

---

## 2. Architecture Map

```
┌─────────────────────────────────────────────────┐
│              CRBOX Core API (external)           │
│   https://clients.crbox.cr/api/crboxwebapi      │
│   Warehouse receipts, consignee profiles,        │
│   package statuses, invoices, facturas           │
└────────────────┬────────────────────────────────┘
                 │  REST (Bearer token per customer)
                 ▼
┌─────────────────────────────────────────────────┐
│          crbox-portal  (this project)            │
│  Python server.py · static HTML/CSS/JS           │
│                                                  │
│  PUBLIC                    INTERNAL              │
│  ├─ index.html             ├─ /admin/login       │
│  ├─ login.html             ├─ /admin/dashboard   │
│  ├─ dashboard.html         ├─ /admin/solicitudes │
│  ├─ mis-paquetes.html      └─ /admin/consultas   │
│  ├─ mis-solicitudes.html                         │
│  └─ solicitud.html         APIS                  │
│                            ├─ /api/solicitudes   │
│  LOCAL DB (SQLite)         ├─ /api/chat          │
│  data/portal.db            ├─ /api/ai/extract    │
│  quote_requests            ├─ /api/invoice-upload│
│  quote_status_history      ├─ /api/package-group-│
│  consultas_generales       │    confirm          │
│  general_inquiries         └─ /api/consultas     │
└─────────────────────────────────────────────────┘
                 │  HTTP (X-Sales-Token or admin_session)
                 ▼
┌─────────────────────────────────────────────────┐
│       crbox-internal  (new project)              │
│  Ops dashboard, back-office, automation          │
│  Reads/writes portal APIs + CRBOX Core API       │
└─────────────────────────────────────────────────┘
```

---

## 3. Authentication — All Four Layers

### 3.1 Customer Portal Auth (`_portal_auth` / `_portal_auth_full`)

Used by any endpoint that a logged-in customer calls.

**How it works:**
1. Frontend stores `crboxAuthToken` (JWT-like) and `crboxUserEmail` in
   `localStorage` after login.
2. Every API call adds two headers:
   ```
   Authorization: Bearer <crboxAuthToken>
   X-Casillero-Email: <crboxUserEmail>
   ```
3. `server.py` validates by proxying to the CRBOX Core API:
   ```
   GET https://clients.crbox.cr/api/crboxwebapi/getuserinfo/<email>
   Authorization: Bearer <token>
   ```
   - 200 → valid. Returns `casillero_id` (IdConsignee from response).
   - Non-200 → rejects with 401.
4. `_portal_auth_full()` additionally returns the **server-verified email**
   (from the Core API response, not from the header) — always prefer this over
   the header value to prevent spoofing.

**The internal tool cannot impersonate customers this way.** Customer tokens are
issued by the CRBOX Core API login system, which the portal does not control.

---

### 3.2 Admin Session Auth

Used for all `/admin/*` routes.

**Flow:**
1. `POST /admin/login` with `password` field.
2. Server compares against `ADMIN_PASSWORD` env var.
3. On success: generates a 64-char hex session token, stores it in
   `_admin_sessions{}` with an 8-hour TTL (sliding window).
4. Sets `Set-Cookie: admin_session=<token>; HttpOnly; SameSite=Strict; Secure`.
5. All subsequent `/admin/*` requests require this cookie.

**Security features:**
- Brute-force lock: 5 failed attempts in 15 min → 15-min IP lockout.
- Sessions auto-expire. No persistent storage — all in-memory.
- Production refuses to start if `ADMIN_PASSWORD` is absent or is a placeholder.

---

### 3.3 Sales Token Auth (`X-Sales-Token`)

Used for machine-to-machine calls from the internal tool or any trusted system
that needs to read/write solicitud data without a browser session.

**How it works:**
- Request must include header: `X-Sales-Token: <token>`
- Server validates against `_effective_sales_token()`:
  - If `SALES_TOKEN` env var is set to a non-dev value → uses that.
  - Otherwise → derives from `ADMIN_PASSWORD`:
    `sha256("crbox-sales-" + ADMIN_PASSWORD)[:48]`
- The dev placeholder (`crbox-dev-sales-token-2026`) is rejected in production.

**This is the primary auth mechanism the internal tool should use** for calling
portal APIs. Set a strong `SALES_TOKEN` in both the portal project and the
internal tool project secrets.

---

### 3.4 Service Token Auth (Machine-to-Machine)

Used for `POST /crbox-svc-token` — a high-trust endpoint for automated actions.

**How it works:**
- Header: `Authorization: Bearer <token>`
- Token is validated as: `sha256(SVC_KEY + current_hour_timestamp)`
- Rotates every hour. `CRBOX_SVC_EMAIL` + `CRBOX_SVC_PASSWORD` are service
  account credentials for the CRBOX Core API (warehouse system).

---

## 4. Client Portal API Endpoints

Base URL: `https://<portal-domain>` (same server, no prefix beyond path)

All authenticated endpoints require customer headers unless noted.

---

### `GET /health`
**Auth:** None
**Response:**
```json
{ "ok": true, "smtp": "ok" }
```
Returns 503 if SMTP is unreachable. Use for uptime monitoring.

---

### `POST /send-quote`
**Auth:** None
**Purpose:** Sends a pricing quote email to a prospective customer.
**Body:**
```json
{
  "subject": "string",
  "userEmail": "string",
  "userName": "string",
  "bodyText": "string"
}
```
**Response:** `{ "ok": true }` or `{ "ok": false, "error": "string" }`

---

### `POST /api/ai/extract`
**Auth:** None (rate-limited by IP)
**Purpose:** AI extraction of product details from a shopping URL (Gemini).
**Body:** `{ "url": "https://..." }`
**Response:**
```json
{
  "page_readable": true,
  "fields": {
    "product_name": "string",
    "price_usd": 0.00,
    "category": "string",
    "weight_kg": 0.0,
    "dimensions": {}
  },
  "compliance": {},
  "extraction_warnings": []
}
```

---

### `POST /api/chat`
**Auth:** None (rate-limited by IP)
**Purpose:** AI chat assistant (Gemini-backed).
**Body:**
```json
{
  "history": [{ "role": "user|model", "parts": [{ "text": "..." }] }],
  "page": "string",
  "context": {}
}
```
**Response:** `{ "reply": "string", "widget": null, "deeplink": null }`

---

### `POST /api/consultas`
**Auth:** None
**Purpose:** General contact/inquiry form submission.
**Body:**
```json
{
  "nombre": "string",
  "correo": "string",
  "telefono": "string",
  "asunto": "string",
  "mensaje": "string",
  "source": "string"
}
```
**Response:** `{ "ok": true, "id": 123 }`
Triggers email to `ventas@crbox.cr`.

---

### `POST /api/faq-pregunta`
**Auth:** None
**Purpose:** FAQ question submission.
**Body:** `{ "nombre": "string", "correo": "string", "pregunta": "string", "source": "string" }`
**Response:** `{ "ok": true, "id": 123 }`

---

### `POST /api/solicitudes` — Create Purchase Request
**Auth:** Optional Portal Auth (hardens `casillero_id` if present)
**Body:**
```json
{
  "product_name": "string",
  "product_url": "string",
  "customer_email": "string",
  "customer_name": "string",
  "declared_value_usd": 0.00,
  "category": "electronica|ropa|calzado|hogar|cosmeticos|juguetes|deportes|otros",
  "weight_kg": 0.0,
  "length_cm": 0.0,
  "width_cm": 0.0,
  "height_cm": 0.0,
  "customer_notes": "string",
  "service_type": "aereo|maritimo",
  "destination_zone": "string",
  "data_source": "manual|ai_extraction",
  "ai_extraction_json": {}
}
```
**Response:** `{ "ok": true, "id": "SCB-0001" }`
Creates record in `quote_requests`. Sends confirmation email to customer +
notification to `ventas@crbox.cr`.

---

### `GET /api/solicitudes`
**Auth:** Portal Auth required
**Query:** `?status=enviada` (optional filter)
**Response:**
```json
{
  "ok": true,
  "solicitudes": [{ }]
}
```
Returns only solicitudes belonging to the authenticated `casillero_id`.

---

### `GET /api/solicitudes/<id>`
**Auth:** Portal Auth (owner only)
**Response:**
```json
{
  "ok": true,
  "solicitud": {
    "history": [
      {
        "from_status": "string",
        "to_status": "string",
        "changed_at": "ISO8601",
        "changed_by": "string",
        "note": "string"
      }
    ]
  }
}
```

---

### `POST /api/solicitudes/<id>/cancel`
**Auth:** Portal Auth (owner only)
**Purpose:** Customer cancels their own request (only allowed in non-terminal states).
**Response:** `{ "ok": true }`

---

### `POST /api/solicitudes/<id>/intent`
**Auth:** Portal Auth
**Purpose:** Customer signals purchase intent after sales responds.
**Body:** `{ "intent": "comprar_crbox" | "comprar_cliente" }`
**Response:** `{ "ok": true }`
Transitions: `respondida` → `pendiente_compra_crbox` or `pendiente_compra_cliente`.

---

### `POST /api/solicitudes/<id>/tracking`
**Auth:** Portal Auth
**Purpose:** Customer provides tracking number for their own purchase.
**Body:** `{ "tracking_number": "string" }`
**Response:** `{ "ok": true }`

---

### `POST /api/solicitudes/link-guest`
**Auth:** Portal Auth
**Purpose:** After login, links orphaned guest-submitted solicitudes to the account.
**Response:** `{ "ok": true, "linked": 2 }` (count of linked records)

---

### `POST /api/invoice-upload`
**Auth:** Portal Auth
**Purpose:** Upload invoice PDF/image for a warehouse receipt.
**Body:** `multipart/form-data` with `file` field.
**Response:** `{ "ok": true, "filename": "string", "url": "https://..." }`
File saved to `uploads/invoices/`. Also triggers an alert email to `facturas@crbox.cr`.

---

### `DELETE /api/invoice-upload/<filename>`
**Auth:** Portal Auth
**Purpose:** Delete a previously uploaded invoice (cleanup on failed saves).
**Response:** `{ "ok": true }`

---

### `POST /api/proxy/saveBill`
**Auth:** None (trusted relay)
**Purpose:** Proxies bill registration to CRBOX Core API (`postcreatepurchasebill`).
**Body:** Raw `multipart/form-data` as received from the frontend.
**Response:** Relayed JSON from the CRBOX Core API.

---

### `POST /api/package-group-confirm`
**Auth:** Portal Auth required
**Purpose:** Customer confirms they want packages shipped together. Sends
structured email to `facturas@crbox.cr`.
**Body:**
```json
{
  "groupName": "string",
  "expectedPackageCount": 3,
  "lockerNumber": "string",
  "clientName": "string",
  "clientEmail": "string",
  "phone": "string",
  "confirmedAt": "ISO8601",
  "notes": "string",
  "packages": [
    {
      "trackingNumber": "string",
      "number": "string",
      "carrierName": "string",
      "bestDate": "YYYY-MM-DD",
      "invoicesCount": 1
    }
  ]
}
```
**Response:** `{ "ok": true }` or `{ "ok": false, "error": "string" }`
Note: `clientEmail` in the body is ignored. Server uses `verified_email` from
`_portal_auth_full()` for security.

---

### `POST /crbox-svc-token`
**Auth:** Service Token (rotating HMAC, hourly)
**Purpose:** High-trust machine actions (quotes, status updates from automation).
**Body:** `{ "action": "get_quote" | "update_status", ... }`
**Response:** Action-specific JSON.

---

## 5. Admin / Ventas Panel API Endpoints

All routes require the `admin_session` cookie. HTML page routes return rendered
HTML; action routes return JSON.

### Auth

| Endpoint | Method | Purpose |
|---|---|---|
| `/admin/login` | GET | Login page HTML |
| `/admin/login` | POST | `{ password }` → sets session cookie |
| `/admin/logout` | POST | Clears session |

### Dashboard & Views

| Endpoint | Method | Purpose |
|---|---|---|
| `/admin` or `/admin/dashboard` | GET | Main dashboard (KPIs, Kanban, charts) |
| `/admin/solicitudes` | GET | All purchase requests (filterable) |
| `/admin/solicitudes/<id>` | GET | Detail view for one request |
| `/admin/consultas` | GET | General inquiries list |
| `/admin/consultas/<id>` | GET | Single inquiry detail |

### Actions (return JSON)

| Endpoint | Method | Body | Purpose |
|---|---|---|---|
| `/admin/solicitudes/<id>/status` | POST | `{ status, note }` | Transition request status (enforces `_ADMIN_LEGAL_TRANSITIONS`) |
| `/admin/solicitudes/<id>/respond` | POST | Response form fields | Sends quote response email to customer, transitions to `respondida` |
| `/admin/solicitudes/<id>/add-note` | POST | `{ note, visible_to_customer }` | Add internal or customer-visible note |
| `/admin/solicitudes/<id>/link-package` | POST | `{ package_id }` | Links solicitud to a real WR in the CRBOX system |
| `/admin/solicitudes/<id>/suggest-draft` | POST | `{ context }` | Asks Gemini for a draft response suggestion |

### Machine-to-Machine Alternative (no browser session needed)

| Endpoint | Method | Auth | Body | Purpose |
|---|---|---|---|---|
| `/api/solicitudes/<id>/status` | POST | `X-Sales-Token` | `{ status, note }` | Same as admin status update — use this from the internal tool |

---

## 6. External CRBOX Core API

**Base URL:** `https://clients.crbox.cr/api/crboxwebapi`
**Auth:** `Authorization: Bearer <customer_token>` on all authenticated calls.
**Note:** This is a legacy system not owned by the portal. Treat as read-mostly;
write operations (invoice registration, profile edit) should be done carefully.

### Endpoints Used by the Portal

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/getuserinfo/<email>` | GET | Bearer | Fetch consignee profile (also used for token validation) |
| `/postedituser` | POST | Bearer | Update profile (`application/x-www-form-urlencoded`) |
| `/getuserpackages/<idConsignee>/<start>/<end>/<tracking>/<status>` | GET | Bearer | List warehouse receipts for a customer |
| `/getfacturas/<email>/<start>/<end>` | GET | Bearer | Billing history (Facturas with embedded Recibos) |
| `/postcreatepurchasebill` | POST | Bearer | Register an uploaded invoice against a WR |
| `/getuserpasswordrecovery/<email>` | GET | None | Trigger password recovery email |

### `getuserpackages` Parameters

| Param | Type | Notes |
|---|---|---|
| `idConsignee` | int | Casillero ID from user profile |
| `start` | string | Date `YYYY-MM-DD` |
| `end` | string | Date `YYYY-MM-DD` |
| `tracking` | string | Filter by tracking number; `""` for all |
| `status` | string | Filter by status name; `""` for all |

---

## 7. Data Models

### 7.1 Package / Warehouse Receipt (WR)

Normalized by `mapPackage()` in `js/portal-api.js`. Raw data comes from
`/getuserpackages`.

```js
{
  idwarehousereceipt:      number | null,   // Primary key in CRBOX Core
  statusId:                number | null,   // See status table below
  statusName:              string,          // Raw string from API
  canonicalStatus:         string,          // Uppercased label: "MIAMI", "SJO", etc.
  number:                  string,          // WR number e.g. "WR-00001"
  trackingNumber:          string,          // Carrier tracking number
  carrierName:             string,          // UPS, FedEx, USPS, etc.
  shipperName:             string,          // Sender / store name
  receiveddatetime:        string,          // ISO datetime — when received at warehouse
  createdDate:             string,          // ISO datetime — fallback date
  bestDate:                string,          // receiveddatetime || createdDate
  totalpieces:             number | null,
  totalweight:             number | null,   // lbs
  totalvolume:             number | null,
  totalvolumetricweight:   number | null,
  invoicesCount:           number | null,   // How many invoices are uploaded
  invoiceFileUrl:          string,          // URL to latest invoice file
  hasPackage:              boolean,
  impresoFactura:          boolean,         // CRBOX Core invoice-printed flag
  consolidadoFactura:      boolean,         // CRBOX Core consolidated flag
  consigneeSucursalName:   string,          // Branch name
  consigneeNotes:          string,
  masterAirShipmentNumber: string,
  airShipmentNumber:       string,
  descripcion:             string,
  emision:                 string,
  montofactura:            number | null,
  descripcionfactura:      string
}
```

### Package Status IDs

| `statusId` | `canonicalStatus` | Display label | Groupable? |
|---|---|---|---|
| 1 | `MIAMI` | Recibido en Miami | **Yes — only status eligible for "Enviar Juntos"** |
| 2 | `SJO` | Recibido en SJO | No |
| 3 | `CARGADO` | Cargado para envío | No |
| 4 | `EN TRÁNSITO` | En tránsito hacia Costa Rica | No |
| 5 | `CRBOX` | Listo para retirar en CRBOX | No |
| 6 | `EN ESPERA` | En espera | No |
| 7 | `ENTREGADO` | Entregado | No |

`IN_TRANSIT_STATUS_IDS = [1, 2, 3, 4]` — used for "Paquetes en camino" dashboard count.

---

### 7.2 Solicitud (Quote / Purchase Request)

Stored in `quote_requests` SQLite table. Identified by `SCB-XXXX` IDs.

```js
{
  id:                        "SCB-0001",
  casillero_id:              "12345",          // Linked customer (null for guest)
  customer_email:            "user@email.com",
  customer_name:             "string",
  account_type:              "portal|anonymous",
  product_name:              "string",
  product_url:               "string",
  declared_value_usd:        0.00,
  category:                  "electronica|ropa|calzado|hogar|cosmeticos|juguetes|deportes|otros",
  weight_kg:                 0.0,
  length_cm:                 0.0,
  width_cm:                  0.0,
  height_cm:                 0.0,
  customer_notes:            "string",
  service_type:              "aereo|maritimo",
  destination_zone:          "string",
  estimate_usd:              0.00,            // System pre-estimate
  estimate_breakdown:        "{}",            // JSON string
  data_source:               "manual|ai_extraction",
  ai_extraction_json:        "{}",            // JSON string (Gemini extraction result)
  status:                    "string",        // See lifecycle below
  submitted_at:              "ISO8601",
  responded_at:              "ISO8601|null",
  completed_at:              "ISO8601|null",
  cancelled_at:              "ISO8601|null",
  expires_at:                "ISO8601|null",
  reminder_sent_at:          "ISO8601|null",
  customer_reminder_sent_at: "ISO8601|null",
  expected_tracking_number:  "string|null",
  linked_package_id:         "string|null",   // WR number once package arrives
  customs_description:       "string|null",
  response_json:             "{...}|null"     // JSON string — see below
}
```

#### `response_json` shape (when status is `respondida` or later)
```json
{
  "confirmed_shipping_price_usd": 0.00,
  "availability": "disponible|no_disponible|consultar",
  "delivery_timeline": "string",
  "conditions": "string",
  "customer_message": "string"
}
```

#### Status History Entry
```js
{
  id:               "uuid",
  quote_request_id: "SCB-0001",
  from_status:      "string|null",
  to_status:        "string",
  changed_at:       "ISO8601",
  changed_by:       "admin|customer|system|sales-api",
  note:             "string|null"
}
```

---

### 7.3 Package Group

Currently stored in browser `localStorage` under key `crbox_package_groups_v1`.
Managed by `js/enviar-juntos.js`. Server-side persistence being added in Task #316.

```js
{
  id:                   "grp-<uuid>",
  groupName:            "string",
  expectedPackageCount: 3,
  lockerNumber:         "string",       // Customer's casillero number
  status: "waiting_for_packages"
        | "invoices_pending"
        | "ready_to_confirm"
        | "confirmation_sent"
        | "closed",
  packages: [
    {
      idwarehousereceipt: number,
      trackingNumber:     "string",
      number:             "string",     // WR number
      carrierName:        "string",
      bestDate:           "YYYY-MM-DD",
      statusId:           1,            // Must be 1 (MIAMI) to be eligible
      invoicesCount:      number
    }
  ],
  createdAt:    "ISO8601",
  confirmedAt:  "ISO8601|null"
}
```

**Group status lifecycle:**
```
waiting_for_packages
  → (packages added, invoices missing) → invoices_pending
  → (user checks invoice confirmation checkbox) → ready_to_confirm
  → (user sends confirmation email) → confirmation_sent
  → (closed manually or by ops) → closed
```

---

### 7.4 User / Consignee Profile

Returned by `getUserInfo()` in `portal-api.js`. Source: CRBOX Core API.

```js
{
  Consignee: {
    idconsignee:          12345,           // casillero_id (numeric)
    consigneename:        "Nombre Apellido",
    email:                "user@example.com",
    identificationnumber: "1-2345-6789",   // CR cédula
    sucursal: {
      idsucursal:    1,
      sucursalname:  "CRBOX Central",
      address:       "string"
    }
  },
  Phones:    [{ phone: "string", phonetype: "string" }],
  Addresses: [{ address: "string", city: "string" }]
}
```

---

### 7.5 General Inquiry (Contact Form)

Stored in `general_inquiries` table.

```js
{
  id:          123,
  nombre:      "string",
  correo:      "string",
  telefono:    "string",
  asunto:      "string",
  mensaje:     "string",
  source:      "contacto|faq|chat",
  submitted_at:"ISO8601",
  email_sent:  0 | 1
}
```

---

## 8. SQLite Database Schema

**File:** `data/portal.db`
**Mode:** WAL, foreign keys enabled.

```sql
-- Purchase/quote requests
CREATE TABLE quote_requests (
  id                        TEXT PRIMARY KEY,         -- "SCB-0001"
  casillero_id              TEXT,                     -- nullable for guest submissions
  customer_email            TEXT NOT NULL,
  customer_name             TEXT,
  account_type              TEXT NOT NULL DEFAULT 'anonymous',
  product_name              TEXT NOT NULL,
  product_url               TEXT,
  declared_value_usd        REAL NOT NULL,
  category                  TEXT NOT NULL DEFAULT 'otros',
  weight_kg                 REAL,
  length_cm                 REAL,
  width_cm                  REAL,
  height_cm                 REAL,
  customer_notes            TEXT,
  service_type              TEXT NOT NULL DEFAULT 'aereo',
  destination_zone          TEXT,
  estimate_usd              REAL,
  estimate_breakdown        TEXT,                     -- JSON string
  ai_extraction_id          TEXT,
  data_source               TEXT NOT NULL DEFAULT 'manual',
  status                    TEXT NOT NULL DEFAULT 'enviada',
  submitted_at              TEXT NOT NULL,
  responded_at              TEXT,
  completed_at              TEXT,
  cancelled_at              TEXT,
  expires_at                TEXT,
  reminder_sent_at          TEXT,
  customer_reminder_sent_at TEXT,
  linked_package_id         TEXT,
  expected_tracking_number  TEXT,
  customs_description       TEXT,
  ai_extraction_json        TEXT,                     -- JSON string
  response_json             TEXT                      -- JSON string
);

-- Audit log for every status transition
CREATE TABLE quote_status_history (
  id               TEXT PRIMARY KEY,
  quote_request_id TEXT NOT NULL,
  from_status      TEXT,
  to_status        TEXT NOT NULL,
  changed_at       TEXT NOT NULL,
  changed_by       TEXT NOT NULL DEFAULT 'system',
  note             TEXT,
  FOREIGN KEY (quote_request_id) REFERENCES quote_requests(id)
);

-- FAQ submissions (legacy path, still active)
CREATE TABLE consultas_generales (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre       TEXT NOT NULL,
  correo       TEXT NOT NULL,
  pregunta     TEXT NOT NULL,
  source       TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  status       TEXT NOT NULL DEFAULT 'nueva'
);

-- General contact form (current main path)
CREATE TABLE general_inquiries (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre       TEXT NOT NULL,
  correo       TEXT NOT NULL,
  telefono     TEXT NOT NULL DEFAULT '',
  asunto       TEXT NOT NULL DEFAULT '',
  mensaje      TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'contacto',
  submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  email_sent   INTEGER NOT NULL DEFAULT 0
);
```

**Migrations are additive only** — `ALTER TABLE ADD COLUMN` guards exist in
`_init_db()`. Never drop or rename columns; always add a migration guard for
new columns.

---

## 9. Business Rules & Lifecycle States

### 9.1 Solicitud Status Lifecycle

Two transition maps exist: **customer-facing** (permissive) and **admin**
(stricter — requires going through `en_revision` before `respondida`).

```
enviada
  └─ [admin only] → en_revision
        └─ → respondida
              ├─ → pendiente_compra_crbox
              │     └─ → pendiente_confirmacion_pago_cliente
              │           └─ [payment confirmed] → pagado_por_cliente
              │                 └─ → comprado
              │                       ├─ → listo_para_retiro → completada
              │                       └─ → completada
              └─ → pendiente_compra_cliente → completada

cancelada — allowed from most non-terminal states
Terminal states: completada, cancelada, expirada (no further transitions)
```

**Admin legal transitions** (used in `/admin/*` and `/api/solicitudes/<id>/status`):
```
enviada                           → en_revision, cancelada
en_revision                       → respondida, cancelada
respondida                        → completada, cancelada, pendiente_compra_crbox, pendiente_compra_cliente
pendiente_compra_crbox            → pendiente_confirmacion_pago_cliente, cancelada
pendiente_confirmacion_pago_cliente → pagado_por_cliente, cancelada
pagado_por_cliente                → comprado, cancelada
comprado                          → listo_para_retiro, completada, cancelada
listo_para_retiro                 → completada, cancelada
pendiente_compra_cliente          → completada, cancelada
completada                        → (none)
cancelada                         → (none)
expirada                          → (none)
```

---

### 9.2 Package Grouping Rules ("Enviar Juntos")

- Only packages with `statusId === 1` (MIAMI) are eligible for grouping.
- A package can only belong to one active group at a time (cross-group lock
  enforced client-side; `_pid()` normalizer used for consistent string ID comparison).
- If a grouped package changes `statusId` away from 1 after being added, an
  amber warning banner appears on the group card. The package is no longer
  in Miami and may not be held for joint shipment.
- Group confirmation sends an email to `facturas@crbox.cr` with a structured
  HTML + plain-text summary.
- Server-side persistence added by Task #316.

---

### 9.3 Invoice Rules

- Customers must upload invoices for packages before they can confirm a group.
- Invoice upload is a two-step process:
  1. `POST /api/invoice-upload` → saves file locally (`uploads/invoices/`), returns `url`.
  2. Frontend calls `CrboxApi.createPurchaseBill()` → registers URL with CRBOX
     Core API via `POST /postcreatepurchasebill`.
- `invoicesCount` on a package reflects how many invoices are registered in
  the CRBOX Core system (0 = none uploaded).
- `impresoFactura` and `consolidadoFactura` are CRBOX Core internal flags.

---

### 9.4 Casillero / Locker Numbers

- Every client has a numeric `casillero_id` (= `idconsignee` from CRBOX Core).
- This is the primary identifier across all authenticated operations.
- Used in package queries: `/getuserpackages/<casillero_id>/...`
- Displayed to customers as their "número de casillero".

---

### 9.5 Shipping Estimates

- **Aéreo:** ~$6–8/lb (dimensional weight may apply).
- **Marítimo:** ~$1.50–2/lb (minimum charge applies, longer transit time).
- Estimate logic lives in `js/calculator-engine.js` and `js/tariff-adapter.js`.
- `estimate_usd` in solicitudes is a system pre-estimate.
- `response_json.confirmed_shipping_price_usd` is the actual sales-confirmed price.

---

## 10. Email & SMTP System

### `_send_smtp(msg, recipients)`

Low-level helper in `server.py`. Reads all settings from environment variables.
- Port 465 → `smtplib.SMTP_SSL`
- Any other port → `smtplib.SMTP` + `STARTTLS`
- 15-second connection timeout. Authenticates with `SMTP_USER` / `SMTP_PASS`.

### All Emails Sent by the Portal

| Trigger | From | To | Format |
|---|---|---|---|
| New solicitud submitted | `CRBOX <SMTP_USER>` | Customer email | HTML + plain |
| New solicitud (internal alert) | `CRBOX Solicitudes <SMTP_USER>` | `ventas@crbox.cr` | HTML + plain |
| Solicitud cancelled | `CRBOX <SMTP_USER>` | Customer email | HTML + plain |
| Sales responds to solicitud | `CRBOX <SMTP_USER>` | Customer email | HTML + plain |
| Invoice uploaded by customer | `CRBOX <SMTP_USER>` | `facturas@crbox.cr` | Plain text |
| Package group confirmation | `CRBOX <SMTP_USER>` | `facturas@crbox.cr` | HTML + plain |
| Contact form submitted | `CRBOX <SMTP_USER>` | `ventas@crbox.cr` | HTML + plain |
| General quote / send-quote | `CRBOX <SMTP_USER>` | Customer email | Custom |

### Key Internal Email Addresses

| Address | Role |
|---|---|
| `ventas@crbox.cr` | Sales team — receives leads, contact forms, solicitud notifications |
| `facturas@crbox.cr` | Invoicing/ops team — receives invoice alerts and group confirmations |
| `SMTP_USER` (env var) | The sending address for all outbound mail |

---

## 11. Environment Variables & Secrets

All secrets managed via Replit Secrets. **Never hardcode or log these.**

| Variable | Required | Purpose | Notes |
|---|---|---|---|
| `ADMIN_PASSWORD` | Yes (prod) | Admin panel login password. Also seeds `SALES_TOKEN` if unset. | Server refuses to start in production if missing or placeholder. |
| `SALES_TOKEN` | Recommended | Machine-to-machine auth for internal API calls. | Auto-derived from `ADMIN_PASSWORD` if unset. Must match in both portal and internal tool. |
| `SMTP_HOST` | Yes | SMTP server hostname | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | Yes | SMTP port | `587` (TLS) or `465` (SSL) |
| `SMTP_USER` | Yes | Sending email address | |
| `SMTP_PASS` | Yes | SMTP app password | |
| `GEMINI_API_KEY` | Yes | Google AI for product extraction + chat | |
| `GEMINI_MODEL` | No | Gemini model name | Defaults to `gemini-2.5-flash-lite` |
| `CRBOX_SVC_EMAIL` | Yes | Service account email for CRBOX Core API | Used for background server-to-CRBOX calls |
| `CRBOX_SVC_PASSWORD` | Yes | Service account password for CRBOX Core API | |
| `SITE_URL` | Recommended | Base URL of the portal | Used in email links. e.g. `https://crbox.cr` |
| `ALLOWED_ORIGIN` | Recommended (prod) | CORS allowed origin | Auto-resolved from `REPLIT_DOMAINS` on Replit; set explicitly for custom domain |
| `PORT` | No | Server listen port | Defaults to `5000` |
| `REPLIT_DEPLOYMENT` | Auto | Set by Replit in production deployments | Enables stricter startup validation |

---

## 12. File & Page Structure

```
crbox-portal/
├─ server.py                    # Single Python server (BaseHTTPRequestHandler)
├─ data/
│  └─ portal.db                 # SQLite database (WAL mode)
├─ uploads/
│  └─ invoices/                 # Customer-uploaded invoice files
├─ knowledge/
│  └─ crbox-kb.json             # AI knowledge base for chat assistant
│
├─ index.html                   # Public landing page
├─ calculadora.html             # Shipping cost calculator
├─ como-funciona.html           # FAQ / how-it-works page
├─ login.html                   # Customer portal login
├─ dashboard.html               # Customer dashboard (auth required)
├─ mis-paquetes.html            # Package tracking + grouping (auth required)
├─ mis-solicitudes.html         # Purchase request list (auth required)
├─ solicitud.html               # Single solicitud detail (auth required)
├─ mi-cuenta.html               # Profile management (auth required)
│
├─ css/
│  ├─ styles.css                # Global styles + CSS brand variables
│  ├─ responsive.css            # Mobile/responsive overrides
│  ├─ dashboard.css             # Portal page styles
│  ├─ enviar-juntos.css         # Package grouping module styles
│  └─ chat-panel.css            # AI chat widget styles
│
├─ js/
│  ├─ auth.js                   # Login, token storage, logout
│  ├─ nav-auth.js               # Nav bar auth state (show/hide portal links)
│  ├─ portal-api.js             # CRBOX Core API wrapper (all package/user calls)
│  ├─ dashboard.js              # Dashboard data loading and rendering
│  ├─ enviar-juntos.js          # Package grouping module (7 modals, full flow)
│  ├─ mis-solicitudes.js        # Purchase request list logic
│  ├─ solicitud.js              # Single solicitud detail logic
│  ├─ main.js                   # Global UI helpers (nav, scroll, etc.)
│  ├─ footer.js                 # Footer injection
│  ├─ chat-panel.js             # AI chat widget controller
│  ├─ chat-calculator.js        # Calculator integration inside chat
│  ├─ chat-quote.js             # Quote flow inside chat
│  ├─ calculator-engine.js      # Shipping estimate math
│  ├─ tariff-adapter.js         # Tariff table for calculator
│  ├─ analytics.js              # Lightweight analytics/tracking
│  ├─ seo-config.js             # SEO meta tag helpers
│  ├─ cr-locations.js           # Costa Rica location data
│  ├─ crbox-knowledge.js        # KB loader for chat
│  └─ portal-nav-offset.js      # Scroll offset for sticky nav
│
└─ img/                         # Static images and favicons
```

### Customer Authentication Flow (End-to-End)

```
1. User opens login.html
   └─ auth.js POSTs email + password to CRBOX Core API
       GET /getuserinfo/<email>  Authorization: Bearer <password>
   └─ On 200: stores in localStorage:
       crboxAuthToken    = <password/token>
       crboxUserEmail    = <email>
       crboxUserData     = <full profile JSON>
   └─ Sets cookie crbox_logged_in=1 for nav state

2. Protected page loads (e.g. dashboard.html, mis-paquetes.html)
   └─ nav-auth.js checks localStorage for crboxAuthToken
   └─ Missing or expired → redirects to login.html
   └─ Present → proceeds; injects auth headers into all API calls

3. portal-api.js makes calls to CRBOX Core API
   └─ Authorization: Bearer <crboxAuthToken>
   └─ (some local calls also add X-Casillero-Email: <crboxUserEmail>)

4. server.py endpoints validate via _portal_auth_full()
   └─ Proxies GET /getuserinfo/<email> to CRBOX Core API
   └─ 200 → extracts casillero_id + verified_email from response
   └─ Uses server-verified email for all operations, ignores header email
```

---

## 13. Brand & Design System

### Color Palette

```css
--primary:       #FF6B00;   /* CRBOX Orange — primary CTAs, buttons, highlights */
--primary-dark:  #E05A00;   /* Orange hover/active state */
/* Navy used via Tailwind: #0F172A (slate-900) */
/* Purple accent (enviar-juntos module): #7c3aed */
/* Purple light background: #f5f3ff */
/* Amber warning: #d97706 */
/* Green success: #10b981 */
/* Light gray background: #f3f4f6 */
```

### Button Classes (enviar-juntos module)

| Class | Style | Use |
|---|---|---|
| `.ej-btn` | Base — no fill | Base class, always combined |
| `.ej-btn-primary` | Orange filled | Primary CTA |
| `.ej-btn-purple` | Purple filled | Secondary CTA (grouping flow) |
| `.ej-btn-outline` | Bordered, no fill | Equal-weight neutral choice |
| `.ej-btn-sm` | Smaller padding | Compact contexts |

### Component Patterns

- **Modals:** Overlay (`rgba(0,0,0,0.5)`) + centered white card.
  Mobile: bottom-sheet (`position:fixed; bottom:0; border-radius:16px 16px 0 0`).
- **Cards:** White, `border-radius:12px`, subtle `box-shadow`. Status badge
  in top-right corner.
- **Toast notifications:** `_showToast(text, type)` — types: `success`,
  `error`, `warning`, `info`. Appears bottom-right, auto-dismisses after 4s.
- **Progress bars:** CSS class-based thresholds — `.ej-warning` (amber, < 50%),
  `.ej-almost` (orange, 50–99%), `.ej-complete` (green, 100%).
- **Status badges:** Inline `<span>` with colored dot + label text.

---

## 14. Integration Guide for the Internal Tool

### Recommended Architecture

The internal tool is a **separate Replit project** that:
1. Has its own URL and deployment — never publicly exposed to end customers.
2. Calls portal APIs over HTTP using `X-Sales-Token` for authentication.
3. Calls CRBOX Core API directly using service account credentials for package/
   consignee data that the portal doesn't proxy.
4. Has its own UI (can reuse the CRBOX brand colors for visual consistency).

---

### What the Internal Tool Needs vs. How to Get It

| Capability | Current status | How to get it |
|---|---|---|
| Update solicitud status | Available | `POST /api/solicitudes/<id>/status` with `X-Sales-Token` |
| List **all** solicitudes (not per-customer) | Not exposed via API yet | Add `GET /api/internal/solicitudes` endpoint to portal |
| See full solicitud detail | Not exposed via API yet | Add `GET /api/internal/solicitudes/<id>` |
| Add internal notes | Only via admin session today | Add `POST /api/internal/solicitudes/<id>/note` |
| List all consultas/inquiries | Only via admin session today | Add `GET /api/internal/consultas` |
| Look up any package by tracking or casillero | Not in portal | Call CRBOX Core API directly with service account |
| See confirmed package groups | Client-side only today | Task #316 adds server persistence; then add `GET /api/internal/groups` |
| Update group ops status | Not implemented | Add after Task #316 |

---

### New Portal Endpoints to Plan (add to `server.py`)

When building the internal tool, add these endpoints to the portal. All should
accept `X-Sales-Token`:

```
GET  /api/internal/solicitudes              List all solicitudes with full detail (no casillero filter)
GET  /api/internal/solicitudes/<id>         Full solicitud detail + status history
POST /api/internal/solicitudes/<id>/note    Add internal note { "note": "string", "by": "string" }
POST /api/internal/solicitudes/<id>/link    Link to a package { "package_id": "string" }
GET  /api/internal/consultas                All general inquiries
GET  /api/internal/groups                   All confirmed package groups (after Task #316)
POST /api/internal/groups/<id>/status       Update group ops status { "status": "string" }
```

---

### Secrets the Internal Tool Needs

Copy these from the portal project secrets into the internal tool project:

| Secret | Why |
|---|---|
| `SALES_TOKEN` | Must match the portal's value exactly for `X-Sales-Token` auth |
| `CRBOX_SVC_EMAIL` | Service account email for direct CRBOX Core API calls |
| `CRBOX_SVC_PASSWORD` | Service account password |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Only if the internal tool sends its own emails |

---

### CRBOX Core API — Service Account Pattern

To look up any customer's packages from the internal tool without their personal
Bearer token:

```js
// The service account authenticates the same way customers do:
// Bearer token = password, validated by getuserinfo returning 200
const response = await fetch(
  'https://clients.crbox.cr/api/crboxwebapi/getuserinfo/' + encodeURIComponent(SVC_EMAIL),
  { headers: { 'Authorization': 'Bearer ' + SVC_PASSWORD } }
);
// Then query packages for any casillero_id:
const packages = await fetch(
  'https://clients.crbox.cr/api/crboxwebapi/getuserpackages/' +
  casilleroId + '/2024-01-01/2026-12-31//',
  { headers: { 'Authorization': 'Bearer ' + SVC_PASSWORD } }
);
```

---

### Data Ownership Map

| Data | Lives in | Portal stores it? | Sync needed? |
|---|---|---|---|
| Packages / Warehouse Receipts | CRBOX Core API | No — fetched on demand | No |
| Consignee profiles | CRBOX Core API | No — cached in sessionStorage only | No |
| Invoices (files) | `uploads/invoices/` in portal | Yes | Yes if internal tool needs them |
| Invoice registrations | CRBOX Core (via `postcreatepurchasebill`) | No | No |
| Solicitudes | `data/portal.db` | Yes — source of truth | Internal tool reads via API |
| Status history | `data/portal.db` | Yes | Internal tool reads via API |
| Package groups | `localStorage` (client) / DB after Task #316 | After #316: yes | After #316: readable via API |
| User sessions | In-memory `_admin_sessions{}` | No — ephemeral | N/A |

---

*Last updated: May 2026. Maintained in `crbox-portal`. Update this file
whenever endpoints, schemas, or business rules change in this project.*
