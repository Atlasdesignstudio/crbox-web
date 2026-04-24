# Portal UI/UX Polish — Audit Report (task #83)

Polish-only pass across the four authenticated portal pages. No redesign,
no new design system, no new backend fields, no fake data. All edits
reuse existing primitives in `css/dashboard.css` and per-page IIFE wiring.

## 1. Useful real backend data newly surfaced

| Page | Field | Source |
|------|-------|--------|
| Mi Cuenta | `PendingDiscount` (e.g. *"5% Descuento Disponible"*) shown as a badge in the profile header, mirroring the dashboard treatment. | `getuserinfo` — same field already used by `dashboard.html` `_applyProfile` (`info.PendingDiscount`). |
| Mi Cuenta · mobile menu | Casillero number (`Casillero #N`) under the user name, matching dashboard / mis-paquetes. | `consignee.idconsignee` from `getuserinfo`. |
| Mis Facturas · mobile menu | Casillero number under the user name. | `consignee.idconsignee` from `getuserinfo`. |
| Mis Facturas · search bar | Explicit *Desde* / *Hasta* labels above the two date inputs (the inputs were already wired to `_getStart` / `_getEnd`; the dates were just unlabelled). | `getfacturas` start / end parameters. |
| Mis Facturas · top bar | "Actualizar" now actually re-calls `getfacturas` with the current date range and reflects the request lifecycle, instead of a fake 1 s spinner. | `getfacturas` (same loader as initial render). |

## 2. Real fields intentionally kept hidden / unchanged — and why

- **Recibo internal IDs (`recibos[].id`, raw status codes).** Not user
  meaningful — already correctly hidden behind the inline expansion that
  shows number, status name, store, carrier, weight, volumetric weight.
- **`masterAirShipmentNumber` on a per-recibo basis.** Already shown
  once at the bill (factura) level. Repeating it per recibo would only
  add noise.
- **Per-package internal flags (`isGroupable`, `isInsured`, etc.).**
  No UI commitment exists in the portal yet, and surfacing them without
  a documented client-facing meaning would be misleading.
- **Payment status on facturas.** No `pagado / pendiente` field is
  returned by `getfacturas` today; the *Estado de Pago* card stays
  honest with the "Próximamente" treatment, instead of inferring a
  status from `total > 0` or similar guesses.
- **Two-factor auth, real-time push channels, address CRUD.** No
  backend support yet — they keep their existing neutral
  *próximamente* note rather than being wired to fake handlers.

## 3. Coherence improvements (cross-page)

- **Secondary tab bar** on Mis Facturas and Mi Cuenta is now `sticky
  top-16 z-30` and uses the same hover-underline span pattern as the
  Dashboard / Mis Paquetes tab bar. The four pages now share one tab
  bar behaviour and look (sticky, animated underline, active page
  underline always visible).
- **Mobile user block** on Mis Facturas and Mi Cuenta now shows
  *Casillero #N* under the user name, matching the Dashboard / Mis
  Paquetes mobile menu.
- **Mi Cuenta profile header** now carries the same `PendingDiscount`
  badge shape as the Dashboard welcome banner (white-on-translucent
  pill on the orange header), so the discount is visible no matter
  which page the user lands on.
- **Mis Facturas date inputs** now have explicit *Desde* / *Hasta*
  labels; the underlying wiring already used the first / second
  date input and is unchanged.
- **Mis Facturas Refresh button** is now real (calls `_loadBills`
  with the current period, disables itself + spins while in flight)
  and Export keeps the honest *próximamente* notice but routes
  through the toast helper when available instead of `alert()`.

## 4. Modules / pages refined

- `dashboard.html` — no UI edits this pass; used as the reference
  pattern for tab bar, mobile casillero badge, and discount badge.
- `mis-paquetes.html` — *"Total Paquetes"* subtitle changed from a
  hardcoded *"Último mes"* to *"En el período seleccionado"*. The
  date filter is user-controllable, so the previous label was
  contradicting the active filter.
- `mis-facturas.html` — sticky tab bar with hover-underline pattern,
  date input labels, real Refresh wiring, mobile casillero badge,
  toast-based Export notice, button IDs (`bills-refresh-btn`,
  `bills-search-btn`, `bills-export-btn`, `bills-date-from`,
  `bills-date-to`) so handlers no longer rely on icon-class
  selectors.
- `mi-cuenta.html` — sticky tab bar with hover-underline pattern,
  mobile casillero badge, real `PendingDiscount` badge in the
  profile header.

## 5. Remaining UX limits caused by backend gaps

- **Payment status on facturas.** No way to show paid / pending /
  overdue, or amount due, without a backend field. The summary card
  stays "Próximamente".
- **PDF download for facturas.** No public download endpoint, so the
  per-row download button still surfaces an honest toast instead of
  pulling a real file.
- **Notification preferences** beyond `receivesNewsletter`.
  No channel-specific or event-specific preference is exposed; the
  notifications tab keeps its neutral notice.
- **Address management on Mi Cuenta.** `getuserinfo` returns the
  saved Costa Rica addresses but there is no add / edit / delete
  endpoint, so *Agregar Dirección* still surfaces the honest
  "próximamente" note.
- **Tracking history per package.** The package detail and the
  tracking-modal both show "No hay eventos de rastreo disponibles"
  whenever the package payload doesn't include events — there is no
  separate event-stream endpoint to fall back to.
