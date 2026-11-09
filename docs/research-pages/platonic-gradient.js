"use strict";
/* Canonical projected vertex directions; independent of SCANDOC native geometry. */
window.PlatonicGradient=(()=>{
const phi=(1+Math.sqrt(5))/2,vs={tetrahedron:[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]],cube:[],octahedron:[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],dodecahedron:[],icosahedron:[]};
for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){vs.cube.push([x,y,z]);vs.dodecahedron.push([x,y,z]);}
for(const a of [-1,1])for(const b of [-1,1]){vs.dodecahedron.push([0,a/phi,b*phi],[a/phi,b*phi,0],[b*phi,0,a/phi]);vs.icosahedron.push([0,a,b*phi],[a,b*phi,0],[b*phi,0,a]);}
function axes(name){if(!vs[name])return [];const unique=new Map();for(const [x,y] of vs[name]){const m=Math.hypot(x,y);if(m<1e-10)continue;let a=x/m,b=y/m;if(a< -1e-10||(Math.abs(a)<1e-10&&b<0)){a=-a;b=-b;}const key=a.toFixed(10)+","+b.toFixed(10);unique.set(key,[a,b]);}return [...unique.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(e=>e[1]);}
function evaluate(){const sample=[[0,1,2,3,4],[0,1,2,3,4],[0,1,2,3,4]];const out={};for(const n of Object.keys(vs)){const a=axes(n);out[n]={axisCount:a.length,allFinite:a.every(v=>v.every(Number.isFinite)),unit:a.every(v=>Math.abs(Math.hypot(...v)-1)<1e-9)};}return out;}
return {axes,evaluate,version:"scandoc-gradient-optics-platonic/0.1",nativeGate:"CLOSED"};
})();