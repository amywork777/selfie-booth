"""Selfie booth server: serves the iPad page and prints what it sends.

    .venv/bin/python server.py

The booth runs on https (Safari needs it for live camera), using a certificate
from a small certificate authority this server makes for itself. Each iPad
trusts that authority once, from the setup page on plain http, and then the
booth opens with no warning on any network, at https://<this computer>.local:8443.
"""

import io
import json
import mimetypes
import socket
import ssl
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image

from printer import Printer, PrinterNotFound, label

HTTP_PORT, HTTPS_PORT = 8000, 8443
ROOT = Path(__file__).parent
STATIC = ROOT / "static"
MAX_UPLOAD = 20 * 1024 * 1024
CERTS = ROOT / "certs"
CA_CERT, CA_KEY = CERTS / "booth-ca.crt", CERTS / "booth-ca.key"
BOOTH_NAME = "selfie-booth.local"  # announced on the network, so the address never changes

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


def local_name():
    """This computer's Bonjour name, which iPads on the same network can reach: e.g. booth.local."""
    if sys.platform == "darwin":
        name = subprocess.run(["scutil", "--get", "LocalHostName"], capture_output=True, text=True).stdout.strip()
    else:
        name = socket.gethostname().split(".")[0]
    return f"{name or 'localhost'}.local"


def announce(ip):
    """Announce selfie-booth.local on this network (Bonjour), pointing at this computer.

    Returns the process doing it, or None if this system can't, in which case the
    computer's own .local name still works.
    """
    if sys.platform == "darwin":
        cmd = ["dns-sd", "-P", "Selfie Booth", "_https._tcp", "local", str(HTTPS_PORT), BOOTH_NAME, ip]
    else:
        cmd = ["avahi-publish", "-a", "-R", BOOTH_NAME, ip]
    try:
        return subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except FileNotFoundError:
        return None


def openssl(*args):
    subprocess.run(["openssl", *args], check=True, capture_output=True)


def certificate(names, ip):
    """A certificate for this name and IP, signed by the booth's own authority (made once, kept forever).

    The authority never changes, so an iPad that trusted it once keeps trusting new certificates when
    the IP changes on another network.
    """
    CERTS.mkdir(exist_ok=True)
    if not CA_CERT.exists():
        openssl("req", "-x509", "-new", "-nodes", "-newkey", "rsa:2048", "-days", "3650",
                "-keyout", str(CA_KEY), "-out", str(CA_CERT), "-subj", "/CN=Selfie Booth",
                "-addext", "basicConstraints=critical,CA:TRUE",
                "-addext", "keyUsage=critical,keyCertSign,cRLSign")
    cert, key = CERTS / f"{names[-1]}-{ip}.crt", CERTS / f"{names[-1]}-{ip}.key"
    if not cert.exists():
        with tempfile.TemporaryDirectory() as tmp:
            csr, ext = Path(tmp) / "req.csr", Path(tmp) / "ext.cnf"
            # iPadOS only accepts server certificates valid for 825 days or less, with these extensions.
            ext.write_text(
                f"subjectAltName={','.join(f'DNS:{n}' for n in names)},DNS:localhost,IP:{ip},IP:127.0.0.1\n"
                "extendedKeyUsage=serverAuth\nbasicConstraints=CA:FALSE\n"
                "keyUsage=critical,digitalSignature,keyEncipherment\n"
            )
            openssl("req", "-new", "-nodes", "-newkey", "rsa:2048", "-keyout", str(key),
                    "-out", str(csr), "-subj", f"/CN={names[0]}")
            openssl("x509", "-req", "-in", str(csr), "-CA", str(CA_CERT), "-CAkey", str(CA_KEY),
                    "-CAcreateserial", "-out", str(cert), "-days", "825", "-sha256", "-extfile", str(ext))
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


SETUP_PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Set up the selfie booth</title>
<style>
  body {{ margin: 0; padding: 40px 28px; background: #fff3b0; color: #3a2a47;
         font: 500 20px/1.4 "Helvetica Neue", Helvetica, Arial, sans-serif; }}
  main {{ max-width: 620px; margin: 0 auto; }}
  h1 {{ font-size: 40px; margin: 0 0 8px; }}
  ol {{ padding-left: 24px; }} li {{ margin: 12px 0; }}
  a.btn {{ display: inline-block; margin: 8px 0 24px; padding: 20px 32px; border: 3px solid #3a2a47;
          border-radius: 22px; background: #ff6fa3; color: #3a2a47; font-weight: 700; text-decoration: none;
          box-shadow: 0 6px 0 #3a2a47; }}
  a.ghost {{ background: #fff8d6; }}
  code {{ font-size: 18px; }}
</style></head><body><main>
<h1>Selfie booth</h1>
<a class="btn" href="https://{name}:{port}/">Open the booth</a>
<h2>First time on this iPad?</h2>
<p>Do this once so the booth opens without a warning, on any Wi-Fi.</p>
<ol>
  <li><a class="btn ghost" href="/booth-ca.crt">Download the booth certificate</a><br>Tap Allow.</li>
  <li>Open Settings, tap <b>Profile Downloaded</b> near the top, then Install.</li>
  <li>In Settings, go to General, About, Certificate Trust Settings, and turn on <b>Selfie Booth</b>.</li>
  <li>Come back here and tap Open the booth. Then Share, Add to Home Screen, for one-tap opening.</li>
</ol>
<p>Booth address: <code>https://{name}:{port}</code></p>
</main></body></html>"""


class Setup(BaseHTTPRequestHandler):
    """Plain http: the setup page and the authority certificate. Everything else lives on https."""

    name = "localhost"

    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path == "/booth-ca.crt":
            body, kind = CA_CERT.read_bytes(), "application/x-x509-ca-cert"
        else:
            body, kind = SETUP_PAGE.format(name=self.name, port=HTTPS_PORT).encode(), "text/html; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    do_HEAD = do_GET


def main():
    ip, own = lan_ip(), local_name()
    announcer = announce(ip)
    name = BOOTH_NAME if announcer else own
    cert, key = certificate([BOOTH_NAME, own], ip)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(cert, key)

    https = ThreadingHTTPServer(("0.0.0.0", HTTPS_PORT), Booth)
    https.socket = ctx.wrap_socket(https.socket, server_side=True)
    Setup.name = name
    http = ThreadingHTTPServer(("0.0.0.0", HTTP_PORT), Setup)
    threading.Thread(target=http.serve_forever, daemon=True).start()

    print(f"Selfie booth ready at https://{name}:{HTTPS_PORT}")
    print(f"First time on an iPad? Open http://{name}:{HTTP_PORT} for the one-time setup.")
    print(f"(If that name doesn't work, use https://{own}:{HTTPS_PORT} or the IP, {ip})")
    print("Printer:", "connected" if printer.connected() else "NOT FOUND (plug it in and switch it on)")
    try:
        https.serve_forever()
    finally:
        if announcer:
            announcer.terminate()


if __name__ == "__main__":
    main()
