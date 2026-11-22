const {chromium}=require('playwright');
const assert=require('node:assert/strict');

const contractDoc=(buyer)=>'<div class="contract-title">历史订货合同</div><div class="contract-info"><div>甲方（供方）：测试木业</div><div>乙方（需方）：'+buyer+'</div></div><h3>第一条</h3>';
const fixtures=()=>[
 {id:948901,cust:'未命名客户',contractEditedDocuments:{electronic:{html:contractDoc('王先生'),source:'manual'}},species:'橡木实木'},
 {id:948902,cust:'原有客户',contractEditedDocuments:{electronic:{html:contractDoc('不应覆盖的合同名'),source:'manual'}},species:'龙凤檀'},
 {id:948903,cust:'未命名客户',contractEditedDocuments:{electronic:{html:contractDoc('未命名客户'),source:'manual'}},species:'红檀香'},
 {id:948904,cust:'未命名客户',contractEditedDocuments:{paper:{html:contractDoc('陈女士'),source:'manual'}},species:'柚木'},
 {id:948905,cust:'未命名客户',species:'橡木多层'},
 {id:948906,cust:'未命名客户',species:'缅甸柚木'}
].map(o=>({
 date:'2026/11/22',status:'进行中',orderMode:'manual',opener:'测试开单人',
 products:[{species:o.species,spec:'590×115×17',area:20,billArea:20,price:500,subtotal:10000}],
 salesItems:[],sales:10000,total:10000,paid:3000,cost:1200,costStatus:'partial',
 ...o
}));

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[375,812],[430,932],[1024,768]]){
   const ctx=await browser.newContext({viewport:{width,height}});
   const page=await ctx.newPage();
   page.on('dialog',async d=>d.accept());
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof renderOrders==='function'&&typeof sendOrderContract==='function'&&typeof finishContractFullEdit==='function');
   await page.evaluate(()=>{
     localStorage.setItem(KEY,JSON.stringify(fixturesForBrowser()));
     function fixturesForBrowser(){
       const doc=(buyer)=>'<div class="contract-title">历史订货合同</div><div class="contract-info"><div>甲方（供方）：测试木业</div><div>乙方（需方）：'+buyer+'</div></div><h3>第一条</h3>';
       return [
        {id:948901,cust:'未命名客户',contractEditedDocuments:{electronic:{html:doc('王先生'),source:'manual'}},species:'橡木实木'},
        {id:948902,cust:'原有客户',contractEditedDocuments:{electronic:{html:doc('不应覆盖的合同名'),source:'manual'}},species:'龙凤檀'},
        {id:948903,cust:'未命名客户',contractEditedDocuments:{electronic:{html:doc('未命名客户'),source:'manual'}},species:'红檀香'},
        {id:948904,cust:'未命名客户',contractEditedDocuments:{paper:{html:doc('陈女士'),source:'manual'}},species:'柚木'},
        {id:948905,cust:'未命名客户',species:'橡木多层'},
        {id:948906,cust:'未命名客户',species:'缅甸柚木'}
       ].map(o=>({
         date:'2026/11/22',status:'进行中',orderMode:'manual',opener:'测试开单人',
         products:[{species:o.species,spec:'590×115×17',area:20,billArea:20,price:500,subtotal:10000}],
         salesItems:[],sales:10000,total:10000,paid:3000,cost:1200,costStatus:'partial',
         ...o
       }));
     }
     renderOrders();
   });
   const name=async id=>page.locator('.order-entry[data-order-id="'+id+'"] .ot-customer').innerText();
   assert.equal(await name(948901),'王先生','historical electronic contract buyer displayed');
   assert.equal(await name(948902),'原有客户','explicit order customer never overwritten');
   assert.equal(await name(948903),'未命名客户','invalid contract placeholder ignored');
   assert.equal(await name(948904),'陈女士','historical paper contract buyer displayed');
   assert.equal(await name(948905),'未命名客户','unknown name not fabricated');
   const before=await page.evaluate(()=>JSON.stringify(orders()));
   await page.evaluate(()=>{document.getElementById('orderSearch').value='王先生';renderOrders()});
   assert.equal(await page.locator('.order-entry').count(),1,'search recognizes name from saved contract');
   assert.equal(await name(948901),'王先生');
   await page.evaluate(()=>{document.getElementById('orderSearch').value='';renderOrders()});
   await page.evaluate(()=>openOrderEdit(948901));
   assert.equal(await page.locator('#eCust').inputValue(),'王先生','edit form uses detected name');
   await page.evaluate(()=>closeOrderEdit());
   assert.equal(await page.evaluate(()=>JSON.stringify(orders())),before,'render/edit opening never changes historical data');

   await page.evaluate(()=>{
     sendOrderContract(948905);
     document.getElementById('cCust').value='新客户张女士';
     buildContractFromModal(true);
   });
   let changed=await page.evaluate(()=>orders());
   assert.equal(changed.find(o=>o.id===948905).cust,'新客户张女士','generating confirmed contract syncs buyer');
   assert.equal(changed.find(o=>o.id===948902).cust,'原有客户','does not overwrite existing customer');

   await page.evaluate(()=>{
     sendOrderContract(948906);
     setContractFullEdit(true);
     const buyer=[...document.querySelectorAll('#contractPreview .contract-info div')]
       .find(el=>el.textContent.includes('乙方（需方）'));
     if(!buyer)throw Error('no contract buyer field');
     buyer.textContent='乙方（需方）：刘先生';
     if(finishContractFullEdit()===false)throw Error('saved contract failed');
   });
   changed=await page.evaluate(()=>orders());
   assert.equal(changed.find(o=>o.id===948906).cust,'刘先生','saved full-edit contract syncs buyer');
   assert.ok(changed.find(o=>o.id===948906).contractEditedDocuments.electronic.html.includes('刘先生'),'saved contract content retained');
   for(const o of changed){
     assert.equal(o.sales,10000,'sales unchanged for '+o.id);
     assert.equal(o.paid,3000,'paid unchanged for '+o.id);
     assert.equal(o.cost,1200,'cost unchanged for '+o.id);
     assert.equal(o.status,'进行中','status unchanged for '+o.id);
   }
   assert.deepEqual(changed.find(o=>o.id===948901).contractEditedDocuments,JSON.parse(before).find(o=>o.id===948901).contractEditedDocuments,'saved historical contract remains untouched');
   console.log('PASS V489 contract buyer name sync at',width);
   await ctx.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
