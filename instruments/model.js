(function(root){'use strict';
const S=root.ScandocState||(typeof require==='function'?require('./state.js'):null);
const STAGES=Object.freeze(['Tap','Surface','Gain','Habitat','Engine','Business','Sphere']);
const MODES=Object.freeze(['Sphere','Tentacles','Velocity Splat','Orrery','Cube','Drift / Flow','Time Axis','Unified View']);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const TAU=Math.PI*2;
function create(instrument='seven'){
 if(!['seven','octopus'].includes(instrument))throw Error('Unknown instrument');
 return {instrument,index:0,tick:0,time:0,selectionTime:0,energy:.5,speed:.5,complexity:.5,distortion:.3,yaw:0,tilt:0,paused:true,reduced:false,auto:false,pulses:0,score:0,
  field:Array(24).fill(0),velocity:Array(24).fill(0),gains:Array(6).fill(.5),orbit:[0,2,4],horizon:[0,0],edges:Array(6).fill(false),readHead:0,
  particles:Array.from({length:24},(_,i)=>({x:Math.cos(i*TAU/24)*.75,y:Math.sin(i*TAU/24)*.75,vx:0,vy:0})),
  history:[],historyStart:0,scrub:0,driftLength:0,lastAction:'Ready',hardCurve:null};
}
function validate(s){
 S.clone(s);if(!['seven','octopus'].includes(s.instrument)||!Number.isInteger(s.index)||s.index<0||s.index>=(s.instrument==='seven'?7:8)||!Number.isSafeInteger(s.tick)||s.tick<0||s.tick>=Number.MAX_SAFE_INTEGER)throw Error('Invalid state');
 if(!Array.isArray(s.field)||s.field.length!==24||s.velocity.length!==24||s.gains.length!==6||s.edges.length!==6)throw Error('Invalid model arrays');
 S.controls({energy:s.energy,speed:s.speed,complexity:s.complexity,distortion:s.distortion,yaw:s.yaw,tilt:s.tilt,paused:s.paused});
}
function select(s,index){if(!Number.isInteger(index)||index<0||index>=(s.instrument==='seven'?7:8))throw Error('Unknown selection');s.index=index;s.selectionTime=s.time;s.lastAction='Selected '+(s.instrument==='seven'?STAGES:MODES)[index];}
function control(s,values){const checked=S.controls(values);Object.assign(s,checked);validate(s);}
function touch(s,x,y,drag=false){
 if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Nonfinite touch');x=clamp(x,-1,1);y=clamp(y,-1,1);
 const name=(s.instrument==='seven'?STAGES:MODES)[s.index];
 if(drag&&s.instrument==='octopus'){s.yaw=clamp(x*Math.PI,-Math.PI,Math.PI);s.tilt=clamp(-y*Math.PI/2,-Math.PI/2,Math.PI/2);return;}
 const sector=Math.min(23,Math.floor((Math.atan2(y,x)+Math.PI)/TAU*24));
 if(name==='Surface'||name==='Velocity Splat'){s.velocity[sector]+=(1+s.energy)*.7;s.lastAction='Directional local splat at sector '+sector;}
 else if(name==='Gain'){const i=Math.min(5,Math.floor((x+1)*3));s.gains[i]=clamp(s.gains[i]+.15,0,1);s.gains[(i+3)%6]=clamp(s.gains[(i+3)%6]-.1,0,1);s.lastAction='Redistributed simulated energy';}
 else if(name==='Habitat'){s.horizon=[x*.5,y*.5];s.lastAction='Moved orbital environment';}
 else if(name==='Engine'||name==='Drift / Flow'){s.horizon=[x*.6,y*.6];s.lastAction='Moved vortex centre';}
 else if(name==='Business'){const i=Math.min(5,Math.floor((x+1)*3));s.edges[i]=!s.edges[i];s.lastAction='Coupler '+i+(s.edges[i]?' connected':' disconnected');}
 else if(name==='Time Axis'){s.scrub=Math.round((x+1)/2*Math.max(0,s.history.length-1));s.lastAction='Read-only recorded state selected';}
 else if(name==='Sphere'){for(const p of s.particles){p.vx-=p.x*.3;p.vy-=p.y*.3;}s.lastAction='Convergence recovery impulse';}
 else{s.yaw=x*Math.PI;s.pulses++;s.lastAction='Local Sentinel pulse; no engine execution';}
}
function pulse(s){
 if(s.paused)return;
 s.pulses++;const name=(s.instrument==='seven'?STAGES:MODES)[s.index];
 if(name==='Tap'){s.field=s.field.map(()=>0);s.velocity=s.velocity.map(()=>0);s.horizon=[0,0];s.lastAction='Sentinel reset anchor';}
 else if(name==='Business'){s.readHead=(s.readHead+1)%6;s.lastAction=s.edges[s.readHead]?'Read-only stream crossed connected edge':'Read-only stream blocked at edge '+s.readHead;}
 else if(name==='Gain'){s.gains=s.gains.map(v=>v+(0.5-v)*.4);s.lastAction='Balanced simulated radial channels';}
 else if(name==='Habitat'){s.orbit=s.orbit.map((v,i)=>v+(i-1)*.1*s.energy);s.lastAction='Nudged orbital phase';}
 else if(name==='Engine'){s.distortion=clamp(s.distortion+.1,0,1);s.lastAction='Increased vortex coupling';}
 else if(name==='Sphere'){touch(s,0,0);}
 else if(name==='Time Axis'){s.lastAction='Time Axis is read-only; pulse does not invent history';}
 else{s.velocity[0]+=.8*(.5+s.energy);s.velocity[12]-=.8*(.5+s.energy);s.lastAction='Paired directional velocity splats';}
}
function step(s,dt){
 if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('Invalid simulation step');validate(s);if(s.paused)return s;
 s.tick++;s.time+=dt;
 for(let i=0;i<24;i++){
  s.velocity[i]*=Math.exp(-(1.5+s.distortion*3)*dt);s.field[i]+=s.velocity[i]*dt;
  if(Math.abs(s.field[i])>.6){s.field[i]=clamp(s.field[i],-.6,.6);s.velocity[i]*=-.35;}
  if(s.hardCurve){s.field[i]=s.hardCurve[i];s.velocity[i]=0;}
  const p=s.particles[i],dx=p.x-s.horizon[0],dy=p.y-s.horizon[1];
  p.vx+=(-dy*s.speed*.3-dx*.25)*dt;p.vy+=(dx*s.speed*.3-dy*.25)*dt;
  p.vx*=Math.exp(-1.2*dt);p.vy*=Math.exp(-1.2*dt);p.x=clamp(p.x+p.vx*dt,-1,1);p.y=clamp(p.y+p.vy*dt,-1,1);
  s.driftLength+=Math.hypot(p.vx,p.vy)*dt;
 }
 s.orbit=s.orbit.map((v,i)=>(v+dt*s.speed*(.3+i*.2))%TAU);
 const name=(s.instrument==='seven'?STAGES:MODES)[s.index];
 const residual=Math.hypot(...s.field)/Math.sqrt(24),balance=Math.max(...s.gains)-Math.min(...s.gains),coherence=s.particles.reduce((v,p)=>v+Math.hypot(p.x,p.y),0)/24;
 const success=name==='Surface'?residual<.08:name==='Gain'?balance<.1:name==='Business'?s.edges.every(Boolean):name==='Sphere'?coherence<.6:name==='Habitat'?Math.hypot(...s.horizon)<.5:name==='Engine'?s.distortion<.7:true;
 if(success)s.score+=dt*10;
 if(s.tick%30===0){s.history.push({tick:s.tick,time:s.time,index:s.index,energy:s.energy,yaw:s.yaw,driftLength:s.driftLength});if(s.history.length>300){s.history.shift();s.historyStart++;}s.scrub=Math.min(s.scrub,s.history.length-1);}
 if(s.auto&&s.time-s.selectionTime>=12)select(s,(s.index+1)%(s.instrument==='seven'?7:8));
 return s;
}
function geometry(s){return {frame:'local-unit-sphere',units:'dimensionless-simulation',points:s.field.map((u,i)=>[(1+u)*Math.cos(i*TAU/24),(1+u)*Math.sin(i*TAU/24),.01])};}
function recorded(s,index){if(!Number.isInteger(index)||index<0||index>=s.history.length)return null;return S.freeze(S.clone(s.history[index]));}
const api={STAGES,MODES,create,validate,select,control,touch,pulse,step,geometry,recorded};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ScandocModel=api;
})(typeof window!=='undefined'?window:globalThis);
