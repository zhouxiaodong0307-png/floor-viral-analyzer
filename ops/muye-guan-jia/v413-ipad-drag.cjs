'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='https://muye-guan-jia-migration-test.onrender.com/';
const UA='Mozilla/5.0 (iPad; CPU OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
const approx=(a,b,tol=7)=>Math.abs(a-b)<=tol;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [768,1024,1180]){
   const ctx=await browser.newContext({viewport:{width,height:1024},userAgent:UA,hasTouch:true,isMobile:true});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>window.muyeIPadNumericV412?.enabled&&typeof addMeasureRow==='function',{timeout:25000});
   const safe=await page.evaluate(()=>({version:APP_VERSION,cloud:SUPABASE_URL,auth:FLOOR_AUTH_MODE,write:isCloudWritableRuntime()}));
   assert.deepEqual(safe,{version:'413',cloud:'',auth:'disabled',write:false});
   await page.evaluate(()=>{show('quote');const row=addMeasureRow('V413Drag','');row.querySelector('.mexpr').scrollIntoView({block:'center'});});
   const field=page.locator('.measure-row .mexpr').last(),pad=page.locator('#muye-ipad-numeric-v412');
   await field.tap();assert.ok(await pad.isVisible());
   const grip=page.locator('#muye-ipad-numeric-v412 .muye-ipad-pad-drag');
   const before=await pad.boundingBox(),h=await grip.boundingBox();
   assert.ok(before&&h,'numeric panel and draggable header must be visible');
   const start={x:h.x+h.width/2,y:h.y+h.height/2};
   await page.mouse.move(start.x,start.y);
   await page.mouse.down();
   await page.mouse.move(start.x+85,start.y-90,{steps:8});
   await page.mouse.up();
   const moved=await pad.boundingBox();
   assert.ok(moved.y<before.y-40,'pad should move upward by dragging its header');
   assert.ok(moved.x>before.x+40,'pad should move right by dragging its header');
   const status=await page.evaluate(()=>muyeIPadNumericV412.status());
   assert.equal(status.visible,true);assert.equal(status.movable,true);
   const originalValue=await field.inputValue();
   await pad.locator('[data-key="3"]').tap();
   assert.notEqual(await field.inputValue(),originalValue,'numeric input must work after dragging');
   // Test actual touch events (rather than using the mouse alone).
   const bounds=await grip.boundingBox(),tx=bounds.x+bounds.width/2,ty=bounds.y+bounds.height/2;
   const client=await ctx.newCDPSession(page);
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx-50,y:ty-35}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   const touchMoved=await pad.boundingBox();
   assert.ok(touchMoved.x<moved.x-15,'touch drag must move the panel');
   assert.ok(touchMoved.y<moved.y-10,'touch drag vertical movement must work');
   await pad.locator('[data-action="done"]').tap();
   assert.ok(!(await pad.isVisible()),'done should dismiss movable keypad');
   await field.tap();
   const reopened=await pad.boundingBox();
   assert.ok(approx(reopened.x,touchMoved.x,4)&&approx(reopened.y,touchMoved.y,4),'placement must survive reopening');
   const b=await grip.boundingBox();
   await page.mouse.move(b.x+35,b.y+20);await page.mouse.down();
   await page.mouse.move(b.x+3000,b.y+3000,{steps:5});await page.mouse.up();
   const rightEdge=await pad.boundingBox();
   assert.ok(rightEdge.x>=0&&rightEdge.x+rightEdge.width<=width+2,'drag should clamp horizontally to viewport');
   assert.ok(rightEdge.y>=0&&rightEdge.y+rightEdge.height<=1024+3,'drag should clamp vertically');
   await page.setViewportSize({width:width===768?1024:768,height:800});
   await sleep(150);
   const rotated=await pad.boundingBox(),v=await page.evaluate(()=>({w:innerWidth,h:innerHeight,scroll:document.documentElement.scrollWidth}));
   assert.ok(rotated.x>=-1&&rotated.x+rotated.width<=v.w+2,'resize should clamp horizontal position');
   assert.ok(rotated.y>=-1&&rotated.y+rotated.height<=v.h+3,'resize should clamp vertical position');
   assert.ok(v.scroll<=v.w+2,'drag must not expand page width');
   assert.deepEqual(errors,[],'no JS errors during drag');
   console.log('PASS V413 movable iPad keypad: mouse & touch drag, bounds, orientation, input, reopen '+width);
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
