const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const version=JSON.parse(fs.readFileSync('floor-assistant-v285/version.json','utf8')).version;
 assert.equal(version,'475');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[320,690],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1366,900]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<=1024,isMobile:width<=430});
   const page=await context.newPage();
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof calcMeasures==='function' && typeof syncAllRatioValues==='function' && document.querySelector('[data-ratio-for="measureLoss"].ratio-manual'));
   const result=await page.evaluate(()=>{
    show('quote');
    const $=id=>document.getElementById(id);
    $('finalTotal').value='10000';
    const lossBadge=document.querySelector('#quote .measure-summary .measure-loss-line [data-ratio-for="measureLoss"].ratio-manual');
    const lossLine=lossBadge.closest('.measure-loss-line');
    const measureSummary=document.querySelector('#quote .measure-card-v273 .measure-summary');
    const get=el=>{
     const s=getComputedStyle(el),r=el.getBoundingClientRect();
     const text=(el.dataset.ratioText||el.textContent||'').trim();
     const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
     ctx.font=s.fontWeight+' '+s.fontSize+' '+s.fontFamily;
     return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,w:r.width,h:r.height,text,
      font:s.fontSize,weight:s.fontWeight,bg:s.backgroundColor,stroke:s.borderTopColor,radius:s.borderTopLeftRadius,
      textWidth:ctx.measureText(text).width,
      transition:s.transitionDuration};
    };
    const topRead=()=>{
      const r=get(lossBadge),parent=get(lossLine),summary=get(measureSummary);
      const label=lossLine.querySelector('span:first-child').getBoundingClientRect();
      return {r,parent,summary,label:{bottom:label.bottom,top:label.top},
       focusFont:getComputedStyle(lossBadge.querySelector('.ratio-manual-input')).fontSize};
    };
    $('measureLoss').value='13';syncRatioValue($('measureLoss'));calcMeasures();const thirteen=topRead();
    $('measureLoss').value='100';syncRatioValue($('measureLoss'));calcMeasures();const hundred=topRead();
    $('measureLoss').value='13';syncRatioValue($('measureLoss'));calcMeasures();
    const panelRead=mode=>{
      $('paymentMode').value=mode;syncPaymentMode(false);
      const q=calc(),panel=$(mode==='normal'?'normalPaymentRows':'stagePaymentRows');
      const rows=[...panel.querySelectorAll(':scope > .quote-stage-row')];
      const badges=rows.map(r=>r.querySelector('.ratio-manual,.quote-auto-remain'));
      const results=badges.map(get);
      const rect=panel.getBoundingClientRect();
      return {badges:results,rect:{left:rect.left,right:rect.right},columns:getComputedStyle(panel).gridTemplateColumns.split(' ').length,
       sum:q.stageRateTotal,amounts:[q.deposit,q.remain,q.stage1Amount,q.stage2Amount,q.stage3Amount],
       focusFont:getComputedStyle(badges[0].querySelector('.ratio-manual-input')).fontSize};
    };
    const staged=panelRead('staged');
    const normal=panelRead('normal');
    $('depositRate').value='100';syncRatioValue($('depositRate'));calc();
    const normal100=get(document.querySelector('[data-ratio-for="depositRate"].ratio-manual'));
    $('depositRate').value='50';syncRatioValue($('depositRate'));calc();
    $('paymentMode').value='staged';syncPaymentMode(false);
    const inStage=$('stage1Rate');inStage.value='100';syncRatioValue(inStage);calc();
    const stage100=get(document.querySelector('[data-ratio-for="stage1Rate"].ratio-manual'));
    inStage.value='50';syncRatioValue(inStage);calc();
    return {version:document.querySelector('meta[name="app-version"]')?.content,thirteen,hundred,
      staged,normal,normal100,stage100,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   assert.equal(result.version,'V475');
   const {thirteen,hundred,staged,normal}=result;
   for(const x of [thirteen,hundred]){
    assert.equal(x.r.h,30,'compact loss card height');
    assert.ok(x.r.w>=54 && x.r.w<=84,'loss width fits text');
    assert.ok(x.r.x>=x.parent.x-1&&x.r.right<=x.parent.right+1,'loss card stays inside middle column');
    assert.ok(x.r.y>=x.label.bottom-2,'label and loss ratio do not overlap');
    assert.ok(x.r.textWidth+10<=x.r.w,'loss text and edge must have breathing room');
    assert.equal(x.focusFont,'16px','iOS edit input readable without zoom');
    assert.equal(x.r.bg,'rgb(18, 18, 18)');
   }
   assert.equal(thirteen.r.text,'13%');assert.equal(hundred.r.text,'100%');
   assert.deepEqual(staged.badges.map(x=>x.text),['50%','40%','10%']);
   assert.deepEqual(normal.badges.map(x=>x.text),['50%','50%']);
   assert.equal(staged.columns,3);assert.equal(normal.columns,2);
   for(const p of [staged,normal]){
    assert.ok(p.badges.every(x=>x.h===32&&x.w>=60&&x.w<=84),'compact payment cards');
    assert.ok(p.badges.every(x=>x.x>=p.rect.left-1&&x.right<=p.rect.right+1),'payment card within grid');
    assert.ok(p.badges.every(x=>x.textWidth+10<=x.w),'no clipped percent text');
    assert.ok(p.badges.every(x=>x.font===thirteen.r.font && x.weight==='400'),'unified typography');
    assert.ok(p.badges.every(x=>x.bg===thirteen.r.bg&&x.stroke===thirteen.r.stroke&&x.radius===thirteen.r.radius),'unified colors and corners');
    assert.equal(p.focusFont,'16px');
    assert.deepEqual(p.amounts,[5000,5000,5000,4000,1000]);
   }
   for(const p of [result.normal100,result.stage100]){
    assert.equal(p.text,'100%');assert.ok(p.textWidth+10<=p.w,'100% text fits naturally');
    assert.ok(p.w>=60 && p.w<=84,'100% card stays compact');
   }
   assert.ok(result.documentWidth<=result.viewport+2,'no viewport-wide scroll');
   console.log('V475 compact cards',width+'x'+height,JSON.stringify({loss:[thirteen.r.w,thirteen.r.h],payment:[normal.badges[0].w,normal.badges[0].h],fullRateWidth:result.normal100.w}));
   await context.close();
  }
  console.log('PASS V475: compact loss+payments typography, text margins, 7 viewports, intact money math');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
