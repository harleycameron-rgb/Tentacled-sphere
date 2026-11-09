"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {PlanckSeparationBridge,FACES,TEMPORAL}=require("../api/planck_bridge.js");
const {StructuralMeltingConsumer}=require("../web/protocol.js");

function fixture() {
  const faceCommitments=Object.fromEntries(FACES.map((k,i)=>[k,"synthetic-face-"+i]));
  const tipExpressions=Object.fromEntries([...FACES,...TEMPORAL].map((k,i)=>[k,{model:"synthetic",index:i}]));
  return {faceCommitments,tipExpressions};
}
test("Planck snapshot binds a successful simulation separation, without native authority",async()=>{
  const consumer=new StructuralMeltingConsumer();
  assert.equal(consumer.markAssemblyReady("run-A"),true);
  assert.equal(consumer.completeSeparation("run-A","sep-A"),true);
  const bridge=new PlanckSeparationBridge(),{faceCommitments,tipExpressions}=fixture();
  const snapshot=await bridge.capture({
    runId:consumer.runId,separationId:consumer.separationId,
    faceCommitments,stateHex:"12".repeat(192),
  });
  assert.equal(consumer.beginTrajectoryPlotting("run-A","traj-A"),true);
  const first=await bridge.firstTrajectory({
    runId:"run-A",separationId:"sep-A",snapshotHash:snapshot.snapshotHash,
    tick:0,tipExpressions,
  });
  assert.equal(first.snapshotHash,snapshot.snapshotHash);
  assert.deepEqual(first.temporalTentacles,["time_axis","foretentacle"]);
  assert.equal(consumer.state,"TRAJECTORY_PLOTTING");
  assert.equal(first.liveGate,"CLOSED");
  assert.equal(first.receiptTrust,"UNVERIFIED");
  assert.equal(first.sphereWrites,false);
});
test("bridge rejects trajectory from a different separation event",async()=>{
  const bridge=new PlanckSeparationBridge(),{faceCommitments,tipExpressions}=fixture();
  const snapshot=await bridge.capture({
    runId:"run-A",separationId:"sep-A",faceCommitments,stateHex:"12".repeat(192),
  });
  await assert.rejects(bridge.firstTrajectory({
    runId:"run-A",separationId:"sep-B",snapshotHash:snapshot.snapshotHash,
    tick:0,tipExpressions,
  }));
});
test("post-snapshot input mutation cannot change recorded face commitments",async()=>{
  const bridge=new PlanckSeparationBridge(),{faceCommitments}=fixture();
  const snapshot=await bridge.capture({
    runId:"run-A",separationId:"sep-A",faceCommitments,stateHex:"12".repeat(192),
  });
  faceCommitments.tap="tampered";
  assert.equal(snapshot.faceCommitments.tap,"synthetic-face-0");
  assert.ok(Object.isFrozen(snapshot.faceCommitments));
});
