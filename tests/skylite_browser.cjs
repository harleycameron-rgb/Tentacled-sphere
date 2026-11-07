const assert=require('node:assert/strict');const {chromium,devices}=require('playwright');
const base=process.env.SCANDOC_INSTRUMENTS_URL||'http://127.0.0.1:8084';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local acceptance server required');
const ids=['tap','surface','spiritlevel','gain','habitat','time','space','lineage'];
const frame=page=>page.locator('#sky-frame').textContent().then(JSON.parse);
async function set(page,id,value){await page.locator(id).evaluate((element,value)=>{element.value=String(value);element.dispatchEvent(new Event('input',{bubbles:true}));},value);}
(async()=>{const browser=await chromium.launch({executablePath:process.env.SCANDOC_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let passed=0;const pass=x=>{passed++;console.log('PASS '+x);};
try{
 for(const profile of ['desktop','iPhone 13']){
  const context=await browser.newContext(profile==='desktop'?{viewport:{width:1280,height:1000}}:devices[profile]);const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>requests.push(r.url()));await page.goto(base+'/instruments/skylite.html?app=tap');
  await page.locator('#sky-run').click();
  for(const app of ids){
   await page.locator('#sky-profile').selectOption(app);await set(page,'#sky-alpha',70);await set(page,'#sky-beta',25);await page.locator('#sky-pulse').click();
   await page.waitForFunction(app=>{const f=JSON.parse(document.querySelector('#sky-frame').textContent);return f.app===app&&f.geometry.points.length>0&&f.attenuation.orientationOutputRadians[0]>.1;},app);
   assert.equal((await frame(page)).geometry.engineVerified,false);assert.equal((await frame(page)).derived.absoluteVelocityAvailable,false);
   if(app==='surface')assert.match(await page.locator('#sky-curvature').textContent(),/sphere k=.*paraboloid kr\/kt=/);
  }
  await page.locator('canvas').scrollIntoViewIfNeeded();const box=await page.locator('canvas').boundingBox();
  if(profile==='desktop'){await page.mouse.move(box.x+box.width*.7,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.6);await page.mouse.up();}
  else await page.touchscreen.tap(box.x+box.width*.7,box.y+box.height*.4);
  assert.ok(Number(await page.locator('#sky-alpha').inputValue())>0);
  await page.locator('#sky-run').click();const stopped=(await frame(page)).tick;await page.waitForTimeout(100);assert.equal((await frame(page)).tick,stopped);
  await page.locator('#sky-reset').click();assert.equal((await frame(page)).tick,0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith(base)&&!url.includes('/api/')));
  if(profile==='iPhone 13'){await page.locator('#sky-profile').selectOption('surface');await page.locator('#sky-run').click();await set(page,'#sky-beta',45);await page.waitForFunction(()=>JSON.parse(document.querySelector('#sky-frame').textContent).attenuation.orientationOutputRadians[1]>.1);await page.screenshot({path:'/workspace/scratch/skylite-mobile.png',fullPage:true});}
  pass(profile+': eight adapters, manual attenuation, curvature, touch/drag, pause/reset and responsive layout');await context.close();
 }
 const c=await browser.newContext();await c.addInitScript(()=>{
  window.DeviceOrientationEvent={requestPermission:async()=> 'denied'};window.DeviceMotionEvent={requestPermission:async()=> 'denied'};
  const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window);window.__sensorListeners=0;
  window.addEventListener=(type,fn,...args)=>{if(['deviceorientation','devicemotion'].includes(type))window.__sensorListeners++;return add(type,fn,...args);};
  window.removeEventListener=(type,fn,...args)=>{if(['deviceorientation','devicemotion'].includes(type))window.__sensorListeners--;return remove(type,fn,...args);};
  window.__motion=(x,time)=>{const e=new Event('devicemotion');e.acceleration={x,y:0,z:0};Object.defineProperty(e,'timeStamp',{value:time});window.dispatchEvent(e);};
  window.__pose=()=>{const e=new Event('deviceorientation');Object.assign(e,{alpha:0,beta:0,gamma:0});window.dispatchEvent(e);};
 });
 const p=await c.newPage();await p.goto(base+'/instruments/skylite.html?app=surface');await p.locator('#sky-run').click();await p.locator('#sky-sensors').click();await p.locator('#sky-sensor-status').filter({hasText:/denied/}).waitFor();assert.equal(await p.evaluate(()=>window.__sensorListeners),0);
 await p.evaluate(()=>{DeviceOrientationEvent.requestPermission=async()=> 'granted';DeviceMotionEvent.requestPermission=async()=> 'granted';});await p.locator('#sky-sensors').click();assert.equal(await p.evaluate(()=>window.__sensorListeners),2);
 await p.evaluate(()=>{window.__pose();window.__motion(.2,1000);});await p.locator('#sky-calibrate').click();await p.evaluate(()=>{window.__motion(1.2,1020);window.__motion(1.2,1040);});
 await p.waitForFunction(()=>JSON.parse(document.querySelector('#sky-frame').textContent).derived.integratedSamples===1);
 const reported=await frame(p);assert.ok(Math.abs(reported.derived.deltaVelocityMetresPerSecond[0]-.02)<1e-12);assert.equal(reported.input.accelerationKind,'DEVICE_MOTION_REPORTED');assert.equal(reported.infrared,'UNAVAILABLE_NO_HARDWARE_INTERFACE');
 await p.locator('#sky-run').click();assert.equal(await p.evaluate(()=>window.__sensorListeners),0);assert.equal((await frame(p)).derived.kind,'UNAVAILABLE');
 pass('Mocked permission denial, calibrated sample-time integration, reported/derived labels, unavailable IR and stop cleanup');await c.close();
 const reduced=await browser.newContext({reducedMotion:'reduce'});const r=await reduced.newPage();await r.clock.install();await r.goto(base+'/instruments/skylite.html?app=tap');await r.locator('#sky-run').click();const before=await r.locator('canvas').evaluate(c=>c.toDataURL());await r.clock.runFor(1000);assert.equal(await r.locator('canvas').evaluate(c=>c.toDataURL()),before);assert.ok((await frame(r)).tick>20);pass('Reduced motion suppresses automatic drawing while numerical sampling continues');await reduced.close();
 const links=await browser.newContext();const q=await links.newPage();await q.goto(base+'/instruments/skylite.html?app=surface');await q.locator('#sky-link-panel > summary').click();await q.locator('#sky-link').click();const legacy=q.frameLocator('#sky-app');await legacy.locator('#instrument-link-status').filter({hasText:/connected/}).waitFor();await q.locator('#sky-send').click();await legacy.locator('#instrument-preview-state').filter({hasText:/SIMULATED/}).waitFor();assert.equal(JSON.parse(await legacy.locator('#instrument-preview-state').textContent()).liveGate,'CLOSED');pass('Adaptive shell connects to the actual legacy stub through the versioned local adapter');
 await q.locator('#sky-offline').click();await q.locator('#sky-optional').filter({hasText:/Offline files ready/}).waitFor();await q.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await links.setOffline(true);
 for(const app of ids){await q.goto(base+'/instruments/skylite.html?app='+app);await q.locator('#sky-run').click();await q.waitForFunction(()=>JSON.parse(document.querySelector('#sky-frame').textContent).tick>2);assert.equal((await frame(q)).app,app);}
 pass('All eight query-selected Skylite profiles load and run offline');await links.close();console.log(passed+' Skylite browser scenarios passed; sensor events are mocks and iPhone is Chromium emulation.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
