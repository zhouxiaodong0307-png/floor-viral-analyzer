(async()=>{
  const BASE='https://floor-viral-analyzer.onrender.com',TARGET=120;
  const done=v=>{try{if(typeof completion==='function')completion(v)}catch{}};
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const num=s=>{const m=String(s||'').replace(/,/g,'').match(/([\d.]+)\s*(万|w|W|k|K|千)?/i);if(!m)return null;let v=+m[1],u=m[2]||'';if(/万|w/i.test(u))v*=1e4;if(/k|千/i.test(u))v*=1e3;return Math.round(v)};
  let box=document.getElementById('__floor_mobile_collect__');
  if(!box){box=document.createElement('div');box.id='__floor_mobile_collect__';box.style.cssText='position:fixed;z-index:2147483647;left:14px;right:14px;top:14px;padding:12px 14px;border-radius:12px;background:#111;color:#fff;font:600 14px -apple-system;box-shadow:0 8px 30px #0004';document.documentElement.appendChild(box)}
  box.textContent='正在采集当前页面…';
  const q=(()=>{try{const u=new URL(location.href);return clean(u.searchParams.get('q')||u.searchParams.get('keyword')||u.searchParams.get('search_keyword')||'')}catch{return''}})();
  const items=new Map(),rawKeys=new Set();
  const hrefOf=el=>{const a=el.closest?.('a[href]')||el.querySelector?.('a[href]');return a?.href||location.href};
  const keyOf=(url,title,price)=>{const m=String(url||'').match(/(?:item|detail|id)[\/=:_-]?([a-z0-9_-]{6,})/i);return m?'id:'+m[1]:'t:'+clean(title).slice(0,100)+'|'+(price??'')};
  function scan(){
    const cand=[];
    for(const el of document.querySelectorAll('article,li,a,div')){
      const r=el.getBoundingClientRect();
      if(r.width<130||r.width>980||r.height<65||r.height>1250||r.bottom<-100||r.top>innerHeight*2)continue;
      const text=clean(el.innerText);if(text.length<8||text.length>1800)continue;
      const img=el.querySelector('img'),bg=getComputedStyle(el).backgroundImage,href=hrefOf(el);
      if(!(/[¥￥]\s*\d/.test(text)||/(想要|点赞|收藏|评论|浏览|已售)/.test(text)||/(item|detail)/i.test(href)))continue;
      if(!img&&(!bg||bg==='none'))continue;
      cand.push({el,text,area:r.width*r.height,top:r.top,img,href});
    }
    cand.sort((a,b)=>a.area-b.area||a.top-b.top);
    for(const c of cand){
      const lines=(c.el.innerText||'').split(/\n+/).map(clean).filter(Boolean);
      const title=lines.find(x=>x.length>=5&&x.length<=220&&!/^(¥|￥|\d+(?:\.\d+)?[万wk千]?|点赞|赞|收藏|评论|分享|想要|关注|搜索|综合|筛选|包邮)$/i.test(x));
      if(!title)continue;
      rawKeys.add((c.href||'')+'|'+title.slice(0,120));
      const t=c.text,pm=t.match(/[¥￥]\s*([\d,.]+)/),price=pm?+pm[1].replace(/,/g,''):null;
      const wm=t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:人想要|想要)/i);
      const lm=t.match(/(?:点赞|赞)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:点赞|赞)/i);
      const fm=t.match(/(?:收藏)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*收藏/i);
      const cm=t.match(/(?:评论)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*评论/i);
      const vm=t.match(/(?:浏览|浏览量|阅读|曝光)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i)||t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:浏览|阅读)/i);
      const tm=t.match(/(刚刚|今天|昨天|\d+\s*(?:分钟|小时|天)前)(?:发布)?/);
      const sm=t.match(/\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/i),k=keyOf(c.href,title,price),old=items.get(k);
      items.set(k,{...old,rank:old?.rank||items.size+1,title,text:t,url:c.href,image:c.img?.src||old?.image||'',price,wants:wm?num(wm[1]):old?.wants??null,likes:lm?num(lm[1]):old?.likes??null,favs:fm?num(fm[1]):old?.favs??null,comments:cm?num(cm[1]):old?.comments??null,views:vm?num(vm[1]):old?.views??null,specs:sm?sm[0]:old?.specs||'',ageText:tm?tm[1]:old?.ageText||'',imageCount:c.el.querySelectorAll('img').length||old?.imageCount||0,searchKeyword:q});
      if(items.size>=TARGET)break;
    }
  }
  try{
    let stable=0,last=-1;
    for(let i=0;i<10&&items.size<TARGET;i++){
      scan();box.textContent='正在采集… '+items.size+' 条';
      if(items.size===last)stable++;else stable=0;last=items.size;if(stable>=3)break;
      window.scrollBy({top:Math.max(650,innerHeight*.8),behavior:'instant'});
      await new Promise(r=>setTimeout(r,320));
    }
    scan();
    if(!items.size)throw new Error('没有识别到商品，请先在 Safari 打开商品搜索结果页并等待内容加载完成');
    box.textContent='正在导入 '+items.size+' 条…';
    const payload={source:location.href,keyword:q,meta:{target:500,rawCount:rawKeys.size,validCount:items.size,duplicateCount:Math.max(0,rawKeys.size-items.size),mobile:true},items:[...items.values()]};
    const r=await fetch(BASE+'/api/mobile-upload',{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(payload),cache:'no-store'});
    const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'上传失败');
    box.textContent='采集完成，正在打开分析器…';
    location.href=BASE+d.importUrl;
    done({ok:true,count:items.size});
  }catch(e){
    box.textContent='采集失败：'+(e?.message||e);
    setTimeout(()=>box.remove(),4500);
    done({ok:false,error:String(e?.message||e)});
  }
})();