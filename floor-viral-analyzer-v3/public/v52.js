(() => {
  const V='5.2';
  const q=id=>document.getElementById(id);
  const escv=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const uniq=a=>[...new Set((a||[]).filter(Boolean))];
  const rate=(a,fn)=>a.length?a.filter(fn).length/a.length:0;
  const pct=v=>Math.round((v||0)*100)+'%';
  const textOf=x=>String((x?.title||'')+' '+(x?.text||''));
  const num=s=>{const m=String(s||'').replace(/,/g,'').match(/([\d.]+)\s*(万|w|W|k|K|千)?/i);if(!m)return 0;let v=+m[1],u=m[2]||'';if(/万|w/i.test(u))v*=10000;if(/k|千/i.test(u))v*=1000;return Math.round(v)};
  const viewsOf=x=>{if(Number.isFinite(Number(x?.views)))return Number(x.views);const t=textOf(x),m=t.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:次)?(?:浏览|浏览量|曝光)/i)||t.match(/(?:浏览|浏览量|曝光)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i);return m?num(m[1]):0};

  const TITLE_FEATURES=[
    ['materialFront','材质/品类前置',x=>/^(?:【[^】]+】\s*)?(?:全新|二手|特价|清仓|处理\s*)?(?:实木|多层|三层|复合|强化|橡木|柚木|红檀香|龙凤檀|黑胡桃|白蜡木|菠萝格|木地板|地板)/.test(String(x.title||'').trim())],
    ['priceTitle','标题直接写价格',x=>/[¥￥]\s*\d|\d+(?:\.\d+)?\s*元/.test(String(x.title||''))],
    ['specTitle','标题直接写规格',x=>/\d{2,4}\s*[x×*]\s*\d{2,4}/i.test(String(x.title||''))],
    ['dealTitle','标题带价格刺激',x=>/样板价|特价|清仓|低价|处理|甩卖|优惠/.test(String(x.title||''))],
    ['serviceTitle','标题带履约卖点',x=>/现货|库存|发货|物流|自提|包邮|安装|寄样|看货/.test(String(x.title||''))],
    ['shortTitle','标题短而直接',x=>String(x.title||'').trim().length<=32]
  ].map(([id,label,test])=>({id,label,test}));

  const MODULES=[
    {id:'samplePrice',label:'样板/参考价引流',group:'click',re:/样板价|样板价格|标价.*样板|价格.*样板|参考价|粉丝.*优惠/},
    {id:'colors',label:'多颜色/木色可选',group:'click',re:/多种颜色|颜色可选|浅色|深色|原木色|木色|色板|颜色.*选/},
    {id:'styles',label:'平口/锁扣选择',group:'click',re:/平口|平扣|锁扣|两种款式|款式.*选/},
    {id:'stock',label:'现货/库存',group:'click',re:/现货|库存充足|库存|随时发|当天发|急单/},
    {id:'pickup',label:'自提/物流',group:'consult',re:/自提|同城自提|物流|全国发货|可发货|发物流|外地.*发/},
    {id:'sample',label:'寄样/看样',group:'consult',re:/寄样|可寄样|样板|样品|看样|看板/},
    {id:'onsite',label:'现场看货',group:'consult',re:/现场看货|现场看板|现场看|看货|来厂|到厂|实地看/},
    {id:'factory',label:'工厂/厂家直发',group:'trust',re:/工厂直发|厂家直发|工厂|厂家|仓库直发|源头工厂/},
    {id:'specs',label:'多规格/按需核量',group:'consult',re:/规格齐全|多规格|规格.*可选|尺寸.*可选|规格.*确认|按.*面积|按.*平方/},
    {id:'custom',label:'支持定制',group:'consult',re:/支持定制|可定制|定制|颜色定制|尺寸定制/},
    {id:'afterSale',label:'售后/退换保障',group:'trust',re:/包退|退货|售后|保障|描述不符|可退|退运费/},
    {id:'cta',label:'明确咨询动作',group:'consult',re:/欢迎咨询|直接沟通|直接咨询|私聊|联系看板|需要.*联系|聊一聊|直接.*问/}
  ];

  const KEYWORDS=['实木','多层','三层','复合','强化','橡木','柚木','红檀香','龙凤檀','黑胡桃','白蜡木','菠萝格','鱼骨','人字拼','锁扣','平扣','原木','家装','装修','工厂','厂家','现货','库存','样板','寄样','看货','自提','物流','发货','定制','地暖'];
  const FACT_WORDS=new Set(['实木','多层','三层','复合','强化','橡木','柚木','红檀香','龙凤檀','黑胡桃','白蜡木','菠萝格','鱼骨','人字拼','锁扣','平扣','工厂','厂家','现货','库存','寄样','自提','物流','定制','地暖']);

  function perf(x){
    const wants=Number(x.wants)||0,likes=Number(x.likes)||0,favs=Number(x.favs)||0,comments=Number(x.comments)||0,shares=Number(x.shares)||0,views=viewsOf(x);
    const intent=wants*9+comments*5+favs*3+likes*1.2+shares*3;
    const h=typeof ageHours==='function'?ageHours(x.ageText):null;
    const fresh=h==null?0:h<=2?7:h<=24?4:h<=72?2:0;
    const rank=x.rank?Math.max(0,30-Number(x.rank))*.16:0;
    const conversion=views>30?Math.min(12,(wants*2+comments+favs)/(views)*1000*.35):0;
    return Math.log1p(intent)*9+Math.log1p(views)*1.25+fresh+rank+conversion;
  }

  function parseFacts(raw){
    const r=String(raw||'').trim();
    const specs=(r.match(/\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/i)||[])[0]||'';
    const pm=r.match(/(?:¥|￥)?\s*(\d+(?:\.\d+)?)\s*元(?:\/㎡|每平方|一平|平)?/);
    const price=pm?pm[1]:'';
    const conditions=['全新','二手','翻新','尾货','清仓','现货'].filter(w=>r.includes(w));
    let topic=r.replace(/\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/ig,' ').replace(/(?:¥|￥)?\s*\d+(?:\.\d+)?\s*元(?:\/㎡|每平方|一平|平)?/ig,' ');
    conditions.forEach(w=>topic=topic.replaceAll(w,' '));
    topic=topic.replace(/\s+/g,' ').trim()||r;
    if(!/地板/.test(topic))topic+='地板';
    topic=topic.replace(/木地板地板/g,'木地板');
    return {raw:r,topic,specs,price,conditions};
  }

  function related(raw){
    let direct=[];
    try{const a=typeof relatedAnalysis==='function'?relatedAnalysis(raw):null;direct=a?.rel?.length?[...a.rel]:[]}catch{}
    if(!direct.length){const key=String(raw||'').replace(/\s+/g,'').slice(0,12);direct=[...items].filter(x=>textOf(x).replace(/\s+/g,'').includes(key))}
    if(!direct.length)direct=[...items];
    const keys=new Set(direct.map(x=>x._key||x.url||x.title));
    const supplement=[...items].filter(x=>!keys.has(x._key||x.url||x.title)).sort((a,b)=>perf(b)-perf(a)).slice(0,Math.max(0,60-direct.length));
    const pool=direct.length>=25?direct:[...direct,...supplement];
    const ranked=[...pool].sort((a,b)=>perf(b)-perf(a));
    const n=Math.max(10,Math.min(30,Math.ceil(ranked.length*.30)));
    return {direct,supplement,pool,winners:ranked.slice(0,n),ordinary:ranked.slice(n)};
  }

  function signal(def,winners,ordinary){
    const lo=ordinary.length?ordinary:winners;
    const test=x=>def.test?def.test(x):def.re.test(textOf(x));
    const hr=rate(winners,test),lr=rate(lo,test),hc=winners.filter(test).length,lift=hr-lr;
    return {...def,hr,lr,hc,lift,strength:lift*2.2+hr+(hc>=4?.18:0)};
  }

  function analyze(raw){
    const facts=parseFacts(raw),p=related(raw),ordinary=p.ordinary.length?p.ordinary:p.pool;
    const title=TITLE_FEATURES.map(d=>signal(d,p.winners,ordinary)).filter(s=>s.hc>=2&&(s.hr>=.30||s.lift>=.10)).sort((a,b)=>b.strength-a.strength);
    const modules=MODULES.map(d=>signal(d,p.winners,ordinary)).filter(s=>s.hc>=2&&(s.hr>=.24||s.lift>=.08)).sort((a,b)=>b.strength-a.strength);
    const words=KEYWORDS.map(w=>{const hr=rate(p.winners,x=>textOf(x).includes(w)),lr=rate(ordinary,x=>textOf(x).includes(w)),hc=p.winners.filter(x=>textOf(x).includes(w)).length;return {w,hr,lr,hc,lift:hr-lr,strength:(hr-lr)*2+hr}}).filter(x=>x.hc>=2&&x.hr>=.20).sort((a,b)=>b.strength-a.strength);
    const tl=p.winners.map(x=>String(x.title||'').length).filter(Boolean),bl=p.winners.map(x=>String(x.text||'').length).filter(Boolean);
    const med=a=>typeof median==='function'?median(a):(a.sort((x,y)=>x-y)[Math.floor(a.length/2)]||0);
    const price=p.winners.filter(x=>Number.isFinite(Number(x.price))&&Number(x.price)>0).map(x=>Number(x.price));
    const viewN=p.direct.filter(x=>viewsOf(x)>0).length,interN=p.direct.filter(x=>(Number(x.wants)||0)+(Number(x.likes)||0)+(Number(x.favs)||0)+(Number(x.comments)||0)>0).length;
    return {...p,facts,title,modules,words,titleMed:Math.round(med(tl)||24),bodyMed:Math.round(med(bl)||140),priceMed:price.length?med(price):null,viewN,interN};
  }

  let current=null,selected=new Set(),seed=0;
  const module=id=>MODULES.find(x=>x.id===id);
  const active=()=>[...selected].map(module).filter(Boolean);

  function ensureStyle(){
    if(q('v52style'))return;const s=document.createElement('style');s.id='v52style';s.textContent=`
    .v52box{margin-top:10px;border:1px solid var(--line);border-radius:13px;background:#fff;padding:11px}.v52head{font-size:12px;font-weight:900;margin-bottom:8px}.v52grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.v52cell{background:#f7f7f3;border-radius:10px;padding:9px}.v52cell b{display:block;font-size:10px;color:var(--muted);margin-bottom:4px}.v52cell span{font-size:11px;line-height:1.5}.v52chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.v52chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:800;cursor:pointer}.v52chip.on{background:#111;color:#fff;border-color:#111}.v52summary{margin-top:9px;padding:9px 10px;border-radius:10px;background:#f2f5ef;font-size:11px;line-height:1.6}.v52hint{font-size:10px;color:var(--muted);margin-top:5px}@media(max-width:700px){.v52grid{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  function ensureUI(){
    ensureStyle();
    if(!q('v52Analysis')){const bar=document.querySelector('.evidencebar');if(bar){const d=document.createElement('div');d.id='v52Analysis';d.className='v52box';d.innerHTML=`<div class="v52head">这次真正从高价值数据里学到什么</div><div class="v52grid"><div class="v52cell"><b>吸引点击</b><span id="v52Click">生成后显示</span></div><div class="v52cell"><b>提高咨询</b><span id="v52Consult">生成后显示</span></div><div class="v52cell"><b>标题结构</b><span id="v52Title">—</span></div><div class="v52cell"><b>数据依据</b><span id="v52Data">—</span></div></div><div class="v52summary"><b>本次会直接写进发布文案的高价值共性：</b><span id="v52Modules">—</span><div id="v52Chips" class="v52chips"></div><div class="v52hint">黑色模块会直接进入文案；点一下可关闭不符合你实际商品的能力，再点“换一个版本”。</div></div>`;bar.after(d)}}
    if(!q('v52Bottom')){const a=document.querySelector('.output-actions');if(a){const d=document.createElement('div');d.id='v52Bottom';d.className='v52summary';d.innerHTML='<b>本次爆款共性小结：</b><span id="v52Summary">生成后显示。</span>';a.after(d)}}
  }

  function defaultSelect(a){
    selected.clear();
    a.modules.filter(m=>m.hr>=.30||m.lift>=.12).slice(0,8).forEach(m=>selected.add(m.id));
    if(!selected.size)a.modules.slice(0,5).forEach(m=>selected.add(m.id));
  }

  function renderAnalysis(a){
    ensureUI();
    const click=a.modules.filter(m=>m.group==='click').slice(0,4),consult=a.modules.filter(m=>m.group==='consult'||m.group==='trust').slice(0,5);
    q('v52Click').textContent=click.length?click.map(x=>`${x.label} ${pct(x.hr)}`).join(' / '):'当前点击共性不够集中';
    q('v52Consult').textContent=consult.length?consult.map(x=>`${x.label} ${pct(x.hr)}`).join(' / '):'当前咨询共性不够集中';
    q('v52Title').textContent=a.title.length?a.title.slice(0,4).map(x=>`${x.label}：高价值 ${pct(x.hr)} / 普通 ${pct(x.lr)}`).join('；'):`标题中位约 ${a.titleMed} 字`;
    q('v52Data').textContent=`相关 ${a.direct.length} 条；高价值组 ${a.winners.length} 条；有互动 ${a.interN} 条；有浏览 ${a.viewN} 条`;
    q('v52Modules').textContent=a.modules.slice(0,8).map(x=>`${x.label} ${pct(x.hr)}`).join('；')||'暂无明显共性';
    q('v52Chips').innerHTML=a.modules.slice(0,10).map(m=>`<button type="button" class="v52chip ${selected.has(m.id)?'on':''}" data-v52="${escv(m.id)}">${escv(m.label)} ${pct(m.hr)}</button>`).join('');
    document.querySelectorAll('[data-v52]').forEach(b=>b.onclick=()=>{const id=b.dataset.v52;selected.has(id)?selected.delete(id):selected.add(id);b.classList.toggle('on',selected.has(id));composeAndShow(a,++seed)});
  }

  function moduleLine(id,a){
    const f=a.facts;
    const lines={
      samplePrice:'页面标价为样板参考价，具体大货价格按规格和数量核算。',
      colors:'有浅色、深色、原木色等木色方向可以对比，木纹和颜色以实物/样板为准。',
      styles:'平口、锁扣等铺装款式可以按实际铺装需求选择。',
      stock:'现货和具体库存以当天为准，工期着急可以先确认规格和数量。',
      pickup:'同城可以自提，外地可以发物流，运费按实际地址和数量核算。',
      sample:'拿不准颜色、木纹或板面效果，可以先看样板/寄样再决定。',
      onsite:'方便的话可以现场看货，看实物颜色、木纹和板面会更直观。',
      factory:'工厂/厂家货源，规格和批量需求可以直接按实际情况沟通。',
      specs:f.specs?`目前你要看的规格是 ${f.specs}，其他规格和实际用量可以按面积、铺法一起核。`:'规格比较多，实际用量可以按面积和铺装方式一起核算。',
      custom:'有特殊颜色、尺寸或铺装要求，可以提前说明需求再确认。',
      afterSale:'下单前把颜色、规格、数量和运输方式确认清楚，售后规则也可以提前问明白。',
      cta:'有面积、规格、铺法或者想看的颜色，直接把需求发过来，方便快速对比。'
    };
    return lines[id]||'';
  }

  function titleFor(a,n){
    const f=a.facts,mods=new Set(selected),parts=[f.topic];
    if(mods.has('styles'))parts.push('平口/锁扣可选');
    else if(mods.has('colors'))parts.push('多种木色可选');
    else if(mods.has('factory'))parts.push('工厂直发');
    if(f.specs)parts.push(f.specs);
    if(f.price)parts.push(`${f.price}元/㎡`);
    else if(mods.has('samplePrice'))parts.push('样板价可看样');
    if(mods.has('stock')&&parts.length<4)parts.push('现货');
    const variants=[parts.join(' '),[f.topic,mods.has('colors')?'多色可选':'',mods.has('sample')?'可寄样':'',mods.has('pickup')?'支持自提/物流':''].filter(Boolean).join(' '),[f.topic,mods.has('factory')?'厂家货源':'',mods.has('styles')?'平口/锁扣':'',f.specs||''].filter(Boolean).join(' ')];
    let out=uniq(variants)[n%uniq(variants).length]||f.topic;
    const max=Math.max(28,Math.min(52,a.titleMed+12));
    if(out.length>max)out=out.slice(0,max).replace(/[｜、，,\s]+$/,'');
    return out;
  }

  function bodyFor(a,n){
    const f=a.facts,mods=active(),ids=new Set(mods.map(x=>x.id)),p=[];
    if(ids.has('samplePrice'))p.push(`${f.topic}，页面标价按样板参考价展示，想先看颜色、木纹和板面效果可以先看样；大货按具体规格和数量核价。`);
    else if(ids.has('colors'))p.push(`${f.topic}，木色和木纹可以按家里的整体风格来选，浅色、深色、原木色等方向都可以先看实物再定。`);
    else if(ids.has('styles'))p.push(`${f.topic}，平口、锁扣等铺装方式可以按现场条件来选，规格和数量一起确认会更省事。`);
    else p.push(`${f.topic}，木色、规格和铺装方式都可以按实际需求来选，想看哪种效果可以直接发需求。`);

    if(f.specs||f.price||f.conditions.length){const x=[];if(f.specs)x.push(`规格 ${f.specs}`);if(f.price)x.push(`价格 ${f.price}元/㎡`);if(f.conditions.length)x.push(f.conditions.join('、'));p.push(x.join('；')+'。')}

    const order=['colors','styles','specs','stock','pickup','sample','onsite','factory','custom','afterSale'];
    const added=new Set();
    order.forEach(id=>{if(ids.has(id)){const line=moduleLine(id,a);if(line&&!p.some(z=>z.includes(line.slice(0,10)))){p.push(line);added.add(id)}}});
    if(ids.has('cta')||p.length<4)p.push(moduleLine('cta',a));

    const target=a.bodyMed>=180?6:a.bodyMed>=110?5:4;
    let out=p.filter(Boolean).slice(0,Math.max(4,target));
    if(n%3===1&&out.length>4){const first=out.shift();out=[first,...out.slice(1),out[0]].filter(Boolean)}
    return uniq(out).join('\n\n');
  }

  function tagsFor(a){
    const f=a.facts,out=[f.topic.replace(/\s+/g,''),'木地板'];
    const ids=new Set(selected);
    a.words.slice(0,10).forEach(x=>{
      if(!FACT_WORDS.has(x.w)||f.raw.includes(x.w))out.push(x.w);
      else if((x.w==='工厂'||x.w==='厂家')&&ids.has('factory'))out.push(x.w);
      else if((x.w==='现货'||x.w==='库存')&&ids.has('stock'))out.push(x.w);
      else if(x.w==='寄样'&&ids.has('sample'))out.push(x.w);
      else if((x.w==='自提'||x.w==='物流')&&ids.has('pickup'))out.push(x.w);
      else if(x.w==='定制'&&ids.has('custom'))out.push(x.w);
    });
    if(ids.has('styles'))out.push('锁扣','平扣');
    if(ids.has('sample'))out.push('地板样板');
    const list=uniq(out).slice(0,9);
    return site==='小红书'?list.map(x=>'#'+x).join(' '):list.join(' / ');
  }

  function summary(a){
    const click=a.modules.filter(x=>x.group==='click').slice(0,3).map(x=>x.label),consult=a.modules.filter(x=>x.group!=='click').slice(0,4).map(x=>x.label);
    return `高价值样本更集中在${click.length?click.join('、'):'直接写商品核心信息'}；咨询转化共性主要是${consult.length?consult.join('、'):'规格/价格/履约信息完整'}。本次文案已把这些共性直接写成买家能看到的商品信息，而不是分析提示。`;
  }

  function composeAndShow(a,n){
    const title=titleFor(a,n),body=bodyFor(a,n),tags=tagsFor(a),sum=summary(a);
    q('genTitle').textContent=title;q('genBody').textContent=body;q('genTags').textContent=tags;if(q('v52Summary'))q('v52Summary').textContent=sum;
    lastGenerated=`【标题】\n${title}\n\n【正文】\n${body}\n\n【标签 / 搜索词】\n${tags}`;
  }

  ensureUI();
  makeContent=function(){
    const raw=q('genKeyword').value.trim();
    if(!raw)return setStatus('请先输入商品关键词，例如“柚木”或“橡木多层”。','bad');
    if(items.length<20)return setStatus('当前样本太少，建议先抓到至少30条；50条以上再做爆款共性会更稳。','warn');
    current=analyze(raw);seed=0;defaultSelect(current);renderAnalysis(current);composeAndShow(current,seed);
    const level=current.direct.length>=30&&(current.interN>=10||current.viewN>=10)?'高':current.direct.length>=15?'中':'低';
    q('gConfidence').textContent='可信度 '+level;q('gConfidence').className='confidence '+(level==='高'?'good':level==='中'?'base':'low');
    q('gEvidence').textContent=`相关 ${current.direct.length} 条 · 高价值 ${current.winners.length} 条 · 有互动 ${current.interN} 条 · 有浏览 ${current.viewN} 条`;
    q('gRelated').textContent=`${current.direct.length} 条相关样本`;q('gRelatedSub').textContent='高价值排序优先看想要/评论/收藏/点赞，其次结合浏览、发布时间和页面排名。';
    q('gTitlePlan').textContent=current.title[0]?.label||'商品核心词前置';q('gTitleSub').textContent=current.title.slice(0,2).map(x=>`${x.label} ${pct(x.hr)} vs 普通 ${pct(x.lr)}`).join('；')||`高价值标题中位约 ${current.titleMed} 字`;
    const sp=current.modules.find(x=>x.id==='samplePrice');q('gPricePlan').textContent=sp?'样板/参考价引流':(current.priceMed?`高价值价格中位约 ¥${Math.round(current.priceMed)}`:'暂无稳定价格玩法');q('gPriceSub').textContent=sp?`该玩法在高价值组出现 ${pct(sp.hr)}。`:'价格只作为辅助信号。';
    q('gBodyPlan').textContent=`完整分段正文，约 ${current.bodyMed} 字`;q('gBodySub').textContent='不是提示词：卖点、价格、履约、信任和咨询动作会直接写进正文。';
    q('gImagePlan').textContent=(typeof topLabel==='function'?topLabel(current.winners,'imageType')?.[0]:null)||'商品实拍';q('gImageSub').textContent='主图只给方向，不会混进可复制正文。';
    q('gSignalPlan').textContent=current.interN>=5?'想要/评论/收藏/点赞优先':'浏览/排名/时效辅助';q('gSignalSub').textContent='有浏览量时会同时参考浏览与互动转化，不只看单一总量。';
    q('sourceList').innerHTML=current.winners.slice(0,3).map(x=>`<a class="source-card" href="${escv(x.url||x.sourcePage||'#')}" target="_blank" rel="noopener"><div class="source-main"><b>${escv(x.title)}</b><span>浏览 ${viewsOf(x)||'—'} · 想要 ${x.wants??0} · 点赞 ${x.likes??0} · 收藏 ${x.favs??0} · 评论 ${x.comments??0}</span></div><span class="source-open">打开</span></a>`).join('');
    setStatus(`已根据最近抓取的高价值数据生成一篇可直接发布内容。`,'oktxt');
  };

  q('regen').onclick=()=>{if(!current)return makeContent();seed++;renderAnalysis(current);composeAndShow(current,seed);setStatus('已按同一批高价值共性换一个可直接发布版本。','oktxt')};

  const oldRender=render;render=function(){oldRender();ensureUI()};
})();