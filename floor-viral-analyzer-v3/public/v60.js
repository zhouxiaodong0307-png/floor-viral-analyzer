(() => {
  const VERSION='6.0', EXPKEY='floorV60Experiments', GENKEY='floorV60Generated';
  const uniq=a=>[...new Set((a||[]).filter(Boolean))];
  const esc6=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const med=a=>{a=(a||[]).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
  const pct=v=>`${Math.round((v||0)*100)}%`;
  const getNum=(t,label)=>{const r1=new RegExp('([\\d,.]+)\\s*(万|w|W|k|K|千)?\\s*'+label,'i'),r2=new RegExp(label+'\\s*[:：]?\\s*([\\d,.]+)\\s*(万|w|W|k|K|千)?','i');const m=String(t||'').match(r1)||String(t||'').match(r2);if(!m)return null;let n=+String(m[1]).replace(/,/g,''),u=m[2]||'';if(/万|w/i.test(u))n*=1e4;if(/k|千/i.test(u))n*=1e3;return Number.isFinite(n)?Math.round(n):null};
  const views=x=>Number.isFinite(+x.views)?+x.views:getNum((x.title||'')+' '+(x.text||''),'(?:浏览|浏览量|查看|阅读)');
  const consults=x=>Number.isFinite(+x.consults)?+x.consults:getNum((x.title||'')+' '+(x.text||''),'(?:咨询|沟通|问过)');
  const age=x=>typeof ageHours==='function'?ageHours(x.ageText):null;
  const inter=x=>(+x.wants||0)*4+(+x.comments||0)*2.5+(+x.favs||0)*2+(+x.likes||0)+(+x.shares||0)*2.5+(consults(x)||0)*5;
  const perf=x=>{
    const h=age(x),v=views(x),i=inter(x),vv=v!=null&&h?v/Math.max(.5,h):null,iv=h?i/Math.max(.5,h):null,ir=v?i/v:null,cr=v&&consults(x)!=null?consults(x)/v:null;
    return Math.log1p(iv??i)*5+Math.log1p(vv??0)*1.25+(ir??0)*38+(cr??0)*65+(x.rank?Math.max(0,25-x.rank)*.14:0)+(h!=null&&h<=24?1.5:0);
  };

  const WOODS=['红檀香','柚木','橡木','龙凤檀','二翅豆','圆盘豆','黑胡桃','白蜡木','菠萝格','重蚁木','紫檀','相思木','白橡','欧橡'];
  const STRUCT=['实木','多层','三层','复合','强化','SPC','WPC'];
  const FEATURE_DEFS=[
    {id:'title_material',label:'材质/木种 + 地板品类前置',var:'标题角度',test:x=>/^(?:全新|二手|特价|清仓|处理\s*)?(?:实木|多层|三层|复合|强化|橡木|柚木|红檀香|龙凤檀|黑胡桃|白蜡木|菠萝格|重蚁木|紫檀|木地板|地板)/.test(String(x.title||'').trim())},
    {id:'title_spec',label:'标题直接写规格',var:'标题角度',test:x=>/\d{2,4}\s*[x×*]\s*\d{2,4}/i.test(String(x.title||''))},
    {id:'title_price',label:'标题直接写价格',var:'价格表达',test:x=>/[¥￥]\s*\d|\d+(?:\.\d+)?\s*元/.test(String(x.title||''))},
    {id:'title_stock',label:'标题强调现货/库存',var:'货源/履约角度',test:x=>/现货|库存|随时发|当天发/.test(String(x.title||''))},
    {id:'title_scene',label:'标题带使用场景',var:'场景角度',test:x=>/家装|客厅|卧室|地暖|工装|办公室|民宿/.test(String(x.title||''))},
    {id:'body_sample',label:'正文写寄样/看样',var:'信任转化',test:x=>/寄样|看样|样板|样品|看板/.test(String(x.text||''))},
    {id:'body_onsite',label:'正文写现场看货',var:'信任转化',test:x=>/现场看|看货|来厂|到厂|实地看/.test(String(x.text||''))},
    {id:'body_logistics',label:'正文写自提 + 物流',var:'货源/履约角度',test:x=>/自提/.test(String(x.text||''))&&/物流|发货|配送/.test(String(x.text||''))},
    {id:'body_factory',label:'正文强调工厂/厂家货源',var:'货源/履约角度',test:x=>/工厂|厂家|源头|仓库直发/.test(String(x.text||''))},
    {id:'body_choice',label:'正文强调颜色/款式可选',var:'产品选择角度',test:x=>/颜色可选|多种颜色|浅色|深色|原木色|平口|平扣|锁扣|款式可选/.test(String(x.text||''))},
    {id:'body_cta',label:'正文有明确咨询动作',var:'咨询转化',test:x=>/直接.*聊|直接.*问|欢迎咨询|可以联系|把.*发过来|需要.*沟通|私聊/.test(String(x.text||''))},
    {id:'body_dense',label:'正文分层且信息较完整',var:'正文结构',test:x=>String(x.text||'').length>=120},
    {id:'deal_sample',label:'样板/参考价引流',var:'价格表达',test:x=>/样板价|样板价格|标价.*样板|参考价|粉丝价/.test((x.title||'')+' '+(x.text||''))}
  ];
  const IMG_TYPES=['工厂/库存实拍','家装效果/案例','单板/材质特写','价格/促销型','商品实拍'];

  function exactTerms(raw){const t=String(raw||'').trim();const woods=WOODS.filter(w=>t.includes(w)),str=STRUCT.filter(w=>t.includes(w));const words=t.split(/[\s,，/|]+/).filter(x=>x.length>=2&&!/^\d/.test(x));return uniq([...woods,...str,...words]).filter(x=>!['木地板','地板'].includes(x));}
  function pools(raw){
    const terms=exactTerms(raw),all=[...items],norm=x=>String((x.title||'')+' '+(x.text||'')).toLowerCase();
    const A=all.filter(x=>terms.length?terms.every(t=>norm(x).includes(t.toLowerCase())):false);
    const inStruct=STRUCT.find(s=>raw.includes(s)); const inWood=WOODS.find(w=>raw.includes(w));
    let B=all.filter(x=>!A.includes(x)&&(/地板/.test(norm(x)))&&(inStruct?norm(x).includes(inStruct):inWood?WOODS.some(w=>norm(x).includes(w)):true));
    const prices=A.map(x=>+x.price).filter(n=>n>0),pm=med(prices);if(pm&&B.length>15)B=B.sort((a,b)=>Math.abs((+a.price||pm)-pm)-Math.abs((+b.price||pm)-pm));
    const C=all.filter(x=>!A.includes(x)&&!B.includes(x));
    let grade='C',base=all;if(A.length>=15){grade='A';base=A}else if(A.length+B.length>=20){grade='B';base=[...A,...B.slice(0,Math.max(20-A.length,30))]}else{grade='C';base=all}
    return {A,B,C,base,grade,terms};
  }

  function splitPerf(arr){const ranked=[...arr].sort((a,b)=>perf(b)-perf(a));const hiN=Math.max(4,Math.ceil(ranked.length*.25)),high=ranked.slice(0,hiN),ordinary=ranked.slice(Math.max(hiN,Math.ceil(ranked.length*.45)));return {ranked,high,ordinary:ordinary.length?ordinary:ranked.slice(hiN)}}
  function signal(def,high,ordinary){const hr=high.length?high.filter(def.test).length/high.length:0,lr=ordinary.length?ordinary.filter(def.test).length/ordinary.length:0,hc=high.filter(def.test).length,lc=ordinary.filter(def.test).length,diff=hr-lr;return {...def,hr,lr,hc,lc,diff,score:diff*2.2+hr*.65+(hc>=3?.12:0)}}
  function imageSignals(high,ordinary){return IMG_TYPES.map(label=>{const test=x=>(x.imageType||(typeof imageType==='function'?imageType(x):''))===label;return signal({id:'img_'+label,label,var:'首图类型',test},high,ordinary)}).filter(x=>x.hc>=2)}
  function analyze(raw){
    const p=pools(raw),sp=splitPerf(p.base),sigs=[...FEATURE_DEFS.map(d=>signal(d,sp.high,sp.ordinary)),...imageSignals(sp.high,sp.ordinary)].filter(s=>s.hc>=2&&s.diff>=.12&&s.hr>=.25).sort((a,b)=>b.score-a.score);
    const weak=[...FEATURE_DEFS.map(d=>signal(d,sp.high,sp.ordinary))].filter(s=>s.hr>=.35&&Math.abs(s.diff)<.06).sort((a,b)=>b.hr-a.hr).slice(0,4);
    const active=p.base.filter(x=>inter(x)>0),withViews=p.base.filter(x=>views(x)!=null),withAge=p.base.filter(x=>age(x)!=null);
    const anomalies=sp.ranked.filter(x=>{const hit=sigs.filter(s=>s.test(x)).length;return perf(x)>=perf(sp.high[Math.max(0,sp.high.length-1)]||x)&&hit<=1}).slice(0,3);
    let conf='低';if(p.grade==='A'&&p.A.length>=30&&active.length>=10)conf='高';else if((p.grade==='A'||p.grade==='B')&&p.base.length>=25)conf='中';
    const exploratory=p.A.length<8||active.length<5;
    const opportunities=sigs.slice(0,8);
    const history=loadExperiments();
    const own=history.filter(e=>e.keyword&&raw.includes(e.keyword)&&e.metrics&&(+e.metrics.views||+e.metrics.wants||+e.metrics.consults));
    let retain='';if(own.length){const sorted=[...own].sort((a,b)=>ownScore(b)-ownScore(a));retain=`你自己的历史测试里「${sorted[0].strategy}」目前表现最好，下一轮建议保留它的有效部分，只改一个新变量。`}
    return {raw,...p,...sp,sigs,weak,active,withViews,withAge,anomalies,conf,exploratory,opportunities,retain};
  }

  function ownScore(e){const h=Math.max(1,(Date.now()-new Date(e.publishedAt||e.createdAt||Date.now()))/36e5),m=e.metrics||{},v=+m.views||0,w=+m.wants||0,c=+m.consults||0;return Math.log1p(v/h)+w*2+c*4+(v?((w+c)/v)*30:0)}
  function loadExperiments(){try{return JSON.parse(localStorage.getItem(EXPKEY)||'[]')}catch{return[]}}
  function saveExperiments(a){localStorage.setItem(EXPKEY,JSON.stringify(a.slice(-120)))}
  function loadGenerated(){try{return JSON.parse(localStorage.getItem(GENKEY)||'[]')}catch{return[]}}
  function saveGenerated(a){localStorage.setItem(GENKEY,JSON.stringify(a.slice(-100)))}
  function shingles(s){s=String(s||'').replace(/\s+/g,'');const set=new Set();for(let i=0;i<s.length-2;i++)set.add(s.slice(i,i+3));return set}
  function similarity(a,b){const A=shingles(a),B=shingles(b);if(!A.size||!B.size)return 0;let i=0;A.forEach(x=>{if(B.has(x))i++});return i/(A.size+B.size-i)}

  function strategyCandidates(a){
    const byVar={};a.opportunities.forEach(o=>(byVar[o.var]??=[]).push(o));
    const order=Object.entries(byVar).sort((x,y)=>Math.max(...y[1].map(s=>s.score))-Math.max(...x[1].map(s=>s.score))).map(([k,v])=>({name:k,sig:v[0]}));
    const fallback=[
      {name:'货源/履约角度',sig:null},{name:'场景角度',sig:null},{name:'价格/规格角度',sig:null},{name:'首图类型',sig:null},{name:'信任转化',sig:null}
    ];
    const out=[];[...order,...fallback].forEach(x=>{if(!out.some(y=>y.name===x.name))out.push(x)});return out.slice(0,3);
  }
  function keywordBase(raw){return String(raw||'').trim().replace(/\s+/g,' ')}
  function priceBand(arr){const p=arr.map(x=>+x.price).filter(n=>n>0);if(p.length<4)return null;const s=[...p].sort((a,b)=>a-b);return {lo:s[Math.floor((s.length-1)*.25)],mid:med(s),hi:s[Math.floor((s.length-1)*.75)]}}
  function topWords(arr){const bank=['实木','多层','三层','橡木','柚木','红檀香','锁扣','平扣','现货','库存','自提','物流','寄样','看货','家装','工装','地暖','定制','清仓','特价','样板价','原木'];return bank.map(w=>({w,n:arr.filter(x=>((x.title||'')+' '+(x.text||'')).includes(w)).length})).filter(x=>x.n>=2).sort((a,b)=>b.n-a.n).slice(0,6).map(x=>x.w)}

  function makePlan(a,strategy,idx){
    const k=keywordBase(a.raw),band=priceBand(a.high),words=topWords(a.high),sig=strategy.sig,why=[];
    if(sig)why.push(`${sig.label}：高表现组 ${pct(sig.hr)}，普通组 ${pct(sig.lr)}，差异 ${Math.round(sig.diff*100)} 个百分点（高表现命中 ${sig.hc} 条）`);
    if(a.grade!=='A')why.push(`直接同商品只有 ${a.A.length} 条，本轮按 ${a.grade} 级证据做${a.exploratory?'探索性':'对照'}测试。`);
    if(!a.withViews.length)why.push('当前抓取不到浏览量，所以不把“想要高”直接等同于“流量高”；主要使用单位时间互动 + 页面排名。');
    const common=`${k}`;
    let label='',title='',body='',image='商品真实实拍',price='暂无足够数据，不改价格',tags=uniq([k,k.includes('地板')?'':k+'地板','木地板',...words]).filter(Boolean).slice(0,7).join(' / '),only=strategy.name;
    if(strategy.name==='货源/履约角度'){
      label='版本A｜货源/履约型';
      title=`${common}｜规格库存和发货方式直接说清`;
      body=`${common}，这条不绕木材概念，先把买家最容易问的规格、数量和交付方式说清楚。\n\n不同规格对应的实际用量不同，有面积或尺寸可以直接核对。库存和交期按当天实际情况确认，同城自提、外地物流都可以提前把地址和数量一起算清。\n\n如果你正在几种木地板之间对比，把面积、喜欢的铺法和预算范围发过来，直接按实际需求看哪种更合适。`;
      image='首图测试：工厂/库存实拍，画面里直接出现成排实物板，不加大段文字。';
    }else if(strategy.name==='场景角度'){
      label='版本B｜使用场景型';
      title=`${common}｜家装选这种地板先看实际铺装效果`;
      body=`${common}，如果是家装，单看一块板很难判断最终效果。更建议先看它铺到客厅、卧室后的整体感觉，再决定木色、规格和铺法。\n\n已经有户型面积的话，可以按实际空间一起对比：大面积通铺更看整体色差和稳定性，局部空间则更需要考虑收口和铺法。\n\n你把面积、装修风格和想要的木色方向发过来，我可以按实际使用场景帮你把规格和铺法一起对上。`;
      image='首图测试：真实家装铺装效果，优先完整空间，不用单板白底图。';
    }else if(strategy.name==='价格表达'||strategy.name==='价格/规格角度'){
      label='版本C｜价格/规格型';
      title=`${common}｜规格和价格直接对比更清楚`;
      body=`${common}，同一个木种真正影响成交的往往不是一句“好不好”，而是规格、数量和最后落地价格。\n\n这条把信息尽量说直：先确认需要的规格和实际面积，再按数量核价。不同尺寸、结构和铺法会影响用量，直接拿面积来算会比只看一个标价更准确。\n\n如果已经有尺寸或预算，可以直接发过来做对比，不用来回猜价格。`;
      image='首图测试：产品近拍 + 清晰尺寸参照，让买家第一眼知道板面和规格。';
      price=band?`高表现参考价格带约 ¥${Math.round(band.lo)}–¥${Math.round(band.hi)}，中位 ¥${Math.round(band.mid)}；只有你的真实售价落在其中时才建议按真实价测试。`:'价格样本不足，本轮只测试“规格/价格信息前置”，不改实际售价。';
    }else if(strategy.name==='首图类型'){
      label='版本A｜首图测试型';
      title=`${common}｜木地板实物效果直接看`;
      body=`${common}。这轮正文先保持简单稳定，重点只测试首图是否能带来更多点击。\n\n规格、数量、铺法按实际需求确认，有明确面积可以直接核对。需要对比木色和板面，直接看实物会更直观。`;
      image=sig?.label?`首图只改成「${sig.label.replace('首图类型','').trim()||'高表现样本常见图片类型'}」，标题、价格和正文尽量不动。`:'首图测试：工厂库存实拍 VS 铺装效果图，只改图片不同时改标题和价格。';
      only='首图';
    }else{
      label=`版本${String.fromCharCode(65+idx)}｜信任/咨询型`;
      title=`${common}｜规格和实物细节都可以直接对比`;
      body=`${common}，买地板最容易卡在颜色、规格和实际用量上，所以这条重点把“怎么确认”说清楚。\n\n有面积先算用量，有目标木色先看实物效果，有铺法要求再确认对应规格。把这几项先对上，后面报价和下单都会简单很多。\n\n已经看中类似款的话，直接把面积和想要的效果发过来对比就行。`;
      image='首图测试：手拿样板或近距离实物板，突出真实板面。';
      only='信任/咨询表达';
    }
    const candidate=title+'\n'+body;const hist=loadGenerated();let sim=0;hist.forEach(h=>sim=Math.max(sim,similarity(candidate,h.text||'')));a.high.slice(0,10).forEach(x=>sim=Math.max(sim,similarity(candidate,(x.title||'')+'\n'+(x.text||''))));if(sim>.68){body=body.replace('直接','可以').replace('实际需求','具体需求').replace('对比','核对');why.push(`已触发去同质化：初稿与历史/热门内容相似度 ${Math.round(sim*100)}%，已自动改写。`)}
    return {id:`${Date.now()}_${idx}`,label,strategy:strategy.name,title,body,image,price,tags,why,only};
  }

  function html(){return `
  <section id="v60Decision" class="v60-card v60-hero"><div class="v60-head"><div><div class="v60-kicker">下一条建议测试</div><h2 id="v60Target">先输入商品关键词</h2><p id="v60Basis">系统会先找高表现组与普通组的“差异”，再决定下一轮只测试什么。</p></div><span id="v60Conf" class="v60-conf">未分析</span></div><div class="v60-input"><input id="v60Keyword" placeholder="例如：红檀香 / 缅甸柚木 / 橡木多层"><button id="v60Analyze">分析下一条</button></div><div class="v60-meta"><span id="v60Tier">证据：—</span><span id="v60Samples">样本：—</span><span id="v60Missing">数据缺失：—</span></div><button id="v60Generate" class="v60-main" disabled>生成测试商品</button></section>
  <section id="v60Why" class="v60-card"><div class="v60-sectionhead"><h3>可验证机会</h3><span>只显示高表现组明显高于普通组的差异</span></div><div id="v60Opps" class="v60-opps"><div class="v60-empty">分析后显示 3–5 个真正值得测试的差异。</div></div></section>
  <section id="v60Plans" class="v60-card" style="display:none"><div class="v60-sectionhead"><h3>3 个测试方案</h3><span>三个版本测试不同“内容模型”，不是三个同义句</span></div><div id="v60PlanGrid" class="v60-plans"></div></section>
  <section id="v60Refs" class="v60-card"><div class="v60-sectionhead"><h3>参考高价值样本</h3><span>只保留最值得研究的 5–10 条</span></div><div id="v60RefList" class="v60-refs"><div class="v60-empty">分析后显示。</div></div></section>
  <details id="v60Details" class="v60-card"><summary>查看详细分析</summary><div id="v60DetailBody" class="v60-detail"></div></details>
  <section id="v60Loop" class="v60-card"><div class="v60-sectionhead"><h3>我的测试闭环</h3><span>以后你自己的结果会逐渐比平台大盘更重要</span></div><div id="v60History" class="v60-history"></div></section>`}
  function style(){const s=document.createElement('style');s.id='v60-style';s.textContent=`
  body.v60 .stats,body.v60 .card:has(#genKeyword){display:none!important}.v60-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:12px}.v60-hero{border:1.5px solid #d9d9d2}.v60-head,.v60-sectionhead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.v60-kicker{font-size:12px;color:#666;font-weight:900;margin-bottom:4px}.v60-head h2,.v60-sectionhead h3{margin:0;font-size:20px}.v60-head p{margin:6px 0 0;font-size:12px;color:#666;line-height:1.6}.v60-conf{border-radius:999px;padding:6px 10px;background:#f1f1ec;font-size:12px;font-weight:900;white-space:nowrap}.v60-input{display:flex;gap:8px;margin-top:12px}.v60-input input{flex:1;border:1px solid var(--line);border-radius:11px;padding:12px;font:inherit}.v60-input button,.v60-main,.v60-copy,.v60-record,.v60-save{border:0;border-radius:10px;padding:11px 14px;font:inherit;font-weight:900;cursor:pointer}.v60-input button,.v60-main,.v60-copy{background:#111;color:#fff}.v60-main{margin-top:10px}.v60-main:disabled{opacity:.35}.v60-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.v60-meta span{font-size:11px;background:#f4f4ef;border-radius:999px;padding:6px 9px}.v60-sectionhead span{font-size:11px;color:#777}.v60-opps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.v60-opp{border:1px solid var(--line);border-radius:12px;padding:11px}.v60-opp b{display:block;font-size:13px}.v60-opp .nums{font-size:12px;margin-top:5px}.v60-opp .reason{font-size:11px;color:#666;line-height:1.5;margin-top:5px}.v60-badge{display:inline-flex;margin-top:6px;padding:4px 7px;border-radius:999px;background:#edf6ef;color:#176c46;font-size:10px;font-weight:900}.v60-plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.v60-plan{border:1px solid var(--line);border-radius:13px;padding:12px;min-width:0}.v60-plan h4{margin:0 0 8px;font-size:14px}.v60-plan .field{margin-top:9px}.v60-plan .field b{display:block;font-size:10px;color:#777;margin-bottom:3px}.v60-plan .field div{font-size:12px;line-height:1.65;white-space:pre-wrap}.v60-plan .why{margin-top:9px;padding:8px;border-radius:9px;background:#f7f7f3;font-size:10px;line-height:1.5}.v60-actions{display:flex;gap:6px;margin-top:10px}.v60-record{background:#f1f1ec}.v60-refs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:10px}.v60-ref{display:block;text-decoration:none;color:#111;border:1px solid var(--line);border-radius:10px;padding:9px}.v60-ref b{display:block;font-size:11px;line-height:1.45}.v60-ref span{font-size:10px;color:#666}.v60-detail{margin-top:10px;font-size:11px;line-height:1.65}.v60-detail table{min-width:0}.v60-detail th,.v60-detail td{font-size:11px}.v60-empty{font-size:12px;color:#777;padding:12px}.v60-history{margin-top:10px}.v60-test{display:grid;grid-template-columns:1.2fr repeat(3,.6fr) auto;gap:6px;align-items:center;border-top:1px solid var(--line);padding:8px 0}.v60-test:first-child{border-top:0}.v60-test input{width:100%;border:1px solid var(--line);border-radius:8px;padding:7px}.v60-save{background:#f1f1ec;padding:8px}.v60-note{font-size:10px;color:#777}@media(max-width:900px){.v60-plans{grid-template-columns:1fr}.v60-opps,.v60-refs{grid-template-columns:1fr}.v60-test{grid-template-columns:1fr 1fr 1fr 1fr}.v60-test .v60-save{grid-column:1/-1}.v60-input{display:grid}.v60-head{flex-direction:column}}
  `;document.head.appendChild(s)}

  let state=null,plans=[];
  function mount(){
    document.body.classList.add('v60');if(!document.getElementById('v60-style'))style();if(document.getElementById('v60Decision'))return;
    const crawl=document.querySelector('.card');crawl.insertAdjacentHTML('afterend',html());
    const rawCard=[...document.querySelectorAll('.card')].find(c=>c.querySelector('#body'));if(rawCard)rawCard.style.order='99';
    $('v60Analyze').onclick=runAnalysis;$('v60Generate').onclick=generatePlans;renderHistory();
  }

  function runAnalysis(){const raw=$('v60Keyword').value.trim();if(!raw)return setStatus('先输入商品关键词。','bad');if(items.length<20)return setStatus('当前样本不足 20 条，先继续抓取。','warn');state=analyze(raw);const best=strategyCandidates(state)[0];$('v60Target').textContent=`本轮优先测试：${best.name}`;$('v60Basis').textContent=state.retain||`${best.sig?best.sig.label+' 在高表现组明显更多；':''}${state.exploratory?'当前属于探索性测试，先验证方向，不下确定结论。':'样本已足够做一轮对照测试。'}`;$('v60Conf').textContent=`${state.exploratory?'探索性':'可信度 '+state.conf}`;$('v60Tier').textContent=`证据：${state.grade}级（A同商品 ${state.A.length} / B同品类 ${state.B.length}）`;$('v60Samples').textContent=`样本：分析池 ${state.base.length} / 有互动 ${state.active.length}`;$('v60Missing').textContent=`数据缺失：${state.withViews.length?`浏览 ${state.withViews.length}/${state.base.length}`:'浏览量未抓到'}；${state.withAge.length?`时长 ${state.withAge.length}/${state.base.length}`:'上架时长不足'}`;$('v60Generate').disabled=false;renderOpps();renderRefs();renderDetails();setStatus(`已完成“数据→差异→假设”分析，本轮建议只测试「${best.name}」。`,'oktxt')}
  function renderOpps(){const box=$('v60Opps');if(!state.opportunities.length){box.innerHTML='<div class="v60-empty">当前高表现组与普通组没有形成明显差异，继续抓更多相关样本比硬生成结论更有价值。</div>';return}box.innerHTML=state.opportunities.slice(0,5).map(o=>`<div class="v60-opp"><b>${esc6(o.label)}</b><div class="nums">高表现 ${pct(o.hr)} ｜ 普通 ${pct(o.lr)} ｜ 差异 +${Math.round(o.diff*100)}pp</div><div class="reason">命中 ${o.hc} 条高表现样本；测试变量：${esc6(o.var)}</div><span class="v60-badge">${state.grade}级证据 · ${state.exploratory?'探索':'可验证'}</span></div>`).join('')}
  function renderRefs(){const refs=state.ranked.slice(0,8);$('v60RefList').innerHTML=refs.map(x=>`<a class="v60-ref" href="${esc6(x.url||x.sourcePage||'#')}" target="_blank" rel="noopener"><b>${esc6(x.title)}</b><span>排名 ${x.rank??'—'} · 浏览 ${views(x)??'缺失'} · 想要 ${x.wants??0} · 点赞 ${x.likes??0} · 收藏 ${x.favs??0} · 评论 ${x.comments??0} · ${esc6(x.ageText||'时间缺失')}</span></a>`).join('')}
  function renderDetails(){const rows=state.sigs.slice(0,12).map(o=>`<tr><td>${esc6(o.label)}</td><td>${pct(o.hr)}</td><td>${pct(o.lr)}</td><td>+${Math.round(o.diff*100)}pp</td><td>${o.hc}/${state.high.length}</td><td>${state.grade}级</td></tr>`).join('');const weak=state.weak.length?state.weak.map(x=>x.label).join('、'):'暂无';const anomaly=state.anomalies.length?state.anomalies.map(x=>`<div>• ${esc6(x.title)}（表现分 ${perf(x).toFixed(1)}）</div>`).join(''):'暂无明显异常样本';$('v60DetailBody').innerHTML=`<div><b>没有区分度、不要重点展示：</b>${esc6(weak)}</div><div style="margin-top:8px"><b>异常高表现样本：</b>${anomaly}</div><table style="margin-top:10px;width:100%"><thead><tr><th>特征</th><th>高表现</th><th>普通</th><th>差异</th><th>样本</th><th>证据</th></tr></thead><tbody>${rows}</tbody></table>`}
  function generatePlans(){if(!state)return;const ss=strategyCandidates(state);plans=ss.map((s,i)=>makePlan(state,s,i));const hist=loadGenerated();plans.forEach(p=>hist.push({createdAt:new Date().toISOString(),keyword:state.raw,strategy:p.strategy,text:p.title+'\n'+p.body}));saveGenerated(hist);$('v60Plans').style.display='block';$('v60PlanGrid').innerHTML=plans.map((p,i)=>`<article class="v60-plan"><h4>${esc6(p.label)}</h4><div class="field"><b>本轮测试目标</b><div>${esc6(p.strategy)}</div></div><div class="field"><b>标题</b><div>${esc6(p.title)}</div></div><div class="field"><b>正文</b><div>${esc6(p.body)}</div></div><div class="field"><b>首图建议</b><div>${esc6(p.image)}</div></div><div class="field"><b>价格建议</b><div>${esc6(p.price)}</div></div><div class="field"><b>关键词</b><div>${esc6(p.tags)}</div></div><div class="why"><b>为什么这么发：</b><br>${p.why.map(x=>esc6(x)).join('<br>')}<br><b>本轮只测试：</b>${esc6(p.only)}</div><div class="v60-actions"><button class="v60-copy" data-copy="${i}">复制</button><button class="v60-record" data-rec="${i}">记录本轮测试</button></div></article>`).join('');document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copyPlan(+b.dataset.copy));document.querySelectorAll('[data-rec]').forEach(b=>b.onclick=()=>recordPlan(+b.dataset.rec));$('v60Plans').scrollIntoView({behavior:'smooth',block:'start'})}
  async function copyPlan(i){const p=plans[i];const text=`【标题】\n${p.title}\n\n【正文】\n${p.body}\n\n【首图建议】\n${p.image}\n\n【价格建议】\n${p.price}\n\n【标签 / 搜索词】\n${p.tags}`;try{await navigator.clipboard.writeText(text);setStatus('已复制，可直接粘贴发布。','oktxt')}catch{setStatus('复制失败，请手动复制。','warn')}}
  function recordPlan(i){const p=plans[i],a=loadExperiments();a.push({id:p.id,createdAt:new Date().toISOString(),publishedAt:new Date().toISOString(),keyword:state.raw,strategy:p.strategy,title:p.title,body:p.body,image:p.image,price:p.price,tags:p.tags,metrics:{views:'',wants:'',consults:''}});saveExperiments(a);renderHistory();setStatus('已记录本轮测试；发布后把浏览、想要、咨询填回来即可形成闭环。','oktxt')}
  function renderHistory(){const a=loadExperiments().slice(-8).reverse();$('v60History').innerHTML=a.length?a.map(e=>`<div class="v60-test" data-id="${esc6(e.id)}"><div><b>${esc6(e.keyword)} · ${esc6(e.strategy)}</b><div class="v60-note">${new Date(e.publishedAt||e.createdAt).toLocaleString()}</div></div><input data-m="views" placeholder="浏览" value="${esc6(e.metrics?.views||'')}"><input data-m="wants" placeholder="想要" value="${esc6(e.metrics?.wants||'')}"><input data-m="consults" placeholder="咨询" value="${esc6(e.metrics?.consults||'')}"><button class="v60-save">保存结果</button></div>`).join(''):'<div class="v60-empty">还没有自己的测试记录。生成方案后点“记录本轮测试”。</div>';document.querySelectorAll('.v60-test .v60-save').forEach(b=>b.onclick=()=>{const row=b.closest('.v60-test'),id=row.dataset.id,all=loadExperiments(),e=all.find(x=>x.id===id);if(!e)return;row.querySelectorAll('[data-m]').forEach(inp=>e.metrics[inp.dataset.m]=inp.value);saveExperiments(all);setStatus('测试结果已保存，下一轮分析会优先参考你自己的结果。','oktxt')})}

  mount();
})();