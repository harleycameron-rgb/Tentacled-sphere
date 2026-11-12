// Reuses octopus/src/games/{surface,common}.js from the existing MDL development worktree.
(function(root){'use strict';
const S=root.ScandocState||(typeof require==='function'?require('./state.js'):null);
const C=root.ScandocControls||(typeof require==='function'?require('./control-adapter.js'):null);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const TAU=Math.PI*2;
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
function base(game,level=1,seed=1,challenge=false){
  if(!Number.isInteger(level)||level<1||level>3||!Number.isSafeInteger(seed)||seed<0)throw Error('Invalid level/seed');
  return {schema:1,game,level,seed,challenge,tick:0,time:0,status:'active',reason:'',score:0,hold:0,events:[],difficulty:challenge?3.5+(seed%5)*.15:level};
}
function event(s,type,detail){s.events.push({tick:s.tick,type,detail});if(s.events.length>400)s.events.shift();}
function finish(s,status,reason){if(s.status!=='active')return;s.status=status;s.reason=reason;event(s,status,reason);}
function stable(s,dt,condition,duration){s.hold=condition?s.hold+dt:0;if(s.hold>=duration)finish(s,'won','Stable objective sustained');}
function finiteTree(value){if(typeof value==='number'&&!Number.isFinite(value))throw Error('Nonfinite state or input');if(value&&typeof value==='object')for(const v of Object.values(value))finiteTree(v);}
const slider=(key,label,min,max,value,step=.01)=>({key,label,min,max,value,step});
const button=(key,label)=>({key,label});
function clock(s,dt,limit){s.tick++;s.time+=dt;if(s.time>limit)finish(s,'failed','Time limit reached; restart this level to recover');}
const meta={id:'surface',title:'SURFACE · Velocity sculptor',subtitle:'Convex sphere · numerical displacement field',
 tutorial:'Rotate to select one of six surface sectors. Blue is the current surface, amber the target. Outward/inward splats add signed velocity, not instant target snaps. Tension damps and diffuses the field; wait for motion to settle. Double splat costs twice the impulse. Obstacles at sectors 2 and 5 bounce large deformations. Recover brakes the whole field at an energy cost. Match the entire residual profile and hold still.',
 controls:[slider('sector','Surface rotation / sector',0,5,0,1),slider('strength','Impulse magnitude',.1,1,.4),slider('tension','Tension / damping',0,1,.6)],actions:[button('out','Outward splat'),button('in','Inward splat'),button('double','Double outward splat'),button('recover','Recovery brake')],
 objective:s=>`RMS residual <${(.04+.025/s.difficulty).toFixed(3)} and speed <0.06 for ${(1+s.difficulty*.5).toFixed(1)} s. Budget ${s.budget.toFixed(1)}.`,
 metrics:s=>`Residual ${s.residual.toFixed(3)} · velocity ${s.speed.toFixed(3)} · drift integral ${s.driftLength.toFixed(3)} · collisions ${s.collisions} · splats ${s.splats}`};
function create(level,seed,challenge){const s=base('surface',level,seed,challenge);return {...s,u:Array(6).fill(0),v:Array(6).fill(0),target:Array.from({length:6},(_,i)=>.16*Math.cos(i*TAU/6+(seed%3)*.3)),budget:35-3*s.difficulty,residual:.113,speed:0,driftLength:0,collisions:0,splats:0};}
function update(s,dt,c,actions){
 for(const a of actions){
  const count=a==='double'?2:1,cost=a==='recover'?1:(c.strength+.1)*count;
  if(s.budget<cost){s.reason='Impulse budget too low; residual must settle or restart';continue;}
  s.budget-=cost;
  if(a==='recover'){s.v=s.v.map(v=>v*.15);event(s,'brake',s.budget);continue;}
  for(let j=0;j<count;j++){s.v[c.sector]+=(a==='in'?-1:1)*c.strength*.32;s.splats++;}
  event(s,'splat',{sector:c.sector,direction:a==='in'?-1:1,strength:c.strength,count});
 }
 const old=[...s.v],lambda=2+4*c.tension;
 for(let i=0;i<6;i++){
  s.v[i]=(s.v[i]+(old[(i+1)%6]+old[(i+5)%6]-2*old[i])*.3*c.tension*dt)*Math.exp(-lambda*dt);
  s.u[i]+=s.v[i]*dt;
  const bound=i===2||i===5?.32:.6;
  if(Math.abs(s.u[i])>bound){s.u[i]=clamp(s.u[i],-bound,bound);s.v[i]*=-.4;s.collisions++;}
 }
 s.residual=Math.hypot(...s.u.map((u,i)=>u-s.target[i]))/Math.sqrt(6);s.speed=Math.hypot(...s.v);
 s.driftLength+=s.speed*dt;s.score=Math.max(s.score,Math.max(0,1-s.residual/.2)*1000+s.budget*5);
 stable(s,dt,s.residual<.04+.025/s.difficulty&&s.speed<.06,1+s.difficulty*.5);
 clock(s,dt,65);if(s.budget<.2&&s.residual>.1&&s.speed<.01)s.status==='active'&&(s.reason='Budget exhausted; restart to try a different impulse plan');
}

function controls(values){
 const out={sector:0,strength:.4,tension:.6,...values};
 if(Object.keys(out).some(k=>!['sector','strength','tension'].includes(k))||!Number.isInteger(out.sector)||out.sector<0||out.sector>5||!Number.isFinite(out.strength)||out.strength<.1||out.strength>1||!Number.isFinite(out.tension)||out.tension<0||out.tension>1)throw Error('Invalid Surface control');return out;
}
function validate(s){finiteTree(s);if(!s||s.game!=='surface'||s.schema!==1||!Number.isSafeInteger(s.tick)||s.tick<0||!['active','won','failed'].includes(s.status)||!['u','v','target'].every(k=>Array.isArray(s[k])&&s[k].length===6&&s[k].every(Number.isFinite))||!Array.isArray(s.events)||s.events.length>400||!Number.isFinite(s.budget)||s.budget<0||!Number.isFinite(s.score)||s.score<0)throw Error('Invalid Surface state');const shape=create(s.level,s.seed,s.challenge);for(const [key,value] of Object.entries(shape))if(!(key in s)||typeof s[key]!==typeof value)throw Error('Corrupt Surface field '+key);if(typeof s.challenge!=='boolean'||s.difficulty!==shape.difficulty||s.time<0||s.hold<0||s.residual<0||s.speed<0)throw Error('Invalid Surface scalar');}
class Game{
 constructor(level=1,seed=1,challenge=false){this.state=create(level,seed,challenge);this.controls=controls({});}
 set(values){this.controls=controls({...this.controls,...values});}
 step(dt,values={},actions=[]){if(!Number.isFinite(dt)||dt<=0||dt>.05||!Array.isArray(actions)||actions.length>4||actions.some(a=>!meta.actions.some(d=>d.key===a)))throw Error('Invalid Surface step');this.set(values);if(this.state.status!=='active')return this.state;validate(this.state);const next=S.clone(this.state);update(next,dt,this.controls,actions);validate(next);this.state=next;return this.state;}
 snapshot(){return S.freeze(S.clone({schema:'scandoc-surface-game/1',state:this.state,controls:this.controls,liveGate:'CLOSED',sphereWrites:false}));}
 static restore(value){if(value?.schema!=='scandoc-surface-game/1'||value.liveGate!=='CLOSED'||value.sphereWrites!==false)throw Error('Invalid Surface save');validate(value.state);const g=new Game(value.state.level,value.state.seed,value.state.challenge);g.state=S.clone(value.state);g.controls=controls(value.controls);return g;}
}
class Coupler{
 constructor(){this.enabled=false;this.frame=null;this.age=0;this.cooldown=0;this.last=new Map();this.applied=0;this.reason='Disconnected';}
 receive(snapshot){if(!snapshot?.trajectory){this.frame=null;this.reason='Source idle';return;}const f=C.validate(snapshot.trajectory),head=this.last.get(f.producer);if(head&&f.sequence<=head)throw Error('Stale gameplay coupling');this.last.set(f.producer,f.sequence);this.frame=S.freeze(f);this.age=0;this.reason=f.controls.paused?'Source paused':'Receiving simulated sphere pose';}
 disconnect(){this.enabled=false;this.frame=null;this.cooldown=0;this.reason='Disconnected; manual controls retained';}
 step(game,dt,allowImpulse=true){if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('Invalid coupling step');this.age+=dt;this.cooldown=Math.max(0,this.cooldown-dt);const f=this.frame;if(!allowImpulse||!this.enabled||!f||f.type==='RESET'||f.controls.paused||this.age>.5){if(this.age>.5&&f)this.reason='Trajectory stale; manual fallback';return false;}const yaw=f.position[0],angular=f.velocity[1],energy=f.controls.energy??.5;const sector=((Math.round(yaw/(Math.PI*2)*6)%6)+6)%6;
 // A signed beta angular velocity controls impulse, yaw selects a sector; no inferred linear/physical force.
 if(Math.abs(angular)<.15||this.cooldown>0)return false;const strength=clamp(Math.abs(angular)*.15*(.5+energy),.1,1),cost=strength+.1;if(game.state.budget<cost||game.state.status!=='active'){this.reason='No available impulse budget or game ended';return false;}
 game.set({sector,strength});this.cooldown=.25;this.applied++;this.reason='Bounded simulated trajectory splat';return angular>0?'out':'in';}
 snapshot(){return S.freeze(S.clone({enabled:this.enabled,applied:this.applied,reason:this.reason,eventId:this.frame?.eventId||null,topology_hash:this.frame?.sentinel_firing.topology_hash||null,kind:'SIMULATED_GAMEPLAY_COUPLING',engineVerified:false,liveGate:'CLOSED'}));}
}
const api={meta,Game,Coupler,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ScandocSurfaceGame=api;
})(typeof window!=='undefined'?window:globalThis);
