const {test}=require('node:test');const assert=require('node:assert/strict');const S=require('../instruments/state.js');const C=require('../instruments/control-adapter.js');
test('one firing and trajectory contract drives all eight stubs, reset disarms',()=>{
 const source=new C.Adapter('tap','sphere'),apps=S.APPS.map(id=>new C.Adapter(id,id));
 const fire=source.send('FIRE','session/event',1,{energy:.7});apps.forEach(a=>a.accept(fire));
 const trajectory=source.send('TRAJECTORY','session/event',2,{yaw:.4,tilt:.2},[.4,.2,0],[.1,0,0]);
 for(const app of apps){const s=app.accept(trajectory);assert.equal(s.phase,'RECEPTIVE');assert.deepEqual(s.trajectory.position,[.4,.2,0]);assert.equal(s.liveGate,'CLOSED');assert.equal(s.sphereWrites,false);assert.ok(Object.isFrozen(s.trajectory));}
 const reset=source.send('RESET','session/event',3);apps.forEach(a=>assert.equal(a.accept(reset).phase,'IDLE'));
 assert.throws(()=>source.send('TRAJECTORY','session/event',4));assert.throws(()=>source.send('FIRE','session/event',5));
});
test('reject prefire, wrong authority, mismatched event, stale, nonfinite and forged verification',()=>{
 const source=new C.Adapter('tap','sphere'),a=new C.Adapter('surface','surface');const fire=source.send('FIRE','e',1);const t=source.send('TRAJECTORY','e',2,{},[1,0,0]);
 assert.throws(()=>a.accept(t));a.accept(fire);
 for(const bad of [{producer:'intruder'},{eventId:'other'},{position:[NaN,0,0]},{kind:'ENGINE_VERIFIED'},{liveGate:'OPEN'},{temporal_receipt:{verified:true}}])assert.throws(()=>a.accept({...t,...bad}));
 a.accept(t);assert.throws(()=>a.accept(t));a.disconnect();assert.equal(a.snapshot().phase,'IDLE');
});
test('shared same-origin transport broadcasts once without receiver echoes',()=>{
 const ports=[];const factory=()=>{const p={postMessage(m){ports.filter(x=>x!==p).forEach(x=>x.onmessage({data:m}));},close(){ports.splice(ports.indexOf(p),1);}};ports.push(p);return p;};
 const source=new C.Adapter('tap','sphere',factory),apps=S.APPS.map(id=>new C.Adapter(id,id,factory));source.connect();apps.forEach(a=>a.connect());source.send('FIRE','e',1);source.send('TRAJECTORY','e',2,{},[.1,.2,.3]);apps.forEach(a=>assert.deepEqual(a.snapshot().trajectory.position,[.1,.2,.3]));source.disconnect();apps.forEach(a=>a.disconnect());assert.equal(ports.length,0);
});
test('all apps encapsulate canonical eight-arm topology and hash-bound Sentinel firing',async()=>{
 const topology=C.topology();assert.equal(await S.hash(topology.manifest),topology.hash);assert.equal(topology.manifest.spatialLaunchLegs.length,6);assert.equal(topology.manifest.postlaunchTemporalArms.length,2);assert.equal(topology.manifest.temporalArmsAtLaunch,false);
 const source=new C.Adapter('tap','sphere'),fire=source.send('FIRE','real-local-interaction',10);for(const id of S.APPS){const a=new C.Adapter(id,id);assert.deepEqual(a.snapshot().topology,topology);const snapshot=a.accept(fire);assert.equal(snapshot.sentinel_firing.tick,10);assert.equal(snapshot.sentinel_firing.engineVerified,false);assert.equal(snapshot.sentinel_firing.topology_hash,topology.hash);}
 const a=new C.Adapter('tap','receiver');assert.throws(()=>a.accept({...fire,topology:{...fire.topology,hash:'0'.repeat(64)}}));assert.throws(()=>a.accept({...fire,sentinel_firing:{...fire.sentinel_firing,engineVerified:true}}));a.accept(fire);const t=source.send('TRAJECTORY',fire.eventId,11);assert.throws(()=>a.accept({...t,sentinel_firing:{...t.sentinel_firing,tick:11}}));assert.equal(a.accept(t).sentinel_firing.tick,10);
});
test('saved firing restores with input access, pause, monotonic resume and immutable replay',async()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 const source=new C.Adapter('tap','sphere');source.send('FIRE','e',1);source.access('REQUESTING','permission request',2);source.access('DENIED_OR_UNAVAILABLE','manual fallback',3);source.send('PAUSE','e',4,{paused:true},[.2,0,0]);await source.save(storage,'session');
 const restored=await C.Adapter.load(storage,'session');assert.equal(restored.snapshot().phase,'PAUSED');assert.equal(restored.snapshot().inputAccess.status,'DENIED_OR_UNAVAILABLE');assert.equal(restored.snapshot().sentinel_firing.tick,1);
 const past=restored.replay(0);assert.equal(past.frame.type,'FIRE');assert.ok(Object.isFrozen(past.frame));assert.throws(()=>restored.replay(100));restored.send('RESUME','e',5,{paused:false});assert.equal(restored.snapshot().phase,'RECEPTIVE');assert.equal(restored.snapshot().sentinel_firing.tick,1);assert.equal(restored.frame.sequence,5);
 const bad=JSON.parse(memory.get('session'));bad.payload.frames[0].eventId='altered';memory.set('session',JSON.stringify(bad));await assert.rejects(C.Adapter.load(storage,'session'));memory.set('session','{');await assert.rejects(C.Adapter.load(storage,'session'));await assert.rejects(source.save({setItem(){throw Error('quota');}},'session'));
});
test('late and interrupted receivers recover recorded firing without generating a new one',()=>{
 const ports=[],factory=()=>{const p={postMessage(m){ports.filter(x=>x!==p).forEach(x=>x.onmessage({data:m}));},close(){ports.splice(ports.indexOf(p),1);}};ports.push(p);return p;};
 const source=new C.Adapter('tap','sphere',factory);source.connect();source.send('FIRE','e',1);source.send('TRAJECTORY','e',2,{},[.5,0,0]);const late=new C.Adapter('surface','late',factory);late.connect();assert.equal(late.snapshot().sentinel_firing.tick,1);assert.deepEqual(late.frame.position,[.5,0,0]);late.disconnect(true);source.send('PAUSE','e',3,{paused:true});late.connect();assert.equal(late.snapshot().phase,'PAUSED');late.disconnect(true);source.send('RESET','e',4);late.connect();assert.equal(late.snapshot().phase,'IDLE');source.disconnect();late.disconnect();
});
test('bounded history marks missing samples and never synthesizes them',async()=>{
 const a=new C.Adapter('tap','sphere');a.send('FIRE','e',1);for(let i=2;i<3610;i++)a.send('TRAJECTORY','e',i,{},[i/10000,0,0]);assert.equal(a.journal.length,3600);assert.equal(a.dropped,9);assert.equal(a.replay(0).frame.tick,1);assert.equal(a.replay(1).frame.tick,11);assert.equal(a.replay(1).missingSamples,9);let saved;const storage={setItem(k,v){saved=v;},getItem(){return saved;}};await a.save(storage,'s');const b=await C.Adapter.load(storage,'s');assert.equal(b.dropped,9);assert.equal(b.frame.tick,3609);
});
test('receiver reconnect across a missed reset reports a discontinuity, not an invented event',()=>{
 const ports=[],factory=()=>{const p={postMessage(m){ports.filter(x=>x!==p).forEach(x=>x.onmessage({data:m}));},close(){ports.splice(ports.indexOf(p),1);}};ports.push(p);return p;};const source=new C.Adapter('tap','sphere',factory),receiver=new C.Adapter('gain','receiver',factory);source.connect();receiver.connect();source.send('FIRE','first',1);receiver.disconnect(true);source.send('RESET','first',2);source.send('FIRE','second',3);source.send('TRAJECTORY','second',4);receiver.connect();const state=receiver.snapshot();assert.equal(state.sentinel_firing.eventId,'second');assert.equal(state.history.recoveryDiscontinuities,1);assert.equal(state.history.unavailableTransportFrames,1);assert.equal(receiver.journal.filter(f=>f.type==='RESET').length,0);source.disconnect();receiver.disconnect();
});
