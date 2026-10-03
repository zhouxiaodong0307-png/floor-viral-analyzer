(async()=>{
  const TARGET=500,MAX_MS=8500,END='https://floor-viral-analyzer.onrender.com/import';
  const C=s=>String(s||'').replace(/\s+/g,' ').trim();
  const N=s=>{const m=String(s||'').replace(/,/g,'').match(/([\d.]+)\s*(万|w|W|k|K|千)?/i);if(!m)return null;let v=+m[1],u=m[2]||'';if(/万|w/i.test(u))v*=1e4;if(/k|千/i.test(u))v*=1e3;return Math.round(v)};
  const base=new URL(location.href),host=base.hostname.toLowerCase(),isXhs=host.includes('xiaohongshu.com');
  const out=new Map(),start=Date.now();
  let tip=document.getElementById('__floor_mobile_tip__');
  if(!tip){tip=document.createElement('div');tip.id='__floor_mobile_tip__';tip.style.cssText='position:fixed;z-index:2147483647;left:14px;right:14px;top:14px;padding:12px 14px;border-radius:12px;background:#111;color:#fff;font:600 14px -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 28px #0004';document.documentElement.appendChild(tip)}
  tip.textContent='手机采集器 V8.2.7｜正在采集…';
  const idOf=u=>{const m=String(u||'').match(/[?&](?:id|itemId|goodsId|noteId)=([^&#]+)/i)||String(u||'').match(/\/(?:item|detail|goods|note|explore|search_result)\/([A-Za-z0-9_-]{6,})/i);return m?m[1]:''};
  const titleOf=(lines,q='')=>{const rows=lines.filter(x=>x.length>=5&&x.length<=220&&!/^[¥￥]?\s*[\d,.]+(?:元|人想要|想要|浏览|点赞|收藏|评论)?$/i.test(x)&&!/^(包邮|可自提|全新|二手|刚刚|今天|昨天|\d+分钟前|\d+小时前|\d+天前)$/.test(x));rows.sort((a,b)=>((q&&b.includes(q)?40:0)+Math.min(b.length,70))-((q&&a.includes(q)?40:0)+Math.min(a.length,70)));return rows[0]||''};
  function visualMeta(card,img){
    try{
      if(!img)return{coverRatio:null,coverRatioType:'',visibleImageCount:0,mediaType:'图片'};
      const r=img.getBoundingClientRect(),w=img.naturalWidth||r.width||0,h=img.naturalHeight||r.height||0,ratio=h?Math.round(w/h*100)/100:null;
      const visible=[...card.querySelectorAll('img')].filter(x=>{const z=x.getBoundingClientRect();return z.width>40&&z.height>40});
      return{coverRatio:ratio,coverRatioType:ratio==null?'':ratio<.84?'竖版':ratio>1.18?'横版':'方形/近方形',visibleImageCount:visible.length||1,mediaType:card.querySelector('video,[class*="video"],[class*="play"]')?'视频':'图片'};
    }catch{return{coverRatio:null,coverRatioType:'',visibleImageCount:null,mediaType:'图片'}}
  }
  function scanXhs(){
    const anchors=[...document.querySelectorAll('a[href*="/explore/"],a[href*="/discovery/item/"],a[href*="/search_result/"]')];
    for(const a of anchors){
      let card=a;
      for(let i=0;i<7&&card;i++,card=card.parentElement){
        const r=card.getBoundingClientRect(),t=C(card.innerText);
        if(r.width>=110&&r.height>=60&&r.height<=1200&&t.length>=6&&t.length<=1500&&card.querySelector('img'))break;
      }
      if(!card)continue;
      const text=C(card.innerText),lines=(card.innerText||'').split(/\n+/).map(C).filter(Boolean);
      const explicit=C(card.querySelector('[class*="title"],[class*="note-title"]')?.innerText||''),title=explicit||titleOf(lines);
      if(!title)continue;
      const href=a.href||location.href,pid=idOf(href),img=card.querySelector('img'),vm=visualMeta(card,img);
      const attrs=[...card.querySelectorAll('[aria-label],[title]')].map(x=>C(x.getAttribute('aria-label')||x.getAttribute('title'))).join(' '),all=C(text+' '+attrs);
      const metric=name=>{const m=all.match(new RegExp('(?:'+name+')\\s*[:：]?\\s*([\\d,.]+\\s*(?:万|w|W|k|K|千)?)','i'))||all.match(new RegExp('([\\d,.]+\\s*(?:万|w|W|k|K|千)?)\\s*(?:'+name+')','i'));return m?N(m[1]):null};
      const tm=all.match(/(刚刚|今天|昨天|\d+\s*(?:分钟|小时|天|周|个月|年)前)(?:发布)?/);
      const seller=C(card.querySelector('[class*="author"],[class*="user"],[class*="name"]')?.innerText||'');
      const key=pid||title.replace(/\s+/g,'').slice(0,160)+'|'+seller.slice(0,60);
      out.set(key,{rank:out.size+1,productId:pid,title,text:all,url:href,image:img?.currentSrc||img?.src||'',likes:metric('点赞|赞'),favs:metric('收藏'),comments:metric('评论'),shares:metric('转发|分享'),views:metric('浏览|阅读|小眼睛'),ageText:tm?tm[1]:'',seller,contentType:'笔记',imageCount:vm.visibleImageCount,...vm});
      if(out.size>=TARGET)break;
    }
  }
  function scanGeneric(){
    for(const a of document.querySelectorAll('a[href]')){
      let card=a;
      for(let i=0;i<8&&card;i++,card=card.parentElement){
        const r=card.getBoundingClientRect(),t=C(card.innerText);
        if(r.width>=110&&r.height>=55&&r.height<=1400&&t.length>=8&&t.length<=1800&&card.querySelector('img')&&(/[¥￥]\s*[\d,.]+/.test(t)||/(想要|点赞|收藏|评论|浏览|已售)/.test(t)))break;
      }
      if(!card)continue;
      const text=C(card.innerText),lines=(card.innerText||'').split(/\n+/).map(C).filter(Boolean),title=titleOf(lines);
      if(!title)continue;
      const href=a.href||location.href,pid=idOf(href),pm=text.match(/[¥￥]\s*([\d,.]+)/),wm=text.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:人想要|想要)/i),lm=text.match(/(?:点赞|赞)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i),fm=text.match(/(?:收藏)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i),cm=text.match(/(?:评论)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i),tm=text.match(/(刚刚|今天|昨天|\d+\s*(?:分钟|小时|天)前)/),img=card.querySelector('img'),vm=visualMeta(card,img);
      const key=pid||title.replace(/\s+/g,'').slice(0,160)+'|'+(pm?pm[1]:'');
      out.set(key,{rank:out.size+1,productId:pid,title,text,url:href,image:img?.currentSrc||img?.src||'',price:pm?+pm[1].replace(/,/g,''):null,wants:wm?N(wm[1]):null,likes:lm?N(lm[1]):null,favs:fm?N(fm[1]):null,comments:cm?N(cm[1]):null,ageText:tm?tm[1]:'',imageCount:vm.visibleImageCount,...vm});
      if(out.size>=TARGET)break;
    }
  }
  try{
    let stale=0,last=-1,rounds=0;
    while(out.size<TARGET&&Date.now()-start<MAX_MS&&rounds<28){
      isXhs?scanXhs():scanGeneric();
      tip.textContent='手机采集器 V8.2.7｜已采 '+out.size+'/500';
      if(out.size===last)stale++;else stale=0;
      last=out.size;rounds++;
      if(stale>=6)break;
      window.scrollBy(0,Math.max(560,Math.floor(innerHeight*.82)));
      await new Promise(r=>setTimeout(r,260));
    }
    isXhs?scanXhs():scanGeneric();
    if(!out.size)throw Error('没有识别到有效内容，请确认当前是搜索结果页并已加载出商品/笔记');
    const payload={source:location.href,keyword:decodeURIComponent(base.searchParams.get('q')||base.searchParams.get('keyword')||''),meta:{target:TARGET,validCount:out.size,mobile:true,mobileCollectorVersion:'8.2.7',transport:'shortcut-native',stoppedBy:out.size>=TARGET?'target':'mobile-time-window',durationSeconds:Math.round((Date.now()-start)/1000)},items:[...out.values()]};
    tip.textContent='采集完成 '+out.size+' 条｜正在交给快捷指令…';
    if(typeof completion==='function'){
      completion(JSON.stringify(payload));
      setTimeout(()=>tip.remove(),1200);
      return;
    }
    const form=document.createElement('form');form.method='POST';form.action=END;form.target='_self';
    const inp=document.createElement('input');inp.type='hidden';inp.name='data';inp.value=JSON.stringify(payload);form.appendChild(inp);document.body.appendChild(form);form.submit();
  }catch(e){
    tip.textContent='采集失败：'+(e?.message||e);
    if(typeof completion==='function')completion(JSON.stringify({ok:false,error:String(e?.message||e)}));
  }
})();