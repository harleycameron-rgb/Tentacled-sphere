"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const geometry = require("../web/geometry.js");

const close = (actual, expected, tolerance = 1e-12) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

test("cube-octahedron model has the specified vertices, incidence, and edges", () => {
  const model = geometry.cubeModel();
  const result = geometry.verifyCubeModel();
  assert.deepEqual(result.matrix, [
    [1, 0, 1, 0, 1, 0],
    [1, 0, 1, 0, 0, 1],
    [1, 0, 0, 1, 1, 0],
    [1, 0, 0, 1, 0, 1],
    [0, 1, 1, 0, 1, 0],
    [0, 1, 1, 0, 0, 1],
    [0, 1, 0, 1, 1, 0],
    [0, 1, 0, 1, 0, 1],
  ]);
  assert.equal(model.arms.length, 8);
  assert.equal(model.ports.length, 6);
  assert.equal(result.cubeEdges.length, 12);
  assert.equal(result.portEdges.length, 12);
  assert.equal(result.incidenceCount, 24);
  assert.deepEqual(result.rowSums, Array(8).fill(3));
  assert.deepEqual(result.columnSums, Array(6).fill(4));
  assert.equal(result.pairedEdges.length, 12);
  assert.equal(result.gramValid, true);
  assert.equal(result.supportValid, true);
  for (const vector of [...model.arms, ...model.ports]) close(Math.hypot(...vector), 1);
  close(geometry.angleDegrees(model.arms[0], model.arms[1]), Math.acos(1 / 3) * 180 / Math.PI);
  close(geometry.angleDegrees(model.ports[0], model.ports[2]), 90);
});

test("all paired spherical edge midpoints and great-circle crossings verify", () => {
  const result = geometry.verifyCubeModel();
  assert.equal(result.duality.midpointSeparationsDegrees.length, 12);
  assert.equal(result.duality.orthogonalityDeparturesDegrees.length, 12);
  result.duality.midpointSeparationsDegrees.forEach((value) => close(value, 0, 1e-6));
  result.duality.orthogonalityDeparturesDegrees.forEach((value) => close(value, 0, 1e-6));
  close(result.duality.maximumMidpointSeparationDegrees, 0, 1e-6);
  close(result.duality.maximumOrthogonalityDepartureDegrees, 0, 1e-6);
});

test("shared rigid rotations preserve duality and every arm-pair distance", () => {
  const baseline = geometry.cubeModel();
  for (let degree = -360; degree <= 360; degree += 1) {
    const pulse = geometry.pulseModel(baseline, {
      mode: "rigid",
      count: 1,
      amplitude: degree * Math.PI / 180,
    });
    const dual = geometry.analyzeDual(pulse.arms, pulse.ports);
    const pairChanges = geometry.comparePairDistances(baseline.arms, pulse.arms);
    assert.ok(dual.maximumMidpointSeparationDegrees < 1e-6);
    assert.ok(dual.maximumOrthogonalityDepartureDegrees < 1e-6);
    assert.equal(pairChanges.changedPairs, 0);
    pulse.arms.forEach((vector, index) => close(Math.hypot(...vector), Math.hypot(...baseline.arms[index])));
  }
});

test("harmonic shifts preserve radii and change 25/28 arm-pair distances", () => {
  const baseline = geometry.cubeModel();
  let nonzeroCount = 0;
  for (let step = -200; step <= 200; step += 1) {
    const amplitude = step / 1000;
    const pulse = geometry.pulseModel(baseline, {
      mode: "harmonic",
      count: 1,
      amplitude,
    });
    for (let index = 0; index < 8; index += 1) {
      close(Math.hypot(...pulse.arms[index]), Math.hypot(...baseline.arms[index]));
    }
    const changes = geometry.comparePairDistances(baseline.arms, pulse.arms, 1e-10);
    if (amplitude === 0) assert.equal(changes.changedPairs, 0);
    else {
      nonzeroCount += 1;
      assert.equal(changes.changedPairs, 25, `amplitude ${amplitude}`);
    }
  }
  assert.equal(nonzeroCount, 400);
  const referencePulse = geometry.pulseModel(baseline, {
    mode: "harmonic",
    count: 1,
    amplitude: 0.1137,
  });
  const referenceDual = geometry.analyzeDual(referencePulse.arms, referencePulse.ports);
  close(referenceDual.maximumMidpointSeparationDegrees, 9.2948, 0.001);
  close(referenceDual.maximumOrthogonalityDepartureDegrees, 6.2227, 0.001);
  const unitDistances = geometry.comparePairDistances(
    baseline.arms, referencePulse.arms, 1e-10,
  );
  const doubledDistances = geometry.comparePairDistances(
    baseline.arms, referencePulse.arms, 1e-10, 2,
  );
  assert.equal(doubledDistances.changedPairs, unitDistances.changedPairs);
  close(doubledDistances.maximumAbsoluteChange, unitDistances.maximumAbsoluteChange * 2);
});

test("undo derives the original baseline without accumulating pulse rotations", () => {
  const baseline = geometry.cubeModel();
  const altered = geometry.pulseModel(baseline, {
    mode: "harmonic",
    count: 2,
    amplitude: 0.1137,
  });
  assert.notDeepEqual(altered.arms, baseline.arms);
  const restored = geometry.pulseModel(baseline, {
    mode: "harmonic",
    count: 0,
    amplitude: 0.1137,
  });
  assert.deepEqual(restored.arms, baseline.arms);
  assert.deepEqual(restored.ports, baseline.ports);
});

test("API vectors are checked and model ordering stays stable", () => {
  const result = geometry.apiModel(Array.from({ length: 8 }, (_, index) => [1, index + 1, 2]));
  assert.deepEqual(result.armOrder, geometry.APP_IDS);
  assert.equal(result.arms.length, 8);
  assert.throws(() => geometry.apiModel([[0, 0, 0]]), /exactly eight/);
  assert.throws(() => geometry.normalize([0, 0, 0]), /nonzero/);
  assert.throws(() => geometry.normalize([1, Infinity, 0]), /finite/);
  close(Math.hypot(...geometry.normalize([1.7e308, 1.7e308, 1.7e308])), 1);
});
