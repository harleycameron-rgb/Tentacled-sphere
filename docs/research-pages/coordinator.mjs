// SCANDOC local research coordinator v0.1. No network, persistence or native firing.
export const APPS=Object.freeze(['Tap','Surface','Gain','Habitat','Engine','Business','Time Axis','Foretentacle']);
export const PLATONIC=Object.freeze([{name:'Tetrahedron',p:3,q:3,F:4,angle:70.528779},{name:'Cube',p:4,q:3,F:6,angle:90},{name:'Octahedron',p:3,q:4,F:8,angle:109.471221},{name:'Dodecahedron',p:5,q:3,F:12,angle:116.565051},{name:'Icosahedron',p:3,q:5,F:20,angle:138.189685}]);
export function identifyTwoFaces(p,angle,tolerance=0.5){if(!Number.isInteger(p)||![angle,tolerance].every(Number.isFinite)||angle<=0||angle>=180||tolerance<0)throw Error('Invalid measurement');const matches=PLATONIC.filter(s=>s.p===p&&Math.abs(s.angle-angle)<=tolerance);return {candidates:matches.map(s=>s.name),classification:matches.length===1?'SUPPORTED':matches.length===0?'UNSUPPORTED':'UNKNOWN'};}
export class Coordinator{
constructor(){this.connections=new Set();this.faces=new Set();this.event=null;this.paused=false;this.sequence=0;}
connect(name){if(!APPS.includes(name))throw Error('Unknown app');this.connections.add(name);return this.snapshot();}
commit(name){const i=APPS.indexOf(name);if(i<0||i>5)throw Error('Not a cube face');this.faces.add(i);return this.snapshot();}
get ready(){return this.faces.size===6&&[[0,1],[2,3],[4,5]].every(([a,b])=>this.faces.has(a)&&this.faces.has(b));}
fire(){if(!this.ready||this.event)throw Error('Local firing blocked');this.event='LOCAL-'+(++this.sequence);return this.snapshot();}
pause(){if(!this.event)throw Error('No event');this.paused=true;return this.snapshot();}
resume(){if(!this.event)throw Error('No event');this.paused=false;return this.snapshot();}
reset(){this.faces.clear();this.event=null;this.paused=false;return this.snapshot();}
snapshot(){return {schema:'scandoc-coordinator/0.1',apps:APPS.map((name,i)=>({name,connected:this.connections.has(name),committed:i<6?this.faces.has(i):null})),cubeReady:this.ready,event:this.event,paused:this.paused,nativeGate:'CLOSED',receipts:'UNVERIFIED',geometryHash:null,temporalReceipt:null,networkWrites:false};}
}