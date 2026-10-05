"""Front plate: a laser-cut panel that hangs on the saddle's leg pegs, covering the printer's front,
with a slot where the label comes out.

Drawn in the booth's front plane: X across (printer centred), Y up from the table. The plate stands
on the table; its pegs only hold it upright. CUT is the outline and holes; ENGRAVE is the lettering.
"""

from cadgen import build123d as bd
from cadgen import dxf

from dims import DECK_Z1, FRONT_PEG_X, FRONT_PEG_Z, OUTER_HALF, PRINTER_H
from panels import heart, keyhole, scalloped_rect, text

HALF_W = OUTER_HALF + 10.0
TOP = DECK_Z1 + 8.0
BUMP = 7.0
# Wide and tall enough for a 4.1 in label leaving through the front or curling over the top-front edge.
SLOT_W = 136.0
SLOT_Z0, SLOT_Z1 = PRINTER_H - 24.0, PRINTER_H + 4.0


def front_plate_sketches():
    """(cut, lettering): the plate outline with its holes, and the lettering."""
    # Scallops reach TOP at the top and dip below the table at the bottom; the bottom is then trimmed
    # flat at Y=0 so the plate stands on the table.
    cut = scalloped_rect(0, (TOP - BUMP) / 2, 2 * HALF_W, TOP - BUMP, BUMP)
    with bd.BuildSketch() as below:
        with bd.Locations((0, -50)):
            bd.Rectangle(4 * HALF_W, 100)
    cut -= below.sketch

    with bd.BuildSketch() as slot:
        with bd.Locations((0, (SLOT_Z0 + SLOT_Z1) / 2)):
            bd.RectangleRounded(SLOT_W, SLOT_Z1 - SLOT_Z0, 6)
    cut -= slot.sketch
    for sx in (-1, 1):
        for z in FRONT_PEG_Z:
            cut -= keyhole(sx * FRONT_PEG_X, z)
    for i, x in enumerate((-62, -31, 0, 31, 62)):
        cut -= heart(x, 20, 20 if i % 2 else 25)

    lettering = text("your print comes out here", 0, SLOT_Z0 - 13, 15)
    return cut, lettering


@dxf(out="../DXF/front_plate.dxf")
def front_plate():
    cut, lettering = front_plate_sketches()
    return {"CUT": cut, "ENGRAVE": lettering}


if __name__ == "__main__":
    front_plate()
