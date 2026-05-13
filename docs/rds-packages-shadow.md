# RDS Packages Shadow Endpoint

**Task:** #530  
**Date:** 2026-05-13  
**Status:** IMPLEMENTED — admin-only shadow mode, no frontend changes  
**Database:** `crbox_dev1` only

---

## Overview

`GET /api/portal/packages-rds` is a read-only backend endpoint that queries the
`getwarehousereceipts` view in `crbox_dev1` and returns package data for a specific
consignee. It runs in **shadow mode** — the existing `mis-paquetes` frontend is
unchanged and continues to use the legacy `getuserpackages` proxy exclusively.

A companion endpoint `GET /api/admin/rds-shadow-compare` calls both sources for the
same user/date range and returns a structured diff for data-quality validation.

---

## Safety Invariants (confirmed at implementation)

- No INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, GRANT, or REVOKE was run
- No `SELECT *` anywhere in the new code
- `mis-paquetes.html` is unchanged; no portal JS was modified
- Only `crbox_dev1` was queried — confirmed via `SELECT DATABASE()` before every
  package query
- The legacy API, old website, backoffice tool, AWS settings, security groups, and
  production database were not touched
- `idConsignee` is always derived server-side from `consignee.email` — never accepted
  from the caller

---

## Authentication Scope

Both endpoints require a valid admin session cookie (same cookie used by the existing
`/admin` panel). Requests without a valid session return `401`.

> **IMPORTANT — admin-session-only scope:**  
> `?email=` is accepted from query params only because access is restricted to admin
> sessions for controlled shadow testing. Before this endpoint is ever made
> portal-user-facing it **MUST** stop accepting arbitrary email from query params and
> **MUST** derive the identity from the authenticated user's session / token instead.

---

## Feature Flag

Both endpoints check `USE_RDS_PORTAL_API`. If the environment variable is absent or
not equal to `"true"` (case-insensitive), the endpoint returns `503`.

```
USE_RDS_PORTAL_API=true   ← set in Replit shared env vars
```

---

## Endpoint 1: GET /api/portal/packages-rds

### Query Parameters

| Param      | Required | Format      | Default | Notes |
|------------|----------|-------------|---------|-------|
| `email`    | yes      | string      | —       | Consignee login email. Admin-session-only identity. |
| `start`    | yes      | YYYY-MM-DD  | —       | Start of date range (receivedDateTime). |
| `end`      | yes      | YYYY-MM-DD  | —       | End of date range (inclusive, extended to 23:59:59). |
| `status`   | no       | integer     | —       | Filter by `statusId`. |
| `tracking` | no       | string      | —       | Prefix search on `trackingNumber` and `number`. Must not contain `%` or `_`. |
| `limit`    | no       | int 1–200   | 50      | Max rows per page. |
| `offset`   | no       | int ≥ 0     | 0       | Pagination offset. |

### Date Format Note

This endpoint uses `YYYY-MM-DD`. The legacy `getuserpackages` API uses `DD-MM-YYYY`.
When calling the legacy proxy for comparison (e.g. via `rds-shadow-compare`), dates
must be converted: `start_date.strftime('%d-%m-%Y')`.

### Date Validation Rules

All validated with `400` on failure:
- Both `start` and `end` must be valid `YYYY-MM-DD` calendar dates
- `start` must be ≤ `end`
- Window `(end − start)` must be ≤ **90 days** (shadow testing limit)

### How idConsignee Is Resolved

```sql
SELECT idConsignee FROM consignee WHERE email = %s LIMIT 1
```

The email is taken from `?email=` (admin-only). The result is used for all subsequent
queries. If no matching row is found, `404` is returned. The caller never supplies
`idConsignee` directly.

### Database Confirmation

Before any package query, the active database is verified:

```sql
SELECT DATABASE() AS db
```

If the result is not `"crbox_dev1"`, the request returns `503` and the query is
aborted. This prevents accidental queries against wrong schemas.

### SQL Query (exact)

```sql
SELECT idWarehouseReceipt, number, statusId, statusName, trackingNumber,
       receivedDateTime, createdDate, totalPieces, totalWeight, totalVolume,
       totalVolumetricWeight, shipperName, carrierName, airShipmentNumber,
       masterAirShipmentNumber, emision, invoicesCount, descripcion,
       montoFactura, descripcionFactura, consigneeNotes
  FROM getwarehousereceipts
 WHERE idConsignee = %s
   AND receivedDateTime BETWEEN %s AND %s
   [AND statusId = %s]
   [AND (trackingNumber LIKE %s OR number LIKE %s)]
 ORDER BY receivedDateTime DESC
 LIMIT %s OFFSET %s
```

Tracking placeholders bind `value + "%"` (prefix only — `%value%` is intentionally
avoided to prevent expensive full-view scans).

### Response Fields

```json
{
  "ok":          true,
  "source":      "rds",
  "mode":        "shadow",
  "authMode":    "admin_session",
  "database":    "crbox_dev1",
  "idConsignee": 12345,
  "count":       10,
  "limit":       50,
  "offset":      0,
  "packages":    [...]
}
```

Each package object contains the following fields (null fields are omitted):

| Field                   | Type    | Notes |
|-------------------------|---------|-------|
| `idWarehouseReceipt`    | int     | Primary key of the receipt |
| `number`                | string  | Human-readable WR number |
| `statusId`              | int     | Status code |
| `statusName`            | string  | Status label |
| `trackingNumber`        | string  | Carrier tracking number |
| `receivedDateTime`      | string  | ISO-8601; when package arrived at warehouse |
| `createdDate`           | string  | ISO-8601; record creation timestamp |
| `totalPieces`           | int     | Number of pieces |
| `totalWeight`           | float   | Weight |
| `totalVolume`           | float   | Volume |
| `totalVolumetricWeight` | float   | Volumetric weight for billing |
| `shipperName`           | string  | Shipper name |
| `carrierName`           | string  | Carrier name |
| `airShipmentNumber`     | string  | House air waybill number |
| `masterAirShipmentNumber` | string | Master air waybill number |
| `emision`               | string  | ISO-8601; emission/dispatch date |
| `invoicesCount`         | int     | Number of linked invoices |
| `descripcion`           | string  | Package description |
| `montoFactura`          | float   | Invoice amount |
| `descripcionFactura`    | string  | Invoice description |
| `_adminDebug`           | object  | Present only if `consigneeNotes` is non-null (see below) |

#### consigneeNotes — Security Boundary

`consigneeNotes` is excluded from the default package fields. If non-null it appears
only under `_adminDebug.consigneeNotes`. This field may contain internal or operational
notes not intended for customers. **Do not promote it to a client-facing field without
explicit security review.**

### Error Responses

| Status | code                  | Trigger |
|--------|-----------------------|---------|
| 401    | `admin_auth_required` | Missing or invalid admin session cookie |
| 503    | `feature_disabled`    | `USE_RDS_PORTAL_API` not `"true"` |
| 503    | `unexpected_database` | Active DB is not `crbox_dev1` |
| 400    | `bad_request`         | Missing/invalid params, date format, start > end, window > 90 days, `%`/`_` in tracking |
| 404    | `not_found`           | No consignee found for the given email |
| 502    | `rds_error`           | RDS connection or query failure |

No stack traces or SQL details are ever included in error response bodies.

---

## Endpoint 2: GET /api/admin/rds-shadow-compare

Calls both the RDS path and the legacy `getuserpackages` proxy for the same user and
date range, then returns a structured diff.

### Query Parameters

Same as `packages-rds`: `email`, `start`, `end` (all required, same validation).

### Optional Header

```
Authorization: Bearer <token>
```

If present, the legacy call is made using this token. If absent, `"legacy": null` is
returned and the overall response still succeeds.

### Legacy Date Conversion

The legacy `getuserpackages` URL format:
```
https://clients.crbox.cr/api/crboxwebapi/getuserpackages
  /<idConsignee>/<start_DD-MM-YYYY>/<end_DD-MM-YYYY>/null/1000
```

The `start` and `end` params from the query string (`YYYY-MM-DD`) are converted via
`strftime('%d-%m-%Y')` before building this URL.

### Response Shape

```json
{
  "email":       "user@example.com",
  "idConsignee": 12345,
  "dateRange":   { "start": "2025-01-01", "end": "2025-03-31" },
  "rds": {
    "count": 12,
    "statusIdDistribution":   { "2": 10, "5": 2 },
    "statusNameDistribution": { "En bodega": 10, "Entregado": 2 },
    "sample": [ ...first 3 packages... ]
  },
  "legacy": null | {
    "count": 12,
    "statusIdDistribution":   { "2": 10, "5": 2 },
    "statusNameDistribution": { "En bodega": 10, "Entregado": 2 },
    "sample": [ ...first 3 packages... ]
  },
  "legacyError": null | "http_error_401 | timeout_or_network_error | parse_error | unexpected_error",
  "diff": {
    "primaryKey":       "idWarehouseReceipt",
    "countDelta":       0,
    "missingInRds":     [],
    "missingInLegacy":  [],
    "statusMismatch":   []
  }
}
```

### Diff Computation

| Field              | Description |
|--------------------|-------------|
| `primaryKey`       | Always `"idWarehouseReceipt"` — documented as the canonical match key |
| `countDelta`       | `rds.count − legacy.count` |
| `missingInRds`     | Keys present in legacy but absent in RDS result |
| `missingInLegacy`  | Keys present in RDS but absent in legacy result |
| `statusMismatch`   | Packages where the same key has different `statusId` in each source |

Key extraction priority: `idWarehouseReceipt` → `WarehouseReceiptId` → `idwarehousereceipt` → `number` → `Number` → `warehouseReceiptNumber`.

---

## Test Plan

### GET /api/portal/packages-rds

| Test | Expected |
|------|----------|
| No admin cookie | 401 `admin_auth_required` |
| `USE_RDS_PORTAL_API=false` | 503 `feature_disabled` |
| Missing `email` | 400 `bad_request` |
| Missing `start` or `end` | 400 `bad_request` |
| `start=2025-13-01` (invalid date) | 400 `bad_request` |
| `start=2025-03-01&end=2025-01-01` (start > end) | 400 `bad_request` |
| Window > 90 days | 400 `bad_request` |
| Unknown email | 404 `not_found` |
| `tracking=foo%bar` | 400 `bad_request` |
| Valid params, known email | 200 with `packages[]`, `source:"rds"`, `mode:"shadow"` |
| `status=2` filter | 200 with only packages where `statusId == 2` |
| `limit=5&offset=0` | 200 with at most 5 packages |

### GET /api/admin/rds-shadow-compare

| Test | Expected |
|------|----------|
| No admin cookie | 401 `admin_auth_required` |
| No Bearer token | 200 with `legacy: null`, `legacyError: null` |
| Invalid Bearer token | 200 with `legacy: null`, `legacyError: "http_error_401"` |
| Valid Bearer token + valid email | 200 with both `rds` and `legacy` populated |
| `diff.countDelta == 0` | Counts match between sources |

---

## Implementation Files

| File | Change |
|------|--------|
| `server.py` | Added `_handle_portal_packages_rds`, `_handle_admin_rds_shadow_compare` (handler methods inside class); added `_RdsEmailNotFoundError`, `_RdsWrongDatabaseError`, `_rds_query_packages`, `_status_distribution`, `_compute_packages_diff` (module-level); added routing in `_do_get_inner` |
| `docs/rds-packages-shadow.md` | This file |

No frontend files, portal JS, or legacy API handlers were modified.
