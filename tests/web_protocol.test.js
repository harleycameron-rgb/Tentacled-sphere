"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const protocol = require("../web/protocol.js");

function exampleSnapshot() {
  return {
    schemaVersion: 1,
    sessionId: "local-session",
    revisionSequence: 2,
    geometryModel: "api",
    armOrdering: protocol.APP_IDS,
    center: [1024, 1024, 0],
    radius: 1,
    yawRadians: 0,
    tiltRadians: 0,
    apiBaselineVectors: protocol.APP_IDS.map(() => [1, 0, 0]),
    sentinel: { identifier: "ignite-2" },
    finalArms: protocol.APP_IDS.map((appId) => ({
      appId,
      vector: [1, 0, 0],
      position: [1025, 1024, 0],
    })),
    finalPorts: [],
  };
}

test("canonical SHA-512 ignores object insertion order and rejects malformed values", async () => {
  assert.equal(protocol.canonicalJSON({ b: 2, a: 1 }), protocol.canonicalJSON({ a: 1, b: 2 }));
  assert.equal((await protocol.sha512({ a: 1, b: 2 })).length, 128);
  assert.throws(() => protocol.canonicalJSON({ value: Infinity }), /finite/);
  assert.throws(() => protocol.canonicalJSON({ value: undefined }), /undefined/);
});

test("matching acknowledgements complete once; tampered, stale, and altered retries fail", async () => {
  const snapshot = exampleSnapshot();
  const snapshotHash = (await protocol.hashSnapshot(snapshot)).hash;
  const positions = Object.fromEntries(protocol.APP_IDS.map((id, index) =>
    [id, snapshot.finalArms[index].position]));
  const basket = new protocol.AcknowledgementBasket({
    snapshotHash,
    revisionSequence: snapshot.revisionSequence,
    ignitionId: "ignite-2",
    positions,
  });
  assert.equal(basket.complete, false);

  for (const [index, appId] of protocol.APP_IDS.entries()) {
    const acknowledgement = await protocol.makeAcknowledgement(
      appId, snapshot, snapshotHash, "ignite-2",
    );
    const result = await basket.accept(acknowledgement);
    assert.deepEqual(result, { accepted: true, duplicate: false });
    assert.equal(basket.complete, index === protocol.APP_IDS.length - 1);
    assert.deepEqual(await basket.accept(acknowledgement), { accepted: true, duplicate: true });
    const altered = { ...acknowledgement, appliedPosition: [99, 99, 99] };
    assert.deepEqual(await basket.accept(altered), { accepted: false, duplicate: false });
    const extended = { ...acknowledgement, extra: true };
    delete extended.receiptHash;
    extended.receiptHash = await protocol.sha512(extended);
    assert.deepEqual(await basket.accept(extended), { accepted: false, duplicate: false });
  }

  const stale = await protocol.makeAcknowledgement("tap", snapshot, snapshotHash, "older-run");
  assert.deepEqual(await basket.accept(stale), { accepted: false, duplicate: false });
});

test("app handlers reject altered, stale, skipped, and mismatched snapshots", async () => {
  const snapshot = exampleSnapshot();
  const envelope = await protocol.hashSnapshot(snapshot);
  const first = await protocol.validateAppSnapshot(envelope, "tap", "ignite-2");
  assert.equal(first.valid, true);
  assert.deepEqual(first.arm, snapshot.finalArms[0]);
  const applied = { revisionSequence: snapshot.revisionSequence, hash: envelope.hash };
  assert.equal((await protocol.validateAppSnapshot(envelope, "tap", "ignite-2", applied)).duplicate, true);
  assert.equal((await protocol.validateAppSnapshot(envelope, "surface", "other")).valid, false);

  const tampered = structuredClone(envelope);
  tampered.snapshot.finalArms[0].position[0] += 1;
  assert.equal((await protocol.validateAppSnapshot(tampered, "tap", "ignite-2")).valid, false);

  const skipped = structuredClone(snapshot);
  skipped.revisionSequence += 2;
  const skippedEnvelope = await protocol.hashSnapshot(skipped);
  assert.equal((await protocol.validateAppSnapshot(skippedEnvelope, "tap", "ignite-2", applied)).valid, false);

  const alteredSameRevision = structuredClone(snapshot);
  alteredSameRevision.finalArms[0].position[1] += 1;
  const alteredEnvelope = await protocol.hashSnapshot(alteredSameRevision);
  assert.equal((await protocol.validateAppSnapshot(alteredEnvelope, "tap", "ignite-2", applied)).valid, false);
});

test("device feeds require a fresh monotonic sequence, timestamp, and nonzero finite vector", () => {
  const now = 1_800_000_000_000;
  const previous = { sequence: 4, timestamp: now - 100 };
  const fresh = { sequence: 5, timestamp: now, vector: [1, 2, 3], source: "device-orientation" };
  assert.equal(protocol.validFeed(fresh, previous, now), true);
  assert.equal(protocol.validFeed({ ...fresh, sequence: 4 }, previous, now), false);
  assert.equal(protocol.validFeed({ ...fresh, timestamp: now - 200 }, previous, now), false);
  assert.equal(protocol.validFeed({ ...fresh, timestamp: now - 6000 }, previous, now), false);
  assert.equal(protocol.validFeed({ ...fresh, vector: [0, 0, 0] }, previous, now), false);
  assert.equal(protocol.validFeed({ ...fresh, vector: [1, Infinity, 0] }, previous, now), false);
  assert.equal(protocol.validFeed({ ...fresh, source: "invented" }, previous, now), false);
  assert.equal(protocol.validFeed({ ...fresh, vector: [1.7e308, 1.7e308, 1.7e308] }, previous, now), true);
});

test("Structural Melting attaches only after separation and plotting for the current run", async () => {
  const consumer = new protocol.StructuralMeltingConsumer();
  const states = protocol.STRUCTURAL_MELTING_STATES;
  assert.equal(consumer.state, null);
  assert.equal(consumer.attach("run-1", "trajectory-1"), false);
  assert.equal(consumer.markAssemblyReady("run-1"), true);
  assert.equal(consumer.state, states.ASSEMBLY_READY);
  assert.equal(consumer.completeSeparation("stale-run", "separation-1"), false);
  assert.equal(consumer.beginTrajectoryPlotting("run-1", "trajectory-1"), false);
  assert.equal(consumer.completeSeparation("run-1", "separation-1"), true);
  assert.equal(consumer.state, states.SEPARATION_COMPLETE);
  assert.equal(consumer.attach("run-1", "trajectory-1"), false);
  assert.equal(consumer.beginTrajectoryPlotting("stale-run", "trajectory-1"), false);
  assert.equal(consumer.beginTrajectoryPlotting("run-1", "trajectory-1"), true);
  assert.equal(consumer.state, states.TRAJECTORY_PLOTTING);
  assert.equal(consumer.attach("run-1", "wrong-trajectory"), false);
  assert.equal(consumer.attach("run-1", "trajectory-1"), true);
  assert.equal(consumer.state, states.MELTING_ATTACHED);
  assert.deepEqual(consumer.transitions.map((entry) => entry.state), [
    states.ASSEMBLY_READY,
    states.SEPARATION_COMPLETE,
    states.TRAJECTORY_PLOTTING,
    states.MELTING_ATTACHED,
  ]);

  const point = {
    runId: "run-1",
    separationId: "separation-1",
    trajectoryId: "trajectory-1",
    sequence: 1,
    timestamp: Math.max(Date.now(), consumer.separationTimestamp + 1),
    data: { value: "simulation sample" },
  };
  assert.deepEqual(consumer.acceptTrajectoryPoint({
    ...point, timestamp: consumer.separationTimestamp - 1,
  }), { accepted: false });
  assert.deepEqual(consumer.acceptTrajectoryPoint({ ...point, runId: "stale-run" }),
    { accepted: false });
  assert.deepEqual(consumer.acceptTrajectoryPoint({ ...point, trajectoryId: "stale-trajectory" }),
    { accepted: false });
  assert.deepEqual(consumer.acceptTrajectoryPoint({ ...point, separationId: "stale-separation" }),
    { accepted: false });
  assert.deepEqual(consumer.acceptTrajectoryPoint(point), { accepted: true });
  assert.deepEqual(consumer.acceptTrajectoryPoint(point), { accepted: false });

  const trajectoryReceipt = await consumer.makeTrajectoryReceipt();
  const attachmentReceipt = await consumer.makeAttachmentReceipt();
  assert.equal(trajectoryReceipt.receiptType, "post-separation-trajectory");
  assert.equal(trajectoryReceipt.points.length, 1);
  assert.equal(attachmentReceipt.receiptType, "structural-melting-attachment");
  for (const receipt of [trajectoryReceipt, attachmentReceipt]) {
    assert.equal(receipt.liveGate, "CLOSED");
    assert.equal(receipt.sphereWrites, false);
    assert.equal(receipt.receiptTrust, "UNVERIFIED");
    const { receiptHash, ...payload } = receipt;
    assert.equal(receiptHash, await protocol.sha512(payload));
  }

  assert.equal(consumer.stopPlotting(), true);
  assert.equal(consumer.state, states.SEPARATION_COMPLETE);
  assert.deepEqual(consumer.acceptTrajectoryPoint({ ...point, sequence: 2 }),
    { accepted: false });
  assert.equal(consumer.beginTrajectoryPlotting("run-1", "trajectory-1"), false);
  assert.equal(consumer.beginTrajectoryPlotting("run-1", "trajectory-2"), true);
  assert.equal(consumer.attach("run-1", "trajectory-2"), true);
  assert.deepEqual(consumer.acceptTrajectoryPoint(point), { accepted: false });
  consumer.reset();
  assert.equal(consumer.state, null);
  assert.deepEqual(consumer.acceptTrajectoryPoint({ ...point, trajectoryId: "trajectory-2" }),
    { accepted: false });
  assert.equal(consumer.markAssemblyReady("run-1"), false);
  assert.equal(consumer.markAssemblyReady("run-2"), true);
  assert.equal(consumer.completeSeparation("run-1", "separation-2"), false);
});
