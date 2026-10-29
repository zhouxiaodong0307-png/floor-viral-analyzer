const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [w,h,touch] of [[320,690,true],[375,812,true],[390,844,true],[430,932,true],[768,1024,true],[1024,768,true],[1366,900,false]]){
   const context=await browser.newContext({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch,deviceScaleFactor:2});
   const page=await context.newPage();
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.muyeNumericKeyboardStatusV403);
   const ver=await page.locator('meta[name="app-version"]').getAttribute('content');
   assert.equal(ver,'V466');

   async function exercise(selector,label){
    const input=page.locator(selector);
    await input.waitFor({state:'visible',timeout:6000});
    await input.scrollIntoViewIfNeeded({timeout:6000});
    await input.fill('800');
    await page.evaluate(sel=>{
     const el=document.querySelector(sel); window.__multiplierFocusLoss=0;
     el.addEventListener('blur',()=>{window.__multiplierFocusLoss++},{once:false});
    },selector);
    const button=page.locator(selector).locator('xpath=..').locator('button.muye-spec-x');
    await button.waitFor({state:'visible'});
    // The first tap must not transfer focus to the button and dismiss iPhone numeric keypad.
    if(touch)await button.tap();else await button.click();
    let d=await page.evaluate(sel=>{
     const el=document.querySelector(sel);
     return {value:el.value,focused:document.activeElement===el,blurs:window.__multiplierFocusLoss,buttonCount:el.parentElement.querySelectorAll('button.muye-spec-x').length};
    },selector);
    assert.equal(d.value,'800×',label+' first multiplication sign inserted once '+JSON.stringify(d));
    assert.equal(d.focused,true,label+' keyboard focus must persist after × '+JSON.stringify(d));
    assert.equal(d.blurs,0,label+' field must not blur after × '+JSON.stringify(d));
    assert.equal(d.buttonCount,1,label+' button must not be duplicated');
    await page.keyboard.type('200');
    d=await page.evaluate(sel=>({value:document.querySelector(sel).value,focused:document.activeElement===document.querySelector(sel)}),selector);
    assert.deepEqual(d,{value:'800×200',focused:true},label+' can immediately type next dimension');
    if(touch)await button.tap();else await button.click();
    await page.keyboard.type('18');
    d=await page.evaluate(sel=>({value:document.querySelector(sel).value,focused:document.activeElement===document.querySelector(sel),blurs:window.__multiplierFocusLoss}),selector);
    assert.deepEqual(d,{value:'800×200×18',focused:true,blurs:0},label+' repeated × and typing must remain uninterrupted');
    const row=await button.boundingBox(),field=await input.boundingBox();
    assert.ok(row.x>=field.x&&row.x+row.width<=field.x+field.width+4,label+' × stays within original input width');
   }

   // ②地板 is intentionally collapsed by default; expand it as a real user would.
   await page.evaluate(()=>{
     const quote=document.getElementById('quote');
     quote.classList.remove('hide');
     const toggle=quote.querySelector('.quote-entry-shell-toggle');
     const shell=quote.querySelector('.quote-entry-shell');
     if(shell?.classList.contains('is-collapsed')&&toggle)toggle.click();
     else shell?.classList.remove('is-collapsed');
   });
   await page.waitForSelector('#spec',{state:'visible',timeout:6000});
   await exercise('#spec','main quote');
   // Use the actual manual order row rather than a synthetic field.
   await page.evaluate(()=>{
    document.querySelector('#quote').classList.add('hide');
    const el=document.querySelector('#orders');
    el.classList.remove('hide');el.style.setProperty('display','block','important');
    document.body.classList.add('internal-visible');
    if(!document.querySelector('#orderProductRows [data-field="spec"]'))window.addOrderProductRow();
   });
   await page.waitForFunction(()=>!!document.querySelector('#orderProductRows input[data-field="spec"]')?.parentElement.querySelector('button.muye-spec-x'));
   await exercise('#orderProductRows [data-field="spec"]','manual order');
   await page.evaluate(()=>{
    window.addOrderProductRow();
    window.addEditProductRow();
   });
   await page.waitForFunction(()=>document.querySelectorAll('#orderProductRows button.muye-spec-x').length>=2&&!!document.querySelector('#editProductRows button.muye-spec-x'));
   const coverage=await page.evaluate(()=>{
    const specInputs=[...document.querySelectorAll('input#spec,input#aqSpec,input#cSpec,input#pSpec,input#costSpec,input#installEditSpec,input[data-field="spec"]')].filter(el=>el.closest('.app'));
    return {total:specInputs.length,enhanced:specInputs.filter(el=>el.classList.contains('muye-spec-numeric')&&el.parentElement.querySelectorAll('button.muye-spec-x').length===1).length};
   });
   assert.equal(coverage.total,coverage.enhanced,'global dynamic spec buttons consistently enhanced');
   console.log('V466 keyboard focus',w+'x'+h,JSON.stringify(coverage));
   await page.close();await context.close();
  }
  console.log('PASS: V466 mobile tap and desktop click retain focus for consecutive 800×200×18; all specification fields and dynamically added order/edit cards covered; 7 viewports');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
