/* Research-only deterministic Foretentacle deformation mapping.
 * No camera access, pixel manipulation, clock, randomness, native gate or writes.
 * This computes geometry parameters; a separate renderer may consume them.
 */
(function (root) {
  "use strict";
  function finiteVector(value, length) {
    if (!Array.isArray(value) || value.length !== length ||
        !value.every((n) => typeof n === "number" && Number.isFinite(n))) {
      throw new TypeError("Expected a finite vector of length " + length);
    }
    return value;
  }
  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function deriveDeformation(trajectory, geometry) {
    if (!trajectory || !geometry || trajectory.separationComplete !== true ||
        trajectory.meltingAttached !== true ||
        trajectory.liveGate !== "CLOSED") {
      throw new TypeError("Requires an attached post-separation research trajectory with native gate CLOSED");
    }
    const displacement = finiteVector(trajectory.displacement, 3);
    const previousDisplacement = finiteVector(trajectory.previousDisplacement, 3);
    const origin = finiteVector(geometry.origin, 3);
    if (origin[0] !== 1024 || origin[1] !== 1024 || origin[2] !== 0 ||
        !Number.isSafeInteger(trajectory.logicalTick) || trajectory.logicalTick < 1 ||
        !Number.isSafeInteger(trajectory.previousLogicalTick) ||
        trajectory.previousLogicalTick >= trajectory.logicalTick ||
        typeof geometry.recursionScale !== "number" ||
        !Number.isFinite(geometry.recursionScale) || geometry.recursionScale <= 0) {
      throw new TypeError("Invalid Foretentacle geometry or logical trajectory");
    }
    const drift = displacement.map((n, i) => n - previousDisplacement[i]);
    const speed = Math.hypot(...drift);
    const distance = Math.hypot(...displacement);
    const curvature = Math.hypot(
      displacement[1] * drift[2] - displacement[2] * drift[1],
      displacement[2] * drift[0] - displacement[0] * drift[2],
      displacement[0] * drift[1] - displacement[1] * drift[0]
    ) / Math.max(distance * Math.max(speed, 1e-12), 1e-12);
    const torsion = Math.atan2(displacement[1], displacement[0]);
    const intensity = clamp(speed * geometry.recursionScale, 0, 1);
    return Object.freeze({
      schemaVersion: 1,
      mode: "research-simulation",
      module: "foretentacle-oath-face",
      logicalTick: trajectory.logicalTick,
      displacement: Object.freeze([...displacement]),
      drift: Object.freeze(drift),
      distance,
      curvature: clamp(curvature, 0, 1),
      torsion,
      fragmentation: intensity,
      coherence: 1 - intensity,
      recursionScale: geometry.recursionScale,
      // No time-based melt; identical trajectory and geometry produce identical output.
      gate: "CLOSED",
    });
  }
  const api = Object.freeze({ deriveDeformation });
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ForetentacleDeformation = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
