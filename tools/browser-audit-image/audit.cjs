"use strict";
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const origin='https://waxtablet-integration-audit-ppz16q0y2-waxtablet.vercel.app';
const ids=['tap','surface','spiritlevel','gain','habitat','time','space','lineage'];
const guarded=['apply-centre','fire-sentinel','undo-sentinel','complete-separation','start-trajectory'];
const entry=process.env.AUDIT_ENTRY_URL;
if(!entry||new URL(entry).origin!==origin)throw new Error('Approved deployment URL required at execution');
const token=new URL(entry).searchParams.get('_vercel_share')||'__absent__';
const redact=x=>String(x).replaceAll(entry,origin+'/[redacted]').replaceAll(token,'[redacted]').replace(/_vercel_share=[^&\s"']+/g,'_vercel_share=[redacted]');
const output=process.env.AUDIT_OUTPUT_DIR||'/tmp/waxtablet-audit';
const report={scope:'Diagnostic browser only; not completed Waxtablet integration',origin,sourceCommit:'b6c1bd189209f7221b698f6d565bcc60a31d8907',startedAt:new Date().toISOString(),playwrightVersion:require('playwright/package.json').version,results:[],pageErrors:[],consoleErrors:[],blockedRequests:[]};
let browser,context;
const need=(ok,message)=>{if(!ok)throw new Error(message);};
async function check(name,fn){try{report.results.push({name,status:'PASS',details:await fn()});}catch(e){report.results.push({name,status:'FAIL',reason:redact(e.message)});}}
(async()=>{try{
 browser=await chromium.launch({headless:true});report.browserVersion=browser.version();
 context=await browser.newContext({permissions:[],serviceWorkers:'block',viewport:{width:1280,height:900}});
 await context.addInitScript(()=>{
  window.__auditForbiddenCalls=[];
  if(navigator.mediaDevices)Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:()=>{window.__auditForbiddenCalls.push('media');return Promise.reject(new Error('Audit blocks media'));}});
  for(const key of ['AudioContext','webkitAudioContext'])if(window[key])Object.defineProperty(window,key,{value:function(){window.__auditForbiddenCalls.push('audio');throw new Error('Audit blocks audio');}});
  for(const key of ['DeviceOrientationEvent','DeviceMotionEvent'])if(window[key]?.requestPermission)Object.defineProperty(window[key],'requestPermission',{value:()=>{window.__auditForbiddenCalls.push('sensor');return Promise.reject(new Error('Audit blocks sensors'));}});
 });
 await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(u.origin!==origin||!['GET','HEAD'].includes(r.method())){report.blockedRequests.push({origin:u.origin,path:u.pathname,method:r.method()});await route.abort();}else await route.continue();});
 const page=await context.newPage();
 page.on('pageerror',e=>report.pageErrors.push(redact(e.message)));
 page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(redact(m.text()));});
 await check('homepage loads',async()=>{const r=await page.goto(entry,{waitUntil:'domcontentloaded',timeout:25000});need(r?.status()===200,'Homepage HTTP failure');return r.status();});
 await check('diagnostic warning executes',async()=>{await page.getByText('SOURCE-AUDIT PREVIEW, NOT COMPLETED WAXTABLET.',{exact:false}).waitFor({timeout:12000});return true;});
 await check('home initializes',async()=>{await page.waitForFunction(()=>!document.getElementById('home-panel')?.hidden,null,{timeout:12000});const s=await page.locator('#home-status').innerText();need(!/unavailable|incomplete|failed|error/i.test(s),s);return s;});
 await check('eight app identities',async()=>{await page.waitForFunction(()=>document.querySelectorAll('iframe.app-frame').length===8,null,{timeout:12000});for(const id of ids)await page.frameLocator('iframe[src="/apps/'+id+'.html"]').locator('body[data-app="'+id+'"]').waitFor({state:'attached',timeout:12000});return ids;});
 await check('initial acknowledgements',async()=>{await page.waitForFunction(()=>document.getElementById('ack-summary')?.textContent.includes('8/8'),null,{timeout:12000});return await page.locator('#ack-summary').innerText();});
 await check('frame message counters',async()=>{const s=await page.locator('aside pre').first().innerText();need(ids.every(id=>s.includes(id+':sphere:ack')),'Missing counters');return 'Counters only; not trajectory records';});
 await check('guarded controls disabled',async()=>{const state={};for(const id of guarded)state[id]=await page.locator('#'+id).isDisabled();need(Object.values(state).every(Boolean),'Action enabled');return state;});
 await check('API unit vectors',async()=>{const r=await page.evaluate(async()=>{const x=await fetch('/api/tentacled-sphere');return {status:x.status,data:await x.json()};});need(r.status===200&&r.data.tentacles?.length===8&&r.data.tentacles.every((a,i)=>a.index===i&&a.vector?.length===3&&a.vector.every(Number.isFinite)&&Math.abs(Math.hypot(...a.vector)-1)<1e-10),'Vector contract failed');return 'Generic baseline, not Earth/orrery derivations';});
 await check('invalid API input rejected',async()=>{const r=await page.evaluate(async()=>{const x=await fetch('/api/tentacled-sphere?seed=NaN');return {status:x.status,data:await x.json()};});need(r.status===400&&typeof r.data.error==='string','Invalid input accepted');return r;});
 await check('devices inactive',async()=>{const states=[];for(const f of page.frames())if(f.url().startsWith(origin))states.push(await f.evaluate(()=>({active:[...document.querySelectorAll('video')].some(v=>Boolean(v.srcObject)),calls:window.__auditForbiddenCalls||[]})));need(states.every(s=>!s.active&&s.calls.length===0),'Device activation attempted');return {frames:states.length};});
 await check('same-origin read-only traffic',async()=>{need(report.blockedRequests.length===0,'Forbidden request attempted');return true;});
 await check('no page exceptions',async()=>{need(report.pageErrors.length===0,report.pageErrors.join(' | '));return true;});
 if(process.env.AUDIT_SCREENSHOT==='1'){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'browser-audit.png'),fullPage:true});}
}catch(e){report.infrastructureOrFatalError=redact(e.stack||e.message);}finally{
 if(context)await context.close();if(browser)await browser.close();
 report.finishedAt=new Date().toISOString();report.executedChecks=report.results.length;
 report.passed=report.executedChecks===12&&report.results.every(r=>r.status==='PASS')&&!report.infrastructureOrFatalError;
 fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'browser-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));process.exitCode=report.passed?0:1;
}})();
