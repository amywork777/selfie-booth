"""Dimensions for the laser-cut convention box (millimetres).

Nine pieces of plywood, no screws or hardware, just glue. A 14 in MacBook Pro lies closed in a bay
across the bottom; a deck over it carries the iPad (standing on the deck, pressed against the window
by one holder plate) and the Rollo behind a print slot, with its labels behind it. The back drops
into slots in the floor and is held by a lock bar that slides through both side walls. Every piece
fits a Glowforge bed (495 x 279 mm).

World frame: X across the front (left to right as you face it), Y from the front face (0) to the
back, Z up from the table.
"""

# Plywood thickness: 6 mm for the Glowforge. Measure yours: real plywood varies. (box_sendcutsend.py
# rebuilds at 6.35 mm, SendCutSend's 1/4 in birch, by rewriting this line while it runs.)
T = 6.0
SLOT_FIT = 0.25  # each side, so a tab still goes through a slot when the sheet comes out a bit thick

# Outer box.
W, H, D = 393.0, 270.0, 265.0
FINGER = 30.0  # target finger length along a joint
TAB = 30.0  # tab length where one piece passes through another

# Contents.
PRINTER_W, PRINTER_D, PRINTER_H = 195.0, 75.0, 85.0  # Rollo X1038, published specs
MBP_W, MBP_D, MBP_H = 312.6, 221.2, 15.5  # 14 in MacBook Pro, closed (M1 Pro to M4)
LABELS_W, LABELS_D, LABELS_H = 106.0, 154.0, 70.0  # a stack of 4 x 6 fanfold labels
IPAD_W, IPAD_H, IPAD_T = 134.8, 195.4, 6.3  # iPad mini 6 / 7, portrait
IPAD_CORNER_R = 19.0

# Bay and deck.
BAY_Z0 = T + MBP_H + 8.5  # deck underside: the MacBook's bay below, with air above it
DECK_TOP = BAY_Z0 + T

# iPad: stands on the deck, face against the front panel; its USB-C cable plugs straight down through
# a notch in the deck's front edge, which also keeps it from sliding sideways.
IPAD_CX = T + 20.0 + IPAD_W / 2
IPAD_Z0 = DECK_TOP
IPAD_CZ = IPAD_Z0 + IPAD_H / 2
CABLE_NOTCH_W, CABLE_NOTCH_D = 24.0, 12.0
WINDOW_LIP = 2.5  # the front panel overlaps the iPad by this much all round, so it can't come out
WINDOW_W, WINDOW_H = IPAD_W - 2 * WINDOW_LIP, IPAD_H - 2 * WINDOW_LIP
FRAME_BAND = 14.0  # engraved band round the window
HOLDER_FIT = 0.4  # gap between the iPad's back and the holder plate

# Printer side.
PRINTER_CX = W - T - 8.0 - PRINTER_W / 2
PRINTER_Y0 = T + 3.0  # printer front, just behind the front panel

# Print slot: tall enough to catch the label wherever it leaves the upper printer front.
LABEL_EXIT_RANGE = (35.0, PRINTER_H)
SLOT_W = 130.0
SLOT_Z0 = DECK_TOP + LABEL_EXIT_RANGE[0]
SLOT_Z1 = DECK_TOP + LABEL_EXIT_RANGE[1] + 5.0

# Engraved round sign above the slot.
SIGN_D = 104.0
SIGN_CZ = 195.0

# Back: inset from the rear by two thicknesses, so the lock bar runs behind it, inside the side walls.
BACK_Y0 = D - 3 * T
BAR_Y0 = D - 2 * T
BAR_H = 16.0
BAR_Z0 = H - T - 12.0 - BAR_H
BAR_FIT = 0.3  # sliding clearance in the side-wall slots
