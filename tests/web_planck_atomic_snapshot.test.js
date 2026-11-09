"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {StructuralMeltingConsumer,sha512}=require("../web/protocol.js");
const FACES=["tap","surface","gain","habitat","engine","business"];
const faces=()=>Object.fromEntries(FACES.map(k=>[k,"face-"+k]));
async function ready() {
  const c=new StructuralMeltingConsumer();
  assert.equal(c.markAssemblyReady("run-1"),true);
  const source=faces();
  assert.equal(await c.completeSeparationWithSnapshot("run-1","sep-1",source),true);
  return {c,source};
}
test("atomic snapshot is deeply frozen and geometry hash excludes temporal metadata",async()=>{
  const {c,source}=await ready();
  const s=c.separationSnapshot;
  assert.ok(Object.isFrozen(s));
  assert.ok(Object.isFrozen(s.faceCommitments));
  assert.ok(Object.isFrozen(s.origin));
  source.tap="tampered";
  assert.equal(s.faceCommitments.tap,"face-tap");
  assert.throws(()=>{s.faceCommitments.tap="tampered";},TypeError);
  assert.equal(s.geometryHash,await sha512({origin:[1024,1024,0],faceCommitments:faces()}));
  assert.equal(s.runId,"run-1");
});
test("wrong or missing snapshot hash rejects trajectory point; matching hash accepted",async()=>{
  const {c}=await ready();
  assert.equal(c.beginTrajectoryPlotting("run-1","traj-1"),true);
  assert.equal(c.attach("run-1","traj-1"),true);
  const base={runId:"run-1",separationId:"sep-1",trajectoryId:"traj-1",
    sequence:1,timestamp:c.lastTimestamp+1,data:{x:1}};
  assert.equal(c.acceptTrajectoryPoint({...base}).accepted,false);
  assert.equal(c.acceptTrajectoryPoint({...base,geometryHash:"wrong"}).accepted,false);
  assert.equal(c.acceptTrajectoryPoint({...base,geometryHash:c.separationSnapshot.geometryHash}).accepted,true);
  const receipt=await c.makeTrajectoryReceipt();
  assert.equal(receipt.geometryHash,c.separationSnapshot.geometryHash);
  assert.equal(receipt.liveGate,"CLOSED");
  assert.equal(receipt.receiptTrust,"UNVERIFIED");
  assert.equal(receipt.sphereWrites,false);
  assert.notEqual(receipt.receiptHash,receipt.geometryHash);
  const attachment=await c.makeAttachmentReceipt();
  assert.equal(attachment.geometryHash,c.separationSnapshot.geometryHash);
});
test("spent separation identifier rejected after reset and malformed snapshot cannot transition",async()=>{
  const {c}=await ready();
  c.reset();
  assert.equal(c.markAssemblyReady("run-2"),true);
  assert.equal(await c.completeSeparationWithSnapshot("run-2","sep-1",faces()),false);
  assert.equal(await c.completeSeparationWithSnapshot("run-2","sep-2",{tap:"only"}),false);
  assert.equal(c.state,"ASSEMBLY_READY");
  assert.equal(await c.completeSeparationWithSnapshot("run-2","sep-2",faces()),true);
});
test("legacy simulation path remains closed and never claims a Planck snapshot",async()=>{
  const c=new StructuralMeltingConsumer();
  assert.equal(c.markAssemblyReady("legacy"),true);
  assert.equal(c.completeSeparation("legacy","legacy-sep"),true);
  assert.equal(c.separationSnapshot,null);
  assert.equal(c.beginTrajectoryPlotting("legacy","legacy-traj"),true);
  const receipt=await c.makeTrajectoryReceipt();
  assert.equal(receipt.liveGate,"CLOSED");
  assert.equal(receipt.receiptTrust,"UNVERIFIED");
  assert.equal(receipt.geometryHash,undefined);
});
