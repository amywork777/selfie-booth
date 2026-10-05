# Booth stand

A 3D-printed stand that puts the iPad mini on top of the Rollo X1038, plus two laser-cut panels:
a scalloped bezel with a "selfie booth" sign around the iPad, and a front plate over the printer
with a slot where the print comes out.

| Part | File | Make it |
| --- | --- | --- |
| Saddle (legs + deck over the printer) | `3MF/saddle_print.3mf` | Print as loaded: deck down, legs up. No supports. |
| Cradle (holds the iPad, tilted back 15°) | `3MF/cradle_print.3mf` | Print standing on its base. No supports. |
| Bezel and sign | `DXF/bezel.dxf` | Laser cut 3 mm sheet, 182 x 265 mm. `CUT` layer cuts, `ENGRAVE` layer engraves the lettering. |
| Front plate | `DXF/front_plate.dxf` | Laser cut 3 mm sheet, 251 x 105 mm. Same layers. |
| Screws | 4 x M3 x 12 self-tapping (or glue) | Up through the deck into the cradle. |

Both prints fit a 256 mm Bambu plate. PLA, 3 walls, 15% infill is plenty. Together they are about
236 cm³ of solid model (the slicer will use less with infill).

## Putting it together

1. Screw the cradle onto the deck (4 screws from underneath), or glue it.
2. Set the saddle over the printer. Cables go out the open back.
3. Hang the front plate on the four pegs on the front of the legs: push the big round holes over the
   peg heads, then let the plate drop so it stands on the table.
4. Put the iPad in the cradle, then hang the bezel on the four pegs on the cradle's side walls the
   same way.
5. To load labels, lift the whole stand off the printer.

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
- **Panels:** 3 mm sheet. For other thicknesses change `PANEL_T` (the pegs follow).

## Rebuilding

```
cd hardware
uv venv --python 3.11 .venv && uv pip install --python .venv/bin/python "cadgen[snapshot]==0.7.9"
.venv/bin/python src/saddle.py
.venv/bin/python src/cradle.py
.venv/bin/python src/print_layout.py
.venv/bin/python src/bezel.py
.venv/bin/python src/front_plate.py
.venv/bin/python src/booth.py      # everything together, with stand-in printer and iPad, for review
```
