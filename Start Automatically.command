#!/bin/bash
# Double-click once (with a screen attached) to make the booth start by itself whenever this Mac
# logs in, with no screen needed after that. It also restarts if it ever stops.
# To undo, double-click "Stop Starting Automatically".
cd "$(dirname "$0")" || exit 1
HERE="$(pwd)"
LABEL="com.selfiebooth.server"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
clear
echo "Selfie booth: start automatically"
echo "---------------------------------"
pause() { echo; read -n 1 -s -r -p "Press any key to close this window."; echo; }

# Same first-time setup as Start Booth.
if ! python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' 2>/dev/null; then
  echo "This Mac needs Apple's developer tools first. Double-click Start Booth once, then try again."
  pause; exit 1
fi
if [ ! -x .venv/bin/python ] || ! .venv/bin/python -c 'import usb, PIL, libusb_package, qrcode' 2>/dev/null; then
  echo "Setting up for the first time. This needs Wi-Fi and takes a minute or two..."
  rm -rf .venv
  python3 -m venv .venv && .venv/bin/python -m pip install --quiet --disable-pip-version-check -r requirements.txt \
    || { echo "Setup didn't finish. Check the Wi-Fi, then try again."; pause; exit 1; }
fi

if [ -n "$BOOTH_DRY_RUN" ]; then WRITE_ONLY=1; fi
# Stop a booth already running in a Start Booth window, so the automatic one can take over.
if [ -z "$WRITE_ONLY" ]; then
  pkill -f "$HERE/.venv/bin/python -u server.py" 2>/dev/null
  pkill -f ".venv/bin/python -u server.py --open" 2>/dev/null
fi

mkdir -p "$HOME/Library/LaunchAgents" "$HERE/logs"
cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>WorkingDirectory</key><string>$HERE</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/caffeinate</string><string>-i</string>
    <string>$HERE/.venv/bin/python</string><string>-u</string><string>$HERE/server.py</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$HERE/logs/booth.log</string>
  <key>StandardErrorPath</key><string>$HERE/logs/booth.log</string>
</dict>
</plist>
PLISTEOF

if [ -n "$WRITE_ONLY" ]; then echo "(dry run: wrote $PLIST, not loading it)"; exit 0; fi
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
launchctl bootstrap "gui/$(id -u)" "$PLIST" || { echo "Couldn't turn on automatic start."; pause; exit 1; }

echo
echo "Waiting for the booth to start..."
for _ in $(seq 1 20); do curl -s -o /dev/null http://localhost:8000/status && break; sleep 1; done
open "http://localhost:8000/host"
echo
echo "Done. The booth now starts by itself whenever this Mac logs in, no screen needed."
echo "You can close this window."
pause
