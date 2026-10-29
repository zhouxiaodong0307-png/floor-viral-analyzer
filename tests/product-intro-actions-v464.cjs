const assert = require('node:assert/strict');
const {chromium} = require('playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [w,h] of [[320,690],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1366,900]]){
   const page=await browser.newPage({viewport:{width:w,height:h}});
   await page.context().route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
   await page.goto('http://127.0.0.1:8765/floor-assistant-v285/',{waitUntil:'domcontentloaded'});
   const result=await page.evaluate(()=>{
     const root=document.getElementById('productIntroResult');
     root.classList.remove('hide');
     const bar=root.querySelector('.actions.product-intro-actions-v464'),barRect=bar.getBoundingClientRect();
     const buttons=[...bar.querySelectorAll(':scope > button')];
     return {bar:{left:barRect.left,right:barRect.right,width:barRect.width,height:barRect.height},
      grid:getComputedStyle(bar).gridTemplateColumns,windowWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,
      buttons:buttons.map(x=>{const b=x.getBoundingClientRect(),cs=getComputedStyle(x);
       return {text:x.textContent.trim(),handler:x.getAttribute('onclick'),x:b.x,y:b.y,width:b.width,right:b.right,height:b.height,
       whiteSpace:cs.whiteSpace,clientWidth:x.clientWidth,scrollWidth:x.scrollWidth,scrollHeight:x.scrollHeight,clientHeight:x.clientHeight};
      }),
      compareButtons:document.querySelectorAll('#productCompareResult .actions button').length,
      fontVersion:document.querySelector('meta[name="app-version"]')?.content};
   });
   console.log('V464 intro actions',w,JSON.stringify(result));
   assert.equal(result.fontVersion,'V464');
   assert.deepEqual(result.buttons.map(x=>x.text),['复制微信版','生成介绍图','进入报价']);
   assert.deepEqual(result.buttons.map(x=>x.handler),['copyProductIntroduction()','shareProductIntroductionImage()','quoteIntroducedProduct()']);
   assert.equal(result.buttons.length,3);
   assert.equal(result.compareButtons,2,'other comparison action UI unchanged');
   assert.ok(Math.max(...result.buttons.map(x=>x.y))-Math.min(...result.buttons.map(x=>x.y))<=1,'all three buttons in ONE horizontal line');
   assert.ok(Math.max(...result.buttons.map(x=>x.height))-Math.min(...result.buttons.map(x=>x.height))<=1,'all button heights match');
   assert.ok(result.buttons.every(x=>x.height===40),'compact 40px buttons');
   assert.ok(result.buttons.every(x=>x.whiteSpace==='nowrap'),'no text wraps');
   assert.ok(result.buttons.every(x=>x.scrollWidth<=x.clientWidth+1),'no text overflow / ellipsis necessary');
   assert.ok(result.buttons.every(x=>x.x>=result.bar.left-1&&x.right<=result.bar.right+1),'all buttons within bar');
   assert.ok(result.documentWidth<=result.windowWidth+2,'no page horizontal overflow');
   await page.close();
  }
  console.log('PASS: V464 three introduction buttons same row, matching heights, no wrapping or overflow, original actions intact');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});