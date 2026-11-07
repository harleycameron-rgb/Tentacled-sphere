(function(root){'use strict';
const S=root.ScandocState||(typeof require==='function'?require('./state.js'):null);
const SCHEMA='scandoc-controls/1',CHANNEL='scandoc-controls-v1';
const finite=v=>Array.isArray(v)&&v.length===3&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<=1e6);
function validate(m){
 if(!m||m.schema!==SCHEMA||typeof m.producer!=='string'||!m.producer||m.producer.length>100||!Number.isSafeInteger(m.sequence)||m.sequence<1||!Number.isSafeInteger(m.tick)||m.tick<0||!['FIRE','TRAJECTORY','RESET'].includes(m.type)||typeof m.eventId!=='string'||!m.eventId||m.eventId.length>160||m.coordinateFrame!=='SPHERE_LOCAL_EULER_ZXY'||m.positionUnit!=='rad'||m.velocityUnit!=='rad/s'||m.kind!=='SIMULATED'||m.liveGate!=='CLOSED'||m.sphereWrites!==false||m.geometry_hash!==null||m.temporal_receipt!==null||m.receiptTrust!=='UNVERIFIED')throw Error('Invalid shared control frame');
 S.controls(m.controls);if(!finite(m.position)||!finite(m.velocity))throw Error('Finite relative sphere trajectory required');return S.clone(m);
}
// Every stub uses this identical lifecycle. App identity only selects expression geometry.
class Adapter{
 constructor(app,producer,channelFactory){if(!S.APPS.includes(app))throw Error('Unknown app');this.app=app;this.producer=producer;this.factory=channelFactory||((name)=>new root.BroadcastChannel(name));this.heads=new Map();this.sequence=0;this.active=null;this.frame=null;this.listeners=new Set();this.channel=null;this.seen=new Set();}
 connect(){if(!this.channel){this.channel=this.factory(CHANNEL);this.channel.onmessage=e=>{try{this.accept(e.data);}catch{}};}return true;}
 disconnect(){this.channel?.close();this.channel=null;this.active=null;this.frame=null;}
 subscribe(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
 accept(value){const m=validate(value),head=this.heads.get(m.producer);if(head&&(m.sequence<=head.sequence||m.tick<=head.tick))throw Error('Stale shared control frame');
 if(m.type==='FIRE'){if(this.active||this.seen.has(m.eventId))throw Error('Reset required before another firing');}
 else if(!this.active||m.eventId!==this.active.eventId||m.producer!==this.active.producer)throw Error('Trajectory requires matching explicit firing');
 this.heads.set(m.producer,{sequence:m.sequence,tick:m.tick});
 if(m.type==='FIRE'){this.active={eventId:m.eventId,producer:m.producer};this.seen.add(m.eventId);}
 if(m.type==='RESET')this.active=null;
 this.frame=S.freeze(m);for(const fn of this.listeners)fn(this.snapshot());return this.snapshot();}
 snapshot(){return S.freeze(S.clone({schema:SCHEMA,app:this.app,phase:this.active?'RECEPTIVE':'IDLE',firing:this.active,trajectory:this.active?this.frame:null,liveGate:'CLOSED',sphereWrites:false,receiptTrust:'UNVERIFIED'}));}
 send(type,eventId,tick,controls={},position=[0,0,0],velocity=[0,0,0]){const m={schema:SCHEMA,producer:this.producer,sequence:++this.sequence,tick,type,eventId,controls,position,velocity,coordinateFrame:'SPHERE_LOCAL_EULER_ZXY',positionUnit:'rad',velocityUnit:'rad/s',kind:'SIMULATED',liveGate:'CLOSED',sphereWrites:false,geometry_hash:null,temporal_receipt:null,receiptTrust:'UNVERIFIED'};this.accept(m);this.channel?.postMessage(S.clone(m));return S.freeze(S.clone(m));}
}
const api={SCHEMA,CHANNEL,Adapter,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ScandocControls=api;
})(typeof window!=='undefined'?window:globalThis);
