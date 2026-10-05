// Turning a photo into thermal printer dots. Pure functions so they run (and test) outside the browser.

/** RGBA pixels to one luminance byte per pixel. */
export function toGray(rgba) {
  const gray = new Float32Array(rgba.length / 4)
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]
  }
  return gray
}

/**
 * Stretch contrast so the darkest 1% goes black and the brightest 1% goes white, then lift the
 * midtones. Thermal paper prints dark, so faces need the lift to keep their detail.
 */
export function levels(gray, { clip = 0.01, gamma = 0.8 } = {}) {
  const hist = new Uint32Array(256)
  for (const v of gray) hist[Math.max(0, Math.min(255, v | 0))]++
  const cut = gray.length * clip
  let lo = 0, hi = 255, seen = 0
  while (lo < 255 && (seen += hist[lo]) < cut) lo++
  seen = 0
  while (hi > 0 && (seen += hist[hi]) < cut) hi--
  const span = Math.max(1, hi - lo)
  for (let i = 0; i < gray.length; i++) {
    const t = Math.max(0, Math.min(1, (gray[i] - lo) / span))
    gray[i] = 255 * Math.pow(t, gamma)
  }
  return gray
}

/** Floyd-Steinberg error diffusion: every pixel ends up 0 (black dot) or 255 (paper). Works in place. */
export function dither(gray, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const old = gray[i]
      const v = old < 128 ? 0 : 255
      const err = old - v
      gray[i] = v
      if (x + 1 < w) gray[i + 1] += (err * 7) / 16
      if (y + 1 < h) {
        if (x > 0) gray[i + w - 1] += (err * 3) / 16
        gray[i + w] += (err * 5) / 16
        if (x + 1 < w) gray[i + w + 1] += err / 16
      }
    }
  }
  return gray
}

/** Write gray values back into RGBA as pure black or white; greys in between (anti-aliased text) snap at 128. */
export function paint(rgba, gray) {
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const v = gray[i] < 128 ? 0 : 255
    rgba[p] = rgba[p + 1] = rgba[p + 2] = v
    rgba[p + 3] = 255
  }
  return rgba
}
