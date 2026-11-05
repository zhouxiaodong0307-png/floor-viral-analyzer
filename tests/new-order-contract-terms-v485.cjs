const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const CURRENT='乙方未按约定支付到期款项的，甲方有权暂停尚未履行的供货或施工，并对符合法定取回条件的产品依法主张收回权利。';
const LEGACY='每逾期一日，应按合同总价款的5%承担违约金';
const TAKEBACK='并对符合法定取回条件的产品依法主张收回权利';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[430,932],[768,1024]]){
   const ctx=await browser.newContext({viewport:{width,height}});
   const page=await ctx.newPage();
   page.on('dialog',async dialog=>{if(dialog.type()==='prompt')await dialog.accept('0');else await dialog.accept()});
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof saveOrder==='function'&&typeof sendOrderContract==='function');
   await page.evaluate(()=>{
    const base={cust:'历史订单',date:'2026/10/18',status:'进行中',orderMode:'manual',
     products:[{species:'缅甸柚木',spec:'740×115×17',area:20,billArea:20,price:300,subtotal:6000}],
     salesItems:[],total:6000,sales:6000,paid:0,depositRate:35};
    const oldStage={...base,id:91001,contractTermsVersion:484,paymentMode:'staged',
      paymentPlan:{stage1Rate:50,stage2Rate:40,stage3Rate:10}};
    const oldNormal={...base,id:91002,contractTermsVersion:484,paymentMode:'normal',date:'2027/10/01'};
    const oldEdited={...base,id:91003,paymentMode:'normal',
     contractEditedDocuments:{electronic:{
      html:'<div class="contract-title">客户已确认的历史合同</div><p class="contract-text">历史手工修改条款原样保留</p>',
      savedAt:'2026-10-18T10:00:00Z',source:'manual'}}};
    const newFixture={...base,id:91004,date:'2025/01/01',contractTermsVersion:485,
      paymentMode:'staged',paymentPlan:{stage1Rate:50,stage2Rate:40,stage3Rate:10}};
    localStorage.setItem(KEY,JSON.stringify([oldStage,oldNormal,oldEdited,newFixture]));
   });
   const snapshot=await page.evaluate(()=>JSON.stringify(orders().filter(o=>o.id>=91001&&o.id<=91004)));
   const getContract=async id=>page.evaluate(id=>{
    sendOrderContract(id);
    const root=document.getElementById('contractPreview');
    const head=[...root.querySelectorAll('h3')].find(x=>x.textContent.includes('第四条 付款及结算'));
    if(!head)return {full:root.innerHTML,lines:[]};
    const lines=head.nextElementSibling.innerHTML.split(/<br\s*\/?>/i)
      .map(s=>s.replace(/<[^>]+>/g,'').trim());
    return {full:root.innerHTML,lines};
   },id);
   const oldStage=await getContract(91001);
   assert.ok(oldStage.lines[4].includes(TAKEBACK),'historical staged point 5 preserved');
   assert.ok(oldStage.lines[5].includes(LEGACY),'historical staged daily 5% kept');
   assert.ok(!oldStage.lines[5].includes(CURRENT),'historical staged is NOT rewritten');
   const oldNormal=await getContract(91002);
   assert.ok(oldNormal.lines[4].includes(LEGACY),'historical normal fifth point preserved');
   assert.ok(!oldNormal.lines[4].includes(CURRENT),'historical normal is NOT rewritten');
   const oldEdited=await getContract(91003);
   assert.ok(oldEdited.full.includes('历史手工修改条款原样保留'),'saved edited legacy contract remains unchanged');
   const fixtureNew=await getContract(91004);
   assert.equal(fixtureNew.lines.filter(x=>x.includes(CURRENT)).length,1,'new template clause once');
   assert.ok(!fixtureNew.lines.join(' ').includes(LEGACY),'new template drops the 5% penalty');
   assert.ok(!fixtureNew.lines.join(' ').includes('逾期超过7日'),'new template drops the seven-day condition');
   assert.ok(!fixtureNew.lines[4].includes(TAKEBACK),'new staged point five retains only accessory terms');
   assert.ok(fixtureNew.lines[5].includes(CURRENT),'new staged point six has new clause');
   assert.equal(await page.evaluate(()=>JSON.stringify(orders().filter(o=>o.id>=91001&&o.id<=91004))),snapshot,
    'opening contracts must not mutate existing order records');

   await page.evaluate(()=>{
    window.returnFromOrderContract();
    document.getElementById('ordCust').value='V485手工订单';
    const box=document.getElementById('orderProductRows');box.innerHTML='';
    addOrderProductRow({species:'柚木',spec:'740×115×17',area:20,billArea:20,price:300});
    document.getElementById('paid').value='0';
    document.getElementById('ordDate').value='2025-01-01';
    saveOrder();
   });
   let manual=await page.evaluate(()=>orders().find(o=>o.cust==='V485手工订单'));
   assert.ok(manual,'new manual order created');
   assert.equal(manual.contractTermsVersion,485,'new manual order carries irreversible creation version');
   assert.equal(manual.date.includes('2025'),true,'manual order may be backdated');
   const manualContract=await getContract(manual.id);
   assert.ok(manualContract.lines.some(x=>x.includes(CURRENT)),'manual order generates new terms');

   await page.waitForTimeout(900);
   await page.evaluate(()=>{
    window.returnFromOrderContract();
    const $=id=>document.getElementById(id);
    $('cust').value='V485报价转单';$('species').value='柚木';$('area').value='20';$('price').value='300';
    $('paymentMode').value='staged';syncPaymentMode(false);
    $('stage1Rate').value='50';$('stage2Rate').value='40';$('stage3Rate').value='10';
    calc();
    confirmCurrentQuote(true);
   });
   const quoteOrder=await page.evaluate(()=>orders().find(o=>o.cust==='V485报价转单'));
   assert.ok(quoteOrder,'quote converted to order');
   assert.equal(quoteOrder.contractTermsVersion,485,'new quote-converted order carries version');
   const quoteContract=await getContract(quoteOrder.id);
   assert.ok(quoteContract.lines.some(x=>x.includes(CURRENT)),'quote-to-order uses new terms');
   assert.ok(!quoteContract.lines.join(' ').includes(LEGACY),'quote-to-order excludes previous 5%');

   console.log('PASS V485 old vs new contract terms and stored edits',width);
   await ctx.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
