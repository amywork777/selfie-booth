"""Checks for the laser-cut box. Run from hardware/ after rebuilding src/box.py and src/box_parts.py:

    .venv/bin/python checks/box_check.py
"""

import glob
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import ezdxf  # noqa: E402
from cadgen import build123d as bd  # noqa: E402
from cadgen import geometry  # noqa: E402
from ezdxf import bbox as dxf_bbox  # noqa: E402

from box_dims import (  # noqa: E402
    CAMERA_FROM_TOP, IPAD_CX, IPAD_CZ, IPAD_H, IPAD_W, LABEL_EXIT_Z, PRINTER_CX, SHELF_Z, SLOT_W, SLOT_Z0, SLOT_Z1, T,
    WINDOW_H, WINDOW_W,
)

failures = []


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'  (' + detail + ')' if detail else ''}")
    if not ok:
        failures.append(name)


b = bd.import_step("STEP/box.step")
P = {c.label: c for c in b.children}
wood = [k for k in P if not k.endswith("standin")]
stand = [k for k in P if k.endswith("standin")]
multi = {"posts": 4}  # four separate glued-up corner posts


def overlap(a, c):
    return sum(geometry.overlap_volume(x, y) for x in P[a].solids() for y in P[c].solids())


# 1. Every cut part is one piece.
for k in wood:
    n = len(P[k].solids())
    check(f"{k} is {'one piece' if k not in multi else f'{multi[k]} pieces'}", n == multi.get(k, 1), f"{n}")

# 2. Nothing collides: wood with wood, wood with what goes inside, contents with each other.
names = wood + stand
hits = [(a, c, overlap(a, c)) for i, a in enumerate(names) for c in names[i + 1:]]
hits = [(a, c, v) for a, c, v in hits if v > 0.01]
check("no parts collide", not hits, ", ".join(f"{a}/{c} {v:.1f} mm3" for a, c, v in hits))

# 3. Contents fit where they should.
pr = P["rollo_standin"].bounding_box()
gap_front = pr.min.Y - T
check("printer front sits just behind the front panel", 0 < gap_front <= 5, f"{gap_front:.1f} mm")
check("print slot is centred on the printer", abs((pr.min.X + pr.max.X) / 2 - PRINTER_CX) < 0.5)
check("slot is wide enough for a 4.1 in label", SLOT_W >= 104.1 + 10, f"{SLOT_W:.0f} mm")
exit_z = pr.min.Z + LABEL_EXIT_Z  # where the label leaves the printer, sitting on the shelf
check("slot is centred on the printer's label exit", abs((SLOT_Z0 + SLOT_Z1) / 2 - exit_z) < 0.5, f"exit {exit_z:.0f} mm, slot {SLOT_Z0:.0f}-{SLOT_Z1:.0f} mm")
check("printer sits on the shelf", abs(pr.min.Z - (SHELF_Z + T)) < 0.01)
mac, shelf = P["mac_mini_standin"].bounding_box(), P["shelf"].bounding_box()
check("air above the Mac mini", shelf.min.Z - mac.max.Z >= 5, f"{shelf.min.Z - mac.max.Z:.1f} mm")
check("iPad can't come out the front (window smaller than the iPad)", WINDOW_W < IPAD_W and WINDOW_H < IPAD_H, f"{WINDOW_W:.1f} x {WINDOW_H:.1f} window, {IPAD_W} x {IPAD_H} iPad")
check("most of the iPad face shows", WINDOW_W * WINDOW_H / (IPAD_W * IPAD_H) > 0.9, f"{100 * WINDOW_W * WINDOW_H / (IPAD_W * IPAD_H):.0f}%")
# The camera hole must be over the camera.
cam = bd.Cylinder(1, 3 * T, rotation=(90, 0, 0)).moved(bd.Location((IPAD_CX, T / 2, IPAD_CZ + IPAD_H / 2 - CAMERA_FROM_TOP)))
v = geometry.overlap_volume(cam.solids()[0], P["front"].solids()[0])
check("front panel and frame are open over the iPad's camera", v < 0.01 and geometry.overlap_volume(cam.moved(bd.Location((0, -T, 0))).solids()[0], P["ipad_frame"].solids()[0]) < 0.01, f"{v:.2f} mm3 of wood in the way")

# 4. Every cut file fits the Glowforge bed (495 x 279 mm).
for f in sorted(glob.glob("DXF/box/*.dxf")):
    doc = ezdxf.readfile(f)
    e = dxf_bbox.extents(doc.modelspace())
    long, short = max(e.size.x, e.size.y), min(e.size.x, e.size.y)
    check(f"{Path(f).name} fits the Glowforge", long <= 495 and short <= 279, f"{long:.0f} x {short:.0f} mm")

print()
print("all checks passed" if not failures else f"{len(failures)} check(s) failed: {', '.join(failures)}")
sys.exit(1 if failures else 0)
