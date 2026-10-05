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
    BAR_H, BAR_Z0, DECK_TOP, IPAD_CX, IPAD_H, IPAD_W, IPAD_Z0, LABEL_EXIT_RANGE, PRINTER_CX, SLOT_W, SLOT_Z0,
    SLOT_Z1, T, WINDOW_H, WINDOW_W,
)

CAMERA_FROM_TOP = 4.7  # iPad mini front camera centre, from the top edge in portrait
failures = []


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'  (' + detail + ')' if detail else ''}")
    if not ok:
        failures.append(name)


b = bd.import_step("STEP/box.step")
P = {c.label: c for c in b.children}
wood = [k for k in P if not k.endswith("standin")]
stand = [k for k in P if k.endswith("standin")]
BB = {k: P[k].bounding_box() for k in P}


def overlap(a, c):
    return sum(geometry.overlap_volume(x, y) for x in P[a].solids() for y in P[c].solids())


# 1. Nine pieces, each one piece.
check("nine pieces of plywood", len(wood) == 9, ", ".join(wood))
for k in wood:
    check(f"{k} is one piece", len(P[k].solids()) == 1, f"{len(P[k].solids())}")

# 2. Nothing collides.
names = wood + stand
hits = [(a, c, overlap(a, c)) for i, a in enumerate(names) for c in names[i + 1:]]
hits = [(a, c, v) for a, c, v in hits if v > 0.01]
check("no parts collide", not hits, ", ".join(f"{a}/{c} {v:.1f} mm3" for a, c, v in hits))

# 3. Contents.
pr = BB["rollo_standin"]
check("printer sits on the deck, just behind the front", abs(pr.min.Z - DECK_TOP) < 0.01 and 0 < pr.min.Y - T <= 5, f"{pr.min.Y - T:.1f} mm gap")
check("print slot is centred on the printer", abs((pr.min.X + pr.max.X) / 2 - PRINTER_CX) < 0.5)
check("slot is wide enough for a 4.1 in label", SLOT_W >= 114, f"{SLOT_W:.0f} mm")
lo, hi = pr.min.Z + LABEL_EXIT_RANGE[0], pr.min.Z + LABEL_EXIT_RANGE[1]
check("slot covers every possible label exit", SLOT_Z0 <= lo and SLOT_Z1 >= hi, f"exits {lo:.0f}-{hi:.0f} mm, slot {SLOT_Z0:.0f}-{SLOT_Z1:.0f} mm")
mac, deck = BB["macbook_standin"], BB["deck"]
check("air above the MacBook", deck.min.Z - mac.max.Z >= 5, f"{deck.min.Z - mac.max.Z:.1f} mm")
check("MacBook slides out the back once the back is off", mac.max.Y < BB["back"].min.Y, f"{BB['back'].min.Y - mac.max.Y:.0f} mm spare")
ip = BB["ipad_standin"]
check("iPad stands on the deck", abs(ip.min.Z - DECK_TOP) < 0.01)
gap = BB["ipad_holder"].min.Y - ip.max.Y
check("holder plate sits right behind the iPad", 0 < gap <= 1.0, f"{gap:.1f} mm")
check("iPad can't come out the front (window smaller than the iPad)", WINDOW_W < IPAD_W and WINDOW_H < IPAD_H, f"{WINDOW_W:.1f} x {WINDOW_H:.1f} window")
check("most of the iPad face shows", WINDOW_W * WINDOW_H / (IPAD_W * IPAD_H) > 0.9, f"{100 * WINDOW_W * WINDOW_H / (IPAD_W * IPAD_H):.0f}%")
cam = bd.Cylinder(1, 3 * T, rotation=(90, 0, 0)).moved(bd.Location((IPAD_CX, T / 2, IPAD_Z0 + IPAD_H - CAMERA_FROM_TOP)))
v = geometry.overlap_volume(cam.solids()[0], P["front"].solids()[0])
check("front panel is open over the iPad's camera", v < 0.01, f"{v:.2f} mm3 in the way")

# 4. The back can't come out while the lock bar is in.
bar = BB["lock_bar"]
check("lock bar runs through both side walls", bar.min.X < BB["left"].min.X + 1 and bar.max.X > BB["right"].max.X, f"x {bar.min.X:.0f} to {bar.max.X:.0f}")
check("lock bar is behind the back panel", bar.min.Y >= BB["back"].max.Y - 0.01)
check("back panel can't slip under the bar", BB["back"].max.Z - BB["back"].min.Z > BAR_Z0 - T, f"panel {BB['back'].max.Z - BB['back'].min.Z:.0f} mm, opening {BAR_Z0 - T:.0f} mm")
check("lock bar's handle stops it at the right wall", bar.max.X - BB["right"].max.X > 10 and (bar.max.Z - bar.min.Z) > BAR_H + 5)

# 5. Every cut file fits the Glowforge bed (495 x 279 mm).
files = sorted(glob.glob("DXF/box/*.dxf"))
check("nine cut files", len(files) == 9, f"{len(files)}")
for f in files:
    e = dxf_bbox.extents(ezdxf.readfile(f).modelspace())
    long, short = max(e.size.x, e.size.y), min(e.size.x, e.size.y)
    check(f"{Path(f).name} fits the Glowforge", long <= 495 and short <= 279, f"{long:.0f} x {short:.0f} mm")

print()
print("all checks passed" if not failures else f"{len(failures)} check(s) failed: {', '.join(failures)}")
sys.exit(1 if failures else 0)
