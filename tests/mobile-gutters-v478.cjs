const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [w,h] of [[320,690],[375,812],[390,844],[430,932],[700,900],[768,1024],[1024,768]]){
   const context=await browser.newContext({viewport:{width:w,height:h},isMobile:w<=430});
   const p=await context.newPage();
   await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await p.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   const x=await p.evaluate(()=>{
     show('quote');
     const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}};
     const navElement=document.querySelector('.client-nav');
     const nav=rect(navElement), navPadding=parseFloat(getComputedStyle(navElement).paddingLeft);
     const section=rect(document.querySelector('#quote'));
     const outerEl=document.querySelector('#quote>.box');const outer=rect(outerEl);const padding=parseFloat(getComputedStyle(outerEl).paddingLeft);
     const measure=rect(document.querySelector('#quote .measure-card-v273'));
     const floor=rect(document.querySelector('#quote .quote-entry-shell'));
     const accessory=rect(document.querySelector('#quote details.quote-entry-optional:not(.quote-compact-note)'));
     return {nav,navPadding,section,outer,padding,measure,floor,accessory,viewport:innerWidth,scroll:document.documentElement.scrollWidth,appVersion:document.querySelector('meta[name="app-version"]')?.content,
       navButtons:[...document.querySelectorAll('.client-nav button')].map(b=>({width:b.getBoundingClientRect().width,scroll:b.scrollWidth,client:b.clientWidth})),
       floorHeight:document.querySelector('#quote .quote-entry-toolbar').getBoundingClientRect().height};
   });
   assert.ok(Number(x.appVersion.slice(1))>=480,'post-V480 version');
   assert.ok(x.scroll<=x.viewport+2,'no horizontal scrolling at '+w);
   assert.ok(x.navButtons.every(b=>b.scroll<=b.client+2),'nav label fit '+w);
   if(w<=520){
    assert.ok(Math.abs(x.section.left-5)<=2,'outer side margin 9px at '+w);
    assert.ok(Math.abs(x.viewport-x.section.right-5)<=2,'right margin 9px at '+w);
    assert.ok(Math.abs(x.nav.left+x.navPadding-5)<=2,'top nav content starts at 9px at '+w);
    assert.equal(x.padding,7,'quote outer content padding 7px at '+w);
    assert.ok(x.measure.left>=x.outer.left&&x.measure.right<=x.outer.right+1,'measurement in quote panel');
    assert.ok(Math.abs(x.floor.left-x.accessory.left)<2,'two compact accordions aligned');
    assert.ok(x.floorHeight>=39&&x.floorHeight<=43,'accordion remains compact');
   }
   console.log('V478 mobile width',w,JSON.stringify({nav:x.nav.left,section:x.section.left,measure:x.measure.width,floor:x.floor.width}));
   await context.close();
  }
  console.log('PASS V478: wider phone layout, consistent safe gutters, no overflow');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
