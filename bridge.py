"""Act like a network printer: take whatever arrives on port 9100 and push it to the Rollo.

Not used by the booth page (that goes through server.py); handy for sending
raw TSPL files from anywhere: nc <host> 9100 < label.tspl
"""

import socket

from printer import Printer

printer = Printer()
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("0.0.0.0", 9100))
s.listen(1)
print("listening on 9100")
while True:
    conn, addr = s.accept()
    data = b""
    while chunk := conn.recv(65536):
        data += chunk
    conn.close()
    print(f"{addr[0]}: {len(data)} bytes")
    printer.send(data)
