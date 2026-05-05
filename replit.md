# CRBOX Website

A static HTML/CSS/JS website providing package tracking, tariff calculation, and customer support for CRBOX users.

## Run & Operate

- **Run Static Server:** `python3 server.py` (serves on port 5000)
- **GTM Injector:** `node scripts/inject-gtm.js` (updates GTM ID across pages from `gtm.config.json`)
- **SMTP Health Check:** `python3 healthcheck.py`
- **Required Env Vars:**
    - `CRBOX_SVC_EMAIL` (secret)
    - `CRBOX_SVC_PASSWORD` (secret)
    - `SMTP_HOST` (e.g., `smtp.gmail.com`)
    - `SMTP_PORT` (e.g., `587`)
    - `SMTP_USER` (e.g., `ventas@crbox.cr`)
    - `SMTP_PASS` (secret)
- **Optional Env Vars:**
    - `ALERT_EMAIL` (default: `ventas@crbox.cr`)
    - `SMTP_HEALTH_INTERVAL` (default: `300` seconds)

## Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Python 3 (Flask for API endpoints and static serving)
- **Database:** SQLite (for admin features, e.g., `solicitudes`, `package_groups`)
- **AI Integration:** Google Gemini API
- **Build Tool:** None (static files, some JS scripts for pre-processing)

## Where things live

- **Public HTML Pages:** `index.html`, `servicios.html`, `como-funciona.html`, `tarifas.html`, `calculadora.html`, `contacto.html`
- **Google Tag Manager Config:** `gtm.config.json`
- **Main JavaScript Logic:** `js/main.js` (general UI), `js/auth.js` (authentication), `js/portal-api.js` (CRBOX Portal API client), `js/calculator-engine.js` (core calculation logic), `js/ai-extractor.js` (AI product extraction)
- **CRBOX Knowledge Base:** `knowledge/crbox-kb.json` (source of truth for Gemini prompts and frontend context)
- **CSS:** `css/styles.css` (global), `css/responsive.css` (responsive adjustments), `css/dashboard.css` (portal-specific styles), `css/chat-panel.css` (chat UI)
- **Backend Server:** `server.py`
- **Database Schema:** Defined implicitly by SQLAlchemy models in `server.py` (e.g., `solicitudes`, `package_groups`, `consultas_generales` tables).
- **Invoice Uploads:** `uploads/invoices/` (ignored by Git, managed by `server.py`)
- **Documentation:** `docs/tariff-integration.md` (TICA system research)

## Architecture decisions

- **No Framework/Build Pipeline:** Intentional choice for simplicity and zero dependencies, leading to faster iteration for a static-heavy site.
- **Client-Side API Calls:** Browser-to-backend (clients.crbox.cr) for most authenticated operations, leveraging CORS.
- **Server-Side Proxy for Sensitive Operations:** `server.py` acts as a proxy for operations requiring CRBOX service account credentials (e.g., registration) or bypassing CORS/origin restrictions (e.g., invoice uploads to WordPress).
- **Decoupled Calculator Logic:** `js/calculator-engine.js` is pure calculation, `js/tariff-adapter.js` handles data fetching, allowing flexible data sources (estimated, official, user override) without touching core math.
- **UI-Driven Activation Flow:** Non-dismissable activation card and checklist on the dashboard, combined with deep-linking to `mi-cuenta.html`, guides new users to complete their profile.

## Product

- **Multi-Item Shipment Planner:** Advanced calculator allowing users to add multiple items, obtain consolidated vs. separate shipping cost comparisons, and generate detailed quotes.
- **AI Product Data Extraction:** Automatic extraction of product details from URLs, including compliance checks and weight/dimension estimation, to streamline quote requests.
- **User Portal:** Personalized dashboard, package tracking, invoice management, and profile editing.
- **Integrated Chat Assistant:** AI-powered chat with inline widgets (calculator, quote form) for interactive support.
- **Admin Dashboard:** Tools for managing user requests (solicitudes), viewing inquiries, and generating AI-assisted responses.
- **Registration Flow:** Streamlined signup process for personal and business accounts with immediate auto-login.

## User preferences

- **For code changes:** I prefer a detailed explanation of the changes, their purpose, and any potential side effects. Please provide examples if the changes involve new patterns or complex logic. I value clear, well-commented code.
- **For design choices:** I prefer designs that are clean, intuitive, and consistent with existing brand guidelines. Prioritize user experience and accessibility.
- **For feature development:** I prefer an iterative approach, with small, testable increments. Regular communication about progress and any roadblocks is appreciated.
- **For debugging:** I prefer a systematic approach, starting with identifying the scope of the problem and then narrowing down the root cause. Provide clear steps to reproduce and verify fixes.
- **For communication:** I prefer direct and concise communication. Please use clear language and avoid jargon where possible.
- **For documentation:** I prefer documentation to be kept up-to-date and to accurately reflect the current state of the system. Focus on practical guidance and common use cases.

## Gotchas

- **GTM Updates:** Always run `node scripts/inject-gtm.js` after changing `gtm.config.json` and before any deployment.
- **Invoice Upload Validation:** End-to-end testing of the invoice upload flow (upload -> `postcreatepurchasebill` -> visible in CRBOX admin) is critical and not yet fully confirmed in production.
- **Registration Errors:** Generic "Hubo un error..." during registration can be caused by throwaway email domains, duplicate emails, or duplicate ID numbers – check these first.
- **Client-side Account State:** `crbox_onboarding` and `crbox_activation_toast_shown` localStorage keys control activation UI; manage carefully to avoid UI glitches.
- **CSS Versioning:** Remember to bump the `v=` query parameter in HTML for shared CSS files (`styles.css`, `responsive.css`, `dashboard.css`) when making changes to ensure clients receive the latest version.
- **AI Extraction Confidence:** Fields with confidence below 0.80 or marked `needs_confirmation` in AI extraction require manual review (highlighted in admin).

## Pointers

- **CRBOX Portal API Documentation:** `js/portal-api.js` (defines client-side API interaction)
- **Costa Rica DGA/TICA System:** `docs/tariff-integration.md`
- **Google Tag Manager:** [https://tagmanager.google.com/](https://tagmanager.google.com/)
- **Google Workspace App Passwords:** [https://myaccount.google.com/security](https://myaccount.google.com/security)
- **CRBOX Auth Flow (Confirmed Working):** Search for "Registration baseline — confirmed working (2026-04-26)" in the original document for full details and test account credentials.
- **`healthcheck.py` Usage:** `scripts/healthcheck.py` for SMTP monitoring.