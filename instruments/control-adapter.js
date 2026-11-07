(function(root){'use strict';
const S=root.ScandocState||(typeof require==='function'?require('./state.js'):null);
const SCHEMA='scandoc-controls/2',CHANNEL='scandoc-controls-v2';
const TOPOLOGY=S.freeze({"axis4AtLaunch":false,"centreReference":[1024,1024,0],"centreWritten":false,"launchCommitmentsRequired":6,"legacyClientIds":["tap","surface","spiritlevel","gain","habitat","time","space","lineage"],"legacyRoleMapping":"UNVALIDATED","model":"DECLARED_ARCHITECTURE_NOT_ENGINE_EXECUTION","opposingPairs":[["tap","surface"],["gain","habitat"],["engine","business"]],"postlaunchTemporalArms":["time-axis","foretentacle"],"schema":"scandoc-eight-arm-topology/1","spatialLaunchLegs":["tap","surface","gain","habitat","engine","business"],"temporalArmsAtLaunch":false});
const TOPOLOGY_HASH='d0187ab5d0069435d7646c1234b726d84efa7a855e6b4464805400b292e1ca16';
function topology(){return S.freeze({manifest:S.clone(TOPOLOGY),hash:TOPOLOGY_HASH,algorithm:'SHA-256',trust:'REPRESENTATION_INTEGRITY_ONLY'});}
function firing(eventId,producer,tick){return {schema:'sentinel_firing/1',eventId,producer,tick,topology_hash:TOPOLOGY_HASH,kind:'LOCAL_SIMULATED_FIRING',engineVerified:false};}
const canonical=v=>JSON.stringify(S.clone(v));
const finite=v=>Array.isArray(v)&&v.length===3&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<=1e6);
function validate(m){
 if(!m||m.schema!==SCHEMA||typeof m.producer!=='string'||!m.producer||m.producer.length>100||!Number.isSafeInteger(m.sequence)||m.sequence<1||!Number.isSafeInteger(m.tick)||m.tick<0||!['FIRE','TRAJECTORY','RESET'].includes(m.type)||typeof m.eventId!=='string'||!m.eventId||m.eventId.length>160||m.coordinateFrame!=='SPHERE_LOCAL_EULER_ZXY'||m.positionUnit!=='rad'||m.velocityUnit!=='rad/s'||m.kind!=='SIMULATED'||m.liveGate!=='CLOSED'||m.sphereWrites!==false||m.geometry_hash!==null||m.temporal_receipt!==null||m.receiptTrust!=='UNVERIFIED')throw Error('Invalid shared control frame');
 if(canonical(m.topology)!==canonical(topology()))throw Error('Incompatible enclosing topology');
 const f=m.sentinel_firing;if(!f||!Number.isSafeInteger(f.tick)||f.tick<0||f.tick>m.tick||canonical(f)!==canonical(firing(m.eventId,m.producer,f.tick))||m.type==='FIRE'&&f.tick!==m.tick)throw Error('Invalid Sentinel firing binding');
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
 else if(!this.active||m.eventId!==this.active.eventId||m.producer!==this.active.producer||canonical(m.sentinel_firing)!==canonical(this.active.sentinel_firing))throw Error('Trajectory requires matching explicit firing');
 this.heads.set(m.producer,{sequence:m.sequence,tick:m.tick});
 if(m.type==='FIRE'){this.active={eventId:m.eventId,producer:m.producer,sentinel_firing:m.sentinel_firing};this.seen.add(m.eventId);}
 if(m.type==='RESET')this.active=null;
 this.frame=S.freeze(m);for(const fn of this.listeners)fn(this.snapshot());return this.snapshot();}
 snapshot(){return S.freeze(S.clone({schema:SCHEMA,app:this.app,topology:topology(),sentinel_firing:this.active?.sentinel_firing||null,phase:this.active?'RECEPTIVE':'IDLE',firing:this.active,trajectory:this.active?this.frame:null,liveGate:'CLOSED',sphereWrites:false,receiptTrust:'UNVERIFIED'}));}
 send(type,eventId,tick,controls={},position=[0,0,0],velocity=[0,0,0]){const m={schema:SCHEMA,producer:this.producer,sequence:++this.sequence,tick,type,eventId,topology:topology(),sentinel_firing:type==='FIRE'?firing(eventId,this.producer,tick):this.active?.sentinel_firing,controls,position,velocity,coordinateFrame:'SPHERE_LOCAL_EULER_ZXY',positionUnit:'rad',velocityUnit:'rad/s',kind:'SIMULATED',liveGate:'CLOSED',sphereWrites:false,geometry_hash:null,temporal_receipt:null,receiptTrust:'UNVERIFIED'};this.accept(m);this.channel?.postMessage(S.clone(m));return S.freeze(S.clone(m));}
}
const api={SCHEMA,CHANNEL,Adapter,validate,topology,TOPOLOGY_HASH};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ScandocControls=api;
})(typeof window!=='undefined'?window:globalThis);
