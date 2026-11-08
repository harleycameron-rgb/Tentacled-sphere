import {createHash} from 'node:crypto';
export const ORIGIN=Object.freeze([1024,1024,0]);
export const ROLES=Object.freeze(['tap','surface','gain','habitat','engine','business','time','foretentacle']);
export const NORMALS=Object.freeze([[0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]].map(Object.freeze));
export const PAIRS=Object.freeze([[1,2],[3,4],[5,6]].map(Object.freeze));
export const FRAME='sphere-local-cartesian/1',METRIC='dimensionless-euclidean/1';
export function finiteJSON(value,depth=0){
 if(depth>16)throw Error('Object nesting exceeds limit');
 if(typeof value==='number'){if(!Number.isFinite(value)||Math.abs(value)>1e12)throw Error('Nonfinite or oversized number');return;}
 if(value===null||typeof value==='boolean')return;
 if(typeof value==='string'){if(value.length>256)throw Error('String too long');return;}
 if(Array.isArray(value)){if(value.length>256)throw Error('Array too long');for(const v of value)finiteJSON(v,depth+1);return;}
 if(value&&Object.getPrototypeOf(value)===Object.prototype){for(const [k,v]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsafe key');finiteJSON(v,depth+1);}return;}
 throw Error('Plain finite JSON required');
}
export function canonical(value){
 const encode=v=>{if(typeof v==='number'&&!Number.isFinite(v)||v===undefined)throw Error('Canonical data must be finite');return Array.isArray(v)?v.map(encode):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,encode(v[k])])):Object.is(v,-0)?0:v;};
 return JSON.stringify(encode(value));
}
export const hash=(domain,value)=>createHash('sha256').update(domain+'\0'+canonical(value)).digest('hex');
export const copy=value=>JSON.parse(canonical(value));
export function keys(object,expected){if(!object||Object.getPrototypeOf(object)!==Object.prototype||Object.keys(object).sort().join('|')!==[...expected].sort().join('|'))throw Error('Strict schema mismatch');}
export function vector(v,bound=4){if(!Array.isArray(v)||v.length!==3||v.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>bound))throw Error('Finite three-vector required; no fourth axis');return [...v];}
export function number(n,min,max){if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error('Numeric range violation');return n;}
export function identifier(v){if(typeof v!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,99}$/.test(v))throw Error('Invalid identifier');return v;}
export function topology(){return {schema:'scandoc-mdl-topology/1',cube:{interfaces:ROLES.slice(0,6),pairs:PAIRS,frame:'cube-local-cartesian/1',axes:3,originReference:ORIGIN},sphere:{core:'authoritative-simulation-service',interfaces:ROLES,spatialMetric:{frame:FRAME,metric:METRIC,members:[1,2,3,4,5,6],loadState:'GEOMETRY_ONLY'},temporalMembers:[7,8]},sentinel:{role:'immutable-session-root',truth:'SIMULATION_DECLARATION'},nativeGate:'CLOSED'};}
export function validateCommand(c){
 finiteJSON(c);keys(c,['schema','event_id','expected_tick','source_tentacle','event_type','payload']);
 if(c.schema!=='scandoc-command/1')throw Error('Unknown command version');identifier(c.event_id);
 if(!Number.isSafeInteger(c.expected_tick)||c.expected_tick<0||c.expected_tick>=Number.MAX_SAFE_INTEGER)throw Error('Invalid logical tick');
 if(!Number.isInteger(c.source_tentacle)||c.source_tentacle<0||c.source_tentacle>8)throw Error('Unknown tentacle');
 const allowed=['FACE_ACTIVATE','FACE_QUALIFY','FACE_COMMIT','SIMULATION_FIRE','DECLARED_INPUT','STEP','PAUSE','RESUME'];
 if(!allowed.includes(c.event_type))throw Error('Unknown operation; native burn gate CLOSED');
 return copy(c);
}
