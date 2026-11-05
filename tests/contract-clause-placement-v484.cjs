const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[430,932],[768,1024]]){
   const context=await browser.newContext({viewport:{width,height}});
   const page=await context.newPage();
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof generateContract==='function'&&typeof calc==='function');
   const docs=await page.evaluate(()=>{
    const $=id=>document.getElementById(id);
    show('quote');$('finalTotal').value='10000';
    // V485: this test asserts the unchanged V484 template used by pre-existing orders.
    window.__useV485ContractClause=false;
    const generate=mode=>{
     $('paymentMode').value=mode;syncPaymentMode(false);
     if(mode==='staged'){for(const [id,value] of [['stage1Rate','50'],['stage2Rate','40'],['stage3Rate','10']])$(id).value=value;}
     else $('depositRate').value='35';
     syncAllRatioValues();calc();generateContract('electronic');
     const head=[...$('contractPreview').querySelectorAll('h3')].find(x=>x.textContent.includes('第四条 付款及结算'));
     if(!head)throw Error('Payment section missing');
     return {lines:head.nextElementSibling.innerHTML.split(/<br\s*\/?>/i).map(x=>x.replace(/<[^>]+>/g,'').trim()),total:currentQuote.total,mode:currentQuote.paymentMode};
    };
    const legacyDocs=[generate('staged'),generate('normal')];
    window.__useV485ContractClause=undefined;
    return legacyDocs;
   });
   const [staged,normal]=docs;
   assert.equal(staged.total,10000);assert.equal(normal.total,10000);
   assert.deepEqual(staged.lines.map(x=>Number(x.match(/^([1-9])\./)?.[1])),[1,2,3,4,5,6]);
   assert.deepEqual(normal.lines.map(x=>Number(x.match(/^([1-9])\./)?.[1])),[1,2,3,4,5]);
   const phrase='并对符合法定取回条件的产品依法主张收回权利';
   assert.ok(staged.lines[4].includes('龙骨、踢脚线'),'original staged point five remains');
   assert.ok(staged.lines[4].includes(phrase),'staged recovery wording appended to point five');
   assert.ok(staged.lines[5].includes('合同总价款的5%'),'staged late payment fee unchanged');
   assert.ok(!staged.lines[5].includes(phrase),'staged recovery wording not duplicated in point six');
   assert.ok(normal.lines[4].includes('合同总价款的5%'),'normal point five existing content retained');
   assert.ok(normal.lines[4].includes(phrase),'normal recovery wording continues point five');
   for(const doc of docs){
    assert.equal(doc.lines.filter(x=>x.includes(phrase)).length,1,'takeback phrase present once');
    assert.ok(doc.lines.every(x=>!x.includes('书面催告后2日')),'deleted two-day cure period not restored');
   }
   console.log('PASS V484 late-payment clause stays in existing point five at',width);
   await context.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
