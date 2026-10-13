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
      assert.equal(title,'木业管家 V401','staging must serve actual V401 code');
      assert.equal(await page.evaluate(()=>typeof isVerifiedV371MacBackupOnlyV372),'function','staging recovery guard must initialize');
      const isolated=await page.evaluate(()=>({url:SUPABASE_URL,authUrl:FLOOR_AUTH_URL,authMode:FLOOR_AUTH_MODE,write:isCloudWritableRuntime()}));
      assert.equal(isolated.url,'','test must never connect to production database');
      assert.equal(isolated.authUrl,'','test authentication must be disabled');
      assert.equal(isolated.authMode,'disabled','test must not authenticate');
      assert.equal(isolated.write,false,'test must never write production data');
    }else { assert.equal(title,'木业管家 V401','production must serve released V401'); assert.equal(await page.evaluate(()=>typeof isVerifiedV371MacBackupOnlyV372),'function','production Mac recovery guard must initialize'); }
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
    
    const quotePaper=await page.evaluate(()=>{
      window.currentContractOrderId=null;window.currentQuoteOrderId=null;
      for(const [id,val] of Object.entries({cust:'报价备注回归客户',species:'缅甸柚木',spec:'740×115×17',area:'20',price:'300',quoteNote:'地板备注：不同批次须先确认颜色与拼接方向。'}))
        document.getElementById(id).value=val;
      const q=calc();if(q.total<=0)throw Error('报价金额未建立');
      generateContract('paper');
      const first=document.getElementById('contractPreview').textContent.includes('不同批次须先确认颜色');
      toggleContractFullEdit();
      document.querySelector('#contractPreview .contract-account').textContent+=' 纸质合同专项人工补充条款。';
      toggleContractFullEdit();
      generateContract('paper');
      const saved=document.getElementById('contractPreview').textContent.includes('纸质合同专项人工补充条款');
      generateContract('electronic');
      const isolated=!document.getElementById('contractPreview').textContent.includes('纸质合同专项人工补充条款');
      return {first,saved,isolated,total:q.total};
    });
    assert.equal(quotePaper.first,true,'quote remark must appear on fresh paper contract');
    assert.equal(quotePaper.saved,true,'paper contract full edit must reopen from local quote draft');
    assert.equal(quotePaper.isolated,true,'paper manual edit must not leak into electronic contract');
    page.on('dialog',d=>d.type()==='prompt'?d.accept('0'):d.accept());
    const conversion=await page.evaluate(()=>{
      window.currentContractOrderId=null;window.currentQuoteOrderId=null;
      const ok=confirmCurrentQuote(true);
      const id=window.currentQuoteOrderId;
      const o=orders().find(x=>String(x.id)===String(id));
      if(ok&&o)sendOrderContract(id);
      return {ok:!!ok,note:o?.quoteNote||'',contract:document.getElementById('contractPreview').textContent,total:o?.sales||0};
    });
    assert.equal(conversion.ok,true,'actual quote to order conversion must succeed');
    assert.ok(conversion.note.includes('不同批次须先确认颜色'),'actual quote remark must persist on converted order');
    assert.ok(conversion.contract.includes('不同批次须先确认颜色'),'actual quote remark must appear when contract is sent later');
    console.log('PASS V399 real quote-to-order remark and paper/electronic draft separation');
    
    console.log('PASS V399 order remark, edited contract saved/reopened/reloaded, per-order isolation, safe regeneration');
  }catch(e){await page.screenshot({path:'/tmp/muye-contract-v399.png',fullPage:true}).catch(()=>{});console.error('V399 contract regression failed',String(e),errors);throw e}
  finally{await context.close()}
}


async function measurementArchiveRegression(browser){
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'zh-CN'});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('dialog',d=>d.type()==='prompt'?d.accept('0'):d.accept());
  try{
    const response=await page.goto('https://muye-guan-jia-migration-test.onrender.com/',{waitUntil:'domcontentloaded'});
    assert.ok(response?.ok(),'V400 isolated staging not reachable');
    await page.waitForFunction(()=>typeof window.muyeMeasureArchiveStatusV400==='function'&&typeof confirmCurrentQuote==='function');

    const numericKeyboard=await page.evaluate(()=>{
      clearQuoteInputs();
      const row=addMeasureRow('测试房间','325','2楼');
      const dimension=row.querySelector('.mexpr');
      const expectedInputType=dimension.type==='text'&&dimension.inputMode==='decimal';
      insertMeasureSymbol('×',dimension,{start:3,end:3});dimension.value+='430';
      insertMeasureSymbol('+',dimension,{start:7,end:7});dimension.value+='60×100';
      const formula=dimension.value,calculated=parseMeasureExpr(formula);
      const stairs=addStairMeasureRow('2楼');
      const platform=stairs.querySelector('.stair-platform');
      platform.value='120';
      insertMeasureSymbol('×',platform,{start:3,end:3});platform.value+='100';
      const platformResult=parsePlatformArea(platform.value);
      const stairOther=[...stairs.querySelectorAll('.stair-width,.stair-depth,.stair-riser')].every(x=>x.inputMode==='decimal');
      const numeric={expectedInputType,platformInputMode:platform.inputMode,platformType:platform.type,formula,calculated,platformFormula:platform.value,platformResult,stairOther};
      clearQuoteInputs();
      return numeric;
    });
    assert.equal(numericKeyboard.expectedInputType,true,'dimension requires text type + decimal keypad');
    assert.equal(numericKeyboard.platformInputMode,'decimal','stair platform requires decimal keypad');
    assert.equal(numericKeyboard.platformType,'text','platform formula cannot use type=number');
    assert.equal(numericKeyboard.stairOther,true,'other stair dimensions retain decimal keypad');
    assert.equal(numericKeyboard.formula,'325×430+60×100','× and + buttons must remain functional');
    assert.ok(Math.abs(numericKeyboard.calculated-14.575)<0.0001,'room formula calculation remains correct');
    assert.equal(numericKeyboard.platformFormula,'120×100','platform × remains functional');
    assert.ok(Math.abs(numericKeyboard.platformResult-1.2)<0.00001,'platform calculation remains correct');
    console.log('PASS V401 iPhone numeric keypad hints, dynamic room and stair fields, ×/+ formula entry');

    const result=await page.evaluate(()=>{
      const measure=[
       {floor:'2楼',name:'过道',expr:'655x170+895x120'},
       {floor:'2楼',name:'房间1',expr:'325x430'},
       {floor:'2楼',name:'房间2',expr:'325x380'},
       {floor:'3楼',name:'房间1',expr:'135x170+320x268'},
       {floor:'3楼',name:'房间2',expr:'325x376+60x105'},
       {floor:'3楼',name:'房间3',expr:'316x330'},
       {floor:'3楼',name:'房间4',expr:'355x345+210x100+331x75'},
       {floor:'3楼',name:'过道',expr:'120x390'},
       {floor:'3楼',name:'客餐厅',expr:'350x460'},
       {floor:'4楼',name:'房间1',expr:'300x340'}
      ];
      const config={
        version:2,measureFloors:['2楼','3楼','4楼'],activeMeasureFloor:'3楼',
        fields:{cust:'别墅量房档案回归',species:'缅甸柚木',spec:'740×115×17',price:'300',measureLoss:'5',depositRate:'50',paymentMode:'normal'},
        measures:measure.map(x=>({...x,kind:'area'})),extras:[],manualOverrides:{area:false,install:false}
      };
      applyQuoteDraft(config);
      const quoted=calc();
      const prevCount=orders().length;
      const created=confirmCurrentQuote(true);
      const id=window.currentQuoteOrderId;
      const o=orders().find(x=>String(x.id)===String(id));
      const m=o?.measureSnapshot;
      return {created,id,oldCount:prevCount,newCount:orders().length,
        floors:m?.floors?.map(x=>x.name),rows:m?.rows?.map(x=>({floor:x.floor,name:x.name,expr:x.expr,area:x.area})),
        measured:m?.measuredArea,quotedArea:o?.area,quotedTotal:o?.sales,
        areaBefore:quoted.area,orderHtml:o?orderRowDetailHtml(o):'',cloudData:currentBusinessState().orders.some(x=>String(x.id)===String(id)&&x.measureSnapshot?.rows?.length===10)};
    });
    assert.equal(result.created,true,'V400 quote conversion failed');
    assert.equal(result.newCount,result.oldCount+1,'must create exactly one order');
    assert.deepEqual(result.floors,['2楼','3楼','4楼'],'must preserve 2-4 floors without fabricating first floor');
    assert.equal(result.rows.length,10,'must preserve all ten original room entries');
    assert.equal(result.rows[0].expr,'655x170+895x120','must preserve original calculation formula');
    assert.equal(result.rows[3].name,'房间1','duplicate room names across floors are valid');
    assert.ok(Math.abs(result.measured-130.16)<0.02,'room area total '+result.measured);
    assert.equal(result.cloudData,true,'JSON cloud payload must include archive');
    assert.ok(result.orderHtml.includes('量房明细')&&result.orderHtml.includes('2楼')&&result.orderHtml.includes('4楼'),'order must display archived measurement');
    const id=result.id;
    const afterClear=await page.evaluate(id=>{
      clearQuoteInputs();
      const o=orders().find(x=>String(x.id)===String(id));
      return {exists:!!o?.measureSnapshot,rooms:o?.measureSnapshot?.rows?.length,
        html:orderRowDetailHtml(o),quoteRows:document.querySelectorAll('#measureRows .measure-row').length};
    },id);
    assert.equal(afterClear.quoteRows,0,'quote clear must still clear quote');
    assert.equal(afterClear.rooms,10,'quote clear must not delete archived order record');
    assert.ok(afterClear.html.includes('过道'),'room lookup must survive quote clear');
    await page.reload({waitUntil:'domcontentloaded'});
    const afterReload=await page.evaluate(id=>{
      const o=orders().find(x=>String(x.id)===String(id));
      return {status:muyeMeasureArchiveStatusV400(id),html:o?orderRowDetailHtml(o):'',state:JSON.stringify(currentBusinessState()).includes('655x170+895x120')};
    },id);
    assert.equal(afterReload.status.rowCount,10,'reload must preserve all 10 rooms');
    assert.deepEqual(afterReload.status.floors,['2楼','3楼','4楼']);
    assert.equal(afterReload.state,true,'local cloud state serialization must preserve raw expression');

    const edited=await page.evaluate(id=>{
      const before=orders().find(x=>String(x.id)===String(id));
      const oldDate=before.date;
      openOrderEdit(id);
      const editing=document.getElementById('orderEditModal');
      const modalOpened=!editing.classList.contains('hide');
      document.getElementById('eCust').value='别墅量房档案回归（已编辑）';
      document.getElementById('eOpener').value='测试开单人';
      saveOrderEdit();
      const latest=orders().find(x=>String(x.id)===String(id));
      return {modalOpened,updated:latest?.cust==='别墅量房档案回归（已编辑）',
        rows:latest?.measureSnapshot?.rows?.length||0,floors:latest?.measureSnapshot?.floors?.map(x=>x.name)||[],
        expression:latest?.measureSnapshot?.rows?.[0]?.expr,oldDate};
    },id);
    assert.equal(edited.modalOpened,true,'existing order editor must open');
    assert.equal(edited.updated,true,'existing order edit must commit');
    assert.equal(edited.rows,10,'editing normal order fields must not lose archived rooms');
    assert.deepEqual(edited.floors,['2楼','3楼','4楼']);
    assert.equal(edited.expression,'655x170+895x120');
    
    // Legacy manual orders without snapshots should not show fabricated measurements.
    const legacy=await page.evaluate(()=>orderRowDetailHtml({id:9913922,cust:'历史订单',date:'2026/1/1',status:'进行中',sales:100,paid:0,products:[]}));
    assert.ok(!legacy.includes('order-measure-archive'),'legacy order must not invent survey records');
    // Stairway and manual quote-area overrides require separate measurement and billing amounts.
    const stair=await page.evaluate(()=>{
      applyQuoteDraft({version:2,measureFloors:['2楼'],activeMeasureFloor:'2楼',
       fields:{cust:'楼梯明细回归',species:'柚木',spec:'910×125×18',price:'300',area:'100',measureLoss:'5',depositRate:'50',paymentMode:'normal'},
       measures:[{kind:'stair',floor:'2楼',name:'楼梯A',width:'120',depth:'30',count:'12',riser:'18',platform:'120x100'}],
       extras:[],manualOverrides:{area:true,install:false}});
      const pre=calc();
      const made=confirmCurrentQuote(true),id=window.currentQuoteOrderId;
      const order=orders().find(x=>String(x.id)===String(id));
      return {made,quotedArea:pre.area,rows:order?.measureSnapshot?.rows,
        measured:order?.measureSnapshot?.measuredArea,manual:order?.measureSnapshot?.manuallyAdjustedArea,
        details:order?orderRowDetailHtml(order):''};
    });
    assert.equal(stair.made,true,'stair quote conversion failed');
    assert.equal(stair.rows.length,1,'one stair must be archived');
    assert.equal(stair.rows[0].width,'120','must store staircase original dimensions');
    assert.equal(stair.rows[0].platform,'120x100','must store staircase platform expression');
    assert.ok(Math.abs(stair.measured-8.112)<0.001,'stair area must follow quote logic');
    assert.equal(stair.quotedArea,100,'manual quoted area must remain authoritative');
    assert.equal(stair.manual,true,'manual area override must be recorded, not overwritten');
    assert.ok(stair.details.includes('100.00㎡'),'manual billed source must be visible alongside raw survey');
    assert.ok(!errors.some(e=>/SyntaxError|TypeError|ReferenceError/.test(e)),'runtime errors '+errors.join('; '));
    console.log('PASS V400 2F-4F 10 rooms, stair archive, original formulas, quote clear, reload, manual overrides, legacy compatibility and cloud serialization');
  }catch(e){
    await page.screenshot({path:'/tmp/muye-survey-v400.png',fullPage:true}).catch(()=>{});
    console.error('FAIL V400 measurement archive',String(e),errors);throw e;
  }finally{await context.close()}
}

(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    await smoke(browser,'staging','https://muye-guan-jia-migration-test.onrender.com/');
    await contractRegression(browser);
    await measurementArchiveRegression(browser);
    await smoke(browser,'production-readonly','https://muye-guan-jia.onrender.com/');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
