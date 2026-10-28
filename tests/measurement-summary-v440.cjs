const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const printCss=fs.readFileSync('floor-assistant-v285/measure-report-v424.css','utf8');
assert.match(printCss,/@media print[\s\S]*?\.mr-print-window \.mr-sheet\{[^}]*width:210mm/, 'Physical PDF A4 width unchanged');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 const page=await browser.newPage();
 await page.context().route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
 await page.goto('http://127.0.0.1:8765/floor-assistant-v285/');
 await page.waitForFunction(()=>window.muyeMeasureReportV424);
 // Quote section title alignment: same outer-card left edge and heading inset.
 await page.waitForSelector('#quote .quote-entry-shell .quote-entry-shell-title');
 await page.waitForSelector('#quote details.quote-compact-details.quote-entry-optional:not(.quote-compact-note) > summary .quote-section-title-label');
 const titles=await page.evaluate(()=>{
  const selectors=['#quote .measure-card-v273 .measure-head .quote-section-title-label','#quote .quote-entry-shell .quote-entry-shell-title','#quote details.quote-compact-details.quote-entry-optional:not(.quote-compact-note)>summary .quote-section-title-label'];
  return selectors.map(sel=>{const el=document.querySelector(sel);const r=el.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width};});
 });
 assert.ok(Math.max(...titles.map(x=>x.left))-Math.min(...titles.map(x=>x.left))<=3,'①②③ title start edges must align: '+JSON.stringify(titles));
 for(const [width,height] of [[375,812],[390,844],[430,932],[768,1024],[1024,768],[1194,834],[1366,1024]]){
   await page.setViewportSize({width,height});
   const positions=await page.evaluate(()=>[
     '#quote .measure-card-v273 .measure-head .quote-section-number',
     '#quote .quote-entry-shell .quote-entry-shell-title .quote-section-number',
     '#quote details.quote-compact-details.quote-entry-optional:not(.quote-compact-note)>summary .quote-section-number'
   ].map(sel=>document.querySelector(sel)?.getBoundingClientRect().left));
   assert.ok(positions.every(Number.isFinite),'all three section badges present: '+positions);
   console.log(`Badge geometry ${width}px: ${positions}`);
   if(width<=768) assert.ok(Math.max(...positions)-Math.min(...positions)<=3,`${width}px: ①②③ badge left edges should align: ${positions}`);
 }
 await page.setViewportSize({width:1024,height:768});
 // Deliberately simulate Safari's uneven inner padding, then assert real-device correction.
 const simulated=await page.evaluate(async()=>{
   const area=document.querySelector('#quote .measure-card-v273 .measure-head .quote-section-number');
   const a=document.querySelector('#quote .quote-entry-shell .quote-entry-toolbar');
   const b=document.querySelector('#quote details.quote-compact-details.quote-entry-optional:not(.quote-compact-note)>summary');
   a.style.setProperty('padding-left','26px','important');
   b.style.setProperty('padding-left','26px','important');
   if(typeof window.muyeAlignQuoteBadgesV448!=='function')throw new Error('Missing V448 recalibration');
   window.muyeAlignQuoteBadgesV448();
   await new Promise(resolve=>requestAnimationFrame(resolve));
   const badgeNodes=[
     area,
     document.querySelector('#quote .quote-entry-shell .quote-section-number'),
     document.querySelector('#quote details.quote-compact-details.quote-entry-optional:not(.quote-compact-note)>summary .quote-section-number')
   ];
   const xs=badgeNodes.map(el=>el.getBoundingClientRect().left);
   a.style.removeProperty('padding-left');b.style.removeProperty('padding-left');
   window.dispatchEvent(new Event('resize'));
   return xs;
 });
 assert.ok(Math.max(...simulated)-Math.min(...simulated)<=1,'V448 iPad dynamic correction under altered padding: '+simulated);
 await page.setViewportSize({width:1280,height:720});

 await page.evaluate(()=>{window.alert=()=>{}; window.__shared='';Object.defineProperty(navigator,'share',{value:async d=>window.__shared=d.text,configurable:true});});
 async function setup(rooms,percent=5){await page.evaluate(({rooms,percent})=>{
 document.querySelector('#measureRows').innerHTML=rooms.map((r,i)=>`<div class="measure-row" data-kind="${r.kind||'area'}" data-floor="${r.floor||'1楼'}"><input class="mname" value="房间${i+1}"><input class="mexpr" value="${r.expr||''}">${r.kind==='stair'?'<input class="stair-width" value="100"><input class="stair-depth" value="30"><input class="stair-count" value="10"><input class="stair-riser" value="15"><input class="stair-platform" value="">':''}</div>`).join('');
 document.querySelector('#measureLoss').value=percent;
 window.muyeMeasureReportV424.open();
 },{rooms,percent});}
 async function check(actual,total,percent=5){
 const lines=await page.locator('#mr-preview .mr-grand, #mr-preview .mr-loss').allTextContents();
 assert.equal(lines.length,2);assert.ok(lines[0].includes(actual+' ㎡'));assert.ok(lines[1].includes(`含${percent}%损耗预估面积`));assert.ok(lines[1].includes(total+' ㎡'));assert.ok(!lines[1].includes('预估损耗面积'));assert.ok(!lines.some(x=>x.includes('0.90 ㎡')));assert.ok(/^\d+$/.test(lines[1].trim().match(/(\d+) ㎡$/)?.[1]||''));
 await page.locator('[data-r-action="share"]').click();const text=await page.evaluate(()=>window.__shared);assert.ok(text.includes(total+'㎡'));assert.ok(!text.includes('全部实测面积合计'));assert.ok(!text.includes('预估损耗面积'));assert.ok(!text.includes('15.75㎡'));
 const before=await page.evaluate(()=>localStorage.getItem('muye-measure-a4-reports-v424'));
 await page.locator('[data-r-action="save"]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('muye-measure-a4-reports-v424')));
 assert.ok(saved.length);if(before)assert.deepEqual(saved.slice(1),JSON.parse(before));
 assert.equal(await page.evaluate(d=>window.muyeMeasureReportV424.buildMarkup(d),saved[0]),await page.locator('#mr-preview').innerHTML());
 const popupPromise=page.waitForEvent('popup');await page.locator('[data-r-action="print"]').click();const popup=await popupPromise;await popup.waitForLoadState();
 assert.equal(await popup.locator('.mr-sheet').evaluate(e=>e.outerHTML),await page.locator('#mr-preview .mr-sheet').evaluate(e=>e.outerHTML));
 await popup.emulateMedia({media:'print'});assert.equal(await popup.locator('.mr-grand,.mr-loss').count(),2);await popup.pdf({path:'/tmp/muye-v445-print.pdf',format:'A4',printBackground:true});await popup.close();
 }
 await setup([{expr:'500×300'}]);await check('15.00','16');
 await setup([{expr:'325×555'}]);await check('18.04','19');
 for(const [w,h] of [[390,844],[844,390],[768,1024],[834,1194],[1024,768],[1194,834],[1366,1024],[1440,900]]){
 await page.setViewportSize({width:w,height:h});
 const overflow=await page.locator('#mr-v424 .mr-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1);assert.equal(overflow,false,`${w} dialog overflow`);
 const bounds=await page.locator('#mr-v424 .mr-dialog').boundingBox();assert.ok(Math.abs(bounds.x)<1&&Math.abs(bounds.y)<1&&Math.abs(bounds.width-w)<1&&Math.abs(bounds.height-h)<1,`${w} fullscreen bounds`);
 const geometry=await page.locator('#mr-v424 .mr-dialog-scroll').evaluate(el=>{
  const preview=el.querySelector('.mr-preview'),paper=preview.querySelector('.mr-sheet');
  return {scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,previewWidth:preview.getBoundingClientRect().width,paperWidth:paper.getBoundingClientRect().width};
 });
 assert.ok(geometry.scrollWidth<=geometry.clientWidth+1,`${w} horizontal scroll overflow`);
 assert.ok(Math.abs(geometry.paperWidth-geometry.previewWidth)<1,`${w} paper fills preview`);
 if(w>=1024&&w<=1366&&w>h)assert.ok(geometry.previewWidth>=geometry.clientWidth-30,`${w} iPad landscape preview should fill viewport: ${JSON.stringify(geometry)}`);
 if(w===1440)assert.ok(geometry.previewWidth<=765,`Mac preview width should remain compact: ${JSON.stringify(geometry)}`);
 await page.screenshot({path:`/tmp/muye-v445-${w}x${h}.png`});
 const overlap=await page.locator('#mr-preview .mr-loss').evaluate(e=>e.children[0].getBoundingClientRect().right>e.children[1].getBoundingClientRect().left);assert.equal(overlap,false,`${w} summary overlap`);
 }
 await setup([{expr:'325×555'}],10);await check('18.04','20',10);
 await setup([{expr:'325×555'}],7);await check('18.04','20',7);
 await setup([{expr:'100×100',floor:'1楼'},{expr:'325×555',floor:'2楼'},{expr:'200×',floor:'2楼'}]);await check('19.04','20');assert.equal(await page.locator('.mr-floor').count(),2);assert.equal(await page.locator('.mr-pending').count(),1);
 await setup([{expr:'325×555'},{kind:'stair'}]);await check('22.54','24');
 await setup([{kind:'stair'}]);await check('4.50','5');
 await setup([{expr:'100×100.49'}]);await check('1.00','2');
 await setup([{expr:'1000×1000'}],10);await check('100.00','110',10);
 await setup([{expr:'100×100'}],0);await check('1.00','1',0);
 await setup(Array.from({length:40},()=>({expr:'325×555'})));
 const scroll=page.locator('#mr-v424 .mr-dialog-scroll');assert.ok(await scroll.evaluate(e=>e.scrollHeight>e.clientHeight));
 await scroll.evaluate(e=>e.scrollTop=e.scrollHeight);
 assert.ok(await page.locator('[data-r-action=share]').isVisible());
 await page.locator('#mr-v424 .mr-dialog-head [data-r-action=close]').click();assert.equal(await page.locator('#mr-v424').isVisible(),false);
 assert.equal(await page.evaluate(()=>document.body.classList.contains('mr-open')),false);
 const legacy=await page.evaluate(()=>{const d={source:{rows:[{kind:'area',area:18.0375,expr:'325×555'}]}};const a=JSON.stringify(d);window.muyeMeasureReportV424.buildMarkup(d);return [a===JSON.stringify(d),window.muyeMeasureReportV424.lossSummary(d,window.muyeMeasureReportV424.reportTotals(d))]});assert.deepEqual(legacy,[true,null]);
 console.log('PASS: 10 whole-m² business cases; preview/share/save/print A4 parity; 8 viewport layouts including iPad landscape fill; historical snapshot preservation. All network access outside localhost blocked.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
