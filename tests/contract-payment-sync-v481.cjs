const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
for(const [w,h] of [[375,812],[430,932],[768,1024]]){
const ctx=await browser.newContext({viewport:{width:w,height:h}});
const page=await ctx.newPage();
await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof generateContract==='function'&&typeof calc==='function');
const result=await page.evaluate(()=>{
show('quote');
const $=id=>document.getElementById(id);
$('finalTotal').value='10000';
const generate=(mode,rates)=>{
 $('paymentMode').value=mode;syncPaymentMode(false);
 if(mode==='staged'){['stage1Rate','stage2Rate','stage3Rate'].forEach((k,i)=>$(k).value=rates[i]);}
 else $('depositRate').value=rates[0];
 syncAllRatioValues();calc();generateContract('electronic');
 const content=$('contractPreview').textContent,html=$('contractPreview').innerHTML;
 return {content,html,mode:currentQuote.paymentMode,total:currentQuote.total,
  rates:mode==='staged'?[currentQuote.stage1Rate,currentQuote.stage2Rate,currentQuote.stage3Rate]:[currentQuote.depositRate],
  amounts:mode==='staged'?[currentQuote.stage1Amount,currentQuote.stage2Amount,currentQuote.stage3Amount]:[currentQuote.deposit,currentQuote.remain]};
};
return [generate('staged',[50,40,10]),generate('staged',[30,60,10]),generate('normal',[35])];
});
const [standard,custom,normal]=result;
assert.equal(standard.mode,'staged');
for(const t of ['50%','40%','10%','¥5,000','¥4,000','¥1,000'])assert.ok(standard.content.includes(t),'standard staged contract '+t);
assert.equal(custom.mode,'staged');
for(const t of ['30%','60%','10%','¥3,000','¥6,000','¥1,000'])assert.ok(custom.content.includes(t),'custom staged contract '+t);
assert.equal(normal.mode,'normal');
for(const t of ['35%','¥3,500','¥6,500'])assert.ok(normal.content.includes(t),'normal contract '+t);
assert.ok(!normal.content.includes('货物到达现场并经乙方验收后'),'normal contract has no stale staged clause');
for(const item of [standard,custom,normal])assert.ok(item.content.includes('第四条 付款及结算'),'payment clause present');
console.log('V481 payment contracts',w,'PASS');
await ctx.close();
}
console.log('PASS V481 quote-generated contracts reflect chosen mode, percent and amount');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
