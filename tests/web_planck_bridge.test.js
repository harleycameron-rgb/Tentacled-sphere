"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {PlanckSeparationBridge,FACES,TEMPORAL}=require("../api/planck_bridge.js");
const faces=Object.fromEntries(FACES.map(k=>[k,"commit:"+k]));
const tips=Object.fromEntries([...FACES,...TEMPORAL].map(k=>[k,{expression:k}]));
const input=()=>({runId:"run-1",separationId:"sep-1",faceCommitments:faces,stateHex:"ab".repeat(192)});
test("snapshot is immutable, six-faced and bound to a 1536-bit opaque value",async()=>{
  const b=new PlanckSeparationBridge(),s=await b.capture(input());
  assert.equal(s.stateHex.length*4,1536);
  assert.deepEqual(s.origin,[1024,1024,0]);
  assert.ok(Object.isFrozen(s.faceCommitments));
  faces.tap="modified";assert.equal(s.faceCommitments.tap,"commit:tap");
  faces.tap="commit:tap";
  assert.equal(s.liveGate,"CLOSED");
});
test("replay and malformed face snapshot rejected",async()=>{
  const b=new PlanckSeparationBridge();await b.capture(input());
  await assert.rejects(b.capture(input()));
  await assert.rejects(new PlanckSeparationBridge().capture({...input(),stateHex:"00"}));
  await assert.rejects(new PlanckSeparationBridge().capture({...input(),faceCommitments:{tap:"only"}}));
});
test("first trajectory binds snapshot and requires eight expression identities",async()=>{
  const b=new PlanckSeparationBridge(),s=await b.capture(input());
  await assert.rejects(b.firstTrajectory({runId:"run-1",separationId:"sep-1",snapshotHash:"bad",tick:0,tipExpressions:tips}));
  const t=await b.firstTrajectory({runId:"run-1",separationId:"sep-1",snapshotHash:s.snapshotHash,tick:0,tipExpressions:tips});
  assert.equal(t.temporalTentacles.length,2);assert.equal(Object.keys(t.tipExpressions).length,8);
  assert.equal(t.liveGate,"CLOSED");assert.equal(t.sphereWrites,false);
  await assert.rejects(b.firstTrajectory({runId:"run-1",separationId:"sep-1",snapshotHash:s.snapshotHash,tick:1,tipExpressions:tips}));
});
test("missing eighth tip rejected",async()=>{
  const b=new PlanckSeparationBridge(),s=await b.capture(input());
  const altered={...tips};delete altered.foretentacle;
  await assert.rejects(b.firstTrajectory({runId:"run-1",separationId:"sep-1",snapshotHash:s.snapshotHash,tick:0,tipExpressions:altered}));
});
