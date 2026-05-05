# CRBOX Cotizar Flow — End-to-End Reference

A complete walkthrough of every touchpoint, from the moment a customer lands on the quote form to the moment their order is complete. Intended for internal team use.

---

## Overview

The cotizar flow is a **no-account-required quote request system**. A customer describes the product(s) they want to buy in the USA, submits the form, and CRBOX responds with a shipping price. The customer then decides whether to proceed.

```
Customer fills form → submits → DB saved → two emails fire →
Customer gets SCB-ID → Admin reviews → Admin responds →
Customer gets response email → Customer decides → Order proceeds
```

---

## Step 1 — Customer Lands on `cotizar.html`

**Page:** `https://crbox.cr/cotizar.html`

The page is fully static HTML/CSS/JS — no login required. A 3-step visual progress bar guides the user:

| Step | What it tracks |
|------|---------------|
| 1 | Product cards filled (name, category, declared value) |
| 2 | Destination province selected |
| 3 | Email address entered |

The progress dots update live as fields are completed.

---

## Step 2 — Filling the Product Card(s)

Each product is a collapsible card. The user can add up to **8 products** per request.

**Fields per card:**

| Field | Notes |
|-------|-------|
| Product URL | Optional — triggers AI extraction if filled |
| Product name | Min 3 characters required |
| Category | Dropdown grouped by type (electronics, clothing, sports, etc.) |
| Declared value (USD) | Placeholder "Ej: 49.99" — must be > $0 |

**AI Extraction (optional, per card):**
If the user pastes a product URL, the page calls `POST /api/ai-extract` on the backend. The backend calls the **Google Gemini API** with the URL and returns structured data:
- Product name
- Declared value in USD
- Category
- Weight (kg) and dimensions (cm) if available

The extraction has a **12-second timeout** (AbortController). If it times out or fails, the user sees a neutral message and can fill fields manually.

After extraction the user sees a badge on each auto-filled field ("Extraído por IA" or "Estimado"). If any field has low confidence, a checkbox appears requiring the user to confirm the data before submitting.

The user can also click **"Ignorar resultados"** to discard the AI data and fill fields manually.

**Live price estimate widget:**
Once a card has a category and declared value, a live shipping estimate appears below that card. This uses `js/tariff-adapter.js` → `js/calculator-engine.js` to compute an estimated range (aéreo or marítimo) based on category weight rules and the declared value. This is an estimate only — not the confirmed price.

**Duplicate check:**
When the user submits, before the API call fires, the page calls `POST /api/solicitudes/check-duplicate` for **each product card**, sending the user's email + the product URL/name. If a matching active quote was submitted in the last 48 hours, a warning banner appears with a link to the existing quote. The user can dismiss it and submit anyway.

---

## Step 3 — Filling Contact & Delivery Info

Below the product cards:

| Field | Notes |
|-------|-------|
| Service type | Toggle button: **Aéreo** (default) or **Marítimo** |
| Destination province | Dropdown: 7 Costa Rican provinces |
| Full name | Optional |
| Email | Required — validated live and on blur |
| Notes | Optional, max 500 characters with live counter |

**Remote zone hint:** If the user selects Guanacaste, Puntarenas, or Limón, a note appears below the province selector warning about a possible remote-zone surcharge.

**Service type hints:**
- Aéreo: "Más rápido, ideal para electrónica, ropa y artículos menores a 50 kg."
- Marítimo: "Ideal para muebles, electrodomésticos y cargas mayores. Tiempo estimado: 4–8 semanas."

---

## Step 4 — Submit Button Logic

The submit button (and the sticky bottom bar version) stays **disabled** until:
- Every product card has name (≥3 chars) + category + declared value (>0)
- Destination province is selected
- A valid email address is entered
- If AI extraction was used on any card, the confirmation checkbox on that card is checked

While the form is partially filled but not ready, an amber hint appears: "Completa los campos requeridos para enviar."

---

## Step 5 — Form Submission (`POST /api/solicitudes`)

**Endpoint:** `POST /api/solicitudes`

The browser sends a JSON payload:

```json
{
  "products": [
    {
      "name": "iPhone 15 Pro",
      "category": "celulares",
      "declared_value_usd": 999.00,
      "url": "https://apple.com/...",
      "data_source": "ai_extracted"
    }
  ],
  "service_type": "aereo",
  "destination_zone": "sanjose",
  "customer_email": "cliente@gmail.com",
  "customer_name": "Juan Pérez",
  "customer_notes": "Prefiero caja reforzada",
  "account_type": "anonymous"
}
```

If the user is **logged into the CRBOX portal**, the request also includes `Authorization: Bearer <token>` and `X-Casillero-Email` headers. The server verifies these against the CRBOX Portal API and, if valid, stores the user's casillero ID on the record — linking the quote to their account.

**What the server does:**

1. Validates all fields (product name ≥3 chars, email format, value > 0).
2. Generates a unique **SCB-ID** (e.g. `SCB-00842`).
3. Writes the record to **SQLite** (`quote_requests` table) with status `enviada`.
4. Writes the first entry to the `quote_status_history` table: `null → enviada`.
5. Sets an **expiry date** 30 days from submission.
6. Fires two emails in sequence (see Step 6).
7. Returns `{ "ok": true, "id": "SCB-00842" }` to the browser.

**If the draft was saved:** `cotizar.html` auto-saves the form state to `localStorage` every time a field changes. On a failed submission or browser refresh, the data is restored. On successful submission the draft is cleared.

---

## Step 6 — Two Emails Fire Immediately

### 6a. Customer Confirmation Email

**To:** the customer's email address  
**From:** `ventas@crbox.cr`  
**Subject:** `[SCB-XXXXX] Recibimos tu solicitud — CRBOX`

Contents:
- Their SCB-ID prominently displayed
- Summary table: product(s), declared value(s), service type, destination
- 3-step "what happens next" section:
  1. CRBOX reviews the request (within 24 business hours)
  2. They receive a response email with the shipping price
  3. They confirm and CRBOX handles the purchase
- Link to track status: `https://crbox.cr/solicitud?id=SCB-XXXXX`
- WhatsApp link in the footer for questions

### 6b. Internal Sales Notification Email

**To:** `ventas@crbox.cr`  
**From:** `ventas@crbox.cr`  
**Subject:** `[SCB-XXXXX] Nueva solicitud — [product name(s)] | CRBOX`

For multi-product requests, the subject names all products. Contents:
- Full summary of all fields including AI data source, casillero ID (if linked), weight/dimensions if provided
- Direct link to the admin panel record

---

## Step 7 — Customer Success Screen

After the server returns `200 OK`, the form hides and a success screen appears showing:
- The SCB-ID in large text
- A summary of what was submitted (all products, service, destination, email)
- 3 visual next-step cards (review, response email, proceed)
- A soft invitation to create an account (pre-filled with their email)
- A "Nueva cotización" button to start fresh

**If the confirmation email failed to send (SMTP error):** A different screen appears (amber/warning style) telling them the request was saved with their ID but no email arrived, and directing them to WhatsApp with a pre-filled message including the SCB-ID.

**If the entire submission failed:** A red error screen appears with a retry button and a WhatsApp fallback link pre-filled with all their product details in plain text.

---

## Step 8 — Customer Tracks at `solicitud.html`

**URL:** `https://crbox.cr/solicitud.html?id=SCB-XXXXX`

The page calls `GET /api/solicitudes/SCB-XXXXX` to load the record. No login required — the SCB-ID itself acts as the access key.

**What the customer sees:**
- Current status with a human-readable label and explanatory copy
- Product detail card (name, category, declared value, destination zone, service type)
- Weight and dimensions if present — hidden if absent
- Timeline of all status changes in chronological order (oldest → newest)

**Status states visible to the customer:**

| Status | What the customer sees |
|--------|----------------------|
| `enviada` | "Recibimos tu solicitud" — waiting for review |
| `en_revision` | "Estamos revisando tu pedido" — with 24-hour expectation copy |
| `respondida` | "Ya tienes una respuesta" — prompts them to check email |
| `pendiente_compra_crbox` | CRBOX is purchasing on their behalf |
| `pendiente_confirmacion_pago_cliente` | Awaiting their payment confirmation |
| `pagado_por_cliente` | Payment confirmed |
| `comprado` | Item purchased by CRBOX |
| `listo_para_retiro` | Ready to pick up |
| `completada` | Done |
| `cancelada` | Cancelled |
| `expirada` | Quote expired (30-day limit) |

**Cancel button:** Displayed only on statuses where cancellation is allowed. Styled in low-emphasis gray to avoid accidental taps.

---

## Step 9 — Admin Panel Reviews the Quote

**URL:** `/admin` (password-protected, session TTL 8 hours, brute-force lockout after 5 failures in 15 minutes)

The admin sees a table of all quote requests, filterable by status. Clicking a record opens the detail view.

**Detail view contains:**
- All customer and product data
- AI extraction data (confidence scores, fields needing confirmation highlighted)
- Full status history timeline
- A shipping cost calculator (pre-loaded with the product's weight/dimensions if available)
- A response form

**Admin shipping calculator (A-2):**
The calculator lets the admin enter weight, dimensions, declared value, and category for each product (up to matching the number of items in the quote). It computes:
- Consolidated shipping cost (all items in one shipment)
- Separate shipping cost (each item individually)
- Savings from consolidation

The calculator state is **auto-saved to `localStorage`** keyed by SCB-ID, so if the admin navigates away and returns, the numbers are restored with a "Valores restaurados del borrador anterior" note.

**Live email preview (A-3):**
As the admin types the response message, a live preview panel shows what the customer's email will look like. It can be collapsed/expanded with a toggle button.

**Response form fields:**

| Field | Notes |
|-------|-------|
| Availability | Dropdown: Disponible / No disponible / Disponible con condiciones |
| Confirmed shipping price (USD) | Must be > $0 (guarded by frontend validation) |
| Delivery timeline | Free text (e.g. "10–15 días hábiles") |
| Conditions | Optional — appears as an amber block in the customer email |
| Difference explanation | Optional — explains if price differs from the estimate |
| Message to customer | Free text — the personal note from the team |
| Breakdown JSON | Auto-filled when the admin clicks "Apply" on the calculator |

---

## Step 10 — Admin Sends the Response

The admin clicks "Enviar respuesta". This calls `POST /api/admin/respond/:scb_id`.

The server:
1. Validates the token (X-Sales-Token header).
2. Updates the record status to `respondida`.
3. Stores the confirmed price, breakdown, availability, conditions, and message.
4. Sends the **response email** to the customer.

### Response Email to Customer

**Subject:** `[SCB-XXXXX] Tu cotización de CRBOX está lista — [product name(s)]`

Contents depend on availability:
- **Disponible** (green header): shows confirmed shipping price in orange, delivery timeline, full cost breakdown table (freight, fuel surcharge, handling, taxes, insurance, delivery), conditions if any, the admin's personal message, and a "Ver mi solicitud" button.
- **No disponible** (gray header): shows a red block explaining the item can't be purchased through CRBOX at this time.
- **Disponible con condiciones** (amber header): shows the price with a conditions block.

Footer of all response emails:
- WhatsApp link: "¿Tienes dudas? Escríbenos por WhatsApp"
- Reply-to: the customer can reply directly to the email

---

## Step 11 — Reminder Email (Automated)

If the customer's quote moves to `respondida` but they haven't acted within a configured number of hours (default: 48), the system sends a **reminder email** automatically.

The reminder runs in a background thread (`_solicitud_reminder_loop`) that wakes up every 5 minutes (configurable via `SMTP_HEALTH_INTERVAL`) and checks for quotes in `respondida` status older than the threshold.

**Reminder email contents:**
- SCB-ID, product name, quoted shipping price
- Expiry date of the quote
- "Ver mi solicitud" button
- Gentle note that they can ignore the email if they've already decided

Each quote is only reminded once (the system marks it as reminded after sending).

---

## Step 12 — Customer Decides

The customer returns to `solicitud.html` and either:

**Proceeds:** Clicks the intent button (e.g. "Quiero que CRBOX compre por mí" or "Yo compro, solo necesito el envío"). This calls `POST /api/solicitudes/:id/intent`. The admin sees the updated intent in the panel and moves the status forward.

**Cancels:** Clicks the cancel button on the status page. This calls `POST /api/solicitudes/:id/cancel`. Status moves to `cancelada`.

**Does nothing:** After 30 days the record auto-expires (`expirada`).

---

## Data Stored Per Quote (SQLite `quote_requests` table)

| Column | Description |
|--------|-------------|
| `id` | SCB-ID (e.g. SCB-00842) |
| `casillero_id` | Linked portal account ID (if authenticated) |
| `customer_email` | Customer's email |
| `customer_name` | Optional |
| `account_type` | `anonymous`, `personal`, or `business` |
| `product_name` | Primary product name |
| `products` | JSON array of all product cards |
| `declared_value_usd` | Primary product value |
| `category` | Primary product category |
| `product_url` | Primary product URL |
| `weight_kg`, `length_cm`, `width_cm`, `height_cm` | Physical dimensions if provided |
| `service_type` | `aereo` or `maritimo` |
| `destination_zone` | Province |
| `estimate_usd` | Live estimate shown on the form |
| `estimate_breakdown` | JSON breakdown of that estimate |
| `data_source` | `manual`, `ai_extracted`, or `ai_partial` |
| `ai_extraction_json` | Full raw AI result |
| `customs_description` | Customs text extracted by AI |
| `status` | Current status |
| `submitted_at` | Submission timestamp |
| `expires_at` | 30 days after submission |
| `responded_at` | When admin sent the response |
| `confirmed_shipping_price_usd` | The price the admin quoted |
| `quote_breakdown` | JSON cost breakdown from admin calculator |
| `completed_at`, `cancelled_at` | Lifecycle timestamps |

---

## Key Files

| File | Role |
|------|------|
| `cotizar.html` | The public quote form (all UI and JS inline) |
| `js/ai-extractor.js` | AI product data extraction logic |
| `js/tariff-adapter.js` | Fetches category rate data for live estimate |
| `js/calculator-engine.js` | Core shipping cost math |
| `js/product-categories.js` | Category definitions and weight rules |
| `solicitud.html` | Customer status tracking page |
| `js/solicitud.js` | Status page logic and rendering |
| `server.py` | All backend: API endpoints, DB, email builders, admin panel |
| `knowledge/crbox-kb.json` | Source of truth for Gemini AI prompts |

---

## Error Scenarios

| Scenario | What happens |
|----------|-------------|
| AI extraction times out (>12s) | Neutral banner shown, user fills manually |
| AI extracts low-confidence data | Field highlighted, confirmation checkbox required |
| Product is prohibited (e.g. weapons) | Submit button disabled, compliance card shown |
| Duplicate quote detected | Warning banner with link to existing quote; can dismiss and submit anyway |
| SMTP fails after successful DB save | Amber screen shown, SCB-ID displayed, WhatsApp fallback offered |
| Full submission failure (network/server) | Red error screen with retry button and WhatsApp fallback with pre-filled product details |
| Admin submits $0 price | Browser blocks with alert "El precio de envío debe ser mayor a $0.00" |
