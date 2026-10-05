"""Dimensions for the laser-cut convention box (millimetres).

Everything sits inside: a 14 in MacBook Pro closed, flat in a bay across the bottom; above it a deck
carrying the iPad behind a front window, and the Rollo behind a print slot with its labels behind
it. The back comes off with four thumb
screws. Every panel fits a Glowforge bed (495 x 279 mm) in one piece.

World frame: X across the front (left to right as you face it), Y from the front face (0) to the
back, Z up from the table.
"""

T = 6.0  # plywood thickness (1/4 in). Change for other sheet and rebuild.
KERF = 0.1  # half the laser kerf, added to tabs so finger joints fit snugly

# Outer box.
W, H, D = 393.0, 270.0, 265.0
FINGER = 30.0  # target finger length along a joint

# Contents.
PRINTER_W, PRINTER_D, PRINTER_H = 195.0, 75.0, 85.0  # Rollo X1038, published specs
MBP_W, MBP_D, MBP_H = 312.6, 221.2, 15.5  # 14 in MacBook Pro, closed (M1 Pro to M4)
LABELS_W, LABELS_D, LABELS_H = 106.0, 154.0, 70.0  # a stack of 4 x 6 fanfold labels
IPAD_W, IPAD_H, IPAD_T = 134.8, 195.4, 6.3  # iPad mini 6 / 7, portrait
IPAD_CORNER_R = 19.0  # rounded body corners
CAMERA_FROM_TOP = 4.7  # front camera centre, from the top edge in portrait

# The window shows the whole iPad face except a thin lip that keeps it from coming out the front.
# The camera sits inside the window, so it needs no hole of its own.
WINDOW_LIP = 2.5
WINDOW_W, WINDOW_H = IPAD_W - 2 * WINDOW_LIP, IPAD_H - 2 * WINDOW_LIP
IPAD_FRAME = 16.0  # width of the raised frame glued round the window

# Layout.
IPAD_ZONE = 175.0  # inside width of the iPad side, left of the divider
DIVIDER_X = T + IPAD_ZONE  # left face of the divider
PRINTER_ZONE_X0 = DIVIDER_X + T  # printer side, between divider and right wall
PRINTER_ZONE_X1 = W - T
PRINTER_CX = (PRINTER_ZONE_X0 + PRINTER_ZONE_X1) / 2
BAY_Z0 = T + MBP_H + 8.5  # deck underside: the MacBook's bay below, with air above it
DECK_TOP = BAY_Z0 + T  # the printer, labels and divider stand on the deck
PRINTER_Y0 = T + 3.0  # printer front, just behind the front panel so the label reaches the slot
IPAD_CX = T + IPAD_ZONE / 2
IPAD_CZ = 150.0  # iPad centre height: its pocket clears the deck

# Print slot. LABEL_EXIT_Z is how high above the table the label leaves the printer, measured with the
# printer standing on a table. Rollo doesn't publish it: measure yours and set it here; the slot follows.
LABEL_EXIT_Z = 70.0  # estimate until measured
SLOT_W = 122.0  # a 4.1 in label is 104 mm wide
SLOT_HALF_H = 12.0  # slot runs this far above and below the exit
SLOT_Z0 = DECK_TOP + LABEL_EXIT_Z - SLOT_HALF_H
SLOT_Z1 = DECK_TOP + LABEL_EXIT_Z + SLOT_HALF_H
SLOT_BEZEL = 10.0  # raised surround

# Round sign above the slot.
SIGN_D = 104.0
SIGN_CZ = 195.0

# Back panel: four thumb screws into corner posts.
POST = 22.0  # square corner posts, three layers deep
POST_LAYERS = 3
THUMB_SCREW_HOLE = 4.6  # M4 thumb screw clearance in the back panel
INSERT_HOLE = 5.6  # M4 threaded insert pressed into the posts
