const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  for(const [width,height] of [[375,812],[430,932],[768,1024],[1280,800]]) {
   const ctx=await browser.newContext({viewport:{width,height}});
   const page=await ctx.newPage();
   const alerts=[];
   page.on('dialog',async dialog=>{alerts.push(dialog.message());await dialog.accept()});
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof generateContract==='function'&&typeof toggleContractFullEdit==='function');
   await page.evaluate(()=>{
    const $=id=>document.getElementById(id);
    show('quote');
    $('finalTotal').value='24000';
    $('paymentMode').value='staged';syncPaymentMode(false);
    for(const [id,v] of [['stage1Rate','50'],['stage2Rate','40'],['stage3Rate','10']])$(id).value=v;
    syncAllRatioValues();calc();generateContract('electronic');
   });
   const root=page.locator('#contractPreview');
   const rate=key=>root.locator('[data-contract-pay-rate="'+key+'"]');
   const amount=key=>root.locator('[data-contract-pay-amount="'+key+'"]');
   const heading=root.locator('h3').first();
   const number=async locator=>+(await locator.innerText()).replace(/[^\d.]/g,'');
   assert.equal(await number(rate('stage2')),40,'baseline stage two rate');
   assert.equal(await number(amount('stage2')),9600,'baseline stage two amount');
   await page.evaluate(()=>toggleContractFullEdit());
   assert.equal(await rate('stage2').getAttribute('contenteditable'),'true','payment span is a stable subeditor');

   // Regression: typing pauses for >550 ms no longer rewrite or move the caret.
   await rate('stage2').fill('3');
   await page.waitForTimeout(750);
   assert.equal(await rate('stage2').innerText(),'3','intermediate input must not mutate');
   assert.equal(await number(amount('stage2')),9600,'amount unchanged until input completes');
   await page.keyboard.insertText('0');
   assert.equal(await rate('stage2').innerText(),'30','second digit appended to the correct span');
   await heading.click();
   assert.equal(await number(rate('stage1')),50);
   assert.equal(await number(rate('stage2')),30);
   assert.equal(await number(rate('stage3')),20);
   assert.equal(await number(amount('stage1')),12000);
   assert.equal(await number(amount('stage2')),7200,'rate change recalculated after blur');
   assert.equal(await number(amount('stage3')),4800);

   // Amounts are editable too; changing a number recalculates its rate and final balance.
   await amount('stage1').fill('6000');
   await heading.click();
   assert.equal(await number(rate('stage1')),25);
   assert.equal(await number(rate('stage2')),30);
   assert.equal(await number(rate('stage3')),45);
   assert.equal(await number(amount('stage1')),6000);
   assert.equal(await number(amount('stage2')),7200);
   assert.equal(await number(amount('stage3')),10800);

   await rate('stage3').fill('20');
   await heading.click();
   assert.equal(await number(rate('stage3')),20);
   assert.equal(await number(rate('stage2')),55);
   assert.equal(await number(amount('stage2')),13200);
   assert.equal(await number(amount('stage3')),4800);

   const beforeBadRate=await rate('stage2').innerText();
   const beforeBadAmount=await amount('stage2').innerText();
   await rate('stage2').fill('350');
   await heading.click();
   assert.equal(await rate('stage2').innerText(),beforeBadRate,'out of range rate reverted');
   assert.ok(alerts.some(s=>s.includes('0%至100%')),'out-of-range rate warned');
   await amount('stage2').fill('720¥12000');
   await heading.click();
   assert.equal(await amount('stage2').innerText(),beforeBadAmount,'concatenated amount reverted');
   assert.ok(alerts.some(s=>s.includes('有效数字')),'malformed monetary input warned');
   let after=await root.innerText();
   assert.ok(!after.includes('350%')&&!after.includes('720¥12000'),'no garbage appears in contract');

   // Complete modification and verify persisted custom contract remains coherent.
   const finish=await page.evaluate(()=>finishContractFullEdit());
   assert.equal(finish,true,'finish should accept all valid updated values');
   assert.equal(await root.getAttribute('contenteditable'),null,'closed editor');
   assert.equal(await rate('stage2').getAttribute('contenteditable'),null,'no editing when closed');
   assert.equal(await number(amount('stage2')),13200,'correct total persisted on finish');
   const saved=await page.evaluate(()=>typeof docsOf==='function'?docsOf():{});
   if(saved&&saved.electronic?.html){
    assert.ok(saved.electronic.html.includes('13,200'),'saved contract contains updated amount');
    assert.ok(!saved.electronic.html.includes('720¥12000'),'bad input never saved');
   }

   // Normal deposit + balance mode uses the same guarded editing behaviour.
   await page.evaluate(()=>{
    window.currentContractOrderId=null;window.currentQuoteOrderId=null;
    const $=id=>document.getElementById(id);
    // Use a distinct quote draft, avoiding restoration of the just-saved staged contract.
    $('cust').value='V487 独立的定金尾款测试';
    $('paymentMode').value='normal';syncPaymentMode(false);
    $('depositRate').value='35';
    calc();generateContract('electronic');
    toggleContractFullEdit();
   });
   const depositRate=rate('deposit'),deposit=amount('deposit'),remain=amount('remain');
   assert.equal(await number(depositRate),35);
   await depositRate.fill('40');
   await heading.click();
   assert.equal(await number(deposit),9600,'deposit 40% of 24000');
   assert.equal(await number(remain),14400,'remaining balance 60%');
   await remain.fill('12000');
   await heading.click();
   assert.equal(await number(depositRate),50,'deposit rate reflects direct balance edit');
   assert.equal(await number(deposit),12000);
   assert.equal(await number(remain),12000);
   assert.equal(await page.evaluate(()=>finishContractFullEdit()),true);
   console.log('PASS V487 safe in-place payment editing',width);
   await ctx.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
