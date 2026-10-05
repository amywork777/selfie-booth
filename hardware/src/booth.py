"""The whole booth for review: every part placed together, with stand-in blocks for the Rollo and the
iPad so fit and clearances can be checked. The stand-in blocks are not parts to make.
"""

import math

from cadgen import build123d as bd
from cadgen import srgb, step

from bezel import bezel_sketches
from cradle import DEPTH, cradle, tilted
from dims import (
    DECK_Y0, DECK_Z1, FLOOR_T, IPAD_CLEAR, IPAD_H, IPAD_T, IPAD_W, LEG_Y0, LIP_T, OUTER_HALF, PANEL_T,
    PRINTER_D, PRINTER_H, PRINTER_W, TOPPER_FIT, TOPPER_T,
)
from front_plate import front_plate_sketches
from saddle import saddle
from signs import BASE_H, SLOT_DEPTH, TABLE_T, TABLE_TILT, raised, table_base, table_sketches, topper_sketches

PINK, ROSE, CREAM, INK = "#FFB2D9", "#FF6FA3", "#FFF8D6", "#3A2A47"


def cradle_at():
    """Where the cradle sits: its lip's front-bottom edge on the deck's front edge."""
    return bd.Location((0, DECK_Y0, DECK_Z1))


def standing(cut, lettering, thickness):
    """A flat panel (drawn X across, Y up) stood up in the XZ plane, its back face at Y=0, front toward -Y."""
    return raised(cut, lettering, thickness).rotate(bd.Axis.X, 90)


def ipad_block():
    block = bd.Box(IPAD_W, IPAD_T, IPAD_H, align=(bd.Align.CENTER, bd.Align.MIN, bd.Align.MIN))
    return cradle_at() * tilted(block.moved(bd.Location((0, LIP_T + IPAD_CLEAR / 2, FLOOR_T))))


def coloured(shape, label, colour):
    shape.label = label
    shape.color = srgb(colour)
    return shape


@step(out="../STEP/booth.step")
def booth():
    printer = bd.Box(PRINTER_W, PRINTER_D, PRINTER_H, align=(bd.Align.CENTER, bd.Align.MIN, bd.Align.MIN))
    parts = [
        coloured(saddle(), "saddle", PINK),
        coloured(cradle_at() * cradle(), "cradle", ROSE),
        coloured(printer, "rollo_x1038_standin", "#F2F2F2"),
        coloured(ipad_block(), "ipad_mini_standin", "#2B2B2E"),
        # Bezel: on the cradle's front face (y' = 0), in front of the iPad.
        coloured(cradle_at() * tilted(standing(*bezel_sketches(), PANEL_T)), "bezel", CREAM),
        # Front plate: hangs on the leg pegs, back face against the legs' front.
        coloured(standing(*front_plate_sketches(), PANEL_T).moved(bd.Location((0, LEG_Y0, 0))), "front_plate", CREAM),
        # Topper: posts in the sleeves on the back of the cradle.
        coloured(
            cradle_at() * tilted(standing(*topper_sketches(), TOPPER_T).moved(bd.Location((0, DEPTH + TOPPER_FIT / 2 + TOPPER_T, 0)))),
            "sign_topper",
            ROSE,
        ),
    ]
    # Table sign beside the booth: the plate sits in its base's slot, tilted back.
    table_at = bd.Location((OUTER_HALF + 95, 30, 0))
    plate = standing(*table_sketches(), TABLE_T).moved(bd.Location((0, TABLE_T / 2, 0)))
    plate = plate.rotate(bd.Axis.X, -TABLE_TILT).moved(bd.Location((0, 0, BASE_H - SLOT_DEPTH)))
    parts += [coloured(table_at * plate, "table_sign", CREAM), coloured(table_at * table_base(), "table_sign_base", PINK)]
    return bd.Compound(children=parts, label="selfie_booth")


if __name__ == "__main__":
    booth()
