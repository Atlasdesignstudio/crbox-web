"""rds_client.py — Read-only MySQL/RDS connection layer for the CRBOX portal.

Credentials are read exclusively from environment variables — never hard-coded:
  MYSQL_HOST      — RDS endpoint hostname
                    (e.g. crboxdbserver.xxxx.us-east-1.rds.amazonaws.com)
  MYSQL_PORT      — TCP port (default: 3306)
  MYSQL_DATABASE  — Database name (e.g. crboxfabric)
  MYSQL_USER      — MySQL user (e.g. crbox_portal_readonly)
  MYSQL_PASSWORD  — Password for that user

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
    Raises KeyError with a helpful message when required vars are missing.
    Never logs the password value.
    """
    missing = [v for v in ('MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD')
               if not os.environ.get(v, '').strip()]
    if missing:
        raise EnvironmentError(
            f'RDS credentials not configured. Missing env vars: {", ".join(missing)}. '
            'Please add them as Replit secrets before enabling USE_RDS_PORTAL_API.'
        )

    return pymysql.connect(
        host=os.environ['MYSQL_HOST'].strip(),
        port=int(os.environ.get('MYSQL_PORT', '3306')),
        database=os.environ['MYSQL_DATABASE'].strip(),
        user=os.environ['MYSQL_USER'].strip(),
        password=os.environ['MYSQL_PASSWORD'],
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
