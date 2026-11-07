(function(root){'use strict';
const S=root.ScandocState,M=root.ScandocModel,$=id=>document.getElementById(id);
const kind=document.body.dataset.instrument,choices=kind==='seven'?M.STAGES:M.MODES,canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
let state=M.create(kind),contract=new S.SurfaceContract(),currentEvent=null,logical=0,frame=null,last=null,acc=0,selectedPointer=null,audio=null,audioRevision=0,linked=false;
const producer='instrument-'+kind+'-'+(root.crypto?.randomUUID?.()||String(Date.now()));
const bus=new S.StateBus(producer);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');state.reduced=reduced.matches;$('reduced').checked=state.reduced;
const descriptions={Tap:'Touch or press Pulse to reset the Sentinel anchor. This is local interaction, not engine ignition.',Surface:'Touch different sectors to add directional velocity. Watch displacement and damping. Explicit hardening freezes the actual current curve.',Gain:'Touch a radial sector to redistribute simulated energy. Balance the six channel lengths.',Habitat:'Touch to move the horizon; the stage action nudges the three orbital phases.',Engine:'Touch to move the vortex centre. The action changes field distortion; watch particle velocity and accumulated drift.',Business:'Touch across the field to connect or disconnect six edges. Pulse advances the read-only stream one edge; it does not commit anything.',Sphere:'Touch or use the recovery action to converge the particle field. Rotation and energy change the view and recovery response.',Tentacles:'Eight labelled simulated or app-supplied vector traces. Drag rotates; complexity controls mesh density, not event identity.','Velocity Splat':'Touch for a local directional velocity splat; Pulse applies a signed pair. Velocity decays, moves the field and bounces at bounds.',Orrery:'Earth is the spherical reference. This is a simulated orrery, not measured astronomical motion.',Cube:'Six spatial faces; two time-axis arms remain postlaunch, never additional launch faces. Drag to rotate.','Drift / Flow':'Touch moves the flow centre; drag rotates the local field. Drift length integrates simulated particle speed.','Time Axis':'Scrub only recorded past samples. Missing history is unavailable, never generated. Pulse cannot create future observations.','Unified View':'A shared spatial view of sphere, cube, tentacles and drift. Individual applications remain independently accessible.'};
for(const [index,name] of choices.entries()){const button=document.createElement('button');button.textContent=name;button.dataset.choice=index;button.onclick=()=>{M.select(state,index);render();};$('choices').append(button);}
for(const app of S.APPS){const option=document.createElement('option');option.value=app;option.textContent=app;$('target').append(option);}
for(const leg of S.LEGS){const option=document.createElement('option');option.value=leg;option.textContent=leg;$('leg').append(option);}
function message(value){$('feedback').textContent=value;}
function sync(){for(const key of ['energy','speed','complexity','distortion'])$(key).value=state[key];$('reduced').checked=state.reduced;$('automatic').checked=state.auto;}
function size(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);}
function render(drawFrame=true){
 const name=choices[state.index];$('instructions').textContent=descriptions[name];
 $('choices').querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===state.index)));
 $('metrics').textContent=`${name} · tick ${state.tick} · simulated time ${state.time.toFixed(1)} s · interaction score ${Math.floor(state.score)} · drift length ${state.driftLength.toFixed(3)} · pulses ${state.pulses}`;
 $('state').textContent=JSON.stringify(state,null,2);
 const snapshot=contract.snapshot();$('contract').textContent=JSON.stringify(snapshot,null,2);$('contract-status').textContent=`${snapshot.phase} · ${snapshot.commitments.length}/6 local commitments · engine CLOSED · centre remains unwritten`;
 $('begin').disabled=contract.phase!=='CONCEPTUAL';$('record').disabled=contract.phase!=='GATE_FORMING';$('harden').disabled=contract.phase!=='GATE_FORMING'||!currentEvent;$('validate').disabled=contract.phase!=='GATE_FORMING'||snapshot.commitments.length!==6;$('activate').disabled=contract.phase!=='VALIDATED';
 $('scrub').max=Math.max(0,state.history.length-1);$('scrub').value=state.scrub;
 $('app-state').textContent=JSON.stringify(bus.snapshot(),null,2);
 if(ctx&&drawFrame)root.ScandocRender.draw(ctx,state,canvas.clientWidth,canvas.clientHeight,bus.snapshot(),snapshot);else if(!ctx)message('Canvas unavailable: numerical controls remain usable.');
}
function advance(timestamp){
 if(state.paused)return;
 if(last!==null)acc+=Math.max(0,Math.min(.1,(timestamp-last)/1000));last=timestamp;
 const previousIndex=state.index;let count=0;while(acc>=1/60&&count++<6){M.step(state,1/60);acc-=1/60;}
 if(!state.reduced||state.index!==previousIndex)render();else if(state.tick%30===0)render(false);frame=requestAnimationFrame(advance);
}
function start(){if(!state.paused)return;state.paused=false;last=null;acc=0;frame=requestAnimationFrame(advance);$('run').textContent='Pause';message('Local simulation running.');render();}
let orientation=null,motionRevision=0;
function stopMotion(){motionRevision++;if(orientation)root.removeEventListener('deviceorientation',orientation);orientation=null;$('motion').textContent='Enable optional orientation';}
async function stopAudio(){audioRevision++;const previous=audio;audio=null;$('sound').textContent='Enable local sound';if(previous)try{await previous.stopAll();}catch{}}
function pause(){state.paused=true;if(frame!==null)cancelAnimationFrame(frame);frame=null;last=null;acc=0;selectedPointer=null;stopMotion();void stopAudio();if(linked){bus.disconnect();linked=false;$('connect').textContent='Enable local app link';$('link-status').textContent='Disconnected on stop; reconnect explicitly.';}$('run').textContent='Start';render();}
function action(){if(state.paused){message('Start before taking a stage action.');return;}M.pulse(state);message(state.lastAction);if(audio){const instance=audio,rev=audioRevision;void instance.toneBurst(180+state.index*45,.12).catch(()=>{if(audio===instance&&audioRevision===rev)void stopAudio();});}render();}
$('run').onclick=()=>state.paused?start():pause();$('pulse').onclick=action;
$('reset').onclick=()=>{pause();contract.reset();state=M.create(kind);state.reduced=reduced.matches;currentEvent=null;sync();render();message('Session reset. Previous local commitments cleared; no engine state changed.');};
for(const key of ['energy','speed','complexity','distortion'])$(key).oninput=()=>{M.control(state,{[key]:Number($(key).value)});render();};
$('reduced').onchange=()=>{state.reduced=$('reduced').checked;render();};
reduced.addEventListener?.('change',()=>{state.reduced=reduced.matches;$('reduced').checked=state.reduced;render();});
$('automatic').onchange=()=>{state.auto=$('automatic').checked;state.selectionTime=state.time;};
$('scrub').oninput=()=>{state.scrub=Number($('scrub').value);render();};
function point(e,drag){const rect=canvas.getBoundingClientRect();M.touch(state,(e.clientX-rect.left)/rect.width*2-1,(e.clientY-rect.top)/rect.height*2-1,drag);message(state.lastAction);render();}
canvas.onpointerdown=e=>{if(state.paused||selectedPointer!==null||e.button!==0)return;selectedPointer=e.pointerId;canvas.focus();try{canvas.setPointerCapture(e.pointerId);}catch{selectedPointer=null;return;}point(e,false);};
canvas.onpointermove=e=>{if(e.pointerId===selectedPointer)point(e,true);};
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(e.pointerId===selectedPointer)selectedPointer=null;});
root.addEventListener('keydown',e=>{if(e.target.closest?.('input,select,button,a,textarea'))return;if(e.code==='Space'){e.preventDefault();if(!e.repeat)action();}else if(e.code.startsWith('Arrow')){e.preventDefault();M.control(state,{yaw:Math.max(-Math.PI,Math.min(Math.PI,state.yaw+(e.code==='ArrowLeft'?-.1:e.code==='ArrowRight'?.1:0))),tilt:Math.max(-Math.PI/2,Math.min(Math.PI/2,state.tilt+(e.code==='ArrowUp'?-.1:e.code==='ArrowDown'?.1:0)))});render();}});
$('fullscreen').onclick=async()=>{if(document.fullscreenElement){await document.exitFullscreen();return;}if($('field').requestFullscreen)try{await $('field').requestFullscreen();return;}catch{}$('field').classList.toggle('expanded');size();render();};
$('connect').onclick=()=>{if(linked){bus.disconnect();linked=false;}else linked=bus.connect();$('connect').textContent=linked?'Disconnect local app link':'Enable local app link';$('link-status').textContent=linked?'Local same-origin link enabled; no server transport.':'Local link unavailable or disconnected.';};
$('send').onclick=()=>{if(!linked){message('Enable the local app link first.');return;}try{const vector=root.TentacledGeometry.transformVector([1,0,0],{yaw:state.yaw,tilt:state.tilt});bus.publish($('target').value,'SIMULATED',vector,{energy:state.energy,speed:state.speed,complexity:state.complexity,distortion:state.distortion,yaw:state.yaw,tilt:state.tilt,paused:state.paused},++logical);message('Sent SIMULATED view controls, not a verified engine command.');}catch(error){message(error.message);}};
bus.subscribe(()=>render());
$('open-app').onclick=()=>{
 if(!linked){linked=bus.connect();$('connect').textContent=linked?'Disconnect local app link':'Enable local app link';}
 const iframe=$('app-frame');iframe.hidden=false;iframe.title='Existing '+$('target').value+' application with optional simulated adapter';
 iframe.onload=()=>iframe.contentWindow.postMessage({type:'scandoc:instrument-connect/1'},location.origin);
 iframe.src='/apps/'+$('target').value+'.html';
};

function contractAction(fn){return async()=>{try{await fn();message('Local representation operation completed; engine gate remains CLOSED.');}catch(error){message(error.message);}render();};}
$('begin').onclick=contractAction(()=>contract.begin());
$('record').onclick=contractAction(()=>{currentEvent=contract.event(M.geometry(state),++logical);});
$('harden').onclick=contractAction(async()=>{await contract.harden($('leg').value,currentEvent.id);state.hardCurve=[...state.field];currentEvent=null;});
$('validate').onclick=contractAction(()=>contract.validate());$('activate').onclick=contractAction(()=>contract.activate(true));
$('sound').onclick=async()=>{
 if(state.paused){message('Start before enabling audio.');return;}
 if(audio){await stopAudio();return;}const current=new root.TentacledAudio(),revision=++audioRevision;audio=current;
 try{await current.unlock();if(revision!==audioRevision||document.hidden){await current.stopAll();return;}current.setVolume(.15);$('sound').textContent='Stop local sound';await current.toneBurst(330,.12);}catch{if(audio===current)await stopAudio();$('optional-status').textContent='Sound unavailable; controls remain active.';}
};
$('motion').onclick=async()=>{
 if(state.paused){message('Start before enabling optional orientation.');return;}
 if(orientation){stopMotion();return;}stopMotion();const revision=motionRevision;
 try{if(!root.DeviceOrientationEvent)throw Error('unsupported');if(typeof root.DeviceOrientationEvent.requestPermission==='function'&&await root.DeviceOrientationEvent.requestPermission()!=='granted')throw Error('denied');
 if(revision!==motionRevision||document.hidden)return;
 orientation=e=>{if(Number.isFinite(e.gamma)&&Number.isFinite(e.beta)){M.control(state,{yaw:Math.max(-Math.PI,Math.min(Math.PI,e.gamma*Math.PI/180)),tilt:Math.max(-Math.PI/2,Math.min(Math.PI/2,e.beta*Math.PI/180))});render();}};root.addEventListener('deviceorientation',orientation);$('motion').textContent='Stop orientation';$('optional-status').textContent='Optional orientation enabled; manual controls remain available.';
 }catch(error){$('optional-status').textContent=`Motion ${error.message}; manual controls remain available.`;}
};
$('offline').onclick=async()=>{try{if(!root.isSecureContext||!navigator.serviceWorker)throw Error('secure HTTPS or localhost required');const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});const worker=registration.installing||registration.waiting||registration.active;if(worker&&worker.state!=='activated')await new Promise((resolve,reject)=>{const handler=()=>{if(worker.state==='activated'){worker.removeEventListener('statechange',handler);resolve();}else if(worker.state==='redundant'){worker.removeEventListener('statechange',handler);reject(Error('install failed'));}};worker.addEventListener('statechange',handler);handler();});$('optional-status').textContent='Offline instrument files ready on this device. Browser storage may be evicted.';}catch(error){$('optional-status').textContent=`Offline setup unavailable: ${error.message}`;}};
$('remove-offline').onclick=async()=>{try{const scope=new URL('./',location.href).href;const registration=await navigator.serviceWorker?.getRegistration(scope);if(registration?.scope===scope)await registration.unregister();for(const name of await caches.keys())if(name.startsWith('scandoc-instruments-'))await caches.delete(name);$('optional-status').textContent='Offline instrument cache removed.';}catch{$('optional-status').textContent='Offline removal blocked; clear browser site data.';}};
root.addEventListener('resize',()=>{size();render();});root.addEventListener('blur',()=>{selectedPointer=null;stopMotion();void stopAudio();});root.addEventListener('pagehide',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
size();sync();render();
})(window);
