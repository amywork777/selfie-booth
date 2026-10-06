"""Data for the web generator (docs/box.html), which redraws the box's cut files live for any sheet thickness.

    .venv/bin/python src/box_web.py reference 5.5 6.35 7   # writes $TMPDIR/box_ref_<t>.json, for checks/box_web_check.mjs

The web generator rebuilds every piece itself (docs/box/box.js). The reference outlines here are the Python
model's pieces at a given thickness, so the JavaScript can be checked against them.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HW = Path(__file__).resolve().parent.parent
DIMS = HW / "src" / "box_dims.py"
FRONTAL = {"front", "back", "ipad_holder", "lock_bar"}


def simplify(pts, tol):
    """Ramer-Douglas-Peucker on a closed ring: drop points within tol of the line through their neighbours."""
    def rdp(a, b):
        (x0, y0), (x1, y1) = pts[a], pts[b]
        dx, dy = x1 - x0, y1 - y0
        length = (dx * dx + dy * dy) ** 0.5 or 1e-12
        far, idx = 0.0, None
        for i in range(a + 1, b):
            d = abs(dy * (pts[i][0] - x0) - dx * (pts[i][1] - y0)) / length
            if d > far:
                far, idx = d, i
        return [*rdp(a, idx), *rdp(idx, b)[1:]] if far > tol else [a, b]
    half = len(pts) // 2
    keep = rdp(0, half) + rdp(half, len(pts) - 1)[1:]
    return [pts[i] for i in keep]


def rings(face, step=0.25, tol=0.01, ndigits=3):
    """A face as point rings: outline first, then its holes."""
    out = []
    for wire in [face.outer_wire(), *face.inner_wires()]:
        n = max(16, int(wire.length / step))
        pts = [(p.X, p.Y) for p in wire.positions([i / n for i in range(n)])]
        out.append([[round(x, ndigits), round(y, ndigits)] for x, y in simplify(pts, tol)])
    return out


def reference_here(path):
    from box_parts import lay_flat, parts

    pieces = {}
    for name, shape in parts().items():
        flat = lay_flat(shape, frontal=name in FRONTAL)
        pieces[name] = [rings(f) for f in flat.faces()]
    Path(path).write_text(json.dumps(pieces))


def reference(thicknesses):
    original = DIMS.read_text()
    try:
        for t in thicknesses:
            DIMS.write_text(re.sub(r"^T = [\d.]+", f"T = {t}", original, count=1, flags=re.M))
            path = Path(os.environ.get("TMPDIR", tempfile.gettempdir())) / f"box_ref_{t}.json"
            subprocess.run([sys.executable, __file__, "_reference_here", str(path)], cwd=HW, check=True)
            print(f"wrote {path}")
    finally:
        DIMS.write_text(original)


if __name__ == "__main__":
    sys.path.insert(0, str(HW / "src"))
    cmd, *args = sys.argv[1:]
    {"reference": lambda: reference([float(a) for a in args]),
     "_reference_here": lambda: reference_here(args[0])}[cmd]()
