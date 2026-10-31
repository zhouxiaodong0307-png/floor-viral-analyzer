const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const version=JSON.parse(fs.readFileSync('floor-assistant-v285/version.json','utf8')).version;
 assert.ok(Number(version)>=476);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[320,690],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1366,900]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<=1024,isMobile:width<=430});
   const page=await context.newPage();
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#quote .quote-entry-shell[data-v476-ready="1"]')&&typeof calc==='function');
   const snapshot=()=>page.evaluate(()=>{
    show('quote');
    const shell=document.querySelector('#quote .quote-entry-shell');
    const optional=document.querySelector('#quote details.quote-entry-optional:not(.quote-compact-note)');
    const head=shell.querySelector('.quote-entry-toolbar'),summary=optional.querySelector('summary');
    const a=head.getBoundingClientRect(),b=summary.getBoundingClientRect();
    const floorStatus=shell.querySelector('.v476-step-status'),auxStatus=summary.querySelector('.v476-step-status');
    return {floorHeight:a.height,auxHeight:b.height,floorTop:a.y,auxTop:b.y,
      areaRadius:getComputedStyle(document.querySelector('#quote .measure-card-v273')).borderTopLeftRadius,
      floorRadius:getComputedStyle(shell).borderTopLeftRadius,auxRadius:getComputedStyle(optional).borderTopLeftRadius,
      floorCollapsed:shell.classList.contains('is-collapsed'),auxCollapsed:!optional.open,
      floorStatus:floorStatus.textContent,floorHidden:floorStatus.hidden,
      auxStatus:auxStatus.textContent,auxHidden:auxStatus.hidden,
      fullWidth:document.documentElement.scrollWidth,view:innerWidth,
      floorWidth:a.width,auxWidth:b.width,
      floorSummaryOverflow:floorStatus.scrollWidth>floorStatus.clientWidth+1,
      auxSummaryOverflow:auxStatus.scrollWidth>auxStatus.clientWidth+1,
      noImages:!shell.querySelector('img')&&!optional.querySelector('img'),
      editorHidden:getComputedStyle(shell.querySelector('.quote-entry-shell-body')).display==='none',
      auxInputs:optional.querySelectorAll('input').length,
      amount:document.querySelector('#quote #quoteTotal').textContent};
   });
   let result=await snapshot();
   assert.equal(result.floorHeight,width<=700?40:42,'floor compact height '+width);
   assert.equal(result.floorRadius,result.areaRadius,'② corner matches ① at '+width);
   assert.equal(result.auxRadius,result.areaRadius,'③ corner matches ① at '+width);
   assert.equal(result.auxHeight,width<=700?40:42,'aux compact height '+width);
   assert.ok(result.floorCollapsed&&result.auxCollapsed&&result.editorHidden);
   assert.ok(result.floorHidden&&result.auxHidden,'no fake selected items in default quote');
   assert.ok(result.noImages,'floor and accessories no images');
   assert.ok(result.auxInputs>=6,'all accessory fields remain');
   assert.ok(result.fullWidth<=result.view+2,'no horizontal overflow');
   const areaOnly=await page.evaluate(()=>{
    const $=id=>document.getElementById(id);
    $('area').value='37';calc();
    return document.querySelector('#quote .quote-entry-shell .v476-step-status').textContent;
   });
   assert.equal(areaOnly,'','area copied from measurement alone must not imply a floor selection');
   await page.evaluate(()=>{
    const $=id=>document.getElementById(id);
    $('species').value='缅甸柚木';$('price').value='150';$('area').value='20';
    $('species').dispatchEvent(new Event('input',{bubbles:true}));
    addQuoteExtraProduct({species:'橡木',spec:'910×125×18',area:15,price:180});
    $('batten').value='5';$('batten').dispatchEvent(new Event('input',{bubbles:true}));
    $('material').value='10';$('material').dispatchEvent(new Event('input',{bubbles:true}));
    calc();
   });
   await page.waitForFunction(()=>document.querySelector('#quote .quote-entry-shell .v476-step-status').textContent.includes('2 项')&&document.querySelector('#quote details.quote-entry-optional .v476-step-status').textContent.includes('2 项'));
   result=await snapshot();
   assert.equal(result.floorStatus,'已选 2 项 · 37㎡','two genuinely filled floor products with whole-square area');
   assert.equal(result.auxStatus,'已选 2 项','only positive quantities/fees count');
   assert.equal(result.floorHidden,false);assert.equal(result.auxHidden,false);
   assert.ok(!result.floorSummaryOverflow&&!result.auxSummaryOverflow,'selection summaries fit without truncation at '+width);
   assert.ok(result.noImages);
   await page.locator('#quote .quote-entry-shell-toggle').click();
   assert.equal(await page.locator('#quote .quote-entry-shell').evaluate(el=>el.classList.contains('is-collapsed')),false);
   assert.equal(await page.locator('#quote #species').inputValue(),'缅甸柚木','floor input unchanged on expand');
   await page.locator('#quote .quote-entry-arrow').click();
   assert.equal(await page.locator('#quote .quote-entry-shell').evaluate(el=>el.classList.contains('is-collapsed')),true);
   await page.locator('#quote details.quote-entry-optional:not(.quote-compact-note)>summary').click();
   assert.equal(await page.locator('#quote details.quote-entry-optional:not(.quote-compact-note)').evaluate(el=>el.open),true);
   assert.equal(await page.locator('#quote #batten').inputValue(),'5','accessory field intact');
   await page.locator('#quote details.quote-entry-optional:not(.quote-compact-note)>summary').click();
   await page.evaluate(()=>{
    const $=id=>document.getElementById(id);
    ['species','price','area','batten','material'].forEach(k=>$(k).value='');
    document.getElementById('quoteExtraProducts').replaceChildren();
    $('species').dispatchEvent(new Event('input',{bubbles:true}));calc();
   });
   await page.waitForFunction(()=>{
    const f=document.querySelector('#quote .quote-entry-shell .v476-step-status');
    const a=document.querySelector('#quote details.quote-entry-optional .v476-step-status');
    return f.hidden&&a.hidden;
   });
   result=await snapshot();
   assert.equal(result.floorStatus,'');assert.equal(result.auxStatus,'');
   console.log('V476 compact steps',width+'x'+height,JSON.stringify({height:[result.floorHeight,result.auxHeight],gap:Math.round(result.auxTop-result.floorTop-result.floorHeight)}));
   await context.close();
  }
  console.log('PASS V476: compact 2/3 rows, no images, dynamic actual selection, expand/collapse, 7 viewports.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
