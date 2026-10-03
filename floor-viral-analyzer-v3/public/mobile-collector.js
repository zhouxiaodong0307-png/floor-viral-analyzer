(()=>{
  const HARD_TARGET=500,BATCH_MAX=80;
  const C=s=>String(s||'').replace(/\s+/g,' ').trim();
  const N=s=>{const m=String(s||'').replace(/,/g,'').match(/([\d.]+)\s*(万|w|W|k|K|千)?/i);if(!m)return null;let v=+m[1],u=m[2]||'';if(/万|w/i.test(u))v*=1e4;if(/k|千/i.test(u))v*=1e3;return Math.round(v)};
  const base=new URL(location.href),host=base.hostname.toLowerCase(),isXhs=host.includes('xiaohongshu.com');
  const out=new Map();
  let finished=false;
  let tip=document.getElementById('__floor_mobile_tip__');
  if(!tip){tip=document.createElement('div');tip.id='__floor_mobile_tip__';tip.style.cssText='position:fixed;z-index:2147483647;left:14px;right:14px;top:14px;padding:12px 14px;border-radius:12px;background:#111;color:#fff;font:600 14px -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 28px #0004';document.documentElement.appendChild(tip)}
  tip.textContent='手机采集器 V8.2.9｜正在快速读取当前页面…';
  const idOf=u=>{const m=String(u||'').match(/[?&](?:id|itemId|goodsId|noteId)=([^&#]+)/i)||String(u||'').match(/\/(?:item|detail|goods|note|explore|search_result)\/([A-Za-z0-9_-]{6,})/i);return m?m[1]:''};
  const titleOf=lines=>lines.find(x=>x.length>=5&&x.length<=180&&!/^[¥￥]?\s*[\d,.]+(?:元|人想要|想要|浏览|点赞|收藏|评论)?$/i.test(x)&&!/^(包邮|可自提|全新|二手|刚刚|今天|昨天|\d+分钟前|\d+小时前|\d+天前)$/.test(x))||'';
  function scanXhs(){
    const anchors=[...document.querySelectorAll('a[href*="/explore/"],a[href*="/discovery/item/"],a[href*="/search_result/"]')];
    for(const a of anchors){
      let card=a;
      for(let i=0;i<7&&card;i++,card=card.parentElement){
        const r=card.getBoundingClientRect(),t=C(card.innerText);
        if(r.width>=100&&r.height>=55&&r.height<=1200&&t.length>=6&&t.length<=1600&&card.querySelector('img'))break;
      }
      if(!card)continue;
      const lines=(card.innerText||'').split(/\n+/).map(C).filter(Boolean);
      const title=C(card.querySelector('[class*="title"],[class*="note-title"]')?.innerText||'')||titleOf(lines);
      if(!title)continue;
      const href=a.href||location.href,pid=idOf(href),img=card.querySelector('img'),all=C(card.innerText).slice(0,420);
      const metric=name=>{const m=all.match(new RegExp('(?:'+name+')\\s*[:：]?\\s*([\\d,.]+\\s*(?:万|w|W|k|K|千)?)','i'))||all.match(new RegExp('([\\d,.]+\\s*(?:万|w|W|k|K|千)?)\\s*(?:'+name+')','i'));return m?N(m[1]):null};
      const tm=all.match(/(刚刚|今天|昨天|\d+\s*(?:分钟|小时|天|周|个月|年)前)/);
      let seller=C(card.querySelector('[class*="author"],[class*="user"],[class*="name"]')?.innerText||'').slice(0,80);
      const key=pid||title.replace(/\s+/g,'').slice(0,120)+'|'+seller;
      const r=img?.getBoundingClientRect(),w=img?.naturalWidth||r?.width||0,h=img?.naturalHeight||r?.height||0,ratio=h?Math.round(w/h*100)/100:null;
      out.set(key,{rank:out.size+1,productId:pid,title:title.slice(0,220),text:all,url:href,image:(img?.currentSrc||img?.src||'').slice(0,1200),likes:metric('点赞|赞'),favs:metric('收藏'),comments:metric('评论'),shares:metric('转发|分享'),views:metric('浏览|阅读|小眼睛'),ageText:tm?tm[1]:'',seller,contentType:'笔记',coverRatio:ratio,coverRatioType:ratio==null?'':ratio<.84?'竖版':ratio>1.18?'横版':'方形/近方形',mediaType:card.querySelector('video,[class*="video"],[class*="play"]')?'视频':'图片'});
      if(out.size>=BATCH_MAX)break;
    }
  }
  function scanGeneric(){
    for(const a of document.querySelectorAll('a[href]')){
      let card=a;
      for(let i=0;i<8&&card;i++,card=card.parentElement){
        const r=card.getBoundingClientRect(),t=C(card.innerText);
        if(r.width>=100&&r.height>=55&&r.height<=1400&&t.length>=8&&t.length<=1800&&card.querySelector('img')&&(/[¥￥]\s*[\d,.]+/.test(t)||/(想要|点赞|收藏|评论|浏览|已售)/.test(t)))break;
      }
      if(!card)continue;
      const text=C(card.innerText).slice(0,420),lines=(card.innerText||'').split(/\n+/).map(C).filter(Boolean),title=titleOf(lines);
      if(!title)continue;
      const href=a.href||location.href,pid=idOf(href),pm=text.match(/[¥￥]\s*([\d,.]+)/),wm=text.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:人想要|想要)/i),lm=text.match(/(?:点赞|赞)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i),fm=text.match(/(?:收藏)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i),cm=text.match(/(?:评论)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i),tm=text.match(/(刚刚|今天|昨天|\d+\s*(?:分钟|小时|天)前)/),img=card.querySelector('img');
      const key=pid||title.replace(/\s+/g,'').slice(0,120)+'|'+(pm?pm[1]:'');
      const r=img?.getBoundingClientRect(),w=img?.naturalWidth||r?.width||0,h=img?.naturalHeight||r?.height||0,ratio=h?Math.round(w/h*100)/100:null;
      out.set(key,{rank:out.size+1,productId:pid,title:title.slice(0,220),text,url:href,image:(img?.currentSrc||img?.src||'').slice(0,1200),price:pm?+pm[1].replace(/,/g,''):null,wants:wm?N(wm[1]):null,likes:lm?N(lm[1]):null,favs:fm?N(fm[1]):null,comments:cm?N(cm[1]):null,ageText:tm?tm[1]:'',coverRatio:ratio,coverRatioType:ratio==null?'':ratio<.84?'竖版':ratio>1.18?'横版':'方形/近方形'});
      if(out.size>=BATCH_MAX)break;
    }
  }
  function scan(){isXhs?scanXhs():scanGeneric()}
  function finish(){
    if(finished)return;finished=true;
    scan();
    const items=[...out.values()].slice(0,BATCH_MAX);
    const payload=items.length?{
      source:location.href,
      keyword:decodeURIComponent(base.searchParams.get('q')||base.searchParams.get('keyword')||''),
      meta:{target:HARD_TARGET,validCount:items.length,mobile:true,mobileFastBatch:true,batchTarget:BATCH_MAX,mobileCollectorVersion:'8.2.9',transport:'shortcut-fast'},
      items
    }:{ok:false,error:'没有识别到有效内容，请确认当前是闲鱼 / 小红书搜索结果页并已加载出内容'};
    tip.textContent=items.length?'已读取 '+items.length+' 条，正在导入…':'没有识别到有效内容';
    completion(JSON.stringify(payload));
  }
  try{
    scan();
    if(out.size<BATCH_MAX){
      window.scrollBy(0,Math.max(380,Math.floor(innerHeight*.55)));
      window.setTimeout(finish,450);
    }else{
      finish();
    }
  }catch(e){
    completion(JSON.stringify({ok:false,error:String(e?.message||e)}));
  }
})();