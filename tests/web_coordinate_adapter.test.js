"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const create = require("../web/coordinate-adapter.js");
const C = require("../web/coordinates.js");
const values = (latitude="0", height="0") => ({latitude,longitude:"0",radius:"1",height});
class Element {
  constructor(tag) { this.tag=tag; this.children=[]; this.listeners={}; this.textContent=""; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(key,value) { this[key]=value; }
  addEventListener(type,fn) { this.listeners[type]=fn; }
}
function environment() {
  const body=new Element("body"), main=new Element("main");body.appendChild(main);
  const find=(node,id)=>node.id===id?node:node.children.map(n=>find(n,id)).find(Boolean);
  const doc={body,hidden:false,readyState:"complete",listeners:{},createElement:tag=>new Element(tag),
    getElementById:id=>find(body,id),querySelector:selector=>selector==="main"?main:null,
    addEventListener(type,fn){this.listeners[type]=fn;}};
  const win={document:doc,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}};
  win.parent=win;
  return {doc,win,main};
}
function submit(ui, input) {
  for(const [key,value] of Object.entries(input)) ui.inputs[key].value=value;
  let prevented=false;
  ui.form.listeners.submit({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
}
test("declared degree inputs reach the coordinate module",()=>{
  const r=create(C).evaluate(values("30"));
  assert.ok(Math.abs(r.frame.latitude-Math.PI/6)<1e-15);
  assert.equal(r.physicalAxisMap.metricPreserving,false);
  assert.equal(r.source,"user-declared-spherical-model-not-device-measurement");
});
test("blank location is not coerced to an inferred equator",()=>{
  assert.throws(()=>create(C).evaluate(values("")),/required/);
  assert.throws(()=>create(C).evaluate({...values(),longitude:" "}),/required/);
});
test("pole chart availability and sightline availability stay separate",()=>{
  const r=create(C).evaluate({...values("90",String(Number.MIN_VALUE)),radius:"1.7e308"});
  assert.equal(r.frame.status,"unavailable");
  assert.equal(r.geographicNorthPole.status,"available");
  assert.deepEqual(r.geographicNorthPole.direction,[0,0,-1]);
});
test("exact target remains undefined",()=>assert.equal(create(C).evaluate(values("90")).geographicNorthPole.direction,null));
test("invalid finite ranges and dimensions reject",()=>{
  for(const v of [values("91"),values("0","-1"),{...values(),radius:"Infinity"},{...values(),radius:"0"}])
    assert.throws(()=>create(C).evaluate(v));
});
test("mount is idempotent and does not create panels inside app frames",()=>{
  const {doc,win,main}=environment(), a=create(C);
  assert.ok(a.mount(doc,win));assert.equal(a.mount(doc,win),null);
  assert.equal(main.children.length,1);
  const other=environment();other.win.parent={};assert.equal(a.mount(other.doc,other.win),null);
});
test("form submission calculates and a later error clears stale output",()=>{
  const {doc,win}=environment(),ui=create(C).mount(doc,win);
  submit(ui,values("30"));assert.equal(JSON.parse(ui.output.textContent).frame.status,"available");
  submit(ui,values("91"));assert.equal(ui.output.textContent,"");assert.match(ui.status.textContent,/rejected/);
});
test("clear, hiding and page exit clear location inputs and displayed results",()=>{
  const {doc,win}=environment(),ui=create(C).mount(doc,win);
  for(const clear of [()=>ui.clear.listeners.click(),()=>{doc.hidden=true;doc.listeners.visibilitychange();},()=>win.listeners.pagehide()]) {
    submit(ui,values("30"));clear();assert.equal(ui.inputs.latitude.value,"");
    assert.equal(ui.inputs.longitude.value,"");assert.equal(ui.output.textContent,"");
  }
});
test("a missing module reports failure without retaining an output",()=>{
  const {doc,win}=environment(),ui=create(undefined).mount(doc,win);
  submit(ui,values());assert.equal(ui.output.textContent,"");assert.match(ui.status.textContent,/module unavailable/);
});
test("browser path mounts the adapter without network, sensors, feed or firing APIs",()=>{
  const {doc,win,main}=environment();win.TentacledCoordinates=C;
  vm.runInNewContext(fs.readFileSync(require.resolve("../web/coordinate-adapter.js"),"utf8"),{window:win});
  assert.equal(main.children.length,1);
  assert.equal(typeof win.TentacledCoordinateAdapter.evaluate,"function");
});
test("browser loading path waits for DOMContentLoaded",()=>{
  const {doc,win,main}=environment();doc.readyState="loading";win.TentacledCoordinates=C;
  vm.runInNewContext(fs.readFileSync(require.resolve("../web/coordinate-adapter.js"),"utf8"),{window:win});
  assert.equal(main.children.length,0);doc.listeners.DOMContentLoaded();assert.equal(main.children.length,1);
});

test("editing inputs invalidates an earlier result before native form validation",()=>{
  const {doc,win}=environment(),ui=create(C).mount(doc,win);
  submit(ui,values("30"));assert.ok(ui.output.textContent);
  ui.inputs.latitude.value="";ui.inputs.latitude.listeners.input();
  assert.equal(ui.output.textContent,"");assert.match(ui.status.textContent,/Inputs changed/);
});
