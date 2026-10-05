// Selfie booth: live camera shown as printer dots, a 3-2-1 countdown per pose, review, print.
import { LAYOUTS, STICKERS, render, shotCount } from './label.js'

const $ = (id) => document.getElementById(id)

// Report steps and errors to the server log, since the iPad has no console in reach.
const log = (msg) => fetch('/log', { method: 'POST', body: String(msg) }).catch(() => {})
addEventListener('error', (e) => log(`error: ${e.message} at ${e.filename}:${e.lineno}`))
addEventListener('unhandledrejection', (e) => log(`rejection: ${e.reason?.stack ?? e.reason}`))
log(`loaded: ${navigator.userAgent}`)
const video = $('video')
const canvas = $('label')
const LIVE_SCALE = 0.5 // live preview at half the printer's resolution keeps it smooth on an iPad mini
const REVIEW_TIMEOUT = 45_000 // walk away from the review screen and it goes back to live

// Older saves stored one combined "frame"; Sparkle and Hearts are now Classic plus a sticker pack.
const oldFrame = localStorage.getItem('booth:frame')
const settings = {
  layout: localStorage.getItem('booth:layout') ?? (LAYOUTS[oldFrame] ? oldFrame : 'classic'),
  stickers: localStorage.getItem('booth:stickers') ?? ({ sparkle: 'sparkles', hearts: 'hearts' }[oldFrame] ?? 'none'),
  caption: localStorage.getItem('booth:caption') ?? '',
  showDate: localStorage.getItem('booth:date') !== 'false',
  sound: localStorage.getItem('booth:sound') !== 'false',
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

let state = 'live'
let shots = [] // captured poses, kept so layout and caption changes re-render them
let reviewTimer = 0

function setState(next) {
  state = next
  document.body.dataset.state = next
}

function message(text) {
  $('message').hidden = !text
  $('message').textContent = text ?? ''
}

// ---- Camera ------------------------------------------------------------------------------------

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    message('The camera needs the secure address. Open this page through the link the Mac printed.')
    return
  }
  try {
    video.srcObject = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1440 } },
      audio: false,
    })
    await video.play()
    log(`camera on: ${video.videoWidth}x${video.videoHeight}`)
    message('')
  } catch (err) {
    log(`camera failed: ${err.name} ${err.message}`)
    message(err.name === 'NotAllowedError'
      ? 'Camera access is off. Allow it in Settings, Safari, Camera, then reload.'
      : 'Could not start the camera. Tap here to try again.')
    $('message').onclick = () => startCamera()
  }
}

// ---- Rendering ---------------------------------------------------------------------------------

let lastFrame = 0
function loop(now) {
  requestAnimationFrame(loop)
  if (state !== 'live' && state !== 'countdown') return
  if (now - lastFrame < 66 || !video.videoWidth) return // about 15 fps is plenty for a preview
  lastFrame = now
  // Before shooting, every slot shows the camera. While shooting: poses taken, then the camera in
  // the current slot, then the numbers of the poses still to come.
  const live = state === 'live' ? Array(shotCount(settings.layout)).fill(video) : [...shots, video]
  render(canvas, live, { ...settings, scale: LIVE_SCALE })
}

function rerender() {
  if (state === 'review' || state === 'printing') render(canvas, shots, { ...settings, scale: 1 })
}

// ---- Sound: silent until the first tap, off with the Sound button ------------------------------

let audio = null
function tone(freq, ms, type = 'sine', gain = 0.12) {
  if (!settings.sound || !audio) return
  const t = audio.currentTime
  const osc = audio.createOscillator()
  const vol = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  vol.gain.setValueAtTime(gain, t)
  vol.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000)
  osc.connect(vol).connect(audio.destination)
  osc.start(t)
  osc.stop(t + ms / 1000)
}
addEventListener('pointerdown', () => {
  audio ??= new AudioContext()
  if (audio.state === 'suspended') audio.resume()
}, { capture: true })

// ---- Flow ----------------------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function shoot() {
  log(`shoot tapped: state=${state} video=${video.videoWidth}x${video.videoHeight}`)
  if (state !== 'live' || !video.videoWidth) return
  setState('countdown')
  shots = []
  const total = shotCount(settings.layout)
  const count = $('count')
  for (let pose = 0; pose < total; pose++) {
    message(total > 1 ? `Pose ${pose + 1} of ${total}` : '')
    for (const n of [3, 2, 1]) {
      count.textContent = n
      count.classList.remove('pop')
      void count.offsetWidth // restart the animation
      count.classList.add('pop')
      tone(880, 120)
      await sleep(900)
    }
    count.textContent = ''

    // Freeze the current camera frame at full size so the print is sharper than the live view.
    const grab = document.createElement('canvas')
    grab.width = video.videoWidth
    grab.height = video.videoHeight
    grab.getContext('2d').drawImage(video, 0, 0)
    shots.push(grab)
    tone(1600, 60, 'square', 0.08)
    if (!reducedMotion) {
      $('flash').classList.remove('go')
      void $('flash').offsetWidth
      $('flash').classList.add('go')
    }
    if (pose < total - 1) await sleep(700) // a beat to change pose
  }
  message('')
  setState('review')
  rerender()
  log('review shown')
  autoPrint()
}

// Booth behaviour: the photo prints on its own after a short look, unless Retake is tapped.
const AUTO_PRINT_SECONDS = 4
let autoTimer = 0
function autoPrint() {
  clearInterval(autoTimer)
  let left = AUTO_PRINT_SECONDS
  const tick = () => {
    if (state !== 'review') return clearInterval(autoTimer)
    if (left === 0) {
      clearInterval(autoTimer)
      return print()
    }
    $('print').textContent = `Printing in ${left}`
    left--
  }
  tick()
  autoTimer = setInterval(tick, 1000)
}

function backToLive() {
  clearTimeout(reviewTimer)
  clearInterval(autoTimer)
  shots = []
  message('')
  setState('live')
}

async function print() {
  log(`print: state=${state}`)
  if (state !== 'review') return
  clearTimeout(reviewTimer)
  clearInterval(autoTimer)
  setState('printing')
  $('print').textContent = 'Printing'
  $('print').disabled = $('retake').disabled = true
  try {
    const png = await new Promise((r) => canvas.toBlob(r, 'image/png'))
    const res = await fetch('/print', { method: 'POST', body: png })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'print failed')
    tone(660, 90); setTimeout(() => tone(990, 140), 110)
    setState('done')
    message('Grab your print!')
    setTimeout(backToLive, 4000)
  } catch (err) {
    log(`print failed: ${err.message}`)
    message(`${err.message}. Tap Print to try again.`)
    setState('review')
    reviewTimer = setTimeout(backToLive, REVIEW_TIMEOUT)
  } finally {
    $('print').textContent = 'Print'
    $('print').disabled = $('retake').disabled = false
  }
}

// ---- Controls ----------------------------------------------------------------------------------

/** A row of radio buttons for one setting (layout or stickers). */
function buildChoices(boxId, options, setting) {
  const box = $(boxId)
  for (const [key, o] of Object.entries(options)) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'choice'
    b.role = 'radio'
    b.textContent = o.name
    b.dataset.key = key
    b.onclick = () => {
      settings[setting] = key
      localStorage.setItem(`booth:${setting}`, key)
      syncControls()
      rerender()
    }
    box.append(b)
  }
}

function syncControls() {
  for (const b of $('layouts').children) b.setAttribute('aria-checked', String(b.dataset.key === settings.layout))
  for (const b of $('stickers').children) b.setAttribute('aria-checked', String(b.dataset.key === settings.stickers))
  $('date').setAttribute('aria-pressed', String(settings.showDate))
  $('sound').setAttribute('aria-pressed', String(settings.sound))
}

$('caption').value = settings.caption
$('caption').oninput = (e) => {
  settings.caption = e.target.value
  localStorage.setItem('booth:caption', settings.caption)
  rerender()
}
$('caption').onkeydown = (e) => { if (e.key === 'Enter') e.target.blur() }
$('date').onclick = () => {
  settings.showDate = !settings.showDate
  localStorage.setItem('booth:date', settings.showDate)
  syncControls()
  rerender()
}
$('sound').onclick = () => {
  settings.sound = !settings.sound
  localStorage.setItem('booth:sound', settings.sound)
  syncControls()
}
$('shoot').onclick = shoot
$('retake').onclick = backToLive
$('print').onclick = print

// ---- Printer status ----------------------------------------------------------------------------

async function pollStatus() {
  const el = $('status')
  try {
    const { printer } = await (await fetch('/status')).json()
    el.textContent = printer ? 'Printer ready' : 'Printer not found'
    el.classList.toggle('bad', !printer)
  } catch {
    el.textContent = 'Server offline'
    el.classList.add('bad')
  }
}

// ---- Start ---------------------------------------------------------------------------------------

buildChoices('layouts', LAYOUTS, 'layout')
buildChoices('stickers', STICKERS, 'stickers')
syncControls()
pollStatus()
setInterval(pollStatus, 5000)
await Promise.all([
  document.fonts.load('900 40px Doto'),
  document.fonts.load('700 80px Caveat'),
]).catch(() => {})
startCamera()
requestAnimationFrame(loop)
