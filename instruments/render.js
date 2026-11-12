(function(root){'use strict';
const M=root.ScandocModel;
const C={cyan:'#5cdeed',amber:'#ffc078',ink:'#06111f',white:'#ecf8ff',muted:'#36546d'};
function line(ctx,points,color=C.cyan,width=1.5){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function dot(ctx,x,y,r,color=C.cyan){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(1,r),0,Math.PI*2);ctx.fill();}
function text(ctx,value,x,y,color=C.white){ctx.fillStyle=color;ctx.font='13px system-ui';ctx.fillText(value,x,y);}
function projector(s,w,h){const r=Math.min(w*.35,h*.35)*(.75+s.energy*.25),cy=h*.52;return ([x,y,z=0])=>{const a=x*Math.cos(s.yaw)-z*Math.sin(s.yaw),b=x*Math.sin(s.yaw)+z*Math.cos(s.yaw),v=y*Math.cos(s.tilt)-b*Math.sin(s.tilt),depth=y*Math.sin(s.tilt)+b*Math.cos(s.tilt);return [w/2+a*r*(1+depth*.12),cy+v*r*(1+depth*.12)];};}
function sphere(ctx,s,p){for(let j=-3;j<=3;j++){const z=j/4,r=Math.sqrt(1-z*z);line(ctx,Array.from({length:65},(_,i)=>p([r*Math.cos(i*Math.PI/32),z,r*Math.sin(i*Math.PI/32)])),j?C.muted:C.cyan);}for(let j=0;j<5;j++)line(ctx,Array.from({length:65},(_,i)=>{const a=i*Math.PI/32;return p([Math.cos(a)*Math.cos(j*Math.PI/5),Math.sin(a),Math.cos(a)*Math.sin(j*Math.PI/5)]);}),C.muted);}
function cube(ctx,p){const v=Array.from({length:8},(_,i)=>[(i&1)?.7:-.7,(i&2)?.7:-.7,(i&4)?.7:-.7]);for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){const bit=i^j;if([1,2,4].includes(bit))line(ctx,[p(v[i]),p(v[j])],C.amber,2);}v.forEach(v=>dot(ctx,...p(v),4));}
function field(ctx,s,p){const points=s.field.map((u,i)=>{const a=i*Math.PI/12;return p([(1+u)*Math.cos(a),(1+u)*Math.sin(a),0]);});line(ctx,[...points,points[0]],C.cyan,3);s.velocity.forEach((v,i)=>{const a=i*Math.PI/12;line(ctx,[points[i],p([(1+s.field[i]+v*.25)*Math.cos(a),(1+s.field[i]+v*.25)*Math.sin(a),0])],C.amber,2);});}
function orrery(ctx,s,p){dot(ctx,...p([0,0,0]),12,C.amber);for(let i=0;i<3;i++){const radius=.4+i*.27;line(ctx,Array.from({length:65},(_,j)=>p([radius*Math.cos(j*Math.PI/32),radius*Math.sin(j*Math.PI/32),i*.05])),C.muted);dot(ctx,...p([radius*Math.cos(s.orbit[i]),radius*Math.sin(s.orbit[i]),i*.05]),i===1?8:5,i===1?C.cyan:C.amber);}text(ctx,'Earth = spherical reference; orbits are simulations',12,46);}
function tentacles(ctx,s,p,states){for(let i=0;i<8;i++){const angle=i*Math.PI/4,vector=states[root.ScandocState.APPS[i]]?.vector;const base=vector||[Math.cos(angle)*.5,Math.sin(angle)*.5,.2];const points=Array.from({length:9+Math.round(s.complexity*24)},(_,j)=>{const t=j/(8+Math.round(s.complexity*24));return p([base[0]*(.6+t)+Math.sin(t*8+s.time*s.speed)*s.distortion*t*.18,base[1]*(.6+t),base[2]+Math.cos(t*7)*s.distortion*t*.25]);});line(ctx,points,vector?C.amber:C.cyan,2);text(ctx,String(i),...points.at(-1));}}
function flow(ctx,s,p){s.particles.forEach(particle=>{const from=p([particle.x,particle.y,0]),to=p([particle.x+particle.vx*.6,particle.y+particle.vy*.6,0]);line(ctx,[from,to],C.cyan,2);dot(ctx,...from,3);});dot(ctx,...p([...s.horizon,0]),5,C.amber);}
function business(ctx,s,p){const nodes=Array.from({length:6},(_,i)=>p([Math.cos(i*Math.PI/3)*.9,Math.sin(i*Math.PI/3)*.9,0]));for(let i=0;i<6;i++){line(ctx,[nodes[i],nodes[(i+1)%6]],s.edges[i]?C.cyan:C.muted,s.readHead===i?4:2);dot(ctx,...nodes[i],7,s.edges[i]?C.cyan:C.amber);text(ctx,String(i),nodes[i][0]+10,nodes[i][1]);}const a=nodes[s.readHead];line(ctx,[a,[a[0]-15,a[1]+20],[a[0]+15,a[1]+20],a],C.amber,2);text(ctx,'Triangle: double-ramified read-only stream',12,46);}
function draw(ctx,s,w,h,states={},contract=null){
 ctx.fillStyle=C.ink;ctx.fillRect(0,0,w,h);const p=projector(s,w,h),name=(s.instrument==='seven'?M.STAGES:M.MODES)[s.index];
 const shown=s.reduced?{...s,time:0}:s;
 switch(name){
 case 'Tap':{const r=Math.min(w,h)*.3;for(let i=1;i<6;i++){const radius=r*(i/6+.02*Math.sin(shown.time+s.pulses));line(ctx,Array.from({length:65},(_,j)=>[w/2+Math.cos(j*Math.PI/32)*radius,h/2+Math.sin(j*Math.PI/32)*radius]),i===1?C.amber:C.cyan);}dot(ctx,w/2,h/2,5+10*s.energy,C.amber);break;}
 case 'Surface':case 'Velocity Splat':sphere(ctx,s,p);field(ctx,s,p);break;
 case 'Gain':for(let i=0;i<6;i++){const a=i*Math.PI/3,r=.25+s.gains[i]*.7;line(ctx,[p([0,0,0]),p([r*Math.cos(a),r*Math.sin(a),0])],C.amber,4);dot(ctx,...p([r*Math.cos(a),r*Math.sin(a),0]),6);text(ctx,s.gains[i].toFixed(2),...p([(r+.15)*Math.cos(a),(r+.15)*Math.sin(a),0]));}text(ctx,'SIMULATED radial energy; touch redistributes channels',12,46);break;
 case 'Habitat':orrery(ctx,s,p);line(ctx,[p([-1,s.horizon[1],0]),p([1,s.horizon[1]+s.horizon[0],0])],C.amber,3);break;
 case 'Engine':case 'Drift / Flow':flow(ctx,s,p);break;
 case 'Business':business(ctx,s,p);break;
 case 'Sphere':sphere(ctx,s,p);flow(ctx,s,p);break;
 case 'Tentacles':sphere(ctx,s,p);tentacles(ctx,shown,p,states);break;
 case 'Orrery':orrery(ctx,s,p);break;
 case 'Cube':cube(ctx,p);text(ctx,'Six spatial faces · two temporal arms are postlaunch',12,46);break;
 case 'Time Axis':{
  const record=M.recorded(s,s.scrub);text(ctx,record?`Recorded tick ${record.tick} / time ${record.time.toFixed(2)} s`:'History unavailable: interact and record states first',12,55);
  if(record){line(ctx,s.history.map((r,i)=>[20+i/Math.max(1,s.history.length-1)*(w-40),h*.75-r.energy*h*.4]),C.cyan,2);dot(ctx,20+s.scrub/Math.max(1,s.history.length-1)*(w-40),h*.75-record.energy*h*.4,6,C.amber);}
  text(ctx,`Read-only past; no forward-of-now · ${s.historyStart?'Earlier samples unavailable':'This-session history only'}`,12,80);break;
 }
 case 'Unified View':sphere(ctx,s,p);cube(ctx,p);tentacles(ctx,shown,p,states);flow(ctx,s,p);break;
 }
 if(contract?.events.length&&(name==='Surface'||name==='Velocity Splat')){
  for(const [index,event] of contract.events.entries()){const angle=index*Math.PI/3;dot(ctx,...p([Math.cos(angle)*.8,Math.sin(angle)*.8,0]),5,C.amber);text(ctx,event.id.slice(-2),...p([Math.cos(angle)*.95,Math.sin(angle)*.95,0]));}
  text(ctx,'Projected markings: gate symbol under construction',12,h-20,C.amber);
 }
 text(ctx,name+' · SIMULATED · engine gate CLOSED',12,24);
}
root.ScandocRender={draw};
})(window);
