import {ORIGIN,ROLES,NORMALS,PAIRS,FRAME,METRIC,canonical,copy,hash,keys,vector,number,identifier,finiteJSON,topology,validateCommand} from './schema.js';
import {geometricMedian,relativeTrajectory,oath} from './geometry.js';
export function initial(sessionId){
 identifier(sessionId);const declaration={schema:'scandoc-sentinel/1',session_id:sessionId,topology_hash:hash('topology',topology()),kind:'SIMULATION_DECLARATION',independently_verified:false};
 return {schema:'scandoc-mdl-state/1',session_id:sessionId,sentinel:{...declaration,id:hash('sentinel',declaration)},tick:0,time:0,phase:'CUBE_PREPARATION',paused:true,nativeGate:'CLOSED',origin:null,genesis:null,separationReceipt:null,temporalReceipt:null,
  cube:ROLES.slice(0,6).map((role,i)=>({id:i+1,role,phase:'UNINITIALISED',position:null,normal:NORMALS[i],geometry_hash:null,html_commitment:null})),
  tips:ROLES.map((role,i)=>({id:i+1,role,lineage_face:i<6?i+1:null,position:null,velocity:[0,0,0],input:null,input_class:'simulation',frame:i<6?FRAME:'TEMPORAL_DERIVED',metric:i<6?METRIC:null,loadState:'GEOMETRY_ONLY'})),
  center:[0,0,0],relative:{},history:[],missingHistory:0,diagnostics:{classification:'insufficient evidence',physical_invariance:'unknown'}};
}
function geometry(s){return {cube:s.cube.map(f=>({id:f.id,position:f.position,normal:f.normal,geometry_hash:f.geometry_hash})),genesis_id:s.genesis?.id||null,center:s.center,tips:s.tips.map(t=>({id:t.id,position:t.position,frame:t.frame,metric:t.metric}))};}
export const geometryHash=s=>hash('geometry',geometry(s));
export function validateState(s){
 finiteJSON(s);
 if(s.schema!=='scandoc-mdl-state/1'||s.nativeGate!=='CLOSED'||!Number.isSafeInteger(s.tick)||s.tick<0||typeof s.paused!=='boolean'||typeof s.time!=='number'||s.time<0||s.cube.length!==6||s.tips.length!==8)throw Error('Invalid state contract');
 if(s.cube.some((f,i)=>f.id!==i+1||f.role!==ROLES[i])||s.tips.some((t,i)=>t.id!==i+1||t.role!==ROLES[i]))throw Error('Role identity mismatch');
 const {id,...sentinel}=s.sentinel;if(id!==hash('sentinel',sentinel)||sentinel.session_id!==s.session_id||sentinel.topology_hash!==hash('topology',topology()))throw Error('Sentinel root mismatch');
 if(!s.genesis&&(s.origin!==null||s.phase!=='CUBE_PREPARATION'||s.tips.some(t=>t.position!==null)))throw Error('Unqualified origin or premature temporal/spatial state');
 if(s.genesis&&(canonical(s.origin)!==canonical(ORIGIN)||s.phase!=='SPHERE_ACTIVE'))throw Error('Invalid fired origin');
 checkGenesis(s);
}
function checkGenesis(s){
 if(!s.genesis)return;
 const {id,...root}=s.genesis;
 if(root.sentinel_id!==s.sentinel.id||root.authority!=='SIMULATION_ONLY'||id!==hash('genesis',root)||canonical(root.faces)!==canonical(s.cube))throw Error('Immutable genesis mismatch');
 if(canonical(root.origin)!==canonical(ORIGIN)||s.cube.some(f=>f.phase!=='LOCKED'))throw Error('Genesis lock invalid');
}
function qualify(face){
 const normal=NORMALS[face.id-1];if(canonical(face.normal)!==canonical(normal))throw Error('Face normal violates fixed role');
 const p=vector(face.position,1.25),radius=p.reduce((v,x,i)=>v+x*normal[i],0);
 if(radius<.75||radius>1.25||p.some((x,i)=>Math.abs(x-normal[i]*radius)>1e-8))throw Error('Face geometry violates axis constraints');
}
function control(tip,payload,state){
 switch(tip){
 case 1:keys(payload,['pulse','orientation']);number(payload.pulse,0,1);vector(payload.orientation,1);break;
 case 2:keys(payload,['splat','tension']);number(payload.splat,-1,1);number(payload.tension,0,1);break;
 case 3:keys(payload,['gain','phase']);number(payload.gain,0,2);number(payload.phase,-Math.PI,Math.PI);break;
 case 4:keys(payload,['horizon','disturbance']);number(payload.horizon,-.5,.5);number(payload.disturbance,-.25,.25);break;
 case 5:keys(payload,['load','filter']);if(!['IDLE','BUSY','SATURATED','FAULT'].includes(payload.load))throw Error('Invalid categorical load');number(payload.filter,0,1);break;
 case 6:keys(payload,['capacity','route']);number(payload.capacity,1,10);if(!Number.isInteger(payload.route)||payload.route<0||payload.route>3)throw Error('Invalid route');break;
 case 7:keys(payload,['recorded_tick']);if(!Number.isSafeInteger(payload.recorded_tick)||payload.recorded_tick>state.tick||!state.history.some(h=>h.tick===payload.recorded_tick))throw Error('Recorded history unavailable; future frames forbidden');break;
 case 8:keys(payload,['decomposition']);number(payload.decomposition,0,1);break;
 default:throw Error('Unknown input role');
 }
 return copy(payload);
}
function evolve(s,dt){
 if(!s.genesis||s.paused)throw Error('Sphere must be fired and resumed before stepping');
 const old=s.tips.map(t=>t.position?copy(t.position):null),prior=copy(s.relative);s.time+=dt;
 for(let i=0;i<6;i++){
  const tip=s.tips[i],u=tip.input||{},n=NORMALS[i];let force=[0,0,0],damping=1.5;
  switch(i){
  case 0:force=(u.orientation||[0,0,0]).map((v,k)=>v*(u.pulse||0)*(n[k]?0:1));break;
  case 1:force=n.map(v=>v*(u.splat||0));damping=2+4*(u.tension??.6);break;
  case 2:force=[0,(u.gain??1)*Math.sin(u.phase||0)*.2,0];break;
  case 3:force=[u.disturbance||0,u.horizon||0,0];break;
  case 4:force=[u.load==='FAULT'?0:.1*(1-(u.filter??.5)),0,0];damping=u.load==='FAULT'?8:2;break;
  case 5:force=[0,((u.capacity||1)-1)*.01,(u.route||0)*.02];break;
  }
  tip.velocity=tip.velocity.map((v,k)=>(v+force[k]*dt)*Math.exp(-damping*dt));tip.position=tip.position.map((v,k)=>v+tip.velocity[k]*dt);
  if(Math.hypot(...tip.position)>2)throw Error('Constraint violation: tip exceeds simulation radius');
  if(i===0&&tip.input)tip.input.pulse*=Math.exp(-2*dt);
  if(i===1&&tip.input)tip.input.splat*=Math.exp(-2*dt);
 }
 const coupled=geometricMedian(s.tips.slice(0,6).map(t=>({position:t.position,weight:1,frame:t.frame,metric:t.metric,loadState:t.loadState})));
 if(!coupled.converged)throw Error('Geometric coupling did not converge within bounded iterations');s.center=coupled.point;
 const selected=s.tips[6].input?.recorded_tick,recorded=selected===undefined?s.history[0]:s.history.find(h=>h.tick===selected);
 s.tips[6].position=recorded?copy(recorded.center):null;s.tips[6].velocity=[0,0,0];
 const amount=s.tips[7].input?.decomposition||0;s.tips[7].position=s.center.map((v,k)=>v+(s.tips[1].position[k]-s.center[k])*(1-amount));
 s.relative=relativeTrajectory(s.tips.map((t,i)=>i<6?t.position:null),old.map((p,i)=>i<6?p:null),prior,dt);
 const maxSpeed=Math.max(...s.tips.slice(0,6).map(t=>Math.hypot(...t.velocity)));
 s.diagnostics={history_status:recorded?'RECORDED':'UNAVAILABLE',relative_members:[1,2,3,4,5,6],classification:s.tips.some(t=>t.input!==null)?'permitted adaptation':'insufficient evidence',coupling:{method:'MODIFIED_WEISZFELD',metric:METRIC,members:[1,2,3,4,5,6],iterations:coupled.iterations},drift:copy(s.center),drift_magnitude:Math.hypot(...s.center),risk:maxSpeed>.5?'SIMULATED_APPROACH_TO_BOUNDARY':'NO_NUMERIC_TREND_FLAG',prediction_is_observation:false,engine_load:s.tips[4].input?.load||'IDLE',physical_invariance:'unknown'};
 s.history.push({tick:s.tick,center:copy(s.center)});if(s.history.length>256){s.history.splice(1,1);s.missingHistory++;}
}
export function transition(state,raw){
 const c=validateCommand(raw);validateState(state);if(c.expected_tick!==state.tick)throw Error('Stale logical tick');
 const s=copy(state),before=geometry(state);s.tick++;const tip=c.source_tentacle;
 if(c.event_type.startsWith('FACE_')){
  if(s.genesis||tip<1||tip>6)throw Error('Six launch faces only; genesis is locked');const face=s.cube[tip-1];
  if(c.event_type==='FACE_ACTIVATE'){
   if(face.phase!=='UNINITIALISED')throw Error('Invalid face transition');keys(c.payload,['position','normal']);face.position=vector(c.payload.position,1.25);face.normal=vector(c.payload.normal,1);qualify(face);face.phase='ACTIVE';
  }else{
   keys(c.payload,[]);
   if(c.event_type==='FACE_QUALIFY'){if(face.phase!=='ACTIVE')throw Error('ACTIVE face required');qualify(face);face.phase='QUALIFIED';}
   else{if(face.phase!=='QUALIFIED')throw Error('QUALIFIED face required');qualify(face);face.phase='COMMITTED';face.geometry_hash=hash('cube-face',{role:face.role,position:face.position,normal:face.normal});}
  }
 }else if(c.event_type==='SIMULATION_FIRE'){
  keys(c.payload,[]);if(tip!==0||s.genesis||s.cube.some(f=>f.phase!=='COMMITTED')||new Set(s.cube.map(f=>f.geometry_hash)).size!==6)throw Error('Exactly six unique committed faces required');
  for(const f of s.cube)qualify(f);
  for(const [a,b]of PAIRS)if(s.cube[a-1].position.some((v,k)=>Math.abs(v+s.cube[b-1].position[k])>1e-8))throw Error('Opposing pair is incompatible');
  s.cube.forEach(f=>f.phase='LOCKED');s.origin=copy(ORIGIN);
  const root={schema:'scandoc-simulation-genesis/1',sentinel_id:s.sentinel.id,origin:copy(ORIGIN),faces:copy(s.cube),logical_tick:s.tick,authority:'SIMULATION_ONLY'};
  s.genesis={...root,id:hash('genesis',root)};s.phase='SPHERE_ACTIVE';s.center=[0,0,0];s.history=[{tick:s.tick,center:[0,0,0]}];
  s.tips.forEach((t,i)=>{t.position=i<6?copy(s.cube[i].position):[0,0,0];});
 }else if(c.event_type==='DECLARED_INPUT'){
  if(!s.genesis||tip<1)throw Error('Sphere input requires locked simulation genesis');s.tips[tip-1].input=control(tip,c.payload,s);
 }else if(c.event_type==='STEP'){
  if(tip!==0)throw Error('Source clock owns simulation stepping');keys(c.payload,['dt']);number(c.payload.dt,1e-6,.1);evolve(s,c.payload.dt);
 }else{
  keys(c.payload,[]);if(tip!==0||!s.genesis)throw Error('Session source operation requires genesis');s.paused=c.event_type==='PAUSE';
 }
 validateState(s);
 const event={schema:'scandoc-event/1',event_id:c.event_id,genesis_id:s.genesis?.id||null,logical_tick:s.tick,source_tentacle:tip,event_type:c.event_type,input_class:'simulation',geometry_before:before,geometry_after:geometry(s),relative_trajectory:copy(s.relative),geometry_hash:geometryHash(s),temporal_receipt:null,verification_state:'unknown',gate:'CLOSED',receipt_kind:'SIMULATION_HASH_CHAIN',previous_receipt:state.temporalReceipt};
 const {temporal_receipt,...record}=event;event.temporal_receipt=hash('temporal-receipt',{record,command:c});s.temporalReceipt=event.temporal_receipt;if(c.event_type==='SIMULATION_FIRE')s.separationReceipt=event.temporal_receipt;
 return {state:s,event};
}
export {oath};
