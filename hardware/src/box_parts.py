"""Cut files for the convention box: nine pieces of 1/4 in MDF or plywood, one DXF each, laid flat with the
outside face up. Cut lines only, no engraving.

  front, back, left, right, top, bottom, deck, ipad_holder, lock_bar: 1 each. No screws.
"""

from __future__ import annotations

from functools import lru_cache

from cadgen import build123d as bd
from cadgen import dxf, flatten

from box import make_parts


@lru_cache(maxsize=1)
def parts():
    return make_parts()


def lay_flat(shape: bd.Shape, frontal: bool) -> bd.Shape:
    """The part's outline as a 2D profile in the XY plane, kept in known coordinates.

    Frontal parts (facing -Y, like the front panel) are turned outside-face-up so their 2D coordinates
    are exactly (world X, world Z), as drawn in front view.
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


def frontal(name):
    return lay_flat(parts()[name], frontal=True)


def plain(name):
    return lay_flat(parts()[name], frontal=False)


@dxf(out="../DXF/box/front.dxf")
def front():
    return frontal("front")


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
