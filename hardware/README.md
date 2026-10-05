# Booth hardware

Two designs:

- **Laser-cut box** (for conventions and anywhere things might walk off): everything inside a
  plywood box, with only the screen and the print slot showing. See below.
- **3D-printed stand** (for home and parties): the iPad on top of the printer. Further down.

## Laser-cut box

A 393 x 270 x 265 mm finger-jointed box in 6 mm (1/4 in) plywood. Inside: the iPad mini behind a
window on the left, the Rollo on a shelf behind the print slot on the right with its labels behind
it, and a 2024 Mac mini on the floor under the shelf. The back comes off with four thumb screws; the
power cords leave through a notch in it. It sits flat on the table, with vents in the side by the Mac
mini. Every piece cuts on a Glowforge in one go.

**Cut files** (`DXF/box/`, `CUT` layer cuts, `ENGRAVE` layer engraves):

| Part | Cut | Notes |
| --- | --- | --- |
| front | 1 | iPad window (the whole iPad face shows, camera included) and print slot |
| ipad_frame | 1 | raised frame glued round the window; "selfie booth" engraved along its top |
| back | 1 | thumb-screw holes, cord notch, heart vents |
| left, right | 1 each | finger joints; right has the shelf's tab slots and heart vents by the Mac mini |
| top | 1 | plain: glued onto the divider's top edge |
| bottom | 1 | the box sits flat on the table |
| divider | 1 | between the iPad and printer sides; cable pass-through for the iPad's charger |
| shelf | 1 | the printer and its labels sit on it |
| ipad_pocket | 1 | glue to the back of the front panel, round the window |
| ipad_backing | 1 | screws to the pocket and holds the iPad in |
| slot_bezel | 1 | glue round the print slot on the front |
| sign_disc | 1 | "tap the screen and smile"; glue above the slot |
| post_layer | 12 | glue 3 together for each of the 4 corner posts |

**Also needed:** wood glue; 4 x M4 thumb screws (about 12 mm) and 4 x M4 threaded inserts for wood;
4 x small wood screws (M3 x 10 or #4 x 3/8 in) for the iPad backing; a right-angle USB-C cable for the
iPad; a USB-C to USB-A adapter for the printer cable (the M4 Mac mini has USB-C only).

**Assembly:**

1. Glue the iPad pocket to the back of the front panel, centred on the window. Glue the iPad frame,
   the slot bezel and the round sign to the front.
2. Glue the box together: front, bottom, sides and top, with the divider and shelf tabbed in. Leave
   the back off.
3. Glue up the four corner posts (3 layers each). Press an M4 insert into each post and glue the posts
   into the back corners.
4. Put the iPad face down in its pocket, run its cable through the divider, and screw the backing
   plate on.
5. Mac mini on the floor of the right side, printer on the shelf pushed to the front, labels behind it
   feeding into the printer. Plug in, cords out through the back notch.
6. Thumb-screw the back on.

**Before cutting:** measure the printer (published size: 195 x 75 x 85 mm), and with it standing on a
table, measure how high the label comes out. Set that as `LABEL_EXIT_Z` in `src/box_dims.py`: the print
slot is centred on it (24 mm tall, 122 mm wide). Do a test cut of one finger joint
in your plywood first: real 1/4 in plywood is often thinner than 6 mm (change `T`).

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
