"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
global.TentacledGeometry = require("../web/geometry.js");
const LocalAudio = require("../web/audio.js");

class FakeParam {
  constructor(value = 0) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}

class FakeNode {
  constructor() {
    this.gain = new FakeParam();
    this.frequency = new FakeParam();
    this.type = "sine";
    this.listeners = {};
    this.stopped = false;
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() { this.stopped = true; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
}

class FakeAudioContext {
  constructor() {
    this.state = "running";
    this.currentTime = 1;
    this.sampleRate = 8000;
    this.destination = new FakeNode();
    FakeAudioContext.latest = this;
  }
  createGain() { return new FakeNode(); }
  createOscillator() { return new FakeNode(); }
  createBufferSource() { return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); }
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  async resume() {}
  async close() { this.state = "closed"; }
}

test("all seven sound generators initialize locally and stop their resources", async () => {
  for (const appId of global.TentacledGeometry.APP_IDS) {
    for (const generator of ["tone", "pulse", "kick", "snare", "hi-hat", "wobble", "chord"]) {
      const audio = new LocalAudio(() => new FakeAudioContext());
      await audio.play(generator);
      assert.ok(audio.context, `${appId}/${generator} did not create a local audio context`);
      if (generator === "pulse") assert.equal(audio.timers.size, 1);
      await audio.stopAll();
      assert.equal(audio.context, null);
      assert.equal(audio.timers.size, 0);
      assert.equal(FakeAudioContext.latest.state, "closed");
    }
  }
});

test("live sound tracks valid geometry and stop closes the context", async () => {
  const audio = new LocalAudio(() => new FakeAudioContext());
  await audio.startLive([1, 0, 0]);
  const oscillator = audio.liveNodes[0];
  audio.updateVector([0, 0, 1]);
  assert.equal(oscillator.frequency.value, 660);
  audio.setWaveform("triangle");
  assert.equal(oscillator.type, "triangle");
  await audio.stopAll();
  assert.equal(oscillator.stopped, true);
  assert.equal(FakeAudioContext.latest.state, "closed");
});
