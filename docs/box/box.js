// The selfie booth box, rebuilt in the browser for any sheet thickness. A line-for-line port of
// hardware/src/box.py (the Python model is the source of truth; hardware/checks/box_web_check.mjs checks this
// file against it). Every piece is a slab cut by boxes, so each one is a 2D polygon in its own plane:
// front, back, ipad_holder and lock_bar in (x, z); left and right in (z, y); top, bottom and deck in (x, y).

import pc from "./vendor/polygon-clipping.js";

const W = 393, H = 270, D = 265, FINGER = 30, TAB = 30, SLOT_FIT = 0.25;
const PRINTER_W = 195, PRINTER_D = 75, PRINTER_H = 85;
const MBP_W = 312.6, MBP_D = 221.2, MBP_H = 15.5;
const LABELS_W = 106, LABELS_D = 154, LABELS_H = 70;
const IPAD_W = 134.8, IPAD_H = 195.4, IPAD_T = 6.3, IPAD_CORNER_R = 19;
const CABLE_NOTCH_W = 24, CABLE_NOTCH_D = 12, WINDOW_LIP = 2.5, HOLDER_FIT = 0.4;
const SLOT_W = 130, BAR_H = 16, BAR_FIT = 0.3;
const HOLDER_W = 110, HOLDER_H = 140, BAR_KNOB = 34;

export const SIZE = { W, H, D };

export function dims(T) {
  const BAY_Z0 = T + MBP_H + 8.5, DECK_TOP = BAY_Z0 + T;
  const IPAD_CX = T + 20 + IPAD_W / 2, IPAD_Z0 = DECK_TOP, IPAD_CZ = IPAD_Z0 + IPAD_H / 2;
  const PRINTER_CX = W - T - 8 - PRINTER_W / 2, PRINTER_Y0 = T + 3;
  const SLOT_Z0 = DECK_TOP + 35, SLOT_Z1 = DECK_TOP + PRINTER_H + 5;
  return {
    T, BAY_Z0, DECK_TOP, IPAD_CX, IPAD_Z0, IPAD_CZ, PRINTER_CX, PRINTER_Y0, SLOT_Z0, SLOT_Z1,
    WINDOW_W: IPAD_W - 2 * WINDOW_LIP, WINDOW_H: IPAD_H - 2 * WINDOW_LIP,
    BACK_Y0: D - 3 * T, BAR_Y0: D - 2 * T, BAR_Z0: H - T - 12 - BAR_H, HY0: T + IPAD_T + HOLDER_FIT,
  };
}

// Which world axes each piece's 2D (u, v) are, and which axis is its thickness.
const PLANES = {
  front: ["x", "z", "y"], back: ["x", "z", "y"], ipad_holder: ["x", "z", "y"], lock_bar: ["x", "z", "y"],
  left: ["z", "y", "x"], right: ["z", "y", "x"],
  top: ["x", "y", "z"], bottom: ["x", "y", "z"], deck: ["x", "y", "z"],
};

const rect = (u0, u1, v0, v1) => [[[[u0, v0], [u1, v0], [u1, v1], [u0, v1], [u0, v0]]]];

function arcPoints(cx, cy, r, a0, a1, step = 0.05) {
  // Points along an arc, chord error under `step` mm.
  const n = Math.max(4, Math.ceil(Math.abs(a1 - a0) / (2 * Math.acos(Math.max(-1, 1 - step / r)))));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (a1 - a0) * i / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

function roundedRect(cx, cy, w, h, r) {
  const x0 = cx - w / 2 + r, x1 = cx + w / 2 - r, y0 = cy - h / 2 + r, y1 = cy + h / 2 - r, q = Math.PI / 2;
  const ring = [
    ...arcPoints(x1, y0, r, -q, 0), ...arcPoints(x1, y1, r, 0, q),
    ...arcPoints(x0, y1, r, q, 2 * q), ...arcPoints(x0, y0, r, 2 * q, 3 * q),
  ];
  return [[[...ring, ring[0]]]];
}

const slotOverall = (cx, cy, w, h) => roundedRect(cx, cy, w, h, h / 2);

function heart(cx, cy, size, n = 360) {
  // The classic parametric heart, about `size` wide (panels.heart in the Python model).
  const ring = Array.from({ length: n }, (_, i) => {
    const t = 2 * Math.PI * i / n;
    const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [cx + x * size / 34, cy + y * size / 34];
  }).reverse();
  return [[[...ring, ring[0]]]];
}

const roundHalfEven = x => {
  const f = Math.floor(x), d = x - f;
  return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1);
};

export function pieces(T) {
  const d = dims(T);
  const slab = {}; // name -> [lo, hi] of its thickness axis in world coordinates
  const shape = {}; // name -> 2D multipolygon
  const bbox = {}; // name -> 3D bounding box as {x: [lo, hi], y: [...], z: [...]}

  function addSlab(name, x0, x1, y0, y1, z0, z1) {
    const b = { x: [x0, x1], y: [y0, y1], z: [z0, z1] }, [u, v, w] = PLANES[name];
    bbox[name] = b;
    slab[name] = b[w];
    shape[name] = rect(b[u][0], b[u][1], b[v][0], b[v][1]);
  }
  function apply(name, op, x0, x1, y0, y1, z0, z1) {
    // Add or cut a world box from a piece, if it reaches the piece's slab.
    const b = { x: [x0, x1], y: [y0, y1], z: [z0, z1] }, [u, v, w] = PLANES[name];
    if (b[w][1] <= slab[name][0] || b[w][0] >= slab[name][1]) return;
    shape[name] = pc[op](shape[name], rect(b[u][0], b[u][1], b[v][0], b[v][1]));
  }
  const cut = (name, ...box) => apply(name, "difference", ...box);
  const cut2d = (name, poly) => { shape[name] = pc.difference(shape[name], poly); };

  function fingerJoint(a, b) {
    const A = bbox[a], B = bbox[b], axes = ["x", "y", "z"];
    const lo = axes.map(k => Math.max(A[k][0], B[k][0])), hi = axes.map(k => Math.min(A[k][1], B[k][1]));
    const sizes = lo.map((l, i) => hi[i] - l), axis = sizes.indexOf(Math.max(...sizes));
    let n = Math.max(3, roundHalfEven(sizes[axis] / FINGER));
    n += 1 - (n % 2);
    const step = sizes[axis] / n;
    for (let i = 0; i < n; i++) {
      const s0 = [...lo], s1 = [...hi];
      s0[axis] = lo[axis] + i * step;
      s1[axis] = lo[axis] + (i + 1) * step;
      cut(i % 2 === 0 ? b : a, s0[0], s1[0], s0[1], s1[1], s0[2], s1[2]);
    }
  }
  function throughTab(tabbed, slotted, x0, x1, y0, y1, z0, z1) {
    const f = SLOT_FIT;
    apply(tabbed, "union", x0, x1, y0, y1, z0, z1);
    cut(slotted, x0 - f, x1 + f, y0 - f, y1 + f, z0 - f, z1 + f);
  }

  addSlab("front", 0, W, 0, T, 0, H);
  addSlab("left", 0, T, 0, D, 0, H);
  addSlab("right", W - T, W, 0, D, 0, H);
  addSlab("bottom", 0, W, 0, D, 0, T);
  addSlab("top", 0, W, 0, D, H - T, H);
  for (const [a, b] of [["front", "left"], ["front", "right"], ["front", "bottom"], ["front", "top"],
    ["bottom", "left"], ["bottom", "right"], ["top", "left"], ["top", "right"]]) fingerJoint(a, b);
  cut2d("front", roundedRect(d.IPAD_CX, d.IPAD_CZ, d.WINDOW_W, d.WINDOW_H, IPAD_CORNER_R - 2.5));
  cut2d("front", roundedRect(d.PRINTER_CX, (d.SLOT_Z0 + d.SLOT_Z1) / 2, SLOT_W, d.SLOT_Z1 - d.SLOT_Z0, 10));

  // Deck over the MacBook, tabbed through both side walls; iPad cable notch and printer cable hole.
  addSlab("deck", T, W - T, T, d.BACK_Y0, d.BAY_Z0, d.DECK_TOP);
  for (const [side, x0] of [["left", 0], ["right", W - T]])
    for (const y of [D * 0.3, D * 0.65]) throughTab("deck", side, x0, x0 + T, y - TAB / 2, y + TAB / 2, d.BAY_Z0, d.DECK_TOP);
  cut("deck", d.IPAD_CX - CABLE_NOTCH_W / 2, d.IPAD_CX + CABLE_NOTCH_W / 2, T - 1, T + CABLE_NOTCH_D, d.BAY_Z0 - 1, d.DECK_TOP + 1);
  cut("deck", d.PRINTER_CX - 22, d.PRINTER_CX + 22, d.BACK_Y0 - 40, d.BACK_Y0 - 12, d.BAY_Z0 - 1, d.DECK_TOP + 1);

  // iPad holder, tabbed into the deck.
  addSlab("ipad_holder", d.IPAD_CX - HOLDER_W / 2, d.IPAD_CX + HOLDER_W / 2, d.HY0, d.HY0 + T, d.DECK_TOP, d.DECK_TOP + HOLDER_H);
  for (const dx of [-32, 32]) throughTab("ipad_holder", "deck", d.IPAD_CX + dx - 12, d.IPAD_CX + dx + 12, d.HY0, d.HY0 + T, d.BAY_Z0, d.DECK_TOP);

  // Back: tabs into the floor, cord notch, a row of vent slots.
  addSlab("back", T, W - T, d.BACK_Y0, d.BACK_Y0 + T, T, H - T);
  const backTabs = [W * 0.28, W * 0.72], cordX = W / 2;
  for (const x of backTabs) throughTab("back", "bottom", x - TAB / 2, x + TAB / 2, d.BACK_Y0, d.BACK_Y0 + T, 0, T);
  cut("back", cordX - 30, cordX + 30, d.BACK_Y0 - 1, d.BACK_Y0 + T + 1, T - 1, T + 22);
  for (let x = 40; x < Math.trunc(W - 30); x += 30)
    if (Math.abs(x - cordX) > 42 && backTabs.every(tx => Math.abs(x - tx) > 24)) cut2d("back", slotOverall(x, T + 14, 20, 8));

  // Lock bar with its heart handle, through slots in both side walls.
  addSlab("lock_bar", -8, W + 2, d.BAR_Y0, d.BAR_Y0 + T, d.BAR_Z0, d.BAR_Z0 + BAR_H);
  shape.lock_bar = pc.union(shape.lock_bar, heart(W + 2 + BAR_KNOB * 0.42, d.BAR_Z0 + BAR_H / 2, BAR_KNOB));
  for (const [side, x0] of [["left", 0], ["right", W - T]])
    cut(side, x0 - 1, x0 + T + 1, d.BAR_Y0 - BAR_FIT, d.BAR_Y0 + T + BAR_FIT, d.BAR_Z0 - BAR_FIT, d.BAR_Z0 + BAR_H + BAR_FIT);

  const out = {};
  for (const name of Object.keys(shape)) out[name] = { shape: shape[name], plane: PLANES[name], slab: slab[name] };
  return out;
}

export function standins(T) {
  const d = dims(T);
  return {
    printer: [d.PRINTER_CX - PRINTER_W / 2, d.PRINTER_CX + PRINTER_W / 2, d.PRINTER_Y0, d.PRINTER_Y0 + PRINTER_D, d.DECK_TOP, d.DECK_TOP + PRINTER_H],
    labels: [d.PRINTER_CX - LABELS_W / 2, d.PRINTER_CX + LABELS_W / 2, d.PRINTER_Y0 + PRINTER_D + 4, d.PRINTER_Y0 + PRINTER_D + 4 + LABELS_D, d.DECK_TOP, d.DECK_TOP + LABELS_H],
    macbook: [W / 2 - MBP_W / 2, W / 2 + MBP_W / 2, T + 6, T + 6 + MBP_D, T, T + MBP_H],
    ipad: [d.IPAD_CX - IPAD_W / 2, d.IPAD_CX + IPAD_W / 2, T, T + IPAD_T, d.IPAD_Z0, d.IPAD_Z0 + IPAD_H],
  };
}

// --- Sheets: the pieces laid out on 12 x 20 in sheets, as in hardware/src/box_sheets.py ---

export const SHEET_W = 508, SHEET_H = 304.8;
const MARGIN = 6, GAP = 6;
export const SHEETS = [
  ["Sheet 1", "front", ["front"]],
  ["Sheet 2", "back", ["back"]],
  ["Sheet 3", "top", ["top"]],
  ["Sheet 4", "bottom", ["bottom"]],
  ["Sheet 5", "left side and iPad holder", ["left", "ipad_holder"]],
  ["Sheet 6", "right side", ["right"]],
  ["Sheet 7", "deck and lock bar", ["deck", "lock_bar"]],
];

function bounds(multi) {
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const poly of multi) for (const [u, v] of poly[0]) {
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  return { u0, u1, v0, v1 };
}

export function layout(T) {
  // Each sheet as {cut: [rings]} in sheet coordinates, mm, y down, outside face up.
  const all = pieces(T);
  return SHEETS.map(([title, what, names]) => {
    const cut = [];
    let x = MARGIN, y = MARGIN, rowH = 0;
    for (const name of names) {
      const multi = all[name].shape, b = bounds(multi), w = b.u1 - b.u0, h = b.v1 - b.v0;
      if (x + w > SHEET_W - MARGIN) { x = MARGIN; y += rowH + GAP; rowH = 0; }
      if (x + w > SHEET_W - MARGIN || y + h > SHEET_H - MARGIN) throw new Error(`${name} doesn't fit on ${title}`);
      const place = ([u, v]) => [x + u - b.u0, y + b.v1 - v];
      for (const poly of multi) for (const ring of poly) cut.push(ring.map(place));
      x += w + GAP; rowH = Math.max(rowH, h);
    }
    return { title, what, cut };
  });
}

const f2 = n => +n.toFixed(3);
const pathD = rings => rings.map(r => "M" + r.map(([x, y]) => `${f2(x)},${f2(y)}`).join("L") + "Z").join("");

export function sheetSVG(sheet) {
  // Red lines only: the Glowforge cuts them all, every hole included. No engraving.
  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_W}mm" height="${SHEET_H}mm" viewBox="0 0 ${SHEET_W} ${SHEET_H}">
  <g id="cut" fill="none" stroke="#ff0000" stroke-width="0.1">${sheet.cut.map(r => `<path d="${pathD([r])}"/>`).join("")}</g>
</svg>
`;
}

export function sheetDXF(sheet) {
  // Plain R12 DXF in mm: one closed polyline per outline on layer CUT, y flipped back up.
  const out = ["0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1009", "9", "$INSUNITS", "70", "4", "0", "ENDSEC",
    "0", "SECTION", "2", "TABLES", "0", "TABLE", "2", "LAYER", "70", "1",
    "0", "LAYER", "2", "CUT", "70", "0", "62", "1", "6", "CONTINUOUS",
    "0", "ENDTAB", "0", "ENDSEC",
    "0", "SECTION", "2", "ENTITIES"];
  for (const ring of sheet.cut) {
    out.push("0", "POLYLINE", "8", "CUT", "66", "1", "70", "1");
    const pts = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring;
    for (const [x, y] of pts) out.push("0", "VERTEX", "8", "CUT", "10", String(f2(x)), "20", String(f2(SHEET_H - y)));
    out.push("0", "SEQEND", "8", "CUT");
  }
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}
