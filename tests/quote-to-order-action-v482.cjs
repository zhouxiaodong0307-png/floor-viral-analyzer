const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
  try {
    for (const [width, height] of [[375, 812], [430, 932], [768, 1024]]) {
      const ctx = await browser.newContext({viewport: {width, height}});
      const page = await ctx.newPage();
      const dialogs = [];
      page.on('dialog', async dialog => {
        dialogs.push(dialog.type());
        if (dialog.type() === 'prompt') await dialog.accept('1000');
        else await dialog.accept();
      });
      await page.route('**/*', route =>
        route.request().url().startsWith('http://127.0.0.1:8765/')
          ? route.continue() : route.abort());
      await page.goto('http://127.0.0.1:8765/floor-assistant-v285/', {
        waitUntil: 'domcontentloaded'
      });
      await page.waitForFunction(() =>
        typeof convertQuoteToOrderFromMainV482 === 'function' &&
        typeof confirmCurrentQuote === 'function' &&
        typeof orders === 'function');
      const button = page.locator('#quote #quoteConvertToOrderBtn');
      assert.equal(await button.textContent(), '转为订单');
      assert.equal(await button.getAttribute('onclick'), 'convertQuoteToOrderFromMainV482()');
      assert.equal(await page.locator('#quote .actions button').count(), 2);
      assert.equal(await page.locator('#quote button:has-text("生成报价单长图并分享")').count(), 0);
      const before = await page.evaluate(() => orders().length);
      await button.click();
      assert.equal(await page.evaluate(() => orders().length), before, 'empty quote must not be converted');
      assert.equal(dialogs.includes('prompt'), false, 'no payment prompt for empty quote');

      await page.evaluate(() => {
        const $ = id => document.getElementById(id);
        $('cust').value = 'V482 转单测试';
        $('species').value = '缅甸柚木';
        $('spec').value = '740×115×17';
        $('area').value = '20';
        $('price').value = '250';
        $('install').value = '25';
        $('finalTotal').value = '';
        $('paymentMode').value = 'staged';
        $('stage1Rate').value = '50';
        $('stage2Rate').value = '40';
        $('stage3Rate').value = '10';
        syncPaymentMode(false);
        calc();
      });
      await button.click();
      await page.waitForFunction(() => orders().some(o => o.cust === 'V482 转单测试'));
      const first = await page.evaluate(() => {
        const selected = orders().filter(o => o.cust === 'V482 转单测试');
        const o = selected[0];
        return {count: selected.length, all: orders().length, paid: o.paid,
          mode: o.paymentMode, plan: o.paymentPlan, status: o.status,
          products: o.products, salesItems: o.salesItems, total: o.total,
          convertedId: window.currentQuoteOrderId};
      });
      assert.equal(first.count, 1);
      assert.equal(first.all, before + 1);
      assert.equal(first.status, '进行中');
      assert.equal(first.paid, 1000);
      assert.equal(first.mode, 'staged');
      assert.deepEqual([first.plan.stage1Rate,first.plan.stage2Rate,first.plan.stage3Rate],[50,40,10]);
      assert.equal(first.products[0].species, '缅甸柚木');
      assert.equal(first.products[0].spec, '740×115×17');
      assert.equal(first.products[0].area, 20);
      assert.equal(first.products[0].price, 250);
      assert.ok(first.salesItems.some(x => x.name === '安装费' && x.price === 25));
      assert.ok(first.total > 0);
      assert.ok(first.convertedId, 'converted order tracked');
      assert.equal(dialogs.filter(x => x === 'prompt').length, 1);

      await page.waitForTimeout(380);
      await page.evaluate(() => convertQuoteToOrderFromMainV482());
      assert.equal(await page.evaluate(() => orders().filter(o => o.cust === 'V482 转单测试').length),
        1, 'repeat action must not duplicate order');
      assert.equal(dialogs.filter(x => x === 'prompt').length, 1);
      console.log('PASS V482 quote-to-order button', width);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
