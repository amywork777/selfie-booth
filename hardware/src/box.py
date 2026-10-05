"""The laser-cut convention box: nine plywood pieces, no screws, built in 3D so fit can be checked
before cutting.

Finger joints: each panel starts as a full slab; where two panels overlap along an edge, the overlap
is split into fingers and each finger is kept by one panel and cut from the other. The front panel
keeps the corners, so its outline is clean from the front. Glue the box; the back stays removable.
"""

from __future__ import annotations

from cadgen import build123d as bd
from cadgen import srgb, step

from box_dims import (
    BACK_Y0, BAR_FIT, BAR_H, BAR_Y0, BAR_Z0, BAY_Z0, CABLE_NOTCH_D, CABLE_NOTCH_W, D, DECK_TOP, FINGER, H,
    HOLDER_FIT, IPAD_CORNER_R, IPAD_CX, IPAD_CZ, IPAD_H, IPAD_T, IPAD_W, IPAD_Z0, LABELS_D, LABELS_H, LABELS_W,
    MBP_D, MBP_H, MBP_W, PRINTER_CX, PRINTER_D, PRINTER_H, PRINTER_W, PRINTER_Y0, SLOT_W, SLOT_Z0, SLOT_Z1, T,
    TAB, W, WINDOW_H, WINDOW_W,
)
from panels import heart

HOLDER_W, HOLDER_H = 110.0, 140.0  # plate behind the iPad
BAR_KNOB = 34.0  # heart-shaped handle on the lock bar, wider than its slot so it stops there


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


def through_tab(parts, tabbed, slotted, tab):
    """A tab on one piece passing through a matching slot in another."""
    parts[tabbed] = parts[tabbed] + tab
    parts[slotted] = parts[slotted] - tab


def xz_cut(sketch, y0, depth):
    """Extrude a sketch drawn in front-view (X, Z) coordinates from Y=y0 back by `depth`."""
    return bd.extrude(sketch, amount=-depth).moved(bd.Location((0, y0, 0)))  # Plane.XZ faces -Y


def front_openings():
    """iPad window and print slot, to cut through the front panel."""
    with bd.BuildSketch(bd.Plane.XZ) as cuts:
        with bd.Locations((IPAD_CX, IPAD_CZ)):
            bd.RectangleRounded(WINDOW_W, WINDOW_H, IPAD_CORNER_R - 2.5)
        with bd.Locations((PRINTER_CX, (SLOT_Z0 + SLOT_Z1) / 2)):
            bd.RectangleRounded(SLOT_W, SLOT_Z1 - SLOT_Z0, 10)
    return xz_cut(cuts.sketch, -1, T + 2)


def make_parts():
    parts = {
        "front": box(0, W, 0, T, 0, H),
        "left": box(0, T, 0, D, 0, H),
        "right": box(W - T, W, 0, D, 0, H),
        "bottom": box(0, W, 0, D, 0, T),
        "top": box(0, W, 0, D, H - T, H),
    }
    for a, b in [("front", "left"), ("front", "right"), ("front", "bottom"), ("front", "top"),
                 ("bottom", "left"), ("bottom", "right"), ("top", "left"), ("top", "right")]:
        finger_joint(parts, a, b)
    parts["front"] = parts["front"] - front_openings()

    # Deck over the MacBook's bay, tabbed through both side walls. It stops at the back panel.
    parts["deck"] = box(T, W - T, T, BACK_Y0, BAY_Z0, DECK_TOP)
    for side, x0 in (("left", 0), ("right", W - T)):
        for y in (D * 0.3, D * 0.65):
            through_tab(parts, "deck", side, box(x0, x0 + T, y - TAB / 2, y + TAB / 2, BAY_Z0, DECK_TOP))
    # Notch for the iPad's USB-C plug, straight down; and a hole at the back for the printer's cable.
    parts["deck"] = parts["deck"] - box(IPAD_CX - CABLE_NOTCH_W / 2, IPAD_CX + CABLE_NOTCH_W / 2, T - 1, T + CABLE_NOTCH_D, BAY_Z0 - 1, DECK_TOP + 1)
    parts["deck"] = parts["deck"] - box(PRINTER_CX - 22, PRINTER_CX + 22, BACK_Y0 - 40, BACK_Y0 - 12, BAY_Z0 - 1, DECK_TOP + 1)

    # iPad holder: one plate behind the iPad, tabbed into the deck, pressing it against the window.
    hy0 = T + IPAD_T + HOLDER_FIT
    holder = box(IPAD_CX - HOLDER_W / 2, IPAD_CX + HOLDER_W / 2, hy0, hy0 + T, DECK_TOP, DECK_TOP + HOLDER_H)
    with bd.BuildSketch(bd.Plane.XZ) as hw:
        bd.add(heart(IPAD_CX, DECK_TOP + HOLDER_H / 2 + 6, 70))
    parts["ipad_holder"] = holder - xz_cut(hw.sketch, hy0 - 1, T + 2)
    for dx in (-32, 32):
        through_tab(parts, "ipad_holder", "deck", box(IPAD_CX + dx - 12, IPAD_CX + dx + 12, hy0, hy0 + T, BAY_Z0, DECK_TOP))

    # Back: sits between the side walls; two tabs drop into slots in the floor; cord notch; vents.
    parts["back"] = box(T, W - T, BACK_Y0, BACK_Y0 + T, T, H - T)
    back_tabs_x = (W * 0.28, W * 0.72)
    for x in back_tabs_x:
        through_tab(parts, "back", "bottom", box(x - TAB / 2, x + TAB / 2, BACK_Y0, BACK_Y0 + T, 0, T))
    cord_x = W / 2  # cord notch, midway between the floor tabs
    parts["back"] = parts["back"] - box(cord_x - 30, cord_x + 30, BACK_Y0 - 1, BACK_Y0 + T + 1, T - 1, T + 22)
    with bd.BuildSketch(bd.Plane.XZ) as vents:
        for i, x in enumerate((PRINTER_CX - 60, PRINTER_CX, PRINTER_CX + 60)):
            for z in (110, 165):
                bd.add(heart(x, z + (8 if i % 2 else 0), 34))
        for i, x in enumerate(range(40, int(W - 30), 30)):
            if abs(x - cord_x) > 42 and all(abs(x - tx) > 24 for tx in back_tabs_x):
                bd.add(heart(x, T + 12 + (2 if i % 2 else 0), 16))
    parts["back"] = parts["back"] - xz_cut(vents.sketch, BACK_Y0 - 1, T + 2)

    # Lock bar: slides through both side walls just behind the back panel; the heart handle stops it.
    with bd.BuildSketch(bd.Plane.XZ) as bar_sketch:
        with bd.Locations(((W - 6) / 2, BAR_Z0 + BAR_H / 2)):
            bd.Rectangle(W + 10, BAR_H)
        bd.add(heart(W + 2 + BAR_KNOB * 0.42, BAR_Z0 + BAR_H / 2, BAR_KNOB))
    parts["lock_bar"] = xz_cut(bar_sketch.sketch, BAR_Y0, T)
    for side, x0 in (("left", 0), ("right", W - T)):
        slot = box(x0 - 1, x0 + T + 1, BAR_Y0 - BAR_FIT, BAR_Y0 + T + BAR_FIT, BAR_Z0 - BAR_FIT, BAR_Z0 + BAR_H + BAR_FIT)
        parts[side] = parts[side] - slot

    # Air for the closed MacBook: small hearts low in both side walls.
    with bd.BuildSketch(bd.Plane.YZ) as side_vents:
        for i, y in enumerate(range(40, int(BACK_Y0 - 20), 34)):
            bd.add(heart(y, T + 10 + (2 if i % 2 else 0), 16))
    side_cut = bd.extrude(side_vents.sketch, amount=W + 1)
    parts["left"] = parts["left"] - side_cut
    parts["right"] = parts["right"] - side_cut
    return parts


def standins():
    """Not parts: the things that go inside, for checking fit."""
    return {
        "rollo_standin": box(PRINTER_CX - PRINTER_W / 2, PRINTER_CX + PRINTER_W / 2, PRINTER_Y0, PRINTER_Y0 + PRINTER_D, DECK_TOP, DECK_TOP + PRINTER_H),
        "labels_standin": box(PRINTER_CX - LABELS_W / 2, PRINTER_CX + LABELS_W / 2, PRINTER_Y0 + PRINTER_D + 4, PRINTER_Y0 + PRINTER_D + 4 + LABELS_D, DECK_TOP, DECK_TOP + LABELS_H),
        "macbook_standin": box(W / 2 - MBP_W / 2, W / 2 + MBP_W / 2, T + 6, T + 6 + MBP_D, T, T + MBP_H),
        "ipad_standin": box(IPAD_CX - IPAD_W / 2, IPAD_CX + IPAD_W / 2, T, T + IPAD_T, IPAD_Z0, IPAD_Z0 + IPAD_H),
    }


COLOURS = {
    "front": "#E9C9A0", "back": "#D9B68A", "left": "#E2BF93", "right": "#E2BF93", "top": "#EDD0A8",
    "bottom": "#D4AE80", "deck": "#CFA676", "ipad_holder": "#C29462", "lock_bar": "#B98A58",
    "rollo_standin": "#F2F2F2", "labels_standin": "#FFFFFF", "macbook_standin": "#B8BCC2", "ipad_standin": "#2B2B2E",
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
