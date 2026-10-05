"""Print-ready layout for the Bambu (256 x 256 mm plate): the saddle flipped deck-down so its legs
grow straight up with no bridging, and the cradle standing on its base beside it."""

from cadgen import build123d as bd
from cadgen import threemf

from cradle import cradle
from dims import DECK_Z1
from saddle import saddle


@threemf(out="../3MF/saddle_print.3mf")
def saddle_print():
    part = saddle().rotate(bd.Axis.X, 180).moved(bd.Location((0, 0, DECK_Z1)))
    part.label = "saddle_deck_down"
    return part


if __name__ == "__main__":
    saddle_print()
