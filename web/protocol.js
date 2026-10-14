(function (root) {
  "use strict";

  const ids = root.TentacledGeometry?.APP_IDS || [
    "tap", "surface", "spiritlevel", "gain", "habitat", "time", "space", "lineage",
  ];

  function canonicalValue(value, seen = new Set()) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new TypeError("Canonical data must contain finite numbers");
      return Object.is(value, -0) ? 0 : value;
    }
    if (Array.isArray(value)) {
      if (seen.has(value)) throw new TypeError("Canonical data cannot contain cycles");
      seen.add(value);
      const result = value.map((item) => canonicalValue(item, seen));
      seen.delete(value);
      return result;
    }
    if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      if (seen.has(value)) throw new TypeError("Canonical data cannot contain cycles");
      seen.add(value);
      const result = {};
      for (const key of Object.keys(value).sort()) {
        if (value[key] === undefined) throw new TypeError("Canonical data cannot contain undefined");
        result[key] = canonicalValue(value[key], seen);
      }
      seen.delete(value);
      return result;
    }
    throw new TypeError("Unsupported canonical data type");
  }

  function canonicalJSON(value) {
    return JSON.stringify(canonicalValue(value));
  }

  function cryptoProvider() {
    if (root.crypto?.subtle) return root.crypto;
    if (typeof require === "function") return require("node:crypto").webcrypto;
    throw new Error("SHA-512 is unavailable in this browser context");
  }

  async function sha512(value) {
    const data = new TextEncoder().encode(canonicalJSON(value));
    const digest = await cryptoProvider().subtle.digest("SHA-512", data);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function hashSnapshot(snapshot) {
    return { snapshot, hash: await sha512(snapshot), algorithm: "SHA-512", canonicalization: "sorted-object-keys-json-v1" };
  }

  async function makeAcknowledgement(appId, snapshot, snapshotHash, ignitionId) {
    if (!ids.includes(appId)) throw new TypeError("Unknown app identifier");
    const appliedPosition = snapshot.finalArms[ids.indexOf(appId)].position;
    const acknowledgement = {
      appId,
      snapshotHash,
      revisionSequence: snapshot.revisionSequence,
      ignitionId,
      appliedPosition,
    };
    return {
      ...acknowledgement,
      receiptHash: await sha512(acknowledgement),
    };
  }

  async function verifyAcknowledgement(acknowledgement, expected) {
    if (!acknowledgement || typeof acknowledgement !== "object" ||
        canonicalJSON(Object.keys(acknowledgement).sort()) !== canonicalJSON([
          "appId", "appliedPosition", "ignitionId", "receiptHash",
          "revisionSequence", "snapshotHash",
        ].sort()) ||
        !ids.includes(acknowledgement.appId) ||
        acknowledgement.snapshotHash !== expected.snapshotHash ||
        acknowledgement.revisionSequence !== expected.revisionSequence ||
        acknowledgement.ignitionId !== expected.ignitionId ||
        canonicalJSON(acknowledgement.appliedPosition) !== canonicalJSON(expected.position)) {
      return false;
    }
    const { receiptHash, ...payload } = acknowledgement;
    return typeof receiptHash === "string" && receiptHash === await sha512(payload);
  }

  async function validateAppSnapshot(envelope, appId, ignitionId, lastApplied = null) {
    try {
      const { snapshot, hash, algorithm, canonicalization } = envelope || {};
      if (algorithm !== "SHA-512" || canonicalization !== "sorted-object-keys-json-v1" ||
          !ids.includes(appId) || !snapshot || snapshot.schemaVersion !== 1 ||
          typeof snapshot.sessionId !== "string" || !snapshot.sessionId ||
          !Number.isSafeInteger(snapshot.revisionSequence) || snapshot.revisionSequence < 1 ||
          !["api", "cube"].includes(snapshot.geometryModel) ||
          !Array.isArray(snapshot.armOrdering) ||
          canonicalJSON(snapshot.armOrdering) !== canonicalJSON(ids) ||
          !Array.isArray(snapshot.finalArms) || snapshot.finalArms.length !== ids.length ||
          !Array.isArray(snapshot.center) || snapshot.center.length !== 3 ||
          !snapshot.center.every(Number.isFinite) || !Number.isFinite(snapshot.radius) ||
          snapshot.radius <= 0 || !Number.isFinite(snapshot.yawRadians) ||
          !Number.isFinite(snapshot.tiltRadians) ||
          snapshot.sentinel?.identifier !== ignitionId ||
          await sha512(snapshot) !== hash) {
        return { valid: false, duplicate: false };
      }
      if (!snapshot.finalArms.every((arm, index) =>
        arm?.appId === ids[index] &&
        Array.isArray(arm.vector) && arm.vector.length === 3 &&
        arm.vector.every(Number.isFinite) &&
        Math.abs(Math.hypot(...arm.vector) - 1) <= 1e-10 &&
        Array.isArray(arm.position) && arm.position.length === 3 &&
        arm.position.every(Number.isFinite) &&
        snapshot.center.every((value, axis) =>
          Math.abs(value + arm.vector[axis] * snapshot.radius - arm.position[axis]) <= 1e-9))) {
        return { valid: false, duplicate: false };
      }
      if (lastApplied) {
        if (snapshot.revisionSequence < lastApplied.revisionSequence ||
            snapshot.revisionSequence > lastApplied.revisionSequence + 1 ||
            (snapshot.revisionSequence === lastApplied.revisionSequence && hash !== lastApplied.hash)) {
          return { valid: false, duplicate: false };
        }
        if (snapshot.revisionSequence === lastApplied.revisionSequence) {
          return { valid: true, duplicate: true, arm: snapshot.finalArms[ids.indexOf(appId)] };
        }
      }
      if (snapshot.geometryModel === "cube" &&
          (!Array.isArray(snapshot.finalPorts) || snapshot.finalPorts.length !== 6 ||
           !snapshot.finalPorts.every((port) =>
             Array.isArray(port.vector) && port.vector.length === 3 &&
             port.vector.every(Number.isFinite) &&
             Math.abs(Math.hypot(...port.vector) - 1) <= 1e-10))) {
        return { valid: false, duplicate: false };
      }
      if (snapshot.geometryModel === "api" &&
          (!Array.isArray(snapshot.apiBaselineVectors) ||
           snapshot.apiBaselineVectors.length !== ids.length ||
           !snapshot.apiBaselineVectors.every((vector) =>
             Array.isArray(vector) && vector.length === 3 &&
             vector.every(Number.isFinite) &&
             Math.abs(Math.hypot(...vector) - 1) <= 1e-10))) {
        return { valid: false, duplicate: false };
      }
      return { valid: true, duplicate: false, arm: snapshot.finalArms[ids.indexOf(appId)] };
    } catch (_) {
      return { valid: false, duplicate: false };
    }
  }

  class AcknowledgementBasket {
    constructor(expected) {
      this.expected = expected;
      this.receipts = new Map();
    }

    async accept(acknowledgement) {
      const expected = {
        snapshotHash: this.expected.snapshotHash,
        revisionSequence: this.expected.revisionSequence,
        ignitionId: this.expected.ignitionId,
        position: this.expected.positions[acknowledgement?.appId],
      };
      if (!expected.position || !await verifyAcknowledgement(acknowledgement, expected)) {
        return { accepted: false, duplicate: false };
      }
      const previous = this.receipts.get(acknowledgement.appId);
      if (previous) {
        return {
          accepted: canonicalJSON(previous) === canonicalJSON(acknowledgement),
          duplicate: true,
        };
      }
      this.receipts.set(acknowledgement.appId, acknowledgement);
      return { accepted: true, duplicate: false };
    }

    get complete() {
      return this.receipts.size === ids.length && ids.every((id) => this.receipts.has(id));
    }

    values() {
      return ids.filter((id) => this.receipts.has(id)).map((id) => this.receipts.get(id));
    }
  }

  const STRUCTURAL_MELTING_STATES = Object.freeze({
    ASSEMBLY_READY: "ASSEMBLY_READY",
    SEPARATION_COMPLETE: "SEPARATION_COMPLETE",
    TRAJECTORY_PLOTTING: "TRAJECTORY_PLOTTING",
    MELTING_ATTACHED: "MELTING_ATTACHED",
  });

  class StructuralMeltingConsumer {
    constructor() {
      this.usedRunIds = new Set();
      this.reset();
    }

    reset() {
      this.runId = null;
      this.state = null;
      this.separationId = null;
      this.trajectoryId = null;
      this.separationTimestamp = null;
      this.lastSequence = 0;
      this.lastTimestamp = null;
      this.points = [];
      this.transitions = [];
      this.plotting = false;
    }

    markAssemblyReady(runId) {
      if (typeof runId !== "string" || !runId || this.state !== null ||
          this.usedRunIds.has(runId)) return false;
      this.usedRunIds.add(runId);
      this.runId = runId;
      this._transition(STRUCTURAL_MELTING_STATES.ASSEMBLY_READY);
      return true;
    }

    completeSeparation(runId, separationId) {
      if (this.state !== STRUCTURAL_MELTING_STATES.ASSEMBLY_READY ||
          runId !== this.runId || typeof separationId !== "string" || !separationId) {
        return false;
      }
      this.separationId = separationId;
      this.separationTimestamp = Date.now();
      this.lastTimestamp = this.separationTimestamp;
      this._transition(STRUCTURAL_MELTING_STATES.SEPARATION_COMPLETE);
      return true;
    }

    beginTrajectoryPlotting(runId, trajectoryId) {
      if (this.state !== STRUCTURAL_MELTING_STATES.SEPARATION_COMPLETE ||
          runId !== this.runId || typeof trajectoryId !== "string" || !trajectoryId ||
          trajectoryId === this.trajectoryId) return false;
      this.trajectoryId = trajectoryId;
      this.lastSequence = 0;
      this.points = [];
      this.plotting = true;
      this._transition(STRUCTURAL_MELTING_STATES.TRAJECTORY_PLOTTING);
      return true;
    }

    attach(runId, trajectoryId) {
      if (!this.plotting ||
          this.state !== STRUCTURAL_MELTING_STATES.TRAJECTORY_PLOTTING ||
          !this.separationId || runId !== this.runId ||
          trajectoryId !== this.trajectoryId) return false;
      this._transition(STRUCTURAL_MELTING_STATES.MELTING_ATTACHED);
      return true;
    }

    stopPlotting() {
      if (!this.plotting) return false;
      this.plotting = false;
      this._transition(STRUCTURAL_MELTING_STATES.SEPARATION_COMPLETE);
      return true;
    }

    acceptTrajectoryPoint(point) {
      try {
        if (this.state !== STRUCTURAL_MELTING_STATES.MELTING_ATTACHED ||
            !point || typeof point !== "object" ||
            point.runId !== this.runId ||
            point.trajectoryId !== this.trajectoryId ||
            point.separationId !== this.separationId ||
            !Number.isSafeInteger(point.sequence) ||
            point.sequence <= this.lastSequence ||
            !Number.isFinite(point.timestamp) ||
            point.timestamp <= this.lastTimestamp ||
            !Object.prototype.hasOwnProperty.call(point, "data")) {
          return { accepted: false };
        }
        canonicalValue(point.data);
        const accepted = canonicalValue(point);
        this.points.push(accepted);
        this.lastSequence = point.sequence;
        this.lastTimestamp = point.timestamp;
        return { accepted: true };
      } catch (_) {
        return { accepted: false };
      }
    }

    async makeTrajectoryReceipt() {
      if (!this.separationId || !this.trajectoryId) return null;
      return this._makeReceipt({
        receiptType: "post-separation-trajectory",
        runId: this.runId,
        separationId: this.separationId,
        separationTimestamp: this.separationTimestamp,
        trajectoryId: this.trajectoryId,
        plotting: this.plotting,
        points: this.points,
      });
    }

    async makeAttachmentReceipt() {
      const attachment = [...this.transitions].reverse().find((entry) =>
        entry.state === STRUCTURAL_MELTING_STATES.MELTING_ATTACHED);
      if (!attachment) return null;
      return this._makeReceipt({
        receiptType: "structural-melting-attachment",
        runId: attachment.runId,
        separationId: attachment.separationId,
        trajectoryId: attachment.trajectoryId,
        attachedAt: attachment.timestamp,
      });
    }

    _transition(state) {
      this.state = state;
      this.transitions.push({
        state,
        timestamp: Date.now(),
        runId: this.runId,
        separationId: this.separationId,
        trajectoryId: this.trajectoryId,
      });
    }

    async _makeReceipt(payload) {
      const receipt = {
        schemaVersion: 1,
        ...payload,
        liveGate: "CLOSED",
        sphereWrites: false,
        receiptTrust: "UNVERIFIED",
        hashAlgorithm: "SHA-512",
        canonicalization: "sorted-object-keys-json-v1",
        authenticityNote: "A hash records content consistency; it is not authenticated proof of separation, plotting, or attachment.",
      };
      receipt.receiptHash = await sha512(receipt);
      return receipt;
    }
  }

  function validFeed(feed, previous, now = Date.now(), maxAgeMs = 5000) {
    if (!feed || !Number.isSafeInteger(feed.sequence) || feed.sequence < 1 ||
        !Number.isFinite(feed.timestamp) ||
        now - feed.timestamp > maxAgeMs || feed.timestamp > now + 1000 ||
        !["device-orientation", "synthetic-clock"].includes(feed.source) ||
        !Array.isArray(feed.vector) || feed.vector.length !== 3 ||
        !feed.vector.every(Number.isFinite) || feed.vector.every((value) => value === 0)) {
      return false;
    }
    if (previous && (feed.sequence <= previous.sequence || feed.timestamp <= previous.timestamp)) {
      return false;
    }
    return true;
  }

  const api = {
    canonicalJSON,
    sha512,
    hashSnapshot,
    makeAcknowledgement,
    verifyAcknowledgement,
    validateAppSnapshot,
    AcknowledgementBasket,
    STRUCTURAL_MELTING_STATES,
    StructuralMeltingConsumer,
    validFeed,
    APP_IDS: ids,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TentacledProtocol = api;
})(typeof window !== "undefined" ? window : globalThis);
