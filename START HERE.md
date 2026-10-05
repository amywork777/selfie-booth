# Selfie booth: start here

You need a Mac, an iPad, the Rollo printer (plugged into the Mac and switched on) and 4x6 labels.
The Mac and iPad must be on the same Wi-Fi.

## The first time (about 10 minutes)

### On the Mac

1. On this page, click the green **Code** button, then **Download ZIP**.
2. Open your Downloads folder and double-click the ZIP. You get a folder called `selfie-booth`.
   Move it somewhere you'll find it, like your Desktop.
3. In that folder, double-click **Start Booth**.
   - If the Mac says it can't open it because it's from the internet: open **System Settings**,
     go to **Privacy & Security**, scroll down, and click **Open Anyway** next to Start Booth. Then
     double-click Start Booth again.
   - If a box asks to install **developer tools**: click **Install**, wait until it finishes (a few
     minutes), then double-click Start Booth again.
4. A window opens and sets things up for a minute or two. When it says **Selfie booth ready**, it's
   running. Leave that window open.

### On the iPad (once per iPad)

1. When the booth starts, the Mac shows a page with a big QR code. Point the iPad camera at it and tap
   the link that pops up.
2. Tap **Download the booth certificate**, then **Allow**.
3. Open **Settings**. Tap **Profile Downloaded** near the top, then **Install** (enter the iPad
   passcode if asked).
4. In Settings, go to **General**, **About**, **Certificate Trust Settings**, and turn on
   **Selfie Booth**.
5. Scan the QR code again (or go back to Safari and tap **Open the booth**). Allow the camera.
6. Tap the Share button, then **Add to Home Screen**.

## Every time after that

1. Plug the printer into the Mac and switch it on.
2. Double-click **Start Booth** on the Mac. Leave the window open.
3. On the iPad, tap the **Selfie booth** icon on the Home Screen (or scan the QR code on the Mac).

To stop the booth, close the Start Booth window on the Mac.

## Mac mini with no screen

Do this once at home with a screen, keyboard and mouse plugged into the Mac mini (any TV with HDMI works):

1. Do "The first time" steps above.
2. On the Mac mini, join your **phone's hotspot** once (Wi-Fi menu, top right of the screen). It will rejoin it
   by itself at any event. Or plug the Mac mini into the router with an Ethernet cable.
3. In the selfie-booth folder, double-click **Start Automatically**.
4. Open **System Settings**, **Users & Groups**, and set **Automatically log in** to your account.
   - Greyed out? That means FileVault is on. Then at events: switch the Mac mini on, wait a minute, type your
     password and press Return. No screen needed.

At the event:

1. Turn on your phone's hotspot. Join the iPad to it too.
2. Plug in the printer and switch on the Mac mini.
3. Wait about a minute, then tap the booth icon on the iPad.
   - If it can't find the booth, open **http://selfie-booth.local:8000** in Safari.

To turn automatic start off, double-click **Stop Starting Automatically**.

The 2024 Mac mini only has USB-C ports: use a USB-C to USB-A adapter for the printer cable.

## Before guests arrive

On the iPad, tap **Settings** in the top corner of the booth:

- **Captions:** let each guest write their own, or pick **Same for everyone** and type the event
  name (like "amy's 30th").
- Turn the date and sound on or off.

Tip: turn on **Guided Access** (iPad Settings, Accessibility) so guests can't leave the booth.

## If something's wrong

- **The iPad can't find selfie-booth.local:** check the Mac and iPad are on the same Wi-Fi and the
  Start Booth window is still open. The window also shows another address to try.
- **"Printer not found"** (on the Mac's QR page or in the booth): check the printer is plugged in and
  switched on.
- **The Mac asks to allow incoming connections:** click **Allow**.
- **Nothing prints:** check the labels are loaded, then close Start Booth and open it again.
