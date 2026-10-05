"""Shared 2D pieces for the laser-cut panels: scalloped outlines, keyholes, hearts, text."""

from __future__ import annotations

import math
from pathlib import Path

from cadgen import build123d as bd

from dims import KEYHOLE_D, KEYHOLE_DROP, KEYHOLE_SLOT_W

FONT = Path(__file__).resolve().parent.parent / "fonts" / "Caveat-Bold.ttf"


def scalloped_rect(cx: float, cy: float, w: float, h: float, bump: float) -> bd.Sketch:
    """A rectangle with round bumps all the way round its edge, like a cookie cutter."""
    with bd.BuildSketch() as s:
        with bd.Locations((cx, cy)):
            bd.Rectangle(w, h)
        nx, ny = max(2, round(w / (bump * 1.8))), max(2, round(h / (bump * 1.8)))
        pts = []
        for i in range(nx + 1):
            x = cx - w / 2 + w * i / nx
            pts += [(x, cy - h / 2), (x, cy + h / 2)]
        for j in range(1, ny):
            y = cy - h / 2 + h * j / ny
            pts += [(cx - w / 2, y), (cx + w / 2, y)]
        with bd.Locations(*pts):
            bd.Circle(bump)
    return s.sketch


def keyhole(x: float, peg_y: float) -> bd.Sketch:
    """Hang on a peg: the head goes through the big hole, then the panel drops so the peg's shaft
    ends up at the top of the slot, at peg_y."""
    with bd.BuildSketch() as s:
        with bd.Locations((x, peg_y - KEYHOLE_DROP)):
            bd.Circle(KEYHOLE_D / 2)
        with bd.Locations((x, peg_y - KEYHOLE_DROP / 2)):
            bd.SlotCenterToCenter(KEYHOLE_DROP, KEYHOLE_SLOT_W, rotation=90)
    return s.sketch


def heart(cx: float, cy: float, size: float) -> bd.Sketch:
    """A heart about `size` wide, from the classic parametric curve."""
    pts = []
    for i in range(72):
        t = 2 * math.pi * i / 72
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * size / 34, cy + y * size / 34))
    with bd.BuildSketch() as s:
        with bd.BuildLine():
            bd.Spline(*pts, periodic=True)
        bd.make_face()
    return s.sketch


def text(words: str, cx: float, cy: float, height: float) -> bd.Sketch:
    with bd.BuildSketch() as s:
        with bd.Locations((cx, cy)):
            bd.Text(words, font_size=height, font_path=str(FONT), align=(bd.Align.CENTER, bd.Align.CENTER))
    return s.sketch
