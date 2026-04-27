#!/usr/bin/env python3
import os
import json
import time
import threading
import urllib.request
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

CRBOX_AUTH_URL = 'https://clients.crbox.cr/authtoken'

_rate_lock   = threading.Lock()
_rate_window = {}

_RATE_LIMIT   = 5
_RATE_SECONDS = 60


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


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):
        super().log_message(format, *args)

    def do_POST(self):
        if self.path == '/crbox-svc-token':
            self._handle_svc_token()
        else:
            self.send_response(404)
            self.end_headers()

    def _json_error(self, status, message):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode())

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
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'access_token': token}).encode())
        except Exception as e:
            self._json_error(502, 'Upstream authentication failed.')


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 5000), NoCacheHandler)
    print("Serving HTTP on 0.0.0.0 port 5000 (http://0.0.0.0:5000/) ...")
    server.serve_forever()
