"""Checks that every part prints as one piece and every joint fits. Run from hardware/:

    .venv/bin/python checks/fit_check.py

Reads the built STEP/booth.step (rebuild it first with src/booth.py).
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from cadgen import build123d as bd  # noqa: E402
from cadgen import geometry  # noqa: E402

from bezel import bezel_sketches  # noqa: E402
from dims import (  # noqa: E402
    DECK_Z0, DECK_Z1, PEG_D, PRINT_PANEL_T, SCREW_SPACING_X, TOPPER_T,
)
from front_plate import front_plate_sketches  # noqa: E402
from panels_print import printed  # noqa: E402
from saddle import CRADLE_SCREW_Y  # noqa: E402
from signs import TABLE_T, raised, table_base, table_sketches, topper_sketches  # noqa: E402

failures = []


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'  (' + detail + ')' if detail else ''}")
    if not ok:
        failures.append(name)


def overlap(a, b):
    return sum(geometry.overlap_volume(x, y) for x in a.solids() for y in b.solids())


booth = bd.import_step("STEP/booth.step")
P = {c.label: c for c in booth.children}

# 1. Every printed part is one connected piece (nothing floating, nothing just touching).
printed_parts = {
    "saddle": P["saddle"],
    "cradle": P["cradle"],
    "bezel (printed)": printed(*bezel_sketches()),
    "front plate (printed)": printed(*front_plate_sketches()),
    "sign topper": raised(*topper_sketches(), TOPPER_T),
    "table sign": raised(*table_sketches(), TABLE_T),
    "table sign base": table_base(),
}
for name, part in printed_parts.items():
    n = len(part.solids())
    check(f"{name} is one piece", n == 1, f"{n} solid(s)")

# 2. Every part fits the 256 mm plate (with a little margin).
for name, part in printed_parts.items():
    s = sorted([part.bounding_box().size.X, part.bounding_box().size.Y, part.bounding_box().size.Z])
    check(f"{name} fits the plate", s[1] <= 250 and s[2] <= 250, f"{s[2]:.0f} x {s[1]:.0f} x {s[0]:.0f} mm")

# 3. The ribs join the back plate along their height, not just at the floor: a slice through the
#    cradle at mid-rib height must be exactly two pieces (left and right of the heart window).
cradle = P["cradle"]
bb = cradle.bounding_box()
for z in (DECK_Z1 + 30, DECK_Z1 + 60):
    slab = bd.Box(400, 400, 1.0).moved(bd.Location((0, (bb.min.Y + bb.max.Y) / 2, z)))
    pieces = len(cradle.intersect(slab).solids())
    check(f"cradle ribs attached at {z - DECK_Z1:.0f} mm above the deck", pieces == 2, f"{pieces} pieces in the slice")

# 4. No parts collide.
pairs = [
    ("saddle", "rollo_x1038_standin"), ("cradle", "ipad_mini_standin"), ("saddle", "cradle"),
    ("bezel", "cradle"), ("bezel", "ipad_mini_standin"), ("front_plate", "saddle"),
    ("sign_topper", "cradle"), ("sign_topper", "ipad_mini_standin"), ("sign_topper", "bezel"),
    ("table_sign", "table_sign_base"),
]
for a, b in pairs:
    v = overlap(P[a], P[b])
    check(f"{a} clears {b}", v < 0.01, f"{v:.3f} mm3")
gap = P["saddle"].distance_to(P["rollo_x1038_standin"])
check("saddle stays at least 3 mm from the printer", gap >= 2.99, f"{gap:.2f} mm")

# 5. Pegs go through the panels' keyholes: the panels don't collide with the pegs (4), but a solid
#    version of each panel outline does, by one peg shaft per keyhole.
shaft = math.pi * (PEG_D / 2) ** 2
for panel, holder, n in (("bezel", "cradle", 4), ("front_plate", "saddle", 4)):
    thickness = 3.0  # the assembly shows the 3 mm laser panels
    # Rebuild a hole-free slab from the panel's largest face, extruded through its thickness.
    big = max(P[panel].faces(), key=lambda f: f.area)
    slab = bd.extrude(bd.Face(big.outer_wire()), amount=thickness, dir=-big.normal_at())
    v = overlap(slab, P[holder])
    expected = n * shaft * thickness
    check(f"{panel} keyholes line up with the pegs", abs(v - expected) / expected < 0.15, f"{v:.0f} vs {expected:.0f} mm3 of peg shafts")

# 6. Screws: a rod down each screw axis passes through the deck hole and into the cradle's pilot
#    without hitting either part.
for x in (-SCREW_SPACING_X / 2, SCREW_SPACING_X / 2):
    for y in CRADLE_SCREW_Y:
        rod = bd.Cylinder(1.1, 14, align=(bd.Align.CENTER, bd.Align.CENTER, bd.Align.MIN)).moved(bd.Location((x, y, DECK_Z0 - 1)))
        v = overlap(rod, P["saddle"]) + overlap(rod, P["cradle"])
        check(f"screw hole at x={x:.0f}, y={y:.0f} lines up", v < 0.01, f"{v:.3f} mm3")

# 7. The topper rests on its sleeve floors.
check("topper posts sit in their sleeves", P["sign_topper"].distance_to(P["cradle"]) < 0.05)

print()
print("all checks passed" if not failures else f"{len(failures)} check(s) failed: {', '.join(failures)}")
sys.exit(1 if failures else 0)
