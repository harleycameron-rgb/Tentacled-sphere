"use strict";
// Regression checks against existing cube/octahedron preview geometry.
// The eight APP_IDS here are preview arm labels, NOT six launch legs plus temporal arms.
const test = require("node:test");
const assert = require("node:assert/strict");
const g = require("../web/geometry.js");

test("QOB cube geometry remains three-dimensional with six signed paired ports", () => {
  const model = g.cubeModel();
  assert.equal(model.ports.length, 6);
  assert.deepEqual(model.portOrder, ["+X","-X","+Y","-Y","+Z","-Z"]);
  for (let axis=0; axis<3; axis++) {
    const plus = model.ports[axis*2], minus = model.ports[axis*2+1];
    assert.ok(plus.every((x,i)=>x===-minus[i]));
  }
  assert.equal(g.cubeEdges().length,12);
});

test("QOB preview rigid transform retains all cube vertex pair distances", () => {
  const before=g.cubeModel();
  const after=g.pulseModel(before,{mode:"rigid",count:2,amplitude:0.13});
  assert.equal(g.comparePairDistances(before.arms,after.arms,1e-10).changedPairs,0);
  assert.deepEqual(g.CUBE_SIGNS.map(v=>v.length),Array(8).fill(3));
});

test("QOB harmonic visual deformation is not mislabeled a rigid invariant", () => {
  const before=g.cubeModel();
  const after=g.pulseModel(before,{mode:"harmonic",count:1,amplitude:0.1137});
  assert.ok(g.comparePairDistances(before.arms,after.arms,1e-10).changedPairs>0);
});

test("QOB nonfinite vectors and 8-vector preview must not imply six-leg burn", () => {
  assert.throws(()=>g.apiModel(Array(6).fill([1,0,0])),/exactly eight/);
  assert.throws(()=>g.normalize([NaN,0,0]),/finite/);
});
