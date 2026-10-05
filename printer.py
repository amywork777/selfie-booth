"""Raw TSPL over USB for the Rollo X1038 (shows up as VID 0x09C5, PID 0x0588, "Printer").

No driver needed: bytes go straight to the printer's USB endpoint. The same
code runs on the Mac and on the Pi.
"""

import sys
import threading

import usb.backend.libusb1
import usb.core
import usb.util
from PIL import Image, ImageOps

VID, PID = 0x09C5, 0x0588
W, H = 808, 1218  # 4x6 at 203 dpi; width must be a multiple of 8 or rows skew
GAP = "0.12,0"  # label stock; use "0,0" for continuous paper
INVERT = False  # TSPL prints 0 bits as black, same as PIL's "1" mode; flip if prints come out negative


def _backend():
    # Homebrew's libusb on the Mac; the system one on the Pi.
    return usb.backend.libusb1.get_backend(
        find_library=lambda _: "/opt/homebrew/lib/libusb-1.0.dylib"
    ) if sys.platform == "darwin" else None


class PrinterNotFound(Exception):
    pass


class Printer:
    """Opens the printer on first use and reopens it after an unplug."""

    def __init__(self):
        self._out = None
        self._lock = threading.Lock()

    def _connect(self):
        dev = usb.core.find(idVendor=VID, idProduct=PID, backend=_backend())
        if dev is None:
            raise PrinterNotFound("printer not found: is it plugged in and switched on?")
        if sys.platform != "darwin" and dev.is_kernel_driver_active(0):
            dev.detach_kernel_driver(0)
        dev.set_configuration()
        intf = dev.get_active_configuration()[(0, 0)]
        self._out = usb.util.find_descriptor(
            intf,
            custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress)
            == usb.util.ENDPOINT_OUT,
        )

    def connected(self) -> bool:
        return usb.core.find(idVendor=VID, idProduct=PID, backend=_backend()) is not None

    def send(self, data: bytes):
        with self._lock:
            for attempt in (1, 2):
                try:
                    if self._out is None:
                        self._connect()
                    self._out.write(data, timeout=30000)
                    return
                except usb.core.USBError:
                    self._out = None  # stale handle after an unplug; reconnect once
                    if attempt == 2:
                        raise


def label(img: Image.Image, dither=True) -> bytes:
    """Fit an image to the 4x6 label and wrap it in TSPL.

    dither=False for images that are already black and white (the iPad dithers
    its own preview, so the print matches the screen dot for dot).
    """
    img = ImageOps.fit(img.convert("L"), (W, H))
    if dither:
        bw = ImageOps.autocontrast(img).convert("1")  # Floyd-Steinberg
    else:
        bw = img.convert("1", dither=Image.Dither.NONE)
    bits = bw.tobytes()
    if INVERT:
        bits = bytes(b ^ 0xFF for b in bits)
    head = f"SIZE 4,6\r\nGAP {GAP}\r\nDIRECTION 1\r\nCLS\r\nBITMAP 0,0,{W // 8},{H},0,"
    return head.encode() + bits + b"\r\nPRINT 1\r\n"
