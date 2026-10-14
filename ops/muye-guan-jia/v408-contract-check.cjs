'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url='https://muye-guan-jia-migration-test.onrender.com/';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const width of [375,820]){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:'zh-CN',hasTouch:width<1000,isMobile:width<600,acceptDownloads:true});
  const page=await ctx.newPage(),errs=[],dialogs=[];
  page.on('pageerror',e=>errs.push(String(e)));
  page.on('dialog',d=>{dialogs.push(d.message());d.accept()});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>typeof window.muyeContractRevisionStatus==='function'&&typeof window.muyeContractV408Status==='function',{timeout:25000});
  let init=await page.evaluate(()=>{
   const o={id:900408,cust:'未命名客户',opener:'周潇东',date:'2026/10/14',products:[{species:'缅甸柚木',spec:'740×115×17',area:20,billArea:20,price:350,subtotal:7000}],salesItems:[{name:'安装费',qty:20,unit:'㎡',price:25,subtotal:500}],finalAmount:7500,sales:7500,paid:0,costStatus:'missing',status:'进行中',entrySource:'quote',pricingMode:'quote_loss',orderMode:'auto',orderModeSource:'quote_conversion'};
   localStorage.setItem('floor_orders_v3',JSON.stringify([o]));
   window.orders=()=>JSON.parse(localStorage.getItem('floor_orders_v3')||'[]');
   window.sendOrderContract(o.id);
   return {mode:window.contractMode,orderId:window.currentContractOrderId,storedAmount:orders()[0].finalAmount,hasDoc:!!document.querySelector('#contractPreview .contract-title'),link:document.querySelector('#contractShareBtn')?.classList.contains('hide')};
  });
  assert.equal(init.storedAmount,7500,'order retains original canonical pricing');
  assert.equal(init.orderId,900408,'order contract linked');assert.equal(init.mode,'electronic');assert.equal(init.hasDoc,true);
  assert.equal(init.link,false);
  await page.locator('#contractDoc button').filter({hasText:'完善合同信息'}).click();
  const initially=await page.locator('#cCust').inputValue();
  assert.equal(initially,'未命名客户');
  await page.locator('#cCust').fill('张先生');
  await page.locator('#cPhone').fill('13800138000');
  await page.locator('#cAddress').fill('深圳市南山区施工现场');
  await page.locator('#contractBuildBtn').click();
  assert.ok((await page.locator('#contractPreview').innerText()).includes('张先生'),'new customer in generated doc');
  await page.locator('#contractDoc button').filter({hasText:'完善合同信息'}).click();
  assert.equal(await page.locator('#cCust').inputValue(),'张先生','customer survives reopen of info form');
  assert.equal(await page.locator('#cPhone').inputValue(),'13800138000','customer phone survives info reopen');
  assert.equal(await page.locator('#cAddress').inputValue(),'深圳市南山区施工现场','address survives info reopen');
  await page.locator('#contractModal .modal-close').click();
  // Full edit: Enter creates <br>, never cloned section with a new border.
  await page.locator('#contractFullEditBtn').click();
  const count=await page.locator('#contractPreview .contract-account').count();
  await page.evaluate(()=>{
   const el=document.querySelector('#contractPreview .contract-account');
   const t=[...el.childNodes].find(n=>n.nodeType===3&&n.textContent.includes('户名'));
   const sel=window.getSelection(),r=document.createRange();
   if(!t)throw new Error('editable account text not found');
   r.setStart(t,Math.min(6,t.length));r.collapse(true);sel.removeAllRanges();sel.addRange(r);
  });
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#contractPreview .contract-account').count(),count,'Enter cannot clone a bordered account section');
  assert.equal(await page.locator('#contractPreview .contract-account div').count(),0,'no new HTML block on Return key');
  // Edit one bank account line and persist it through full-edit Finish.
  await page.evaluate(()=>{
   const el=document.querySelector('#contractPreview .contract-account');
   el.innerHTML='<b>收款账户</b><br>户名：周潇东　开户行：深圳测试银行<br>银行账号：6222 8888 1234<br>微信/支付宝：双方另行确认';
   el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.locator('#contractFullEditBtn').click();
  assert.ok((await page.locator('#contractPreview').innerText()).includes('6222 8888 1234'));
  const saved=await page.evaluate(()=>{
   const o=orders()[0],s=window.muyeContractRevisionStatus();
   return {html:o.contractEditedDocuments?.electronic?.html||'',revision:s,customer:loadContractDraft()?.cust};
  });
  assert.ok(saved.html.includes('6222 8888 1234'),'finished editing must persist exact bank account');
  assert.equal(saved.customer,'张先生');
  assert.equal(saved.revision.saved,true);
  await page.evaluate(()=>{window.returnFromOrderContract();window.sendOrderContract(900408)});
  assert.ok((await page.locator('#contractPreview').innerText()).includes('6222 8888 1234'),'bank account must survive reopening order contract');
  await page.locator('#contractDoc button').filter({hasText:'完善合同信息'}).click();
  assert.equal(await page.locator('#cCust').inputValue(),'张先生','customer stays saved even with placeholder order customer');
  await page.locator('#contractModal .modal-close').click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.sendOrderContract==='function',{timeout:25000});
  await page.evaluate(()=>window.sendOrderContract(900408));
  assert.ok((await page.locator('#contractPreview').innerText()).includes('6222 8888 1234'),'manual bank survives reload');
  assert.ok((await page.locator('#contractPreview').innerText()).includes('张先生'),'customer survives reload');
  // Real PDF generation smoke: render edited preview as a PDF before sharing.
  if(width===375){
    const real=await page.evaluate(async()=>{
      const file=await window.buildContractPdfFile();
      const buf=await file.arrayBuffer();
      const bytes=new Uint8Array(buf.slice(0,5));
      return {name:file.name,size:file.size,signature:String.fromCharCode(...bytes)};
    });
    assert.ok(real.size>3000&&real.signature.startsWith('%PDF-'),'real edited contract PDF must be nonempty and valid '+JSON.stringify(real));
    console.log('PASS V408 real PDF generation',real.size,real.name);
  }
  // Mock platform PDF capture, not the clipboard/share UI; confirm correct edited preview is what is shared.
  await page.evaluate(()=>{
    window.__v408Shared=null;
    window.__v408PdfBuilds=0;
    window.buildContractPdfFile=async function(){
      window.__v408PdfBuilds++;
      const txt=document.querySelector('#contractPreview').innerText;
      if(!txt.includes('6222 8888 1234'))throw Error('stale contract PDF source');
      const content='%PDF-1.4\n'+txt.repeat(20);
      return new File([content],'木地板电子订货合同_张先生.pdf',{type:'application/pdf'});
    };
    Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
    Object.defineProperty(navigator,'share',{configurable:true,value:async x=>{window.__v408Shared={title:x.title,text:x.text,fileName:x.files?.[0]?.name,size:x.files?.[0]?.size};}});
    window.dispatchEvent(new Event('muye-contract-preview-ready'));
  });
  await page.waitForTimeout(850);
  await page.locator('#contractShareBtn').click();
  const sharing=await page.evaluate(()=>({data:window.__v408Shared,builds:window.__v408PdfBuilds,status:window.muyeContractV408Status()}));
  assert.equal(sharing.data?.fileName,'木地板电子订货合同_张先生.pdf','WeChat share selects current PDF with modified account');
  assert.ok(sharing.data?.size>1000,'shared PDF must not be empty');
  assert.ok(!dialogs.some(x=>/失败/.test(x)),'no failed share alert');
  const orderAfter=await page.evaluate(()=>orders()[0]);
  
  assert.equal(orderAfter.finalAmount,7500,'contract edits may not rewrite original order price');
  assert.equal(orderAfter.paid,0,'contract edits may not alter payment');
  assert.equal(orderAfter.cust,'未命名客户','contract customer does not corrupt order data');
  assert.equal(errs.length,0,'no page errors '+errs.join('; '));
  console.log('PASS V408 contract name, bank, Enter line, save/reopen/reload, PDF share '+width+'px');
  await ctx.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});