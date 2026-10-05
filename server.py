"""Selfie booth server: serves the iPad page and prints what it sends.

    .venv/bin/python server.py

Then open the printed http address on the iPad. It redirects to https, which
Safari needs before it allows live camera access. The certificate is
self-signed, so the first visit shows a warning: Show Details, then visit this
website.
"""

import io
import json
import mimetypes
import socket
import ssl
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image

from printer import Printer, PrinterNotFound, label

HTTP_PORT, HTTPS_PORT = 8000, 8443
ROOT = Path(__file__).parent
STATIC = ROOT / "static"
MAX_UPLOAD = 20 * 1024 * 1024

printer = Printer()


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # no packets sent; just picks the Wi-Fi interface
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def certificate(ip):
    """A self-signed certificate for this IP, made once and reused."""
    cert, key = ROOT / "certs" / f"{ip}.crt", ROOT / "certs" / f"{ip}.key"
    if not cert.exists():
        cert.parent.mkdir(exist_ok=True)
        subprocess.run(
            ["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "825",
             "-keyout", str(key), "-out", str(cert), "-subj", "/CN=Selfie Booth",
             "-addext", f"subjectAltName=IP:{ip},DNS:localhost,DNS:{socket.gethostname()}",
             "-addext", "extendedKeyUsage=serverAuth"],
            check=True, capture_output=True,
        )
    return cert, key


class Booth(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        if "/status" not in self.path and "/log" not in self.path:
            super().log_message(fmt, *args)

    def reply(self, code, body=b"", kind="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/status":
            return self.reply(200, json.dumps({"printer": printer.connected()}).encode())
        name = "index.html" if self.path in ("/", "") else self.path.split("?")[0].lstrip("/")
        path = (STATIC / name).resolve()
        if not path.is_relative_to(STATIC.resolve()) or not path.is_file():
            return self.reply(404, b"not found", "text/plain")
        kind = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        if kind.startswith("text/") or kind.endswith("javascript"):
            kind += "; charset=utf-8"
        self.reply(200, path.read_bytes(), kind)

    def do_POST(self):
        if self.path == "/log":  # the iPad page reports its steps and errors here
            size = min(int(self.headers.get("Content-Length", 0)), 4096)
            print("ipad:", self.rfile.read(size).decode(errors="replace"))
            return self.reply(204)
        if self.path != "/print":
            return self.reply(404)
        size = int(self.headers.get("Content-Length", 0))
        if not 0 < size <= MAX_UPLOAD:
            return self.reply(413, b'{"error":"photo too large"}')
        try:
            img = Image.open(io.BytesIO(self.rfile.read(size)))
            # The page sends a finished, already dithered label: print it dot for dot.
            printer.send(label(img, dither=False))
            self.reply(200, b'{"ok":true}')
        except PrinterNotFound as e:
            self.reply(503, json.dumps({"error": str(e)}).encode())
        except Exception as e:
            print("print failed:", repr(e))
            self.reply(500, json.dumps({"error": "print failed"}).encode())


class Redirect(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        host = self.headers.get("Host", lan_ip()).split(":")[0]
        self.send_response(301)
        self.send_header("Location", f"https://{host}:{HTTPS_PORT}/")
        self.end_headers()

    do_HEAD = do_GET


def main():
    ip = lan_ip()
    cert, key = certificate(ip)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(cert, key)

    https = ThreadingHTTPServer(("0.0.0.0", HTTPS_PORT), Booth)
    https.socket = ctx.wrap_socket(https.socket, server_side=True)
    http = ThreadingHTTPServer(("0.0.0.0", HTTP_PORT), Redirect)
    threading.Thread(target=http.serve_forever, daemon=True).start()

    print(f"Selfie booth ready. On the iPad, open http://{ip}:{HTTP_PORT}")
    print("Printer:", "connected" if printer.connected() else "NOT FOUND (plug it in and switch it on)")
    https.serve_forever()


if __name__ == "__main__":
    main()
