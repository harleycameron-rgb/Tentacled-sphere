(function(root){'use strict';
const S=root.ScandocState||(typeof require==='function'?require('./state.js'):null);
const IDS=S.APPS,TAU=Math.PI*2,EARTH_RADIUS=6371008.8;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
let sessionCounter=0;
const PROFILES=Object.freeze({
 tap:{name:'Tap · concave sky',geometry:'inward hemisphere / Sentinel reticle',agency:'Rotate the sky and pulse the reticle. Pulses remain local simulation events.'},
 surface:{name:'Surface · convex curvature',geometry:'Earth-reference sphere cap and concentric paraboloid',agency:'Rotate and compare explicit sphere/paraboloid curvature. These are declared reference surfaces, not measured terrain.'},
 spiritlevel:{name:'SpiritLevel · calibrated plane',geometry:'session-relative plane and horizon',agency:'Calibrate while stationary; compare reported orientation with the attenuated plane. This is not a certified inclinometer.'},
 gain:{name:'Gain · radial transfer',geometry:'six radial channels',agency:'Adjust gain and attenuation. Channel amplitudes are derived display quantities, not measured energy.'},
 habitat:{name:'Habitat · orbital environment',geometry:'three simulated orbital references and horizon',agency:'Adjust the local horizon. Orbit motion is simulated and is not an ecological or astronomical prediction.'},
 time:{name:'Time · recorded trace',geometry:'retrospective session trajectory',agency:'Inspect only recorded session samples. Missing history and future samples are unavailable.'},
 space:{name:'Space · three-axis frame',geometry:'cube and local coordinate axes',agency:'Rotate the local spatial frame. No fourth launch axis is created.'},
 lineage:{name:'Lineage · event ancestry',geometry:'actual local event chain',agency:'Pulse to append a real local interaction event. Mesh views retain each event identity; no verified engine receipt is created.'}
});
function create(app='tap'){
 if(!IDS.includes(app))throw Error('Unknown stubwork');
 return {schema:'scandoc-skylite/session/1',sessionId:root.crypto?.randomUUID?.()||('local-'+Date.now()+'-'+(++sessionCounter)),app,tick:0,time:0,paused:true,reduced:false,energy:.5,gain:1,lambda:4,focalRatio:1,
  manual:[0,0,0],orientation:null,orientationOrigin:null,reportedAcceleration:null,accelerationBias:null,lastMotionTime:null,
  deltaVelocity:[0,0,0],attenuatedVelocity:[0,0,0],integratedSamples:0,motionGaps:0,output:[0,0,0],appVector:null,
  inputKind:'MANUAL_SIMULATION',linearVelocityKind:'UNAVAILABLE',infrared:'UNAVAILABLE_NO_HARDWARE_INTERFACE',history:[],events:[],nextEvent:1};
}
function finiteVector(v){return Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);}
function orientation(s,angles){if(!finiteVector(angles)||angles.some(v=>Math.abs(v)>TAU*2))throw Error('Invalid orientation radians');s.orientation=[...angles];s.inputKind=s.reportedAcceleration?'DEVICE_ORIENTATION_AND_MOTION_REPORTED':'DEVICE_ORIENTATION_REPORTED';}
function acceleration(s,values,timeMs){
 if(!finiteVector(values)||values.some(v=>Math.abs(v)>100)||!Number.isFinite(timeMs)||timeMs<0)throw Error('Invalid acceleration sample');
 if(s.lastMotionTime!==null&&timeMs<=s.lastMotionTime)throw Error('Stale motion sample');
 const elapsed=s.lastMotionTime===null?null:(timeMs-s.lastMotionTime)/1000;
 s.reportedAcceleration=[...values];s.lastMotionTime=timeMs;s.inputKind=s.orientation?'DEVICE_ORIENTATION_AND_MOTION_REPORTED':'DEVICE_MOTION_REPORTED';
 if(!s.accelerationBias)return;
 if(elapsed===null||elapsed>.1){s.motionGaps++;return;}
 // Session-relative device-frame estimate only. No world/GPS velocity claim.
 let corrected=values.map((v,i)=>v-s.accelerationBias[i]);
 if(s.orientation&&s.orientationOrigin){corrected=relativeVector(corrected,s.orientation,s.orientationOrigin);s.linearVelocityKind='DERIVED_SESSION_FRAME_DELTA_VELOCITY';}
 else s.linearVelocityKind='DERIVED_FIXED_DEVICE_FRAME_DELTA_VELOCITY';
 s.deltaVelocity=s.deltaVelocity.map((v,i)=>clamp(v+corrected[i]*elapsed,-20,20));s.integratedSamples++;
}
function matrix(angles){
 const [a,b,g]=angles,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cg=Math.cos(g),sg=Math.sin(g);
 return [[ca*cg-sa*sb*sg,-sa*cb,ca*sg+sa*sb*cg],[sa*cg+ca*sb*sg,ca*cb,sa*sg-ca*sb*cg],[-cb*sg,sb,cb*cg]];
}
function relativeVector(vector,current,origin){const a=matrix(current),b=matrix(origin);const world=a.map(row=>row.reduce((sum,x,i)=>sum+x*vector[i],0));return [0,1,2].map(i=>b.reduce((sum,row,j)=>sum+row[i]*world[j],0));}
function calibrate(s){
 s.orientationOrigin=s.orientation?[...s.orientation]:null;
 s.accelerationBias=s.reportedAcceleration?[...s.reportedAcceleration]:null;
 s.deltaVelocity=[0,0,0];s.attenuatedVelocity=[0,0,0];s.integratedSamples=0;s.linearVelocityKind='UNAVAILABLE';s.lastMotionTime=null;
 return {orientation:Boolean(s.orientationOrigin),acceleration:Boolean(s.accelerationBias),assumption:'held stationary during calibration'};
}
function stopSensors(s){s.orientation=null;s.orientationOrigin=null;s.reportedAcceleration=null;s.accelerationBias=null;s.lastMotionTime=null;s.deltaVelocity=[0,0,0];s.attenuatedVelocity=[0,0,0];s.linearVelocityKind='UNAVAILABLE';s.inputKind='MANUAL_SIMULATION';}
function set(s,values){
 for(const [key,value] of Object.entries(values)){
  if(key==='app'){if(!IDS.includes(value))throw Error('Unknown stubwork');}
  else if(key==='manual'){if(!finiteVector(value)||value.some(x=>Math.abs(x)>Math.PI))throw Error('Invalid manual rotation');}
  else if(key==='paused'||key==='reduced'){if(typeof value!=='boolean')throw Error('Invalid flag');}
  else if(!['energy','gain','lambda','focalRatio'].includes(key)||!Number.isFinite(value)||value<(key==='lambda'?.2:key==='focalRatio'?.25:0)||value>(key==='lambda'?12:['gain','focalRatio'].includes(key)?2:1))throw Error('Invalid control');
 }
 Object.assign(s,S.clone(values));
}
function pulse(s){if(s.paused)return null;const event=S.freeze({id:s.sessionId+'-event-'+s.nextEvent++,previousId:s.events.at(-1)?.id||null,tick:s.tick,app:s.app,kind:'LOCAL_INTERACTION',geometrySource:'DECLARED_BROWSER_MODEL',engineVerified:false});s.events.push(event);if(s.events.length>200)s.events.shift();return event;}
function step(s,dt){
 if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('Invalid step');S.clone(s);if(s.paused)return;
 s.tick++;s.time+=dt;
 const target=s.orientation?s.orientation.map((v,i)=>Math.atan2(Math.sin(v-(s.orientationOrigin?.[i]||0)),Math.cos(v-(s.orientationOrigin?.[i]||0)))):s.manual;
 const alpha=1-Math.exp(-s.lambda*dt);s.output=s.output.map((v,i)=>v+(target[i]*s.gain-v)*alpha);s.attenuatedVelocity=s.attenuatedVelocity.map((v,i)=>v+(s.deltaVelocity[i]*s.gain-v)*alpha);
 if(s.tick%12===0){s.history.push({tick:s.tick,time:s.time,app:s.app,output:[...s.output],inputKind:s.inputKind,velocityKind:s.linearVelocityKind,deltaVelocity:[...s.deltaVelocity]});if(s.history.length>600)s.history.shift();}
}
function surface(radius=EARTH_RADIUS,focal=EARTH_RADIUS,rhoFraction=.08){
 if(!Number.isFinite(radius)||radius<=0||radius>1e9||!Number.isFinite(focal)||focal<=0||focal>1e10||!Number.isFinite(rhoFraction)||rhoFraction<0||rhoFraction>=1)throw Error('Invalid surface reference');
 const rho=radius*rhoFraction,slope=rho/focal,rootTerm=Math.sqrt(radius*radius-rho*rho);
 return {frame:'declared Earth-centred sphere / local outward tangent patch',units:'metres; curvature in 1/metre',radius,focal,rho,
  sphere:{sag:-rho*rho/(radius+rootTerm),principalCurvatures:[-1/radius,-1/radius]},
  paraboloid:{sag:-rho*rho/(2*focal),principalCurvatures:[-1/focal/Math.pow(1+slope*slope,1.5),-1/focal/Math.sqrt(1+slope*slope)]},
  localNormal:[rho/radius,0,rootTerm/radius],physicalMeasurement:false};
}
function geometry(s){
 const points=[],segments=32,energy=.3+s.energy*.6;let referencePoints=null;
 if(s.app==='tap')for(let ring=0;ring<5;ring++)for(let i=0;i<=segments;i++){const a=i*TAU/segments,z=ring/5,r=Math.sqrt(1-z*z);points.push([r*Math.cos(a),-z,r*Math.sin(a)]);}
 if(s.app==='surface'){
  referencePoints=[];const patch=EARTH_RADIUS*.08;
  for(let ring=1;ring<=5;ring++)for(let i=0;i<=segments;i++){
   const r=ring/5,a=i*TAU/segments,sur=surface(EARTH_RADIUS,EARTH_RADIUS*s.focalRatio,.08*r);
   points.push([r*Math.cos(a),r*Math.sin(a),sur.sphere.sag/patch*20]);referencePoints.push([r*Math.cos(a),r*Math.sin(a),sur.paraboloid.sag/patch*20]);
  }
 }
 if(s.app==='spiritlevel')for(let i=-3;i<=3;i++)for(const x of [-1,1])points.push([x,i/3,0]);
 if(s.app==='gain')for(let i=0;i<6;i++){const a=i*TAU/6,r=(energy+Math.min(.3,Math.abs(s.attenuatedVelocity[i%3])))*s.gain*(.7+.3*Math.cos(s.output[i%3]));points.push([0,0,0],[r*Math.cos(a),r*Math.sin(a),0]);}
 if(s.app==='habitat')for(let j=0;j<3;j++)for(let i=0;i<=segments;i++){const a=i*TAU/segments,r=.35+j*.25;points.push([r*Math.cos(a),r*Math.sin(a),j*.08]);}
 if(s.app==='space')for(let i=0;i<8;i++)points.push([(i&1)?.65:-.65,(i&2)?.65:-.65,(i&4)?.65:-.65]);
 if(s.app==='time')for(const h of s.history)points.push([h.output[0],h.output[1],h.output[2]]);
 if(s.app==='lineage')for(const [i,event] of s.events.entries())points.push([i/Math.max(1,s.events.length-1)*1.8-.9,event.app===s.app?-.15:.15,0]);
 return {schema:'scandoc-skylite/geometry/1',profile:s.app,source:'DECLARED_BROWSER_MODEL',outputKind:'DERIVED_GEOMETRY',appReference:s.appVector?{vector:s.appVector,trust:'API_GEOMETRY_UNVERIFIED'}:null,points,referencePoints,displayVerticalExaggeration:s.app==='surface'?20:1,
  surface:s.app==='surface'?surface(EARTH_RADIUS,EARTH_RADIUS*s.focalRatio):null,engineVerified:false,liveGate:'CLOSED',sphereWrites:false};
}
function frame(s){return S.freeze(S.clone({schema:'scandoc-skylite/frame/1',sessionId:s.sessionId,app:s.app,tick:s.tick,input:{kind:s.inputKind,orientationKind:s.orientation?'DEVICE_ORIENTATION_REPORTED':'MANUAL_SIMULATION',accelerationKind:s.reportedAcceleration?'DEVICE_MOTION_REPORTED':'UNAVAILABLE',orientationRadians:s.orientation,accelerationMetresPerSecondSquared:s.reportedAcceleration},
 derived:{kind:s.linearVelocityKind,deltaVelocityMetresPerSecond:s.linearVelocityKind==='UNAVAILABLE'?null:s.deltaVelocity,absoluteVelocityAvailable:false,assumption:s.orientationOrigin?'session frame reconstructed from reported orientation':'fixed device orientation assumed',estimateClampMetresPerSecond:20,integratedSamples:s.integratedSamples,gaps:s.motionGaps},
 attenuation:{lambdaPerSecond:s.lambda,gain:s.gain,orientationOutputRadians:s.output,velocityOutputMetresPerSecond:s.attenuatedVelocity},infrared:s.infrared,geometry:geometry(s),liveGate:'CLOSED',receiptTrust:'UNVERIFIED'}));}
const api={IDS,PROFILES,EARTH_RADIUS,create,set,orientation,acceleration,calibrate,stopSensors,pulse,step,surface,geometry,frame,relativeVector};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ScandocSkylite=api;
})(typeof window!=='undefined'?window:globalThis);
