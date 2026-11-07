const assert=require('node:assert/strict');
const {chromium,devices}=require('playwright');
const base=process.env.SCANDOC_INSTRUMENTS_URL||'http://127.0.0.1:8084';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Use a localhost server for mutable browser acceptance tests');
const state=p=>p.locator('#state').textContent().then(JSON.parse);
const contract=p=>p.locator('#contract').textContent().then(JSON.parse);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SCANDOC_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let passed=0;
 const pass=message=>{passed++;console.log('PASS '+message);};
 try{
 for(const profile of ['desktop','iPhone 13']){
  const context=await browser.newContext(profile==='desktop'?{viewport:{width:1280,height:1000}}:devices[profile]);
  for(const [pageName,count] of [['seven-stage.html',7],['octopus.html',8]]){
   const page=await context.newPage(),errors=[],urls=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>urls.push(r.url()));
   await page.goto(base+'/instruments/'+pageName);await page.locator('#run').click();
   assert.equal(await page.locator('[data-choice]').count(),count);
   for(let i=0;i<count;i++){
    await page.locator(`[data-choice="${i}"]`).click();assert.equal((await state(page)).index,i);
    await page.locator('canvas').scrollIntoViewIfNeeded();const box=await page.locator('canvas').boundingBox();
    if(profile==='desktop'){await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.4);await page.mouse.up();}
    else await page.touchscreen.tap(box.x+box.width*.7,box.y+box.height*.5);
    await page.locator('#pulse').click();assert.notEqual((await state(page)).lastAction,'Ready');
   }
   await page.locator('#run').click();const paused=(await state(page)).tick;await page.waitForTimeout(100);assert.equal((await state(page)).tick,paused);
   await page.locator('#reset').click();assert.equal((await state(page)).tick,0);assert.equal((await contract(page)).phase,'CONCEPTUAL');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert.ok(urls.every(url=>url.startsWith(base)));assert.deepEqual(errors,[]);
   pass(`${profile}: ${count} selections, actual touch/drag, actions, pause/reset, layout and no external requests`);
   if(profile!=='desktop'&&pageName==='octopus.html')await page.screenshot({path:'/workspace/scratch/instruments-mobile.png',fullPage:true});
   await page.close();
  }
  await context.close();
 }
 const reduced=await browser.newContext({reducedMotion:'reduce'});const page=await reduced.newPage();await page.clock.install();await page.goto(base+'/instruments/seven-stage.html');
 assert.equal(await page.locator('#reduced').isChecked(),true);await page.locator('#run').click();const pixels=await page.locator('canvas').evaluate(c=>c.toDataURL());
 await page.clock.runFor(1100);assert.ok((await state(page)).tick>30);assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),pixels);
 await page.locator('#automatic').check();await page.clock.runFor(12100);assert.equal((await state(page)).index,1);pass('Reduced-motion freezes automatic visual frames while recorded time advances; explicit automatic progression works');await reduced.close();
 const context=await browser.newContext();const cockpit=await context.newPage();const errors=[];cockpit.on('pageerror',e=>errors.push(e.message));
 await cockpit.goto(base+'/instruments/octopus.html');assert.equal(await cockpit.locator('#activate').isDisabled(),true);
 await cockpit.locator('#contract-panel > summary').click();await cockpit.locator('#begin').click();
 for(const [i,leg] of ['tap','surface','gain','habitat','engine','business'].entries()){
  await cockpit.locator('#record').click();await cockpit.locator('#leg').selectOption(leg);await cockpit.locator('#harden').click();
  await cockpit.waitForFunction(n=>JSON.parse(document.querySelector('#contract').textContent).commitments.length===n,i+1);
 }
 await cockpit.locator('#validate').click();assert.equal((await contract(cockpit)).phase,'VALIDATED');await cockpit.locator('#activate').click();
 assert.equal((await contract(cockpit)).phase,'EXPLICIT_SURFACE_ACTIVATION');assert.equal((await contract(cockpit)).centre,null);assert.equal((await contract(cockpit)).liveGate,'CLOSED');
 pass('Explicit six-event local hardening/validation/activation never writes centre or opens engine gate');
 await cockpit.locator('#link-panel > summary').click();await cockpit.locator('#connect').click();
 for(const app of ['tap','surface','spiritlevel','gain','habitat','time','space','lineage']){
  await cockpit.locator('#target').selectOption(app);await cockpit.locator('#open-app').click();const frame=cockpit.frameLocator('#app-frame');
  await frame.locator('#instrument-link-status').filter({hasText:/connected|received/}).waitFor();
  await frame.locator('#app-status').filter({hasText:/Loaded API/}).waitFor();
  const original=await frame.locator('#applied-position').textContent();
  await cockpit.locator('#energy').evaluate(e=>{e.value='.83';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await cockpit.locator('#send').click();
  await frame.locator('#instrument-preview-state').filter({hasText:/0.83/}).waitFor();
  const preview=JSON.parse(await frame.locator('#instrument-preview-state').textContent());assert.equal(preview.kind,'SIMULATED');assert.equal(preview.controls.energy,.83);
  assert.equal(await frame.locator('#applied-position').textContent(),original);
 }
 pass('Cockpit controls propagate numerically to all eight actual app adapters; original API geometry remains intact');
 await cockpit.locator('#offline').click();await cockpit.locator('#optional-status').filter({hasText:/Offline instrument files ready/}).waitFor();
 await cockpit.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await context.setOffline(true);
 for(const name of ['seven-stage.html','octopus.html']){await cockpit.goto(base+'/instruments/'+name);await cockpit.locator('#run').click();await cockpit.waitForFunction(()=>JSON.parse(document.querySelector('#state').textContent).tick>2);}
 assert.deepEqual(errors,[]);pass('Both standalone instruments start and tick offline without backend services');await context.close();
 const permissions=await browser.newContext();await permissions.addInitScript(()=>{
  const Audio=window.AudioContext||window.webkitAudioContext;window.__audio=[];if(Audio)window.AudioContext=class extends Audio{constructor(){super();window.__audio.push(this);}};
  window.DeviceOrientationEvent={requestPermission:async()=> 'denied'};
  const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window);window.__orientationCount=0;
  window.addEventListener=(type,fn,...args)=>{if(type==='deviceorientation')window.__orientationCount++;return add(type,fn,...args);};
  window.removeEventListener=(type,fn,...args)=>{if(type==='deviceorientation')window.__orientationCount--;return remove(type,fn,...args);};
 });
 const p=await permissions.newPage();await p.goto(base+'/instruments/seven-stage.html');await p.locator('#run').click();await p.locator('#motion').click();await p.locator('#optional-status').filter({hasText:/denied/}).waitFor();assert.equal(await p.evaluate(()=>window.__orientationCount),0);
 await p.evaluate(()=>{DeviceOrientationEvent.requestPermission=async()=> 'granted';});await p.locator('#motion').click();assert.equal(await p.evaluate(()=>window.__orientationCount),1);
 await p.locator('#sound').click();await p.locator('#sound').filter({hasText:/Stop local sound/}).waitFor();await p.locator('#run').click();
 await p.waitForFunction(()=>window.__orientationCount===0&&window.__audio.every(c=>c.state==='closed'));
 pass('Permission denial/manual fallback, granted orientation and Web Audio cleanup on stop');
 await permissions.close();console.log(`${passed} browser acceptance scenarios passed; iPhone is emulated Chromium, not physical Safari.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
