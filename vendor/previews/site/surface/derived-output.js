(function (root) {
  'use strict';
  const kinds = new Set(['continuous', 'sawtooth', 'wobble', 'endpoint']);
  const sources = new Set(['touch', 'movement', 'keyboard', 'fixture']);
  function derive(pattern, source) {
    if (!sources.has(source) || !Array.isArray(pattern) || pattern.length !== 16)
      throw Error('invalid-surface-output');
    let activity = 0, severity = 0, occupied = 0, unresolved = 0;
    for (const cell of pattern) {
      if (!cell || !kinds.has(cell.kind) ||
          ![cell.energy, cell.severity].every(v => Number.isFinite(v) && v >= 0 && v <= 1))
        throw Error('invalid-surface-cell');
      activity += cell.energy / 16;
      severity += cell.severity / 16;
      occupied += cell.energy > 0.03 ? 1 : 0;
      unresolved += cell.kind === 'endpoint' ? 1 : 0;
    }
    return {
      schema: 'instrument-output/v1',
      instrument: 'surface',
      adapter: 'surface-derived/v1',
      frame: 'surface-local',
      units: 'normalized',
      scope: 'local-derived-unverified',
      source,
      output: { activity, severity, occupancy: occupied / 16, unresolved: unresolved / 16 },
    };
  }
  const api = Object.freeze({ derive });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SurfaceDerivedAdapter = api;
})(globalThis);
