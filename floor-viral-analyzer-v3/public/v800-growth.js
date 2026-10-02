(()=>{
'use strict';
const VERSION='8.0.0', FINDKEY='floorGrowthFindingsV8', EXPKEY='floorGrowthExperimentsV8';
const $id=id=>document.getElementById(id);
const n=v=>(v===null||v===undefined||v===''||!Number.isFinite(Number(v)))?null:Number(v);
const pos=v=>{const x=n(v);return x!==null&&x>0?x:null};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const med=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),m=(s.length-1)/2,i=Math.floor(m),j=Math.ceil(m);return i===j?s[i]:s[i]+(s[j]-s[i])*(m-i)};
const quant=(a,p)=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),i=(s.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return l===h?s[l]:s[l]+(s[h]-s[l])*(i-l)};
const percentile=(v,a)=>{if(v===null||!a.length)return null;const cap=quant(a,.97),x=cap===null?v:Math.min(v,cap);let k=0;for(const z of a)if(z<=x)k++;return k/a.length};
const fmtPct=v=>v==null?'—':(v*100).toFixed(v<.1?1:0)+'%';
const normText=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').replace(/[^\u4e00-\u9fa5a-z0-9]+/g,' ').trim();
const siteName=()=>site||db.lastSite||'未知平台';
const nowISO=()=>new Date().toISOString();

function ageDays(x){
  const h=ageHours(x.ageText);
  if(h!=null)return Math.max(.04,h/24);
  const t=String(x.ageText||'');let m=t.match(/(\d+)\s*周/);if(m)return +m[1]*7;
  m=t.match(/(\d+)\s*个月/);if(m)return +m[1]*30;
  m=t.match(/(\d+)\s*年/);if(m)return +m[1]*365;
  return null;
}
function interactions(x,platform){
  if(platform==='闲鱼'){
    const a=[n(x.wants),n(x.comments),n(x.consults)].filter(v=>v!==null);
    return a.length?a.reduce((s,v)=>s+v,0):null;
  }
  if(platform==='小红书'){
    const a=[n(x.likes),n(x.favs),n(x.comments),n(x.shares)].filter(v=>v!==null);
    return a.length?a.reduce((s,v)=>s+v,0):null;
  }
  const a=[n(x.wants),n(x.likes),n(x.favs),n(x.comments),n(x.shares)].filter(v=>v!==null);
  return a.length?a.reduce((s,v)=>s+v,0):null;
}
function materialOf(x){
  const t=(x.title||'')+' '+(x.text||'');
  const m=['红檀香','缅甸柚木','柚木','橡木','白橡','欧橡','紫檀','菠萝格','龙凤檀','二翅豆','圆盘豆','黑胡桃','白蜡木','重蚁木','相思木'];
  return m.find(w=>t.includes(w))||'材质未知';
}
function floorType(x){
  const t=normText((x.title||'')+' '+(x.text||''));
  if(/踢脚线|地脚线|地角线|收口条|扣条|龙骨|防潮膜|地垫|胶水|辅料|压条/.test(t))return'exclude';
  if(/衣柜|橱柜|柜门|柜体|全屋定制|瓷砖|墙板|家具/.test(t)&&!/地板/.test(t))return'exclude';
  if(!/地板|实木|多层|三层|强化|spc|wpc|橡木|柚木|红檀香|龙凤檀|菠萝格|黑胡桃|白蜡木|重蚁木|紫檀/i.test(t))return'exclude';
  if(/spc/i.test(t))return'SPC';if(/wpc/i.test(t))return'WPC';if(/强化/.test(t))return'强化';
  if(/三层/.test(t))return'三层';if(/多层/.test(t))return'多层';if(/实木/.test(t))return'实木';
  return'其他木地板';
}
function conditionOf(x){
  const t=normText((x.title||'')+' '+(x.text||''));
  if(/二手|闲置|拆旧|中古|旧地板/.test(t))return'二手';
  if(/翻新/.test(t))return'翻新';
  if(/全新|新品/.test(t))return'全新';
  return'状态未知';
}
function xhsContentType(x){
  const t=normText((x.title||'')+' '+(x.text||''));
  if(/怎么|为什么|避坑|攻略|科普|区别|选择|选购|知识|干货/.test(t))return'知识/攻略';
  if(/完工|实景|案例|家装|客厅|卧室|装修|铺装效果|现场/.test(t))return'案例/场景';
  if(/价格|特价|清仓|多少钱|预算|性价比/.test(t))return'价格/预算';
  if(/工厂|车间|库存|生产|仓库/.test(t))return'工厂/货源';
  return'产品展示';
}
function priceBand(p,prices){
  if(p===null||prices.length<6)return'价格未知';
  const a=quant(prices,.33),b=quant(prices,.67);return p<=a?'低价段':p<=b?'中价段':'高价段';
}
function ageBand(d){if(d===null)return'时间未知';return d<=7?'近7天':d<=30?'8-30天':'30天以上'}

function bigrams(s){
  s=normText(s).replace(/\s+/g,'');const set=new Set();
  for(let i=0;i<s.length-1;i++)set.add(s.slice(i,i+2));
  return set;
}
function jac(a,b){
  if(!a.size||!b.size)return 0;let i=0;for(const x of a)if(b.has(x))i++;
  return i/(a.size+b.size-i);
}
function preScore(x,platform){
  const d=ageDays(x),eng=interactions(x,platform),views=n(x.views),exp=n(x.exposure??x.impressions),consult=n(x.consults),sales=n(x.sales??x.sold);
  let s=0;
  if(exp!==null)s+=Math.log1p(exp)*1.2;if(views!==null)s+=Math.log1p(views)*2;
  if(eng!==null)s+=Math.log1p(eng)*3;if(consult!==null)s+=Math.log1p(consult)*3;if(sales!==null)s+=Math.log1p(sales)*4;
  if(d!==null&&eng!==null)s+=Math.log1p(eng/Math.max(.25,d))*4;
  return s;
}
function debias(items,platform){
  const sorted=items.slice().sort((a,b)=>preScore(b,platform)-preScore(a,platform));
  const kept=[],sellerCount=new Map(),clusters=[],removed={duplicate:0,seller:0,template:0};
  const exact=new Set();
  for(const x of sorted){
    const title=normText(x.title),body=normText(x.text).slice(0,260),exactKey=(x.productId||x.url||title)+'|'+(n(x.price)??'');
    if(exact.has(exactKey)){removed.duplicate++;continue} exact.add(exactKey);
    const seller=String(x.seller||'').trim();
    if(seller){const c=sellerCount.get(seller)||0;if(c>=3){removed.seller++;continue}sellerCount.set(seller,c+1)}
    const tg=bigrams(title),bg=bigrams(body);
    let similar=false;
    for(const c of clusters){
      if(jac(tg,c.tg)>=.86 || (jac(tg,c.tg)>=.72&&jac(bg,c.bg)>=.78)){similar=true;break}
    }
    if(similar){removed.template++;continue}
    kept.push(x);clusters.push({tg,bg});
  }
  return {items:kept,removed};
}

const PLATFORM={
  '闲鱼':{
    label:'闲鱼',
    featureDefs:[
      ['spec','规格信息完整',x=>/\d{2,4}\s*[x×*]\s*\d{2,4}/i.test((x.title||'')+' '+(x.text||''))],
      ['priceTitle','标题/首屏明确价格',x=>/[¥￥]\s*\d|(\d+(?:\.\d+)?)\s*元/.test(x.title||'')],
      ['stock','现货/库存表达',x=>/现货|库存|仓库/.test((x.title||'')+' '+(x.text||''))],
      ['factory','厂家/货源表达',x=>/工厂|厂家|厂价|车间|一手货源/.test((x.title||'')+' '+(x.text||''))],
      ['logistics','物流/交付明确',x=>/物流|发货|自提|送货|到付|运费/.test((x.title||'')+' '+(x.text||''))],
      ['scene','使用场景切入',x=>/客厅|卧室|家装|装修|原木风|奶油风|铺装|实景|效果/.test((x.title||'')+' '+(x.text||''))],
      ['trust','信任信息',x=>/实拍|可看货|看样|寄样|支持验货|售后|工厂/.test((x.title||'')+' '+(x.text||''))],
      ['cta','咨询行动引导',x=>/私聊|咨询|问我|发面积|发尺寸|联系|沟通/.test((x.title||'')+' '+(x.text||''))]
    ],
    dims(x){
      const exp=pos(x.exposure??x.impressions),views=pos(x.views),wants=n(x.wants),consults=n(x.consults),sales=n(x.sales??x.sold),days=ageDays(x);
      return {
        exposure:exp,views,wants,consults,sales,days,
        clickRate:exp>0&&views!==null?views/exp:null,
        wantRate:views>0&&wants!==null?wants/views:null,
        consultRate:views>0&&consults!==null?consults/views:null,
        saleRate:consults>0&&sales!==null?sales/consults:(views>0&&sales!==null?sales/views:null),
        speed:days!==null?((consults??wants??views??null)!==null?(consults??wants??views)/Math.max(.25,days):null):null
      };
    },
    weights:{exposure:.12,views:.12,clickRate:.22,wantRate:.22,consultRate:.26,saleRate:.30,speed:.18},
    kinds:{exposure:'流量型',views:'流量型',clickRate:'点击型',wantRate:'互动型',consultRate:'咨询型',saleRate:'成交转化型',speed:'异常爆发型'},
    dimLabels:{exposure:'曝光',views:'浏览',clickRate:'浏览率',wantRate:'想要率',consultRate:'咨询率',saleRate:'成交转化',speed:'增长速度'},
    coreCoverage:d=>[d.views,d.wants,d.consults,d.days],
    group(x,strict){
      const type=floorType(x),cond=conditionOf(x),mat=materialOf(x),d=ageDays(x),p=n(x.price);
      return {type,cond,mat,d,p,strict};
    }
  },
  '小红书':{
    label:'小红书',
    featureDefs:[
      ['question','标题问题/好奇心切入',x=>/[？?]|为什么|怎么|到底|区别|避坑/.test(x.title||'')],
      ['scene','真实场景/案例',x=>/实景|案例|完工|客厅|卧室|家装|装修|铺装|现场/.test((x.title||'')+' '+(x.text||''))],
      ['howto','攻略/方法型',x=>/攻略|教程|怎么选|避坑|科普|知识|建议|清单/.test((x.title||'')+' '+(x.text||''))],
      ['specific','标题具体信息',x=>/\d|规格|尺寸|价格|预算|平方|㎡/.test(x.title||'')],
      ['factory','工厂/生产现场',x=>/工厂|车间|生产|仓库|库存/.test((x.title||'')+' '+(x.text||''))],
      ['saveValue','收藏价值表达',x=>/收藏|记住|清单|对比|总结|攻略|避坑/.test((x.title||'')+' '+(x.text||''))],
      ['discussion','讨论/提问引导',x=>/你们|大家|你会|你觉得|评论|怎么选|哪种/.test((x.title||'')+' '+(x.text||''))],
      ['tags','话题/标签完整',x=>/#\S+/.test(x.text||'')]
    ],
    dims(x){
      const views=pos(x.views),likes=n(x.likes),favs=n(x.favs),comments=n(x.comments),shares=n(x.shares),days=ageDays(x);
      const total=[likes,favs,comments,shares].filter(v=>v!==null).reduce((s,v)=>s+v,0);
      const any=[likes,favs,comments,shares].some(v=>v!==null);
      return {
        views,likes,favs,comments,shares,days,
        likeRate:views>0&&likes!==null?likes/views:null,
        favRate:views>0&&favs!==null?favs/views:null,
        commentRate:views>0&&comments!==null?comments/views:null,
        shareRate:views>0&&shares!==null?shares/views:null,
        totalRate:views>0&&any?total/views:null,
        speed:days!==null?(views!==null?views:(any?total:null))/Math.max(.25,days):null
      };
    },
    weights:{views:.18,likeRate:.16,favRate:.27,commentRate:.17,shareRate:.22,totalRate:.18,speed:.18},
    kinds:{views:'流量型',likeRate:'互动型',favRate:'收藏型',commentRate:'评论讨论型',shareRate:'传播型',totalRate:'互动型',speed:'异常爆发型'},
    dimLabels:{views:'浏览',likeRate:'点赞率',favRate:'收藏率',commentRate:'评论率',shareRate:'转发率',totalRate:'综合互动率',speed:'增长速度'},
    coreCoverage:d=>[d.views,d.likes,d.favs,d.comments,d.shares,d.days],
    group(x){return {type:xhsContentType(x),cond:'',mat:materialOf(x),d:ageDays(x),p:null}}
  }
};
PLATFORM.default={
  label:'当前平台',
  featureDefs:PLATFORM['小红书'].featureDefs,
  dims(x){const views=pos(x.views),eng=interactions(x,'default'),days=ageDays(x);return{views,eng,days,engRate:views>0&&eng!==null?eng/views:null,speed:days!==null&&eng!==null?eng/Math.max(.25,days):null}},
  weights:{views:.25,engRate:.45,speed:.30},
  kinds:{views:'流量型',engRate:'互动型',speed:'异常爆发型'},
  dimLabels:{views:'浏览',engRate:'互动率',speed:'增长速度'},
  coreCoverage:d=>[d.views,d.eng,d.days],
  group(x){return{type:'同平台内容',cond:'',mat:materialOf(x),d:ageDays(x),p:n(x.price)}}
};

function platformModel(){return PLATFORM[siteName()]||PLATFORM.default}
function buildComparable(items,model){
  const base=items.filter(x=>{
    if(siteName()==='闲鱼')return floorType(x)!=='exclude';
    return !!String(x.title||'').trim();
  });
  const pricesBy=new Map();
  for(const x of base){
    const g=model.group(x),k=g.type+'|'+g.cond;
    if(!pricesBy.has(k))pricesBy.set(k,[]);
    if(g.p!==null)pricesBy.get(k).push(g.p);
  }
  const rows=base.map(x=>{
    const g=model.group(x),pb=priceBand(g.p,pricesBy.get(g.type+'|'+g.cond)||[]),ab=ageBand(g.d);
    return {...x,__dims:model.dims(x),__g:{...g,pb,ab}};
  });
  const keys=[
    x=>[x.__g.type,x.__g.cond,x.__g.mat,x.__g.pb,x.__g.ab].join('|'),
    x=>[x.__g.type,x.__g.cond,x.__g.pb,x.__g.ab].join('|'),
    x=>[x.__g.type,x.__g.cond,x.__g.pb].join('|'),
    x=>[x.__g.type,x.__g.cond].join('|'),
    x=>x.__g.type
  ];
  const maps=keys.map(fn=>{const m=new Map();for(const x of rows){const k=fn(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x)}return m});
  const usable=[];
  for(const x of rows){
    let cohort=null,key='',level=keys.length-1;
    for(let i=0;i<keys.length;i++){const k=keys[i](x),a=maps[i].get(k)||[];if(a.length>=10){cohort=a;key=k;level=i;break}}
    if(!cohort)continue;
    usable.push({...x,__cohort:cohort,__cohortKey:key,__strictness:level});
  }
  return {raw:base,usable};
}
function scoreRows(usable,model){
  const byCohort=new Map();
  for(const x of usable){if(!byCohort.has(x.__cohortKey))byCohort.set(x.__cohortKey,x.__cohort)}
  return usable.map(x=>{
    const cohort=byCohort.get(x.__cohortKey)||x.__cohort;
    let sum=0,w=0,best={key:null,p:-1};
    for(const [k,wt] of Object.entries(model.weights)){
      const v=x.__dims[k];if(v===null||v===undefined)continue;
      const arr=cohort.map(z=>z.__dims[k]).filter(v=>v!==null&&v!==undefined&&Number.isFinite(v));
      if(arr.length<5)continue;
      const p=percentile(v,arr);if(p===null)continue;
      sum+=p*wt;w+=wt;if(p>best.p)best={key:k,p};
    }
    const completeness=model.coreCoverage(x.__dims).filter(v=>v!==null&&v!==undefined).length/model.coreCoverage(x.__dims).length;
    const score=w?sum/w:null;
    return {...x,__score:score,__complete:completeness,__best:best,__kind:model.kinds[best.key]||'高表现'};
  }).filter(x=>x.__score!==null);
}
function outlierRows(rows){
  const scores=rows.map(x=>x.__score),q1=quant(scores,.25),q3=quant(scores,.75),iqr=(q3??0)-(q1??0),cut=iqr>0?q3+2.5*iqr:quant(scores,.995);
  return rows.map(x=>({...x,__outlier:cut!==null&&x.__score>cut}));
}
function itemReasons(x,model){
  const cohort=x.__cohort||[];const rs=[];
  for(const [k,label] of Object.entries(model.dimLabels)){
    const v=x.__dims[k];if(v===null||v===undefined)continue;
    const arr=cohort.map(z=>z.__dims[k]).filter(v=>v!==null&&v!==undefined&&Number.isFinite(v));
    if(arr.length<5)continue;
    const p=percentile(v,arr);if(p===null||p<.78)continue;
    const top=Math.max(1,Math.round((1-p)*100));
    if(/Rate$/.test(k)||['clickRate','wantRate','consultRate','saleRate','engRate'].includes(k))rs.push(label+' '+fmtPct(v)+'，同类前'+top+'%');
    else if(k==='speed')rs.push(label+'处于同类前'+top+'%');
    else rs.push(label+'处于同类前'+top+'%');
  }
  if(!rs.length)rs.push('综合表现位于同类前列');
  return rs.slice(0,3);
}
function featureEvidence(high,normal,defs,coverage,stability,cycleCount){
  const rank={可以复用:3,值得测试:2,暂无价值:1};
  const z=(p1,n1,p2,n2)=>{if(!n1||!n2)return 0;const p=(p1*n1+p2*n2)/(n1+n2),se=Math.sqrt(Math.max(1e-9,p*(1-p)*(1/n1+1/n2)));return Math.abs(p1-p2)/se};
  return defs.map(([id,label,fn])=>{
    const hc=high.filter(fn).length,nc=normal.filter(fn).length,hp=high.length?hc/high.length:0,np=normal.length?nc/normal.length:0,diff=hp-np,zz=z(hp,high.length,np,normal.length);
    let ev='探索性信号';
    if(high.length>=50&&normal.length>=100&&diff>=.15&&zz>=2&&coverage>=.55&&stability>=.70&&cycleCount>=2)ev='强证据';
    else if(high.length>=30&&normal.length>=60&&diff>=.12&&zz>=1.6&&coverage>=.42&&stability>=.60)ev='中等证据';
    else if(high.length>=10&&normal.length>=30&&diff>=.08)ev='弱证据';
    let category='暂无价值';
    if(ev==='强证据'&&diff>=.15)category='可以复用';
    else if((ev==='中等证据'||ev==='弱证据')&&diff>=.10)category='值得测试';
    else if(ev==='探索性信号'&&diff>=.16&&high.length>=10)category='值得测试';
    return{id,label,hc,nc,hp,np,diff,z:zz,evidence:ev,category,total:high.length+normal.length,cycles:cycleCount};
  }).sort((a,b)=>((rank[b.category]||0)-(rank[a.category]||0))||b.diff-a.diff);
}
function loadFindings(){try{return JSON.parse(localStorage.getItem(FINDKEY)||'[]')}catch{return[]}}
function cycleCount(platform,id){
  const h=loadFindings().filter(x=>x.platform===platform&&x.id===id&&(x.category==='可以复用'||x.category==='值得测试'));
  return new Set(h.map(x=>String(x.at||'').slice(0,10))).size+1;
}
function saveFindings(platform,findings){
  let h=loadFindings();const day=nowISO().slice(0,10);
  h=h.filter(x=>!(x.platform===platform&&String(x.at||'').slice(0,10)===day));
  for(const f of findings.filter(x=>x.category!=='暂无价值').slice(0,5))h.push({platform,id:f.id,label:f.label,category:f.category,evidence:f.evidence,diff:f.diff,at:nowISO()});
  localStorage.setItem(FINDKEY,JSON.stringify(h.slice(-80)));
}
function crossSignal(id,platform){
  const p=new Set(loadFindings().filter(x=>x.id===id&&x.platform!==platform&&(x.category==='可以复用'||x.category==='值得测试')).map(x=>x.platform));
  return p.size?('跨平台也出现于 '+[...p].join('、')):'';
}
function batchItems(){
  const all=db.items.filter(x=>x.site===siteName()).map(enrich),stamp=db.lastCapturedAt,expected=Number(db.lastValidCount||(db.lastMeta&&db.lastMeta.validCount)||0);
  let batch=stamp?all.filter(x=>x._capturedAt===stamp):[];
  if(batch.length<Math.min(20,expected||20)&&expected>0)batch=all.slice().sort((a,b)=>new Date(b._capturedAt||0)-new Date(a._capturedAt||0)).slice(0,Math.min(expected,all.length));
  return batch.length?batch:all;
}
function analyze(){
  const platform=siteName(),model=platformModel(),batch=batchItems();
  if(!batch.length)return{platform,model,batch:[],empty:true};
  const comparable0=buildComparable(batch,model),deb=debias(comparable0.usable,platform),rescored=scoreRows(deb.items,model),rows=outlierRows(rescored);
  const anomalies=rows.filter(x=>x.__outlier),normalPool=rows.filter(x=>!x.__outlier).sort((a,b)=>b.__score-a.__score);
  const highN=normalPool.length?Math.max(1,Math.ceil(normalPool.length*.20)):0,high=normalPool.slice(0,highN),normal=normalPool.slice(highN);
  const covVals=normalPool.flatMap(x=>model.coreCoverage(x.__dims)).filter(v=>v!==null&&v!==undefined);
  const possible=normalPool.length*(normalPool[0]?model.coreCoverage(normalPool[0].__dims).length:1),coverage=possible?covVals.length/possible:0;
  const stability=comparable0.usable.length?deb.items.length/comparable0.usable.length:0;
  const defs=model.featureDefs;
  const preliminary=defs.map(d=>({id:d[0]}));
  const findings=featureEvidence(high,normal,defs,coverage,stability,1);
  for(const f of findings){f.cycles=cycleCount(platform,f.id)}
  const findings2=featureEvidence(high,normal,defs,coverage,stability,1);
  // restore per-feature cycle counts and cross-platform notes
  for(const f of findings2){f.cycles=cycleCount(platform,f.id);f.cross=crossSignal(f.id,platform)}
  // re-evaluate strong evidence with its own repeated-cycle count
  for(const f of findings2){
    if(f.cycles>=2&&f.evidence==='中等证据'&&high.length>=50&&normal.length>=100&&f.diff>=.15&&f.z>=2&&coverage>=.55&&stability>=.70)f.evidence='强证据';
    if(f.evidence==='强证据'&&f.diff>=.15)f.category='可以复用';
  }
  const reusable=findings2.filter(f=>f.category==='可以复用'),testable=findings2.filter(f=>f.category==='值得测试'),none=findings2.filter(f=>f.category==='暂无价值');
  const types={};for(const x of high)types[x.__kind]=(types[x.__kind]||0)+1;
  const dominant=Object.entries(types).sort((a,b)=>b[1]-a[1])[0]?.[0]||'高表现';
  const typeFindings={};
  for(const [kind,count] of Object.entries(types)){
    if(count<5)continue;
    const subset=high.filter(x=>x.__kind===kind);
    typeFindings[kind]=featureEvidence(subset,normal,defs,coverage,stability,1).filter(f=>f.diff>=.08).slice(0,3);
  }
  const anomalyCases=anomalies.slice(0,6).map(x=>{
    const cp=x.__cohort||[],prices=cp.map(z=>n(z.price)).filter(v=>v!==null),pm=med(prices),p=n(x.price),d=ageDays(x);
    let mark='值得研究';
    if(p!==null&&pm!==null&&p<pm*.55)mark='特殊低价';
    else if(d!==null&&d>90)mark='上架时间较久';
    else if(x.__complete<.4)mark='数据异常/覆盖不足';
    return {title:x.title,url:x.url,mark};
  });
  let conf='低',confClass='low';
  if(high.length>=50&&normal.length>=100&&coverage>=.55&&stability>=.70){conf='高';confClass='good'}
  else if(high.length>=30&&normal.length>=60&&coverage>=.40){conf='中';confClass='base'}
  else if(high.length>=10){conf='低';confClass='low'}
  else conf='探索';
  const strongest=reusable[0]||testable[0]||findings2[0]||null;
  saveFindings(platform,findings2);
  return{platform,model,batch,rawComparable:comparable0.usable.length,debias:deb,rows:normalPool,high,normal,anomalies,anomalyCases,typeFindings,findings:findings2,reusable,testable,none,coverage,stability,confidence:[conf,confClass],strongest,dominant,empty:false};
}

function ensureUI(){
  const oldStats=document.querySelector('.stats');if(oldStats)oldStats.classList.add('v8-hidden');
  const oldMarket=$id('marketAnalysisCard');if(oldMarket)oldMarket.classList.add('v8-hidden');
  const genInput=$id('genKeyword'),genCard=genInput?.closest('.card');
  if(genCard){genCard.id='v8GeneratorCard';const label=genCard.querySelector('.label');if(label)label.textContent='下一条内容怎么发';const muted=genCard.querySelector('.head .muted');if(muted)muted.textContent='根据当前平台自己的高价值模型和本轮有效信号生成；一次只测试一个主要变量。'}
  const capture=[...document.querySelectorAll('.card')].find(c=>c.querySelector('.label')?.textContent.includes('抓取数据'));
  let d=$id('v8Decision');
  if(!d){
    d=document.createElement('section');d.id='v8Decision';d.className='v8-decision';
    d.innerHTML='<div class="v8-kicker">本轮结果</div><div class="v8-hero"><div class="v8-main"><div class="v8-title" id="v8Conclusion">等待数据</div><div class="v8-why" id="v8Why">完成一次抓取后，这里只保留最重要的结论。</div></div><div class="v8-action"><small>下一条最值得测试</small><b id="v8Action">先完成抓取</b><span id="v8ActionSub">一次只改变一个主要变量。</span></div></div><div class="v8-metrics" id="v8Metrics"></div><div class="v8-section"><div class="v8-section-head"><b>高价值内容为什么表现好</b><span>最多3个关键原因</span></div><div class="v8-reasons" id="v8Reasons"></div></div><div class="v8-section"><div class="v8-section-head"><b>关键证据</b><button class="v8-details-btn" id="v8DetailsBtn">查看分析依据</button></div><div class="v8-details" id="v8Details"><div class="v8-pools" id="v8Pools"></div><div class="v8-evidence" id="v8Evidence"></div><div class="v8-section-head" style="margin-top:10px"><b>高价值参考</b><span id="v8HighLabel"></span></div><div class="v8-high-list" id="v8HighList"></div><div class="v8-section-head" style="margin-top:10px"><b>异常高表现案例</b><span>不参与普通规律计算</span></div><div class="v8-high-list" id="v8AnomalyList"></div></div></div>';
    document.querySelector('.top')?.after(d);
    $id('v8DetailsBtn').onclick=()=>{$id('v8Details').classList.toggle('show');$id('v8DetailsBtn').textContent=$id('v8Details').classList.contains('show')?'收起分析依据':'查看分析依据'};
  }
  if(genCard&&d.nextElementSibling!==genCard) d.after(genCard);

  const raw=[...document.querySelectorAll('.card')].find(c=>c.querySelector('.label')?.textContent==='抓取结果');
  if(raw&&!raw.dataset.v8){
    raw.dataset.v8='1';const head=raw.querySelector('.head');if(head)head.querySelector('.muted').textContent='原始数据默认折叠，只在需要核查证据时展开。';
    const body=document.createElement('div');body.className='v8-raw-wrap';body.id='v8RawBody';
    [...raw.children].filter(x=>x!==head).forEach(x=>body.appendChild(x));
    const btn=document.createElement('button');btn.className='v8-raw-toggle';btn.innerHTML='<span>查看原始数据</span><span>展开</span>';
    btn.onclick=()=>{body.classList.toggle('show');btn.lastElementChild.textContent=body.classList.contains('show')?'收起':'展开'};
    raw.appendChild(btn);raw.appendChild(body);
  }
  if(genCard&&!$id('v8Feedback')){
    const actions=genCard.querySelector('.output-actions');
    if(actions){const b=document.createElement('button');b.id='v8FeedbackBtn';b.className='secondary btn';b.textContent='记录发布结果';actions.appendChild(b)}
    const box=document.createElement('div');box.id='v8Feedback';box.className='v8-feedback';box.innerHTML='<div class="panel-title">记录本轮实际结果</div><div class="v8-feedback-grid" id="v8FeedbackGrid"></div><div class="v8-feedback-actions"><button id="v8SaveFeedback" class="primary">保存结果</button><button id="v8CancelFeedback" class="secondary">取消</button></div>';
    genCard.appendChild(box);
    $id('v8FeedbackBtn').onclick=()=>{renderFeedbackFields();box.classList.toggle('show')};
    $id('v8CancelFeedback').onclick=()=>box.classList.remove('show');
    $id('v8SaveFeedback').onclick=saveFeedback;
  }
}
function metricsFor(r){
  const model=r.model,platform=r.platform,high=r.high.length,valid=r.rows.length+r.anomalies.length;
  let coverage=Math.round(r.coverage*100)+'%';
  let metricLabel=platform==='闲鱼'?'关键表现覆盖':platform==='小红书'?'浏览/互动覆盖':'核心指标覆盖';
  const sig=r.strongest?r.strongest.label:'暂无稳定信号';
  return [
    [valid,platform==='小红书'?'有效笔记':'有效样本'],
    [high,platform==='小红书'?'高价值笔记':'高价值样本'],
    [coverage,metricLabel],
    [sig,'本轮最强信号'],
    [r.confidence[0],'综合可信度']
  ];
}
function renderDecision(r){
  ensureUI();
  if(r.empty){
    $id('v8Conclusion').textContent='先抓取一轮真实数据';
    $id('v8Why').textContent='系统会按当前平台自己的行为链识别高价值内容，而不是套统一爆款分数。';
    $id('v8Action').textContent='完成一次抓取';
    $id('v8Metrics').innerHTML='';$id('v8Reasons').innerHTML='';$id('v8Evidence').innerHTML='';$id('v8HighList').innerHTML='';return;
  }
  const s=r.strongest,lead=s?(s.category==='可以复用'?'可以复用：':'值得测试：')+s.label:'本轮没有足够稳定的内容规律';
  $id('v8Conclusion').textContent=lead;
  $id('v8Why').innerHTML=s?('高表现组 '+s.hc+'/'+r.high.length+' = <b>'+fmtPct(s.hp)+'</b>，普通组 '+s.nc+'/'+r.normal.length+' = <b>'+fmtPct(s.np)+'</b>，差异 <b>'+(s.diff>=0?'+':'')+Math.round(s.diff*100)+'%</b>；'+s.evidence+'。'):'本轮高低表现组差异不足，系统不会为了“有结论”而硬凑规律。';
  $id('v8Action').textContent=s&&s.category!=='暂无价值'?'下一条只测试「'+s.label+'」':'保持当前方案，先补更多有效数据';
  $id('v8ActionSub').textContent=s&&s.category!=='暂无价值'?'价格、主体产品信息、发布时间等尽量保持接近，用下一轮结果验证这个相关性。':'当前证据不足，不建议同时改多个变量。';
  $id('v8Metrics').innerHTML=metricsFor(r).map(([v,l])=>'<div class="v8-metric"><b>'+esc(v)+'</b><span>'+esc(l)+'</span></div>').join('');
  const reasons=[];
  if(r.dominant){const tf=(r.typeFindings&&r.typeFindings[r.dominant]||[])[0];reasons.push(['主要高价值类型：'+r.dominant,tf?('这一类型最明显的差异是「'+tf.label+'」，相对普通组 '+(tf.diff>=0?'+':'')+Math.round(tf.diff*100)+'%。'):('高价值内容不是一种“好”，当前这一轮主要赢在 '+r.dominant+'。')]);}
  for(const f of r.reusable.concat(r.testable).slice(0,2))reasons.push([f.label,(f.category==='可以复用'?'去偏后仍较稳定':'存在明显信号，仍需实测')+'；高表现 '+fmtPct(f.hp)+' / 普通 '+fmtPct(f.np)+'。']);
  if(reasons.length<3&&r.anomalies.length)reasons.push(['异常爆发案例单独研究',r.anomalies.length+' 条异常高表现已剥离，不会直接拉动普通规律。']);
  $id('v8Reasons').innerHTML=reasons.slice(0,3).map((x,i)=>'<div class="v8-reason"><strong>'+(i+1)+'. '+esc(x[0])+'</strong><span>'+esc(x[1])+'</span></div>').join('')||'<div class="v8-reason"><strong>暂无足够稳定原因</strong><span>继续补样本，不硬凑结论。</span></div>';
  $id('v8Pools').innerHTML='<span class="v8-chip good">可以复用 '+r.reusable.length+'</span><span class="v8-chip test">值得测试 '+r.testable.length+'</span><span class="v8-chip none">暂无价值 '+r.none.length+'</span><span class="v8-chip">去偏保留 '+Math.round(r.stability*100)+'%</span><span class="v8-chip">异常案例 '+r.anomalies.length+'</span>';
  $id('v8Evidence').innerHTML=r.findings.slice(0,6).map(f=>'<div class="v8-evidence-row"><b>'+esc(f.label)+' · '+esc(f.category)+'</b><em>'+(f.diff>=0?'+':'')+Math.round(f.diff*100)+'%</em><span>高表现 '+f.hc+'/'+r.high.length+' = '+fmtPct(f.hp)+'｜普通 '+f.nc+'/'+r.normal.length+' = '+fmtPct(f.np)+'｜样本 '+f.total+'｜'+f.evidence+(f.cycles>1?'｜连续 '+f.cycles+' 轮出现':'')+(f.cross?'｜'+esc(f.cross):'')+'</span></div>').join('');
  $id('v8HighLabel').textContent='动态前20%，这里只展示前6条';
  $id('v8HighList').innerHTML=r.high.slice(0,6).map((x,i)=>{
    const rr=itemReasons(x,r.model);
    return '<a class="v8-high" href="'+esc(x.url||'#')+'" target="_blank" rel="noopener"><div class="v8-no">'+(i+1)+'</div><div><b>'+esc(x.title||'未命名')+'</b><span>'+esc(x.__kind)+' · '+esc(rr.join('；'))+'</span></div><div class="v8-open">打开</div></a>';
  }).join('');
  if($id('v8AnomalyList'))$id('v8AnomalyList').innerHTML=r.anomalyCases.length?r.anomalyCases.map((x,i)=>'<a class="v8-high" href="'+esc(x.url||'#')+'" target="_blank" rel="noopener"><div class="v8-no">'+(i+1)+'</div><div><b>'+esc(x.title||'未命名')+'</b><span>'+esc(x.mark)+'</span></div><div class="v8-open">打开</div></a>').join(''):'<div class="v8-reason"><strong>本轮无明显异常爆发案例</strong><span>没有异常值需要单独剥离研究。</span></div>';
}
function parseProduct(raw){
  const spec=(raw.match(/\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/i)||[])[0]||'';
  const pm=raw.match(/(?:¥|￥)?\s*(\d+(?:\.\d+)?)\s*元(?:\/㎡|每平方|一平|平)?/),price=pm?pm[1]:'';
  const mats=['红檀香','缅甸柚木','柚木','橡木','白橡','欧橡','紫檀','菠萝格','龙凤檀','黑胡桃','白蜡木','重蚁木'];
  const mat=mats.find(x=>raw.includes(x))||raw.split(/[\s,，/|]+/).find(x=>x.length>=2&&!/^\d/.test(x))||'实木地板';
  return{raw,spec,price,mat,facts:{stock:/现货|库存/.test(raw),factory:/工厂|厂家/.test(raw),sample:/寄样|样板|看样/.test(raw),logistics:/物流|发货|自提/.test(raw)}};
}
function personalSignal(platform,label){
  let a=[];try{a=JSON.parse(localStorage.getItem(EXPKEY)||'[]')}catch{}
  const rows=a.filter(x=>x.platform===platform&&x.strategy===label&&x.metrics);
  if(rows.length<3)return null;
  const vals=rows.map(x=>n(x.performance)).filter(v=>v!==null);
  return vals.length?med(vals):null;
}
function chooseSignal(r,seed){
  const pool=r.reusable.concat(r.testable);
  if(!pool.length)return null;
  const scored=pool.map((f,i)=>({f,score:(f.category==='可以复用'?3:2)+Math.max(0,f.diff)*4+(personalSignal(r.platform,f.label)||0)*.5-i*.01}));
  scored.sort((a,b)=>b.score-a.score);
  return scored[seed%scored.length].f;
}
function generateXianyu(p,signal){
  const name=p.mat.includes('地板')?p.mat:p.mat+'实木地板',id=signal.id;
  let title='',body='';
  if(id==='scene'){title='家里准备铺'+p.mat+'？先把规格和铺法确认清楚';body='准备家装在看'+p.mat+'，建议先把面积、铺法和实际规格确认清楚。'+(p.spec?'\n规格：'+p.spec+'。':'')+(p.price?'\n参考价：'+p.price+'元/㎡。':'')+'\n\n把面积和想做的铺法发过来，可以先核对用量和规格。';}
  else if(id==='spec'){title=[name,p.spec,p.price?p.price+'元/㎡':''].filter(Boolean).join(' ');body=name+(p.spec?'，规格 '+p.spec:'')+(p.price?'，'+p.price+'元/㎡':'')+'。\n\n规格、面积和铺法先确认清楚，再核算实际用量；需要对比板面或尺寸可以直接沟通。';}
  else if(id==='priceTitle'&&p.price){title=p.price+'元/㎡ '+name+(p.spec?' '+p.spec:'');body=name+(p.spec?'，规格 '+p.spec:'')+'，参考价 '+p.price+'元/㎡。\n\n价格先写明，实际用量仍按面积和铺法核算，需要可以把面积发过来。';}
  else if(id==='stock'&&p.facts.stock){title=[name,'现货',p.spec].filter(Boolean).join(' ');body=name+(p.spec?'，规格 '+p.spec:'')+'，现货情况按实际数量确认。\n\n需要看板面、核算数量或确认发货安排，可以直接沟通。';}
  else if(id==='factory'&&p.facts.factory){title=[name,'工厂直供',p.spec].filter(Boolean).join(' ');body=name+(p.spec?'，规格 '+p.spec:'')+'。\n\n这条重点把货源和产品信息说清楚，不堆形容词。需要确认数量、板面或铺法可以直接沟通。';}
  else if(id==='logistics'&&p.facts.logistics){title=[name,p.spec,'支持物流'].filter(Boolean).join(' ');body=name+(p.spec?'，规格 '+p.spec:'')+'。\n\n面积和数量确认后再核对运输方式与费用，外地可按实际地址确认物流。';}
  else{title=[name,p.spec,p.price?p.price+'元/㎡':''].filter(Boolean).join(' ');body=name+(p.spec?'，规格 '+p.spec:'')+(p.price?'，参考价 '+p.price+'元/㎡':'')+'。\n\n商品信息直接写清楚，面积、铺法和现场条件不同，用量会有差异；有实际需求可以直接核对。';}
  return{title,body,tags:[p.mat,p.mat.includes('地板')?null:p.mat+'地板','实木地板'].filter(Boolean).join(' / '),cover:'首图只围绕本轮变量配合，其他视觉条件尽量保持接近。'};
}
function generateXhs(p,signal){
  const id=signal.id;let title='',body='',cover='';
  if(id==='scene'){title='同样是'+p.mat+'，铺进家里和单看板完全不一样';body='这次不讲一堆木材形容词，直接看实际空间里的效果。\n\n选'+p.mat+'时，我更建议把采光、柜体颜色、铺法和面积一起看。'+(p.spec?'这款规格是 '+p.spec+'。':'')+'\n\n如果正在装修，可以先从实际空间出发，再决定木种和规格。';cover='真实铺装/空间场景，减少纯产品白底图。';}
  else if(id==='question'){title=p.mat+'地板到底怎么选？我会先看这3件事';body='看'+p.mat+'，我不会先从“高级不高级”开始。\n\n第一看实际空间和采光，第二看规格与铺法，第三看预算和后期使用。'+(p.spec?'\n这款规格：'+p.spec+'。':'')+'\n\n把选择条件说清楚，比单纯堆卖点更有参考价值。';cover='封面只突出一个问题，不同时塞多个卖点。';}
  else if(id==='howto'||id==='saveValue'){title='准备铺'+p.mat+'的，可以先把这几点记下来';body='准备铺实木地板时，建议先确认：\n1. 面积和损耗\n2. 铺法和规格\n3. 柜体、门套和收口\n4. 实际板面与色差\n\n'+(p.spec?'当前这款规格是 '+p.spec+'。':'')+'先把这些确定，再看具体产品会更高效。';cover='清单式封面，突出“先确认哪几件事”。';}
  else if(id==='factory'&&p.facts.factory){title='刚在工厂看到一批'+p.mat+'，顺手拍给你们看';body='刚生产好的'+p.mat+'，先看真实板面，不做过度滤镜。\n\n'+(p.spec?'规格：'+p.spec+'。':'')+'实际家装里还要结合采光、铺法和柜体颜色一起判断。\n\n这类工厂现场内容我会尽量把真实状态拍清楚。';cover='工厂现场/刚下线产品实拍。';}
  else{title='最近在看'+p.mat+'，有几个细节比颜色更值得先确认';body='如果准备铺'+p.mat+'，建议先确认规格、铺法、面积和现场收口，再看具体颜色。'+(p.spec?'\n规格：'+p.spec+'。':'')+'\n\n实际空间条件不同，最后效果也会不同，先从真实使用场景出发更容易选。';cover='真实产品或空间图，标题只保留一个明确切入点。';}
  return{title,body,tags:'#'+[p.mat,p.mat.includes('地板')?null:p.mat+'地板','实木地板','装修'].filter(Boolean).join(' #'),cover};
}
function saveDraft(r,signal,out,raw){
  let a=[];try{a=JSON.parse(localStorage.getItem(EXPKEY)||'[]')}catch{}
  a.push({id:'exp_'+Date.now(),platform:r.platform,product:raw,strategy:signal.label,signalId:signal.id,category:signal.category,evidence:signal.evidence,title:out.title,body:out.body,cover:out.cover,createdAt:nowISO(),status:'draft'});
  localStorage.setItem(EXPKEY,JSON.stringify(a.slice(-100)));
}
function installGenerator(){
  const btn=$id('generate'),regen=$id('regen');if(!btn||!regen)return;
  window.v8Seed=0;
  function run(){
    const raw=$id('genKeyword').value.trim();if(!raw)return setStatus('请先输入你准备发布的商品信息。','bad');
    const r=window.__v8Analysis||analyze();if(r.empty)return setStatus('先完成抓取。','warn');
    const signal=chooseSignal(r,window.v8Seed);if(!signal)return setStatus('本轮没有“可以复用”或“值得测试”的可靠信号，暂不硬生成。','warn');
    const p=parseProduct(raw),out=r.platform==='小红书'?generateXhs(p,signal):generateXianyu(p,signal);
    $id('gConfidence').textContent=signal.category+' · '+signal.evidence;$id('gConfidence').className='confidence '+(signal.category==='可以复用'?'good':'base');
    $id('gEvidence').textContent='当前平台：'+r.platform+'｜本轮只测试「'+signal.label+'」｜高表现 '+fmtPct(signal.hp)+' / 普通 '+fmtPct(signal.np)+' / 差异 '+(signal.diff>=0?'+':'')+Math.round(signal.diff*100)+'%。';
    $id('gRelated').textContent=r.high.length+' 高价值 / '+r.normal.length+' 普通';$id('gRelatedSub').textContent='生成策略来自当前平台自己的高价值模型。';
    $id('gTitlePlan').textContent=signal.label;$id('gTitleSub').textContent='只改变这个主要变量，其他变量尽量保持稳定。';
    $id('gPricePlan').textContent=p.price?p.price+'元/㎡':'不编造价格';$id('gPriceSub').textContent=p.price?'使用你输入的真实价格。':'未提供价格就不自动补。';
    $id('gBodyPlan').textContent=r.platform==='小红书'?'按内容价值与互动链设计':'按搜索→浏览→想要/咨询链设计';$id('gBodySub').textContent='平台不同，生成逻辑不同。';
    $id('gImagePlan').textContent=out.cover;$id('gImageSub').textContent='首图/封面只服务当前测试变量。';
    $id('gSignalPlan').textContent='本轮主测试：'+signal.label;$id('gSignalSub').textContent='下一轮数据回来后再验证，不把相关性写成因果。';
    $id('genTitle').textContent=out.title;$id('genBody').textContent=out.body;$id('genTags').textContent=out.tags;
    lastGenerated='标题：\n'+out.title+'\n\n正文：\n'+out.body+'\n\n标签/搜索词：\n'+out.tags+'\n\n本轮测试变量：'+signal.label;
    $id('sourceList').innerHTML=r.high.slice(0,3).map(x=>'<a class="source-card" href="'+esc(x.url||'#')+'" target="_blank" rel="noopener"><div class="source-main"><b>'+esc(x.title||'')+'</b><span>'+esc(x.__kind)+' · '+esc(itemReasons(x,r.model).join('；'))+'</span></div><span class="source-open">打开</span></a>').join('');
    saveDraft(r,signal,out,raw);setStatus('已按 '+r.platform+' 本轮分析生成；只测试「'+signal.label+'」。','oktxt');
  }
  btn.onclick=()=>{window.v8Seed=0;run()};regen.onclick=()=>{window.v8Seed++;run()};
}
function feedbackFields(platform){
  if(platform==='闲鱼')return[['exposure','曝光'],['views','浏览'],['wants','想要'],['consults','咨询'],['sales','成交'],['days','发布天数']];
  if(platform==='小红书')return[['views','浏览'],['likes','点赞'],['favs','收藏'],['comments','评论'],['shares','转发'],['days','发布天数']];
  return[['views','浏览'],['likes','互动'],['days','发布天数']];
}
function renderFeedbackFields(){
  const p=siteName(),a=feedbackFields(p);$id('v8FeedbackGrid').innerHTML=a.map(([k,l])=>'<label><span class="muted">'+l+'</span><input inputmode="decimal" data-k="'+k+'" placeholder="'+l+'"></label>').join('');
}
function saveFeedback(){
  let a=[];try{a=JSON.parse(localStorage.getItem(EXPKEY)||'[]')}catch{}
  const draft=[...a].reverse().find(x=>x.platform===siteName()&&x.status==='draft');
  if(!draft)return setStatus('先生成一条测试内容，再记录结果。','warn');
  const metrics={};$id('v8FeedbackGrid').querySelectorAll('input').forEach(i=>{const v=n(i.value);if(v!==null)metrics[i.dataset.k]=v});
  const days=metrics.days||1;let perf=null;
  if(siteName()==='闲鱼'){perf=(metrics.consults??metrics.wants??metrics.views??0)/Math.max(.25,days)}
  else if(siteName()==='小红书'){const total=(metrics.likes||0)+(metrics.favs||0)+(metrics.comments||0)+(metrics.shares||0);perf=metrics.views?total/metrics.views:total/Math.max(.25,days)}
  else perf=(metrics.views||0)/Math.max(.25,days);
  draft.metrics=metrics;draft.performance=perf;draft.status='measured';draft.measuredAt=nowISO();
  localStorage.setItem(EXPKEY,JSON.stringify(a.slice(-100)));$id('v8Feedback').classList.remove('show');setStatus('本轮实际结果已记录，后续同平台生成会逐步提高你自己的历史测试权重。','oktxt');
}
function runAll(){
  ensureUI();
  const r=analyze();window.__v8Analysis=r;renderDecision(r);installGenerator();
  const top=document.querySelector('.top h1');if(top)top.textContent='多平台内容增长决策系统';
  const sub=document.querySelector('.top .sub');if(sub)sub.textContent='找到高表现内容 → 解释为什么好 → 提炼下一条最值得测试的变量';
  const badge=document.querySelector('.badge');if(badge)badge.textContent='V8.0';
  document.title='多平台内容增长决策系统 V8.0';
}
const oldRender=window.render;
if(typeof oldRender==='function'){
  window.render=function(){const v=oldRender.apply(this,arguments);setTimeout(runAll,40);return v};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(runAll,80));
else setTimeout(runAll,80);
})();