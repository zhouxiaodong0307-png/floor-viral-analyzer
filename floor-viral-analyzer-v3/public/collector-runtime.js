(async()=>{
if(window.__FLOOR_V721_COLLECTING__)return;
window.__FLOOR_V721_COLLECTING__=true;

const TARGET=500, MAX_TOTAL_MS=8*60*1000, SATURATED_ROUNDS=2, MIN_ROUND_GAIN=3, ENDPOINT='https://floor-viral-analyzer.onrender.com/import';
const COLLECTOR_VERSION='8.3.0';
window.__FLOOR_MANUAL_STOP__=false;
let fatalReason='',stopReason='';
const safeQuery=(root,sel)=>{try{return root&&root.querySelector?root.querySelector(sel):null}catch{return null}};
const START=Date.now();
const C=s=>String(s||'').replace(/\s+/g,' ').trim();
const N=s=>{const m=String(s||'').replace(/,/g,'').match(/([\d.]+)\s*(万|w|W|k|K|千)?/i);if(!m)return null;let v=+m[1],u=m[2]||'';if(/万|w/i.test(u))v*=1e4;if(/k|千/i.test(u))v*=1e3;return Math.round(v)};
const base=new URL(location.href);
const HOST=base.hostname.toLowerCase(),IS_XHS=HOST.includes('xiaohongshu.com'),IS_XY=HOST.includes('goofish.com');
const Q=decodeURIComponent(base.searchParams.get('q')||base.searchParams.get('keyword')||base.searchParams.get('kw')||base.searchParams.get('query')||'').trim();

const out=new Map(), rawKeys=new Set(), queryStats=[];
const woods=['红檀香','缅甸柚木','柚木','橡木','白橡','欧橡','龙凤檀','菠萝格','黑胡桃','白蜡木','重蚁木','紫檀'];
const plan=[],seenQ=new Set();
function add(q,tier){q=C(q);if(!q||seenQ.has(q))return;seenQ.add(q);plan.push({q,tier})}
add(Q,'A');
if(Q&&!/地板/.test(Q)){add(Q+'地板','A');add(Q+'实木地板','A')}
else if(Q){const bare=C(Q.replace(/木?地板/g,''));if(bare&&bare!==Q)add(bare,'A')}
if(IS_XHS&&Q){
  const core=C(Q.replace(/木?地板/g,''))||Q;
  [
    core+'地板 实景',core+'地板 装修',core+'地板 铺装',core+'地板 怎么选',
    core+'地板 避坑',core+'地板 价格',core+'地板 对比',core+'地板 工厂',
    core+'地板 案例',core+'地板 客厅',core+'地板 卧室',core+'实木地板'
  ].forEach(q=>add(q,'A'));
}
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
      b.style='position:fixed;right:18px;top:18px;z-index:2147483647;background:#111;color:#fff;padding:12px 15px;border-radius:12px;font:600 13px -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 28px #0004;max-width:460px;line-height:1.45;display:flex;gap:10px;align-items:center;flex-wrap:wrap';
      const t=win.document.createElement('span');t.id='__floor_v721_status_text__';t.style='flex:1 1 260px';
      const stop=win.document.createElement('button');stop.textContent='停止并导入';stop.style='border:0;border-radius:8px;padding:6px 9px;font:700 11px -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer';
      stop.onclick=()=>{window.__FLOOR_MANUAL_STOP__=true;stop.disabled=true;stop.textContent='正在停止…'};
      b.append(t,stop);win.document.documentElement.appendChild(b);
    }
    const t=b.querySelector('#__floor_v721_status_text__');if(t)t.textContent=msg;
    win.document.title='采集 '+out.size+'/500｜'+(Q||'平台');
  }catch{}
}
status(window,'采集器 V'+COLLECTOR_VERSION+'｜准备深度抓取 0/500…');

function idOf(u){
  let m=String(u||'').match(/[?&](?:id|itemId|goodsId|noteId)=([^&#]+)/i)||String(u||'').match(/\/(?:item|detail|goods|note|explore|search_result)\/([A-Za-z0-9_-]{6,})/i);
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
function putItem(key,obj){
  const old=out.get(key)||{};
  const hits=[...(old.keywordHits||[]),obj.sourceKeyword].filter((x,i,a)=>x&&a.indexOf(x)===i);
  const prev=old.sampleTier||obj.sampleTier,finalTier=(prev==='A'||obj.sampleTier==='A')?'A':(prev==='B'||obj.sampleTier==='B')?'B':'C';
  out.set(key,{...old,...obj,keywordHits:hits,sampleTier:finalTier,
    wants:obj.wants??old.wants??null,views:obj.views??old.views??null,likes:obj.likes??old.likes??null,
    favs:obj.favs??old.favs??null,comments:obj.comments??old.comments??null,shares:obj.shares??old.shares??null,
    price:obj.price??old.price??null,ageText:obj.ageText||old.ageText||'',seller:obj.seller||old.seller||''
  });
}
function xhsCard(doc,a){
  let e=a;
  for(let i=0;i<7&&e;i++,e=e.parentElement){
    const r=e.getBoundingClientRect(),t=C(e.innerText);
    if(r.width>=120&&r.width<=760&&r.height>=70&&r.height<=1100&&t.length>=6&&t.length<=1100&&e.querySelector('img'))return e;
  }
  return null
}
function scanXhs(win,q,tier){
  const before=out.size,doc=win.document;
  const anchors=[...doc.querySelectorAll('a[href*="/explore/"],a[href*="/discovery/item/"],a[href*="/search_result/"]')];
  for(const a of anchors){
    const link=a.href||'',pid=idOf(link);if(!pid&&/\/search_result_ai(?:\?|$)/i.test(link))continue;
    const card=xhsCard(doc,a);if(!card)continue;
    const baseText=C(card.innerText),attrs=[...card.querySelectorAll('[aria-label],[title]')].map(el=>C(el.getAttribute('aria-label')||el.getAttribute('title'))).filter(Boolean).join(' '),t=C(baseText+' '+attrs);
    const lines=(card.innerText||'').split(/\n+/).map(C).filter(Boolean);
    const explicitTitle=C(safeQuery(card,'[class*="title"],[class*="note-title"]')?.innerText||'');
    const title=explicitTitle||titleOf(lines,q);if(!title)continue;
    const img=card.querySelector('img'),imgSrc=img?.currentSrc||img?.src||'';
    const lm=t.match(/(?:点赞|赞)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:点赞|赞)/i);
    const numericLines=lines.filter(x=>/^\d+(?:\.\d+)?\s*(?:万|w|W|k|K|千)?$/i.test(x));
    const fallbackLike=!lm&&numericLines.length?N(numericLines[numericLines.length-1]):null;
    const fm=t.match(/(?:收藏)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*收藏/i);
    const cm=t.match(/(?:评论)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*评论/i);
    const sm=t.match(/(?:转发|分享)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:转发|分享)/i);
    const vm=t.match(/(?:浏览|小眼睛|阅读)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:浏览|阅读)/i);
    const tm=t.match(/(刚刚|今天|昨天|\d+\s*(?:分钟|小时|天|周|个月|年)前)(?:发布)?/);
    let seller=C(safeQuery(card,'[class*="author"],[class*="user"],[class*="name"]')?.innerText||'');
    if(!seller){
      seller=lines.find(x=>x!==title&&x.length>=2&&x.length<=30&&!/^\d/.test(x)&&!/刚刚|今天|昨天|分钟前|小时前|天前|周前|个月前|年前/.test(x))||'';
    }
    const cleanTitle=title.replace(/\s+/g,'').replace(/[^\u4e00-\u9fa5a-z0-9]/gi,'').slice(0,160);
    let imageKey='';try{const z=new URL(imgSrc);imageKey=z.pathname.split('/').slice(-2).join('/').slice(0,120)}catch{}
    const key=pid||cleanTitle+'|'+seller.replace(/\s+/g,'').slice(0,60)+'|'+imageKey;
    rawKeys.add(key);
    putItem(key,{rank:out.size+1,productId:pid,title,text:t,url:link,image:imgSrc,imageCount:card.querySelectorAll('img').length||null,
      price:null,wants:null,views:vm?N(vm[1]):null,likes:lm?N(lm[1]):fallbackLike,favs:fm?N(fm[1]):null,comments:cm?N(cm[1]):null,shares:sm?N(sm[1]):null,
      ageText:tm?tm[1]:'',seller,contentType:'笔记',sourceKeyword:q,sampleTier:tier});
    if(out.size>=TARGET)break;
  }
  return out.size-before
}
function scanGeneric(win,q,tier){
  const before=out.size,doc=win.document;
  for(const a of doc.querySelectorAll('a[href]')){
    const card=getCard(doc,a);if(!card)continue;
    const baseText=C(card.innerText),attrs=[...card.querySelectorAll('[aria-label],[title]')].map(el=>C(el.getAttribute('aria-label')||el.getAttribute('title'))).filter(Boolean).join(' '),t=C(baseText+' '+attrs),lines=(card.innerText||'').split(/\n+/).map(C).filter(Boolean),title=titleOf(lines,q);
    if(!title)continue;
    const pm=t.match(/[¥￥]\s*([\d,.]+)/),price=pm?+pm[1].replace(/,/g,''):null,link=a.href||win.location.href,pid=idOf(link);
    const cleanTitle=title.replace(/\s+/g,'').replace(/[^\u4e00-\u9fa5a-z0-9]/gi,'').slice(0,150),key=pid||cleanTitle+'|'+(price??'');
    rawKeys.add(key);
    const wm=t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:人想要|想要)/i),
          vm=t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:浏览|浏览量|查看|阅读)/i),
          lm=t.match(/(?:点赞|赞)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:点赞|赞)/i),
          fm=t.match(/(?:收藏)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*收藏/i),
          cm=t.match(/(?:评论)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*评论/i),
          tm=t.match(/(刚刚|今天|昨天|\d+\s*(?:分钟|小时|天)前)(?:发布)?/),
          spec=t.match(/\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/i);
    const img=card.querySelector('img');
    putItem(key,{rank:out.size+1,productId:pid,title,text:t,url:link,image:img?.src||'',imageCount:card.querySelectorAll('img').length||null,price,
      wants:wm?N(wm[1]):null,views:vm?N(vm[1]):null,likes:lm?N(lm[1]):null,favs:fm?N(fm[1]):null,comments:cm?N(cm[1]):null,
      ageText:tm?tm[1]:'',specs:spec?spec[0]:'',sourceKeyword:q,sampleTier:tier});
    if(out.size>=TARGET)break;
  }
  return out.size-before
}
function scan(win,q,tier){return IS_XHS?scanXhs(win,q,tier):scanGeneric(win,q,tier)}
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
  for(let i=0;out.size<TARGET&&!window.__FLOOR_MANUAL_STOP__;i++){
    scan(win,step.q,step.tier);
    const elapsed=Math.round((Date.now()-START)/1000);
    status(win,'深度抓取 '+out.size+'/500｜'+(index+1)+'/'+plan.length+' '+step.tier+'级：'+step.q+'｜'+elapsed+'秒');
    if(out.size===last)stale++;else stale=0;
    last=out.size;
    if(stale>=18)break;
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
try{worker=window.open('about:blank','floorCollectorV812','width=980,height=760,left=28,top=28')}catch{}
if(!worker||worker.closed){
  window.__FLOOR_V721_COLLECTING__=false;
  document.getElementById('__floor_v721_status__')?.remove();
  alert('采集器 V'+COLLECTOR_VERSION+'：采集窗口被浏览器拦截。没有导入任何不完整数据。请允许小红书弹窗后重新点击“永久采集器”。');
  return
}
let win=worker;
let round=0,noGrowthRounds=0;
while(out.size<TARGET&&!window.__FLOOR_MANUAL_STOP__){
  if(Date.now()-START>=MAX_TOTAL_MS){stopReason='safety-time-limit';break}
  if(!win||win.closed){fatalReason='采集窗口被关闭';break}
  round++;
  const roundStart=out.size;
  for(let i=0;i<plan.length&&out.size<TARGET&&!window.__FLOOR_MANUAL_STOP__;i++){
    if(win.closed){fatalReason='采集窗口被关闭';break}
    const step=plan[i],u=new URL(base);
    if(u.searchParams.has('q')||!u.searchParams.has('keyword'))u.searchParams.set('q',step.q);else u.searchParams.set('keyword',step.q);
    u.searchParams.set('__floor_round',String(round));
    let loaded=false;
    for(let attempt=1;attempt<=3&&!loaded&&!window.__FLOOR_MANUAL_STOP__&&Date.now()-START<MAX_TOTAL_MS;attempt++){
      try{
        status(window,'第'+round+'轮｜关键词 '+(i+1)+'/'+plan.length+'：'+step.q+'｜已采 '+out.size+'/500');
        win.location.href=u.href;
        loaded=await waitLoad(win,step.q);
      }catch{}
      if(!loaded)await new Promise(r=>setTimeout(r,1200*attempt));
    }
    if(!loaded){
      queryStats.push({query:step.q,tier:step.tier,added:0,total:out.size,error:'load-failed-after-3-retries',round});
      continue
    }
    await collectQuery(win,step,i)
  }
  if(out.size>=TARGET||window.__FLOOR_MANUAL_STOP__||fatalReason)break;
  const roundGain=out.size-roundStart;
  if(roundGain<MIN_ROUND_GAIN)noGrowthRounds++;else noGrowthRounds=0;
  if(noGrowthRounds>=SATURATED_ROUNDS){
    stopReason='saturated';
    status(window,'平台当前可获取唯一样本已基本饱和｜'+out.size+'/500｜连续 '+SATURATED_ROUNDS+' 轮新增不足 '+MIN_ROUND_GAIN+' 条，准备导入实际结果');
    break
  }
  if(Date.now()-START>=MAX_TOTAL_MS){
    stopReason='safety-time-limit';
    status(window,'达到安全时限｜'+out.size+'/500｜准备导入实际结果');
    break
  }
  status(window,'第'+round+'轮完成｜'+out.size+'/500｜本轮新增 '+roundGain+'；继续尝试');
  await new Promise(r=>setTimeout(r,noGrowthRounds?2200:900));
}
if(worker&&!worker.closed)try{worker.close()}catch{}
window.__FLOOR_V721_COLLECTING__=false;
if(fatalReason&&out.size<TARGET&&!window.__FLOOR_MANUAL_STOP__){
  status(window,'采集异常中断｜已暂存 '+out.size+'/500｜未导入');
  alert('采集器 V'+COLLECTOR_VERSION+'：'+fatalReason+'。当前 '+out.size+' 条未导入，避免把不完整数据当成500条结果。请重新点击永久采集器继续测试。');
  return
}

if(!out.size){
  document.getElementById('__floor_v721_status__')?.remove();
  alert('没有识别到商品，请确认搜索结果已经加载');
  return
}
const tierCounts={A:0,B:0,C:0};
for(const x of out.values())tierCounts[x.sampleTier]=(tierCounts[x.sampleTier]||0)+1;
const stopLabel=out.size>=TARGET?'已达到500条':window.__FLOOR_MANUAL_STOP__?'手动停止':stopReason==='saturated'?'平台样本已饱和':stopReason==='safety-time-limit'?'达到8分钟安全时限':'结束';
status(window,stopLabel+'｜当前 '+out.size+'/500｜A '+tierCounts.A+' · B '+tierCounts.B+' · C '+tierCounts.C+'，正在导入实际结果…');

const payload={
  source:location.href,keyword:Q,
  meta:{
    target:TARGET,rawCount:rawKeys.size,validCount:out.size,duplicateCount:Math.max(0,rawKeys.size-out.size),
    tierCounts,queryStats,expanded:true,durationSeconds:Math.round((Date.now()-START)/1000),
    stoppedBy:out.size>=TARGET?'target':(window.__FLOOR_MANUAL_STOP__?'manual':(stopReason||'unknown')),rounds:round
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
  alert('深度抓取失败（V'+COLLECTOR_VERSION+'）：'+(e?.message||e))
});