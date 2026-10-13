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
      assert.equal(title,'木业管家 V399','staging must serve actual V399 code');
      assert.equal(await page.evaluate(()=>typeof isVerifiedV371MacBackupOnlyV372),'function','staging recovery guard must initialize');
      const isolated=await page.evaluate(()=>({url:SUPABASE_URL,authUrl:FLOOR_AUTH_URL,authMode:FLOOR_AUTH_MODE,write:isCloudWritableRuntime()}));
      assert.equal(isolated.url,'','test must never connect to production database');
      assert.equal(isolated.authUrl,'','test authentication must be disabled');
      assert.equal(isolated.authMode,'disabled','test must not authenticate');
      assert.equal(isolated.write,false,'test must never write production data');
    }else { assert.equal(title,'木业管家 V398','production must remain V398 during V399 validation'); assert.equal(await page.evaluate(()=>typeof isVerifiedV371MacBackupOnlyV372),'function','production Mac recovery guard must initialize'); }
    console.log('PASS',name,'main JS initialized',title);
    if(name!=='staging') {console.log('PASS production immutable read-only load check, no UI writes');return;}
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

async function contractRegression(browser){
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'zh-CN'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
    await page.goto('https://muye-guan-jia-migration-test.onrender.com/',{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForFunction(()=>typeof window.sendOrderContract==='function'&&typeof window.muyeContractRevisionStatus==='function');
    const id=99139901,otherId=99139902;
    const seeded=await page.evaluate(({id,otherId})=>{
      const make=i=>({
        id:i,cust:'合同回归测试客户',date:'2026/10/13',opener:'回归测试',project:'合同回归测试',
        orderMode:'auto',entrySource:'quote',pricingMode:'quote_bill_area',paymentMode:'normal',
        products:[{species:'缅甸柚木',spec:'740×115×17',area:20,billArea:21,price:300,subtotal:6300}],
        salesItems:[],species:'缅甸柚木',spec:'740×115×17',area:20,billArea:21,price:300,
        sales:6300,total:6300,finalAmount:6300,paid:3000,
        quoteNote:i===id?'地板备注：须按确认色号加工，材料分批验收。':'',
        costBreakdown:{floor:3500,install:0,batten:0,skirt:0,material:0,freight:0,remove:0,other:0},
        updatedAt:'2026-10-13T12:00:00Z',status:'进行中'
      });
      const current=orders().filter(x=>String(x.id)!==String(id)&&String(x.id)!==String(otherId));
      localStorage.setItem('floor_orders_v3',JSON.stringify([...current,make(id),make(otherId)]));
      sendOrderContract(id);
      return {note:document.getElementById('contractPreview').textContent.includes('材料分批验收'),visible:!document.getElementById('contractDoc').classList.contains('hide')};
    },{id,otherId});
    assert.equal(seeded.note,true,'original quoted floor remark must be in order contract');
    assert.equal(seeded.visible,true,'order contract preview must open');
    const manual='人工修改后的合同条款：按业主指定时间分批送货，优先以本条款为准。';
    await page.evaluate(str=>{
      toggleContractFullEdit();
      const section=document.querySelector('#contractPreview .contract-account');
      section.textContent+=' '+str;
      toggleContractFullEdit();
    },manual);
    const saved=await page.evaluate(id=>{
      const order=orders().find(x=>String(x.id)===String(id));
      return {saved:order?.contractEditedDocuments?.electronic?.html||'',note:order?.quoteNote||'',status:muyeContractRevisionStatus().saved}
    },id);
    assert.ok(saved.saved.includes(manual),'full edited contract must save to actual order record');
    assert.equal(saved.status,true,'contract edit status must report saved');
    assert.ok(saved.note.includes('材料分批验收'),'quote remark must remain in order');
    await page.evaluate(id=>{returnFromOrderContract();sendOrderContract(id)},id);
    assert.ok((await page.locator('#contractPreview').textContent()).includes(manual),'manual edit must survive back to order and reopen');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.evaluate(id=>sendOrderContract(id),id);
    assert.ok((await page.locator('#contractPreview').textContent()).includes(manual),'manual edit must survive full page reload');
    await page.evaluate(otherId=>sendOrderContract(otherId),otherId);
    assert.ok(!(await page.locator('#contractPreview').textContent()).includes(manual),'different order must not inherit edited contract');
    await page.evaluate(id=>sendOrderContract(id),id);
    page.once('dialog',d=>d.dismiss());
    const canceled=await page.evaluate(()=>buildContractFromModal(false));
    assert.equal(canceled,false,'manual contract must not be overwritten without confirmation');
    assert.ok((await page.locator('#contractPreview').textContent()).includes(manual),'cancel must preserve edited contract');
    page.once('dialog',d=>d.accept());
    await page.evaluate(()=>buildContractFromModal(false));
    const after=await page.evaluate(id=>({
      html:document.getElementById('contractPreview').textContent,
      manualSaved:!!orders().find(x=>String(x.id)===String(id))?.contractEditedDocuments?.electronic
    }),id);
    assert.equal(after.manualSaved,false,'explicit regenerated contract must clear manual version');
    assert.ok(!after.html.includes(manual),'confirmed regenerate must replace manual content');
    assert.ok(!errors.some(x=>/SyntaxError|TypeError|ReferenceError/.test(x)),'page errors '+JSON.stringify(errors));
    console.log('PASS V399 order remark, edited contract saved/reopened/reloaded, per-order isolation, safe regeneration');
  }catch(e){await page.screenshot({path:'/tmp/muye-contract-v399.png',fullPage:true}).catch(()=>{});console.error('V399 contract regression failed',String(e),errors);throw e}
  finally{await context.close()}
}

(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    await smoke(browser,'staging','https://muye-guan-jia-migration-test.onrender.com/');
    await contractRegression(browser);
    await smoke(browser,'production-readonly','https://muye-guan-jia.onrender.com/');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
