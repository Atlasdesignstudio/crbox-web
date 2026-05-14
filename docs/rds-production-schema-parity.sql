-- ============================================================
-- CRBOX Portal — Production Schema Parity Validation
-- ============================================================
--
-- Purpose:
--   Confirm that every table, view, and column required by the
--   three portal modules (mis-paquetes, mis-facturas, mi-cuenta)
--   exists in the production CrBox database before enabling
--   any production RDS frontend flag.
--
-- How to use:
--   1. Connect to production RDS as crbox_portal_ro ONLY.
--      Do NOT run this script with a broad/admin user unless
--      explicitly approved by the infrastructure team.
--   2. Run SELECT DATABASE(); (Step 0 below).
--      If the result is NOT exactly 'CrBox', STOP IMMEDIATELY.
--      Do not proceed with any further queries.
--   3. Run the remaining blocks top to bottom.
--   4. Fill in the companion checklist:
--      docs/rds-production-schema-parity-checklist.md
--
-- Operator rules:
--   - Do NOT export result rows containing customer data.
--   - Do NOT paste outputs containing idConsignee, email,
--     phone numbers, or identification numbers into any
--     public channel, ticket, or document.
--   - Schema inspection output (column names, types) is safe
--     to share with the CRBOX dev team.
--   - This script contains NO row-level queries (no SELECT *,
--     no SELECT from data tables, no DML, no DDL).
-- ============================================================


-- ============================================================
-- STEP 0: Database identity check — MUST EQUAL 'CrBox'
--         If result ≠ 'CrBox', stop immediately.
-- ============================================================

SELECT DATABASE();


-- ============================================================
-- SECTION A: SHARED OBJECTS
-- Used by: packages (consignee), invoices (consignee),
--          profile (consignee, status_general via recibos)
-- ============================================================

-- A1. consignee
--   Shared by all three modules.
--   packages + invoices: SELECT idConsignee WHERE email = ?
--   profile: full row read including name, idSucursal, idPlan,
--            idClient, codigoFacturacion, receivesNewsletter,
--            identificationNumber, identificationType, isCompany.
--   CASING NOTE: table name is lowercase 'consignee'.

SHOW COLUMNS FROM CrBox.consignee;
DESCRIBE CrBox.consignee;

-- A2. status_general
--   Used by: packages (getwarehousereceipts view references it),
--            invoices recibos join (wr.Status = sg.idStatus).
--   Expected columns: idStatus (PK), statusName.

SHOW COLUMNS FROM CrBox.status_general;
DESCRIBE CrBox.status_general;


-- ============================================================
-- SECTION B: PACKAGES OBJECTS
-- Module: mis-paquetes  endpoint: /api/portal/my-packages
-- ============================================================

-- B1. getwarehousereceipts  [VIEW — CRITICAL]
--   This is the primary data source for mis-paquetes.
--   The entire packages module depends on this view existing
--   with the correct column set.
--   CASING NOTE: all-lowercase view name.
--
--   Expected columns (explicit SELECT in server.py):
--     idConsignee (filter), idWarehouseReceipt, number,
--     statusId, statusName, trackingNumber, receivedDateTime,
--     createdDate, totalPieces, totalWeight, totalVolume,
--     totalVolumetricWeight, shipperName, carrierName,
--     airShipmentNumber, masterAirShipmentNumber, emision,
--     invoicesCount, descripcion, montoFactura,
--     descripcionFactura, consigneeNotes.
--
--   NULL-tolerance: descripcion, montoFactura, totalVolume,
--   totalVolumetricWeight may be NULL for some packages —
--   this is a documented known limitation, not a parity fail.

SHOW COLUMNS FROM CrBox.getwarehousereceipts;
DESCRIBE CrBox.getwarehousereceipts;
SHOW CREATE VIEW CrBox.getwarehousereceipts;


-- ============================================================
-- SECTION C: INVOICES OBJECTS
-- Module: mis-facturas  endpoint: /api/portal/invoices-rds
-- ============================================================

-- C1. resumenmawb  [CRITICAL]
--   Primary invoices table.
--   TYPO NOTES (confirmed in dev, must match production):
--     'weigth'          — typo for 'weight' (this IS the DB column name)
--     'volumetricWeigth'— typo for 'volumetricWeight' (DB column name)
--     The response remaps volumetricWeigth → volumentricWeigth
--     (a different typo) to match the frontend mapBill() expectation.
--   FK columns (case-sensitive in some MySQL configs):
--     Consignee       → idConsignee
--     MasterAirshipment → masterairshipment.idMasterAirShipment
--     idDescuentoCorporativo → descuentocorporativo.idDescuentoCorporativo
--
--   Expected columns queried by server.py:
--     idResumenMAWB, factura, billedDate, createdDate,
--     total, weigth, volumetricWeigth, cantidadBultos,
--     isInvoiced, guiasHijas, Consignee, MasterAirshipment,
--     idDescuentoCorporativo.

SHOW COLUMNS FROM CrBox.resumenmawb;
DESCRIBE CrBox.resumenmawb;

-- C2. masterairshipment  [CRITICAL]
--   LEFT JOIN in invoices query:
--     resumenmawb.MasterAirshipment = masterairshipment.idMasterAirShipment
--   Expected columns: idMasterAirShipment, masterAirShipmentNumber.

SHOW COLUMNS FROM CrBox.masterairshipment;
DESCRIBE CrBox.masterairshipment;

-- C3. descuentocorporativo
--   LEFT JOIN in invoices query:
--     descuentocorporativo.idDescuentoCorporativo = resumenmawb.idDescuentoCorporativo
--   Expected columns: idDescuentoCorporativo, nombre.

SHOW COLUMNS FROM CrBox.descuentocorporativo;
DESCRIBE CrBox.descuentocorporativo;

-- C4. airshipment
--   Used in recibos sub-query:
--     airshipment.airShipmentNumber IN (tokens from guiasHijas)
--     warehousereceipt.AirShipment = airshipment.idAirShipment
--   Expected columns: idAirShipment, airShipmentNumber.

SHOW COLUMNS FROM CrBox.airshipment;
DESCRIBE CrBox.airshipment;

-- C5. warehousereceipt
--   Used in recibos sub-query (joined via airshipment).
--   FK columns (capitalised in dev):
--     AirShipment     → airshipment.idAirShipment
--     Consignee       → idConsignee  (auth-scope guard)
--     Status          → status_general.idStatus
--     Shipper         → shipper.idShipper
--     CarrierInformation → carrierinformation.idCarrierInformation
--   Expected data columns:
--     number, receivedDateTime, totalWeight, totalVolume,
--     totalVolumetricWeight.

SHOW COLUMNS FROM CrBox.warehousereceipt;
DESCRIBE CrBox.warehousereceipt;

-- C6. shipper
--   LEFT JOIN in recibos query:
--     shipper.idShipper = warehousereceipt.Shipper
--   Expected columns: idShipper, shipperName.

SHOW COLUMNS FROM CrBox.shipper;
DESCRIBE CrBox.shipper;

-- C7. carrierinformation
--   LEFT JOIN in recibos query:
--     carrierinformation.idCarrierInformation = warehousereceipt.CarrierInformation
--   FK: Carrier → carrier.idCarrier
--   Expected columns: idCarrierInformation, trackingNumber, Carrier.

SHOW COLUMNS FROM CrBox.carrierinformation;
DESCRIBE CrBox.carrierinformation;

-- C8. carrier
--   LEFT JOIN in recibos query via carrierinformation.Carrier.
--   Expected columns: idCarrier, carrierName.

SHOW COLUMNS FROM CrBox.carrier;
DESCRIBE CrBox.carrier;


-- ============================================================
-- SECTION D: PROFILE OBJECTS
-- Module: mi-cuenta  endpoint: /api/portal/profile-rds
-- ============================================================

-- D1. identificationtype
--   Step 2 of profile query.
--   consignee.identificationType stores the label string; this
--   table is queried to confirm/normalise the label.
--   Expected columns: idIdentificationType (PK), type (label — UNI).

SHOW COLUMNS FROM CrBox.identificationtype;
DESCRIBE CrBox.identificationtype;

-- D2. Sucursal
--   Step 3 of profile query.
--   CASING NOTE: capital S — 'Sucursal' not 'sucursal'.
--   FK path: consignee.idSucursal → Sucursal.idSucursal.
--   Expected columns: idSucursal, name.
--   Also has: idPhone, idAddress, horario (confirmed in dev).

SHOW COLUMNS FROM CrBox.Sucursal;
DESCRIBE CrBox.Sucursal;

-- D3. client
--   Step 4 of profile query.
--   FK path: consignee.idClient → client.idClient.
--   Expected columns: idClient, name, accountType, cedulaJuridica.

SHOW COLUMNS FROM CrBox.client;
DESCRIBE CrBox.client;

-- D4. plan
--   Step 5 of profile query.
--   FK path: consignee.idPlan → plan.idPlan.
--   Expected columns: idPlan, nombre, descuento.

SHOW COLUMNS FROM CrBox.plan;
DESCRIBE CrBox.plan;

-- D5. address
--   Step 6 of profile query (joined via consignee_has_address).
--   isPrimary and isActive are on this table (tinyint(1)),
--   NOT on the junction table.
--   FK: AddressType (capital A,T) → addresstype.idAddressType.
--   Expected columns: idAddress, line1, line2, city, zipCode,
--                     provincia, isPrimary, isActive, AddressType.

SHOW COLUMNS FROM CrBox.address;
DESCRIBE CrBox.address;

-- D6. consignee_has_address
--   Junction table — Step 6 of profile query.
--   Expected columns: idConsignee, idAddress (no flags here).

SHOW COLUMNS FROM CrBox.consignee_has_address;
DESCRIBE CrBox.consignee_has_address;

-- D7. addresstype
--   LEFT JOIN in address query.
--   FK: address.AddressType = addresstype.idAddressType.
--   CASING NOTE: label column is 'type', not 'AddressType'.
--   Expected columns: idAddressType, type.

SHOW COLUMNS FROM CrBox.addresstype;
DESCRIBE CrBox.addresstype;

-- D8. phone
--   Step 7 of profile query (joined via consignee_has_phone).
--   isPrimary and isActive are on this table (tinyint(1)),
--   NOT on the junction table.
--   FK: PhoneType (capital P,T) → phonetype.idPhoneType.
--   Expected columns: idPhone, phoneNumber, isPrimary, isActive,
--                     PhoneType.

SHOW COLUMNS FROM CrBox.phone;
DESCRIBE CrBox.phone;

-- D9. consignee_has_phone
--   Junction table — Step 7 of profile query.
--   Expected columns: idConsignee, idPhone (no flags here).

SHOW COLUMNS FROM CrBox.consignee_has_phone;
DESCRIBE CrBox.consignee_has_phone;

-- D10. phonetype
--    LEFT JOIN in phone query.
--    FK: phone.PhoneType = phonetype.idPhoneType.
--    CASING NOTE: label column is 'type', not 'PhoneType'.
--    Expected columns: idPhoneType, type.

SHOW COLUMNS FROM CrBox.phonetype;
DESCRIBE CrBox.phonetype;


-- ============================================================
-- END OF SCHEMA PARITY SCRIPT
-- Total objects: 21 (1 view + 20 tables)
-- After running: fill in docs/rds-production-schema-parity-checklist.md
-- ============================================================
