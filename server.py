#!/usr/bin/env python3
from http.server import HTTPServer, SimpleHTTPRequestHandler

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):
        super().log_message(format, *args)

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 5000), NoCacheHandler)
    print("Serving HTTP on 0.0.0.0 port 5000 (http://0.0.0.0:5000/) ...")
    server.serve_forever()
