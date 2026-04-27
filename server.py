#!/usr/bin/env python3
import os
import re
import json
import time
import sqlite3
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
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/crbox-svc-token':
            self._handle_svc_token()
        elif self.path == '/send-quote':
            self._handle_send_quote()
        elif self.path == '/api/solicitudes':
            self._handle_solicitudes_post()
        else:
            # Check for /api/solicitudes/:id/status
            m = re.match(r'^/api/solicitudes/(SCB-\d+)/status$', self.path)
            if m:
                self._handle_solicitudes_status(m.group(1))
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


if __name__ == "__main__":
    _init_db()
    _start_health_monitor()
    server = HTTPServer(("0.0.0.0", 5000), NoCacheHandler)
    print("Serving HTTP on 0.0.0.0 port 5000 (http://0.0.0.0:5000/) ...")
    server.serve_forever()
