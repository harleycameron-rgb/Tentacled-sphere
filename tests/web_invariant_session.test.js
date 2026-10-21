"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash, webcrypto } = require("node:crypto");
const fs = require("node:fs");
const vm = require("node:vm");
const { Session, registry, ROUTES, checkTransition, checkRoute } = require("../web/invariant-session.js");
const SurfaceModel = require("../vendor/previews/site/surface/model.js");
const SurfaceDerivedAdapter = require("../vendor/previews/site/surface/derived-output.js");

function output(overrides = {}) {
  return {
    instrument: "surface", schema: "instrument-output/v1", adapter: "surface-derived/v1",
    frame: "surface-local", units: "normalized", scope: "local-derived-unverified",
    source: "touch", output: { activity: 0.4, severity: 0.2, occupancy: 0.5, unresolved: 0 },
    ...overrides,
  };
}

function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort()
    .map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  return JSON.stringify(value);
}

test("browser UMD exports the same bounded in-memory session API", () => {
  const context = vm.createContext({ crypto: webcrypto, TextEncoder });
  vm.runInContext(fs.readFileSync(require.resolve("../web/invariant-session.js"), "utf8"), context);
  assert.equal(typeof context.InvariantSession.Session, "function");
  const session = new context.InvariantSession.Session();
  assert.equal(session.inspect().maxRecords, 64);
  assert.equal(session.inspect().liveGate, "CLOSED");
  assert.equal(session.inspect().trust, "UNVERIFIED");
});

test("registry distinguishes six routes, eight geometry arms, and two unknown version slots", () => {
  assert.deepEqual(ROUTES, [
    "tap", "surface", "evidence-gate", "modular-topology", "credit-game", "study-environment",
  ]);
  assert.equal(registry.geometry.armCount, 8);
  assert.equal(registry.fourthAxis.length, 2);
  assert.ok(registry.fourthAxis.every((slot) => slot.status === "unknown" && !slot.available));
  assert.ok(Object.isFrozen(registry.capabilities.surface));
  assert.equal(checkTransition("surface", "tap").capability, "derived-feedback");
  assert.equal(checkTransition("surface", "study-environment").capability, "inspection");
  assert.equal(checkTransition("surface", "evidence-gate").capability, "local-evidence");
  for (const target of ["modular-topology", "credit-game"]) {
    assert.equal(checkTransition("surface", target).status, "missing-binding");
  }
  assert.equal(checkTransition("tap", "surface").status, "missing-binding");
  assert.equal(checkTransition("surface", "gain").status, "unsupported-route");
  for (const capability of ["engine.input", "authorization", "launch", "authorize"]) {
    const result = checkTransition("surface", "tap", capability);
    assert.equal(result.allowed, false);
    assert.match(result.reason, /Missing qualified contributions.*fourth-axis/);
    assert.equal(result.liveGate, "CLOSED");
    assert.equal(result.trust, "UNVERIFIED");
  }
});

test("local route navigation is independent of measured-output and launch policies", () => {
  const session = new Session();
  for (const source of ROUTES) {
    assert.equal(checkRoute(source).allowed, true);
    assert.equal(session.checkRoute(source).capability, "local-navigation");
    for (const target of ROUTES) {
      assert.equal(checkTransition(source, target, "local-navigation").allowed, true);
      assert.equal(checkTransition(source, target, "navigation").allowed, true);
      assert.equal(checkTransition(source, target, "launch").allowed, false);
    }
  }
  assert.equal(checkTransition("tap", "surface").allowed, false);
  assert.equal(checkRoute("gain").allowed, false);
  assert.equal(checkTransition("tap", "unknown", "navigation").allowed, false);
});

test("commitments bind canonical content, session, metadata, revision and previous head", async () => {
  const first = new Session(), second = new Session();
  assert.notEqual(first.sessionId, second.sessionId);
  const record = await first.admitInstrument(output());
  const other = await second.admitOutput(output());
  assert.match(record.commitment, /^[a-f0-9]{64}$/);
  assert.notEqual(record.commitment, other.commitment);
  const { id, commitment, ...content } = record;
  assert.equal(commitment, createHash("sha256").update(canonical(content)).digest("hex"));
  assert.equal(record.previousHeadCommitment, null);
  assert.equal(record.algorithm, "SHA-256");
  assert.equal(record.revision, 1);
  const bridge = await first.bridge("tap", id, commitment);
  assert.equal(bridge.previousHeadCommitment, commitment);
  assert.equal(bridge.dependency.commitment, commitment);
  assert.equal(bridge.dependency.recordId, id);
  assert.equal(bridge.scope, "local-derived-unverified");
  assert.equal(bridge.capability, "derived-feedback");
  assert.equal(bridge.liveGate, "CLOSED");
  assert.equal(bridge.trust, "UNVERIFIED");
  assert.equal(first.inspect(id), record);
  assert.equal(await first.verifyRecord(id), true);
  assert.deepEqual(await first.inspectVerified(id), {
    record, integrity: true, liveGate: "CLOSED", trust: "UNVERIFIED",
  });
  assert.equal(await second.verifyRecord(id), false);
  assert.equal(first.checkTransition("surface", "tap", "launch").allowed, false);
  assert.throws(() => { record.output.activity = 99; }, TypeError);
  assert.throws(() => { first.records.push(record); }, TypeError);
});

test("session replay, stale revisions, stale heads and superseded source outputs are rejected", async () => {
  const session = new Session(), other = new Session();
  const record = await session.admitOutput(output());
  await assert.rejects(other.admitOutput(output({ sessionId: session.sessionId })), { code: "out-of-session" });
  await assert.rejects(other.bridge("tap", record.id, other.headCommitment), { code: "missing-contribution" });
  await assert.rejects(session.admitOutput(output({ revision: 0 })), { code: "stale-revision" });
  await assert.rejects(session.admitOutput(output({ predecessorCommitment: null })), { code: "stale-predecessor" });
  await assert.rejects(session.bridge("tap", record.id, null), { code: "stale-predecessor" });
  await session.admitOutput(output());
  await assert.rejects(session.bridge("tap", record.id, session.headCommitment), { code: "stale-revision" });
  const oldId = session.sessionId;
  session.reset();
  assert.notEqual(session.sessionId, oldId);
  assert.equal(session.revision, 0);
  assert.equal(session.records.length, 0);
  await assert.rejects(session.bridge("tap", record.id, null), { code: "missing-contribution" });
});

test("invalid schemas, raw coordinates/media, authority claims and nonfinite data never enter memory", async () => {
  const session = new Session();
  for (const change of [
    { schema: "instrument-output/v2" }, { adapter: "unknown" }, { frame: "world" },
    { units: "meters" }, { scope: "qualified" }, { authority: "sensor" },
    { engineInput: true }, { latitude: 1 }, { media: "blob:raw" }, { delta: [1, 2] },
    { instrument: "gain" }, { instrument: "tap" }, { source: "sensor" },
    { source: "qualified" }, { route: "surface" }, { payload: {} },
  ]) await assert.rejects(session.admitOutput(output(change)));
  for (const change of [
    { activity: NaN }, { activity: Infinity }, { severity: -Infinity }, { occupancy: NaN },
    { x: 3 }, { delta: { dx: 1, dy: 2 } }, { authority: true }, { kind: {} },
    { unresolved: "x".repeat(100_000) }, { occupancy: 1.1 }, { occupancy: -1 }, { unresolved: 0.1 },
    { activity: 1.01 }, { activity: -1 }, { severity: 2 }, { occupancy: 0.1 },
  ]) await assert.rejects(session.admitOutput(output({ output: { ...output().output, ...change } })));
  const accessor = output();
  Object.defineProperty(accessor.output, "activity", { enumerable: true, get() { throw Error("must not execute"); } });
  await assert.rejects(session.admitOutput(accessor), { code: "invalid-schema" });
  await assert.rejects(session.admitOutput(null), { code: "invalid-schema" });
  await assert.rejects(session.admitOutput({ ...output(), [Symbol("extra")]: true }), { code: "invalid-schema" });
  assert.equal(session.revision, 0);
  assert.equal(session.records.length, 0);
});

test("metadata and derived payload changes alter commitments within the same session chain", async () => {
  const session = new Session();
  const first = await session.admitOutput(output({
    sessionId: session.sessionId, revision: 0, predecessorCommitment: null,
  }));
  const changed = await session.admitOutput(output({
    output: { ...output().output, activity: 0.6 },
    sessionId: session.sessionId, revision: 1, predecessorCommitment: first.commitment,
  }));
  assert.equal(changed.previousHeadCommitment, first.commitment);
  assert.notEqual(changed.commitment, first.commitment);
  assert.equal(changed.revision, 2);
});

test("unsupported edges, missing contributions and manufactured reciprocal output are rejected", async () => {
  const session = new Session();
  await assert.rejects(session.bridge("tap", "absent", null), { code: "missing-contribution" });
  const record = await session.admitOutput(output());
  await assert.rejects(session.bridge("legacy", record.id, session.headCommitment), { code: "unsupported-route" });
  await assert.rejects(session.bridge("credit-game", record.id, session.headCommitment), { code: "missing-binding" });
  const bridge = await session.bridge("tap", record.id, session.headCommitment);
  await assert.rejects(session.bridge("surface", bridge.id, session.headCommitment), { code: "missing-binding" });
  const study = await session.bridge("study-environment", record.id, session.headCommitment);
  assert.equal(study.capability, "inspection");
  const evidence = await session.bridge("evidence-gate", record.id, session.headCommitment);
  assert.equal(evidence.capability, "local-evidence");
  assert.equal(session.inspect().qualifications, "missing");
  assert.equal(session.inspect().contributions, "missing");
});

test("bounded retention evicts dependencies rather than allowing missing records to bridge", async () => {
  const session = new Session();
  const first = await session.admitOutput(output());
  for (let index = 0; index < 70; index += 1) await session.admitOutput(output());
  assert.equal(session.records.length, 64);
  assert.equal(session.revision, 71);
  assert.equal(session.inspect(first.id), null);
  assert.equal(await session.verifyRecord(first.id), false);
  assert.equal((await session.inspectVerified(first.id)).record, null);
  await assert.rejects(session.bridge("tap", first.id, session.headCommitment), { code: "missing-contribution" });
  const small = new Session({ maxRecords: 1 });
  await small.admitOutput(output());
  await small.admitOutput(output());
  assert.equal(small.records.length, 1);
  for (const maxRecords of [0, 65, NaN, Infinity, 1.5, "64"]) {
    assert.throws(() => new Session({ maxRecords }), { code: "invalid-limit" });
  }
});

test("concurrent hashing and reset cannot append stale commitments", async () => {
  const session = new Session();
  const pending = session.admitOutput(output());
  session.reset();
  await assert.rejects(pending, { code: "stale-revision" });
  const results = await Promise.allSettled([session.admitOutput(output()), session.admitOutput(output())]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.code, "stale-revision");
  assert.equal(session.revision, 1);
});

test("integrity inspection and bridge verification reject reset races", async () => {
  const session = new Session();
  const record = await session.admitOutput(output());
  const verify = session.verifyRecord(record.id);
  const inspect = session.inspectVerified(record.id);
  const bridge = session.bridge("tap", record.id, session.headCommitment);
  session.reset();
  assert.equal(await verify, false);
  assert.deepEqual(await inspect, {
    record: null, integrity: false, liveGate: "CLOSED", trust: "UNVERIFIED",
  });
  await assert.rejects(bridge, { code: "stale-revision" });
  assert.equal(session.records.length, 0);
});

test("actual Surface classify/seed/derive flow admits safe rhythm aggregates and bridges locally", async () => {
  const session = new Session();
  const cases = [
    [{ x: 0.1, y: 0.1 }],
    [{ x: 1.2, y: 0 }],
    [{ x: 0.8, y: 0 }, { x: 0.5, y: 0 }],
    [{ x: 0.36, y: 0 }],
    [{ x: -0.8, y: -0.1 }, { x: -0.9, y: -0.1 }, { x: -0.1, y: 0 }],
  ];
  const kinds = new Set();
  let pattern = Array.from({ length: 16 }, () => ({ kind: "continuous", energy: 0, severity: 0 }));
  let step = 0;
  for (const args of cases) {
    const classification = SurfaceModel.classify(...args);
    kinds.add(classification.kind);
    await assert.rejects(session.admitOutput(output({ payload: classification })), { code: "invalid-schema" });
    pattern = SurfaceModel.seed(pattern, classification, step++);
    const aggregate = SurfaceDerivedAdapter.derive(pattern, "touch");
    const record = await session.admitInstrument(aggregate);
    assert.deepEqual(record.output, aggregate.output);
    assert.equal(JSON.stringify(record).includes('"delta"'), false);
    const tap = await session.bridge("tap", record.id, session.headCommitment);
    assert.equal(tap.capability, "derived-feedback");
    assert.equal(tap.scope, "local-derived-unverified");
    assert.deepEqual(tap.output, record.output);
    assert.equal(tap.source, "touch");
    assert.equal(session.checkTransition("surface", "tap", "engine.input").allowed, false);
  }
  assert.deepEqual([...kinds].sort(), ["continuous", "endpoint", "sawtooth", "wobble"]);
  const fixture = await session.admitInstrument(SurfaceDerivedAdapter.derive(pattern, "fixture"));
  const bridge = await session.bridge("evidence-gate", fixture.id, session.headCommitment);
  assert.equal(fixture.source, "fixture");
  assert.equal(bridge.source, "fixture");
  assert.equal(bridge.scope, "local-derived-unverified");
  assert.equal(bridge.trust, "UNVERIFIED");
});
