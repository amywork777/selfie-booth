// The printed label: 808 x 1218 dots (4 x 6 inches at 203 dpi). Frames are bold black shapes and
// solid fills, because thin lines and greys print badly on thermal paper.
//
// A label is a photo COUNT (how many poses and how they're arranged) and a PATTERN (the border round
// them, with its matching stickers). They mix freely: a pattern only sets the space the photos fill,
// and its stickers are placed relative to wherever the photos ended up.
import { dither, levels, paint, toGray } from './dots.js'

export const W = 808
export const H = 1218

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const rect = (x, y, w, h, shot = 0) => ({ x, y, w, h, shot })

// ---- How many photos ------------------------------------------------------------------------------
// Each arrangement fills a pattern's content box: photos on top, the caption band underneath.

const GAP = 16
const bandHeight = (box) => Math.round(Math.max(150, box.h * 0.21))

/** `n` photos stacked in a column over a caption band. */
function column(box, n) {
  const bandH = bandHeight(box)
  const area = box.h - bandH - GAP
  const h = (area - GAP * (n - 1)) / n
  return {
    slots: Array.from({ length: n }, (_, i) => rect(box.x, box.y + i * (h + GAP), box.w, h, i)),
    bands: [{ x: box.x, y: box.y + area + GAP, w: box.w, h: bandH }],
  }
}

export const COUNTS = {
  one: { name: '1 photo', arrange: (box) => column(box, 1) },
  two: { name: '2 poses', arrange: (box) => column(box, 2) },
  four: {
    name: '2 x 2',
    arrange(box) {
      const bandH = bandHeight(box)
      const area = box.h - bandH - GAP
      const w = (box.w - GAP) / 2, h = (area - GAP) / 2
      const slots = [0, 1, 2, 3].map((i) => rect(box.x + (i % 2) * (w + GAP), box.y + Math.floor(i / 2) * (h + GAP), w, h, i))
      return { slots, bands: [{ x: box.x, y: box.y + area + GAP, w: box.w, h: bandH }] }
    },
  },
  // Two identical half-width strips, each a complete label with its own border, to cut apart.
  twin: { name: 'Twin strips', halves: true, arrange: (box) => column(box, 4) },
}

// ---- Patterns -------------------------------------------------------------------------------------
// A pattern is the border: how far in the photos start (inset), what is drawn under them (under) and
// over them (art), the line round each photo, and the sticker pack that comes with it. Patterns draw
// inside a panel (the whole label, or one twin strip); `k` shrinks the border for narrow panels.

const inset = (t, r = t, b = t, l = r) => ({ t, r, b, l })
const GUTTER = 28

export const PATTERNS = {
  plain: { name: 'Plain', stickers: 'none', inset: inset(36), stroke: 12 },
  hearts: {
    name: 'Hearts',
    stickers: 'hearts',
    inset: inset(92),
    // Each photo is cut into a heart, with a bold heart outline.
    window: heartWindow,
    outline: (ctx, s, k) => {
      ctx.beginPath()
      heartWindow(ctx, s)
      ctx.lineWidth = 12 * k
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#000'
      ctx.stroke()
    },
    art: (ctx, p) => chain(ctx, heart, p),
  },
  polka: {
    name: 'Polka dot',
    stickers: 'bows',
    inset: inset(100),
    stroke: 8,
    under(ctx, p) {
      // Staggered dots over the whole panel; a white card then covers the middle.
      const { frame: f, k } = p
      clipTo(ctx, f, () => {
        ctx.fillStyle = '#000'
        for (let row = 0, y = f.y; y < f.y + f.h + 48; row++, y += 42 * k) {
          for (let x = f.x + (row % 2 ? 24 * k : 0); x < f.x + f.w + 48; x += 48 * k) {
            ctx.beginPath()
            ctx.arc(x, y, 12 * k, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      })
      card(ctx, p)
    },
  },
  gingham: {
    name: 'Gingham',
    stickers: 'none',
    inset: inset(124),
    stroke: 8,
    under(ctx, p) {
      // Soft picnic check: stripes are a light dot pattern, crossings a medium one, so it prints pale grey.
      const { frame: f, k } = p
      const band = 26 * k, step = 52 * k
      clipTo(ctx, f, () => {
        ctx.fillStyle = halftone(ctx, 'light')
        for (let y = f.y; y < f.y + f.h; y += step) ctx.fillRect(f.x, y, f.w, band)
        for (let x = f.x; x < f.x + f.w; x += step) ctx.fillRect(x, f.y, band, f.h)
        ctx.fillStyle = halftone(ctx, 'mid')
        for (let y = f.y; y < f.y + f.h; y += step) for (let x = f.x; x < f.x + f.w; x += step) ctx.fillRect(x, y, band, band)
      })
      card(ctx, p)
    },
  },
  doodle: {
    name: 'Doodle',
    stickers: 'none',
    inset: inset(104),
    outline: (ctx, s, k) => sketchRect(ctx, s, k),
    art: (ctx, p) => doodles(ctx, p),
  },
  daisy: { name: 'Daisy chain', stickers: 'flowers', inset: inset(92), stroke: 10, art: (ctx, p) => chain(ctx, daisy, p) },
}

/**
 * A pattern plus a photo count, ready to draw: one panel (or two for twin strips), each with its own
 * frame, content box, photo slots and caption band.
 */
export function layout(count, pattern) {
  const P = PATTERNS[pattern] ?? PATTERNS.plain
  const C = COUNTS[count] ?? COUNTS.one
  // Twin strips leave a white gutter down the middle for the cut line.
  const half = (W - GUTTER) / 2
  const frames = C.halves ? [{ x: 0, y: 0, w: half, h: H }, { x: W - half, y: 0, w: half, h: H }] : [{ x: 0, y: 0, w: W, h: H }]
  const panels = frames.map((frame) => {
    const k = C.halves ? 0.6 : 1
    const i = P.inset
    const box = { x: frame.x + i.l * k, y: frame.y + i.t * k, w: frame.w - (i.l + i.r) * k, h: frame.h - (i.t + i.b) * k }
    return { frame, k, box, ...C.arrange(box) }
  })
  return {
    ...P,
    panels,
    stroke: (P.stroke ?? 0) * (C.halves ? 0.75 : 1),
    slots: panels.flatMap((p) => p.slots),
    bands: panels.flatMap((p) => p.bands),
    cut: Boolean(C.halves),
  }
}

/** How many photos a count needs. */
export const shotCount = (count) => ({ one: 1, two: 2, four: 4, twin: 4 })[count] ?? 1

/** Bold dashed line down the gutter between twin strips, with scissors at the top. */
function cutLine(ctx) {
  const x = W / 2
  ctx.fillStyle = '#fff'
  ctx.fillRect(x - GUTTER / 2, 0, GUTTER, H)
  ctx.fillStyle = '#000'
  for (let y = 70; y < H - 10; y += 34) ctx.fillRect(x - 2, y, 4, 20)
  // Scissors pointing down the line: two ring handles and two crossed blades.
  ctx.save()
  ctx.translate(x, 34)
  ctx.lineWidth = 4
  ctx.strokeStyle = '#000'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(side * 7, -14, 6, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(side * 5, -8)
    ctx.lineTo(-side * 4, 22)
    ctx.lineTo(-side * 1, 22)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

function clipTo(ctx, r, draw) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(r.x, r.y, r.w, r.h)
  ctx.clip()
  draw()
  ctx.restore()
}

/** A white rounded card just outside the content box, so a pattern frames the photos. */
function card(ctx, p) {
  const b = p.box, m = 24 * p.k
  ctx.fillStyle = '#fff'
  roundRect(ctx, b.x - m, b.y - m, b.w + m * 2, b.h + m * 2, 30 * p.k)
  ctx.lineWidth = 8 * p.k
  ctx.strokeStyle = '#000'
  ctx.stroke()
}

/** A dot pattern that prints as grey: 'light' is one dot in four (25%), 'mid' a checkerboard (50%). */
function halftone(ctx, tone) {
  const tile = document.createElement('canvas')
  tile.width = tile.height = 4
  const t = tile.getContext('2d')
  t.fillStyle = '#000'
  t.fillRect(0, 0, 2, 2)
  if (tone === 'mid') t.fillRect(2, 2, 2, 2)
  const pattern = ctx.createPattern(tile, 'repeat')
  // Keep the dots at real pixel size even on the scaled-down previews, so the grey matches the print.
  const k = ctx.getTransform().a
  pattern.setTransform(new DOMMatrix([1 / k, 0, 0, 1 / k, 0, 0]))
  return pattern
}

// ---- Doodles ----------------------------------------------------------------------------------------
// Pen-drawn marks with a little wobble. A fixed seed keeps them in the same places on every frame
// of the live preview and every print.

function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stroke a list of points as one pen line, nudging each point a little so it looks hand-drawn. */
function pen(ctx, pts, rand, wobble, close = false) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => {
    const jx = x + (rand() - 0.5) * wobble, jy = y + (rand() - 0.5) * wobble
    i ? ctx.lineTo(jx, jy) : ctx.moveTo(jx, jy)
  })
  if (close) ctx.closePath()
  ctx.stroke()
}

const ring = (n, f) => Array.from({ length: n + 1 }, (_, i) => f((i / n) * Math.PI * 2, i))

const DOODLES = [
  // spiral
  (ctx, r, rand) => pen(ctx, Array.from({ length: 40 }, (_, i) => { const a = i * 0.45, d = (i / 40) * r; return [Math.cos(a) * d, Math.sin(a) * d] }), rand, r * 0.06),
  // outline star
  (ctx, r, rand) => pen(ctx, ring(10, (a, i) => { const d = i % 2 ? r * 0.45 : r; return [Math.cos(a - Math.PI / 2) * d, Math.sin(a - Math.PI / 2) * d] }), rand, r * 0.1, true),
  // squiggle
  (ctx, r, rand) => pen(ctx, Array.from({ length: 24 }, (_, i) => [-r + (i / 23) * r * 2, Math.sin(i * 0.8) * r * 0.35]), rand, r * 0.06),
  // outline heart
  (ctx, r, rand) => pen(ctx, ring(28, (a) => [r * 0.06 * 16 * Math.sin(a) ** 3, -r * 0.06 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))]), rand, r * 0.08, true),
  // smiley
  (ctx, r, rand) => {
    pen(ctx, ring(24, (a) => [Math.cos(a) * r, Math.sin(a) * r]), rand, r * 0.08, true)
    pen(ctx, ring(10, (a) => [Math.cos(a / 4 + 0.6) * r * 0.55, Math.sin(a / 4 + 0.6) * r * 0.55]).slice(0, 9), rand, r * 0.05)
    for (const ex of [-0.35, 0.35]) { ctx.beginPath(); ctx.arc(ex * r, -0.25 * r, r * 0.1, 0, Math.PI * 2); ctx.fill() }
  },
  // loopy flower
  (ctx, r, rand) => {
    pen(ctx, ring(60, (a) => { const d = r * (0.55 + 0.45 * Math.abs(Math.sin(a * 2.5))); return [Math.cos(a) * d, Math.sin(a) * d] }), rand, r * 0.06, true)
    ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2); ctx.fill()
  },
  // zigzag
  (ctx, r, rand) => pen(ctx, Array.from({ length: 7 }, (_, i) => [-r + (i / 6) * r * 2, i % 2 ? r * 0.35 : -r * 0.35]), rand, r * 0.08),
  // sparkle lines
  (ctx, r, rand) => {
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; pen(ctx, [[Math.cos(a) * r, Math.sin(a) * r], [-Math.cos(a) * r, -Math.sin(a) * r]], rand, r * 0.08) }
  },
  // dot cluster
  (ctx, r, rand) => { for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc((rand() - 0.5) * r * 1.6, (rand() - 0.5) * r * 1.6, r * (0.1 + rand() * 0.1), 0, Math.PI * 2); ctx.fill() } },
]

/** Doodles scattered all the way round the panel, in the border between its edge and the photos. */
function doodles(ctx, p) {
  const { frame: f, box, k } = p
  const rand = seeded(7)
  const band = Math.min(box.x - f.x, box.y - f.y) // border width
  const mid = band / 2
  const step = 94 * k
  const pts = []
  for (let x = f.x + mid; x < f.x + f.w - mid; x += step) pts.push([x, f.y + mid], [x + step / 2, f.y + f.h - mid])
  for (let y = f.y + mid + step; y < f.y + f.h - mid - step / 2; y += step) pts.push([f.x + mid, y], [f.x + f.w - mid, y])
  ctx.strokeStyle = '#000'
  ctx.fillStyle = '#000'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 6 * k
  pts.forEach(([x, y], i) => {
    ctx.save()
    ctx.translate(x + (rand() - 0.5) * 14 * k, y + (rand() - 0.5) * 14 * k)
    ctx.rotate((rand() - 0.5) * 1.2)
    DOODLES[i % DOODLES.length](ctx, (27 + rand() * 11) * k, rand)
    ctx.restore()
  })
}

/** A photo outline drawn twice by hand: a wobbly line with a looser second pass. */
function sketchRect(ctx, s, k) {
  const rand = seeded(Math.round(s.x * 7 + s.y))
  const edge = (x0, y0, x1, y1) => Array.from({ length: 9 }, (_, i) => [x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8])
  const corners = [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h], [s.x, s.y]]
  const pts = corners.slice(0, 4).flatMap((c, i) => edge(...c, ...corners[i + 1]))
  ctx.strokeStyle = '#000'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 6 * k
  pen(ctx, pts, rand, 5 * k, true)
  ctx.lineWidth = 3 * k
  pen(ctx, pts.map(([x, y]) => [x + 5 * k, y + 4 * k]), rand, 9 * k, true)
}

/** Add a heart, as big as fits centred in the slot, to the current path. */
function heartWindow(ctx, s) {
  const w = Math.min(s.w, s.h * 1.08) * 0.98
  const h = w * 0.92
  const x = s.x + (s.w - w) / 2, y = s.y + (s.h - h) / 2
  const top = h * 0.3
  ctx.moveTo(x + w / 2, y + top)
  ctx.bezierCurveTo(x + w / 2, y, x, y, x, y + top)
  ctx.bezierCurveTo(x, y + (h + top) / 2, x + w / 2, y + (h + top) / 2, x + w / 2, y + h)
  ctx.bezierCurveTo(x + w / 2, y + (h + top) / 2, x + w, y + (h + top) / 2, x + w, y + top)
  ctx.bezierCurveTo(x + w, y, x + w / 2, y, x + w / 2, y + top)
  ctx.closePath()
}

/** A daisy: white petals outlined in black round a solid centre, unlike the solid flower sticker. */
function daisy(ctx, r) {
  ctx.lineWidth = Math.max(2, r * 0.12)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.45, r * 0.2, a, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.strokeStyle = '#000'
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2)
  ctx.fillStyle = '#000'
  ctx.fill()
}

/** Shapes all the way round the panel edge, alternating size and tilt. */
function chain(ctx, shape, p) {
  const { frame: f, k } = p
  const inset = 46 * k, step = 66 * k
  const pts = []
  for (let x = f.x + inset; x < f.x + f.w - inset; x += step) pts.push([x, f.y + inset], [x + step / 2, f.y + f.h - inset])
  for (let y = f.y + inset + step; y < f.y + f.h - inset; y += step) pts.push([f.x + inset, y], [f.x + f.w - inset, y])
  pts.forEach(([x, y], i) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(i % 2 ? 0.25 : -0.25)
    shape(ctx, (i % 3 ? 24 : 30) * k)
    ctx.restore()
  })
}

// ---- Stickers ------------------------------------------------------------------------------------
// Each pack draws a few shapes at spots picked from the layout: two corners of every photo, and both
// sides of each caption band. Shapes are black with a white die-cut edge so they read over photos.

export const STICKERS = {
  none: { shapes: [] },
  hearts: { shapes: [heart] },
  bows: { shapes: [bow] },
  flowers: { shapes: [flower] },
}

function spots(layout) {
  const out = []
  layout.slots.forEach((s, i) => {
    const r = Math.min(s.w, s.h)
    // Alternate which corners get stickers so a strip doesn't look stamped out.
    if (i % 2 === 0) {
      out.push({ x: s.x + r * 0.06, y: s.y + r * 0.06, r: r * 0.1, a: -0.25 })
      out.push({ x: s.x + s.w - r * 0.04, y: s.y + s.h - r * 0.05, r: r * 0.14, a: 0.2 })
    } else {
      out.push({ x: s.x + s.w - r * 0.06, y: s.y + r * 0.06, r: r * 0.1, a: 0.25 })
      out.push({ x: s.x + r * 0.05, y: s.y + s.h - r * 0.05, r: r * 0.13, a: -0.2 })
    }
    // Big photos get a few more, smaller, along the edges.
    if (r > 400) {
      out.push({ x: s.x + s.w - r * 0.03, y: s.y + s.h * 0.18, r: r * 0.06, a: 0.3 })
      out.push({ x: s.x + r * 0.02, y: s.y + s.h * 0.62, r: r * 0.07, a: -0.15 })
      out.push({ x: s.x + s.w * 0.3, y: s.y + s.h - r * 0.01, r: r * 0.05, a: 0.1 })
      out.push({ x: s.x + s.w - r * 0.1, y: s.y + r * 0.03, r: r * 0.045, a: -0.3 })
    }
  })
  // Narrow caption bands (twin strips) have no room beside the text.
  for (const b of layout.bands.filter((b) => b.w >= 500)) {
    const r = Math.min(30, b.w * 0.06)
    out.push({ x: b.x + r * 1.3, y: b.y + b.h * 0.42, r, a: -0.2 })
    out.push({ x: b.x + b.w - r * 1.3, y: b.y + b.h * 0.42, r, a: 0.2 })
  }
  return out
}

function drawStickers(ctx, layout, pack) {
  const shapes = (STICKERS[pack] ?? STICKERS.none).shapes
  if (!shapes.length) return
  spots(layout).forEach((p, i) => {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.a)
    shapes[i % shapes.length](ctx, p.r)
    ctx.restore()
  })
}

/** Fill the current path black with a white die-cut edge. */
function dieCut(ctx, edge = 10) {
  ctx.lineJoin = 'round'
  ctx.lineWidth = edge
  ctx.strokeStyle = '#fff'
  ctx.stroke()
  ctx.fillStyle = '#000'
  ctx.fill()
}

function heart(ctx, r, edge = 10) {
  ctx.beginPath()
  ctx.moveTo(0, r * 0.9)
  ctx.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45)
  ctx.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.4, -r * 0.1, 0, r * 0.9)
  ctx.closePath()
  dieCut(ctx, edge)
}

function flower(ctx, r) {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    ctx.moveTo(Math.cos(a) * r * 0.55 + r * 0.42, Math.sin(a) * r * 0.55)
    ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.42, 0, Math.PI * 2)
  }
  dieCut(ctx)
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
}

function bow(ctx, r) {
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-r * 0.6, -r * 0.9, -r * 1.1, -r * 0.5)
  ctx.quadraticCurveTo(-r * 1.3, 0, -r * 1.1, r * 0.5)
  ctx.quadraticCurveTo(-r * 0.6, r * 0.9, 0, 0)
  ctx.quadraticCurveTo(r * 0.6, -r * 0.9, r * 1.1, -r * 0.5)
  ctx.quadraticCurveTo(r * 1.3, 0, r * 1.1, r * 0.5)
  ctx.quadraticCurveTo(r * 0.6, r * 0.9, 0, 0)
  ctx.moveTo(-r * 0.15, r * 0.1)
  ctx.lineTo(-r * 0.55, r * 1.1)
  ctx.lineTo(-r * 0.25, r * 1.0)
  ctx.lineTo(0, r * 0.2)
  ctx.lineTo(r * 0.25, r * 1.0)
  ctx.lineTo(r * 0.55, r * 1.1)
  ctx.lineTo(r * 0.15, r * 0.1)
  dieCut(ctx)
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2)
  dieCut(ctx, 6)
}

// ---- Shapes and helpers --------------------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  // Drawn by hand: ctx.roundRect only exists in Safari 16 and later.
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fill()
}


function sourceSize(src) {
  return [src.videoWidth || src.naturalWidth || src.width, src.videoHeight || src.naturalHeight || src.height]
}

/** Crop `src` to fill the slot, mirrored, then levels and dither just that slot. */
function drawPhoto(ctx, src, s, scale, window, paper) {
  const px = Math.round(s.x * scale), py = Math.round(s.y * scale)
  const pw = Math.round(s.w * scale), ph = Math.round(s.h * scale)
  const [sw, sh] = sourceSize(src)
  if (!sw || !sh) return
  const k = Math.max(pw / sw, ph / sh)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.beginPath()
  ctx.rect(px, py, pw, ph)
  ctx.clip()
  ctx.translate(px + pw, py)
  ctx.scale(-1, 1)
  ctx.drawImage(src, (pw - sw * k) / 2, (ph - sh * k) / 2, sw * k, sh * k)
  ctx.restore()
  const img = ctx.getImageData(px, py, pw, ph)
  paint(img.data, dither(levels(toGray(img.data)), pw, ph))
  ctx.putImageData(img, px, py)
  if (window) {
    // Shaped window: paper over the part of the slot outside the shape.
    ctx.beginPath()
    ctx.rect(s.x, s.y, s.w, s.h)
    window(ctx, s)
    ctx.fillStyle = paper
    ctx.fill('evenodd')
  }
}

/** An empty slot waiting for its pose: the pose number, big and dotted. */
function drawWaiting(ctx, s, n, ink) {
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `900 ${Math.round(Math.min(s.w, s.h) * 0.45)}px Doto, "Helvetica Neue", sans-serif`
  ctx.fillText(String(n), s.x + s.w / 2, s.y + s.h / 2)
}

function fitSize(ctx, text, maxWidth, max) {
  let size = max
  for (; size > 28; size -= 4) {
    ctx.font = `700 ${size}px Caveat, cursive`
    if (ctx.measureText(text).width <= maxWidth) break
  }
  return size
}

/**
 * Draw the label into `canvas` at `scale` (1 = printer resolution) and reduce it to pure black and
 * white, exactly as it will print. `shots[i]` is the video or image for pose i; a missing pose shows
 * its number. Photos are mirrored so the print matches what people saw on screen.
 */
export function render(canvas, shots, { count = 'one', pattern = 'plain', caption = '', showDate = true, scale = 1 } = {}) {
  const L = layout(count, pattern)
  const ink = L.ink ?? '#000'
  const paper = L.paper ?? '#fff'
  const cw = Math.round(W * scale)
  const ch = Math.round(H * scale)
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw
    canvas.height = ch
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, W, H)
  for (const p of L.panels) L.under?.(ctx, p)

  for (const s of L.slots) {
    const src = shots[s.shot]
    if (src) drawPhoto(ctx, src, s, scale, L.window, paper)
    else drawWaiting(ctx, s, s.shot + 1, ink)
  }
  // Outlines after every photo is down, so a heart outline isn't covered by the next photo.
  for (const s of L.slots) {
    if (L.outline) {
      L.outline(ctx, s, L.panels[0].k)
    } else if (L.stroke) {
      ctx.beginPath()
      ctx.rect(s.x, s.y, s.w, s.h)
      ctx.lineWidth = L.stroke
      ctx.strokeStyle = ink
      ctx.stroke()
    }
  }

  for (const p of L.panels) L.art?.(ctx, p)
  if (L.cut) cutLine(ctx)
  drawStickers(ctx, L, L.stickers)

  // Caption and date sit centred in each caption band.
  const text = caption.trim()
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const b of L.bands) {
    // Caption and date are one block, as big as the band allows, centred in it.
    const dateSize = showDate ? Math.round(Math.min(56, b.w / 11, b.h * 0.24)) : 0
    const gap = text && showDate ? dateSize * 0.5 : 0
    // Wide bands keep room for the stickers beside the caption.
    const room = b.w - (b.w >= 500 ? 190 : 24)
    const capSize = text ? fitSize(ctx, text, room, Math.min(150, (b.h - dateSize - gap) * 0.95)) : 0
    const top = b.y + (b.h - (capSize * 0.8 + gap + dateSize)) / 2
    if (text) {
      ctx.font = `700 ${capSize}px Caveat, "Bradley Hand", cursive`
      ctx.fillText(text, b.x + b.w / 2, top + capSize * 0.4)
    }
    if (showDate) {
      ctx.font = `900 ${dateSize}px Doto, "Helvetica Neue", sans-serif`
      ctx.fillText(DATE.format(new Date()).toUpperCase(), b.x + b.w / 2, top + capSize * 0.8 + gap + dateSize / 2)
    }
  }

  // Snap anti-aliased edges so the screen shows exactly the dots the printer will make.
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const all = ctx.getImageData(0, 0, cw, ch)
  paint(all.data, toGray(all.data))
  ctx.putImageData(all, 0, 0)
}
