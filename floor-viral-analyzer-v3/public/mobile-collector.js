(()=>{
  const MAX_ITEMS=18;
  const C=s=>String(s||'').replace(/\s+/g,' ').trim();
  const N=s=>{const m=String(s||'').replace(/,/g,'').match(/([\d.]+)\s*(万|w|W|k|K|千)?/i);if(!m)return null;let v=+m[1],u=m[2]||'';if(/万|w/i.test(u))v*=1e4;if(/k|千/i.test(u))v*=1e3;return Math.round(v)};
  const host=location.hostname.toLowerCase(),isXhs=host.includes('xiaohongshu.com');
  const out=[],seen=new Set();
  const titleOf=lines=>lines.find(x=>x.length>=5&&x.length<=160&&!/^[¥￥]?\s*[\d,.]+(?:元|人想要|想要|浏览|点赞|收藏|评论)?$/i.test(x))||'';
  const push=(row,key)=>{if(!key||seen.has(key)||out.length>=MAX_ITEMS)return;seen.add(key);out.push(row)};
  try{
    const anchors=isXhs
      ? [...document.querySelectorAll('a[href*="/explore/"],a[href*="/discovery/item/"],a[href*="/search_result/"]')].slice(0,80)
      : [...document.querySelectorAll('a[href]')].slice(0,120);
    for(const a of anchors){
      let card=a.closest('article,li,[class*="card"],[class*="item"],[class*="note"],[class*="goods"]')||a.parentElement;
      if(!card)continue;
      const raw=(card.innerText||'').trim();
      if(raw.length<6)continue;
      const lines=raw.split(/\n+/).map(C).filter(Boolean);
      const title=C(card.querySelector('[class*="title"],[class*="note-title"]')?.innerText||'')||titleOf(lines);
      if(!title)continue;
      const text=C(raw).slice(0,260);
      const href=a.href||location.href;
      const metric=name=>{const m=text.match(new RegExp('(?:'+name+')\\s*[:：]?\\s*([\\d,.]+\\s*(?:万|w|W|k|K|千)?)','i'))||text.match(new RegExp('([\\d,.]+\\s*(?:万|w|W|k|K|千)?)\\s*(?:'+name+')','i'));return m?N(m[1]):null};
      const pm=text.match(/[¥￥]\s*([\d,.]+)/),tm=text.match(/(刚刚|今天|昨天|\d+\s*(?:分钟|小时|天|周|个月|年)前)/);
      const img=card.querySelector('img'),r=img?.getBoundingClientRect(),w=img?.naturalWidth||r?.width||0,h=img?.naturalHeight||r?.height||0,ratio=h?Math.round(w/h*100)/100:null;
      const seller=C(card.querySelector('[class*="author"],[class*="user"],[class*="name"]')?.innerText||'').slice(0,60);
      const row=[
        title.slice(0,100),
        href.slice(0,360),
        pm?Number(pm[1].replace(/,/g,'')):null,
        metric('想要|人想要'),
        metric('点赞|赞'),
        metric('收藏'),
        metric('评论'),
        metric('转发|分享'),
        tm?tm[1]:'',
        ratio,
        card.querySelector('video,[class*="video"],[class*="play"]')?'视频':'图片',
        seller.slice(0,36)
      ];
      push(row,(href.match(/[A-Za-z0-9_-]{8,}/)||[])[0]||title.slice(0,80));
      if(out.length>=MAX_ITEMS)break;
    }
    const pack={v:'8.2.12',s:location.href,k:new URL(location.href).searchParams.get('q')||new URL(location.href).searchParams.get('keyword')||'',i:out};
    const json=JSON.stringify(pack);
    const b64=btoa(unescape(encodeURIComponent(json)));
    const target='https://floor-viral-analyzer.onrender.com/#mobile='+encodeURIComponent(b64);
    completion(target);
  }catch(e){
    completion('https://floor-viral-analyzer.onrender.com/#mobileError='+encodeURIComponent(String(e?.message||e)));
  }
})();