const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');

(async()=>{
 const version=JSON.parse(fs.readFileSync('floor-assistant-v285/version.json','utf8')).version;
 assert.equal(version,'474');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[320,690],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1366,900]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<=1024,isMobile:width<=430});
   const page=await context.newPage();
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof calc==='function'&&typeof syncPaymentMode==='function'&&document.querySelector('[data-ratio-for="depositRate"] .ratio-manual-input'));
   const result=await page.evaluate(()=>{
    show('quote');const $=id=>document.getElementById(id);
    $('finalTotal').value='10000';
    const styles=el=>{
     const s=getComputedStyle(el),r=el.getBoundingClientRect();
     return {width:r.width,height:r.height,font:s.fontSize,fontWeight:s.fontWeight,
       border:s.borderTopWidth,borderColor:s.borderTopColor,borderRadius:s.borderTopLeftRadius,
       background:s.backgroundColor,shadow:s.boxShadow,opacity:s.opacity,foreground:s.color};
    };
    function read(mode){
     $('paymentMode').value=mode;syncPaymentMode(false);const q=calc();
     const root=$(mode==='staged'?'stagePaymentRows':'normalPaymentRows');
     const badges=[...root.querySelectorAll(':scope > .quote-stage-row')].map(row=>row.querySelector('.ratio-manual,.quote-auto-remain'));
     const numbers=[...root.querySelectorAll('.quote-stage-head b')].map(el=>getComputedStyle(el).fontSize);
     const pseudo=badges.filter(x=>x.classList.contains('ratio-manual')).map(x=>({
       weight:getComputedStyle(x,'::after').fontWeight,font:getComputedStyle(x,'::after').fontSize,
       text:getComputedStyle(x,'::after').content
     }));
     return {mode:q.paymentMode,counts:badges.length,styles:badges.map(styles),pseudo,
       numbers,values:badges.map(x=>x.dataset.ratioText||x.textContent.trim()),
       amounts:[q.deposit,q.remain,q.stage1Amount,q.stage2Amount,q.stage3Amount],
       overflow:badges.some(x=>x.getBoundingClientRect().width>x.closest('.quote-stage-row').getBoundingClientRect().width+1)};
    }
    const staged=read('staged'),normal=read('normal');
    const inp=document.querySelector('[data-ratio-for="depositRate"] .ratio-manual-input');
    inp.value='35';inp.dispatchEvent(new Event('input',{bubbles:true}));
    const q=calc();
    const edit={deposit:q.deposit,remain:q.remain,remainRate:$('normalRemainRate').textContent};
    inp.focus();const focus={font:getComputedStyle(inp).fontSize,pseudo:getComputedStyle(inp.closest('.ratio-manual'),'::after').display};
    inp.blur();
    return {version:document.querySelector('meta[name="app-version"]')?.content,staged,normal,edit,focus,scroll:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   assert.equal(result.version,'V474');assert.equal(result.staged.counts,3);assert.equal(result.normal.counts,2);
   assert.deepEqual(result.staged.values,['50%','40%','10%']);
   assert.deepEqual(result.normal.values,['50%','50%']);
   assert.deepEqual(result.staged.amounts,[5000,5000,5000,4000,1000]);
   assert.deepEqual(result.normal.amounts,[5000,5000,5000,4000,1000]);
   const entries=[...result.staged.styles,...result.normal.styles];
   for(const x of entries){
    assert.equal(x.fontWeight,'400','refined ratio labels must be regular weight');
    assert.equal(x.background,'rgb(18, 18, 18)','reference 1 black badge fill');
    assert.equal(x.borderColor,'rgb(74, 74, 74)','reference 1 precise grey outline');
    assert.equal(x.border,'1.5px','refined thin border');
    assert.equal(x.shadow,'none','no heavy shadows');
    assert.equal(x.opacity,'1','readability preserved');
    assert.equal(x.borderRadius,'10px','refined not-pill corner radius');
    assert.equal(x.width,entries[0].width,'exact same badge width both modes');
    assert.equal(x.height,entries[0].height,'exact same badge height both modes');
    assert.equal(x.font,entries[0].font,'same ratio typography both modes');
   }
   for(const x of [...result.staged.pseudo,...result.normal.pseudo])assert.equal(x.weight,'400');
   assert.deepEqual(result.edit,{deposit:3500,remain:6500,remainRate:'65%'});
   assert.equal(result.focus.font,'16px','iOS percent input avoids focus zoom');
   assert.equal(result.focus.pseudo,'none','focused manual rate visible');
   assert.ok(!result.staged.overflow&&!result.normal.overflow);
   assert.ok(result.scroll<=result.viewport+2,'no horizontal overflow');
   console.log('V474 fine-line visual parity',width+'x'+height,JSON.stringify({bg:entries[0].background,stroke:entries[0].borderColor,weight:entries[0].fontWeight,badge:[entries[0].width,entries[0].height]}));
   await context.close();
  }
  console.log('PASS V474: image-1 refined badges, seven viewports, two payment modes, no calculation regression.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
