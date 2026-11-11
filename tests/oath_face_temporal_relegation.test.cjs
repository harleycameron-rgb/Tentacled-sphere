const assert = require("node:assert/strict");
const { classify } = require("../web/oath-face-temporal-relegation.js");
const base = { schemaVersion: 1, claimId: "claim-1", trajectoryId: "trajectory-1", separationId: "separation-1", logicalTick: 1, liveGate: "CLOSED", meltingAttached: true, separationComplete: true, evaluation: { evaluatorId: "external-evaluator", methodRef: "method-1", decisionRef: "decision-1", evidenceRefs: ["evidence-1"] } };
for (const [state, outcome] of [["supported","active"],["unsupported","referencable-past"],["disproven","referencable-past"],["unknown","unresolved"]]) {
  const record = classify({ ...base, semanticState: state });
  assert.equal(record.outcome, outcome);
  assert.equal(record.semanticState, state);
  assert.equal(record.receiptTrust, "UNVERIFIED");
  assert.equal(record.sphereWrites, false);
}
assert.equal(classify({ ...base, semanticState: "unsupported" }).historicalAuthority, "non-authoritative");
assert.throws(() => classify({ ...base, semanticState: "false" }));
assert.throws(() => classify({ ...base, semanticState: "disproven", liveGate: "OPEN" }));
assert.throws(() => classify({ ...base, semanticState: "disproven", meltingAttached: false }));
assert.throws(() => classify({ ...base, semanticState: "disproven", evaluation: { ...base.evaluation, evidenceRefs: ["x", "x"] } }));
assert.throws(() => classify({ ...base, semanticState: "disproven", logicalTick: 0 }));
assert.deepEqual(classify({ ...base, semanticState: "unknown" }), classify({ ...base, semanticState: "unknown" }));
console.log("Oath Face temporal relegation contract assertions passed");
