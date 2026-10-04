(async()=>{
if(window.__FLOOR_V721_COLLECTING__)return;
window.__FLOOR_V721_COLLECTING__=true;

const TARGET=500, DEPTH_TARGET=120, DEPTH_MAX_MS=150000, MAX_TOTAL_MS=6*60*1000, ENDPOINT='https://floor-viral-analyzer.onrender.com/import';
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
const BREADTH_MAX_MS=IS_XHS?180000:90000, QUERY_MAX_MS=IS_XHS?9000:6500, QUERY_MAX_STEPS=IS_XHS?20:14, STALE_SCANS=3;

const out=new Map(), rawKeys=new Set(), queryStats=[];
const woods=['红檀香','缅甸柚木','柚木','橡木','白橡','欧橡','龙凤檀','菠萝格','黑胡桃','白蜡木','重蚁木','紫檀'];
const plan=[],seenQ=new Set();
function add(q,tier){q=C(q);if(!q||seenQ.has(q))return;seenQ.add(q);plan.push({q,tier})}
add(Q,'A');
if(Q&&!/地板/.test(Q)){add(Q+'地板','A');add(Q+'实木地板','A')}
else if(Q){const bare=C(Q.replace(/地板$/,''));if(bare&&bare!==Q)add(bare,'A')}
if(IS_XHS&&Q){
  const core=C(Q.replace(/地板$/,''))||Q;
  [
    core+'地板 实景',core+'地板 装修',core+'地板 铺装',core+'地板 怎么选',
    core+'地板 避坑',core+'地板 价格',core+'地板 对比',core+'地板 工厂',
    core+'地板 案例',core+'地板 客厅',core+'地板 卧室',core+'地板 完工',
    core+'地板 实拍',core+'地板 地暖',core+'地板 规格',core+'地板 选购',
    core+'地板 预算',core+'地板 安装',core+'地板 人字',core+'地板 鱼骨',
    core+'地板 收口',core+'实木地板'
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
status(window,'采集器 V'+COLLECTOR_VERSION+'｜准备广度采集 0/500…');

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
    price:obj.price??old.price??null,ageText:obj.ageText||old.ageText||'',seller:obj.seller||old.seller||'',coverRatio:obj.coverRatio??old.coverRatio??null,coverRatioType:obj.coverRatioType||old.coverRatioType||'',coverHasTextOverlay:obj.coverHasTextOverlay??old.coverHasTextOverlay??null,coverVisualType:obj.coverVisualType||old.coverVisualType||'',coverVisualConfidence:obj.coverVisualConfidence||old.coverVisualConfidence||'',coverOverlayText:obj.coverOverlayText||old.coverOverlayText||'',carouselCount:obj.carouselCount??old.carouselCount??null,visibleImageCount:obj.visibleImageCount??old.visibleImageCount??null,mediaType:obj.mediaType||old.mediaType||''
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

function coverMeta(card,img){
  try{
    if(!img)return{coverRatio:null,coverRatioType:'',coverHasTextOverlay:null,coverVisualType:'',coverVisualConfidence:'',carouselCount:null,mediaType:'图片'};
    const ir=img.getBoundingClientRect(),nw=img.naturalWidth||0,nh=img.naturalHeight||0,w=nw||ir.width||0,h=nh||ir.height||0,ratio=h?Math.round((w/h)*100)/100:null;
    const ratioType=ratio===null?'':ratio<.84?'竖版':ratio>1.18?'横版':'方形/近方形';
    const visible=[...card.querySelectorAll('img')].filter(x=>{try{const r=x.getBoundingClientRect();return r.width>40&&r.height>40}catch{return false}});
    const allAttrs=[...card.querySelectorAll('[aria-label],[title]')].map(el=>C(el.getAttribute('aria-label')||el.getAttribute('title'))).filter(Boolean).join(' ');
    const imgCue=C((img.alt||'')+' '+(img.title||'')+' '+(img.getAttribute('aria-label')||''));
    let overlay=[];
    for(const el of card.querySelectorAll('span,p,b,strong,div')){
      if(el===card||el.querySelector('img'))continue;
      const tx=C(el.innerText);if(!tx||tx.length>60)continue;
      try{
        const r=el.getBoundingClientRect();
        const ix=Math.max(0,Math.min(r.right,ir.right)-Math.max(r.left,ir.left)),iy=Math.max(0,Math.min(r.bottom,ir.bottom)-Math.max(r.top,ir.top));
        if(ix*iy>0&&r.width>4&&r.height>4)overlay.push(tx);
      }catch{}
      if(overlay.length>=8)break
    }
    overlay=[...new Set(overlay)];
    const overlayText=C(overlay.join(' ')),coverHasTextOverlay=overlayText.replace(/\s+/g,'').length>=4;
    const cardText=C(card.innerText);
    const strongCue=C(imgCue+' '+overlayText),weakCue=C(strongCue+' '+cardText.slice(0,220));
    const rules=[
      ['实景/空间',/客厅|卧室|餐厅|家装|实景|空间|入住|新家|房间|效果图|完工/],
      ['工厂/生产',/工厂|车间|生产|仓库|流水线|库存|下线/],
      ['施工/铺装',/施工|安装|铺设|铺装|龙骨|鱼骨|人字|工字|收口/],
      ['板材/木纹近景',/板材|样板|色板|木纹|纹理|近景|细节|板面/],
      ['对比/拼图',/对比|前后|vs|VS|区别|差别|拼图|两种|左右/],
      ['信息/清单',/清单|攻略|避坑|建议|问题|细节|误区|图解|参数|规格|尺寸|价格/]
    ];
    let visualType='',confidence='';
    for(const [name,re] of rules){if(re.test(strongCue)){visualType=name;confidence='中';break}}
    if(!visualType)for(const [name,re] of rules){if(re.test(weakCue)){visualType=name;confidence='低';break}}
    const cm=(allAttrs+' '+cardText).match(/(?:^|\D)(\d{1,2})\s*\/\s*(\d{1,2})(?:\D|$)/)|| (allAttrs+' '+cardText).match(/(\d{1,2})\s*(?:张|图)/);
    let carouselCount=null;if(cm){carouselCount=cm[2]?+cm[2]:+cm[1];if(!(carouselCount>=2&&carouselCount<=20))carouselCount=null}
    if(!carouselCount&&visible.length>1)carouselCount=visible.length;
    const mediaType=card.querySelector('video,[class*="video"],[class*="play"]')||/视频|播放/.test(allAttrs)?'视频':'图片';
    return{coverRatio:ratio,coverRatioType:ratioType,coverHasTextOverlay,coverVisualType:visualType,coverVisualConfidence:confidence,coverOverlayText:overlayText.slice(0,160),carouselCount,visibleImageCount:visible.length||1,mediaType}
  }catch{return{coverRatio:null,coverRatioType:'',coverHasTextOverlay:null,coverVisualType:'',coverVisualConfidence:'',carouselCount:null,mediaType:'图片'}}
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
    const visual=coverMeta(card,img);
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
    putItem(key,{rank:out.size+1,productId:pid,title,text:t,url:link,image:imgSrc,imageCount:visual.carouselCount||visual.visibleImageCount||null,...visual,
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
function primaryScroller(win){
  let best=null,bestRoom=0;
  for(const e of win.document.querySelectorAll('main,[role="main"],section,div')){
    try{
      const cs=win.getComputedStyle(e),room=e.scrollHeight-e.clientHeight,r=e.getBoundingClientRect();
      if(room>bestRoom&&room>500&&r.width>win.innerWidth*.45&&r.height>win.innerHeight*.35&&/auto|scroll/.test(cs.overflowY)){best=e;bestRoom=room}
    }catch{}
  }
  return best
}
function scrollSignature(win){
  try{
    const root=win.document.scrollingElement||win.document.documentElement;
    return [Math.round(win.scrollY||root.scrollTop||0),root.scrollHeight,root.clientHeight].join('|')
  }catch{return''}
}
async function advanceScroll(win){
  const before=scrollSignature(win);
  try{win.scrollBy(0,Math.max(720,win.innerHeight*.9))}catch{}
  await new Promise(r=>setTimeout(r,70));
  let moved=scrollSignature(win)!==before;
  if(!moved){
    try{
      const e=primaryScroller(win);
      if(e){
        const p=e.scrollTop;
        e.scrollTop=Math.min(e.scrollHeight,e.scrollTop+Math.max(650,e.clientHeight*.85));
        moved=e.scrollTop>p+2
      }
    }catch{}
  }
  return moved
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
  const started=out.size,queryStart=Date.now();
  let stale=0,last=out.size,steps=0,stuck=0,reason='limit';
  try{win.scrollTo(0,0)}catch{}
  await new Promise(r=>setTimeout(r,220));
  for(;out.size<TARGET&&!window.__FLOOR_MANUAL_STOP__&&steps<QUERY_MAX_STEPS;steps++){
    if(Date.now()-queryStart>=QUERY_MAX_MS){reason='query-time-limit';break}
    if(Date.now()-START>=BREADTH_MAX_MS){reason='breadth-time-limit';break}
    scan(win,step.q,step.tier);
    const elapsed=Math.round((Date.now()-START)/1000),added=out.size-started;
    status(win,'广度采集 '+out.size+'/500｜'+(index+1)+'/'+plan.length+' '+step.tier+'级：'+step.q+'｜本词新增 '+added+'｜'+elapsed+'秒');
    if(out.size===last)stale++;else stale=0;
    last=out.size;
    if(stale>=STALE_SCANS){reason='no-new-unique';break}
    const moved=await advanceScroll(win);
    if(!moved)stuck++;else stuck=0;
    if(stuck>=2&&stale>=2){reason='scroll-end';break}
    await new Promise(r=>setTimeout(r,IS_XHS?300:240))
  }
  scan(win,step.q,step.tier);
  queryStats.push({query:step.q,tier:step.tier,added:out.size-started,total:out.size,steps,durationMs:Date.now()-queryStart,stoppedBy:reason});
}


function depthScore(x){
  const likes=N(x.likes)||0,favs=N(x.favs)||0,comments=N(x.comments)||0,shares=N(x.shares)||0,rank=N(x.rank)||999;
  return likes+favs*2+comments*3+shares*4+Math.max(0,600-rank)*.03;
}
function sampleBand(arr,count){
  if(!arr.length||count<=0)return[];
  const out=[],step=arr.length/count;
  for(let i=0;i<count;i++){const x=arr[Math.min(arr.length-1,Math.floor((i+.5)*step))];if(x&&!out.includes(x))out.push(x)}
  return out
}
function selectDepthSample(limit){
  const entries=[...out.entries()].filter(([,x])=>/^https?:\/\/[^/]*xiaohongshu\.com\/(?:explore|discovery\/item|search_result)\//i.test(String(x.url||'')));
  entries.sort((a,b)=>depthScore(b[1])-depthScore(a[1]));
  if(entries.length<=limit)return entries;
  const n=entries.length,parts=[
    entries.slice(0,Math.ceil(n*.20)),
    entries.slice(Math.ceil(n*.20),Math.ceil(n*.50)),
    entries.slice(Math.ceil(n*.50),Math.ceil(n*.80)),
    entries.slice(Math.ceil(n*.80))
  ],quota=[36,30,30,24],picked=[],seen=new Set();
  for(let b=0;b<parts.length;b++)for(const e of sampleBand(parts[b],quota[b])){if(!seen.has(e[0])){seen.add(e[0]);picked.push(e)}}
  for(const e of entries){if(picked.length>=limit)break;if(!seen.has(e[0])){seen.add(e[0]);picked.push(e)}}
  return picked.slice(0,limit)
}
function detailMetric(doc,body,keys){
  const keyRe=new RegExp(keys,'i'),nodes=[...doc.querySelectorAll('button,[role="button"],span,div')];
  for(const el of nodes){
    let cue='';
    try{cue=C((el.getAttribute('aria-label')||'')+' '+(el.getAttribute('title')||'')+' '+(el.id||'')+' '+(typeof el.className==='string'?el.className:'')+' '+C(el.innerText).slice(0,60))}catch{}
    if(!keyRe.test(cue))continue;
    const texts=[C(el.innerText),C(el.parentElement?.innerText),C(el.nextElementSibling?.innerText)].filter(Boolean);
    for(const tx of texts){
      const m=tx.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)/i);
      if(m){const v=N(m[1]);if(v!==null)return v}
    }
  }
  const re1=new RegExp('(?:'+keys+')\\s*[:：]?\\s*([\\d,.]+\\s*(?:万|w|W|k|K|千)?)','i');
  const re2=new RegExp('([\\d,.]+\\s*(?:万|w|W|k|K|千)?)\\s*(?:'+keys+')','i');
  const m=body.match(re1)||body.match(re2);return m?N(m[1]):null
}
function decodeJsonString(v){try{return JSON.parse('"'+String(v||'').replace(/"/g,'\\"')+'"')}catch{return String(v||'').replace(/\\n/g,' ').replace(/\\u([0-9a-f]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)))}}
function scriptState(doc){
  let raw='';
  try{
    raw=[...doc.scripts].map(x=>x.textContent||'').filter(x=>/likedCount|collectedCount|commentCount|shareCount|"desc"|"title"/.test(x)).join('\n').slice(0,2500000)
  }catch{}
  if(!raw)return{};
  const str=k=>{const m=raw.match(new RegExp('"'+k+'"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"','i'));return m?decodeJsonString(m[1]):''};
  const metric=keys=>{for(const k of keys){const m=raw.match(new RegExp('"'+k+'"\\s*:\\s*"?([\\d.,]+\\s*(?:万|w|W|k|K|千)?)"?','i'));if(m){const v=N(m[1]);if(v!==null)return v}}return null};
  return{title:str('title'),desc:str('desc')||str('description'),likes:metric(['likedCount','likeCount','likes']),favs:metric(['collectedCount','collectCount','favCount']),comments:metric(['commentCount','comments']),shares:metric(['shareCount','shares'])}
}
function detailText(doc,item,state){
  const metas=[
    doc.querySelector('meta[name="description"]')?.content,
    doc.querySelector('meta[property="og:description"]')?.content,
    doc.querySelector('meta[name="twitter:description"]')?.content
  ].map(C).filter(Boolean);
  const selectors='[class*="note-content"],[class*="desc"],[class*="description"],[class*="content-text"],[class*="note-text"]';
  const blocks=[...doc.querySelectorAll(selectors)].map(x=>C(x.innerText)).filter(x=>x.length>=20&&x.length<=8000).sort((a,b)=>b.length-a.length);
  const candidate=blocks[0]||C(state?.desc||'')||metas.sort((a,b)=>b.length-a.length)[0]||'';
  if(candidate&&candidate.length>=20)return candidate;
  return item.text||''
}
function extractXhsDetail(win,item){
  try{
    const doc=win.document,body=C(doc.body?.innerText||''),state=scriptState(doc),title=C(doc.querySelector('meta[property="og:title"]')?.content||safeQuery(doc,'[class*="title"],[class*="note-title"]')?.innerText||state.title||item.title||'').replace(/\s*[-|｜]\s*小红书.*$/,'');
    const likes=detailMetric(doc,body,'点赞|赞')??state.likes??null,favs=detailMetric(doc,body,'收藏')??state.favs??null,comments=detailMetric(doc,body,'评论')??state.comments??null,shares=detailMetric(doc,body,'转发|分享')??state.shares??null,views=detailMetric(doc,body,'浏览|阅读|小眼睛');
    const timeMatch=body.match(/(刚刚|今天|昨天|\d+\s*(?:分钟|小时|天|周|个月|年)前|\d{4}[.\-/年]\d{1,2}(?:[.\-/月]\d{1,2})?)/);
    const imgs=[...doc.querySelectorAll('img')].filter(im=>{try{const r=im.getBoundingClientRect(),w=im.naturalWidth||r.width,h=im.naturalHeight||r.height;return w>=220&&h>=220&&r.width>120&&r.height>120}catch{return false}});
    const uniqueImgs=[];const seen=new Set();for(const im of imgs){const s=im.currentSrc||im.src||'';if(s&&!seen.has(s)){seen.add(s);uniqueImgs.push(im)}}
    const mainImg=uniqueImgs[0]||doc.querySelector('img'),visual=coverMeta(doc.body||doc.documentElement,mainImg);
    const noteText=detailText(doc,item,state),mediaType=doc.querySelector('video,[class*="video"],[class*="player"]')?'视频':(visual.mediaType||item.mediaType||'图片');
    const useful=[likes,favs,comments,shares,views].filter(v=>v!==null).length+(noteText&&noteText!==item.text?1:0)+(uniqueImgs.length?1:0);
    return{title:title||item.title,text:noteText,likes:likes??item.likes??null,favs:favs??item.favs??null,comments:comments??item.comments??null,shares:shares??item.shares??null,views:views??item.views??null,
      ageText:timeMatch?timeMatch[1]:(item.ageText||''),imageCount:uniqueImgs.length||item.imageCount||null,carouselCount:uniqueImgs.length||item.carouselCount||null,mediaType,
      coverRatio:visual.coverRatio??item.coverRatio??null,coverRatioType:visual.coverRatioType||item.coverRatioType||'',coverHasTextOverlay:visual.coverHasTextOverlay??item.coverHasTextOverlay??null,
      coverVisualType:visual.coverVisualType||item.coverVisualType||'',coverVisualConfidence:visual.coverVisualConfidence||item.coverVisualConfidence||'',
      coverOverlayText:visual.coverOverlayText||item.coverOverlayText||'',deepFetched:true,deepUsefulFields:useful}
  }catch{return null}
}
async function waitDetail(win){
  for(let i=0;i<18;i++){
    try{
      const doc=win.document,body=doc?.body,ready=doc&&doc.readyState!=='loading';
      if(body&&ready&&(body.innerText.length>180||[...doc.scripts].some(x=>/likedCount|collectedCount|"desc"/.test(x.textContent||''))))return true
    }catch{}
    await new Promise(r=>setTimeout(r,200))
  }
  return false
}
async function enrichDepth(win){
  const sample=selectDepthSample(DEPTH_TARGET),start=Date.now();
  let attempted=0,enriched=0,failed=0,failStreak=0;
  for(let i=0;i<sample.length&&!window.__FLOOR_MANUAL_STOP__;i++){
    if(Date.now()-start>=DEPTH_MAX_MS)break;
    if(!win||win.closed)break;
    const [key,item]=sample[i];attempted++;
    status(window,'500条广度采集完成｜正在补全详情 '+(i+1)+'/'+sample.length+'｜已成功 '+enriched);
    let loaded=false;
    try{win.location.href=item.url;loaded=await waitDetail(win)}catch{}
    if(!loaded){failed++;failStreak++;if(failStreak>=8)break;continue}
    await new Promise(r=>setTimeout(r,140));
    const d=extractXhsDetail(win,item);
    if(d&&d.deepUsefulFields>=1){
      out.set(key,{...item,...d,keywordHits:item.keywordHits||[],sampleTier:item.sampleTier});
      enriched++;failStreak=0;
    }else{failed++;failStreak++}
    await new Promise(r=>setTimeout(r,90));
    if(failStreak>=8)break
  }
  const fields=['views','likes','favs','comments','shares','ageText','imageCount','coverRatioType','coverVisualType'];
  const fieldCounts={};for(const k of fields)fieldCounts[k]=[...out.values()].filter(x=>x[k]!==null&&x[k]!==undefined&&x[k]!=='').length;
  return{target:DEPTH_TARGET,selected:sample.length,attempted,enriched,failed,durationSeconds:Math.round((Date.now()-start)/1000),fieldCounts}
}
let worker=null;
try{worker=window.open('about:blank','floorCollectorV8300','width=980,height=760,left=28,top=28')}catch{}
if(!worker||worker.closed){
  window.__FLOOR_V721_COLLECTING__=false;
  document.getElementById('__floor_v721_status__')?.remove();
  alert('采集器 V'+COLLECTOR_VERSION+'：采集窗口被浏览器拦截。没有导入任何不完整数据。请允许弹窗后重新点击“永久采集器”。');
  return
}
let win=worker;
let processedQueries=0;
for(let i=0;i<plan.length&&out.size<TARGET&&!window.__FLOOR_MANUAL_STOP__;i++){
  if(Date.now()-START>=BREADTH_MAX_MS){stopReason='breadth-time-limit';break}
  if(!win||win.closed){fatalReason='采集窗口被关闭';break}
  const step=plan[i],u=new URL(base);
  if(u.searchParams.has('q')||!u.searchParams.has('keyword'))u.searchParams.set('q',step.q);else u.searchParams.set('keyword',step.q);
  let loaded=false;
  for(let attempt=1;attempt<=2&&!loaded&&!window.__FLOOR_MANUAL_STOP__&&Date.now()-START<BREADTH_MAX_MS;attempt++){
    try{
      status(window,'广度采集｜关键词 '+(i+1)+'/'+plan.length+'：'+step.q+'｜已采 '+out.size+'/500');
      win.location.href=u.href;
      loaded=await waitLoad(win,step.q);
    }catch{}
    if(!loaded)await new Promise(r=>setTimeout(r,700*attempt))
  }
  if(!loaded){
    queryStats.push({query:step.q,tier:step.tier,added:0,total:out.size,error:'load-failed-after-2-retries'});
    continue
  }
  await collectQuery(win,step,i);
  processedQueries++;
}
if(out.size<TARGET&&!window.__FLOOR_MANUAL_STOP__&&!fatalReason&&!stopReason)stopReason='unique-sample-exhausted';
let depthMeta={target:DEPTH_TARGET,selected:0,attempted:0,enriched:0,failed:0,durationSeconds:0,fieldCounts:{}};
if(IS_XHS&&!window.__FLOOR_MANUAL_STOP__&&!fatalReason&&out.size>=60&&worker&&!worker.closed){
  try{depthMeta=await enrichDepth(worker)}catch{}
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
const stopLabel=out.size>=TARGET?'已达到500条':window.__FLOOR_MANUAL_STOP__?'手动停止':stopReason==='unique-sample-exhausted'?'本轮唯一结果已采完':stopReason==='breadth-time-limit'?'广度采集达到时限':stopReason==='safety-time-limit'?'达到总安全时限':'结束';
status(window,stopLabel+'｜广度 '+out.size+'/500｜详情补全 '+(depthMeta.enriched||0)+'/'+(depthMeta.target||DEPTH_TARGET)+'，正在导入实际结果…');

const payload={
  source:location.href,keyword:Q,
  meta:{
    target:TARGET,rawCount:rawKeys.size,validCount:out.size,duplicateCount:Math.max(0,rawKeys.size-out.size),
    tierCounts,queryStats,depth:depthMeta,expanded:true,durationSeconds:Math.round((Date.now()-START)/1000),
    stoppedBy:out.size>=TARGET?'target':(window.__FLOOR_MANUAL_STOP__?'manual':(stopReason||'unknown')),processedQueries
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