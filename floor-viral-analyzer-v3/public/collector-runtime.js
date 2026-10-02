(async()=>{
if(window.__FLOOR_V721_COLLECTING__)return;
window.__FLOOR_V721_COLLECTING__=true;

const TARGET=500, MAX_MS=105000, ENDPOINT='https://floor-viral-analyzer.onrender.com/import';
const START=Date.now();
const C=s=>String(s||'').replace(/\s+/g,' ').trim();
const N=s=>{const m=String(s||'').replace(/,/g,'').match(/([\d.]+)\s*(万|w|W|k|K|千)?/i);if(!m)return null;let v=+m[1],u=m[2]||'';if(/万|w/i.test(u))v*=1e4;if(/k|千/i.test(u))v*=1e3;return Math.round(v)};
const base=new URL(location.href);
const Q=decodeURIComponent(base.searchParams.get('q')||base.searchParams.get('keyword')||base.searchParams.get('kw')||base.searchParams.get('query')||'').trim();

const out=new Map(), rawKeys=new Set(), queryStats=[];
const woods=['红檀香','缅甸柚木','柚木','橡木','白橡','欧橡','龙凤檀','菠萝格','黑胡桃','白蜡木','重蚁木','紫檀'];
const plan=[],seenQ=new Set();
function add(q,tier){q=C(q);if(!q||seenQ.has(q))return;seenQ.add(q);plan.push({q,tier})}
add(Q,'A');
if(Q&&!/地板/.test(Q)){add(Q+'地板','A');add(Q+'实木地板','A')}
else if(Q){const bare=C(Q.replace(/木?地板/g,''));if(bare&&bare!==Q)add(bare,'A')}
const hit=woods.find(w=>Q.includes(w));
for(const w of woods){
  if(w===hit)continue;
  add(w+'地板','B');
  if(plan.filter(x=>x.tier==='B').length>=6)break;
}
['实木地板','多层实木地板','三层实木地板'].forEach(q=>add(q,'C'));

function status(win,msg){
  try{
    let b=win.document.getElementById('__floor_v721_status__');
    if(!b){
      b=win.document.createElement('div');b.id='__floor_v721_status__';
      b.style='position:fixed;right:18px;top:18px;z-index:2147483647;background:#111;color:#fff;padding:12px 15px;border-radius:12px;font:600 13px -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 28px #0004;max-width:440px;line-height:1.45';
      win.document.documentElement.appendChild(b);
    }
    b.textContent=msg;
    win.document.title='采集 '+out.size+'/500｜'+(Q||'闲鱼');
  }catch{}
}
status(window,'准备深度抓取 0/500…');

function idOf(u){
  let m=String(u||'').match(/[?&](?:id|itemId|goodsId|noteId)=([^&#]+)/i)||String(u||'').match(/\/(?:item|detail|goods|note|explore)\/([A-Za-z0-9_-]{6,})/i);
  return m?m[1]:''
}
function titleOf(lines,q){
  const rows=lines.filter(x=>x.length>=5&&x.length<=220&&!/^[¥￥]?\s*[\d,.]+(?:元|人想要|想要|浏览|点赞|收藏|评论)?$/i.test(x)&&!/^(包邮|可自提|全新|二手|刚刚|今天|昨天|\d+分钟前|\d+小时前|\d+天前)$/.test(x));
  rows.sort((a,b)=>((q&&b.includes(q)?40:0)+Math.min(b.length,70))-((q&&a.includes(q)?40:0)+Math.min(a.length,70)));
  return rows[0]||''
}
function getCard(doc,a){
  let e=a;
  for(let i=0;i<8&&e;i++,e=e.parentElement){
    const t=C(e.innerText),r=e.getBoundingClientRect();
    if(t.length>=10&&t.length<=2200&&r.width>=110&&r.height>=55&&(/[¥￥]\s*[\d,.]+/.test(t)||/(想要|点赞|收藏|评论|浏览|已售)/.test(t))&&(e.querySelector('img')||doc.defaultView.getComputedStyle(e).backgroundImage!=='none')) return e;
  }
  return null
}
function scan(win,q,tier){
  const before=out.size,doc=win.document;
  for(const a of doc.querySelectorAll('a[href]')){
    const card=getCard(doc,a);if(!card)continue;
    const baseText=C(card.innerText),attrs=[...card.querySelectorAll('[aria-label],[title]')].map(el=>C(el.getAttribute('aria-label')||el.getAttribute('title'))).filter(Boolean).join(' '),t=C(baseText+' '+attrs),lines=(card.innerText||'').split(/\n+/).map(C).filter(Boolean),title=titleOf(lines,q);
    if(!title)continue;
    const pm=t.match(/[¥￥]\s*([\d,.]+)/),price=pm?+pm[1].replace(/,/g,''):null,link=a.href||win.location.href,pid=idOf(link);
    rawKeys.add((pid||link.split('#')[0])+'|'+title.slice(0,120));
    let canonical='';try{const z=new URL(link);canonical=z.origin+z.pathname.replace(/\/$/,'')}catch{}const key=pid||title.replace(/\s+/g,'').slice(0,150)+'|'+(price??'')+'|'+canonical;
    const old=out.get(key)||{};
    const wm=t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:人想要|想要)/i),
          vm=t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:浏览|浏览量|查看|阅读)/i),
          lm=t.match(/(?:点赞|赞)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:点赞|赞)/i),
          fm=t.match(/(?:收藏)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*收藏/i),
          cm=t.match(/(?:评论)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*评论/i),
          tm=t.match(/(刚刚|今天|昨天|\d+\s*(?:分钟|小时|天)前)(?:发布)?/),
          sm=t.match(/\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/i);
    const img=card.querySelector('img'),hits=[...(old.keywordHits||[]),q].filter((x,i,a)=>x&&a.indexOf(x)===i);
    const prev=old.sampleTier||tier,finalTier=(prev==='A'||tier==='A')?'A':(prev==='B'||tier==='B')?'B':'C';
    out.set(key,{
      rank:old.rank||out.size+1,queryRank:old.queryRank||Math.max(1,queryStats.filter(s=>s.query===q).length+1),productId:pid||old.productId||'',title,text:t,url:link,image:img?.src||old.image||'',
      imageCount:card.querySelectorAll('img').length||old.imageCount||null,price:Number.isFinite(price)?price:(old.price??null),
      wants:wm?N(wm[1]):(old.wants??null),views:vm?N(vm[1]):(old.views??null),likes:lm?N(lm[1]):(old.likes??null),
      favs:fm?N(fm[1]):(old.favs??null),comments:cm?N(cm[1]):(old.comments??null),ageText:tm?tm[1]:(old.ageText||''),
      specs:sm?sm[0]:(old.specs||''),sourceKeyword:q,keywordHits:hits,sampleTier:finalTier
    });
    if(out.size>=TARGET)break;
  }
  return out.size-before
}
function scrollables(win){
  const arr=[];
  for(const e of win.document.querySelectorAll('main,[role="main"],section,div')){
    try{const cs=win.getComputedStyle(e),d=e.scrollHeight-e.clientHeight;if(d>400&&/auto|scroll/.test(cs.overflowY))arr.push({e,d})}catch{}
  }
  arr.sort((a,b)=>b.d-a.d);
  return arr.slice(0,4).map(x=>x.e)
}
async function waitLoad(win,expectedQ){
  for(let i=0;i<24;i++){
    try{
      const body=win.document?.body;
      const href=win.location.href;
      if(body&&body.innerText.length>120&&win.document.readyState!=='loading'){
        if(!expectedQ||href.includes(encodeURIComponent(expectedQ))||C(body.innerText).includes(expectedQ))return true;
      }
    }catch{}
    await new Promise(r=>setTimeout(r,250))
  }
  return false
}
async function collectQuery(win,step,index){
  const started=out.size;
  let stale=0,last=out.size;
  try{win.scrollTo(0,0)}catch{}
  await new Promise(r=>setTimeout(r,350));
  for(let i=0;i<12&&out.size<TARGET&&Date.now()-START<MAX_MS;i++){
    scan(win,step.q,step.tier);
    const elapsed=Math.round((Date.now()-START)/1000);
    status(win,'深度抓取 '+out.size+'/500｜'+(index+1)+'/'+plan.length+' '+step.tier+'级：'+step.q+'｜'+elapsed+'秒');
    if(out.size===last)stale++;else stale=0;
    last=out.size;
    if(stale>=4)break;
    try{
      win.scrollBy(0,Math.max(650,win.innerHeight*.85));
      for(const e of scrollables(win)) e.scrollTop=Math.min(e.scrollHeight,e.scrollTop+Math.max(550,e.clientHeight*.8));
    }catch{}
    await new Promise(r=>setTimeout(r,420))
  }
  scan(win,step.q,step.tier);
  queryStats.push({query:step.q,tier:step.tier,added:out.size-started,total:out.size});
}

let worker=null;
try{worker=window.open(location.href,'floorCollectorV721','width=980,height=760,left=28,top=28')}catch{}
let win=worker&&!worker.closed?worker:window;

for(let i=0;i<plan.length&&out.size<TARGET&&Date.now()-START<MAX_MS;i++){
  const step=plan[i],u=new URL(base);
  if(u.searchParams.has('q')||!u.searchParams.has('keyword'))u.searchParams.set('q',step.q);else u.searchParams.set('keyword',step.q);
  if(win!==window){
    try{
      status(win,'切换关键词 '+(i+1)+'/'+plan.length+'：'+step.q);
      win.location.href=u.href;
      if(!await waitLoad(win,step.q)){queryStats.push({query:step.q,tier:step.tier,added:0,total:out.size,error:'load-timeout'});continue}
    }catch{break}
  }else if(step.q!==Q){break}
  await collectQuery(win,step,i)
}

if(worker&&!worker.closed)try{worker.close()}catch{}
window.__FLOOR_V721_COLLECTING__=false;

if(!out.size){
  document.getElementById('__floor_v721_status__')?.remove();
  alert('没有识别到商品，请确认搜索结果已经加载');
  return
}
const tierCounts={A:0,B:0,C:0};
for(const x of out.values())tierCounts[x.sampleTier]=(tierCounts[x.sampleTier]||0)+1;
status(window,'抓取完成 '+out.size+'/500｜A '+tierCounts.A+' · B '+tierCounts.B+' · C '+tierCounts.C+'，正在导入…');

const payload={
  source:location.href,keyword:Q,
  meta:{
    target:TARGET,rawCount:rawKeys.size,validCount:out.size,duplicateCount:Math.max(0,rawKeys.size-out.size),
    tierCounts,queryStats,expanded:true,durationSeconds:Math.round((Date.now()-START)/1000),
    stoppedBy:out.size>=TARGET?'target':(Date.now()-START>=MAX_MS?'time-limit':'queries-exhausted')
  },
  items:[...out.values()]
};
const form=document.createElement('form');form.method='POST';form.action=ENDPOINT;form.target='_blank';
const inp=document.createElement('input');inp.type='hidden';inp.name='data';inp.value=JSON.stringify(payload);
form.appendChild(inp);document.body.appendChild(form);form.submit();
setTimeout(()=>{form.remove();document.getElementById('__floor_v721_status__')?.remove()},2000);
})().catch(e=>{
  window.__FLOOR_V721_COLLECTING__=false;
  document.getElementById('__floor_v721_status__')?.remove();
  alert('深度抓取失败：'+(e?.message||e))
});