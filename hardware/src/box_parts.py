"""Cut files for the convention box: one DXF per part, laid flat with its outside face up so the
engraving lands on the outside and reads the right way round. CUT layer cuts, ENGRAVE engraves.

Cut list (6 mm plywood):
  front, back, left, right, top, bottom, deck, divider, ipad_pocket, ipad_backing,
  ipad_frame, slot_bezel, sign_disc: 1 each
  post_layer: 12 (3 per corner post, 4 posts)
"""

from __future__ import annotations

from functools import lru_cache

from cadgen import build123d as bd
from cadgen import dxf, flatten

from box import make_parts
from box_dims import INSERT_HOLE, IPAD_CX, IPAD_CZ, IPAD_FRAME, POST, PRINTER_CX, SIGN_CZ, WINDOW_H
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
    profile = flatten.union_faces([bd.Location((0, 0, -top)) * f for f in faces])
    return profile


def frontal(name, engrave=None):
    """Cut profile of a front-facing part, plus engraving drawn in front-view (world X, Z) coordinates."""
    cut = lay_flat(parts()[name], frontal=True)
    return cut if engrave is None else {"CUT": cut, "ENGRAVE": engrave}


@dxf(out="../DXF/box/front.dxf")
def front():
    return frontal("front")


@dxf(out="../DXF/box/ipad_frame.dxf")
def ipad_frame():
    """Raised frame round the iPad; "selfie booth" engraved along its top."""
    return frontal("ipad_frame", text("selfie booth", IPAD_CX, IPAD_CZ + WINDOW_H / 2 + IPAD_FRAME / 2, 11))


@dxf(out="../DXF/box/sign_disc.dxf")
def sign_disc():
    words = text("tap the screen", PRINTER_CX, SIGN_CZ + 12, 15) + text("and smile", PRINTER_CX, SIGN_CZ - 8, 15)
    with bd.BuildSketch() as h:
        bd.add(heart(PRINTER_CX, SIGN_CZ - 28, 12))
    return frontal("sign_disc", words + h.sketch)


@dxf(out="../DXF/box/slot_bezel.dxf")
def slot_bezel():
    return frontal("slot_bezel")


@dxf(out="../DXF/box/ipad_pocket.dxf")
def ipad_pocket():
    return frontal("ipad_pocket")


@dxf(out="../DXF/box/ipad_backing.dxf")
def ipad_backing():
    return frontal("ipad_backing")


def plain(name):
    return lay_flat(parts()[name], frontal=False)


@dxf(out="../DXF/box/back.dxf")
def back():
    return plain("back")


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


@dxf(out="../DXF/box/divider.dxf")
def divider():
    return plain("divider")


@dxf(out="../DXF/box/deck.dxf")
def deck():
    return plain("deck")


@dxf(out="../DXF/box/post_layer.dxf")
def post_layer():
    """Cut 12. Glue three together for each corner post; press an M4 threaded insert into the hole."""
    with bd.BuildSketch() as s:
        bd.Rectangle(POST, POST)
        bd.Circle(INSERT_HOLE / 2, mode=bd.Mode.SUBTRACT)
    return s.sketch


if __name__ == "__main__":
    for model in (front, back, left, right, top, bottom, deck, divider, ipad_pocket, ipad_backing,
                  ipad_frame, slot_bezel, sign_disc, post_layer):
        model()
