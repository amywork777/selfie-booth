"""3D-printable versions of the two panels, for when there's no laser cutter.

Same outlines, holes and keyholes as the DXFs, PRINT_PANEL_T thick, with the lettering raised on the front
face. Print flat, lettering up. For two colours, add a filament change at the first layer above
PRINT_PANEL_T in Bambu Studio.
"""

from cadgen import build123d as bd
from cadgen import threemf

from bezel import bezel_sketches
from dims import PRINT_PANEL_T
from front_plate import front_plate_sketches

LETTER_H = 0.8  # how far the lettering stands up


def printed(cut: bd.Sketch, lettering: bd.Sketch) -> bd.Part:
    plate = bd.extrude(cut, amount=PRINT_PANEL_T)
    raised = bd.extrude(lettering, amount=LETTER_H).moved(bd.Location((0, 0, PRINT_PANEL_T)))
    return plate + raised


@threemf(out="../3MF/bezel_print.3mf")
def bezel_print():
    part = printed(*bezel_sketches())
    part.label = "bezel"
    return part


@threemf(out="../3MF/front_plate_print.3mf")
def front_plate_print():
    part = printed(*front_plate_sketches())
    part.label = "front_plate"
    return part


if __name__ == "__main__":
    bezel_print()
    front_plate_print()
