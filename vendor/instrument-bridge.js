(function (root) {
  'use strict';
  function mount(host, instrument) {
    const origin = host.location.origin;
    if (!['tap', 'surface'].includes(instrument)) throw Error('unsupported-instrument');
    const status = host.document.createElement('p');
    status.id = 'invariant-derived-status';
    status.setAttribute('role', 'status');
    status.style.cssText = instrument === 'tap'
      ? 'position:fixed;left:12px;bottom:44px;z-index:14;max-width:80vw;padding:8px;background:#08121b;color:#e1edf0;font:12px system-ui;pointer-events:none'
      : 'padding:12px;border:1px solid currentColor;font:14px system-ui';
    status.textContent = 'Local integration: derived results are unverified; not activation, launch or sensor calibration.';
    host.document.body.append(status);
    let disposed = false;
    function receive(event) {
      if (disposed || host.document.hidden || origin === 'null' ||
          host.parent === host || event.source !== host.parent || event.origin !== origin) return;
      const data = event.data;
      if (!data || typeof data !== 'object' || Array.isArray(data) ||
          Object.keys(data).sort().join('|') !== 'status|type' ||
          data.type !== 'invariant:derived-input' || typeof data.status !== 'string' ||
          !data.status.trim() || data.status.length > 240) return;
      status.textContent =
        'Local derived status (unverified; not activation, launch or calibration): ' + data.status;
    }
    function clear() {
      if (host.document.hidden)
        status.textContent = 'Local outputs stopped. Sensors need a new user request.';
    }
    function dispose() {
      disposed = true;
      host.removeEventListener('message', receive);
      host.removeEventListener('pagehide', dispose);
      host.document.removeEventListener('visibilitychange', clear);
      status.textContent = 'Local outputs stopped.';
    }
    host.addEventListener('message', receive);
    host.addEventListener('pagehide', dispose);
    host.document.addEventListener('visibilitychange', clear);
    return Object.freeze({
      publish(record) {
        if (disposed || host.document.hidden || host.parent === host || origin === 'null') return false;
        host.parent.postMessage({ type: 'invariant:instrument-output', record }, origin);
        return true;
      },
      dispose,
    });
  }
  const api = Object.freeze({ mount });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.InvariantInstrumentBridge = api;
})(globalThis);
