"""Dimensions for the laser-cut convention box (millimetres).

Everything sits inside: iPad behind a front window, Rollo on a shelf behind a print slot, labels
behind the printer, 2024 Mac mini on the floor under the shelf. The back comes off with four thumb
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
MAC_W, MAC_D, MAC_H = 127.0, 127.0, 50.0  # 2024 Mac mini (M4)
LABELS_W, LABELS_D, LABELS_H = 106.0, 154.0, 70.0  # a stack of 4 x 6 fanfold labels
IPAD_W, IPAD_H, IPAD_T = 134.8, 195.4, 6.3  # iPad mini 6 / 7, portrait
SCREEN_W, SCREEN_H, SCREEN_R = 115.9, 176.4, 18.0
CAMERA_FROM_TOP = 4.7

# Layout.
IPAD_ZONE = 175.0  # inside width of the iPad side, left of the divider
DIVIDER_X = T + IPAD_ZONE  # left face of the divider
PRINTER_ZONE_X0 = DIVIDER_X + T  # printer side, between divider and right wall
PRINTER_ZONE_X1 = W - T
PRINTER_CX = (PRINTER_ZONE_X0 + PRINTER_ZONE_X1) / 2
SHELF_Z = T + MAC_H + 8.0  # shelf underside: Mac mini plus air above it
PRINTER_Y0 = T + 3.0  # printer front, just behind the front panel so the label reaches the slot
IPAD_CX = T + IPAD_ZONE / 2
IPAD_CZ = 140.0  # iPad centre height

# Print slot: sized for a 4.1 in label leaving the front of the printer near its top. The exact exit
# height isn't published, so the slot is generous; see the README.
SLOT_W = 122.0
SLOT_Z0 = SHELF_Z + T + PRINTER_H - 30.0
SLOT_Z1 = SHELF_Z + T + PRINTER_H + 4.0
SLOT_BEZEL = 10.0  # raised surround

# Round sign above the slot.
SIGN_D = 86.0
SIGN_CZ = 218.0

# Back panel: four thumb screws into corner posts.
POST = 22.0  # square corner posts, three layers deep
POST_LAYERS = 3
THUMB_SCREW_HOLE = 4.6  # M4 thumb screw clearance in the back panel
INSERT_HOLE = 5.6  # M4 threaded insert pressed into the posts

# Feet lift the box for the Mac mini's air intake underneath.
FOOT_D = 32.0
FOOT_LAYERS = 2
