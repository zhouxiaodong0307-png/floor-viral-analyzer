const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const version=JSON.parse(fs.readFileSync('floor-assistant-v285/version.json','utf8')).version;
 assert.equal(version,'473','V473 version metadata');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[320,690],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1366,900]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<=1024,isMobile:width<=430});
   const page=await context.newPage();
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof calc==='function'&&typeof syncPaymentMode==='function'&&document.querySelector('[data-ratio-for="depositRate"] .ratio-manual-input'));
   const data=await page.evaluate(()=>{
    show('quote');
    const $=id=>document.getElementById(id);
    const metric=(node)=>{
     const c=getComputedStyle(node),r=node.getBoundingClientRect();
     const props=['fontFamily','fontSize','fontWeight','fontStyle','letterSpacing','lineHeight','color','backgroundColor','borderRadius','borderTopWidth','borderTopColor','boxShadow','opacity','textAlign'];
     return {css:Object.fromEntries(props.map(x=>[x,c[x]])),rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}};
    };
    const snapshot=(mode)=>{
     $('paymentMode').value=mode;syncPaymentMode(false);
     $('finalTotal').value='10000';const q=calc();
     const panel=$(mode==='normal'?'normalPaymentRows':'stagePaymentRows');
     const rows=[...panel.querySelectorAll(':scope > .row.quote-stage-row')];
     const ratios=rows.map(el=>el.querySelector('.ratio-manual,.quote-auto-remain'));
     const labels=rows.map(el=>el.querySelector('.quote-stage-head span'));
     const amounts=rows.map(el=>el.querySelector('.quote-stage-head b'));
     const pane=panel.getBoundingClientRect();
     return {mode:q.paymentMode,quotes:{deposit:q.deposit,remain:q.remain,stage1:q.stage1Amount,stage2:q.stage2Amount,stage3:q.stage3Amount},
      rows:rows.map(metric),labels:labels.map(metric),amounts:amounts.map(metric),
      badges:ratios.map(metric),badgeText:ratios.map(el=>el.dataset.ratioText||el.textContent.trim()),
      visible:getComputedStyle(panel).display,
      overflow:rows.some(el=>el.scrollWidth>el.clientWidth+1),
      grid: getComputedStyle(panel).gridTemplateColumns.split(' ').length,
      within:ratios.every(el=>{const r=el.getBoundingClientRect();return r.x>=pane.x-2&&r.right<=pane.right+2})};
    };
    const normal=snapshot('normal'),stage=snapshot('staged');
    $('paymentMode').value='normal';syncPaymentMode(false);calc();
    const normalInput=document.querySelector('[data-ratio-for="depositRate"] .ratio-manual-input');
    normalInput.value='35';normalInput.dispatchEvent(new Event('input',{bubbles:true}));const changed=calc();
    const edited={deposit:changed.deposit,remain:changed.remain,remainingText:$('normalRemainRate').textContent,
      percent:Number($('depositRate').value)};
    normalInput.focus();
    const editFont=getComputedStyle(normalInput).fontSize;
    const editPseudo=getComputedStyle(normalInput.closest('.ratio-manual'),'::after').display;
    normalInput.blur();
    $('paymentMode').value='staged';syncPaymentMode(false);calc();
    const stageInput=document.querySelector('[data-ratio-for="stage1Rate"] .ratio-manual-input');
    stageInput.focus();
    const stageEditFont=getComputedStyle(stageInput).fontSize;
    const stageEditPseudo=getComputedStyle(stageInput.closest('.ratio-manual'),'::after').display;
    stageInput.blur();
    return {version:document.querySelector('meta[name="app-version"]')?.content,normal,stage,
      edited,editFont,editPseudo,stageEditFont,stageEditPseudo,bodyWidth:document.documentElement.scrollWidth,view:innerWidth};
   });
   assert.equal(data.version,'V473');
   assert.equal(data.normal.mode,'normal');assert.equal(data.stage.mode,'staged');
   assert.equal(data.normal.visible,'grid');assert.equal(data.stage.visible,'grid');
   assert.equal(data.normal.grid,2);assert.equal(data.stage.grid,3);
   assert.deepEqual(data.normal.quotes,{deposit:5000,remain:5000,stage1:5000,stage2:4000,stage3:1000});
   assert.deepEqual(data.stage.quotes,{deposit:5000,remain:5000,stage1:5000,stage2:4000,stage3:1000});
   assert.deepEqual(data.normal.badgeText,['50%','50%']);assert.deepEqual(data.stage.badgeText,['50%','40%','10%']);
   assert.equal(data.normal.rows.length,2);assert.equal(data.stage.rows.length,3);
   for(const x of ['normal','stage']){
    const t=data[x],eq=(a,b,label)=>assert.deepEqual(a.css,b.css,x+' '+label+' parity at '+width);
    assert.ok(t.within&&!t.overflow,x+' ratios/labels fit '+width);
    t.labels.slice(1).forEach(el=>eq(el,t.labels[0],'labels'));
    t.amounts.slice(1).forEach(el=>eq(el,t.amounts[0],'amounts'));
    t.badges.slice(1).forEach(el=>eq(el,t.badges[0],'badges'));
    for(let j=1;j<t.rows.length;j++)assert.ok(Math.abs(t.rows[j].rect.y-t.rows[0].rect.y)<=1,x+' all rows on one line '+width);
    for(let j=1;j<t.rows.length;j++)assert.ok(Math.abs(t.rows[j].rect.width-t.rows[0].rect.width)<=2,x+' equal columns '+width);
   }
   assert.deepEqual(data.normal.labels[0].css,data.stage.labels[0].css,'same label typography in both modes '+width);
   assert.deepEqual(data.normal.amounts[0].css,data.stage.amounts[0].css,'same amount typography in both modes '+width);
   assert.deepEqual(data.normal.badges[0].css,data.stage.badges[0].css,'same badge appearance in both modes '+width);
   for(const el of [...data.normal.badges,...data.stage.badges]){
    assert.ok(Math.abs(el.rect.width-data.stage.badges[0].rect.width)<=1,'badge pixel width equal '+width);
    assert.ok(Math.abs(el.rect.height-data.stage.badges[0].rect.height)<=1,'badge pixel height equal '+width);
   }
   assert.deepEqual(data.edited,{deposit:3500,remain:6500,remainingText:'65%',percent:35},'editable deposit and automatic balance unchanged');
   assert.equal(data.editFont,'16px','iOS manual input does not trigger Safari focus zoom');
   assert.equal(data.stageEditFont,'16px','stage manual input does not trigger Safari focus zoom');
   assert.equal(data.editPseudo,'none','focused normal manual input is visible');
   assert.equal(data.stageEditPseudo,'none','focused stage manual input is visible');
   assert.ok(data.bodyWidth<=data.view+2,'no viewport overflow at '+width);
   console.log('V473 visual parity',width+'x'+height,
    JSON.stringify({badgeWidth:Math.round(data.normal.badges[0].rect.width),badgeHeight:Math.round(data.normal.badges[0].rect.height),
      font:data.normal.badges[0].css.fontSize,modeCount:[data.normal.grid,data.stage.grid]}));
   await context.close();
  }
  console.log('PASS V473: common payment typography/card geometry, editor focus, rate math and 7 viewports');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
