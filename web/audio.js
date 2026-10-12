(function (root) {
  "use strict";

  class LocalAudio {
    constructor(contextFactory) {
      this.contextFactory = contextFactory || (() => {
        const Context = root.AudioContext || root.webkitAudioContext;
        if (!Context) throw new Error("Web Audio is not supported by this browser.");
        return new Context();
      });
      this.context = null;
      this.master = null;
      this.waveform = "sine";
      this.volume = 0.25;
      this.tone = 440;
      this.nodes = new Set();
      this.timers = new Set();
      this.liveNodes = [];
      this.liveVector = null;
    }

    async unlock() {
      if (!this.context) {
        this.context = this.contextFactory();
        this.master = this.context.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") await this.context.resume();
      return this.context;
    }

    setWaveform(value) {
      if (!["sine", "square", "sawtooth", "triangle"].includes(value)) {
        throw new TypeError("Unsupported waveform");
      }
      this.waveform = value;
      for (const oscillator of this.liveNodes) oscillator.type = value;
    }

    setVolume(value) {
      const volume = Number(value);
      if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
        throw new RangeError("Volume must be from 0 to 1");
      }
      this.volume = volume;
      if (this.master && this.context) {
        this.master.gain.setTargetAtTime(volume, this.context.currentTime, 0.01);
      }
    }

    setTone(value) {
      const tone = Number(value);
      if (!Number.isFinite(tone) || tone < 40 || tone > 2000) {
        throw new RangeError("Tone must be from 40 to 2000 Hz");
      }
      this.tone = tone;
      this.updateVector(this.liveVector);
    }

    frequencyFor(vector) {
      const normalized = root.TentacledGeometry.normalize(vector);
      return Math.max(40, Math.min(2000, this.tone * (1 + normalized[2] * 0.5)));
    }

    async startLive(vector) {
      await this.unlock();
      this.stopLive();
      this.liveVector = root.TentacledGeometry.normalize(vector);
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = this.waveform;
      oscillator.frequency.value = this.frequencyFor(this.liveVector);
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start();
      this.liveNodes = [oscillator];
      this.nodes.add(oscillator);
      this.nodes.add(gain);
    }

    updateVector(vector) {
      if (!vector) return;
      this.liveVector = root.TentacledGeometry.normalize(vector);
      const frequency = this.frequencyFor(this.liveVector);
      if (this.context) {
        for (const oscillator of this.liveNodes) {
          oscillator.frequency.setTargetAtTime(frequency, this.context.currentTime, 0.03);
        }
      }
    }

    stopLive() {
      for (const oscillator of this.liveNodes) {
        try { oscillator.stop(); } catch (_) { /* Already stopped. */ }
      }
      this.liveNodes = [];
      this.liveVector = null;
    }

    async toneBurst(frequency = this.tone, duration = 0.18, waveform = this.waveform) {
      await this.unlock();
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const start = this.context.currentTime;
      oscillator.type = waveform;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + duration);
      this.track(oscillator, gain);
    }

    async noiseBurst(highpass, duration) {
      await this.unlock();
      const buffer = this.context.createBuffer(
        1,
        Math.max(1, Math.ceil(this.context.sampleRate * duration)),
        this.context.sampleRate,
      );
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      const start = this.context.currentTime;
      source.buffer = buffer;
      filter.type = "highpass";
      filter.frequency.value = highpass;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start(start);
      source.stop(start + duration);
      this.track(source, filter, gain);
    }

    async play(name) {
      if (name === "tone") return this.toneBurst(this.tone, 0.25);
      if (name === "pulse") {
        await this.toneBurst(this.tone, 0.12);
        const timer = setInterval(() => this.toneBurst(this.tone, 0.12), 400);
        this.timers.add(timer);
        return;
      }
      if (name === "kick") return this.toneBurst(65, 0.3, "sine");
      if (name === "snare") return this.noiseBurst(900, 0.2);
      if (name === "hi-hat") return this.noiseBurst(6500, 0.08);
      if (name === "wobble") {
        await this.unlock();
        this.stopLive();
        const oscillator = this.context.createOscillator();
        const lfo = this.context.createOscillator();
        const lfoGain = this.context.createGain();
        const gain = this.context.createGain();
        oscillator.type = this.waveform;
        oscillator.frequency.value = this.tone;
        lfo.frequency.value = 5;
        lfoGain.gain.value = this.tone * 0.3;
        gain.gain.value = 0.12;
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        oscillator.connect(gain);
        gain.connect(this.master);
        oscillator.start();
        lfo.start();
        this.liveNodes = [oscillator, lfo];
        this.nodes.add(oscillator);
        this.nodes.add(lfo);
        this.nodes.add(lfoGain);
        this.nodes.add(gain);
        return;
      }
      if (name === "chord") {
        await Promise.all([0, 4, 7].map((semitones) =>
          this.toneBurst(this.tone * 2 ** (semitones / 12), 0.45)));
        return;
      }
      throw new TypeError("Unknown sound generator");
    }

    track(...nodes) {
      nodes.forEach((node) => this.nodes.add(node));
      const last = nodes[0];
      last.addEventListener("ended", () => {
        nodes.forEach((node) => {
          this.nodes.delete(node);
          try { node.disconnect(); } catch (_) { /* Already disconnected. */ }
        });
      }, { once: true });
    }

    async stopAll() {
      for (const timer of this.timers) clearInterval(timer);
      this.timers.clear();
      this.stopLive();
      for (const node of this.nodes) {
        try { node.stop(); } catch (_) { /* Node may have ended already. */ }
        try { node.disconnect(); } catch (_) { /* Already disconnected. */ }
      }
      this.nodes.clear();
      if (this.context) {
        const context = this.context;
        this.context = null;
        this.master = null;
        if (context.state !== "closed") await context.close();
      }
    }
  }

  if (typeof module !== "undefined" && module.exports) module.exports = LocalAudio;
  root.TentacledAudio = LocalAudio;
})(typeof window !== "undefined" ? window : globalThis);
