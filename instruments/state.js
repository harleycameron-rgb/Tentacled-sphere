(function(root){
'use strict';
const P=root.TentacledProtocol||(typeof require==='function'?require('../web/protocol.js'):null);
const APPS=Object.freeze(['tap','surface','spiritlevel','gain','habitat','time','space','lineage']);
const LEGS=Object.freeze(['tap','surface','gain','habitat','engine','business']);
const ORIGIN=Object.freeze([1024,1024,0]);
const SCHEMA='scandoc-instruments/state/1';
const clone=value=>JSON.parse(P.canonicalJSON(value));
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
async function hash(value){const provider=root.crypto?.subtle?root.crypto:require('node:crypto').webcrypto;const data=new TextEncoder().encode(P.canonicalJSON(value));return Array.from(new Uint8Array(await provider.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');}
function finiteVector(v){return Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)&&Number.isFinite(Math.hypot(...v))&&Math.hypot(...v)>0;}
const CONTROL_KEYS=['energy','speed','complexity','distortion','yaw','tilt','paused'];
function controls(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!CONTROL_KEYS.includes(k)))throw Error('Unsupported control');
 for(const [key,v] of Object.entries(value)){
  if(key==='paused'){if(typeof v!=='boolean')throw Error('Invalid pause');}
  else if(!Number.isFinite(v)||Math.abs(v)>(key==='yaw'?Math.PI:key==='tilt'?Math.PI/2:key==='speed'?2:1)||!['yaw','tilt'].includes(key)&&v<0)throw Error('Out-of-range control');
 }return clone(value);
}
function validate(message){
 const keys=['schema','producer','sequence','tick','app','kind','vector','controls','geometry_hash','temporal_receipt','liveGate','sphereWrites','receiptTrust'];
 if(!message||Object.keys(message).sort().join('|')!==keys.sort().join('|')||message.schema!==SCHEMA||!APPS.includes(message.app)||
  typeof message.producer!=='string'||!message.producer.length||message.producer.length>100||!Number.isSafeInteger(message.sequence)||message.sequence<1||
  !Number.isSafeInteger(message.tick)||message.tick<0||!['SIMULATED','API_GEOMETRY_UNVERIFIED'].includes(message.kind)||!finiteVector(message.vector)||
  message.liveGate!=='CLOSED'||message.sphereWrites!==false||message.receiptTrust!=='UNVERIFIED'||message.geometry_hash!==null||message.temporal_receipt!==null)throw Error('Invalid or unverified state envelope');
 controls(message.controls);return clone(message);
}
class StateBus{
 #states=new Map();#heads=new Map();#listeners=new Set();#channel=null;#sequence=0;#closed=false;
 constructor(producer,channelFactory){this.producer=producer;this.channelFactory=channelFactory||((name)=>new root.BroadcastChannel(name));}
 accept(message){
  if(this.#closed)throw Error('Bus closed');const m=validate(message),previous=this.#heads.get(m.producer);
  if(previous&&(m.sequence<=previous.sequence||m.tick<=previous.tick))throw Error('Stale state rejected');
  this.#heads.set(m.producer,{sequence:m.sequence,tick:m.tick});this.#states.set(m.app,freeze(m));
  for(const listener of this.#listeners)try{listener(this.snapshot());}catch{/* Subscriber cannot break producers. */}
  return this.snapshot();
 }
 publish(app,kind,vector,values,tick){
  const message={schema:SCHEMA,producer:this.producer,sequence:++this.#sequence,tick,app,kind,vector,controls:controls(values),geometry_hash:null,temporal_receipt:null,liveGate:'CLOSED',sphereWrites:false,receiptTrust:'UNVERIFIED'};
  this.accept(message);if(this.#channel)this.#channel.postMessage(clone(message));return freeze(clone(message));
 }
 connect(){
  if(this.#closed)throw Error('Bus closed');if(this.#channel)return true;
  try{this.#channel=this.channelFactory('scandoc-instruments-v1');this.#channel.onmessage=e=>{if(e.data?.producer===this.producer)return;try{this.accept(e.data);}catch{/* Untrusted or stale local-tab input is ignored. */}};return true;}
  catch{this.#channel=null;return false;}
 }
 disconnect(){this.#channel?.close();this.#channel=null;}
 subscribe(fn){this.#listeners.add(fn);return ()=>this.#listeners.delete(fn);}
 snapshot(){return freeze(clone(Object.fromEntries(this.#states)));}
 close(){this.disconnect();this.#listeners.clear();this.#closed=true;}
}
// This is a local representation contract, NEVER a native burn lifecycle.
class SurfaceContract{
 #phase='CONCEPTUAL';#events=new Map();#commitments=new Map();#sequence=0;#revision=0;#activation=null;#pending=new Set();
 get phase(){return this.#phase;}
 begin(){if(this.#phase!=='CONCEPTUAL')throw Error('Conceptual state required');this.#phase='GATE_FORMING';this.#revision++;}
 event(geometry,tick){
  if(this.#phase!=='GATE_FORMING'||!Number.isSafeInteger(tick)||tick<0||!geometry||!Array.isArray(geometry.points)||!geometry.points.length||geometry.points.length>256||!geometry.points.every(finiteVector))throw Error('Finite curve points and a logical tick required');
  const id='local-surface-event-'+(++this.#sequence);const event=freeze({id,tick,geometry:clone(geometry),kind:'SIMULATED',trust:'LOCAL_REPRESENTATION_ONLY'});this.#events.set(id,event);return freeze(clone(event));
 }
 mesh(eventId,copies){if(!this.#events.has(eventId)||!Number.isInteger(copies)||copies<1||copies>64)throw Error('Invalid mesh reference');return freeze(Array.from({length:copies},(_,index)=>({representation:index,eventId})));}
 async harden(leg,eventId){
  if(this.#phase!=='GATE_FORMING'||!LEGS.includes(leg)||this.#commitments.has(leg)||this.#pending.has(leg)||!this.#events.has(eventId))throw Error('Invalid hardening transition');
  const event=this.#events.get(eventId),previous=[...this.#commitments.values()].at(-1),revision=this.#revision;
  if(previous&&event.tick<=previous.temporal_receipt.tick)throw Error('Nonmonotonic commitment tick');
  if([...this.#commitments.values()].some(c=>c.eventId===eventId))throw Error('An event cannot count as two independent commitments');
  // Serialize operations: a second caller cannot race event identity or ordering.
  if(this.#pending.size)throw Error('Hardening is busy');this.#pending.add(leg);
  try{
   const geometry_hash=await hash(event.geometry);
   if(this.#revision!==revision||this.#phase!=='GATE_FORMING')throw Error('Hardening interrupted');
   const commitment=freeze({leg,eventId,geometry_hash,temporal_receipt:{schema:'local-temporal-reference/1',tick:event.tick,eventId},trust:'LOCAL_HASH_ONLY',engineVerified:false});
   this.#commitments.set(leg,commitment);return freeze(clone(commitment));
  }finally{this.#pending.delete(leg);}
 }
 validate(){
  if(this.#phase!=='GATE_FORMING'||this.#pending.size||this.#commitments.size!==6||!LEGS.every(x=>this.#commitments.has(x)))throw Error('Six unique completed local commitments required');
  this.#phase='VALIDATED';this.#revision++;return this.snapshot();
 }
 activate(explicit=false){if(this.#phase!=='VALIDATED'||explicit!==true)throw Error('Explicit activation requires local validation');this.#phase='EXPLICIT_SURFACE_ACTIVATION';this.#activation=freeze({kind:'LOCAL_VISUAL_ACTIVATION',physicalBurn:false,engineVerified:false});this.#revision++;return this.snapshot();}
 engineBurn(){throw Error('Engine gate CLOSED: verified upstream validator is not connected');}
 writeCentre(){throw Error('Centre write blocked: no verified engine qualification');}
 snapshot(){return freeze(clone({schema:'scandoc-local-surface/1',phase:this.#phase,events:[...this.#events.values()],commitments:[...this.#commitments.values()],activation:this.#activation,centreReference:ORIGIN,centre:null,liveGate:'CLOSED',sphereWrites:false,validationDomain:'LOCAL_REPRESENTATION_ONLY'}));}
 reset(){this.#revision++;this.#phase='CONCEPTUAL';this.#commitments.clear();this.#events.clear();this.#activation=null;}
}
const api={APPS,LEGS,ORIGIN,SCHEMA,StateBus,SurfaceContract,validate,controls,hash,clone,freeze};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ScandocState=api;
})(typeof window!=='undefined'?window:globalThis);
