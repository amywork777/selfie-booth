// Selfie booth: live camera shown as printer dots, a 3-2-1 countdown per pose, review, print.
import { COUNTS, PAPERS, PATTERNS, paperCounts, paperSize, render, shotCount } from './label.js'

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

const saved = (key, options, fallback) => (options[localStorage.getItem(key)] ? localStorage.getItem(key) : fallback)
const settings = {
  count: saved('booth:count', COUNTS, 'one'),
  pattern: saved('booth:pattern', PATTERNS, 'plain'),
  paper: saved('booth:paper', PAPERS, '4x6'),
  // Captions: 'guest' (each guest types one in step 3) or 'event' (one caption set in Settings).
  captionMode: localStorage.getItem('booth:captionMode') === 'event' ? 'event' : 'guest',
  eventCaption: localStorage.getItem('booth:eventCaption') ?? '',
  caption: '', // the caption on this guest's print
  doodle: [], // finger-drawn strokes on Plain, in label coordinates
  showDate: localStorage.getItem('booth:date') !== 'false',
  sound: localStorage.getItem('booth:sound') !== 'false',
  // Code to start: guests get it when they pay; it also guards Settings.
  lock: localStorage.getItem('booth:lock') !== 'false',
  code: /^\d{4}$/.test(localStorage.getItem('booth:code') ?? '') ? localStorage.getItem('booth:code') : '0000',
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

let state = 'count'
let shots = [] // captured poses, kept so pattern and caption changes re-render them
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

function stopCamera() {
  video.srcObject?.getTracks().forEach((track) => track.stop())
  video.srcObject = null
}

async function startCamera() {
  if (video.srcObject) return
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
let lastTiles = 0
function loop(now) {
  requestAnimationFrame(loop)
  if (state === 'count' || state === 'pattern') {
    if (!lastTiles) { // tiles only change when the step or a setting does
      lastTiles = now
      renderTiles()
    }
    return
  }
  if (state !== 'live' && state !== 'countdown') return
  if (now - lastFrame < 66 || !video.videoWidth) return // about 15 fps is plenty for a preview
  lastFrame = now
  // One pose at a time: poses already taken, then the camera in the current slot, then the numbers
  // of the poses still to come. Before the first tap that's the camera in slot 1 only.
  const live = [...shots, video]
  render(canvas, live, { ...settings, scale: LIVE_SCALE })
}

const TILE_SCALE = 0.22
function renderTiles() {
  const step = state // 'count' or 'pattern': the tiles vary that one setting
  for (const tile of $(`${step}-tiles`).children) {
    const opts = { ...settings, [step]: tile.dataset.key, scale: TILE_SCALE }
    render(tile.firstChild, [], opts) // camera is off here: slots show their pose numbers
  }
}

function rerender() {
  lastTiles = 0 // caption or date changed: redraw the tiles too
  if (state === 'caption') render(canvas, [], { ...settings, scale: LIVE_SCALE })
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
  const total = shotCount(settings.count)
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
    if (pose < total - 1) {
      // The photo just taken stays in its slot; the camera has moved to the next one.
      message('New pose!')
      await sleep(1600)
    }
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
  idle()
}

/** Back to step 1, ready for the next guest: a blank caption, or the event's. */
function backToStart() {
  backToLive()
  resetCaption()
  startSession()
}

// ---- Code to start -------------------------------------------------------------------------------

/** Show the keypad until the right code is entered (true) or Cancel is tapped (false). */
function askCode({ title, hint, cancellable }) {
  $('keypad-title').textContent = title
  $('keypad-hint').textContent = hint
  $('keypad-cancel').hidden = !cancellable
  $('keypad').hidden = false
  let entered = ''
  const dots = [...$('dots').children]
  const show = () => dots.forEach((d, i) => d.classList.toggle('on', i < entered.length))
  show()
  return new Promise((resolve) => {
    const finish = (ok) => {
      $('keypad').hidden = true
      $('keys').onclick = $('keypad-cancel').onclick = null
      removeEventListener('keydown', onKey)
      resolve(ok)
    }
    const press = (k) => {
      if (k === 'del') entered = entered.slice(0, -1)
      else if (entered.length < 4) entered += k
      show()
      tone(1200, 30)
      if (entered.length < 4) return
      if (entered === settings.code) return setTimeout(() => finish(true), 120)
      $('dots').classList.remove('wrong')
      void $('dots').offsetWidth
      $('dots').classList.add('wrong')
      entered = ''
      setTimeout(show, 300)
    }
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('del')
    }
    $('keys').onclick = (e) => { const k = e.target.closest('button')?.dataset.key; if (k) press(k) }
    $('keypad-cancel').onclick = () => finish(false)
    addEventListener('keydown', onKey)
  })
}

function buildKeys() {
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'key' + (k === 'del' ? ' word' : k === '' ? ' blank' : '')
    b.textContent = k === 'del' ? 'Delete' : k
    b.dataset.key = k
    if (k === '') b.tabIndex = -1
    $('keys').append(b)
  }
}

/** Each guest's session starts here: behind the code if the lock is on. */
async function startSession() {
  if (settings.lock) {
    stopCamera()
    $('host').hidden = true
    setState('locked')
    await askCode({ title: 'Selfie booth', hint: 'Ask us for the code to start', cancellable: false })
    log('session unlocked')
  }
  showStep(steps()[0])
}

const eventMode = () => settings.captionMode === 'event'
function resetCaption() {
  settings.caption = eventMode() ? settings.eventCaption : ''
  settings.doodle = []
  $('caption').value = ''
  lastTiles = 0
}

// Step 3 is for the caption and, on Plain, doodling. With one caption for everyone it only appears
// on Plain, so there's something to draw on.
const canDoodle = () => settings.pattern === 'plain'
// Step 1 only appears when the paper fits more than one photo count.
const steps = () => [
  ...(paperCounts(settings.paper).length > 1 ? ['count'] : []),
  'pattern',
  ...(eventMode() && !canDoodle() ? [] : ['caption']),
  'live',
]
function stepTitle(step) {
  if (step !== 'caption') return { count: 'How many photos?', pattern: 'Pick a pattern', live: 'Smile!' }[step]
  if (!canDoodle()) return 'Add a caption'
  return eventMode() ? 'Doodle on it' : 'Add a caption and doodle'
}
function showStep(step) {
  if (step !== 'live') stopCamera() // the camera only runs on the photo step
  setState(step)
  document.body.dataset.mode = settings.captionMode
  document.body.dataset.doodle = canDoodle() ? 'on' : 'off'
  const all = steps()
  const heading = step === 'count' || step === 'pattern' ? $('pick-title') : $('step-title')
  $('prev').style.visibility = all[0] === step ? 'hidden' : ''
  heading.innerHTML = `<span class="step-num">Step ${all.indexOf(step) + 1} of ${all.length}</span>${stepTitle(step)}`
  if (step === 'caption' && canDoodle() && !settings.doodle.length) message('Draw anywhere with your finger')
  else message('')
  lastTiles = 0
  syncTiles()
  if (step === 'caption') render(canvas, [], { ...settings, scale: LIVE_SCALE })
  if (step === 'live') startCamera()
  if (step !== 'count' || settings.lock) idle() // an unlocked booth left alone locks again
}

// Someone wanders off mid-way: go back to step 1 after a minute.
const IDLE_TIMEOUT = 60_000
let idleTimer = 0
function idle() {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => { if (['count', 'pattern', 'caption', 'live'].includes(state)) backToStart() }, IDLE_TIMEOUT)
}

/** Tapping a tile only selects it; Next moves on. */
function pick(step, key) {
  if (step === 'pattern' && key !== 'plain') settings.doodle = [] // doodles only live on Plain
  settings[step] = key
  localStorage.setItem(`booth:${step}`, key)
  syncTiles()
  if (step === 'pattern') idle()
}

function next() {
  const all = steps()
  const following = all[all.indexOf(state) + 1]
  if (following !== 'live') return showStep(following)
  $('caption').blur() // drop the keyboard before the camera
  log(`chosen: ${settings.count}, ${settings.pattern}, "${settings.caption}"`)
  showStep('live')
}

function syncTiles() {
  for (const step of ['count', 'pattern']) {
    for (const t of $(`${step}-tiles`).children) t.setAttribute('aria-checked', String(t.dataset.key === settings[step]))
  }
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
    const res = await fetch(`/print?paper=${settings.paper}`, { method: 'POST', body: png })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'print failed')
    tone(660, 90); setTimeout(() => tone(990, 140), 110)
    setState('done')
    message('Grab your print!')
    setTimeout(backToStart, 4000)
  } catch (err) {
    log(`print failed: ${err.message}`)
    message(`${err.message}. Tap Print to try again.`)
    setState('review')
    reviewTimer = setTimeout(backToStart, REVIEW_TIMEOUT)
  } finally {
    $('print').textContent = 'Print'
    $('print').disabled = $('retake').disabled = false
  }
}

// ---- Controls ----------------------------------------------------------------------------------

/** Big tappable tiles for one step, each a live preview of the label with that choice. */
function buildTiles(step, options) {
  for (const [key, o] of Object.entries(options)) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'tile'
    b.role = 'radio'
    b.dataset.key = key
    const name = document.createElement('span')
    name.className = 'tile-name'
    name.textContent = o.name
    if (step === 'count' && key === 'twin') {
      const note = document.createElement('span')
      note.className = 'tile-poses'
      note.textContent = '4 poses, 2 copies'
      name.append(note)
    }
    b.append(document.createElement('canvas'), name)
    b.onclick = () => pick(step, key)
    $(`${step}-tiles`).append(b)
  }
}

function syncControls() {
  for (const id of ['date', 'event-date']) $(id).setAttribute('aria-pressed', String(settings.showDate))
  $('sound').setAttribute('aria-pressed', String(settings.sound))
  $('mode-guest').setAttribute('aria-checked', String(!eventMode()))
  $('mode-event').setAttribute('aria-checked', String(eventMode()))
  $('event-caption').hidden = !eventMode()
}

/** The paper decides the label's shape: the preview and the tiles follow it. */
function applyPaper() {
  const { W, H } = paperSize(settings.paper)
  // Only offer the photo counts that fit, and switch to one that does if needed.
  const fits = paperCounts(settings.paper)
  for (const t of $('count-tiles').children) t.hidden = !fits.includes(t.dataset.key)
  if (!fits.includes(settings.count)) settings.count = fits[0]
  document.body.style.setProperty('--label-ratio', `${W} / ${H}`)
  document.body.style.setProperty('--label-tall', String(H / W))
  for (const b of $('papers').children) b.setAttribute('aria-checked', String(b.dataset.key === settings.paper))
  lastTiles = 0
  rerender()
}
for (const [key, p] of Object.entries(PAPERS)) {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'choice'
  b.role = 'radio'
  b.textContent = p.name
  b.dataset.key = key
  b.onclick = () => {
    settings.paper = key
    localStorage.setItem('booth:paper', key)
    applyPaper()
    showStep(steps()[0]) // the steps can change: small papers skip "how many photos"
  }
  $('papers').append(b)
}

function setCaptionMode(mode) {
  settings.captionMode = mode
  localStorage.setItem('booth:captionMode', mode)
  resetCaption()
  syncControls()
  showStep(state) // step numbers change
}
$('mode-guest').onclick = () => setCaptionMode('guest')
$('mode-event').onclick = () => setCaptionMode('event')
$('event-caption').value = settings.eventCaption
$('event-caption').oninput = (e) => {
  settings.eventCaption = e.target.value
  localStorage.setItem('booth:eventCaption', settings.eventCaption)
  resetCaption()
}
$('event-caption').onkeydown = (e) => { if (e.key === 'Enter') e.target.blur() }

$('caption').value = settings.caption
$('caption').oninput = (e) => {
  settings.caption = e.target.value
  rerender()
}
$('caption').onkeydown = (e) => { if (e.key === 'Enter') e.target.blur() }
$('date').onclick = $('event-date').onclick = () => {
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
$('back').onclick = () => {
  const all = steps()
  const before = all[all.indexOf(state === 'live' ? 'live' : state) - 1]
  if (state !== 'caption') backToLive()
  showStep(before)
}
$('to-photo').onclick = next

// ---- No zoom ----------------------------------------------------------------------------------------
// iPad Safari ignores user-scalable=no, so cancel pinch gestures and multi-finger touches directly.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false })
}
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault() }, { passive: false })

// ---- Doodling on Plain -----------------------------------------------------------------------------

function labelPoint(e) {
  const r = canvas.getBoundingClientRect()
  const { W, H } = paperSize(settings.paper)
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
}
let drawing = null
canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'caption' || !canDoodle()) return
  canvas.setPointerCapture(e.pointerId)
  drawing = [labelPoint(e)]
  settings.doodle.push(drawing)
  message('')
  rerender()
  idle()
})
canvas.addEventListener('pointermove', (e) => {
  if (!drawing) return
  drawing.push(labelPoint(e))
  rerender()
})
const endStroke = () => { drawing = null }
canvas.addEventListener('pointerup', endStroke)
canvas.addEventListener('pointercancel', endStroke)
$('undo').onclick = () => { settings.doodle.pop(); rerender() }
$('clear').onclick = () => { settings.doodle = []; rerender() }
$('prev').onclick = () => {
  const all = steps()
  showStep(all[Math.max(0, all.indexOf(state) - 1)])
}
$('next').onclick = next
$('settings').onclick = async () => {
  const open = $('host').hidden
  if (open && settings.lock && !(await askCode({ title: 'Settings', hint: 'Enter the staff code', cancellable: true }))) return
  $('host').hidden = !open
  $('settings').setAttribute('aria-expanded', String(open))
}
function syncLock() {
  $('lock-on').setAttribute('aria-checked', String(settings.lock))
  $('lock-off').setAttribute('aria-checked', String(!settings.lock))
  $('lock-code').hidden = !settings.lock
}
function setLock(on) {
  settings.lock = on
  localStorage.setItem('booth:lock', on)
  syncLock()
}
$('lock-on').onclick = () => setLock(true)
$('lock-off').onclick = () => setLock(false)
$('lock-code').value = settings.code
$('lock-code').oninput = (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4)
  if (e.target.value.length === 4) {
    settings.code = e.target.value
    localStorage.setItem('booth:code', settings.code)
  }
}
syncLock()
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

buildTiles('count', COUNTS)
buildTiles('pattern', PATTERNS)
applyPaper()
resetCaption()
buildKeys()
startSession()
syncControls()
pollStatus()
setInterval(pollStatus, 5000)
await Promise.all([
  document.fonts.load('900 40px Doto'),
  document.fonts.load('700 80px Caveat'),
]).catch(() => {})
requestAnimationFrame(loop)
