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
