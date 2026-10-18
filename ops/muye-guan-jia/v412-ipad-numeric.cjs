'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='https://muye-guan-jia-migration-test.onrender.com/';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const ipadUA='Mozilla/5.0 (iPad; CPU OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
 const iphoneUA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
 try{
  for(const width of [768,820,1024,1180]){
   const context=await browser.newContext({viewport:{width,height:1024},userAgent:ipadUA,hasTouch:true,isMobile:true,locale:'zh-CN'});
   const page=await context.newPage(),errs=[];
   page.on('pageerror',x=>errs.push(x.message));
   const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
   assert.ok(response?.ok(),'test site must load');
   await page.waitForFunction(()=>window.muyeIPadNumericV412&&typeof addMeasureRow==='function',{timeout:25000});
   const setup=await page.evaluate(()=>{
     if(APP_VERSION!=='413'||SUPABASE_URL!==''||FLOOR_AUTH_MODE!=='disabled'||isCloudWritableRuntime())throw Error('staging isolation not confirmed');
     show('quote');
     const row=addMeasureRow('V412房间','');
     const host=document.querySelector('.app')||document.body;
     const box=document.createElement('div');box.id='v412-test-fields';
     box.innerHTML='<label>金额<input id="v412-money" type="number" step="0.01" min="0" value="18.5"></label><label>数量<input id="v412-count" type="number" step="1" inputmode="numeric" min="0" value="4"></label><label>规格<input data-field="spec" id="v412-spec" value=""></label>';
     host.appendChild(box);
     window.__v412_input_events=0;
     row.querySelector('.mexpr').addEventListener('input',()=>{window.__v412_input_events++});
     return {enabled:muyeIPadNumericV412.enabled,orders:localStorage.getItem('floor_orders_v3')};
   });
   assert.equal(setup.enabled,true);
   const pad=page.locator('#muye-ipad-numeric-v412');
   const expr=page.locator('.measure-row .mexpr').last();
   await expr.tap();assert.equal(await pad.isVisible(),true);
   assert.equal(await expr.evaluate(el=>el.readOnly&&el.inputMode==='none'),true);
   for(const key of ['3','0','0','×','4','0','0'])await pad.locator('button[data-key="'+key+'"]').tap();
   const measured=await page.evaluate(()=>{
     const e=[...document.querySelectorAll('.measure-row .mexpr')].at(-1);
     return {value:e.value,area:parseMeasureExpr(e.value),inputEvents:window.__v412_input_events};
   });
   assert.equal(measured.value,'300×400');assert.equal(measured.area,12);assert.ok(measured.inputEvents>=7);
   // Original quick × must not close or confuse the custom iPad keyboard.
   await page.locator('.measure-row').last().locator('.measure-inline-symbol').first().tap();
   assert.equal(await pad.isVisible(),true);
   assert.equal((await expr.inputValue()).split('×').length-1,2,'inline symbol inserts a second multiplication sign without closing keypad');
   await pad.locator('[data-action="done"]').tap();assert.equal(await pad.isVisible(),false);
   assert.equal(await expr.evaluate(el=>!el.readOnly&&el.inputMode==='decimal'),true);
   const money=page.locator('#v412-money');await money.tap();assert.equal(await pad.isVisible(),true);
   await page.waitForTimeout(60);
   for(const key of ['2','5','.','5'])await pad.locator('button[data-key="'+key+'"]').tap();
   assert.equal(await money.inputValue(),'25.5');
   await pad.locator('[data-action="done"]').tap();
   assert.deepEqual(await money.evaluate(el=>({type:el.type,readonly:el.readOnly,mode:el.inputMode})),{type:'number',readonly:false,mode:'decimal'});
   const qty=page.locator('#v412-count');await qty.tap();await page.waitForTimeout(60);
   const beforeInteger=await qty.inputValue();
   await pad.locator('button[data-key="."]').tap();
   assert.equal(await qty.inputValue(),beforeInteger,'integer input must ignore decimal key, preserving original numeric text');
   await pad.locator('button[data-key="6"]').tap();await pad.locator('[data-action="done"]').tap();
   assert.equal(await qty.inputValue(),'6');
   const spec=page.locator('#v412-spec');await spec.tap({position:{x:14,y:12}});
   const startingSpec=await spec.inputValue();console.log('V412_SPEC_BEFORE',startingSpec);
   assert.equal(startingSpec,'','tapping specification input must not automatically insert ×');
   for(const key of ['7','4','0','×','1','1','5'])await pad.locator('button[data-key="'+key+'"]').tap();
   assert.equal(await spec.inputValue(),'740×115');
   await pad.locator('[data-action="done"]').tap();
   const finish=await page.evaluate(()=>({changed:localStorage.getItem('floor_orders_v3')===null||!localStorage.getItem('floor_orders_v3')?.includes('v412-test-fields'),scroll:document.documentElement.scrollWidth,width:innerWidth,mode:document.querySelector('#v412-money').inputMode,write:isCloudWritableRuntime()}));
   assert.ok(finish.changed);assert.ok(finish.scroll<=finish.width+2,'page overflow');
   assert.equal(finish.write,false);
   assert.deepEqual(errs,[],'page exceptions');
   console.log('PASS V412 iPad touch numeric pad, measurements, quantity, specification, restoring inputmode, cloud isolation '+width);
   await context.close();
  }
  for(const [device,width,ua] of [['iPhone',390,iphoneUA],['Mac',1440,'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15']]){
   const context=await browser.newContext({viewport:{width,height:900},userAgent:ua,hasTouch:device==='iPhone',isMobile:device==='iPhone'});
   const page=await context.newPage();await page.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
   assert.equal(await page.evaluate(()=>muyeIPadNumericV412.enabled),false,device+' must use existing native input');
   console.log('PASS V412 unchanged '+device+' native input');
   await context.close();
  }
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1});
