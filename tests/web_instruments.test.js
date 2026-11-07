const test=require('node:test');const assert=require('node:assert/strict');
const S=require('../instruments/state.js'),M=require('../instruments/model.js');
const geometry={points:[[1,0,.01],[0,1,.01],[-1,0,.01]]};
for(const instrument of ['seven','octopus']){
 test(instrument+': every selectable state, controls, pulse, pause, reset and progression',()=>{
  const s=M.create(instrument),names=instrument==='seven'?M.STAGES:M.MODES;
  for(let index=0;index<names.length;index++){
   M.select(s,index);M.control(s,{paused:true});assert.equal(s.index,index);const tick=s.tick;M.step(s,1/60);assert.equal(s.tick,tick);
   M.control(s,{paused:false,energy:.8,speed:1,distortion:.6,complexity:.8});M.touch(s,.7,.2);M.pulse(s);M.step(s,1/60);assert.equal(s.tick,tick+1);
  }
  s.auto=true;s.selectionTime=s.time;const old=s.index;for(let i=0;i<721;i++)M.step(s,1/60);assert.equal(s.index,(old+1)%names.length);
  assert.equal(M.create(instrument).score,0);assert.throws(()=>M.select(s,99));assert.throws(()=>M.step(s,NaN));assert.throws(()=>M.control(s,{energy:Infinity}));
 });
}
test('seven stages have distinct numerical agency and Surface hardening is durable',()=>{
 const s=M.create('seven');s.paused=false;
 M.select(s,1);M.touch(s,.2,.4);assert.ok(s.velocity.some(x=>x>0));M.step(s,1/60);assert.ok(s.field.some(x=>x!==0));
 const curve=[...s.field];s.hardCurve=curve;M.touch(s,-.7,.2);M.step(s,1/60);assert.deepEqual(s.field,curve);
 M.select(s,2);M.touch(s,.2,.4);assert.ok(s.gains.some(x=>x!==.5));
 M.select(s,3);M.touch(s,.6,.2);assert.deepEqual(s.horizon,[.3,.1]);
 M.select(s,4);M.touch(s,-.5,.5);assert.deepEqual(s.horizon,[-.3,.3]);
 M.select(s,5);M.touch(s,.9,.2);assert.equal(s.edges[5],true);
 M.select(s,6);const vx=s.particles[0].vx;M.touch(s,0,0);assert.notEqual(s.particles[0].vx,vx);
 M.select(s,0);M.pulse(s);assert.ok(s.field.every(x=>x===0));
});
test('read-only history contains actual past states; no missing or future sample is invented',()=>{
 const s=M.create('octopus');assert.equal(M.recorded(s,0),null);s.paused=false;
 for(let i=0;i<90;i++)M.step(s,1/60);assert.equal(s.history.length,3);
 const r=M.recorded(s,1);assert.equal(r.tick,60);assert.ok(r.tick<=s.tick);assert.ok(Object.isFrozen(r));
 assert.equal(M.recorded(s,4),null);assert.throws(()=>{(function(){'use strict';r.tick=999;})();});assert.equal(s.history[1].tick,60);
});
test('versioned state adapter accepts all eight apps and refuses false verification, stale data and mutation',()=>{
 const bus=new S.StateBus('test');let seen=0;bus.subscribe(()=>seen++);
 for(const [i,app] of S.APPS.entries())bus.publish(app,'SIMULATED',[1,0,0],{energy:.5},i+1);
 assert.equal(Object.keys(bus.snapshot()).length,8);assert.equal(seen,8);
 const m=bus.publish('tap','API_GEOMETRY_UNVERIFIED',[0,1,0],{},9);
 assert.throws(()=>bus.accept(m));assert.throws(()=>S.validate({...m,kind:'ENGINE_VERIFIED'}));assert.throws(()=>S.validate({...m,receiptTrust:'VERIFIED'}));assert.throws(()=>S.validate({...m,vector:[NaN,0,1]}));assert.throws(()=>S.validate({...m,liveGate:'OPEN'}));
 assert.equal(bus.snapshot().tap.receiptTrust,'UNVERIFIED');assert.ok(Object.isFrozen(bus.snapshot().tap.vector));
 const copy=S.clone(bus.snapshot());copy.tap.vector[0]=100;assert.equal(bus.snapshot().tap.vector[0],0);
 bus.close();assert.throws(()=>bus.publish('tap','SIMULATED',[1,0,0],{},10));
});
test('local link transfers real state without backend and disconnect stops transport',()=>{
 const links=[];const factory=()=>{const channel={onmessage:null,postMessage(data){for(const other of links)if(other!==channel)other.onmessage?.({data});},close(){links.splice(links.indexOf(channel),1);}};links.push(channel);return channel;};
 const a=new S.StateBus('a',factory),b=new S.StateBus('b',factory);a.connect();b.connect();
 a.publish('habitat','SIMULATED',[1,0,0],{energy:.9},1);assert.equal(b.snapshot().habitat.controls.energy,.9);
 b.disconnect();a.publish('habitat','SIMULATED',[1,0,0],{energy:.2},2);assert.equal(b.snapshot().habitat.controls.energy,.9);
});
test('explicit Surface sequence, six unique events, geometry/temporal separation and closed engine',async()=>{
 const c=new S.SurfaceContract();assert.throws(()=>c.activate(true));assert.throws(()=>c.validate());assert.throws(()=>c.event(geometry,1));c.begin();
 const event=c.event(geometry,1);const copies=c.mesh(event.id,16);assert.equal(new Set(copies.map(x=>x.eventId)).size,1);assert.equal(c.snapshot().events.length,1);
 const first=await c.harden('tap',event.id);assert.match(first.geometry_hash,/^[a-f0-9]{64}$/);assert.equal(first.temporal_receipt.tick,1);assert.equal(first.engineVerified,false);
 await assert.rejects(c.harden('surface',event.id));await assert.rejects(c.harden('tap',c.event(geometry,2).id));assert.throws(()=>c.validate());
 for(const [i,leg] of S.LEGS.slice(1).entries())await c.harden(leg,c.event(geometry,i+3).id);
 assert.equal(c.validate().phase,'VALIDATED');assert.throws(()=>c.activate(false));assert.equal(c.activate(true).phase,'EXPLICIT_SURFACE_ACTIVATION');
 assert.equal(c.snapshot().centre,null);assert.equal(c.snapshot().sphereWrites,false);assert.throws(()=>c.engineBurn());assert.throws(()=>c.writeCentre());
 const snapshot=c.snapshot();assert.ok(Object.isFrozen(snapshot.commitments));assert.equal(snapshot.commitments.length,6);
 c.reset();assert.equal(c.phase,'CONCEPTUAL');assert.equal(c.snapshot().commitments.length,0);
});
test('hashes are canonical, tamper-sensitive, representation-only and reset cancels pending hardening',async()=>{
 assert.equal(await S.hash({a:1,b:2}),await S.hash({b:2,a:1}));assert.notEqual(await S.hash({a:1}),await S.hash({a:2}));await assert.rejects(S.hash({bad:NaN}));
 const c=new S.SurfaceContract();c.begin();const event=c.event(geometry,1),promise=c.harden('tap',event.id);c.reset();await assert.rejects(promise);assert.equal(c.snapshot().commitments.length,0);
});
