(async()=>{
if(window.__FLOOR_V72_COLLECTING__)return;
window.__FLOOR_V72_COLLECTING__=true;
const TARGET=500,ENDPOINT='https://floor-viral-analyzer.onrender.com/import';
const C=s=>String(s||'').replace(/\s+/g,' ').trim();
const N=s=>{const m=String(s||'').replace(/,/g,'').match(/([\d.]+)\s*(万|w|W|k|K|千)?/i);if(!m)return null;let v=+m[1],u=m[2]||'';if(/万|w/i.test(u))v*=1e4;if(/k|千/i.test(u))v*=1e3;return Math.round(v)};
const base=new URL(location.href);
const Q=decodeURIComponent(base.searchParams.get('q')||base.searchParams.get('keyword')||base.searchParams.get('kw')||base.searchParams.get('query')||'').trim();
const out=new Map(),rawKeys=new Set(),queryStats=[];
const woods=['红檀香','缅甸柚木','柚木','橡木','白橡','欧橡','龙凤檀','二翅豆','圆盘豆','菠萝格','黑胡桃','白蜡木','重蚁木','紫檀','相思木'];
const plan=[];const seenQ=new Set();
function add(q,tier){q=C(q);if(!q||seenQ.has(q))return;seenQ.add(q);plan.push({q,tier})}
add(Q,'A');
if(Q&&!/地板/.test(Q)){add(Q+'地板','A');add(Q+'实木地板','A')}
else if(Q&&/地板/.test(Q)){const bare=C(Q.replace(/木?地板/g,''));if(bare&&bare!==Q)add(bare,'A')}
const hitWood=woods.find(w=>Q.includes(w));
for(const w of woods){if(w!==hitWood&&!Q.includes(w)){add(w+'地板','B');if(plan.length>=14)break}}
['实木地板','多层实木地板','三层实木地板','木地板'].forEach(q=>add(q,'C'));

let box=document.createElement('div');
box.id='__floor_v72_status__';
box.style='position:fixed;right:18px;top:18px;z-index:2147483647;background:#111;color:#fff;padding:12px 15px;border-radius:12px;font:600 13px -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 28px #0004;max-width:420px;line-height:1.45';
box.textContent='准备深度抓取 0/500…';document.documentElement.appendChild(box);

function idOf(u){let m=String(u||'').match(/[?&](?:id|itemId|goodsId|noteId)=([^&#]+)/i)||String(u||'').match(/\/(?:item|detail|goods|note)\/([A-Za-z0-9_-]{6,})/i);return m?m[1]:''}
function titleOf(lines,q){let rows=lines.filter(x=>x.length>=5&&x.length<=220&&!/^[¥￥]?\s*[\d,.]+(?:元|人想要|想要|浏览|点赞|收藏|评论)?$/i.test(x)&&!/^(包邮|可自提|全新|二手|刚刚|今天|昨天|\d+分钟前|\d+小时前|\d+天前)$/.test(x));rows.sort((a,b)=>((q&&b.includes(q)?40:0)+Math.min(b.length,70))-((q&&a.includes(q)?40:0)+Math.min(a.length,70)));return rows[0]||''}
function getCard(doc,a){
 let e=a;
 for(let i=0;i<8&&e;i++,e=e.parentElement){
  const t=C(e.innerText),r=e.getBoundingClientRect();
  if(t.length>=10&&t.length<=2000&&r.width>=110&&r.height>=55&&(/[¥￥]\s*[\d,.]+/.test(t)||/(想要|点赞|收藏|评论|浏览|已售)/.test(t))&&(e.querySelector('img')||doc.defaultView.getComputedStyle(e).backgroundImage!=='none'))return e
 }
 return null
}
function scan(win,q,tier){
 let before=out.size,doc=win.document;
 for(const a of doc.querySelectorAll('a[href]')){
  const card=getCard(doc,a);if(!card)continue;
  const t=C(card.innerText),lines=(card.innerText||'').split(/\n+/).map(C).filter(Boolean),title=titleOf(lines,q);
  if(!title)continue;
  const pm=t.match(/[¥￥]\s*([\d,.]+)/),price=pm?+pm[1].replace(/,/g,''):null,link=a.href||win.location.href,pid=idOf(link);
  const rawKey=(pid||link.split('#')[0])+'|'+title.slice(0,120);rawKeys.add(rawKey);
  const key=pid||(!/[?&](?:q|keyword|kw|query)=/i.test(link)?link.split('#')[0]:title.slice(0,130)+'|'+(price??''));
  const old=out.get(key)||{},wm=t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:人想要|想要)/i),vm=t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:浏览|浏览量|查看|阅读)/i),lm=t.match(/(?:点赞|赞)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:点赞|赞)/i),fm=t.match(/(?:收藏)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*收藏/i),cm=t.match(/(?:评论)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*评论/i),tm=t.match(/(刚刚|今天|昨天|\d+\s*(?:分钟|小时|天)前)(?:发布)?/),sm=t.match(/\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/i);
  const img=card.querySelector('img'),hits=[...(old.keywordHits||[]),q].filter((x,i,a)=>x&&a.indexOf(x)===i);
  const prevTier=old.sampleTier||tier,finalTier=(prevTier==='A'||tier==='A')?'A':(prevTier==='B'||tier==='B')?'B':'C';
  out.set(key,{rank:old.rank||out.size+1,productId:pid||old.productId||'',title,text:t,url:link,image:img?.src||old.image||'',imageCount:card.querySelectorAll('img').length||old.imageCount||null,price:Number.isFinite(price)?price:(old.price??null),wants:wm?N(wm[1]):(old.wants??null),views:vm?N(vm[1]):(old.views??null),likes:lm?N(lm[1]):(old.likes??null),favs:fm?N(fm[1]):(old.favs??null),comments:cm?N(cm[1]):(old.comments??null),ageText:tm?tm[1]:(old.ageText||''),specs:sm?sm[0]:(old.specs||''),sourceKeyword:q,keywordHits:hits,sampleTier:finalTier});
  if(out.size>=TARGET)break
 }
 return out.size-before
}
function scrollables(win){
 const arr=[];
 for(const e of win.document.querySelectorAll('main,[role="main"],section,div')){
  try{const cs=win.getComputedStyle(e),d=e.scrollHeight-e.clientHeight;if(d>500&&/auto|scroll/.test(cs.overflowY))arr.push({e,d})}catch{}
 }
 arr.sort((a,b)=>b.d-a.d);return arr.slice(0,5).map(x=>x.e)
}
async function waitLoad(win){
 for(let i=0;i<35;i++){try{if(win.document?.body&&win.document.body.innerText.length>120&&win.document.readyState!=='loading')return true}catch{}await new Promise(r=>setTimeout(r,300))}
 return false
}
async function collectQuery(win,q,tier,index){
 let no=0,last=out.size,lastH=0;
 try{win.scrollTo(0,0)}catch{}
 await new Promise(r=>setTimeout(r,500));
 const started=out.size;
 for(let i=0;i<45&&out.size<TARGET;i++){
  scan(win,q,tier);
  box.textContent='深度抓取 '+out.size+'/500｜'+(index+1)+'/'+plan.length+' '+tier+'级：'+q;
  let h=0;try{h=Math.max(win.document.body?.scrollHeight||0,win.document.documentElement?.scrollHeight||0)}catch{}
  const changed=out.size!==last||h!==lastH;no=changed?0:no+1;last=out.size;lastH=h;
  try{win.scrollBy(0,Math.max(650,win.innerHeight*.82));for(const e of scrollables(win))e.scrollTop=Math.min(e.scrollHeight,e.scrollTop+Math.max(600,e.clientHeight*.85))}catch{}
  await new Promise(r=>setTimeout(r,550));
  if(no>=7)break
 }
 scan(win,q,tier);
 queryStats.push({query:q,tier,added:out.size-started,total:out.size});
}
let worker=null;
try{worker=window.open(location.href,'floorCollectorV72','width=1080,height=820,left=24,top=24')}catch{}
let win=worker&&!worker.closed?worker:window;
for(let i=0;i<plan.length&&out.size<TARGET;i++){
 const step=plan[i],u=new URL(base);
 if(u.searchParams.has('q')||!u.searchParams.has('keyword'))u.searchParams.set('q',step.q);else u.searchParams.set('keyword',step.q);
 if(win!==window){
  try{win.location.replace(u.href);if(!await waitLoad(win))continue}catch{break}
 }else if(step.q!==Q){break}
 await collectQuery(win,step.q,step.tier,i)
}
if(worker&&!worker.closed)try{worker.close()}catch{}
window.__FLOOR_V72_COLLECTING__=false;
if(!out.size){box.remove();alert('没有识别到商品，请确认搜索结果已经加载');return}
const tierCounts={A:0,B:0,C:0};for(const x of out.values())tierCounts[x.sampleTier]=(tierCounts[x.sampleTier]||0)+1;
box.textContent='抓取完成 '+out.size+'/500｜A '+tierCounts.A+' · B '+tierCounts.B+' · C '+tierCounts.C+'，正在导入…';
const payload={source:location.href,keyword:Q,meta:{target:TARGET,rawCount:rawKeys.size,validCount:out.size,duplicateCount:Math.max(0,rawKeys.size-out.size),tierCounts,queryStats,expanded:plan.length>1},items:[...out.values()]};
const form=document.createElement('form');form.method='POST';form.action=ENDPOINT;form.target='_blank';
const inp=document.createElement('input');inp.type='hidden';inp.name='data';inp.value=JSON.stringify(payload);form.appendChild(inp);document.body.appendChild(form);form.submit();
setTimeout(()=>{form.remove();box.remove()},2000);
})().catch(e=>{window.__FLOOR_V72_COLLECTING__=false;document.getElementById('__floor_v72_status__')?.remove();alert('深度抓取失败：'+(e?.message||e))});