-- ============================================================
-- CRBOX Portal Read-Only User Setup
-- Run once on the production RDS instance using the RDS
-- master user (or any account with CREATE USER privilege).
--
-- The password for crbox_portal_ro is stored in Replit as
-- the production secret  RDS_PORTAL_PASSWORD.
-- Retrieve it from the Replit Secrets UI before running.
--
-- Do NOT paste the password value into any document or chat.
-- ============================================================

-- Step 1: Create the read-only portal user.
-- Replace <RDS_PORTAL_PASSWORD> with the value from Replit secrets.
CREATE USER IF NOT EXISTS 'crbox_portal_ro'@'%'
    IDENTIFIED BY '<RDS_PORTAL_PASSWORD>';

-- Step 2: Grant SELECT on all tables required by the three portal modules.

-- mis-paquetes
GRANT SELECT ON CrBox.getwarehousereceipts  TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.consignee             TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.status_general        TO 'crbox_portal_ro'@'%';

-- mis-facturas
GRANT SELECT ON CrBox.resumenmawb           TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.masterairshipment     TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.descuentocorporativo  TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.airshipment           TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.warehousereceipt      TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.shipper               TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.carrierinformation    TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.carrier               TO 'crbox_portal_ro'@'%';

-- mi-cuenta (consignee already granted above)
GRANT SELECT ON CrBox.identificationtype    TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.Sucursal              TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.client               TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.plan                  TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.address               TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.consignee_has_address TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.addresstype           TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.phone                 TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.consignee_has_phone   TO 'crbox_portal_ro'@'%';
GRANT SELECT ON CrBox.phonetype             TO 'crbox_portal_ro'@'%';

-- Step 3: Flush privileges.
FLUSH PRIVILEGES;

-- Step 4: Verify (must show SELECT grants only — no INSERT/UPDATE/DELETE/
--         DROP/ALTER/CREATE/GRANT OPTION/ALL PRIVILEGES).
SHOW GRANTS FOR 'crbox_portal_ro'@'%';

-- Step 5: Smoke-test read access as the new user.
-- Run the following in a separate session connected as crbox_portal_ro:
--
--   SELECT idConsignee FROM CrBox.consignee          LIMIT 1;
--   SELECT idWarehouseReceipt FROM CrBox.getwarehousereceipts LIMIT 1;
--   SELECT idResumenMAWB FROM CrBox.resumenmawb       LIMIT 1;
--
-- Expected: rows returned without error.
-- Forbidden test: attempt INSERT/UPDATE/DELETE — must fail with 1142.
