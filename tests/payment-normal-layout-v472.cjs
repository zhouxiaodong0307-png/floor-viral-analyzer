const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const version=JSON.parse(fs.readFileSync('floor-assistant-v285/version.json','utf8')).version;
 try{
  for(const [width,height] of [[320,690],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1366,900]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<=1024,isMobile:width<=430});
   const page=await context.newPage();
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof calc==='function'&&typeof syncPaymentMode==='function'&&document.querySelector('[data-ratio-for="depositRate"] .ratio-manual-input'));
   const result=await page.evaluate(()=>{
    show('quote');
    const $=id=>document.getElementById(id);
    const r=(mode,rate=50)=>{
      $('paymentMode').value=mode;syncPaymentMode(false);
      $('depositRate').value=rate;syncRatioValue($('depositRate'));syncAllRatioValues();
      $('finalTotal').value='10000';
      const v=calc();
      const panel=$(mode==='normal'?'normalPaymentRows':'stagePaymentRows');
      const rowEls=[...panel.querySelectorAll(':scope > .row.quote-stage-row')];
      const bounds=rowEls.map(el=>{const q=el.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height,right:q.right}});
      const pane=panel.getBoundingClientRect();
      const b=mode==='normal'?['deposit','remain']:['stage1Amount','stage2Amount','stage3Amount'];
      return {mode: v.paymentMode,panels:{
        normal:getComputedStyle($('normalPaymentRows')).display,
        staged:getComputedStyle($('stagePaymentRows')).display
       },rows:rowEls.length,rects:bounds,container:{x:pane.x,w:pane.width,h:pane.height,right:pane.right},
       amounts:b.map(id=>$(id).textContent),
       quoteAmounts:{deposit:v.deposit,remain:v.remain,stage1:v.stage1Amount,stage2:v.stage2Amount,stage3:v.stage3Amount},
       labels:rowEls.map(el=>el.querySelector('.quote-stage-head span')?.textContent),
       ratios:rowEls.map(el=>el.querySelector('.ratio-manual-input')?.value||el.querySelector('.quote-auto-remain')?.textContent),
       overflow:rowEls.map(el=>el.scrollWidth>el.clientWidth+1),
       autoRatio:$('normalRemainRate').textContent,
       depositPercentage:document.querySelector('[data-ratio-for="depositRate"] .ratio-manual-input')?.value,
       normalHeight:$('normalPaymentRows').getBoundingClientRect().height,
       controlCount:rowEls.map(el=>el.querySelectorAll('.ratio-manual-input').length)
      };
    };
    const normal=r('normal',50);
    const doc=document.querySelector('#quote .result.quote-result-card');
    const cardWidth=doc.getBoundingClientRect().width,bodyWidth=document.documentElement.scrollWidth,view=innerWidth;
    const layoutCss=getComputedStyle($('normalPaymentRows')).gridTemplateColumns;
    const editable=document.querySelector('[data-ratio-for="depositRate"] .ratio-manual-input');
    editable.value='35';editable.dispatchEvent(new Event('input',{bubbles:true}));
    const edited={amount:[$('deposit').textContent,$('remain').textContent],ratio:$('normalRemainRate').textContent,percent:editable.value,
      rate:Number($('depositRate').value),paymentMode:$('paymentMode').value};
    const staged=r('staged',35);
    // Switch back and verify editable normal-mode percentage hasn't been reset.
    const normalAgain=r('normal',35);
    // Restore staged default for the following browser session, without persisting changes.
    $('paymentMode').value='staged';syncPaymentMode(false);
    return {version:document.querySelector('meta[name="app-version"]')?.content,normal,edited,staged,normalAgain,
      cardWidth,bodyWidth,view,layoutCss,defaultMode:'staged'};
   });
   assert.equal(result.version,'V'+version);
   const a=result.normal,b=result.staged,edited=result.edited;
   assert.equal(a.mode,'normal');
   assert.equal(a.panels.normal,'grid');
   assert.equal(a.panels.staged,'none');
   assert.equal(a.rows,2);
   assert.deepEqual(a.labels,['定金','余款'],'normal mode uses same two stage-style titles');
   assert.deepEqual(a.ratios,['50','50%'],'one editable, one automatic amount');
   assert.deepEqual(a.controlCount,[1,0],'only deposit fraction is editable');
   assert.deepEqual(a.amounts,['¥5,000','¥5,000']);
   assert.deepEqual([a.quoteAmounts.deposit,a.quoteAmounts.remain],[5000,5000]);
   assert.ok(a.rects.every(x=>x.x>=a.container.x-2&&x.right<=a.container.right+2),'tiles remain inside grid at '+width);
   assert.ok(Math.abs(a.rects[0].y-a.rects[1].y)<2,'two tiles must share one line');
   assert.ok(Math.abs(a.rects[0].w-a.rects[1].w)<2,'two equal columns');
   assert.ok(a.overflow.every(x=>!x),'no text clipping inside normal tiles at '+width);
   assert.equal(a.autoRatio,'50%');
   assert.deepEqual(edited,{amount:['¥3,500','¥6,500'],ratio:'65%',percent:'35',rate:35,paymentMode:'normal'});
   assert.equal(b.mode,'staged');
   assert.equal(b.panels.normal,'none');
   assert.equal(b.panels.staged,'grid');
   assert.equal(b.rows,3);
   assert.deepEqual(b.amounts,['¥5,000','¥4,000','¥1,000']);
   assert.deepEqual(b.ratios,['50','40','10']);
   assert.deepEqual([b.quoteAmounts.stage1,b.quoteAmounts.stage2,b.quoteAmounts.stage3],[5000,4000,1000]);
   assert.deepEqual(result.normalAgain.amounts,['¥3,500','¥6,500'],'mode toggle preserves manual fraction');
   assert.equal(result.normalAgain.autoRatio,'65%');
   assert.ok(result.layoutCss.split(' ').length===2,'two layout columns detected at '+width);
   assert.ok(result.bodyWidth<=result.view+2,'no screen-wide horizontal overflow');
   console.log('V472 normal-payment layout',width+'x'+height,JSON.stringify({widths:a.rects.map(x=>Math.round(x.w)),heights:a.rects.map(x=>Math.round(x.h)),amounts:a.amounts,remaining:edited.ratio,stage:b.amounts}));
   await context.close();
  }
  console.log('PASS V472: normal deposit+balance visually matches staged payment in 2 equal horizontal tiles, editable deposit rate, computed remainder rate, 7 viewports, no quote math change.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
