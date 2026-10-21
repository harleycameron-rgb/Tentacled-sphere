(function () {
  'use strict';
  // Tap's coordinate/sensor-bearing logs are deliberately not a bridge output.
  InvariantInstrumentBridge.mount(window, 'tap');
  function stop(exiting = false) {
    tapLifecycleEpoch++;
    tapInactive = true;
    motionActive = false;
    window.removeEventListener('devicemotion', handleMotion, true);
    daemon.unsubscribe();
    daemon.accel = { x: 0, y: 0, z: 0 };
    daemon.orientation = { alpha: null, beta: null, gamma: null };
    daemon.frame = daemon.viewLocal = null;
    daemon.hasCompass = daemon.dipOK = false;
    daemon._magneticHeading = null;
    daemon.source = 'none';
    for (const gate of [GateF, GateM]) {
      try { if (gate.pointerId !== null) canvas.releasePointerCapture(gate.pointerId); } catch {}
      gate.reset();
      gate.running = false;
    }
    document.getElementById('btn-motion').classList.remove('active');
    document.getElementById('btn-pause').textContent = 'Resume';
    document.body.classList.remove('in-use');
    SOO.state = 'READY';
    SOO.orbitLocked = false;
    Descent.active = false;
    Descent.zoom = 1;
    Seq.next = 0;
    Seq.playhead = -1;
    for (const timer of tapToneTimers) clearTimeout(timer);
    tapToneTimers.clear();
    if (tapAnimation !== null) cancelAnimationFrame(tapAnimation);
    tapAnimation = null;
    Audio2.enabled = false;
    if (Audio2.ctx) {
      for (const source of Audio2.sources) {
        try { source.stop(); source.disconnect(); } catch {}
      }
      Audio2.sources.clear();
      Audio2.master.gain.cancelScheduledValues(Audio2.ctx.currentTime);
      Audio2.master.gain.setValueAtTime(0, Audio2.ctx.currentTime);
      if (exiting) {
        for (const oscillator of Audio2.moireOsc) {
          try { oscillator.stop(); oscillator.disconnect(); } catch {}
        }
        Audio2.ctx.close().catch(() => {});
      } else Audio2.ctx.suspend().catch(() => {});
    }
    if (exiting) {
      for (const timer of tapIntervals) clearInterval(timer);
      tapIntervals.length = 0;
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
    }
  }
  function visibility() {
    if (document.hidden) stop();
    else {
      // Rendering may return; motion and sound never return without a user gesture.
      tapInactive = false;
      draw();
    }
  }
  const originalResume = Audio2.resume.bind(Audio2);
  Audio2.resume = function () {
    if (document.hidden || tapInactive) return;
    if (this.ctx) this.master.gain.setValueAtTime(0.28, this.ctx.currentTime);
    originalResume();
  };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', () => stop(true), { once: true });
})();
