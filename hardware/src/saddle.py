"""Saddle: two legs that straddle the Rollo and a deck over it, carrying the iPad cradle.

Print upside down (deck on the bed): the legs then grow straight up and the 217 mm deck needs no
bridging. The back is open for the printer's USB and power cables, and nothing touches its lid.
"""

from cadgen import build123d as bd
from cadgen import step

from dims import (
    DECK_Y0, DECK_Z0, DECK_Z1, FRONT_PEG_X, FRONT_PEG_Z, INNER_HALF, LEG_T, LEG_Y0, LEG_Y1,
    OUTER_HALF, PEG_D, PEG_HEAD_D, PEG_HEAD_T, PEG_LEN, SCREW_HOLE_D, SCREW_SPACING_X,
)

# Where the cradle's screws land on the deck (cradle base centre, see cradle.py).
CRADLE_SCREW_Y = (DECK_Y0 + 12.0, DECK_Y0 + 52.0)


def box(x0, x1, y0, y1, z0, z1):
    return bd.Box(x1 - x0, y1 - y0, z1 - z0, align=bd.Align.MIN).moved(bd.Location((x0, y0, z0)))


def peg(x, z, y_face):
    """A mushroom peg sticking out of a front face (toward -Y), for a keyhole slot to hang on."""
    shaft = bd.Cylinder(PEG_D / 2, PEG_LEN, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    head = bd.Cylinder(PEG_HEAD_D / 2, PEG_HEAD_T, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    head = head.moved(bd.Location((0, 0, PEG_LEN)))
    # Built along +Z, then turned to point along -Y out of the face.
    return (shaft + head).rotate(bd.Axis.X, 90).moved(bd.Location((x, y_face, z)))


def make_saddle():
    legs = [box(min(sx * INNER_HALF, sx * OUTER_HALF), max(sx * INNER_HALF, sx * OUTER_HALF), LEG_Y0, LEG_Y1, 0, DECK_Z1) for sx in (-1, 1)]
    deck = box(-OUTER_HALF, OUTER_HALF, DECK_Y0, LEG_Y1, DECK_Z0, DECK_Z1)
    body = legs[0] + legs[1] + deck

    # Soften the outer vertical edges of the legs a little.
    outer_edges = body.edges().filter_by(bd.Axis.Z).filter_by(lambda e: abs(abs(e.center().X) - OUTER_HALF) < 1e-6)
    body = body.fillet(3.0, outer_edges)

    for x in (-SCREW_SPACING_X / 2, SCREW_SPACING_X / 2):
        for y in CRADLE_SCREW_Y:
            body -= bd.Cylinder(SCREW_HOLE_D / 2, 40).moved(bd.Location((x, y, DECK_Z0)))

    for sx in (-1, 1):
        for z in FRONT_PEG_Z:
            body += peg(sx * FRONT_PEG_X, z, LEG_Y0)
    return body


@step(out="../STEP/saddle.step")
def saddle():
    part = make_saddle()
    part.label = "saddle"
    return part


if __name__ == "__main__":
    saddle()
