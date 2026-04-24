# Portal Confirmed-Legacy-Fields Refinement — Decision Report (task #89)

A continuation of Task #82 (legacy parity) and Task #83 (UI/UX polish).
This pass surfaces newly confirmed real fields from `getuserpackages`
and locks Mis Facturas strictly against the real
`{ Factura, Recibos[] }` shape end-to-end. Same portal, same visual
system, same truthfulness rules — just more complete and more
disciplined. Not a redesign, not a maximal data exposure pass.

The mapper in `js/portal-api.js` remains the single source of truth.
Every newly surfaced field is normalized in the mapper first; pages
consume mapped objects only. No raw nested access (`raw.Factura`,
`raw.descuentoCorporativo._nombre`, `raw.masterAirShipment.…`,
`raw.consigneeSucursalName`, etc.) was introduced in any renderer,
modal-population helper, summary-card helper, search/filter/sort
helper, or expansion/accordion content.

## 1. Newly confirmed fields — surfaced

| Field (source) | Where it now appears | UI label |
|----------------|----------------------|----------|
| `consigneeSucursalName` (`getuserpackages`) | Mis Paquetes — package detail modal, "Información de Envío" block | "Sucursal de retiro" |
| `descripcionfactura` (`getuserpackages`) | Mis Paquetes — package detail modal, new "Factura asociada" group (passive metadata, hidden when empty) | "Detalle" |
| `invoicesCount` (`getuserpackages`) | Mis Paquetes — package detail modal, new "Factura asociada" group (only when `> 0`) | "Facturas asociadas: N" |
| `totalvolume` (`getuserpackages`) | Mis Paquetes — package detail modal, "Dimensiones y Peso" block (already present from prior pass; verified) | "Volumen" |
| `Factura.volumentricWeigth` (`getfacturas`) | Mis Facturas — bills table, new column between "Peso" and "Descuento" | "Peso Vol." |

Notes on placement:
- Overview surfaces (Mis Paquetes list/grid) intentionally stayed
  light — none of the newly surfaced fields were added there.
- The "Factura asociada" group only renders when at least one of
  `descripcionfactura` or `invoicesCount > 0` is present; otherwise
  the entire section is hidden so empty modals stay clean.

## 2. Newly confirmed fields — intentionally not surfaced

| Field | Considered for | Decision | Rejection category | Rationale |
|-------|----------------|----------|--------------------|-----------|
| `montofactura` | Mis Paquetes — package detail modal "Factura asociada" group (alongside description) | Hidden | Misleading semantics | Currency is not declared in the payload (CRC vs USD is unknown), and a bare amount in a portal that has no payment surface risks being read as "monto a pagar" / "saldo" / "factura por pagar". The bills page already carries the canonical, contextualized invoice total via `Factura.total`, so the value adds no incremental clarity at the package level while introducing real risk of misinterpretation. |
| `totalvolume` | Mis Paquetes — tracking modal result block | Hidden | Clutter risk | The result block already stacks seven dense rows (status, date, store, carrier, weight, volumetric weight, notes). Adding an eighth row crowded the block and broke the "scan-friendly on first glance" feel the modal should keep. The detail modal remains the canonical home for dimensional density (it does show `totalvolume`). |
| `descripcionfactura` / `montofactura` / `invoicesCount` | Mis Paquetes — list view & grid view (overview surfaces) | Hidden | Visual restraint | Per the refinement principle "overview stays light, detail absorbs density". These are package-adjacent billing metadata that earn their place at detail level, not at list / grid level where they would crowd already wide rows and tall cards. |
| `descripcionfactura` / `montofactura` / `invoicesCount` | Dashboard — new metric / card / badge | Hidden | Misleading semantics | Could be confused with payment / invoice lifecycle state. There is no defensible non-billing meaning that survives summarization to a single dashboard tile. |
| `invoicesCount` | Dashboard — "Paquetes facturados" card | Hidden | Misleading semantics | A "facturados" headline implies a billing-lifecycle distinction (facturado vs no facturado vs cobrado) that the backend does not support today. Dashboard stays unchanged. |
| `descripcionfactura` / `montofactura` / `invoicesCount` | Mis Facturas — bills page | Hidden | Wrong surface | These are package-level fields, not invoice-level fields; surfacing them on the bills page would mix two different objects and confuse provenance. |
| `descripcionfactura` / `montofactura` / `invoicesCount` | Tracking modal | Hidden | Visual restraint | Tracking modal must stay compact and shipment-focused. |

## 3. Mis Facturas — strict-shape audit (end to end)

Confirmed that every Mis Facturas helper now consumes the **mapped**
bill object only, never raw nested JSON. There are no remaining flat-
row, guessed-status, guessed-subtotal, guessed-currency, or
paid/pending assumptions anywhere on the page.

Audited surfaces:

| Surface | Reads from | Status |
|--------|------------|--------|
| Table row renderer (`_renderBillRow`) | `bill.factura`, `bill.bestDate`, `bill.masterAirShipmentNumber`, `bill.recibos`, `bill.cantidadBultos`, `bill.weigth`, `bill.volumentricWeigth`, `bill.descuentoNombre`, `bill.total` | Mapped only ✓ |
| Recibos summary cell (`_renderRecibosCell`) | `recibos[*].number` from `mapRecibo` | Mapped only ✓ |
| Inline expansion (`_renderRecibosDetail`) | `recibos[*].number / statusname / receiveddatetime / shippername / carriername / totalweight / totalvolumetricweight` from `mapRecibo` | Mapped only ✓ |
| Stats / summary cards (`_renderBillsStats`) | `bill.total` only — invoice count + summed `total`. No fabricated paid / pending counts. | Mapped only ✓ |
| Search filter (`_applyBillsSearch`) | `bill.factura` only — case-insensitive substring match against the invoice number. | Mapped only ✓ |
| Date helper (`_fmtDate`) | Reads pre-derived `bill.bestDate` (= `Factura.billedDate || Factura.createdDate`). When both are null, the helper returns the neutral `—` placeholder and never throws. | Safe ✓ |
| Empty / loading / error states | All `<td colspan>` values updated from 9 to 10 to match the new "Peso Vol." column. Preserved-empty markup, search-empty fallback, loading row, error row, and the user-info-failure error row are all consistent. | Consistent ✓ |
| Inline expansion `<td colspan>` | Updated to 10 to match the new column count. | Consistent ✓ |
| Loader (`_loadBills`) | Always calls `CRBOXPortalAPI.mapBill(r)` over the raw response array (with the historical `bills / Bills / facturas` envelope fallback for older response shapes). | Mapped only ✓ |

The bill mapper now also exposes `Factura.volumentricWeigth` as the
mapped `volumentricWeigth` field, alongside the existing `weigth`,
`cantidadBultos`, `total`, `descuentoNombre`, `billedDate`,
`createdDate`, `masterAirShipmentNumber`, `isInvoiced`, and `recibos`.

## 4. Mis Paquetes — detail modal enrichment

- New "Sucursal de retiro" line in the detail modal's "Información de
  Envío" block, populated from the mapped `pkg.consigneeSucursalName`.
  Empty/null values render as `—`.
- New "Factura asociada" section appears at detail level when at least
  one of `descripcionfactura` or `invoicesCount > 0` is present. The
  individual lines inside (description / count) are independently
  shown or hidden based on which fields are populated. The wrapping
  section is fully hidden when neither is present, so empty modals
  remain clean.
- The new section is purposely framed as **passive metadata**:
  - no payment-CTA wording,
  - no "saldo" / "monto pendiente" / "factura por pagar" /
    paid / unpaid / collection language,
  - no badge or status pill — just neutral icon + label + value lines.
- `totalvolume` continues to render in the "Dimensiones y Peso" block.
- Overview surfaces (list view + grid view) were not touched —
  consistent with the "overview stays light" principle.

## 5. Tracking modal — totalvolume decision

Considered, rejected. The tracking modal result block already stacks
seven dense rows. Adding an eighth row for `totalvolume` made the
block visually heavy on first glance and broke the scan-friendly feel
the modal needs to keep. The detail modal remains the canonical home
for dimensional density and already exposes `totalvolume`. Decision
recorded here as required.

## 6. Dashboard — verified, unchanged

The dashboard already consumes mapped package objects via
`CRBOXPortalAPI.mapPackage`, derives "Paquetes en camino" from
`IN_TRANSIT_STATUS_IDS`, and feeds "Actividad reciente" through the
defensible `STATUS_ID_EVENT` map. No new card, badge, summary, or
metric was introduced from `invoicesCount`, `descripcionfactura`,
`montofactura`, or any other package-adjacent billing field.

The reasoning for not adding any of these was already covered in the
rejection table: dashboard summarization at this level cannot avoid
billing-lifecycle implications the backend doesn't support yet.

## 7. Truthfulness guards — re-checked

- All affected blocks (bills row, bills inline expansion, package
  detail modal rows, tracking modal result block, dashboard cards)
  render `—` for null / empty values via the existing `_orDash`,
  `_fmtNum`, `_fmtDate`, and `_fmtKg` helpers.
- No hardcoded demo strings reintroduced.
- No new payment-status, paid/unpaid, balance, or due-amount label
  added anywhere.
- Static HTML defaults for the new modal lines stay neutral (`—`),
  so live data never collides with stale placeholders during a flash.

## 8. Remaining limitations — backend semantics, not UI

These are not UI gaps; they are limits driven by what the backend
exposes today.

- **Payment status on facturas.** `getfacturas` still does not return
  a paid / pending / overdue field. The Mis Facturas summary card
  keeps its honest "Próximamente" treatment.
- **Currency on package-level invoice amounts.** `montofactura` is
  not accompanied by a currency code. Surfacing a bare amount in a
  portal with no payment surface is a misinterpretation risk, so the
  field stays hidden until the backend declares currency or until a
  payment surface gives it explicit context.
- **Per-package tracking events.** Neither `getuserpackages` nor any
  other endpoint returns a per-shipment event timeline today, so the
  detail modal and the tracking modal both keep the honest "No hay
  eventos de rastreo disponibles" empty state.
- **PDF download for facturas.** No public download endpoint exists,
  so the per-row download button still surfaces the honest
  "próximamente" toast instead of pulling a real file.
- **Two-factor auth, address CRUD, channel-specific notification
  preferences.** No backend support; Mi Cuenta keeps its neutral
  "próximamente" notes.
