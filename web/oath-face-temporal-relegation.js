/* OATH_FACE_TEMPORAL_RELEGATION_V1 — research-only classification ledger.
 * Classification is supplied by an external evaluator; deformation cannot decide truth.
 * No camera frames, PII, native firing, wall clock, persistence, or network I/O.
 */
(function (root) {
  "use strict";
  const STATES = Object.freeze(["supported", "unsupported", "disproven", "unknown"]);
  const OUTCOMES = Object.freeze(["active", "referencable-past", "unresolved"]);
  function plain(value) { return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
  function textId(v) { return typeof v === "string" && v.length > 0 && v.length <= 256; }
  function cleanRefs(refs) {
    if (!Array.isArray(refs) || refs.length > 64 || !refs.every(textId) || new Set(refs).size !== refs.length) throw new TypeError("Invalid evidence references");
    return Object.freeze([...refs]);
  }
  function classify(input) {
    if (!plain(input) || input.schemaVersion !== 1 || !textId(input.claimId) ||
        !STATES.includes(input.semanticState) || !textId(input.trajectoryId) ||
        !textId(input.separationId) || !Number.isSafeInteger(input.logicalTick) ||
        input.logicalTick < 1 || input.liveGate !== "CLOSED" ||
        input.meltingAttached !== true || input.separationComplete !== true ||
        !plain(input.evaluation) || !textId(input.evaluation.evaluatorId) ||
        !textId(input.evaluation.methodRef) ||
        !textId(input.evaluation.decisionRef)) {
      throw new TypeError("Invalid temporal relegation input");
    }
    const evidenceRefs = cleanRefs(input.evaluation.evidenceRefs);
    // Unsupported is not disproven: it can be archived as unsupported, never labelled false.
    const outcome = input.semanticState === "disproven" || input.semanticState === "unsupported"
      ? "referencable-past"
      : input.semanticState === "unknown" ? "unresolved" : "active";
    return Object.freeze({
      schemaVersion: 1,
      contract: "OATH_FACE_TEMPORAL_RELEGATION_V1",
      claimId: input.claimId,
      trajectoryId: input.trajectoryId,
      separationId: input.separationId,
      logicalTick: input.logicalTick,
      semanticState: input.semanticState,
      outcome,
      historicalAuthority: outcome === "referencable-past" ? "non-authoritative" : "not-applicable",
      evaluation: Object.freeze({
        evaluatorId: input.evaluation.evaluatorId,
        methodRef: input.evaluation.methodRef,
        decisionRef: input.evaluation.decisionRef,
        evidenceRefs,
      }),
      liveGate: "CLOSED",
      receiptTrust: "UNVERIFIED",
      sphereWrites: false,
    });
  }
  const api = Object.freeze({ STATES, OUTCOMES, classify });
  if (typeof module === "object" && module.exports) module.exports = api;
  root.OathFaceTemporalRelegation = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
