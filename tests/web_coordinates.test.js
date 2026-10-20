"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../web/coordinates.js");
const near = (a, b, eps = 2e-12) => assert.ok(Math.abs(a-b) <= eps, `${a} != ${b}`);
const dot = (a,b) => a.reduce((s,v,i) => s+v*b[i],0);
const col = (m,j) => m.map(row => row[j]);
const mul = (a,b) => a.map(row => b[0].map((_,j) => dot(row,col(b,j))));
const apply = (m,v) => m.map(row => dot(row,v));
const checkVector = (a,b,eps) => a.forEach((v,i) => near(v,b[i],eps));
const grid = [-80,-45,0,45,80].flatMap(d => [-170,-30,0,120].map(l => [d*Math.PI/180,l*Math.PI/180]));

test("UEN basis is orthonormal and right-handed across 20 nonpolar positions", () => {
  for (const [p,l] of grid) {
    const f = C.sphericalLocalFrame(p,l);
    assert.equal(f.status,"available");
    assert.deepEqual(f.columnOrder,["up","east","tangent-north"]);
    for (let i=0;i<3;i++) for (let j=0;j<3;j++) near(dot(col(f.basis,i),col(f.basis,j)),i===j?1:0);
    const [n,e,t] = [f.radial,f.east,f.tangentNorth];
    checkVector([n[1]*e[2]-n[2]*e[1],n[2]*e[0]-n[0]*e[2],n[0]*e[1]-n[1]*e[0]],t);
  }
});
test("tangent North matches the stated projection away from poles", () => {
  for (const [p,l] of grid) {
    const f = C.sphericalLocalFrame(p,l);
    checkVector(f.tangentNorth,f.axis.map((k,i)=>(k-Math.sin(p)*f.radial[i])/Math.cos(p)));
  }
});
test("Earth axis reconstructs from radial and tangent North", () => {
  for (const [p,l] of grid) {
    const f=C.sphericalLocalFrame(p,l);
    checkVector(f.radial.map((n,i)=>Math.sin(p)*n+Math.cos(p)*f.tangentNorth[i]),[0,0,1]);
  }
});
test("physical-direction matrix equals B times shear-scale matrix", () => {
  for (const [p,l] of grid) {
    const m=C.sphericalAxisMap(p,l);
    mul(m.frame.basis,m.shearScale).forEach((row,i)=>checkVector(row,m.matrix[i]));
    near(m.determinant,Math.cos(p));
  }
});
test("nonzero latitude mapping is not orthogonal or distance preserving", () => {
  const m=C.sphericalAxisMap(Math.PI/6,0.2);
  near(dot(col(m.matrix,0),col(m.matrix,2)),0.5);
  assert.equal(m.metricPreserving,false);
  assert.equal(m.classification,"shear-scale-not-rigid");
  const mapped=apply(m.matrix,[1,0,1]);
  near(Math.hypot(...mapped),Math.sqrt(3));
  assert.ok(Math.abs(Math.hypot(...mapped)-Math.sqrt(2))>0.1);
});
test("equator is the orthogonal special case", () => {
  const m=C.sphericalAxisMap(0,0.7);
  assert.equal(m.metricPreserving,true);
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) near(dot(col(m.matrix,i),col(m.matrix,j)),i===j?1:0);
});
test("poles and declared numerical exclusion band have unavailable charts", () => {
  for(const p of [Math.PI/2,-Math.PI/2,Math.PI/2-1e-13]) {
    const f=C.sphericalLocalFrame(p,0.3);
    assert.equal(f.reason,"polar-chart-singularity");
    assert.equal(f.basis,null);
    assert.equal(f.east,null);
    assert.equal(f.tangentNorth,null);
    checkVector(f.axis,[0,0,1]);
    const m=C.sphericalAxisMap(p,0.3);
    assert.equal(m.matrix,null);
    assert.equal(m.metricPreserving,null);
  }
});
test("near-pole chart outside exclusion band remains orthonormal", () => {
  const f=C.sphericalLocalFrame(Math.PI/2-1e-8,0.9);
  assert.equal(f.status,"available");
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) near(dot(col(f.basis,i),col(f.basis,j)),i===j?1:0);
});
test("geographic pole sightline is not the Earth-axis direction", () => {
  const r=C.northPoleSightline(0,0,1,0);
  checkVector(r.direction,[-Math.SQRT1_2,0,Math.SQRT1_2]);
  assert.notDeepEqual(r.direction,[0,0,1]);
});
test("sightline matches finite geometric displacement and shared-unit scaling", () => {
  for(const [p,l] of grid) {
    const f=C.sphericalLocalFrame(p,l), R=6371000, h=100;
    const expected=C.directionOrNull(f.axis.map((k,i)=>R*k-(R+h)*f.radial[i]));
    checkVector(C.northPoleSightline(p,l,R,h).direction,expected);
    checkVector(C.northPoleSightline(p,l,R/1000,h/1000).direction,expected);
  }
});
test("observer exactly at north pole target has no sightline", () => {
  const r=C.northPoleSightline(Math.PI/2,0.8,1,0);
  assert.equal(r.status,"undefined");
  assert.equal(r.reason,"observer-at-target");
  assert.equal(r.direction,null);
});
test("height above north pole gives downward sightline despite unavailable tangent chart", () => {
  checkVector(C.northPoleSightline(Math.PI/2,0.8,1,0.01).direction,[0,0,-1]);
});
test("south pole has a defined sightline toward geographic north pole", () => {
  checkVector(C.northPoleSightline(-Math.PI/2,-1,1,0).direction,[0,0,1]);
});
test("zero displacement and zero velocity have no directional arrow", () => {
  assert.equal(C.directionOrNull([0,0,0]),null);
  assert.equal(C.directionOrNull([-0,0,-0]),null);
  assert.deepEqual(C.directionOrNull([0,0,0]),C.directionOrNull([0,0,0]));
});
test("nonzero finite vectors normalize without overflow or underflow", () => {
  checkVector(C.directionOrNull([1.7e308,1.7e308,0]),[Math.SQRT1_2,Math.SQRT1_2,0]);
  checkVector(C.directionOrNull([Number.MIN_VALUE,0,0]),[1,0,0]);
  const r=C.northPoleSightline(0,0,1.7e308,1.7e308);
  near(Math.hypot(...r.direction),1);
});
test("malformed coordinates, units inputs and vectors reject", () => {
  for(const v of [NaN,Infinity,-Infinity,"0",null]) {
    assert.throws(()=>C.sphericalLocalFrame(v,0));
    assert.throws(()=>C.sphericalLocalFrame(0,v));
    assert.throws(()=>C.northPoleSightline(0,0,v,0));
    assert.throws(()=>C.northPoleSightline(0,0,1,v));
  }
  for(const p of [Math.PI,-Math.PI]) assert.throws(()=>C.sphericalLocalFrame(p,0));
  assert.throws(()=>C.sphericalLocalFrame(0,4));
  assert.throws(()=>C.northPoleSightline(0,0,0));
  assert.throws(()=>C.northPoleSightline(0,0,1,-1));
  for(const v of [null,[],[0,0],[0,0,Infinity],["0",0,0]]) assert.throws(()=>C.directionOrNull(v));
});
test("direction lookup and mapping do not require a browser or firing callback", () => {
  assert.equal(C.directionOrNull([0,0,0]),null);
  assert.equal(C.sphericalAxisMap(Math.PI/2,0).status,"unavailable");
  assert.equal(typeof C.fireSentinel,"undefined");
});
test("positive north-pole height survives ratio underflow", () => {
  const result = C.northPoleSightline(Math.PI / 2, 0, 1.7e308, Number.MIN_VALUE);
  assert.equal(result.status, "available");
  assert.equal(result.reason, null);
  assert.deepEqual(result.direction, [0, 0, -1]);
});
test("exact north-pole target remains undefined", () => {
  const result = C.northPoleSightline(Math.PI / 2, 0, 1.7e308, 0);
  assert.equal(result.status, "undefined");
  assert.equal(result.reason, "observer-at-target");
  assert.equal(result.direction, null);
});
