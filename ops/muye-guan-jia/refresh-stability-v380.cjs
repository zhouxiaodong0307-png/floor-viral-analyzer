'use strict';
/* V380: test the *visible frames during navigation and reload*, not only final CSS.
   Chromium emulates coarse-pointer tablets; it does NOT claim Safari-device equivalence.
   No auth, cloud writes, data resets, or business mutations.
*/
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const target='https://muye-guan-jia-migration-test.onrender.com/';
const cases=[
  {label:'iPhone',width:390,height:844,touch:true,tablet:false},
  {label:'iPad portrait',width:820,height:1180,touch:true,tablet:true},
  {label:'iPad landscape',width:1180,height:820,touch:true,tablet:true},
  {label:'iPad Pro landscape',width:1366,height:1024,touch:true,tablet:true},
  {label:'Mac',width:1440,height:900,touch:false,tablet:false}
];
const allCases=[target,'https://muye-guan-jia.onrender.com/'].flatMap((url,i)=>cases.map(item=>({...item,url,label:(i?'production ':'staging ')+item.label})));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const item of allCases){
   const context=await browser.newContext({viewport:{width:item.width,height:item.height},hasTouch:item.touch,isMobile:false,deviceScaleFactor:2,locale:'zh-CN',acceptDownloads:false});
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   page.on('dialog',d=>d.dismiss());
   await page.addInitScript(()=>{
     window.__v380PaintLog=[];
     let steps=0;
     function track(){
       const app=document.querySelector('body > .app');
       if(app){
         const rect=app.getBoundingClientRect();
         const visible=getComputedStyle(app).visibility!=='hidden';
         const root=document.documentElement;
         window.__v380PaintLog.push({time:performance.now(),width:Math.round(rect.width*10)/10,visible,ready:root.classList.contains('muye-ui-ready'),vw:innerWidth,scroll:root.scrollWidth});
       }
       if(++steps<1200)requestAnimationFrame(track);
     }
     requestAnimationFrame(track);
   });
   try{
    for(let i=0;i<3;i++){
      let state;
      for(let attempt=0;attempt<3;attempt++){
        try{
          const res=i===0&&attempt===0?await page.goto(item.url,{waitUntil:'domcontentloaded',timeout:120000}):await page.reload({waitUntil:'domcontentloaded',timeout:120000});
          assert.ok(res&&res.status()<400,item.label+' navigation HTTP');
          await page.waitForFunction(()=>document.documentElement.classList.contains('muye-ui-ready')&&typeof show==='function',{timeout:20000});
          await page.waitForTimeout(250);
          state=await page.evaluate(()=>({frames:window.__v380PaintLog.slice(),app:document.querySelector('.app').getBoundingClientRect().width,scroll:document.documentElement.scrollWidth,stylesAfterHead:Array.from(document.querySelectorAll('style')).filter(x=>x.parentNode!==document.head).length,cssGuard:!!document.getElementById('v380-first-paint-guard'),version:document.querySelector('meta[name="app-version"]')?.content}));
          break;
        }catch(e){
          if(attempt===2||!/execution context was destroyed|navigation|context was destroyed/i.test(String(e)))throw e;
          console.log('RETRY',item.label,'reload race',attempt+1);
          await page.waitForLoadState('domcontentloaded',{timeout:15000}).catch(()=>{});
        }
      }
      assert.equal(state.version,item.url===target?'V401':'V400',item.label+' version');
      assert.equal(state.stylesAfterHead,0,item.label+' late styles');
      assert.ok(state.cssGuard,item.label+' first-paint guard');
      assert.ok(state.frames.length>0,item.label+' no frame samples');
      assert.ok(state.frames.every(f=>!f.visible||f.ready),item.label+' visible before init');
      assert.ok(state.frames.every(f=>!f.visible||Math.abs(f.width-state.app)<2),item.label+' *visible frame* layout width changed '+JSON.stringify(state.frames.filter(f=>f.visible).slice(0,6)));
      if(item.tablet){assert.ok(state.app>=item.width-2,item.label+' not full width');assert.ok(state.scroll<=item.width+2,item.label+' horizontal overflow')}
      assert.ok(!errors.some(e=>/SyntaxError|Unexpected token/.test(e)),item.label+' JS syntax error '+errors.join('; '));
      console.log('PASS',item.label,'load',i,'frames',state.frames.length,'visible',state.frames.filter(f=>f.visible).length,'app',state.app,'scroll',state.scroll);
    }
   }catch(err){
    await page.screenshot({path:'/tmp/muye-v380-'+item.label.replace(/ /g,'-')+'.png',fullPage:true}).catch(()=>{});
    throw err;
   }finally{await context.close()}
  }
  console.log('PASS V380 first paint + repeated reload, portrait/landscape and phone/desktop emulation');
 }finally{await browser.close()}
})().catch(e=>{console.error('FAIL V380',e);process.exitCode=1});
