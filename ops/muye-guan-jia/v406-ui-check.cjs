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
   assert.deepEqual(stage,{version:'415',cloud:'',auth:'',mode:'disabled',write:false});
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
   assert.equal(layout.buttons.length,2,'edit and settlement should be only bottom buttons');
   assert.equal(layout.buttons[0].text,'编辑','left action stays edit');
   assert.equal(layout.buttons[1].text,'结算清单','bottom right action switches to settlement list');
   assert.equal(await page.locator('#muyeOrderDetailV404 .m404-bottom-actions [data-m404="pay"]').count(),0,'no duplicate payment at bottom');
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
   assert.equal((await page.locator('#muyeOrderDetailV404 .m404-action-menu button').first().innerText()).trim(),'收款','top More first item is payment');
   assert.equal(await page.locator('#muyeOrderDetailV404 .m404-action-menu [data-m404="settlement"]').count(),0,'settlement no longer duplicated in menu');
   const menuAlignment=await page.evaluate(()=>{
     const top=document.querySelector('#muyeOrderDetailV404 .m404-dots').getBoundingClientRect();
     const menu=document.querySelector('#muyeOrderDetailV404 .m404-action-menu').getBoundingClientRect();
     return {topY:top.y,buttonBottom:top.bottom,menuTop:menu.top,menuBottom:menu.bottom};
   });
   assert.ok(menuAlignment.menuTop>=menuAlignment.topY-4&&menuAlignment.menuTop<menuAlignment.buttonBottom+55,'More should open near top-right '+JSON.stringify(menuAlignment));
   assert.equal(await page.evaluate(()=>JSON.stringify(orders()[0])),value.order,'UI tests must not mutate orders');
   // The shared app style once added 14px horizontal section margins: every card must now align with tabs.
   const align=await page.evaluate(()=>{
     const rect=sel=>{const x=document.querySelector(sel).getBoundingClientRect();return{x:x.x,right:x.right,width:x.width}};
     document.querySelector('#muyeOrderDetailV404 .m404-dots').click();
     document.querySelector('#muyeOrderDetailV404 [data-tab="items"]').click();
     return {tabs:rect('#muyeOrderDetailV404 .m404-tabs'),overview:rect('#muyeOrderDetailV404 .m404-overview'),items:rect('#muyeOrderDetailV404 .m404-items-card'),money:rect('#muyeOrderDetailV404 .m404-money'),overviewCells:[...document.querySelectorAll('#muyeOrderDetailV404 .m404-overview-grid>div')].map(x=>x.getBoundingClientRect().width)};
   });
   for(const name of ['overview','items','money']){
     assert.ok(Math.abs(align[name].x-align.tabs.x)<=1.5&&Math.abs(align[name].right-align.tabs.right)<=1.5,'card must align with tabs '+name+' '+JSON.stringify(align));
   }
   assert.equal(align.overviewCells.length,3,'three overview metrics');
   assert.ok(align.overviewCells.every(w=>Math.abs(w-align.overviewCells[0])<=1.5),'equal thirds '+JSON.stringify(align));
   if(width===375){
     // Verify read-only calculated profit without mutating any production records.
     const first=await page.evaluate(()=>{
       const o=orders()[0];
       localStorage.setItem('floor_orders_v3',JSON.stringify([o]));
       window.orders=()=>JSON.parse(localStorage.getItem('floor_orders_v3')||'[]');
       window.muyeOrderDetailV404.refresh();
       return {cost:orderRecordedCost(o),profitText:document.querySelector('#muyeOrderDetailV404 .m404-profit-readonly')?.textContent||''};
     });
     assert.equal(first.cost,0);
     assert.ok(first.profitText.includes('待补成本'));
     assert.equal(await page.locator('#muyeOrderDetailV404 [data-m404="profit"]').count(),0,'profit must not be manually editable');
     await page.evaluate(()=>{
       const o=orders()[0];
       o.costStatus='partial';o.profitKnown=false;
       o.costBreakdown={floor:24000,install:0,batten:0,skirt:0,material:0,freight:0,remove:0,other:0};
       o.manualProfitV407={amount:-125.5,updatedAt:new Date().toISOString()};
       localStorage.setItem('floor_orders_v3',JSON.stringify([o]));
       window.muyeOrderDetailV404.refresh();
     });
     const provisional=await page.locator('#muyeOrderDetailV404 .m404-profit-readonly').innerText();
     assert.ok(provisional.includes('暂估利润')&&provisional.includes('¥10,125'),'partial cost displays calculated provisional profit');
     await page.reload({waitUntil:'domcontentloaded'});
     await page.waitForFunction(()=>window.muyeOrderDetailV404Ready===true,{timeout:20000});
     await page.evaluate(()=>window.muyeOrderDetailV404.open(999995406));
     assert.ok((await page.locator('#muyeOrderDetailV404 .m404-profit-readonly').innerText()).includes('暂估利润'),'provisional profit survives reload');
     const snap=await page.evaluate(()=>{
       const arr=orders();arr[0].costStatus='complete';arr[0].profitKnown=true;
       localStorage.setItem('floor_orders_v3',JSON.stringify(arr));window.muyeOrderDetailV404.refresh();
       return {profit:orderAccurateProfit(orders()[0]),shown:document.querySelector('#muyeOrderDetailV404 .m404-profit-readonly').textContent,
         sales:calcOrderFinalAmount(orders()[0]),cost:orderRecordedCost(orders()[0]),manual:orders()[0].manualProfitV407?.amount};
     });
     assert.equal(snap.profit,snap.sales-snap.cost,'complete profit must follow sales minus costs');
     assert.ok(snap.shown.includes('利润')&&!snap.shown.includes('暂估利润'));
     assert.equal(snap.manual,-125.5,'historical field preserved');
   }

   assert.equal(errors.length,0,'page errors: '+errors.join(' | '));
   console.log('PASS V407 order-details responsive, editfocus and no mutation',width,JSON.stringify(layout.buttons));
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1});