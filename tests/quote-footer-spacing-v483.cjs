const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
  try {
    for (const [width,height] of [[375,812],[430,932],[768,1024],[1024,768]]) {
      const context = await browser.newContext({viewport:{width,height}});
      const page = await context.newPage();
      await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
      await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#quoteConvertToOrderBtn'));
      const result=await page.evaluate(()=>{
        const quote=document.querySelector('#quote > .box');
        const button=document.querySelector('#quoteConvertToOrderBtn');
        const outer=quote.getBoundingClientRect(), inner=button.getBoundingClientRect();
        return {footerGap:outer.bottom-inner.bottom, buttonText:button.textContent.trim(),
          panelCount:document.querySelectorAll('#quote #internalBottomPanel').length,
          horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth+2,
          buttonWidth:inner.width};
      });
      assert.equal(result.buttonText,'转为订单');
      assert.equal(result.panelCount,0,'obsolete empty footer panel must be removed');
      assert.ok(result.footerGap>=0&&result.footerGap<=35,'unexpected bottom gap '+result.footerGap+'px for '+width);
      assert.ok(result.buttonWidth>180,'conversion button must remain full-width');
      assert.equal(result.horizontalOverflow,false,'horizontal overflow at '+width);
      console.log('PASS V483 footer spacing at',width,'bottom gap',result.footerGap);
      await context.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
