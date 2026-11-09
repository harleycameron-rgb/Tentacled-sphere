"use strict";
// Opt-in read-only bridge. Does not modify the live StructuralMeltingConsumer.
const protocol = require("../web/protocol.js");
const FACES = Object.freeze(["tap","surface","gain","habitat","engine","business"]);
const TEMPORAL = Object.freeze(["time_axis","foretentacle"]);
const ORIGIN = Object.freeze([1024,1024,0]);

function clone(value) {
  return JSON.parse(protocol.canonicalJSON(value));
}
function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
class PlanckSeparationBridge {
  constructor() {
    this.snapshot = null;
    this.first = null;
  }
  async capture({runId,separationId,faceCommitments,stateHex}) {
    if (this.snapshot || !runId || !separationId ||
        !faceCommitments || Object.keys(faceCommitments).sort().join(",") !== [...FACES].sort().join(",") ||
        !FACES.every(k=>typeof faceCommitments[k]==="string" && faceCommitments[k].length>0) ||
        typeof stateHex!=="string" || !/^[0-9a-fA-F]{384}$/.test(stateHex)) {
      throw new TypeError("invalid or repeated six-face Planck snapshot");
    }
    const payload = clone({runId,separationId,faceCommitments,stateHex:stateHex.toLowerCase(),origin:ORIGIN});
    const hash = await protocol.sha512(payload);
    this.snapshot = deepFreeze({...payload,snapshotHash:hash,liveGate:"CLOSED",receiptTrust:"UNVERIFIED"});
    return this.snapshot;
  }
  async firstTrajectory({runId,separationId,snapshotHash,tick,tipExpressions}) {
    const s=this.snapshot;
    if (!s || this.first || runId!==s.runId || separationId!==s.separationId ||
        snapshotHash!==s.snapshotHash || !Number.isFinite(tick) || tick<0 ||
        !tipExpressions || Object.keys(tipExpressions).sort().join(",") !== [...FACES,...TEMPORAL].sort().join(",") ||
        ![...FACES,...TEMPORAL].every(k=>tipExpressions[k]!==null && tipExpressions[k]!==undefined)) {
      throw new TypeError("invalid first trajectory");
    }
    const payload=clone({runId,separationId,snapshotHash,tick,tipExpressions,
      spatialTentacles:FACES,temporalTentacles:TEMPORAL,origin:ORIGIN,
      liveGate:"CLOSED",sphereWrites:false,receiptTrust:"UNVERIFIED",future:"NO_FORWARD_OF_NOW"});
    this.first=deepFreeze(payload);
    return this.first;
  }
}
module.exports={PlanckSeparationBridge,FACES,TEMPORAL,ORIGIN};
