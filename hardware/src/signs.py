"""Two signs, both 3D printed:

- Topper: the event name on a scalloped sign with two posts that slide into sleeves on the back of
  the cradle. It rides above the bezel's "selfie booth" sign and behind the camera, so it's the
  highest thing on the booth and never in a photo. One flat print.
- Table sign: the four steps on a small standing plate, with a base that holds it tilted back. It
  stands beside the booth.

Change SIGN_TEXT in dims.py for a new event and rerun this file.
"""

from __future__ import annotations

from cadgen import build123d as bd
from cadgen import threemf

from bezel import BUMP, SIGN_H, bezel_top
from dims import SIGN_TEXT, TOPPER_POST_W, TOPPER_POST_X, TOPPER_SLEEVE_FLOOR, TOPPER_SLEEVE_Z, TOPPER_T
from panels import heart, scalloped_rect, text

LETTER_H = 0.8
TOPPER_W = 170.0
TOPPER_H = 54.0
TABLE_W, TABLE_H, TABLE_T = 130.0, 182.0, 3.0
TABLE_TILT = 10.0  # degrees back from vertical
BASE_D, BASE_H = 44.0, 18.0
SLOT_DEPTH = 13.0


def topper_sketches():
    """(cut, lettering) in the cradle's upright frame: X across, Y up the cradle."""
    sign_y0 = bezel_top() + 4.0  # just clear of the bezel's sign, scallops included
    post_bottom = TOPPER_SLEEVE_Z[0] + TOPPER_SLEEVE_FLOOR
    cut = scalloped_rect(0, sign_y0 + BUMP + TOPPER_H / 2, TOPPER_W, TOPPER_H, BUMP)
    with bd.BuildSketch() as posts:
        for sx in (-1, 1):
            with bd.Locations((sx * TOPPER_POST_X, (post_bottom + sign_y0 + BUMP + 10) / 2)):
                bd.Rectangle(TOPPER_POST_W, sign_y0 + BUMP + 10 - post_bottom)
    cut += posts.sketch
    cy = sign_y0 + BUMP + TOPPER_H / 2
    lettering = text(SIGN_TEXT, 0, cy, 30)
    half = lettering.bounding_box().size.X / 2
    for sx in (-1, 1):
        cut -= heart(sx * (half + 14), cy + 1, 16)
    return cut, lettering


def table_sketches():
    """(cut, lettering) for the standing how-to sign, in its own plane: X across, Y up."""
    cut = scalloped_rect(0, TABLE_H / 2, TABLE_W, TABLE_H - 2 * BUMP, BUMP)
    with bd.BuildSketch() as below:  # flat bottom edge to sit in the base's slot
        with bd.Locations((0, -50)):
            bd.Rectangle(2 * TABLE_W, 100 + BUMP)
    cut -= below.sketch
    lines = ["selfie booth", "1  pick your photos", "2  pick a pattern", "3  smile!", "4  grab your print"]
    title_y = TABLE_H - 30
    lettering = text(lines[0], 0, title_y, 22)
    half = lettering.bounding_box().size.X / 2
    for i, line in enumerate(lines[1:]):
        lettering += text(line, 0, title_y - 34 - i * 25, 15)  # last line stays well above the base's slot
    for sx in (-1, 1):
        cut -= heart(sx * (half + 12), title_y + 1, 12)
    return cut, lettering


def raised(cut, lettering, thickness):
    plate = bd.extrude(cut, amount=thickness)
    return plate + bd.extrude(lettering, amount=LETTER_H).moved(bd.Location((0, 0, thickness)))


def table_base():
    """A block with a slot that holds the table sign tilted back."""
    block = bd.Box(TABLE_W * 0.8, BASE_D, BASE_H, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    slot = bd.Box(TABLE_W + 2, TABLE_T + 0.5, 60, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN))
    slot = slot.rotate(bd.Axis.X, -TABLE_TILT).moved(bd.Location((0, 0, BASE_H - SLOT_DEPTH)))
    return block - slot


@threemf(out="../3MF/sign_topper_print.3mf")
def sign_topper_print():
    part = raised(*topper_sketches(), TOPPER_T)
    part.label = "sign_topper"
    return part


@threemf(out="../3MF/table_sign_print.3mf")
def table_sign_print():
    part = raised(*table_sketches(), TABLE_T)
    part.label = "table_sign"
    return part


@threemf(out="../3MF/table_sign_base_print.3mf")
def table_sign_base_print():
    part = table_base()
    part.label = "table_sign_base"
    return part


if __name__ == "__main__":
    sign_topper_print()
    table_sign_print()
    table_sign_base_print()
