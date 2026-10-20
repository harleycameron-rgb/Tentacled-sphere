'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Model = require('../vendor/previews/site/surface/model.js');
const Adapter = require('../vendor/previews/site/surface/derived-output.js');
const Bridge = require('../vendor/instrument-bridge.js');

const empty = () => Array.from({ length: 16 }, () => ({
  kind: 'continuous', energy: 0, severity: 0,
}));
function target(value = {}) {
  const listeners = new Map();
  return Object.assign(value, {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    fire(type, event = {}) {
      for (const fn of [...(listeners.get(type) || [])]) fn(event);
    },
    listenerCount(type) { return listeners.get(type)?.size || 0; },
  });
}
function host() {
  const messages = [], elements = new Map(), timers = new Map(), intervals = new Map();
  let serial = 0, now = 1000;
  const context2d = new Proxy({}, {
    get(object, name) {
      if (name in object) return object[name];
      return name.startsWith('create')
        ? () => ({ addColorStop() {} })
        : () => {};
    },
  });
  function element() {
    const classes = new Set();
    return target({
      children: [], style: { setProperty() {} }, dataset: {}, textContent: '', value: '',
      classList: {
        add(c) { classes.add(c); }, remove(c) { classes.delete(c); },
        contains(c) { return classes.has(c); },
        toggle(c, on = !classes.has(c)) { on ? classes.add(c) : classes.delete(c); return on; },
      },
      setAttribute() {}, append(...items) { this.children.push(...items); },
      appendChild(item) { this.children.push(item); }, getContext() { return context2d; },
      getBoundingClientRect() { return { left: 0, top: 0, width: 600, height: 600 }; },
      setPointerCapture() {}, releasePointerCapture() {}, querySelector() { return element(); },
      querySelectorAll() { return []; }, remove() {},
    });
  }
  const document = target({
    hidden: false, documentElement: element(), body: element(),
    createElement: element,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
  });
  document.getElementById('tempo').value = '84';
  document.getElementById('volume').value = '18';
  const contexts = [], sources = [], observers = [];
  function audioNode() {
    const param = new Proxy({ value: 0 }, { get: (o, k) => k in o ? o[k] : () => {} });
    return {
      gain: param, frequency: param, detune: param, Q: param,
      connect() {}, disconnect() { this.disconnected = true; },
      start() {}, stop() { this.stopped = true; },
    };
  }
  class AudioContext {
    constructor() {
      this.state = 'running'; this.currentTime = 0; this.sampleRate = 4;
      this.destination = {}; contexts.push(this);
    }
    createGain() { return audioNode(); }
    createOscillator() { const n = audioNode(); sources.push(n); return n; }
    createBufferSource() { const n = audioNode(); sources.push(n); return n; }
    createBiquadFilter() { return audioNode(); }
    createConvolver() { return audioNode(); }
    createWaveShaper() { return audioNode(); }
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.state = 'closed'; }
  }
  const sandbox = target({
    document, location: { origin: 'https://invariant.test', hash: '' },
    parent: { postMessage(message, origin) { messages.push({ message, origin }); } },
    performance: { now: () => now }, matchMedia: () => ({ matches: false }),
    getComputedStyle: () => ({ getPropertyValue: () => '#102030' }),
    AudioContext, devicePixelRatio: 1, innerWidth: 600, innerHeight: 600,
    setTimeout(fn) { const id = ++serial; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(fn) { const id = ++serial; intervals.set(id, fn); return id; },
    clearInterval(id) { intervals.delete(id); },
    requestAnimationFrame(fn) { const id = ++serial; timers.set(id, fn); return id; },
    cancelAnimationFrame(id) { timers.delete(id); },
    ResizeObserver: class {
      constructor() { observers.push(this); }
      observe() {} disconnect() { this.disconnected = true; }
    },
    TextEncoder, URLSearchParams, console,
    crypto: require('node:crypto').webcrypto,
    DeviceMotionEvent: class {}, DeviceOrientationEvent: class {},
  });
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const load = (name) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), context);
  return {
    sandbox, context, document, messages, elements, contexts, sources, observers, timers, intervals,
    load, advance(ms) { now += ms; },
    evaluate(code) { return vm.runInContext(code, context); },
  };
}
function surface() {
  const h = host();
  for (const file of ['vendor/previews/site/surface/model.js', 'vendor/instrument-bridge.js',
    'vendor/previews/site/surface/derived-output.js', 'vendor/previews/site/surface/app.js',
    'vendor/previews/site/surface/integration.js']) h.load(file);
  return h;
}
const plain = value => JSON.parse(JSON.stringify(value));

test('pinned model classifies crossings, ambiguities and silent unresolved endpoints', () => {
  const at = x => ({ x, y: 0 });
  assert.equal(Model.classify(at(0.2)).kind, 'continuous');
  assert.equal(Model.classify(at(0.7), at(0.55)).kind, 'sawtooth');
  assert.equal(Model.classify(at(0.645)).kind, 'wobble');
  assert.equal(Model.classify(at(1.2), at(0.5)).kind, 'endpoint');
  assert.throws(() => Model.point(NaN, 0));
  assert.deepEqual(Model.level(0, 0), { x: 0, y: 0, faceUp: true });
});

test('adapter aggregates actual seeded model state without coordinates or histories', () => {
  const event = Model.classify({ x: 0.7, y: 0 }, { x: 0.55, y: 0 });
  const pattern = Model.seed(empty(), event, 0);
  const record = Adapter.derive(pattern, 'movement');
  assert.deepEqual(record, {
    schema: 'instrument-output/v1', instrument: 'surface', adapter: 'surface-derived/v1',
    frame: 'surface-local', units: 'normalized', scope: 'local-derived-unverified',
    source: 'movement',
    output: {
      activity: pattern.reduce((sum, cell) => sum + cell.energy / 16, 0),
      severity: pattern.reduce((sum, cell) => sum + cell.severity / 16, 0),
      occupancy: 3 / 16, unresolved: 0,
    },
  });
  pattern[2].energy = 0;
  assert.ok(record.output.activity > 0);
  assert.equal(JSON.stringify(record).includes('"angle"'), false);
  assert.equal(JSON.stringify(record).includes('"delta"'), false);
});

test('adapter preserves silence and rejects invalid or unbounded derived state', () => {
  const event = Model.classify({ x: 1.2, y: 0 });
  const pattern = Model.seed(empty(), event, 0);
  assert.deepEqual(Adapter.derive(pattern, 'touch').output, {
    activity: 0, severity: 1 / 16, occupancy: 0, unresolved: 1 / 16,
  });
  for (const bad of [NaN, Infinity, -0.1, 1.1, '0.5']) {
    const state = empty(); state[0].energy = bad;
    assert.throws(() => Adapter.derive(state, 'touch'));
  }
  assert.throws(() => Adapter.derive(empty().slice(1), 'touch'));
  assert.throws(() => Adapter.derive(empty(), 'sensor'));
});

test('bridge only accepts exact same-origin parent text status messages', () => {
  const h = host(), bridge = Bridge.mount(h.sandbox, 'surface');
  const status = h.document.body.children[0];
  const initial = status.textContent;
  const message = { type: 'invariant:derived-input', status: '<b>sample counterexample</b>' };
  for (const event of [
    { source: h.sandbox.parent, origin: 'https://other.test', data: message },
    { source: {}, origin: h.sandbox.location.origin, data: message },
    { source: h.sandbox.parent, origin: h.sandbox.location.origin, data: { ...message, record: {} } },
    { source: h.sandbox.parent, origin: h.sandbox.location.origin, data: { ...message, status: 'x'.repeat(241) } },
  ]) h.sandbox.fire('message', event);
  assert.equal(status.textContent, initial);
  h.sandbox.fire('message', { source: h.sandbox.parent, origin: h.sandbox.location.origin, data: message });
  assert.match(status.textContent, /unverified; not activation, launch or calibration/);
  assert.match(status.textContent, /<b>sample counterexample<\/b>/);
  assert.equal(status.innerHTML, undefined);
  assert.equal(bridge.publish({ schema: 'instrument-output/v1' }), true);
  assert.equal(h.messages[0].origin, 'https://invariant.test');
  assert.equal(h.messages[0].message.type, 'invariant:instrument-output');
});

test('bridge hides, disposes listeners and refuses standalone or opaque-origin output', () => {
  const h = host(), bridge = Bridge.mount(h.sandbox, 'tap');
  h.document.hidden = true;
  assert.equal(bridge.publish({}), false);
  h.document.hidden = false;
  h.sandbox.fire('pagehide');
  assert.equal(bridge.publish({}), false);
  assert.equal(h.sandbox.listenerCount('message'), 0);
  h.sandbox.parent = h.sandbox;
  assert.equal(Bridge.mount(h.sandbox, 'tap').publish({}), false);
  h.sandbox.location.origin = 'null';
  assert.equal(Bridge.mount(h.sandbox, 'surface').publish({}), false);
});

test('real Surface pointer flow exports model-derived aggregates and bounded cadence', () => {
  const h = surface(), canvas = h.document.getElementById('surface');
  assert.equal(h.messages.length, 0);
  canvas.fire('pointerdown', { isTrusted: true, pointerId: 1, clientX: 300, clientY: 270, preventDefault() {} });
  assert.equal(h.messages.length, 1);
  const expected = Adapter.derive(Model.seed(empty(), Model.classify({ x: 0, y: 0 }), 0), 'touch');
  assert.deepEqual(plain(h.messages[0].message.record), expected);
  h.document.getElementById('saw').onclick();
  assert.equal(h.messages.length, 1);
  h.advance(250);
  h.document.getElementById('endpoint').onclick();
  assert.equal(h.messages.length, 2);
  assert.equal(h.messages[1].message.record.source, 'fixture');
  assert.ok(h.messages[1].message.record.output.unresolved > 0);
  h.advance(250);
  canvas.fire('keydown', { key: 'Enter', preventDefault() {} });
  assert.equal(h.messages[2].message.record.source, 'keyboard');
});

test('dispatched Surface pointer input remains explicitly synthetic', () => {
  const h = surface(), canvas = h.document.getElementById('surface');
  canvas.fire('pointerdown', { isTrusted: false, pointerId: 1, clientX: 300, clientY: 270, preventDefault() {} });
  assert.equal(h.messages[0].message.record.source, 'fixture');
  h.advance(250);
  canvas.fire('pointermove', { isTrusted: false, pointerId: 1, clientX: 400, clientY: 280, preventDefault() {} });
  assert.equal(h.messages[1].message.record.source, 'fixture');
});

test('Surface hiding stops rhythm, audio, tilt and raw contact without sensor auto-resume', async () => {
  const h = surface();
  h.document.getElementById('sample').onclick();
  await h.document.getElementById('tilt').onclick();
  assert.equal(h.sandbox.listenerCount('deviceorientation'), 1);
  assert.equal(h.contexts.length, 1);
  h.document.hidden = true;
  h.document.fire('visibilitychange');
  const state = plain(h.sandbox.SurfaceOutput.snapshot());
  assert.equal(state.playing, false);
  assert.equal(state.traceCount, 0);
  assert.equal(state.tiltEnabled, false);
  assert.ok(state.pattern.every(cell => cell.energy === 0));
  assert.equal(h.contexts[0].state, 'suspended');
  assert.equal(h.sandbox.listenerCount('deviceorientation'), 0);
  h.document.hidden = false;
  h.document.fire('visibilitychange');
  assert.equal(h.contexts[0].state, 'suspended');
  assert.equal(h.sandbox.listenerCount('deviceorientation'), 0);
  h.sandbox.fire('pagehide');
  assert.equal(h.contexts[0].state, 'closed');
  assert.equal(h.observers[0].disconnected, true);
  assert.equal(h.sandbox.SurfaceDerivedOutput, undefined);
});

test('Surface permission completion after hiding never reattaches sensors', async () => {
  const h = surface();
  let resolve;
  h.sandbox.DeviceOrientationEvent.requestPermission = () => new Promise(r => { resolve = r; });
  const request = h.document.getElementById('tilt').onclick();
  h.document.hidden = true;
  h.document.fire('visibilitychange');
  resolve('granted');
  await request;
  assert.equal(h.sandbox.listenerCount('deviceorientation'), 0);
  assert.equal(h.sandbox.SurfaceOutput.snapshot().tiltEnabled, false);
});

test('Surface audio resume completing after hide is suspended again', async () => {
  const h = surface();
  h.document.getElementById('sample').onclick();
  const audio = h.contexts[0];
  audio.state = 'suspended';
  let resolve;
  audio.resume = () => new Promise(r => {
    resolve = () => { audio.state = 'running'; r(); };
  });
  const pending = h.evaluate('unlockAudio()');
  h.document.hidden = true;
  h.document.fire('visibilitychange');
  h.document.hidden = false;
  h.document.fire('visibilitychange');
  resolve();
  await pending;
  assert.equal(audio.state, 'suspended');
});

function tap() {
  const h = host();
  h.load('vendor/tap/sentinel_dot.js');
  h.load('vendor/instrument-bridge.js');
  const html = fs.readFileSync(path.join(__dirname, '../vendor/tap/index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 1);
  vm.runInContext(scripts[0][1], h.context);
  h.load('vendor/tap/lifecycle.js');
  return { ...h, html };
}

test('Tap executes original canvas controls and cleans motion/audio without fabricating output', async () => {
  const h = tap();
  h.document.getElementById('btn-perm-no').fire('click');
  await h.document.getElementById('btn-motion').fire('click', {
    target: h.document.getElementById('btn-motion'),
  });
  await Promise.resolve();
  assert.equal(h.sandbox.listenerCount('devicemotion'), 2);
  assert.equal(h.contexts[0].state, 'running');
  h.document.hidden = true;
  h.document.fire('visibilitychange');
  assert.equal(h.contexts[0].state, 'suspended');
  assert.equal(h.sandbox.listenerCount('devicemotion'), 0);
  assert.equal(h.sandbox.listenerCount('deviceorientation'), 0);
  assert.equal(h.evaluate('GateF.running'), false);
  h.document.hidden = false;
  h.document.fire('visibilitychange');
  assert.equal(h.contexts[0].state, 'suspended');
  assert.equal(h.sandbox.listenerCount('devicemotion'), 0);
  h.sandbox.fire('pagehide');
  assert.equal(h.contexts[0].state, 'closed');
  assert.equal(h.intervals.size, 0);
  assert.equal(h.sandbox.listenerCount('message'), 0);
  assert.equal(h.messages.length, 0);
  assert.equal(/serviceWorker\.register/.test(h.html), false);
});

test('Tap permission completion after hide cannot activate or prompt for the next sensor', async () => {
  const h = tap();
  let resolve, orientationRequests = 0;
  h.sandbox.DeviceMotionEvent.requestPermission = () => new Promise(r => { resolve = r; });
  h.sandbox.DeviceOrientationEvent.requestPermission = async () => {
    orientationRequests++; return 'granted';
  };
  const pending = h.evaluate('enableMotion()');
  h.document.hidden = true;
  h.document.fire('visibilitychange');
  h.document.hidden = false;
  h.document.fire('visibilitychange');
  resolve('granted');
  assert.equal(await pending, false);
  assert.equal(orientationRequests, 0);
  assert.equal(h.sandbox.listenerCount('devicemotion'), 0);
  assert.equal(h.evaluate('motionActive'), false);
});
