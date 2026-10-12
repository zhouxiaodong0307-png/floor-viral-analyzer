'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [w,h,label] of [[390,844,'phone'],[820,1180,'iPad portrait'],[1180,820,'iPad landscape'],[1366,1024,'iPad Pro landscape'],[1440,900,'desktop']]){
   const context=await browser.newContext({viewport:{width:w,height:h},isMobile:false,hasTouch:label!=='desktop',deviceScaleFactor:2,locale:'zh-CN'});
   const page=await context.newPage();
   const errs=[];page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.dismiss());
   try{
    await page.goto('https://muye-guan-jia-migration-test.onrender.com/',{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>typeof calcMeasures==='function'&&typeof calc==='function');
    const state=await page.evaluate(()=>{
      const slider=document.getElementById('depositRate'),loss=document.getElementById('measureLoss');
      const metrics=(x)=>{const r=x.getBoundingClientRect();return {width:r.width,left:r.left,height:r.height}};
      return {deposit:metrics(slider),loss:metrics(loss),parent:metrics(slider.closest('.ratio-control')),value:slider.value};
    });
    if(w>=700&&w<=1400&&label!=='desktop')assert.ok(state.deposit.width>=Math.max(250,w*.36),label+' deposit track too short '+JSON.stringify(state));
    const track=async(id,values)=>{
      const result=await page.evaluate(({id,values})=>{
        const el=document.getElementById(id),rect=el.getBoundingClientRect();
        const pts=values.map(v=>rect.left+11+(rect.width-22)*v);
        const fire=(type,x)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:32,pointerType:'touch',isPrimary:true,clientX:x,clientY:rect.top+rect.height/2,buttons:type==='pointerup'?0:1}));
        fire('pointerdown',pts[0]);const observed=[];
        for(const p of pts.slice(1)){fire('pointermove',p);observed.push(Number(el.value))}
        fire('pointerup',pts.at(-1));
        return observed;
      },{id,values});
      return result;
    };
    let loss=await track('measureLoss',[0,.25,.5,.75,1]);
    assert.deepEqual(loss,[5,10,15,20],label+' loss finger tracking '+loss);
    // V385: loss uses 0.1%, not coarse 1% snapping. Preserve the exact manual editor value.
    const fine=await track('measureLoss',[0,.257,.263]);
    assert.deepEqual(fine,[5.1,5.3],label+' loss fine-grained thumb tracking '+fine);
    await page.waitForTimeout(350);
    const persistence=await page.evaluate(()=>{
      const range=document.getElementById('measureLoss'),manual=document.querySelector('[data-ratio-for="measureLoss"] .ratio-manual-input');
      const snapshot=JSON.parse(localStorage.getItem('floor_last_quote_state_v1')||'{}');
      return {step:range.step,range:range.value,manual:manual?.value,saved:snapshot.fields?.measureLoss};
    });
    assert.deepEqual(persistence,{step:'0.1',range:'5.3',manual:'5.3',saved:'5.3'},label+' loss editor and autosave '+JSON.stringify(persistence));
    let deposit=await track('depositRate',[0,.25,.5,.75,1]);
    assert.deepEqual(deposit,[25,50,75,100],label+' deposit finger tracking '+deposit);
    assert.ok(!errs.some(x=>/SyntaxError|TypeError|ReferenceError/.test(x)),label+' errors '+errs.join('|'));
    console.log('PASS',label,'deposit-width',state.deposit.width.toFixed(1),'loss',loss,'deposit',deposit);
   }finally{await context.close()}
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('FAIL V384',e);process.exitCode=1});
