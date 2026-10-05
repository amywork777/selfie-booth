"""The laser-cut convention box, built as 3D plywood parts so fit can be checked before cutting.

Finger joints: each panel starts as a full slab; where two panels overlap along an edge, the overlap
is split into fingers and each finger is kept by one panel and cut from the other. The front panel
keeps the corners, so its outline is clean from the front.
"""

from __future__ import annotations

from cadgen import build123d as bd
from cadgen import srgb, step

from box_dims import (
    D, DIVIDER_X, FINGER, H, INSERT_HOLE, IPAD_CORNER_R, IPAD_CX, IPAD_CZ, IPAD_FRAME, IPAD_H, WINDOW_H, WINDOW_W,
    IPAD_T, IPAD_W, LABELS_D, LABELS_H, LABELS_W, MBP_D, MBP_H, MBP_W, POST, POST_LAYERS, PRINTER_CX,
    PRINTER_D, PRINTER_H, PRINTER_W, PRINTER_Y0, PRINTER_ZONE_X0, PRINTER_ZONE_X1,
    BAY_Z0, DECK_TOP, SIGN_CZ, SIGN_D, SLOT_BEZEL, SLOT_W, SLOT_Z0, SLOT_Z1, T, THUMB_SCREW_HOLE, W,
)
from panels import heart, text

TAB = 30.0  # tab length for the divider's and deck's tabs
POCKET_MARGIN = 14.0  # plywood round the iPad in the pocket plate
IPAD_FIT = 0.6  # clearance round the iPad in its pocket


def box(x0, x1, y0, y1, z0, z1):
    return bd.Box(x1 - x0, y1 - y0, z1 - z0, align=bd.Align.MIN).moved(bd.Location((x0, y0, z0)))


def bbox(shape):
    b = shape.bounding_box()
    return (b.min.X, b.max.X, b.min.Y, b.max.Y, b.min.Z, b.max.Z)


def finger_joint(parts, a, b):
    """Split the overlap of slabs a and b into an odd number of fingers along its long axis; a keeps
    the even ones (including both ends), b keeps the odd ones."""
    ax0, ax1, ay0, ay1, az0, az1 = bbox(parts[a])
    bx0, bx1, by0, by1, bz0, bz1 = bbox(parts[b])
    lo = (max(ax0, bx0), max(ay0, by0), max(az0, bz0))
    hi = (min(ax1, bx1), min(ay1, by1), min(az1, bz1))
    sizes = [hi[i] - lo[i] for i in range(3)]
    axis = sizes.index(max(sizes))
    n = max(3, round(sizes[axis] / FINGER))
    n += 1 - n % 2  # odd, so a owns both ends
    step_len = sizes[axis] / n
    for i in range(n):
        s0, s1 = list(lo), list(hi)
        s0[axis] = lo[axis] + i * step_len
        s1[axis] = lo[axis] + (i + 1) * step_len
        seg = box(s0[0], s1[0], s0[1], s1[1], s0[2], s1[2])
        if i % 2 == 0:
            parts[b] = parts[b] - seg
        else:
            parts[a] = parts[a] - seg


def ipad_box():
    """Where the iPad sits: face against the back of the front panel."""
    return (IPAD_CX - IPAD_W / 2, IPAD_CX + IPAD_W / 2, T, T + IPAD_T, IPAD_CZ - IPAD_H / 2, IPAD_CZ + IPAD_H / 2)


def front_sketch_features():
    """iPad window and print slot, as solids to cut through the front panel."""
    with bd.BuildSketch(bd.Plane.XZ) as cuts:
        with bd.Locations((IPAD_CX, IPAD_CZ)):
            bd.RectangleRounded(WINDOW_W, WINDOW_H, IPAD_CORNER_R - 2.5)
        with bd.Locations((PRINTER_CX, (SLOT_Z0 + SLOT_Z1) / 2)):
            bd.RectangleRounded(SLOT_W, SLOT_Z1 - SLOT_Z0, 8)
    # Plane.XZ's normal points to -Y; extrude back through the panel.
    return bd.extrude(cuts.sketch, amount=-(T + 1))


def make_parts():
    parts = {
        "front": box(0, W, 0, T, 0, H),
        "left": box(0, T, 0, D - T, 0, H),
        "right": box(W - T, W, 0, D - T, 0, H),
        "bottom": box(0, W, 0, D - T, 0, T),
        "top": box(0, W, 0, D - T, H - T, H),
    }
    for a, b in [("front", "left"), ("front", "right"), ("front", "bottom"), ("front", "top"),
                 ("bottom", "left"), ("bottom", "right"), ("top", "left"), ("top", "right")]:
        finger_joint(parts, a, b)

    # Deck across the whole box over the MacBook's bay; its tabs go through slots in both side walls.
    parts["deck"] = box(T, W - T, T, D - T, BAY_Z0, DECK_TOP)
    for x0 in (0, W - T):
        for y in (D * 0.3, D * 0.7):
            tab = box(x0, x0 + T, y - TAB / 2, y + TAB / 2, BAY_Z0, DECK_TOP)
            parts["deck"] = parts["deck"] + tab
            parts["left" if x0 == 0 else "right"] = parts["left" if x0 == 0 else "right"] - tab
    # Cable holes down to the MacBook, at the back of each side: the iPad's and the printer's cables.
    for cx in (IPAD_CX, PRINTER_CX):
        parts["deck"] = parts["deck"] - box(cx - 22, cx + 22, D - T - 40, D - T - 12, BAY_Z0 - 1, DECK_TOP + 1)

    # Divider between the iPad side and the printer side, standing on the deck; the top glues onto it.
    parts["divider"] = box(DIVIDER_X, DIVIDER_X + T, T, D - T, DECK_TOP, H - T)
    for y in (D * 0.3, D * 0.7):
        tab = box(DIVIDER_X, DIVIDER_X + T, y - TAB / 2, y + TAB / 2, BAY_Z0, DECK_TOP)
        parts["divider"] = parts["divider"] + tab
        parts["deck"] = parts["deck"] - tab

    # Front: iPad window and print slot.
    parts["front"] = parts["front"] - front_sketch_features()

    # iPad pocket plate (glued to the back of the front panel) and the backing plate that holds it in.
    ix0, ix1, _, _, iz0, iz1 = ipad_box()
    m = POCKET_MARGIN
    pocket = box(ix0 - m, ix1 + m, T, 2 * T, iz0 - m, iz1 + m) - box(ix0 - IPAD_FIT, ix1 + IPAD_FIT, T - 1, 2 * T + 1, iz0 - IPAD_FIT, iz1 + IPAD_FIT)
    backing = box(ix0 - m, ix1 + m, 2 * T + 0.3, 3 * T + 0.3, iz0 - m, iz1 + m)
    screw_pts = [(ix0 - m / 2, iz0 - m / 2), (ix1 + m / 2, iz0 - m / 2), (ix0 - m / 2, iz1 + m / 2), (ix1 + m / 2, iz1 + m / 2)]
    for x, z in screw_pts:
        hole = bd.Cylinder(1.6, 4 * T, rotation=(90, 0, 0)).moved(bd.Location((x, 2 * T, z)))
        backing = backing - hole
        pocket = pocket - bd.Cylinder(1.2, 4 * T, rotation=(90, 0, 0)).moved(bd.Location((x, 2 * T, z)))
    # Notch in the backing plate for the USB-C cable at the iPad's bottom edge, and a big heart window.
    backing = backing - box(IPAD_CX - 15, IPAD_CX + 15, 2 * T, 4 * T, iz0 - m - 1, iz0 + 12)
    with bd.BuildSketch(bd.Plane.XZ) as hw:
        bd.add(heart(IPAD_CX, IPAD_CZ + 6, 92))
    backing = backing - bd.extrude(hw.sketch, amount=-(4 * T))
    parts["ipad_pocket"] = pocket
    parts["ipad_backing"] = backing

    # Raised frame round the iPad window, glued on the front face, so the screen stands out.
    with bd.BuildSketch(bd.Plane.XZ) as fr:
        with bd.Locations((IPAD_CX, IPAD_CZ)):
            bd.RectangleRounded(WINDOW_W + 2 * IPAD_FRAME, WINDOW_H + 2 * IPAD_FRAME, IPAD_CORNER_R - 2.5 + IPAD_FRAME)
            bd.RectangleRounded(WINDOW_W, WINDOW_H, IPAD_CORNER_R - 2.5, mode=bd.Mode.SUBTRACT)
    parts["ipad_frame"] = bd.extrude(fr.sketch, amount=T)

    # Raised bezel round the print slot, and the round sign, glued on the front face.
    with bd.BuildSketch(bd.Plane.XZ) as bz:
        with bd.Locations((PRINTER_CX, (SLOT_Z0 + SLOT_Z1) / 2)):
            bd.RectangleRounded(SLOT_W + 2 * SLOT_BEZEL, SLOT_Z1 - SLOT_Z0 + 2 * SLOT_BEZEL, 8 + SLOT_BEZEL)
            bd.RectangleRounded(SLOT_W, SLOT_Z1 - SLOT_Z0, 8, mode=bd.Mode.SUBTRACT)
    parts["slot_bezel"] = bd.extrude(bz.sketch, amount=T)  # Plane.XZ normal is -Y: sits in front of the panel
    parts["sign_disc"] = bd.Cylinder(SIGN_D / 2, T, rotation=(90, 0, 0), align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)).moved(
        bd.Location((PRINTER_CX, 0, SIGN_CZ))
    )

    # Corner posts at the back for the thumb screws, three layers each, glued into the corners.
    posts = []
    for x0 in (T, W - T - POST):
        for z0 in (T, H - T - POST):
            post = box(x0, x0 + POST, D - T - POST_LAYERS * T, D - T, z0, z0 + POST)
            post = post - bd.Cylinder(INSERT_HOLE / 2, POST_LAYERS * T + 2, rotation=(90, 0, 0)).moved(
                bd.Location((x0 + POST / 2, D - T - POST_LAYERS * T / 2, z0 + POST / 2))  # through all layers
            )
            posts.append(post)
    parts["posts"] = bd.Compound(posts)

    # Back panel: thumb-screw holes, cable notch, heart vents.
    back = box(0, W, D - T, D, 0, H)
    for x0 in (T, W - T - POST):
        for z0 in (T, H - T - POST):
            back = back - bd.Cylinder(THUMB_SCREW_HOLE / 2, T + 2, rotation=(90, 0, 0)).moved(
                bd.Location((x0 + POST / 2, D - T / 2, z0 + POST / 2))
            )
    back = back - box(PRINTER_CX - 30, PRINTER_CX + 30, D - T - 1, D + 1, -1, 22)  # power cords out
    with bd.BuildSketch(bd.Plane.XZ) as vents:
        for i, x in enumerate((PRINTER_CX - 60, PRINTER_CX, PRINTER_CX + 60)):
            for z in (95, 150):
                bd.add(heart(x, z + (8 if i % 2 else 0), 34))
    back = back - bd.extrude(vents.sketch, amount=-(D + 1))
    parts["back"] = back

    # Air for the closed MacBook: small hearts low in both side walls and along the bottom of the back.
    with bd.BuildSketch(bd.Plane.YZ) as side_vents:
        for i, y in enumerate(range(40, int(D - 40), 34)):
            bd.add(heart(y, T + 10 + (2 if i % 2 else 0), 16))
    side_cut = bd.extrude(side_vents.sketch, amount=W + 1)
    parts["left"] = parts["left"] - side_cut
    parts["right"] = parts["right"] - side_cut
    with bd.BuildSketch(bd.Plane.XZ) as back_vents:
        for i, x in enumerate(range(40, int(W - 30), 30)):
            if abs(x - PRINTER_CX) > 40:  # leave the cord notch alone
                bd.add(heart(x, T + 10 + (2 if i % 2 else 0), 16))
    parts["back"] = parts["back"] - bd.extrude(back_vents.sketch, amount=-(D + 1))

    return parts


def standins():
    """Not parts: the things that go inside, for checking fit."""
    ix0, ix1, iy0, iy1, iz0, iz1 = ipad_box()
    deck_top = DECK_TOP
    return {
        "rollo_standin": box(PRINTER_CX - PRINTER_W / 2, PRINTER_CX + PRINTER_W / 2, PRINTER_Y0, PRINTER_Y0 + PRINTER_D, deck_top, deck_top + PRINTER_H),
        "labels_standin": box(PRINTER_CX - LABELS_W / 2, PRINTER_CX + LABELS_W / 2, PRINTER_Y0 + PRINTER_D + 6, PRINTER_Y0 + PRINTER_D + 6 + LABELS_D, deck_top, deck_top + LABELS_H),
        "macbook_standin": box(W / 2 - MBP_W / 2, W / 2 + MBP_W / 2, T + 10, T + 10 + MBP_D, T, T + MBP_H),
        "ipad_standin": box(ix0, ix1, iy0, iy1, iz0, iz1),
    }


COLOURS = {
    "front": "#E9C9A0", "back": "#D9B68A", "left": "#E2BF93", "right": "#E2BF93", "top": "#EDD0A8",
    "bottom": "#D4AE80", "divider": "#CFA676", "deck": "#CFA676", "ipad_pocket": "#C99D6B",
    "ipad_backing": "#C29462", "slot_bezel": "#F0D7B4", "sign_disc": "#F7EBC8", "posts": "#B98A58",
    "ipad_frame": "#F0D7B4", "rollo_standin": "#F2F2F2", "labels_standin": "#FFFFFF", "macbook_standin": "#B8BCC2",
    "ipad_standin": "#2B2B2E",
}


@step(out="../STEP/box.step")
def box_assembly():
    children = []
    for name, shape in {**make_parts(), **standins()}.items():
        shape.label = name
        shape.color = srgb(COLOURS[name])
        children.append(shape)
    return bd.Compound(children=children, label="selfie_booth_box")


if __name__ == "__main__":
    box_assembly()
