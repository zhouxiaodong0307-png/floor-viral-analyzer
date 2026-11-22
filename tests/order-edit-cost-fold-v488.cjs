const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const [width,height] of [[375,812],[430,932],[768,1024],[1024,768]]){
      const ctx=await browser.newContext({viewport:{width,height}});
      const page=await ctx.newPage();
      page.on('dialog',async d=>d.accept());
      await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
      await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>typeof openOrderEdit==='function'&&typeof orders==='function');
      await page.evaluate(()=>{
        const order={
          id:94188,date:'2026/11/21',cust:'V488成本收起测试',opener:'测试',
          status:'进行中',orderMode:'manual',paymentMode:'staged',
          products:[{species:'龙凤檀',spec:'740×113',area:20,billArea:20,price:650,subtotal:13000}],
          salesItems:[{name:'龙骨',qty:1,unit:'项',price:3300,subtotal:3300}],
          originalTotal:16300,total:16300,sales:16300,paid:5000,
          costBreakdown:{floor:2500,install:0,batten:300,skirt:0,material:0,freight:0,remove:0,other:0},
          costStatus:'partial',cost:2800,
          eventHistory:[{type:'创建',text:'创建订单',date:'2026-11-21T08:00:00Z'}]
        };
        localStorage.setItem(KEY,JSON.stringify([order]));
        openOrderEdit(94188);
      });
      const modal=page.locator('#orderEditModal'),details=modal.locator('#editCostDetails');
      const summary=details.locator('summary');
      const ledger=details.locator('.edit-service-ledger');
      const metrics=details.locator('.edit-service-summary');
      const timeline=modal.locator('#editTimelineDetails');
      assert.equal(await modal.isVisible(),true);
      assert.equal(await details.count(),1);
      assert.equal(await summary.innerText().then(s=>s.includes('成本明细')),true);
      assert.equal(await details.evaluate(el=>el.open),false,'cost details must start closed');
      assert.equal(await ledger.isVisible(),false,'cost fields hidden by native details');
      assert.equal(await metrics.isVisible(),false,'cost summary collapsed with cost fields');
      assert.equal(await timeline.evaluate(el=>el.open),false,'operation history stays separately collapsed');
      assert.equal(await modal.getByRole('button',{name:'保存修改'}).isVisible(),true,'save controls remain visible');
      // DOM values are retained while folded and can still be used for calculations.
      assert.equal(await modal.locator('#eFloorCostTotal').inputValue(),'2500');
      assert.equal(await modal.locator('#eBattenCostTotal').inputValue(),'300');
      const initial=await page.evaluate(()=>JSON.stringify(orders()));
      await summary.click();
      assert.equal(await details.evaluate(el=>el.open),true,'tap to expand');
      assert.equal(await ledger.isVisible(),true);
      assert.equal(await metrics.isVisible(),true);
      await modal.locator('#eFloorCostTotal').fill('2800');
      const afterCost=await modal.locator('#eServiceCostSummary').innerText();
      assert.ok(afterCost.includes('3,100')||afterCost.includes('3100'),'summary recalculates while expanded: '+afterCost);
      await summary.click();
      assert.equal(await details.evaluate(el=>el.open),false,'tap to collapse');
      assert.equal(await ledger.isVisible(),false);
      assert.equal(await modal.locator('#eFloorCostTotal').inputValue(),'2800','collapse does not clear cost edits');
      assert.equal(await page.evaluate(()=>JSON.stringify(orders())),initial,'folding cannot mutate stored order');
      await modal.getByRole('button',{name:'取消'}).click();
      assert.equal(await modal.isVisible(),false);
      // Opening the same or another order must always restore default collapsed state.
      await page.evaluate(()=>openOrderEdit(94188));
      assert.equal(await details.evaluate(el=>el.open),false,'reopening starts collapsed');
      assert.equal(await modal.locator('#eFloorCostTotal').inputValue(),'2500','canceled unsaved edits are not retained');
      await summary.click();
      await modal.locator('#eFloorCostTotal').fill('2800');
      await modal.getByRole('button',{name:'保存修改'}).click();
      const result=await page.evaluate(()=>orders().find(o=>o.id===94188));
      assert.ok(result,'order still exists after editing');
      assert.equal(result.costBreakdown.floor,2800,'expanded cost input saves correctly');
      assert.equal(result.costBreakdown.batten,300,'other costs unchanged');
      assert.equal(result.status,'进行中','order status unchanged');
      console.log('PASS V488 default-folded cost ledger',width);
      await ctx.close();
    }
  }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
