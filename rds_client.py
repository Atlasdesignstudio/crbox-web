"""rds_client.py — Read-only MySQL/RDS connection layer for the CRBOX portal.

Credentials are read from environment variables — never hard-coded.
Two credential namespaces are supported with a clear priority order:

  Priority 1 — RDS_PORTAL_* namespace (production portal user)
    Used automatically when RDS_PORTAL_HOST is set.
    This namespace carries the dedicated read-only portal credentials
    (crbox_portal_ro / CrBox) and must never be set in development.

    RDS_PORTAL_HOST      — Production RDS endpoint hostname
    RDS_PORTAL_PORT      — TCP port (default: 3306)
    RDS_PORTAL_DATABASE  — Production database name (CrBox)
    RDS_PORTAL_USER      — Read-only portal user (crbox_portal_ro)
    RDS_PORTAL_PASSWORD  — Password for crbox_portal_ro (Replit secret)

  Priority 2 — MYSQL_* namespace (development fallback)
    Used when RDS_PORTAL_HOST is not set.  Dev environment continues to
    connect as CrBoxUser / crbox_dev1 with no changes required.

    MYSQL_HOST      — Dev RDS endpoint hostname
    MYSQL_PORT      — TCP port (default: 3306)
    MYSQL_DATABASE  — Dev database name (crbox_dev1)
    MYSQL_USER      — Dev user (CrBoxUser)
    MYSQL_PASSWORD  — Dev password (Replit secret)

This module is intentionally minimal and read-only:
  • Only fetch_one() and fetch_all() are exposed — no write helpers.
  • Credentials are never logged or included in exceptions.
  • Every call opens a fresh connection and closes it on exit.
  • Connection is tested lazily; import alone never touches the network.

Usage:
    import rds_client
    row  = rds_client.fetch_one('SELECT VERSION() AS v')
    rows = rds_client.fetch_all('SELECT * FROM some_table LIMIT 10')
"""

import os

import pymysql
import pymysql.cursors


# ── Internal helpers ──────────────────────────────────────────────────────────

def _connect():
    """Open a new pymysql connection using environment variables.

    Credential namespace priority:
      1. RDS_PORTAL_* — used when RDS_PORTAL_HOST is set (production).
      2. MYSQL_*      — fallback when RDS_PORTAL_HOST is absent (development).

    Raises EnvironmentError when required vars in the active namespace are
    missing.  Never logs the password value.
    """
    use_portal = bool(os.environ.get('RDS_PORTAL_HOST', '').strip())

    if use_portal:
        host_key     = 'RDS_PORTAL_HOST'
        port_key     = 'RDS_PORTAL_PORT'
        database_key = 'RDS_PORTAL_DATABASE'
        user_key     = 'RDS_PORTAL_USER'
        password_key = 'RDS_PORTAL_PASSWORD'
        namespace    = 'RDS_PORTAL_*'
    else:
        host_key     = 'MYSQL_HOST'
        port_key     = 'MYSQL_PORT'
        database_key = 'MYSQL_DATABASE'
        user_key     = 'MYSQL_USER'
        password_key = 'MYSQL_PASSWORD'
        namespace    = 'MYSQL_*'

    missing = [v for v in (host_key, database_key, user_key, password_key)
               if not os.environ.get(v, '').strip()]
    if missing:
        raise EnvironmentError(
            f'RDS credentials not configured ({namespace} namespace). '
            f'Missing env vars: {", ".join(missing)}. '
            'Please add them before enabling USE_RDS_PORTAL_API.'
        )

    return pymysql.connect(
        host=os.environ[host_key].strip(),
        port=int(os.environ.get(port_key, '3306')),
        database=os.environ[database_key].strip(),
        user=os.environ[user_key].strip(),
        password=os.environ[password_key],
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        connect_timeout=10,
        read_timeout=30,
        write_timeout=10,
    )


# ── Public API ────────────────────────────────────────────────────────────────

def fetch_one(query, params=None):
    """Execute a read-only query and return the first row as a dict, or None.

    Args:
        query:  SQL string. Use %s placeholders for parameters.
        params: Tuple (or list) of parameter values, or None.

    Returns:
        dict | None
    """
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params or ())
            return cur.fetchone()
    finally:
        conn.close()


def fetch_all(query, params=None):
    """Execute a read-only query and return all rows as a list of dicts.

    Args:
        query:  SQL string. Use %s placeholders for parameters.
        params: Tuple (or list) of parameter values, or None.

    Returns:
        list[dict]
    """
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params or ())
            return cur.fetchall()
    finally:
        conn.close()
