# Selfie booth

An iPad selfie booth that prints on a 4x6 thermal label printer. Guests pick how many photos, pick a
pattern, add a caption (or a doodle), pose, and walk away with a print.

**Not technical? Read [START HERE](START%20HERE.md)** and double-click `Start Booth` on a Mac.

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

Double-click **Start Booth** (`Start Booth.command`). The first run makes a Python environment and
installs `requirements.txt` (pyusb, Pillow, and libusb-package, which bundles libusb so no Homebrew is
needed), and it keeps the Mac awake while the booth runs. By hand, the same thing is:

```
python3 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt
caffeinate -i .venv/bin/python server.py
```

Every time:

1. Plug the printer into the Mac and switch it on.
2. Double-click **Start Booth** and leave its window open.
3. On the iPad (same Wi-Fi as the Mac), open **https://selfie-booth.local:8443**. Add it to the Home
   Screen (Share, Add to Home Screen) for one-tap opening, and turn on Guided Access (Settings,
   Accessibility) to lock the iPad to the booth.

The address is the same on any Wi-Fi: the server announces `selfie-booth.local` on whatever network
it's on.

### First time on an iPad: trust the booth (once)

The booth uses https because Safari only allows the live camera on https. The server makes its own
small certificate authority (kept in `certs/`, never committed). Each iPad trusts it once:

1. On the iPad, open **http://selfie-booth.local:8000** and tap **Download the booth certificate**, then
   Allow.
2. Settings, **Profile Downloaded**, Install.
3. Settings, General, About, **Certificate Trust Settings**, turn on **Selfie Booth**.

After that the booth opens with no warning, even after the Mac changes networks. If you delete the
`certs/` folder, a new authority is made and iPads need to do this again.

If `selfie-booth.local` doesn't load, the server also prints the Mac's own `.local` name and its IP
address to try instead. Also check the Mac didn't pop up an "allow incoming connections" box for Python.

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

To see every pattern and photo count at once: https://selfie-booth.local:8443/frames.html

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
4. On the iPad, open https://selfie-booth.local:8443 as before (the Pi announces the same name through
   Avahi, if `avahi-utils` is installed). The Pi makes its own certificate authority, so each iPad trusts it
   once, from http://selfie-booth.local:8000.

Still to do for the Pi: a udev rule so it doesn't need `sudo`, starting on boot, and having the Pi make
its own Wi-Fi so the booth works at venues without Wi-Fi.
