(() => {
  const FEATURE_DEFS = [
    {id:'productFront',label:'产品词前置',test:x=>/^(?:【[^】]+】\s*)?(?:全新|二手|特价|清仓\s*)?(?:实木|多层|三层|复合|强化|橡木|柚木|红檀香|龙凤檀|黑胡桃|白蜡木|菠萝格|木地板|地板)/.test(String(x.title||'').trim())},
    {id:'priceTitle',label:'标题直接带价格',test:x=>/[¥￥]\s*\d|\d+(?:\.\d+)?\s*元/.test(String(x.title||''))},
    {id:'specTitle',label:'标题写规格',test:x=>/\d{2,4}\s*[x×*]\s*\d{2,4}/i.test(String(x.title||''))},
    {id:'conditionTitle',label:'标题写状态',test:x=>/全新|二手|翻新|库存|尾货|清仓|特价|处理/.test(String(x.title||''))},
    {id:'sceneTitle',label:'标题带装修场景',test:x=>/家装|装修|客厅|卧室|地暖|工装|办公室/.test(String(x.title||''))},
    {id:'serviceTitle',label:'标题带服务信息',test:x=>/包邮|发货|自提|安装|定制|支持|配送/.test(String(x.title||''))},
    {id:'numberTitle',label:'标题有明确数字',test:x=>/\d/.test(String(x.title||''))},
    {id:'shortTitle',label:'标题更短更直接',test:x=>String(x.title||'').length<=26},
    {id:'ctaBody',label:'正文有明确沟通动作',test:x=>/私聊|咨询|沟通|联系|可以聊|可聊|需要.*问|想要.*问/.test(String(x.text||''))},
    {id:'detailBody',label:'正文信息密度高',test:x=>String(x.text||'').length>=120}
  ];
  const WORD_BANK = ['实木','多层','三层','复合','强化','橡木','柚木','红檀香','龙凤檀','黑胡桃','白蜡木','菠萝格','鱼骨','人字','工字','锁扣','平扣','全新','二手','翻新','现货','库存','尾货','清仓','特价','处理','包邮','发货','自提','安装','定制','家装','装修','客厅','卧室','地暖','工装','原木','耐磨','环保','E0','E1','工厂','厂家','批发','支持自提','全国发货','包安装'];
  const SAFE_GENERIC = new Set(['木地板','地板','家装','装修']);

  function rate(arr,fn){return arr.length?arr.filter(fn).length/arr.length:0}
  function pct(v){return Math.round(v*100)+'%'}
  function unique(arr){return [...new Set(arr.filter(Boolean))]}
  function rawTopic(f){let s=(f.text||f.raw||'').replace(/\b(?:全新|二手|现货|翻新|清仓|特价|处理|库存|尾货)\b/g,' ').replace(/\s+/g,' ').trim();return s||f.raw}
  function itemText(x){return String((x.title||'')+' '+(x.text||''))}

  function buildPools(raw){
    const base=relatedAnalysis(raw),direct=[...base.rel];
    const directKeys=new Set(direct.map(x=>x._key||x.url||x.title));
    const supplemental=[...items].filter(x=>!directKeys.has(x._key||x.url||x.title)).sort((a,b)=>valueScore(b)-valueScore(a)).slice(0,Math.max(0,24-direct.length));
    const patternPool=direct.length>=12?direct:[...direct,...supplemental];
    const ranked=[...patternPool].sort((a,b)=>valueScore(b)-valueScore(a));
    const topN=Math.max(3,Math.min(12,Math.ceil(ranked.length*.35)));
    const winners=ranked.slice(0,topN),others=ranked.slice(topN);
    return {...base,direct,patternPool,winners,others};
  }

  function mineFeatures(pool){
    const hi=pool.winners,lo=pool.others.length?pool.others:pool.patternPool;
    return FEATURE_DEFS.map(f=>{
      const hr=rate(hi,f.test),lr=rate(lo,f.test),hc=hi.filter(f.test).length,lc=lo.filter(f.test).length;
      const diff=hr-lr;
      const score=diff*1.8+hr*.75+(hc>=3?.15:0);
      return {...f,hr,lr,hc,lc,diff,score};
    }).filter(f=>f.hc>=2&&(f.hr>=.34||f.diff>=.14)).sort((a,b)=>b.score-a.score).slice(0,5);
  }

  function mineWords(pool,raw){
    const hi=pool.winners,lo=pool.others.length?pool.others:pool.patternPool;
    return WORD_BANK.map(w=>{
      const h=hi.filter(x=>itemText(x).includes(w)).length,l=lo.filter(x=>itemText(x).includes(w)).length;
      const hr=hi.length?h/hi.length:0,lr=lo.length?l/lo.length:0,diff=hr-lr;
      return {w,h,l,hr,lr,diff,score:diff*2+hr};
    }).filter(o=>o.h>=2&&o.hr>=.25).sort((a,b)=>b.score-a.score).slice(0,8);
  }

  function titleMedian(arr){const vals=arr.map(x=>String(x.title||'').length).filter(Boolean);return Math.round(median(vals)||18)}
  function bodyMedian(arr){const vals=arr.map(x=>String(x.text||'').length).filter(Boolean);return Math.round(median(vals)||70)}
  function featureMap(features){return Object.fromEntries(features.map(x=>[x.id,x]))}

  function supportedTerm(term,f){
    const raw=String(f.raw||'');
    if(SAFE_GENERIC.has(term)) return true;
    return raw.includes(term);
  }

  function topicLabel(f){
    let t=rawTopic(f).trim();
    if(!/地板/.test(t)) t+=' 木地板';
    return t.replace(/\s+/g,' ').trim();
  }

  function buildTitle(pool,features,seed){
    const f=pool.f,topic=topicLabel(f),fm=featureMap(features),parts=[];
    const price=f.price?`¥${f.price}/㎡`:'';
    const spec=f.specs||'';
    const condition=(f.condition||[]).join(' ');
    const sceneWords=mineWords(pool,f.raw).map(x=>x.w).filter(w=>['家装','装修','客厅','卧室','地暖','工装'].includes(w));
    const safeScene=sceneWords.find(w=>supportedTerm(w,f));

    if(fm.productFront||!fm.priceTitle) parts.push(topic);
    if(fm.specTitle&&spec) parts.push(spec);
    if(fm.priceTitle&&price){ if(fm.productFront) parts.push(price); else parts.unshift(price) }
    if(fm.conditionTitle&&condition) parts.push(condition);
    if(fm.sceneTitle&&safeScene) parts.push(safeScene);
    if(!parts.length) parts.push(topic);
    if(!parts.includes(topic)) parts.unshift(topic);

    let title=parts.join(seed%2?'｜':' ');
    const target=Math.max(12,Math.min(42,titleMedian(pool.winners)));
    if(title.length<Math.min(16,target)&&seed%3===1) title=topic+'｜规格价格按实际需求确认';
    if(title.length>48) title=title.slice(0,48).replace(/[｜、，,\s]+$/,'');
    return title;
  }

  function dominantAngle(features){
    for(const f of features){
      if(['specTitle','priceTitle','sceneTitle','conditionTitle','serviceTitle','detailBody'].includes(f.id)) return f.id;
    }
    return 'productFront';
  }

  function buildBody(pool,features,seed){
    const f=pool.f,topic=topicLabel(f),angle=dominantAngle(features),target=bodyMedian(pool.winners),lines=[];
    const openers={
      specTitle:`${topic}，选的时候先把规格和实际用量看清楚。`,
      priceTitle:`${topic}，规格不同价格会有差异，先把需求确认清楚更好对比。`,
      sceneTitle:`${topic}，放到实际空间里看木种、结构和铺法会更直观。`,
      conditionTitle:`${topic}，商品状态、规格和数量直接说明，沟通会更高效。`,
      serviceTitle:`${topic}，规格、数量和铺装需求可以一起确认。`,
      detailBody:`${topic}，木种、结构、规格和铺装方式可以一起对比。`,
      productFront:`${topic}，先把核心商品信息说清楚。`
    };
    lines.push(openers[angle]||openers.productFront);
    if(f.specs) lines.push(`规格：${f.specs}。`);
    if(f.price) lines.push(`价格：${f.price}元/㎡。`);
    if(f.condition?.length) lines.push(`状态：${f.condition.join('、')}。`);
    if(angle==='specTitle'&&!f.specs) lines.push('具体规格可以按实际面积和铺装方式再确认。');
    if(angle==='priceTitle'&&!f.price) lines.push('具体价格按实际规格和数量确认。');
    if(target>=110||features.some(x=>x.id==='detailBody')) lines.push('如果已经确定面积和铺法，可以直接按实际需求核对规格和数量。');
    if(features.some(x=>x.id==='ctaBody')) lines.push(seed%2?'需要对比具体规格可以直接沟通。':'有明确面积或规格的话，可以直接按需求对比。');
    return unique(lines).join('\n');
  }

  function buildTags(pool){
    const f=pool.f,topic=rawTopic(f).replace(/\s+/g,'').trim(),parts=[];
    if(topic) parts.push(topic);
    if(topic&&!topic.includes('地板')) parts.push(topic+'地板');
    parts.push('木地板');
    (f.terms||[]).forEach(t=>{if(supportedTerm(t,f))parts.push(t)});
    const out=unique(parts).slice(0,6);
    return site==='小红书'?out.map(x=>'#'+x).join(' '):out.join(' / ');
  }

  function commonText(features){
    if(!features.length)return '当前高价值样本和普通样本之间还没有明显共同差异，继续抓取会更有意义。';
    return features.slice(0,4).map(f=>`${f.label} ${pct(f.hr)}（普通样本 ${pct(f.lr)}）`).join('；');
  }

  function appliedText(features,pool){
    const f=pool.f,used=[],miss=[];
    features.slice(0,4).forEach(x=>{
      if(x.id==='priceTitle'&&!f.price) miss.push('价格');
      else if(x.id==='specTitle'&&!f.specs) miss.push('规格');
      else if(x.id==='conditionTitle'&&!(f.condition||[]).length) miss.push('状态');
      else used.push(x.label);
    });
    let s=used.length?`已采用：${used.join('、')}`:'已采用：产品词与标题长度结构';
    if(miss.length)s+=`；未采用 ${miss.join('、')} 共性，因为你没有提供真实${miss.join('/')}。`;
    return s;
  }

  function sourceSupport(x,features){
    const hit=features.filter(f=>f.test(x)).slice(0,3).map(f=>f.label);
    return hit.length?hit.join(' / '):'高综合价值样本';
  }

  function ensureCommonalityUI(){
    if(document.getElementById('gCommonality'))return;
    const bar=document.querySelector('.evidencebar');
    if(!bar)return;
    const box=document.createElement('div');
    box.className='qualitynote';
    box.style.marginTop='10px';
    box.innerHTML='<b>高价值样本共同点：</b><span id="gCommonality">生成后显示高价值样本相对普通样本更常出现的结构。</span><br><b>本次实际采用：</b><span id="gApplied">—</span><br><b>候选高频词：</b><span id="gCandidateWords">—</span>';
    bar.after(box);
  }

  ensureCommonalityUI();

  makeContent = function(){
    const raw=$('genKeyword').value.trim();
    if(!raw)return setStatus('请先输入你的商品关键词或真实参数。','bad');
    if(items.length<20)return setStatus('当前累计样本太少，先继续抓取再生成。','warn');

    const pool=buildPools(raw),features=mineFeatures(pool),wordSignals=mineWords(pool,raw),conf=confidence(items.length,pool.direct.length,pool.interactive.length),pb=priceBand(pool.winners),img=topLabel(pool.winners,'imageType');
    const title=buildTitle(pool,features,genSeed),body=buildBody(pool,features,genSeed),tags=buildTags(pool);
    const basis=pool.interactive.length>=5?'互动 + 时效 + 页面排名':'页面排名 + 时效 + 标题结构';
    const supplemental=Math.max(0,pool.patternPool.length-pool.direct.length);

    $('gConfidence').textContent='可信度 '+conf[0];
    $('gConfidence').className='confidence '+conf[1];
    $('gEvidence').textContent=`直接相关 ${pool.direct.length} 条${supplemental?` + ${supplemental} 条类目结构补充`:''}；高价值组 ${pool.winners.length} 条。`;
    $('gRelated').textContent=`${pool.direct.length} 条直接相关`;
    $('gRelatedSub').textContent=supplemental?`相关样本不足时，仅用 ${supplemental} 条同类前排内容补充“结构”，不会拿它们的商品词写进你的文案。`:'本次结构与词频都来自直接相关样本。';
    $('gTitlePlan').textContent=features[0]?.label||'产品词前置';
    $('gTitleSub').textContent=`高价值组标题中位约 ${titleMedian(pool.winners)} 字；${commonText(features.slice(0,2))}`;
    $('gPricePlan').textContent=pb?`高价值组 ¥${Math.round(pb.lo)}–¥${Math.round(pb.hi)}`:'相关价格不足';
    $('gPriceSub').textContent=pb?`中位约 ¥${Math.round(pb.mid)}；只有你输入真实价格时才会写入标题/正文。`:'不根据别人的价格替你虚构售价。';
    $('gBodyPlan').textContent=bodyMedian(pool.winners)<100?'短正文、信息前置':bodyMedian(pool.winners)<220?'中等正文、分行说明':'详细正文、信息分组';
    $('gBodySub').textContent=`高价值组正文中位约 ${bodyMedian(pool.winners)} 字；生成会跟随其信息密度，而不是固定两句模板。`;
    $('gImagePlan').textContent=img?.[0]||'商品真实实拍';
    $('gImageSub').textContent=img?`高价值组该方向出现 ${img[1]} 次。`:'主图识别不足，暂不强判断。';
    $('gSignalPlan').textContent=basis;
    $('gSignalSub').textContent=`共同点是“高价值组相对普通组更常出现”的特征，不把单篇偶然写法当规律。`;

    $('gCommonality').textContent=commonText(features);
    $('gApplied').textContent=appliedText(features,pool);
    $('gCandidateWords').textContent=wordSignals.length?wordSignals.slice(0,6).map(x=>`${x.w} ${pct(x.hr)}`).join(' / ')+'（只作候选，未确认适用不会自动写进正文）':'暂无明显候选词';

    $('sourceList').innerHTML=pool.winners.slice(0,3).map(x=>`<a class="source-card" href="${esc(x.url||x.sourcePage||'#')}" target="_blank" rel="noopener"><div class="source-main"><b>${esc(x.title)}</b><span>支持共性：${esc(sourceSupport(x,features))} · 排名 ${x.rank??'—'} · 互动 ${fmt(engagement(x))}</span></div><span class="source-open">打开</span></a>`).join('')||'<div class="source-card"><div class="source-main"><b>没有足够相关样本</b><span>建议换更贴近商品的搜索词继续抓。</span></div></div>';

    $('genTitle').textContent=title;
    $('genBody').textContent=body;
    $('genTags').textContent=tags;
    lastGenerated=`标题：\n${title}\n\n正文：\n${body}\n\n标签/搜索词：\n${tags}`;
    setStatus(`已先找高价值共同点，再按共同点生成；直接相关 ${pool.direct.length} 条。`,'oktxt');
  };

  const oldRender=render;
  render=function(){oldRender();ensureCommonalityUI()};
})();