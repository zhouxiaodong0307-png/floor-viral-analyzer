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
   const headings=await page.evaluate(()=>[...document.querySelectorAll('#quote .measure-card-v273 .measure-summary > .measure-summary-line, #quote .measure-card-v273 .measure-summary > .measure-loss-line')].map(cell=>{
     const el=cell.querySelector(':scope > span');
     const cs=getComputedStyle(el),r=el.getBoundingClientRect();
     return {text:el.textContent.trim(),top:r.top,bottom:r.bottom,fontSize:cs.fontSize,fontWeight:cs.fontWeight,lineHeight:cs.lineHeight,fontFamily:cs.fontFamily,letterSpacing:cs.letterSpacing};
   }));
   assert.deepEqual(headings.map(h=>h.text),['实际面积','损耗','损耗面积'],'three heading labels unchanged');
   assert.ok(Math.max(...headings.map(h=>h.top))-Math.min(...headings.map(h=>h.top))<=1,'all heading text top edges aligned: '+JSON.stringify(headings));
   for(const key of ['fontSize','fontWeight','lineHeight','fontFamily','letterSpacing'])assert.equal(new Set(headings.map(h=>h[key])).size,1,'all headings must share '+key+': '+JSON.stringify(headings));

   assert.ok(metrics.items.every(x=>x.x>=metrics.box.x-2&&x.x+x.w<=metrics.box.x+metrics.box.w+2),'no horizontal overflow');
   assert.ok(metrics.scrollWidth<=metrics.viewport+2,'no viewport horizontal overflow');
   if (w===390) {
    const cases=await page.evaluate(()=>{
     const rows=document.getElementById('measureRows'),rate=document.getElementById('measureLoss');
     const result=[];
     for(const [expr,percent] of [['500×300',5],['500×300',10],['325×555',5],['500×300',0]]){
       rows.innerHTML='<div class="measure-row" data-floor="1楼"><input class="mexpr"><span class="measure-area"></span></div>';
       rows.querySelector('.mexpr').value=expr;rate.value=String(percent);
       calcMeasures();
       result.push({bill:document.getElementById('measureBill')?.textContent,
          visible:getComputedStyle(document.getElementById('measureBill')).display!=='none',
          label:document.querySelector('.measure-bill-line > span')?.textContent,
          actual:document.getElementById('measureTotal')?.textContent});
     }
     return result;
    });
    assert.deepEqual(cases,[
      {bill:'16㎡',visible:true,label:'损耗面积',actual:'15.00㎡'},
      {bill:'17㎡',visible:true,label:'损耗面积',actual:'15.00㎡'},
      {bill:'19㎡',visible:true,label:'损耗面积',actual:'18.04㎡'},
      {bill:'15㎡',visible:true,label:'损耗面积',actual:'15.00㎡'}
    ],'V461 label-only change must preserve original billed area values, visible under 损耗面积 label');
   }

   await page.close();
  }
  console.log('PASS: V459 compact height and one-row measurement card geometry verified on six viewports');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});