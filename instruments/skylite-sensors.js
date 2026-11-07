(function(root){'use strict';
class Sensors{
 constructor(target,onOrientation,onMotion,onStatus){this.target=target;this.onOrientation=onOrientation;this.onMotion=onMotion;this.onStatus=onStatus;this.generation=0;this.listeners=[];}
 async start(){
  this.stop();const generation=this.generation,t=this.target;
  // Both permission requests are initiated synchronously in the button gesture.
  const permission=api=>!api?Promise.resolve('unsupported'):typeof api.requestPermission==='function'?Promise.resolve(api.requestPermission()).catch(()=> 'denied'):Promise.resolve('granted');
  let orientation,motion;try{orientation=permission(t.DeviceOrientationEvent);motion=permission(t.DeviceMotionEvent);}catch{this.onStatus('Permission unavailable; manual controls remain active.');return;}
  const result=await Promise.all([orientation,motion]);if(generation!==this.generation)return;
  if(result[0]==='granted'){
   const listener=e=>{const values=[e.alpha,e.beta,e.gamma];if(values.every(Number.isFinite))try{this.onOrientation(values.map(v=>v*Math.PI/180));}catch{this.onStatus('Invalid orientation sample rejected; manual controls remain active.');}};
   t.addEventListener('deviceorientation',listener);this.listeners.push(['deviceorientation',listener]);
  }
  if(result[1]==='granted'){
   const listener=e=>{const a=e.acceleration,values=a?[a.x,a.y,a.z]:[];if(values.length===3&&values.every(Number.isFinite))this.onMotion(values,e.timeStamp);else this.onStatus('Gravity-free acceleration unavailable; gravity-inclusive data is not integrated.');};
   t.addEventListener('devicemotion',listener);this.listeners.push(['devicemotion',listener]);
  }
  this.onStatus(`Orientation ${result[0]}; motion ${result[1]}. Infrared unavailable. Calibrate while stationary before estimating velocity.`);
 }
 stop(){this.generation++;for(const [type,listener] of this.listeners)this.target.removeEventListener(type,listener);this.listeners=[];}
}
if(typeof module!=='undefined'&&module.exports)module.exports=Sensors;root.ScandocSkyliteSensors=Sensors;
})(typeof window!=='undefined'?window:globalThis);
