const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  for (const [w,h] of [[375,812],[390,844],[430,932],[768,1024],[1024,768],[1366,900]]) {
   const page=await browser.newPage({viewport:{width:w,height:h}});
   await page.context().route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#measureBill');
   const versionInfo=JSON.parse(require('node:fs').readFileSync('floor-assistant-v285/version.json','utf8'));
   const advertised=await page.locator('meta[name="app-version"]').getAttribute('content');
   assert.equal(advertised,'V'+versionInfo.version,'HTML version must match version.json (cache updates)');

   const metrics=await page.evaluate(()=>{
    const box=document.querySelector('#quote .measure-card-v273 .measure-summary');
    const items=[...box.children].map(e=>{
     const r=e.getBoundingClientRect();
     return {cls:e.className,x:r.x,y:r.y,w:r.width,h:r.height,display:getComputedStyle(e).display};
    });
    const r=box.getBoundingClientRect();
    const css=document.getElementById('v456-compact-measure-summary');
    const manual=document.querySelector('[data-ratio-for="measureLoss"] .ratio-manual-input');
    return {display:getComputedStyle(box).display,cols:getComputedStyle(box).gridTemplateColumns,box:{x:r.x,y:r.y,w:r.width,h:r.height},items,styleInDocument:!!css,manual:!!manual,manualHeight:manual?.getBoundingClientRect().height??0,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   console.log('V458 measurement layout',w,JSON.stringify(metrics));
   assert.ok(metrics.styleInDocument,'compact CSS tag exists');
   assert.equal(metrics.display,'grid','area summary must be CSS grid');
   assert.equal(metrics.items.length,3);
   assert.ok(Math.max(...metrics.items.map(x=>x.y))-Math.min(...metrics.items.map(x=>x.y))<=2,'three summary entries must be on the SAME row');
   assert.ok(metrics.box.h>=50&&metrics.box.h<=65,'V459 must reduce blank vertical space while retaining visible content: '+JSON.stringify(metrics.box));
   assert.ok(metrics.manual&&metrics.manualHeight>=28,'loss percent input remains usable at original height');
   assert.ok(metrics.items.every(x=>x.x>=metrics.box.x-2&&x.x+x.w<=metrics.box.x+metrics.box.w+2),'no horizontal overflow');
   assert.ok(metrics.scrollWidth<=metrics.viewport+2,'no viewport horizontal overflow');
   await page.close();
  }
  console.log('PASS: V459 compact height and one-row measurement card geometry verified on six viewports');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});