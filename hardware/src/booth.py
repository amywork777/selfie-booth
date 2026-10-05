"""The whole booth for review: saddle and cradle placed together, with stand-in blocks for the Rollo
and the iPad so fit and clearances can be checked. The blocks are not parts to make.
"""

import math

from cadgen import build123d as bd
from cadgen import srgb, step

from cradle import cradle
from dims import (
    DECK_Y0, DECK_Z1, FLOOR_T, IPAD_CLEAR, IPAD_H, IPAD_T, IPAD_W, LIP_T, PRINTER_D, PRINTER_H, PRINTER_W,
    TILT_DEG,
)
from saddle import saddle


def cradle_at():
    """Where the cradle sits: its lip's front-bottom edge on the deck's front edge."""
    return bd.Location((0, DECK_Y0, DECK_Z1))


def ipad_block():
    """The iPad sitting in the cradle pocket, in world coordinates."""
    tilt = math.radians(TILT_DEG)
    lift = (LIP_T + IPAD_T + 0.8 + 5.0) * math.sin(tilt)  # same lift the cradle applies (DEPTH * sin)
    block = bd.Box(IPAD_W, IPAD_T, IPAD_H, align=(bd.Align.CENTER, bd.Align.MIN, bd.Align.MIN))
    block = block.moved(bd.Location((0, LIP_T + IPAD_CLEAR / 2, FLOOR_T)))
    return cradle_at() * block.rotate(bd.Axis.X, -TILT_DEG).moved(bd.Location((0, 0, lift)))


@step(out="../STEP/booth.step")
def booth():
    printer = bd.Box(PRINTER_W, PRINTER_D, PRINTER_H, align=(bd.Align.CENTER, bd.Align.MIN, bd.Align.MIN))
    printer.label = "rollo_x1038_standin"
    printer.color = srgb("#F2F2F2")
    ipad = ipad_block()
    ipad.label = "ipad_mini_standin"
    ipad.color = srgb("#2B2B2E")
    stand = saddle()
    stand.color = srgb("#FFB2D9")
    holder = cradle_at() * cradle()
    holder.label = "cradle"
    holder.color = srgb("#FF6FA3")
    return bd.Compound(children=[stand, holder, printer, ipad], label="selfie_booth")


if __name__ == "__main__":
    booth()
