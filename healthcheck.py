#!/usr/bin/env python3
"""Standalone SMTP health-check for the CRBOX quote form.

Usage:
  python3 healthcheck.py

Exits 0 if SMTP is healthy, 1 if it fails.
Sends an alert email to ALERT_EMAIL (default: ventas@crbox.cr) on failure.

Intended for manual verification or a cron job, e.g.:
  */5 * * * * /usr/bin/python3 /path/to/healthcheck.py >> /var/log/crbox-health.log 2>&1

Required env vars (same as server.py):
  SMTP_HOST   e.g. smtp.gmail.com
  SMTP_PORT   default 587
  SMTP_USER   e.g. ventas@crbox.cr
  SMTP_PASS   Google Workspace App Password

Optional:
  ALERT_EMAIL   who receives the alert (default: ventas@crbox.cr)
"""
import os
import sys
import smtplib
import html as _html
import email.mime.multipart
import email.mime.text

QUOTE_RECIPIENT = 'ventas@crbox.cr'


def smtp_settings():
    host = os.environ.get('SMTP_HOST', '').strip()
    port = os.environ.get('SMTP_PORT', '587').strip()
    user = os.environ.get('SMTP_USER', '').strip()
    pwd  = os.environ.get('SMTP_PASS', '').strip()
    if not all([host, user, pwd]):
        return None
    return host, port, user, pwd


def check_smtp():
    """Return (ok, error_message)."""
    settings = smtp_settings()
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


def send_alert(error_msg: str):
    settings = smtp_settings()
    alert_to = os.environ.get('ALERT_EMAIL', QUOTE_RECIPIENT).strip()

    if settings is None:
        print(f'[ALERT] Cannot send alert — SMTP not configured. Error: {error_msg}')
        return

    host, port_str, user, pwd = settings

    msg = email.mime.multipart.MIMEMultipart('alternative')
    msg['Subject'] = '[CRBOX] ALERTA: El formulario de cotización dejó de enviar emails'
    msg['From']    = f'CRBOX Monitor <{user}>'
    msg['To']      = alert_to

    plain = (
        'ALERTA DE SISTEMA — CRBOX\n\n'
        'El endpoint /send-quote no puede conectarse al servidor SMTP.\n'
        'Los clientes que envíen cotizaciones no recibirán respuesta.\n\n'
        f'Error detectado:\n{error_msg}\n\n'
        'Acciones recomendadas:\n'
        '  1. Verificar que el App Password de Google Workspace siga activo.\n'
        '  2. Confirmar las variables de entorno SMTP_HOST / SMTP_USER / SMTP_PASS.\n'
        '  3. Generar un nuevo App Password en:\n'
        '     myaccount.google.com → Seguridad → Contraseñas de aplicaciones\n\n'
        '— Healthcheck manual de CRBOX'
    )

    html_body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        'color:#1a1a1a;max-width:600px;margin:0 auto;">'
        '<div style="background:linear-gradient(135deg,#DC2626,#EF4444);'
        'padding:20px 24px;border-radius:8px 8px 0 0;">'
        '<p style="color:#fff;font-size:20px;font-weight:700;margin:0;">&#x26A0; Alerta de sistema</p>'
        '<p style="color:rgba(255,255,255,.85);font-size:13px;margin:4px 0 0;">'
        'CRBOX &middot; Healthcheck manual</p>'
        '</div>'
        '<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;'
        'padding:24px;border-radius:0 0 8px 8px;">'
        '<p style="font-size:15px;font-weight:600;color:#DC2626;">'
        'El servidor SMTP no responde correctamente.</p>'
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
        print(f'[ALERT] Alert sent to {alert_to}')
    except Exception as exc:
        print(f'[ALERT] Could not deliver alert email: {exc}')


if __name__ == '__main__':
    ok, err = check_smtp()
    if ok:
        print('SMTP OK')
        sys.exit(0)
    else:
        print(f'SMTP FAIL: {err}')
        send_alert(err)
        sys.exit(1)
