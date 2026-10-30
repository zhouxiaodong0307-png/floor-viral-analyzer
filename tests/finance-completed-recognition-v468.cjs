const {chromium}=require('playwright');
const assert=require('node:assert/strict');
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[320,690],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1366,900]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:width<=430,hasTouch:width<=1024});
   const page=await context.newPage();
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof financeCompletedTotalsV468==='function'&&typeof updateDash==='function');
   const out=await page.evaluate(()=>{
    const now=new Date(),monthDay=now.getFullYear()+'/'+(now.getMonth()+1)+'/'+now.getDate();
    const blank={floor:0,install:0,batten:0,skirt:0,material:0,freight:0,remove:0,other:0};
    function mk(id,sale,paid,cost,date,status,costStatus,known,opener){
     return {id,opener,cust:'模拟客户',date,status,costStatus,profitKnown:known,
      sales:sale,finalAmount:sale,total:sale,projectOriginalAmount:sale,paid,balance:Math.max(0,sale-paid),
      orderMode:'manual',orderModeVersion:213,
      products:[{species:'测试地板',spec:'800×200×18',area:1,billArea:1,price:sale,subtotal:sale}],
      salesItems:[],costBreakdown:{...blank,floor:cost}};
    }
    const a=mk(998101,200,200,150,monthDay,'已完成','complete',true,'甲');
    a.costSnapshot={costBreakdown:{...blank,floor:150},cost:150,costStatus:'complete',profitKnown:true,sales:200,profit:50};
    const b=mk(998102,300,100,40,monthDay,'进行中','partial',false,'甲');
    const c=mk(998103,1000,0,0,monthDay,'进行中','missing',false,'乙');
    const d=mk(998104,0,4798,2700,'2026/2/4','已完成','complete',true,'乙');
    d.costSnapshot={costBreakdown:{...blank,floor:2700},cost:2700,costStatus:'complete',profitKnown:true,sales:4798,profit:2098};
    const e=mk(998105,500,500,80,monthDay,'已完成','partial',false,'乙');
    const prior=localStorage.getItem(KEY),fixture=[a,b,c,d,e];
    // Browser-isolated fake records only. Production database is never accessed.
    localStorage.setItem(KEY,JSON.stringify(fixture));
    orders(); // Ensure existing legacy billing normalization has been applied first.
    const stable=localStorage.getItem(KEY);
    updateDash();
    const all=financeLedgerTotalsV467(orders()),done=financeCompletedTotalsV468(orders());
    const ids=['fSales','fPaid','fCost','fProfit','fMargin','fBalance','fmSales','fmPaid','fmCost','fmProfit','fmMargin','fmCount','sales','profit','count'];
    const view=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)?.textContent]));
    const summary=document.getElementById('financeBookNoteV467')?.innerText;
    const completeness=document.getElementById('financeCompleteness')?.innerText;
    const people=financePeopleV467(orders());
    const warning=document.getElementById('financeMismatchNoteV467')?.innerText;
    const previous=window.downloadTextFile;let exports=[];
    window.downloadTextFile=(name,content,type)=>exports.push({name,content,type});
    exportFinanceCSV();exportOrdersCSV();window.downloadTextFile=previous;
    const unchanged=stable===localStorage.getItem(KEY);
    const persisted=orders();
    // Verify the same order only enters recognized income after its status changes.
    const reopened=persisted.map(o=>o.id===998101?{...o,status:'进行中'}:o);
    const afterReopen=financeCompletedTotalsV468(reopened);
    const afterRestore=financeCompletedTotalsV468(reopened.map(o=>o.id===998101?{...o,status:'已完成'}:o));
    if(prior===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,prior);
    return {version:document.querySelector('meta[name="app-version"]')?.content,
      all,done,view,summary,completeness,people,warning,exports,unchanged,afterReopen,afterRestore,
      titles:[...document.querySelectorAll('#finance .finance-all-dashboard .finance-kpi>span')].map(el=>el.innerText)};
   });
   assert.equal(out.version,'V468');
   assert.equal(out.all.count,5);
   assert.equal(out.all.sales,2000);
   assert.equal(out.all.cost,2970);
   assert.equal(out.all.paid,5598);
   assert.equal(out.all.receivable,1200);
   assert.equal(out.all.overpaid,4798);
   assert.equal(out.done.count,3);
   assert.equal(out.done.sales,700,'only completed sales recognized');
   assert.equal(out.done.cost,2930,'ongoing costs excluded until complete');
   assert.equal(out.done.bookIncome,-2230,'completed own-stock incomplete cost still participates');
   assert.equal(out.done.incomplete,1,'incomplete completed cost does not block recognition');
   assert.equal(out.view.fSales,'¥700');
   assert.equal(out.view.fCost,'¥2,930');
   assert.equal(out.view.fProfit,'¥-2,230');
   assert.equal(out.view.fMargin,'-318.6%');
   assert.equal(out.view.sales,'¥700');
   assert.equal(out.view.profit,'¥-2,230');
   assert.equal(out.view.count,'5','total order count still reflects all orders');
   assert.equal(out.view.fPaid,'¥5,598','deposits from ongoing orders still visible as cash');
   assert.equal(out.view.fBalance,'¥1,200','ongoing unpaid balance still tracked');
   assert.equal(out.view.fmSales,'¥700','period recognized sales only');
   assert.equal(out.view.fmPaid,'¥800','period orders include ongoing deposits');
   assert.equal(out.view.fmCost,'¥230','period incomplete completed cost counted, ongoing excluded');
   assert.equal(out.view.fmProfit,'¥470');
   assert.equal(out.view.fmCount,'2');
   assert.equal(out.view.fmMargin,'67.1%');
   assert.match(out.summary,/已完成 3 单/);
   assert.match(out.summary,/进行中 2 单不计收益/);
   assert.match(out.summary,/未知库存成本/);
   assert.match(out.completeness,/已完成 3 单/);
   assert.match(out.completeness,/1 单成本待补/);
   assert.match(out.warning,/¥4,798/);
   assert.equal(out.people.length,2);
   assert.equal(out.people.reduce((n,p)=>n+p.bookIncome,0),out.done.bookIncome);
   assert.equal(out.people.reduce((n,p)=>n+p.receivable,0),out.all.receivable);
   assert.match(out.exports[0].content,/已完成账面收益/);
   assert.match(out.exports[0].content,/"合计","3","700","2930","-2230","-318.57%","1200","1","2"/);
   assert.equal((out.exports[1].content.match(/未完成，不计收益/g)||[]).length,2);
   assert.match(out.exports[1].content,/已完成账面收益/);
   assert.ok(out.unchanged,'finance computations and exports are strictly read-only');
   assert.equal(out.afterReopen.count,2);
   assert.equal(out.afterReopen.sales,500);
   assert.equal(out.afterReopen.cost,2780);
   assert.equal(out.afterReopen.bookIncome,-2280);
   assert.deepEqual({sales:out.afterRestore.sales,cost:out.afterRestore.cost,bookIncome:out.afterRestore.bookIncome},
     {sales:700,cost:2930,bookIncome:-2230},'manually re-completed order is counted once again');
   assert.ok(out.titles.includes('已完成销售')&&out.titles.includes('全部已收款'));
   await page.evaluate(()=>{enterBusinessMode();showInternal('finance')});
   await page.waitForSelector('#finance:not(.hide)');
   const layout=await page.evaluate(()=>({
     scroll:document.documentElement.scrollWidth,window:innerWidth,
     cards:document.querySelectorAll('#finance .finance-all-dashboard .finance-kpi').length,
     note:document.getElementById('financeBookNoteV467').getBoundingClientRect().height
   }));
   assert.ok(layout.scroll<=layout.window+2,'no horizontal scrolling '+width+' '+JSON.stringify(layout));
   assert.equal(layout.cards,6);
   assert.ok(layout.note<=84,'brief accounting scope note, no oversized card');
   console.log('V468',width+'x'+height,JSON.stringify({completed:out.done.count,ongoing:out.all.count-out.done.count,income:out.done.bookIncome,layout}));
   await context.close();
  }
  console.log('PASS V468: only completed orders recognized, ongoing sales/cost/profit excluded, deposits/receivables preserved, incomplete completed costs allowed, status switch, historic anomaly, month, person, CSV, 7 viewports.');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exit(1)});
