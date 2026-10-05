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
const bandHeight = (box) => Math.round(Math.max(160, box.h * 0.21))

/** `n` photos stacked in a column over a caption band. */
function column(box, n, bandH, firstShot = 0) {
  const area = box.h - bandH - GAP
  const h = (area - GAP * (n - 1)) / n
  return {
    slots: Array.from({ length: n }, (_, i) => rect(box.x, box.y + i * (h + GAP), box.w, h, firstShot + i)),
    bands: [{ x: box.x, y: box.y + area + GAP, w: box.w, h: bandH }],
  }
}

export const COUNTS = {
  one: { name: '1 photo', arrange: (box) => column(box, 1, bandHeight(box)) },
  two: { name: '2 poses', arrange: (box) => column(box, 2, bandHeight(box)) },
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
  twin: {
    name: 'Twin strips',
    // Four poses down each half, the same four on both, with a cut line between them.
    arrange(box) {
      const w = (box.w - GAP * 2) / 2
      const left = column({ ...box, w }, 4, 150)
      const right = column({ ...box, x: box.x + w + GAP * 2, w }, 4, 150)
      return { slots: [...left.slots, ...right.slots], bands: [...left.bands, ...right.bands], cut: true }
    },
  },
}

// ---- Patterns -------------------------------------------------------------------------------------
// A pattern is the border: how far in the photos start (inset), what is drawn under them (under) and
// over them (art), the line round each photo, and the sticker pack that comes with it.

const inset = (t, r = t, b = t, l = r) => ({ t, r, b, l })

export const PATTERNS = {
  plain: { name: 'Plain', stickers: 'none', inset: inset(36), stroke: 12 },
  hearts: { name: 'Hearts', stickers: 'hearts', inset: inset(92), stroke: 10, art: (ctx) => chain(ctx, heart) },
  polka: {
    stickers: 'bows',
    name: 'Polka dot',
    inset: inset(100),
    stroke: 8,
    under(ctx, L) {
      // Staggered dots over the whole label; a white card then covers the middle.
      ctx.fillStyle = '#000'
      for (let row = 0, y = 0; y < H + 48; row++, y += 42) {
        for (let x = row % 2 ? 24 : 0; x < W + 48; x += 48) {
          ctx.beginPath()
          ctx.arc(x, y, 12, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      card(ctx, L.box)
    },
  },
  gingham: {
    stickers: 'none',
    name: 'Gingham',
    inset: inset(100),
    stroke: 8,
    under(ctx, L) {
      // Picnic check: stripes are a fine dot pattern (they print grey), crossings are solid black.
      const band = 40, step = 80
      ctx.fillStyle = halftone(ctx)
      for (let y = 0; y < H; y += step) ctx.fillRect(0, y, W, band)
      for (let x = 0; x < W; x += step) ctx.fillRect(x, 0, band, H)
      ctx.fillStyle = '#000'
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) ctx.fillRect(x, y, band, band)
      card(ctx, L.box)
    },
  },
  daisy: { name: 'Daisy chain', stickers: 'flowers', inset: inset(92), stroke: 10, art: (ctx) => chain(ctx, flower) },
}

/** A pattern plus a photo count: the photo slots and caption bands, ready to draw. */
export function layout(count, pattern) {
  const P = PATTERNS[pattern] ?? PATTERNS.plain
  const C = COUNTS[count] ?? COUNTS.one
  const i = P.inset
  const box = { x: i.l, y: i.t, w: W - i.l - i.r, h: H - i.t - i.b }
  const arranged = C.arrange(box)
  return { ...P, ...arranged, box }
}

/** How many photos a count needs. */
export const shotCount = (count) => ({ one: 1, two: 2, four: 4, twin: 4 })[count] ?? 1

/** A white rounded card just outside the content box, so a pattern frames the photos. */
function card(ctx, b) {
  ctx.fillStyle = '#fff'
  roundRect(ctx, b.x - 24, b.y - 24, b.w + 48, b.h + 48, 30)
  ctx.lineWidth = 8
  ctx.strokeStyle = '#000'
  ctx.stroke()
}

/** A 50% dot pattern that prints as a light grey. */
function halftone(ctx) {
  const tile = document.createElement('canvas')
  tile.width = tile.height = 4
  const t = tile.getContext('2d')
  t.fillStyle = '#000'
  t.fillRect(0, 0, 2, 2)
  t.fillRect(2, 2, 2, 2)
  return ctx.createPattern(tile, 'repeat')
}

/** Shapes all the way round the label edge, alternating size and tilt. */
function chain(ctx, shape) {
  const inset = 46, step = 66
  const pts = []
  for (let x = inset; x < W - inset; x += step) pts.push([x, inset], [x + step / 2, H - inset])
  for (let y = inset + step; y < H - inset; y += step) pts.push([inset, y], [W - inset, y])
  pts.forEach(([x, y], i) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(i % 2 ? 0.25 : -0.25)
    shape(ctx, i % 3 ? 24 : 30)
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
    out.push({ x: b.x + r * 2.4, y: b.y + b.h * 0.4, r, a: -0.2 })
    out.push({ x: b.x + b.w - r * 2.4, y: b.y + b.h * 0.4, r, a: 0.2 })
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

function heart(ctx, r) {
  ctx.beginPath()
  ctx.moveTo(0, r * 0.9)
  ctx.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45)
  ctx.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.4, -r * 0.1, 0, r * 0.9)
  ctx.closePath()
  dieCut(ctx)
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
function drawPhoto(ctx, src, s, scale) {
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
  L.under?.(ctx, L)

  for (const s of L.slots) {
    const src = shots[s.shot]
    if (src) drawPhoto(ctx, src, s, scale)
    else drawWaiting(ctx, s, s.shot + 1, ink)
    if (L.stroke) {
      ctx.beginPath()
      ctx.rect(s.x, s.y, s.w, s.h)
      ctx.lineWidth = L.stroke
      ctx.strokeStyle = ink
      ctx.stroke()
    }
  }

  L.art?.(ctx, L)
  if (L.cut) {
    // Dashed cut line between twin strips.
    ctx.fillStyle = ink
    for (let y = L.box.y; y < L.box.y + L.box.h; y += 32) ctx.fillRect(W / 2 - 2, y, 4, 16)
  }
  drawStickers(ctx, L, L.stickers)

  // Caption and date sit centred in each caption band.
  const text = caption.trim()
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const b of L.bands) {
    const mid = b.y + b.h / 2
    const dateSize = Math.round(Math.min(40, b.w / 16))
    if (text) {
      // Wide bands keep room for the stickers beside the caption.
      const size = fitSize(ctx, text, b.w - (b.w >= 500 ? 270 : 40), Math.min(104, b.h * 0.45))
      ctx.font = `700 ${size}px Caveat, "Bradley Hand", cursive`
      ctx.fillText(text, b.x + b.w / 2, showDate ? mid - dateSize * 0.9 : mid)
    }
    if (showDate) {
      ctx.font = `900 ${dateSize}px Doto, "Helvetica Neue", sans-serif`
      ctx.fillText(DATE.format(new Date()).toUpperCase(), b.x + b.w / 2, text ? mid + dateSize * 1.6 : mid)
    }
  }

  // Snap anti-aliased edges so the screen shows exactly the dots the printer will make.
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const all = ctx.getImageData(0, 0, cw, ch)
  paint(all.data, toGray(all.data))
  ctx.putImageData(all, 0, 0)
}
