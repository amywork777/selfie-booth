"""Cradle: holds the iPad mini in portrait, tilted back, on top of the saddle.

Built upright in a local frame (x across, y' from the front lip back, z' up the iPad), tilted back
TILT_DEG, then given a thin wedge underneath so its base sits flat on the deck. Origin: the
front-bottom edge of the lip, which lands on the deck's front edge. Print standing on its base.
"""

import math

from cadgen import build123d as bd
from cadgen import step, threemf

from panels import heart
from dims import (
    BACK_H, BACK_T, BEZEL_PEG_Z, CABLE_NOTCH_W, FLOOR_T, LIP_H, LIP_T, PEG_D, PEG_HEAD_D, PEG_HEAD_T,
    PEG_LEN, POCKET_DEPTH, POCKET_W, SCREW_PILOT_D, SCREW_SPACING_X, TILT_DEG, WALL_H, WALL_T, WALL_X,
)

HALF = POCKET_W / 2 + WALL_T  # outer half-width of the cradle
DEPTH = LIP_T + POCKET_DEPTH + BACK_T  # lip front to back-plate back
GUSSET_T = 7.0
GUSSET_X = SCREW_SPACING_X / 2  # the back screws go up into the gussets
GUSSET_REACH = 45.0  # how far behind the back plate each gusset's foot runs
GUSSET_H = 100.0
SCREW_Y = (12.0, 52.0)  # from the lip front; must match saddle.CRADLE_SCREW_Y offsets
PILOT_DEPTH = 10.0


def box(x0, x1, y0, y1, z0, z1):
    return bd.Box(x1 - x0, y1 - y0, z1 - z0, align=bd.Align.MIN).moved(bd.Location((x0, y0, z0)))


def peg(x, z):
    """A mushroom peg pointing forward (-Y) out of the y=0 face."""
    shaft = bd.Cylinder(PEG_D / 2, PEG_LEN, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    head = bd.Cylinder(PEG_HEAD_D / 2, PEG_HEAD_T, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    head = head.moved(bd.Location((0, 0, PEG_LEN)))
    return (shaft + head).rotate(bd.Axis.X, 90).moved(bd.Location((x, 0, z)))


def upright():
    """The cradle before tilting: lip, floor, back plate, side walls, bezel pegs."""
    pocket_back = LIP_T + POCKET_DEPTH
    floor = box(-HALF, HALF, 0, DEPTH, 0, FLOOR_T)
    lip = box(-HALF, HALF, 0, LIP_T, 0, FLOOR_T + LIP_H)
    back = box(-HALF, HALF, pocket_back, DEPTH, 0, BACK_H)
    walls = [box(POCKET_W / 2, HALF, 0, pocket_back, 0, WALL_H), box(-HALF, -POCKET_W / 2, 0, pocket_back, 0, WALL_H)]
    # Heart window in the back plate, hidden behind the iPad, to save filament.
    with bd.BuildSketch(bd.Plane.XZ) as back_heart:
        bd.add(heart(0, 72, 92))
    back -= bd.extrude(back_heart.sketch, amount=-(DEPTH + 1))
    body = floor + lip + back + walls[0] + walls[1]
    # Notch for a right-angle USB-C cable: through the lip and the floor under the iPad's port.
    body -= box(-CABLE_NOTCH_W / 2, CABLE_NOTCH_W / 2, -1, pocket_back, -1, FLOOR_T + LIP_H + 1)
    for sx in (-1, 1):
        for z in BEZEL_PEG_Z:
            body += peg(sx * WALL_X, z)
    return body


def make_cradle():
    tilt = math.radians(TILT_DEG)
    lift = DEPTH * math.sin(tilt)  # tilting drops the back-bottom edge this far
    body = upright().rotate(bd.Axis.X, -TILT_DEG).moved(bd.Location((0, 0, lift)))

    # Wedge under the tilted floor so the base is flat.
    back_y = DEPTH * math.cos(tilt)
    with bd.BuildSketch(bd.Plane.YZ) as wedge_profile:
        bd.Polygon((0, 0), (back_y, 0), (0, lift), align=None)
    body += bd.extrude(wedge_profile.sketch, amount=HALF, both=True)

    # Ribs behind the back plate, from its back face down to the deck.
    def back_face_y(z):
        return DEPTH / math.cos(tilt) - lift * math.tan(tilt) + z * math.tan(tilt)

    with bd.BuildSketch(bd.Plane.YZ) as rib_profile:
        bd.Polygon(
            (back_face_y(0) - 1, 0), (back_face_y(0) + GUSSET_REACH, 0), (back_face_y(GUSSET_H) - 1, GUSSET_H),
            align=None,
        )
    rib = bd.extrude(rib_profile.sketch, amount=GUSSET_T / 2, both=True)
    for sx in (-1, 1):
        body += rib.moved(bd.Location((sx * GUSSET_X, 0, 0)))

    # Pilot holes for M3 self-tapping screws coming up through the deck.
    for x in (-GUSSET_X, GUSSET_X):
        for y in SCREW_Y:
            body -= bd.Cylinder(SCREW_PILOT_D / 2, PILOT_DEPTH, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)).moved(
                bd.Location((x, y, 0))
            )
    return body


@step(out="../STEP/cradle.step")
@threemf(out="../3MF/cradle_print.3mf")
def cradle():
    part = make_cradle()
    part.label = "cradle"
    return part


if __name__ == "__main__":
    cradle()
