import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dither, levels, paint, toGray } from '../static/dots.js'

test('dither leaves only black and white, and keeps the average tone', () => {
  const w = 64, h = 64
  const gray = new Float32Array(w * h).fill(64) // 25% grey
  dither(gray, w, h)
  assert.ok(gray.every((v) => v === 0 || v === 255))
  const white = gray.filter((v) => v === 255).length / gray.length
  assert.ok(Math.abs(white - 0.25) < 0.03, `white share ${white}`)
})

test('levels stretches a dull photo to full range', () => {
  const gray = Float32Array.from({ length: 1000 }, (_, i) => 100 + (i % 50))
  levels(gray, { gamma: 1 })
  assert.equal(Math.min(...gray), 0)
  assert.equal(Math.max(...gray), 255)
})

test('levels survives a blank frame', () => {
  const gray = new Float32Array(100).fill(30)
  levels(gray)
  assert.ok(gray.every(Number.isFinite))
})

test('paint snaps anti-aliased greys to the nearest of black or white', () => {
  const rgba = new Uint8ClampedArray([200, 200, 200, 255, 40, 40, 40, 255])
  paint(rgba, toGray(rgba))
  assert.deepEqual([...rgba], [255, 255, 255, 255, 0, 0, 0, 255])
})
