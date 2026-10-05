"""Upload files for ordering the box from SendCutSend (1/4 in birch plywood, PLYWOODBIRCH-250).

Their sheet is 6.35 mm nominal, so the pieces are rebuilt at that thickness, and the engraving is
left out: SendCutSend cuts every line it's given and doesn't engrave wood. One DXF per piece in
DXF/box_sendcutsend/; order one of each. Run from hardware/; the 6 mm files are rebuilt after.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

import ezdxf

HW = Path(__file__).resolve().parent.parent
DIMS = HW / "src" / "box_dims.py"
OUT = HW / "DXF" / "box_sendcutsend"


def build():
    for script in ("src/box.py", "src/box_parts.py"):
        subprocess.run([sys.executable, script], cwd=HW, check=True)


if __name__ == "__main__":
    original = DIMS.read_text()
    try:
        DIMS.write_text(re.sub(r"^T = [\d.]+", "T = 6.35", original, count=1, flags=re.M))
        build()
        subprocess.run([sys.executable, "checks/box_check.py"], cwd=HW, check=True)
        OUT.mkdir(parents=True, exist_ok=True)
        for f in sorted((HW / "DXF" / "box").glob("*.dxf")):
            doc = ezdxf.readfile(f)
            msp = doc.modelspace()
            for e in [e for e in msp if e.dxf.layer != "CUT"]:
                msp.delete_entity(e)
            doc.saveas(OUT / f.name)
    finally:
        DIMS.write_text(original)
        build()
    print(f"wrote {OUT}")
