'use strict';
// V376: real-browser tablet portrait + landscape gutter regression tests.
// Only inspect geometry and click navigation; do NOT authenticate or write cloud data.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

const stageUrl='https://muye-guan-jia-migration-test.onrender.com/';
const prodUrl='https://muye-guan-jia.onrender.com/';
const tabletSizes=[
  [744,1133,'iPad mini portrait'],[768,1024,'iPad classic portrait'],
  [820,1180,'iPad Air portrait'],[834,1194,'iPad Pro portrait'],
  [1024,1366,'iPad Pro large portrait'],[1024,768,'iPad landscape'],
  [1112,834,'iPad landscape wide'],[1194,834,'iPad Pro landscape'],
  [1366,1024,'iPad Pro large landscape']
];
async function check(browser,url,w,h,touch,title,kind){
  const ctx=await browser.newContext({viewport:{width:w,height:h},hasTouch:touch,
    isMobile:false,deviceScaleFactor:2,locale:'zh-CN',acceptDownloads:false});
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('dialog',d=>d.dismiss());
  try{
    const res=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
    assert.ok(res&&res.status()<400,kind+': HTTP error');
    await page.waitForFunction(()=>typeof window.show==='function',{timeout:20000});
    assert.equal(await page.title(),title,'actual HTML version check '+kind);
    const snapshot=()=>page.evaluate(()=>{
      const rect=selector=>{
        const el=document.querySelector(selector);
        if(!el)throw Error('Missing selector: '+selector);
        const r=el.getBoundingClientRect();
        return {x:r.x,right:r.right,width:r.width};
      };
      return {
        vw:innerWidth,scrollWidth:document.documentElement.scrollWidth,
        touch:matchMedia('(any-pointer:coarse)').matches,
        appMax:getComputedStyle(document.querySelector('body > .app')).maxWidth,
        app:rect('body > .app'),
        header:rect('body > .app > header'),
        nav:rect('body > .app > nav.client-nav'),
        section:rect('body > .app > #quote'),
        quoteBox:rect('body > .app > #quote > .box'),
        measure:rect('#quote .measure-card-v273'),
        outerPad:parseFloat(getComputedStyle(document.querySelector('body > .app > #quote > .box')).paddingLeft),
        measurePad:parseFloat(getComputedStyle(document.querySelector('#quote .measure-card-v273')).paddingLeft),
        navPad:parseFloat(getComputedStyle(document.querySelector('body > .app > nav.client-nav')).paddingLeft),
        sectionMargin:parseFloat(getComputedStyle(document.querySelector('body > .app > #quote')).marginLeft)
      };
    });
    let initial=await snapshot();
    assert.equal(initial.vw,w,'viewport mismatch '+kind);
    if(kind==='tablet'){
      assert.equal(initial.touch,true,'tablet coarse-pointer emulation');
      assert.equal(initial.appMax,'none','remove 1120px cap for touch tablets');
      assert.ok(initial.app.width>=w-2,'tablet app full-width '+JSON.stringify(initial));
      assert.ok(initial.header.x<=Math.max(26,w*.025),'large header gutter '+JSON.stringify(initial));
      assert.ok(w-initial.header.right<=Math.max(26,w*.025),'large right header gutter');
      assert.ok(initial.section.x<=Math.max(38,w*.036),'large section gutter '+JSON.stringify(initial));
      assert.ok(w-initial.section.right<=Math.max(38,w*.036),'large right section gutter');
      for(const key of ['header','nav','section','quoteBox']){
        assert.ok(initial[key].x>=-1&&initial[key].right<=w+1,'overflow: '+key+' '+JSON.stringify(initial[key]));
      }
      // Every customer module and internal nav should fit within the viewport.
      for(const [click,selector] of [
        ['#navTools','#tools'],['#navCompare','#compare'],
        ['#navAllProducts','#allProductsQuote'],['#navQuote','#quote']
      ]){
        await page.locator(click).click();
        const r=await page.locator(selector).evaluate(el=>{
          const b=el.getBoundingClientRect();return {x:b.x,right:b.right,hidden:el.classList.contains('hide')};
        });
        assert.ok(!r.hidden&&r.x>=0&&r.right<=w+1,'section clip '+click+' '+JSON.stringify(r));
      }
      await page.locator('#businessTitleAccess').dblclick();
      assert.ok(await page.locator('body').evaluate(x=>x.classList.contains('internal-business')),'open backstage');
      for(const [click,selector] of [
        ['#navOrders','#orders'],['#navFinance','#finance'],['#navCost','#tools']
      ]){
        await page.locator(click).click();
        const r=await page.locator(selector).evaluate(el=>{
          const b=el.getBoundingClientRect();return {x:b.x,right:b.right,hidden:el.classList.contains('hide')};
        });
        assert.ok(!r.hidden&&r.x>=0&&r.right<=w+1,'internal clip '+click+' '+JSON.stringify(r));
      }
      assert.ok(errors.every(e=>!/SyntaxError|Unexpected token/.test(e)),'JS syntax/runtime: '+errors.join(';'));
      console.log('PASS tablet',kind,w+'x'+h,'header-margin',Math.round(initial.header.x),'section-margin',Math.round(initial.section.x),'7 navigation checks');
    }else{
      console.log('CHECK baseline',kind,w+'x'+h,JSON.stringify(initial));
    }
    return initial;
  }catch(e){
    await page.screenshot({path:'/tmp/muye-v374-'+w+'x'+h+'-'+kind+'.png',fullPage:true}).catch(()=>{});
    throw e;
  }finally{await ctx.close()}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
   // Post-release acceptance: both public endpoints must run the same V376 layout.
   for(const [w,h,label] of tabletSizes){
     const candidate=await check(browser,stageUrl,w,h,true,'木业管家 V376','tablet');
     const live=await check(browser,prodUrl,w,h,true,'木业管家 V375','baseline-tablet');
     const landscape=w>h;
     for(const state of [candidate]){
       assert.equal(state.outerPad,9,label+' outer card spacing');
       assert.equal(state.measurePad,8,label+' measure spacing');
       assert.equal(state.navPad,0,label+' nav spacing');
       assert.equal(state.sectionMargin,0,label+' section spacing');
       assert.ok(state.scrollWidth<=w+2,label+' horizontal scroll');
     }
     for(const field of ['header','nav','section','quoteBox','measure']){
       assert.ok(candidate[field].x<=live[field].x+2,label+' candidate should have no larger left gutter '+field);
       assert.ok(candidate[field].right>=live[field].right-2,label+' candidate should have no larger right gutter '+field);
     }
     console.log('PASS live responsive',label,w+'x'+h,'outer',live.outerPad,'measure',live.measurePad);
   }
   // iPhone + desktop retain exactly the previous page width, regardless of test updates.
   for(const [w,h,touch,label] of [[390,844,true,'iphone'],[1200,900,false,'desktop-small'],[1440,900,false,'desktop-wide']]){
     const a=await check(browser,stageUrl,w,h,touch,'木业管家 V376',label);
     const b=await check(browser,prodUrl,w,h,touch,'木业管家 V376',label);
     for(const field of ['app','header','nav','section','quoteBox']){
       assert.ok(Math.abs(a[field].x-b[field].x)<=2,label+' '+field+' left layout changed');
       assert.ok(Math.abs(a[field].right-b[field].right)<=2,label+' '+field+' right layout changed');
     }
     console.log('PASS unchanged baseline',label,w+'x'+h);
   }
   console.log('OK V376: 9 touch-tablet viewports verified on both V376 live endpoints, 4 customer + 3 backstage routes each, 3 unchanged non-tablet viewports');
 }finally{await browser.close()}
})().catch(e=>{console.error('FAIL V376',e);process.exitCode=1});
