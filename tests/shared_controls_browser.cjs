const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await browser.newContext();context.setDefaultTimeout(10000);const page=await context.newPage();await page.goto('http://127.0.0.1:8084/instruments/skylite.html');
 const ids=['tap','surface','spiritlevel','gain','habitat','time','space','lineage'],apps=[];
 for(const id of ids){await page.evaluate(id=>{const f=document.createElement('iframe');f.id='test-'+id;f.src='/apps/'+id+'.html';document.body.append(f);},id);const p=page.frameLocator('#test-'+id);await p.locator('#instrument-link').click();apps.push(p);}
 await page.bringToFront();await page.locator('#sky-run').click();await page.locator('#sky-link-panel').evaluate(e=>e.open=true);await page.locator('#sky-link').click();await page.locator('#sky-pulse').click();
 for(const app of apps)await app.locator('#instrument-link-status').filter({hasText:'RECEPTIVE'}).waitFor();
 await page.locator('#sky-alpha').evaluate(e=>{e.value='60';e.dispatchEvent(new Event('input'));});await page.waitForTimeout(400);
 const events=[];for(const app of apps){const s=JSON.parse(await app.locator('#instrument-preview-state').textContent());assert.equal(s.phase,'RECEPTIVE');assert.equal(s.topology.manifest.spatialLaunchLegs.length,6);assert.equal(s.topology.manifest.postlaunchTemporalArms.length,2);assert.equal(s.sentinel_firing.topology_hash,s.topology.hash);assert.equal(s.sentinel_firing.engineVerified,false);assert.ok(s.trajectory.position[0]>.1);assert.equal(s.trajectory.positionUnit,'rad');assert.equal(s.liveGate,'CLOSED');events.push(s.firing.eventId);}
 assert.equal(new Set(events).size,1);await page.locator('#sky-run').click();for(const app of apps)await app.locator('#instrument-link-status').filter({hasText:'idle'}).waitFor();
 console.log('PASS Eight actual stub pages receive one firing identity, continuous shared sphere pose and reset; gate remains CLOSED.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
