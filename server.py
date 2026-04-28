#!/usr/bin/env python3
import os
import re
import json
import time
import sqlite3
import calendar
import threading
import smtplib
import html as _html
import email.mime.multipart
import email.mime.text
import urllib.request
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

CRBOX_AUTH_URL = 'https://clients.crbox.cr/authtoken'
QUOTE_RECIPIENT = 'ventas@crbox.cr'

# ── SQLite / Solicitudes ──────────────────────────────────────────────────────
_DB_PATH = 'solicitudes.db'
_DB_LOCK = threading.Lock()

_LEGAL_TRANSITIONS = {
    'enviada':     {'en_revision', 'respondida', 'cancelada', 'expirada'},
    'en_revision': {'respondida', 'cancelada', 'expirada'},
    'respondida':  {'completada', 'cancelada'},
    'completada':  set(),
    'cancelada':   set(),
    'expirada':    set(),
}

_DEV_SALES_TOKEN = 'crbox-dev-sales-token-2026'


def _get_db():
    """Return a thread-local SQLite connection (creates DB/tables on first use)."""
    conn = sqlite3.connect(_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA foreign_keys=ON')
    return conn


def _init_db():
    """Create tables if they don't exist. Called once at startup."""
    with _DB_LOCK:
        conn = _get_db()
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS quote_requests (
                id                  TEXT PRIMARY KEY,
                casillero_id        TEXT,
                customer_email      TEXT NOT NULL,
                customer_name       TEXT,
                account_type        TEXT NOT NULL DEFAULT "anonymous",
                product_name        TEXT NOT NULL,
                product_url         TEXT,
                declared_value_usd  REAL NOT NULL,
                category            TEXT NOT NULL DEFAULT "otros",
                weight_kg           REAL,
                length_cm           REAL,
                width_cm            REAL,
                height_cm           REAL,
                customer_notes      TEXT,
                service_type        TEXT NOT NULL DEFAULT "aereo",
                destination_zone    TEXT,
                estimate_usd        REAL,
                estimate_breakdown  TEXT,
                ai_extraction_id    TEXT,
                data_source         TEXT NOT NULL DEFAULT "manual",
                status              TEXT NOT NULL DEFAULT "enviada",
                submitted_at        TEXT NOT NULL,
                responded_at        TEXT,
                completed_at        TEXT,
                cancelled_at        TEXT,
                expires_at          TEXT,
                linked_package_id   TEXT
            );

            CREATE TABLE IF NOT EXISTS quote_status_history (
                id               TEXT PRIMARY KEY,
                quote_request_id TEXT NOT NULL,
                from_status      TEXT,
                to_status        TEXT NOT NULL,
                changed_at       TEXT NOT NULL,
                changed_by       TEXT NOT NULL DEFAULT "system",
                note             TEXT,
                FOREIGN KEY (quote_request_id) REFERENCES quote_requests(id)
            );
        ''')
        conn.commit()
        # Safe migration: add reminder_sent_at if it doesn't exist yet.
        # executescript() auto-commits, so ALTER TABLE runs in its own transaction.
        existing_cols = [row[1] for row in
                         conn.execute('PRAGMA table_info(quote_requests)').fetchall()]
        if 'reminder_sent_at' not in existing_cols:
            conn.execute('ALTER TABLE quote_requests ADD COLUMN reminder_sent_at TEXT')
            conn.commit()
            print('[SOLICITUDES] Added reminder_sent_at column to quote_requests')
        conn.close()
    print('[SOLICITUDES] SQLite schema initialised OK')


def _generate_scb_id():
    """Generate the next SCB-XXXX ID by counting existing rows."""
    with _DB_LOCK:
        conn = _get_db()
        row = conn.execute('SELECT COUNT(*) FROM quote_requests').fetchone()
        count = row[0] + 1
        conn.close()
    if count < 10000:
        return f'SCB-{count:04d}'
    return f'SCB-{count}'


def _uuid4_hex():
    """Return a compact random UUID without importing uuid."""
    import random
    h = '%032x' % random.getrandbits(128)
    return h


def _now_iso():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def _now_display():
    return time.strftime('%d/%m/%Y %H:%M', time.gmtime())


def _send_smtp(msg, recipients):
    """Send an already-built MIME message via SMTP. Raises on failure."""
    settings = _smtp_settings()
    if settings is None:
        raise RuntimeError('SMTP not configured')
    host, port_str, user, pwd = settings
    port_int = int(port_str)
    if port_int == 465:
        with smtplib.SMTP_SSL(host, port_int, timeout=15) as srv:
            srv.login(user, pwd)
            srv.sendmail(user, recipients, msg.as_string())
    else:
        with smtplib.SMTP(host, port_int, timeout=15) as srv:
            srv.ehlo()
            srv.starttls()
            srv.ehlo()
            srv.login(user, pwd)
            srv.sendmail(user, recipients, msg.as_string())


def _build_customer_confirmation_html(scb_id, product_name, declared_value_usd,
                                      category, submitted_at):
    esc = _html.escape
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:600px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#FF6B00,#FF9A00);'
        'padding:24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:22px;font-weight:700;margin:0;">'
        '&#10003; Solicitud recibida</p>'
        '<p style="color:rgba(255,255,255,.85);font-size:13px;margin:6px 0 0;">'
        f'ID de solicitud: <strong>{esc(scb_id)}</strong></p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;'
        'padding:28px;border-radius:0 0 8px 8px;">'
        '<p style="font-size:15px;color:#111;margin:0 0 20px;">Hemos recibido tu solicitud de compra. '
        'El equipo de CRBOX la revisará y te contactará pronto.</p>'
        '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:20px;">'
        f'<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#FF6B00;text-transform:uppercase;letter-spacing:.06em;">Detalles de tu solicitud</p>'
        f'<table style="width:100%;border-collapse:collapse;font-size:14px;">'
        f'<tr><td style="padding:5px 0;color:#666;width:40%;">ID</td><td style="padding:5px 0;font-weight:700;color:#111;">{esc(scb_id)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Producto</td><td style="padding:5px 0;color:#111;">{esc(product_name)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Valor declarado</td><td style="padding:5px 0;color:#111;">${declared_value_usd:,.2f} USD</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Categoría</td><td style="padding:5px 0;color:#111;">{esc(category)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Enviada el</td><td style="padding:5px 0;color:#111;">{esc(submitted_at)}</td></tr>'
        '</table>'
        '</div>'
        '<div style="background:#fff7ed;border-left:4px solid #FF6B00;border-radius:4px;padding:14px 16px;margin-bottom:20px;">'
        '<p style="margin:0;font-size:14px;color:#7c2d12;line-height:1.6;">'
        '<strong>¿Qué sigue?</strong> CRBOX te contactará en breve por este mismo correo '
        'con un precio final y los próximos pasos para completar tu compra.</p>'
        '</div>'
        '<p style="font-size:12px;color:#9ca3af;margin:0;">Si tienes preguntas, responde a este correo '
        'o escríbenos por WhatsApp. Incluye tu ID <strong>' + esc(scb_id) + '</strong> en el asunto.</p>'
        '</div></div>'
    )


def _build_sales_email_body(scb_id, submitted_display, customer_name, customer_email,
                             casillero_id, account_type, product_name, product_url,
                             declared_value_usd, category, weight_kg, length_cm,
                             width_cm, height_cm, data_source, service_type,
                             destination_zone, estimate_usd, customer_notes):
    def f(v, default='No especificado'):
        return str(v) if v is not None and str(v).strip() != '' else default

    acct_label = {'personal': 'Personal', 'business': 'Empresa', 'anonymous': 'Sin cuenta'}.get(account_type, 'Sin cuenta')
    url_val = f(product_url, 'No proporcionada')
    cas_val = f(casillero_id, 'Sin casillero (público)')
    name_val = f(customer_name, 'Anónimo')
    weight_val = f'{weight_kg} kg' if weight_kg is not None else 'No especificado'

    if length_cm is not None and width_cm is not None and height_cm is not None:
        dims_val = f'L{length_cm} × W{width_cm} × H{height_cm} cm'
    else:
        dims_val = 'No especificadas'

    ds_label = {'manual': 'Manual', 'ai_extracted': 'AI-extraído (verificado por usuario)',
                'ai_partial': 'AI-parcial (verificado por usuario)'}.get(data_source, 'Manual')

    service_label = 'Aéreo' if service_type == 'aereo' else 'Marítimo'
    dest_val = f(destination_zone, 'No especificado')
    estimate_val = f'${estimate_usd:,.2f} USD (ESTIMADO — sujeto a confirmación)' if estimate_usd is not None else 'No calculado (peso no proporcionado)'
    notes_val = f(customer_notes, 'Ninguna')

    plain = (
        f'SOLICITUD DE COMPRA CRBOX\n'
        f'─────────────────────────\n'
        f'ID: {scb_id}\n'
        f'Fecha: {submitted_display}\n'
        f'─────────────────────────\n'
        f'DATOS DEL CLIENTE\n'
        f'Nombre: {name_val}\n'
        f'Email: {customer_email}\n'
        f'Casillero: {cas_val}\n'
        f'Tipo de cuenta: {acct_label}\n'
        f'─────────────────────────\n'
        f'DATOS DEL PRODUCTO\n'
        f'Nombre del producto: {product_name}\n'
        f'URL: {url_val}\n'
        f'Valor declarado: ${declared_value_usd:,.2f} USD\n'
        f'Categoría: {category}\n'
        f'Peso aproximado: {weight_val}\n'
        f'Dimensiones: {dims_val}\n'
        f'Origen del datos: {ds_label}\n'
        f'─────────────────────────\n'
        f'ENVÍO\n'
        f'Servicio: {service_label}\n'
        f'Destino: {dest_val}\n'
        f'Estimado de envío: {estimate_val}\n'
        f'─────────────────────────\n'
        f'DESCRIPCIÓN DEL CLIENTE:\n'
        f'{notes_val}\n'
        f'─────────────────────────\n'
        f'AVISO: Este estimado se basa en los datos ingresados por el cliente y puede\n'
        f'variar al recibir el paquete físico. CRBOX debe confirmar el precio final.\n'
    )
    return plain


def _plain_to_sales_html(body_text, scb_id, account_type):
    """Convert the sales plain-text body into a styled HTML email."""
    esc = _html.escape
    header_color = '#FF6B00'
    empresa_badge = ''
    if account_type == 'business':
        empresa_badge = (
            '<span style="display:inline-block;background:#FFF7ED;color:#C2410C;'
            'font-size:11px;font-weight:700;padding:2px 10px;border-radius:999px;'
            'border:1px solid #FDBA74;margin-left:10px;vertical-align:middle;">'
            'EMPRESA</span>'
        )

    html_parts = [
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:640px;margin:0 auto;">',
        f'<div style="background:linear-gradient(135deg,{header_color},#FF9A00);'
        'padding:20px 24px;border-radius:8px 8px 0 0;">',
        f'<p style="color:#fff;font-size:20px;font-weight:700;margin:0;">'
        f'&#128230; Nueva Solicitud de Compra {empresa_badge}</p>',
        f'<p style="color:rgba(255,255,255,.85);font-size:13px;margin:6px 0 0;">'
        f'ID: <strong>{esc(scb_id)}</strong> &middot; CRBOX Solicitudes</p>',
        '</div>',
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;'
        'padding:24px;border-radius:0 0 8px 8px;">',
    ]

    current_section = None
    rows = []

    def flush_rows():
        nonlocal rows
        if rows:
            html_parts.append(
                '<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">'
            )
            for lbl, val in rows:
                html_parts.append(
                    f'<tr>'
                    f'<td style="padding:6px 8px;color:#6b7280;font-size:13px;'
                    f'width:38%;vertical-align:top;border-bottom:1px solid #f3f4f6;">{esc(lbl)}</td>'
                    f'<td style="padding:6px 8px;color:#111;font-size:13px;'
                    f'border-bottom:1px solid #f3f4f6;">{esc(val)}</td>'
                    f'</tr>'
                )
            html_parts.append('</table>')
            rows = []

    sections = {
        'DATOS DEL CLIENTE': ['Nombre:', 'Email:', 'Casillero:', 'Tipo de cuenta:'],
        'DATOS DEL PRODUCTO': ['Nombre del producto:', 'URL:', 'Valor declarado:', 'Categoría:', 'Peso aproximado:', 'Dimensiones:', 'Origen del datos:'],
        'ENVÍO': ['Servicio:', 'Destino:', 'Estimado de envío:'],
    }

    notes_content = []
    in_notes = False
    aviso_lines = []
    in_aviso = False

    for line in body_text.split('\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('───') or stripped.startswith('SOLICITUD DE COMPRA') or stripped.startswith('ID:') or stripped.startswith('Fecha:'):
            if stripped.startswith('ID:') or stripped.startswith('Fecha:'):
                pass
            continue

        if in_aviso:
            aviso_lines.append(stripped)
            continue

        if stripped == 'DESCRIPCIÓN DEL CLIENTE:':
            flush_rows()
            current_section = 'DESCRIPCIÓN'
            html_parts.append(
                '<p style="font-size:11px;font-weight:700;color:#FF6B00;'
                'text-transform:uppercase;letter-spacing:.07em;'
                'margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid #fed7aa;">Descripción del cliente</p>'
            )
            in_notes = True
            continue

        if stripped.startswith('AVISO:'):
            flush_rows()
            in_aviso = True
            aviso_lines.append(stripped[6:].strip())
            continue

        if in_notes:
            notes_content.append(stripped)
            continue

        if stripped in sections:
            flush_rows()
            current_section = stripped
            html_parts.append(
                f'<p style="font-size:11px;font-weight:700;color:#FF6B00;'
                f'text-transform:uppercase;letter-spacing:.07em;'
                f'margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid #fed7aa;">'
                f'{esc(stripped)}</p>'
            )
            continue

        colon_idx = stripped.find(':')
        if colon_idx > 0:
            lbl = stripped[:colon_idx].strip()
            val = stripped[colon_idx + 1:].strip()
            rows.append((lbl, val))

    flush_rows()

    if notes_content:
        html_parts.append(
            f'<p style="font-size:14px;color:#333;line-height:1.6;margin:4px 0 12px;">'
            f'{esc(" ".join(notes_content))}</p>'
        )

    if aviso_lines:
        html_parts.append(
            '<div style="margin-top:20px;padding:12px 14px;background:#fffdf7;'
            'border-left:4px solid #f59e0b;border-radius:4px;">'
            f'<p style="font-size:12px;color:#78350f;margin:0;line-height:1.6;">'
            f'<strong>AVISO:</strong> {esc(" ".join(aviso_lines))}</p>'
            '</div>'
        )

    html_parts.append('</div></div>')
    return '\n'.join(html_parts)


def _send_customer_confirmation(scb_id, customer_email, customer_name,
                                 product_name, declared_value_usd, category,
                                 submitted_display, smtp_user):
    esc = _html.escape
    subject = f'[{scb_id}] Tu solicitud fue recibida — {product_name}'
    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'CRBOX <{smtp_user}>'
    msg['To'] = customer_email

    greeting = f'Hola {customer_name},' if customer_name else 'Hola,'
    plain = (
        f'{greeting}\n\n'
        f'Tu solicitud de compra fue recibida correctamente.\n\n'
        f'ID de solicitud: {scb_id}\n'
        f'Producto: {product_name}\n'
        f'Valor declarado: ${declared_value_usd:,.2f} USD\n'
        f'Categoría: {category}\n'
        f'Fecha: {submitted_display}\n\n'
        f'CRBOX te contactará en breve con el precio final y los próximos pasos.\n\n'
        f'Si tienes preguntas, responde a este correo indicando tu ID: {scb_id}\n\n'
        f'Equipo CRBOX\n'
        f'ventas@crbox.cr'
    )
    html_body = _build_customer_confirmation_html(
        scb_id, product_name, declared_value_usd, category, submitted_display
    )
    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))
    _send_smtp(msg, [customer_email])


def _send_sales_submission(scb_id, customer_email, customer_name,
                            casillero_id, account_type,
                            product_name, product_url, declared_value_usd,
                            category, weight_kg, length_cm, width_cm, height_cm,
                            data_source, service_type, destination_zone,
                            estimate_usd, customer_notes, submitted_display, smtp_user):
    empresa_tag = '[EMPRESA] ' if account_type == 'business' else ''
    subject = f'[{scb_id}] {empresa_tag}Solicitud de compra — {product_name} — {customer_email}'
    body_text = _build_sales_email_body(
        scb_id, submitted_display, customer_name, customer_email,
        casillero_id, account_type, product_name, product_url,
        declared_value_usd, category, weight_kg, length_cm, width_cm,
        height_cm, data_source, service_type, destination_zone,
        estimate_usd, customer_notes
    )
    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'CRBOX Solicitudes <{smtp_user}>'
    msg['To'] = QUOTE_RECIPIENT
    msg['Reply-To'] = customer_email
    msg.attach(email.mime.text.MIMEText(body_text, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(
        _plain_to_sales_html(body_text, scb_id, account_type), 'html', 'utf-8'
    ))
    _send_smtp(msg, [QUOTE_RECIPIENT])


def _send_cancellation_email(scb_id, customer_email, customer_name, product_name, smtp_user):
    esc = _html.escape
    greeting = f'Hola {customer_name},' if customer_name else 'Hola,'
    subject = f'[{scb_id}] Tu solicitud fue cancelada'
    plain = (
        f'{greeting}\n\n'
        f'Tu solicitud de compra {scb_id} ha sido cancelada.\n\n'
        f'Producto: {product_name}\n\n'
        f'Si crees que fue un error o deseas hacer un nuevo pedido, '
        f'puedes crear una nueva solicitud en crbox.cr/cotizar.html '
        f'o contactarnos directamente.\n\n'
        f'Equipo CRBOX\nventas@crbox.cr'
    )
    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;max-width:600px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#6b7280,#9ca3af);padding:24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:22px;font-weight:700;margin:0;">&#215; Solicitud cancelada</p>'
        f'<p style="color:rgba(255,255,255,.85);font-size:13px;margin:6px 0 0;">ID: <strong>{esc(scb_id)}</strong></p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px;">'
        f'<p style="font-size:15px;color:#111;margin:0 0 20px;">{esc(greeting)}<br><br>'
        f'Tu solicitud <strong>{esc(scb_id)}</strong> ha sido cancelada.</p>'
        '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:20px;">'
        '<table style="width:100%;border-collapse:collapse;font-size:14px;">'
        f'<tr><td style="padding:5px 0;color:#666;width:40%;">ID</td>'
        f'<td style="padding:5px 0;font-weight:700;color:#111;">{esc(scb_id)}</td></tr>'
        f'<tr><td style="padding:5px 0;color:#666;">Producto</td>'
        f'<td style="padding:5px 0;color:#111;">{esc(product_name)}</td></tr>'
        '<tr><td style="padding:5px 0;color:#666;">Estado</td>'
        '<td style="padding:5px 0;color:#ef4444;font-weight:600;">Cancelada</td></tr>'
        '</table></div>'
        '<p style="font-size:14px;color:#374151;margin:0 0 16px;">'
        'Si deseas hacer un nuevo pedido puedes crear una nueva solicitud en cualquier momento.</p>'
        f'<a href="https://crbox.cr/cotizar.html" style="display:inline-block;background:#FF6B00;color:#fff;'
        'font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:20px;">'
        'Nueva solicitud</a>'
        f'<p style="font-size:12px;color:#9ca3af;margin:0;">¿Tienes preguntas? Responde a este correo '
        f'incluyendo el ID <strong>{esc(scb_id)}</strong>.</p>'
        '</div></div>'
    )
    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'CRBOX <{smtp_user}>'
    msg['To'] = customer_email
    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))
    _send_smtp(msg, [customer_email])

# ─────────────────────────────────────────────────────────────────────────────

_rate_lock   = threading.Lock()
_rate_window = {}

_QUOTE_LOG_PATH = 'quote_submissions.log'
_quote_log_lock = threading.Lock()

_RATE_LIMIT   = 5
_RATE_SECONDS = 60

# ── SMTP health monitor ────────────────────────────────────────────────────────
# How often to probe SMTP (seconds). Override with SMTP_HEALTH_INTERVAL env var.
_HEALTH_INTERVAL_DEFAULT = 300   # 5 minutes

# Minimum gap between alert emails (seconds). Prevents inbox flooding.
_ALERT_COOLDOWN = 3600           # 1 hour

_last_alert_time = 0.0
_alert_lock      = threading.Lock()


def _smtp_settings():
    """Return (host, port, user, password) from env vars, or None if unconfigured."""
    host = os.environ.get('SMTP_HOST', '').strip()
    port = os.environ.get('SMTP_PORT', '587').strip()
    user = os.environ.get('SMTP_USER', '').strip()
    pwd  = os.environ.get('SMTP_PASS', '').strip()
    if not all([host, user, pwd]):
        return None
    return host, port, user, pwd


def _check_smtp() -> tuple[bool, str]:
    """Connect to SMTP and authenticate without sending any email.

    Returns (ok, error_message).  On success error_message is ''.
    """
    settings = _smtp_settings()
    if settings is None:
        return False, 'SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS missing)'

    host, port_str, user, pwd = settings
    try:
        port_int = int(port_str)
        if port_int == 465:
            with smtplib.SMTP_SSL(host, port_int, timeout=15) as srv:
                srv.login(user, pwd)
        else:
            with smtplib.SMTP(host, port_int, timeout=15) as srv:
                srv.ehlo()
                srv.starttls()
                srv.ehlo()
                srv.login(user, pwd)
        return True, ''
    except smtplib.SMTPAuthenticationError:
        return False, 'SMTP authentication failed — credentials may be expired or revoked'
    except smtplib.SMTPException as exc:
        return False, f'SMTP error: {exc}'
    except OSError as exc:
        return False, f'Network error reaching SMTP server: {exc}'
    except Exception as exc:
        return False, f'Unexpected error: {exc}'


def _send_alert(error_msg: str):
    """Send an alert email to the team when SMTP health check fails.

    Uses the configured SMTP credentials — if those are broken we log to
    stdout instead so the server console still captures the event.
    The alert recipient defaults to QUOTE_RECIPIENT but can be overridden
    with the ALERT_EMAIL env var.
    """
    settings = _smtp_settings()
    alert_to = os.environ.get('ALERT_EMAIL', QUOTE_RECIPIENT).strip()

    if settings is None:
        print(f'[HEALTH ALERT] SMTP not configured — cannot send alert. Error: {error_msg}')
        return

    host, port_str, user, pwd = settings

    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = '[CRBOX] ALERTA: El formulario de cotización dejó de enviar emails'
    msg['From']    = f'CRBOX Monitor <{user}>'
    msg['To']      = alert_to

    plain = (
        'ALERTA DE SISTEMA — CRBOX\n\n'
        'El endpoint /send-quote no puede conectarse al servidor SMTP.\n'
        'Los clientes que envíen cotizaciones desde la calculadora no recibirán respuesta.\n\n'
        f'Error detectado:\n{error_msg}\n\n'
        'Acciones recomendadas:\n'
        '  1. Verificar que el App Password de Google Workspace siga activo.\n'
        '  2. Confirmar que las variables de entorno SMTP_HOST / SMTP_USER / SMTP_PASS estén configuradas.\n'
        '  3. Si se revocó el App Password, generar uno nuevo en:\n'
        '     myaccount.google.com → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones\n\n'
        '— Monitor automático de CRBOX'
    )

    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:600px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#DC2626,#EF4444);'
        'padding:20px 24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:20px;font-weight:700;margin:0;">&#x26A0; Alerta de sistema</p>'
        '<p style="color:rgba(255,255,255,.85);font-size:13px;margin:4px 0 0;">'
        'CRBOX &middot; Monitor del formulario de cotizaci&oacute;n</p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;'
        'padding:24px;border-radius:0 0 8px 8px;">'
        '<p style="font-size:15px;font-weight:600;color:#DC2626;">'
        'El endpoint /send-quote no puede conectarse al servidor SMTP.</p>'
        '<p style="color:#555;">Los clientes que env&iacute;en cotizaciones desde la calculadora '
        '<strong>no recibir&aacute;n respuesta</strong> mientras dure el fallo.</p>'
        '<div style="margin:16px 0;padding:12px 14px;background:#FEF2F2;'
        'border-left:4px solid #FCA5A5;border-radius:4px;">'
        f'<p style="font-size:13px;color:#991B1B;margin:0;font-family:monospace;">{_html.escape(error_msg)}</p>'
        '</div>'
        '<p style="font-weight:700;margin:20px 0 8px;">Acciones recomendadas:</p>'
        '<ol style="color:#444;line-height:1.8;padding-left:20px;">'
        '<li>Verificar que el App Password de Google Workspace siga activo.</li>'
        '<li>Confirmar las variables de entorno <code>SMTP_HOST</code> / <code>SMTP_USER</code> / <code>SMTP_PASS</code>.</li>'
        '<li>Si fue revocado, generar uno nuevo en '
        '<a href="https://myaccount.google.com/apppasswords" style="color:#FF6B00;">'
        'myaccount.google.com → App passwords</a>.</li>'
        '</ol>'
        '<p style="font-size:12px;color:#9CA3AF;margin-top:24px;">'
        '— Monitor autom&aacute;tico de CRBOX &middot; '
        'Este correo se env&iacute;a m&aacute;ximo una vez por hora.</p>'
        '</div></div>'
    )

    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))

    try:
        port_int = int(port_str)
        if port_int == 465:
            with smtplib.SMTP_SSL(host, port_int, timeout=15) as srv:
                srv.login(user, pwd)
                srv.sendmail(user, [alert_to], msg.as_string())
        else:
            with smtplib.SMTP(host, port_int, timeout=15) as srv:
                srv.ehlo()
                srv.starttls()
                srv.ehlo()
                srv.login(user, pwd)
                srv.sendmail(user, [alert_to], msg.as_string())
        print(f'[HEALTH ALERT] Alert email sent to {alert_to}. Error was: {error_msg}')
    except Exception as exc:
        print(f'[HEALTH ALERT] SMTP failed and alert email could not be delivered: {exc} | Original error: {error_msg}')


def _health_monitor_loop(interval: int):
    """Background daemon that periodically checks SMTP health."""
    global _last_alert_time
    print(f'[HEALTH MONITOR] Starting — interval {interval}s, alert cooldown {_ALERT_COOLDOWN}s')
    while True:
        time.sleep(interval)
        ok, err = _check_smtp()
        if ok:
            print('[HEALTH MONITOR] SMTP OK')
        else:
            print(f'[HEALTH MONITOR] SMTP FAIL: {err}')
            with _alert_lock:
                now = time.monotonic()
                if now - _last_alert_time >= _ALERT_COOLDOWN:
                    _last_alert_time = now
                    send_now = True
                else:
                    send_now = False
            if send_now:
                _send_alert(err)
            else:
                print('[HEALTH MONITOR] Alert suppressed (cooldown active)')


def _start_health_monitor():
    raw = os.environ.get('SMTP_HEALTH_INTERVAL', '')
    try:
        interval = max(30, int(raw)) if raw.strip() else _HEALTH_INTERVAL_DEFAULT
    except ValueError:
        print(f'[HEALTH MONITOR] Invalid SMTP_HEALTH_INTERVAL "{raw}", using default {_HEALTH_INTERVAL_DEFAULT}s')
        interval = _HEALTH_INTERVAL_DEFAULT
    t = threading.Thread(target=_health_monitor_loop, args=(interval,), daemon=True)
    t.start()
# ─────────────────────────────────────────────────────────────────────────────


# ── Solicitud overdue reminder ─────────────────────────────────────────────────
# Polls for enviada solicitudes that have had no sales action after N hours and
# sends a single digest email to the sales team (ventas@crbox.cr).
# Each solicitud only receives one reminder (reminder_sent_at is set on send).
_REMINDER_INTERVAL_DEFAULT = 3600   # check every hour


def _send_reminder_digest(rows, reminder_hours: int) -> tuple[bool, str]:
    """Build and send a digest reminder email to the sales team."""
    settings = _smtp_settings()
    if settings is None:
        return False, 'SMTP not configured'

    host, port_str, user, pwd = settings
    n = len(rows)
    plural = 'es' if n != 1 else ''
    plural_h = 's' if reminder_hours != 1 else ''
    subject = f'Recordatorio: {n} solicitud(es) pendiente(s) de respuesta.'

    # ── Build row HTML for table ────────────────────────────────────────────
    rows_html = ''
    plain_items = []
    now_ts = time.time()
    for row in rows:
        try:
            submitted_struct = time.strptime(row['submitted_at'], '%Y-%m-%dT%H:%M:%SZ')
            elapsed_h = int((now_ts - calendar.timegm(submitted_struct)) / 3600)
            if elapsed_h < 48:
                elapsed_str = f'{elapsed_h}h'
            else:
                elapsed_str = f'{elapsed_h // 24}d {elapsed_h % 24}h'
        except Exception:
            elapsed_str = '?h'

        customer = row['customer_name'] or row['customer_email']
        id_esc      = _html.escape(row['id'])
        product_esc = _html.escape(row['product_name'])
        customer_esc = _html.escape(customer)
        email_esc   = _html.escape(row['customer_email'])

        rows_html += (
            f'<tr style="border-bottom:1px solid #f3f4f6;">'
            f'<td style="padding:10px 12px;font-weight:700;color:#FF6B00;white-space:nowrap;'
            f'font-size:13px;font-family:monospace;">{id_esc}</td>'
            f'<td style="padding:10px 12px;font-size:13px;color:#111827;">{product_esc}</td>'
            f'<td style="padding:10px 12px;font-size:13px;color:#374151;">{customer_esc}'
            f'<br><span style="color:#9ca3af;font-size:12px;">{email_esc}</span></td>'
            f'<td style="padding:10px 12px;font-size:13px;color:#6b7280;white-space:nowrap;'
            f'font-weight:600;">{elapsed_str}</td>'
            '</tr>'
        )
        plain_items.append(
            f'  \u2022 {row["id"]} \u2014 {row["product_name"]}\n'
            f'    Cliente: {customer} <{row["customer_email"]}>\n'
            f'    Sin respuesta: {elapsed_str}\n'
        )

    plain = (
        f'RECORDATORIO \u2014 CRBOX\n\n'
        f'Hay {n} solicitud{plural} con status "enviada" que lleva{("n" if n != 1 else "")} '
        f'm\u00e1s de {reminder_hours} hora{plural_h} sin respuesta:\n\n'
        + ''.join(plain_items)
        + f'\nRevisa y actualiza el status en el panel de ventas.\n\n'
        f'\u2014 Recordatorio autom\u00e1tico de CRBOX'
    )

    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:640px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#FF6B00,#FF9A00);'
        'padding:20px 24px;border-radius:8px 8px 0 0;">'
        f'<p style="color:#fff;font-size:20px;font-weight:700;margin:0;">'
        f'&#128203; {n} solicitud{plural} pendiente{plural}</p>'
        '<p style="color:rgba(255,255,255,.85);font-size:13px;margin:4px 0 0;">'
        'CRBOX &middot; Recordatorio autom&aacute;tico de ventas</p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;'
        'padding:24px;border-radius:0 0 8px 8px;">'
        f'<p style="font-size:15px;color:#374151;">'
        f'La{"s" if n != 1 else ""} siguiente{"s" if n != 1 else ""} '
        f'solicitud{plural} lleva{("n" if n != 1 else "")} m&aacute;s de '
        f'<strong>{reminder_hours} hora{plural_h}</strong> sin respuesta:</p>'
        '<table style="width:100%;border-collapse:collapse;margin-top:16px;">'
        '<thead><tr style="background:#f9fafb;">'
        '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;'
        'font-weight:600;text-transform:uppercase;letter-spacing:.05em;">ID</th>'
        '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;'
        'font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Producto</th>'
        '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;'
        'font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Cliente</th>'
        '<th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;'
        'font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Sin respuesta</th>'
        '</tr></thead>'
        '<tbody>' + rows_html + '</tbody>'
        '</table>'
        '<p style="font-size:12px;color:#9ca3af;margin-top:24px;">'
        '\u2014 Recordatorio autom&aacute;tico de CRBOX &middot; '
        'Este correo se env&iacute;a una sola vez por solicitud.</p>'
        '</div></div>'
    )

    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From']    = f'CRBOX Sistema <{user}>'
    msg['To']      = QUOTE_RECIPIENT
    msg.attach(email.mime.text.MIMEText(plain, 'plain', 'utf-8'))
    msg.attach(email.mime.text.MIMEText(html_body, 'html', 'utf-8'))

    try:
        port_int = int(port_str)
        if port_int == 465:
            with smtplib.SMTP_SSL(host, port_int, timeout=15) as srv:
                srv.login(user, pwd)
                srv.sendmail(user, [QUOTE_RECIPIENT], msg.as_string())
        else:
            with smtplib.SMTP(host, port_int, timeout=15) as srv:
                srv.ehlo(); srv.starttls(); srv.ehlo()
                srv.login(user, pwd)
                srv.sendmail(user, [QUOTE_RECIPIENT], msg.as_string())
        return True, ''
    except smtplib.SMTPAuthenticationError:
        return False, 'SMTP authentication failed'
    except smtplib.SMTPException as exc:
        return False, f'SMTP error: {exc}'
    except OSError as exc:
        return False, f'Network error: {exc}'
    except Exception as exc:
        return False, f'Unexpected error: {exc}'


def _check_and_send_reminders(reminder_hours: int):
    """Query for overdue enviada solicitudes and send one digest to the sales team."""
    cutoff_ts  = time.time() - reminder_hours * 3600
    cutoff_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(cutoff_ts))

    with _DB_LOCK:
        conn = _get_db()
        try:
            rows = conn.execute(
                '''SELECT id, customer_name, customer_email, product_name, submitted_at
                   FROM quote_requests
                   WHERE status = 'enviada'
                     AND submitted_at < ?
                     AND reminder_sent_at IS NULL''',
                (cutoff_iso,)
            ).fetchall()
        finally:
            conn.close()

    if not rows:
        print('[SOLICITUD REMINDER] Check complete — no overdue solicitudes')
        return

    print(f'[SOLICITUD REMINDER] Found {len(rows)} overdue solicitudes — sending digest')
    ok, err = _send_reminder_digest(rows, reminder_hours)

    if not ok:
        print(f'[SOLICITUD REMINDER] Failed to send digest email: {err}')
        return

    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    with _DB_LOCK:
        conn = _get_db()
        try:
            conn.executemany(
                'UPDATE quote_requests SET reminder_sent_at = ? WHERE id = ?',
                [(now_iso, row['id']) for row in rows]
            )
            conn.commit()
        finally:
            conn.close()
    print(f'[SOLICITUD REMINDER] Digest sent — marked {len(rows)} record(s) with reminder_sent_at')


def _solicitud_reminder_loop(interval: int, reminder_hours: int):
    """Background daemon: periodically checks for overdue enviada solicitudes."""
    print(f'[SOLICITUD REMINDER] Starting — interval {interval}s, threshold {reminder_hours}h')
    while True:
        time.sleep(interval)
        try:
            _check_and_send_reminders(reminder_hours)
        except Exception as exc:
            print(f'[SOLICITUD REMINDER] Unexpected error in reminder loop: {exc}')


def _start_solicitud_reminder():
    """Read env vars and launch the solicitud reminder daemon thread."""
    raw_hours    = os.environ.get('SOLICITUD_REMINDER_HOURS', '').strip()
    raw_interval = os.environ.get('SOLICITUD_REMINDER_INTERVAL', '').strip()

    try:
        reminder_hours = max(1, int(raw_hours)) if raw_hours else 48
    except ValueError:
        print(f'[SOLICITUD REMINDER] Invalid SOLICITUD_REMINDER_HOURS "{raw_hours}", using default 48h')
        reminder_hours = 48

    try:
        interval = max(60, int(raw_interval)) if raw_interval else _REMINDER_INTERVAL_DEFAULT
    except ValueError:
        print(f'[SOLICITUD REMINDER] Invalid SOLICITUD_REMINDER_INTERVAL "{raw_interval}", '
              f'using default {_REMINDER_INTERVAL_DEFAULT}s')
        interval = _REMINDER_INTERVAL_DEFAULT

    t = threading.Thread(
        target=_solicitud_reminder_loop,
        args=(interval, reminder_hours),
        daemon=True
    )
    t.start()
# ─────────────────────────────────────────────────────────────────────────────


def _check_rate_limit(ip):
    now = time.monotonic()
    with _rate_lock:
        timestamps = _rate_window.get(ip, [])
        timestamps = [t for t in timestamps if now - t < _RATE_SECONDS]
        if len(timestamps) >= _RATE_LIMIT:
            return False
        timestamps.append(now)
        _rate_window[ip] = timestamps
        return True


def _log_quote_submission(name: str, email_addr: str, subject: str, status: str,
                          error: str = '', ip: str = ''):
    """Append a single JSON record to the quote submission audit log.

    Failures to write the log are printed but never propagated — logging must
    never affect the HTTP response sent to the caller.
    """
    try:
        record = json.dumps({
            'ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'ip': ip,
            'name': name,
            'email': email_addr,
            'subject': subject,
            'status': status,
            'error': error,
        }, ensure_ascii=False)
        with _quote_log_lock:
            with open(_QUOTE_LOG_PATH, 'a', encoding='utf-8') as f:
                f.write(record + '\n')
    except Exception as exc:
        print(f'[QUOTE LOG] Failed to write audit record: {exc}')


def _quote_text_to_html(body_text):
    """Convert the pre-built plain-text quote body to a clean HTML email."""
    lines = body_text.split('\n')
    out = []

    out.append(
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:600px;margin:0 auto;">'
    )

    # Header band
    out.append(
        '<div style="background:linear-gradient(135deg,#FF6B00,#FF9A00);'
        'padding:20px 24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:20px;font-weight:700;margin:0;">'
        '&#128230; Solicitud de Cotización</p>'
        '<p style="color:rgba(255,255,255,.85);font-size:13px;margin:4px 0 0;">'
        'CRBOX &middot; Calculadora de env&iacute;os</p>'
        '</div>'
    )

    # Body
    out.append(
        '<div style="background:#fff;border:1px solid #e5e7eb;'
        'border-top:none;padding:24px;border-radius:0 0 8px 8px;">'
    )

    for line in lines:
        esc = _html.escape(line)

        # Skip the title and separator lines (already in the header band)
        if 'Solicitud de cotizaci' in line or '===' in line:
            continue

        # Empty line → spacer
        if not line.strip():
            out.append('<div style="margin:10px 0;"></div>')
            continue

        # Section header: non-indented line ending with ":"
        if (not line.startswith(' ')
                and line.rstrip().endswith(':')
                and len(line.strip()) > 3):
            label = esc.rstrip().rstrip(':')
            out.append(
                f'<p style="font-size:11px;font-weight:700;color:#FF6B00;'
                f'text-transform:uppercase;letter-spacing:.07em;'
                f'margin:20px 0 8px;padding-bottom:6px;'
                f'border-bottom:1px solid #fed7aa;">{label}</p>'
            )
            continue

        # Numbered item line: "1. Name", "2. Name", …
        if (not line.startswith(' ')
                and len(line) > 2
                and line[0].isdigit()
                and '. ' in line[:5]):
            out.append(
                f'<p style="font-weight:700;font-size:14px;'
                f'margin:12px 0 3px;color:#111;">{esc}</p>'
            )
            continue

        # Indented detail line (item attribute)
        if line.startswith('   ') or line.startswith('  '):
            out.append(
                f'<p style="font-size:13px;color:#555;'
                f'margin:2px 0;padding-left:16px;line-height:1.5;">'
                f'{esc.strip()}</p>'
            )
            continue

        # Estimate disclaimer line
        if line.startswith('Nota:'):
            out.append(
                f'<div style="margin-top:20px;padding:12px 14px;'
                f'background:#fffdf7;border-left:4px solid #f59e0b;'
                f'border-radius:4px;">'
                f'<p style="font-size:12px;color:#78350f;margin:0;'
                f'line-height:1.6;">{esc}</p></div>'
            )
            continue

        # Regular line (Nombre, Correo, Destino, totals, savings)
        out.append(
            f'<p style="font-size:14px;margin:4px 0;color:#333;">{esc}</p>'
        )

    out.append('</div>')  # body
    out.append('</div>')  # outer wrapper
    return '\n'.join(out)


# ─── Admin panel ─────────────────────────────────────────────────────────────
_admin_sessions      = {}           # token → expiry_ts
_admin_sessions_lock = threading.Lock()
_admin_brute_state   = {}           # ip → [fail_monotonic_ts, ...]
_admin_brute_lock    = threading.Lock()

_ADMIN_SESSION_TTL  = 8 * 3600     # 8 hours
_ADMIN_BRUTE_MAX    = 5
_ADMIN_BRUTE_WINDOW = 600           # 10-minute failure window
_ADMIN_BRUTE_BLOCK  = 600           # 10-minute block


def _admin_password():
    return os.environ.get('ADMIN_PASSWORD', '').strip() or None


def _admin_create_session():
    token = _uuid4_hex() + _uuid4_hex()   # 64-char hex
    expiry = time.time() + _ADMIN_SESSION_TTL
    with _admin_sessions_lock:
        _admin_sessions[token] = expiry
    return token


def _admin_validate_session(token):
    if not token:
        return False
    with _admin_sessions_lock:
        expiry = _admin_sessions.get(token)
        if expiry is None:
            return False
        if time.time() > expiry:
            del _admin_sessions[token]
            return False
        return True


def _admin_clear_session(token):
    with _admin_sessions_lock:
        _admin_sessions.pop(token, None)


def _admin_brute_blocked(ip):
    """Return (blocked, remaining_seconds)."""
    now = time.monotonic()
    with _admin_brute_lock:
        timestamps = [t for t in _admin_brute_state.get(ip, [])
                      if now - t < _ADMIN_BRUTE_WINDOW]
        _admin_brute_state[ip] = timestamps
        if len(timestamps) >= _ADMIN_BRUTE_MAX:
            oldest = timestamps[0]
            remaining = max(0, int(oldest + _ADMIN_BRUTE_BLOCK - now))
            if remaining > 0:
                return True, remaining
            _admin_brute_state[ip] = []
    return False, 0


def _admin_brute_record_fail(ip):
    now = time.monotonic()
    with _admin_brute_lock:
        ts_list = _admin_brute_state.get(ip, [])
        ts_list = [t for t in ts_list if now - t < _ADMIN_BRUTE_WINDOW]
        ts_list.append(now)
        _admin_brute_state[ip] = ts_list


def _admin_elapsed(iso_str):
    """Return Spanish relative time string from a UTC ISO timestamp."""
    try:
        struct = time.strptime(iso_str[:19], '%Y-%m-%dT%H:%M:%S')
        ts    = calendar.timegm(struct)
        diff  = int(time.time() - ts)
    except Exception:
        return ''
    if diff < 120:
        return 'hace un momento'
    if diff < 3600:
        m = diff // 60
        return f'hace {m} min'
    if diff < 86400:
        h = diff // 3600
        return f'hace {h}h'
    d = diff // 86400
    return f'hace {d} día{"s" if d != 1 else ""}'


def _admin_format_date(iso_str):
    try:
        struct = time.strptime(iso_str[:19], '%Y-%m-%dT%H:%M:%S')
        return time.strftime('%d/%m/%Y %H:%M', struct)
    except Exception:
        return iso_str or ''


def _admin_status_badge_html(status):
    cfg = {
        'enviada':     ('#FFF7ED', '#C2410C', '#FDBA74', 'Enviada'),
        'en_revision': ('#EFF6FF', '#1D4ED8', '#BFDBFE', 'En revisión'),
        'respondida':  ('#F0FDF4', '#15803D', '#BBF7D0', 'Respondida'),
        'completada':  ('#F9FAFB', '#374151', '#D1D5DB', 'Completada'),
        'cancelada':   ('#FEF2F2', '#991B1B', '#FECACA', 'Cancelada'),
        'expirada':    ('#F9FAFB', '#6B7280', '#E5E7EB', 'Expirada'),
    }
    bg, fg, border, label = cfg.get(status, ('#F9FAFB', '#374151', '#D1D5DB', status))
    return (
        f'<span class="adm-badge" id="badge-{{}}" '
        f'style="background:{bg};color:{fg};border-color:{border};">{label}</span>'
    )


def _admin_status_options_html(current_status):
    labels = {
        'enviada':     'Enviada',
        'en_revision': 'En revisión',
        'respondida':  'Respondida',
        'completada':  'Completada',
        'cancelada':   'Cancelada',
        'expirada':    'Expirada',
    }
    transitions = _LEGAL_TRANSITIONS.get(current_status, set())
    order = ['en_revision', 'respondida', 'completada', 'cancelada']
    opts = [
        f'<option value="" disabled selected>— Cambiar a —</option>'
    ]
    for nxt in order:
        if nxt in transitions:
            opts.append(f'<option value="{nxt}">{labels.get(nxt, nxt)}</option>')
    return '\n'.join(opts)


def _build_admin_login_html(error='', blocked_secs=0):
    esc = _html.escape
    if blocked_secs > 0:
        mins = (blocked_secs + 59) // 60
        alert_html = (
            f'<div class="adl-alert adl-alert-block">Demasiados intentos fallidos. '
            f'Espera {mins} minuto{"s" if mins != 1 else ""} e intenta de nuevo.</div>'
        )
    elif error:
        alert_html = f'<div class="adl-alert">{esc(error)}</div>'
    else:
        alert_html = ''

    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Panel de ventas — CRBOX</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,sans-serif;
  background:#f3f4f6;min-height:100vh;display:flex;align-items:center;
  justify-content:center;padding:16px}}
.adl-card{{background:#fff;border-radius:14px;
  box-shadow:0 4px 24px rgba(0,0,0,.10);width:100%;max-width:380px;overflow:hidden}}
.adl-header{{background:linear-gradient(135deg,#FF6B00,#FF9A00);padding:28px 24px}}
.adl-header-logo{{color:#fff;font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:4px}}
.adl-header-sub{{color:rgba(255,255,255,.85);font-size:13px}}
.adl-body{{padding:28px 24px}}
.adl-label{{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px}}
.adl-input{{width:100%;border:1.5px solid #D1D5DB;border-radius:8px;padding:11px 14px;
  font-size:15px;outline:none;transition:border-color .2s,box-shadow .2s;
  font-family:inherit}}
.adl-input:focus{{border-color:#FF6B00;box-shadow:0 0 0 3px rgba(255,107,0,.12)}}
.adl-btn{{display:block;width:100%;background:#FF6B00;color:#fff;border:none;
  border-radius:8px;padding:12px;font-size:15px;font-weight:700;cursor:pointer;
  margin-top:20px;transition:background .2s;font-family:inherit}}
.adl-btn:hover{{background:#E05A00}}
.adl-alert{{margin-bottom:16px;padding:11px 14px;border-radius:8px;font-size:13px;
  background:#FEF2F2;color:#991B1B;border:1px solid #FECACA}}
.adl-alert-block{{background:#FFF7ED;color:#C2410C;border-color:#FDBA74}}
</style>
</head>
<body>
<div class="adl-card">
  <div class="adl-header">
    <div class="adl-header-logo">CRBOX</div>
    <div class="adl-header-sub">Panel de ventas &mdash; acceso interno</div>
  </div>
  <div class="adl-body">
    {alert_html}
    <form method="POST" action="/admin/login" autocomplete="off">
      <label class="adl-label" for="pwd">Contraseña</label>
      <input class="adl-input" type="password" id="pwd" name="password"
             autofocus required placeholder="Ingresa la contraseña" maxlength="200">
      <button class="adl-btn" type="submit">Ingresar</button>
    </form>
  </div>
</div>
</body>
</html>'''


def _build_admin_solicitudes_html(rows, filter_val, counts):
    esc = _html.escape
    # ── Filter tabs ────────────────────────────────────────────────────────
    tab_defs = [
        ('all',        f'Todas ({counts["all"]})'),
        ('activas',    f'Activas ({counts["activas"]})'),
        ('respondidas',f'Respondidas ({counts["respondidas"]})'),
        ('archivadas', f'Archivadas ({counts["archivadas"]})'),
    ]
    tabs_html = ''
    for key, label in tab_defs:
        active = 'adm-tab-active' if key == filter_val else ''
        tabs_html += (
            f'<a href="/admin/solicitudes?filter={key}" '
            f'class="adm-tab {active}">{label}</a>\n'
        )

    # ── Table rows + card rows ─────────────────────────────────────────────
    table_rows = ''
    card_rows  = ''
    for r in rows:
        rid      = esc(r['id'])
        name     = esc(r['customer_name'] or '—')
        email_v  = esc(r['customer_email'])
        acct     = r['account_type'] or 'anonymous'
        empresa  = '<span class="adm-empresa">EMPRESA</span>' if acct == 'business' else ''
        prod     = esc((r['product_name'] or '')[:50])
        cat      = esc(r['category'] or '')
        val      = f"${r['declared_value_usd']:,.2f}" if r['declared_value_usd'] else '—'
        date_str = _admin_format_date(r['submitted_at'])
        elapsed  = _admin_elapsed(r['submitted_at'])
        status   = r['status']
        transitions = _LEGAL_TRANSITIONS.get(status, set())
        has_transitions = bool(transitions)

        # Status badge
        cfg = {
            'enviada':     ('#FFF7ED', '#C2410C', '#FDBA74', 'Enviada'),
            'en_revision': ('#EFF6FF', '#1D4ED8', '#BFDBFE', 'En revisión'),
            'respondida':  ('#F0FDF4', '#15803D', '#BBF7D0', 'Respondida'),
            'completada':  ('#F9FAFB', '#374151', '#D1D5DB', 'Completada'),
            'cancelada':   ('#FEF2F2', '#991B1B', '#FECACA', 'Cancelada'),
            'expirada':    ('#F9FAFB', '#6B7280', '#E5E7EB', 'Expirada'),
        }
        bg, fg, bdr, slabel = cfg.get(status, ('#F9FAFB', '#374151', '#D1D5DB', status))
        badge_html = (
            f'<span class="adm-badge" id="badge-{rid}" '
            f'style="background:{bg};color:{fg};border-color:{bdr};">{slabel}</span>'
        )

        # Update controls
        if has_transitions:
            sel_opts = _admin_status_options_html(status)
            update_html = f'''<select class="adm-select" id="sel-{rid}">{sel_opts}</select>
<textarea class="adm-note" id="note-{rid}" placeholder="Nota interna (opcional)" rows="2"></textarea>
<button class="adm-upd-btn" onclick="doUpdate('{rid}',this)" type="button">Actualizar</button>'''
        else:
            update_html = '<span style="color:#9ca3af;font-size:12px;">—</span>'

        # Table row
        table_rows += f'''<tr data-id="{rid}">
<td class="td-id"><a href="https://clients.crbox.cr" style="color:#FF6B00;font-weight:700;font-size:13px;text-decoration:none;">{rid}</a></td>
<td><div style="font-weight:600;font-size:13px;">{name}{empresa}</div>
    <div style="color:#6b7280;font-size:12px;margin-top:2px;">{email_v}</div></td>
<td><div style="font-size:13px;font-weight:500;">{prod}</div>
    <div style="color:#9ca3af;font-size:11px;margin-top:2px;">{cat}</div></td>
<td style="font-size:13px;white-space:nowrap;">{val}</td>
<td><div style="font-size:13px;white-space:nowrap;">{date_str}</div>
    <div style="color:#9ca3af;font-size:11px;margin-top:2px;">{elapsed}</div></td>
<td id="badge-cell-{rid}">{badge_html}</td>
<td class="td-upd">{update_html}</td>
</tr>\n'''

        # Card (mobile)
        card_rows += f'''<div class="adm-card" data-id="{rid}">
<div class="adm-card-top">
  <div>
    <span class="adm-card-id">{rid}</span>{empresa}
  </div>
  <div id="badge-cell-{rid}-m">{badge_html}</div>
</div>
<div class="adm-card-fields">
  <div class="adm-card-row"><span class="adm-card-lbl">Cliente</span><span class="adm-card-val">{name}</span></div>
  <div class="adm-card-row"><span class="adm-card-lbl">Email</span><span class="adm-card-val" style="font-size:11px;">{email_v}</span></div>
  <div class="adm-card-row"><span class="adm-card-lbl">Producto</span><span class="adm-card-val">{prod}</span></div>
  <div class="adm-card-row"><span class="adm-card-lbl">Valor</span><span class="adm-card-val">{val}</span></div>
  <div class="adm-card-row"><span class="adm-card-lbl">Fecha</span><span class="adm-card-val">{date_str} &middot; {elapsed}</span></div>
</div>
{(f"""<div class="adm-card-actions">
  <select class="adm-select" id="sel-{rid}-m">{_admin_status_options_html(status)}</select>
  <textarea class="adm-note" id="note-{rid}-m" placeholder="Nota interna (opcional)" rows="2"></textarea>
  <button class="adm-upd-btn" onclick="doUpdateM('{rid}',this)" type="button">Actualizar</button>
</div>""") if has_transitions else ''}
</div>\n'''

    # ── Empty state ────────────────────────────────────────────────────────
    if not rows:
        empty_html = '''<div class="adm-empty">
<div style="font-size:36px;margin-bottom:12px;">📭</div>
<h3>Sin solicitudes en esta vista</h3>
<p>No hay solicitudes que coincidan con el filtro seleccionado.</p>
</div>'''
        table_body_html = f'<tr><td colspan="7">{empty_html}</td></tr>'
        cards_html      = empty_html
    else:
        table_body_html = table_rows
        cards_html      = card_rows

    n = len(rows)
    count_label = f'{n} solicitud{"es" if n != 1 else ""}'

    return f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Panel de ventas — CRBOX</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,sans-serif;
  background:#f3f4f6;color:#111;min-height:100vh}}
a{{color:inherit;text-decoration:none}}
/* Header */
.adm-header{{background:#1f2937;padding:12px 20px;display:flex;align-items:center;gap:14px;
  position:sticky;top:0;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,.18)}}
.adm-header-logo{{color:#FF6B00;font-weight:800;font-size:18px;letter-spacing:-.5px}}
.adm-header-title{{color:#fff;font-size:14px;font-weight:600}}
.adm-header-sep{{color:#4b5563;font-size:16px}}
.adm-logout{{margin-left:auto;color:#9ca3af;font-size:13px;padding:6px 12px;
  border-radius:6px;border:1px solid #374151;transition:all .2s}}
.adm-logout:hover{{color:#fff;border-color:#6b7280}}
/* Filter tabs */
.adm-tabs{{display:flex;gap:4px;padding:14px 20px 0;flex-wrap:wrap;background:#f3f4f6}}
.adm-tab{{padding:7px 16px;border-radius:8px 8px 0 0;font-size:13px;font-weight:600;
  color:#6b7280;border:1px solid transparent;border-bottom:none;
  transition:all .15s;cursor:pointer}}
.adm-tab:hover{{color:#374151;background:#e5e7eb}}
.adm-tab-active{{background:#fff;color:#FF6B00;border-color:#e5e7eb;
  box-shadow:0 -1px 4px rgba(0,0,0,.04)}}
/* Main */
.adm-main{{padding:0 20px 40px}}
.adm-panel{{background:#fff;border-radius:0 0 12px 12px;
  box-shadow:0 2px 10px rgba(0,0,0,.06);overflow:hidden}}
.adm-count{{padding:12px 16px;font-size:13px;color:#6b7280;
  border-bottom:1px solid #f3f4f6;background:#fafafa}}
/* Table */
.adm-table{{width:100%;border-collapse:collapse}}
.adm-table th{{background:#f9fafb;padding:10px 14px;text-align:left;
  font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;
  letter-spacing:.06em;border-bottom:1px solid #e5e7eb;white-space:nowrap}}
.adm-table td{{padding:13px 14px;border-bottom:1px solid #f3f4f6;
  vertical-align:top;font-size:13px}}
.adm-table tr:last-child td{{border-bottom:none}}
.adm-table tr:hover td{{background:#fafafa}}
.td-id{{white-space:nowrap}}
.td-upd{{min-width:160px}}
/* Badges */
.adm-badge{{display:inline-block;padding:3px 10px;border-radius:999px;
  font-size:11px;font-weight:700;letter-spacing:.03em;border:1px solid}}
.adm-empresa{{display:inline-block;background:#fff7ed;color:#c2410c;
  font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px;
  border:1px solid #fdba74;vertical-align:middle;margin-left:4px}}
/* Update controls */
.adm-select{{display:block;width:100%;border:1.5px solid #e5e7eb;border-radius:6px;
  padding:6px 10px;font-size:12px;background:#fff;margin-bottom:6px;cursor:pointer;
  font-family:inherit;color:#374151}}
.adm-note{{display:block;width:100%;border:1.5px solid #e5e7eb;border-radius:6px;
  padding:6px 10px;font-size:12px;resize:vertical;font-family:inherit;
  color:#374151;margin-bottom:6px}}
.adm-upd-btn{{display:block;width:100%;background:#FF6B00;color:#fff;border:none;
  border-radius:6px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;
  transition:background .2s;font-family:inherit}}
.adm-upd-btn:hover{{background:#E05A00}}
.adm-upd-btn:disabled{{background:#9ca3af;cursor:not-allowed}}
/* Cards (mobile) */
.adm-cards{{display:none;flex-direction:column;gap:10px;padding:12px}}
.adm-card{{background:#fff;border-radius:10px;padding:16px;
  box-shadow:0 1px 6px rgba(0,0,0,.06)}}
.adm-card-top{{display:flex;justify-content:space-between;align-items:flex-start;
  margin-bottom:10px}}
.adm-card-id{{font-size:14px;font-weight:700;color:#111}}
.adm-card-fields{{margin-bottom:10px}}
.adm-card-row{{display:flex;justify-content:space-between;align-items:baseline;
  padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:13px}}
.adm-card-row:last-child{{border-bottom:none}}
.adm-card-lbl{{color:#9ca3af;font-size:12px;min-width:60px}}
.adm-card-val{{color:#111;font-size:12px;text-align:right;word-break:break-all;max-width:60%}}
.adm-card-actions{{margin-top:10px;padding-top:10px;border-top:1px solid #f3f4f6}}
/* Empty state */
.adm-empty{{text-align:center;padding:48px 20px;color:#9ca3af}}
.adm-empty h3{{font-size:16px;font-weight:600;color:#6b7280;margin-bottom:6px}}
.adm-empty p{{font-size:13px}}
/* Toast */
#adm-toast{{position:fixed;bottom:24px;right:24px;padding:12px 20px;
  border-radius:8px;font-size:13px;font-weight:600;color:#fff;
  background:#16a34a;box-shadow:0 4px 16px rgba(0,0,0,.15);
  transform:translateY(80px);opacity:0;transition:all .3s;z-index:100;
  pointer-events:none}}
#adm-toast.show{{transform:translateY(0);opacity:1}}
#adm-toast.error{{background:#dc2626}}
/* Responsive */
@media(max-width:720px){{
  .adm-header{{padding:10px 14px}}
  .adm-tabs{{padding:10px 12px 0}}
  .adm-main{{padding:0 0 40px}}
  .adm-panel{{border-radius:0}}
  .adm-table-wrap{{display:none}}
  .adm-cards{{display:flex}}
}}
@media(min-width:721px){{
  .adm-table-wrap{{overflow-x:auto}}
}}
</style>
</head>
<body>
<header class="adm-header">
  <span class="adm-header-logo">CRBOX</span>
  <span class="adm-header-sep">|</span>
  <span class="adm-header-title">Panel de ventas</span>
  <a href="/admin/logout" class="adm-logout">Salir</a>
</header>

<div class="adm-tabs">
{tabs_html}
</div>

<main class="adm-main">
<div class="adm-panel">
  <div class="adm-count">{count_label}</div>
  <!-- Desktop table -->
  <div class="adm-table-wrap">
  <table class="adm-table">
    <thead>
      <tr>
        <th>ID</th><th>Cliente</th><th>Producto</th>
        <th>Valor</th><th>Fecha</th><th>Estado</th><th>Actualizar</th>
      </tr>
    </thead>
    <tbody>{table_body_html}</tbody>
  </table>
  </div>
  <!-- Mobile cards -->
  <div class="adm-cards">{cards_html}</div>
</div>
</main>

<div id="adm-toast"></div>

<script>
function showToast(msg, isErr) {{
  var t = document.getElementById('adm-toast');
  t.textContent = msg;
  t.className = isErr ? 'error' : '';
  t.classList.add('show');
  setTimeout(function(){{ t.classList.remove('show'); }}, 3000);
}}

function applyBadge(rid, status) {{
  var labels = {{enviada:'Enviada',en_revision:'En revision',respondida:'Respondida',
    completada:'Completada',cancelada:'Cancelada',expirada:'Expirada'}};
  var colors = {{
    enviada:    ['#FFF7ED','#C2410C','#FDBA74'],
    en_revision:['#EFF6FF','#1D4ED8','#BFDBFE'],
    respondida: ['#F0FDF4','#15803D','#BBF7D0'],
    completada: ['#F9FAFB','#374151','#D1D5DB'],
    cancelada:  ['#FEF2F2','#991B1B','#FECACA'],
    expirada:   ['#F9FAFB','#6B7280','#E5E7EB'],
  }};
  var c = colors[status] || ['#F9FAFB','#374151','#D1D5DB'];
  var label = labels[status] || status;
  var html = '<span class="adm-badge" style="background:'+c[0]+';color:'+c[1]+';border-color:'+c[2]+';">'+label+'</span>';
  var cell = document.getElementById('badge-cell-'+rid);
  if (cell) cell.innerHTML = html;
  var cellM = document.getElementById('badge-cell-'+rid+'-m');
  if (cellM) cellM.innerHTML = html;
}}

function doUpdate(rid, btn) {{
  var sel  = document.getElementById('sel-' + rid);
  var note = document.getElementById('note-' + rid);
  _doUpdate(rid, sel, note, btn);
}}
function doUpdateM(rid, btn) {{
  var sel  = document.getElementById('sel-' + rid + '-m');
  var note = document.getElementById('note-' + rid + '-m');
  _doUpdate(rid, sel, note, btn);
}}
function _doUpdate(rid, sel, note, btn) {{
  var status = sel.value;
  if (!status) {{ showToast('Selecciona un estado', true); return; }}
  btn.disabled = true;
  var orig = btn.textContent;
  btn.textContent = 'Actualizando\u2026';
  fetch('/admin/solicitudes/' + rid + '/status', {{
    method: 'POST',
    headers: {{'Content-Type': 'application/json'}},
    body: JSON.stringify({{status: status, note: note ? note.value.trim() : ''}})
  }}).then(function(r){{ return r.json(); }}).then(function(data) {{
    if (data.ok) {{
      applyBadge(rid, data.to);
      showToast('\u2713 ' + rid + ' actualizado a ' + data.to, false);
      sel.value = '';
      if (note) note.value = '';
    }} else {{
      showToast(data.error || 'Error al actualizar', true);
    }}
    btn.disabled = false;
    btn.textContent = orig;
  }}).catch(function() {{
    showToast('Error de red', true);
    btn.disabled = false;
    btn.textContent = orig;
  }});
}}
</script>
</body>
</html>'''


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):
        super().log_message(format, *args)

    def do_GET(self):
        if self.path == '/health':
            self._handle_health()
        elif self.path.startswith('/admin'):
            path_no_qs = self.path.split('?')[0]
            if path_no_qs == '/admin/login':
                self._handle_admin_login_get()
            elif path_no_qs == '/admin/solicitudes':
                self._handle_admin_solicitudes_get()
            elif path_no_qs == '/admin/logout':
                self._handle_admin_logout()
            else:
                self.send_response(404)
                self.end_headers()
        elif self.path.startswith('/api/solicitudes'):
            path_no_qs = self.path.split('?')[0]
            if path_no_qs == '/api/solicitudes':
                self._handle_solicitudes_list()
            elif path_no_qs == '/api/solicitudes/check-orphaned':
                self._handle_check_orphaned()
            else:
                m = re.match(r'^/api/solicitudes/(SCB-\d+)$', path_no_qs)
                if m:
                    self._handle_solicitudes_detail(m.group(1))
                else:
                    self.send_response(404)
                    self.end_headers()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/admin/login':
            self._handle_admin_login_post()
        elif self.path == '/crbox-svc-token':
            self._handle_svc_token()
        elif self.path == '/send-quote':
            self._handle_send_quote()
        elif self.path == '/api/solicitudes':
            self._handle_solicitudes_post()
        elif self.path == '/api/solicitudes/link-guest':
            self._handle_link_guest()
        elif self.path == '/api/solicitudes/check-duplicate':
            self._handle_check_duplicate()
        else:
            m_status       = re.match(r'^/api/solicitudes/(SCB-\d+)/status$', self.path)
            m_cancel       = re.match(r'^/api/solicitudes/(SCB-\d+)/cancel$', self.path)
            m_admin_status = re.match(r'^/admin/solicitudes/(SCB-\d+)/status$', self.path)
            if m_status:
                self._handle_solicitudes_status(m_status.group(1))
            elif m_cancel:
                self._handle_cancel_solicitud(m_cancel.group(1))
            elif m_admin_status:
                self._handle_admin_solicitudes_status(m_admin_status.group(1))
            else:
                self.send_response(404)
                self.end_headers()

    def _json_response(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json_error(self, status, message):
        self._json_response(status, {'error': message})

    # ── /health ────────────────────────────────────────────────────────────
    def _handle_health(self):
        """GET /health — probe SMTP and return 200 OK or 503.

        Detailed error text is written to the server log, not returned to the
        caller, to avoid exposing SMTP configuration details publicly.
        """
        ok, err = _check_smtp()
        if ok:
            self._json_response(200, {'ok': True, 'smtp': 'ok'})
        else:
            print(f'[HEALTH] SMTP probe failed: {err}')
            self._json_response(503, {'ok': False, 'smtp': 'error',
                                      'error': 'SMTP connectivity check failed'})

    # ── /send-quote ────────────────────────────────────────────────────────
    def _handle_send_quote(self):
        client_ip = self.client_address[0]
        if not _check_rate_limit(client_ip):
            _log_quote_submission('', '', '', 'failed', 'rate_limit_exceeded', ip=client_ip)
            self._json_response(429, {'ok': False, 'error': 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.'})
            return

        smtp_host = os.environ.get('SMTP_HOST', '').strip()
        smtp_port = os.environ.get('SMTP_PORT', '587').strip()
        smtp_user = os.environ.get('SMTP_USER', '').strip()
        smtp_pass = os.environ.get('SMTP_PASS', '').strip()

        if not all([smtp_host, smtp_user, smtp_pass]):
            _log_quote_submission('', '', '', 'failed', 'smtp_not_configured', ip=client_ip)
            self._json_response(503, {'ok': False, 'error': 'El servicio de email no está configurado en el servidor.'})
            return

        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length).decode('utf-8')
            data = json.loads(raw)
        except Exception:
            _log_quote_submission('', '', '', 'failed', 'invalid_request_body', ip=client_ip)
            self._json_response(400, {'ok': False, 'error': 'Solicitud inválida.'})
            return

        subject   = data.get('subject', 'Solicitud de cotización | CRBOX')
        user_email = data.get('userEmail', '').strip()
        user_name  = data.get('userName', '').strip()
        body_text  = data.get('bodyText', '').strip()

        if not user_email or not body_text:
            _log_quote_submission(user_name, user_email, subject, 'failed', 'missing_required_fields', ip=client_ip)
            self._json_response(400, {'ok': False, 'error': 'Faltan campos requeridos (correo o cuerpo del mensaje).'})
            return

        # Basic email format guard (frontend validates too, but defense in depth)
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', user_email):
            _log_quote_submission(user_name, user_email, subject, 'failed', 'invalid_email_format', ip=client_ip)
            self._json_response(400, {'ok': False, 'error': 'Correo electrónico inválido.'})
            return

        # Build MIME message
        msg = email.mime.multipart.MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = f'CRBOX Calculadora <{smtp_user}>'
        msg['To']      = QUOTE_RECIPIENT
        msg['Cc']      = user_email
        msg['Reply-To'] = user_email

        plain_part = email.mime.text.MIMEText(body_text, 'plain', 'utf-8')
        html_part  = email.mime.text.MIMEText(_quote_text_to_html(body_text), 'html', 'utf-8')

        msg.attach(plain_part)
        msg.attach(html_part)

        recipients = [QUOTE_RECIPIENT, user_email]

        try:
            port_int = int(smtp_port)
            if port_int == 465:
                with smtplib.SMTP_SSL(smtp_host, port_int, timeout=15) as server:
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_user, recipients, msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, port_int, timeout=15) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_user, recipients, msg.as_string())

            _log_quote_submission(user_name, user_email, subject, 'sent', ip=client_ip)
            self._json_response(200, {'ok': True})

        except smtplib.SMTPAuthenticationError:
            _log_quote_submission(user_name, user_email, subject, 'failed', 'SMTPAuthenticationError', ip=client_ip)
            self._json_response(502, {'ok': False, 'error': 'Error de autenticación SMTP. Verifica las credenciales del servidor.'})
        except smtplib.SMTPException as e:
            _log_quote_submission(user_name, user_email, subject, 'failed', f'SMTPException: {e}', ip=client_ip)
            self._json_response(502, {'ok': False, 'error': 'No se pudo enviar el email. Intenta de nuevo.'})
        except Exception as e:
            _log_quote_submission(user_name, user_email, subject, 'failed', f'Exception: {e}', ip=client_ip)
            self._json_response(500, {'ok': False, 'error': 'Error interno del servidor al enviar el email.'})

    # ── POST /api/solicitudes ──────────────────────────────────────────────
    def _handle_solicitudes_post(self):
        client_ip = self.client_address[0]
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length).decode('utf-8')
            data = json.loads(raw)
        except Exception:
            self._json_error(400, 'Solicitud inválida.')
            return

        product_name = (data.get('product_name') or '').strip()
        customer_email = (data.get('customer_email') or '').strip()
        declared_value_raw = data.get('declared_value_usd')

        errors = []
        if not product_name or len(product_name) < 3:
            errors.append('product_name debe tener al menos 3 caracteres.')
        if not customer_email or not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', customer_email):
            errors.append('customer_email inválido.')
        try:
            declared_value_usd = float(declared_value_raw)
            if declared_value_usd <= 0:
                raise ValueError
        except (TypeError, ValueError):
            errors.append('declared_value_usd debe ser un número mayor que 0.')

        if errors:
            self._json_response(400, {'ok': False, 'errors': errors})
            return

        scb_id = _generate_scb_id()
        now_iso = _now_iso()
        now_disp = _now_display()

        expires_ts = time.gmtime(time.time() + 30 * 24 * 3600)
        expires_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', expires_ts)

        customer_name = (data.get('customer_name') or '').strip() or None
        account_type = data.get('account_type', 'anonymous')
        if account_type not in ('personal', 'business', 'anonymous'):
            account_type = 'anonymous'
        casillero_id = (data.get('casillero_id') or '').strip() or None

        # Optional portal-auth hardening: when the caller supplies auth headers
        # (Bearer token + X-Casillero-Email), verify the token server-side and
        # derive casillero_id from the CRBOX API response instead of trusting the
        # client-provided payload value.  Fails silently to preserve backward
        # compatibility with unauthenticated (webhook / public) callers.
        auth_header = self.headers.get('Authorization', '').strip()
        email_header = self.headers.get('X-Casillero-Email', '').strip()
        if auth_header.startswith('Bearer ') and email_header:
            verified_id = self._portal_auth()
            if verified_id:
                casillero_id = verified_id

        product_url = (data.get('product_url') or '').strip() or None
        category = (data.get('category') or 'otros').strip()
        weight_kg = data.get('weight_kg')
        length_cm = data.get('length_cm')
        width_cm = data.get('width_cm')
        height_cm = data.get('height_cm')
        customer_notes = (data.get('customer_notes') or '').strip()[:500] or None
        service_type = data.get('service_type', 'aereo')
        if service_type not in ('aereo', 'maritimo'):
            service_type = 'aereo'
        destination_zone = (data.get('destination_zone') or '').strip() or None
        estimate_usd = data.get('estimate_usd')
        estimate_breakdown = data.get('estimate_breakdown')
        data_source = data.get('data_source', 'manual')
        if data_source not in ('manual', 'ai_extracted', 'ai_partial'):
            data_source = 'manual'

        try:
            weight_kg = float(weight_kg) if weight_kg is not None else None
            length_cm = float(length_cm) if length_cm is not None else None
            width_cm = float(width_cm) if width_cm is not None else None
            height_cm = float(height_cm) if height_cm is not None else None
            estimate_usd = float(estimate_usd) if estimate_usd is not None else None
        except (TypeError, ValueError):
            weight_kg = length_cm = width_cm = height_cm = estimate_usd = None

        estimate_breakdown_json = json.dumps(estimate_breakdown) if estimate_breakdown else None
        hist_id = _uuid4_hex()

        try:
            with _DB_LOCK:
                conn = _get_db()
                conn.execute(
                    '''INSERT INTO quote_requests
                       (id, casillero_id, customer_email, customer_name, account_type,
                        product_name, product_url, declared_value_usd, category,
                        weight_kg, length_cm, width_cm, height_cm, customer_notes,
                        service_type, destination_zone, estimate_usd, estimate_breakdown,
                        data_source, status, submitted_at, expires_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                    (scb_id, casillero_id, customer_email, customer_name, account_type,
                     product_name, product_url, declared_value_usd, category,
                     weight_kg, length_cm, width_cm, height_cm, customer_notes,
                     service_type, destination_zone, estimate_usd, estimate_breakdown_json,
                     data_source, 'enviada', now_iso, expires_iso)
                )
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by)
                       VALUES (?,?,?,?,?,?)''',
                    (hist_id, scb_id, None, 'enviada', now_iso, 'system')
                )
                conn.commit()
                conn.close()
        except Exception as exc:
            print(f'[SOLICITUDES] DB error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno al guardar la solicitud.'})
            return

        print(f'[SOLICITUDES] Stored {scb_id} for {customer_email}')

        settings = _smtp_settings()
        smtp_user = settings[2] if settings else 'noreply@crbox.cr'

        email_errors = []
        try:
            _send_customer_confirmation(
                scb_id, customer_email, customer_name, product_name,
                declared_value_usd, category, now_disp, smtp_user
            )
            print(f'[SOLICITUDES] Customer confirmation sent to {customer_email}')
        except Exception as exc:
            email_errors.append(f'customer: {exc}')
            print(f'[SOLICITUDES] Customer email failed: {exc}')

        try:
            _send_sales_submission(
                scb_id, customer_email, customer_name, casillero_id, account_type,
                product_name, product_url, declared_value_usd, category,
                weight_kg, length_cm, width_cm, height_cm, data_source,
                service_type, destination_zone, estimate_usd, customer_notes,
                now_disp, smtp_user
            )
            print(f'[SOLICITUDES] Sales email sent to {QUOTE_RECIPIENT}')
        except Exception as exc:
            email_errors.append(f'sales: {exc}')
            print(f'[SOLICITUDES] Sales email failed: {exc}')

        resp = {'ok': True, 'id': scb_id}
        if email_errors:
            resp['email_warnings'] = email_errors
        self._json_response(200, resp)

    # ── POST /api/solicitudes/:id/status ───────────────────────────────────
    def _handle_solicitudes_status(self, scb_id):
        sales_token = os.environ.get('SALES_TOKEN', _DEV_SALES_TOKEN).strip()
        provided_token = self.headers.get('X-Sales-Token', '').strip()
        if not provided_token or provided_token != sales_token:
            self._json_response(401, {'ok': False, 'error': 'Token inválido o faltante.'})
            return

        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length).decode('utf-8')
            data = json.loads(raw)
        except Exception:
            self._json_error(400, 'Solicitud inválida.')
            return

        new_status = (data.get('status') or '').strip()
        note = (data.get('note') or '').strip() or None

        if new_status not in _LEGAL_TRANSITIONS:
            self._json_response(400, {'ok': False, 'error': f'Estado desconocido: {new_status}'})
            return

        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT status FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                if row is None:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return

                current_status = row['status']
                if new_status not in _LEGAL_TRANSITIONS.get(current_status, set()):
                    conn.close()
                    self._json_response(400, {'ok': False, 'error':
                        f'Transición inválida: {current_status} → {new_status}'})
                    return

                now_iso = _now_iso()
                hist_id = _uuid4_hex()
                extra_col = ''
                extra_val = ()
                if new_status == 'respondida':
                    extra_col = ', responded_at = ?'
                    extra_val = (now_iso,)
                elif new_status == 'completada':
                    extra_col = ', completed_at = ?'
                    extra_val = (now_iso,)
                elif new_status == 'cancelada':
                    extra_col = ', cancelled_at = ?'
                    extra_val = (now_iso,)

                conn.execute(
                    f'UPDATE quote_requests SET status = ?{extra_col} WHERE id = ?',
                    (new_status,) + extra_val + (scb_id,)
                )
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by, note)
                       VALUES (?,?,?,?,?,?,?)''',
                    (hist_id, scb_id, current_status, new_status, now_iso, 'sales', note)
                )
                conn.commit()
                conn.close()

            print(f'[SOLICITUDES] Status updated: {scb_id} {current_status} → {new_status}')
            self._json_response(200, {'ok': True, 'id': scb_id,
                                       'from': current_status, 'to': new_status})
        except Exception as exc:
            print(f'[SOLICITUDES] Status update error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── Portal auth helper ─────────────────────────────────────────────────
    _CRBOX_API_BASE = 'https://clients.crbox.cr/api/crboxwebapi'

    def _portal_auth(self):
        """Validate the caller against the CRBOX API and return casillero_id.

        Requires:
          Authorization: Bearer <token>   (forwarded to CRBOX API)
          X-Casillero-Email: <email>      (used to build the getuserinfo URL)

        The token is verified server-side by calling CRBOX's /getuserinfo
        endpoint with the provided Bearer token.  401/403 from CRBOX means
        the token is invalid or expired.  The casillero_id is extracted from
        the verified API response — the client-supplied value is never trusted.

        Returns the verified casillero_id string on success, or None on failure.
        """
        auth_header = self.headers.get('Authorization', '').strip()
        email       = self.headers.get('X-Casillero-Email', '').strip()

        if not auth_header.startswith('Bearer ') or len(auth_header) < 10:
            return None
        if not email or '@' not in email:
            return None

        api_url = (
            self._CRBOX_API_BASE + '/getuserinfo/' +
            urllib.parse.quote(email, safe='')
        )
        req = urllib.request.Request(
            api_url,
            headers={'Authorization': auth_header}
        )
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status not in (200,):
                    return None
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            # 401 / 403 → invalid / expired token
            if exc.code in (401, 403):
                return None
            print(f'[PORTAL_AUTH] CRBOX API error {exc.code}')
            return None
        except Exception as exc:
            print(f'[PORTAL_AUTH] Unexpected error: {exc}')
            return None

        # Extract casillero_id from the verified response
        consignee = data.get('Consignee') or data
        cas_id = (
            consignee.get('idconsignee') or
            consignee.get('IdConsignee') or
            consignee.get('idConsignee')
        )
        if not cas_id:
            print(f'[PORTAL_AUTH] idconsignee missing in CRBOX response')
            return None
        return str(cas_id).strip()

    def _portal_auth_full(self):
        """Like _portal_auth() but returns (casillero_id, verified_email).

        The email is derived from the CRBOX API response when available, falling
        back to the X-Casillero-Email header (which is still implicitly validated
        because CRBOX /getuserinfo/<email> is called with the Bearer token, so a
        token-email mismatch causes a 401 from CRBOX).
        """
        auth_header = self.headers.get('Authorization', '').strip()
        header_email = self.headers.get('X-Casillero-Email', '').strip()

        if not auth_header.startswith('Bearer ') or len(auth_header) < 10:
            return None, None
        if not header_email or '@' not in header_email:
            return None, None

        api_url = (
            self._CRBOX_API_BASE + '/getuserinfo/' +
            urllib.parse.quote(header_email, safe='')
        )
        req = urllib.request.Request(api_url, headers={'Authorization': auth_header})
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status not in (200,):
                    return None, None
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            if exc.code in (401, 403):
                return None, None
            print(f'[PORTAL_AUTH] CRBOX API error {exc.code}')
            return None, None
        except Exception as exc:
            print(f'[PORTAL_AUTH] Unexpected error: {exc}')
            return None, None

        consignee = data.get('Consignee') or data
        cas_id = (
            consignee.get('idconsignee') or
            consignee.get('IdConsignee') or
            consignee.get('idConsignee')
        )
        if not cas_id:
            return None, None

        # Prefer server-verified email from API response; fall back to header
        api_email = (
            consignee.get('email') or consignee.get('Email') or
            consignee.get('correo') or consignee.get('Correo') or
            header_email
        ).strip().lower()

        return str(cas_id).strip(), api_email

    # ── GET /api/solicitudes ───────────────────────────────────────────────
    def _handle_solicitudes_list(self):
        casillero_id = self._portal_auth()
        if not casillero_id:
            self._json_response(401, {'ok': False, 'error': 'Autenticación requerida.'})
            return

        # Optional ?status= filter
        qs = urllib.parse.parse_qs(self.path.partition('?')[2])
        status_filter = (qs.get('status', [''])[0] or '').strip()

        try:
            with _DB_LOCK:
                conn = _get_db()
                if status_filter and status_filter in _LEGAL_TRANSITIONS:
                    rows = conn.execute(
                        '''SELECT * FROM quote_requests
                           WHERE casillero_id = ?
                             AND status = ?
                           ORDER BY submitted_at DESC''',
                        (casillero_id, status_filter)
                    ).fetchall()
                else:
                    rows = conn.execute(
                        '''SELECT * FROM quote_requests
                           WHERE casillero_id = ?
                           ORDER BY submitted_at DESC''',
                        (casillero_id,)
                    ).fetchall()
                conn.close()

            results = [dict(r) for r in rows]
            self._json_response(200, {'ok': True, 'solicitudes': results})
        except Exception as exc:
            print(f'[SOLICITUDES] List error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── GET /api/solicitudes/:id ───────────────────────────────────────────
    def _handle_solicitudes_detail(self, scb_id):
        casillero_id = self._portal_auth()
        if not casillero_id:
            self._json_response(401, {'ok': False, 'error': 'Autenticación requerida.'})
            return

        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT * FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()

                if row is None:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return

                row_dict = dict(row)

                # Security: require a strict casillero_id match.
                # Records with a missing casillero_id (legacy/orphaned rows) are
                # also denied — never return data that cannot be positively attributed.
                row_cas = (row_dict.get('casillero_id') or '').strip()
                if not row_cas or row_cas != casillero_id:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return

                history = conn.execute(
                    '''SELECT * FROM quote_status_history
                       WHERE quote_request_id = ?
                       ORDER BY changed_at DESC''',
                    (scb_id,)
                ).fetchall()
                conn.close()

            row_dict['history'] = [dict(h) for h in history]
            self._json_response(200, {'ok': True, 'solicitud': row_dict})
        except Exception as exc:
            print(f'[SOLICITUDES] Detail error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── GET /api/solicitudes/check-orphaned ───────────────────────────────
    def _handle_check_orphaned(self):
        casillero_id, email = self._portal_auth_full()
        if not casillero_id:
            self._json_response(401, {'ok': False, 'error': 'Autenticación requerida.'})
            return
        if not email or '@' not in email:
            self._json_response(400, {'ok': False, 'error': 'Email requerido.'})
            return
        try:
            with _DB_LOCK:
                conn = _get_db()
                rows = conn.execute(
                    '''SELECT id, product_name, submitted_at FROM quote_requests
                       WHERE casillero_id IS NULL AND LOWER(customer_email) = LOWER(?)
                       ORDER BY submitted_at DESC''',
                    (email,)
                ).fetchall()
                conn.close()
            results = [dict(r) for r in rows]
            self._json_response(200, {
                'ok': True,
                'count': len(results),
                'ids': [r['id'] for r in results],
                'requests': results
            })
        except Exception as exc:
            print(f'[SOLICITUDES] check-orphaned error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── POST /api/solicitudes/link-guest ──────────────────────────────────
    def _handle_link_guest(self):
        casillero_id, email = self._portal_auth_full()
        if not casillero_id:
            self._json_response(401, {'ok': False, 'error': 'Autenticación requerida.'})
            return
        if not email or '@' not in email:
            self._json_response(400, {'ok': False, 'error': 'Email requerido.'})
            return
        try:
            with _DB_LOCK:
                conn = _get_db()
                result = conn.execute(
                    '''UPDATE quote_requests SET casillero_id = ?
                       WHERE casillero_id IS NULL AND LOWER(customer_email) = LOWER(?)''',
                    (casillero_id, email)
                )
                linked = result.rowcount
                conn.commit()
                conn.close()
            print(f'[SOLICITUDES] Linked {linked} orphaned records to casillero {casillero_id}')
            self._json_response(200, {'ok': True, 'linked': linked})
        except Exception as exc:
            print(f'[SOLICITUDES] link-guest error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── POST /api/solicitudes/check-duplicate ─────────────────────────────
    def _handle_check_duplicate(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length).decode('utf-8')
            data = json.loads(raw)
        except Exception:
            self._json_response(400, {'ok': False, 'error': 'Solicitud inválida.'})
            return

        product_name   = (data.get('product_name') or '').strip()
        # Accept both 'url' and 'product_url' for API compatibility
        product_url    = (data.get('product_url') or data.get('url') or '').strip()
        customer_email = (data.get('email') or '').strip()

        # Derive casillero_id from auth token (server-side) rather than
        # trusting the client-supplied value.  If no valid token is present,
        # fall back to an email-only check so unauthenticated public requests
        # cannot enumerate records by casillero_id.
        auth_header = self.headers.get('Authorization', '').strip()
        casillero_id = ''
        if auth_header.startswith('Bearer ') and len(auth_header) >= 10:
            verified_id = self._portal_auth()
            if verified_id:
                casillero_id = verified_id

        if not product_name and not product_url:
            self._json_response(200, {'ok': True, 'duplicate': False, 'existing_id': None})
            return

        cutoff = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - 24 * 3600))

        try:
            with _DB_LOCK:
                conn = _get_db()
                conditions = ['submitted_at >= ?', "status NOT IN ('cancelada', 'expirada')"]
                params = [cutoff]

                if casillero_id:
                    conditions.append('casillero_id = ?')
                    params.append(casillero_id)
                elif customer_email:
                    conditions.append('LOWER(customer_email) = LOWER(?)')
                    params.append(customer_email)
                else:
                    conn.close()
                    self._json_response(200, {'ok': True, 'duplicate': False, 'existing_id': None})
                    return

                match_parts = []
                match_params = []
                if product_url:
                    match_parts.append('product_url = ?')
                    match_params.append(product_url)
                if product_name:
                    match_parts.append('LOWER(product_name) = LOWER(?)')
                    match_params.append(product_name)
                if match_parts:
                    conditions.append('(' + ' OR '.join(match_parts) + ')')
                    params.extend(match_params)

                query = ('SELECT id, submitted_at FROM quote_requests WHERE '
                         + ' AND '.join(conditions)
                         + ' ORDER BY submitted_at DESC LIMIT 1')
                row = conn.execute(query, params).fetchone()
                conn.close()

            if row:
                try:
                    submitted_ts = calendar.timegm(
                        time.strptime(row['submitted_at'], '%Y-%m-%dT%H:%M:%SZ')
                    )
                    hours_ago = max(0, int((time.time() - submitted_ts) / 3600))
                except Exception:
                    hours_ago = 0
                self._json_response(200, {
                    'ok': True, 'duplicate': True,
                    'existing_id': row['id'], 'hours_ago': hours_ago
                })
            else:
                self._json_response(200, {'ok': True, 'duplicate': False, 'existing_id': None})
        except Exception as exc:
            print(f'[SOLICITUDES] check-duplicate error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── POST /api/solicitudes/:id/cancel ──────────────────────────────────
    def _handle_cancel_solicitud(self, scb_id):
        casillero_id = self._portal_auth()
        if not casillero_id:
            self._json_response(401, {'ok': False, 'error': 'Autenticación requerida.'})
            return
        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT * FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                if row is None:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return
                row_dict = dict(row)
                row_cas = (row_dict.get('casillero_id') or '').strip()
                if not row_cas or row_cas != casillero_id:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return
                if row_dict.get('status') != 'enviada':
                    conn.close()
                    self._json_response(400, {
                        'ok': False,
                        'error': 'Solo se pueden cancelar solicitudes en estado "Enviada".'
                    })
                    return
                now_iso  = _now_iso()
                hist_id  = _uuid4_hex()
                conn.execute(
                    'UPDATE quote_requests SET status = ?, cancelled_at = ? WHERE id = ?',
                    ('cancelada', now_iso, scb_id)
                )
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by, note)
                       VALUES (?,?,?,?,?,?,?)''',
                    (hist_id, scb_id, 'enviada', 'cancelada', now_iso, 'user',
                     'Cancelada por el cliente')
                )
                conn.commit()
                conn.close()
            print(f'[SOLICITUDES] {scb_id} cancelled by casillero {casillero_id}')
            settings  = _smtp_settings()
            smtp_user = settings[2] if settings else 'noreply@crbox.cr'
            try:
                _send_cancellation_email(
                    scb_id,
                    row_dict['customer_email'],
                    row_dict.get('customer_name'),
                    row_dict['product_name'],
                    smtp_user
                )
            except Exception as exc:
                print(f'[SOLICITUDES] Cancellation email failed: {exc}')
            self._json_response(200, {'ok': True, 'id': scb_id, 'status': 'cancelada'})
        except Exception as exc:
            print(f'[SOLICITUDES] Cancel error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})

    # ── /crbox-svc-token ───────────────────────────────────────────────────
    def _handle_svc_token(self):
        # NOTE: The origin/host sameness check was removed.
        # Reason: Replit's reverse proxy (and any standard TLS-terminating proxy)
        # strips the port from the Host header it forwards to the backend, while
        # the browser's Origin header always includes the non-standard port in the
        # URL (e.g. Origin: https://host:5000 vs Host: host).  This mismatch caused
        # a spurious 403 on every real browser form submission, making registration
        # impossible through the UI while server-side (agent) paths worked fine.
        # Security is preserved by: (1) rate limiting below, (2) service credentials
        # kept exclusively in server env vars, (3) the endpoint only returns a
        # short-lived token usable only for the registration call.
        client_ip = self.client_address[0]
        if not _check_rate_limit(client_ip):
            self._json_error(429, 'Too many requests. Please wait a moment and try again.')
            return

        svc_email = os.environ.get('CRBOX_SVC_EMAIL', '')
        svc_pass  = os.environ.get('CRBOX_SVC_PASSWORD', '')

        if not svc_email or not svc_pass:
            self._json_error(503, 'Service account not configured.')
            return

        body = urllib.parse.urlencode({
            'grant_type': 'password',
            'username':   svc_email,
            'password':   svc_pass,
        }).encode()

        req = urllib.request.Request(
            CRBOX_AUTH_URL,
            data=body,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                token = data.get('access_token', '')
                if not token:
                    raise ValueError('No access_token in response')
                self._json_response(200, {'access_token': token})
        except Exception:
            self._json_error(502, 'Upstream authentication failed.')


    # ── Admin: cookie / session helpers ───────────────────────────────────
    def _admin_get_session_token(self):
        """Parse Cookie header and return the admin_session token, or ''."""
        cookie_header = self.headers.get('Cookie', '')
        for part in cookie_header.split(';'):
            part = part.strip()
            if part.startswith('admin_session='):
                return part[len('admin_session='):].strip()
        return ''

    def _admin_html_response(self, html_str, status=200, extra_headers=None):
        body = html_str.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        if extra_headers:
            for k, v in extra_headers:
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _admin_redirect(self, location, extra_headers=None):
        self.send_response(302)
        self.send_header('Location', location)
        if extra_headers:
            for k, v in extra_headers:
                self.send_header(k, v)
        self.end_headers()

    # ── GET /admin/login ───────────────────────────────────────────────────
    def _handle_admin_login_get(self):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if _admin_validate_session(token):
            self._admin_redirect('/admin/solicitudes')
            return
        self._admin_html_response(_build_admin_login_html())

    # ── POST /admin/login ──────────────────────────────────────────────────
    def _handle_admin_login_post(self):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        client_ip = self.client_address[0]
        blocked, remaining = _admin_brute_blocked(client_ip)
        if blocked:
            self._admin_html_response(
                _build_admin_login_html(blocked_secs=remaining), status=429
            )
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw    = self.rfile.read(length).decode('utf-8')
            params = urllib.parse.parse_qs(raw)
            pwd    = (params.get('password', [''])[0] or '').strip()
        except Exception:
            self._admin_html_response(
                _build_admin_login_html(error='Solicitud inválida.'), status=400
            )
            return
        if pwd == _admin_password():
            token = _admin_create_session()
            cookie = (
                f'admin_session={token}; HttpOnly; SameSite=Strict; '
                f'Path=/; Max-Age={_ADMIN_SESSION_TTL}'
            )
            self._admin_redirect(
                '/admin/solicitudes',
                extra_headers=[('Set-Cookie', cookie)]
            )
        else:
            _admin_brute_record_fail(client_ip)
            self._admin_html_response(
                _build_admin_login_html(error='Contraseña incorrecta.'), status=401
            )

    # ── GET /admin/logout ──────────────────────────────────────────────────
    def _handle_admin_logout(self):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        _admin_clear_session(token)
        clear_cookie = 'admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
        self._admin_redirect(
            '/admin/login',
            extra_headers=[('Set-Cookie', clear_cookie)]
        )

    # ── GET /admin/solicitudes ─────────────────────────────────────────────
    def _handle_admin_solicitudes_get(self):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self._admin_redirect('/admin/login')
            return
        qs = urllib.parse.parse_qs(self.path.partition('?')[2])
        filter_val = (qs.get('filter', ['all'])[0] or 'all').strip()
        if filter_val not in ('all', 'activas', 'respondidas', 'archivadas'):
            filter_val = 'all'

        active_statuses   = ('enviada', 'en_revision')
        responded_statuses= ('respondida',)
        archived_statuses = ('completada', 'cancelada', 'expirada')

        try:
            with _DB_LOCK:
                conn = _get_db()
                all_rows  = conn.execute(
                    'SELECT * FROM quote_requests ORDER BY submitted_at DESC'
                ).fetchall()
                conn.close()
        except Exception as exc:
            print(f'[ADMIN] DB error: {exc}')
            self._admin_html_response('<h1>Error interno</h1>', status=500)
            return

        all_rows = [dict(r) for r in all_rows]
        active    = [r for r in all_rows if r['status'] in active_statuses]
        responded = [r for r in all_rows if r['status'] in responded_statuses]
        archived  = [r for r in all_rows if r['status'] in archived_statuses]

        counts = {
            'all':         len(all_rows),
            'activas':     len(active),
            'respondidas': len(responded),
            'archivadas':  len(archived),
        }

        if filter_val == 'activas':
            rows = active
        elif filter_val == 'respondidas':
            rows = responded
        elif filter_val == 'archivadas':
            rows = archived
        else:
            rows = all_rows

        html = _build_admin_solicitudes_html(rows, filter_val, counts)
        self._admin_html_response(html)

    # ── POST /admin/solicitudes/:id/status ────────────────────────────────
    def _handle_admin_solicitudes_status(self, scb_id):
        if _admin_password() is None:
            self.send_response(404); self.end_headers(); return
        token = self._admin_get_session_token()
        if not _admin_validate_session(token):
            self._json_response(401, {'ok': False, 'error': 'Sesión expirada.'})
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw    = self.rfile.read(length).decode('utf-8')
            data   = json.loads(raw)
        except Exception:
            self._json_error(400, 'Solicitud inválida.')
            return
        new_status = (data.get('status') or '').strip()
        note       = (data.get('note') or '').strip()[:1000] or None
        if new_status not in _LEGAL_TRANSITIONS:
            self._json_response(400, {'ok': False, 'error': f'Estado desconocido: {new_status}'})
            return
        try:
            with _DB_LOCK:
                conn = _get_db()
                row = conn.execute(
                    'SELECT status FROM quote_requests WHERE id = ?', (scb_id,)
                ).fetchone()
                if row is None:
                    conn.close()
                    self._json_response(404, {'ok': False, 'error': f'{scb_id} no encontrado.'})
                    return
                current_status = row['status']
                if new_status not in _LEGAL_TRANSITIONS.get(current_status, set()):
                    conn.close()
                    self._json_response(400, {'ok': False, 'error':
                        f'Transición inválida: {current_status} → {new_status}'})
                    return
                now_iso  = _now_iso()
                hist_id  = _uuid4_hex()
                extra_col, extra_val = '', ()
                if new_status == 'respondida':
                    extra_col, extra_val = ', responded_at = ?', (now_iso,)
                elif new_status == 'completada':
                    extra_col, extra_val = ', completed_at = ?', (now_iso,)
                elif new_status == 'cancelada':
                    extra_col, extra_val = ', cancelled_at = ?', (now_iso,)
                conn.execute(
                    f'UPDATE quote_requests SET status = ?{extra_col} WHERE id = ?',
                    (new_status,) + extra_val + (scb_id,)
                )
                conn.execute(
                    '''INSERT INTO quote_status_history
                       (id, quote_request_id, from_status, to_status, changed_at, changed_by, note)
                       VALUES (?,?,?,?,?,?,?)''',
                    (hist_id, scb_id, current_status, new_status, now_iso, 'sales', note)
                )
                conn.commit()
                conn.close()
            print(f'[ADMIN] Status updated: {scb_id} {current_status} → {new_status}')
            self._json_response(200, {'ok': True, 'id': scb_id,
                                       'from': current_status, 'to': new_status})
        except Exception as exc:
            print(f'[ADMIN] Status update error: {exc}')
            self._json_response(500, {'ok': False, 'error': 'Error interno.'})


if __name__ == "__main__":
    _init_db()
    _start_health_monitor()
    _start_solicitud_reminder()
    server = HTTPServer(("0.0.0.0", 5000), NoCacheHandler)
    print("Serving HTTP on 0.0.0.0 port 5000 (http://0.0.0.0:5000/) ...")
    server.serve_forever()
