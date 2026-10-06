// Checks the web generator (docs/box/box.js) against the Python model, piece by piece, at a few thicknesses.
// Run from hardware/ after `.venv/bin/python src/box_web.py reference 5.5 6.35 7`:
//
//     node checks/box_web_check.mjs 5.5 6.35 7
//
// For every piece, the area covered by one outline but not the other, spread along its edges, must be under
// 0.01 mm on average (arcs are drawn as short straight lines on both sides, so it's never zero).

import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pc from "../../docs/box/vendor/polygon-clipping.js";
import { pieces, layout, sheetSVG, sheetDXF } from "../../docs/box/box.js";

const toMulti = faces => faces.map(rings => rings.map(r => [...r, r[0]]));
const perimeter = multi => multi.flat().reduce((s, r) => s + r.slice(1).reduce((t, p, i) => t + Math.hypot(p[0] - r[i][0], p[1] - r[i][1]), 0), 0);
const area = multi => multi.reduce((s, poly) => s + poly.reduce((t, ring, i) => {
  let a = 0;
  for (let k = 0; k < ring.length - 1; k++) a += ring[k][0] * ring[k + 1][1] - ring[k + 1][0] * ring[k][1];
  return t + (i === 0 ? 1 : -1) * Math.abs(a / 2);
}, 0), 0);

let failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (${detail})`);
  if (!ok) failures++;
};

for (const t of process.argv.slice(2)) {
  const n = Number(t), key = Number.isInteger(n) ? n.toFixed(1) : String(n); // as Python prints the float
  const ref = JSON.parse(readFileSync(join(process.env.TMPDIR || tmpdir(), `box_ref_${key}.json`), "utf8"));
  const js = pieces(n);
  for (const [name, faces] of Object.entries(ref)) {
    const a = toMulti(faces), b = js[name].shape;
    const off = area(pc.xor(a, b)) / perimeter(a);
    check(`${t} mm ${name}`, off < 0.01, `edges ${off.toFixed(4)} mm apart on average`);
  }
  const sheets = layout(n);
  check(`${t} mm sheets`, sheets.length === 7 && sheets.every(s => sheetSVG(s).includes("#ff0000") && sheetDXF(s).endsWith("EOF\n")), "7 sheets, SVG and DXF");
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
