# Selfie booth

iPad takes the selfie, a small server prints it on a Rollo X1038 (USB-only 4x6 thermal label printer).

```
iPad (Safari) ··Wi-Fi··> Mac now, Pi later (server.py) ──USB──> Rollo
```

The iPad page does the camera, countdown, frame, caption and date, and dithers the photo itself, so the
screen shows exactly the dots that print. The server only passes the finished label to the printer as raw
TSPL over USB. No printer driver.

## Run it on the Mac

```
cd ~/code/selfie-booth
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # once
.venv/bin/python server.py
```

On the iPad (same Wi-Fi), open the `http://...:8000` address it prints. It redirects to https, which Safari
needs for live camera. First visit shows a certificate warning: Show Details, then visit this website. Allow
the camera. Optional: Share, Add to Home Screen, and Guided Access to lock the iPad to it.

## Files

| File | Does |
| --- | --- |
| `server.py` | Serves `static/`, `POST /print` (PNG in, prints it), `GET /status` |
| `printer.py` | Finds the Rollo over USB, wraps an image in TSPL (808 x 1218, 1-bit) |
| `static/label.js` | Draws the label: photo window, frames, caption, date |
| `static/dots.js` | Levels and Floyd-Steinberg dithering (tested: `npm test`) |
| `print_photo.py` | Print any photo from the command line |
| `bridge.py` | Raw port 9100 listener, for sending TSPL files with `nc` |

Gotchas found so far: label width must be a multiple of 8 (812 skews every row, so it's 808). TSPL prints
0 bits as black, the same as PIL's `"1"` mode, so no inversion (`INVERT` in `printer.py`).

## Move to the Raspberry Pi Zero 2 W

Needs: a microSD card (8 GB+), a micro-USB OTG adapter for the printer cable, a micro-USB power supply.

1. Raspberry Pi Imager: Raspberry Pi OS Lite (64-bit). In its settings set hostname `booth`, your Wi-Fi,
   and turn on SSH.
2. Printer cable into the OTG adapter, into the port labelled **USB** (middle). Power into **PWR IN** (corner).
3. From the Mac: `scp -r ~/code/selfie-booth booth.local:` (skip `.venv` and `certs`).
4. On the Pi: `sudo apt install -y python3-venv libusb-1.0-0 openssl`, then the same venv and
   `requirements.txt` install, then run it as root once to check (`sudo .venv/bin/python server.py`), since
   raw USB needs permission. Then add a udev rule for VID 09c5 / PID 0588 and a systemd service so it starts
   on boot.
5. On the iPad, open the Pi's address instead of the Mac's.

Later: make the Pi host its own `BOOTH` Wi-Fi so it works at venues without Wi-Fi.
