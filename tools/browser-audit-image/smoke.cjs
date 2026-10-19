"use strict";
const {chromium}=require('playwright');
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({permissions:[],serviceWorkers:'block'});
 await context.route('**/*',route=>route.abort());
 const page=await context.newPage();
 await page.setContent('<!doctype html><p id="result">ready</p>');
 if(await page.locator('#result').innerText()!=='ready')throw new Error('Rendering failed');
 console.log(JSON.stringify({status:'PASS',scope:'Offline browser environment only',playwrightVersion:require('playwright/package.json').version,browserVersion:browser.version()}));
 await context.close();
}catch(e){console.error(JSON.stringify({status:'FAIL',scope:'Browser environment',reason:e.message}));process.exitCode=1;}finally{if(browser)await browser.close();}})();
