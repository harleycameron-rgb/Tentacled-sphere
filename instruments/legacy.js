(function(root){'use strict';
const S=root.ScandocState,id=document.body.dataset.app;if(!S.APPS.includes(id))return;
const bus=new S.StateBus('legacy-'+id+'-'+(root.crypto?.randomUUID?.()||String(Date.now())));
let tick=0,linked=false,vector=null,kind='API_GEOMETRY_UNVERIFIED';
const panel=document.createElement('section');panel.className='card legacy-instrument-panel';panel.setAttribute('aria-label','Local instrument adapter');
const title=document.createElement('h2');title.textContent='Optional local instrument link';
const note=document.createElement('p');note.textContent='Cockpit controls affect this separate simulated preview only. Existing geometry, sensors, acknowledgements and engine gates are unchanged.';
const button=document.createElement('button');button.id='instrument-link';button.textContent='Connect local cockpit';
const output=document.createElement('p');output.id='instrument-link-status';output.setAttribute('role','status');output.textContent='Disconnected; accepted API geometry not yet available.';
const preview=document.createElement('canvas');preview.width=300;preview.height=160;preview.style.cssText='max-width:100%;height:160px';preview.setAttribute('aria-label','Separate simulated cockpit view');
const details=document.createElement('output');details.id='instrument-preview-state';details.style.display='block';
const skylite=document.createElement('a');skylite.href='/instruments/skylite.html?app='+id;skylite.textContent='Open adaptive Skylite for '+id;skylite.style.display='block';
panel.append(title,note,skylite,button,output,preview,details);document.querySelector('main').append(panel);
function draw(v,settings,source){
 details.textContent=JSON.stringify({kind:source,vector:v,controls:settings,liveGate:'CLOSED',sphereWrites:false});
 const ctx=preview.getContext('2d');if(!ctx)return;ctx.fillStyle='#071323';ctx.fillRect(0,0,300,160);ctx.strokeStyle='#5cdeed';ctx.beginPath();ctx.arc(150,80,58,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#ffc078';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(150,80);ctx.lineTo(150+v[0]*60,80-v[1]*60);ctx.stroke();
}
function publish(){if(linked&&vector)bus.publish(id,kind,vector,{},++tick);}
root.addEventListener('scandoc:app-state',e=>{const data=e.detail;if(data?.appId!==id)return;try{vector=root.TentacledGeometry.normalize(data.vector);kind=data.kind==='SIMULATED'?'SIMULATED':'API_GEOMETRY_UNVERIFIED';output.textContent=linked?'Local link connected; accepted app geometry available.':'Accepted app geometry available; link remains opt-in.';publish();}catch{}});
bus.subscribe(states=>{const incoming=states[id];if(!linked||!incoming||incoming.producer===bus.producer)return;const base=vector||[1,0,0];const settings=incoming.controls;const simulated=root.TentacledGeometry.transformVector(base,settings);draw(simulated,settings,'SIMULATED');output.textContent='SIMULATED cockpit controls received; original arm is unchanged.';bus.publish(id,'SIMULATED',simulated,settings,++tick);});
button.onclick=()=>{if(linked){bus.disconnect();linked=false;}else linked=bus.connect();button.textContent=linked?'Disconnect cockpit':'Connect local cockpit';output.textContent=linked?'Local link connected. Engine gate CLOSED.':'Disconnected or BroadcastChannel unsupported.';publish();};
root.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===root.parent&&event.data?.type==='scandoc:instrument-connect/1'&&!linked)button.onclick();});
function stop(){bus.disconnect();linked=false;button.textContent='Connect local cockpit';output.textContent='Stopped; reconnect explicitly to receive cockpit state.';}
root.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})(window);
