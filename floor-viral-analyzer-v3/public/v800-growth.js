(()=>{
'use strict';
const VERSION='8.1.4';
const EXPKEY='floorGrowthExperimentsV81';
const REPORTKEY='floorGrowthReportsV814';
const $id=id=>document.getElementById(id);
const num=v=>(v===null||v===undefined||v===''||!Number.isFinite(Number(v)))?null:Number(v);
const pos=v=>{const x=num(v);return x!==null&&x>0?x:null};
const normText=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').replace(/[^\u4e00-\u9fa5a-z0-9#×x㎡?？]+/g,' ').trim();
const fmtPct=v=>v==null?'—':(v*100).toFixed(v<.1?1:0)+'%';
const nowISO=()=>new Date().toISOString();
const currentPlatform=()=>site||db.lastSite||'未知平台';
const quant=(a,p)=>{if(!a.length)return null;const s=a.slice().sort((a,b)=>a-b),i=(s.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return l===h?s[l]:s[l]+(s[h]-s[l])*(i-l)};
const percentile=(v,a)=>{if(v===null||!a.length)return null;const cap=quant(a,.97),x=cap===null?v:Math.min(v,cap);let n=0;for(const z of a)if(z<=x)n++;return n/a.length};

function ageDays(x){
  const h=ageHours(x.ageText);if(h!=null)return Math.max(.04,h/24);
  const t=String(x.ageText||'');let m=t.match(/(\d+)\s*周/);if(m)return +m[1]*7;
  m=t.match(/(\d+)\s*个月/);if(m)return +m[1]*30;
  m=t.match(/(\d+)\s*年/);if(m)return +m[1]*365;
  return null;
}
function materialOf(x){
  const t=(x.title||'')+' '+(x.text||'');
  const a=['红檀香','缅甸柚木','柚木','橡木','白橡','欧橡','紫檀','菠萝格','龙凤檀','二翅豆','圆盘豆','黑胡桃','白蜡木','重蚁木','相思木'];
  return a.find(w=>t.includes(w))||'材质未知';
}
function xhsType(x){
  const t=normText((x.title||'')+' '+(x.text||''));
  if(/怎么|为什么|避坑|攻略|科普|区别|选择|选购|知识|干货|清单/.test(t))return'知识/攻略';
  if(/完工|实景|案例|家装|客厅|卧室|装修|铺装效果|现场/.test(t))return'案例/场景';
  if(/价格|特价|清仓|多少钱|预算|性价比/.test(t))return'价格/预算';
  if(/工厂|车间|库存|生产|仓库/.test(t))return'工厂/货源';
  return'产品展示';
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
function bigrams(s){s=normText(s).replace(/\s+/g,'');const o=new Set();for(let i=0;i<s.length-1;i++)o.add(s.slice(i,i+2));return o}
function jac(a,b){if(!a.size||!b.size)return 0;let n=0;for(const x of a)if(b.has(x))n++;return n/(a.size+b.size-n)}
function rawInteraction(x,p){
  if(p==='小红书'){const a=[num(x.likes),num(x.favs),num(x.comments),num(x.shares)].filter(v=>v!==null);return a.length?a.reduce((s,v)=>s+v,0):null}
  const a=[num(x.wants),num(x.comments),num(x.consults)].filter(v=>v!==null);return a.length?a.reduce((s,v)=>s+v,0):null;
}
function preScore(x,p){
  const d=ageDays(x),eng=rawInteraction(x,p),views=pos(x.views);let s=0;
  if(views!==null)s+=Math.log1p(views)*2;if(eng!==null)s+=Math.log1p(eng)*3;if(d!==null&&eng!==null)s+=Math.log1p(eng/Math.max(.25,d))*3;
  return s;
}
function debias(items,p){
  const sorted=items.slice().sort((a,b)=>preScore(b,p)-preScore(a,p)),kept=[],sellerCount=new Map(),clusters=[],exact=new Set(),removed={duplicate:0,seller:0,template:0};
  for(const x of sorted){
    const title=normText(x.title),body=normText(x.text).slice(0,260),key=(x.productId||x.url||title)+'|'+(num(x.price)??'');
    if(exact.has(key)){removed.duplicate++;continue}exact.add(key);
    const seller=String(x.seller||'').trim();if(seller){const n=sellerCount.get(seller)||0;if(n>=3){removed.seller++;continue}sellerCount.set(seller,n+1)}
    const tg=bigrams(title),bg=bigrams(body);let similar=false;
    for(const c of clusters){if(jac(tg,c.tg)>=.88||(jac(tg,c.tg)>=.74&&jac(bg,c.bg)>=.80)){similar=true;break}}
    if(similar){removed.template++;continue}
    kept.push(x);clusters.push({tg,bg});
  }
  return{items:kept,removed};
}

const XHS_FEATURES=[
  ['titleSpec','标题加入具体规格数字',x=>/\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/i.test(x.title||'')],
  ['titleNumber','标题加入具体数字',x=>/\d/.test(x.title||'')],
  ['titlePrice','标题直接出现具体价格',x=>/[¥￥]\s*\d|\d+(?:\.\d+)?\s*元/.test(x.title||'')],
  ['titleMaterial','标题直接出现具体木种',x=>/(红檀香|缅甸柚木|柚木|橡木|白橡|欧橡|紫檀|菠萝格|龙凤檀|黑胡桃|白蜡木|重蚁木)/.test(x.title||'')],
  ['titleScene','标题直接出现使用场景',x=>/客厅|卧室|家装|装修|新房|老房|民宿|办公室|写字楼|地暖/.test(x.title||'')],
  ['titleQuestion','标题用具体问题切入',x=>/[？?]|为什么|怎么选|到底|能不能|值不值/.test(x.title||'')],
  ['titleResult','标题直接出现使用结果',x=>/用了|实测|装完|铺完|住了|后悔|真话|效果|翻车|踩坑/.test(x.title||'')],
  ['titleCompare','标题加入明确对比/反差',x=>/对比|区别|vs|VS|还是|不一样|差别|没想到|居然|一砸一个坑|别买|真相/.test(x.title||'')],
  ['titleLayout','标题出现具体户型',x=>/\d室|\d房|一居|两居|三居|四居|户型/.test(x.title||'')],
  ['titleArea','标题出现具体面积',x=>/\d+(?:\.\d+)?\s*(?:㎡|平米|平方)/.test(x.title||'')],
  ['titleInstall','标题出现具体施工/铺法',x=>/鱼骨|人字|工字|369|自由拼|悬浮|平扣|锁扣|龙骨|直铺/.test(x.title||'')],
  ['sceneBody','正文从真实使用场景切入',x=>/客厅|卧室|家装|装修|新房|老房|实际空间|铺进家里|现场/.test((x.text||'').slice(0,220))],
  ['howto','正文采用攻略/清单结构',x=>/攻略|清单|第一|第二|1[.、]|2[.、]|怎么选|避坑/.test(x.text||'')],
  ['saveValue','正文强调可收藏的信息价值',x=>/清单|记住|收藏|对比|总结|避坑|尺寸|用量/.test(x.text||'')],
  ['discussion','正文有明确讨论触发',x=>/你们|大家|你会|你觉得|评论|怎么选|哪种|你家/.test(x.text||'')],
  ['experience','正文使用真实经验/结果表达',x=>/用了|使用|实测|真话|后悔|踩坑|翻车|住了|装完|完工/.test((x.title||'')+' '+(x.text||''))],
  ['factory','内容直接展示工厂/生产现场',x=>/工厂|车间|生产|仓库|刚下线|刚生产/.test((x.title||'')+' '+(x.text||''))],
  ['coverScene','封面为真实使用/铺装场景',x=>/实景|场景|铺装|家装|案例/.test(String(x.coverType||x.imageType||''))],
  ['video','内容形式为视频',x=>/视频/.test(String(x.contentType||''))]
];
const XY_FEATURES=[
  ['spec','标题带具体规格',x=>/\d{2,4}\s*[x×*]\s*\d{2,4}/i.test(x.title||'')],
  ['priceTitle','标题直接写价格',x=>/[¥￥]\s*\d|\d+(?:\.\d+)?\s*元/.test(x.title||'')],
  ['stock','现货/库存表达',x=>/现货|库存|仓库/.test((x.title||'')+' '+(x.text||''))],
  ['factory','厂家/货源表达',x=>/工厂|厂家|厂价|车间|一手货源/.test((x.title||'')+' '+(x.text||''))],
  ['logistics','物流/交付明确',x=>/物流|发货|自提|送货|到付|运费/.test((x.title||'')+' '+(x.text||''))],
  ['scene','使用场景切入',x=>/客厅|卧室|家装|装修|铺装|实景|效果/.test((x.title||'')+' '+(x.text||''))]
];

function modelFor(p){
  if(p==='小红书')return{
    features:XHS_FEATURES,
    dims(x){
      const views=pos(x.views),likes=num(x.likes),favs=num(x.favs),comments=num(x.comments),shares=num(x.shares),days=ageDays(x);
      const total=[likes,favs,comments,shares].filter(v=>v!==null).reduce((s,v)=>s+v,0),any=[likes,favs,comments,shares].some(v=>v!==null);
      return{views,likes,favs,comments,shares,days,likeRate:views&&likes!==null?likes/views:null,favRate:views&&favs!==null?favs/views:null,commentRate:views&&comments!==null?comments/views:null,shareRate:views&&shares!==null?shares/views:null,totalRate:views&&any?total/views:null,speed:days!==null?(views!==null?views:(any?total:null))/Math.max(.25,days):null};
    },
    weights:{views:.14,likeRate:.14,favRate:.25,commentRate:.16,shareRate:.20,totalRate:.16,speed:.18},
    fallback:{likes:.20,favs:.34,comments:.24,shares:.22},
    labels:{views:'浏览',likeRate:'点赞率',favRate:'收藏率',commentRate:'评论率',shareRate:'转发率',totalRate:'综合互动率',speed:'增长速度',likes:'点赞',favs:'收藏',comments:'评论',shares:'转发'},
    kinds:{views:'流量型',likeRate:'点赞型',favRate:'收藏型',commentRate:'评论讨论型',shareRate:'传播型',totalRate:'互动型',speed:'异常爆发型',likes:'点赞型',favs:'收藏型',comments:'评论讨论型',shares:'传播型',searchRank:'排序参考'},
    core:d=>[d.views,d.likes,d.favs,d.comments,d.shares,d.days],
    group:x=>({type:xhsType(x),material:materialOf(x),days:ageDays(x)})
  };
  if(p==='闲鱼')return{
    features:XY_FEATURES,
    dims(x){const exp=pos(x.exposure??x.impressions),views=pos(x.views),wants=num(x.wants),consults=num(x.consults),sales=num(x.sales??x.sold),days=ageDays(x);return{exp,views,wants,comments:num(x.comments),consults,sales,days,clickRate:exp&&views!==null?views/exp:null,wantRate:views&&wants!==null?wants/views:null,consultRate:views&&consults!==null?consults/views:null,saleRate:consults&&sales!==null?sales/consults:null,speed:days!==null?((consults??wants??views??null)!==null?(consults??wants??views)/Math.max(.25,days):null):null}},
    weights:{exp:.1,views:.1,clickRate:.20,wantRate:.24,consultRate:.28,saleRate:.30,speed:.18},fallback:{wants:.75,comments:.25},
    labels:{exp:'曝光',views:'浏览',clickRate:'浏览率',wantRate:'想要率',consultRate:'咨询率',saleRate:'成交转化',speed:'增长速度',wants:'想要',comments:'互动'},
    kinds:{exp:'流量型',views:'流量型',clickRate:'点击型',wantRate:'互动型',consultRate:'咨询型',saleRate:'成交转化型',speed:'异常爆发型',wants:'互动型',comments:'互动型',searchRank:'排序参考'},
    core:d=>[d.views,d.wants,d.consults,d.days],
    group:x=>({type:floorType(x),condition:conditionOf(x),material:materialOf(x),days:ageDays(x)})
  };
  return null;
}
function ageBand(d){if(d===null)return'时间未知';return d<=7?'近7天':d<=30?'8-30天':'30天以上'}
function buildComparable(batch,p,model){
  const base=batch.filter(x=>p==='闲鱼'?floorType(x)!=='exclude':!!String(x.title||'').trim());
  const rows=base.map(x=>({...x,__dims:model.dims(x),__group:model.group(x)}));
  const keys=p==='小红书'?[x=>[x.__group.type,x.__group.material,ageBand(x.__group.days)].join('|'),x=>[x.__group.type,ageBand(x.__group.days)].join('|'),x=>x.__group.type]:[x=>[x.__group.type,x.__group.condition,x.__group.material,ageBand(x.__group.days)].join('|'),x=>[x.__group.type,x.__group.condition].join('|'),x=>x.__group.type];
  const maps=keys.map(fn=>{const m=new Map();for(const x of rows){const k=fn(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x)}return m});
  const usable=[];for(const x of rows){for(let i=0;i<keys.length;i++){const k=keys[i](x),a=maps[i].get(k)||[];if(a.length>=10){usable.push({...x,__cohort:a,__cohortKey:k,__strictness:i});break}}}
  return{base,usable};
}
function scoreRows(rows,model){
  return rows.map(x=>{
    const cohort=x.__cohort||[],apply=weights=>{let sum=0,w=0,best={key:null,p:-1};for(const [k,wt] of Object.entries(weights||{})){const v=x.__dims[k];if(v===null||v===undefined)continue;const arr=cohort.map(z=>z.__dims[k]).filter(v=>v!==null&&v!==undefined&&Number.isFinite(v));if(arr.length<5)continue;const p=percentile(v,arr);if(p===null)continue;sum+=p*wt;w+=wt;if(p>best.p)best={key:k,p}}return{sum,w,best}};
    let r=apply(model.weights),mode='效率指标';if(!r.w){r=apply(model.fallback);mode='高互动/潜在高表现'}
    if(!r.w){const rank=num(x.rank),ranks=cohort.map(z=>num(z.rank)).filter(v=>v!==null&&v>0);if(rank!==null&&ranks.length>=5){const rp=1-(percentile(rank,ranks)??1);r={sum:rp,w:1,best:{key:'searchRank',p:rp}};mode='搜索排序/时效参考'}}
    const core=model.core(x.__dims),complete=core.length?core.filter(v=>v!==null&&v!==undefined).length/core.length:0;
    return{...x,__score:r.w?r.sum/r.w:null,__best:r.best,__mode:mode,__kind:model.kinds[r.best.key]||'潜在高表现',__complete:complete};
  }).filter(x=>x.__score!==null);
}
function outlierRows(rows){
  if(rows.length<15)return rows.map(x=>({...x,__outlier:false}));
  const a=rows.map(x=>x.__score),q1=quant(a,.25),q3=quant(a,.75),iqr=q3-q1,cut=iqr>0?q3+2.5*iqr:quant(a,.995);
  return rows.map(x=>({...x,__outlier:x.__score>cut}));
}
function evidence(high,normal,features,coverage,stability,rankOnlyRate){
  const rank={可以复用:3,值得测试:2,暂无价值:1};
  const z=(p1,n1,p2,n2)=>{if(!n1||!n2)return 0;const p=(p1*n1+p2*n2)/(n1+n2),se=Math.sqrt(Math.max(1e-9,p*(1-p)*(1/n1+1/n2)));return Math.abs(p1-p2)/se};
  return features.map(([id,label,fn])=>{
    const hc=high.filter(fn).length,nc=normal.filter(fn).length,hp=high.length?hc/high.length:0,np=normal.length?nc/normal.length:0,diff=hp-np,zz=z(hp,high.length,np,normal.length);
    let level='探索性信号';
    if(rankOnlyRate<.5&&high.length>=50&&normal.length>=100&&diff>=.15&&zz>=2&&coverage>=.55&&stability>=.70)level='强证据';
    else if(rankOnlyRate<.7&&high.length>=30&&normal.length>=60&&diff>=.10&&zz>=1.8&&coverage>=.35)level='中等证据';
    else if(high.length>=10&&normal.length>=30&&diff>=.06&&zz>=1.35)level='弱证据';
    let category='暂无价值';
    if(level==='强证据'&&diff>=.15)category='可以复用';
    else if((level==='中等证据'||level==='弱证据')&&diff>=.08)category='值得测试';
    else if(level==='探索性信号'&&high.length>=50&&normal.length>=100&&diff>=.05&&zz>=1.8)category='值得测试';
    return{id,label,hc,nc,hp,np,diff,z:zz,level,category,total:high.length+normal.length}
  }).sort((a,b)=>((rank[b.category]||0)-(rank[a.category]||0))||b.diff-a.diff||b.z-a.z);
}
function batchItems(){
  const p=currentPlatform(),all=db.items.filter(x=>x.site===p).map(enrich),stamp=db.lastCapturedAt,expected=Number(db.lastValidCount||(db.lastMeta&&db.lastMeta.validCount)||0);
  let batch=stamp?all.filter(x=>x._capturedAt===stamp):[];if(batch.length<Math.min(20,expected||20)&&expected>0)batch=all.slice().sort((a,b)=>new Date(b._capturedAt||0)-new Date(a._capturedAt||0)).slice(0,Math.min(expected,all.length));
  return batch.length?batch:all;
}
function itemReasons(x,model){
  const out=[],cohort=x.__cohort||[];for(const [k,label] of Object.entries(model.labels)){const v=x.__dims[k];if(v===null||v===undefined)continue;const a=cohort.map(z=>z.__dims[k]).filter(v=>v!==null&&v!==undefined&&Number.isFinite(v));if(a.length<5)continue;const p=percentile(v,a);if(p===null||p<.78)continue;out.push(label+'同类前'+Math.max(1,Math.round((1-p)*100))+'%')}
  if(!out.length)out.push(x.__mode==='搜索排序/时效参考'?'搜索排序靠前，仅作探索参考':'综合表现位于同类前列');return out.slice(0,3);
}
function analyze(){
  const platform=currentPlatform(),model=modelFor(platform),batch=batchItems();if(!model)return{platform,batch,unsupported:true};if(!batch.length)return{platform,batch,empty:true};
  const comp=buildComparable(batch,platform,model),deb=debias(comp.usable,platform),scored=outlierRows(scoreRows(deb.items,model)),anomalies=scored.filter(x=>x.__outlier),pool=scored.filter(x=>!x.__outlier).sort((a,b)=>b.__score-a.__score),highN=pool.length?Math.max(1,Math.ceil(pool.length*.20)):0,high=pool.slice(0,highN),normal=pool.slice(highN);
  const coreCount=pool[0]?model.core(pool[0].__dims).length:1,covered=pool.reduce((s,x)=>s+model.core(x.__dims).filter(v=>v!==null&&v!==undefined).length,0),coverage=pool.length?covered/(pool.length*coreCount):0,stability=comp.usable.length?deb.items.length/comp.usable.length:0,rankOnlyRate=pool.length?pool.filter(x=>x.__mode==='搜索排序/时效参考').length/pool.length:0;
  const findings=evidence(high,normal,model.features,coverage,stability,rankOnlyRate),reusable=findings.filter(x=>x.category==='可以复用'),testable=findings.filter(x=>x.category==='值得测试'),none=findings.filter(x=>x.category==='暂无价值');
  const observed=findings.filter(x=>x.diff>0).sort((a,b)=>b.diff-a.diff||b.z-a.z);
  const strongest=reusable[0]||testable[0]||null;
  const expBase=!strongest?observed.find(x=>high.length>=30&&normal.length>=60&&x.diff>=.04&&x.z>=1.25):null;
  const exploratory=expBase?{...expBase,category:'探索性测试',level:'探索性信号'}:null;
  let conf='探索',confClass='low';if(high.length>=50&&normal.length>=100&&coverage>=.55&&rankOnlyRate<.5){conf='高';confClass='good'}else if(high.length>=30&&normal.length>=60&&coverage>=.4&&rankOnlyRate<.7){conf='中';confClass='base'}else if(high.length>=10){conf='低';confClass='low'}
  const kinds={};for(const x of high)kinds[x.__kind]=(kinds[x.__kind]||0)+1;const dominant=Object.entries(kinds).sort((a,b)=>b[1]-a[1])[0]?.[0]||'潜在高表现';
  return{platform,model,batch,comp,deb,pool,high,normal,anomalies,findings,reusable,testable,none,strongest,exploratory,observed,coverage,stability,rankOnlyRate,confidence:[conf,confClass],dominant,empty:false};
}

function parseProduct(raw){
  const spec=(raw.match(/\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/i)||[])[0]||'',area=(raw.match(/\d+(?:\.\d+)?\s*(?:㎡|平米|平方)/)||[])[0]||'',layout=(raw.match(/(?:\d室\d厅|\d房|一居|两居|三居|四居|户型)/)||[])[0]||'',install=(raw.match(/鱼骨|人字|工字|369|自由拼|悬浮|平扣|锁扣|龙骨|直铺/)||[])[0]||'';
  const pm=raw.match(/(?:¥|￥)?\s*(\d+(?:\.\d+)?)\s*元(?:\/㎡|每平方|一平|平)?/),price=pm?pm[1]:'',mats=['红檀香','缅甸柚木','柚木','橡木','白橡','欧橡','紫檀','菠萝格','龙凤檀','黑胡桃','白蜡木','重蚁木'],mat=mats.find(x=>raw.includes(x))||raw.split(/[\s,，/|]+/).find(x=>x.length>=2&&!/^\d/.test(x))||'木地板',otherNum=(raw.match(/\d+(?:\.\d+)?/)||[])[0]||'';
  return{raw,spec,area,layout,install,price,mat,otherNum,factory:/工厂|厂家|车间/.test(raw),experience:/用了|使用|实测|装完|铺完|住了|完工|后悔|踩坑/.test(raw)};
}
function eligibility(s,p){
  if(!s)return{ok:false,need:'没有可测试信号'};if(s.id==='titleSpec'&&!p.spec)return{ok:false,need:'真实规格，例如 910×125×18'};if(s.id==='titlePrice'&&!p.price)return{ok:false,need:'真实价格，例如 530元/㎡'};if(s.id==='titleNumber'&&!p.otherNum)return{ok:false,need:'一个真实数字信息，例如规格、面积、价格或使用年限'};if(s.id==='titleLayout'&&!p.layout)return{ok:false,need:'真实户型，例如 三房两厅'};if(s.id==='titleArea'&&!p.area)return{ok:false,need:'真实面积，例如 70㎡'};if(s.id==='titleInstall'&&!p.install)return{ok:false,need:'真实铺法，例如 鱼骨 / 人字 / 工字'};if(s.id==='titleResult'&&!p.experience)return{ok:false,need:'真实使用/完工结果，避免编造体验'};if(s.id==='factory'&&!p.factory)return{ok:false,need:'确认这条内容确实是工厂/生产现场'};return{ok:true,need:''};
}
function signalPool(r){
  const a=r.reusable.concat(r.testable);
  if(!a.length&&r.exploratory)a.push(r.exploratory);
  return a;
}
function xhsGenerate(p,s){
  const id=s.id,m=p.mat;let title='',body='',cover='',images='';
  if(id==='titleSpec'){title=m+' '+p.spec+'，这种规格铺家里是什么效果？';body='这次先把规格说清楚：'+p.spec+'。\n\n同样是'+m+'，规格、铺法和空间比例都会影响最后效果。选的时候建议把实际面积、柜体颜色和收口一起考虑。';cover='封面只保留「'+m+' + '+p.spec+'」两个关键信息。';images='首图真实板面/铺装效果；第2张规格细节；第3张实际空间或拼接方式。'}
  else if(id==='titlePrice'){title=p.price+'元/㎡的'+m+'，实际选的时候我更看这几点';body='价格先写明：'+p.price+'元/㎡。\n\n真正落地时还要一起看规格、铺法、面积和现场收口。单看价格，很容易忽略最后影响使用效果的条件。';cover='封面突出「'+p.price+'元/㎡ + '+m+'」，不要再叠太多文字。';images='首图真实产品；后续补规格、板面和实际空间。'}
  else if(id==='titleNumber'){title=m+'这次只看'+p.otherNum+'这个具体条件';body='这条不讲泛泛卖点，直接围绕一个具体条件展开：'+p.otherNum+'。\n\n把数字信息说清楚，再结合实际空间和铺法判断，会比只看颜色更有参考价值。';cover='封面突出唯一数字「'+p.otherNum+'」，形成一眼可读的信息点。';images='围绕这个数字对应的真实细节连续展示，避免无关图片。'}
  else if(id==='titleMaterial'){title=m+'地板，先别急着只看颜色';body='这次直接从'+m+'本身开始看。\n\n实际选择时，更值得先确认的是规格、铺法、面积和现场搭配，再决定颜色和表面效果。';cover='封面直接出现「'+m+'」，搭配真实板面或铺装图。';images='首图木种实拍；第2张板面；第3张铺装或空间效果。'}
  else if(id==='titleScene'||id==='sceneBody'){title='家里准备铺'+m+'，我会先看这3件事';body='如果是家装在看'+m+'，我会先从真实空间出发：\n1. 采光和柜体颜色\n2. 规格和铺法\n3. 面积与收口条件\n\n先把这些确定，再看具体板面会更实际。';cover='用真实客厅/卧室铺装场景，不用纯白底产品图。';images='首图完整空间；第2张板面近景；第3张柜体/门套/收口关系。'}
  else if(id==='titleQuestion'){title=m+'地板到底怎么选？先别只看颜色';body='看'+m+'时，我更建议先问三个问题：规格适不适合？铺法适不适合？现场收口怎么做？\n\n这些确认以后，再看颜色会更有效率。';cover='封面只放一个明确问题：「'+m+'到底怎么选？」';images='首图问题对应的真实产品；后面逐项回答规格、铺法、现场。'}
  else if(id==='titleResult'){title=p.raw.includes(m)?p.raw.replace(/\s+/g,' ').slice(0,28):m+'用过以后，才敢说这几点';body='这条只基于你提供的真实使用/完工信息展开，不额外编造体验。\n\n'+p.raw+'\n\n把真实结果、适用条件和需要注意的地方分开说清楚，比单纯夸材质更有参考价值。';cover='封面突出真实结果，不使用夸张承诺。';images='优先结果图/完工图；再补使用细节和容易忽略的位置。'}
  else if(id==='titleCompare'){title='同样是'+m+'，单看板和铺进家里真的不一样';body='这次做一个明确对比：单看一块板，和真正铺进空间里，判断标准完全不同。\n\n实际家装要把采光、面积、柜体颜色和铺法放在一起看。';cover='封面左右对比：单板近景 VS 实际铺装空间。';images='第1张对比封面；第2张单板；第3张完整空间；第4张细节差异。'}
  else if(id==='titleLayout'){title=p.layout+'铺'+m+'，先确认这几个位置';body=p.layout+'准备铺'+m+'，建议先看客厅采光、房间尺度、柜体颜色和收口位置。\n\n户型明确以后，再去选规格和铺法会更有针对性。';cover='封面突出「'+p.layout+' + '+m+'」并用真实户型/空间图。';images='首图完整空间；再补客厅、卧室、收口三个关键位置。'}
  else if(id==='titleArea'){title=p.area+'铺'+m+'，规格和损耗要先算清楚';body=p.area+'准备铺'+m+'，先别只看单价。\n\n面积明确后，要一起确认规格、铺法和损耗，再决定最终用量和效果。';cover='封面突出「'+p.area+' + '+m+'」，配实际地面/空间图。';images='首图空间；第2张规格；第3张铺法；第4张收口。'}
  else if(id==='titleInstall'){title=m+'做'+p.install+'，铺出来和普通平铺差别有多大？';body='这次只看一个变量：'+p.install+'。\n\n同样是'+m+'，铺法会直接改变视觉比例和损耗。选择前建议结合房间尺度和实际面积一起判断。';cover='封面突出「'+p.install+'」铺法，直接展示拼接效果。';images='首图完整铺法效果；第2张拼接近景；第3张空间整体。'}
  else if(id==='howto'||id==='saveValue'){title='准备铺'+m+'的，先把这4点记下来';body='准备铺'+m+'，建议先确认：\n1. 实际面积和损耗\n2. 规格与铺法\n3. 柜体、门套和收口\n4. 真实板面与色差\n\n先把条件确认清楚，再去选具体产品。';cover='清单型封面，只显示「铺'+m+'前先确认4点」。';images='4张图分别对应面积/规格/铺法/收口，方便收藏回看。'}
  else if(id==='discussion'){title=m+'你会选平铺还是花式拼？';body='如果是你家铺'+m+'，你会更在意稳定耐用，还是更在意铺装效果？\n\n不同空间、面积和预算，最后答案会不一样。你会怎么选？';cover='封面用两种铺法对比，直接形成选择题。';images='首图A/B对比；后面分别展示两种方案细节。'}
  else if(id==='experience'){title='看了这么多'+m+'，我现在更在意这几个细节';body='看得越多，越觉得选'+m+'不能只靠第一眼颜色。\n\n我更在意规格、铺法、现场搭配和收口条件，这些才真正影响落地效果。';cover='真实观察/现场图，避免纯宣传海报。';images='首图真实现场；后面逐项展示规格、板面和收口。'}
  else if(id==='factory'){title='刚在工厂看到一批'+m+'，先看真实板面';body='这次直接看工厂现场和真实板面，不做过度滤镜。\n\n同一木种也要结合规格、选材和实际铺装条件看，单看一块样板不够。';cover='工厂现场或刚下线产品实拍。';images='首图生产/库存现场；第2张板面；第3张规格或包装。'}
  else if(id==='coverScene'){title=m+'铺进家里，和单看样板真的不一样';body='这次内容重点不放在参数堆叠，而是用真实空间展示'+m+'铺进去后的比例、光线和搭配效果。';cover='必须使用真实铺装/使用场景作为首图。';images='首图完整空间；第2张近景；第3张不同光线；第4张收口。'}
  else {title=m+'地板，先看真实空间再决定';body='这次只围绕一个明确切入点展开，不堆泛泛卖点。\n\n实际选择时先看空间、规格和铺法，再决定具体产品。';cover='真实产品或实际铺装图。';images='首图真实场景；后面补产品细节。'}
  const tags='#'+[m,m.includes('地板')?null:m+'地板','实木地板','装修','地板选购'].filter(Boolean).join(' #');return{title,body,tags,cover,images};
}
function validateSignal(s,o,p){
  const t=o.title,b=o.body,c=o.cover;
  if(s.id==='titleSpec')return !!p.spec&&t.includes(p.spec);if(s.id==='titleNumber')return /\d/.test(t);if(s.id==='titlePrice')return !!p.price&&t.includes(p.price);if(s.id==='titleMaterial')return t.includes(p.mat);if(s.id==='titleScene')return /家里|客厅|卧室|家装|装修|新房|老房|民宿|办公室/.test(t);if(s.id==='titleQuestion')return /[？?]|怎么|到底|能不能|值不值/.test(t);if(s.id==='titleResult')return /用了|实测|装完|铺完|住了|后悔|真话|效果|翻车|踩坑/.test(t+' '+b);if(s.id==='titleCompare')return /对比|区别|不一样|差别|还是|VS|vs/.test(t);if(s.id==='titleLayout')return !!p.layout&&t.includes(p.layout);if(s.id==='titleArea')return !!p.area&&t.includes(p.area);if(s.id==='titleInstall')return !!p.install&&t.includes(p.install);if(s.id==='sceneBody')return /家装|实际空间|客厅|卧室|新房|铺进家里/.test((t+' '+b).slice(0,180));if(s.id==='howto'||s.id==='saveValue')return /1[.、]|第一|清单|记下来/.test(b);if(s.id==='discussion')return /你会|你觉得|你们|怎么选|哪种|[？?]/.test(t+' '+b);if(s.id==='experience')return /看了|使用|实测|用了|现场|完工/.test(t+' '+b);if(s.id==='factory')return /工厂|车间|生产/.test(t+' '+b);if(s.id==='coverScene')return /真实|铺装|场景|空间/.test(c);return true;
}
function forceSignal(s,o,p){
  if(s.id==='titleSpec'&&p.spec&&!o.title.includes(p.spec))o.title=p.mat+' '+p.spec+'，实际铺出来什么效果？';if(s.id==='titlePrice'&&p.price&&!o.title.includes(p.price))o.title=p.price+'元/㎡的'+p.mat+'，实际选的时候看什么？';if(s.id==='titleNumber'&&!/\d/.test(o.title)&&p.otherNum)o.title=p.mat+'这次只看'+p.otherNum+'这个具体条件';if(s.id==='titleScene'&&!/家里|客厅|卧室|家装|装修/.test(o.title))o.title='家里准备铺'+p.mat+'，先看这3点';if(s.id==='titleQuestion'&&!/[？?]/.test(o.title))o.title=p.mat+'地板到底怎么选？';if(s.id==='titleCompare'&&!/对比|区别|不一样|差别/.test(o.title))o.title='同样是'+p.mat+'，单看板和铺进家里差别有多大？';if(s.id==='titleLayout'&&p.layout&&!o.title.includes(p.layout))o.title=p.layout+'铺'+p.mat+'，先确认这几个位置';if(s.id==='titleArea'&&p.area&&!o.title.includes(p.area))o.title=p.area+'铺'+p.mat+'，规格和损耗要先算清楚';if(s.id==='titleInstall'&&p.install&&!o.title.includes(p.install))o.title=p.mat+'做'+p.install+'，效果差别有多大？';if(s.id==='sceneBody'&&!/家装|实际空间|客厅|卧室/.test(o.body))o.body='如果是家装在看'+p.mat+'，先从真实空间、采光和柜体颜色开始判断。\n\n'+o.body;return o;
}

function ensureUI(){
  document.querySelector('.stats')?.classList.add('g81-hide');$id('marketAnalysisCard')?.classList.add('g81-hide');const oldGen=$id('genKeyword')?.closest('.card');if(oldGen)oldGen.classList.add('g81-hide');
  const raw=[...document.querySelectorAll('.card')].find(x=>x.querySelector('.label')?.textContent==='抓取结果'),capture=[...document.querySelectorAll('.card')].find(x=>x.querySelector('.label')?.textContent.includes('抓取数据')),mobile=$id('mobileCollectCard');
  let decision=$id('g81Decision');if(!decision){decision=document.createElement('section');decision.id='g81Decision';decision.className='g81-decision';decision.innerHTML='<div class="g81-decision-main"><div class="g81-kicker" id="g81Platform">小红书 · 本轮结论</div><h2 id="g81Conclusion">等待抓取数据</h2><div class="g81-proof" id="g81Proof">系统会先判断高价值笔记赢在哪一层，再找与普通笔记真正不同的内容变量。</div><div class="g81-metrics" id="g81Metrics"></div><div class="g81-confidence"><span>综合可信度</span><b id="g81Confidence">—</b><em id="g81ConfidenceNote">等待分析</em></div></div><div class="g81-next"><small>下一条最值得测试</small><strong id="g81Next">先完成抓取</strong><p id="g81NextSub">一次只测试一个主要变量。</p><div class="g81-actions"><button id="g81GenerateTop" class="g81-primary">生成下一轮测试内容</button><button id="g81Alternate" class="g81-secondary">换一个测试方向</button><button id="g81ToggleDetails" class="g81-link">查看分析依据</button></div></div>';document.querySelector('.top')?.after(decision)}
  let report=$id('g81Report');if(!report){report=document.createElement('section');report.id='g81Report';report.className='g81-report';report.innerHTML='<div class="g81-report-head"><div><span>本轮分析报告</span><b id="g81ReportTitle">等待分析</b></div><button id="g81CopyReport" class="g81-secondary">复制报告</button></div><div id="g81ReportSummary" class="g81-report-summary"></div><div id="g81ReportSignals" class="g81-report-signals"></div><div id="g81ReportLimit" class="g81-report-limit"></div>';decision.after(report)}
  let middle=$id('g81Middle');if(!middle){middle=document.createElement('section');middle.id='g81Middle';middle.className='g81-middle';middle.innerHTML='<div class="g81-reason-panel"><div class="g81-section-title"><b>高价值内容为什么表现好</b><span>最多3个真正有差异的变量</span></div><div id="g81Reasons" class="g81-reasons"></div></div><div class="g81-generator"><div class="g81-section-title"><b>生成下一轮测试内容</b><span>严格执行本轮测试变量</span></div><div class="g81-input-row"><input id="g81Product" placeholder="输入真实商品信息，例如：柚木 910×125×18 530元/㎡"><button id="g81Generate" class="g81-primary">生成</button></div><div id="g81Need" class="g81-need"></div><div id="g81Output" class="g81-output g81-empty-output">输入商品信息后生成可直接发布的小红书方案。</div></div>';report.after(middle)}
  let details=$id('g81Details');if(!details){details=document.createElement('section');details.id='g81Details';details.className='g81-details';details.innerHTML='<div class="g81-detail-grid"><div><div class="g81-section-title"><b>关键分析依据</b><span>高表现组 VS 普通组</span></div><div id="g81Evidence" class="g81-evidence"></div></div><div><div class="g81-section-title"><b>典型高价值笔记</b><span>默认3条</span></div><div id="g81High" class="g81-high-list"></div><button id="g81ShowHigh" class="g81-more">查看全部高价值样本</button></div></div><div class="g81-detail-foot" id="g81DetailFoot"></div>';middle.after(details)}
  details.classList.remove('show');if(capture&&details.nextElementSibling!==capture)details.after(capture);if(mobile&&capture&&capture.nextElementSibling!==mobile)capture.after(mobile);
  if(raw&&!raw.dataset.g81){raw.dataset.g81='1';const head=raw.querySelector('.head');if(head)head.querySelector('.muted').textContent='原始数据默认折叠，只在核查证据时展开。';const children=[...raw.children].filter(x=>x!==head),body=document.createElement('div');body.id='g81RawBody';body.className='g81-raw-body';children.forEach(x=>body.appendChild(x));const btn=document.createElement('button');btn.className='g81-raw-toggle';btn.innerHTML='<span>查看原始抓取数据</span><span>展开</span>';btn.onclick=()=>{body.classList.toggle('show');btn.lastElementChild.textContent=body.classList.contains('show')?'收起':'展开'};raw.appendChild(btn);raw.appendChild(body)}
  $id('g81ToggleDetails').onclick=()=>{$id('g81Details').classList.toggle('show');$id('g81ToggleDetails').textContent=$id('g81Details').classList.contains('show')?'收起分析依据':'查看分析依据'};
  $id('g81GenerateTop').onclick=()=>{const i=$id('g81Product');if(!i.value.trim()){i.focus();middle.scrollIntoView({behavior:'smooth',block:'start'});return}generateCurrent()};
  $id('g81Generate').onclick=generateCurrent;$id('g81Alternate').onclick=()=>{window.__g81Seed=(window.__g81Seed||0)+1;renderAnalysis(window.__g81Analysis);const i=$id('g81Product');if(i.value.trim())generateCurrent()};
  $id('g81ShowHigh').onclick=()=>{window.__g81ShowAll=!window.__g81ShowAll;renderHigh(window.__g81Analysis);$id('g81ShowHigh').textContent=window.__g81ShowAll?'只看3条典型样本':'查看全部高价值样本'};
}
function buildReport(r){
  if(!r||r.empty||r.unsupported)return null;
  const active=r.strongest||r.exploratory||null;
  const top=(r.reusable.concat(r.testable).length?r.reusable.concat(r.testable):r.observed||[]).filter(x=>x.diff>0).slice(0,3);
  const stop=db.lastMeta&&db.lastMeta.stoppedBy;
  const stopMap={target:'达到目标500条',manual:'手动停止',saturated:'平台样本已饱和','safety-time-limit':'达到安全时限'};
  const sample='本轮抓取 '+r.batch.length+' 条，进入可比较分析 '+r.pool.length+' 条；高价值组 '+r.high.length+' 条，普通组 '+r.normal.length+' 条。';
  const layer='高价值内容当前主要赢在：'+r.dominant+(r.rankOnlyRate>=.5?'。注意：超过一半样本主要依据搜索排序/时效识别，只能作为探索性参考。':'。');
  const decision=active?('本轮建议：'+(active.category==='探索性测试'?'探索测试「':'优先测试「')+active.label+'」，高表现 '+fmtPct(active.hp)+'，普通 '+fmtPct(active.np)+'，差异 '+(active.diff>=0?'+':'')+Math.round(active.diff*100)+'%。'):'本轮没有足够大的内容差异，不强行指定测试变量。';
  const limit='核心表现数据覆盖 '+Math.round(r.coverage*100)+'%；去偏后保留 '+Math.round(r.stability*100)+'%；异常高表现 '+r.anomalies.length+' 条。'+(stop&&stopMap[stop]?(' 采集结束原因：'+stopMap[stop]+'。'):'');
  const signals=top.map(x=>({label:x.label,hp:x.hp,np:x.np,diff:x.diff,level:x.category==='暂无价值'?'观察信号':x.level,category:x.category}));
  return{id:(db.lastCapturedAt||'latest')+'|'+r.platform,platform:r.platform,createdAt:nowISO(),sample,layer,decision,limit,signals,active};
}
function saveReport(rep){
  if(!rep)return;
  let a=[];try{a=JSON.parse(localStorage.getItem(REPORTKEY)||'[]')}catch{}
  const i=a.findIndex(x=>x.id===rep.id);if(i>=0)a[i]=rep;else a.push(rep);
  localStorage.setItem(REPORTKEY,JSON.stringify(a.slice(-30)));
}
function reportText(rep){
  if(!rep)return'暂无报告';
  const lines=['【本轮分析报告】',rep.sample,rep.layer,'',...rep.signals.map((x,i)=>(i+1)+'. '+x.label+'：高表现 '+fmtPct(x.hp)+' / 普通 '+fmtPct(x.np)+' / '+(x.diff>=0?'+':'')+Math.round(x.diff*100)+'% / '+x.level),'',rep.decision,rep.limit];
  return lines.join('\n');
}
function renderReport(r){
  const rep=buildReport(r);if(!rep)return;
  saveReport(rep);
  $id('g81ReportTitle').textContent=rep.active?(rep.active.category==='探索性测试'?'有探索方向，但证据仍弱':'已找到可执行测试方向'):'样本充足，但差异不足以形成稳定测试变量';
  $id('g81ReportSummary').innerHTML='<p>'+esc(rep.sample)+'</p><p>'+esc(rep.layer)+'</p><p><b>'+esc(rep.decision)+'</b></p>';
  $id('g81ReportSignals').innerHTML=rep.signals.length?rep.signals.map((x,i)=>'<div><span>'+(i+1)+'</span><b>'+esc(x.label)+'</b><em>'+fmtPct(x.hp)+' vs '+fmtPct(x.np)+'</em><strong>'+(x.diff>=0?'+':'')+Math.round(x.diff*100)+'%</strong><small>'+esc(x.level)+'</small></div>').join(''):'<div class="g81-report-empty">高表现组和普通组目前没有明显正向内容差异。</div>';
  $id('g81ReportLimit').textContent=rep.limit;
  $id('g81CopyReport').onclick=async()=>{try{await navigator.clipboard.writeText(reportText(rep));setStatus('本轮分析报告已复制。','oktxt')}catch{setStatus('复制失败，请手动复制。','warn')}};
}
function renderHigh(r){
  if(!r||!r.high){$id('g81High').innerHTML='';return}const arr=window.__g81ShowAll?r.high:r.high.slice(0,3);
  $id('g81High').innerHTML=arr.map((x,i)=>'<a class="g81-high" href="'+esc(x.url||'#')+'" target="_blank" rel="noopener"><span class="g81-no">'+(i+1)+'</span><div><b>'+esc(x.title||'未命名')+'</b><small>'+esc(x.__kind)+' · '+esc(itemReasons(x,r.model).join('；'))+'</small></div><span class="g81-open">打开</span></a>').join('')||'<div class="g81-muted">暂无足够高价值样本。</div>';$id('g81ShowHigh').style.display=r.high.length>3?'inline-flex':'none';
}
function signalPool(r){return r.reusable.concat(r.testable)}
function metrics(r){const s=r.strongest,signal=s?((s.diff>=0?'+':'')+Math.round(s.diff*100)+'%'):'—';return[[r.pool.length,'有效样本'],[r.high.length,'高价值样本'],[Math.round(r.coverage*100)+'%','核心数据覆盖'],[signal,'本轮最强信号'],[r.confidence[0],'综合可信度']]}
function renderAnalysis(r){
  ensureUI();window.__g81Analysis=r;$id('g81Platform').textContent=(r.platform||currentPlatform())+' · 本轮结论';
  if(r.unsupported){$id('g81Conclusion').textContent='当前平台尚未建立独立模型';$id('g81Proof').textContent='不会套用小红书算法。';return}
  if(r.empty){$id('g81Conclusion').textContent='先抓取一轮真实数据';$id('g81Proof').textContent='完成抓取后，这里直接告诉你最强信号和下一条怎么发。';$id('g81Metrics').innerHTML='';$id('g81Reasons').innerHTML='';return}
  const pool=signalPool(r),active=pool.length?pool[(window.__g81Seed||0)%pool.length]:null;window.__g81ActiveSignal=active;
  if(active){$id('g81Conclusion').textContent=(active.category==='探索性测试'?'探索性测试：':'')+active.label;$id('g81Proof').innerHTML='高表现 '+active.hc+'/'+r.high.length+' = <b>'+fmtPct(active.hp)+'</b> ｜ 普通 '+active.nc+'/'+r.normal.length+' = <b>'+fmtPct(active.np)+'</b> ｜ 差异 <b>'+(active.diff>=0?'+':'')+Math.round(active.diff*100)+'%</b> ｜ '+active.level;$id('g81Next').textContent=active.label;$id('g81NextSub').textContent=active.category==='探索性测试'?'当前属于探索信号：下一篇只测试这一变量，用真实发布结果验证。':'下一篇只测试这一变量，其他主要内容尽量保持接近。'}else{$id('g81Conclusion').textContent='样本不少，但高低表现组写法接近';$id('g81Proof').textContent='本轮没有达到测试门槛的正向差异。分析报告仍会列出最接近的观察信号和数据缺口。';$id('g81Next').textContent='先看本轮分析报告';$id('g81NextSub').textContent='如果所有差异都很小，继续抓更多同类样本并不会自动产生规律，应优先补完整互动数据。'}
  $id('g81Confidence').textContent=r.confidence[0];$id('g81Confidence').className='g81-conf '+r.confidence[1];$id('g81ConfidenceNote').textContent=r.rankOnlyRate>=.5?'多数样本只有排序/时效参考，结论只能用于探索测试。':'按样本量、数据覆盖和去偏后稳定性判断。';$id('g81Metrics').innerHTML=metrics(r).map(([v,l])=>'<div><b>'+esc(v)+'</b><span>'+esc(l)+'</span></div>').join('');
  const useful=r.reusable.concat(r.testable),good=(useful.length?useful:(r.observed||[]).filter(x=>x.diff>0)).slice(0,3);$id('g81Reasons').innerHTML=good.length?good.map((f,i)=>'<div class="g81-reason"><span class="g81-reason-no">'+(i+1)+'</span><div><b>'+esc(f.label)+'</b><small>'+fmtPct(f.hp)+' vs '+fmtPct(f.np)+'　<b>'+(f.diff>=0?'+':'')+Math.round(f.diff*100)+'%</b>　'+(f.category==='暂无价值'?'观察信号':f.level)+'</small></div></div>').join(''):'<div class="g81-muted">高表现组与普通组目前没有明显正向内容差异。</div>';
  $id('g81Evidence').innerHTML=r.findings.slice(0,8).map(f=>'<div class="g81-evidence-row"><div><b>'+esc(f.label)+'</b><span>'+esc(f.category)+' · '+esc(f.level)+'</span></div><strong>'+(f.diff>=0?'+':'')+Math.round(f.diff*100)+'%</strong><small>高表现 '+f.hc+'/'+r.high.length+' = '+fmtPct(f.hp)+' ｜ 普通 '+f.nc+'/'+r.normal.length+' = '+fmtPct(f.np)+' ｜ 样本 '+f.total+'</small></div>').join('');$id('g81DetailFoot').textContent='本轮高价值主要类型：'+r.dominant+'。去偏保留 '+Math.round(r.stability*100)+'%；异常高表现 '+r.anomalies.length+' 条已单独剥离；排序参考占 '+Math.round(r.rankOnlyRate*100)+'%。';renderHigh(r);
}
function generatorWhy(r,s,p){return[['相关样本',r.high.length+' 高价值 / '+r.normal.length+' 普通'],['本轮测试变量',s.label],['价格策略',p.price?p.price+'元/㎡（真实输入）':'未提供则不编造'],['流量依据',s.level+'；差异 '+(s.diff>=0?'+':'')+Math.round(s.diff*100)+'%']]}
function renderOutput(r,s,p,o,ok){
  const w=generatorWhy(r,s,p).map(([a,b])=>'<div><span>'+esc(a)+'</span><b>'+esc(b)+'</b></div>').join('');$id('g81Output').classList.remove('g81-empty-output');
  $id('g81Output').innerHTML='<div class="g81-output-grid"><div class="g81-why"><div class="g81-mini-title">为什么这样发</div>'+w+'</div><div class="g81-publish"><div class="g81-testline"><span>本轮测试</span><b>'+esc(s.label)+'</b><em class="'+(ok?'ok':'bad')+'">'+(ok?'✓ 已执行':'✕ 未执行')+'</em></div><div class="g81-field"><span>标题</span><strong>'+esc(o.title)+'</strong></div><div class="g81-field"><span>正文</span><pre>'+esc(o.body)+'</pre></div><div class="g81-field-row"><div class="g81-field"><span>话题 / 搜索词</span><p>'+esc(o.tags)+'</p></div><div class="g81-field"><span>封面建议</span><p>'+esc(o.cover)+'</p></div></div><div class="g81-field"><span>图片内容建议</span><p>'+esc(o.images)+'</p></div><div class="g81-output-actions"><button id="g81Copy" class="g81-primary">复制全部</button><button id="g81Record" class="g81-secondary">记录发布结果</button></div><div id="g81Feedback" class="g81-feedback"></div></div></div>';
  $id('g81Copy').onclick=async()=>{const text='【本轮测试】'+s.label+'\n\n【标题】\n'+o.title+'\n\n【正文】\n'+o.body+'\n\n【话题】\n'+o.tags+'\n\n【封面建议】\n'+o.cover+'\n\n【图片建议】\n'+o.images;try{await navigator.clipboard.writeText(text);setStatus('已复制完整发布方案。','oktxt')}catch{setStatus('复制失败，请手动复制。','warn')}};
  $id('g81Record').onclick=renderFeedback;
}
function saveDraft(r,s,p,o){let a=[];try{a=JSON.parse(localStorage.getItem(EXPKEY)||'[]')}catch{}a.push({id:'exp_'+Date.now(),platform:r.platform,product:p.raw,strategy:s.label,signalId:s.id,category:s.category,evidence:s.level,title:o.title,body:o.body,cover:o.cover,images:o.images,createdAt:nowISO(),status:'draft'});localStorage.setItem(EXPKEY,JSON.stringify(a.slice(-120)))}
function generateCurrent(){
  const r=window.__g81Analysis||analyze(),s=window.__g81ActiveSignal||r.strongest,raw=$id('g81Product')?.value.trim();if(!raw)return setStatus('先输入你准备发布的真实商品信息。','bad');if(!s)return setStatus('本轮没有达到最低测试门槛的变量。先看“本轮分析报告”里的观察信号与数据缺口。','warn');
  const p=parseProduct(raw),elig=eligibility(s,p);if(!elig.ok){$id('g81Need').textContent='当前变量「'+s.label+'」需要补充：'+elig.need+'。也可以点“换一个测试方向”。';$id('g81Product').focus();return}$id('g81Need').textContent='';
  let o=xhsGenerate(p,s),ok=validateSignal(s,o,p);if(!ok){o=forceSignal(s,o,p);ok=validateSignal(s,o,p)}if(!ok)return setStatus('生成结果没有执行本轮测试变量，已停止输出。','bad');renderOutput(r,s,p,o,true);saveDraft(r,s,p,o);setStatus('已生成：本轮只测试「'+s.label+'」'+(s.category==='探索性测试'?'（探索性）':'')+'，并已自动校验执行。','oktxt');
}
function renderFeedback(){const box=$id('g81Feedback');box.innerHTML='<div class="g81-feedback-title">发布后记录结果</div><div class="g81-feedback-grid"><label>浏览<input data-k="views" inputmode="decimal"></label><label>点赞<input data-k="likes" inputmode="decimal"></label><label>收藏<input data-k="favs" inputmode="decimal"></label><label>评论<input data-k="comments" inputmode="decimal"></label><label>转发<input data-k="shares" inputmode="decimal"></label><label>发布天数<input data-k="days" inputmode="decimal"></label></div><button id="g81SaveFeedback" class="g81-primary">保存结果</button>';box.classList.add('show');$id('g81SaveFeedback').onclick=saveFeedback}
function saveFeedback(){let a=[];try{a=JSON.parse(localStorage.getItem(EXPKEY)||'[]')}catch{}const d=[...a].reverse().find(x=>x.platform===currentPlatform()&&x.status==='draft');if(!d)return setStatus('没有找到待验证的生成记录。','warn');const m={};$id('g81Feedback').querySelectorAll('input').forEach(i=>{const v=num(i.value);if(v!==null)m[i.dataset.k]=v});const total=(m.likes||0)+(m.favs||0)+(m.comments||0)+(m.shares||0),days=m.days||1;d.metrics=m;d.performance=m.views?total/m.views:total/Math.max(.25,days);d.status='measured';d.measuredAt=nowISO();localStorage.setItem(EXPKEY,JSON.stringify(a.slice(-120)));$id('g81Feedback').innerHTML='<div class="g81-saved">✓ 已保存，本轮结果会进入后续同平台验证。</div>';setStatus('发布结果已记录。','oktxt')}
function runAll(){ensureUI();const r=analyze();window.__g81Analysis=r;renderAnalysis(r);const top=document.querySelector('.top h1');if(top)top.textContent='多平台内容增长决策系统';const sub=document.querySelector('.top .sub');if(sub)sub.textContent='小红书：高价值分析 → 测试变量 → 内容生成 → 发布验证';const badge=document.querySelector('.badge');if(badge)badge.textContent='V8.1.4';document.title='多平台内容增长决策系统 V8.1.4';const foot=document.querySelector('.foot');if(foot)foot.textContent='V8.1.4：结论在前、行动其次、关键证据随后、原始数据最后；生成结果必须通过测试变量执行校验。'}
const oldRender=window.render;if(typeof oldRender==='function'){window.render=function(){const v=oldRender.apply(this,arguments);setTimeout(runAll,40);return v}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(runAll,90));else setTimeout(runAll,90);
})();