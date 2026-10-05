# Selfie booth

An iPad selfie booth that prints on a 4x6 thermal label printer. Guests pick how many photos, pick a
pattern, add a caption (or a doodle), pose, and walk away with a print.

```
iPad (Safari) ··Wi-Fi··> a Mac or Raspberry Pi running server.py ──USB──> thermal printer
```

The iPad can't drive a USB printer itself, so a small computer sits in the middle. The iPad page does
everything people see: camera, countdown, patterns, caption, and turning the photo into printer dots.
The server only passes the finished label to the printer over USB. No printer driver is needed.

## What you need

- An iPad (any recent one with a front camera) on the same Wi-Fi as the computer.
- A Mac (or a Raspberry Pi, see below).
- A 4x6 direct thermal label printer that understands **TSPL** commands. Built and tested with a
  **Rollo X1038** (the USB model). Other TSPL printers should work after changing the USB IDs (below).
- 4x6 direct thermal labels.

## Run it on a Mac

One-time setup, in Terminal:

```
brew install libusb
git clone https://github.com/amywork777/selfie-booth.git
cd selfie-booth
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

Every time:

1. Plug the printer into the Mac and switch it on.
2. Start the booth: `cd selfie-booth && .venv/bin/python server.py`
3. It prints an address like `http://10.0.0.194:8000`. Open that in Safari on the iPad.
4. Safari warns the connection isn't private (the Mac made its own certificate). Tap **Show Details**,
   then **visit this website**. Allow the camera when asked.
5. Optional: Share, **Add to Home Screen**, and turn on Guided Access (Settings, Accessibility) to lock
   the iPad to the booth.

If the page won't load, check the Mac didn't pop up a "allow incoming connections" box for Python.

## Using the booth

Guests go through:

1. **How many photos:** 1 photo, 2 poses, 2 x 2, or twin strips (4 poses printed twice, with a cut line).
2. **Pick a pattern:** Plain, Hearts, Polka dot, Gingham, Doodle, Daisy chain.
3. **Caption:** type a caption. On Plain they can also doodle on the label with a finger.
4. **Smile:** a 3-2-1 countdown per pose, then it prints on its own.

**Settings** (small button, top right, on steps 1 and 2) is for the host:

- **Captions:** *Guests write their own*, or *Same for everyone* with one event caption. With the same
  caption for everyone, guests skip step 3 (except on Plain, where it becomes "Doodle on it").
- **Date** on or off, **Sound** on or off.

To see every pattern and photo count at once: `https://<the same address>:8443/frames.html`.

## Files

| File | Does |
| --- | --- |
| `server.py` | Serves the iPad page over https, `POST /print` (PNG in, prints it), `GET /status`, `POST /log` |
| `printer.py` | Finds the printer over USB and wraps an image in TSPL (808 x 1218 dots, 1-bit) |
| `static/app.js` | The booth: steps, camera, countdown, doodling, printing |
| `static/label.js` | Draws the label: photo counts, patterns, stickers, caption |
| `static/dots.js` | Contrast and Floyd-Steinberg dithering (tested: `npm test`) |
| `static/frames.html` | Every pattern and count side by side |
| `print_photo.py` | Print any photo from Terminal: `.venv/bin/python print_photo.py photo.jpg` |

## A different printer

In `printer.py`:

- `VID, PID`: your printer's USB IDs. On a Mac, find them with `system_profiler SPUSBDataType`.
- `GAP`: `"0.12,0"` for labels with gaps between them, `"0,0"` for continuous paper.
- `INVERT`: flip it if prints come out as a negative.
- The label is 808 dots wide, not 812: the width must be a multiple of 8 or every row skews.

## Run it on a Raspberry Pi instead of a Mac (not tested yet)

Needs a Raspberry Pi Zero 2 W, a microSD card (8 GB+), a micro-USB OTG adapter for the printer cable,
and a micro-USB power supply.

1. Flash the card with Raspberry Pi Imager: Raspberry Pi OS Lite (64-bit). In its settings set a
   hostname (e.g. `booth`), your Wi-Fi, and turn on SSH.
2. Printer cable into the OTG adapter, into the Pi's port labelled **USB** (the middle one). Power into
   **PWR IN** (the corner one).
3. Copy the folder over (without `.venv` and `certs`), then on the Pi:
   `sudo apt install -y python3-venv libusb-1.0-0 openssl`, the same venv and `requirements.txt` install,
   and `sudo .venv/bin/python server.py` (raw USB needs permission).
4. On the iPad, open the Pi's address instead of the Mac's.

Still to do for the Pi: a udev rule so it doesn't need `sudo`, starting on boot, and having the Pi make
its own Wi-Fi so the booth works at venues without Wi-Fi.
