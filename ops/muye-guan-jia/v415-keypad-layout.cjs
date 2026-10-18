'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const site='https://muye-guan-jia-migration-test.onrender.com/';
const ipad='Mozilla/5.0 (iPad; CPU OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
const near=(x,y,t=4)=>Math.abs(x-y)<=t;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const width of [768,1024,1180]){
  const context=await browser.newContext({viewport:{width,height:960},userAgent:ipad,hasTouch:true,isMobile:true});
  const page=await context.newPage(),errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.goto(site,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.muyeIPadNumericV412?.enabled&&typeof addMeasureRow==='function',{timeout:20000});
  assert.deepEqual(await page.evaluate(()=>({version:APP_VERSION,cloud:SUPABASE_URL,auth:FLOOR_AUTH_MODE,write:isCloudWritableRuntime()})),
    {version:'415',cloud:'',auth:'disabled',write:false});
  await page.evaluate(()=>{show('quote');addMeasureRow('V415焦点和按键','')});
  const row=page.locator('.measure-row').last(),field=row.locator('.mexpr'),pad=page.locator('#muye-ipad-numeric-v412');
  await field.tap();
  let box=await pad.boundingBox();
  assert.ok(near(box.width,445,5)&&near(box.height,480,5),'default keyboard must match minimum screenshot dimensions');
  const caret=page.locator('#muye-ipad-caret-v415');
  assert.ok(await caret.isVisible(),'virtual caret shows despite readonly input');
  assert.equal(await field.evaluate(el=>getComputedStyle(el).outlineStyle!=='none'),true,'active field shows visible outline');
  const fieldBox=await field.boundingBox(),caretBox=await caret.boundingBox();
  assert.ok(caretBox.x>=fieldBox.x&&caretBox.x<=fieldBox.x+fieldBox.width,'caret positioned within input');
  const layout=await page.evaluate(()=>{
   const root=document.querySelector('#muye-ipad-numeric-v412');
   const main=root.querySelector('.muye-ipad-pad-keys');
   const extras=root.querySelector('.muye-ipad-pad-extras');
   const a=[...main.querySelectorAll('button')].slice(0,3).map(x=>x.getBoundingClientRect());
   const b=['×','+'].map(k=>extras.querySelector('button[data-key="'+k+'"]').getBoundingClientRect());
   b.push(extras.querySelector('button[data-action="clear"]').getBoundingClientRect());
   return {a:a.map(x=>({x:x.x,w:x.width,h:x.height})),b:b.map(x=>({x:x.x,w:x.width,h:x.height}))};
  });
  for(let i=0;i<3;i++){
   assert.ok(near(layout.a[i].x,layout.b[i].x,2),'extra key col '+i+' must align with main row');
   assert.ok(near(layout.a[i].w,layout.b[i].w,2),'extra key width '+i+' must equal main row');
   assert.ok(Math.abs(layout.a[i].h-layout.b[i].h)<=6,'extra key height should scale with digits');
  }
  for(const key of ['3','0','0','×','4','0','0'])await pad.locator('[data-key="'+key+'"]').tap();
  assert.equal(await field.inputValue(),'300×400','expression can be entered');
  assert.equal(await page.evaluate(()=>parseMeasureExpr(document.querySelector('.measure-row:last-child .mexpr').value)),12);
  const typedCaret=await caret.boundingBox();
  assert.ok(typedCaret.x>caretBox.x+25,'cursor must move right after text input');
  await pad.locator('[data-action="clear"]').tap();
  assert.equal(await field.inputValue(),'','clear field works with scaled extras');
  assert.ok(await caret.isVisible(),'cursor remains after clear');
  // Shrink a large keyboard, then try to go below minimum repeatedly.
  const resize=pad.locator('.muye-ipad-pad-resize'),handle=await resize.boundingBox();
  await page.mouse.move(handle.x+handle.width*.5,handle.y+handle.height*.5);
  await page.mouse.down();await page.mouse.move(handle.x-700,handle.y-700,{steps:8});await page.mouse.up();
  box=await pad.boundingBox();
  assert.ok(box.width>=444&&box.height>=479,'cannot shrink below minimum');
  // V414 legacy size is upgraded safely on reload without erasing order data.
  await page.evaluate(()=>localStorage.setItem('muye-ipad-keypad-layout-v414',JSON.stringify({left:60,top:100,width:355,height:315})));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.muyeIPadNumericV412?.enabled,{timeout:20000});
  await page.evaluate(()=>{show('quote');addMeasureRow('Legacy migration','')});
  await page.locator('.measure-row .mexpr').last().tap();
  box=await pad.boundingBox();
  assert.ok(box.width>=444&&box.height>=479,'legacy keyboard size is clamped');
  await pad.locator('[data-action="done"]').tap();
  assert.equal(await caret.isVisible(),false,'caret hides on completion');
  assert.deepEqual(errs,[],'no JavaScript errors');
  console.log('PASS V415 default & min size, blinking caret, key grid alignment, typing, clear, and legacy preference '+width);
  await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
