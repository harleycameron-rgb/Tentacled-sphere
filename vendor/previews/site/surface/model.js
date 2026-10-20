(function (root) {
  'use strict';
  const LIMITS = Object.freeze({
    traces: 24,
    traceTTL: 6000,
    steps: 16,
    closedRing: 0.64,
    ambiguityBand: 0.04,
    endpoint: 1.08,
  });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function point(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y))
      throw new Error('finite-pad-coordinate-required');
    return { x: clamp(x, -1.3, 1.3), y: clamp(y, -1.3, 1.3) };
  }
  const distance = (p) => Math.hypot(p.x, p.y);
  function classify(current, previous = null, previousDelta = null) {
    const p = point(current.x, current.y),
      r = distance(p),
      angle = Math.atan2(p.y, p.x),
      old = previous ? point(previous.x, previous.y) : null;
    const delta = old ? { x: p.x - old.x, y: p.y - old.y } : { x: 0, y: 0 },
      energy = clamp(Math.hypot(delta.x, delta.y) * 3 + 0.2, 0.2, 1);
    let kind = 'continuous',
      severity = 0.2;
    if (r > LIMITS.endpoint) {
      kind = 'endpoint';
      severity = 1;
    } else if (old && (distance(old) - LIMITS.closedRing) * (r - LIMITS.closedRing) < 0) {
      kind = 'sawtooth';
      severity = clamp(Math.abs(r - distance(old)) * 3, 0.35, 1);
    } else {
      const speed = Math.hypot(delta.x, delta.y),
        prevSpeed = previousDelta ? Math.hypot(previousDelta.x, previousDelta.y) : 0;
      const reversing =
        prevSpeed > 0.015 &&
        speed > 0.015 &&
        (delta.x * previousDelta.x + delta.y * previousDelta.y) / (speed * prevSpeed) < -0.4;
      const near = [0.36, 0.64, 0.9].some(
        (boundary) => Math.abs(r - boundary) < LIMITS.ambiguityBand,
      );
      if (reversing || near) {
        kind = 'wobble';
        severity = reversing ? 0.8 : 0.45;
      }
    }
    return {
      kind,
      severity,
      energy,
      angle: Math.round(angle / (Math.PI / 12)) * (Math.PI / 12),
      band: r < 0.36 ? 0 : r < 0.64 ? 1 : r < 0.9 ? 2 : 3,
      delta,
    };
  }
  function seed(pattern, event, step) {
    if (pattern.length !== LIMITS.steps || !Number.isInteger(step))
      throw new Error('rhythm-state-invalid');
    const next = pattern.map((cell) => ({ ...cell }));
    const index = (step + 2 + event.band) % LIMITS.steps;
    next[index] = {
      kind: event.kind,
      energy: event.kind === 'endpoint' ? 0 : event.energy,
      severity: event.severity,
    };
    if (event.kind !== 'endpoint') {
      for (const anchor of [0, 8])
        if (next[anchor].energy < 0.12)
          next[anchor] = { kind: 'continuous', energy: 0.12, severity: 0.1 };
    }
    return next;
  }
  function level(beta, gamma, rotation = 0) {
    if (![beta, gamma, rotation].every(Number.isFinite)) throw new Error('finite-level-required');
    const b = (beta * Math.PI) / 180,
      g = (gamma * Math.PI) / 180,
      a = (rotation * Math.PI) / 180,
      x = Math.sin(g) * Math.cos(b),
      y = Math.sin(b);
    return {
      x: clamp(x * Math.cos(a) + y * Math.sin(a), -1, 1),
      y: clamp(-x * Math.sin(a) + y * Math.cos(a), -1, 1),
      faceUp: Math.cos(b) * Math.cos(g) > 0,
    };
  }
  const api = { LIMITS, point, classify, seed, level, clamp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SurfaceModel = api;
})(globalThis);
