const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const version=JSON.parse(fs.readFileSync('floor-assistant-v285/version.json','utf8')).version;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[320,690],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1366,900]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:width<=430,hasTouch:width<=1024});
   const page=await context.newPage();
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof calc==='function'&&typeof syncAllRatioValues==='function');
   const initial=await page.evaluate(()=>{
    const get=id=>document.getElementById(id);
    const values=['stage1Rate','stage2Rate','stage3Rate'].map(id=>Number(get(id).value));
    const labels=['stage1Rate','stage2Rate','stage3Rate'].map(id=>get(id).closest('.quote-stage-row').querySelector('.quote-stage-head span')?.textContent);
    const controls=['stage1Rate','stage2Rate','stage3Rate'].map(id=>document.querySelector('[data-ratio-for="'+id+'"]'));
    const percent=controls.map(x=>x.dataset.ratioText||x.textContent.trim());
    return {version:document.querySelector('meta[name="app-version"]').content,values,labels,percent,
     mode:get('paymentMode').value,deposit:Number(get('depositRate').value)};
   });
   assert.equal(initial.version,'V'+version);
   assert.deepEqual(initial.values,[50,40,10],width+' initial stage defaults');
   assert.deepEqual(initial.labels,['定金','货到现场验收','安装完成结清'],'stage labels unchanged');
   assert.deepEqual(initial.percent,['50%','40%','10%'],'visible percentage labels updated');
   assert.equal(initial.mode,'staged','default payment mode must be staged');
   assert.equal(initial.deposit,50,'normal deposit remains unchanged');
   const staged=await page.evaluate(()=>{
    show('quote');
    const get=id=>document.getElementById(id);
    get('paymentMode').value='staged';syncPaymentMode();
    get('finalTotal').value='10000';const q=calc();
    const controls=['stage1Rate','stage2Rate','stage3Rate'].map(id=>document.querySelector('[data-ratio-for="'+id+'"]'));
    const wrap=get('stagePaymentRows').getBoundingClientRect();
    const ratioBoxes=controls.map(el=>el.getBoundingClientRect());
    return {rates:[q.stage1Rate,q.stage2Rate,q.stage3Rate],amounts:[q.stage1Amount,q.stage2Amount,q.stage3Amount],
       total:q.stageRateTotal,mode:q.paymentMode,deposit:q.deposit,remaining:q.remain,
       warning:get('stageWarning').textContent.trim(),
       cardWidth:wrap.width,ratiosInside:ratioBoxes.every(box=>box.left>=wrap.left-2&&box.right<=wrap.right+2),
       editable:controls.every(el=>!!el.querySelector('input.ratio-manual-input')),
       text:[get('stage1Amount').textContent,get('stage2Amount').textContent,get('stage3Amount').textContent]};
   });
   assert.deepEqual(staged.rates,[50,40,10]);
   assert.deepEqual(staged.amounts,[5000,4000,1000]);
   assert.equal(staged.total,100);
   assert.equal(staged.mode,'staged');
   assert.equal(staged.deposit,5000);
   assert.equal(staged.remaining,5000);
   assert.equal(staged.warning,'');
   assert.ok(staged.ratiosInside,'payment ratios remain within their row at '+width);
   assert.equal(staged.editable,true,'manual percent editing preserved');
   assert.deepEqual(staged.text,['¥5,000','¥4,000','¥1,000']);
   if(width===390){
    const state=await page.evaluate(()=>{
     const get=id=>document.getElementById(id);
     // User-defined staged ratios remain editable and must survive saving/restoration.
     get('stage1Rate').value=35;get('stage2Rate').value=55;get('stage3Rate').value=10;
     syncAllRatioValues();calc();
     const saved=quoteDraftSnapshot();
     if(saved.fields.stage1Rate!=='35'||saved.fields.stage2Rate!=='55')throw Error('quote snapshot mismatch');
     clearQuoteInputs();
     const cleared=['stage1Rate','stage2Rate','stage3Rate'].map(id=>Number(get(id).value));
     const modeAfterClear=get('paymentMode').value;
     const clearedLabels=['stage1Rate','stage2Rate','stage3Rate'].map(id=>document.querySelector('[data-ratio-for="'+id+'"]').dataset.ratioText);
     applyQuoteDraft(saved);
     const restored=['stage1Rate','stage2Rate','stage3Rate'].map(id=>Number(get(id).value));
     const restoredMode=get('paymentMode').value;
     // Historical or deliberately selected 40/50/10 must not be silently rewritten.
     const historic={...saved,fields:{...saved.fields,stage1Rate:'40',stage2Rate:'50',stage3Rate:'10'}};
     applyQuoteDraft(historic);
     const historical=['stage1Rate','stage2Rate','stage3Rate'].map(id=>Number(get(id).value));
     const active=calc();
     return {cleared,modeAfterClear,clearedLabels,restored,restoredMode,historical,
      currentHistoric:active.stageRateTotal,stagedMode:active.paymentMode,
      quoteStateKey:typeof LAST_QUOTE_STATE_KEY==='string'};
    });
    assert.deepEqual(state.cleared,[50,40,10],'clear must reset staged default');
    assert.deepEqual(state.clearedLabels,['50%','40%','10%'],'clear must update visible labels');
    assert.equal(state.modeAfterClear,'staged','clear resets payment mode to staged');
    assert.deepEqual(state.restored,[35,55,10],'saved custom ratios not overwritten');
    assert.equal(state.restoredMode,'staged','saved mode preserved');
    assert.deepEqual(state.historical,[40,50,10],'old drafts remain unchanged');
    assert.equal(state.currentHistoric,100);
    assert.equal(state.stagedMode,'staged');
    assert.equal(state.quoteStateKey,true);
   }
   if(width===390){
     const legacy=await page.evaluate(()=>{
       const get=id=>document.getElementById(id);
       const base=quoteDraftSnapshot();
       const legacyDefault={...base,id:null,fields:{...base.fields,paymentMode:'normal',stage1Rate:'40',stage2Rate:'50',stage3Rate:'10'}};
       localStorage.setItem(LAST_QUOTE_STATE_KEY,JSON.stringify(legacyDefault));
       const changed=restoreLastQuoteState();
       const restored=[get('stage1Rate').value,get('stage2Rate').value,get('stage3Rate').value];
       const upgraded=JSON.parse(localStorage.getItem(LAST_QUOTE_STATE_KEY));
       const stageVisible=!get('stagePaymentRows').classList.contains('collapsed');
       const mode=get('paymentMode').value;
       const historicalSaved={...legacyDefault,id:'QD-older-explicit',fields:{...legacyDefault.fields,paymentMode:'normal',stage1Rate:'40',stage2Rate:'50',stage3Rate:'10'}};
       const untouched=migrateLegacyAutoQuotePaymentV471(historicalSaved);
       const custom={...legacyDefault,fields:{...legacyDefault.fields,paymentMode:'staged',stage1Rate:'30',stage2Rate:'60',stage3Rate:'10'}};
       const retained=migrateLegacyAutoQuotePaymentV471(custom);
       const existingV470={...legacyDefault,fields:{...legacyDefault.fields,paymentMode:'normal',stage1Rate:'50',stage2Rate:'40',stage3Rate:'10'}};
       const corrected=migrateLegacyAutoQuotePaymentV471(existingV470);
       return {changed,restored,mode,stageVisible,upgradedFields:upgraded.fields,
         historyUnchanged:untouched===historicalSaved,customUnchanged:retained===custom,
         v470Mode:corrected.fields.paymentMode,v470Rates:[corrected.fields.stage1Rate,corrected.fields.stage2Rate,corrected.fields.stage3Rate],
         versionTag:corrected.paymentDefaultVersion};
     });
     assert.equal(legacy.changed,true);
     assert.deepEqual(legacy.restored,['50','40','10'],'old last-quote autosave 40/50/10 migrated');
     assert.equal(legacy.mode,'staged','legacy default normal corrected');
     assert.equal(legacy.stageVisible,true);
     assert.deepEqual([legacy.upgradedFields.stage1Rate,legacy.upgradedFields.stage2Rate,legacy.upgradedFields.stage3Rate],['50','40','10'],'migration persisted');
     assert.equal(legacy.upgradedFields.paymentMode,'staged');
     assert.equal(legacy.historyUnchanged,true,'named saved quote draft preserved');
     assert.equal(legacy.customUnchanged,true,'manual non-default percentages preserved');
     assert.equal(legacy.v470Mode,'staged');
     assert.deepEqual(legacy.v470Rates,['50','40','10']);
     assert.equal(legacy.versionTag,471);
   }
   console.log('V471 payment defaults',width+'x'+height,staged.rates.join('/'),staged.text.join('/'));
   await context.close();
  }
  console.log('PASS V471: 50/40/10 new/reset staged payment defaults, total 100%, amounts sum, manually edited and historical drafts preserved, 7 mobile/tablet/desktop viewports; no production writes.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
