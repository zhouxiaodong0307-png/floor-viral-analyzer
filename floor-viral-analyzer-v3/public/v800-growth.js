(()=>{
'use strict';
const VERSION='8.3.0';
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
  ['video','内容形式为视频',x=>/视频/.test(String(x.contentType||''))],
  ['shortTitle','标题更精简',x=>{const n=String(x.title||'').replace(/\s+/g,'').length;return n>=8&&n<=22}],
  ['decisionTitle','标题直接解决选购问题',x=>/怎么选|适合|区别|差别|值不值|预算|规格|铺法|损耗|稳定|地暖/.test(x.title||'')],
  ['directOpen','正文开头快速进入主题',x=>{const s=String(x.text||'').trim().slice(0,120);return /先看|直接|如果|同样|这次|为什么|怎么|铺|装|用|规格|价格|空间/.test(s)}],
  ['structuredBody','正文结构清晰',x=>{const s=String(x.text||'');return /\n\s*\n/.test(s)||/(?:^|\n)\s*[1-5][.、]/.test(s)}],
  ['mediumBody','正文长度适中',x=>{const n=String(x.text||'').replace(/\s+/g,'').length;return n>=100&&n<=500}],
  ['practicalInfo','正文包含可决策的具体信息',x=>/\d{2,4}\s*[x×*]\s*\d{2,4}|\d+(?:\.\d+)?\s*(?:㎡|平米|平方|元)|地暖|损耗|铺法|规格|收口/.test(x.text||'')],
  ['hasTags','包含话题标签',x=>/#\S+/.test(x.text||'')],
  ['multiImage','图片数量4张及以上',x=>num(x.imageCount)!==null&&num(x.imageCount)>=4],
  ['lowAdTone','弱广告表达',x=>!/特价|清仓|最低|秒杀|加微信|私聊报价|全网最低|厂家直销/.test((x.title||'')+' '+(x.text||''))]
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

function semanticSpec(p){
  if(!p.spec)return null;
  const m=p.spec.match(/(\d{2,4})\s*[x×*]\s*(\d{2,4})(?:\s*[x×*]\s*(\d{1,3}))?/i);
  if(!m)return null;
  return{full:p.spec,length:m[1],width:m[2],thickness:m[3]||''};
}
function numericMeaning(p){
  const sp=semanticSpec(p);
  if(sp)return{type:'规格',value:sp.full,meaning:'板长、板宽和厚度，会影响铺装比例、视觉尺度和选购判断'};
  if(p.area)return{type:'面积',value:p.area,meaning:'实际铺设面积，会影响用量、损耗和铺法选择'};
  if(p.price)return{type:'价格',value:p.price+'元/㎡',meaning:'价格需要和规格、材质、结构及落地条件一起判断'};
  if(p.layout)return{type:'户型',value:p.layout,meaning:'户型和房间尺度会影响规格与铺法选择'};
  return null;
}
function strategyPlan(s,p,variant='A'){
  const n=numericMeaning(p),m=p.mat;
  let action='',angle='',why='';
  if(s.id==='titleSpec'||s.id==='titleNumber'){
    action='标题加入完整且有意义的具体信息';
    if(n?.type==='规格'){angle=variant==='A'?'用完整规格回答“铺出来是什么感觉”':'用完整规格提出“和其他规格差在哪”';why=n.meaning}
    else if(n){angle='把'+n.type+'和真实选购问题连接起来';why=n.meaning}
    else{angle='需要先补充有单位、有含义的真实数字';why='单独的“910”没有语义，不能直接写进标题'}
  }else if(s.id==='titleScene'||s.id==='sceneBody'){action='从真实使用场景切入';angle=variant==='A'?'先说空间，再说产品':'先提家装问题，再给判断';why='让用户先知道这条内容和自己的空间有什么关系'}
  else if(s.id==='titleQuestion'){action='用明确问题做标题入口';angle=variant==='A'?'直接问“怎么选”':'直接问“差别在哪”';why='问题必须对应真实购买决策，而不是空泛提问'}
  else if(s.id==='titleCompare'){action='用对比建立阅读动机';angle=variant==='A'?'单板 VS 铺进空间':'同木种不同规格/铺法的判断差异';why='对比要回答真实选择问题，不做无依据结论'}
  else if(s.id==='titleResult'||s.id==='experience'){action='用真实结果/经验切入';angle=variant==='A'?'先给结果，再讲条件':'先讲经历，再总结判断';why='只使用用户提供的真实经历，不编造体验'}
  else if(s.id==='titlePrice'){action='把真实价格放进决策语境';angle=variant==='A'?'价格 + 为什么不能只看单价':'价格 + 需要一起确认的条件';why='价格数字要帮助判断，不是单纯吸引点击'}
  else if(s.id==='titleInstall'){action='把铺法变成具体选择问题';angle=variant==='A'?'铺法对视觉效果的影响':'铺法对损耗/空间尺度的影响';why='铺法本身是购买决策变量'}
  else if(s.id==='titleArea'||s.id==='titleLayout'){action='把实际空间条件前置';angle=variant==='A'?'面积/户型 + 规格选择':'面积/户型 + 铺法选择';why='空间条件能让内容更贴近真实装修决策'}
  else if(s.id==='howto'||s.id==='saveValue'||s.id==='practicalInfo'){action='提供可收藏的选购信息';angle=variant==='A'?'清单式判断':'问题—答案式判断';why='让信息对用户后续选购有可复用价值'}
  else if(s.id==='discussion'){action='用真实选择题触发讨论';angle=variant==='A'?'两种铺法怎么选':'效果和耐用更看重哪个';why='讨论点要建立在真实取舍上'}
  else if(s.id==='factory'){action='用真实工厂/生产现场建立内容可信度';angle=variant==='A'?'先看真实板面':'先看生产/库存现场';why='现场信息必须真实存在'}
  else if(s.id==='titleMaterial'){action='木种前置但不做泛泛卖点';angle=variant==='A'?'木种 + 选购问题':'木种 + 落地场景';why='木种只是入口，正文要解决选择问题'}
  else {action=s.label;angle=variant==='A'?'从真实装修问题切入':'从具体选择差异切入';why='测试变量要转成用户能理解的内容角度'}
  return{action,angle,why,numeric:n};
}
function naturalXhsGenerate(p,s,variant='A'){
  const m=p.mat,plan=strategyPlan(s,p,variant),n=plan.numeric,sp=semanticSpec(p);
  let title='',body='',cover='',images='';
  if((s.id==='titleSpec'||s.id==='titleNumber')&&sp){
    if(variant==='A'){
      title=sp.full+'的'+m+'，铺出来更适合什么空间？';
      body='同样是'+m+'，规格不同，铺出来的比例感会很不一样。\n\n'+sp.full+'这个规格，我会重点看房间尺度、采光和铺法，再决定它适不适合家里。单看一块板很难判断，最好放到真实空间里看整体效果。';
      cover='首图用真实空间或现场拼铺，角落轻量标注「'+sp.full+'」即可。';
      images='1. 完整空间/拼铺效果；2. 板材近景；3. 规格细节；4. 收口或与柜体的搭配。';
    }else{
      title='同样是'+m+'，'+sp.full+'和小规格铺感差在哪？';
      body='看'+m+'时，规格其实比第一眼颜色更容易被忽略。\n\n'+sp.full+'这类规格放进不同大小的房间，视觉比例会有差别。选择时可以把空间尺度、铺法和收口一起看，不要只盯着单块样板。';
      cover='做“完整规格 + 实际铺装”的对比封面，不写算法词或大段说明。';
      images='1. 两种尺度的铺装对比；2. '+sp.full+'实拍；3. 空间远景；4. 边角/收口。';
    }
  }else if((s.id==='titleSpec'||s.id==='titleNumber')&&n){
    title=variant==='A'?n.value+'铺'+m+'，真正要先看什么？':m+'用到'+n.value+'，选的时候别只看表面效果';
    body='有具体条件以后，判断会比只说“好不好看”更有意义。\n\n这次把'+n.type+'放进真实选购场景里看：'+n.meaning+'。再结合现场空间和铺法，结论才有参考价值。';
    cover='封面只保留「'+n.value+' + '+m+'」和真实产品/空间。';
    images='优先展示和'+n.type+'直接相关的真实细节，再补整体空间。';
  }else if(s.id==='titleScene'||s.id==='sceneBody'){
    title=variant==='A'?'家里准备铺'+m+'，我会先看这3个地方':m+'别只看样板，放进真实空间才知道合不合适';
    body=variant==='A'?'如果是家装在看'+m+'，我会先看客厅采光、柜体颜色和收口位置。\n\n这三个条件确定以后，再选规格和铺法会更稳，也更容易判断最终效果。':'单看一块样板，很容易只注意颜色。\n\n真正铺进家里以后，空间大小、采光、柜体和门套都会影响整体感觉。选'+m+'时，我更建议先看真实空间，再决定规格和铺法。';
    cover='真实客厅/卧室或现场拼铺图，尽量不用纯白底产品照。';
    images='整体空间 → 板面近景 → 柜体/门套搭配 → 收口细节。';
  }else if(s.id==='titleQuestion'){
    title=variant==='A'?m+'地板到底怎么选？先别只看颜色':'同样是'+m+'，为什么有人铺完会觉得不对劲？';
    body='我更建议先把问题拆开看：空间多大、准备怎么铺、规格是否合适、最后怎么收口。\n\n这些条件比单看颜色更接近真正落地时会遇到的问题。';
    cover='封面只放一个清楚的问题，配真实产品或空间图。';
    images='问题对应的真实场景 → 规格 → 铺法 → 收口。';
  }else if(s.id==='titleCompare'){
    title=variant==='A'?'同样是'+m+'，单看板和铺进家里真的不一样':m+'大板和小板怎么选？先看房间尺度';
    body='选地板最容易误判的一点，就是只看手上的一块样板。\n\n真正铺开以后，板宽、长度、房间尺度和铺法会一起影响视觉效果。对比时最好看完整空间，而不是只比单块颜色。';
    cover='左右对比：单块板材 VS 实际铺装空间。';
    images='对比封面 → 单板 → 完整空间 → 细节。';
  }else if(s.id==='titlePrice'&&p.price){
    title=variant==='A'?p.price+'元/㎡的'+m+'，单看这个价格其实不够':m+'卖到'+p.price+'元/㎡，差别通常要从哪里看？';
    body='价格是最直观的信息，但真要判断值不值，还得把规格、结构、铺法和现场条件放在一起看。\n\n这次价格是'+p.price+'元/㎡，后面我会把真正影响选择的几个条件拆开看。';
    cover='真实产品图 + 小字标注「'+p.price+'元/㎡」，避免促销海报感。';
    images='产品实拍 → 规格 → 结构/板面 → 实际铺装。';
  }else if(s.id==='titleInstall'&&p.install){
    title=variant==='A'?m+'做'+p.install+'，铺出来和普通平铺差在哪？':p.install+'铺'+m+'，先看空间大小再决定';
    body='同样是'+m+'，铺法一变，整体比例和视觉节奏就会变。\n\n如果考虑'+p.install+'，我会先看房间尺度、实际面积和收口位置，再决定是不是适合。';
    cover='直接用'+p.install+'完成效果做封面。';
    images='完整铺装 → 拼接近景 → 房间远景 → 收口。';
  }else if(s.id==='titleArea'&&p.area){
    title=variant==='A'?p.area+'铺'+m+'，规格和铺法要先怎么定？':m+'铺'+p.area+'，先把损耗和规格算清楚';
    body='面积明确以后，很多选择会更具体。\n\n'+p.area+'铺'+m+'，我会先确认规格、铺法和损耗，再看最终用量和整体效果。';
    cover='真实空间 + 「'+p.area+'」小字信息。';
    images='空间 → 规格 → 铺法 → 收口。';
  }else if(s.id==='howto'||s.id==='saveValue'||s.id==='practicalInfo'){
    title=variant==='A'?'准备铺'+m+'的，这4点建议先确认':m+'怎么选更省事？先把这4个问题问清楚';
    body='准备铺'+m+'，建议先确认：\n1. 实际面积和损耗\n2. 规格与铺法\n3. 柜体、门套和收口\n4. 真实板面与色差\n\n这四项先弄清楚，后面选具体产品会快很多。';
    cover='清单型封面，只放“铺'+m+'前先确认4点”。';
    images='每张图对应一个问题，顺序和正文一致。';
  }else if(s.id==='discussion'){
    title=variant==='A'?m+'你会选平铺还是花式拼？':'铺'+m+'，你更在意整体效果还是后期省心？';
    body='如果是你家铺'+m+'，你会更在意视觉效果，还是更在意后期打理和施工复杂度？\n\n不同空间、面积和预算，最后选择可能完全不同。';
    cover='两种真实方案做A/B对比。';
    images='A方案 → B方案 → 各自细节。';
  }else if(s.id==='titleResult'||s.id==='experience'){
    title=variant==='A'?m+'真正用过以后，最容易忽略的是这些细节':m+'装完以后再看，和选样板时想的不太一样';
    body=p.raw+'\n\n如果这是真实使用/完工信息，正文重点就放在实际结果、适用条件和需要注意的地方，不额外编造体验。';
    cover='真实完工/使用结果图，不用夸张承诺。';
    images='结果图 → 使用细节 → 容易忽略的位置。';
  }else if(s.id==='factory'&&p.factory){
    title=variant==='A'?'刚在工厂看到一批'+m+'，先看真实板面':'工厂里的'+m+'，和展厅样板最该看什么？';
    body='这次直接看真实生产/库存现场，不加重滤镜。\n\n同一木种也要结合规格、选材和实际铺装条件看，单看一块样板不够。';
    cover='工厂/车间真实现场。';
    images='生产现场 → 板面 → 规格 → 包装/库存。';
  }else{
    title=variant==='A'?m+'地板，先看真实空间再决定':m+'怎么选更合适？别只看第一眼颜色';
    body='看'+m+'时，我更建议把空间、规格、铺法和收口放在一起判断。\n\n单看一块样板很容易只注意颜色，真正落地以后，整体比例和现场搭配更重要。';
    cover='真实空间或产品现场图。';
    images='整体 → 近景 → 规格/铺法 → 收口。';
  }
  const tags='#'+[m,m.includes('地板')?null:m+'地板','实木地板','装修','地板选购'].filter(Boolean).join(' #');
  return{title,body,tags,cover,images,plan};
}
function validateSignal(s,o,p){
  const t=o.title,b=o.body,c=o.cover;
  if(s.id==='titleSpec')return !!p.spec&&t.includes(p.spec);
  if(s.id==='titleNumber')return !!numericMeaning(p)&&(/\d/.test(t));
  if(s.id==='titlePrice')return !!p.price&&t.includes(p.price);
  if(s.id==='titleMaterial')return t.includes(p.mat);
  if(s.id==='titleScene')return /家里|客厅|卧室|家装|装修|空间/.test(t);
  if(s.id==='titleQuestion')return /[？?]|怎么|到底|为什么|差在哪/.test(t);
  if(s.id==='titleResult')return /用了|实测|装完|铺完|住了|结果|完工/.test(t+' '+b);
  if(s.id==='titleCompare')return /对比|差在哪|不一样|怎么选|VS|vs/.test(t);
  if(s.id==='titleLayout')return !!p.layout&&t.includes(p.layout);
  if(s.id==='titleArea')return !!p.area&&t.includes(p.area);
  if(s.id==='titleInstall')return !!p.install&&t.includes(p.install);
  if(s.id==='sceneBody')return /家装|真实空间|客厅|卧室|铺进家里|空间/.test((t+' '+b).slice(0,220));
  if(s.id==='howto'||s.id==='saveValue'||s.id==='practicalInfo')return /1[.、]|4点|问题|确认/.test(b);
  if(s.id==='discussion')return /你会|你更在意|怎么选|[？?]/.test(t+' '+b);
  if(s.id==='experience')return /用过|装完|实际|结果|完工/.test(t+' '+b);
  if(s.id==='factory')return /工厂|车间|生产/.test(t+' '+b);
  if(s.id==='coverScene')return /真实|铺装|场景|空间/.test(c);
  return true;
}
function readabilityCheck(o,s,p){
  const joined=[o.title,o.body,o.cover].join(' ');
  const banned=['本轮测试','本篇围绕','围绕'+(p.otherNum||'__'),'这个具体条件','把数字信息说清楚','测试变量','高表现组','普通组','算法','+11%'];
  const bad=banned.find(x=>x!=='围绕__'&&joined.includes(x));
  if(bad)return{ok:false,reason:'出现后台/机械表达：'+bad};
  if(o.title.length<7||o.title.length>34)return{ok:false,reason:'标题长度不自然'};
  if(String(o.body||'').replace(/\s+/g,'').length<45)return{ok:false,reason:'正文过短'};
  if((s.id==='titleNumber'||s.id==='titleSpec')&&!numericMeaning(p))return{ok:false,reason:'数字没有明确语义'};
  if(/\b\d{2,4}\b/.test(o.title)&&s.id==='titleNumber'&&!/×|x|㎡|平米|平方|元|年|室|房/.test(o.title))return{ok:false,reason:'标题里的数字缺少单位或含义'};
  return{ok:true,reason:''};
}
function eligibility(s,p){
  if(!s)return{ok:false,need:'没有可测试信号'};
  if((s.id==='titleSpec'||s.id==='titleNumber')&&!numericMeaning(p))return{ok:false,need:'有意义的真实数字信息，例如完整规格 910×125×17、面积70㎡或价格530元/㎡'};
  if(s.id==='titlePrice'&&!p.price)return{ok:false,need:'真实价格，例如 530元/㎡'};
  if(s.id==='titleLayout'&&!p.layout)return{ok:false,need:'真实户型，例如 三房两厅'};
  if(s.id==='titleArea'&&!p.area)return{ok:false,need:'真实面积，例如 70㎡'};
  if(s.id==='titleInstall'&&!p.install)return{ok:false,need:'真实铺法，例如 鱼骨 / 人字 / 工字'};
  if((s.id==='titleResult'||s.id==='experience')&&!p.experience)return{ok:false,need:'真实使用/完工结果，避免编造体验'};
  if(s.id==='factory'&&!p.factory)return{ok:false,need:'确认这条内容确实是工厂/生产现场'};
  return{ok:true,need:''};
}
function makeTwoVersions(p,s){
  const a=naturalXhsGenerate(p,s,'A'),b=naturalXhsGenerate(p,s,'B');
  const ca=readabilityCheck(a,s,p),cb=readabilityCheck(b,s,p);
  return[{...a,label:'方案A',mode:'严格测试当前变量',check:ca},{...b,label:'方案B',mode:'同一变量的另一种表达',check:cb}];
}



function ensureUI(){
  document.querySelector('.stats')?.classList.add('g81-hide');
  $id('marketAnalysisCard')?.classList.add('g81-hide');
  $id('g81Decision')?.classList.add('g81-hide');
  $id('g81Report')?.classList.add('g81-hide');
  $id('g82Report')?.classList.add('g81-hide');
  $id('g81Middle')?.classList.add('g81-hide');
  $id('g81Details')?.classList.add('g81-hide');
  $id('g82DetailToggle')?.classList.add('g81-hide');
  const oldGen=$id('genKeyword')?.closest('.card');if(oldGen)oldGen.classList.add('g81-hide');

  const cards=[...document.querySelectorAll('.card')];
  const capture=cards.find(x=>x.querySelector('.label')?.textContent.includes('抓取数据'));
  const raw=cards.find(x=>x.querySelector('.label')?.textContent==='抓取结果');
  const mobile=$id('mobileCollectCard');
  if(capture)capture.classList.add('g83-hidden-support');
  if(raw)raw.classList.add('g83-hidden-support');
  if(mobile)mobile.classList.add('g83-hidden-support');

  let flow=$id('g83Flow');
  if(!flow){
    flow=document.createElement('div');flow.id='g83Flow';flow.className='g83-flow';
    flow.innerHTML=
      '<section class="g83-hero" id="g83Hero">'+
        '<div class="g83-kicker">小红书 · 本轮结论</div>'+
        '<h2 id="g83HeroTitle">正在分析本轮数据</h2>'+
        '<p class="g83-summary" id="g83HeroSummary">系统会把复杂数据压缩成一个结论和一个下一步动作。</p>'+
        '<div class="g83-signal" id="g83Signal"></div>'+
        '<div class="g83-next"><span>下一步</span><b id="g83Next">等待分析</b><p id="g83NextText"></p></div>'+
        '<button id="g83GenerateTop" class="g83-primary">生成下一轮测试内容</button>'+
        '<div class="g83-meta" id="g83Meta"></div>'+
      '</section>'+
      '<section class="g83-why">'+
        '<div class="g83-section-head"><div><span>②</span><b>为什么</b></div><small>只保留会影响下一步决定的信息</small></div>'+
        '<div id="g83WhyList" class="g83-why-list"></div>'+
        '<div id="g83BestRef" class="g83-best-ref" style="display:none"></div>'+
        '<button id="g83OpenAnalysis" class="g83-secondary">查看完整分析</button>'+
      '</section>'+
      '<section class="g83-generate" id="g83GenerateSection">'+
        '<div class="g83-section-head"><div><span>③</span><b>生成下一篇</b></div><small>先理解产品，再执行测试变量</small></div>'+
        '<div class="g83-input-row"><input id="g81Product" placeholder="输入真实商品信息，例如：柚木 910×125×17 530元/㎡"><button id="g81Generate" class="g83-primary">生成</button></div>'+
        '<div id="g81Need" class="g81-need"></div>'+
        '<div id="g81Output" class="g81-output g81-empty-output">输入商品信息后生成可直接发布的小红书内容。</div>'+
      '</section>'+
      '<div class="g83-bottom-actions"><button id="g83AnalysisBottom" class="g83-secondary">查看完整分析</button><button id="g83Recapture" class="g83-secondary">重新抓取数据</button></div>'+
      '<section class="g83-analysis" id="g83Analysis">'+
        '<div class="g83-analysis-head"><b>完整分析</b><button id="g83CloseAnalysis">收起</button></div>'+
        '<div class="g83-accordion">'+
          '<button class="g83-acc-btn" data-target="g83Quality"><span>数据质量</span><em>展开</em></button><div id="g83Quality" class="g83-acc-body"></div>'+
          '<button class="g83-acc-btn" data-target="g83Diff"><span>高低表现差异</span><em>展开</em></button><div id="g83Diff" class="g83-acc-body"><div id="g81Evidence" class="g81-evidence"></div></div>'+
          '<button class="g83-acc-btn" data-target="g83Cases"><span>高价值案例</span><em>展开</em></button><div id="g83Cases" class="g83-acc-body"><div id="g81High" class="g81-high-list"></div><button id="g81ShowHigh" class="g81-more">查看全部高价值样本</button></div>'+
          '<button class="g83-acc-btn" data-target="g83Anomaly"><span>异常案例</span><em>展开</em></button><div id="g83Anomaly" class="g83-acc-body"></div>'+
          '<button class="g83-acc-btn" data-target="g83Raw"><span>原始数据</span><em>展开</em></button><div id="g83Raw" class="g83-acc-body"></div>'+
        '</div>'+
        '<div id="g81DetailFoot" class="g81-detail-foot"></div>'+
      '</section>'+
      '<section class="g83-capture-panel" id="g83CapturePanel"></section>';
    document.querySelector('.top')?.after(flow);
  }

  const rawSlot=$id('g83Raw');
  if(raw&&rawSlot&&!rawSlot.contains(raw)){raw.classList.remove('g83-hidden-support');rawSlot.appendChild(raw)}
  const captureSlot=$id('g83CapturePanel');
  if(capture&&captureSlot&&!captureSlot.contains(capture)){capture.classList.remove('g83-hidden-support');captureSlot.appendChild(capture)}
  if(mobile&&captureSlot&&!captureSlot.contains(mobile)){mobile.classList.remove('g83-hidden-support');captureSlot.appendChild(mobile)}
  captureSlot?.classList.remove('show');

  const scrollGenerate=()=>{$id('g83GenerateSection')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$id('g81Product')?.focus(),250)};
  $id('g83GenerateTop').onclick=scrollGenerate;
  $id('g81Generate').onclick=generateCurrent;
  const openAnalysis=()=>{$id('g83Analysis').classList.add('show');$id('g83Analysis').scrollIntoView({behavior:'smooth',block:'start'})};
  $id('g83OpenAnalysis').onclick=openAnalysis;
  $id('g83AnalysisBottom').onclick=openAnalysis;
  $id('g83CloseAnalysis').onclick=()=>$id('g83Analysis').classList.remove('show');
  $id('g83Recapture').onclick=()=>{$id('g83CapturePanel').classList.toggle('show');if($id('g83CapturePanel').classList.contains('show'))$id('g83CapturePanel').scrollIntoView({behavior:'smooth',block:'start'})};

  document.querySelectorAll('.g83-acc-btn').forEach(btn=>{
    btn.onclick=()=>{
      const body=$id(btn.dataset.target),open=body.classList.toggle('show');
      btn.classList.toggle('open',open);btn.querySelector('em').textContent=open?'收起':'展开';
    };
  });
  $id('g81ShowHigh').onclick=()=>{window.__g81ShowAll=!window.__g81ShowAll;renderHigh(window.__g81Analysis);$id('g81ShowHigh').textContent=window.__g81ShowAll?'只看3条典型样本':'查看全部高价值样本'};
}


function dimCoverage(rows,key){if(!rows.length)return 0;return rows.filter(x=>x.__dims&&x.__dims[key]!==null&&x.__dims[key]!==undefined).length/rows.length}
function metricLayers(r){
  if(r.platform!=='小红书')return[];
  const specs=[
    ['高浏览型','views','浏览'],
    ['高点赞型',dimCoverage(r.pool,'likeRate')>=.25?'likeRate':'likes','点赞'],
    ['高收藏型',dimCoverage(r.pool,'favRate')>=.25?'favRate':'favs','收藏'],
    ['高评论型',dimCoverage(r.pool,'commentRate')>=.25?'commentRate':'comments','评论'],
    ['高转发型',dimCoverage(r.pool,'shareRate')>=.25?'shareRate':'shares','转发'],
    ['综合互动型','totalRate','综合互动'],
    ['短期增长型','speed','增长速度']
  ];
  return specs.map(([name,key,label])=>{
    const rows=r.pool.filter(x=>x.__dims[key]!==null&&x.__dims[key]!==undefined&&Number.isFinite(x.__dims[key]));
    const cov=r.pool.length?rows.length/r.pool.length:0;
    if(rows.length<20||cov<.15)return{name,key,label,available:false,coverage:cov,reason:'当前该指标覆盖不足，无法可靠分析'};
    const sorted=rows.slice().sort((a,b)=>b.__dims[key]-a.__dims[key]),n=Math.max(5,Math.ceil(sorted.length*.20)),high=sorted.slice(0,n),normal=sorted.slice(n);
    const fs=evidence(high,normal,r.model.features,cov,1,0).filter(x=>x.diff>0).sort((a,b)=>b.diff-a.diff||b.z-a.z);
    return{name,key,label,available:true,coverage:cov,count:rows.length,highCount:high.length,top:fs[0]||null};
  });
}
function explainFinding(f){
  if(!f)return'';
  if(f.category==='可以复用')return'这个特征在高表现内容中明显更常见，而且当前证据相对稳定，可以继续使用。';
  if(f.category==='值得测试')return'高表现内容中出现得更多，但还不能证明是稳定规律，更适合放进下一轮做单变量测试。';
  if(f.diff>0)return'高表现内容中略多一些，但差异还不足以支撑固定做法，目前只作为观察信号。';
  return'高低表现组差异很小，本轮不建议参考。';
}
function contentProfile(r){return r.reusable.concat(r.testable).filter(x=>x.diff>0).slice(0,5).map(x=>x.label)}
function opportunityMap(r){
  const reuse=r.reusable.slice(0,4),test=r.testable.slice(0,5);
  if(!test.length&&r.exploratory)test.push(r.exploratory);
  const noRef=r.findings.filter(x=>x.category==='暂无价值'&&Math.abs(x.diff)<.05).slice(0,5);
  return{reuse,test,noRef};
}
function humanSummary(r){
  const s=r.strongest||r.exploratory;
  if(r.reusable.length){
    const names=r.reusable.slice(0,3).map(x=>'“'+x.label+'”').join('、');
    return'本轮'+r.batch.length+'条小红书笔记中，已经出现相对稳定的内容差异：'+names+'更常出现在高表现内容里，可以优先用于下一轮内容。';
  }
  if(s){
    return'本轮'+r.batch.length+'条小红书笔记中，暂时没有发现足够稳定的强规律；目前最明显的信号是“'+s.label+'”，高表现 '+fmtPct(s.hp)+'、普通 '+fmtPct(s.np)+'、差异 '+(s.diff>=0?'+':'')+Math.round(s.diff*100)+'%，属于'+s.level+'，更适合继续测试而不是直接固化成模板。';
  }
  return'本轮'+r.batch.length+'条小红书笔记中，没有发现足够稳定的强规律，高表现组和普通组的内容写法整体较接近；这本身也是有效结论，当前更应该补完整互动数据，而不是硬造一个“爆款公式”。';
}
function nextAdvice(r){
  const s=r.strongest||r.exploratory;
  if(!s)return{title:'本轮先不固定内容模板',doText:'先看分析报告里的观察信号，同时优先补充点赞、收藏、评论、转发等表现数据。',dont:'不要因为样本接近500条就强行制造规律。',purpose:'下一轮先提高可判断性，再验证内容差异。'};
  let doText=s.label;
  if(s.id==='titleSpec'||s.id==='titleNumber')doText='标题加入与用户决策有关的完整具体信息，例如完整规格，并围绕空间适配、铺装效果或规格差异设计问题。';
  else if(s.id==='titleScene'||s.id==='sceneBody')doText='从真实家装场景切入，先让用户看到“这和我的空间有什么关系”。';
  else if(s.id==='titleCompare')doText='用真实对比回答一个选择问题，不做没有依据的结论。';
  else if(s.id==='titleQuestion')doText='标题直接提出一个具体选购问题，正文必须真正回答。';
  return{title:s.label,doText,dont:(s.id==='titleSpec'||s.id==='titleNumber')?'不要把“910”这种孤立数字硬塞进标题；数字必须有单位、有意义。':'不要把后台统计标签直接写进正文。',purpose:'本轮只测试这一主变量，正文和图片风格尽量保持接近，用发布结果验证这个信号。'};
}

function bestReference(r){
  if(!r||!r.high?.length)return null;
  const signal=r.strongest||r.exploratory||null;
  const validUrl=x=>{const u=String(x.url||'');return /^https?:\/\//i.test(u)&&!/\/search_result_ai(?:\?|$)/i.test(u)&&!/\/search(?:_result)?(?:\?|$)/i.test(u)};
  const candidates=r.high.filter(validUrl);
  if(!candidates.length)return null;
  const maxScore=Math.max(...candidates.map(x=>Number(x.__score)||0),1);
  const featureFn=signal?r.model.features.find(z=>z[0]===signal.id)?.[2]:null;
  const ranked=candidates.map(x=>{
    const perf=(Number(x.__score)||0)/maxScore;
    const complete=Number(x.__complete)||0;
    const match=featureFn&&featureFn(x)?1:0;
    const fresh=ageDays(x)!==null&&ageDays(x)<=7?1:0;
    const urlQuality=/xiaohongshu\.com\/(?:explore|discovery\/item)\//i.test(String(x.url||''))?1:.4;
    return{x,score:perf*.46+complete*.22+match*.20+fresh*.06+urlQuality*.06};
  }).sort((a,b)=>b.score-a.score);
  const pick=ranked[0]?.x;if(!pick)return null;
  const reasons=itemReasons(pick,r.model);
  if(signal&&featureFn&&featureFn(pick))reasons.unshift('符合本轮最值得测试的内容特征：'+signal.label);
  return{
    title:pick.title||'高价值参考笔记',
    url:pick.url,
    kind:pick.__kind||r.dominant||'高表现内容',
    reasons:[...new Set(reasons)].slice(0,3),
    score:pick.__score,
    rank:pick.rank||null
  };
}
function buildReport(r){
  if(!r||r.empty||r.unsupported)return null;
  const layers=metricLayers(r),opp=opportunityMap(r),topFindings=(r.reusable.concat(r.testable).length?r.reusable.concat(r.testable):(r.observed||[]).filter(x=>x.diff>0)).slice(0,5);
  const stop=db.lastMeta&&db.lastMeta.stoppedBy,stopMap={target:'达到目标500条',manual:'手动停止',saturated:'平台样本已饱和','safety-time-limit':'达到安全时限'};
  return{id:(db.lastCapturedAt||'latest')+'|'+r.platform,platform:r.platform,createdAt:nowISO(),summary:humanSummary(r),sample:{raw:r.batch.length,valid:r.pool.length,high:r.high.length,normal:r.normal.length},topFindings:topFindings.map(x=>({...x,explain:explainFinding(x)})),layers,profile:contentProfile(r),opportunity:opp,next:nextAdvice(r),reference:bestReference(r),limits:{coverage:r.coverage,stability:r.stability,anomalies:r.anomalies.length,rankOnlyRate:r.rankOnlyRate,stop:stopMap[stop]||''},confidence:r.confidence};
}
function saveReport(rep){
  if(!rep)return;let a=[];try{a=JSON.parse(localStorage.getItem(REPORTKEY)||'[]')}catch{}
  const i=a.findIndex(x=>x.id===rep.id);if(i>=0)a[i]=rep;else a.push(rep);
  localStorage.setItem(REPORTKEY,JSON.stringify(a.slice(-30)));
}
function reportText(rep){
  if(!rep)return'暂无报告';
  const f=rep.topFindings.map((x,i)=>(i+1)+'. '+x.label+'｜高表现 '+fmtPct(x.hp)+'｜普通 '+fmtPct(x.np)+'｜差异 '+(x.diff>=0?'+':'')+Math.round(x.diff*100)+'%｜'+x.level+'\n   '+x.explain).join('\n');
  const layer=rep.layers.map(x=>x.available?(x.name+'：'+(x.top?('最明显差异“'+x.top.label+'” '+(x.top.diff>=0?'+':'')+Math.round(x.top.diff*100)+'%'):'暂未发现明显内容差异')):(x.name+'：当前无法分析该维度')).join('\n');
  const reuse=rep.opportunity.reuse.length?rep.opportunity.reuse.map(x=>x.label).join('、'):'暂无';
  const test=rep.opportunity.test.length?rep.opportunity.test.map(x=>x.label).join('、'):'暂无';
  const noRef=rep.opportunity.noRef.length?rep.opportunity.noRef.map(x=>x.label).join('、'):'暂无明确项目';
  const ref=rep.reference?['','【最值得查看的1条高价值笔记】',rep.reference.title,rep.reference.reasons.join('；'),rep.reference.url]:[];return ['【本轮小红书综合分析】',rep.summary,'','【样本】','抓取 '+rep.sample.raw+'｜进入分析 '+rep.sample.valid+'｜高价值 '+rep.sample.high+'｜普通 '+rep.sample.normal,'','【本轮发现】',f||'没有达到展示门槛的正向差异。','','【高表现主要赢在哪里】',layer,'','【高价值内容画像】',rep.profile.length?rep.profile.join('、'):'暂无足够差异支持稳定画像','','【内容机会地图】','可以直接复用：'+reuse,'值得测试：'+test,'暂时不要参考：'+noRef,...ref,'','【下一轮建议】',rep.next.title,rep.next.doText,'不要：'+rep.next.dont,'目的：'+rep.next.purpose,'','【可信度限制】','核心数据覆盖 '+Math.round(rep.limits.coverage*100)+'%｜去偏保留 '+Math.round(rep.limits.stability*100)+'%｜异常案例 '+rep.limits.anomalies+'｜排序参考 '+Math.round(rep.limits.rankOnlyRate*100)+'%'+(rep.limits.stop?'｜采集结束：'+rep.limits.stop:'')].join('\n');
}

function renderReport(r){
  const rep=buildReport(r);if(!rep)return;saveReport(rep);window.__g82Report=rep;
  const signal=r.strongest||r.exploratory||null;
  const hasStrong=r.reusable.length>0;
  $id('g83HeroTitle').textContent=hasStrong
    ?('当前最值得继续使用：'+(signal?.label||'已发现稳定差异'))
    :(signal?('当前最值得继续测试：'+signal.label):'这轮没有发现稳定强规律');
  $id('g83HeroSummary').textContent=rep.summary;

  if(signal){
    $id('g83Signal').innerHTML=
      '<div><span>高表现</span><b>'+fmtPct(signal.hp)+'</b></div>'+
      '<div><span>普通</span><b>'+fmtPct(signal.np)+'</b></div>'+
      '<div><span>差异</span><b>'+(signal.diff>=0?'+':'')+Math.round(signal.diff*100)+'%</b></div>'+
      '<div><span>证据</span><b>'+esc(signal.level)+'</b></div>';
  }else{
    $id('g83Signal').innerHTML='<div class="g83-no-signal">当前没有达到最低测试门槛的正向差异。</div>';
  }

  $id('g83Next').textContent=rep.next.title;
  $id('g83NextText').textContent=rep.next.doText;
  $id('g83Meta').textContent=rep.sample.raw+'条样本 · '+rep.sample.high+'条高表现 · 核心数据覆盖'+Math.round(rep.limits.coverage*100)+'% · 可信度'+rep.confidence[0];

  const findings=rep.topFindings.filter(x=>x.diff>0).slice(0,3);
  $id('g83WhyList').innerHTML=findings.length
    ?findings.map((x,i)=>'<div class="g83-why-row"><span>'+(i+1)+'</span><b>'+esc(x.label)+'</b><em>高表现 '+fmtPct(x.hp)+' vs 普通 '+fmtPct(x.np)+'</em><strong>'+(x.diff>=0?'+':'')+Math.round(x.diff*100)+'%</strong><small>'+esc(x.level)+'</small></div>').join('')
    :'<div class="g83-empty">高表现组和普通组目前没有足够大的内容差异。</div>';

  const ref=$id('g83BestRef');
  if(rep.reference){
    ref.innerHTML='<div><span>本轮最值得研究的1条</span><b>'+esc(rep.reference.title)+'</b><small>'+esc(rep.reference.reasons.join('；'))+'</small></div><a href="'+esc(rep.reference.url)+'" target="_blank" rel="noopener">查看原笔记</a>';
    ref.style.display='grid';
  }else ref.style.display='none';

  const q=$id('g83Quality');
  if(q)q.innerHTML=
    '<div class="g83-detail-line"><span>抓取</span><b>'+rep.sample.raw+'条</b></div>'+
    '<div class="g83-detail-line"><span>进入分析</span><b>'+rep.sample.valid+'条</b></div>'+
    '<div class="g83-detail-line"><span>高价值样本</span><b>'+rep.sample.high+'条</b></div>'+
    '<div class="g83-detail-line"><span>核心数据覆盖</span><b>'+Math.round(rep.limits.coverage*100)+'%</b></div>'+
    '<div class="g83-detail-line"><span>去偏保留</span><b>'+Math.round(rep.limits.stability*100)+'%</b></div>'+
    '<div class="g83-detail-line"><span>综合可信度</span><b>'+rep.confidence[0]+'</b></div>';

  const an=$id('g83Anomaly');
  if(an){
    const arr=(r.anomalies||[]).slice(0,5);
    an.innerHTML=arr.length?arr.map((x,i)=>'<a class="g83-anomaly" href="'+esc(x.url||'#')+'" target="_blank" rel="noopener"><span>'+(i+1)+'</span><b>'+esc(x.title||'未命名')+'</b><em>'+esc(x.__kind||'异常高表现')+'</em></a>').join(''):'<div class="g83-empty">本轮没有需要单独查看的异常高表现案例。</div>';
  }
}

function renderHigh(r){
  if(!r||!r.high){$id('g81High').innerHTML='';return}const arr=window.__g81ShowAll?r.high:r.high.slice(0,3);
  $id('g81High').innerHTML=arr.map((x,i)=>'<a class="g81-high" href="'+esc(x.url||'#')+'" target="_blank" rel="noopener"><span class="g81-no">'+(i+1)+'</span><div><b>'+esc(x.title||'未命名')+'</b><small>'+esc(x.__kind)+' · '+esc(itemReasons(x,r.model).join('；'))+'</small></div><span class="g81-open">打开</span></a>').join('')||'<div class="g81-muted">暂无足够高价值样本。</div>';$id('g81ShowHigh').style.display=r.high.length>3?'inline-flex':'none';
}
function signalPool(r){const a=r.reusable.concat(r.testable);if(!a.length&&r.exploratory)a.push(r.exploratory);return a}
function metrics(r){const s=r.strongest,signal=s?((s.diff>=0?'+':'')+Math.round(s.diff*100)+'%'):'—';return[[r.pool.length,'有效样本'],[r.high.length,'高价值样本'],[Math.round(r.coverage*100)+'%','核心数据覆盖'],[signal,'本轮最强信号'],[r.confidence[0],'综合可信度']]}

function renderAnalysis(r){
  ensureUI();window.__g81Analysis=r;
  if(r.unsupported){$id('g82Summary').textContent='当前平台尚未建立独立分析模型。';return}
  if(r.empty){$id('g82Summary').textContent='还没有本轮抓取数据。完成抓取后会自动生成综合报告。';return}
  const pool=signalPool(r),active=pool.length?pool[(window.__g81Seed||0)%pool.length]:null;window.__g81ActiveSignal=active;
  renderReport(r);
  $id('g81Evidence').innerHTML=r.findings.slice(0,10).map(f=>'<div class="g81-evidence-row"><div><b>'+esc(f.label)+'</b><span>'+esc(f.category)+' · '+esc(f.level)+'</span></div><strong>'+(f.diff>=0?'+':'')+Math.round(f.diff*100)+'%</strong><small>高表现 '+f.hc+'/'+r.high.length+' = '+fmtPct(f.hp)+' ｜ 普通 '+f.nc+'/'+r.normal.length+' = '+fmtPct(f.np)+' ｜ 样本 '+f.total+'</small></div>').join('');
  $id('g81DetailFoot').textContent='本轮高价值主要类型：'+r.dominant+'。去偏保留 '+Math.round(r.stability*100)+'%；异常高表现 '+r.anomalies.length+' 条已单独剥离；排序参考占 '+Math.round(r.rankOnlyRate*100)+'%。';
  renderHigh(r);
}


function generatorWhy(r,s,p){
  const plan=strategyPlan(s,p,'A');
  return[['本轮测试变量',s.label],['策略怎么执行',plan.action+'；'+plan.angle],['为什么这样写',plan.why],['证据',s.level+'；高表现 '+fmtPct(s.hp)+' / 普通 '+fmtPct(s.np)+' / '+(s.diff>=0?'+':'')+Math.round(s.diff*100)+'%']];
}
function versionHtml(v,idx){
  const ok=v.check&&v.check.ok;
  return '<div class="g82-version"><div class="g82-version-head"><div><span>'+esc(v.label)+'</span><b>'+esc(v.mode)+'</b></div><em class="'+(ok?'ok':'bad')+'">'+(ok?'✓ 可读性通过':'✕ 需重生成')+'</em></div><div class="g81-field"><span>标题</span><strong>'+esc(v.title)+'</strong></div><div class="g81-field"><span>正文</span><pre>'+esc(v.body)+'</pre></div><div class="g81-field-row"><div class="g81-field"><span>话题 / 搜索词</span><p>'+esc(v.tags)+'</p></div><div class="g81-field"><span>封面建议</span><p>'+esc(v.cover)+'</p></div></div><div class="g81-field"><span>图片内容建议</span><p>'+esc(v.images)+'</p></div><div class="g81-output-actions"><button class="g81-primary g82-copy-version" data-i="'+idx+'">复制'+esc(v.label)+'</button><button class="g81-secondary g82-record-version" data-i="'+idx+'">记录发布结果</button></div></div>';
}

function renderOutput(r,s,p,versions){
  window.__g82Versions=versions;window.__g83VersionIndex=0;
  const basis=generatorWhy(r,s,p);
  const renderVersion=()=>{
    const idx=window.__g83VersionIndex||0,v=versions[idx],ok=v.check&&v.check.ok;
    $id('g81Output').classList.remove('g81-empty-output');
    $id('g81Output').innerHTML=
      '<div class="g83-output-head"><div><span>本轮测试</span><b>'+esc(s.label)+'</b></div><em class="'+(ok?'ok':'bad')+'">'+(ok?'✓ 已执行':'✕ 未执行')+'</em></div>'+
      '<div class="g83-publish-field"><span>标题</span><strong>'+esc(v.title)+'</strong></div>'+
      '<div class="g83-publish-field"><span>正文</span><pre>'+esc(v.body)+'</pre></div>'+
      '<div class="g83-publish-grid"><div class="g83-publish-field"><span>封面建议</span><p>'+esc(v.cover)+'</p></div><div class="g83-publish-field"><span>话题</span><p>'+esc(v.tags)+'</p></div></div>'+
      '<div class="g83-output-actions"><button id="g83CopyVersion" class="g83-primary">复制当前版本</button><button id="g83SwapVersion" class="g83-secondary">换一个版本</button><button id="g83BasisToggle" class="g83-link">查看生成依据</button><button id="g83RecordVersion" class="g83-secondary">记录发布结果</button></div>'+
      '<div id="g83Basis" class="g83-basis">'+basis.map(([a,b])=>'<div><span>'+esc(a)+'</span><b>'+esc(b)+'</b></div>').join('')+'</div>'+
      '<div id="g81Feedback" class="g81-feedback"></div>';
    $id('g83CopyVersion').onclick=async()=>{const text='【标题】\n'+v.title+'\n\n【正文】\n'+v.body+'\n\n【话题】\n'+v.tags+'\n\n【封面建议】\n'+v.cover;try{await navigator.clipboard.writeText(text);setStatus('当前版本已复制。','oktxt')}catch{setStatus('复制失败，请手动复制。','warn')}};
    $id('g83SwapVersion').onclick=()=>{window.__g83VersionIndex=(idx+1)%versions.length;renderVersion()};
    $id('g83BasisToggle').onclick=()=>{const b=$id('g83Basis'),open=b.classList.toggle('show');$id('g83BasisToggle').textContent=open?'收起生成依据':'查看生成依据'};
    $id('g83RecordVersion').onclick=()=>{window.__g82RecordIndex=idx;renderFeedback()};
  };
  renderVersion();
}

function saveDraft(r,s,p,versions){
  let a=[];try{a=JSON.parse(localStorage.getItem(EXPKEY)||'[]')}catch{}
  versions.forEach((o,i)=>a.push({id:'exp_'+Date.now()+'_'+i,platform:r.platform,product:p.raw,strategy:s.label,signalId:s.id,category:s.category,evidence:s.level,variant:o.label,title:o.title,body:o.body,cover:o.cover,images:o.images,createdAt:nowISO(),status:'draft'}));
  localStorage.setItem(EXPKEY,JSON.stringify(a.slice(-120)));
}
function generateCurrent(){
  const r=window.__g81Analysis||analyze(),s=window.__g81ActiveSignal||r.strongest||r.exploratory,raw=$id('g81Product')?.value.trim();
  if(!raw)return setStatus('先输入你准备发布的真实商品信息。','bad');
  if(!s)return setStatus('本轮没有达到最低测试门槛的变量。先看综合报告里的观察信号和数据缺口。','warn');
  const p=parseProduct(raw),elig=eligibility(s,p);
  if(!elig.ok){$id('g81Need').textContent='当前策略「'+s.label+'」还缺：'+elig.need+'。系统不会为了执行变量而硬编内容。';$id('g81Product').focus();return}
  $id('g81Need').textContent='';
  let versions=makeTwoVersions(p,s);
  if(versions.some(v=>!validateSignal(s,v,p)||!v.check.ok)){
    versions=makeTwoVersions(p,s);
  }
  const bad=versions.find(v=>!validateSignal(s,v,p)||!v.check.ok);
  if(bad)return setStatus('可读性自检未通过：'+(bad.check?.reason||'测试变量未执行')+'。请补充更完整的商品信息后再生成。','bad');
  renderOutput(r,s,p,versions);saveDraft(r,s,p,versions);
  setStatus('已生成两个自然版本，并通过“测试变量执行 + 可读性”双重检查。','oktxt');
}

function renderFeedback(){const box=$id('g81Feedback');box.innerHTML='<div class="g81-feedback-title">发布后记录结果</div><div class="g81-feedback-grid"><label>浏览<input data-k="views" inputmode="decimal"></label><label>点赞<input data-k="likes" inputmode="decimal"></label><label>收藏<input data-k="favs" inputmode="decimal"></label><label>评论<input data-k="comments" inputmode="decimal"></label><label>转发<input data-k="shares" inputmode="decimal"></label><label>发布天数<input data-k="days" inputmode="decimal"></label></div><button id="g81SaveFeedback" class="g81-primary">保存结果</button>';box.classList.add('show');$id('g81SaveFeedback').onclick=saveFeedback}
function saveFeedback(){let a=[];try{a=JSON.parse(localStorage.getItem(EXPKEY)||'[]')}catch{}const wanted=window.__g82Versions&&window.__g82Versions[window.__g82RecordIndex||0]?.label;const d=[...a].reverse().find(x=>x.platform===currentPlatform()&&x.status==='draft'&&(!wanted||x.variant===wanted));if(!d)return setStatus('没有找到待验证的生成记录。','warn');const m={};$id('g81Feedback').querySelectorAll('input').forEach(i=>{const v=num(i.value);if(v!==null)m[i.dataset.k]=v});const total=(m.likes||0)+(m.favs||0)+(m.comments||0)+(m.shares||0),days=m.days||1;d.metrics=m;d.performance=m.views?total/m.views:total/Math.max(.25,days);d.status='measured';d.measuredAt=nowISO();localStorage.setItem(EXPKEY,JSON.stringify(a.slice(-120)));$id('g81Feedback').innerHTML='<div class="g81-saved">✓ 已保存，本轮结果会进入后续同平台验证。</div>';setStatus('发布结果已记录。','oktxt')}
function runAll(){ensureUI();const r=analyze();window.__g81Analysis=r;renderAnalysis(r);const top=document.querySelector('.top h1');if(top)top.textContent='多平台内容增长决策系统';const sub=document.querySelector('.top .sub');if(sub)sub.textContent='小红书 · 决策流程';const badge=document.querySelector('.badge');if(badge)badge.textContent='V8.3.0';document.title='多平台内容增长决策系统 V8.3.0';const foot=document.querySelector('.foot');if(foot)foot.textContent='V8.3.0：一屏一个重点：结论 → 为什么 → 生成；详细证据默认隐藏。'}
const oldRender=window.render;if(typeof oldRender==='function'){window.render=function(){const v=oldRender.apply(this,arguments);setTimeout(runAll,40);return v}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(runAll,90));else setTimeout(runAll,90);
})();