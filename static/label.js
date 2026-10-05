// The printed label: 808 x 1218 dots (4 x 6 inches at 203 dpi). Frames are bold black shapes and
// solid fills, because thin lines and greys print badly on thermal paper.
import { dither, levels, paint, toGray } from './dots.js'

export const W = 808
export const H = 1218

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const FRAMES = {
  classic: {
    name: 'Classic',
    photo: { x: 36, y: 36, w: 736, h: 904 },
    ink: '#000',
    paper: '#fff',
    art(ctx) {
      ctx.lineWidth = 12
      ctx.strokeRect(36, 36, 736, 904)
    },
  },
  sparkle: {
    name: 'Sparkle',
    photo: { x: 36, y: 36, w: 736, h: 904 },
    ink: '#000',
    paper: '#fff',
    art(ctx) {
      ctx.lineWidth = 12
      ctx.strokeRect(36, 36, 736, 904)
      for (const [x, y, r] of [[60, 60, 64], [730, 170, 40], [70, 880, 44], [745, 905, 72], [120, 1062, 26], [688, 1062, 26]]) {
        star(ctx, x, y, r)
      }
    },
  },
  film: {
    name: 'Film',
    photo: { x: 104, y: 56, w: 600, h: 848 },
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
  hearts: {
    name: 'Hearts',
    photo: { x: 36, y: 36, w: 736, h: 904 },
    ink: '#000',
    paper: '#fff',
    art(ctx) {
      ctx.lineWidth = 12
      ctx.strokeRect(36, 36, 736, 904)
      for (const [x, y, r, a] of [[78, 70, 54, -0.3], [740, 120, 36, 0.25], [60, 640, 30, -0.2], [728, 860, 64, 0.2], [96, 912, 40, 0.15], [124, 1062, 24, -0.2], [684, 1062, 24, 0.2]]) {
        heart(ctx, x, y, r, a)
      }
    },
  },
  bubble: {
    name: 'Bubble',
    photo: { x: 44, y: 44, w: 720, h: 880 },
    ink: '#000',
    paper: '#fff',
    window(ctx) {
      ctx.ellipse(404, 484, 360, 440, 0, 0, Math.PI * 2)
    },
    art(ctx) {
      ctx.lineWidth = 16
      ctx.beginPath()
      ctx.ellipse(404, 484, 360, 440, 0, 0, Math.PI * 2)
      ctx.stroke()
      for (const [x, y, r] of [[700, 90, 34], [752, 168, 18], [70, 830, 28], [110, 900, 14], [744, 900, 22]]) {
        ctx.lineWidth = 10
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.stroke()
      }
    },
  },
  ticket: {
    name: 'Ticket',
    photo: { x: 60, y: 184, w: 688, h: 740 },
    ink: '#000',
    paper: '#fff',
    art(ctx) {
      // Thick ticket outline with half-circle notches bitten out of both sides at the tear line.
      ctx.lineWidth = 14
      ctx.strokeRect(24, 24, W - 48, H - 48)
      ctx.lineWidth = 8
      ctx.strokeRect(60, 184, 688, 740)
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
    photo: { x: 72, y: 72, w: 664, h: 832 },
    ink: '#000',
    paper: '#fff',
    art(ctx) {
      // A two-row checkerboard band around the photo, 36-dot squares.
      ctx.fillStyle = '#000'
      const sq = 36
      for (let y = 0; y < 940; y += sq) {
        for (let x = 0; x < W; x += sq) {
          const inside = x >= 72 && x < 736 && y >= 72 && y < 904
          if (!inside && ((x / sq + y / sq) % 2 === 0)) ctx.fillRect(x, y, sq, sq)
        }
      }
      ctx.lineWidth = 8
      ctx.strokeRect(72, 72, 664, 832)
    },
  },
  stamp: {
    name: 'Stamp',
    photo: { x: 60, y: 60, w: 688, h: 856 },
    ink: '#000',
    paper: '#fff',
    window(ctx) {
      cloudPath(ctx, 60, 60, 688, 856, 30)
    },
    art(ctx) {
      ctx.lineWidth = 14
      ctx.beginPath()
      cloudPath(ctx, 60, 60, 688, 856, 30)
      ctx.stroke()
      star(ctx, 724, 92, 56)
      star(ctx, 96, 884, 40)
    },
  },
}

/** A heart, black with a white die-cut edge, rotated by `a` radians. */
function heart(ctx, x, y, r, a = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  ctx.beginPath()
  ctx.moveTo(0, r * 0.9)
  ctx.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45)
  ctx.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.4, -r * 0.1, 0, r * 0.9)
  ctx.closePath()
  ctx.lineWidth = 10
  ctx.strokeStyle = '#fff'
  ctx.stroke()
  ctx.fillStyle = '#000'
  ctx.fill()
  ctx.restore()
}

/** A scalloped rectangle: half-circle bites of about radius `r` along every edge. Adds to the current path. */
function cloudPath(ctx, x, y, w, h, r) {
  const nx = Math.round(w / (r * 2)), ny = Math.round(h / (r * 2))
  const sx = w / nx, sy = h / ny
  ctx.moveTo(x, y)
  for (let i = 0; i < nx; i++) ctx.arc(x + sx * (i + 0.5), y, sx / 2, Math.PI, 0, true)
  for (let i = 0; i < ny; i++) ctx.arc(x + w, y + sy * (i + 0.5), sy / 2, -Math.PI / 2, Math.PI / 2, true)
  for (let i = nx - 1; i >= 0; i--) ctx.arc(x + sx * (i + 0.5), y + h, sx / 2, 0, Math.PI, true)
  for (let i = ny - 1; i >= 0; i--) ctx.arc(x, y + sy * (i + 0.5), sy / 2, Math.PI / 2, -Math.PI / 2, true)
  ctx.closePath()
}

/** A four-point sparkle, black with a white die-cut edge so it reads over the photo. */
function star(ctx, x, y, r) {
  const k = r * 0.28
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x + k, y - k, x + r, y)
  ctx.quadraticCurveTo(x + k, y + k, x, y + r)
  ctx.quadraticCurveTo(x - k, y + k, x - r, y)
  ctx.quadraticCurveTo(x - k, y - k, x, y - r)
  ctx.closePath()
  ctx.lineWidth = 10
  ctx.strokeStyle = '#fff'
  ctx.stroke()
  ctx.fillStyle = '#000'
  ctx.fill()
}

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

/**
 * Draw the label into `canvas` at `scale` (1 = printer resolution) and reduce it to pure black and
 * white, exactly as it will print. `source` is a video or image; it is cropped to fill the photo
 * window and mirrored, so the print matches what people saw on screen.
 */
export function render(canvas, source, { frame = 'classic', caption = '', showDate = true, scale = 1 } = {}) {
  const f = FRAMES[frame] ?? FRAMES.classic
  const cw = Math.round(W * scale)
  const ch = Math.round(H * scale)
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw
    canvas.height = ch
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.fillStyle = f.paper
  ctx.fillRect(0, 0, W, H)

  // Photo window: crop to cover, mirror, then levels and dither on its own so the frame stays crisp.
  const p = f.photo
  const px = Math.round(p.x * scale), py = Math.round(p.y * scale)
  const pw = Math.round(p.w * scale), ph = Math.round(p.h * scale)
  const sw = source.videoWidth || source.naturalWidth || source.width
  const sh = source.videoHeight || source.naturalHeight || source.height
  if (sw && sh) {
    const s = Math.max(pw / sw, ph / sh)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.beginPath()
    ctx.rect(px, py, pw, ph)
    ctx.clip()
    ctx.translate(px + pw, py)
    ctx.scale(-1, 1)
    ctx.drawImage(source, (pw - sw * s) / 2, (ph - sh * s) / 2, sw * s, sh * s)
    ctx.restore()
    const img = ctx.getImageData(px, py, pw, ph)
    paint(img.data, dither(levels(toGray(img.data)), pw, ph))
    ctx.putImageData(img, px, py)
    if (f.window) {
      // Shaped window: paint paper over the part of the photo rectangle outside the shape.
      ctx.beginPath()
      ctx.rect(p.x, p.y, p.w, p.h)
      f.window(ctx)
      ctx.fillStyle = f.paper
      ctx.fill('evenodd')
    }
  }

  ctx.strokeStyle = f.ink
  f.art(ctx)

  // Caption and date sit centred in the band under the photo.
  const band = p.y + p.h
  const mid = (band + H) / 2
  ctx.fillStyle = f.ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const text = caption.trim()
  if (text) {
    ctx.font = `700 ${fitSize(ctx, text, p.w - 40)}px Caveat, "Bradley Hand", cursive`
    ctx.fillText(text, W / 2, showDate ? mid - 40 : mid)
  }
  if (showDate) {
    ctx.font = '900 40px Doto, "Helvetica Neue", sans-serif'
    ctx.fillText(DATE.format(new Date()).toUpperCase(), W / 2, text ? mid + 70 : mid)
  }

  // Snap anti-aliased edges so the screen shows exactly the dots the printer will make.
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const all = ctx.getImageData(0, 0, cw, ch)
  paint(all.data, toGray(all.data))
  ctx.putImageData(all, 0, 0)
}

function fitSize(ctx, text, maxWidth) {
  let size = 104
  for (; size > 40; size -= 4) {
    ctx.font = `700 ${size}px Caveat, cursive`
    if (ctx.measureText(text).width <= maxWidth) break
  }
  return size
}
