import fs from "node:fs";

const file = new URL("./public/index.html", import.meta.url);
const v61File = new URL("./public/v61.js", import.meta.url);
let html = fs.readFileSync(file, "utf8");
let v61 = fs.readFileSync(v61File, "utf8");

// V6.2: preserve missing metrics as null instead of silently converting null -> 0.
v61 = v61.replace(
  "const TARGET_RAW=500, TARGET_VALID=300;",
  "const TARGET_RAW=500, TARGET_VALID=300;\n  const nval=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);"
);
for (const field of ['price','wants','views','likes','favs','comments','consults','shares','imageCount']) {
  v61 = v61.replaceAll(`Number.isFinite(+raw.${field})?+raw.${field}:null`, `nval(raw.${field})`);
}

// Do not pretend the crawl time is the listing publish time. Missing age stays unknown.
v61 = v61.replace(
  "function recordAgeH(x){const h=ageHoursText(x.ageText);if(h!=null)return h;const d=new Date(x.firstCapturedAt||x.capturedAt||0);return Number.isFinite(d.getTime())?Math.max(1,(Date.now()-d.getTime())/36e5):null}",
  "function recordAgeH(x){const h=ageHoursText(x.ageText);if(h!=null)return h;if(x.publishedAt){const d=new Date(x.publishedAt);if(Number.isFinite(d.getTime()))return Math.max(.1,(Date.now()-d.getTime())/36e5)}return null}"
);

// Cleaner validity rules: filter navigation/ads/invalid pages but do not throw away real product cards just because detail text is short.
v61 = v61.replace(
  "if(/已下架|商品不存在|已失效|违规下架|页面不存在/.test(t))return false;",
  "if(/已下架|商品不存在|已失效|违规下架|页面不存在/.test(t))return false;if(/广告|商业推广|赞助内容/.test(t))return false;"
);
v61 = v61.replace(
  "if(String(x.text||'').length<8)return false;",
  "if((String(x.title||'')+' '+String(x.text||'')).trim().length<12)return false;"
);

// Recent data is preferred, but only when publish age is actually known.
v61 = v61.replace(
  "const c=classify(raw),ev=evidencePool(c),sp=splitPerf(ev.arr),sigs=",
  "const c=classify(raw),ev=evidencePool(c),recentMain=ev.arr.filter(x=>{const h=recordAgeH(x);return h!=null&&h<=30*24}),analysisArr=recentMain.length>=30?recentMain:ev.arr,sp=splitPerf(analysisArr),sigs="
);
v61 = v61.replaceAll("time:timeLabel(ev.arr)", "time:timeLabel(analysisArr)");
v61 = v61.replace(
  "lastAnalysis=analyze(raw);const a=lastAnalysis,best=",
  "lastAnalysis=analyze(raw);const a=lastAnalysis;const am=new Set(a.A.map(x=>x.key)),bm=new Set(a.B.map(x=>x.key)),cm=new Set(a.C.map(x=>x.key));store.records.forEach(r=>{if(am.has(r.key))r.sampleTier='A';else if(bm.has(r.key))r.sampleTier='B';else if(cm.has(r.key))r.sampleTier='C'});saveStore();const best="
);

// Collector rewrite: count UNIQUE product-like cards, not arbitrary nested DOM nodes.
// A candidate must look like a product card (price + image/background + plausible title), then it is deduped by product id/url/title+price.
const collectorStart = v61.indexOf("  function installCollector(){");
const collectorEnd = v61.indexOf("\n\n  mount();", collectorStart);
if (collectorStart >= 0 && collectorEnd > collectorStart) {
  const collector = String.raw`  function installCollector(){
    const a=document.getElementById('collector');if(!a)return;
    a.textContent='深度抓取500条';
    a.href=\`javascript:(async()=>{const W='https://floor-viral-analyzer.onrender.com/import',C=s=>String(s||'').replace(/\\s+/g,' ').trim(),N=s=>{let m=String(s||'').replace(/,/g,'').match(/([\\d.]+)\\s*(万|w|W|k|K|千)?/);if(!m)return null;let v=+m[1],u=m[2]||'';if(/万|w/i.test(u))v*=1e4;if(/k|千/i.test(u))v*=1e3;return Math.round(v)},Q=(()=>{try{let u=new URL(location.href);return decodeURIComponent(u.searchParams.get('q')||u.searchParams.get('keyword')||u.searchParams.get('kw')||u.searchParams.get('query')||'')}catch{return''}})(),out=new Map(),F=/木地板|地板|实木|多层|三层|复合|强化|橡木|柚木|红檀香|龙凤檀|黑胡桃|白蜡木|菠萝格|重蚁木|紫檀/i;
function idOf(u){let m=String(u||'').match(/(?:item|detail|goods|note)[\\/=: _-]*([A-Za-z0-9_-]{6,})/i)||String(u||'').match(/[?&](?:id|itemId|goodsId|noteId)=([^&#]+)/i);return m?m[1]:''}
function pickTitle(lines,text){let q=Q.trim();let rows=lines.filter(x=>x.length>=5&&x.length<=180&&!/^[¥￥]?\\s*[\\d,.]+(?:元|人想要|想要|浏览|点赞|收藏|评论)?$/i.test(x)&&!/^(包邮|可自提|全新|二手|刚刚|今天|昨天|\\d+分钟前|\\d+小时前|\\d+天前|卖家信用.*|回复.*)$/.test(x));if(!rows.length)return'';rows.sort((a,b)=>{let sa=(q&&a.includes(q)?40:0)+(F.test(a)?25:0)+Math.min(a.length,50),sb=(q&&b.includes(q)?40:0)+(F.test(b)?25:0)+Math.min(b.length,50);return sb-sa});return rows[0]||''}
function scan(){let cand=[];for(const el of document.querySelectorAll('a[href],article,li,div')){let r=el.getBoundingClientRect();if(r.width<140||r.width>950||r.height<70||r.height>1100)continue;let text=C(el.innerText);if(text.length<10||text.length>1500)continue;let prices=text.match(/[¥￥]\\s*[\\d,.]+/g)||[];if(!prices.length||prices.length>3)continue;let img=el.querySelector('img'),bg=getComputedStyle(el).backgroundImage;if(!img&&(!bg||bg==='none'))continue;cand.push({el,text,area:r.width*r.height,top:r.top,img})}cand.sort((x,y)=>x.area-y.area||x.top-y.top);for(const c of cand){let lines=(c.el.innerText||'').split(/\\n+/).map(C).filter(Boolean),title=pickTitle(lines,c.text);if(!title)continue;let anchor=c.el.matches('a[href]')?c.el:(c.el.closest('a[href]')||c.el.querySelector('a[href]')),link=anchor?.href||location.href,pid=idOf(link),t=c.text,pm=t.match(/[¥￥]\\s*([\\d,.]+)/);if(!pm)continue;let price=+pm[1].replace(/,/g,''),key=pid||(link!==location.href&&!/[?&](?:q|keyword|kw|query)=/i.test(link)?link.split('#')[0]:title.slice(0,120)+'|'+price);if(out.has(key))continue;if(Q&&/木地板|地板|实木|多层|三层|橡木|柚木|红檀香|龙凤檀|黑胡桃|白蜡木|菠萝格|重蚁木|紫檀/i.test(Q)&&!F.test(t))continue;let wm=t.match(/([\\d,.]+\\s*(?:万|w|W|k|K|千)?)\\s*(?:人想要|想要)/i),vm=t.match(/([\\d,.]+\\s*(?:万|w|W|k|K|千)?)\\s*(?:浏览|浏览量|查看|阅读)/i),lm=t.match(/(?:点赞|赞)\\s*[:：]?\\s*([\\d,.]+\\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\\d,.]+\\s*(?:万|w|W|k|K|千)?)\\s*(?:点赞|赞)/i),fm=t.match(/(?:收藏)\\s*[:：]?\\s*([\\d,.]+\\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\\d,.]+\\s*(?:万|w|W|k|K|千)?)\\s*收藏/i),cm=t.match(/(?:评论)\\s*[:：]?\\s*([\\d,.]+\\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\\d,.]+\\s*(?:万|w|W|k|K|千)?)\\s*评论/i),qm=t.match(/(?:咨询|问过|沟通)\\s*[:：]?\\s*([\\d,.]+\\s*(?:万|w|W|k|K|千)?)/i),tm=t.match(/(刚刚|今天|昨天|\\d+\\s*(?:分钟|小时|天)前)(?:发布)?/),sm=t.match(/\\d{2,4}\\s*[x×*]\\s*\\d{2,4}(?:\\s*[x×*]\\s*\\d{1,3})?/i),loc=lines.find(x=>/北京|上海|天津|重庆|广东|深圳|广州|浙江|江苏|山东|福建|四川|陕西|湖北|湖南|河北|河南|广西|云南|贵州|辽宁|吉林|安徽|江西|山西/.test(x)&&x.length<30)||'';out.set(key,{rank:out.size+1,productId:pid,title,text:t,url:link,image:c.img?.src||'',imageCount:c.el.querySelectorAll('img').length||null,price:Number.isFinite(price)?price:null,wants:wm?N(wm[1]):null,views:vm?N(vm[1]):null,likes:lm?N(lm[1]):null,favs:fm?N(fm[1]):null,comments:cm?N(cm[1]):null,consults:qm?N(qm[1]):null,ageText:tm?tm[1]:'',specs:sm?sm[0]:'',location:loc,status:/全新/.test(t)?'全新':/二手|闲置/.test(t)?'二手':'',sourceKeyword:Q,keywordHits:[Q].filter(Boolean)});if(out.size>=500)break}}
function scroller(){let best=document.scrollingElement,range=(best?.scrollHeight||0)-(best?.clientHeight||0);for(const el of document.querySelectorAll('main,section,div')){let cs=getComputedStyle(el),rr=el.scrollHeight-el.clientHeight;if(rr>range&&rr>500&&/(auto|scroll)/.test(cs.overflowY)){best=el;range=rr}}return best}
let box=document.createElement('div');box.style='position:fixed;right:18px;top:18px;z-index:2147483647;background:#111;color:#fff;padding:10px 14px;border-radius:10px;font:13px -apple-system,sans-serif;box-shadow:0 6px 24px #0003';document.body.appendChild(box);let stable=0,last=0,s=scroller();for(let i=0;i<160&&out.size<500;i++){scan();box.textContent='正在抓取 '+out.size+'/500 条有效候选';if(out.size===last)stable++;else stable=0;last=out.size;if(stable>=22)break;if(s===document.scrollingElement){window.scrollBy(0,Math.max(850,innerHeight*.92))}else{s.scrollTop+=Math.max(850,s.clientHeight*.9)}await new Promise(r=>setTimeout(r,520));if(i%12===11)s=scroller()}scan();box.textContent='已识别 '+out.size+' 条，正在导入…';if(!out.size){box.remove();alert('没有识别到商品卡片，请确认搜索结果已加载');return}let f=document.createElement('form');f.method='POST';f.action=W;f.target='_blank';let inp=document.createElement('input');inp.type='hidden';inp.name='data';inp.value=JSON.stringify({source:location.href,keyword:Q,rawCount:out.size,items:[...out.values()]});f.appendChild(inp);document.body.appendChild(f);f.submit();setTimeout(()=>{f.remove();box.remove()},1800)})()\`;
  }`;
  v61 = v61.slice(0, collectorStart) + collector + v61.slice(collectorEnd);
}

html = html.replaceAll("V4.8", "V6.2").replaceAll("V4.9", "V6.2").replaceAll("V5.0", "V6.2").replaceAll("V5.1", "V6.2").replaceAll("V5.2", "V6.2").replaceAll("V6.0", "V6.2").replaceAll("V6.1", "V6.2");
html = html.replace(
  "先把数据抓够，再只用与你商品真正相关的样本决定下一篇怎么发",
  "每次只统计真正识别到的商品卡片；先保证样本有效，再做测试决策"
);
html = html.replace(
  "不会再把不相关的“柚木 / 锁扣 / 原木”等词硬塞进你的商品",
  "V6.2 已修复抓取候选污染、缺失数据被当成0、抓取时间误当发布时间等问题"
);

html = html.replace(/<script\s+src=["']\/v49\.js[^>]*><\/script>/g, "");
html = html.replace(/<script\s+id=["']v50-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v51-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v52-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v60-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v61-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v62-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace("</body>", `<script id="v62-inline">\n${v61}\n<\/script></body>`);

html = html.replace(
  /<div class="foot">[\s\S]*?<\/div><\/div>\s*<script>/,
  '<div class="foot">V6.2：全局修复抓取链路。500条目标现在指“去重后的商品卡片”，不再把重复DOM节点冒充原始商品；缺失互动保持为缺失，不再自动变成0；没有发布时间的商品不再假装是近期商品。数据库继续滚动去重，A级/B级/C级分层及可信度规则保持不变。</div></div>\n<script>'
);

fs.writeFileSync(file, html);
console.log("V6.2 collector and data-quality fixes applied");
