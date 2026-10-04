(()=>{
'use strict';
const VERSION='8.4.0';
const EXPKEY='floorGrowthExperimentsV81';
const REPORTKEY='floorGrowthReportsV814';
const $id=id=>document.getElementById(id);
const num=v=>(v===null||v===undefined||v===''||!Number.isFinite(Number(v)))?null:Number(v);
const pos=v=>{const x=num(v);return x!==null&&x>0?x:null};
const normText=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').replace(/[^\u4e00-\u9fa5a-z0-9#×x㎡?？]+/g,' ').trim();
const fmtPct=v=>v==null?'—':(v*100).toFixed(v<.1?1:0)+'%';
const nowISO=()=>new Date().toISOString();
function detectPlatform(raw){
  try{
    if(typeof siteFromUrl==='function'){const v=siteFromUrl(raw||'');if(v&&v!=='未知网站')return v}
    const h=new URL(raw||'').hostname.toLowerCase();
    if(h.includes('goofish.com')||h==='2.taobao.com'||h.endsWith('.2.taobao.com'))return'闲鱼';
    if(h.includes('xiaohongshu.com')||h.includes('xhslink.com'))return'小红书';
    return h.replace(/^www\./,'')||'未知平台'
  }catch{return''}
}
const currentPlatform=()=>{
  const src=(db.lastMeta&&db.lastMeta.source)||db.lastSource||'';
  const detected=detectPlatform(src);
  if(detected)return detected;
  return (db.lastMeta&&db.lastMeta.platform)||db.lastSite||site||'未知平台'
};
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
function xyType(x){
  const t=normText((x.title||'')+' '+(x.text||''));
  if(/二手|闲置|拆旧|中古|个人转让|自用/.test(t))return'二手/闲置';
  if(/全新|新品|未使用|原包装/.test(t))return'全新商品';
  if(/库存|现货|清仓|尾货|批发|工程单/.test(t))return'库存/货源';
  if(/工厂|厂家|车间|仓库|一手货源/.test(t))return'厂家/商家';
  if(/包邮|发货|自提|送货|物流|同城/.test(t))return'交付/物流';
  if(/客厅|卧室|家装|装修|铺装|实景|效果|案例/.test(t))return'场景/案例';
  if(/价格|特价|多少钱|低价|性价比/.test(t))return'价格型';
  return'标准商品';
}
function genericType(x){
  const t=normText((x.title||'')+' '+(x.text||''));
  if(/怎么|为什么|攻略|教程|避坑|科普|清单|指南|测评/.test(t))return'知识/指南';
  if(/案例|实景|现场|体验|使用|完工|结果/.test(t))return'案例/体验';
  if(/价格|预算|特价|优惠|多少钱/.test(t))return'价格/交易';
  if(/工厂|厂家|库存|现货|仓库|货源/.test(t))return'货源/供给';
  if(/对比|区别|vs|选择|怎么选/.test(t))return'对比/决策';
  return'产品/内容展示';
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
  const commerce=[num(x.wants),num(x.consults),num(x.sales??x.sold)].filter(v=>v!==null);
  if(p==='闲鱼'||commerce.length){const a=[num(x.wants),num(x.comments),num(x.consults),num(x.sales??x.sold)].filter(v=>v!==null);return a.length?a.reduce((s,v)=>s+v,0):null}
  const a=[num(x.likes),num(x.favs),num(x.comments),num(x.shares)].filter(v=>v!==null);return a.length?a.reduce((s,v)=>s+v,0):null
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
  ['titleNumber','标题采用数字清单/数量结构',x=>/(?:^|[^\d])\d{1,2}\s*(?:个|条|点|种|件|步|招|坑|建议|问题|理由|方法|误区|细节)/.test(x.title||'')],
  ['titleYears','标题出现明确时间/使用年限',x=>/\d+(?:\.\d+)?\s*(?:年|个月|月|天)/.test(x.title||'')],
  ['titlePrice','标题直接出现具体价格',x=>/[¥￥]\s*\d|\d+(?:\.\d+)?\s*元/.test(x.title||'')],
  ['titleMaterial','标题直接出现具体木种',x=>/(红檀香|缅甸柚木|柚木|橡木|白橡|欧橡|紫檀|菠萝格|龙凤檀|黑胡桃|白蜡木|重蚁木)/.test(x.title||'')],
  ['titleScene','标题直接出现使用场景',x=>/客厅|卧室|家装|装修|新房|老房|民宿|办公室|写字楼|地暖/.test(x.title||'')],
  ['titleQuestion','标题用具体问题切入',x=>/[？?]|为什么|怎么选|到底|能不能|值不值/.test(x.title||'')],
  ['titleResult','标题直接出现使用结果',x=>/用了|实测|装完|铺完|住了|后悔|真话|效果|翻车|踩坑/.test(x.title||'')],
  ['titleCompare','标题加入明确对比/反差',x=>/对比|区别|vs|VS|还是|不一样|差别|没想到|居然|一砸一个坑|别买|真相/.test(x.title||'')],
  ['titleLayout','标题出现具体户型',x=>/\d室|\d房|一居|两居|三居|四居|户型/.test(x.title||'')],
  ['titleArea','标题出现具体面积',x=>/\d+(?:\.\d+)?\s*(?:㎡|平米|平方)/.test(x.title||'')],
  ['titleInstall','标题出现具体施工/铺法',x=>/鱼骨|人字|工字|369|自由拼|悬浮|平扣|锁扣|龙骨|直铺/.test(x.title||'')],
  ['sceneBody','正文从真实使用场景切入',x=>/客厅|卧室|家装|装修|新房|老房|实际空间|铺进家里|现场/.test((x.text||'').slice(0,220)),x=>!!x.deepBodyFetched],
  ['howto','正文采用攻略/清单结构',x=>/攻略|清单|第一|第二|1[.、]|2[.、]|怎么选|避坑/.test(x.text||''),x=>!!x.deepBodyFetched],
  ['saveValue','正文强调可收藏的信息价值',x=>/清单|记住|收藏|对比|总结|避坑|尺寸|用量/.test(x.text||''),x=>!!x.deepBodyFetched],
  ['discussion','正文有明确讨论触发',x=>/你们|大家|你会|你觉得|评论|怎么选|哪种|你家/.test(x.text||''),x=>!!x.deepBodyFetched],
  ['experience','正文使用真实经验/结果表达',x=>/用了|使用|实测|真话|后悔|踩坑|翻车|住了|装完|完工/.test((x.title||'')+' '+(x.text||'')),x=>!!x.deepBodyFetched],
  ['factory','内容直接展示工厂/生产现场',x=>/工厂|车间|生产|仓库|刚下线|刚生产/.test((x.title||'')+' '+(x.text||'')),x=>!!x.deepBodyFetched],
  ['coverScene','封面为真实使用/铺装场景',x=>x.coverVisualType==='实景/空间',x=>!!x.coverVisualType&&x.coverVisualConfidence!=='低'],
  ['video','内容形式为视频',x=>/视频/.test(String(x.contentType||''))],
  ['shortTitle','标题更精简',x=>{const n=String(x.title||'').replace(/\s+/g,'').length;return n>=8&&n<=22}],
  ['decisionTitle','标题直接解决选购问题',x=>/怎么选|适合|区别|差别|值不值|预算|规格|铺法|损耗|稳定|地暖/.test(x.title||'')],
  ['directOpen','正文开头快速进入主题',x=>{const s=String(x.text||'').trim().slice(0,120);return /先看|直接|如果|同样|这次|为什么|怎么|铺|装|用|规格|价格|空间/.test(s)},x=>!!x.deepBodyFetched],
  ['structuredBody','正文结构清晰',x=>{const s=String(x.text||'');return /\n\s*\n/.test(s)||/(?:^|\n)\s*[1-5][.、]/.test(s)},x=>!!x.deepBodyFetched],
  ['mediumBody','正文长度适中',x=>{const n=String(x.text||'').replace(/\s+/g,'').length;return n>=100&&n<=500},x=>!!x.deepBodyFetched],
  ['practicalInfo','正文包含可决策的具体信息',x=>/\d{2,4}\s*[x×*]\s*\d{2,4}|\d+(?:\.\d+)?\s*(?:㎡|平米|平方|元)|地暖|损耗|铺法|规格|收口/.test(x.text||''),x=>!!x.deepBodyFetched],
  ['hasTags','包含话题标签',x=>/#\S+/.test(x.text||''),x=>!!x.deepBodyFetched],
  ['multiImage','图片数量4张及以上',x=>num(x.imageCount)!==null&&num(x.imageCount)>=4,x=>num(x.imageCount)!==null],
  ['lowAdTone','弱广告表达',x=>!/特价|清仓|最低|秒杀|加微信|私聊报价|全网最低|厂家直销/.test((x.title||'')+' '+(x.text||'')),x=>!!x.deepBodyFetched],
  ['decisionAngle','明确解决选购决策',x=>/怎么选|如何选|适合谁|适不适合|值不值|区别|差别|选哪|选择/.test((x.title||'')+' '+(x.text||''))],
  ['painAngle','避坑/问题切入',x=>/避坑|踩坑|翻车|后悔|问题|别买|注意|容易|千万别/.test((x.title||'')+' '+(x.text||''))],
  ['compareAngle','对比/二选一切入',x=>/对比|区别|差别|vs|VS|还是|二选一|哪个好|哪个更/.test((x.title||'')+' '+(x.text||''))],
  ['realCaseAngle','真实案例/现场切入',x=>/业主|客户|我家|家里|现场|完工|实景|这次|今天|刚铺|刚装/.test((x.title||'')+' '+(x.text||''))],
  ['performanceAngle','材质性能切入',x=>/稳定|硬度|耐磨|耐用|防潮|地暖|变形|开裂|含水率|密度|脚感/.test((x.title||'')+' '+(x.text||''))],
  ['installDetailAngle','安装/落地细节切入',x=>/安装|铺装|铺法|收口|门套|柜体|踢脚线|龙骨|悬浮|平扣|锁扣|鱼骨|人字/.test((x.title||'')+' '+(x.text||''))],
  ['budgetAngle','价格/预算决策切入',x=>/价格|预算|多少钱|单价|成本|贵不贵|性价比|元\/㎡|元每平/.test((x.title||'')+' '+(x.text||''))],
  ['sourceProofAngle','工厂/货源证据切入',x=>/工厂|车间|生产|仓库|库存|下线|原料|坯料|厂家/.test((x.title||'')+' '+(x.text||''))]
];
const XY_FEATURES=[
  ['spec','标题带完整规格',x=>/\d{2,4}\s*[x×*]\s*\d{2,4}/i.test(x.title||'')],
  ['priceTitle','标题直接写真实价格',x=>/[¥￥]\s*\d|\d+(?:\.\d+)?\s*元/.test(x.title||'')],
  ['materialTitle','标题明确品类/材质',x=>/(地板|实木|多层|三层|橡木|柚木|红檀香|龙凤檀|菠萝格|黑胡桃|白蜡木|紫檀|spc|wpc)/i.test(x.title||'')],
  ['condition','成色/新旧状态明确',x=>/全新|新品|二手|闲置|翻新|未使用|拆旧|中古/.test((x.title||'')+' '+(x.text||''))],
  ['stock','现货/库存/数量明确',x=>/现货|库存|仓库|清仓|尾货|\d+\s*(?:件|套|箱|支|片|平方|㎡)/.test((x.title||'')+' '+(x.text||''))],
  ['factory','厂家/货源证据',x=>/工厂|厂家|厂价|车间|一手货源|生产现场/.test((x.title||'')+' '+(x.text||''))],
  ['logistics','物流/交付明确',x=>/物流|发货|自提|送货|到付|运费|包邮|同城/.test((x.title||'')+' '+(x.text||''))],
  ['sellerProof','可信度信息明确',x=>/实拍|实物|原图|可验|可看货|支持自提|现场看|卖家信用|验货/.test((x.title||'')+' '+(x.text||''))],
  ['scene','使用场景/落地效果',x=>/客厅|卧室|家装|装修|铺装|实景|效果|办公室|工程/.test((x.title||'')+' '+(x.text||''))],
  ['service','安装/售后服务明确',x=>/安装|包安装|售后|测量|上门|配送/.test((x.title||'')+' '+(x.text||''))]
];
const GENERIC_FEATURES=[
  ['titleQuestion','标题用问题切入',x=>/[？?]|为什么|怎么|如何|值不值|哪个好/.test(x.title||'')],
  ['titleNumber','标题含具体数字信息',x=>/\d/.test(x.title||'')],
  ['price','价格信息明确',x=>/[¥￥]\s*\d|\d+(?:\.\d+)?\s*元/.test((x.title||'')+' '+(x.text||''))],
  ['spec','规格/型号信息明确',x=>/\d{2,4}\s*[x×*]\s*\d{2,4}|型号|规格|尺寸/.test((x.title||'')+' '+(x.text||''))],
  ['compare','对比/选择表达',x=>/对比|区别|差别|vs|怎么选|选择/.test((x.title||'')+' '+(x.text||''))],
  ['scene','真实场景/案例表达',x=>/实景|现场|案例|使用|体验|完工|实拍/.test((x.title||'')+' '+(x.text||''))],
  ['practical','可执行信息',x=>/步骤|清单|注意|方法|攻略|发货|安装|预算|规格|价格/.test((x.title||'')+' '+(x.text||''))],
  ['source','来源/可信度表达',x=>/官方|品牌|工厂|厂家|实拍|原图|认证|库存|现货/.test((x.title||'')+' '+(x.text||''))]
];

function modelFor(p,batch=[]){
  if(p==='小红书')return{
    adapterKey:'xiaohongshu',groupMode:'content',features:XHS_FEATURES,
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
    adapterKey:'xianyu',groupMode:'commerce',features:XY_FEATURES,
    dims(x){const exp=pos(x.exposure??x.impressions),views=pos(x.views),wants=num(x.wants),consults=num(x.consults),sales=num(x.sales??x.sold),comments=num(x.comments),days=ageDays(x);return{exp,views,wants,comments,consults,sales,days,clickRate:exp&&views!==null?views/exp:null,wantRate:views&&wants!==null?wants/views:null,consultRate:views&&consults!==null?consults/views:null,saleRate:consults&&sales!==null?sales/consults:null,speed:days!==null?((consults??wants??views??null)!==null?(consults??wants??views)/Math.max(.25,days):null):null}},
    weights:{exp:.08,views:.10,clickRate:.18,wantRate:.24,consultRate:.30,saleRate:.34,speed:.16},fallback:{wants:.65,comments:.15,views:.20},
    labels:{exp:'曝光',views:'浏览',clickRate:'浏览率',wantRate:'想要率',consultRate:'咨询率',saleRate:'成交转化',speed:'增长速度',wants:'想要',consults:'咨询',sales:'成交',comments:'互动'},
    kinds:{exp:'曝光型',views:'浏览型',clickRate:'点击型',wantRate:'想要型',consultRate:'咨询型',saleRate:'成交转化型',speed:'增长型',wants:'想要型',consults:'咨询型',sales:'成交型',comments:'互动型',searchRank:'搜索排序参考'},
    core:d=>[d.exp,d.views,d.wants,d.consults,d.sales,d.days],
    group:x=>({type:xyType(x),condition:conditionOf(x),material:materialOf(x),days:ageDays(x)})
  };
  const commerceCoverage=batch.length?batch.filter(x=>num(x.price)!==null||num(x.wants)!==null||num(x.consults)!==null||num(x.sales??x.sold)!==null).length/batch.length:0;
  const socialCoverage=batch.length?batch.filter(x=>num(x.likes)!==null||num(x.favs)!==null||num(x.comments)!==null||num(x.shares)!==null).length/batch.length:0;
  if(socialCoverage>commerceCoverage)return{
    adapterKey:'generic-content',groupMode:'content',features:GENERIC_FEATURES,
    dims(x){const views=pos(x.views),likes=num(x.likes),favs=num(x.favs),comments=num(x.comments),shares=num(x.shares),days=ageDays(x),total=[likes,favs,comments,shares].filter(v=>v!==null).reduce((a,b)=>a+b,0);return{views,likes,favs,comments,shares,days,total,speed:days!==null?((views??(total||null))!==null?(views??total)/Math.max(.25,days):null):null}},
    weights:{views:.15,likes:.18,favs:.24,comments:.22,shares:.24,speed:.18},fallback:{likes:.24,favs:.30,comments:.24,shares:.22},
    labels:{views:'浏览',likes:'点赞',favs:'收藏',comments:'评论',shares:'分享',speed:'增长速度'},
    kinds:{views:'浏览型',likes:'点赞型',favs:'收藏型',comments:'讨论型',shares:'传播型',speed:'增长型',searchRank:'排序参考'},
    core:d=>[d.views,d.likes,d.favs,d.comments,d.shares,d.days],
    group:x=>({type:genericType(x),material:materialOf(x),days:ageDays(x)})
  };
  return{
    adapterKey:'generic-commerce',groupMode:'commerce',features:GENERIC_FEATURES,
    dims(x){const exp=pos(x.exposure??x.impressions),views=pos(x.views),wants=num(x.wants),consults=num(x.consults),sales=num(x.sales??x.sold),comments=num(x.comments),days=ageDays(x);return{exp,views,wants,consults,sales,comments,days,speed:days!==null?((sales??consults??wants??views??null)!==null?(sales??consults??wants??views)/Math.max(.25,days):null):null}},
    weights:{exp:.08,views:.12,wants:.24,consults:.30,sales:.34,speed:.16},fallback:{views:.25,wants:.35,comments:.15},
    labels:{exp:'曝光',views:'浏览',wants:'意向',consults:'咨询',sales:'成交',comments:'互动',speed:'增长速度'},
    kinds:{exp:'曝光型',views:'浏览型',wants:'意向型',consults:'咨询型',sales:'成交型',comments:'互动型',speed:'增长型',searchRank:'排序参考'},
    core:d=>[d.exp,d.views,d.wants,d.consults,d.sales,d.days],
    group:x=>({type:genericType(x),condition:conditionOf(x),material:materialOf(x),days:ageDays(x)})
  };
}
function ageBand(d){if(d===null)return'时间未知';return d<=7?'近7天':d<=30?'8-30天':'30天以上'}
function buildComparable(batch,p,model){
  const base=batch.filter(x=>!!String(x.title||'').trim());
  const rows=base.map(x=>({...x,__dims:model.dims(x),__group:model.group(x)}));
  const keys=model.groupMode==='content'?[x=>[x.__group.type,x.__group.material,ageBand(x.__group.days)].join('|'),x=>[x.__group.type,ageBand(x.__group.days)].join('|'),x=>x.__group.type]:[x=>[x.__group.type,x.__group.condition,x.__group.material,ageBand(x.__group.days)].join('|'),x=>[x.__group.type,x.__group.condition].join('|'),x=>x.__group.type];
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
  return features.map(([id,label,fn,available])=>{
    const hh=available?high.filter(available):high,nn=available?normal.filter(available):normal;
    const hc=hh.filter(fn).length,nc=nn.filter(fn).length,hp=hh.length?hc/hh.length:0,np=nn.length?nc/nn.length:0,diff=hp-np,zz=z(hp,hh.length,np,nn.length);
    const featureCoverage=(high.length+normal.length)?(hh.length+nn.length)/(high.length+normal.length):0;
    let level='数据不足',category='暂无价值';
    if(hh.length>=10&&nn.length>=30){
      level='探索性信号';
      if(rankOnlyRate<.8&&hh.length>=25&&nn.length>=60&&diff>=.12&&zz>=2&&coverage>=.30&&featureCoverage>=.45&&stability>=.55)level='强证据';
      else if(rankOnlyRate<.9&&hh.length>=15&&nn.length>=35&&diff>=.085&&zz>=1.5&&featureCoverage>=.30)level='中等证据';
      else if(hh.length>=8&&nn.length>=20&&diff>=.055&&zz>=1.1&&featureCoverage>=.18)level='弱证据';
      if(level==='强证据')category='可以复用';
      else if(level==='中等证据'||level==='弱证据')category='值得测试';
      else if(level==='探索性信号'&&hh.length>=8&&nn.length>=20&&diff>=.05&&zz>=1.05)category='值得测试';
    }
    return{id,label,hc,nc,hp,np,diff,z:zz,level,category,total:hh.length+nn.length,highAvailable:hh.length,normalAvailable:nn.length,featureCoverage};
  }).sort((a,b)=>((rank[b.category]||0)-(rank[a.category]||0))||b.diff-a.diff||b.z-a.z);
}

function evidenceRank(x){
  const r={可以复用:4,值得测试:3,探索性测试:2,'暂无价值':1};
  return (r[x.category]||0)*100+(x.z||0)*10+Math.max(0,x.diff||0)*100+(x.kind==='combo'?4:x.kind==='phrase'?3:0);
}
function comboEvidence(high,normal,features,coverage,stability,rankOnlyRate){
  if(!high.length||!normal.length)return[];
  const allowed=new Set(['titleSpec','titleNumber','titlePrice','titleMaterial','titleScene','titleQuestion','titleResult','titleCompare','titleLayout','titleArea','titleInstall','sceneBody','howto','saveValue','discussion','experience','factory','decisionTitle','practicalInfo','lowAdTone','decisionAngle','painAngle','compareAngle','realCaseAngle','performanceAngle','installDetailAngle','budgetAngle','sourceProofAngle']);
  const candidates=features.filter(x=>allowed.has(x[0])&&(!x[3]||((high.concat(normal)).filter(x[3]).length/(high.length+normal.length)>=.25))).slice(0,34);
  const z=(p1,n1,p2,n2)=>{if(!n1||!n2)return 0;const p=(p1*n1+p2*n2)/(n1+n2),se=Math.sqrt(Math.max(1e-9,p*(1-p)*(1/n1+1/n2)));return Math.abs(p1-p2)/se};
  const out=[];
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
    const [id1,l1,f1,a1]=candidates[i],[id2,l2,f2,a2]=candidates[j];
    const ah=a1?high.filter(a1):high,an=a1?normal.filter(a1):normal;
    const hh=a2?ah.filter(a2):ah,nn=a2?an.filter(a2):an;
    if(hh.length<8||nn.length<20)continue;
    const hc=hh.filter(x=>f1(x)&&f2(x)).length,nc=nn.filter(x=>f1(x)&&f2(x)).length;
    if(hc<4)continue;
    const hp=hc/hh.length,np=nc/nn.length,diff=hp-np,zz=z(hp,hh.length,np,nn.length);
    if(diff<.045||zz<1.05)continue;
    let level='探索性信号',category='探索性测试';
    if(hh.length>=25&&nn.length>=60&&hc>=8&&diff>=.12&&zz>=2&&coverage>=.30&&stability>=.55&&rankOnlyRate<.8){level='强证据';category='可以复用'}
    else if(hh.length>=15&&nn.length>=35&&hc>=6&&diff>=.085&&zz>=1.5){level='中等证据';category='值得测试'}
    else if(hh.length>=8&&nn.length>=20&&hc>=4&&diff>=.06&&zz>=1.15){level='弱证据';category='值得测试'}
    out.push({id:'combo:'+id1+'+'+id2,label:'组合：'+l1+' + '+l2,kind:'combo',parts:[id1,id2],partLabels:[l1,l2],hc,nc,hp,np,diff,z:zz,level,category,total:hh.length+nn.length,highAvailable:hh.length,normalAvailable:nn.length,featureCoverage:(hh.length+nn.length)/(high.length+normal.length)});
  }
  return out.sort((a,b)=>evidenceRank(b)-evidenceRank(a)).slice(0,10)
}
function titlePhraseSet(title){
  const raw=String(title||'').replace(/[#【】\[\]（）()“”"'‘’·|｜,:：，。！!？?、]/g,'').replace(/\s+/g,'');
  const out=new Set(),lex=['怎么选','如何选','为什么','别只看','别买','避坑','踩坑','后悔','实景','完工','现场','入住','装修','客厅','卧室','地暖','鱼骨','人字','工字','平扣','锁扣','收口','安装','铺装','规格','价格','预算','对比','区别','差别','稳定','耐磨','防潮','工厂','车间','库存','木纹','颜色','原木风','奶油风','真实','建议','问题','真话','效果','选购'];
  for(const w of lex)if(raw.includes(w))out.add(w);
  const generic=/实木地板|木地板|地板|实木|三层|多层|红檀香|缅甸柚木|柚木|橡木|白橡|欧橡|紫檀|菠萝格|龙凤檀|黑胡桃|白蜡木|重蚁木/g;
  const chunks=raw.replace(generic,' ').split(/\s+/).filter(x=>x.length>=3);
  const stop=new Set(['这个','一种','可以','真的','就是','什么','一个','我们','你们','自己','还是','因为','所以','如果','时候','看看','一下','不要','不是']);
  for(const chunk of chunks)for(let n=3;n<=5;n++)for(let i=0;i+n<=chunk.length;i++){
    const g=chunk.slice(i,i+n);
    if(!/^[\u4e00-\u9fa5]+$/.test(g)||stop.has(g)||/(.)\1\1/.test(g))continue;
    if(lex.some(w=>g!==w&&g.includes(w)&&g.length===w.length+1))continue;
    out.add(g)
  }
  return out
}
function phraseEvidence(high,normal){
  if(high.length<8||normal.length<20)return[];
  const hc=new Map(),nc=new Map();
  for(const x of high)for(const p of titlePhraseSet(x.title))hc.set(p,(hc.get(p)||0)+1);
  for(const x of normal)for(const p of titlePhraseSet(x.title))nc.set(p,(nc.get(p)||0)+1);
  const z=(p1,n1,p2,n2)=>{const p=(p1*n1+p2*n2)/(n1+n2),se=Math.sqrt(Math.max(1e-9,p*(1-p)*(1/n1+1/n2)));return Math.abs(p1-p2)/se};
  const out=[];
  for(const [p,h] of hc){
    if(h<4)continue;
    const n=nc.get(p)||0,hp=h/high.length,np=n/normal.length,diff=hp-np,zz=z(hp,high.length,np,normal.length);
    if(diff<.055||zz<1.05)continue;
    let level='探索性信号',category='探索性测试';
    if(h>=8&&diff>=.13&&zz>=2){level='强证据';category='可以复用'}
    else if(h>=6&&diff>=.09&&zz>=1.5){level='中等证据';category='值得测试'}
    else if(diff>=.065&&zz>=1.15){level='弱证据';category='值得测试'}
    out.push({id:'phrase:'+p,label:'标题高频切入「'+p+'」',kind:'phrase',phrase:p,hc:h,nc:n,hp,np,diff,z:zz,level,category,total:high.length+normal.length,highAvailable:high.length,normalAvailable:normal.length,featureCoverage:1})
  }
  return out.sort((a,b)=>evidenceRank(b)-evidenceRank(a)).slice(0,10)
}
function signalMatcher(signal,model){
  if(!signal)return null;
  if(signal.kind==='phrase')return x=>String(x.title||'').includes(signal.phrase);
  if(signal.kind==='combo'){
    const fns=(signal.parts||[]).map(id=>model.features.find(z=>z[0]===id)?.[2]).filter(Boolean);
    return fns.length?x=>fns.every(fn=>fn(x)):null;
  }
  return model.features.find(z=>z[0]===signal.id)?.[2]||null
}

function batchItems(){
  const p=currentPlatform(),all=(db.items||[]).map(enrich),stamp=db.lastCapturedAt,expected=Number(db.lastValidCount||(db.lastMeta&&db.lastMeta.validCount)||0);
  let batch=stamp?all.filter(x=>x._capturedAt===stamp):[];
  if(batch.length>=Math.min(10,expected||10))return batch.map(x=>({...x,site:p}));
  const same=all.filter(x=>x.site===p).sort((a,b)=>new Date(b._capturedAt||0)-new Date(a._capturedAt||0));
  if(expected>0&&same.length)return same.slice(0,Math.min(expected,same.length));
  return same.length?same:batch.map(x=>({...x,site:p}));
}
function itemReasons(x,model){
  const out=[],cohort=x.__cohort||[];for(const [k,label] of Object.entries(model.labels)){const v=x.__dims[k];if(v===null||v===undefined)continue;const a=cohort.map(z=>z.__dims[k]).filter(v=>v!==null&&v!==undefined&&Number.isFinite(v));if(a.length<5)continue;const p=percentile(v,a);if(p===null||p<.78)continue;out.push(label+'同类前'+Math.max(1,Math.round((1-p)*100))+'%')}
  if(!out.length)out.push(x.__mode==='搜索排序/时效参考'?'搜索排序靠前，仅作探索参考':'综合表现位于同类前列');return out.slice(0,3);
}
function highThemeProfile(high,normal,platform){
  const fn=platform==='小红书'?xhsType:platform==='闲鱼'?xyType:genericType;
  const names=[...new Set(high.concat(normal).map(fn).filter(Boolean))],out=[];
  for(const name of names){
    const hc=high.filter(x=>fn(x)===name).length,nc=normal.filter(x=>fn(x)===name).length,hp=high.length?hc/high.length:0,np=normal.length?nc/normal.length:0;
    out.push({name,hc,nc,hp,np,diff:hp-np})
  }
  return out.sort((a,b)=>b.hp-a.hp||b.diff-a.diff)
}

function analyze(){
  const platform=currentPlatform(),batch=batchItems(),model=modelFor(platform,batch);if(!model)return{platform,batch,unsupported:true};if(!batch.length)return{platform,batch,empty:true};
  const comp=buildComparable(batch,platform,model),deb=debias(comp.usable,platform),scored=outlierRows(scoreRows(deb.items,model)),anomalies=scored.filter(x=>x.__outlier),pool=scored.filter(x=>!x.__outlier).sort((a,b)=>b.__score-a.__score),highN=pool.length?Math.max(1,Math.ceil(pool.length*.20)):0,high=pool.slice(0,highN),normal=pool.slice(highN);
  const coreCount=pool[0]?model.core(pool[0].__dims).length:1,covered=pool.reduce((s,x)=>s+model.core(x.__dims).filter(v=>v!==null&&v!==undefined).length,0),coverage=pool.length?covered/(pool.length*coreCount):0,stability=comp.usable.length?deb.items.length/comp.usable.length:0,rankOnlyRate=pool.length?pool.filter(x=>x.__mode==='搜索排序/时效参考').length/pool.length:0;
  const baseFindings=evidence(high,normal,model.features,coverage,stability,rankOnlyRate),combos=platform==='小红书'?comboEvidence(high,normal,model.features,coverage,stability,rankOnlyRate):[],phrases=platform==='小红书'?phraseEvidence(high,normal):[];
  const merged=baseFindings.concat(combos,phrases).sort((a,b)=>evidenceRank(b)-evidenceRank(a)),seenSignal=new Set(),findings=[];
  for(const x of merged){const key=x.label;if(seenSignal.has(key))continue;seenSignal.add(key);findings.push(x)}
  const reusable=findings.filter(x=>x.category==='可以复用'),testable=findings.filter(x=>x.category==='值得测试'),none=findings.filter(x=>x.category==='暂无价值');
  const observed=findings.filter(x=>x.diff>0).sort((a,b)=>evidenceRank(b)-evidenceRank(a));
  const strongest=reusable[0]||testable[0]||null;
  const expBase=!strongest?observed.find(x=>x.diff>=.04&&x.z>=1.0):null;
  const exploratory=expBase?{...expBase,category:'探索性测试',level:'探索性信号'}:null;
  let conf='探索',confClass='low';if(high.length>=25&&normal.length>=60&&coverage>=.30&&rankOnlyRate<.8){conf='高';confClass='good'}else if(high.length>=15&&normal.length>=35&&coverage>=.22){conf='中';confClass='base'}else if(high.length>=8){conf='低';confClass='low'}
  const kinds={};for(const x of high)kinds[x.__kind]=(kinds[x.__kind]||0)+1;const dominant=Object.entries(kinds).sort((a,b)=>b[1]-a[1])[0]?.[0]||'潜在高表现',themes=highThemeProfile(high,normal,platform);
  return{platform,model,batch,comp,deb,pool,high,normal,anomalies,findings,baseFindings,combos,phrases,reusable,testable,none,strongest,exploratory,observed,coverage,stability,rankOnlyRate,confidence:[conf,confClass],dominant,themes,empty:false};
}

function parseProduct(raw){
  const spec=(raw.match(/\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/i)||[])[0]||'',
    area=(raw.match(/\d+(?:\.\d+)?\s*(?:㎡|平米|平方)/)||[])[0]||'',
    layout=(raw.match(/(?:\d室\d厅|\d房|一居|两居|三居|四居|户型)/)||[])[0]||'',
    install=(raw.match(/鱼骨|人字|工字|369|自由拼|悬浮|平扣|锁扣|龙骨|直铺/)||[])[0]||'',
    years=(raw.match(/\d+(?:\.\d+)?\s*(?:年|个月|月|天)/)||[])[0]||'',
    quantity=(raw.match(/\d+(?:\.\d+)?\s*(?:件|套|箱|支|片|包|平方|㎡|米)/)||[])[0]||'';
  const pm=raw.match(/(?:¥|￥)?\s*(\d+(?:\.\d+)?)\s*元(?:\/㎡|每平方|一平|平)?/),price=pm?pm[1]:'',
    mats=['红檀香','缅甸柚木','柚木','橡木','白橡','欧橡','紫檀','菠萝格','龙凤檀','黑胡桃','白蜡木','重蚁木'],
    mat=mats.find(x=>raw.includes(x))||raw.split(/[\s,，/|]+/).find(x=>x.length>=2&&!/^\d/.test(x))||'商品',
    otherNum=(raw.match(/\d+(?:\.\d+)?/)||[])[0]||'',
    condition=(raw.match(/全新|新品|二手|闲置|翻新|拆旧|中古|未使用/)||[])[0]||'',
    stockText=(raw.match(/现货|库存|仓库|清仓|尾货/)||[])[0]||'',
    logisticsText=(raw.match(/包邮|发货|自提|送货|物流|运费|到付|同城/)||[])[0]||'',
    serviceText=(raw.match(/包安装|安装|售后|测量|上门|配送/)||[])[0]||'',
    proofText=(raw.match(/实拍|原图|可看货|验货|现场看|支持自提/)||[])[0]||'',
    sceneText=(raw.match(/客厅|卧室|家装|装修|铺装|实景|效果|办公室|工程|案例|现场/)||[])[0]||'';
  return{raw,spec,area,layout,install,years,quantity,price,mat,otherNum,condition,stockText,logisticsText,serviceText,proofText,sceneText,
    factory:/工厂|厂家|车间|生产/.test(raw),
    stock:!!stockText,
    logistics:!!logisticsText,
    service:!!serviceText,
    proof:!!proofText,
    scene:!!sceneText,
    experience:/用了|使用|实测|装完|铺完|住了|完工|后悔|踩坑|现场|客户|业主|案例/.test(raw)};
}
function eligibility(s,p){
  if(!s)return{ok:false,need:'没有可测试信号'};
  const ids=s.kind==='combo'?(s.parts||[]):[s.id];
  const has=id=>ids.includes(id);
  if((has('titleSpec')||has('spec'))&&!p.spec)return{ok:false,need:'真实规格，例如 910×125×18'};
  if(has('titleYears')&&!p.years)return{ok:false,need:'真实使用时间，例如 使用3年'};
  if((has('titlePrice')||has('budgetAngle')||has('priceTitle'))&&!p.price)return{ok:false,need:'真实价格，例如 530元/㎡'};
  if(has('titleLayout')&&!p.layout)return{ok:false,need:'真实户型，例如 三房两厅'};
  if(has('titleArea')&&!p.area)return{ok:false,need:'真实面积，例如 70㎡'};
  if(has('titleInstall')&&!p.install)return{ok:false,need:'真实铺法，例如 鱼骨 / 人字 / 工字'};
  if((has('titleResult')||has('experience')||has('realCaseAngle'))&&!p.experience)return{ok:false,need:'真实案例/完工/使用结果，避免编造经历'};
  if((has('factory')||has('sourceProofAngle'))&&!p.factory)return{ok:false,need:'确认这条内容确实是工厂/生产/库存现场'};
  if(has('condition')&&!p.condition)return{ok:false,need:'真实状态，例如 全新 / 二手 / 翻新'};
  if(has('stock')&&!p.stock&&!p.quantity)return{ok:false,need:'真实库存/数量信息，例如 现货 / 100㎡'};
  if(has('logistics')&&!p.logistics)return{ok:false,need:'真实交付信息，例如 可发物流 / 支持自提 / 运费规则'};
  if(has('sellerProof')&&!p.proof)return{ok:false,need:'真实可信信息，例如 实拍 / 原图 / 可看货 / 支持自提'};
  if(has('scene')&&!p.scene)return{ok:false,need:'真实使用/铺装场景，例如 客厅实景 / 工程现场'};
  if(has('service')&&!p.service)return{ok:false,need:'真实服务信息，例如 包安装 / 配送 / 测量'};
  if(currentPlatform()==='闲鱼'&&s.id==='themeDirection'&&![p.spec,p.condition,p.quantity,p.price,p.stockText,p.logisticsText,p.proofText,p.sceneText].some(Boolean))return{ok:false,need:'至少补充一个真实交易条件：规格 / 状态 / 价格 / 数量 / 交付 / 实拍 / 场景'};
  return{ok:true,need:''};
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
  if(s.kind==='combo'){
    action='同时执行两个已在高表现样本中共现的因素';
    angle=(s.partLabels||[]).join(' × ');
    why='组合模式只有在两个因素同时出现时才显示优势，本轮必须一起执行但不再叠加第三个变量';
  }else if(s.kind==='phrase'){
    action='复用高价值标题中的真实切入口';
    angle='围绕「'+s.phrase+'」建立用户问题或场景';
    why='保留的是切入意图，不复制原笔记句子';
  }else if(s.id==='titleSpec'){
    action='标题加入完整且有意义的规格信息';
    if(n?.type==='规格'){angle=variant==='A'?'用完整规格回答“铺出来是什么感觉”':'用完整规格提出“和其他规格差在哪”';why=n.meaning}
    else{angle='需要先补充完整规格';why='规格型信号只有在真实规格存在时才执行'}
  }else if(s.id==='titleNumber'){
    action='用数字清单结构组织标题和正文';
    angle=variant==='A'?'用“4个问题”做选购清单':'用“3个细节”做阅读入口';
    why='这里的数字是内容结构，不是产品规格；小红书用户更容易快速理解和收藏'
  }else if(s.id==='titleYears'){
    action='用真实使用时间建立长期判断';
    angle=variant==='A'?'时间变化 + 稳定性/收口':'长期使用 + 日常打理';
    why='只有用户提供真实使用年限时才执行，避免编造“用了几年”';
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
  else if(s.id==='spec'){action='闲鱼标题前置完整规格';angle='品类/材质 + 规格 + 状态';why='闲鱼先解决搜索匹配和买家是否适配，不做种草式铺垫'}
  else if(s.id==='priceTitle'){action='闲鱼标题前置真实价格';angle='价格 + 对应规格/状态条件';why='价格要帮助筛选有效买家，而不是做低价钩子'}
  else if(s.id==='materialTitle'){action='闲鱼标题明确品类/材质';angle='材质/品类 + 核心交易条件';why='提升搜索匹配和快速判断'}
  else if(s.id==='condition'){action='明确新旧/成色状态';angle='状态 + 瑕疵/使用情况';why='减少无效咨询和交易预期差'}
  else if(s.id==='stock'){action='明确库存/数量';angle='现货/库存 + 数量/可拆零';why='让有明确需求的买家快速判断供货能力'}
  else if(s.id==='logistics'){action='明确交付方式';angle='发货/自提/物流/运费';why='闲鱼成交前交付条件是关键筛选信息'}
  else if(s.id==='sellerProof'){action='增加可验证信息';angle='实拍/原图/可看货/自提';why='降低陌生交易的不确定性'}
  else if(s.id==='scene'){action='用场景图辅助交易判断';angle='交易信息为主 + 真实落地效果';why='场景只负责帮助判断，不把闲鱼写成小红书笔记'}
  else if(s.id==='service'){action='明确服务范围';angle='安装/配送/测量/售后';why='避免买家误判价格包含的项目'}
  else {action=s.label;angle=variant==='A'?'从当前平台最强交易/内容信号切入':'保持同一变量换一种表达';why='不跨平台照搬固定公式'}
  return{action,angle,why,numeric:n};
}

function semanticNatural(s,p,variant){
  const m=p.mat,id=s.id;
  if(id==='decisionAngle')return{
    title:variant==='A'?m+'怎么选？先看真正影响落地的几个条件':m+'适不适合你家，别只看第一眼颜色',
    body:'选'+m+'时，我会先看空间、规格、铺法和收口，再判断它适不适合。真正有用的不是一句“好不好”，而是把这些条件放到自己家里逐项确认。',
    cover:'真实空间或板材实拍，封面只保留一个选购问题。',images:'空间 → 板面 → 规格/铺法 → 收口。'};
  if(id==='painAngle')return{
    title:variant==='A'?'准备铺'+m+'，这几个坑最好提前避开':m+'别急着下单，落地前先确认这几件事',
    body:'地板真正容易出问题的地方，往往不是样板本身，而是空间条件、规格、铺法和收口没有一起确认。提前把门套、柜体、地面条件和损耗问清楚，后面会省很多返工。',
    cover:'真实现场细节图，不用夸张警告式海报。',images:'地面条件 → 板材 → 门套/柜体 → 收口。'};
  if(id==='compareAngle')return{
    title:variant==='A'?'同样是'+m+'，真正的差别到底在哪？':m+'怎么选？把这几个差别放一起看',
    body:'对比地板时，不建议只比颜色。规格、结构、铺法和实际空间一起看，才更接近最后落地的差别。能放到同一个真实场景里比较，判断会更直观。',
    cover:'同场景A/B对比或同木种不同规格对比。',images:'A/B整体 → 各自近景 → 规格 → 收口。'};
  if(id==='realCaseAngle')return{
    title:variant==='A'?'这次实际现场铺'+m+'，先看落地效果':m+'装完以后，现场最值得看的是这些细节',
    body:p.raw+'\n\n这条只讲真实现场已经发生的情况：空间、板面、铺法和收口分别是什么效果，再说明哪些条件会影响最终判断，不额外编造业主反馈。',
    cover:'真实完工/现场图。',images:'整体现场 → 板面 → 拼接 → 收口。'};
  if(id==='performanceAngle')return{
    title:variant==='A'?m+'别只看颜色，性能更该看哪些？':m+'适不适合长期用，先看这几个性能条件',
    body:'判断'+m+'，稳定性、耐磨、防潮和地暖适配这些问题都要结合材质、结构和使用环境看。这里不做绝对承诺，只把购买前需要确认的条件讲清楚。',
    cover:'真实板面近景或结构细节。',images:'板面 → 结构/侧面 → 使用环境 → 铺装细节。'};
  if(id==='installDetailAngle')return{
    title:variant==='A'?'铺'+m+'，安装和收口其实比想象中更重要':m+'落地前，铺法、门套和收口先确认',
    body:'真正落地时，安装方式、铺法、门套、柜体和收口会直接影响完成效果。选板之前把这些位置先看清楚，再决定规格和铺法，会比最后现场补救更稳。',
    cover:'安装/收口真实现场。',images:'铺装过程 → 门套 → 柜体 → 收口完成。'};
  if(id==='budgetAngle')return{
    title:variant==='A'?p.price+'元/㎡的'+m+'，预算不能只算单价':m+'预算怎么定？'+p.price+'元/㎡只是第一步',
    body:'这次真实单价是'+p.price+'元/㎡。完整预算还要把规格、损耗、铺法、安装和收口一起算进去。只比较一平方米的价格，很容易低估最后落地成本。',
    cover:'真实产品图，小字标注真实单价。',images:'产品 → 规格 → 铺法 → 安装/收口。'};
  if(id==='sourceProofAngle')return{
    title:variant==='A'?'工厂里看'+m+'，我会先看这些真实细节':'同样是'+m+'，生产现场能看出什么？',
    body:'这次内容来自真实工厂/生产现场。与其只说“厂家货源”，更有用的是把板面、规格、选材、生产和库存状态拍清楚，让用户知道这些信息和实际选择有什么关系。',
    cover:'工厂/车间真实现场。',images:'生产 → 板面 → 规格 → 包装/库存。'};
  return null
}
function phraseNatural(s,p,variant){
  const m=p.mat,ph=String(s.phrase||'').slice(0,8);let title='',body='';
  if(/怎么选|如何选|选购/.test(ph))title=variant==='A'?m+'怎么选？先把这几个条件看清楚':m+'怎么选更合适？别只看样板';
  else if(/避坑|踩坑|后悔|别买/.test(ph))title=variant==='A'?'准备铺'+m+'，先把这些'+ph+'点看明白':m+'落地前先说说'+ph+'这件事';
  else if(/客厅|卧室|实景|现场|完工|入住/.test(ph))title=variant==='A'?ph+'里看'+m+'，比单看样板更直观':m+'放进'+ph+'以后，最该看什么？';
  else if(/价格|预算/.test(ph))title=variant==='A'?m+'的'+ph+'到底该怎么看？':m+'别只看单价，'+ph+'要一起算';
  else if(/安装|铺装|收口|鱼骨|人字|工字/.test(ph))title=variant==='A'?m+'做'+ph+'，落地前先确认这些':ph+'和'+m+'怎么配，先看空间条件';
  else if(/对比|区别|差别/.test(ph))title=variant==='A'?m+ph+'到底在哪？':m+'怎么选？先把'+ph+'看清楚';
  else title=variant==='A'?m+'里反复提到「'+ph+'」，到底在看什么？':'看'+m+'时，「'+ph+'」为什么值得注意？';
  body='本轮高价值标题里，“'+ph+'”出现得明显更多。这里不照抄原文，只保留它背后的切入方式：把用户真正关心的问题放到前面，再用真实产品、空间、规格、铺法或现场信息给出判断。';
  return{title,body,cover:'用与“'+ph+'”直接相关的真实图片，不做统计海报。',images:'主题对应的真实场景 → 产品近景 → 关键细节 → 落地结果。'}
}
function comboNatural(s,p,variant){
  const ids=new Set(s.parts||[]),m=p.mat;
  let hook='怎么选？先看真正影响落地的条件';
  if(ids.has('painAngle'))hook='这几个坑最好提前避开';
  else if(ids.has('titleCompare')||ids.has('compareAngle'))hook='真正的差别到底在哪？';
  else if(ids.has('titleResult')||ids.has('experience')||ids.has('realCaseAngle'))hook='装完以后最值得看什么？';
  else if(ids.has('titleQuestion')||ids.has('decisionAngle')||ids.has('decisionTitle'))hook='怎么选才更合适？';
  else if(ids.has('titleScene')||ids.has('sceneBody'))hook='铺进客厅以后最该看什么？';
  let facts=[];
  if(ids.has('titleSpec')&&p.spec)facts.push(p.spec);
  if((ids.has('titlePrice')||ids.has('budgetAngle'))&&p.price)facts.push(p.price+'元/㎡');
  if(ids.has('titleArea')&&p.area)facts.push(p.area);
  if(ids.has('titleLayout')&&p.layout)facts.push(p.layout);
  if(ids.has('titleInstall')&&p.install)facts.push(p.install);
  let lead=facts.length?facts.join(' · ')+' ':'';
  let title=lead+m+'，'+hook;
  if(ids.has('titleNumber'))title='3个问题：'+lead+m+' '+hook;
  if(ids.has('titleMaterial')&&!title.includes(m))title=m+' '+title;
  if(ids.has('titleScene')&&!/客厅|卧室|家装|装修|空间/.test(title))title='客厅铺'+m+'，'+hook;
  if(ids.has('titleResult')&&!/装完|铺完|完工|结果/.test(title))title='装完'+m+'以后，'+hook;
  if(ids.has('titleCompare')&&!/差|对比|怎么选/.test(title))title=m+'差在哪？'+lead;
  if(ids.has('titleQuestion')&&!/[？?]|怎么|为什么|差在哪/.test(title))title+='？';
  if(ids.has('titleSpec')&&p.spec&&!title.includes(p.spec))title=p.spec+' '+title;
  if(ids.has('titlePrice')&&p.price&&!title.includes(p.price))title=p.price+'元/㎡ '+title;
  if(ids.has('titleArea')&&p.area&&!title.includes(p.area))title=p.area+' '+title;
  if(ids.has('titleLayout')&&p.layout&&!title.includes(p.layout))title=p.layout+' '+title;
  if(ids.has('titleInstall')&&p.install&&!title.includes(p.install))title=p.install+' '+title;
  if(ids.has('titleNumber')&&!/\d{1,2}\s*(?:个|条|点|种|件|步|招|坑|问题|细节)/.test(title))title='3个问题：'+title;
  if(ids.has('titleCompare')&&!/对比|差在哪|区别|差别|怎么选/.test(title))title+='，差别在哪？';
  if(ids.has('titleScene')&&!/客厅|卧室|家装|装修|新房|老房|民宿|办公室|写字楼|地暖/.test(title))title='客厅 '+title;
  const points=[];
  if(ids.has('sceneBody')||ids.has('titleScene'))points.push('真实空间和采光');
  if(ids.has('howto')||ids.has('saveValue')||ids.has('practicalInfo'))points.push('规格、铺法和收口');
  if(ids.has('performanceAngle'))points.push('稳定性、耐磨、防潮或地暖条件');
  if(ids.has('installDetailAngle'))points.push('安装、门套、柜体和收口');
  if(ids.has('factory')||ids.has('sourceProofAngle'))points.push('工厂生产、板面和库存实况');
  if(ids.has('budgetAngle')||ids.has('titlePrice'))points.push('单价、损耗和完整落地预算');
  if(ids.has('realCaseAngle')||ids.has('experience')||ids.has('titleResult'))points.push('这次真实现场/完工结果');
  if(!points.length)points.push('空间、规格、铺法和真实板面');
  let body='这轮数据里，这两个因素同时出现在高表现内容中的比例更高。实际发内容时不需要提“组合模式”，只要自然地把它们放在同一条里。\n\n';
  if(ids.has('factory')||ids.has('sourceProofAngle'))body+='这次直接看真实工厂/生产现场。\n';
  if(ids.has('realCaseAngle')||ids.has('experience')||ids.has('titleResult'))body+=p.raw+'\n';
  if(ids.has('howto')||ids.has('saveValue')||ids.has('titleNumber'))body+=(ids.has('saveValue')?'这份清单可以先收藏：\n':'')+'1. '+points[0]+'\n2. '+(points[1]||'真实产品细节')+'\n3. '+(points[2]||'最终落地判断')+'\n';
  else body+='重点看：'+points.join('、')+'。';
  if(ids.has('discussion'))body+='\n\n如果是你家，你会先看哪一个条件？';
  if(ids.has('painAngle'))body+='\n\n真正要避开的，是只看样板却忽略现场条件。';
  if(ids.has('compareAngle')||ids.has('titleCompare'))body+='\n\n对比时尽量放在同一空间和同一条件下看，不做脱离条件的结论。';
  return{title,body,cover:'使用与这两个因素直接相关的真实图，不额外叠加第三种封面实验。',images:'整体场景 → 产品近景 → 关键变量 → 落地/收口。'}
}

function naturalXhsGenerate(p,s,variant='A'){
  const m=p.mat,plan=strategyPlan(s,p,variant),n=plan.numeric,sp=semanticSpec(p);
  let title='',body='',cover='',images='';
  const mined=s.kind==='combo'?comboNatural(s,p,variant):s.kind==='phrase'?phraseNatural(s,p,variant):semanticNatural(s,p,variant);
  if(mined){title=mined.title;body=mined.body;cover=mined.cover;images=mined.images}
  else if(s.id==='titleNumber'){
    if(variant==='A'){
      title=m+'怎么选？先看这4个问题';
      body='如果准备铺'+m+'，我会先把这4个问题确认清楚：\n1. 家里实际是什么空间和采光\n2. 更适合什么规格和铺法\n3. 柜体、门套和收口怎么衔接\n4. 日常使用更在意脚感、稳定还是打理\n\n这4项先想清楚，再去看具体产品会更容易判断。';
      cover='真实空间或产品现场图，封面只保留「铺'+m+'前先看4个问题」。';
      images='空间全景 → 板面近景 → 铺法/规格 → 收口细节。';
    }else{
      title='准备铺'+m+'，这3个细节很容易被忽略';
      body='看'+m+'时，很多人第一眼先看颜色，但真正落地以后，我更建议先看这3件事：\n1. 房间尺度和整体采光\n2. 规格、铺法和视觉比例\n3. 柜体、门套、收口能不能顺下来\n\n把这3个细节一起看，比只盯着一块样板更接近最后铺出来的效果。';
      cover='用真实铺装/样板现场，标题写「3个容易忽略的细节」。';
      images='真实空间 → 单板 → 拼铺 → 收口。';
    }
  }else if(s.id==='titleYears'&&p.years){
    title=variant==='A'?p.years+'以后再看'+m+'，最该关注什么？':m+'用了'+p.years+'，真正能看出哪些差别？';
    body='这条只使用真实时间信息：'+p.years+'。长期看地板，更值得观察的是稳定性、表面状态、收口变化和日常打理；具体结论只根据你提供的真实使用情况写，不补编体验。';
    cover='真实使用/完工后的现状图。';
    images='当前整体 → 板面 → 边角/收口 → 日常使用细节。';
  }else if(s.id==='titleSpec'&&sp){
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
  }else if(s.id==='titleSpec'&&n){
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
  if(s.id==='spec')return !!p.spec&&(t+' '+b).includes(p.spec);
  if(s.id==='priceTitle')return !!p.price&&(t+' '+b).includes(p.price);
  if(s.id==='materialTitle')return t.includes(p.mat);
  if(s.id==='condition')return !!p.condition&&(t+' '+b).includes(p.condition);
  if(s.id==='stock')return /现货|库存|仓库|清仓|尾货|\d+\s*(?:件|套|箱|支|片|包|平方|㎡|米)/.test(t+' '+b);
  if(s.id==='logistics')return /包邮|发货|自提|送货|物流|运费|到付|同城/.test(t+' '+b);
  if(s.id==='sellerProof')return /实拍|原图|可看货|验货|现场|自提/.test(t+' '+b+c);
  if(s.id==='service')return /安装|售后|测量|上门|配送/.test(t+' '+b);
  if(s.kind==='phrase')return !!s.phrase&&(t.includes(s.phrase)||b.includes(s.phrase));
  if(s.kind==='combo'){
    const model=window.__g81Analysis&&window.__g81Analysis.model,fake={title:t,text:b,contentType:'笔记'};
    const fns=(s.parts||[]).map(id=>model&&model.features.find(z=>z[0]===id)?.[2]).filter(Boolean);
    return fns.length===((s.parts||[]).length)&&fns.every(fn=>{try{return !!fn(fake)}catch{return false}})
  }
  if(s.id==='decisionAngle')return /怎么选|如何选|适合|区别|差别|选择/.test(t+' '+b);
  if(s.id==='painAngle')return /避坑|踩坑|问题|注意|容易|别买|后悔/.test(t+' '+b);
  if(s.id==='compareAngle')return /对比|区别|差别|怎么选|还是|哪个/.test(t+' '+b);
  if(s.id==='realCaseAngle')return /现场|完工|客户|业主|这次|实际/.test(t+' '+b);
  if(s.id==='performanceAngle')return /稳定|耐磨|防潮|地暖|变形|开裂|密度|脚感/.test(t+' '+b);
  if(s.id==='installDetailAngle')return /安装|铺装|铺法|收口|门套|柜体|踢脚线|龙骨|鱼骨|人字/.test(t+' '+b);
  if(s.id==='budgetAngle')return !!p.price&&(t+' '+b).includes(p.price);
  if(s.id==='sourceProofAngle')return /工厂|车间|生产|仓库|库存/.test(t+' '+b);
  if(s.id==='titleSpec')return !!p.spec&&t.includes(p.spec);
  if(s.id==='titleNumber')return /\d{1,2}\s*(?:个|条|点|种|件|步|招|坑|问题|细节)/.test(t);
  if(s.id==='titleYears')return !!p.years&&(t+' '+b).includes(p.years);
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
  if(s.id==='titleSpec'&&!numericMeaning(p))return{ok:false,reason:'规格信息没有明确语义'};
  if(s.id==='titleNumber'&&!/\d{1,2}\s*(?:个|条|点|种|件|步|招|坑|问题|细节)/.test(o.title))return{ok:false,reason:'数字清单结构不自然'};
  return{ok:true,reason:''};
}
function eligibility(s,p){
  if(!s)return{ok:false,need:'没有可测试信号'};
  if(s.id==='titleSpec'&&!p.spec)return{ok:false,need:'真实规格，例如 910×125×17'};
  if(s.id==='titlePrice'&&!p.price)return{ok:false,need:'真实价格，例如 530元/㎡'};
  if(s.id==='titleLayout'&&!p.layout)return{ok:false,need:'真实户型，例如 三房两厅'};
  if(s.id==='titleArea'&&!p.area)return{ok:false,need:'真实面积，例如 70㎡'};
  if(s.id==='titleInstall'&&!p.install)return{ok:false,need:'真实铺法，例如 鱼骨 / 人字 / 工字'};
  if((s.id==='titleResult'||s.id==='experience')&&!p.experience)return{ok:false,need:'真实使用/完工结果，避免编造体验'};
  if(s.id==='factory'&&!p.factory)return{ok:false,need:'确认这条内容确实是工厂/生产现场'};
  return{ok:true,need:''};
}

function naturalXyGenerate(p,s,variant='A'){
  const m=p.mat||'商品',id=s.id;let title='',body='',cover='',images='',tags='';
  const factual=[p.spec,p.condition,p.quantity,p.price?('¥'+p.price):'',p.stockText,p.logisticsText,p.proofText,p.sceneText].filter(Boolean);
  if(id==='spec'&&p.spec)title=variant==='A'?[m,p.spec,p.condition].filter(Boolean).join(' '):[p.spec,m,p.condition].filter(Boolean).join(' ');
  else if(id==='priceTitle'&&p.price)title=variant==='A'?[m,'¥'+p.price,p.spec||p.condition].filter(Boolean).join(' '):['¥'+p.price,m,p.spec||p.condition].filter(Boolean).join(' ');
  else if(id==='materialTitle')title=variant==='A'?[m,p.spec||p.condition||p.quantity].filter(Boolean).join(' '):[m,p.condition||p.spec||p.price&&('¥'+p.price)].filter(Boolean).join(' ');
  else if(id==='condition'&&p.condition)title=variant==='A'?[p.condition,m,p.spec].filter(Boolean).join(' '):[m,p.condition,p.quantity].filter(Boolean).join(' ');
  else if(id==='stock')title=variant==='A'?[m,p.stockText||p.quantity,p.spec].filter(Boolean).join(' '):[m,p.quantity||p.stockText,p.condition].filter(Boolean).join(' ');
  else if(id==='factory')title=variant==='A'?[m,'工厂/库存',p.spec||p.quantity].filter(Boolean).join(' '):[m,'厂家货源',p.spec||p.condition].filter(Boolean).join(' ');
  else if(id==='logistics')title=variant==='A'?[m,p.spec,p.logisticsText].filter(Boolean).join(' '):[m,p.logisticsText,p.condition].filter(Boolean).join(' ');
  else if(id==='sellerProof')title=variant==='A'?[m,p.proofText,p.spec||p.condition].filter(Boolean).join(' '):[m,p.spec||p.condition,p.proofText].filter(Boolean).join(' ');
  else if(id==='scene')title=variant==='A'?[m,p.sceneText,p.spec].filter(Boolean).join(' '):[m,p.spec,p.sceneText].filter(Boolean).join(' ');
  else if(id==='service')title=variant==='A'?[m,p.spec,p.serviceText].filter(Boolean).join(' '):[m,p.serviceText,p.condition].filter(Boolean).join(' ');
  else title=variant==='A'?[m,...factual.slice(0,3)].join(' '):[...factual.slice(0,2),m].join(' ');
  title=title.replace(/\s+/g,' ').trim();
  if(title.length<7&&factual.length)title=[m,...factual.slice(0,2)].join(' ');
  title=title.slice(0,34);
  const lines=['商品：'+m];
  if(p.spec)lines.push('规格：'+p.spec);
  if(p.condition)lines.push('状态：'+p.condition);
  if(p.quantity)lines.push('数量：'+p.quantity);
  if(p.price)lines.push('价格：'+p.price+'元'+(/㎡|平方/.test(p.raw)?'/㎡':''));
  if(p.stockText)lines.push('库存：'+p.stockText);
  if(p.factory)lines.push('货源：'+(p.raw.match(/工厂|厂家|车间|仓库|库存|生产/g)||[]).join(' / '));
  if(p.logisticsText)lines.push('交付：'+p.logisticsText);
  if(p.serviceText)lines.push('服务：'+p.serviceText);
  if(p.proofText)lines.push('核验：'+p.proofText);
  if(p.sceneText)lines.push('场景：'+p.sceneText);
  body=lines.join('\n');
  tags=[m,p.spec,p.condition,p.quantity].filter(Boolean).join(' / ');
  cover='闲鱼首图优先真实商品主体；只展示你确实拥有的规格、状态或价格信息，不做小红书式大字海报。';
  images='商品整体 → 真实细节/瑕疵 → 规格/状态 → 交付或库存证明；没有对应素材就不写。';
  return{title,body,tags,cover,images,plan:strategyPlan(s,p,variant)};
}
function naturalGenericGenerate(p,s,variant='A'){
  const platform=currentPlatform(),subject=p.mat||p.raw||'内容',label=s?.label||'当前最强信号';
  const title=variant==='A'?(subject+'｜'+label):(label+'：'+subject);
  const body='平台：'+platform+'\n主题：'+p.raw+'\n\n本轮只验证“'+label+'”这个变量，其余信息尽量保持一致。不会套用小红书点赞/收藏公式，也不会套用闲鱼想要/咨询公式；只使用这个网站实际能采到的指标判断结果。';
  return{title:title.slice(0,34),body,tags:subject,cover:'使用该平台常见且真实的主图/封面形式。',images:'保持素材一致，只改变当前测试变量。',plan:strategyPlan(s,p,variant)};
}
function makeTwoVersions(p,s){
  const platform=(window.__g81Analysis&&window.__g81Analysis.platform)||currentPlatform();
  const gen=platform==='小红书'?naturalXhsGenerate:platform==='闲鱼'?naturalXyGenerate:naturalGenericGenerate;
  const rawA=gen(p,s,'A'),rawB=gen(p,s,'B');
  const a=platform==='小红书'?applyImageAdvice(rawA):rawA,b=platform==='小红书'?applyImageAdvice(rawB):rawB;
  const ca=readabilityCheck(a,s,p),cb=readabilityCheck(b,s,p);
  return[{...a,label:'方案A',mode:'严格测试当前变量',check:ca},{...b,label:'方案B',mode:'同一变量的另一种表达',check:cb}];
}


function ensureUI(){
  document.querySelector('.stats')?.classList.add('g81-hide');
  $id('marketAnalysisCard')?.classList.add('g81-hide');
  $id('g81Decision')?.classList.add('g81-hide');
  $id('g81Report')?.classList.add('g81-hide');
  const oldGen=$id('genKeyword')?.closest('.card');if(oldGen)oldGen.classList.add('g81-hide');
  const raw=[...document.querySelectorAll('.card')].find(x=>x.querySelector('.label')?.textContent==='抓取结果');
  const capture=[...document.querySelectorAll('.card')].find(x=>x.querySelector('.label')?.textContent.includes('抓取数据'));
  const mobile=$id('mobileCollectCard');

  let report=$id('g82Report');
  if(!report){
    report=document.createElement('section');report.id='g82Report';report.className='g82-report';
    report.innerHTML='<div class="g82-head"><div><span id="g82PlatformTitle">自动识别平台 · 本轮综合分析</span><h2>这批数据告诉了我什么</h2></div><div id="g82ReportMeta" class="g82-meta"></div></div><p id="g82Summary" class="g82-summary">正在分析本轮数据…</p><div id="g82BestRef" class="g82-best-ref" style="display:none"></div><div class="g82-grid"><div class="g82-main"><div class="g82-section-title">本轮最值得看的发现</div><div id="g82Findings"></div><div class="g82-section-title">高表现主要赢在哪里</div><div id="g82Layers" class="g82-layers"></div><div class="g82-section-title">本轮高价值内容画像</div><div id="g82Profile" class="g82-profile"></div><div class="g82-section-title" id="g84ImageTitle">图片 / 封面规律</div><div id="g825ImageFindings" class="g825-image-findings"></div></div><aside class="g82-side"><small>下一轮建议</small><strong id="g82NextTitle">等待分析</strong><p id="g82NextDo"></p><div class="g82-dont"><b>不要</b><span id="g82NextDont"></span></div><div class="g82-purpose"><b>目的</b><span id="g82NextPurpose"></span></div><button id="g82GenerateTop" class="g81-primary">生成下一轮测试内容</button><button id="g82CopyReport" class="g81-secondary">复制综合报告</button></aside></div><div class="g82-section-title">内容机会地图</div><div id="g82Map" class="g82-map"></div><div id="g82Limit" class="g82-limit"></div>';
    document.querySelector('.top')?.after(report);
  }

  let middle=$id('g81Middle');
  if(!middle){
    middle=document.createElement('section');middle.id='g81Middle';middle.className='g81-middle';
    middle.innerHTML='<div class="g81-generator"><div class="g81-section-title"><b>生成下一轮测试内容</b><span id="g84GeneratorHint">先识别平台，再执行对应测试策略</span></div><div class="g81-input-row"><input id="g81Product"><button id="g81Generate" class="g81-primary">生成</button></div><div id="g81Need" class="g81-need"></div><div id="g81Output" class="g81-output g81-empty-output">输入真实商品/内容信息后，系统会按当前平台规则生成两个测试方案。</div></div>';
    report.after(middle);
  }else{
    const rp=middle.querySelector('.g81-reason-panel');if(rp)rp.style.display='none';
  }

  let details=$id('g81Details');
  if(!details){
    details=document.createElement('section');details.id='g81Details';details.className='g81-details';
    details.innerHTML='<div class="g81-detail-grid"><div><div class="g81-section-title"><b>关键证据</b><span>高表现 VS 普通</span></div><div id="g81Evidence" class="g81-evidence"></div></div><div><div class="g81-section-title"><b>典型高价值案例</b><span>默认3条</span></div><div id="g81High" class="g81-high-list"></div><button id="g81ShowHigh" class="g81-more">查看全部高价值样本</button></div></div><div class="g81-detail-foot" id="g81DetailFoot"></div>';
    middle.after(details);
  }
  details.classList.remove('show');
  if(!$id('g82DetailToggle')){const b=document.createElement('button');b.id='g82DetailToggle';b.className='g81-more';b.textContent='查看详细分析';middle.after(b);b.onclick=()=>{details.classList.toggle('show');b.textContent=details.classList.contains('show')?'收起详细分析':'查看详细分析'}}
  if(capture&&details.nextElementSibling!==capture)details.after(capture);
  if(mobile&&capture&&capture.nextElementSibling!==mobile)capture.after(mobile);

  if(raw&&!raw.dataset.g81){raw.dataset.g81='1';const head=raw.querySelector('.head');if(head&&head.querySelector('.muted'))head.querySelector('.muted').textContent='原始数据默认折叠，只在核查证据时展开。';if(head&&!$id('g823RawCount')){const count=document.createElement('span');count.id='g823RawCount';count.className='g823-raw-count';count.textContent='共计 0 条';const label=head.querySelector('.label');label?label.after(count):head.appendChild(count)}const children=[...raw.children].filter(x=>x!==head),body=document.createElement('div');body.id='g81RawBody';body.className='g81-raw-body';children.forEach(x=>body.appendChild(x));const btn=document.createElement('button');btn.className='g81-raw-toggle';btn.innerHTML='<span>查看原始抓取数据</span><span>展开</span>';btn.onclick=()=>{body.classList.toggle('show');btn.lastElementChild.textContent=body.classList.contains('show')?'收起':'展开'};raw.appendChild(btn);raw.appendChild(body)}

  $id('g82GenerateTop').onclick=()=>{const i=$id('g81Product');middle.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>i.focus(),250)};
  $id('g81Generate').onclick=generateCurrent;
  $id('g81ShowHigh').onclick=()=>{window.__g81ShowAll=!window.__g81ShowAll;renderHigh(window.__g81Analysis);$id('g81ShowHigh').textContent=window.__g81ShowAll?'只看3条典型样本':'查看全部高价值样本'};
}


function dimCoverage(rows,key){if(!rows.length)return 0;return rows.filter(x=>x.__dims&&x.__dims[key]!==null&&x.__dims[key]!==undefined).length/rows.length}
function metricLayers(r){
  let specs=[];
  if(r.platform==='小红书')specs=[
    ['高浏览型','views','浏览'],
    ['高点赞型',dimCoverage(r.pool,'likeRate')>=.25?'likeRate':'likes','点赞'],
    ['高收藏型',dimCoverage(r.pool,'favRate')>=.25?'favRate':'favs','收藏'],
    ['高评论型',dimCoverage(r.pool,'commentRate')>=.25?'commentRate':'comments','评论'],
    ['高转发型',dimCoverage(r.pool,'shareRate')>=.25?'shareRate':'shares','转发'],
    ['综合互动型','totalRate','综合互动'],
    ['短期增长型','speed','增长速度']
  ];
  else if(r.platform==='闲鱼')specs=[
    ['高曝光型','exp','曝光'],
    ['高浏览型','views','浏览'],
    ['高点击型','clickRate','曝光→浏览'],
    ['高想要型',dimCoverage(r.pool,'wantRate')>=.2?'wantRate':'wants','想要'],
    ['高咨询型',dimCoverage(r.pool,'consultRate')>=.15?'consultRate':'consults','咨询'],
    ['高成交型',dimCoverage(r.pool,'saleRate')>=.12?'saleRate':'sales','成交'],
    ['近期增长型','speed','增长速度']
  ];
  else{
    const preferred=['views','likes','favs','comments','shares','wants','consults','sales','speed'];
    specs=preferred.filter(k=>r.model.labels[k]).map(k=>['高'+r.model.labels[k]+'型',k,r.model.labels[k]]);
  }
  return specs.map(([name,key,label])=>{
    const rows=r.pool.filter(x=>x.__dims[key]!==null&&x.__dims[key]!==undefined&&Number.isFinite(x.__dims[key]));
    const cov=r.pool.length?rows.length/r.pool.length:0,need=Math.max(12,Math.ceil(r.pool.length*.12));
    if(rows.length<Math.min(12,need)||cov<.10){
      let why='可用'+label+'数据 '+rows.length+'/'+r.pool.length+'，当前不足以稳定比较。';
      if(r.platform==='小红书'&&key==='views')why+=' 小红书公开页面不一定稳定提供浏览数据。';
      else if(r.platform==='闲鱼')why+=' 闲鱼只使用当前页面实际可见的曝光、浏览、想要、咨询或成交字段，不用小红书互动指标替代。';
      return{name,key,label,available:false,coverage:cov,count:rows.length,need,reason:why};
    }
    const sorted=rows.slice().sort((a,b)=>b.__dims[key]-a.__dims[key]),n=Math.max(5,Math.ceil(sorted.length*.20)),high=sorted.slice(0,n),normal=sorted.slice(n);
    const fs=evidence(high,normal,r.model.features,cov,1,0).filter(x=>x.diff>0&&x.level!=='数据不足').sort((a,b)=>b.diff-a.diff||b.z-a.z);
    return{name,key,label,available:true,coverage:cov,count:rows.length,need,highCount:high.length,top:fs[0]||null};
  });
}
function explainFinding(f){
  if(!f)return'';
  const what=f.kind==='combo'?'这不是单一技巧，而是两个内容因素同时出现时的组合优势。':f.kind==='phrase'?'这是从高价值标题里自动挖出的重复切入口，不是预设模板。':'';
  if(f.category==='可以复用')return(what?what+' ':'')+'它在高表现内容中明显更常见，当前可作为优先策略继续使用。';
  if(f.category==='值得测试')return(what?what+' ':'')+'它在高表现内容中出现得更多，下一轮值得单独验证。';
  if(f.diff>0)return(what?what+' ':'')+'高表现内容中略多一些，目前只作为观察信号。';
  return'高低表现组差异很小，本轮不建议参考。';
}
function contentProfile(r){
  const out=r.reusable.concat(r.testable).filter(x=>x.diff>0).slice(0,4).map(x=>x.label);
  for(const t of (r.themes||[]).slice(0,3)){if(t.hp>=.12)out.push('高价值主题「'+t.name+'」'+Math.round(t.hp*100)+'%')}
  return [...new Set(out)].slice(0,6)
}
function opportunityMap(r){
  const reuse=r.reusable.slice(0,4),test=r.testable.slice(0,5);
  if(!test.length&&r.exploratory)test.push(r.exploratory);
  const noRef=r.findings.filter(x=>x.category==='暂无价值'&&Math.abs(x.diff)<.05).slice(0,5);
  return{reuse,test,noRef};
}
function humanSummary(r){
  const sig=r.reusable.concat(r.testable),s=r.strongest||r.exploratory,platform=r.platform||currentPlatform(),noun=platform==='小红书'?'笔记':platform==='闲鱼'?'商品':'内容';
  const depth=db.lastMeta&&db.lastMeta.depth,deepN=Number(depth&&depth.enriched)||0;
  const gap=platform==='小红书'?(deepN===0?'；本轮详情补全为 0/120，所以正文、封面、收藏/评论等深层结论暂不冒充已验证，只使用当前真正拿到的字段。':'；详情补全 '+deepN+'/'+(depth?.target||120)+'，深层字段按实际覆盖参与判断。'):'';
  if(sig.length){
    const names=sig.slice(0,3).map(x=>'“'+x.label+'”').join('、');
    const combos=(r.combos||[]).filter(x=>x.category!=='探索性测试').length,phrases=(r.phrases||[]).filter(x=>x.category!=='探索性测试').length;
    const extra=platform==='小红书'&&(combos||phrases)?('；其中包含'+(combos?combos+'个组合模式':'')+(combos&&phrases?'、':'')+(phrases?phrases+'个高价值标题切入口':'')):'';
    return'本轮'+r.batch.length+'条'+platform+noun+'、'+r.high.length+'条高表现样本中，已经识别出 '+sig.length+' 个可执行信号。当前优先看 '+names+extra+gap;
  }
  if(s){
    return'本轮'+r.batch.length+'条'+platform+noun+'暂未达到“可直接复用”级别，但并非没有信息。当前最明显的是“'+s.label+'”：高表现 '+fmtPct(s.hp)+'、普通 '+fmtPct(s.np)+'、差异 '+(s.diff>=0?'+':'')+Math.round(s.diff*100)+'%，下一轮应针对它做验证'+gap;
  }
  const themes=(r.themes||[]).slice(0,2).filter(x=>x.hp>0),themeText=themes.length?(' 当前高价值样本主要集中在 '+themes.map(x=>'“'+x.name+'” '+Math.round(x.hp*100)+'%').join('、')+'。'):'';
  return'本轮'+platform+'没有发现足以单独定型的单一因子，但不等于没有方向。'+themeText+' 系统会从当前平台实际可见的数据和高价值样本结构里选择下一轮测试方向'+gap;
}
function xyNextAdvice(r){
  const s=r.strongest||r.exploratory;
  if(!s){
    const top=(r.themes||[])[0]||{name:'标准商品',hp:0};
    const actions={'二手/闲置':'把成色、使用情况、瑕疵和可看货/自提条件写清楚，先提升买家判断效率。','全新商品':'把规格、状态、库存和交付条件前置，减少无效咨询。','库存/货源':'把真实库存、规格范围、是否可拆零/批量和发货方式写清楚。','厂家/商家':'用真实货源、板面、库存或生产现场建立可信度，不只写“厂家直销”。','交付/物流':'把发货地、物流/自提、运费规则和交期写清楚。','场景/案例':'商品图里加入真实铺装/使用场景，但标题仍以交易信息为主。','价格型':'测试清晰价格 + 规格/成色条件，不做脱离条件的低价标题。','标准商品':'优先把品类、规格、状态、价格和交付条件写完整。'};
    return{title:'下一轮优化「'+top.name+'」商品表达',doText:(actions[top.name]||actions['标准商品'])+(top.hp?(' 本轮高价值样本中该类型约占 '+Math.round(top.hp*100)+'%。'):''),dont:'不要套小红书的“故事/种草”写法，也不要为了点击把价格、规格或成色写得模糊。',purpose:'提高闲鱼搜索点击后的有效咨询与成交判断效率。'};
  }
  const map={
    spec:['规格前置','标题写完整规格，并在描述里补充对应面积/数量/状态，让搜索用户一眼判断是否匹配。'],
    priceTitle:['真实价格前置','把真实价格和适用条件一起写清楚，避免只用低价数字吸引无效点击。'],
    materialTitle:['品类/材质前置','标题先写清楚具体品类或材质，再补规格、状态或核心交易条件。'],
    condition:['新旧/成色写清楚','把全新、二手、翻新、拆旧等状态明确写出，并说明真实瑕疵或使用情况。'],
    stock:['库存/数量写清楚','把现货、库存数量、可拆零/批量等信息前置，减少反复询问。'],
    factory:['用真实货源证据','展示真实工厂、仓库、库存或生产信息，但重点写买家能据此判断的规格和交付能力。'],
    logistics:['交付条件前置','把发货、自提、物流、运费或同城配送条件写清楚。'],
    sellerProof:['加强交易可信度','增加实拍、原图、可看货/自提等可验证信息，降低买家不确定性。'],
    scene:['场景图辅助成交','保留交易信息为主，图片中加入真实使用/铺装效果帮助买家判断。'],
    service:['服务范围写清楚','把安装、配送、测量或售后范围写明，避免买家误判包含项目。']
  };
  const v=map[s.id]||['优化当前最强商品信号','围绕“'+s.label+'”做一次单变量商品测试，其他价格、图片数量和发布时间尽量不变。'];
  return{title:v[0],doText:v[1],dont:'不要把闲鱼商品写成小红书笔记；闲鱼优先解决搜索匹配、价格判断、可信度和交付问题。',purpose:'验证这个商品信息变量是否能提升想要、咨询或成交，而不是只追求浏览量。'};
}
function genericNextAdvice(r){
  const s=r.strongest||r.exploratory,top=(r.themes||[])[0]||{name:'当前主流内容',hp:0};
  if(!s)return{title:'下一轮测试「'+top.name+'」方向',doText:'沿用本轮高价值样本最集中的方向，只改变一个可观察变量，再用该平台实际提供的互动/交易指标验证。',dont:'未知平台不会套用小红书或闲鱼的固定公式；没有字段就不编指标。',purpose:'先建立这个网站自己的可验证规则。'};
  return{title:'下一轮测试：'+s.label,doText:'围绕“'+s.label+'”做单变量测试，并以当前网站实际能采到的表现指标作为结果，不借用其他平台指标。',dont:'不要跨平台照搬标题、互动权重或转化逻辑。',purpose:'逐步建立该网站自己的高表现规则。'};
}
function nextAdvice(r){
  if(r.platform==='闲鱼')return xyNextAdvice(r);
  if(r.platform!=='小红书')return genericNextAdvice(r);
  const s=r.strongest||r.exploratory;
  if(!s){
    const top=(r.themes||[])[0]||{name:'真实案例/选购问题',hp:0};
    const actions={'知识/攻略':'做一条真正能帮助选购的判断型内容：只解决一个问题，给出条件、对比和结论。','案例/场景':'用一个真实空间/完工案例开头，先讲现场条件，再讲为什么这样选。','价格/预算':'围绕真实预算拆解“单价之外还要算什么”，把损耗、铺法和安装条件说清楚。','工厂/货源':'用真实工厂/生产现场做证据，展示板面、规格、选材或库存中用户能据此判断的东西。','产品展示':'不要只晒产品，给产品展示绑定一个明确选择问题，例如规格、铺法或适用空间。'};
    return{title:'下一轮测试「'+top.name+'」方向',doText:(actions[top.name]||actions['知识/攻略'])+(top.hp?(' 本轮高价值样本中该方向约占 '+Math.round(top.hp*100)+'%。'):''),dont:'不要复制固定文案，也不要同时改标题、封面、正文结构三个变量。',purpose:'先验证高价值样本最集中的内容方向，再用你的真实发布结果决定是否继续加码。'};
  }
  let doText=s.label,title=s.label,dont='不要把后台统计标签直接写进正文。';
  if(s.kind==='combo'){
    title='下一轮测试：'+(s.partLabels||[]).join(' × ');
    doText='把这两个高表现因素放在同一条内容里执行：先用“'+(s.partLabels?.[0]||'主切入')+'”建立阅读入口，再用“'+(s.partLabels?.[1]||'第二因素')+'”把内容落到真实判断；其余标题长度、图片数量和发布时段尽量保持接近。';
    dont='不要再叠加第三个新变量，否则发布后无法判断到底是哪一个因素起作用。';
  }else if(s.kind==='phrase'){
    title='下一轮围绕「'+s.phrase+'」做入口测试';
    doText='不要照抄高价值笔记原句，而是保留“'+s.phrase+'”背后的用户意图：标题直接建立这个问题/场景，正文用你自己的真实产品、案例或现场信息回答。';
    dont='不要只把“'+s.phrase+'”塞进标题却不给真实答案。';
  }else if(s.id==='titleSpec'){doText='标题加入与用户决策有关的完整规格信息，并围绕空间适配、铺装效果或规格差异设计问题。';dont='不要把“910”这种孤立数字硬塞进标题；规格必须完整、有单位、有意义。'}
  else if(s.id==='titleNumber'){doText='测试“数字清单型标题”，例如“4个问题 / 3个细节”，数字用于组织内容。';dont='不要把数字当产品参数硬塞；数字只用于自然的内容结构。'}
  else if(s.id==='titleScene'||s.id==='sceneBody'||s.id==='realCaseAngle'){doText='从真实家装场景/业主现场切入，先让用户看到“这和我的空间有什么关系”，再讲产品判断。'}
  else if(s.id==='titleCompare'||s.id==='compareAngle'){doText='用真实对比回答一个具体选择问题：差别在哪里、适合谁、什么条件下选哪一个。'}
  else if(s.id==='titleQuestion'||s.id==='decisionAngle'){doText='标题直接提出一个购买决策问题，正文必须给出可执行判断，而不是泛泛科普。'}
  else if(s.id==='painAngle'){doText='用一个真实容易踩坑的问题切入，正文说明出现问题的条件和避免方法，不制造焦虑。'}
  else if(s.id==='performanceAngle'){doText='围绕用户真正关心的材质性能做判断，例如稳定性、地暖、耐磨或防潮，并明确适用条件。'}
  else if(s.id==='installDetailAngle'){doText='把安装/收口/铺法变成购买前就该确认的问题，用现场细节说明为什么。'}
  else if(s.id==='budgetAngle'||s.id==='titlePrice'){doText='把价格放进完整决策条件里：材质、规格、结构、铺法和落地成本一起讲，不做单纯低价钩子。'}
  else if(s.id==='sourceProofAngle'||s.id==='factory'){doText='用真实工厂、库存或生产现场作为证据，重点展示用户能据此做什么判断。'}
  else if(s.id==='titleScene'||s.id==='sceneBody')doText='从真实家装场景切入，先让用户看到“这和我的空间有什么关系”。';
  else if(s.id==='titleQuestion')doText='标题直接提出一个具体选购问题，正文必须真正回答。';
  return{title,doText,dont,purpose:'下一轮只验证这个最强可执行模式；发布后把真实表现回写，系统再判断它应该升级、保留还是淘汰。'};
}

function bestReference(r){
  if(!r||!r.high?.length)return null;
  const signal=r.strongest||r.exploratory||null;
  const validUrl=x=>{const u=String(x.url||'');return /^https?:\/\//i.test(u)&&!/\/search_result_ai(?:\?|$)/i.test(u)&&!/\/search(?:_result)?(?:\?|$)/i.test(u)};
  const candidates=r.high.filter(validUrl);
  if(!candidates.length)return null;
  const maxScore=Math.max(...candidates.map(x=>Number(x.__score)||0),1);
  const featureFn=signalMatcher(signal,r.model);
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

function imageFeatureRows(r){
  const hi=r.high||[],no=r.normal||[];
  const defs=[
    ['coverVertical','竖版封面',x=>!!x.coverRatioType,x=>x.coverRatioType==='竖版'],
    ['coverSquare','方形/近方形封面',x=>!!x.coverRatioType,x=>x.coverRatioType==='方形/近方形'],
    ['coverText','封面有文字叠加',x=>typeof x.coverHasTextOverlay==='boolean',x=>x.coverHasTextOverlay===true],
    ['multiImage','多图/轮播（4张及以上）',x=>num(x.carouselCount??x.imageCount)!==null,x=>num(x.carouselCount??x.imageCount)>=4],
    ['mediaVideo','视频内容',x=>!!x.mediaType,x=>x.mediaType==='视频'],
    ['sceneCover','真实空间/实景封面线索',x=>!!x.coverVisualType&&x.coverVisualConfidence!=='低',x=>x.coverVisualType==='实景/空间'],
    ['factoryCover','工厂/生产封面线索',x=>!!x.coverVisualType&&x.coverVisualConfidence!=='低',x=>x.coverVisualType==='工厂/生产'],
    ['installCover','施工/铺装封面线索',x=>!!x.coverVisualType&&x.coverVisualConfidence!=='低',x=>x.coverVisualType==='施工/铺装'],
    ['closeupCover','板材/木纹近景封面线索',x=>!!x.coverVisualType&&x.coverVisualConfidence!=='低',x=>x.coverVisualType==='板材/木纹近景'],
    ['compareCover','对比/拼图封面线索',x=>!!x.coverVisualType&&x.coverVisualConfidence!=='低',x=>x.coverVisualType==='对比/拼图'],
    ['infoCover','信息/清单型封面线索',x=>!!x.coverVisualType&&x.coverVisualConfidence!=='低',x=>x.coverVisualType==='信息/清单']
  ];
  const z=(p1,n1,p2,n2)=>{if(!n1||!n2)return 0;const p=(p1*n1+p2*n2)/(n1+n2),se=Math.sqrt(Math.max(1e-9,p*(1-p)*(1/n1+1/n2)));return Math.abs(p1-p2)/se};
  return defs.map(([id,label,available,hit])=>{
    const h=hi.filter(available),n=no.filter(available),hc=h.filter(hit).length,nc=n.filter(hit).length,hp=h.length?hc/h.length:0,np=n.length?nc/n.length:0,diff=hp-np,zz=z(hp,h.length,np,n.length);
    const cov=(hi.length+no.length)?(h.length+n.length)/(hi.length+no.length):0;
    let level='数据不足',category='暂不参考';
    if(h.length>=30&&n.length>=60&&cov>=.55&&diff>=.15&&zz>=2){level='强证据';category='可以复用'}
    else if(h.length>=20&&n.length>=40&&cov>=.35&&diff>=.10&&zz>=1.6){level='中等证据';category='值得测试'}
    else if(h.length>=10&&n.length>=20&&cov>=.25&&diff>=.07){level='弱证据';category='值得测试'}
    else if(cov>=.15&&diff>=.04){level='探索性';category='观察'}
    return{id,label,hc,nc,hCount:h.length,nCount:n.length,hp,np,diff,z:zz,coverage:cov,level,category}
  }).filter(x=>x.coverage>0).sort((a,b)=>{const rank={可以复用:4,值得测试:3,观察:2,'暂不参考':1};return(rank[b.category]-rank[a.category])||b.diff-a.diff});
}
function xyImageAnalysis(r){
  const hi=r.high||[],no=r.normal||[],defs=[
    ['realProduct','商品/实拍主图线索',x=>!!x.imageType,x=>/商品实拍|单板|材质/.test(x.imageType||'')],
    ['scene','场景/案例主图线索',x=>!!x.imageType,x=>/家装效果|案例/.test(x.imageType||'')],
    ['factory','工厂/库存主图线索',x=>!!x.imageType,x=>/工厂|库存/.test(x.imageType||'')],
    ['pricePromo','价格/促销主图线索',x=>!!x.imageType,x=>/价格|促销/.test(x.imageType||'')],
    ['multi','多图商品卡',x=>num(x.imageCount)!==null,x=>num(x.imageCount)>=2]
  ];
  const rows=[];for(const [id,label,available,hit] of defs){
    const h=hi.filter(available),n=no.filter(available),hc=h.filter(hit).length,nc=n.filter(hit).length,hp=h.length?hc/h.length:0,np=n.length?nc/n.length:0,diff=hp-np,cov=(hi.length+no.length)?(h.length+n.length)/(hi.length+no.length):0;
    let level='观察',category='暂不参考';
    if(h.length>=12&&n.length>=25&&diff>=.10){level='中等证据';category='值得测试'}
    else if(h.length>=8&&n.length>=18&&diff>=.06){level='弱证据';category='值得测试'}
    rows.push({id,label,hc,nc,hCount:h.length,nCount:n.length,hp,np,diff,z:0,coverage:cov,level,category})
  }
  const findings=rows.filter(x=>x.diff>0&&x.category==='值得测试').sort((a,b)=>b.diff-a.diff).slice(0,3);
  const covered=(r.pool||[]).filter(x=>x.imageType||num(x.imageCount)!==null).length,cov=r.pool.length?covered/r.pool.length:0;
  let summary=cov<.15?'闲鱼当前缺少可靠主图结构字段；不会套用小红书封面公式。':findings.length?('闲鱼主图侧最明显的可测试信号是“'+findings[0].label+'”，高表现 '+fmtPct(findings[0].hp)+'、普通 '+fmtPct(findings[0].np)+'。'):'闲鱼主图有一定数据覆盖，但暂未发现稳定差异；不强行给封面公式。';
  return{coverage:cov,findings,reusable:[],testable:findings,summary}
}
function imageAnalysis(r){
  if(r.platform==='闲鱼')return xyImageAnalysis(r);
  if(r.platform!=='小红书')return{coverage:0,findings:[],summary:'当前网站没有可靠图片字段时，不套用其他平台的图片公式。',reusable:[],testable:[]};
  const fs=imageFeatureRows(r),covered=(r.pool||[]).filter(x=>x.coverRatioType||typeof x.coverHasTextOverlay==='boolean'||x.mediaType||x.carouselCount||x.coverVisualType).length,cov=r.pool.length?covered/r.pool.length:0;
  const findings=fs.filter(x=>x.diff>0&&x.category!=='暂不参考').slice(0,3),reusable=findings.filter(x=>x.category==='可以复用'),testable=findings.filter(x=>x.category==='值得测试');
  let summary='';
  if(cov<.15)summary='当前这批数据缺少图片结构元数据；重新抓取后会自动比较封面比例、文字叠加、多图/视频和可识别的封面内容线索。';
  else if(findings.length){const x=findings[0];summary='图片侧目前最明显的信号是“'+x.label+'”：高表现 '+fmtPct(x.hp)+'，普通 '+fmtPct(x.np)+'，差异 '+(x.diff>=0?'+':'')+Math.round(x.diff*100)+'%，'+x.level+'。'}
  else summary='图片数据已经有覆盖，但高表现与普通内容暂时没有明显稳定差异。';
  return{coverage:cov,findings,reusable,testable,summary};
}
function imageAdvice(img){
  if(!img)return{cover:'',images:'',basis:''};
  const x=img.reusable?.[0]||img.testable?.[0]||null;
  if(!x)return{cover:'',images:'',basis:img.summary||''};
  const map={
    coverVertical:['封面优先用竖版比例。','整组图片保持竖版为主，避免横竖混乱。'],
    coverSquare:['封面优先使用方形/近方形比例。','图片比例尽量统一，突出主体。'],
    coverText:['封面可以保留少量短文字，但不要做成大段海报。','首图文字只负责说明主题，后续图片回到真实内容。'],
    multiImage:['优先使用多图轮播。','建议至少4张：整体 → 近景 → 关键细节 → 收口/对比。'],
    mediaVideo:['如果有合适素材，优先考虑视频形式。','视频前3秒直接展示空间或产品重点，避免长片头。'],
    sceneCover:['封面优先真实空间/实际铺装场景。','图片顺序：整体空间 → 板面近景 → 铺法/规格 → 收口细节。'],
    factoryCover:['如果内容确实来自工厂，封面优先真实生产/库存现场。','图片顺序：现场 → 板面 → 规格 → 包装/库存。'],
    installCover:['封面优先施工或铺装过程。','图片顺序：施工过程 → 拼接细节 → 完成效果 → 收口。'],
    closeupCover:['封面优先板面/木纹近景。','图片顺序：近景 → 整体 → 规格/铺法 → 细节。'],
    compareCover:['封面优先对比图。','图片顺序：A/B对比 → 各自细节 → 实际空间。'],
    infoCover:['封面优先信息清单型表达。','首图给结论，后续每张图对应一个信息点。']
  };
  const pair=map[x.id]||['',''];
  return{cover:pair[0],images:pair[1],basis:x.label+' '+(x.diff>=0?'+':'')+Math.round(x.diff*100)+'% · '+x.level,signal:x};
}
function applyImageAdvice(v){
  const ia=window.__g825ImageAnalysis,ad=imageAdvice(ia);
  if(!ad.signal)return v;
  if(ad.signal.category!=='可以复用')return{...v,imageBasis:'发现待验证图片信号：'+ad.basis+'；为避免同时改变多个变量，本轮不自动改图片方案。'};
  return{...v,cover:ad.cover||v.cover,images:ad.images||v.images,imageBasis:'可复用图片信号：'+ad.basis};
}
function buildReport(r){
  if(!r||r.empty||r.unsupported)return null;
  const layers=metricLayers(r),opp=opportunityMap(r),primary=r.reusable.concat(r.testable),seen=new Set(primary.map(x=>x.id)),secondary=(r.observed||[]).filter(x=>x.diff>=.03&&!seen.has(x.id)),topFindings=primary.concat(secondary).slice(0,5);
  const stop=db.lastMeta&&db.lastMeta.stoppedBy,stopMap={target:'达到目标500条',manual:'手动停止',saturated:'平台样本已饱和','unique-sample-exhausted':'本轮唯一结果已采完','breadth-time-limit':'广度采集达到时限','safety-time-limit':'达到总安全时限'};
  return{id:(db.lastCapturedAt||'latest')+'|'+r.platform,platform:r.platform,createdAt:nowISO(),summary:humanSummary(r),sample:{raw:r.batch.length,valid:r.pool.length,high:r.high.length,normal:r.normal.length},topFindings:topFindings.map(x=>({...x,explain:explainFinding(x)})),layers,profile:contentProfile(r),images:imageAnalysis(r),opportunity:opp,next:nextAdvice(r),reference:bestReference(r),limits:{coverage:r.coverage,stability:r.stability,anomalies:r.anomalies.length,rankOnlyRate:r.rankOnlyRate,stop:stopMap[stop]||'',depth:(db.lastMeta&&db.lastMeta.depth)||null},confidence:r.confidence};
}
function saveReport(rep){
  if(!rep)return;let a=[];try{a=JSON.parse(localStorage.getItem(REPORTKEY)||'[]')}catch{}
  const i=a.findIndex(x=>x.id===rep.id);if(i>=0)a[i]=rep;else a.push(rep);
  localStorage.setItem(REPORTKEY,JSON.stringify(a.slice(-30)));
}
function reportText(rep){
  if(!rep)return'暂无报告';
  const noun=rep.platform==='小红书'?'笔记':rep.platform==='闲鱼'?'商品':'内容';
  const f=rep.topFindings.map((x,i)=>(i+1)+'. '+x.label+'｜高表现 '+fmtPct(x.hp)+'｜普通 '+fmtPct(x.np)+'｜差异 '+(x.diff>=0?'+':'')+Math.round(x.diff*100)+'%｜'+x.level+'\n   '+x.explain).join('\n');
  const layer=rep.layers.map(x=>x.available?(x.name+'：'+(x.top?('最明显差异“'+x.top.label+'” '+(x.top.diff>=0?'+':'')+Math.round(x.top.diff*100)+'%'):'暂未发现明显内容差异')):(x.name+'：当前无法分析该维度')).join('\n');
  const reuse=rep.opportunity.reuse.length?rep.opportunity.reuse.map(x=>x.label).join('、'):'暂无';
  const test=rep.opportunity.test.length?rep.opportunity.test.map(x=>x.label).join('、'):'暂无';
  const noRef=rep.opportunity.noRef.length?rep.opportunity.noRef.map(x=>x.label).join('、'):'暂无明确项目';
  const img=rep.images,imgs=img&&img.summary?['',rep.platform==='闲鱼'?'【主图 / 商品图规律】':'【图片 / 封面规律】',img.summary,...img.findings.map((x,i)=>(i+1)+'. '+x.label+'｜高表现 '+fmtPct(x.hp)+'｜普通 '+fmtPct(x.np)+'｜'+(x.diff>=0?'+':'')+Math.round(x.diff*100)+'%｜'+x.level)]:[];
  const ref=rep.reference?['','【最值得查看的1条高价值'+noun+'】',rep.reference.title,rep.reference.reasons.join('；'),rep.reference.url]:[];
  return ['【'+rep.platform+' · 本轮综合分析】',rep.summary,'','【样本】','抓取 '+rep.sample.raw+'｜进入分析 '+rep.sample.valid+'｜高价值 '+rep.sample.high+'｜普通 '+rep.sample.normal,'','【本轮发现】',f||'没有达到展示门槛的正向差异。','','【高表现主要赢在哪里】',layer||'当前平台可用表现字段不足，暂不做跨平台替代。','','【高价值'+noun+'画像】',rep.profile.length?rep.profile.join('、'):'暂无足够差异支持稳定画像',...imgs,'','【机会地图】','可以直接复用：'+reuse,'值得测试：'+test,'暂时不要参考：'+noRef,...ref,'','【下一轮建议】',rep.next.title,rep.next.doText,'不要：'+rep.next.dont,'目的：'+rep.next.purpose,'','【可信度限制】','核心数据覆盖 '+Math.round(rep.limits.coverage*100)+'%｜去偏保留 '+Math.round(rep.limits.stability*100)+'%｜异常案例 '+rep.limits.anomalies+'｜排序参考 '+Math.round(rep.limits.rankOnlyRate*100)+'%'+(rep.limits.stop?'｜采集结束：'+rep.limits.stop:'')].join('\n');
}
function renderReport(r){
  const rep=buildReport(r);if(!rep)return;saveReport(rep);window.__g82Report=rep;
  $id('g82Summary').textContent=rep.summary;
  const noun=rep.platform==='小红书'?'笔记':rep.platform==='闲鱼'?'商品':'内容';
  if($id('g82PlatformTitle'))$id('g82PlatformTitle').textContent=rep.platform+' · 本轮综合分析';
  if($id('g84ImageTitle'))$id('g84ImageTitle').textContent=rep.platform==='小红书'?'图片 / 封面规律':rep.platform==='闲鱼'?'主图 / 商品图规律':'图片规律';
  if($id('g84GeneratorHint'))$id('g84GeneratorHint').textContent=rep.platform==='小红书'?'按小红书内容互动规则生成':rep.platform==='闲鱼'?'按闲鱼搜索/交易规则生成':'按当前网站实际字段生成';
  $id('g82ReportMeta').innerHTML='<b>'+rep.sample.raw+'</b><span>抓取'+noun+'</span><b>'+rep.sample.high+'</b><span>高价值样本</span><b>'+rep.confidence[0]+'</b><span>综合可信度</span>';
  $id('g82Findings').innerHTML=rep.topFindings.length?rep.topFindings.map((x,i)=>'<div class="g82-finding"><span>'+(i+1)+'</span><div><b>'+esc(x.label)+'</b><small>高表现 '+fmtPct(x.hp)+' ｜ 普通 '+fmtPct(x.np)+' ｜ <strong>'+(x.diff>=0?'+':'')+Math.round(x.diff*100)+'%</strong> ｜ '+esc(x.level)+'</small><p>'+esc(x.explain)+'</p></div></div>').join(''):'<div class="g82-empty">本轮没有达到展示门槛的正向差异；这不是分析失败，而是高表现组和普通组写法目前比较接近。</div>';
  $id('g82Layers').innerHTML=rep.layers.map(x=>'<div><b>'+esc(x.name)+'</b><span>'+(x.available?('可用 '+x.count+'/'+rep.sample.valid+' · '+(x.top?('更常见：'+esc(x.top.label)+' '+(x.top.diff>=0?'+':'')+Math.round(x.top.diff*100)+'%'):'暂未发现明显内容差异')):esc(x.reason))+'</span></div>').join('');
  $id('g82Profile').innerHTML=rep.profile.length?rep.profile.map(x=>'<span>'+esc(x)+'</span>').join(''):'<span class="muted">暂无足够差异支持稳定画像</span>';
  window.__g825ImageAnalysis=rep.images;const imgBox=$id('g825ImageFindings');if(imgBox){imgBox.innerHTML='<p>'+esc(rep.images.summary)+'</p>'+(rep.images.findings.length?rep.images.findings.map(x=>'<div><b>'+esc(x.label)+'</b><span>高表现 '+fmtPct(x.hp)+' vs 普通 '+fmtPct(x.np)+'</span><strong>'+(x.diff>=0?'+':'')+Math.round(x.diff*100)+'%</strong><small>'+esc(x.level)+'</small></div>').join(''):'');}
  const map=rep.opportunity;$id('g82Map').innerHTML='<div><b>可以直接复用</b><p>'+(map.reuse.length?map.reuse.map(x=>esc(x.label)).join('、'):'暂无')+'</p></div><div><b>值得测试</b><p>'+(map.test.length?map.test.map(x=>esc(x.label)).join('、'):'暂无')+'</p></div><div><b>暂时不要参考</b><p>'+(map.noRef.length?map.noRef.map(x=>esc(x.label)).join('、'):'暂无明确项目')+'</p></div>';
  $id('g82NextTitle').textContent=rep.next.title;$id('g82NextDo').textContent=rep.next.doText;$id('g82NextDont').textContent=rep.next.dont;$id('g82NextPurpose').textContent=rep.next.purpose;
  $id('g82Limit').textContent='核心数据覆盖 '+Math.round(rep.limits.coverage*100)+'% · 去偏保留 '+Math.round(rep.limits.stability*100)+'% · 异常案例 '+rep.limits.anomalies+' · 排序参考 '+Math.round(rep.limits.rankOnlyRate*100)+'%'+(rep.limits.depth?(' · 详情补全 '+(rep.limits.depth.enriched||0)+'/'+(rep.limits.depth.target||120)):'')+(rep.limits.stop?' · '+rep.limits.stop:'');
  const ref=$id('g82BestRef');if(ref){if(rep.reference){ref.innerHTML='<div><span>本轮最值得查看的1条'+esc(noun)+'</span><b>'+esc(rep.reference.title)+'</b><small>'+esc(rep.reference.kind)+' · '+esc(rep.reference.reasons.join('；'))+'</small></div><a href="'+esc(rep.reference.url)+'" target="_blank" rel="noopener">查看原内容</a>';ref.style.display='grid'}else{ref.style.display='none'}}
  $id('g82CopyReport').onclick=async()=>{try{await navigator.clipboard.writeText(reportText(rep));setStatus('综合分析报告已复制。','oktxt')}catch{setStatus('复制失败，请手动复制。','warn')}};
}
function renderHigh(r){
  if(!r||!r.high){$id('g81High').innerHTML='';return}const arr=window.__g81ShowAll?r.high:r.high.slice(0,3);
  $id('g81High').innerHTML=arr.map((x,i)=>'<a class="g81-high" href="'+esc(x.url||'#')+'" target="_blank" rel="noopener"><span class="g81-no">'+(i+1)+'</span><div><b>'+esc(x.title||'未命名')+'</b><small>'+esc(x.__kind)+' · '+esc(itemReasons(x,r.model).join('；'))+'</small></div><span class="g81-open">打开</span></a>').join('')||'<div class="g81-muted">暂无足够高价值样本。</div>';$id('g81ShowHigh').style.display=r.high.length>3?'inline-flex':'none';
}
function signalPool(r){const a=r.reusable.concat(r.testable);if(!a.length&&r.exploratory)a.push(r.exploratory);if(!a.length&&r.themes&&r.themes[0]){const t=r.themes[0];a.push({id:'themeDirection',label:'主题方向：'+t.name,category:'探索性测试',level:'高价值主题集中',hp:t.hp,np:t.np,diff:t.diff,z:0,kind:'theme'})}return a}
function metrics(r){const s=r.strongest,signal=s?((s.diff>=0?'+':'')+Math.round(s.diff*100)+'%'):'—';return[[r.pool.length,'有效样本'],[r.high.length,'高价值样本'],[Math.round(r.coverage*100)+'%','核心数据覆盖'],[signal,'本轮最强信号'],[r.confidence[0],'综合可信度']]}

function renderAnalysis(r){
  ensureUI();window.__g81Analysis=r;
  if(r.unsupported){$id('g82Summary').textContent='当前平台尚未建立独立分析模型。';return}
  if(r.empty){$id('g82Summary').textContent='还没有本轮抓取数据。完成抓取后会自动生成综合报告。';return}
  const pool=signalPool(r),active=pool.length?pool[(window.__g81Seed||0)%pool.length]:null;window.__g81ActiveSignal=active;
  renderReport(r);
  const rawCount=$id('g823RawCount');if(rawCount)rawCount.textContent='共计 '+r.batch.length+' 条';
  $id('g81Evidence').innerHTML=r.findings.slice(0,12).map(f=>'<div class="g81-evidence-row"><div><b>'+esc(f.label)+'</b><span>'+esc(f.category)+' · '+esc(f.level)+(f.kind==='combo'?' · 组合模式':f.kind==='phrase'?' · 自动短语挖掘':'')+'</span></div><strong>'+(f.diff>=0?'+':'')+Math.round(f.diff*100)+'%</strong><small>高表现 '+f.hc+'/'+(f.highAvailable||r.high.length)+' = '+fmtPct(f.hp)+' ｜ 普通 '+f.nc+'/'+(f.normalAvailable||r.normal.length)+' = '+fmtPct(f.np)+' ｜ 可比较样本 '+f.total+'</small></div>').join('');
  $id('g81DetailFoot').textContent='本轮高价值主要类型：'+r.dominant+'。去偏保留 '+Math.round(r.stability*100)+'%；异常高表现 '+r.anomalies.length+' 条已单独剥离；排序参考占 '+Math.round(r.rankOnlyRate*100)+'%。';
  renderHigh(r);
}


function generatorWhy(r,s,p){
  const plan=strategyPlan(s,p,'A');
  return[['本轮测试变量',s.label],['策略怎么执行',plan.action+'；'+plan.angle],['为什么这样写',plan.why],['证据',s.level+'；高表现 '+fmtPct(s.hp)+' / 普通 '+fmtPct(s.np)+' / '+(s.diff>=0?'+':'')+Math.round(s.diff*100)+'%']];
}
function versionHtml(v,idx){
  const ok=v.check&&v.check.ok;
  return '<div class="g82-version g823-version-'+idx+'"><div class="g82-version-head"><div><span>'+esc(v.label)+'</span><b>'+esc(v.mode)+'</b></div><em class="'+(ok?'ok':'bad')+'">'+(ok?'✓ 可读性通过':'✕ 需重生成')+'</em></div><div class="g81-field g823-field-title"><span>标题</span><strong>'+esc(v.title)+'</strong></div><div class="g81-field g823-field-body"><span>正文</span><pre>'+esc(v.body)+'</pre></div><div class="g81-field-row"><div class="g81-field g823-field-tags"><span>话题 / 搜索词</span><p>'+esc(v.tags)+'</p></div><div class="g81-field g823-field-cover"><span>封面建议</span><p>'+esc(v.cover)+'</p></div></div><div class="g81-field g823-field-images"><span>图片内容建议</span><p>'+esc(v.images)+'</p>'+(v.imageBasis?'<small class="g825-image-basis">本轮图片依据：'+esc(v.imageBasis)+'</small>':'')+'</div><div class="g81-output-actions"><button class="g81-primary g82-copy-version" data-i="'+idx+'">复制'+esc(v.label)+'</button><button class="g81-secondary g82-record-version" data-i="'+idx+'">记录发布结果</button></div></div>';
}
function renderOutput(r,s,p,versions){
  const w=generatorWhy(r,s,p).map(([a,b],i)=>'<div class="g823-strategy-tone g823-tone-'+i+'"><span>'+esc(a)+'</span><b>'+esc(b)+'</b></div>').join('');
  $id('g81Output').classList.remove('g81-empty-output');
  $id('g81Output').innerHTML='<div class="g82-strategy"><div class="g81-mini-title">后台策略（不会写进正文）</div>'+w+'<div class="g82-check">✓ 两个方案都必须执行同一个主变量，但用不同表达方式。</div></div><div class="g82-versions">'+versions.map(versionHtml).join('')+'</div><div id="g81Feedback" class="g81-feedback"></div>';
  window.__g82Versions=versions;
  document.querySelectorAll('.g82-copy-version').forEach(btn=>btn.onclick=async()=>{const v=versions[+btn.dataset.i],text='【标题】\\n'+v.title+'\\n\\n【正文】\\n'+v.body+'\\n\\n【话题】\\n'+v.tags+'\\n\\n【封面建议】\\n'+v.cover+'\\n\\n【图片建议】\\n'+v.images;try{await navigator.clipboard.writeText(text);setStatus(v.label+'已复制。','oktxt')}catch{setStatus('复制失败，请手动复制。','warn')}});
  document.querySelectorAll('.g82-record-version').forEach(btn=>btn.onclick=()=>{window.__g82RecordIndex=+btn.dataset.i;renderFeedback()});
}
function saveDraft(r,s,p,versions){
  let a=[];try{a=JSON.parse(localStorage.getItem(EXPKEY)||'[]')}catch{}
  versions.forEach((o,i)=>a.push({id:'exp_'+Date.now()+'_'+i,platform:r.platform,product:p.raw,strategy:s.label,signalId:s.id,category:s.category,evidence:s.level,variant:o.label,title:o.title,body:o.body,cover:o.cover,images:o.images,createdAt:nowISO(),status:'draft'}));
  localStorage.setItem(EXPKEY,JSON.stringify(a.slice(-120)));
}
function generateCurrent(){
  const r=window.__g81Analysis||analyze(),s=window.__g81ActiveSignal||r.strongest||r.exploratory||signalPool(r)[0],raw=$id('g81Product')?.value.trim();
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

function renderFeedback(){
  const box=$id('g81Feedback'),p=currentPlatform();
  let fields=p==='小红书'?[['views','浏览'],['likes','点赞'],['favs','收藏'],['comments','评论'],['shares','转发'],['days','发布天数']]:
    p==='闲鱼'?[['exposure','曝光'],['views','浏览'],['wants','想要'],['consults','咨询'],['sales','成交'],['days','发布天数']]:
    [['views','浏览/访问'],['likes','点赞/认可'],['comments','评论/互动'],['wants','意向'],['sales','成交/转化'],['days','发布天数']];
  box.innerHTML='<div class="g81-feedback-title">'+esc(p)+' · 发布后记录结果</div><div class="g81-feedback-grid">'+fields.map(([k,l])=>'<label>'+esc(l)+'<input data-k="'+k+'" inputmode="decimal"></label>').join('')+'</div><button id="g81SaveFeedback" class="g81-primary">保存结果</button>';
  box.classList.add('show');$id('g81SaveFeedback').onclick=saveFeedback
}
function saveFeedback(){
  let a=[];try{a=JSON.parse(localStorage.getItem(EXPKEY)||'[]')}catch{}
  const platform=currentPlatform(),wanted=window.__g82Versions&&window.__g82Versions[window.__g82RecordIndex||0]?.label;
  const d=[...a].reverse().find(x=>x.platform===platform&&x.status==='draft'&&(!wanted||x.variant===wanted));if(!d)return setStatus('没有找到待验证的生成记录。','warn');
  const m={};$id('g81Feedback').querySelectorAll('input').forEach(i=>{const v=num(i.value);if(v!==null)m[i.dataset.k]=v});
  const days=m.days||1;let performance=0;
  if(platform==='小红书'){const total=(m.likes||0)+(m.favs||0)+(m.comments||0)+(m.shares||0);performance=m.views?total/m.views:total/Math.max(.25,days)}
  else if(platform==='闲鱼'){const intent=(m.wants||0)+(m.consults||0)*3+(m.sales||0)*8;performance=m.views?intent/Math.max(1,m.views):intent/Math.max(.25,days)}
  else{const total=Object.entries(m).filter(([k])=>k!=='days').reduce((z,[,v])=>z+(v||0),0);performance=total/Math.max(.25,days)}
  d.metrics=m;d.performance=performance;d.status='measured';d.measuredAt=nowISO();
  localStorage.setItem(EXPKEY,JSON.stringify(a.slice(-120)));$id('g81Feedback').innerHTML='<div class="g81-saved">✓ 已保存，本轮结果会进入后续同平台验证。</div>';setStatus('发布结果已记录。','oktxt')
}
function runAll(){ensureUI();const r=analyze();window.__g81Analysis=r;renderAnalysis(r);const p=r&&r.platform?r.platform:currentPlatform();const top=document.querySelector('.top h1');if(top)top.textContent='多平台内容增长决策系统';const sub=document.querySelector('.top .sub');if(sub)sub.textContent='自动识别：'+p+' → 抓取 → 平台专属分析 → 测试策略 → 发布验证';const badge=document.querySelector('.badge');if(badge)badge.textContent='V8.4.0';document.title='多平台内容增长决策系统 V8.4.0';const foot=document.querySelector('.foot');if(foot)foot.textContent='V8.4.0：平台自动识别；小红书、闲鱼使用独立指标与策略；其他网站按实际可见字段建立自己的规则。'}
const oldRender=window.render;if(typeof oldRender==='function'){window.render=function(){const v=oldRender.apply(this,arguments);setTimeout(runAll,40);return v}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(runAll,90));else setTimeout(runAll,90);
})();