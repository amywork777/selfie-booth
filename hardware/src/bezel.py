"""Bezel: a laser-cut frame that hangs on the cradle's side-wall pegs, flat on the iPad's face,
with a window for the screen and camera and a "selfie booth" sign on top.

Drawn in the cradle's own plane: X across, Y up the iPad from the cradle's front-bottom edge
(the same z' as cradle.py). CUT is the outline and holes; ENGRAVE is the sign lettering.
"""

from cadgen import build123d as bd
from cadgen import dxf

from dims import (
    BEZEL_PEG_Z, CAMERA_FROM_TOP, FLOOR_T, IPAD_H, POCKET_W, SCREEN_H, SCREEN_R, SCREEN_W, WALL_T, WALL_X,
)
from panels import heart, keyhole, scalloped_rect, text

BOTTOM = 2.0  # just above the deck, which the bezel must clear
IPAD_TOP = FLOOR_T + IPAD_H
BODY_HALF_W = POCKET_W / 2 + WALL_T + 5.0
SIGN_H = 44.0  # keeps the whole bezel under 256 mm so it also fits a Bambu plate
SIGN_HALF_W = BODY_HALF_W - 6.0
BUMP = 7.0
WINDOW_MARGIN = 0.5  # window a hair bigger than the lit screen


def bezel_top():
    """Highest point of the bezel, scallops included, in the cradle frame."""
    return IPAD_TOP + 6.0 - BUMP + SIGN_H + BUMP


def bezel_sketches():
    """(cut, lettering): the panel outline with its holes, and the sign lettering."""
    body_top = IPAD_TOP + 6.0
    outline = scalloped_rect(0, (BOTTOM + body_top) / 2, 2 * BODY_HALF_W, body_top - BOTTOM, BUMP)
    sign_bottom = body_top - BUMP
    outline += scalloped_rect(0, sign_bottom + SIGN_H / 2, 2 * SIGN_HALF_W, SIGN_H, BUMP)

    screen_cy = FLOOR_T + IPAD_H / 2
    with bd.BuildSketch() as window:
        with bd.Locations((0, screen_cy)):
            bd.RectangleRounded(SCREEN_W + 2 * WINDOW_MARGIN, SCREEN_H + 2 * WINDOW_MARGIN, SCREEN_R)
        with bd.Locations((0, IPAD_TOP - CAMERA_FROM_TOP)):
            bd.Circle(7.0)  # front camera, centred on the top edge in portrait

    # Flat bottom edge: the scallops there would touch the deck once the bezel is tilted back.
    with bd.BuildSketch() as below:
        with bd.Locations((0, BOTTOM - 50)):
            bd.Rectangle(4 * BODY_HALF_W, 100)
    cut = outline - below.sketch - window.sketch
    for sx in (-1, 1):
        for z in BEZEL_PEG_Z:
            cut -= keyhole(sx * WALL_X, z)
    sign_cy = sign_bottom + SIGN_H / 2
    lettering = text("selfie booth", 0, sign_cy, 25)
    half_text = lettering.bounding_box().size.X / 2
    for sx in (-1, 1):
        cut -= heart(sx * (half_text + 13), sign_cy + 1, 15)
    return cut, lettering


@dxf(out="../DXF/bezel.dxf")
def bezel():
    cut, lettering = bezel_sketches()
    return {"CUT": cut, "ENGRAVE": lettering}


if __name__ == "__main__":
    bezel()
