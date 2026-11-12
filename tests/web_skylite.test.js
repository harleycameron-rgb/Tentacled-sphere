const test=require('node:test'),assert=require('node:assert/strict');
const K=require('../instruments/skylite-core.js'),Sensors=require('../instruments/skylite-sensors.js');
for(const app of K.IDS)test('Skylite adapter: '+app,()=>{
 const s=K.create(app);K.set(s,{paused:false,manual:[.4,.2,.1],gain:.9,lambda:3});K.pulse(s);
 for(let i=0;i<30;i++)K.step(s,1/60);
 const frame=K.frame(s);assert.equal(frame.app,app);assert.ok(frame.geometry.points.length>0);assert.equal(frame.geometry.engineVerified,false);assert.equal(frame.geometry.source,'DECLARED_BROWSER_MODEL');
 assert.ok(frame.geometry.points.every(v=>v.every(Number.isFinite)));assert.equal(frame.receiptTrust,'UNVERIFIED');assert.equal(frame.derived.absoluteVelocityAvailable,false);assert.equal(frame.infrared,'UNAVAILABLE_NO_HARDWARE_INTERFACE');assert.ok(Object.isFrozen(frame));
 assert.ok(s.output[0]>0&&s.output[0]<.4);const tick=s.tick;K.set(s,{paused:true});K.step(s,1/60);assert.equal(s.tick,tick);
});
test('attenuation follows declared first-order response and is frame-rate consistent',()=>{
 const a=K.create(),b=K.create();for(const s of [a,b])K.set(s,{paused:false,manual:[1,0,0],lambda:4});
 for(let i=0;i<60;i++)K.step(a,1/60);for(let i=0;i<120;i++)K.step(b,1/120);
 assert.ok(Math.abs(a.output[0]-(1-Math.exp(-4)))<1e-10);assert.ok(Math.abs(a.output[0]-b.output[0])<1e-10);
 assert.throws(()=>K.set(a,{lambda:0}));assert.throws(()=>K.step(a,Infinity));assert.throws(()=>K.orientation(a,[NaN,0,0]));
});
test('reported sample processing is calibrated once and integrated by sample time, not render frames',()=>{
 const s=K.create();K.orientation(s,[0,0,0]);K.acceleration(s,[.2,0,0],1000);K.calibrate(s);
 K.acceleration(s,[1.2,0,0],1020);K.acceleration(s,[1.2,0,0],1040);assert.ok(Math.abs(s.deltaVelocity[0]-.02)<1e-12);
 K.set(s,{paused:false});for(let i=0;i<60;i++)K.step(s,1/60);assert.ok(Math.abs(s.deltaVelocity[0]-.02)<1e-12);
 assert.equal(s.linearVelocityKind,'DERIVED_SESSION_FRAME_DELTA_VELOCITY');assert.equal(K.frame(s).derived.absoluteVelocityAvailable,false);
 const before=[...s.deltaVelocity];K.acceleration(s,[1.2,0,0],1400);assert.deepEqual(s.deltaVelocity,before);assert.ok(s.motionGaps>0);
 assert.throws(()=>K.acceleration(s,[1,0,0],1390));K.stopSensors(s);assert.equal(s.linearVelocityKind,'UNAVAILABLE');assert.equal(s.orientation,null);
});
test('reported orientation rotates acceleration into the calibrated session frame',()=>{
 const vector=K.relativeVector([1,0,0],[Math.PI/2,0,0],[0,0,0]);assert.ok(Math.abs(vector[0])<1e-12);assert.ok(Math.abs(vector[1]-1)<1e-12);
 const s=K.create();K.orientation(s,[2*Math.PI-.02,0,0]);K.calibrate(s);K.orientation(s,[.02,0,0]);K.set(s,{paused:false});K.step(s,.05);assert.ok(s.output[0]>0&&s.output[0]<.04);
});
test('sphere/paraboloid curvature is explicit, scaled and not a physical observation',()=>{
 const surface=K.surface();assert.equal(surface.radius,K.EARTH_RADIUS);assert.equal(surface.sphere.principalCurvatures[0],-1/K.EARTH_RADIUS);
 assert.notEqual(surface.paraboloid.principalCurvatures[0],surface.sphere.principalCurvatures[0]);assert.notEqual(surface.paraboloid.sag,surface.sphere.sag);
 assert.ok(Math.abs(Math.hypot(...surface.localNormal)-1)<1e-12);assert.equal(surface.physicalMeasurement,false);
 assert.throws(()=>K.surface(1,1,1));assert.throws(()=>K.surface(Infinity));
 const s=K.create('surface');const a=K.geometry(s);K.set(s,{focalRatio:.5});const b=K.geometry(s);assert.notDeepEqual(a.referencePoints,b.referencePoints);assert.deepEqual(a.points,b.points);
});
test('pulse identities survive views and differ across reset sessions; history is retrospective',()=>{
 const s=K.create('lineage');K.set(s,{paused:false});const event=K.pulse(s);K.set(s,{app:'time'});for(let i=0;i<24;i++)K.step(s,1/60);
 assert.equal(s.events[0].id,event.id);assert.ok(s.history.every(h=>h.tick<=s.tick));assert.equal(event.engineVerified,false);
 const other=K.create('lineage');K.set(other,{paused:false});assert.notEqual(K.pulse(other).id,event.id);
});
test('sensor permissions, gravity-only rejection, listener cleanup and pending cancellation',async()=>{
 const target=new EventTarget();let orientationCalls=0,motionCalls=0,status='';
 target.DeviceOrientationEvent={requestPermission:async()=> 'granted'};target.DeviceMotionEvent={requestPermission:async()=> 'granted'};
 const sensors=new Sensors(target,()=>orientationCalls++,()=>motionCalls++,s=>{status=s;});await sensors.start();
 const pose=new Event('deviceorientation');Object.assign(pose,{alpha:0,beta:0,gamma:0});target.dispatchEvent(pose);assert.equal(orientationCalls,1);
 const gravity=new Event('devicemotion');gravity.accelerationIncludingGravity={x:0,y:0,z:9.81};target.dispatchEvent(gravity);assert.equal(motionCalls,0);assert.match(status,/not integrated/);
 const motion=new Event('devicemotion');motion.acceleration={x:0,y:0,z:0};target.dispatchEvent(motion);assert.equal(motionCalls,1);
 sensors.stop();target.dispatchEvent(pose);target.dispatchEvent(motion);assert.equal(orientationCalls,1);assert.equal(motionCalls,1);
 let resolve;target.DeviceOrientationEvent.requestPermission=()=>new Promise(r=>{resolve=r;});const pending=sensors.start();sensors.stop();resolve('granted');await pending;assert.equal(sensors.listeners.length,0);
 target.DeviceOrientationEvent.requestPermission=async()=> 'denied';target.DeviceMotionEvent.requestPermission=async()=> 'denied';await sensors.start();assert.equal(sensors.listeners.length,0);assert.match(status,/denied/);
});
