#!/bin/bash
# Double-click to start the selfie booth. Keep this window open while the booth is running;
# close it to stop the booth. The first start sets things up and takes a minute or two.
cd "$(dirname "$0")" || exit 1
clear
echo "Selfie booth"
echo "------------"

pause() { echo; read -n 1 -s -r -p "Press any key to close this window."; echo; }

# Python comes with Apple's free developer tools. If they're missing, macOS offers to install them.
if ! python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' 2>/dev/null; then
  echo
  echo "This Mac needs Apple's developer tools first (free, one time)."
  echo "A box should pop up: click Install, wait until it says it's done,"
  echo "then double-click Start Booth again."
  xcode-select --install 2>/dev/null
  pause
  exit 1
fi

if [ ! -x .venv/bin/python ] || ! .venv/bin/python -c 'import usb, PIL, libusb_package, qrcode' 2>/dev/null; then
  echo
  echo "Setting up for the first time. This needs Wi-Fi and takes a minute or two..."
  rm -rf .venv
  if ! python3 -m venv .venv || ! .venv/bin/python -m pip install --quiet --disable-pip-version-check -r requirements.txt; then
    echo
    echo "Setup didn't finish. Check the Wi-Fi is on, then double-click Start Booth again."
    pause
    exit 1
  fi
  echo "Done."
fi

echo
echo "A page with a QR code will open: scan it with the iPad camera."
echo "Keep this window open while the booth is running. Close it to stop the booth."
echo
# caffeinate keeps the Mac awake for as long as the booth runs.
caffeinate -i .venv/bin/python -u server.py --open
pause
