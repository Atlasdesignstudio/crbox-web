#!/usr/bin/env python3
import urllib.request
import urllib.error
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Backend API endpoints proxied to avoid browser-context CORS uncertainty.
# The Postman collection confirmed Access-Control-Allow-Origin: https://crbox.cr
# on OPTIONS preflights, but browser CORS policy differs from Postman, so
# same-origin proxy is the safe default for this static server.
PROXY_ROUTES = {
    '/api/auth/login':    'https://clients.crbox.cr/authtoken',
    '/api/auth/register': 'https://test.clients.crbox.cr/api/crboxwebapi/postregisteruser',
    '/api/auth/update':   'https://test.clients.crbox.cr/api/crboxwebapi/postedituser',
}


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):
        super().log_message(format, *args)

    def do_POST(self):
        target = PROXY_ROUTES.get(self.path)
        if target is None:
            self.send_error(404, "Not found")
            return

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b''

        req = urllib.request.Request(
            target,
            data=body,
            method='POST',
            headers={
                'Content-Type':   self.headers.get('Content-Type', 'application/x-www-form-urlencoded'),
                'Content-Length': str(len(body)),
                'Accept':         'application/json',
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                status  = resp.status
                payload = resp.read()
                ctype   = resp.headers.get('Content-Type', 'application/json')
        except urllib.error.HTTPError as e:
            status  = e.code
            payload = e.read()
            ctype   = e.headers.get('Content-Type', 'application/json')
        except urllib.error.URLError as e:
            self.send_error(502, "Backend unreachable: " + str(e.reason))
            return

        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 5000), NoCacheHandler)
    print("Serving HTTP on 0.0.0.0 port 5000 (http://0.0.0.0:5000/) ...")
    server.serve_forever()
