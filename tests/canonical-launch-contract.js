"use strict";
// Read-only canonical contract; never grants permission to fire.
const SIX=Object.freeze(["Tap","Surface","Gain","Habitat","Engine","Business"]);
const PAIRS=Object.freeze([["Tap","Surface"],["Gain","Habitat"],["Engine","Business"]]);
const POST=Object.freeze(["Time Axis","Foretentacle"]);
function assessLaunch(record,clientApps=[]){
  const issues=[],missing=[];
  if(!record||typeof record!=="object")return {status:"BLOCKED",issues:["No authenticated launch event"],nativeGate:"CLOSED"};
  const legs=record.commitments;
  if(!Array.isArray(legs)||legs.length!==6)issues.push("Exactly six launch commitments required");
  else {
    const names=legs.map(x=>x?.leg);
    if(new Set(names).size!==6||SIX.some(x=>!names.includes(x)))issues.push("Canonical labels missing or duplicated");
    for(const [a,b] of PAIRS){
      const x=legs.find(x=>x?.leg===a),y=legs.find(x=>x?.leg===b);
      if(!x?.pair_lock||!y?.pair_lock||x.pair_lock!==y.pair_lock)issues.push("Unverified pair "+a+"/"+b);
    }
    for(const leg of legs)if(!/^[a-f0-9]{64,128}$/i.test(leg?.commitment||""))issues.push("Commitment digest missing or invalid");
  }
  if(record.axis4!==false)issues.push("Axis 4 not explicitly excluded");
  if(JSON.stringify(record.origin)!=="[1024,1024,0]")issues.push("Shared origin mismatch");
  if(!record.geometry_hash||!record.temporal_receipt||record.geometry_hash===record.temporal_receipt)issues.push("Geometry/temporal evidence absent or conflated");
  for(const x of SIX)if(!clientApps.includes(x))missing.push(x);
  if(missing.length)issues.push("Client does not expose canonical launch legs: "+missing.join(", "));
  if(record.post_launch_arms&&JSON.stringify(record.post_launch_arms)!==JSON.stringify(POST))issues.push("Post-launch arms must not be launch quorum");
  return {status:"BLOCKED",issues,nativeGate:"CLOSED",note:"No signature verification or native gate authorization is implemented"};
}
if(typeof module!=="undefined")module.exports={assessLaunch,SIX,PAIRS,POST};
