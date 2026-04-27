# CRBOX Quote & Assisted-Purchase Architecture Proposal

**Version:** 1.1  
**Date:** April 2026  
**Status:** Implementation-ready proposal

---

## Table of Contents

1. [Naming Recommendations](#1-naming-recommendations)
2. [Executive Summary & Product Model](#2-executive-summary--product-model)
3. [Public Quote Page](#3-public-quote-page)
4. [Portal Dashboard Quote Entry Point](#4-portal-dashboard-quote-entry-point)
5. [Quotes / Requests List Page](#5-quotes--requests-list-page)
6. [New Quote / Request Flow](#6-new-quote--request-flow)
7. [Quote Detail View](#7-quote-detail-view)
8. [Chat-Assisted Intake Layout](#8-chat-assisted-intake-layout)
9. [AI / Gemini Integration Model](#9-ai--gemini-integration-model)
10. [Quote Integrity Risks](#10-quote-integrity-risks)
11. [State Model](#11-state-model)
12. [Temporary Operational SOP](#12-temporary-operational-sop)
13. [Data Model](#13-data-model)
14. [Quote–Purchase–Package Relationship](#14-quotepurchasepackage-relationship)
15. [Notifications & Communication Model](#15-notifications--communication-model)
16. [Failure States & Edge Cases](#16-failure-states--edge-cases)
17. [Mobile Experience](#17-mobile-experience)
18. [Technical Architecture](#18-technical-architecture)
19. [Phased Rollout Plan](#19-phased-rollout-plan)
20. [Success Metrics](#20-success-metrics)
21. [Best-Practice Recommendations](#21-best-practice-recommendations)
22. [Internal CRBOX Quote-Operations Tool](#22-internal-crbox-quote-operations-tool)
23. [Recommended Implementation Order](#23-recommended-implementation-order)

---

## 1. Naming Recommendations

This section resolves naming before any design or copy work begins. Every section of this document uses the names chosen here.

### 1.1 Candidates Evaluated

| Option | Assessment |
|--------|------------|
| **Cotizaciones** | Accurate but passive — implies just price inquiry, not intent to purchase. Underframes the value of the CRBOX assisted-purchase service. |
| **Solicitudes** | Generic. Works as a portal label but loses the commercial intent. Customers won't understand what they're soliciting. |
| **Solicitudes de compra** | More specific. Captures both the request and the commercial nature. A strong candidate. |
| **Comprar con CRBOX** | Excellent for public-facing CTA copy. Too action-verb-heavy for a nav label or list page title. |
| **Cotizar con CRBOX** | Good for public CTA. Same limitation as above for nav context. |
| **Mis Solicitudes** | Follows the portal's "Mis [X]" naming convention (Mis Paquetes, Mis Facturas). Familiar pattern for returning users. |

### 1.2 Recommendations (Use These Throughout)

| Surface | Recommended Name | Rationale |
|---------|-----------------|-----------|
| **Public-facing flow name** | **Cotizar con CRBOX** | Action-oriented, benefit-forward, clearly CRBOX-specific. Works as a page heading and button label. |
| **Portal nav label** | **Mis Solicitudes** | Follows the established portal convention. Short, scannable, recognizable to returning users. |
| **Dashboard CTA copy** | **Solicitar compra** | Specific enough to signal commercial intent; short enough to fit in a button. |
| **Detail view label** | **Solicitud de compra** | Noun form of the CTA, correct for a page heading and document reference. |
| **Request ID prefix** | **SCB-** | Short for "Solicitud de Compra." Distinguishes from package/invoice IDs in the same portal. |

### 1.3 Copy Usage Map

- Public page heading: "Cotizar con CRBOX"
- Public page subheading: "Cuéntanos qué quieres comprar. Nosotros lo traemos."
- Dashboard CTA button: "Solicitar compra"
- Portal nav item: "Mis Solicitudes"
- List page title: "Mis Solicitudes de Compra"
- New request page title: "Nueva solicitud de compra"
- Detail page title: "Solicitud de compra #SCB-XXXX"
- Status in package list: references to "tu solicitud" (not "cotización")

---

## 2. Executive Summary & Product Model

### 2.1 Strategic Shift

CRBOX operates a shipping calculator today. It estimates costs, handles multiple items, consolidation logic, and tariff lookups. The calculator ends with a quote handoff panel that sends an email or WhatsApp message to the CRBOX sales team.

This proposal defines the architecture for the **next evolution**: a full quote intake and assisted-purchase request system. The shift is meaningful:

| Old model | New model |
|-----------|-----------|
| Calculator → email/WhatsApp handoff | Structured intake → tracked request → sales response → optional purchase |
| Stateless (no memory of past requests) | Stateful (requests persist, can be tracked, duplicated, responded to) |
| Anyone can use; no identity context | Public entry available, but portal carries full account context |
| Sales receives free-text emails | Sales receives structured, validated data with AI-extracted details |
| No confirmation to user | User receives submission confirmation; request has a visible state |

The strategic objective is to make CRBOX the obvious place to go when a Costa Rican customer finds something they want to buy from the USA — before they've figured out the logistics.

### 2.2 Two Distinct Product Surfaces

**Surface A — Public quote page (`/cotizar.html` or a new dedicated page)**  
Job: convert a visitor into a quote requester. Works without an account. Uses AI to extract product data from a pasted URL. Outputs a structured email to CRBOX and a signup conversion prompt.

**Surface B — Portal quote flow (within the existing authenticated portal)**  
Job: let a known CRBOX customer request purchases with full account context, track their requests, and eventually view CRBOX's response. Knows their casillero ID, account type, address, and history.

### 2.3 Shared Logic Layer

Both surfaces use the same:
- AI extraction service (Gemini proxy)
- Quote submission endpoint
- Request ID generation
- Data model (QuoteRequest, QuoteItem)
- Email notification layer

### 2.4 Recommended Product Model

**One object type, one flow.** A "Solicitud de Compra" is the canonical object. It begins when a user submits a product URL or fills a form. It carries state from submission through sales review to response. It may eventually link to a package.

Do not create separate "cotización" and "solicitud" object types — this would require synchronization logic that cannot be maintained in the current operational environment. A single object with a clear state machine is correct.

---

## 3. Public Quote Page

### 3.1 Page Purpose

Convert any visitor — whether they have a CRBOX account or not — into a structured quote requester. Make the experience fast enough that a person on their phone, having found a product on Amazon, can paste the URL and submit in under two minutes.

**URL:** `/cotizar.html` (recommended) or `/solicitar.html`  
**Auth required:** No  
**Conversion goal:** Quote submission → signup prompt

### 3.2 Main User Actions

1. Paste a product URL (optional but primary entry point)
2. Review and correct AI-extracted or manually entered product details
3. Enter contact details (email, optional name)
4. Submit the quote request to CRBOX
5. (Conversion moment) Create an account to track the request in the portal

### 3.3 Key Modules

**A. URL paste field**  
Prominent, at the top. Placeholder: "Pega el enlace del producto que quieres comprar." Input accepts full URLs from any domain. A "Buscar producto" or "Analizar" button triggers extraction. The field should look inviting — not like a developer tool.

**B. AI extraction status indicator**  
Appears below the URL field after submission. Three visible states:
- Extracting: spinner + "Analizando el producto..."
- Partial: amber notice — "Encontramos algunos datos. Revisa y completa los que faltan."
- Failed: neutral notice — "No pudimos leer esta página. Ingresa los datos manualmente."

Always honest. Never claims extraction succeeded if it did not.

**C. Editable field set**  
After extraction (or from blank), the user sees:
- Product name (text)
- Declared value in USD (number)
- Product URL (auto-filled if extracted; editable)
- Product category (dropdown, same taxonomy as calculator)
- Approximate weight in kg (number — never pre-filled by AI)
- Approximate dimensions L×W×H in cm (optional — never pre-filled by AI)

Each field that was AI-extracted carries a visible amber "Verificar" badge. Fields that are blank require manual entry. Weight and dimensions are always blank — the user must enter these manually if they know them.

**D. Shipping estimate result**  
After the user enters weight and destination, a live estimate appears using the same engine as `calculator-engine.js`. This is clearly labeled as an estimate. The intent is to give the user a ballpark so the quote doesn't feel like a black box.

**E. Send-to-CRBOX CTA**  
A primary button: "Enviar solicitud a CRBOX." Disabled until the user has entered at minimum: product name, declared value, and email address. On success, a confirmation panel replaces the form.

**F. Signup conversion moment**  
After successful submission, a panel appears:  
Heading: "¿Quieres seguir el estado de tu solicitud?"  
Body: "Crea tu cuenta CRBOX gratis y lleva un registro de todas tus compras."  
CTA: "Crear cuenta" → links to `/afiliate.html?email=[prefilled]&source=quote`  
Secondary: "Continuar sin cuenta" → dismisses to a simple success state  
The email they provided is pre-filled in the registration form to avoid re-entry.

### 3.4 Important States

| State | What the user sees |
|-------|-------------------|
| Initial | URL paste field, brief description of the service |
| Extracting | Spinner in URL field area, rest of form dimmed |
| Partial extraction | Fields partially filled, amber "Verificar" badges, prompt to complete |
| Manual fallback | Empty form, prompt to fill manually, no AI indicator |
| Estimate ready | Estimated cost visible; "Enviar solicitud" button enabled |
| Sent (anonymous) | Confirmation + conversion prompt |
| Sent (already logged in) | Confirmation + "Ver solicitud en tu portal" link |
| Conversion prompt | Signup invitation with pre-filled email |

### 3.5 Mobile Layout

On small screens (< 640px):  
- URL paste field spans full width; "Analizar" button is a separate row below, full width
- Fields stack vertically, one per row
- Estimate appears as a collapsed card that expands on tap
- "Enviar solicitud" is a sticky bottom button once the form has at least one field filled
- Conversion prompt uses a bottom sheet style (slides up), not an inline panel

---

## 4. Portal Dashboard Quote Entry Point

### 4.1 Recommended Module Type

A full-width card in the dashboard main content area, positioned below the casillero card and above the package stats. Not a small button — this is a primary action that needs discovery surface.

### 4.2 Card Design

```
┌────────────────────────────────────────────────────────┐
│  🛍  Solicitar compra con CRBOX                        │
│  ¿Encontraste algo que quieres comprar desde USA?       │
│  Pega el enlace y nosotros te damos un estimado.        │
│                                                         │
│  [Solicitar compra →]    [Mis solicitudes →]           │
└────────────────────────────────────────────────────────┘
```

- Background: subtle warm orange tint (orange-50) with an orange-100 border
- Primary CTA routes to `/mis-solicitudes.html?new=1` (new request flow)
- Secondary CTA routes to `/mis-solicitudes.html` (the list)
- If the user has 1+ active solicitudes, show a badge count next to "Mis solicitudes"

### 4.3 Placement Within the Dashboard

Insertion point: after the welcome banner, before the package stats grid. The card should feel like a peer feature to packages and invoices — not an afterthought.

### 4.4 What the Dashboard Shows vs. the Dedicated Page

Dashboard shows:
- Entry CTA
- Count of active solicitudes (pending/in-review)
- At most 2 recent solicitudes as compact rows with status badge

The dedicated `mis-solicitudes.html` page shows:
- Full list with filters
- Archived/completed solicitudes
- All detail actions

---

## 5. Quotes / Requests List Page

### 5.1 Page Purpose

Give the authenticated user a single place to see all their purchase requests — active and historical — with enough context to understand status without opening each one.

**URL:** `/mis-solicitudes.html`  
**Auth required:** Yes  
**Portal nav label:** Mis Solicitudes

### 5.2 List View Columns

| Column | Content |
|--------|---------|
| ID | SCB-XXXX (clickable → detail) |
| Producto | Product name (truncated to 40 chars) + category badge |
| Fecha | Submission date (DD/MM/YYYY) |
| Estado | Customer-facing status badge (see Section 11) |
| Valor declarado | USD amount |
| Acciones | "Ver" link; "Duplicar" button; "Cancelar" (if cancellable) |

### 5.3 Active vs. Archived States

**Active:** Any request in states `enviada`, `en_revision`, or `respondida`. These appear in the main list.

**Archived:** Requests in states `completada`, `cancelada`, or `expirada`. These are moved to a collapsible "Historial" section below the active list, not deleted.

### 5.4 Empty State

When no requests exist:
- Icon: shopping bag outline
- Heading: "Aún no tienes solicitudes de compra"
- Body: "¿Encontraste algo en Amazon, eBay u otra tienda? CRBOX lo trae por ti."
- CTA: "Hacer mi primera solicitud" → routes to new request flow

### 5.5 Filter and Sort Options

| Filter | Options |
|--------|---------|
| Estado | Todas, Enviada, En revisión, Respondida, Completada, Cancelada |
| Período | Último mes (default), Últimos 3 meses, Último año, Todo el historial |
| Categoría | All category codes from the tariff taxonomy |

Sort: Más recientes (default), Más antiguas, Por valor declarado.

### 5.6 List Hygiene Over Time

- Requests in `expirada` state auto-archive after 90 days of inactivity (future automation — now done manually by sales)
- Requests in `completada` or `cancelada` state collapse into the Historial section immediately on status change
- The active list should never show more than 20 rows before pagination kicks in
- Duplicating an old request creates a fresh `SCB-XXXX` with `enviada` status, pre-filling all fields from the original (user must review before re-submitting)

### 5.7 Duplication Flow

"Duplicar" opens the new request form pre-filled with the original request's data. A banner says: "Duplicada de SCB-XXXX — revisa los datos antes de enviar." All fields are editable. On submit, a new request ID is created; the original is unmodified.

---

## 6. New Quote / Request Flow

### 6.1 Step-by-Step Flow

The flow is a single-page progressive form, not a multi-page wizard. Steps reveal naturally as the user completes prior ones.

**Step 1 — Product URL (optional)**  
URL input with "Analizar" trigger. Extraction runs. Fields pre-fill with confidence indicators. If no URL, user skips to Step 2.

**Step 2 — Product details review / entry**  
Fields: product name, declared value (USD), category, product URL (if not entered in Step 1), optional description for CRBOX, approximate weight (kg), approximate dimensions (cm, optional).

If AI extracted data: all pre-filled fields carry amber "Verificar" badges. User must visually confirm each one. No field is silently accepted.

**Step 3 — Shipping preferences**  
- Service type: Aéreo (default) / Marítimo (for heavy/large only)
- Destination zone: same options as calculator (San José, Heredia, Alajuela, Cartago, Zona alejada)
- These are pre-filled from the user's account address (Build Next dependency — for now, default to blank)

**Step 4 — Shipping estimate (optional)**  
If weight was entered in Step 2, show a live estimate using the calculator engine. Estimate is clearly labeled as preliminary. This step is skipped if weight is blank.

**Step 5 — Review & confirm**  
Summary card showing all entered data. Two CTAs:
- "Enviar solicitud" (primary, orange)
- "Editar" (secondary, links back to the relevant step)

An explicit notice: "Al enviar, CRBOX revisará tu solicitud y te contactará con el precio final antes de proceder."

**Step 6 — Confirmation**  
Success screen with:
- Request ID (SCB-XXXX)
- "Tu solicitud fue recibida. Te contactaremos por email a [email] en breve."
- "Ver mis solicitudes" CTA
- Optionally: WhatsApp link to follow up

### 6.2 Required vs. Optional Fields

| Field | Required | Notes |
|-------|----------|-------|
| Product name | Yes | Min 3 chars |
| Declared value (USD) | Yes | Must be > 0 |
| Product URL | No | Strongly recommended for CRBOX review |
| Category | Yes | Default: "otros" is acceptable |
| Weight (kg) | No | Needed for estimate; not needed to submit |
| Dimensions (cm) | No | Optional; helps estimate |
| Destination | No | Default: blank; filled from account later |
| Description for CRBOX | No | Free text, 500 chars max |

### 6.3 Known Customer Context (Portal Only)

When the request is submitted from the portal:
- Casillero ID is automatically attached to the request (no user input needed)
- Email is pre-filled from the session (not editable in the form — pulled from account)
- Account type (personal / business) is attached from `isCompany` in getuserinfo

### 6.4 Personal vs. Business Account Treatment

Account type (`personal` / `business` / `anonymous`) is attached to every QuoteRequest from the portal session. It is surfaced in the sales submission email and in any internal tool. The differences below are deliberate and should be implemented as described, not collapsed into one generic flow.

**UX and Copy**

| Element | Personal | Business |
|---------|----------|----------|
| Form heading | "Nueva solicitud de compra" | "Nueva solicitud de compra — Cuenta empresarial" |
| Declared value label | "Valor del producto (USD)" | "Valor del producto (USD) — para efectos aduaneros" |
| Description placeholder | "¿Algo que CRBOX deba saber sobre este pedido?" | "Número de orden, referencia interna, o notas para facturación" |
| Invoice notice | None shown | "Esta solicitud se facturará a tu cuenta empresarial." |

In Build Now, these are copy differences only — no separate form structure. The form is the same; only labels and placeholder text change based on `isCompany` from the session. In Build Next, the form can add a "CÉDULA JURÍDICA o RUC" field for business accounts.

**Operational Handling by Sales**

| Dimension | Personal | Business |
|-----------|----------|----------|
| Declared value ceiling | Standard personal limits per TICA | Business accounts may declare higher values; sales confirms before proceeding |
| Product verification depth | Standard review | Deeper review required for business categories (office equipment, inventory items) |
| Regulated category check | Standard | Sales must explicitly check whether the item is permitted for commercial import at the stated quantity |
| Quantity threshold | 1 unit assumed | Sales asks if business quantity ≥ 3 units — commercial import rules may apply |

**SLA and Priority**

In Build Now: no differentiation. Sales processes requests in submission order.

In Build Next (recommended): Business accounts receive a 24-hour response SLA vs. 48 hours for personal. The submission email to ventas@crbox.cr includes a visible `[EMPRESA]` tag in the subject line for business accounts so sales can identify and prioritize them without opening the email body.

```
Subject format (business): [SCB-XXXX] [EMPRESA] Solicitud de compra — [Product] — [Email]
Subject format (personal): [SCB-XXXX] Solicitud de compra — [Product] — [Email]
```

**Invoicing Assumptions**

| Assumption | Personal | Business |
|------------|----------|----------|
| Tax document | Tiquete / Consumidor final | Factura electrónica (requires cédula jurídica) |
| IVA treatment | Standard 13% on applicable categories | Same 13% IVA; may require deductibility documentation |
| Factura recipient | Customer's name and email | Company name + cédula jurídica + email |
| Invoice destination | Sent with final price confirmation | Sent to billing contact (may differ from submitter) |

In Build Now: invoicing happens outside the portal (same as today). The account type field tells sales which document type to issue. No portal-native invoice generation yet.

**Internal Workflow Flags**

The QuoteRequest `account_type` field drives three specific behaviors in the internal tool (Build Next):

1. **Subject tag:** `[EMPRESA]` prepended in the submission email subject for instant visual triage
2. **Detail flag:** Business requests show a "CUENTA EMPRESARIAL" badge in the request detail view so sales never mistakes them for personal requests
3. **Regulated category alert:** If a business account submits a request in the `computadora`, `electrodomestico`, or `equipo_medico` categories, the internal tool shows: "Esta solicitud podría estar sujeta a regulaciones de importación comercial. Verificar antes de responder."

These flags require the internal tool to read — they cannot be automated in the Build Now email phase. In Build Now, sales applies judgment based on the `Tipo de cuenta: Empresa` line in the structured submission email.

### 6.5 Single-Item vs. Multi-Item: The Explicit Decision

**The Build Now default is single-item per request. This section defends that decision, describes a lighter multi-item alternative that avoids full complexity, and sets out the criteria for when true multi-item requests become worth building.**

**The case for single-item Build Now**

1. **Operations are not ready for batched review.** Today, each quote request is a single email. Sales reviews one product URL, checks one declared value, and responds with one price. If a request contains three items, sales must either respond to all three in one email (complex) or split the email into sub-threads (operationally confusing). The email-based SOP in Section 12 is not designed for multi-item review.

2. **The estimate calculation is single-item.** The `calculator-engine.js` produces a per-item shipping estimate. Multi-item consolidation logic — where combined weight and volumetric calculations interact with zone pricing — is significantly more complex and not validated for this use case yet.

3. **The data model already supports multi-item without migration cost.** The `QuoteItem` object in Section 13.2 is defined and includes `quote_request_id` and `sort_order`. Nothing is lost by starting single-item. When multi-item ships in Build Next, no data migration is needed. This is the right place to absorb future complexity.

4. **Low upfront volume makes multi-item marginal.** At the expected volume in the first weeks of Phase 1, most customers will have one item per request. Building multi-item UI, multi-item email layout, and multi-item estimate display to serve 5% of initial users is not a good trade.

**The lighter alternative: session-linked multiple requests**

Rather than a single QuoteRequest containing multiple items, Build Now supports what we call **session-linked requests**: when a user completes a submission, the confirmation screen includes a "Solicitar otro producto" CTA. This starts a new QuoteRequest in the same session, not a child item in the existing one.

From the user's perspective: they submitted two products. From the system's perspective: two independent SCB-XXXX IDs were created, both processed separately by sales, both visible in "Mis Solicitudes." No complex multi-item logic is needed anywhere.

This approach is recommended over multi-item for Build Now because:
- It requires zero additional data model work
- Sales receives two clean single-item emails instead of one complex multi-item email
- The user's experience is not materially worse — both requests are visible and tracked

```
Confirmation screen after submission:

  ✓ Tu solicitud SCB-0042 fue enviada.
  
  ¿Tienes otro producto que quieras solicitar?
  [Solicitar otro producto]    [Ir a Mis Solicitudes]
```

**When to build true multi-item requests (Build Next criteria)**

Build multi-item QuoteRequests when all three of the following are true:
1. An internal tool exists so sales can review batched items in a structured view (not email)
2. Consolidation shipping estimates are validated and the calculator engine is updated to support multi-item weight/volume combinations
3. Request volume shows that > 20% of sessions result in "Solicitar otro producto" being clicked (indicating grouped purchase intent that would benefit from true bundling)

Until all three are met, session-linked multiple requests is the correct implementation.

### 6.6 Draft Preservation

If the user has started filling the form and navigates away or closes the tab:
- **Now:** No persistence. User starts over. A notice warns: "Tu solicitud no ha sido enviada." before navigation (browser `beforeunload` event).
- **Next:** LocalStorage draft save keyed to `[casilleroId]-draft-solicitud`. Restore prompt on return: "Tienes una solicitud en progreso. ¿Continuar donde la dejaste?"

---

## 7. Quote Detail View

### 7.1 What the User Sees

**Header:**
- Request ID (SCB-XXXX)
- Status badge (customer-facing label)
- Submission date
- "Cancelar solicitud" button (only if state allows)
- "Duplicar solicitud" button (always available)

**Product card:**
- Product name
- Product URL (clickable)
- Declared value
- Category
- Weight and dimensions (if provided)
- AI extraction notice (if applicable): "Datos obtenidos con IA — verificados por el usuario el [date]."

**Shipping estimate (if weight was provided):**
- Same dossier layout as the calculator results
- Labeled clearly as "Estimado — sujeto a confirmación por CRBOX"

**Timeline:**
- Ordered list of status transitions with timestamps and actor (user / CRBOX)
- Shown in reverse chronological order (newest first)

### 7.2 Active Request State (No Response Yet)

Shows a neutral information panel:  
"CRBOX está revisando tu solicitud. Te notificaremos por email cuando tengamos novedades."

No response fields, no action other than cancel or duplicate.

### 7.3 Responded State

When CRBOX has responded (during the transitional manual phase):  
A "respondida por email" notice appears:  
"CRBOX respondió a esta solicitud. Revisa tu correo ([email]) para ver los detalles del precio final."

This is intentionally humble — no portal-native response display yet (that requires the internal tool described in Section 22).

### 7.4 Completed State

Shows a read-only summary. If a package was later linked (future feature), shows a "Paquete relacionado: #[package ID]" link.

### 7.5 Available Actions by State

| State | Cancel | Duplicate | Follow up (WhatsApp) |
|-------|--------|-----------|----------------------|
| enviada | Yes | Yes | Yes |
| en_revision | No | Yes | Yes |
| respondida | No | Yes | No (email was sent) |
| completada | No | Yes | No |
| cancelada | No | Yes | No |
| expirada | No | Yes | No |

---

## 8. Chat-Assisted Intake Layout

### 8.1 Primary Recommendation: Form-with-AI-Panel (Split View)

**Recommendation:** A split-panel layout where the left side is a structured form and the right side is an AI conversation assistant. This is the correct choice for CRBOX's use case for three reasons:

1. The data that must be collected is **structured** (name, value, weight, category) — a pure chat interface makes it harder, not easier, to fill structured fields
2. Mobile users cannot see both panels simultaneously — a chat-only interface collapses better than a form-only interface
3. The AI assistant can ask clarifying questions for ambiguous fields without taking over the entire interaction

Alternatives considered and rejected:
- **Full chat only:** Too much latency for simple inputs (product name, value). Users would rather type in a field than explain it in chat.
- **Full form only:** No AI value added. Misses the extraction opportunity.
- **AI pre-fills silently, form confirms:** Correct for simple fields but bad for weight/dimensions — creates false confidence.

### 8.2 Recommended Layout (Desktop)

```
┌──────────────────────┬──────────────────────────────────┐
│  DETALLES           │  ASISTENTE CRBOX                 │
│  (structured form)  │  (chat panel)                    │
│                     │                                  │
│  Producto: [___]    │  ┌────────────────────────────┐  │
│  Valor: $[___]      │  │ Hola. ¿Qué quieres comprar?│  │
│  Categoría: [▼]     │  └────────────────────────────┘  │
│  Peso: [___] kg     │                                  │
│  Dimensiones:       │  [texto aquí...]                 │
│  L[__] W[__] H[__]  │                                  │
│                     │  ┌─────────────────────────────┐ │
│  ← AI fills fields  │  │ ¿Cuánto pesa aproximado?    │ │
│    as user chats    │  └─────────────────────────────┘ │
│                     │                                  │
│  [Revisar y enviar] │  [Enviar mensaje_____________↵]  │
└──────────────────────┴──────────────────────────────────┘
```

The left panel updates in real time as the chat assistant extracts or clarifies information. The user can also edit fields directly in the form — the chat does not override manual edits.

### 8.3 Opening Message

The AI sends the first message — the user does not start cold:

> "Hola. Soy el asistente de CRBOX. Puedo ayudarte a preparar tu solicitud de compra. ¿Tienes el enlace del producto que quieres traer? Si no, cuéntame qué es y cuánto cuesta."

### 8.4 How Missing Fields Are Surfaced

If a required field (name, value) is still blank after the user has provided two messages, the assistant asks specifically:

> "Para continuar, necesito saber: ¿cuál es el precio del producto en dólares?"

The corresponding form field highlights with an amber ring to show which field is being asked about.

### 8.5 How Uncertainty Is Shown

When the AI is uncertain about a field value:
- The form field shows the suggested value in a lighter color with a "Confirmar" button inline
- The chat message says: "Parece que el precio es $89. ¿Es correcto?"
- The user can reply "Sí" or correct it in chat or in the field directly

### 8.6 Transition from Chat to Review

When all required fields have values (from AI or user):
- The chat assistant sends: "Ya tengo toda la información. ¿Quieres revisar y enviar tu solicitud?"
- The left panel shows a "Revisar solicitud" button that scrolls to a summary view
- The chat is collapsed on mobile

### 8.7 Abandonment and Resume

- If the user closes mid-chat, their messages and the current field state are saved to `sessionStorage`
- On return, the assistant resumes: "Veo que tienes una solicitud en progreso. ¿Quieres continuar?"
- Sessions older than 24 hours are discarded

### 8.8 Mobile Collapse Behavior

On small screens (< 768px):
- Default view: form only (chat collapsed)
- A "Pedir ayuda al asistente" button at the bottom expands the chat in a bottom sheet
- The bottom sheet slides up over the form (does not replace it)
- When the chat updates a field, the bottom sheet minimizes and the form field shows the new value highlighted briefly in amber
- "Ver formulario" button at the top of the bottom sheet collapses it

---

## 9. AI / Gemini Integration Model

### 9.1 JSON Data Contract

Every AI extraction call returns an `AIExtractionResult` object with the following contract:

```json
{
  "request_id": "SCB-XXXX",
  "source_url": "https://www.amazon.com/...",
  "extracted_at": "2026-04-27T14:32:00Z",
  "model": "gemini-2.0-flash",
  "fields": {
    "product_name": {
      "value": "Sony WH-1000XM5 Wireless Headphones",
      "confidence": 0.97,
      "provenance": "extracted",
      "source_attribute": "og:title"
    },
    "declared_value_usd": {
      "value": 279.99,
      "confidence": 0.91,
      "provenance": "extracted",
      "source_attribute": "og:price:amount"
    },
    "category": {
      "value": "auricular_telefono",
      "confidence": 0.78,
      "provenance": "inferred",
      "source_attribute": null,
      "inference_note": "Inferred from product name keywords"
    },
    "weight_kg": {
      "value": null,
      "confidence": 0.0,
      "provenance": "missing",
      "source_attribute": null
    },
    "dimensions_cm": {
      "value": null,
      "confidence": 0.0,
      "provenance": "missing",
      "source_attribute": null
    },
    "color": {
      "value": "Black",
      "confidence": 0.85,
      "provenance": "extracted",
      "source_attribute": "og:description"
    }
  },
  "page_readable": true,
  "partial": true,
  "extraction_warnings": [
    "Price may include taxes depending on delivery location",
    "Weight not available on merchant page"
  ]
}
```

### 9.2 Provenance Values

| Provenance | Meaning | UI Badge |
|------------|---------|----------|
| `extracted` | Directly read from a page element or meta tag | No badge needed if confidence ≥ 0.85 |
| `inferred` | Derived by the model from context | Amber "Verificar" badge always shown |
| `missing` | Not found or not applicable | Field left blank, user must fill |
| `needs_confirmation` | Value found but ambiguous (e.g. multiple prices) | Red "Confirmar" badge shown |

### 9.3 Confidence Thresholds and UI Behavior

| Confidence | UI behavior |
|------------|-------------|
| ≥ 0.90 | Field pre-filled, amber "Verificar" badge shown |
| 0.70–0.89 | Field pre-filled in lighter color, amber "Confirmar" badge, explicit user tap required |
| < 0.70 | Field not pre-filled; suggestion shown as placeholder text only |
| 0.0 (missing) | Field blank, no suggestion |

### 9.4 What Today's Gemini Does Well

- Product name extraction from `og:title`, `<title>`, `h1` — confidence typically 0.90–0.99
- Price extraction from `og:price:amount`, `meta[property="product:price:amount"]`, visible price text — confidence 0.75–0.95 depending on merchant
- Color/variant extraction from title and description — confidence 0.70–0.90
- Category inference from product name keywords — confidence 0.65–0.85

### 9.5 What Today's Gemini Does Only Partially

- Price disambiguation when multiple prices appear (sale vs. list price) — confidence < 0.80
- Category for ambiguous items (e.g. "case" could be phone case or carrying case) — confidence 0.50–0.75
- Color when multiple variants are listed — confidence 0.50–0.70
- Brand extraction when it requires understanding context — confidence 0.60–0.80

### 9.6 What Should Never Be AI-Sourced

These fields must always require explicit manual user entry, with no AI pre-fill ever:

- **Weight (kg):** Physical measurement not available on merchant pages. AI inference would be dangerously wrong (a power bank and a dumbbell with similar-sounding names). Field is always blank; user always enters.
- **Dimensions (L×W×H cm):** Same reason. Occasionally available in product specs, but unreliable enough to create systematic quote errors.
- **Declared value for customs purposes:** AI may extract a "price" but the customs declared value has specific legal implications and must be confirmed by the user.

### 9.7 Conceptual Prompt Structure

The prompt to Gemini should:
1. Provide the page HTML or extracted text (after proxy server fetches it)
2. Ask for a JSON response matching the data contract above
3. Explicitly instruct the model to return `provenance: "missing"` rather than inventing values
4. Include a list of the exact CRBOX category codes so the model can map correctly
5. Include a note that weight and dimensions should always be returned as `missing`

### 9.8 Infrastructure Required Beyond an API Key

- **Server-side proxy endpoint** (`/ai/extract?url=...`): The extraction call must happen server-side, not client-side. Reasons: (a) CORS restrictions prevent direct fetching of merchant pages from the browser; (b) the Gemini API key must not be exposed in client JS; (c) rate limiting must be enforced.
- **Page fetching service**: The proxy must be able to fetch the target URL and pass its HTML to Gemini. Some merchants block server-side fetches. A fallback must exist.
- **Caching**: Extraction results for the same URL should be cached for 15 minutes to avoid redundant Gemini calls during a session.
- **Rate limiting**: Per-IP rate limit of 10 extraction calls per hour. Per-request timeout of 10 seconds.

This infrastructure is a **Build Next** dependency (see Section 19). It does not exist today.

### 9.9 Human Review Boundary

| Field type | Who should verify |
|------------|------------------|
| Product name (confidence ≥ 0.90) | User confirms visually — no explicit action required |
| Product name (confidence < 0.90) | User must explicitly click "Confirmar" |
| Declared value (any confidence) | User must explicitly click "Confirmar" — value has customs implications |
| Category (any confidence) | User must explicitly select from dropdown — AI suggestion is a pre-selection only |
| Weight | User always enters manually |
| Dimensions | User always enters manually |

### 9.10 Extraction Quality by Merchant Source Type

Not all merchants are equal. The AI extraction system's reliability depends heavily on how the merchant's page is built. The table below classifies expected extraction quality by source type. This classification informs both user-facing copy decisions and operational expectations for sales.

| Source Type | Representative Sites | What the AI Gets Right | What the AI Gets Wrong | Typical Outcome | User-Facing Fallback |
|-------------|---------------------|----------------------|----------------------|-----------------|----------------------|
| **Major structured retail** | Amazon.com, Best Buy, Target (with SSR) | Product name (0.93–0.99), price (0.88–0.96), color/variant (0.80–0.92), brand (0.85–0.95) | Dimensions, weight (never available), subscription vs. one-time price on Amazon | High-confidence partial extraction. Most fields pre-fill correctly. | Amber badges on all extracted fields. Weight always blank. |
| **Shopify-based independent stores** | Any `.com` running Shopify, e.g. clothing brands, gadget shops | Product name (0.88–0.96), price (0.85–0.95), variant description (0.70–0.85) | Category inference (store taxonomy doesn't map cleanly to CRBOX), brand extraction | Good extraction with moderate category uncertainty. Price is usually reliable. | Amber "Verificar" on price; category pre-selection shown as a suggestion only. |
| **Marketplaces** | eBay, Etsy, Mercado Libre USA, Walmart Marketplace | Product name (0.75–0.90), listing price (0.70–0.88) | Seller vs. platform fulfillment distinction, "from" price with multiple sellers, condition (new vs. used) | Moderate extraction. Price is the most unreliable field — there may be multiple price points for different sellers. | Price shown with "Confirmar" badge regardless of confidence. User must verify. |
| **JavaScript-rendered pages** | Some Shopify themes (non-SSR), SPA-only storefronts | Unpredictable — 0 to 3 fields in best case | Anything requiring JS execution to render | Near-total extraction failure on the server-side fetch. The proxy gets the JS shell, not the rendered content. | `page_readable: false` — full manual fallback. User sees: "No pudimos leer esta página. Ingresa los datos manualmente." URL is still stored for sales review. |
| **Partially readable pages** | Pages with server-rendered title/meta but client-rendered price | Product name (0.85–0.95 — typically in `<title>`), sometimes brand | Price (missing — in dynamic JS block), category | 1–2 fields extracted, rest blank. Partial state with amber badges on what was found. | "Encontramos algunos datos. Revisa y completa los que faltan." |
| **Blocked / login-gated pages** | ASOS account-gated items, subscription services, members-only pricing, CAPTCHA-protected pages | Nothing | Everything | `page_readable: false`. Server fetch returns 403, 401, redirect to login, or CAPTCHA challenge. | Full manual fallback. URL is still stored — sales can check if they have access. Note to user: "Este enlace requiere inicio de sesión. Ingresa los datos del producto manualmente." |

**Operational implications:**

- For major retail and Shopify sources: AI extraction is reliable enough to shorten form-fill time materially. These are the highest-value use cases for the extraction feature.
- For marketplaces: AI extraction provides convenience but the declared value must always be user-confirmed. Sales should double-check marketplace prices against the listing URL on receipt.
- For JS-rendered pages: the extraction feature adds no value. The fallback is the experience. No error is shown — just a graceful manual form. The URL is still captured, which is the important thing.
- For blocked/login-gated pages: sales receives the URL and must check manually. This is expected and the SOP already covers it (Section 12.4, Step 3).

**Frequency estimate (based on typical CRBOX customer behavior):**
- Major retail (Amazon, Best Buy): ~55% of submitted URLs
- Shopify stores: ~20%
- Marketplaces: ~10%
- JS-rendered or partially readable: ~10%
- Blocked/login-gated: ~5%

This means AI extraction will produce usable output for roughly 75–80% of URL submissions, partial output for 10%, and no output for 10–15%. These numbers should be confirmed after Phase 2 ships.

---

## 10. Quote Integrity Risks

### 10.1 Risk A — Users Entering Incorrect Weight or Dimensions

**Nature of the risk:** Customers guess weight rather than weighing the item. A 3 kg item entered as 1 kg produces a materially wrong estimate and a disappointed customer when the real bill arrives.

**UX response:**
- The estimate is clearly labeled: "Estimado según el peso que ingresaste. El peso real del paquete puede variar."
- A tooltip on the weight field: "Si no conoces el peso exacto, el estimado puede diferir del precio final. CRBOX confirmará el peso al recibir el paquete."
- The estimate disclaimer is shown before submission (not in fine print after)

**Operational response:**
- Sales email must note the customer-entered weight and flag when the received package weight differs by more than 15%
- CRBOX confirms actual weight at receipt and sends a revised quote

**Feasibility:** Fully manageable now with copy and process discipline. Automated weight reconciliation requires internal tool (Build Later).

### 10.2 Risk B — Merchant Pages That Are Incomplete or Misleading

**Nature of the risk:** Some merchant pages don't include price in machine-readable form, show pre-discount prices, or use dynamic rendering that server-side fetching cannot capture.

**UX response:**
- When `page_readable: false` or all fields return `provenance: "missing"`, show: "No pudimos leer esta página automáticamente. Ingresa los datos del producto manualmente."
- No error state — just a graceful fallback to the manual form
- The user's URL is still stored and included in the request so sales can check it

**Operational response:**
- Sales receives the URL in every request regardless of extraction success
- Sales can manually verify the product page before responding

**Feasibility:** Managed now through explicit fallback UX and URL pass-through. Better page reading requires headless rendering service (Build Later).

### 10.3 Risk C — Partial AI Extraction Producing Overconfident Prefill

**Nature of the risk:** The AI extracts 4 of 5 fields correctly but one field (e.g. price) is wrong. If the UI presents all fields at the same confidence visually, the user accepts the wrong value without noticing.

**UX response:**
- Every AI-extracted field shows a "Verificar" badge — even high-confidence ones
- Before submission, the review step shows all extracted fields with their badges and asks the user to scroll through
- A "Confirmé todos los datos" checkbox must be checked before the submit button activates (only when AI extraction was used)

**Operational response:**
- AI extraction result metadata is stored with the request, including per-field confidence scores
- Sales can see which fields were AI-sourced in the future internal tool (Build Next)
- If the declared value differs significantly from what sales observes on the merchant page, sales should note this in their response

**Feasibility:** UX controls manageable now. Per-field confidence visibility in the internal tool is Build Next.

### 10.4 Risk D — Gap Between Estimated Quote and Real Received Package

**Nature of the risk:** The customer is shown an estimate of, say, $45 shipping. The real package arrives weighing more, is volumetrically larger, or contains items that trigger higher tariffs. The final bill is $72. The customer feels misled.

**UX response:**
- The estimate is never called "precio final" — always "estimado" or "precio aproximado"
- The confirmation screen says explicitly: "CRBOX confirmará el precio final una vez que reciba tu paquete. Este estimado puede variar si el peso o las dimensiones reales difieren."
- The detail view labels the estimate with: "Estimado basado en los datos que ingresaste"

**Operational response:**
- Sales response email must reiterate that the quoted price is an estimate and include the factors that could change it (actual weight, dimensions, tariff category confirmation)
- When the package arrives, CRBOX sends a revised cost confirmation before charging

**Feasibility:** Managed now through copy discipline and operational process. Automated reconciliation and portal-native price updates require internal tool (Build Later).

---

## 11. State Model

### 11.1 State Lifecycle Table

| Internal State | Customer-Facing Label | Appears In | Triggered By | Trigger Today | Future Automation |
|----------------|----------------------|------------|--------------|---------------|-------------------|
| `draft` | (not shown) | Never visible | User starts form, doesn't submit | Automatic (client-side only) | Auto-expire after 72h |
| `enviada` | Enviada | Dashboard summary, list, detail | User submits request | Automatic on submit | — |
| `en_revision` | En revisión | Dashboard summary, list, detail | Sales opens email | Manual (sales) | Internal tool triggers on open |
| `respondida` | Respondida | Dashboard summary, list, detail | Sales sends response email | Manual (sales updates via API) | Internal tool one-click update |
| `completada` | Completada | List (archived), detail | Customer confirms purchase intent (future) | Manual (sales) | Customer portal action |
| `cancelada` | Cancelada | List (archived), detail | User cancels or sales closes | User action or manual (sales) | User action in portal |
| `expirada` | Expirada | List (archived), detail | No response within 30 days | Manual sweep (sales) | Automated after 30 days |

### 11.2 Dashboard Display Rules

- **Dashboard summary**: only shows `enviada` and `en_revision` states. `respondida` shows briefly, then moves to list.
- **List active section**: `enviada`, `en_revision`, `respondida`
- **List archived section**: `completada`, `cancelada`, `expirada`
- **Detail view**: all states visible in timeline

### 11.3 Archive and Expiry Rules

- `expirada` triggered when: `enviada` or `en_revision` for more than 30 days with no response
- `expirada` records are retained in the database indefinitely, but move to archive in the UI after 90 days
- Archived records can always be duplicated — they are never deleted

### 11.4 Retention Window

- Active states: no expiry
- Archived states: visible in list for 12 months, then queryable via API but not shown by default
- Permanently retained in database for audit/support purposes

---

## 12. Temporary Operational SOP

This SOP defines how CRBOX sales operates the quote intake system **today**, before any internal tool exists. The goal is for this process to feel intentional and reliable, not improvised.

### 12.1 Email Subject Format

Every customer quote request email must arrive with a subject line in this exact format:

```
[SCB-XXXX] Solicitud de compra — [Product Name] — [Customer Email]
```

Examples:
- `[SCB-0042] Solicitud de compra — Sony WH-1000XM5 — maria@gmail.com`
- `[SCB-0043] Solicitud de compra — Teclado mecánico (sin URL) — cliente@empresa.com`

The `SCB-XXXX` ID is generated at submission time and included in the email. This ID is the primary reference for all follow-up.

### 12.2 Mandatory Email Body Fields

Every submission email must include these fields in this order:

```
SOLICITUD DE COMPRA CRBOX
─────────────────────────
ID: SCB-XXXX
Fecha: DD/MM/YYYY HH:MM
─────────────────────────
DATOS DEL CLIENTE
Nombre: [Name or "Anónimo"]
Email: [email]
Casillero: [ID or "Sin casillero (público)"]
Tipo de cuenta: [Personal / Empresa / Sin cuenta]
─────────────────────────
DATOS DEL PRODUCTO
Nombre del producto: [text]
URL: [url or "No proporcionada"]
Valor declarado: $[amount] USD
Categoría: [category label]
Peso aproximado: [weight] kg (or "No especificado")
Dimensiones: L[x] × W[y] × H[z] cm (or "No especificadas")
Origen del datos: [Manual / AI-extraído (verificado por usuario)]
─────────────────────────
ENVÍO
Servicio: [Aéreo / Marítimo]
Destino: [zone]
Estimado de envío: $[amount] USD (ESTIMADO — sujeto a confirmación)
─────────────────────────
DESCRIPCIÓN DEL CLIENTE:
[Free-text field content, or "Ninguna"]
─────────────────────────
AVISO: Este estimado se basa en los datos ingresados por el cliente y puede
variar al recibir el paquete físico. CRBOX debe confirmar el precio final.
```

### 12.3 Optional Fields

- Product image URL (if available from AI extraction)
- AI confidence scores (included in a separate technical section of the email for sales reference)
- Prior solicitudes for this customer (included if casillero ID is attached)

### 12.4 Manual Steps Sales Must Take Today

1. **Receive email** — Confirm the SCB-XXXX ID is visible in the subject line
2. **Check customer account** — Look up casillero ID in the CRBOX backend system to confirm account status and history
3. **Review the product URL** — Open the URL, verify the product exists, note the real price, check for shipping restrictions
4. **Review weight/dimensions** — If provided, assess reasonableness. If missing, note that estimate is based on incomplete data.
5. **Prepare response email** — Use the response template (Section 12.5). Reply-to the customer's email. CC ventas@crbox.cr.
6. **Update portal state (transitional)** — Until the internal tool exists, sales must call a simple API endpoint (`POST /api/solicitudes/:id/status`) to update the request state from `enviada` to `en_revision` or `respondida`. This endpoint exists in the backend spec for Build Now (Section 18).
7. **Log the request** — Add the SCB-XXXX ID, customer email, product, and status to the shared CRBOX operations spreadsheet (today's internal tool substitute)

### 12.5 Response Email Template

```
Asunto: [SCB-XXXX] Respuesta a tu solicitud de compra — [Product Name]

Hola [Name],

Gracias por tu solicitud. Revisamos [Product Name] y te damos los siguientes detalles:

PRECIO ESTIMADO DE ENVÍO: $XX.XX USD
(Estimado basado en los datos de tu solicitud — puede ajustarse al recibir el paquete)

PRÓXIMOS PASOS:
1. Confírmanos si deseas proceder con esta compra respondiendo a este correo.
2. Una vez confirmado, procedemos con la compra y te enviamos el seguimiento.
3. Al llegar el paquete, te enviamos el precio final confirmado antes de cobrar.

Si tienes alguna duda, responde a este correo o contáctanos por WhatsApp.

Equipo CRBOX
ventas@crbox.cr | +506 8979-4418
```

### 12.6 How to Prevent Lost Requests

- Sales checks the ventas@crbox.cr inbox every business day at 9am and 2pm
- All emails with `[SCB-` in the subject are given highest priority
- Any email without the `[SCB-` prefix is checked to see if it is a manual submission that bypassed the system
- The operations spreadsheet is updated by end of day for any request received that day
- Requests with no sales action after 48 hours send an automated reminder to ventas@crbox.cr (Build Next — requires cron or scheduled function)

---

## 13. Data Model

### 13.1 QuoteRequest Object

```
QuoteRequest {
  id:                 string        // SCB-XXXX format; generated server-side
  casillero_id:       string|null   // idconsignee from getuserinfo; null for anonymous
  customer_email:     string        // required; from session or form input
  customer_name:      string|null   // optional; from form or account profile
  account_type:       enum          // "personal" | "business" | "anonymous"

  // Product data
  product_name:       string        // required
  product_url:        string|null   // optional
  declared_value_usd: number        // required; declared by customer
  category:           string        // required; uses CRBOX category taxonomy
  weight_kg:          number|null   // optional; customer-entered
  length_cm:          number|null   // optional
  width_cm:           number|null   // optional
  height_cm:          number|null   // optional
  customer_notes:     string|null   // free text, max 500 chars

  // Shipping preferences
  service_type:       enum          // "aereo" | "maritimo"
  destination_zone:   string|null   // zone key matching calculator engine

  // Estimate (snapshot at submission time)
  estimate_usd:       number|null   // null if weight not provided
  estimate_breakdown: object|null   // full breakdown from calculator engine

  // AI extraction metadata
  ai_extraction_id:   string|null   // FK to AIExtractionResult
  data_source:        enum          // "manual" | "ai_extracted" | "ai_partial"

  // State
  status:             enum          // see state model
  submitted_at:       timestamp
  responded_at:       timestamp|null
  completed_at:       timestamp|null
  cancelled_at:       timestamp|null
  expires_at:         timestamp     // submitted_at + 30 days

  // Linkages (Build Later)
  linked_package_id:  string|null   // FK to package when purchase is made
}
```

**Now-vs-Later labels:**
- All fields above: **Now** (except `linked_package_id`: **Build Later**)
- `destination_zone` auto-filled from account: **Build Next**

### 13.2 QuoteItem Object

For multi-item requests (Build Next feature — initial version is single-item per request):

```
QuoteItem {
  id:                 string
  quote_request_id:   string        // FK to QuoteRequest
  product_name:       string
  product_url:        string|null
  declared_value_usd: number
  category:           string
  weight_kg:          number|null
  length_cm:          number|null
  width_cm:           number|null
  height_cm:          number|null
  ai_extraction_id:   string|null
  data_source:        enum
  sort_order:         number
}
```

**Note:** Multi-item quote requests (where a single SCB-XXXX covers multiple items to be shipped together) are a **Build Next** feature. The initial version submits one item per request. The data model supports multi-item from the start so no migration is needed.

### 13.3 AIExtractionResult Object

```
AIExtractionResult {
  id:               string
  source_url:       string
  extracted_at:     timestamp
  model_version:    string          // e.g. "gemini-2.0-flash"
  page_readable:    boolean
  partial:          boolean
  fields: {
    [fieldName]: {
      value:            any
      confidence:       float       // 0.0–1.0
      provenance:       enum        // "extracted" | "inferred" | "missing" | "needs_confirmation"
      source_attribute: string|null
      inference_note:   string|null
    }
  }
  extraction_warnings: string[]
  raw_model_response: object        // full Gemini JSON (stored for debugging)
}
```

### 13.4 QuoteStatusHistory Object

```
QuoteStatusHistory {
  id:               string
  quote_request_id: string          // FK to QuoteRequest
  from_status:      enum
  to_status:        enum
  changed_at:       timestamp
  changed_by:       enum            // "customer" | "sales" | "system"
  note:             string|null     // sales can add a note on status change
}
```

### 13.5 Request ID Format

- Pattern: `SCB-` + zero-padded 4-digit sequential integer
- Examples: `SCB-0001`, `SCB-0042`, `SCB-1000`
- Generated server-side at submission time, not client-side
- IDs are never reused, even for cancelled or expired requests
- When volume exceeds 9999, format extends to 5 digits automatically: `SCB-10001`

### 13.6 Deduplication Strategy

- **Same user, same URL, within 24 hours:** Show a warning: "Ya enviaste una solicitud para este producto recientemente (SCB-XXXX). ¿Quieres enviar otra de todas formas?" User must confirm.
- **Same user, same product name, within 24 hours (no URL):** Same warning.
- **Anonymous user:** No deduplication check (no session identity to compare against).
- Check is performed at submission time on the server, not client-side.

### 13.7 Guest-to-Account Linking

Email-based linking is the right approach for this system — it requires no token management and works naturally with the conversion flow on the public quote page. However, it carries four specific risks that must be addressed explicitly. Each is handled below.

**The baseline mechanism**

At account registration time, the system checks whether any `QuoteRequest` records with `casillero_id = NULL` share the registration email:

```sql
UPDATE quote_requests
SET casillero_id = :new_casillero_id
WHERE customer_email = :registration_email
  AND casillero_id IS NULL;
```

This query runs server-side during the registration flow, before the user sees their dashboard for the first time.

**Risk 1: Mismatched emails (user submits with one email, registers with another)**

Scenario: A user submits a quote as a guest using `maria.perez@hotmail.com`. They then register using `mariacrbox@gmail.com`. The guest request is never linked.

Handling:
- The public quote page pre-fills the registration form with the email used for the submission (Section 3.3, Module F). This is the strongest mitigation.
- If the user overrides the pre-filled email during registration, no link is created. The guest request remains anonymous.
- The guest request is not lost — it retains its `SCB-XXXX` ID and the customer received a confirmation email. They can reference it in any follow-up.
- Sales receives the original email in the submission email. If the customer follows up under a different email, sales can manually link by looking up the SCB-ID.

**No automated resolution:** Do not attempt to fuzzy-match emails or guess alternate addresses. Email matching must be exact.

**Risk 2: Typo in the guest submission email**

Scenario: A user submits a quote with `mari.perez@gmial.com` (typo). The confirmation email bounces or goes to the wrong person. They register with the correct `maria.perez@gmail.com`. No link is created.

Handling:
- At submission time, require explicit confirmation: after the user types their email, show it displayed back to them before the submit button activates. Copy: "Confirma tu correo: **mari.perez@gmial.com** — ¿Es correcto?"
- This is the only effective prevention. Once the request is submitted with a typo, it cannot be auto-corrected.
- If a customer contacts support about a lost quote, sales can manually update `customer_email` on the `QuoteRequest` record directly in the database. This requires a simple admin operation, not a new UI.
- Automated prevention of linking a typo'd email to a different real person's account: guaranteed by exact-match-only linking.

**Risk 3: Ambiguous ownership (multiple people use the same email)**

Scenario: Two people at a business share a single email address for submissions. Both submit guest quotes. One person creates an account. Both requests get linked to that one account.

Handling:
- This is an inherent limitation of email-based identity. It cannot be fully prevented without pre-submission authentication (which would eliminate the guest flow entirely).
- Mitigation: shared or business emails are uncommon for guest submissions. The conversion prompt is shown immediately after a personal guest submission, making it likely that the same person registers.
- If this occurs: both requests are visible in the account, which is not harmful — the account holder can see all requests submitted under that email.
- In the rare case of a genuine dispute (two different people who both used the same shared email), sales resolves it manually by reassigning the `casillero_id` on specific records.

**Risk 4: User confirmation before importing prior guest requests**

The current mechanism imports guest requests silently during registration. This is appropriate when the conversion prompt is used correctly — the user is registering specifically to track a request they just submitted. However, if a user registers days or weeks later, they may not expect prior requests to appear in their portal.

**Recommendation:** Show a confirmation step during registration if guest requests are found:

```
After registration, before showing the dashboard:

  ─────────────────────────────────────────
  Encontramos una solicitud enviada con este correo:

  SCB-0042 — Sony WH-1000XM5 — enviada el 14 abr
  SCB-0038 — Teclado mecánico — enviada el 8 abr

  ¿Quieres agregar estas solicitudes a tu cuenta?

  [Sí, agregar a mi cuenta]    [No, ignorarlas]
  ─────────────────────────────────────────
```

If the user clicks "No, ignorarlas," the `casillero_id` update is skipped. The guest requests remain with `casillero_id = NULL` and `customer_email` intact. They are not visible in the portal for that user.

If the user clicks "Sí," the update runs as described above.

This confirmation step is important when more than one prior request is found. If exactly one request was just submitted (the typical conversion case), the confirmation can be implicit — but the step should still be shown to be explicit about what is being imported.

**Build Now:** The confirmation step is recommended even in Phase 1. It requires one additional page in the registration flow and is worth the implementation cost to avoid user confusion.

### 13.8 One Object or Separate Objects?

**Recommendation: one object (QuoteRequest) with state.** Do not create separate `Quote`, `AssistedPurchaseRequest`, and `Purchase` objects.

Rationale: The CRBOX operation does not have a clear handoff moment between quote and purchase — they are managed in the same email thread by the same sales person. Creating separate linked objects would require synchronization logic that cannot be maintained without an internal tool. A single object with a state machine captures the lifecycle accurately and is simpler to build, query, and extend.

When an actual package arrives, a `linked_package_id` is added to the QuoteRequest. This is sufficient linkage for the current operational reality.

---

## 14. Quote–Purchase–Package Relationship

### 14.1 Current State (Build Now)

```
QuoteRequest (SCB-XXXX)
  ↓ (email response from sales)
  Customer confirms via email
  ↓ (CRBOX makes the purchase)
  Package arrives at Miami warehouse
  ↓ (CRBOX's WMS system creates the package record)
  Package #XXXXXXXX appears in mis-paquetes.html
```

In the current state, the connection between a QuoteRequest and a package is **invisible in the portal**. The customer sees the solicitud in mis-solicitudes.html and the package in mis-paquetes.html, but there is no link between them. This is acceptable for the Build Now phase.

### 14.2 What Identifiers Enable Future Linking

- `QuoteRequest.id` (SCB-XXXX) — generated by the new system
- `Package.number` and `Package.trackingNumber` — available from the getuserpackages API (`mapPackage.number`)
- The connection key is the `trackingNumber` from the merchant's shipping carrier, which CRBOX records when the package is received

For future linking: sales enters the tracking number into the internal tool when the purchase is made. The system then matches `Package.trackingNumber` to `QuoteRequest.linked_tracking_number` and makes the connection.

### 14.3 What the Portal Could Show Later (Build Later)

When a solicitud has a `linked_package_id`:
- The detail view shows: "Tu paquete está en camino — [Status badge]" with a link to the package in mis-paquetes
- The package row in mis-paquetes shows: "Originado de solicitud SCB-XXXX" with a link to the solicitud
- This bidirectional link makes the full purchase journey visible in one portal

### 14.4 What Cannot Be Promised or Shown Today

- **Real-time purchase status:** Not possible until the internal tool updates QuoteRequest state when the purchase is made.
- **Package arrival notification linked to solicitud:** Not possible until `linked_package_id` is populated.
- **Automated reconciliation of estimated vs. actual cost:** Requires the package weight from getuserpackages and the quote estimate from QuoteRequest to be compared. This comparison is a Build Later feature.

---

## 15. Notifications & Communication Model

### 15.1 Email Notifications (Now)

| Trigger | Recipient | Subject | Content |
|---------|-----------|---------|---------|
| Request submitted | Customer | `[SCB-XXXX] Tu solicitud fue recibida — [Product Name]` | Confirmation, request summary, what happens next |
| Request submitted | ventas@crbox.cr | `[SCB-XXXX] Solicitud de compra — [Product Name] — [Email]` | Full structured submission (see SOP Section 12.2) |
| Status → `respondida` | Customer | `[SCB-XXXX] Respuesta a tu solicitud de compra — [Product Name]` | Response details + next steps (manual email from sales) |

**Submission confirmation to customer** is automated from the backend at submission time. No sales action required.

**Response email to customer** is sent manually by sales today. Future: triggered from internal tool.

### 15.2 Portal Notifications (Build Next)

- Dashboard badge count on the "Mis Solicitudes" nav item showing active (non-archived) requests
- In-portal status update when a request transitions states (requires API polling or websocket — Build Later)
- Notification dot on dashboard welcome card when a new response arrives

### 15.3 The "Responded by Email" Portal State

During the transitional phase (no internal tool), when sales responds to a customer, the portal's QuoteRequest state is manually updated to `respondida` via the status update endpoint. The portal shows:

> "CRBOX respondió a esta solicitud el [date]. Revisa tu correo ([email]) para ver los detalles."

This is intentionally humble and accurate. It does not attempt to show the response content in the portal (that content lives in email, not in the database yet).

### 15.4 Future-Phase Portal-Native Messaging (Build Later)

When the internal tool exists and sales can enter responses directly:
- The response content is stored in the `QuoteRequest` object
- The customer sees the full response in the detail view (price, conditions, next steps)
- A "Confirmar compra" button appears in the portal
- Real-time state updates without email polling

---

## 16. Failure States & Edge Cases

| Scenario | User-facing behavior | Operational fallback | Solvable now or later |
|----------|---------------------|---------------------|----------------------|
| URL unreadable (JavaScript-rendered page, login required, 403) | "No pudimos leer esta página. Ingresa los datos manualmente." Form stays blank. URL is still stored. | Sales reviews the URL manually from the submitted email | Now — graceful fallback exists |
| AI fails completely (Gemini error, timeout) | "El análisis automático no está disponible ahora mismo. Ingresa los datos manualmente." Same fallback as above. | Sales reviews URL manually | Now |
| AI partial (some fields missing) | Fields that were extracted are shown with badges; missing fields are blank with placeholder prompts | Sales uses extracted data as starting point, corrects from URL | Now |
| Unsupported merchant (region-blocked, CAPTCHA, dynamic rendering) | Same as URL unreadable — graceful fallback | Sales receives URL, reviews manually | Now (fetch fallback); headless rendering: Later |
| Missing weight | Estimate not shown; user can still submit without weight. Notice: "Sin peso aproximado no podemos calcular un estimado de envío, pero tu solicitud es válida." Weight field is always optional. Sales confirms actual weight when the package arrives at the CRBOX warehouse. | Sales weighs the package on arrival; revised cost included in response email | Now |
| Missing dimensions | Estimate not shown; user can still submit without dimensions. Notice: "Sin dimensiones no podemos calcular un estimado de envío, pero tu solicitud es válida." | Sales estimates dimensions from product type | Now |
| Duplicate submission (same user, same product, 24h) | Warning modal before second submission | No additional action needed | Now |
| Email handoff failure (SMTP error) | "Hubo un error al enviar tu solicitud. Por favor intenta de nuevo o contáctanos por WhatsApp." QuoteRequest is still saved in DB. | Cron job retries failed emails; sales also receives alert | Now (save first, send second) |
| No sales response after 48 hours | Customer sees `enviada` state. No auto-escalation yet. | Sales daily inbox check is the safety net | Now; auto-reminder: Build Next |
| Sales responds outside portal (email only, no status update) | QuoteRequest stays in `enviada` state — misleading | Sales discipline: always update state after responding. The SOP makes this a required step. | Now (process); auto-sync: Build Later |
| Abandoned draft | Browser `beforeunload` warning. No server-side draft. | User starts over | Now; LocalStorage draft: Build Next |
| Stale/expired quotes (30+ days) | Request moves to `expirada` in UI | Sales sweeps weekly; future: automated | Now (manual); automated: Build Next |
| High request volume | Email inbox overwhelmed | Operations spreadsheet as triage tool; priority queue by submission date | Now; internal queue tool: Build Later |
| Business vs. personal differences | Account type is attached to every request. Sales uses this to apply correct tax treatment. No UI difference today. | Sales applies manual judgment for business accounts | Now; differentiated UI: Build Next |
| Mobile-only users | All flows designed mobile-first. Chat collapses to bottom sheet. Forms stack vertically. | No special fallback needed | Now |
| Chat on mobile | Bottom sheet chat, form-first layout. Full chat available on tap. | — | Now |
| Public-to-portal conversion | Email pre-filled in registration form. QuoteRequest linked retroactively on registration. | Manual linking by sales if email doesn't match | Now |
| AI vs. manual value conflicts | User edits override AI values. User's last input wins. No conflict shown. | — | Now |
| Sales materially corrects a quote (actual price differs from estimate) | Response email includes revised quote. Portal shows `respondida` state. Customer must re-confirm. | Sales email is the source of truth for revised quotes | Now; portal-native revision: Build Later |

---

## 17. Mobile Experience

### 17.1 Public Quote Page on Mobile

- URL paste field: full width, large hit area (min 48px height)
- "Analizar" button: below the URL field, full width, distinct orange background
- Extraction status: appears as a banner above the field set, not inline
- Fields: single column, one per row
- Category dropdown: native `<select>` on iOS/Android (no Tom Select on mobile — avoids rendering bugs with the virtual keyboard)
- Estimate: collapsed card with a "Ver estimado" toggle tap; expands inline, does not scroll user away
- "Enviar solicitud" CTA: sticky bottom button, appears once the form has at least one required field filled
- Conversion prompt after submission: bottom sheet (slides up), not a modal overlay

### 17.2 AI-Assisted Public Flow on Mobile

- Extraction runs in the background after URL is submitted — user sees a pulsing indicator but is not blocked
- If extraction takes > 5 seconds, a notice appears: "Esto está tardando un poco. Puedes empezar a llenar los datos mientras tanto."
- Partial extraction populates visible fields immediately — no full-page reload

### 17.3 Portal Entry on Mobile

- Dashboard card for "Solicitar compra" is full width, visible without scrolling (placed in the first 2 cards)
- CTA button uses the same large-touch-target design as other dashboard CTAs
- Badge count is shown inline in the card (no nav badge on mobile — the nav is a hamburger menu)

### 17.4 New Request Flow on Mobile

- Progressive form: each step is a full-screen panel that slides in
- "Siguiente" button at the bottom of each panel — always visible, never buried below the keyboard
- Keyboard dismissal: tapping outside an input collapses the keyboard
- Review step: full-width summary card with inline "Editar" links per section (not a back-navigation button)

### 17.5 Chat-Assisted Intake on Mobile

- Default view: form only (single column, all fields visible)
- "Pedir ayuda al asistente" button: orange, sticky at the bottom, below the form
- Chat opens as a bottom sheet (height: 60% of viewport)
- When the AI updates a field, the bottom sheet minimizes briefly, the updated form field highlights in amber for 2 seconds
- "Ver formulario" button at top of bottom sheet collapses it

### 17.6 List View on Mobile

- Table view replaced with card list: each solicitud is a card showing ID, product name, status badge, and date
- Filter and sort controls: collapsed behind a "Filtrar" button that opens a bottom sheet
- "Duplicar" and "Cancelar" actions accessed via a `···` menu on each card

### 17.7 Detail View on Mobile

- Header section (ID, status, date) is fixed/sticky
- Product card, estimate, and timeline scroll below
- Action buttons (Cancelar, Duplicar) are a fixed bottom bar
- Timeline collapses to "Ver historial" tap on small screens

---

## 18. Technical Architecture

### 18.1 Frontend Surfaces and New Components

**New pages:**
- `/cotizar.html` — Public quote page (new)
- `/mis-solicitudes.html` — Portal list page (new)
- `/solicitud.html?id=SCB-XXXX` — Portal detail view (new, or `/mis-solicitudes.html?detail=SCB-XXXX`)

**New JS modules:**
- `js/quote-form.js` — Shared form logic for both public and portal quote entry (URL paste, field management, estimate calculation bridge to `calculator-engine.js`, submission)
- `js/quote-api.js` — Wraps all quote-related API calls: submit, fetch list, fetch detail, cancel, status update
- `js/ai-extractor.js` — Manages the AI extraction call, confidence handling, badge rendering, and field update logic
- `js/chat-assistant.js` — Chat panel logic, message rendering, field update hooks

**Modified components:**
- `dashboard.html` — Add quote entry card and recent solicitudes summary
- Auth/nav — Add "Mis Solicitudes" to the portal nav and mobile menu

### 18.2 Backend Endpoints

All endpoints are new additions to `server.py` or a dedicated API module.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/solicitudes` | POST | Optional | Submit a new QuoteRequest. Validates payload, generates SCB-XXXX ID, persists, sends confirmation email to customer, sends submission email to sales. Returns `{ok: true, id: "SCB-XXXX"}`. |
| `/api/solicitudes` | GET | Required | List all QuoteRequests for the authenticated casillero ID. Supports filters: status, date range. Returns array. |
| `/api/solicitudes/:id` | GET | Required | Fetch a single QuoteRequest with its status history. |
| `/api/solicitudes/:id/status` | POST | Sales auth or trusted | Update QuoteRequest status. Body: `{status: "en_revision", note: "..."}`. Used by sales today via a simple admin call. |
| `/api/solicitudes/:id/cancel` | POST | Required | Cancel a QuoteRequest (if cancellable). |
| `/api/ai/extract` | POST | None (rate limited) | Proxy: fetches the provided URL, passes content to Gemini, returns AIExtractionResult JSON. Rate limited: 10/hour per IP. |
| `/api/solicitudes/check-duplicate` | POST | Optional | Given a URL or product name + casillero_id, returns whether a duplicate exists in the last 24 hours. |

### 18.3 Storage / Persistence

**Build Now:** Lightweight file-based or SQLite persistence on the server. The existing `server.py` can be extended with SQLite (no external DB dependency, no pip install required for `sqlite3`). The schema is the data model defined in Section 13.

**Build Next:** Migrate to PostgreSQL when request volume makes SQLite inadequate (estimated threshold: 500 active requests/month).

**Guest session handling:** Anonymous quote submissions are stored in the same table with `casillero_id = NULL`. The server-generated `SCB-XXXX` ID is returned to the client and stored in `sessionStorage` so the user can reference it in the conversion prompt.

### 18.4 AI Service Layer

- The `/api/ai/extract` endpoint fetches the merchant URL server-side using Python's `urllib` or `httpx`
- HTML content is passed to the Gemini API via `google-generativeai` Python package (`pip install google-generativeai` — this is the only new external dependency)
- API key stored in environment secret `GEMINI_API_KEY`
- Extraction results are cached in memory (or SQLite) for 15 minutes keyed by URL hash
- Timeout: 10 seconds for the fetch; 8 seconds for Gemini inference
- If either times out, return `{page_readable: false}` — never block the user

### 18.5 Notification Layer

**Customer confirmation email:** Sent server-side using `smtplib` (same pattern as the existing quote email in `quote-send-real-email.md` task). Template is plain HTML. Sent on `POST /api/solicitudes` success.

**Sales submission email:** Same send mechanism. Sent immediately after customer confirmation email. Recipient: `ventas@crbox.cr`.

**SMTP secrets:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (already defined in the quote email task).

### 18.6 Email-Based Workflow Layer

Until the internal tool exists, sales uses the email as the primary workflow surface. The `/api/solicitudes/:id/status` endpoint is the bridge: sales updates the portal state by calling it (via a simple admin-only form or cURL command in the transitional phase).

A **one-page internal admin tool** (not a full internal tool — just a simple HTML page with a password gate) can serve as the Build Now state management surface for sales. It lists incoming requests and allows status updates without requiring a full internal tool build.

### 18.7 Future Internal Tool Integration Points

- `/api/solicitudes` GET endpoint becomes the primary data source for the internal request queue
- `/api/solicitudes/:id/status` POST endpoint is the action endpoint for the response composer
- `/api/solicitudes/:id/response` POST (Build Next) — stores the sales response in the database for portal display
- `/api/solicitudes/:id/link-package` POST (Build Later) — links a QuoteRequest to a getuserpackages package by tracking number

---

## 19. Phased Rollout Plan

### 19.0 True MVP Slice Inside Build Now

Build Now contains roughly 18 features. Not all of them should be built at the same time. This subsection identifies the minimum first slice — the smallest working system that creates real operational value — and explains what can wait even within Phase 1.

**The minimum first slice (days 1–10)**

| Feature | Why it comes first |
|---------|-------------------|
| SQLite schema: `QuoteRequest` + `QuoteStatusHistory` | Everything else depends on persistent storage. Zero external dependencies. |
| `POST /api/solicitudes` — validate, store, generate SCB-ID | The single most important endpoint. Without it, nothing can be submitted. |
| Customer confirmation email on submission | The customer must receive acknowledgment immediately. SMTP is already configured. This is 15 lines of smtplib code. |
| Structured sales submission email to ventas@crbox.cr | Sales must receive the request. This is the entire value of Phase 1 until the portal list is built. |
| `/cotizar.html` — public quote form, manual entry only (no AI) | The public-facing surface. Establishes the entry point and tests the email flow with real submissions. |
| Guest email confirmation field with display-back-before-submit | Prevents typos. Required for the guest-to-account linking to work correctly later. |
| Request ID (SCB-XXXX) in both emails and in the confirmation screen | Sales and customer must share a common reference. This makes the email-based SOP functional from day one. |

**Why this slice comes first**

After these 7 items are built and tested, CRBOX can begin receiving structured requests from the public quote page and sales can begin responding. The operational SOP in Section 12 becomes live. Real requests are flowing. This is the moment the system starts creating value — everything built after this point is incremental improvement.

The portal (mis-solicitudes.html, solicitud.html, dashboard card) makes the experience better for returning portal users, but it is not required for the core intake flow to work. Sales does not need a portal list to process requests — they have the email.

**What can wait within Build Now (days 11–20)**

| Feature | Why it can wait |
|---------|-----------------|
| Portal dashboard entry card ("Solicitar compra") | Portal users can use `/cotizar.html` in the interim. The dashboard card is a convenience, not a blocker. |
| `GET /api/solicitudes` list endpoint | Needed only once mis-solicitudes.html is ready. Build them together. |
| `mis-solicitudes.html` portal list page | Requires the list API. Can ship after the public form is live and tested. |
| `solicitud.html` portal detail view | Can wait until the list page exists. Users land in the list first. |
| Guest-to-account linking logic | Requires that some guest requests exist first. Build after the public form is live and real submissions are in the DB. |
| Deduplication check | Nice-to-have from day one, but submissions won't be high enough in the first week to generate meaningful duplicates. |
| `POST /api/solicitudes/:id/cancel` | Rarely needed in the first weeks. Add in week 3. |
| Draft warning (beforeunload) | 3 lines of JS. Add it at any point before launch, not a blocker. |
| Mobile sticky CTA styling | Refine after the form is functional. |

The decision rule: build anything that blocks a real quote from being submitted and reaching sales first. Build everything else after.

### Phase 1 — Build Now

*Works with the current CRBOX system as-is. No new infrastructure dependencies. Email-based workflow.*

| Feature | Dependency |
|---------|------------|
| Public quote page (`/cotizar.html`) with manual form (no AI) | None |
| Portal dashboard entry card ("Solicitar compra") | Auth session from auth.js |
| New request flow (single-item, manual entry, no AI) | None |
| Request submission to backend (`POST /api/solicitudes`) | SMTP secrets (existing) |
| Customer confirmation email on submission | SMTP setup |
| Sales structured submission email to ventas@crbox.cr | SMTP setup |
| QuoteRequest storage in SQLite | None |
| Request state model with manual sales update endpoint | None |
| Portal list page (`mis-solicitudes.html`) — active requests only | Auth session; QuoteRequest API |
| Portal detail view — customer-facing, no portal response display | QuoteRequest API |
| "Responded by email" transitional state | Sales discipline to update state |
| Request ID generation (SCB-XXXX) | None |
| Deduplication check (24h same URL/name) | QuoteRequest storage |
| Draft warning on navigation away | None (client-side `beforeunload`) |
| Guest submission with conversion prompt | None |
| Guest-to-account email linking on registration | getuserinfo API |
| Mobile-optimized forms (single-column, sticky CTAs) | None |
| Temporary operational SOP (email format, sales steps) | None |

### Phase 2 — Build Next

*Requires specific named dependencies. Cannot be shipped without them.*

| Feature | Dependency |
|---------|------------|
| AI product extraction from URL (`/api/ai/extract`) | Gemini API key (`GEMINI_API_KEY`); server-side URL fetch; `google-generativeai` Python package |
| Chat-assisted intake layout | `/api/ai/extract` endpoint; chat UI module |
| Per-field confidence badges in the form | AI extraction result with provenance field |
| Multi-item requests (QuoteItem model) | UI redesign of the form step |
| Auto-fill destination from account address | getuserinfo address data mapped to destination zone keys |
| LocalStorage draft save and restore | None (client-side) |
| Sales 48h no-response reminder email (cron) | Cron/scheduled function capability; SMTP |
| Portal badge count on "Mis Solicitudes" nav | QuoteRequest list API |
| Simple one-page internal admin UI for sales state management | Basic password-gated HTML page |
| AI confidence display in admin view | AIExtractionResult storage |

### Phase 3 — Build Later

*Requires internal tool, deeper automation, or additional integrations.*

| Feature | Dependency |
|---------|------------|
| Full internal CRBOX quote-operations tool | Section 22 — full internal tool build |
| Portal-native sales response (customer sees response in portal) | Internal tool + QuoteRequest response storage |
| "Confirmar compra" portal action | Internal tool; sales response API |
| QuoteRequest–Package linking | Internal tool + tracking number tracking; `linked_package_id` field |
| Bidirectional portal links (solicitud ↔ package) | Package linking; UI updates in mis-paquetes.html |
| Automated estimate vs. actual reconciliation | Package weight from getuserpackages + QuoteRequest estimate comparison |
| Real-time portal state updates (WebSocket or SSE) | Server infrastructure upgrade |
| Automated quote expiry (cron sets `expirada` state) | Scheduled function |
| TICA/DGA official tariff rate integration | TICA API registration; tariff-adapter.js update |
| Headless browser rendering for complex merchant pages | Puppeteer or Playwright server-side |

---

## 20. Success Metrics

### 20.1 Core Funnel Metrics

| Metric | Definition | Instrumentation |
|--------|-----------|-----------------|
| **Quote start rate** | % of `/cotizar.html` visitors who start filling the form | GTM event: `quote_form_started` on first field interaction |
| **AI prefill usage rate** | % of quote starts that include a URL submission | GTM event: `ai_extraction_attempted` on URL submit |
| **AI prefill success rate** | % of AI attempts that return at least one extracted field | GTM event: `ai_extraction_result` with `{partial: true/false, page_readable: true/false}` |
| **Quote-to-send rate** | % of quote starts that result in a completed submission | GTM event: `quote_submitted` on `POST /api/solicitudes` success |
| **Public-to-signup conversion rate** | % of anonymous quote submissions that result in registration | GTM event: `quote_conversion_signup` on registration from quote conversion prompt |
| **Portal recurrence** | % of portal users who submit a second solicitud within 90 days | Derived from QuoteRequest data: count users with 2+ requests |

### 20.2 Operational Metrics (Sales)

| Metric | Definition | Instrumentation |
|--------|-----------|-----------------|
| **Sales response time** | Time from `enviada` to `respondida` state | `QuoteStatusHistory` timestamps: `respondida.changed_at - enviada.submitted_at` |
| **Quote-to-approval rate** | % of `respondida` requests that become `completada` | QuoteRequest state counts |
| **Top failure reasons** | Most common reasons for `cancelada` or `expirada` | Sales notes on status change; future: dropdown reason codes |

### 20.3 Future Metrics (After Internal Tool)

| Metric | Definition |
|--------|-----------|
| **Sales handling efficiency** | Requests processed per sales-hour (requires internal tool time tracking) |
| **AI correction rate** | % of AI-extracted fields that users corrected before submitting (confidence vs. edit rate) |
| **Estimate accuracy** | Difference between estimate and actual invoice (requires package linking) |

---

## 21. Best-Practice Recommendations

The following recommendations are concrete improvements beyond the brief that would materially improve the product. They are noted here as strong suggestions for implementation or fast-follow.

### 21.1 Draft Auto-Save

**Recommendation:** Save the form state to `localStorage` as the user types. Key: `crbox-solicitud-draft-[casilleroId or 'anon']`. On next visit, prompt to restore.

**Why it matters:** Mobile users are frequently interrupted. A customer who starts a quote on their phone while commuting will lose their work if they switch apps. Draft save is the difference between a retained user and a lost quote.

**Build Next** — requires 20 lines of JS.

### 21.2 Deduplication UX

**Recommendation:** Before showing the duplicate warning modal, show the previous solicitud inline — thumbnail summary with ID, status, and "Ver solicitud" link — so the user can make an informed decision. Don't just say "ya enviaste esto."

**Why it matters:** A customer may legitimately want to re-request the same item (e.g. if the previous one expired, or they want a different quantity). Showing the prior request helps them decide without frustration.

**Build Now** — the data is available at check time.

### 21.3 "Solicitar esto de nuevo" Shortcut

**Recommendation:** On the detail view of a `completada` or `expirada` solicitud, add a prominent "Solicitar esto de nuevo" button that pre-populates a new request with the original data.

**Why it matters:** Repeat customers — the most valuable segment — often buy the same types of products. A one-tap restart dramatically reduces friction for the second purchase.

**Build Now** (same as "Duplicar" — see Section 5.7, slightly different copy for completed/expired context).

### 21.4 Progressive Disclosure of AI Confidence Levels

**Recommendation:** Rather than showing all AI confidence details upfront (which could overwhelm users), use a "¿Cómo obtuvimos estos datos?" expandable section below the extracted fields. Inside: a per-field confidence breakdown and provenance explanation.

**Why it matters:** Showing raw confidence percentages in the primary UI adds cognitive load. Most users just want to verify and move on. Expert users can expand to see the detail.

**Build Next** — requires the AI extraction result to be passed to the client (which happens naturally once the AI proxy is built).

### 21.5 Category Suggestion from URL

**Recommendation:** When the AI cannot confidently map a product to a CRBOX category, rather than defaulting to "otros," pre-select the top 3 candidate categories and let the user choose. Show them as radio buttons: "¿Cuál de estas describe mejor tu producto?"

**Why it matters:** Category determines tariff rate. "Otros" defaults to 29.95% which may be significantly wrong for electronics (13%). A guided choice improves estimate accuracy and reduces surprises when the real tariff is applied.

**Build Next** — requires AI to return candidate categories, which the prompt can be designed to do.

### 21.6 WhatsApp Follow-Up Link

**Recommendation:** On the detail view of any `en_revision` or `respondida` solicitud, include a "Preguntar sobre mi solicitud" button that opens WhatsApp with a pre-filled message referencing the SCB-XXXX ID.

Template: `Hola CRBOX, tengo una consulta sobre mi solicitud de compra SCB-XXXX.`

**Why it matters:** The transitional phase relies on email. Some customers prefer WhatsApp. This gives them a one-tap escalation path without the portal needing to know the full conversation context.

**Build Now** — it's a `wa.me` link with a template string. 5 lines of code.

---

## 22. Internal CRBOX Quote-Operations Tool

**This section describes a future internal surface. It is explicitly NOT a dependency for the Build Now phase. Build Now ships without it. The tool is a Build Later project.**

### 22.1 Purpose

The CRBOX operations team today manages quote requests via email, a shared spreadsheet, and manual state updates. This works at low volume but breaks down as request volume grows. The internal tool solves the problems that email alone cannot:

- No searchable, filterable request queue — email is not a queue
- No structured AI data visible to sales — extraction results are invisible
- No in-tool response composing — sales must write emails outside the system
- No automated state updates when sales acts
- No quality control on response consistency or timing

### 22.2 Main Views

**View 1 — Incoming Request Queue**  
A table of all `enviada` and `en_revision` requests, sorted by submission time (oldest first by default). Columns: SCB-ID, product name, customer email, casillero type, declared value, submission time, AI confidence (aggregated), time since submission. Filter by state, date, category, account type.

**View 2 — Request Detail / Review**  
Full detail view for a single request. Shows all fields, the AI extraction result with per-field confidence, the customer's notes, the product URL (clickable), and the customer's account summary (fetched from getuserinfo). Also shows the QuoteStatusHistory. From here, sales can transition to `en_revision` with one click.

**View 3 — Response Composer**  
A structured response form where sales fills in: confirmed shipping price, confirmed product availability, any conditions, delivery timeline estimate, and a free-text message. On submit, the system sends the response email to the customer automatically and updates QuoteRequest status to `respondida`. The response is stored in the database.

**View 4 — Quote Approval Manager**  
Lists all `respondida` requests waiting for customer confirmation. Shows time since response was sent. Includes "Mark as Completed" and "Mark as Cancelled" actions.

**View 5 — Archive**  
All `completada`, `cancelada`, and `expirada` requests. Searchable and filterable. Read-only.

### 22.3 Key Workflows

1. **Receive → Review:**
   - Request arrives in queue as `enviada`
   - Sales clicks "Tomar solicitud" → status moves to `en_revision`
   - Sales reviews product URL, declared value, customer account history, AI flags

2. **Review → Respond:**
   - Sales fills in the Response Composer
   - System sends response email and updates status to `respondida`
   - Response content is stored in the database

3. **Respond → Complete:**
   - Customer confirms (future: portal action; today: email confirmation)
   - Sales marks as `completada`
   - CRBOX makes the purchase

4. **Link to Package:**
   - After purchase, sales enters the carrier tracking number
   - System matches to the package in getuserpackages and updates `linked_package_id`
   - Customer portal now shows the package link

### 22.4 Key States from the Internal Team's Perspective

| Internal State | Sales Action | Tool Trigger |
|----------------|-------------|-------------|
| `enviada` | New request — needs review | Notification + queue entry |
| `en_revision` | Being worked on — claimed by a sales person | "Tomar solicitud" click |
| `respondida` | Response sent — awaiting customer | Response Composer submit |
| `completada` | Purchase confirmed | "Marcar como completada" click |
| `cancelada` | Closed — no purchase | "Cancelar" click + reason code |
| `expirada` | Automated or manual expiry | Cron or "Expirar" click |

### 22.5 AI-Assisted Capabilities for Internal Staff

**Confidence flags:** Any field with confidence < 0.80 is highlighted in amber in the detail view. Sales sees exactly which fields to verify.

**Suggested corrections:** For fields where the AI was uncertain, the tool shows the extracted value alongside the raw page text so sales can verify without reopening the merchant URL.

**Duplicate detection:** The queue shows a warning badge on any request that appears to be a duplicate of a prior request from the same customer (same URL or same product name within 30 days).

**Anomaly alerts:** The tool flags any request where the declared value is significantly lower than what the merchant page shows (potential customs undervaluation). Sales must acknowledge the flag before responding.

**Category mismatch alert:** If the customer selected "computadora" but the AI inferred the product is "consola_videojuegos" (very different tariff), sales sees a "Categoría posiblemente incorrecta" alert.

### 22.6 What the Tool Unlocks in the Customer Portal

| Internal Tool Capability | Portal Feature Unlocked |
|--------------------------|------------------------|
| Structured response composer | Customer sees response in portal (not just email) |
| "Mark as Completed" action | `completada` state visible in portal with timestamp |
| Tracking number input | `linked_package_id` populated; bidirectional portal link |
| Approval flow | "Confirmar compra" button appears in portal for customer |
| Real-time state updates from tool | Portal badge count and status updates without page refresh |

### 22.7 Feasibility Classification

| Capability | Phase | Dependency |
|------------|-------|------------|
| Internal request queue (read-only list) | Build Next | QuoteRequest API; basic auth for internal page |
| Request detail view in internal tool | Build Next | QuoteRequest + AIExtractionResult storage |
| Manual state update (replace current cURL flow) | Build Next | Simple password-gated HTML form; QuoteRequest status API |
| Response composer with email automation | Build Later | QuoteRequest response storage; email template system |
| AI confidence display per field | Build Next | AIExtractionResult storage (already in data model) |
| Duplicate detection and anomaly alerts | Build Later | Pattern matching on QuoteRequest history |
| Tracking number input and package linking | Build Later | Package linking API; getuserpackages integration |
| Portal-native customer response display | Build Later | Response composer must exist first |
| "Confirmar compra" portal flow | Build Later | Full internal tool approval workflow |
| Real-time state updates | Build Later | WebSocket or SSE server infrastructure |

### 22.8 Non-Dependency Statement

The Build Now phase — all features in Phase 1 of the rollout plan — does not require this tool. It operates entirely through email, the SOP defined in Section 12, and the minimal status update endpoint available to sales. The tool is the right next investment once Phase 1 is live and request volume confirms demand.

---

## 23. Recommended Implementation Order

**If development starts tomorrow, build in this order.**

This section is the practical execution plan. It assumes one developer working full-time. Each step is a discrete, testable deliverable. Steps within the same week can be parallelized if two developers are available.

---

### Week 1 — The Core Data + Email Loop (MVP Slice)

This week ends with a working system: a user can submit a quote, CRBOX receives a structured email, and the user receives a confirmation.

**Step 1 — SQLite schema and server setup (Day 1)**  
Create the `quote_requests` and `quote_status_history` tables in SQLite. Write and test the schema directly (no ORM). Confirm that the `server.py` database connection works and that a test row can be inserted and retrieved.  
*Done when: a `SELECT * FROM quote_requests` returns a test record.*

**Step 2 — POST /api/solicitudes endpoint (Day 1–2)**  
Implement the submission endpoint: validate required fields (product name, declared value, email), generate the SCB-XXXX ID, persist the `QuoteRequest` to SQLite, return `{ok: true, id: "SCB-XXXX"}`. No email sending yet — just storage and validation.  
*Done when: a `curl` POST returns a valid SCB-ID and the record appears in SQLite.*

**Step 3 — Customer confirmation email (Day 2)**  
Add `smtplib` email sending to the submission endpoint. Send a plain-HTML confirmation to the customer email. Use the SMTP secrets already defined. Subject: `[SCB-XXXX] Tu solicitud fue recibida — [Product Name]`.  
*Done when: a test submission sends a real email to a test inbox.*

**Step 4 — Sales submission email (Day 3)**  
Send the structured sales email to `ventas@crbox.cr` immediately after the customer confirmation. Use the mandatory body format in Section 12.2 exactly.  
*Done when: a test submission sends both emails correctly and the SCB-ID matches in both.*

**Step 5 — /cotizar.html public quote form (Day 3–4)**  
Build the public form: product name, declared value, category dropdown (from tariff-adapter.js), optional URL, optional weight, optional dimensions, customer name, customer email. No AI extraction yet — manual entry only. Wire the form to `POST /api/solicitudes`. Show the SCB-ID on the confirmation screen.  
*Done when: a real end-to-end submission works from the browser with both emails received.*

**Step 6 — Email display-back confirmation (Day 4)**  
On the public form, after the user enters their email, show it displayed back before submit: "Confirma tu correo: [email] — ¿Es correcto?" with a small "Cambiar" link. This is a UX guard against typos.  
*Done when: the email confirmation display works on the form.*

**Step 7 — Guest conversion prompt (Day 5)**  
After a successful submission, show the signup panel with the pre-filled email link to `/afiliate.html?email=[email]&source=quote`. Also add the "Solicitar otro producto" CTA that resets the form.  
*Done when: the full submission confirmation screen is correct and the conversion prompt link works.*

**End of Week 1 checkpoint:** The public `/cotizar.html` form is live. Sales receives structured emails. The email-based SOP in Section 12 is operational. Real quote requests can flow.

---

### Week 2 — Portal Integration

This week connects the quote system to the existing authenticated portal.

**Step 8 — GET /api/solicitudes (list endpoint) (Day 6)**  
Implement the authenticated list endpoint. Requires valid `CRBOXAuth` JWT. Returns all `QuoteRequest` records for the authenticated `casillero_id`, sorted by submission date descending. Supports optional `status` filter.  
*Done when: a test call from a logged-in session returns the correct records.*

**Step 9 — GET /api/solicitudes/:id (detail endpoint) (Day 6)**  
Implement the detail endpoint. Returns a single `QuoteRequest` with its `QuoteStatusHistory` array.  
*Done when: a test call returns the full record with history.*

**Step 10 — POST /api/solicitudes/:id/status (sales update endpoint) (Day 7)**  
Implement the status update endpoint. Requires a sales auth token (a simple shared secret for now — not a full auth system). Validates the new status against allowed transitions. Inserts a `QuoteStatusHistory` record. This is what makes the transitional SOP work — sales can update the portal state without the full internal tool.  
*Done when: a `curl` call updates a record's status and the history records the transition.*

**Step 11 — mis-solicitudes.html portal list page (Day 7–8)**  
Build the list page using the `GET /api/solicitudes` endpoint. Show active requests (enviada, en_revision, respondida) and archived requests (completada, cancelada, expirada) in two sections. Each row shows: SCB-ID, product name, status badge, submission date. Include "Ver" and "Duplicar" actions per row.  
*Done when: the page loads correctly for a logged-in user with existing requests.*

**Step 12 — solicitud.html portal detail view (Day 8–9)**  
Build the detail page. Display: header (ID, status badge, date), product card, estimate (if weight was provided), status timeline from `QuoteStatusHistory`, WhatsApp follow-up link. Show the "Respondida por email" notice when status is `respondida`.  
*Done when: clicking a request in the list opens the correct detail view.*

**Step 13 — Portal dashboard entry card and nav (Day 9)**  
Add the "Solicitar compra" card to `dashboard.html`. Add "Mis Solicitudes" to the portal nav. Wire both to the new pages.  
*Done when: the dashboard shows the card and the nav item is present in all portal pages.*

**Step 14 — Auth-aware portal quote form (Day 10)**  
Adapt the quote form from `/cotizar.html` for the portal. When the user is authenticated: pre-fill email from session (not editable), attach casillero_id automatically, apply business/personal copy variations based on `isCompany`. Add the portal new request flow steps (Steps 1–6 in Section 6.1).  
*Done when: a logged-in user can submit a request from the portal and it appears in their mis-solicitudes list.*

**End of Week 2 checkpoint:** The portal is connected. Logged-in users can submit, view, and track requests. Sales can update states via the status endpoint. The system is complete for Build Now.

---

### Week 3 — Hardening and Deduplication

This week adds the remaining Build Now features that were deliberately deferred.

**Step 15 — Guest-to-account linking (Day 11)**  
On the registration endpoint: after successful account creation, run the email-match query and import any prior guest requests. Show the confirmation step if more than zero guest requests are found (Section 13.7). Run the `UPDATE` only if the user confirms.  
*Done when: a test flow from guest submission → registration → portal shows the prior request in mis-solicitudes.*

**Step 16 — Deduplication check (Day 11–12)**  
Implement `POST /api/solicitudes/check-duplicate`. On the form, check before final submission whether the same URL or product name was submitted in the last 24 hours by the same casillero. If so, show the inline warning with the prior SCB-ID visible.  
*Done when: a duplicate submission attempt shows the warning correctly.*

**Step 17 — POST /api/solicitudes/:id/cancel (Day 12)**  
Implement the cancel endpoint. Validates that the request is in a cancellable state (`enviada` only). Updates status to `cancelada`, inserts history record, sends a cancellation confirmation email to the customer.  
*Done when: a cancellation from the detail view updates the status and sends the email.*

**Step 18 — Mobile styling pass and draft warning (Day 13–14)**  
Apply mobile-specific layout adjustments from Section 17. Add the `beforeunload` draft warning. Test the full flow on a real mobile device (iOS Safari + Android Chrome). Fix any keyboard or scroll issues.  
*Done when: a complete submission flow works correctly on mobile without layout issues.*

**End of Week 3 checkpoint:** All Build Now features are complete. The system is production-ready for Phase 1. Sales training on the SOP can begin.

---

### After Week 3 — Build Next (AI + Chat)

Do not start Build Next until:
1. At least 20 real quote requests have been submitted and processed through the Week 1–3 system
2. Sales has confirmed the email flow and SOP are working without issues
3. `GEMINI_API_KEY` is provisioned and the server-side URL fetch is tested

**Step 19 — /api/ai/extract endpoint (Week 4)**  
Server-side URL fetch → Gemini extraction → AIExtractionResult JSON response. Implement caching, rate limiting, and the `page_readable: false` fallback. Test against Amazon, a Shopify store, and a JS-heavy page.

**Step 20 — AI extraction UI on /cotizar.html and portal form (Week 4–5)**  
URL paste field with "Analizar" trigger. Confidence badges. Field pre-fill from extraction result. "Verificar" / "Confirmar" badge behavior. "Confirmé todos los datos" checkbox on review step when AI was used.

**Step 21 — Chat-assisted intake (Week 6+)**  
Split-panel layout per Section 8. Only build this after the AI extraction endpoint is proven stable. The chat layer wraps the extraction result with a conversation interface — it is not a replacement for the form.

---

*End of CRBOX Quote & Assisted-Purchase Architecture Proposal*  
*Document owner: Product / Engineering*  
*To be reviewed by CRBOX sales team before Phase 1 development begins*
