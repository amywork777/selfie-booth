"""Shared dimensions for the selfie booth stand (millimetres).

World frame: table top is Z=0, the printer is centred on X=0, its front face is Y=0 and it
extends back toward +Y.
"""

# Rollo X1038 (USB). Published spec: 195 W x 75 D x 85 H mm (Rollo lists 8 x 4 x 4 in, rounded up).
# The stand only depends on width and height; depth and the label exit are deliberately left free.
PRINTER_W = 195.0
PRINTER_D = 75.0
PRINTER_H = 85.0

# iPad mini 6 / 7 (same body). Apple: 195.4 x 134.8 x 6.3 mm.
IPAD_H = 195.4  # portrait height
IPAD_W = 134.8
IPAD_T = 6.3
SCREEN_H = 176.4  # active area, 2266 x 1488 px at 326 ppi
SCREEN_W = 115.9
SCREEN_R = 18.0  # rounded display corners
CAMERA_FROM_TOP = 4.7  # front camera centre, from the top edge in portrait

# Saddle (printed part 1): two legs straddling the printer and a deck over it.
SIDE_CLEAR = 3.0  # each side of the printer
TOP_CLEAR = 6.0  # above the printer
LEG_T = 5.0
DECK_T = 4.0
LEG_Y0 = -8.0  # legs stand a little proud of the printer front, to carry the front plate
LEG_Y1 = 100.0  # and run past its back for a deep, stable footprint
DECK_Y0 = 25.0  # deck starts behind the printer's front edge so a label can exit front or top
INNER_HALF = PRINTER_W / 2 + SIDE_CLEAR
OUTER_HALF = INNER_HALF + LEG_T
DECK_Z0 = PRINTER_H + TOP_CLEAR
DECK_Z1 = DECK_Z0 + DECK_T

# Cradle (printed part 2), built in its own frame then tilted back.
TILT_DEG = 15.0
IPAD_CLEAR = 0.6  # around the iPad in the pocket
LIP_T = 3.0  # front lip thickness: the bezel sits on this face
LIP_H = 9.0  # just covers the iPad's lower bezel
FLOOR_T = 4.0
BACK_T = 4.0
BACK_H = 150.0
WALL_T = 6.0
WALL_H = 125.0
CABLE_NOTCH_W = 34.0  # USB-C is centred on the bottom edge in portrait
POCKET_W = IPAD_W + 2 * IPAD_CLEAR
POCKET_DEPTH = IPAD_T + 0.8  # front lip to back plate
WALL_X = POCKET_W / 2 + WALL_T / 2  # centreline of each side wall

# M3 screws join the cradle to the deck.
SCREW_HOLE_D = 3.4  # clearance through the deck
SCREW_PILOT_D = 2.6  # self-tapping into the cradle base
SCREW_SPACING_X = 90.0

# Hanging pegs for the laser-cut panels, and the matching keyhole slots.
PANEL_T = 3.0  # laser-cut sheet thickness
PEG_D = 4.0
PEG_HEAD_D = 7.0
PEG_HEAD_T = 2.0
PEG_LEN = PANEL_T + 0.6  # shaft length, so the panel slides on with a little play
KEYHOLE_D = PEG_HEAD_D + 0.8
KEYHOLE_SLOT_W = PEG_D + 0.4
KEYHOLE_DROP = 9.0  # head goes in the big hole, then the panel drops this far onto the shaft

# Pegs on the front of the legs (front plate) and on the cradle side walls (bezel).
FRONT_PEG_Z = (22.0, 72.0)
FRONT_PEG_X = OUTER_HALF - LEG_T / 2
BEZEL_PEG_Z = (35.0, 112.0)  # along the cradle, from its front-bottom edge
