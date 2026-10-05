// The printed label: 808 x 1218 dots (4 x 6 inches at 203 dpi). Frames are bold black shapes and
// solid fills, because thin lines and greys print badly on thermal paper.
//
// A label is a LAYOUT (where the photos go, the border, the caption band) plus a STICKER pack
// (decorations scattered on top). Any pack works on any layout because stickers are placed
// relative to the layout's photo slots.
import { dither, levels, paint, toGray } from './dots.js'

export const W = 808
export const H = 1218

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const rect = (x, y, w, h, shot = 0, shape = 'rect') => ({ x, y, w, h, shot, shape })

/** Twin strips: four poses down the left half, the same four again on the right, to cut in two. */
function twinSlots() {
  const slots = []
  for (const dx of [0, W / 2]) {
    for (let i = 0; i < 4; i++) slots.push(rect(dx + 24, 24 + i * 246, 356, 232, i))
  }
  return slots
}

/** A white rounded card in the middle of a patterned label, holding one photo and the caption. */
const panel = () => ({
  slots: [rect(100, 100, 608, 780)],
  bands: [{ x: 100, y: 890, w: 608, h: 236 }],
  stroke: 8,
})
function panelCard(ctx) {
  ctx.fillStyle = '#fff'
  roundRect(ctx, 76, 76, 656, 1066, 30)
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

/**
 * Black lace round the whole label: scalloped outside edge, scalloped inside edge biting into the
 * photo, a row of punched eyelets down the middle and a pinhole in every outer scallop.
 */
function lace(ctx) {
  const outer = { x: 34, y: 34, w: W - 68, h: H - 68 }
  const inner = { x: 112, y: 112, w: W - 224, h: H - 224 }
  ctx.beginPath()
  scallops(ctx, outer, 22, false)
  scallops(ctx, inner, 18, true)
  ctx.fillStyle = '#000'
  ctx.fill('evenodd')
  ctx.fillStyle = '#fff'
  // Eyelets along the middle of the lace band.
  const mid = { x: 73, y: 73, w: W - 146, h: H - 146 }
  const eyelets = (len) => Math.round(len / 40)
  for (const [x0, y0, dx, dy, n] of [
    [mid.x, mid.y, mid.w, 0, eyelets(mid.w)], [mid.x + mid.w, mid.y, 0, mid.h, eyelets(mid.h)],
    [mid.x + mid.w, mid.y + mid.h, -mid.w, 0, eyelets(mid.w)], [mid.x, mid.y + mid.h, 0, -mid.h, eyelets(mid.h)],
  ]) {
    for (let i = 0; i < n; i++) {
      ctx.beginPath()
      ctx.ellipse(x0 + (dx * i) / n, y0 + (dy * i) / n, 9, 9, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Pinholes in the outer scallops.
  ctx.beginPath()
  scallopCentres(outer, 22).forEach(([x, y]) => { ctx.moveTo(x + 5, y); ctx.arc(x, y, 5, 0, Math.PI * 2) })
  ctx.fill()
  // A thin ring just inside the lace finishes the photo edge.
  ctx.lineWidth = 6
  ctx.strokeStyle = '#000'
  ctx.strokeRect(inner.x + 26, inner.y + 26, inner.w - 52, inner.h - 52)
}

/** Half-circle scallops along every side of `r`: bumps outward, or bites inward when `inward`. */
function scallops(ctx, b, r, inward) {
  const nx = Math.round(b.w / (r * 2)), ny = Math.round(b.h / (r * 2))
  const sx = b.w / nx, sy = b.h / ny
  ctx.moveTo(b.x, b.y)
  for (let i = 0; i < nx; i++) ctx.arc(b.x + sx * (i + 0.5), b.y, sx / 2, Math.PI, 0, inward)
  for (let i = 0; i < ny; i++) ctx.arc(b.x + b.w, b.y + sy * (i + 0.5), sy / 2, -Math.PI / 2, Math.PI / 2, inward)
  for (let i = nx - 1; i >= 0; i--) ctx.arc(b.x + sx * (i + 0.5), b.y + b.h, sx / 2, 0, Math.PI, inward)
  for (let i = ny - 1; i >= 0; i--) ctx.arc(b.x, b.y + sy * (i + 0.5), sy / 2, Math.PI / 2, -Math.PI / 2, inward)
  ctx.closePath()
}

function scallopCentres(b, r) {
  const nx = Math.round(b.w / (r * 2)), ny = Math.round(b.h / (r * 2))
  const sx = b.w / nx, sy = b.h / ny
  const pts = []
  for (let i = 0; i < nx; i++) pts.push([b.x + sx * (i + 0.5), b.y - sx * 0.22], [b.x + sx * (i + 0.5), b.y + b.h + sx * 0.22])
  for (let i = 0; i < ny; i++) pts.push([b.x - sy * 0.22, b.y + sy * (i + 0.5)], [b.x + b.w + sy * 0.22, b.y + sy * (i + 0.5)])
  return pts
}

export const LAYOUTS = {
  grid: {
    name: '2 x 2',
    slots: [rect(36, 36, 360, 440, 0), rect(412, 36, 360, 440, 1), rect(36, 492, 360, 440, 2), rect(412, 492, 360, 440, 3)],
    bands: [{ x: 36, y: 932, w: 736, h: 250 }],
    stroke: 10,
  },
  duo: {
    name: '2 poses',
    slots: [rect(36, 36, 736, 452, 0), rect(36, 508, 736, 452, 1)],
    bands: [{ x: 36, y: 960, w: 736, h: 222 }],
    stroke: 10,
  },
  twin: {
    name: 'Twin strips',
    slots: twinSlots(),
    bands: [{ x: 24, y: 1000, w: 356, h: 194 }, { x: W / 2 + 24, y: 1000, w: 356, h: 194 }],
    stroke: 8,
    art(ctx) {
      // Dashed cut line down the middle.
      ctx.fillStyle = '#000'
      for (let y = 10; y < H; y += 32) ctx.fillRect(W / 2 - 2, y, 4, 16)
    },
  },
  hearts: {
    name: 'Heart border',
    slots: [rect(92, 92, 624, 820)],
    bands: [{ x: 60, y: 930, w: 688, h: 230 }],
    stroke: 10,
    art: (ctx) => chain(ctx, heart),
  },
  polka: {
    name: 'Polka dot',
    ...panel(),
    under(ctx) {
      // Staggered dots over the whole label; the white panel then covers the middle.
      ctx.fillStyle = '#000'
      for (let row = 0, y = 0; y < H + 48; row++, y += 42) {
        for (let x = row % 2 ? 24 : 0; x < W + 48; x += 48) {
          ctx.beginPath()
          ctx.arc(x, y, 12, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      panelCard(ctx)
    },
  },
  lace: {
    name: 'Lace',
    slots: [rect(112, 112, 584, 780)],
    bands: [{ x: 112, y: 900, w: 584, h: 206 }],
    stroke: 8,
    art: lace,
  },
  gingham: {
    name: 'Gingham',
    ...panel(),
    under(ctx) {
      // Picnic check: stripes are a fine dot pattern (they print grey), crossings are solid black.
      const tone = halftone(ctx)
      const band = 40, step = 80
      ctx.fillStyle = tone
      for (let y = 0; y < H; y += step) ctx.fillRect(0, y, W, band)
      for (let x = 0; x < W; x += step) ctx.fillRect(x, 0, band, H)
      ctx.fillStyle = '#000'
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) ctx.fillRect(x, y, band, band)
      panelCard(ctx)
    },
  },
  daisy: {
    name: 'Daisy chain',
    slots: [rect(92, 92, 624, 820)],
    bands: [{ x: 60, y: 930, w: 688, h: 230 }],
    stroke: 10,
    art: (ctx) => chain(ctx, flower),
  },
  classic: {
    name: 'Classic',
    slots: [rect(36, 36, 736, 904)],
    bands: [{ x: 36, y: 940, w: 736, h: 242 }],
    stroke: 12,
  },
  strip: {
    name: '3 strip',
    slots: [rect(36, 36, 736, 300, 0), rect(36, 352, 736, 300, 1), rect(36, 668, 736, 300, 2)],
    bands: [{ x: 36, y: 968, w: 736, h: 214 }],
    stroke: 10,
  },
  film: {
    name: 'Film',
    slots: [rect(104, 56, 600, 848)],
    bands: [{ x: 104, y: 904, w: 600, h: 280 }],
    ink: '#fff',
    paper: '#000',
    art(ctx) {
      ctx.fillStyle = '#fff'
      for (let y = 34; y < H - 40; y += 88) {
        roundRect(ctx, 34, y, 40, 56, 10)
        roundRect(ctx, W - 74, y, 40, 56, 10)
      }
    },
  },
  bubble: {
    name: 'Bubble',
    slots: [rect(44, 44, 720, 880, 0, 'oval')],
    bands: [{ x: 36, y: 924, w: 736, h: 258 }],
    stroke: 16,
  },
  ticket: {
    name: 'Ticket',
    slots: [rect(60, 184, 688, 740)],
    bands: [{ x: 60, y: 990, w: 688, h: 180 }],
    stroke: 8,
    art(ctx) {
      // Thick ticket outline with half-circle notches bitten out of both sides at the tear line.
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 14
      ctx.strokeRect(24, 24, W - 48, H - 48)
      for (const x of [24, W - 24]) {
        ctx.beginPath()
        ctx.arc(x, 970, 40, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.stroke()
      }
      ctx.fillStyle = '#000'
      for (let x = 92; x < W - 80; x += 36) ctx.fillRect(x, 966, 18, 8)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '900 92px Doto, "Helvetica Neue", sans-serif'
      ctx.fillText('ADMIT ONE', W / 2, 108)
    },
  },
  checker: {
    name: 'Checker',
    slots: [rect(72, 72, 664, 832)],
    bands: [{ x: 36, y: 940, w: 736, h: 242 }],
    stroke: 8,
    art(ctx) {
      // A two-row checkerboard band around the photo, 36-dot squares.
      ctx.fillStyle = '#000'
      const sq = 36
      for (let y = 0; y < 940; y += sq) {
        for (let x = 0; x < W; x += sq) {
          const inside = x >= 72 && x < 736 && y >= 72 && y < 904
          if (!inside && (x / sq + y / sq) % 2 === 0) ctx.fillRect(x, y, sq, sq)
        }
      }
    },
  },
  stamp: {
    name: 'Stamp',
    slots: [rect(60, 60, 688, 856, 0, 'stamp')],
    bands: [{ x: 36, y: 940, w: 736, h: 242 }],
    stroke: 14,
  },
}

/** How many photos a layout needs. */
export const shotCount = (layout) => Math.max(...(LAYOUTS[layout] ?? LAYOUTS.classic).slots.map((s) => s.shot)) + 1

// ---- Stickers ------------------------------------------------------------------------------------
// Each pack draws a few shapes at spots picked from the layout: two corners of every photo, and both
// sides of each caption band. Shapes are black with a white die-cut edge so they read over photos.

export const STICKERS = {
  none: { name: 'None', shapes: [] },
  sparkles: { name: 'Sparkles', shapes: [star, star, star] },
  hearts: { name: 'Hearts', shapes: [heart, heart, heart] },
  flowers: { name: 'Flowers', shapes: [flower, flower, star] },
  bows: { name: 'Bows', shapes: [bow, heart, bow] },
  smiley: { name: 'Smileys', shapes: [smiley, star, smiley] },
  party: { name: 'Party', shapes: [partyHat, star, heart, star] },
  zap: { name: 'Lightning', shapes: [bolt, star, bolt] },
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

function star(ctx, r) {
  const k = r * 0.28
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.quadraticCurveTo(k, -k, r, 0)
  ctx.quadraticCurveTo(k, k, 0, r)
  ctx.quadraticCurveTo(-k, k, -r, 0)
  ctx.quadraticCurveTo(-k, -k, 0, -r)
  ctx.closePath()
  dieCut(ctx)
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

function smiley(ctx, r) {
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  dieCut(ctx)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.ellipse(-r * 0.33, -r * 0.25, r * 0.12, r * 0.2, 0, 0, Math.PI * 2)
  ctx.ellipse(r * 0.33, -r * 0.25, r * 0.12, r * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, r * 0.05, r * 0.55, 0.25 * Math.PI, 0.75 * Math.PI)
  ctx.lineWidth = r * 0.14
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#fff'
  ctx.stroke()
}

function bolt(ctx, r) {
  ctx.beginPath()
  ctx.moveTo(r * 0.2, -r)
  ctx.lineTo(-r * 0.55, r * 0.15)
  ctx.lineTo(-r * 0.05, r * 0.15)
  ctx.lineTo(-r * 0.25, r)
  ctx.lineTo(r * 0.55, -r * 0.2)
  ctx.lineTo(r * 0.05, -r * 0.2)
  ctx.closePath()
  dieCut(ctx)
}

function partyHat(ctx, r) {
  // A cone with a pom-pom; the stripes are paper-coloured bands across the black cone.
  ctx.beginPath()
  ctx.moveTo(0, -r * 0.75)
  ctx.lineTo(r * 0.62, r * 0.9)
  ctx.quadraticCurveTo(0, r * 1.1, -r * 0.62, r * 0.9)
  ctx.closePath()
  ctx.moveTo(r * 0.24, -r * 0.82)
  ctx.arc(0, -r * 0.82, r * 0.24, 0, Math.PI * 2)
  dieCut(ctx)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(0, -r * 0.75)
  ctx.lineTo(r * 0.62, r * 0.9)
  ctx.quadraticCurveTo(0, r * 1.1, -r * 0.62, r * 0.9)
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = '#fff'
  for (const y of [-0.15, 0.4]) ctx.fillRect(-r, y * r, r * 2, r * 0.16)
  ctx.restore()
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

/** Add a slot's window outline to the current path. */
function windowPath(ctx, s) {
  if (s.shape === 'oval') {
    ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2)
  } else if (s.shape === 'stamp') {
    scallops(ctx, s, 30, true)
  } else {
    ctx.rect(s.x, s.y, s.w, s.h)
  }
}


function sourceSize(src) {
  return [src.videoWidth || src.naturalWidth || src.width, src.videoHeight || src.naturalHeight || src.height]
}

/** Crop `src` to fill the slot, mirrored, then levels and dither just that slot. */
function drawPhoto(ctx, src, s, scale, paper) {
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
  if (s.shape !== 'rect') {
    // Shaped window: paint paper over the part of the slot outside the shape.
    ctx.beginPath()
    ctx.rect(s.x, s.y, s.w, s.h)
    windowPath(ctx, s)
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
export function render(canvas, shots, { layout = 'classic', stickers = 'none', caption = '', showDate = true, scale = 1 } = {}) {
  const L = LAYOUTS[layout] ?? LAYOUTS.classic
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
  L.under?.(ctx)

  for (const s of L.slots) {
    const src = shots[s.shot]
    if (src) drawPhoto(ctx, src, s, scale, paper)
    else drawWaiting(ctx, s, s.shot + 1, ink)
    if (L.stroke) {
      ctx.beginPath()
      windowPath(ctx, s)
      ctx.lineWidth = L.stroke
      ctx.strokeStyle = ink
      ctx.stroke()
    }
  }

  L.art?.(ctx)
  drawStickers(ctx, L, stickers)

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
      const size = fitSize(ctx, text, b.w - (b.w >= 500 ? 220 : 40), Math.min(104, b.h * 0.45))
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
