const {chromium}=require('playwright');
const assert=require('node:assert/strict');

async function run(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[320,690],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1366,900]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<=1024,isMobile:width<=430});
   const page=await context.newPage();
   await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof updateDash==='function'&&typeof financeLedgerTotalsV467==='function');
   const output=await page.evaluate(()=>{
    const today=new Date(),thisMonth=today.getFullYear()+'/'+(today.getMonth()+1)+'/'+today.getDate();
    const blank={floor:0,install:0,batten:0,skirt:0,material:0,freight:0,remove:0,other:0};
    const mk=(id,sales,paid,cost,date,status,costStatus,known,opener)=>{
     const b={...blank,floor:cost};
     return {id,opener,cust:'模拟数据',date,status,costStatus,profitKnown:known,sales,paid,costBreakdown:b};
    };
    const a=mk(997001,200,200,150,thisMonth,'已完成','complete',true,'甲');
    a.costSnapshot={costBreakdown:{...blank,floor:150},cost:150,costStatus:'complete',profitKnown:true,sales:200,profit:50};
    const b=mk(997002,300,100,40,thisMonth,'进行中','partial',false,'甲');
    const c=mk(997003,1000,0,0,thisMonth,'进行中','missing',false,'乙');
    const d=mk(997004,0,4798,2700,'2026/2/4','已完成','complete',true,'乙');
    d.costSnapshot={costBreakdown:{...blank,floor:2700},cost:2700,costStatus:'complete',profitKnown:true,sales:4798,profit:2098};
    const testOrders=[a,b,c,d],priorRaw=localStorage.getItem(KEY);
    // Simulated input exists only in an isolated localhost browser, never production/cloud.
    localStorage.setItem(KEY,JSON.stringify(testOrders));
    updateDash();
    const ledger=financeLedgerTotalsV467(orders());
    const selected=['fSales','fPaid','fCost','fProfit','fMargin','fBalance','fmSales','fmCost','fmProfit','fmMargin','profit']
     .map(id=>[id,document.getElementById(id)?.textContent]);
    const people=financePeopleV467(orders());
    window.__v467Export=null;
    const previous=window.downloadTextFile;
    window.downloadTextFile=(name,text,type)=>{window.__v467Export={name,text,type}};
    exportFinanceCSV();
    const csv=window.__v467Export;
    exportOrdersCSV();
    const orderCSV=window.__v467Export;
    window.downloadTextFile=previous;
    const statuses={version:document.querySelector('meta[name="app-version"]')?.content,
     ledger,selected:Object.fromEntries(selected),people,financeCSV:csv,orderCSV,
     completeness:document.getElementById('financeCompleteness')?.innerText,
     anomalies:document.getElementById('financeDataCheck')?.innerText,
     warning:document.getElementById('financeMismatchNoteV467')?.innerText,
     warningHidden:document.getElementById('financeMismatchNoteV467')?.hidden,
     explanatoryNote:document.getElementById('financeBookNoteV467')?.innerText,
     financeTitles:[...document.querySelectorAll('#finance .finance-all-dashboard .finance-kpi>span')].map(x=>x.textContent),
     unchangedJSON:JSON.stringify(orders())===JSON.stringify(testOrders)};
    // Reset the synthetic session so it cannot affect subsequent contexts.
    if(priorRaw===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,priorRaw);
    return statuses;
   });
   const z=output.ledger;
   assert.equal(output.statuses??output.version,'V467','HTML version');
   assert.equal(z.count,4);
   assert.equal(z.sales,1500);
   assert.equal(z.paid,5098);
   assert.equal(z.cost,2890);
   assert.equal(z.bookIncome,-1390,'includes unknown-cost orders, not historical snapshots');
   assert.equal(z.receivable,1200,'receivable floored to 0');
   assert.equal(z.overpaid,4798,'overcollection never silently ignored');
   assert.equal(z.incomplete,2);
   assert.equal(output.selected.fSales,'¥1,500');
   assert.equal(output.selected.fPaid,'¥5,098');
   assert.equal(output.selected.fCost,'¥2,890');
   assert.equal(output.selected.fProfit,'¥-1,390');
   assert.equal(output.selected.profit,'¥-1,390','header uses same all-order ledger');
   assert.equal(output.selected.fMargin,'-92.7%');
   assert.equal(output.selected.fBalance,'¥1,200');
   assert.equal(output.selected.fmSales,'¥1,500','month only excludes February test order');
   assert.equal(output.selected.fmCost,'¥190');
   assert.equal(output.selected.fmProfit,'¥1,310');
   assert.equal(output.selected.fmMargin,'87.3%');
   assert.equal(output.people.length,2);
   assert.equal(output.people.reduce((sum,x)=>sum+x.bookIncome,0),-1390);
   assert.equal(output.warningHidden,false);
   assert.match(output.warning,/¥4,798/);
   assert.match(output.explanatoryNote,/未知库存成本/);
   assert.match(output.completeness,/2 单成本待补（仍计入账面收益）/);
   assert.match(output.anomalies,/¥4,798/);
   assert.ok(output.financeTitles.includes('账面收益')&&output.financeTitles.includes('账面收益率'));
   assert.match(output.financeCSV.text,/账面收益率/);
   assert.match(output.financeCSV.text,/"合计","4","1500","2890","-1390","-92.67%","1200","2"/);
   assert.match(output.orderCSV.text,/账面收益率/);
   assert.ok(output.unchangedJSON,'no data edits from finance rendering or export');
   // Existing app layout is unchanged, while the two notices remain unobtrusive.
   await page.evaluate(()=>{enterBusinessMode();showInternal('finance');});
   await page.waitForSelector('#finance:not(.hide)');
   const layout=await page.evaluate(()=>({
    bodyWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,
    cards:document.querySelectorAll('#finance .finance-all-dashboard .finance-kpi').length,
    noteHeight:document.getElementById('financeBookNoteV467').getBoundingClientRect().height,
    noExtraCards:!document.querySelector('#financeBookNoteV467.finance-kpi')
   }));
   assert.ok(layout.bodyWidth<=layout.windowWidth+2,'no sideways overflow '+width+' '+JSON.stringify(layout));
   assert.equal(layout.cards,6);
   assert.ok(layout.noteHeight<60,'the accountant disclosure must remain compact');
   assert.ok(layout.noExtraCards);
   console.log('V467 finance',width+'x'+height,JSON.stringify({bookIncome:z.bookIncome,overpaid:z.overpaid,layout}));
   await context.close();
  }
  console.log('PASS V467: all-order book income/receipts/expenses/receivables, partial or missing costs, snapshot mismatch, monthly and person summary, CSV, 7 viewport tests, no production writes.');
 }finally{await browser.close()}
}
run().catch(err=>{console.error(err);process.exit(1)});
