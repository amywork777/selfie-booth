# Booth hardware

Two designs:

- **Laser-cut box** (for conventions and anywhere things might walk off): everything inside a
  plywood box, with only the screen and the print slot showing. See below.
- **3D-printed stand** (for home and parties): the iPad on top of the printer. Further down.

## Laser-cut box

Nine pieces of 6 mm (1/4 in) plywood, **no screws or hardware**: just wood glue for the box itself.
393 x 270 x 265 mm, finger-jointed, and every piece cuts on a Glowforge in one go.

Inside: a 14 in MacBook Pro lies closed in a bay across the bottom. A deck over it carries the iPad
mini on the left (standing on the deck, pressed against the front window by one holder plate) and
the Rollo on the right behind the print slot, with its labels behind it. The front is engraved: a
frame band round the iPad, a round "tap the screen and smile" sign and a line round the print slot.

The back is removable: two tabs on its bottom edge drop into slots in the floor, and a **lock bar**
slides through both side walls just behind it. Pull the bar out by its heart handle, tip the back
out, and the MacBook slides out the back.

**Cut files** (`DXF/box/`, `CUT` layer cuts, `ENGRAVE` layer engraves), one of each:

| Part | What it does |
| --- | --- |
| front | iPad window (94% of the iPad face shows, camera included) and print slot; engraved decoration |
| left, right | finger joints, slots for the deck's tabs and the lock bar |
| top, bottom | finger joints; the bottom has slots for the back's tabs |
| deck | over the MacBook; notch for the iPad's cable, hole for the printer's cable, slots for the holder |
| ipad_holder | presses the iPad against the window; tabs into the deck |
| back | drops into the floor slots; cord notch, a row of vent slots behind the MacBook |
| lock_bar | slides through the side walls to hold the back on; heart handle |

**Also needed:** wood glue; a straight USB-C cable for the iPad (it plugs down through the deck); a
USB-C to USB-A adapter for the printer cable; an HDMI dummy plug for the MacBook (see below).

**Assembly:**

1. Glue the box: front, bottom, sides, the deck (tabs through the sides), then the top.
2. Plug the iPad's cable into it from below through the deck notch, stand the iPad on the deck face
   against the window, and press the holder plate's tabs into the deck behind it.
3. Printer on the deck, pushed to the front; labels behind it feeding in. Cables down through the
   deck to the MacBook.
4. Slide the MacBook (lid closed, dummy plug in, charger connected) into the bay from the back.
5. Drop the back's tabs into the floor slots, tip it upright, and slide the lock bar through the side
   walls behind it until the heart handle stops it.

**Keeping the MacBook awake with its lid closed:** a closed MacBook sleeps unless it's in Apple's
"clamshell mode", which needs its charger connected and a display attached. Plug an **HDMI dummy
plug** (about $8, "4K HDMI headless display emulator") into its HDMI port and keep the charger in.
Do the one-time "Start Automatically" setup from START HERE with the lid open, then close it.

**Before cutting:** measure the printer (published size: 195 x 75 x 85 mm). The print slot is 130 x
60 mm and covers the whole upper part of the printer's front, so the label gets out wherever it leaves
the printer. Measure your plywood and cut one test joint first: real 1/4 in plywood is often thinner
than 6 mm (change `T` in `src/box_dims.py` and rebuild).

**Ordering from SendCutSend instead:** upload the nine files in `DXF/box_sendcutsend/` (one of each),
material Baltic Birch Plywood, .250 in. They're built for that sheet's 6.35 mm and have no engraving
(SendCutSend doesn't engrave wood, and would cut the engraving lines through). Remake them with
`.venv/bin/python src/box_sendcutsend.py`. Quoted 2026-10-05 at $268.59 for one box (free shipping); 1/4 in
MDF came out slightly dearer than the plywood, and 1/8 in hardboard is about half price but too thin for this design.

Rebuild and check: `.venv/bin/python src/box.py && .venv/bin/python src/box_parts.py && .venv/bin/python checks/box_check.py`

## 3D-printed stand

A 3D-printed stand that puts the iPad mini on top of the Rollo X1038, plus two laser-cut panels:
a scalloped bezel with a "selfie booth" sign around the iPad, and a front plate over the printer
with a slot where the print comes out.

Everything can be 3D printed. If you have a laser cutter, the two panels can be cut instead.

| Part | 3D print | Or laser cut |
| --- | --- | --- |
| Saddle (legs + deck over the printer) | `3MF/saddle_print.3mf`: print as loaded, deck down. No supports. | |
| Cradle (holds the iPad, tilted back 15°) | `3MF/cradle_print.3mf`: print standing on its base. No supports. | |
| Bezel and sign (170 x 247 mm) | `3MF/bezel_print.3mf`: flat, lettering up. | `DXF/bezel.dxf`, 3 mm sheet |
| Front plate (245 x 103 mm) | `3MF/front_plate_print.3mf`: flat, lettering up. | `DXF/front_plate.dxf`, 3 mm sheet |
| Sign topper (event name, above the iPad) | `3MF/sign_topper_print.3mf`: flat, lettering up. Posts slide into the sleeves on the back of the cradle. | |
| Table sign (the four steps) | `3MF/table_sign_print.3mf`: flat, lettering up. | |
| Table sign base | `3MF/table_sign_base_print.3mf`: as loaded. | |
| Screws | 4 x M3 x 12 self-tapping, or glue | |

Every part fits a 256 mm Bambu plate. Together they are about 260 cm³ of solid model. To use even less
filament, slice with 2 walls and 10% infill (the parts are mostly thin walls, so infill barely matters).
The printed panels are 2 mm thick with the lettering raised 0.8 mm: for two colours, add a filament
change at the layer just above 2 mm in Bambu Studio. In the DXFs, the `CUT` layer cuts and `ENGRAVE` engraves.

## Putting it together

1. Screw the cradle onto the deck (4 screws from underneath), or glue it.
2. Set the saddle over the printer. Cables go out the open back.
3. Hang the front plate on the four pegs on the front of the legs: push the big round holes over the
   peg heads, then let the plate drop so it stands on the table.
4. Put the iPad in the cradle, then hang the bezel on the four pegs on the cradle's side walls the
   same way.
5. To load labels, lift the whole stand off the printer.

## Signs

The topper's text is `SIGN_TEXT` in `src/dims.py` ("amy's 30th" for now). Change it for each event and
run `.venv/bin/python src/signs.py` to make a new `sign_topper_print.3mf`. The topper sits behind the
camera, so it never shows up in photos.

## Dimensions and assumptions

All sizes live in `src/dims.py`. Change a number there and rerun the scripts to regenerate everything.

- **Printer:** 195 W x 75 D x 85 H mm, from published specs for the Rollo X1038. The stand only
  depends on width and height (3 mm clearance each side, 6 mm above), so the depth and the exact
  label exit don't affect the fit. **Measure your printer before printing**: if it is wider or taller,
  change `PRINTER_W` / `PRINTER_H`.
- **iPad:** iPad mini 6 / 7, 195.4 x 134.8 x 6.3 mm, portrait. The cradle has a notch for a
  right-angle USB-C cable.
- **Label exit:** not published. The deck starts 25 mm behind the printer's front edge and the front
  plate's slot runs from 24 mm below the printer top to 4 mm above it, so a label can leave through
  the front or over the top-front edge.
- **Panels:** laser cut from 3 mm sheet (`PANEL_T`, the pegs follow it), or printed 2 mm thick
  (`PRINT_PANEL_T`).

## Rebuilding

```
cd hardware
uv venv --python 3.11 .venv && uv pip install --python .venv/bin/python "cadgen[snapshot]==0.7.9"
.venv/bin/python src/saddle.py
.venv/bin/python src/cradle.py
.venv/bin/python src/print_layout.py
.venv/bin/python src/bezel.py
.venv/bin/python src/front_plate.py
.venv/bin/python src/panels_print.py
.venv/bin/python src/signs.py
.venv/bin/python src/booth.py      # everything together, with stand-in printer and iPad, for review
.venv/bin/python checks/fit_check.py
```

`checks/fit_check.py` confirms every printed part is one connected piece and fits the plate, the
cradle's ribs are joined to solid back plate, no parts collide, the saddle stays at least 3 mm from the
printer, the pegs line up with the keyholes, the screw holes line up, and the topper sits in its
sleeves. Run it after changing anything.
