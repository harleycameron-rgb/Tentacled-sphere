(function(root){'use strict';
const S=root.ScandocState,id=document.body.dataset.app;if(!S.APPS.includes(id))return;
const bus=new S.StateBus('legacy-'+id+'-'+(root.crypto?.randomUUID?.()||String(Date.now())));
const shared=new root.ScandocControls.Adapter(id,bus.producer);
let expression=root.ScandocSkylite.create(id),expressionEvent=null;
let tick=0,linked=false,vector=null,kind='API_GEOMETRY_UNVERIFIED';
const panel=document.createElement('section');panel.className='card legacy-instrument-panel';panel.setAttribute('aria-label','Local instrument adapter');
const title=document.createElement('h2');title.textContent='Optional local instrument link';
const note=document.createElement('p');note.textContent='One shared control adapter receives explicit simulated firing and subsequent sphere trajectory; this app expresses it through its own geometry. Existing geometry, sensors, acknowledgements and engine gates are unchanged.';
const button=document.createElement('button');button.id='instrument-link';button.textContent='Connect local cockpit';
const output=document.createElement('p');output.id='instrument-link-status';output.setAttribute('role','status');output.textContent='Disconnected; accepted API geometry not yet available.';
const preview=document.createElement('canvas');preview.width=300;preview.height=160;preview.style.cssText='max-width:100%;height:160px';preview.setAttribute('aria-label','Separate simulated cockpit view');
const details=document.createElement('output');details.id='instrument-preview-state';details.style.display='block';
const skylite=document.createElement('a');skylite.href='/instruments/skylite.html?app='+id;skylite.textContent='Open adaptive Skylite for '+id;skylite.style.display='block';
const identity=document.createElement('p');identity.id='instrument-topology';identity.textContent='Eight-arm topology SHA-256 '+root.ScandocControls.TOPOLOGY_HASH+' · representation only · six launch legs + two postlaunch arms';
if(id==='surface'){const play=document.createElement('a');play.href='/instruments/surface-game.html';play.textContent='Play Surface with numerical sphere coupling';panel.append(play);}
panel.append(title,note,identity,skylite,button,output,preview,details);details.textContent=JSON.stringify(shared.snapshot());document.querySelector('main').append(panel);
function draw(v,settings,source){
 details.textContent=JSON.stringify({kind:source,vector:v,controls:settings,liveGate:'CLOSED',sphereWrites:false});
 const ctx=preview.getContext('2d');if(!ctx)return;ctx.fillStyle='#071323';ctx.fillRect(0,0,300,160);ctx.strokeStyle='#5cdeed';ctx.beginPath();ctx.arc(150,80,58,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#ffc078';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(150,80);ctx.lineTo(150+v[0]*60,80-v[1]*60);ctx.stroke();
}
function publish(){if(linked&&vector)bus.publish(id,kind,vector,{},++tick);}
root.addEventListener('scandoc:app-state',e=>{const data=e.detail;if(data?.appId!==id)return;try{vector=root.TentacledGeometry.normalize(data.vector);kind=data.kind==='SIMULATED'?'SIMULATED':'API_GEOMETRY_UNVERIFIED';output.textContent=linked?'Local link connected; accepted app geometry available.':'Accepted app geometry available; link remains opt-in.';publish();}catch{}});
bus.subscribe(states=>{const incoming=states[id];if(!linked||!incoming||incoming.producer===bus.producer||shared.snapshot().phase==='RECEPTIVE')return;const base=vector||[1,0,0];const settings=incoming.controls;const simulated=root.TentacledGeometry.transformVector(base,settings);draw(simulated,settings,'SIMULATED');output.textContent='SIMULATED cockpit controls received; original arm is unchanged.';bus.publish(id,'SIMULATED',simulated,settings,++tick);});
shared.subscribe(snapshot=>{
 const frame=snapshot.trajectory;
 details.textContent=JSON.stringify(snapshot);
 if(!frame){expression=root.ScandocSkylite.create(id);expressionEvent=null;output.textContent='Shared adapter idle; explicit simulated firing required.';return;}
 const K=root.ScandocSkylite,state=expression;state.energy=frame.controls.energy??.5;state.output=[...frame.position];state.paused=frame.controls.paused===true;state.manual=[...frame.position];K.step(state,1/60);if(expressionEvent!==frame.eventId){expressionEvent=frame.eventId;state.events.push(S.freeze({id:frame.eventId,app:id,tick:frame.sentinel_firing.tick,kind:'RECEIVED_LOCAL_SIMULATED_FIRING',engineVerified:false}));}
 // The same control frame drives each existing app's own declared geometry adapter.
 const geometry=K.geometry(state),ctx=preview.getContext('2d');
 if(ctx){ctx.fillStyle='#071323';ctx.fillRect(0,0,300,160);ctx.strokeStyle='#5cdeed';ctx.beginPath();geometry.points.forEach((point,i)=>{const v=K.relativeVector(point,frame.position,[0,0,0]),x=150+v[0]*65,y=80+v[1]*55-v[2]*12;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}
 output.textContent=snapshot.phase+' · shared simulated sphere trajectory · '+id+' expression · engine CLOSED';
 root.dispatchEvent(new CustomEvent('scandoc:trajectory-expression/1',{detail:snapshot}));
});
button.onclick=()=>{if(linked){shared.disconnect(true);bus.disconnect();linked=false;}else{linked=bus.connect();if(linked)shared.connect();}button.textContent=linked?'Disconnect cockpit':'Connect local cockpit';output.textContent=linked?'Local link connected. Engine gate CLOSED.':'Disconnected or BroadcastChannel unsupported.';publish();};
root.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===root.parent&&event.data?.type==='scandoc:instrument-connect/1'&&!linked)button.onclick();});
function stop(){shared.disconnect(true);bus.disconnect();linked=false;button.textContent='Connect local cockpit';output.textContent='Stopped; reconnect explicitly to receive cockpit state.';}
root.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})(window);
