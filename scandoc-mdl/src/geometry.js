import {vector,number,FRAME,METRIC} from './schema.js';
const norm=p=>Math.hypot(...p),sub=(a,b)=>a.map((x,i)=>x-b[i]);
export function geometricMedian(samples,{tolerance=1e-10,maxIterations=200}={}){
 if(!Array.isArray(samples)||!samples.length||samples.length>8)throw Error('One to eight compatible geometric projections required');
 number(tolerance,1e-12,1e-5);if(!Number.isInteger(maxIterations)||maxIterations<1||maxIterations>1000)throw Error('Bounded iterations required');
 for(const s of samples){vector(s.position,10);number(s.weight,0.001,10);if(s.frame!==FRAME||s.metric!==METRIC||s.loadState!=='GEOMETRY_ONLY')throw Error('Incompatible metric, frame or load state');}
 const total=samples.reduce((a,s)=>a+s.weight,0);
 // Weighted centroid is only a starting iterate, never the coupling result.
 let x=[0,1,2].map(i=>samples.reduce((a,s)=>a+s.weight*s.position[i],0)/total);
 for(let iteration=0;iteration<maxIterations;iteration++){
  const others=samples.filter(s=>norm(sub(s.position,x))>tolerance),coincident=samples.filter(s=>norm(sub(s.position,x))<=tolerance).reduce((a,s)=>a+s.weight,0);
  if(!others.length)return {point:x,converged:true,iterations:iteration};
  const denominator=others.reduce((a,s)=>a+s.weight/norm(sub(s.position,x)),0);
  const next=[0,1,2].map(i=>others.reduce((a,s)=>a+s.weight*s.position[i]/norm(sub(s.position,x)),0)/denominator);
  const residual=norm([0,1,2].map(i=>others.reduce((a,s)=>a+s.weight*(s.position[i]-x[i])/norm(sub(s.position,x)),0)));
  if(coincident&&residual<=coincident+tolerance)return {point:x,converged:true,iterations:iteration};
  const blend=coincident?Math.min(1,coincident/residual):0;
  const candidate=next.map((v,i)=>(1-blend)*v+blend*x[i]);
  if(norm(sub(candidate,x))<=tolerance)return {point:candidate,converged:true,iterations:iteration+1};
  x=candidate;
 }
 return {point:x,converged:false,iterations:maxIterations};
}
export function relativeTrajectory(current,previous,priorRates,dt){
 number(dt,1e-6,.1);if(current.length!==8||previous.length!==8)throw Error('Eight tip references required');
 const result={};for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){
  if(current[i]===null||current[j]===null||previous[i]===null||previous[j]===null)continue;
  const id=`${i+1}:${j+1}`,r=sub(vector(current[i]),vector(current[j])),old=sub(vector(previous[i]),vector(previous[j]));
  const velocity=r.map((v,k)=>(v-old[k])/dt),prior=priorRates[id]?.velocity;
  result[id]={relative:r,velocity,acceleration:prior?velocity.map((v,k)=>(v-prior[k])/dt):null,dt,accelerationEvidence:prior?'TWO_VALIDATED_INTERVALS':'INSUFFICIENT_EVIDENCE'};
 }
 return result;
}
export function oath(claim,{genesisIntact=true,constraintsHold=true}={}){
 if(claim==='NATIVE_GATE_OPEN')return {state:'disproven',scope:'LOCAL_IMPLEMENTATION',reason:'Native gate is CLOSED'};
 if(claim==='LOCAL_CONSTRAINT_HOLDS')return {state:constraintsHold?'supported':'disproven',scope:'COMPUTATIONAL_SIMULATION',reason:'Evaluated declared numeric constraints'};
 if(claim==='GENESIS_IMMUTABLE')return {state:genesisIntact?'supported':'disproven',scope:'COMPUTATIONAL_SIMULATION',reason:'Representation compared with locked genesis'};
 if(claim==='INVARIANCE_FROM_SELF_AGREEMENT')return {state:'unsupported',scope:'CLAIM_BASIS',reason:'Self-agreement is not independent evidence'};
 if(claim==='PHYSICAL_INVARIANCE')return {state:'unknown',scope:'PHYSICAL_WORLD',reason:'No independent evidence adapter connected'};
 throw Error('Unknown claim identifier');
}
