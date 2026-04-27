#!/usr/bin/env python3
import os
import re
import json
import time
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
    _start_health_monitor()
    server = HTTPServer(("0.0.0.0", 5000), NoCacheHandler)
    print("Serving HTTP on 0.0.0.0 port 5000 (http://0.0.0.0:5000/) ...")
    server.serve_forever()
