'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='https://muye-guan-jia-migration-test.onrender.com/';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [320,375,390,430,768,1024,1280]){
   const ctx=await browser.newContext({viewport:{width,height:850},hasTouch:width<1024,isMobile:width<600});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',d=>d.dismiss());
   const res=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
   assert.ok(res&&res.ok(),'test site unavailable');
   await page.waitForFunction(()=>window.muyeOrderDetailV404Ready===true,{timeout:20000});
   const stage=await page.evaluate(()=>({version:APP_VERSION,cloud:SUPABASE_URL,auth:FLOOR_AUTH_URL,mode:FLOOR_AUTH_MODE,write:isCloudWritableRuntime()}));
   assert.deepEqual(stage,{version:'407',cloud:'',auth:'',mode:'disabled',write:false});
   const value=await page.evaluate(()=>{
     const o={id:999995406,cust:'测试专用',date:'2026/10/14',opener:'周潇东',species:'缅甸柚木',area:100,paid:0,costStatus:'missing',status:'进行中',products:[{species:'缅甸柚木',spec:'760×125',area:100,billArea:105,price:300,subtotal:31500}],salesItems:[{name:'安装费',qty:105,unit:'㎡',price:25,subtotal:2625}],measureSnapshot:{floors:[{name:'一楼'},{name:'二楼'}],rows:[{floor:'一楼',name:'客厅',expr:'4.2×3.8',area:15.96},{floor:'二楼',name:'卧室',expr:'3.5×3',area:10.5}]}};
     window.orders=()=>[o];window.muyeOrderDetailV404.open(o.id);
     return {...window.muyeOrderDetailV404.getStatus(),order:JSON.stringify(o)};
   });
   assert.equal(value.opened,true);
   assert.equal(value.tab,'items');
   assert.equal(await page.locator('#muyeOrderDetailV404 .m404-kind-icon').count(),0,'project icon should be removed');
   assert.equal(await page.locator('#muyeOrderDetailV404 .m404-finance-card>div').count(),4,'four financial metrics required');
   assert.equal(await page.locator('#muyeOrderDetailV404 .m404-compact-info').count(),0,'margin must be removed');
   assert.equal(await page.locator('#muyeOrderDetailV404 .m404-more-btn').count(),0,'duplicate more button must be removed');
   assert.equal((await page.locator('#muyeOrderDetailV404 .m404-dots').innerText()).trim(),'更多');
   const layout=await page.evaluate(()=>{
     const q=s=>document.querySelector(s),r=el=>el.getBoundingClientRect();
     const finance=[...document.querySelectorAll('#muyeOrderDetailV404 .m404-finance-card>div')].map(x=>({x:r(x).x,w:r(x).width,y:r(x).y}));
     const buttons=[...document.querySelectorAll('#muyeOrderDetailV404 .m404-bottom-actions button')].map(x=>({text:x.textContent.trim(),y:r(x).y,w:r(x).width}));
     const shell=r(q('#muyeOrderDetailV404 .m404-shell'));
     return {finance,buttons,shell,viewport:innerWidth,scroll:document.documentElement.scrollWidth};
   });
   assert.ok(layout.finance.every(x=>Math.abs(x.w-layout.finance[0].w)<=2),'finance tile widths differ');
   assert.ok(layout.finance.every(x=>Math.abs(x.y-layout.finance[0].y)<=2),'finance metrics should fit one row');
   assert.equal(layout.buttons.length,2,'edit and payment should be only bottom buttons');
   assert.ok(Math.abs(layout.buttons[0].y-layout.buttons[1].y)<=2,'bottom buttons must remain one row');
   assert.ok(layout.shell.width<=width+1,'horizontal overflow '+width+' '+JSON.stringify(layout));
   assert.ok(layout.scroll<=width+1,'page scroll overflow');
   assert.ok(layout.shell.width>=width-2||width>900,'mobile/tablet detail should use full width');
   await page.locator('#muyeOrderDetailV404 [data-target="eOpener"]').first().click();
   await page.waitForTimeout(120);
   assert.equal(await page.locator('#orderEditModal').evaluate(x=>x.classList.contains('hide')),false,'open editor by opener click');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'eOpener','opener input should focus directly');
   await page.evaluate(()=>closeOrderEdit());
   await page.locator('#muyeOrderDetailV404 .m404-finance-card [data-target="eFloorCostTotal"]').click();
   await page.waitForTimeout(120);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'eFloorCostTotal','cost input should focus directly');
   await page.evaluate(()=>closeOrderEdit());
   await page.locator('#muyeOrderDetailV404 [data-tab="measure"]').click();
   assert.equal(await page.locator('#muyeOrderDetailV404 .m404-room').count(),2,'archived measurements must be preserved');
   assert.ok((await page.locator('#muyeOrderDetailV404 .m404-page').innerText()).includes('客厅'),'measurement source must remain real');
   await page.locator('#muyeOrderDetailV404 .m404-dots').click();
   assert.equal(await page.locator('#muyeOrderDetailV404 .m404-action-menu button').count(),3,'more menu must preserve actions');
   const menuAlignment=await page.evaluate(()=>{
     const top=document.querySelector('#muyeOrderDetailV404 .m404-dots').getBoundingClientRect();
     const menu=document.querySelector('#muyeOrderDetailV404 .m404-action-menu').getBoundingClientRect();
     return {topY:top.y,buttonBottom:top.bottom,menuTop:menu.top,menuBottom:menu.bottom};
   });
   assert.ok(menuAlignment.menuTop>=menuAlignment.topY-4&&menuAlignment.menuTop<menuAlignment.buttonBottom+55,'More should open near top-right '+JSON.stringify(menuAlignment));
   assert.equal(await page.evaluate(()=>JSON.stringify(orders()[0])),value.order,'UI tests must not mutate orders');
   assert.equal(errors.length,0,'page errors: '+errors.join(' | '));
   console.log('PASS V407 order-details responsive, editfocus and no mutation',width,JSON.stringify(layout.buttons));
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1});