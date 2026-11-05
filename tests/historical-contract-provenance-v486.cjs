const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const ORIGINAL='乙方未按约定支付到期款项的，甲方有权暂停供货、加工或安装。';
const V484='每逾期一日，应按合同总价款的5%承担违约金';
const TAKEBACK='并对符合法定取回条件的产品依法主张收回权利';
const V485='乙方未按约定支付到期款项的，甲方有权暂停尚未履行的供货或施工，并对符合法定取回条件的产品依法主张收回权利。';

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  for(const [width,height] of [[375,812],[430,932],[768,1024]]) {
   const ctx=await browser.newContext({viewport:{width,height}});
   const page=await ctx.newPage();
   page.on('dialog',async dialog=>dialog.accept());
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof sendOrderContract==='function'&&typeof orders==='function');
   await page.evaluate(()=>{
    const base={cust:'历史客户',date:'2026/10/29',status:'进行中',orderMode:'manual',
     products:[{species:'紫檀',spec:'590×90×17',area:38,billArea:38,price:168,subtotal:6384}],
     salesItems:[{name:'安装费',qty:38,unit:'㎡',price:45,subtotal:1710}],
     total:8094,sales:8094,paid:0,depositRate:32};
    const created=date=>[{type:'创建',date}];
    const cases=[
     {...base,id:92001,paymentMode:'staged',eventHistory:created('2026-10-29T08:00:00.000Z'),
       paymentPlan:{stage1Rate:32,stage2Rate:58,stage3Rate:10}},
     {...base,id:92002,paymentMode:'normal',date:'2027/01/01',
       eventHistory:created('2026-10-20T08:00:00.000Z')},
     {...base,id:92003,paymentMode:'normal',date:'2026/10/29'},
     {...base,id:92004,paymentMode:'staged',date:'2026/10/29',
       eventHistory:created('2026-11-05T02:00:00.000Z'),
       paymentPlan:{stage1Rate:32,stage2Rate:58,stage3Rate:10}},
     {...base,id:92005,paymentMode:'normal',date:'2026/10/29',
       contractTermsVersion:485,eventHistory:created('2026-11-05T02:15:00.000Z')},
     {...base,id:92006,paymentMode:'normal',
       contractEditedDocuments:{electronic:{
        html:'<div class="contract-title">历史客户确认版本</div><p class="contract-text">双方确认的特别条款不得更改</p>',
        savedAt:'2026-10-30T00:00:00Z',source:'manual'}}},
     {...base,id:92007,paymentMode:'normal',contractTermsVersion:484,
       eventHistory:created('2026-10-29T00:00:00Z')}
    ];
    localStorage.setItem(KEY,JSON.stringify(cases));
   });
   const snapshot=await page.evaluate(()=>JSON.stringify(orders().filter(o=>o.id>=92001&&o.id<=92007)));
   const get=async id=>page.evaluate(id=>{
    sendOrderContract(id);
    const p=document.getElementById('contractPreview');
    const h=[...p.querySelectorAll('h3')].find(el=>el.textContent.includes('第四条 付款及结算'));
    const lines=h?h.nextElementSibling.innerHTML.split(/<br\s*\/?>/i).map(x=>x.replace(/<[^>]+>/g,'').trim()):[];
    return {lines,html:p.innerHTML};
   },id);
   const preStage=await get(92001);
   assert.ok(preStage.lines[5].includes(ORIGINAL),'Oct 29 staged old order uses original late-payment text');
   assert.ok(!preStage.lines.join('').includes(V484),'Oct 29 old staged order excludes 5%');
   assert.ok(!preStage.lines.join('').includes(TAKEBACK),'Oct 29 old staged order excludes added recovery clause');
   assert.ok(!preStage.lines[4].includes('逾期超过7日'),'old staged point five has no V484 appendix');
   assert.ok(preStage.lines[0].includes('32%'),'historical order payment ratios preserved');
   const preNormal=await get(92002);
   assert.ok(preNormal.lines[4].includes(ORIGINAL),'backdated/edited date does not override original terms');
   assert.ok(!preNormal.lines.join('').includes(V484),'legacy normal has no V484 terms');
   const unknown=await get(92003);
   assert.ok(unknown.lines[4].includes(ORIGINAL),'missing creation timestamp defaults safely to V483');
   const v484=await get(92004);
   assert.ok(v484.lines[5].includes(V484),'genuine V484-window creation keeps V484 late penalty');
   assert.ok(v484.lines[4].includes(TAKEBACK),'V484 point five appendix retained');
   const v485=await get(92005);
   assert.ok(v485.lines[4].includes(V485),'new V485 order keeps simplified clause');
   assert.ok(!v485.lines.join('').includes(V484),'new V485 order has no 5%');
   const edited=await get(92006);
   assert.ok(edited.html.includes('双方确认的特别条款不得更改'),'manually saved contract HTML is untouched');
   const explicitlyV484=await get(92007);
   assert.ok(explicitlyV484.lines[4].includes(V484),'explicit version remains authoritative');
   assert.equal(await page.evaluate(()=>JSON.stringify(orders().filter(o=>o.id>=92001&&o.id<=92007))),snapshot,
     'contract previews never alter stored historical orders, dates, prices, edits or labels');
   console.log('PASS V486 3 generations of contract terms and historical data protection at',width);
   await ctx.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
