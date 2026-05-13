# RDS Discovery Report — crbox_dev1
**Date:** 2026-05-13  
**Status:** COMPLETE — Full read-only schema discovery  
**Executed by:** Replit task agent (read-only, no writes, no frontend changes)

---

## 1. Executive Summary

### Connection Status
- **Result:** Connected successfully
- **Active database confirmed:** `crbox_dev1` ✓ (verified via `SELECT DATABASE()`)
- **MySQL version:** 5.7.44-rds.20250508-log (Amazon RDS)
- **Host:** crboxdbserver.cvfe6dzk8nhz.us-east-1.rds.amazonaws.com
- **Port:** 3306
- **User:** CrBoxUser

### High-Level Observations
- **91 tables** found in `crbox_dev1`; **715 columns** total
- The schema is a mature, multi-year operational database — not a greenfield structure
- **`warehousereceipt`** is the central operational entity: 477K+ rows, 10 foreign keys, linked to nearly every other domain table
- **`consignee`** (31K rows, 30 columns) is the canonical customer/user table — it is the primary identity record for portal users
- **`client`** (27K rows, 5 columns) is the account/company entity that consignees belong to — `consignee.idClient → client.idClient`
- **`resumenmawb`** (257K rows, 45 columns) is the invoice/billing record — the most complex financial table and the backbone of `getfacturas`
- **`purchase_bill`** (202K rows) stores uploaded customer invoices (PDFs/receipts) linked to warehousereceipts
- **`piece`** (505K rows) stores individual package dimensions/weights per warehousereceipt
- **14 Hangfire tables** confirm the backend runs on .NET with Hangfire background job scheduling
- **`getwarehousereceipts`** and **`couriermanifest`** appear to be database views (no primary key, `TABLE_ROWS = NULL`)
- **`event`** and **`eventtype`** exist with 0 rows — a package event/history system that was built but never populated
- **`discount`** has 1 discount code defined; `discount_consignee` has 324 assignment records
- Several tables have 0 rows: `ConsigneePaging`, `event`, `eventtype`, `external_jobs`, `predeliverynotification`, `status_warehousereceipt`, `HangfireCounter`, `HangfireDistributedLock`, etc.

---

## 2. Table Inventory Summary

> Row counts: exact for tables with <5,000 estimated rows; approximate (from `information_schema.TABLES`) for larger tables. Large-table counts may vary ±5% from InnoDB statistics.

| Table | Rows (approx) | Cols | Category | Sensitivity | Confidence |
|---|---|---|---|---|---|
| ConsigneeBakEscazu_200617 | 1,142 | 24 | customer (backup) | critical | confirmed |
| ConsigneePaging | 0 | 13 | customer (utility) | sensitive | strong hypothesis |
| HangfireAggregatedCounter | 8 | 4 | background jobs | safe | confirmed |
| HangfireCounter | 0 | 4 | background jobs | safe | confirmed |
| HangfireDistributedLock | 0 | 2 | background jobs | safe | confirmed |
| HangfireHash | 9 | 5 | background jobs | safe | confirmed |
| HangfireJob | 2 | 7 | background jobs | safe | confirmed |
| HangfireJobParameter | 8 | 4 | background jobs | safe | confirmed |
| HangfireJobQueue | 1 | 5 | background jobs | safe | confirmed |
| HangfireJobState | 0 | 6 | background jobs | safe | confirmed |
| HangfireList | 0 | 4 | background jobs | safe | confirmed |
| HangfireServer | 1 | 3 | background jobs | safe | confirmed |
| HangfireSet | 1 | 5 | background jobs | safe | confirmed |
| HangfireState | 6 | 6 | background jobs | safe | confirmed |
| Status | 5 | 2 | configuration | safe | confirmed |
| Sucursal | 4 | 5 | configuration | safe | confirmed |
| address | ~65,631 | 14 | customer | sensitive | confirmed |
| addresstype | 3 | 2 | configuration | safe | confirmed |
| airline | 12 | 8 | configuration | safe | confirmed |
| airshipment | ~110,435 | 14 | logistics/shipping | safe | confirmed |
| airshipmenttype | 0 | 2 | configuration | safe | confirmed |
| android_app_config | 16 | 3 | configuration | safe | confirmed |
| articulo | ~101,930 | 19 | financial/invoice | sensitive | confirmed |
| banner_home_android | 3 | 3 | configuration | safe | confirmed |
| bitacora_facturacion | ~12,807 | 3 | audit/logging | safe | strong hypothesis |
| cargomanifest | 3,613 | 16 | logistics/shipping | safe | confirmed |
| carrier | 435 | 2 | configuration | safe | confirmed |
| carrier_has_address | 99 | 2 | configuration | safe | confirmed |
| carrier_has_phone | 85 | 2 | configuration | safe | confirmed |
| carrierinformation | ~478,375 | 7 | logistics/shipping | safe | confirmed |
| chargetype | 4 | 2 | configuration | safe | confirmed |
| client | ~27,184 | 5 | customer | sensitive | confirmed |
| consecutivo_facturacion | ~195,078 | 2 | financial/invoice | safe | strong hypothesis |
| consignee | ~31,580 | 30 | customer | critical | confirmed |
| consignee_has_address | ~26,256 | 2 | customer | sensitive | confirmed |
| consignee_has_phone | ~42,457 | 2 | customer | sensitive | confirmed |
| country | 3 | 2 | configuration | safe | confirmed |
| couriermanifest | view | 27 | logistics/shipping | sensitive | confirmed |
| crboxairshipment | 2 | 17 | logistics/shipping | sensitive | strong hypothesis |
| descripcionfactura | ~44,670 | 4 | financial/invoice | safe | confirmed |
| descuentocorporativo | 2 | 5 | financial | safe | confirmed |
| devices_id | 680 | 3 | audit/logging | sensitive | confirmed |
| devices_id_log | 0 | 5 | audit/logging | sensitive | confirmed |
| devices_notification_queue | ~65,274 | 7 | audit/logging | sensitive | confirmed |
| discount | 1 | 16 | financial | safe | confirmed |
| discount_consignee | 324 | 9 | financial/customer | sensitive | confirmed |
| etiquetaembarque | ~199,560 | 16 | logistics/shipping | safe | confirmed |
| etiquetaentrega | ~499,749 | 17 | logistics/shipping | sensitive | confirmed |
| event | 0 | 5 | audit/logging | safe | confirmed |
| eventtype | 0 | 2 | audit/logging | safe | confirmed |
| external_jobs | 0 | 9 | audit/logging | safe | strong hypothesis |
| facturaaduanal | 2,431 | 13 | financial/invoice | sensitive | confirmed |
| facturatemplate | 7 | 2 | configuration | safe | confirmed |
| freightforwarder | 1 | 11 | logistics/shipping | safe | confirmed |
| getwarehousereceipts | view | 32 | logistics (view) | sensitive | confirmed |
| google_token_consignee | 1,422 | 3 | customer | sensitive | confirmed |
| identificationtype | 3 | 2 | configuration | safe | confirmed |
| language | 1 | 2 | configuration | safe | confirmed |
| masterairshipment | 3,609 | 56 | logistics/shipping | safe | confirmed |
| masterairshipmentcharge | 5 | 5 | financial | safe | confirmed |
| masterconsignee | 1 | 8 | logistics/shipping | safe | confirmed |
| mastershipper | 1 | 9 | logistics/shipping | safe | confirmed |
| newsletter | 7 | 16 | audit/logging | safe | strong hypothesis |
| notifications | 3 | 8 | audit/logging | sensitive | confirmed |
| package | ~5,848 | 9 | package/shipping | safe | confirmed |
| packagetype | 4 | 2 | configuration | safe | confirmed |
| payment_method | 5 | 2 | financial | safe | confirmed |
| phone | ~63,785 | 6 | customer | sensitive | confirmed |
| phonetype | 4 | 2 | configuration | safe | confirmed |
| piece | ~505,741 | 11 | package/shipping | safe | confirmed |
| plan | 1 | 4 | configuration | safe | confirmed |
| predeliverynotification | 0 | 1 | logistics | safe | weak hypothesis |
| purchase_bill | ~202,598 | 8 | financial/invoice | sensitive | confirmed |
| resumenmawb | ~257,019 | 45 | financial/invoice | critical | confirmed |
| shipper | ~23,961 | 3 | logistics/shipping | safe | confirmed |
| shipper_has_address | ~13,623 | 2 | logistics/shipping | safe | confirmed |
| shipper_has_phone | 1,483 | 2 | logistics/shipping | safe | confirmed |
| state | 58 | 3 | configuration | safe | confirmed |
| status_general | 6 | 3 | configuration | safe | confirmed |
| status_warehousereceipt | 0 | 2 | configuration | safe | weak hypothesis |
| store | 55 | 5 | configuration | safe | confirmed |
| supplier | ~19,852 | 2 | logistics/shipping | safe | confirmed |
| supplier_has_address | ~8,281 | 2 | logistics/shipping | safe | confirmed |
| supplier_has_phone | 910 | 2 | logistics/shipping | safe | confirmed |
| supplierinformation | ~52,185 | 4 | logistics/shipping | safe | confirmed |
| system_parameter | 4 | 4 | configuration | safe | confirmed |
| tmp_codfacturacion | 3,875 | 2 | financial (temp) | safe | weak hypothesis |
| user | 64 | 2 | customer | sensitive | confirmed |
| warehousereceipt | ~477,181 | 24 | logistics/package | sensitive | confirmed |
| warehousereceipt_mobile_notifier | ~853,230 | 7 | audit/logging | safe | confirmed |
| warehousereceiptcharge | ~8,594 | 6 | financial | safe | confirmed |

---

## 3. Table-by-Table Schema Map

### consignee (30 cols, ~31,580 rows) — CRITICAL
The canonical customer/portal-user record.

| Column | Type | Notes |
|---|---|---|
| idConsignee | PK | Casillero ID used across the entire system |
| consigneeName | varchar | First name |
| consigneeLastName1 | varchar | First surname |
| consigneeLastName2 | varchar | Second surname |
| identificationType | int | → identificationtype.idIdentificationType |
| identificationNumber | varchar | National ID / passport — **critical PII** |
| residenceCountry | int | → country.idCountry |
| language | int | → language.idlanguage |
| email | varchar | Login email — **critical PII** |
| idClient | int (MUL) | → client.idClient |
| createdDate | datetime | Registration timestamp |
| fullName | varchar | Computed full name |
| idSucursal | int | Preferred branch |
| idPlan | int (MUL) | → plan.idPlan |
| cantidadPaquetes | int | Package count (possibly cached) |
| receivesNewsletter | tinyint | Marketing opt-in |
| alternativeEmail | varchar | Secondary email |
| contactName1, contactName2 | varchar | Emergency/secondary contacts |
| isCompany | tinyint | Business account flag |
| contact1Identification | varchar | Contact ID |
| receivesMobileNotification | tinyint | Push notification opt-in |
| codigoFacturacion | varchar | Billing code |
| lastModified | datetime | Last profile update |
| responsabilidad | varchar | Liability/responsibility field |
| idResponsabilidad | int | FK-like responsibility type |
| omitirRecep | tinyint | Skip reception notification flag |
| updated | tinyint | Dirty/update flag |
| birthDate | date | Date of birth — **critical PII** |
| economicActivityCode | varchar | Business activity code (for `isCompany`) |

**Status fields:** none explicit — status is managed via warehousereceipt  
**Populated:** Yes, heavily  
**Represents:** Every registered CRBOX customer/casillero holder

---

### client (5 cols, ~27,184 rows)
Account/company grouping entity. Consignees belong to a client.

| Column | Type | Notes |
|---|---|---|
| idClient | PK | |
| name | varchar | Company or account name |
| accountType | varchar | Personal / business |
| cedulaJuridica | varchar | Business tax ID |
| owner | int | FK-like → consignee? |

**Represents:** The billing/account entity above individual consignees. Mostly 1:1 with personal users; 1:many for business accounts.

---

### warehousereceipt (24 cols, ~477,181 rows) — CORE OPERATIONAL TABLE
Every physical package that arrives at the CRBOX warehouse.

| Column | Type | Notes |
|---|---|---|
| idWarehouseReceipt | PK | The "guia" / receipt ID |
| number | varchar | Human-readable WR number |
| receivedDateTime | datetime | When package arrived |
| totalPieces | int | Number of pieces |
| totalWeight | decimal | Weight in lbs/kg |
| totalVolume | decimal | Volume |
| totalVolumetricWeight | decimal | Volumetric weight for billing |
| User | int (MUL) | → user.idUser (staff who received) |
| Status | int (MUL) | → Status.idStatus |
| FreightForwarder | int (MUL) | → freightforwarder |
| Shipper | int (MUL) | → shipper.idShipper |
| Consignee | int (MUL) | → consignee.idConsignee — **ties to customer** |
| PreDeliveryNotification | int (MUL) | → predeliverynotification |
| CarrierInformation | int (MUL) | → carrierinformation |
| AirShipment | int (MUL) | → airshipment.idAirShipment |
| SupplierInformation | int (MUL) | → supplierinformation |
| Package | int (MUL) | → package.idPackage |
| consigneeNotes | text | Notes from/for customer |
| ischecked | tinyint | Checked-in flag |
| econtainer | tinyint | Electronic container flag |
| createdDate | datetime | Record creation |
| impreso | tinyint | Label printed flag |
| consolidado | tinyint | Consolidated shipment flag |
| emision | datetime | Emission/dispatch date |

**Represents:** The `mis paquetes` data source. Every warehousereceipt = one package line for the customer.

---

### resumenmawb (45 cols, ~257,019 rows) — BILLING/INVOICE CORE
The main invoice/billing record. Each row = one customer invoice tied to a Master Air Waybill.

| Column | Type | Notes |
|---|---|---|
| idResumenMAWB | PK | Invoice ID |
| Consignee | int (MUL) | → consignee.idConsignee |
| weigth, volumetricWeigth | decimal | Billed weight |
| cantidadBultos | int | Number of packages |
| flete, recargoCombustible | decimal | Freight + fuel surcharge |
| Airshipment | int (MUL) | → airshipment |
| MasterAirshipment | int (MUL) | → masterairshipment |
| factura | varchar | Invoice number |
| DAI, selectivo, impuestos | decimal | Tax breakdowns |
| total | decimal | **Total amount billed** |
| unoporciento, treceporciento | decimal | 1% and 13% tax amounts |
| isInvoiced | tinyint | Billing finalized flag |
| idPlan | int | Plan at time of invoicing |
| idDescuentoCorporativo, idDiscount | int | Applied discounts |
| codigoFacturacion | varchar | Billing code |
| createdDate, billedDate | datetime | Invoice lifecycle dates |
| paymentDate, paymentRegistrationDate | datetime | Payment tracking |
| paymentMethod | int | → payment_method |
| hiddenBill | tinyint | Hidden from customer flag |
| IVA | decimal | VAT amount |
| enlace | varchar | PDF link or external ref |

**Represents:** The `mis facturas` data source — the invoice list the customer sees.

---

### purchase_bill (8 cols, ~202,598 rows)
Customer-uploaded invoice files (purchase receipts tied to packages).

| Column | Type | Notes |
|---|---|---|
| idpurchase_bill | PK | |
| create_date | datetime | Upload timestamp |
| location | varchar | File path / URL |
| WarehouseReceipt | int (MUL) | → warehousereceipt.idWarehouseReceipt |
| TextContent | text | OCR or pasted text content |
| numero_factura | varchar | Invoice number from the document |
| monto | decimal | Amount on the invoice |
| descripcion | varchar | Description |

**Represents:** Every invoice PDF uploaded by customers or staff for customs declaration. Powers the purchase bill flow.

---

### piece (11 cols, ~505,741 rows)
Individual physical pieces within a warehousereceipt (one WR can have multiple pieces).

| Column | Notes |
|---|---|
| idPiece | PK |
| WarehouseReceipt | → warehousereceipt.idWarehouseReceipt |
| PackageType | → packagetype |
| quantity, height, width, llong | Dimensions |
| description | Package contents description |
| weight, volumetricWeight, unit | Weight data |

**Represents:** Sub-items of a package shipment. Used for sticker/label generation (`etiquetaentrega`).

---

### airshipment (14 cols, ~110,435 rows)
Individual air waybills (guías hijas / house air waybills).

| Column | Notes |
|---|---|
| idAirShipment | PK |
| AirShipmentType | → airshipmenttype |
| airShipmentNumber | Guía hija number |
| totalVolume, totalWeight, totalPieces | Totals |
| createdDate | Creation date |
| idMasterAirShipment | → masterairshipment (MAWB) |
| shipperId, freightForwarderId, consigneeId, issuerId | Parties |
| idCargoManifest | → cargomanifest |
| CrboxAirshipment | → crboxairshipment (CRBOX internal) |

---

### masterairshipment (56 cols, 3,609 rows)
Master Air Waybills — the top-level shipment grouping.

Key columns: `idMasterAirShipment`, `masterAirShipmentNumber`, `idStatus`, `createdDate`, full financial breakdown (`rate`, `total`, `prepaid`, `collect`, `weightCharge`, `tax`, etc.), routing info (`airportOfDeparture`, `airportOfDestination`, `routingTo`), weight/volume totals. Very rich operational data.

---

### carrierinformation (7 cols, ~478,375 rows)
Tracking data for individual carrier shipments (courier tracking numbers + driver info).

| Column | Notes |
|---|---|
| idCarrierInformation | PK |
| proNumber | Carrier PRO number |
| trackingNumber | **Customer-facing tracking number** |
| driverName, driverLicense | Driver info |
| Carrier | → carrier.idCarrier |
| notes | Notes |

**Represents:** The source of carrier tracking numbers. This is what powers the tracking lookup feature.

---

### etiquetaembarque (16 cols, ~199,560 rows)
Shipping labels (embarque = outbound/shipment labels). One per warehousereceipt.

Contains: `idwarehousereceipt`, `freighforwader`, `carrier`, `consignee` (name), `numbermasterairshipment`, `numberairshipment`, `destination`, pieces info, freight forwarder address fields, `warehousereceiptNumber`, `Airshipment`.

---

### etiquetaentrega (17 cols, ~499,749 rows)
Delivery labels (entrega = inbound/delivery). One per piece.

Contains: consignee name, warehousereceipt number, piece FK, `localizacion` (warehouse location), piece/weight/dimensions, `ponumber`, `notas`. The `localizacion` field is notable — suggests physical warehouse location tracking.

---

### couriermanifest (view, 27 cols)
A database view (no PK, NULL row count from information_schema) combining warehousereceipt, airshipment, consignee, shipper data into a manifest format. Columns include: `idWarehouseReceipt`, `recibo`, `guiaHija`, `trackingNumber`, `idConsignee`, `consignatario`, `email`, `Sucursal`, `numeroFactura`, `montoFactura`, `descripcionFactura`, `telefonos`. Very useful for portal queries — already pre-joins key tables.

---

### getwarehousereceipts (view, 32 cols)
Another database view — the richest pre-joined view in the schema. Columns: `idWarehouseReceipt`, `statusId`, `statusName`, `ischecked`, `econtainer`, `hasPackage`, `number`, `receivedDateTime`, `createdDate`, `impresoFactura`, `consolidadoFactura`, `consigneeFullName`, `idConsignee`, `trackingNumber`, `shipperName`, `totalPieces`, `totalWeight`, `totalVolume`, `totalVolumetricWeight`, `carrierName`, `airShipmentNumber`, `masterAirShipmentNumber`, `emision`, `warehouseReceiptCharges`, `consigneeNotes`, `userName`, `consigneeSucursalId`, `consigneeSucursalName`, `descripcion`, `montoFactura`, `descripcionFactura`, `invoicesCount`.

**This view is likely what the legacy `getuserpackages` endpoint queries directly.** It provides almost everything needed for `mis paquetes`.

---

### user (2 cols, 64 rows)
Staff/operator table — very minimal.

| Column | Notes |
|---|---|
| idUser | PK |
| username | Staff username |

Only 64 records — these are internal CRBOX staff users, not customer accounts.

---

### discount (16 cols, 1 row active) + discount_consignee (9 cols, 324 rows)
Full discount system with codes, amounts, validity dates, and assignment tracking.

**discount** columns: `idDiscount`, `discountCode`, `name`, `description`, `active`, `isDeleted`, `creationDate/User`, `lastModifiedDate/User`, `deletionDate`, `discountType`, `discountAmount`, `validFrom`, `validUntil`, `assignToNewClients`.

**discount_consignee** columns: `idDiscountConsignee`, `idDiscount`, `idConsignee`, `assignationDate`, `usageDate`, `realDiscountAwarded`, `status`, `idResumenMAWB` (which invoice it was applied to), `notes`.

**324 discount assignments exist** — this is live, active data.

---

### notifications (8 cols, 3 rows)
Email/push notification log.

| Column | Notes |
|---|---|
| idNotifications | PK |
| fromEmail, toEmail | Sender/recipient |
| subjectEmail, body | Content |
| android | Push notification flag |
| sent | Delivery status |
| created_at | Timestamp |

Only 3 rows — nearly empty, likely a prototype or rarely used.

---

### devices_id (3 cols, 680 rows) + devices_notification_queue (~65,274 rows)
Push notification device registry and delivery queue.

**devices_id:** `iddevices_consignee`, `consignee_id`, `token_device_id` — 680 devices registered  
**devices_notification_queue:** `consignee_id`, `package_number`, `previous_status_id`, `new_status_id`, `devices_ids`, `action_date` — 65K queued/sent notifications showing package status change events per consignee.

**This is a rich package status change event log**, even if `event`/`eventtype` are empty.

---

### event (5 cols, 0 rows) + eventtype (2 cols, 0 rows)
Package event tracking system — built but never populated.

| Column | Notes |
|---|---|
| idEvent | PK |
| WarehouseReceipt | → warehousereceipt |
| EventType | → eventtype |
| dateTimeOcurred | Event timestamp |
| details | Free text |

---

### facturaaduanal (13 cols, 2,431 rows)
Customs invoices. References store, addresses, phone numbers. Contains `flete`, `numeroFactura`, `numeroPagina`.

---

### articulo (19 cols, ~101,930 rows)
Line items on customs invoices. Contains detailed tax calculations: `dai`, `selectivo`, `trecePorciento`, `unoPorciento` with both amounts and percentages. Foreign keys to `resumenmawb` and `facturaaduanal`.

---

### plan (4 cols, 1 row)
Pricing plan / tier system. Only 1 plan currently active.

| Column | Notes |
|---|---|
| idPlan | PK |
| nombre | Plan name |
| descuento | Discount percentage |
| cantidadPaquetes | Package count threshold |

---

### Sucursal (5 cols, 4 rows)
CRBOX branch offices. 4 branches.

| Column | Notes |
|---|---|
| idSucursal | PK |
| name | Branch name |
| idPhone, idAddress | Contact info FKs |
| horario | Hours of operation |

---

### store (5 cols, 55 rows)
Online stores/vendors registered in the system (for purchase bill / invoice origin tracking).

---

### ConsigneeBakEscazu_200617 (24 cols, 1,142 rows)
A backup snapshot of the consignee table taken on 2020-06-17, likely when the Escazú branch was set up or during a data migration. Contains the same structure as `consignee`. **Contains real PII** — should never be exposed.

---

### google_token_consignee (3 cols, 1,422 rows)
Google OAuth tokens for consignees. `emailConsignee`, `googleToken`. **Sensitive — OAuth tokens.**

---

### warehousereceipt_mobile_notifier (~853,230 rows)
The largest table. Tracks mobile push notification state per warehousereceipt status change.

| Column | Notes |
|---|---|
| idWarehousereceiptMobileNotifier | PK |
| idWarehousereceipt | WR reference |
| idStatus | Status at time of event |
| idConsignee | Target consignee |
| isNotified | Was notification sent |
| isActive | Active flag |
| createdDate | Timestamp |

**This is the richest package status history log in the system** — 853K rows of status transitions per package per customer.

---

### android_app_config (3 cols, 16 rows)
Key-value config for the Android app. `propertyName`, `propertyValue`.

---

### system_parameter (4 cols, 4 rows)
System-level key-value parameters. `nameParameter`, `value`, `description`.

---

## 4. Portal Module Mapping

### Login / Authentication
- **Tables:** `consignee` (email + identificationNumber), `google_token_consignee`
- **Key columns:** `consignee.email`, `consignee.identificationNumber`, `consignee.idClient`
- **Current frontend expects:** JWT token from legacy API, email as session identifier
- **Current source:** Legacy API validates credentials — DB stores no password hash in visible columns
- **Note:** No `password` column visible in `consignee`. Password management is almost certainly handled by the legacy .NET API layer (likely ASP.NET Identity or similar, possibly in a separate auth DB or hidden column)
- **Safe for read-only migration:** No — authentication must stay on legacy API
- **Write logic needed:** Yes (password change, Google OAuth)
- **Stay legacy for now:** Yes
- **Confidence:** Confirmed
- **Validation needed:** Confirm whether password is in a non-visible column or a separate auth table

---

### User Profile / Consignee (Mi Cuenta)
- **Tables:** `consignee`, `client`, `consignee_has_address`, `consignee_has_phone`, `address`, `phone`, `Sucursal`, `identificationtype`, `plan`
- **Key columns:** All 30 columns of `consignee`; `address.line1/city/provincia/canton/distrito`; `phone.phoneNumber`
- **What legacy API returns:** `getuserinfo` returns name, email, ID number, casillero ID, plan, branch, address, phones, isCompany
- **Fields in DB not in API:** `economicActivityCode`, `birthDate`, `responsabilidad`, `omitirRecep`, `updated`, `contact1Identification`
- **Transformation needed:** `identificationType` int → type string via `identificationtype` lookup; `idSucursal` → branch name via `Sucursal`; `idPlan` → plan details via `plan`
- **Safe for read-only migration:** Yes — profile reads are straightforward
- **Write logic needed:** Yes (profile edit → `postedituser`)
- **Stay legacy for now:** Writes should stay legacy; reads can migrate
- **Confidence:** Confirmed

---

### Dashboard Summary
- **Tables:** `consignee`, `warehousereceipt` (or `getwarehousereceipts` view), `resumenmawb`, `discount_consignee`
- **Key columns:** `consignee.cantidadPaquetes` (cached count), `warehousereceipt.Status`, `resumenmawb.isInvoiced`
- **What frontend expects:** Package count by status, pending invoices, discount balance
- **Fields in DB:** Detailed enough to compute dashboard KPIs
- **Transformation needed:** Status lookup joins; date filtering
- **Safe for read-only migration:** Yes — all reads
- **Write logic needed:** No (display only)
- **Confidence:** Strong hypothesis — `cantidadPaquetes` may be stale/cached; verify freshness

---

### Mis Paquetes
- **Tables:** `getwarehousereceipts` (view), `warehousereceipt`, `carrierinformation`, `piece`, `airshipment`, `Status`
- **Key columns:** `idConsignee`, `number` (WR number), `statusName`, `trackingNumber`, `receivedDateTime`, `totalWeight`, `totalVolume`, `consigneeNotes`, `emision`, `invoicesCount`
- **What legacy API returns:** `getuserpackages` returns WR list filtered by consignee ID, date range, tracking, status
- **Fields in DB not in API:** `localizacion` (from `etiquetaentrega`), warehouse operator (`User`), `consolidado` flag
- **Transformation needed:** Status int → name; date filtering with index on `receivedDateTime`
- **Safe for read-only migration:** Yes — the `getwarehousereceipts` view pre-joins the hard parts
- **Write logic needed:** No for reads; yes for consigneeNotes, grouping
- **Confidence:** Confirmed — `getwarehousereceipts` view exists for exactly this purpose

---

### Mis Facturas
- **Tables:** `resumenmawb`, `articulo`, `descripcionfactura`, `facturaaduanal`, `masterairshipment`, `payment_method`, `discount_consignee`
- **Key columns:** `resumenmawb.Consignee`, `factura` (invoice number), `total`, `isInvoiced`, `billedDate`, `paymentDate`, `hiddenBill`, `IVA`, `idDiscount`
- **What legacy API returns:** `getfacturas` returns invoice list by email + date range
- **Fields in DB not in API:** `paymentDate`, `paymentMethod`, `paymentRegistrationDate`, `hiddenBill`, `realDiscountAwarded`
- **Important:** `hiddenBill = 1` rows must NOT be shown to customers — filter required
- **Transformation needed:** Join to `consignee` via email→idConsignee; join `payment_method` for label
- **Safe for read-only migration:** Yes, with `hiddenBill` filter
- **Write logic needed:** No for display; yes for payment registration
- **Confidence:** Confirmed

---

### Addresses (Mi Cuenta → Direcciones)
- **Tables:** `consignee_has_address`, `address`, `addresstype`, `state`, `country`
- **Key columns:** `address.line1`, `city`, `provincia`, `canton`, `distrito`, `barrio`, `direccion`, `isActive`, `isPrimary`
- **Note:** `address` has both a US-style schema (`line1`, `line2`, `city`, `zipCode`, `State`) and CR-specific fields (`provincia`, `canton`, `distrito`, `barrio`, `direccion`). These serve both US warehouse address and CR delivery address.
- **Safe for read-only migration:** Yes
- **Write logic needed:** Yes (add/edit/remove address)
- **Confidence:** Confirmed

---

### Phones (Mi Cuenta → Teléfonos)
- **Tables:** `consignee_has_phone`, `phone`, `phonetype`
- **Key columns:** `phone.phoneNumber`, `phoneExtension`, `isActive`, `isPrimary`, `PhoneType`
- **Safe for read-only migration:** Yes
- **Confidence:** Confirmed

---

### Branches / Sucursales
- **Tables:** `Sucursal`, `address`, `phone`
- **Key columns:** `Sucursal.name`, `horario`, `idAddress`, `idPhone`
- **Only 4 branches** — suitable for static/cached lookup
- **Safe for read-only migration:** Yes — small, stable table
- **Confidence:** Confirmed

---

### Package Status History
- **Tables:** `warehousereceipt_mobile_notifier` (853K rows), `Status`, `event`/`eventtype` (empty)
- **Key columns:** `idWarehousereceipt`, `idStatus`, `idConsignee`, `isNotified`, `createdDate`
- **Note:** `event`/`eventtype` are empty. `warehousereceipt_mobile_notifier` is the actual status history log — it records every status transition per package
- **Safe for read-only migration:** Yes — filtered by `idConsignee` + `idWarehousereceipt` with index
- **Validation needed:** Confirm `idStatus` values map correctly to `Status.idStatus`; confirm ordering by `createdDate` gives correct timeline
- **Confidence:** Strong hypothesis

---

### Uploaded Invoices / Purchase Bills
- **Tables:** `purchase_bill`, `warehousereceipt`
- **Key columns:** `purchase_bill.location` (file URL), `WarehouseReceipt`, `numero_factura`, `monto`, `descripcion`, `create_date`
- **Safe for read-only migration:** Yes (listing existing bills)
- **Write logic needed:** Yes (new uploads → `postcreatepurchasebill`)
- **Business logic risk:** The `location` field stores file paths — the legacy API likely handles file serving; migrating uploads requires replicating file storage
- **Confidence:** Confirmed

---

### Registration / Account Creation
- **Tables:** `consignee`, `client`, `address`, `phone`
- **Write logic needed:** Yes — inserts into multiple tables with transaction guarantees
- **Stay legacy:** Yes — registration has significant business logic (ID dedup, email dedup, casillero number generation via `codigoFacturacion`)
- **Confidence:** Confirmed

---

### Password Recovery
- **Tables:** Unknown — no `password` or `reset_token` column found in visible schema
- **Likely handled:** Entirely in legacy API layer
- **Stay legacy:** Yes
- **Confidence:** Strong hypothesis

---

### Discounts / Pending Discounts
- **Tables:** `discount`, `discount_consignee`, `descuentocorporativo`
- **Key columns:** `discount_consignee.status`, `realDiscountAwarded`, `assignationDate`, `usageDate`, `idResumenMAWB`
- **324 assignments active** — real, live discount data
- **Safe for read-only migration:** Yes — show assigned discounts in portal
- **Validation needed:** Confirm `status` field values (assigned/used/expired?) with dev team
- **Confidence:** Strong hypothesis

---

### Notifications / Events / Audit Logs
- **Tables:** `devices_notification_queue`, `notifications`, `warehousereceipt_mobile_notifier`
- **65K notification queue records**, 3 email notifications, 853K mobile notifier rows
- **Safe for read-only migration:** `devices_notification_queue` shows status-change events — useful as a package timeline
- **Confidence:** Strong hypothesis

---

## 5. Key Table Deep-Dives

### consignee
**Represents:** The CRBOX customer account — every person with a casillero number.  
**Why it matters:** It is the root identity record. Every portal feature (packages, invoices, profile, discounts, notifications) traces back to `idConsignee`.  
**Portal module:** Mi Cuenta, Login, Dashboard, all modules  
**Sensitive data:** Yes — name, email, ID number, birth date, contact info — CRITICAL  
**Client-facing:** Yes (own data only)  
**Admin access:** Full access  
**Note:** `cantidadPaquetes` appears to be a cached/denormalized package count; may lag real count from `warehousereceipt`.

---

### client
**Represents:** The billing account entity. Personal users have one `client` each; businesses may share one `client` across multiple `consignee` records.  
**Why it matters:** Essential for understanding the account hierarchy — `isCompany` in `consignee` + `client.accountType` together define whether a user is a personal or business customer.  
**Portal module:** Mi Cuenta (business account display)  
**Sensitive:** Moderately — company name + tax ID  
**Client-facing:** Read-only display of own account type

---

### warehousereceipt
**Represents:** Every physical package receipt at the CRBOX warehouse. The operational heartbeat of the system.  
**Why it matters:** Powers `mis paquetes`. Every invoice, purchase bill, tracking event, and notification traces to a `warehousereceipt`.  
**Portal module:** Mis Paquetes  
**Sensitive:** Moderately — linked to customer via `Consignee` FK  
**Client-facing:** Yes (own packages filtered by `Consignee`)  
**Note:** The `getwarehousereceipts` view pre-joins everything needed for a list view.

---

### purchase_bill
**Represents:** Customer-uploaded purchase receipts/invoices for customs declaration.  
**Why it matters:** Required for DGA/customs — customers upload their store invoice to declare the declared value of goods.  
**Portal module:** Mis Facturas / Invoice Upload  
**Sensitive:** Moderately — contains declared values  
**Client-facing:** Yes (own bills only)  
**Note:** `location` stores file path — confirm whether files are served from local disk or S3/external URL before migrating reads.

---

### package
**Represents:** Physical package dimensions attached to an airshipment (not a warehousereceipt). Small table (~5,848 rows) suggesting this tracks consolidated/grouped packages separately from individual `piece` records.  
**Portal module:** Mis Paquetes (dimensional data)  
**Sensitive:** No  
**Client-facing:** Supporting data

---

### user
**Represents:** CRBOX staff operators (warehouse staff, admin). Only 64 records. NOT customer accounts.  
**Portal module:** Admin only  
**Sensitive:** Yes — staff usernames  
**Client-facing:** No

---

### airshipment
**Represents:** Individual house air waybills (guías hijas). Every package travels under an airshipment, which rolls up into a `masterairshipment` (MAWB).  
**Portal module:** Package detail view — the airShipmentNumber is visible in package tracking  
**Sensitive:** No  
**Client-facing:** Reference data (shipment numbers visible to customers)

---

### piece
**Represents:** Sub-units of a warehousereceipt. One WR can have multiple pieces, each with their own dimensions.  
**Portal module:** Package detail (piece count, dimensions)  
**Sensitive:** No  
**Client-facing:** Supporting data (total pieces visible; individual piece dimensions typically admin-only)

---

### etiquetaembarque
**Represents:** Outbound shipping labels generated per warehousereceipt.  
**Why it matters:** Contains `warehousereceiptNumber`, airshipment numbers, carrier, consignee name.  
**Portal module:** Primarily admin/warehouse  
**Sensitive:** Contains consignee name (no ID/email)  
**Client-facing:** No — label data is internal

---

### etiquetaentrega
**Represents:** Delivery/inbound labels, one per piece. Contains `localizacion` — the warehouse shelf/location of the package.  
**Why it matters:** `localizacion` could power a "where is my package in the warehouse" feature.  
**Portal module:** Package tracking detail (warehouse location)  
**Sensitive:** Contains consignee name, package description  
**Client-facing:** Partial — `localizacion` and `description` could be shown; driver info should not

---

### couriermanifest
**Represents:** A pre-joined view combining WR + consignee + tracking + airshipment data into a manifest format. Used for customs/manifest documents.  
**Portal module:** Package list (alternative query path)  
**Sensitive:** Contains email, `idConsignee`, invoice amounts  
**Client-facing:** Filtered by consignee — potential query source for `mis paquetes`

---

### masterairshipment
**Represents:** The Master Air Waybill (MAWB) — the top-level grouping of all packages in a single flight.  
**Why it matters:** Rich financial data (rates, totals, charges) and routing info. The `masterAirShipmentNumber` is shown in package tracking.  
**Portal module:** Package detail / admin operations  
**Sensitive:** Financial — rates and charges  
**Client-facing:** Reference number only

---

### plan
**Represents:** Customer pricing plan/tier. Only 1 plan active.  
**Portal module:** Mi Cuenta (plan display), Dashboard  
**Sensitive:** No  
**Client-facing:** Yes (customer sees own plan)

---

### store
**Represents:** Online stores/vendors (Amazon, etc.) registered for invoice template purposes. 55 stores.  
**Portal module:** Invoice upload (store dropdown)  
**Sensitive:** No  
**Client-facing:** Read-only reference list

---

### supplier
**Represents:** Goods suppliers (19,852 records). Tied to `supplierinformation` which has invoice numbers and PO numbers.  
**Portal module:** Admin only  
**Sensitive:** No  
**Client-facing:** No

---

### payment_method
**Represents:** Payment method types (5 records: e.g. cash, card, transfer, etc.).  
**Portal module:** Invoice detail (payment method label)  
**Sensitive:** No  
**Client-facing:** Display label only

---

### notifications
**Represents:** Email notification log (3 records — nearly unused in DB; likely most emails sent via a different mechanism).  
**Portal module:** Admin/audit  
**Sensitive:** Contains email addresses and message bodies  
**Client-facing:** No

---

### discount
**Represents:** Discount code catalog. 1 active discount code.  
**Portal module:** Mi Cuenta / Dashboard (show available discount)  
**Sensitive:** No (codes are meant to be shared)  
**Client-facing:** Read — customer can see assigned discounts via `discount_consignee`

---

### facturaaduanal
**Represents:** Customs invoices / formal tax invoices (2,431 records). More formal than `resumenmawb` — includes template and billing address references.  
**Portal module:** Mis Facturas (formal invoice detail)  
**Sensitive:** Contains billing address, phone  
**Client-facing:** Controlled — customer sees own invoices only

---

## 6. Unused / Underused Data Opportunities

### 1. Package Status Timeline (warehousereceipt_mobile_notifier)
- **Table/field:** `warehousereceipt_mobile_notifier` — 853K rows with `idWarehousereceipt`, `idStatus`, `createdDate`
- **Confidence:** Strong hypothesis
- **Populated:** Yes — heavily
- **Client portal value:** A chronological status history per package ("Received → In Transit → Available for Pickup → Delivered") — similar to what FedEx/DHL show
- **Admin value:** Operational status audit trail
- **Exposure:** Client-facing (own packages only)
- **Risk:** `idStatus` must map cleanly to `Status` table — validate field semantics with dev team
- **Validation:** Confirm `isActive` and `isNotified` semantics; confirm ordering is correct by `createdDate`

---

### 2. Push Notification Event History (devices_notification_queue)
- **Table/field:** `devices_notification_queue` — 65K rows with `package_number`, `previous_status_id`, `new_status_id`, `action_date`
- **Confidence:** Confirmed
- **Populated:** Yes
- **Client portal value:** Secondary status history source; shows status transitions explicitly (before/after)
- **Admin value:** Notification delivery audit, identify customers who haven't received notifications
- **Exposure:** Admin-only (raw queue data); client sees derived timeline
- **Risk:** `package_number` may be WR number or tracking number — confirm with dev team

---

### 3. Warehouse Location (etiquetaentrega.localizacion)
- **Confidence:** Strong hypothesis
- **Populated:** ~499K rows exist — likely populated when labels are printed
- **Client portal value:** "Your package is in bay 3B" — richer tracking detail
- **Admin value:** Inventory location management
- **Exposure:** Client-facing (own package location only)
- **Risk:** Confirm `localizacion` is current/accurate vs. a point-in-time label value

---

### 4. Discount / Pending Discount Display
- **Table/field:** `discount_consignee` — 324 active assignments
- **Confidence:** Confirmed — real data
- **Populated:** Yes
- **Client portal value:** Show assigned discount, usage status, expiration date
- **Admin value:** Discount tracking, audit who received what
- **Exposure:** Client sees own discount; admin sees all
- **Risk:** `status` field semantics unknown — validate values with dev team

---

### 5. Invoice Payment Status (resumenmawb payment fields)
- **Table/field:** `resumenmawb.paymentDate`, `paymentMethod`, `paymentRegistrationDate`
- **Confidence:** Confirmed
- **Populated:** Partially — some invoices paid, some pending
- **Client portal value:** "Invoice #1234 — Paid on 2026-04-15 via Transfer" — reduces support calls about payment confirmation
- **Admin value:** Payment reconciliation
- **Exposure:** Client-facing (own invoices only)
- **Risk:** Confirm `hiddenBill` filter is enforced; confirm `paymentDate` NULL means unpaid

---

### 6. Package Consolidation Flag (warehousereceipt.consolidado)
- **Table/field:** `warehousereceipt.consolidado` (tinyint)
- **Confidence:** Weak hypothesis
- **Client portal value:** "This package is part of a consolidated shipment" — helps customers understand grouped billing
- **Risk:** Unknown semantics — confirm with dev team whether `consolidado=1` means customer-facing consolidated billing or internal warehouse operation

---

### 7. Customer Segmentation (consignee.isCompany, plan, cantidadPaquetes)
- **Confidence:** Confirmed
- **Admin value:** Segment customers by type (personal/business), volume (cantidadPaquetes), plan tier — enables targeted marketing, discount assignment, custom rates
- **Exposure:** Admin only

---

### 8. Google OAuth Accounts (google_token_consignee)
- **Table/field:** `google_token_consignee` — 1,422 tokens
- **Confidence:** Confirmed
- **Portal value:** Social login flow is already implemented in the data layer — 1,422 customers have authenticated via Google
- **Exposure:** Never expose tokens; only use server-side for auth flow
- **Risk:** Tokens may be stale — OAuth access tokens expire; confirm whether refresh tokens are stored

---

### 9. Customs/Tax Breakdown per Invoice (articulo)
- **Table/field:** `articulo` — 101K rows with `dai`, `selectivo`, `trecePorciento` percentages and amounts
- **Confidence:** Confirmed
- **Client portal value:** Itemized customs duty breakdown per invoice — highly valued for business customers
- **Admin value:** Tax reporting, compliance
- **Exposure:** Client-facing (own invoices); admin full

---

### 10. Newsletter / Communication History (newsletter)
- **Table/field:** `newsletter` — 7 records with `subject`, `body`, `status`, `scheduledOn`
- **Confidence:** Strong hypothesis
- **Admin value:** Communication audit log, scheduled message management
- **Exposure:** Admin only

---

## 7. Legacy API Comparison

### getuserinfo/{email}
- **Likely tables:** `consignee`, `client`, `consignee_has_address`, `address`, `consignee_has_phone`, `phone`, `Sucursal`, `plan`, `identificationtype`
- **Fields API likely returns:** Name, surnames, email, ID type/number, isCompany, idConsignee, idClient, plan name, sucursal, primary address, primary phone, alternativeEmail, receivesNewsletter
- **Fields in DB not exposed:** `birthDate`, `economicActivityCode`, `responsabilidad`, `omitirRecep`, `contact1Identification`, `codigoFacturacion`, `cantidadPaquetes`, `updated`
- **Business logic in legacy layer:** Email lookup → idConsignee resolution; joins across 6+ tables; address/phone type resolution
- **Risk of bypassing:** Medium — mostly read joins; main risk is the join logic producing incorrect results if field semantics are misunderstood
- **Must replicate:** Multi-table join with address/phone filtering by `isPrimary=1` and `isActive=1`

---

### getuserpackages/{idConsignee}/{fecha_inicial}/{fecha_final}/{tracking}/{status}
- **Likely tables:** `getwarehousereceipts` (view), `warehousereceipt`, `carrierinformation`, `piece`, `Status`
- **Fields API likely returns:** WR number, status, tracking number, received date, weight, volume, pieces, shipper, air shipment number, consignee notes, invoice count, sucursal
- **Fields in DB not exposed:** `localizacion` (from etiquetaentrega), `consolidado`, `econtainer`, `ischecked`
- **Business logic in legacy layer:** Date range filtering; status code filtering; tracking number filtering; `getwarehousereceipts` view computation
- **Risk of bypassing:** Low — the `getwarehousereceipts` view already encapsulates the join logic; querying the view directly is safe
- **Must replicate:** Query the view with `WHERE idConsignee = ? AND receivedDateTime BETWEEN ? AND ?` + optional tracking/status filters

---

### getfacturas/{email}/{fecha_inicial}/{fecha_final}
- **Likely tables:** `resumenmawb`, `consignee` (email→idConsignee), `payment_method`, `masterairshipment`
- **Fields API likely returns:** Invoice number (`factura`), date, total, status (isInvoiced), airshipment reference, payment status
- **Fields in DB not exposed:** `paymentDate`, `paymentMethod`, `paymentRegistrationDate`, `hiddenBill`, discount application
- **Business logic in legacy layer:** Email → idConsignee lookup; `hiddenBill` filter (must be enforced!); date range on `billedDate` or `createdDate`
- **Risk of bypassing:** Medium — `hiddenBill` filter is critical; missing it would expose internal/admin-only invoices to customers
- **Must replicate:** `WHERE Consignee = ? AND hiddenBill = 0 AND billedDate BETWEEN ? AND ?` (confirm exact date field used)

---

### postedituser
- **Likely tables:** `consignee`, `address`, `phone`, `consignee_has_address`, `consignee_has_phone`
- **Write operations:** UPDATE `consignee`; INSERT/UPDATE `address` and `phone`; manage junction tables
- **Business logic:** Validation of ID number uniqueness; email change validation; junction table management
- **Risk:** High — transaction across multiple tables; ID number duplication check; email uniqueness
- **Stay legacy:** Yes — until write logic is fully understood and tested

---

### postregisteruser
- **Likely tables:** `consignee`, `client`, `address`, `phone`, `consignee_has_address`, `consignee_has_phone`
- **Write operations:** INSERT into all above + casillero number generation (`codigoFacturacion`)
- **Business logic:** Casillero generation algorithm; email uniqueness; ID dedup; plan assignment; client creation or lookup; potential email notification trigger
- **Risk:** Very high — multi-table transactional insert with business logic
- **Stay legacy:** Yes — do not replicate until all logic is documented

---

### Password Recovery
- **Likely tables:** Unknown — no reset token, password hash, or recovery log visible in schema
- **Hypothesis:** Handled entirely in legacy .NET layer, likely using ASP.NET Identity with its own `__EFMigrationsHistory` or separate schema
- **Stay legacy:** Yes — unconditionally

---

### Purchase Bill Endpoints (postcreatepurchasebill)
- **Likely tables:** `purchase_bill` (INSERT), `warehousereceipt` (lookup)
- **Write operations:** INSERT into `purchase_bill` with `location`, `WarehouseReceipt`, `monto`, `numero_factura`, `descripcion`
- **Business logic:** File storage (location field), WR validation, potential status update on WR
- **Risk:** Medium — insert is straightforward once file is stored; risk is in file storage and WR status side effects
- **Stay legacy:** Yes for now — file storage mechanism must be confirmed

---

## 8. Migration Recommendation

### A. Safe Read-Only Migration (Start Here)

| Endpoint to build | Tables to query | Notes |
|---|---|---|
| `/api/portal/me-rds` | `consignee`, `client`, `address`, `phone`, `Sucursal`, `plan` | Profile reads; filter by session email |
| `/api/portal/packages-rds` | `getwarehousereceipts` (view) | Filter `WHERE idConsignee = ?`; date range required |
| `/api/portal/invoices-rds` | `resumenmawb` | Filter `WHERE Consignee = ? AND hiddenBill = 0` |
| `/api/portal/discount-rds` | `discount_consignee`, `discount` | Filter `WHERE idConsignee = ?` |
| `/api/portal/sucursales-rds` | `Sucursal`, `address`, `phone` | Static/cached lookup |
| `/api/portal/package-history-rds` | `warehousereceipt_mobile_notifier`, `Status` | Status timeline per package |

All of these are read-only, filter by `idConsignee` (derived from session email), and return data the customer already has access to via the legacy API.

---

### B. Needs Deeper Validation Before Migrating

| Feature | Concern | Validation needed |
|---|---|---|
| Package status logic | `Status.idStatus` semantics and mapping | Confirm status codes with dev team |
| Invoice upload/purchase bill | File storage path in `purchase_bill.location` | Confirm file serving mechanism |
| Discounts display | `discount_consignee.status` field values | Confirm: assigned / used / expired enumeration |
| Sucursal preference | `consignee.idSucursal` relationship | Confirm whether consignee can change sucursal |
| Dashboard package count | `consignee.cantidadPaquetes` vs live count | Confirm staleness risk |
| `hiddenBill` filter | Missing this filter exposes internal invoices | Test with known hidden invoices before launch |

---

### C. Should Remain on Legacy API for Now

- Login / authentication (no password column in DB)
- Registration (`postregisteruser`)
- Password recovery
- Profile edits (`postedituser`)
- Invoice upload (`postcreatepurchasebill`)
- Any operation with side effects (status changes, notifications)

---

### D. Future Write Migration (Phase 2)

- Profile update (after write logic is documented)
- Invoice upload (after file storage is confirmed)
- Notification preferences (`receivesMobileNotification`, `receivesNewsletter`)
- Package consolidation (confirm `consolidado` semantics first)

---

## 9. What to Build Next

After this discovery report, the recommended first implementation step is:

**`GET /api/portal/packages-rds`** — Read the `getwarehousereceipts` view filtered by `idConsignee`, returning the package list for `mis paquetes`. Reasons:
1. The view already exists in the DB and does all the joins
2. It is pure read-only with no side effects
3. It is the highest-frequency portal call (customers check packages multiple times per day)
4. The legacy `getuserpackages` endpoint can run in parallel as a shadow comparison source to validate correctness before switching

Second: **`GET /api/portal/me-rds`** — Profile read for `mi cuenta` / dashboard personalization.

Third: **`GET /api/portal/invoices-rds`** — Invoice list for `mis facturas` (with `hiddenBill=0` filter validated first).

**Do not implement any of these yet** — this section is recommendation only.

---

## 10. What Not to Touch Yet

The following must remain on the legacy API until explicitly scoped for migration:

- Login / session authentication
- Registration (`postregisteruser`)
- Password recovery
- Profile edits (`postedituser`)
- Package status writes (any status transitions)
- Invoice upload (`postcreatepurchasebill` / `saveBill`)
- Production database (`CrBox` or any non-`crbox_dev1` database)
- Legacy API replacement (clients.crbox.cr)
- Old website (crbox.cr main site)
- Internal/backoffice tool
- AWS security groups, RDS user permissions, or IAM settings

---

## 11. Unknowns / Questions for CRBOX Dev Team

1. **Status field semantics:** What are the exact `Status.idStatus` values and their customer-facing labels? (The `Status` table has 5 rows — confirm what each means in the context of `mis paquetes` display.)

2. **Canonical customer table:** Is `consignee` always the definitive customer record, or does `client` take precedence for billing purposes? In a business account, is there one `consignee` per employee, or one `consignee` per company?

3. **warehousereceipt → package → piece hierarchy:** Does every WR have a `package` record, or is `package` optional? What is the relationship between `piece` (505K rows) and `package` (5K rows)? Why the large discrepancy?

4. **`crbox_dev1` vs production:** Is `crbox_dev1` a faithful replica of the production database schema? Are there tables, columns, or views in production that don't exist in `crbox_dev1`? Is the dev data current (e.g. last 30 days) or a snapshot?

5. **Password/auth storage:** Where are customer passwords stored? No password hash column is visible in `consignee`. Is authentication handled by ASP.NET Identity in a separate schema or database?

6. **`getwarehousereceipts` view definition:** Can we get the full `CREATE VIEW` SQL for `getwarehousereceipts` and `couriermanifest`? This would confirm the exact join logic used by the legacy API.

7. **`hiddenBill` semantics:** What does `resumenmawb.hiddenBill = 1` mean operationally? Is it used for admin-only charges, draft invoices, voided invoices, or something else?

8. **`discount_consignee.status` values:** What are the possible values of `status` in `discount_consignee`? (assigned, used, expired, cancelled?)

9. **`purchase_bill.location` format:** Is `location` a local file path, a relative URL, an S3 URL, or a WordPress URL? Where are these files served from?

10. **`consignee.cantidadPaquetes`:** Is this column maintained in real time, updated by a trigger, updated by a job, or potentially stale? Can it be trusted for dashboard display without a live COUNT query?

11. **Tables that should never be client-facing:** Specifically: `ConsigneeBakEscazu_200617`, `google_token_consignee`, `user`, `bitacora_facturacion`, `tmp_codfacturacion`, `consecutivo_facturacion`, all Hangfire tables — confirm no client endpoint should ever touch these.

12. **`warehousereceipt_mobile_notifier` ordering:** Is `createdDate` the correct field to sort for a status timeline, or is there a sequence/order field? Can a single WR have multiple entries with the same `idStatus` (e.g., re-notifications)?

---

## 12. Final Safety Confirmations

- **No frontend behavior was changed.** ✓
- **No portal HTML/JS files were modified.** ✓
- **No write or destructive SQL queries were executed.** ✓ (Only `SHOW TABLES`, `INFORMATION_SCHEMA` reads, and `SELECT COUNT(*)` queries)
- **Only `crbox_dev1` was queried.** ✓ (Verified via `SELECT DATABASE()` = `crbox_dev1`)
- **The old website (crbox.cr) was not touched.** ✓
- **The internal/backoffice tool was not touched.** ✓
- **The legacy API (clients.crbox.cr) was not modified or stress-tested.** ✓
- **AWS/RDS/security settings were not changed.** ✓
- **No credentials were exposed or logged.** ✓ (`MYSQL_PASSWORD` was never printed; only existence was verified)
- **No raw sensitive customer data was exposed.** ✓ (No `SELECT *` or row-level queries — only schema metadata and row counts)

---

## Appendix: Table Size Reference

| Table | Rows (approx) |
|---|---|
| warehousereceipt_mobile_notifier | 853,230 |
| piece | 505,741 |
| etiquetaentrega | 499,749 |
| carrierinformation | 478,375 |
| warehousereceipt | 477,181 |
| resumenmawb | 257,019 |
| purchase_bill | 202,598 |
| etiquetaembarque | 199,560 |
| consecutivo_facturacion | 195,078 |
| articulo | 101,930 |
| airshipment | 110,435 |
| address | 65,631 |
| devices_notification_queue | 65,274 |
| phone | 63,785 |
| consignee | 31,580 |
| client | 27,184 |
| consignee_has_phone | 42,457 |
| consignee_has_address | 26,256 |
| shipper | 23,961 |
| supplier | 19,852 |
| supplierinformation | 52,185 |
| descripcionfactura | 44,670 |
| bitacora_facturacion | 12,807 |
| warehousereceiptcharge | 8,594 |
| package | 5,848 |
| masterairshipment | 3,609 |
| cargomanifest | 3,613 |
| tmp_codfacturacion | 3,875 |
| facturaaduanal | 2,431 |
| google_token_consignee | 1,422 |
| ConsigneeBakEscazu_200617 | 1,142 |
| shipper_has_phone | 1,483 |
| carrier | 435 |
| discount_consignee | 324 |
| devices_id | 680 |
| store | 55 |
| user | 64 |
| Sucursal | 4 |
| plan | 1 |
