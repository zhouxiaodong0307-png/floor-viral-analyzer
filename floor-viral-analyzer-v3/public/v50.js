(() => {
  const FACT_RISK = new Set(['全新','二手','翻新','现货','库存','尾货','清仓','特价','处理','包邮','全国发货','支持自提','包安装','定制','地暖','环保','E0','E1','品牌','工厂','厂家','批发']);
  const SAFE_CONTEXT = new Set(['木地板','地板','家装','装修','选材','实拍','铺装','木种','结构','规格']);
  const WORD_BANK = ['实木','多层','三层','复合','强化','橡木','柚木','红檀香','龙凤檀','黑胡桃','白蜡木','菠萝格','鱼骨','人字','工字','锁扣','平扣','全新','二手','翻新','现货','库存','尾货','清仓','特价','处理','包邮','发货','自提','安装','定制','家装','装修','客厅','卧室','地暖','工装','原木','耐磨','环保','E0','E1','工厂','厂家','批发','品牌','选材','铺装','规格','价格'];
  const FEATURES = [
    {id:'productFront',label:'产品词前置',test:x=>/^(?:【[^】]+】\s*)?(?:全新|二手|特价|清仓\s*)?(?:实木|多层|三层|复合|强化|橡木|柚木|红檀香|龙凤檀|黑胡桃|白蜡木|菠萝格|木地板|地板)/.test(String(x.title||'').trim())},
    {id:'shortTitle',label:'短标题更直接',test:x=>String(x.title||'').trim().length<=28},
    {id:'priceTitle',label:'标题直接带价格',test:x=>/[¥￥]\s*\d|\d+(?:\.\d+)?\s*元/.test(String(x.title||''))},
    {id:'specTitle',label:'标题直接写规格',test:x=>/\d{2,4}\s*[x×*]\s*\d{2,4}/i.test(String(x.title||''))},
    {id:'conditionTitle',label:'标题写商品状态',test:x=>/全新|二手|翻新|尾货/.test(String(x.title||''))},
    {id:'dealTitle',label:'标题有价格刺激词',test:x=>/清仓|特价|低价|处理|甩卖|优惠/.test(String(x.title||''))},
    {id:'stockTitle',label:'标题强调现货库存',test:x=>/现货|库存/.test(String(x.title||''))},
    {id:'factoryTitle',label:'标题强调厂家货源',test:x=>/工厂|厂家|批发|仓库/.test(String(x.title||''))},
    {id:'sceneTitle',label:'标题带家装场景',test:x=>/家装|装修|客厅|卧室|工装|办公室/.test(String(x.title||''))},
    {id:'serviceTitle',label:'标题带服务信息',test:x=>/包邮|发货|自提|安装|定制|配送/.test(String(x.title||''))},
    {id:'numberTitle',label:'标题有明确数字',test:x=>/\d/.test(String(x.title||''))},
    {id:'ctaBody',label:'正文有明确沟通动作',test:x=>/私聊|咨询|沟通|联系|可以聊|可聊|需要.*问|想要.*问|直接.*问/.test(String(x.text||''))},
    {id:'detailBody',label:'正文信息密度更高',test:x=>String(x.text||'').length>=120}
  ];

  const unique=a=>[...new Set(a.filter(Boolean))];
  const rate=(a,fn)=>a.length?a.filter(fn).length/a.length:0;
  const pct=v=>Math.round(v*100)+'%';
  const textOf=x=>String((x.title||'')+' '+(x.text||''));

  function inputFacts(raw){
    const base=parseInput(raw), r=String(raw||'');
    base.raw=r;
    base.topic=(base.text||r).replace(/\b(?:全新|二手|现货|翻新|清仓|特价|处理|库存|尾货)\b/g,' ').replace(/\s+/g,' ').trim()||r;
    return base;
  }

  function hasFact(word,f){
    if(!FACT_RISK.has(word)) return true;
    return String(f.raw||'').includes(word);
  }

  function buildPools(raw){
    const original=relatedAnalysis(raw), f=inputFacts(raw);
    const direct=[...original.rel];
    const keys=new Set(direct.map(x=>x._key||x.url||x.title));
    const supplement=[...items].filter(x=>!keys.has(x._key||x.url||x.title)).sort((a,b)=>valueScore(b)-valueScore(a)).slice(0,Math.max(0,30-direct.length));
    const patternPool=direct.length>=15?direct:[...direct,...supplement];
    const ranked=[...patternPool].sort((a,b)=>valueScore(b)-valueScore(a));
    const winN=Math.max(4,Math.min(15,Math.ceil(ranked.length*.30)));
    const winners=ranked.slice(0,winN), ordinary=ranked.slice(winN);
    return {...original,f,direct,supplement,patternPool,winners,ordinary};
  }

  function featureSignals(pool){
    const hi=pool.winners, lo=pool.ordinary.length?pool.ordinary:pool.patternPool;
    return FEATURES.map(def=>{
      const hr=rate(hi,def.test), lr=rate(lo,def.test), hc=hi.filter(def.test).length;
      const lift=hr-lr, score=lift*2.2+hr*.8+(hc>=3?.15:0);
      return {...def,hr,lr,hc,lift,score};
    }).filter(x=>x.hc>=2 && (x.hr>=.35 || x.lift>=.13)).sort((a,b)=>b.score-a.score);
  }

  function wordSignals(pool){
    const hi=pool.winners, lo=pool.ordinary.length?pool.ordinary:pool.patternPool;
    return WORD_BANK.map(w=>{
      const hc=hi.filter(x=>textOf(x).includes(w)).length, lc=lo.filter(x=>textOf(x).includes(w)).length;
      const hr=hi.length?hc/hi.length:0, lr=lo.length?lc/lo.length:0, lift=hr-lr;
      return {w,hc,lc,hr,lr,lift,score:lift*2+hr};
    }).filter(x=>x.hc>=2 && x.hr>=.25).sort((a,b)=>b.score-a.score);
  }

  function commonality(pool,features,words){
    const rows=[];
    features.slice(0,5).forEach(x=>rows.push({label:x.label,detail:`高价值 ${pct(x.hr)} / 普通 ${pct(x.lr)}`,strength:x.lift}));
    words.filter(x=>x.lift>.08).slice(0,4).forEach(x=>rows.push({label:`高频词「${x.w}」`,detail:`高价值 ${pct(x.hr)} / 普通 ${pct(x.lr)}`,strength:x.lift}));
    return rows.sort((a,b)=>b.strength-a.strength).slice(0,6);
  }

  function topic(f){
    let t=String(f.topic||f.raw||'').trim();
    if(!/地板/.test(t)) t+=' 木地板';
    return t.replace(/\s+/g,' ').trim();
  }

  function safeWinnerWords(pool,words){
    const f=pool.f;
    return words.map(x=>x.w).filter(w=>hasFact(w,f)).filter(w=>!['价格','规格'].includes(w));
  }

  function buildTitle(pool,features,words,seed){
    const f=pool.f, t=topic(f), ids=new Set(features.map(x=>x.id)), safe=safeWinnerWords(pool,words);
    const hasScene=ids.has('sceneTitle') || safe.some(w=>['家装','装修'].includes(w));
    const price=f.price?`¥${f.price}/㎡`:'';
    const spec=f.specs||'';
    const cond=(f.condition||[]).join(' ');
    const variants=[];

    if(ids.has('priceTitle') && price) variants.push(`${t} ${price}${spec?' '+spec:''}${cond?' '+cond:''}`);
    if(ids.has('specTitle') && spec) variants.push(`${t} ${spec}${price?' '+price:''}${cond?' '+cond:''}`);
    if(hasScene) variants.push(`${t}｜家装选材先看木种和结构`);
    if(ids.has('shortTitle')) variants.push(`${t}${cond?' '+cond:''}${price&&ids.has('priceTitle')?' '+price:''}`);
    variants.push(`${t}${spec?' '+spec:''}${cond?' '+cond:''}${price?' '+price:''}`);
    variants.push(`${t}｜木种、结构、规格直接对比`);

    let out=unique(variants)[seed%unique(variants).length]||t;
    const med=Math.round(median(pool.winners.map(x=>String(x.title||'').length).filter(Boolean))||24);
    const max=Math.max(22,Math.min(48,med+8));
    if(out.length>max) out=out.slice(0,max).replace(/[｜、，,\s]+$/,'');
    return out;
  }

  function buildBody(pool,features,words,seed){
    const f=pool.f,t=topic(f),ids=new Set(features.map(x=>x.id)),safe=safeWinnerWords(pool,words),lines=[];
    const scene=(ids.has('sceneTitle')||safe.some(w=>['家装','装修'].includes(w)));
    const detailed=ids.has('detailBody') || median(pool.winners.map(x=>String(x.text||'').length).filter(Boolean))>=120;

    if(scene) lines.push(`${t}，家装选材时先把木种、结构和铺装方式放在一起看。`);
    else lines.push(`${t}，商品信息尽量直接写清楚，方便快速对比。`);
    if(f.specs) lines.push(`规格：${f.specs}。`);
    if(f.price) lines.push(`价格：${f.price}元/㎡。`);
    if(f.condition?.length) lines.push(`状态：${f.condition.join('、')}。`);

    if(ids.has('specTitle')&&!f.specs) lines.push('不同规格对应的用量和单片尺寸不同，可按实际面积确认。');
    if(ids.has('priceTitle')&&!f.price) lines.push('同类高价值内容经常把价格放前面；实际售价确认后建议直接写清楚。');
    if(detailed) lines.push('木种、结构、规格、铺法和实际面积确认后，报价会更准确。');
    if(ids.has('ctaBody') || seed%2===1) lines.push('有面积、规格或铺法需求，可以直接按实际情况对比。');
    return unique(lines).join('\n');
  }

  function buildTags(pool,words){
    const f=pool.f, out=[];
    const rawTopic=String(f.topic||f.raw||'').replace(/\s+/g,'').trim();
    if(rawTopic) out.push(rawTopic);
    if(rawTopic&&!rawTopic.includes('地板')) out.push(rawTopic+'地板');
    out.push('木地板');
    safeWinnerWords(pool,words).forEach(w=>{if(!FACT_RISK.has(w)||hasFact(w,f))out.push(w)});
    const list=unique(out).slice(0,7);
    return site==='小红书'?list.map(x=>'#'+x).join(' '):list.join(' / ');
  }

  function applied(features,pool){
    const f=pool.f, use=[],skip=[];
    features.slice(0,6).forEach(x=>{
      if(x.id==='priceTitle'&&!f.price) skip.push('价格前置');
      else if(x.id==='specTitle'&&!f.specs) skip.push('规格前置');
      else if((x.id==='conditionTitle'||x.id==='dealTitle'||x.id==='stockTitle') && !(f.condition||[]).length) skip.push(x.label);
      else use.push(x.label);
    });
    return {use,skip};
  }

  function ensureUI(){
    if(document.getElementById('gWinnerCommon')) return;
    const bar=document.querySelector('.evidencebar');
    if(!bar) return;
    const node=document.createElement('div');
    node.className='qualitynote';
    node.style.marginTop='10px';
    node.innerHTML='<b>高价值内容共同点：</b><span id="gWinnerCommon">生成后显示。</span><br><b>本次采用：</b><span id="gWinnerApplied">—</span><br><b>未采用：</b><span id="gWinnerSkipped">—</span>';
    bar.after(node);
  }
  ensureUI();

  makeContent=function(){
    const raw=$('genKeyword').value.trim();
    if(!raw)return setStatus('请先输入你的商品关键词或真实参数。','bad');
    if(items.length<20)return setStatus('当前累计样本太少，先继续抓取再生成。','warn');

    const pool=buildPools(raw), features=featureSignals(pool), words=wordSignals(pool), commons=commonality(pool,features,words), conf=confidence(items.length,pool.direct.length,pool.interactive.length), pb=priceBand(pool.winners), img=topLabel(pool.winners,'imageType'), ap=applied(features,pool);
    const title=buildTitle(pool,features,words,genSeed), body=buildBody(pool,features,words,genSeed), tags=buildTags(pool,words);
    const basis=pool.interactive.length>=5?'互动 + 发布时间 + 页面排名':'页面排名 + 发布时间 + 标题结构';
    const supplement=pool.supplement.length;

    $('gConfidence').textContent='可信度 '+conf[0];
    $('gConfidence').className='confidence '+conf[1];
    $('gEvidence').textContent=`直接相关 ${pool.direct.length} 条；高价值组 ${pool.winners.length} 条；${supplement?`另用 ${supplement} 条同类样本只补结构。`:'本次无需补充类目样本。'}`;
    $('gRelated').textContent=`${pool.direct.length} 条直接相关`;
    $('gRelatedSub').textContent=`不是照抄某一篇，而是比较高价值组与普通组的共同差异。`;
    $('gTitlePlan').textContent=features[0]?.label||'产品词前置';
    $('gTitleSub').textContent=features.length?features.slice(0,2).map(x=>`${x.label}：高价值 ${pct(x.hr)} / 普通 ${pct(x.lr)}`).join('；'):'当前没有明显结构差异，建议继续积累样本。';
    $('gPricePlan').textContent=pb?`高价值相关样本 ¥${Math.round(pb.lo)}–¥${Math.round(pb.hi)}`:'相关价格不足';
    $('gPriceSub').textContent=pb?`中位约 ¥${Math.round(pb.mid)}；只用于竞争带判断，不替你虚构售价。`:'价格样本不足。';
    $('gBodyPlan').textContent=features.some(x=>x.id==='detailBody')?'信息密度高、分行写':'短句、信息前置';
    $('gBodySub').textContent=`正文中位约 ${Math.round(median(pool.winners.map(x=>String(x.text||'').length).filter(Boolean))||70)} 字。`;
    $('gImagePlan').textContent=img?.[0]||'商品真实实拍';
    $('gImageSub').textContent=img?`高价值组中出现 ${img[1]} 次。`:'主图信号不足。';
    $('gSignalPlan').textContent=basis;
    $('gSignalSub').textContent=`共同点必须在高价值组中更集中，才会进入生成逻辑。`;

    $('gWinnerCommon').textContent=commons.length?commons.map(x=>`${x.label}（${x.detail}）`).join('；'):'暂未找到显著共同点，继续抓取更有价值。';
    $('gWinnerApplied').textContent=ap.use.length?ap.use.join('、'):'产品词前置 + 标题长度结构';
    $('gWinnerSkipped').textContent=ap.skip.length?ap.skip.join('、')+'（你未提供对应真实信息）':'无';

    $('sourceList').innerHTML=pool.winners.slice(0,3).map(x=>`<a class="source-card" href="${esc(x.url||x.sourcePage||'#')}" target="_blank" rel="noopener"><div class="source-main"><b>${esc(x.title)}</b><span>排名 ${x.rank??'—'} · 互动 ${fmt(engagement(x))} · ${esc(x.ageText||'时间未知')}</span></div><span class="source-open">打开</span></a>`).join('')||'<div class="source-card"><div class="source-main"><b>相关样本不足</b><span>建议换更贴近商品的搜索词继续抓。</span></div></div>';

    $('genTitle').textContent=title;
    $('genBody').textContent=body;
    $('genTags').textContent=tags;
    lastGenerated=`标题：\n${title}\n\n正文：\n${body}\n\n标签/搜索词：\n${tags}`;
    setStatus(`已按高价值共同点重新生成：直接相关 ${pool.direct.length} 条。`,'oktxt');
  };

  const oldRender=render;
  render=function(){oldRender();ensureUI()};
})();