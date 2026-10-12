'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
async function smoke(browser,name,url){
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'zh-CN',acceptDownloads:false});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('dialog',d=>d.dismiss());
  const pass=async(title,action,predicate)=>{
    await action();
    assert.equal(await predicate(),true,name+': '+title+' failed');
    console.log('PASS',name,title);
  };
  try{
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
    assert.ok(response && response.status()<400,name+': HTTP unavailable');
    await page.waitForFunction(()=>typeof window.show==='function'&&typeof window.showInternal==='function',{timeout:20000});
    assert.equal(await page.locator('#quote').count(),1);
    const title=await page.title();
    if(name==='staging'){
      assert.equal(title,'木业管家 V384','staging must serve actual V380 code');
      assert.equal(await page.evaluate(()=>typeof isVerifiedV371MacBackupOnlyV372),'function','staging recovery guard must initialize');
      const isolated=await page.evaluate(()=>({url:SUPABASE_URL,write:FLOOR_SYNC_WRITE_RELEASED_V363}));
      assert.equal(isolated.url,'','test must never connect to production database');
      assert.equal(isolated.write,false,'test must never write production data');
    }else { assert.equal(title,'木业管家 V382','production V382 baseline before promotion'); assert.equal(await page.evaluate(()=>typeof isVerifiedV371MacBackupOnlyV372),'function','production Mac recovery guard must initialize'); }
    console.log('PASS',name,'main JS initialized',title);
    // V382: empty brand-new quote must have no pre-created measurement row.
    // Preserve previously saved/restoreable measurements: do not clear browser storage on production.
    if(name==='staging'){
      const before=await page.locator('#measureRows > .measure-row').count();
      // Fresh isolated browser context has no stored quote and must start empty.
      assert.equal(before,0,'V382: initial area entry must be hidden until category click');
      await page.locator('#quote .measure-quick button').first().click();
      assert.equal(await page.locator('#measureRows > .measure-row').count(),1,'V382: category click must insert one row');
      await page.locator('#measureRows .measure-delete').first().click();
      assert.equal(await page.locator('#measureRows > .measure-row').count(),0,'V382: deleting final row remains empty');
      console.log('PASS staging V382 no default measurement; category adds; delete returns to empty');
      // V383 regression: old V381/V382 snapshots can carry one blank placeholder.
      const seed=async(measures)=>{await page.evaluate(ms=>{
        localStorage.setItem('floor_last_quote_state_v1',JSON.stringify({
          version:2,fields:{area:'55',price:'100',species:'柚木'},measures:ms,
          extras:[],manualOverrides:{area:true,install:false}
        }));
      },measures);await page.reload({waitUntil:'domcontentloaded'});};
      await seed([{kind:'area',floor:'1楼',name:'',expr:''}]);
      assert.equal(await page.locator('#measureRows > .measure-row').count(),0,'V383: blank historical placeholder should not render');
      assert.equal(await page.locator('#area').inputValue(),'55','V383: preserve quote area without measurement rows');
      await seed([{kind:'area',name:'',expr:''},{kind:'area',floor:'1楼',name:'客餐厅',expr:'300×400'}]);
      assert.equal(await page.locator('#measureRows > .measure-row').count(),1,'V383: preserve filled historical row only');
      assert.equal(await page.locator('#measureRows .mexpr').inputValue(),'300×400','V383: keep entered dimensions');
      assert.equal(await page.locator('#area').inputValue(),'55','V383: keep manually set area');
      await page.evaluate(()=>localStorage.removeItem('floor_last_quote_state_v1'));
      await page.reload({waitUntil:'domcontentloaded'});
      console.log('PASS staging V383 blank legacy rows filtered, filled rows and quote values retained');
    }
    // This legacy V58 control is deliberately CSS-hidden in both current layouts.
    if(await page.locator('#statsToggle').isVisible())
      await pass('business stats',()=>page.locator('#statsToggle').click(),()=>page.locator('#statsCards').evaluate(el=>!el.classList.contains('collapsed')));
    else console.log('SKIP',name,'retired stats toggle intentionally hidden by stylesheet');
    await pass('tools navigation',()=>page.locator('#navTools').click(),()=>page.locator('#tools').evaluate(el=>!el.classList.contains('hide')));
    await pass('tools action',()=>page.locator('#tools [data-tool="area"]').click(),()=>page.locator('#quickToolPanel').evaluate(el=>!el.classList.contains('hide')));
    await pass('more products',()=>page.locator('#navAllProducts').click(),()=>page.locator('#allProductsQuote').evaluate(el=>!el.classList.contains('hide')));
    await pass('product editor',()=>page.locator('#allProductsQuote .all-products-add').click(),()=>page.locator('#allProductEditor').evaluate(el=>!el.classList.contains('hide')));
    await pass('product compare',()=>page.locator('#navCompare').click(),()=>page.locator('#compare').evaluate(el=>!el.classList.contains('hide')));
    await pass('quote navigation',()=>page.locator('#navQuote').click(),()=>page.locator('#quote').evaluate(el=>!el.classList.contains('hide')));
    await pass('internal backstage entry',()=>page.locator('#businessTitleAccess').dblclick(),()=>page.locator('body').evaluate(el=>el.classList.contains('internal-business')));
    await pass('orders page',()=>page.locator('#navOrders').click(),()=>page.locator('#orders').evaluate(el=>!el.classList.contains('hide')));
    await pass('manual order toggle',()=>page.locator('#orderManagerToggle').click(),()=>page.locator('#orderManagerContent').evaluate(el=>!el.classList.contains('collapsed')));
    await pass('cloud panel toggle',()=>page.locator('#dataSyncPanel > summary').click(),()=>page.locator('#dataSyncPanel').evaluate(el=>el.open));
    await pass('advanced sync panel toggle',()=>page.locator('#dataSyncAdvancedV370 > summary').click(),()=>page.locator('#dataSyncAdvancedV370').evaluate(el=>el.open));

    if(name==='staging'){
      const ui=await page.locator('#dataSyncPanel').evaluate(el=>{
        const panel=el.querySelector('.data-sync-popover'), grid=el.querySelector('#dataSyncAdvancedV370 .data-sync-advanced-content');
        return {width:panel.getBoundingClientRect().width,display:getComputedStyle(grid).display,maxHeight:getComputedStyle(panel).maxHeight,scroll:panel.scrollHeight,client:panel.clientHeight,actions:grid.querySelectorAll('button').length};
      });
      assert.ok(ui.width>=330,'responsive panel '+JSON.stringify(ui));
      assert.equal(ui.display,'grid','V377 responsive maintenance grid preserved');
      assert.ok(ui.client<=800,'bounded scrollable panel');
      assert.ok(ui.actions>=8,'all original maintenance actions preserved');
      console.log('PASS responsive sync panel',JSON.stringify(ui));
    }

    await pass('finance page',()=>page.locator('#navFinance').click(),()=>page.locator('#finance').evaluate(el=>!el.classList.contains('hide')));
    await pass('cost page',()=>page.locator('#navCost').click(),()=>page.locator('#tools').evaluate(el=>!el.classList.contains('hide')));
    await pass('back to customer',()=>page.locator('#internalExitBtn').click(),()=>page.locator('body').evaluate(el=>!el.classList.contains('internal-business')));
    assert.ok(!errors.some(e=>/SyntaxError|Unexpected token/.test(e)),name+': syntax error: '+errors.join('; '));
    console.log('OK',name,'15 browser interactions','pageErrors:',errors.length,errors.slice(0,3));
  }catch(e){
    await page.screenshot({path:'/tmp/muye-'+name+'.png',fullPage:true}).catch(()=>{});
    console.error('FAIL',name,String(e),'pageErrors:',errors);
    throw e;
  }finally{await context.close()}
}
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    await smoke(browser,'staging','https://muye-guan-jia-migration-test.onrender.com/');
    await smoke(browser,'production-readonly','https://muye-guan-jia.onrender.com/');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
