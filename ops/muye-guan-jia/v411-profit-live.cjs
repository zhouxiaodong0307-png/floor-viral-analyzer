'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='https://muye-guan-jia-migration-test.onrender.com/';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [375,820,1180,1440]){
   const context=await browser.newContext({viewport:{width,height:950},hasTouch:width<=1180,isMobile:width===375,locale:'zh-CN'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
   assert.ok(response?.ok(),'staging must load');
   await page.waitForFunction(()=>window.muyeOrderDetailV404Ready&&typeof window.calcOrderFinalAmount==='function',{timeout:25000});
   const data=await page.evaluate(()=>{
    if(APP_VERSION!=='413'||SUPABASE_URL!==''||FLOOR_AUTH_MODE!=='disabled'||isCloudWritableRuntime())throw Error('production data isolation failure');
    const localBefore=localStorage.getItem('floor_orders_v3');
    const fake={id:-411009,cust:'测试暂估利润',date:'2026/10/17',opener:'测试',status:'进行中',orderMode:'manual',entrySource:'manual',pricingMode:'manual_bill_area',finalAmount:9900,sales:9900,paid:3710,area:53,products:[{species:'测试地板',spec:'760x125',area:53,billArea:53,price:50,subtotal:2650}],salesItems:[{name:'安装费',qty:53,unit:'㎡',price:45,subtotal:2385},{name:'拆除搬运运输',qty:53,unit:'人工',price:45,subtotal:2385},{name:'补板',qty:16,unit:'㎡',price:155,subtotal:2480}],costBreakdown:{floor:0,install:0,batten:0,skirt:0,material:0,freight:0,remove:1300,other:1500},cost:2800,costStatus:'partial',profitKnown:false,profit:7100,manualProfitV407:{amount:42,updatedAt:'2026-10-16T00:00:00Z'}};
    const originalOrders=window.orders;window.orders=()=>[fake];
    const read=()=>{window.muyeOrderDetailV404.refresh();const el=document.querySelector('#muyeOrderDetailV404 .m404-finance-card > div:last-child');if(!el)throw Error('profit card missing');return {label:el.querySelector('span').textContent,value:el.querySelector('strong').textContent,interactive:el.hasAttribute('role')||el.hasAttribute('data-m404'),text:el.textContent};};
    window.muyeOrderDetailV404.open(fake.id);
    const partial=read();
    fake.costBreakdown.other=2400;fake.cost=3700;const moreCosts=read();
    fake.finalAmount=10300;fake.sales=10300;fake.salesItems.push({name:'新增服务',qty:1,unit:'项',price:400,subtotal:400});const moreSales=read();
    fake.costStatus='missing';fake.costBreakdown.other=0;fake.costBreakdown.remove=0;fake.cost=0;const missing=read();
    fake.costStatus='complete';fake.profitKnown=true;fake.costBreakdown.floor=4000;fake.cost=4000;const complete=read();
    fake.costStatus='partial';fake.profitKnown=false;fake.costBreakdown.floor=0;fake.costBreakdown.other=12000;fake.cost=12000;const negative=read();
    window.orders=originalOrders;
    return {partial,moreCosts,moreSales,missing,complete,negative,unchanged:localStorage.getItem('floor_orders_v3')===localBefore,write:isCloudWritableRuntime(),version:APP_VERSION};
   });
   assert.equal(data.partial.label,'暂估利润');assert.equal(data.partial.value,'¥7,100');assert.equal(data.partial.interactive,false);
   assert.equal(data.moreCosts.value,'¥6,200');
   assert.equal(data.moreSales.value,'¥6,600');
   assert.equal(data.missing.label,'利润');assert.equal(data.missing.value,'待补成本');
   assert.equal(data.complete.label,'利润');assert.equal(data.complete.value,'¥6,300');
   assert.equal(data.negative.value,'¥-1,700');
   assert.equal(data.unchanged,true);
   assert.equal(data.write,false);assert.equal(data.version,'413');
   assert.deepEqual(errors,[],'uncaught browser errors');
   console.log('PASS V411 provisional profit, actual profit, reactive updates, missing costs, negatives, read-only, isolated storage viewport='+width);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
