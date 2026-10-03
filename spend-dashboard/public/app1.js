
const PRELOAD = [];
const DB_NAME='spend_dashboard_v1', STORE='tx';
const DEFAULT_BIZ=['闲鱼','木地板','地板配件','建新建材','木业','木材','工厂','辅料','林木','经营码交易'];
const CATS=['餐饮食品','住房','交通出行','购物','通讯缴费','健身运动','娱乐','旅行住宿','服饰','汽车养护','医疗保险','个人护理','公共服务','生活服务','家居家装','人情社交','教育','数码电器','其他'];
const rawMap={'餐饮美食':'餐饮食品','交通出行':'交通出行','充值缴费':'通讯缴费','日用百货':'购物','服饰装扮':'服饰','文化休闲':'娱乐','酒店旅游':'旅行住宿','美容美发':'个人护理','医疗健康':'医疗保险','运动户外':'健身运动','爱车养车':'汽车养护','保险':'医疗保险','教育培训':'教育','公共服务':'公共服务','生活服务':'生活服务','数码电器':'数码电器','家居家装':'家居家装','亲友代付':'人情社交','其他':'其他','商业服务':'生活服务'};
let db, allTx=[], viewTx=[], currentYear=null;
function normalizeKey(v){let s=String(v||'').toLowerCase().replace(/\s+/g,'');for(const ch of ['·','•','（','）','(',')','-','_','/','\\','.',',','，','。',':','：',';','；',"'",'"','“','”','‘','’','[',']','【','】'])s=s.split(ch).join('');return s}
let settings=loadSettings();
let syncTimer=null,syncBusy=false,syncPass=localStorage.getItem('spend_sync_pass_v1')||'',syncSpace='',syncLast='';
function normalizeSettingsState(s={}){const base=Number(s.updatedAt||0),manual={},manualDeleted={...(s.manualDeleted||{})};Object.entries(s.manual||{}).forEach(([id,v])=>manual[id]={...v,updatedAt:Number(v?.updatedAt||base)});const merchantRules=(s.merchantRules||[]).map(r=>({...r,updatedAt:Number(r.updatedAt||base)})),merchantRuleTombstones={...(s.merchantRuleTombstones||{})};const pinnedState={...(s.pinnedState||{})};if(!Object.keys(pinnedState).length)(s.pinnedMerchants||[]).forEach(name=>{pinnedState[normalizeKey(name)]={name,active:true,updatedAt:base}});const pinnedMerchants=Object.values(pinnedState).filter(x=>x&&x.active).sort((a,b)=>Number(a.updatedAt||0)-Number(b.updatedAt||0)).map(x=>x.name);return {bizWords:s.bizWords||DEFAULT_BIZ,bizWordsUpdatedAt:Number(s.bizWordsUpdatedAt||base),merchantRules,merchantRuleTombstones,manual,manualDeleted,distinctPairs:s.distinctPairs||['ali:2026082423001445301420199749|wx:4200003158202608242100731414'],pinnedState,pinnedMerchants,updatedAt:base}}
function loadSettings(){try{return normalizeSettingsState(JSON.parse(localStorage.getItem('spend_settings_v1')||'{}'))}catch(e){return normalizeSettingsState({})}}
function syncPinnedFromState(){settings.pinnedMerchants=Object.values(settings.pinnedState||{}).filter(x=>x&&x.active).sort((a,b)=>Number(a.updatedAt||0)-Number(b.updatedAt||0)).map(x=>x.name)}
function saveSettings(sync=true){settings.updatedAt=Date.now();syncPinnedFromState();localStorage.setItem('spend_settings_v1',JSON.stringify(settings));if(sync){if(syncPass)setSyncStatus('busy','待同步');queueCloudSync()}}
const money=n=>'¥'+Number(n||0).toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const norm=normalizeKey;
function pairKey(a,b){return [a.id,b.id].sort().join('|')}
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'})};r.onsuccess=()=>{db=r.result;res(db)};r.onerror=()=>rej(r.error)})}
function dbAll(){return new Promise((res,rej)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
function dbPutMany(items){return new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite'),s=t.objectStore(STORE);items.forEach(x=>s.put(x));t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
function dbClear(){return new Promise((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function merchantRule(tx){const m=norm(tx.merchant);return settings.merchantRules.find(r=>m===r.merchantNorm)}
function classifyCategory(tx){const text=(tx.merchant+' '+tx.desc+' '+tx.rawType+' '+tx.rawCategory).toLowerCase();
 const kw=[
  ['住房',/京寓管家|房租|租金|公寓|物业费/],['交通出行',/滴滴|t3|高德打车|铁路12306|火车票|深圳通|公交|地铁|停车|顺易通|臻城物业|出租车|网约车/],['汽车养护',/加油|石化|石油|中海油|充电桩|洗车|汽车|车险/],
  ['餐饮食品',/coffee|咖啡|餐饮|饭|餐厅|川菜|湘|烧烤|肯德基|麦当劳|零食|便利店|超市|农耕记|美团外卖|饿了么|石锅鱼|鸡煲|砂锅|茶饮|奶茶|luckin|瑞幸|恒生活|山姆/],
  ['健身运动',/gym|健身|迪卡侬|运动馆|游泳|羽毛球|篮球|keep/],['娱乐',/电竞|网吧|酒吧|ktv|电影|影院|uu加速器|游戏|腾讯视频|爱奇艺|网易云/],['旅行住宿',/酒店|民宿|旅游|景区|旅行|携程|去哪儿|飞猪/],
  ['通讯缴费',/联通|电信|移动|话费|流量|宽带|小米移动/],['购物',/拼多多|淘宝|天猫|京东|抖音电商|得物|唯品会|商店|百货/],['服饰',/uniqlo|优衣库|服饰|服装|鞋|帽/],['个人护理',/理发|美容|美发|洗发|护肤|屈臣氏/],['医疗保险',/医院|药房|药店|保险|医保|体检/],['人情社交',/红包|群收款|礼物|礼金/],['教育',/培训|课程|教育|学校|学费/],['数码电器',/apple|苹果|小米|华为|数码|电器|耳机|手机|电脑/],['公共服务',/财政|政务|税务|公安|交警/],['生活服务',/顺丰|快递|洗衣|维修|家政/]
 ];
 for(const [c,r] of kw) if(r.test(text)) return c;
 return rawMap[tx.rawCategory]||'其他';
}
function evaluate(tx){
 const man=settings.manual[tx.id]; if(man) return {status:man.status,category:man.category||classifyCategory(tx),manual:true};
 const mr=merchantRule(tx); if(mr) return {status:mr.status,category:mr.category,manual:false};
 const direction=tx.direction||''; const st=(tx.status||'').toLowerCase();
 if(direction!=='支出') return {status:st.includes('退款')||tx.rawType.includes('退款')?'refund':'nonexpense',category:'其他'};
 if(/退款|关闭|失败|撤销|取消/.test(st)) return {status:'refund',category:'其他'};
 const text=norm(tx.merchant+' '+tx.desc+' '+tx.rawType+' '+tx.rawCategory);
 if(settings.bizWords.some(w=>w&&text.includes(norm(w)))) return {status:'business',category:classifyCategory(tx)};
 if(tx.platform==='微信' && String(tx.rawType).includes('转账')){
   if(norm(tx.merchant).includes(norm('京寓管家'))) return {status:'personal',category:'住房'};
   return {status:'transfer',category:'其他'};
 }
 let cat=classifyCategory(tx);
 if((tx.amount>=3000 && cat==='其他') || (tx.amount>=5000 && /二维码|经营码/.test(tx.desc+' '+tx.rawType))) return {status:'pending',category:cat};
 return {status:'personal',category:cat};
}
function withEval(tx){const e=evaluate(tx);return {...tx,_status:e.status,_category:e.category}}
function sameYear(tx,y){return String(tx.time).startsWith(String(y)+'-')}
function maxDataDate(){return allTx.map(x=>x.time).filter(Boolean).sort().at(-1)||''}
function parseDate(s){const d=new Date(String(s).replace(' ','T')+'+08:00');return isNaN(d)?null:d}
function monthOf(tx){return String(tx.time).slice(0,7)}
function getYears(){return [...new Set(allTx.map(x=>String(x.time).slice(0,4)).filter(x=>x.length===4&&[...x].every(ch=>ch>='0'&&ch<='9')))].sort((a,b)=>Number(b)-Number(a))}
function refreshYears(){const ys=getYears(), sel=document.getElementById('yearSel'); const old=currentYear||sel.value; sel.innerHTML=ys.map(y=>`<option>${y}</option>`).join(''); currentYear=ys.includes(String(old))?String(old):(ys[0]||String(new Date().getFullYear())); sel.value=currentYear}
function summarize(){
 viewTx=allTx.filter(t=>sameYear(t,currentYear)).map(withEval);
 const p=viewTx.filter(t=>t._status==='personal'); const total=p.reduce((s,t)=>s+t.amount,0); const pending=viewTx.filter(t=>t._status==='pending').reduce((s,t)=>s+t.amount,0);
 const md=maxDataDate(), latestYear=md.slice(0,4), latestMonth=(currentYear===latestYear?Number(md.slice(5,7)):12); const completeCount=Math.max(1,(currentYear===latestYear?latestMonth-1:12));
 const completeTotal=p.filter(t=>Number(t.time.slice(5,7))<=completeCount).reduce((s,t)=>s+t.amount,0); const avg=completeTotal/completeCount;
 const monthMap={}; p.forEach(t=>{const m=Number(t.time.slice(5,7));monthMap[m]=(monthMap[m]||0)+t.amount});
 const latestAmt=monthMap[latestMonth]||0;
 document.getElementById('kTotal').textContent=money(total); document.getElementById('kPending').textContent=money(pending);
 document.getElementById('kAvg').textContent=money(avg);document.getElementById('kAvgSub').textContent=`1–${completeCount}月完整月均`;
 document.getElementById('kLatest').textContent=money(latestAmt); document.getElementById('kLatestSub').textContent=`${latestMonth}月${currentYear===latestYear?'（截至'+Number(md.slice(8,10))+'日）':''}`;
 document.getElementById('kPendingSub').textContent=`${viewTx.filter(t=>t._status==='pending').length}笔 · 不计入确认消费`;
 renderMonthBars(monthMap,total);renderTopCats(p,total);renderMerchants(p);renderHealth();renderMonthly(p);renderCategories(p,total);renderDetailFilters();renderDetails();renderReview();renderRules();
 const dates=allTx.map(x=>x.time).filter(Boolean).sort(); document.getElementById('rangeText').textContent=dates.length?`数据 ${dates[0].slice(0,10)} — ${dates.at(-1).slice(0,10)} · ${allTx.length.toLocaleString()}笔`:'暂无数据';
}
function renderMonthBars(m,total){const max=Math.max(...Object.values(m),1);let html='';for(let i=1;i<=12;i++){const v=m[i]||0,h=Math.max(2,Math.round(v/max*100));html+=`<div class="mCol"><div class="mBarWrap"><div class="mBar" style="height:${h}%" data-tip="${i}月 ${money(v)}"></div></div><div class="mName">${i}月</div></div>`}document.getElementById('monthBars').innerHTML=html;const arr=Object.entries(m).sort((a,b)=>b[1]-a[1]);document.getElementById('monthPeak').textContent=arr.length?`最高 ${arr[0][0]}月 ${money(arr[0][1])}`:''}
function groupByCat(p){const o={};p.forEach(t=>{const k=t._category;o[k]??={sum:0,count:0};o[k].sum+=t.amount;o[k].count++});return o}
function renderTopCats(p,total){const g=groupByCat(p),arr=Object.entries(g).sort((a,b)=>b[1].sum-a[1].sum).slice(0,8),max=arr[0]?.[1].sum||1;document.getElementById('topCats').innerHTML=arr.map(([k,v])=>`<div class="rowItem topCatRow" data-cat="${esc(k)}" style="cursor:pointer"><div class="rowName">${esc(k)}</div><div class="track"><div class="fill" style="width:${Math.max(2,v.sum/max*100)}%"></div></div><div class="rowVal">${money(v.sum)}</div></div>`).join('')||'<div class="empty">暂无数据</div>';document.querySelectorAll('.topCatRow').forEach(r=>r.onclick=()=>openCategory(r.dataset.cat))}
function renderMerchants(p){const g={};p.forEach(t=>{const k=t.merchant||'未知商户';g[k]??={sum:0,count:0};g[k].sum+=t.amount;g[k].count++});const pins=(settings.pinnedMerchants||[]).map(name=>{const hit=Object.entries(g).find(([k])=>norm(k)===norm(name));return [hit?hit[0]:name,hit?hit[1]:{sum:0,count:0}]});const pinNorm=new Set(pins.map(x=>norm(x[0])));const auto=Object.entries(g).sort((a,b)=>b[1].sum-a[1].sum).filter(([k])=>!pinNorm.has(norm(k))).slice(0,Math.max(0,10-pins.length));const arr=[...pins,...auto].slice(0,10);document.getElementById('topMerchants').innerHTML=arr.length?arr.map(([k,v],i)=>`<div class="metricLine merchantLine" data-merchant="${esc(k)}"><span class="rankBadge">${i+1}</span><div class="metricName">${esc(k)}</div><div class="metricCount">${v.count}笔</div><div class="metricAmount">${money(v.sum)}</div></div>`).join(''):'<div class="empty">暂无商户数据</div>';document.querySelectorAll('.merchantLine').forEach(x=>x.onclick=()=>openMerchantDetails(x.dataset.merchant))}
function openMerchantDetails(name){showTab('details');document.getElementById('searchInput').value=name;document.getElementById('catFilter').value='';document.getElementById('platformFilter').value='';document.getElementById('statusFilter').value='personal';renderDetails()}
function openCategory(cat){showTab('details');document.getElementById('searchInput').value='';document.getElementById('catFilter').value=cat;document.getElementById('platformFilter').value='';document.getElementById('statusFilter').value='personal';renderDetails()}
function renderMerchantSuggestions(){const q=norm(document.getElementById('merchantInput').value),g={};viewTx.filter(t=>t._status==='personal').forEach(t=>{const k=t.merchant||'未知商户';g[k]??={sum:0,count:0};g[k].sum+=t.amount;g[k].count++});let arr=Object.entries(g).filter(([k])=>!q||norm(k).includes(q)).sort((a,b)=>b[1].sum-a[1].sum).slice(0,30);document.getElementById('merchantSuggest').innerHTML=arr.map(([k,v])=>`<div class="metricLine merchantPick" data-name="${esc(k)}"><div class="metricName">${esc(k)}</div><div class="metricCount">${v.count}笔</div><div class="metricAmount">${money(v.sum)}</div></div>`).join('')||'<div class="empty">没有匹配商户</div>';document.querySelectorAll('.merchantPick').forEach(x=>x.onclick=()=>{document.getElementById('merchantInput').value=x.dataset.name;renderMerchantSuggestions()})}
function renderMerchantManaged(){const el=document.getElementById('merchantManaged');if(!el)return;syncPinnedFromState();const pins=settings.pinnedMerchants||[];el.innerHTML=pins.length?pins.map((name,i)=>`<span class="merchantManageItem">${esc(name)}<button data-i="${i}" title="移除">×</button></span>`).join(''):'<span class="cardHint">暂无手动补充商户</span>';el.querySelectorAll('button').forEach(b=>b.onclick=()=>{const name=pins[Number(b.dataset.i)];if(name){settings.pinnedState=settings.pinnedState||{};settings.pinnedState[keyNorm(name)]={name,active:false,updatedAt:Date.now()};saveSettings();renderMerchantManaged();renderMerchants(viewTx.filter(t=>t._status==='personal'))}})}
function addPinnedMerchant(){const typed=document.getElementById('merchantInput').value.trim();if(!typed)return;const g={};viewTx.filter(t=>t._status==='personal').forEach(t=>{const k=t.merchant||'未知商户';g[k]??={sum:0,count:0};g[k].sum+=t.amount;g[k].count++});const exact=Object.keys(g).find(k=>norm(k)===norm(typed));const partial=Object.entries(g).filter(([k])=>norm(k).includes(norm(typed))).sort((a,b)=>b[1].sum-a[1].sum)[0]?.[0];const name=exact||partial||typed;settings.pinnedState=settings.pinnedState||{};settings.pinnedState[keyNorm(name)]={name,active:true,updatedAt:Date.now()};saveSettings();document.getElementById('merchantInput').value='';renderMerchantManaged();renderMerchantSuggestions();renderMerchants(viewTx.filter(t=>t._status==='personal'))}
function findDupes(){const out=[];const ex=viewTx.filter(t=>t.direction==='支出' && !/退款|关闭|失败/.test(t.status||''));const byAmt={};ex.forEach(t=>{const c=Math.round(t.amount*100);(byAmt[c]??=[]).push(t)});Object.values(byAmt).forEach(list=>{list.sort((a,b)=>a.time.localeCompare(b.time));for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j];if(a.platform===b.platform)continue;const da=parseDate(a.time),db=parseDate(b.time);if(!da||!db)continue;const sec=Math.abs(da-db)/1000;if(sec>90)break;const sim=(norm(a.merchant)&&norm(a.merchant)===norm(b.merchant))||(norm(a.desc)&&norm(a.desc)===norm(b.desc));if(sim && !settings.distinctPairs.includes(pairKey(a,b)))out.push([a,b])}});return out}
function renderHealth(){const d=findDupes(),sameSkipped=Number(localStorage.getItem('spend_last_skipped')||0),pending=viewTx.filter(t=>t._status==='pending').length,biz=viewTx.filter(t=>t._status==='business').length,trans=viewTx.filter(t=>t._status==='transfer').length;document.getElementById('healthBox').innerHTML=`<strong>同平台重复：</strong>导入时按交易单号自动过滤${sameSkipped?`，最近一次跳过 ${sameSkipped} 笔`:''}。<br><strong>跨平台：</strong>${d.length?`发现 ${d.length} 组同额近时交易，已放到“待确认”页，只提示不删除。`:'当前没有未处理的高相似跨平台记录。'}<br><strong>本年排除：</strong>${biz}笔经营、${trans}笔普通转账；另有 ${pending} 笔待确认。`}
