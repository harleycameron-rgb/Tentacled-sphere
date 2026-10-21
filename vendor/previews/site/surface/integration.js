(function () {
  'use strict';
  const bridge = InvariantInstrumentBridge.mount(window, 'surface');
  let lastPublication = -Infinity;
  window.SurfaceDerivedOutput = Object.freeze({
    publish(pattern, source) {
      if (document.hidden) return false;
      // Bound export cadence independently of pointer speed; retain no sample queue.
      const now = performance.now();
      if (now - lastPublication < 250) return false;
      const record = SurfaceDerivedAdapter.derive(pattern, source);
      if (!bridge.publish(record)) return false;
      lastPublication = now;
      return true;
    },
  });
  window.addEventListener('pagehide', () => {
    delete window.SurfaceDerivedOutput;
  }, { once: true });
})();
