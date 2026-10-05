"""The box's nine pieces laid out on seven 12 x 20 in sheets, ready to cut.

Writes, for each sheet, a DXF (CUT and ENGRAVE layers) and an SVG for the Glowforge app, which doesn't
open DXF: cut lines red, engraving filled black, so the app makes them separate steps.
"""

from __future__ import annotations

from pathlib import Path

from cadgen import build123d as bd
from cadgen import dxf

from box_parts import front_engraving, lay_flat, parts

SHEET_W, SHEET_H = 508.0, 304.8  # 20 x 12 in
MARGIN = 6.0
GAP = 6.0
OUT = Path(__file__).resolve().parent.parent / "DXF" / "box_sheets"

FRONTAL = {"front", "back", "ipad_holder", "lock_bar"}

# Sheet -> [(piece, rotate 90 degrees)], placed left to right, then a new row.
SHEETS = {
    "sheet1_front": [("front", False)],
    "sheet2_back": [("back", False)],
    "sheet3_top": [("top", False)],
    "sheet4_bottom": [("bottom", False)],
    "sheet5_left_and_ipad_holder": [("left", False), ("ipad_holder", False)],
    "sheet6_right": [("right", False)],
    "sheet7_deck_and_lock_bar": [("deck", False), ("lock_bar", False)],
}


def piece(name):
    """(cut, engrave) for one piece, flat in XY, lower-left corner at the origin."""
    cut = lay_flat(parts()[name], frontal=name in FRONTAL)
    engrave = front_engraving() if name == "front" else None
    b = cut.bounding_box()
    to_origin = bd.Location((-b.min.X, -b.min.Y))
    return to_origin * cut, (to_origin * engrave if engrave is not None else None)


def layout(sheet):
    """Place a sheet's pieces in rows from the top-left, within the margins."""
    cuts, engraves = [], []
    x, y, row_h = MARGIN, SHEET_H - MARGIN, 0.0
    for name, rotate in SHEETS[sheet]:
        cut, eng = piece(name)
        if rotate:
            spin = bd.Location((0, 0, 0), (0, 0, 1), 90)
            cut, eng = spin * cut, (spin * eng if eng is not None else None)
            b = cut.bounding_box()
            back = bd.Location((-b.min.X, -b.min.Y))
            cut, eng = back * cut, (back * eng if eng is not None else None)
        b = cut.bounding_box()
        w, h = b.size.X, b.size.Y
        if x + w > SHEET_W - MARGIN:  # next row
            x, y, row_h = MARGIN, y - row_h - GAP, 0.0
        at = bd.Location((x, y - h))
        if x + w > SHEET_W - MARGIN or y - h < MARGIN:
            raise ValueError(f"{name} doesn't fit on {sheet}")
        cuts.append(at * cut)
        if eng is not None:
            engraves.append(at * eng)
        x, row_h = x + w + GAP, max(row_h, h)
    return cuts, engraves


def sheet_layers(sheet):
    cuts, engraves = layout(sheet)
    layers = {"CUT": bd.Compound(cuts)}
    if engraves:
        layers["ENGRAVE"] = bd.Compound(engraves)
    return layers


def write_svg(sheet):
    """Glowforge-ready SVG: red cut lines, black filled engraving, at real size."""
    cuts, engraves = layout(sheet)
    svg = bd.ExportSVG(unit=bd.Unit.MM, margin=0)
    svg.add_layer("engrave", fill_color=(0, 0, 0), line_color=None)
    svg.add_layer("cut", fill_color=None, line_color=(255, 0, 0), line_weight=0.1)
    for e in engraves:
        svg.add_shape(e, layer="engrave")
    for c in cuts:
        svg.add_shape([edge for face in c.faces() for edge in face.edges()], layer="cut")
    OUT.mkdir(parents=True, exist_ok=True)
    svg.write(str(OUT / f"{sheet}.svg"))


@dxf(out="../DXF/box_sheets/sheet1_front.dxf")
def sheet1_front():
    return sheet_layers("sheet1_front")


@dxf(out="../DXF/box_sheets/sheet2_back.dxf")
def sheet2_back():
    return sheet_layers("sheet2_back")


@dxf(out="../DXF/box_sheets/sheet3_top.dxf")
def sheet3_top():
    return sheet_layers("sheet3_top")


@dxf(out="../DXF/box_sheets/sheet4_bottom.dxf")
def sheet4_bottom():
    return sheet_layers("sheet4_bottom")


@dxf(out="../DXF/box_sheets/sheet5_left_and_ipad_holder.dxf")
def sheet5_left_and_ipad_holder():
    return sheet_layers("sheet5_left_and_ipad_holder")


@dxf(out="../DXF/box_sheets/sheet6_right.dxf")
def sheet6_right():
    return sheet_layers("sheet6_right")


@dxf(out="../DXF/box_sheets/sheet7_deck_and_lock_bar.dxf")
def sheet7_deck_and_lock_bar():
    return sheet_layers("sheet7_deck_and_lock_bar")


if __name__ == "__main__":
    for model in (sheet1_front, sheet2_back, sheet3_top, sheet4_bottom, sheet5_left_and_ipad_holder, sheet6_right,
                  sheet7_deck_and_lock_bar):
        model()
        write_svg(model.__name__)
