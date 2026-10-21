'use strict';
// Local integration: invalidate asynchronous audio work and release resources on exit.
let lifecycleEpoch = 0;
const $ = (id) => document.getElementById(id),
  M = SurfaceModel,
  canvas = $('surface'),
  ctx = canvas.getContext('2d');
const labels = {
  continuous: ['Continuous layer', 'Rounded inward spiral and a quiet pulse in a later loop step.'],
  sawtooth: [
    'Declared crossing violation',
    'Sharp stitches and sawtooth clicks: the synthetic closed-layer rule was crossed.',
  ],
  wobble: [
    'Layer alignment ambiguity',
    'Wavering path and modulated tone: direction or boundary alignment is uncertain.',
  ],
  endpoint: [
    'Unresolved endpoint',
    'Dashed fragment and a silent rhythm step. No continuity is invented.',
  ],
};
let width = 1,
  height = 1,
  traces = [],
  pattern = emptyPattern(),
  step = -1,
  playing = false,
  clock = null,
  nextTick = 0,
  raf = null,
  lastRender = 0,
  traceExpiry = null;
let pointer = null,
  lastPoint = null,
  lastDelta = null,
  lastEmit = 0,
  sequence = 0,
  soundEnabled = true,
  audio = null,
  master = null,
  audioNodes = new Set(),
  audioPulses = 0;
let tiltEnabled = false,
  tiltEpoch = 0,
  tiltTimer = null,
  level = { x: 0, y: 0, faceUp: true },
  levelReceived = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light';
function emptyPattern() {
  return Array.from({ length: M.LIMITS.steps }, () => ({
    kind: 'continuous',
    energy: 0,
    severity: 0,
  }));
}
for (let i = 0; i < 16; i++) {
  const d = document.createElement('span');
  d.className = 'step';
  d.textContent = String(i + 1).padStart(2, '0');
  d.setAttribute('aria-label', 'Step ' + (i + 1) + ': empty');
  $('steps').append(d);
}
function palette() {
  const s = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    ['bg', 'panel', 'grid', 'accent', 'amber', 'ink', 'muted', 'danger', 'border'].map((k) => [
      k,
      s.getPropertyValue('--' + k).trim(),
    ]),
  );
}
function updatePattern() {
  [...$('steps').children].forEach((node, i) => {
    const cell = pattern[i];
    node.classList.toggle('seeded', cell.energy > 0.03);
    node.classList.toggle('active', playing && i === step);
    node.dataset.kind = cell.kind;
    node.setAttribute(
      'aria-label',
      `Step ${i + 1}: ${cell.kind === 'endpoint' ? 'silent endpoint' : cell.energy > 0.03 ? cell.kind : 'empty'}${playing && i === step ? ', current' : ''}`,
    );
  });
  $('loop-status').textContent = playing
    ? step < 0
      ? 'Seeded · starts next beat'
      : `Running · step ${step + 1} / 16`
    : 'Stopped · touch to seed';
}
async function unlockAudio() {
  const epoch = lifecycleEpoch;
  if (!soundEnabled) return;
  try {
    if (!audio) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio unavailable');
      audio = new Audio();
      master = audio.createGain();
      master.gain.value = 0;
      master.connect(audio.destination);
    }
    if (audio.state === 'suspended') await audio.resume();
    if (epoch !== lifecycleEpoch || !soundEnabled || document.hidden) {
      if (audio?.state === 'running') audio.suspend().catch(() => {});
      return;
    }
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setTargetAtTime((Number($('volume').value) / 100) * 0.16, audio.currentTime, 0.04);
    $('audio-status').textContent =
      audio.state === 'running'
        ? 'Local sound enabled. No audio recorder or sound export exists.'
        : 'Sound needs another touch; the visual loop still works.';
  } catch (error) {
    $('audio-status').textContent =
      'Sound unavailable; visual rhythm remains active. ' + error.message;
  }
}
function silence() {
  if (audio && master) {
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setValueAtTime(0, audio.currentTime);
  }
  for (const node of audioNodes) {
    try {
      node.stop();
    } catch {}
    try {
      node.disconnect();
    } catch {}
  }
  audioNodes.clear();
}
function tone(cell, delay = 0.02) {
  if (
    !soundEnabled ||
    !audio ||
    audio.state !== 'running' ||
    cell.energy <= 0.03 ||
    cell.kind === 'endpoint' ||
    audioNodes.size >= 48
  )
    return;
  const start = audio.currentTime + Math.max(0.015, delay),
    duration = cell.kind === 'sawtooth' ? 0.075 : 0.18,
    osc = audio.createOscillator(),
    gain = audio.createGain();
  osc.type = cell.kind === 'sawtooth' ? 'sawtooth' : cell.kind === 'wobble' ? 'triangle' : 'sine';
  const pitch = cell.kind === 'sawtooth' ? 390 : cell.kind === 'wobble' ? 220 : 146;
  osc.frequency.setValueAtTime(pitch, start);
  if (cell.kind === 'wobble') {
    osc.frequency.linearRampToValueAtTime(pitch + 35 * cell.severity, start + 0.05);
    osc.frequency.linearRampToValueAtTime(pitch - 20 * cell.severity, start + 0.12);
  } else osc.frequency.exponentialRampToValueAtTime(pitch * 0.72, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, cell.energy * 0.45), start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(master);
  audioNodes.add(osc);
  osc.onended = () => {
    audioNodes.delete(osc);
    osc.disconnect();
    gain.disconnect();
  };
  osc.start(start);
  osc.stop(start + duration + 0.02);
  audioPulses++;
}
function tick() {
  const now = performance.now();
  if (!playing || document.hidden) return;
  // Skip elapsed beats after a delayed tab, never emit an unbounded catch-up burst.
  if (nextTick < now - 150) nextTick = now + 50;
  if (nextTick > now + 65) return;
  step = (step + 1) % 16;
  tone(pattern[step], (nextTick - now) / 1000);
  pattern[step].energy *= 0.93;
  nextTick += 60000 / Number($('tempo').value) / 2;
  updatePattern();
  requestDraw();
}
function startLoop() {
  if (playing) return;
  playing = true;
  step = -1;
  nextTick = performance.now() + 120;
  clock = setInterval(tick, 45);
  updatePattern();
  requestDraw();
}
function stopLoop() {
  playing = false;
  if (clock !== null) clearInterval(clock);
  clock = null;
  cleanPointer();
  silence();
  updatePattern();
  $('field-state').textContent = 'Loop stopped';
}
function cleanPointer() {
  const captured = pointer;
  pointer = null;
  if (captured !== null) {
    try { canvas.releasePointerCapture(captured); } catch {}
  }
  lastPoint = null;
  lastDelta = null;
}
function clearOutputs() {
  stopLoop();
  traces = [];
  pattern = emptyPattern();
  cleanPointer();
  sequence = 0;
  audioPulses = 0;
  if (traceExpiry !== null) clearTimeout(traceExpiry);
  traceExpiry = null;
  $('condition').dataset.kind = 'continuous';
  $('condition-title').textContent = 'Continuous layer';
  $('condition-detail').textContent =
    'Touch excites an inward spiral and a rounded pulse; it does not change curvature.';
  $('caption').textContent = 'Contact seeds the next rhythm steps.';
  $('field-state').textContent = 'Outputs cleared';
  updatePattern();
  draw();
}
function emit(event, source = 'touch') {
  const derived = {
    kind: event.kind,
    angle: event.angle,
    band: event.band,
    severity: event.severity,
    energy: event.energy,
  };
  traces.push({ ...derived, born: performance.now(), id: ++sequence });
  if (traces.length > M.LIMITS.traces) traces.shift();
  scheduleExpiry();
  pattern = M.seed(pattern, derived, Math.max(step, 0));
  startLoop();
  updatePattern();
  $('condition').dataset.kind = derived.kind;
  $('condition-title').textContent = labels[derived.kind][0];
  $('condition-detail').textContent = labels[derived.kind][1];
  $('field-state').textContent =
    source === 'fixture' ? 'Synthetic fixture output' :
      source === 'movement' ? 'Movement shapes the derived rhythm' : 'Contact excites output';
  $('caption').textContent =
    derived.kind === 'endpoint'
      ? 'Endpoint unresolved; this rhythm step stays silent.'
      : 'Touch seeds the loop; the field answers indirectly.';
  requestDraw();
  window.SurfaceDerivedOutput?.publish(pattern, source);
}
function padPoint(e) {
  const b = canvas.getBoundingClientRect(),
    scale = Math.min(b.width, b.height) * 0.36;
  return M.point(
    (e.clientX - b.left - b.width / 2) / scale,
    (e.clientY - b.top - b.height * 0.45) / scale,
  );
}
function begin(e) {
  if (pointer !== null) return;
  e.preventDefault();
  pointer = e.pointerId;
  try {
    canvas.setPointerCapture(pointer);
  } catch {}
  unlockAudio();
  lastPoint = padPoint(e);
  lastDelta = null;
  lastEmit = performance.now();
  emit(M.classify(lastPoint), e.isTrusted === true ? 'touch' : 'fixture');
}
canvas.addEventListener('pointerdown', begin);
canvas.addEventListener('pointermove', (e) => {
  if (pointer !== e.pointerId) return;
  e.preventDefault();
  const p = padPoint(e),
    event = M.classify(p, lastPoint, lastDelta);
  lastPoint = p;
  lastDelta = event.delta;
  const now = performance.now();
  if (event.kind === 'sawtooth' || now - lastEmit >= 65) {
    lastEmit = now;
    emit(event, e.isTrusted === true ? 'movement' : 'fixture');
  }
});
function finish(e) {
  if (pointer !== e.pointerId) return;
  // Retry from release as well for browsers that unlock audio on touch end.
  if (soundEnabled) unlockAudio();
  cleanPointer();
  $('field-state').textContent = 'Released · derived loop continues';
}
canvas.addEventListener('pointerup', finish);
canvas.addEventListener('pointercancel', (e) => {
  if (pointer !== e.pointerId) return;
  cleanPointer();
  stopLoop();
  $('field-state').textContent = 'Contact cancelled · loop stopped';
});
canvas.addEventListener('lostpointercapture', (e) => {
  if (pointer === e.pointerId) {
    cleanPointer();
    stopLoop();
  }
});
canvas.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    unlockAudio();
    emit({ kind: 'continuous', angle: 0, band: 1, severity: 0.2, energy: 0.5 }, 'keyboard');
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    stopLoop();
  }
});
function fixture(kind) {
  unlockAudio();
  emit({ kind, angle: -Math.PI / 3, band: 2, severity: 0.75, energy: 0.65 }, 'fixture');
}
$('sample').onclick = () => fixture('continuous');
$('saw').onclick = () => fixture('sawtooth');
$('wobble').onclick = () => fixture('wobble');
$('endpoint').onclick = () => fixture('endpoint');
$('stop').onclick = stopLoop;
$('clear').onclick = clearOutputs;
$('sound').onclick = () => {
  soundEnabled = !soundEnabled;
  $('sound').textContent = 'Sound: ' + (soundEnabled ? 'on' : 'off');
  $('sound').setAttribute('aria-pressed', String(soundEnabled));
  if (soundEnabled) unlockAudio();
  else {
    silence();
    $('audio-status').textContent = 'Muted. Visual traces and the derived rhythm remain available.';
  }
};
$('tempo').oninput = () => {
  $('tempo-value').textContent = $('tempo').value + ' BPM';
};
$('volume').oninput = () => {
  $('volume-value').textContent = $('volume').value + '%';
  if (audio && master && soundEnabled)
    master.gain.setTargetAtTime((Number($('volume').value) / 100) * 0.16, audio.currentTime, 0.04);
};
$('altitude').onchange = () => {
  const value = $('altitude').value;
  if (value === '') return;
  const n = Number(value);
  if (!Number.isFinite(n) || n < -500 || n > 9000) {
    $('altitude').value = '';
    $('altitude').setCustomValidity('Use a declared context between -500 and 9000 metres.');
    $('altitude').reportValidity();
  } else $('altitude').setCustomValidity('');
};
$('altitude').oninput = () => $('altitude').setCustomValidity('');
function orientation(e) {
  if (!tiltEnabled || document.hidden || !Number.isFinite(e.beta) || !Number.isFinite(e.gamma))
    return;
  const rotation = window.screen?.orientation?.angle ?? (Number(window.orientation) || 0);
  level = M.level(e.beta, e.gamma, rotation);
  levelReceived = true;
  if (tiltTimer !== null) {
    clearTimeout(tiltTimer);
    tiltTimer = null;
  }
  $('level-status').textContent = level.faceUp
    ? 'Tilt proxy / face outward'
    : 'Tilt proxy / face inward';
  requestDraw();
}
function disableTilt() {
  tiltEpoch++;
  tiltEnabled = false;
  window.removeEventListener('deviceorientation', orientation);
  if (tiltTimer !== null) clearTimeout(tiltTimer);
  tiltTimer = null;
  level = { x: 0, y: 0, faceUp: true };
  levelReceived = false;
  $('tilt').textContent = 'Enable tilt';
  $('level-status').textContent = 'Symbolic / tilt off';
  requestDraw();
}
$('tilt').onclick = async () => {
  if (tiltEnabled) {
    disableTilt();
    return;
  }
  const epoch = ++tiltEpoch;
  if (typeof DeviceOrientationEvent === 'undefined') {
    $('level-status').textContent = 'Unavailable / symbolic';
    return;
  }
  $('tilt').disabled = true;
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const answer = await DeviceOrientationEvent.requestPermission();
      if (epoch !== tiltEpoch || document.hidden) return;
      if (answer !== 'granted') {
        $('level-status').textContent = 'Permission denied / symbolic';
        return;
      }
    }
    if (epoch !== tiltEpoch || document.hidden) return;
    tiltEnabled = true;
    window.addEventListener('deviceorientation', orientation);
    $('tilt').textContent = 'Disable tilt';
    $('level-status').textContent = 'Waiting for tilt';
    tiltTimer = setTimeout(() => {
      if (tiltEnabled && !levelReceived) $('level-status').textContent = 'No readings / symbolic';
    }, 2500);
  } catch {
    $('level-status').textContent = 'Tilt unavailable / symbolic';
  } finally {
    $('tilt').disabled = false;
  }
};
function requestDraw() {
  if (raf === null) raf = requestAnimationFrame(frame);
}
function scheduleExpiry() {
  if (traceExpiry !== null) clearTimeout(traceExpiry);
  traceExpiry = null;
  if (!traces.length) return;
  traceExpiry = setTimeout(
    () => {
      traceExpiry = null;
      const now = performance.now();
      traces = traces.filter((t) => now - t.born < M.LIMITS.traceTTL);
      draw();
      scheduleExpiry();
    },
    Math.max(10, traces[0].born + M.LIMITS.traceTTL - performance.now() + 10),
  );
}
function frame(now) {
  raf = null;
  traces = traces.filter((t) => now - t.born < M.LIMITS.traceTTL);
  if (now - lastRender > 32 || reduced.matches) {
    draw();
    lastRender = now;
  }
  if (!document.hidden && traces.length && !reduced.matches) requestDraw();
}
function draw() {
  const p = palette(),
    now = performance.now(),
    s = Math.min(width, height) * 0.36,
    cx = width / 2,
    cy = height * 0.45;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = p.grid;
  ctx.lineWidth = 0.6;
  for (let x = 0; x < width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (const [i, r] of [0.36, 0.64, 0.9].entries()) {
    ctx.strokeStyle = i === 1 ? p.amber : p.accent;
    ctx.globalAlpha = i === 1 ? 0.7 : 0.25;
    ctx.lineWidth = i === 1 ? 1.3 : 0.8;
    ctx.setLineDash(i === 1 ? [4, 5] : []);
    ctx.beginPath();
    ctx.arc(cx, cy, s * r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  for (const t of traces) {
    const age = Math.max(0, now - t.born) / M.LIMITS.traceTTL,
      progress = reduced.matches ? 1 : Math.min(1, (now - t.born) / 1000 + 0.18),
      r0 = 0.35 + t.band * 0.17;
    ctx.strokeStyle = t.kind === 'sawtooth' ? p.danger : t.kind === 'wobble' ? p.amber : p.accent;
    ctx.globalAlpha = Math.max(0, 0.8 * (1 - age));
    ctx.lineWidth = 1.6;
    ctx.setLineDash(t.kind === 'endpoint' ? [3, 5] : []);
    ctx.beginPath();
    const count = t.kind === 'endpoint' ? 25 : 90;
    for (let i = 0; i <= count * progress; i++) {
      const u = i / count,
        zig =
          t.kind === 'sawtooth'
            ? (i % 4 < 2 ? 1 : -1) * 0.04 * t.severity
            : t.kind === 'wobble'
              ? Math.sin(u * 36) * 0.055 * t.severity
              : 0;
      const radius = r0 * (1 - u * 0.68) + zig,
        angle = t.angle + u * Math.PI * (t.kind === 'endpoint' ? 0.4 : 2.6) + zig;
      const x = cx + Math.cos(angle) * s * radius,
        y = cy + Math.sin(angle) * s * radius;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  // Opaque central mark: an occluded reference, never an exposed core or radius fit.
  ctx.fillStyle = p.panel;
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(
    cx + (tiltEnabled ? level.x : 0) * 18,
    cy + (tiltEnabled ? level.y : 0) * 18,
    3.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.font = '400 12px Satoshi, sans-serif';
  ctx.fillStyle = p.muted;
  ctx.textAlign = 'center';
  ctx.fillText('CORE REF', cx, cy + 51);
  $('trace-count').textContent = traces.length + ' / 24';
}
function resize() {
  const b = canvas.getBoundingClientRect(),
    d = Math.min(devicePixelRatio || 1, 2);
  width = b.width;
  height = b.height;
  canvas.width = Math.round(width * d);
  canvas.height = Math.round(height * d);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  draw();
}
const surfaceResizeObserver = new ResizeObserver(resize);
surfaceResizeObserver.observe(canvas);
$('theme').onclick = () => {
  document.documentElement.dataset.theme =
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  draw();
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    lifecycleEpoch++;
    clearOutputs();
    disableTilt();
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    if (audio?.state === 'running') audio.suspend().catch(() => {});
  }
});
window.addEventListener('pagehide', () => {
  lifecycleEpoch++;
  clearOutputs();
  disableTilt();
  if (raf !== null) cancelAnimationFrame(raf);
  raf = null;
  surfaceResizeObserver.disconnect();
  if (audio) audio.close().catch(() => {});
});
// Read-only diagnostic snapshot: no contact samples, audio buffers or raw sensor history.
window.SurfaceOutput = Object.freeze({
  snapshot: () => ({
    version: 2,
    playing,
    step,
    traceCount: traces.length,
    pattern: pattern.map((c) => ({ ...c })),
    soundEnabled,
    audioState: audio?.state || 'not-started',
    activeNodes: audioNodes.size,
    audioPulses,
    tiltEnabled,
    rawContactHistory: 0,
    recorder: false,
    coreBalance: 'not_measured',
  }),
});
updatePattern();
