"""Cut files for the convention box: nine pieces of 6 mm plywood, one DXF each, laid flat with the
outside face up so the engraving lands on the outside and reads the right way round.
CUT layer cuts, ENGRAVE layer engraves.

  front, back, left, right, top, bottom, deck, ipad_holder, lock_bar: 1 each. No screws.
"""

from __future__ import annotations

from functools import lru_cache

from cadgen import build123d as bd
from cadgen import dxf, flatten

from box import make_parts
from box_dims import (
    FRAME_BAND, IPAD_CORNER_R, IPAD_CX, IPAD_CZ, PRINTER_CX, SIGN_CZ, SIGN_D, SLOT_W, SLOT_Z0, SLOT_Z1,
    WINDOW_H, WINDOW_W,
)
from panels import heart, text


@lru_cache(maxsize=1)
def parts():
    return make_parts()


def lay_flat(shape: bd.Shape, frontal: bool) -> bd.Shape:
    """The part's outline as a 2D profile in the XY plane, kept in known coordinates.

    Frontal parts (facing -Y, like the front panel) are turned outside-face-up so their 2D coordinates
    are exactly (world X, world Z): engraving drawn in front-view coordinates then lands in place.
    Everything else is turned so its thinnest direction is Z. The outward face is taken as is and
    dropped onto Z=0, with no further moves.
    """
    if frontal:
        flat = shape.rotate(bd.Axis.X, -90)  # (x, y, z) -> (x, z, -y): the outside (y=min) face ends up on top
    else:
        b = shape.bounding_box().size
        thin = min(("x", b.X), ("y", b.Y), ("z", b.Z), key=lambda t: t[1])[0]
        flat = {"x": shape.rotate(bd.Axis.Y, 90), "y": shape.rotate(bd.Axis.X, 90), "z": shape}[thin]
    top = flat.bounding_box().max.Z
    faces = flatten.planar_faces(flat, normal_axis="z", normal_sign=1.0, coordinate_axis="z", coordinate=top)
    return flatten.union_faces([bd.Location((0, 0, -top)) * f for f in faces])


def front_engraving() -> bd.Sketch:
    """Engraved instead of glued on: a frame band round the iPad, the round sign, a line round the slot."""
    r = IPAD_CORNER_R - 2.5
    with bd.BuildSketch() as s:
        # Frame band round the iPad window (filled).
        with bd.Locations((IPAD_CX, IPAD_CZ)):
            bd.RectangleRounded(WINDOW_W + 2 * FRAME_BAND, WINDOW_H + 2 * FRAME_BAND, r + FRAME_BAND)
            bd.RectangleRounded(WINDOW_W + 2, WINDOW_H + 2, r + 1, mode=bd.Mode.SUBTRACT)
        # Round sign: a ring.
        with bd.Locations((PRINTER_CX, SIGN_CZ)):
            bd.Circle(SIGN_D / 2)
            bd.Circle(SIGN_D / 2 - 3, mode=bd.Mode.SUBTRACT)
        # A line round the print slot.
        with bd.Locations((PRINTER_CX, (SLOT_Z0 + SLOT_Z1) / 2)):
            bd.RectangleRounded(SLOT_W + 16, SLOT_Z1 - SLOT_Z0 + 16, 18)
            bd.RectangleRounded(SLOT_W + 10, SLOT_Z1 - SLOT_Z0 + 10, 15, mode=bd.Mode.SUBTRACT)
    words = (
        text("selfie booth", IPAD_CX, IPAD_CZ + WINDOW_H / 2 + FRAME_BAND + 11, 13)
        + text("tap the screen", PRINTER_CX, SIGN_CZ + 14, 16)
        + text("and smile", PRINTER_CX, SIGN_CZ - 8, 16)
        + heart(PRINTER_CX, SIGN_CZ - 32, 13)
    )
    return s.sketch + words


def frontal(name, engrave=None):
    cut = lay_flat(parts()[name], frontal=True)
    return cut if engrave is None else {"CUT": cut, "ENGRAVE": engrave}


def plain(name):
    return lay_flat(parts()[name], frontal=False)


@dxf(out="../DXF/box/front.dxf")
def front():
    return frontal("front", front_engraving())


@dxf(out="../DXF/box/back.dxf")
def back():
    return frontal("back")


@dxf(out="../DXF/box/ipad_holder.dxf")
def ipad_holder():
    return frontal("ipad_holder")


@dxf(out="../DXF/box/lock_bar.dxf")
def lock_bar():
    return frontal("lock_bar")


@dxf(out="../DXF/box/left.dxf")
def left():
    return plain("left")


@dxf(out="../DXF/box/right.dxf")
def right():
    return plain("right")


@dxf(out="../DXF/box/top.dxf")
def top():
    return plain("top")


@dxf(out="../DXF/box/bottom.dxf")
def bottom():
    return plain("bottom")


@dxf(out="../DXF/box/deck.dxf")
def deck():
    return plain("deck")


if __name__ == "__main__":
    for model in (front, back, left, right, top, bottom, deck, ipad_holder, lock_bar):
        model()
