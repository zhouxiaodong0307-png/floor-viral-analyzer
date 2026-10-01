(() => {
  const V='5.1';
  const esc2=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const uniq=a=>[...new Set((a||[]).filter(Boolean))];
  const rate=(a,fn)=>a.length?a.filter(fn).length/a.length:0;
  const pct=v=>Math.round((v||0)*100)+'%';
  const txt=x=>String((x?.title||'')+' '+(x?.text||''));

  const TITLE_FEATURES=[
    ['materialCategory','材质 + 地板品类前置',x=>/^(?:【[^】]+】\s*)?(?:全新|二手|特价|清仓|处理\s*)?(?:实木|多层|三层|复合|强化|橡木|柚木|红檀香|龙凤檀|黑胡桃|白蜡木|菠萝格|木地板|地板)/.test(String(x.title||'').trim())],
    ['priceInTitle','标题直接出现价格',x=>/[¥￥]\s*\d|\d+(?:\.\d+)?\s*元/.test(String(x.title||''))],
    ['specInTitle','标题直接出现规格',x=>/\d{2,4}\s*[x×*]\s*\d{2,4}/i.test(String(x.title||''))],
    ['conditionInTitle','标题写全新/二手/尾货',x=>/全新|二手|翻新|尾货|清仓|处理/.test(String(x.title||''))],
    ['dealInTitle','标题带低价刺激词',x=>/特价|清仓|低价|处理|甩卖|优惠|样板价/.test(String(x.title||''))],
    ['serviceInTitle','标题带现货/发货/自提',x=>/现货|库存|发货|自提|物流|包邮|安装|寄样|看货/.test(String(x.title||''))],
    ['shortTitle','标题短而直接',x=>String(x.title||'').trim().length<=30]
  ].map(([id,label,test])=>({id,label,test}));

  const MODULES=[
    {id:'samplePrice',label:'样板低价引流',group:'price',re:/样板价|样板价格|标价.*样板|价格.*样板|粉丝.*优惠|低价引流|参考价/,
      line:(t)=>`页面标价按样板/参考价展示，实际按规格和数量核价，先把需求确认清楚更好对比。`},
    {id:'colors',label:'多颜色/木色可选',group:'sell',re:/多种颜色|颜色可选|浅色|深色|原木色|木色|色板|颜色.*选/,
      line:(t)=>`颜色和木纹建议先看实物再定，浅色、深色、原木方向都可以按实际空间去对比。`},
    {id:'styles',label:'平口/锁扣可选',group:'sell',re:/平口|平扣|锁扣|两种款式|款式.*选/,
      line:(t)=>`平口 / 锁扣、具体规格和数量可以一起确认，按铺装方式选会更省事。`},
    {id:'stock',label:'现货/库存充足',group:'sell',re:/现货|库存充足|库存|随时发|当天发|急单/,
      line:(t)=>`现货和具体库存按当天情况确认，急用的话可以先问清楚交期再定。`},
    {id:'pickupLogistics',label:'自提 + 外地物流',group:'convert',re:/自提|同城自提|外地.*物流|物流|全国发货|可发货|发物流/,
      line:(t)=>`同城自提、外地物流的方式和费用可以下单前一起确认，数量多也可以按实际地址核算。`},
    {id:'sample',label:'支持寄样/看样',group:'trust',re:/寄样|可寄样|寄.*样|样板|样品|看样|看板/,
      line:(t)=>`对颜色、木纹或结构拿不准，可以先看样板再决定，大货前把细节确认清楚。`},
    {id:'onsite',label:'支持现场看货',group:'trust',re:/现场看货|现场看板|现场看|看货|来厂|到厂|实地看/,
      line:(t)=>`方便到现场的话，直接看实物颜色、木纹和板面会比只看图片更直观。`},
    {id:'factory',label:'工厂/厂家直发',group:'trust',re:/工厂直发|厂家直发|工厂|厂家|仓库直发|源头工厂/,
      line:(t)=>`更在意货源、规格或批量的话，可以直接把需求说清楚，按实际库存和生产情况确认。`},
    {id:'specs',label:'规格齐全/按需确认',group:'sell',re:/规格齐全|多规格|规格.*可选|尺寸.*可选|规格.*确认/,
      line:(t,f)=>f.specs?`规格：${f.specs}。其他尺寸和实际用量可以按面积、铺法一起确认。`:`规格和数量建议按实际面积、铺法一起确认，避免后面补货或数量不合适。`},
    {id:'custom',label:'支持定制',group:'convert',re:/支持定制|可定制|定制|颜色定制|尺寸定制/,
      line:(t)=>`有特殊颜色、尺寸或铺法要求，可以把需求提前说清楚，再确认能不能做。`},
    {id:'afterSale',label:'售后/退换保障',group:'trust',re:/包退|退货|售后|保障|描述不符|可退|退运费/,
      line:(t)=>`颜色、规格、数量和运输方式下单前尽量确认清楚，售后规则也可以提前问明白，减少后续来回。`},
    {id:'cta',label:'明确咨询动作',group:'convert',re:/欢迎咨询|可以联系|直接沟通|直接咨询|私聊|联系看板|需要.*联系|想要.*聊|聊一聊/,
      line:(t)=>`有明确面积、规格、铺法或想看的颜色，直接把需求发过来，更方便快速对比。`}
  ];

  const PAINS=[
    ['色差担心',/色差|颜色.*不准|看实物|看板|木纹/],
    ['规格/数量不好算',/规格|数量|面积|用量|平方|尺寸/],
    ['怕买贵/不好比价',/价格|标价|样板价|优惠|特价|对比/],
    ['运输/自提不方便',/物流|自提|发货|运费|配送/],
    ['担心货不对板',/现场看货|看样|寄样|实拍|实物|描述不符/]
  ];

  const SEARCH_WORDS=['实木','实木地板','多层','多层实木','三层实木','橡木','柚木','红檀香','龙凤檀','黑胡桃','白蜡木','菠萝格','鱼骨','人字拼','锁扣','平扣','原木','家装','装修','工厂','厂家','现货','库存','样板','寄样','看货','自提','物流','发货','定制','地暖'];

  function scoreItem(x){
    const h=typeof ageHours==='function'?ageHours(x.ageText):null;
    const inter=(x.wants||0)*4+(x.comments||0)*2.5+(x.favs||0)*2+(x.likes||0)+(x.shares||0)*2.5;
    const fresh=h==null?0:h<=2?5:h<=24?3:h<=72?1:0;
    const rank=x.rank?Math.max(0,30-x.rank)*.18:0;
    return Math.log1p(inter)*8+fresh+rank+(x.price!=null?0.8:0)+(x.ageText?0.5:0);
  }

  function parseFacts(raw){
    const base=typeof parseInput==='function'?parseInput(raw):{};
    const r=String(raw||'').trim();
    const specs=base.specs||(r.match(/\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/i)||[])[0]||'';
    const pm=r.match(/(?:¥|￥)?\s*(\d+(?:\.\d+)?)\s*元(?:\/㎡|每平方|一平|平)?/);
    const price=base.price||(pm?pm[1]:'');
    const conditions=uniq((base.condition||[]).concat(['全新','二手','翻新','尾货','清仓','现货'].filter(w=>r.includes(w))));
    let topic=r.replace(/\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/ig,' ').replace(/(?:¥|￥)?\s*\d+(?:\.\d+)?\s*元(?:\/㎡|每平方|一平|平)?/ig,' ');
    conditions.forEach(w=>topic=topic.replaceAll(w,' '));
    topic=topic.replace(/\s+/g,' ').trim()||r;
    if(!/地板/.test(topic))topic+=' 木地板';
    return {raw:r,topic,specs,price,conditions};
  }

  function relatedPool(raw){
    const base=typeof relatedAnalysis==='function'?relatedAnalysis(raw):null;
    const direct=base?.rel?.length?[...base.rel]:[...items];
    const directKeys=new Set(direct.map(x=>x._key||x.url||x.title));
    const supplement=[...items].filter(x=>!directKeys.has(x._key||x.url||x.title)).sort((a,b)=>scoreItem(b)-scoreItem(a)).slice(0,Math.max(0,50-direct.length));
    const pool=direct.length>=20?direct:[...direct,...supplement];
    const ranked=[...pool].sort((a,b)=>scoreItem(b)-scoreItem(a));
    const winN=Math.max(8,Math.min(25,Math.ceil(ranked.length*.30)));
    const winners=ranked.slice(0,winN), ordinary=ranked.slice(winN);
    return {direct,supplement,pool,winners,ordinary};
  }

  function signal(def,winners,ordinary){
    const hr=rate(winners,x=>def.test?def.test(x):def.re.test(txt(x))), lr=rate(ordinary.length?ordinary:winners,x=>def.test?def.test(x):def.re.test(txt(x)));
    const hc=winners.filter(x=>def.test?def.test(x):def.re.test(txt(x))).length;
    const lift=hr-lr;
    return {...def,hr,lr,hc,lift,strength:lift*2+hr+(hc>=4?.15:0)};
  }

  function analyzeCommon(raw){
    const facts=parseFacts(raw), p=relatedPool(raw), ordinary=p.ordinary.length?p.ordinary:p.pool;
    const title=TITLE_FEATURES.map(d=>signal(d,p.winners,ordinary)).filter(s=>s.hc>=2&&(s.hr>=.32||s.lift>=.12)).sort((a,b)=>b.strength-a.strength);
    const modules=MODULES.map(d=>signal(d,p.winners,ordinary)).filter(s=>s.hc>=2&&(s.hr>=.28||s.lift>=.10)).sort((a,b)=>b.strength-a.strength);
    const pains=PAINS.map(([label,re])=>({label,re,...(()=>{const d={re};const s=signal(d,p.winners,ordinary);return {hr:s.hr,lr:s.lr,lift:s.lift,hc:s.hc,strength:s.strength}})()})).filter(x=>x.hc>=2&&x.hr>=.25).sort((a,b)=>b.strength-a.strength);
    const words=SEARCH_WORDS.map(w=>{const hr=rate(p.winners,x=>txt(x).includes(w)),lr=rate(ordinary,x=>txt(x).includes(w)),hc=p.winners.filter(x=>txt(x).includes(w)).length;return {w,hr,lr,hc,lift:hr-lr,strength:(hr-lr)*2+hr}}).filter(x=>x.hc>=2&&x.hr>=.25).sort((a,b)=>b.strength-a.strength);
    const titleLens=p.winners.map(x=>String(x.title||'').length).filter(Boolean), textLens=p.winners.map(x=>String(x.text||'').length).filter(Boolean);
    const lines=p.winners.map(x=>String(x.text||'').split(/\n+/).filter(Boolean).length).filter(Boolean);
    const priceVals=p.winners.filter(x=>Number.isFinite(x.price)&&x.price>0).map(x=>x.price);
    const mainImg=typeof topLabel==='function'?topLabel(p.winners,'imageType'):null;
    const click=uniq(title.slice(0,3).map(x=>x.label).concat(modules.filter(x=>['samplePrice','colors','stock'].includes(x.id)).slice(0,2).map(x=>x.label)));
    const consult=uniq(modules.filter(x=>['sample','onsite','pickupLogistics','factory','specs','custom','afterSale','cta'].includes(x.id)).slice(0,5).map(x=>x.label));
    return {facts,...p,title,modules,pains,words,click,consult,titleMed:Math.round((typeof median==='function'?median(titleLens):null)||24),textMed:Math.round((typeof median==='function'?median(textLens):null)||120),lineMed:Math.round((typeof median==='function'?median(lines):null)||4),priceMid:priceVals.length?(typeof median==='function'?median(priceVals):priceVals[0]):null,mainImg};
  }

  let current=null, selected=new Set();

  function ensureStyle(){
    if(document.getElementById('v51-style'))return;
    const s=document.createElement('style');s.id='v51-style';s.textContent=`
    .v51-analysis{margin-top:10px;border:1px solid var(--line);border-radius:13px;background:#fff;padding:11px}
    .v51-title{font-size:12px;font-weight:900;margin-bottom:8px}.v51-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.v51-box{background:#f7f7f3;border-radius:10px;padding:9px;min-width:0}.v51-box b{display:block;font-size:10px;color:var(--muted);margin-bottom:4px}.v51-box span{display:block;font-size:11px;line-height:1.5}.v51-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.v51-chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:800;cursor:pointer}.v51-chip.on{background:#111;color:#fff;border-color:#111}.v51-summary{margin-top:10px;padding:10px 11px;border-radius:11px;background:#f4f6f1;font-size:11px;line-height:1.6}.v51-summary b{font-weight:900}.v51-note{font-size:10px;color:var(--muted);margin-top:5px}.v51-output-summary{margin-top:8px;border-top:1px solid var(--line);padding-top:8px;font-size:11px;line-height:1.55;color:#555}@media(max-width:700px){.v51-grid{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  function ensureUI(){
    ensureStyle();
    if(!document.getElementById('v51Analysis')){
      const bar=document.querySelector('.evidencebar');
      if(bar){
        const n=document.createElement('div');n.id='v51Analysis';n.className='v51-analysis';
        n.innerHTML=`<div class="v51-title">爆款共性分析</div><div class="v51-grid"><div class="v51-box"><b>吸引点击</b><span id="v51Click">生成后显示</span></div><div class="v51-box"><b>提高咨询</b><span id="v51Consult">生成后显示</span></div><div class="v51-box"><b>标题结构</b><span id="v51Title">—</span></div><div class="v51-box"><b>正文 / 排版</b><span id="v51Layout">—</span></div><div class="v51-box"><b>价格玩法</b><span id="v51Price">—</span></div><div class="v51-box"><b>用户痛点</b><span id="v51Pain">—</span></div></div><div class="v51-summary"><b>爆款卖点模块：</b><span id="v51ModuleText">生成后显示。</span><div id="v51Chips" class="v51-chips"></div><div class="v51-note">黑色 = 本次文案会采用；如某项不符合你的实际业务，点一下关闭再“换一个版本”。</div></div>`;
        bar.after(n);
      }
    }
    if(!document.getElementById('v51OutputSummary')){
      const out=document.querySelector('.output-actions');
      if(out){const n=document.createElement('div');n.id='v51OutputSummary';n.className='v51-output-summary';n.innerHTML='<b>本次核心流量共同点：</b><span id="v51Summary">生成后显示。</span>';out.after(n)}
    }
  }

  function renderAnalysis(a){
    ensureUI();
    const topTitle=a.title.slice(0,4), topMods=a.modules.slice(0,8);
    $('v51Click').textContent=a.click.length?a.click.join(' + '):'当前样本点击信号还不够集中';
    $('v51Consult').textContent=a.consult.length?a.consult.join(' + '):'当前样本咨询转化信号不足';
    $('v51Title').textContent=topTitle.length?topTitle.map(x=>`${x.label} ${pct(x.hr)}（普通 ${pct(x.lr)}）`).join('；'):`标题中位约 ${a.titleMed} 字`;
    $('v51Layout').textContent=`高价值正文中位约 ${a.textMed} 字 / ${a.lineMed} 段；${a.textMed>=120?'更偏分层说明，不是极简一句话':'偏短，但核心信息会分段'}`;
    const priceMod=a.modules.find(x=>x.id==='samplePrice');
    $('v51Price').textContent=priceMod?`${priceMod.label}：高价值 ${pct(priceMod.hr)} / 普通 ${pct(priceMod.lr)}`:(a.priceMid?`高价值样本价格中位约 ¥${Math.round(a.priceMid)}，暂无明显统一玩法`:'价格样本不足');
    $('v51Pain').textContent=a.pains.length?a.pains.slice(0,4).map(x=>x.label).join(' / '):'样本里暂未识别出稳定痛点表达';
    $('v51ModuleText').textContent=topMods.length?topMods.map(x=>`${x.label} ${pct(x.hr)}`).join('；'):'暂无稳定卖点模块';

    if(!selected.size) topMods.slice(0,7).forEach(x=>selected.add(x.id));
    $('v51Chips').innerHTML=topMods.map(m=>`<button type="button" class="v51-chip ${selected.has(m.id)?'on':''}" data-v51="${esc2(m.id)}">${esc2(m.label)} ${pct(m.hr)}</button>`).join('');
    document.querySelectorAll('[data-v51]').forEach(b=>b.onclick=()=>{const id=b.dataset.v51;if(selected.has(id))selected.delete(id);else selected.add(id);b.classList.toggle('on',selected.has(id))});
  }

  function moduleBy(id,a){return a.modules.find(x=>x.id===id)||MODULES.find(x=>x.id===id)}
  function activeModules(a){return [...selected].map(id=>moduleBy(id,a)).filter(Boolean)}

  function generateTitle(a,seed){
    const f=a.facts, feats=new Set(a.title.slice(0,5).map(x=>x.id)), mods=new Set(activeModules(a).map(x=>x.id)), t=f.topic.replace(/\s+/g,' ').trim();
    const variants=[];
    if(feats.has('priceInTitle')&&f.price)variants.push(`${t} ¥${f.price}/㎡${f.specs?' '+f.specs:''}`);
    if(feats.has('specInTitle')&&f.specs)variants.push(`${t} ${f.specs}${f.price?' ¥'+f.price+'/㎡':''}`);
    if(mods.has('samplePrice'))variants.push(`${t} 样板价可先看样${f.specs?' '+f.specs:''}`);
    if(mods.has('stock'))variants.push(`${t} 现货可看样${f.specs?' '+f.specs:''}`);
    if(mods.has('factory'))variants.push(`${t} 木地板 规格可选`);
    variants.push(`${t}${f.specs?' '+f.specs:''}${f.conditions.length?' '+f.conditions.join(' '):''}`);
    let title=uniq(variants)[seed%uniq(variants).length]||t;
    const max=Math.max(24,Math.min(48,a.titleMed+10));
    if(title.length>max)title=title.slice(0,max).replace(/[｜、，,\s]+$/,'');
    return title;
  }

  function generateBody(a,seed){
    const f=a.facts, mods=activeModules(a), by=id=>mods.some(x=>x.id===id), paras=[];
    // 开篇钩子：由样本共性决定，不再固定一句话。
    if(by('samplePrice')) paras.push(`${f.topic}。页面标价按样板/参考价展示，实际按规格和数量核价；想先看颜色、木纹或板面效果，可以先把需求发过来。`);
    else if(by('colors')) paras.push(`${f.topic}，选地板不只是看一个颜色。先把木色、木纹和家里的整体方向对上，再去定规格和铺法，会更直观。`);
    else if(by('stock')) paras.push(`${f.topic}，如果工期比较赶，先确认当天库存、规格和需要的数量，再决定会更稳。`);
    else paras.push(`${f.topic}，木种、结构、规格和铺装方式建议放在一起看，信息确认清楚后更容易直接比较。`);

    const sell=[];
    if(by('colors')) sell.push('颜色 / 木纹先看实物更直观');
    if(by('styles')) sell.push('平口 / 锁扣按铺装方式选');
    if(by('specs')) sell.push(f.specs?`规格 ${f.specs}`:'规格、数量按实际面积确认');
    if(by('custom')) sell.push('特殊尺寸 / 颜色需求先沟通确认');
    if(sell.length) paras.push(sell.join('；')+'。');

    if(f.price&&!by('samplePrice')) paras.push(`你的实际价格：${f.price}元/㎡。具体到不同规格、数量或铺法，可以再按实际需求核对。`);
    else if(by('samplePrice')&&!f.price) paras.push('样板 / 小样价格和大货价格分开看，实际大货按规格、数量和当时库存核价。');

    const fulfil=[];
    if(by('stock')) fulfil.push('现货和交期按当天库存确认');
    if(by('pickupLogistics')) fulfil.push('同城自提 / 外地物流可以提前确认');
    if(by('factory')) fulfil.push('规格、货源和批量需求可以直接沟通');
    if(fulfil.length) paras.push(fulfil.join('；')+'。');

    const trust=[];
    if(by('sample')) trust.push('拿不准颜色或木纹可以先看样板');
    if(by('onsite')) trust.push('方便的话可以现场看实物');
    if(by('afterSale')) trust.push('下单前把颜色、规格、数量和运输方式确认清楚');
    if(trust.length) paras.push(trust.join('；')+'，这样后面更省事。');

    if(by('cta')||paras.length<4) paras.push(seed%2?'有明确面积、规格、铺法或想看的颜色，直接把需求发过来，可以更快对比。':'需要对比不同规格、颜色或数量，直接按实际需求沟通就行。');
    return uniq(paras).join('\n\n');
  }

  function generateTags(a){
    const f=a.facts, mods=activeModules(a), out=[];
    const raw=f.topic.replace(/\s+/g,'').replace(/木地板$/,'');
    if(raw)out.push(raw);
    if(raw)out.push(raw+'木地板');
    out.push('木地板');
    a.words.slice(0,8).forEach(x=>{
      if(['工厂','厂家','现货','库存','寄样','自提','物流','定制'].includes(x.w)){
        const map={工厂:'factory',厂家:'factory',现货:'stock',库存:'stock',寄样:'sample',自提:'pickupLogistics',物流:'pickupLogistics',定制:'custom'};
        if(selected.has(map[x.w]))out.push(x.w);
      }else out.push(x.w);
    });
    const list=uniq(out).slice(0,8);
    return site==='小红书'?list.map(x=>'#'+x).join(' '):list.join(' / ');
  }

  function summaryText(a){
    const click=a.click.length?a.click.slice(0,3).join('、'):'标题与页面排名';
    const consult=a.consult.length?a.consult.slice(0,4).join('、'):'规格/价格信息完整';
    return `吸引点击主要靠 ${click}；提高咨询主要靠 ${consult}。本次正文会按高价值样本的分段密度组织，不再压成一句话。`;
  }

  ensureUI();
  makeContent=function(){
    const raw=$('genKeyword').value.trim();
    if(!raw)return setStatus('请先输入商品关键词或真实规格/价格。','bad');
    if(items.length<20)return setStatus('当前样本太少，先继续抓取；至少 30 条开始参考，50 条以上更适合做共性分析。','warn');
    current=analyzeCommon(raw);selected.clear();renderAnalysis(current);

    const title=generateTitle(current,genSeed), body=generateBody(current,genSeed), tags=generateTags(current), sum=summaryText(current);
    const inter=current.direct.filter(x=>(x.wants||0)+(x.comments||0)+(x.likes||0)+(x.favs||0)>0).length;
    const level=current.direct.length>=30&&inter>=10?'高':current.direct.length>=15?'中':'低';
    $('gConfidence').textContent='可信度 '+level;$('gConfidence').className='confidence '+(level==='高'?'good':level==='中'?'base':'low');
    $('gEvidence').textContent=`直接相关 ${current.direct.length} 条；高价值组 ${current.winners.length} 条；带互动的相关样本 ${inter} 条。`;
    $('gRelated').textContent=`${current.direct.length} 条直接相关`;$('gRelatedSub').textContent=`共性只从高价值组相对普通组更集中的特征里提取。`;
    $('gTitlePlan').textContent=current.title[0]?.label||'材质 + 地板品类前置';$('gTitleSub').textContent=current.title.slice(0,2).map(x=>`${x.label}：${pct(x.hr)} vs ${pct(x.lr)}`).join('；')||`标题中位约 ${current.titleMed} 字`;
    $('gPricePlan').textContent=current.modules.find(x=>x.id==='samplePrice')?'样板 / 参考价引流':(current.priceMid?`价格中位约 ¥${Math.round(current.priceMid)}`:'暂无稳定价格玩法');$('gPriceSub').textContent='价格玩法只在样本中形成明显共性时采用。';
    $('gBodyPlan').textContent=`约 ${current.textMed} 字 / ${current.lineMed} 段`;$('gBodySub').textContent='正文按开篇钩子 → 卖点 → 履约/信任 → 咨询动作组织。';
    $('gImagePlan').textContent=current.mainImg?.[0]||'商品实拍';$('gImageSub').textContent=current.mainImg?`高价值组出现 ${current.mainImg[1]} 次。`:'主图识别不足，暂不强判断。';
    $('gSignalPlan').textContent=inter>=5?'咨询/互动 + 时效 + 排名':'页面排名 + 时效 + 文案结构';$('gSignalSub').textContent='互动数据不足时不会把普通前排误判成爆款。';

    const sources=current.winners.slice(0,3);
    $('sourceList').innerHTML=sources.map(x=>`<a class="source-card" href="${esc2(x.url||x.sourcePage||'#')}" target="_blank" rel="noopener"><div class="source-main"><b>${esc2(x.title)}</b><span>排名 ${x.rank??'—'} · 想要 ${x.wants??0} · 互动 ${typeof engagement==='function'?Math.round(engagement(x)):0} · ${esc2(x.ageText||'时间未知')}</span></div><span class="source-open">打开</span></a>`).join('')||'<div class="source-card"><div class="source-main"><b>暂无足够相关样本</b><span>建议继续抓同类关键词。</span></div></div>';

    $('genTitle').textContent=title;$('genBody').textContent=body;$('genTags').textContent=tags;$('v51Summary').textContent=sum;
    lastGenerated=`【标题】\n${title}\n\n【正文】\n${body}\n\n【标签 / 搜索词】\n${tags}`;
    setStatus(`已完成爆款共性分析，并按共同点生成；当前相关样本 ${current.direct.length} 条。`,'oktxt');
  };

  const oldRegen=$('regen').onclick;
  $('regen').onclick=()=>{genSeed++;if(current){renderAnalysis(current);const title=generateTitle(current,genSeed),body=generateBody(current,genSeed),tags=generateTags(current);$('genTitle').textContent=title;$('genBody').textContent=body;$('genTags').textContent=tags;lastGenerated=`【标题】\n${title}\n\n【正文】\n${body}\n\n【标签 / 搜索词】\n${tags}`;setStatus('已按同一批爆款共性换一个版本。','oktxt')}else if(oldRegen)oldRegen()};

  const oldRender=render;render=function(){oldRender();ensureUI()};
})();