'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'floor-assistant-v285/index.html'),'utf8');
const version=JSON.parse(fs.readFileSync(path.join(root,'floor-assistant-v285/version.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'floor-assistant-v285/manifest.webmanifest'),'utf8'));
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!/\bsrc\s*=/.test(m[1]));
for(let i=0;i<scripts.length;i++)new vm.Script(scripts[i][2],{filename:'inline-'+i+'.js'});
assert.equal(scripts.length,18,'unexpected inline script count');
assert.equal(html.match(/const APP_VERSION='(\d+)'/)[1],version.version);
assert.equal(version.cloudSync,'isolated','staging cloud must remain isolated');
assert.match(html,/const SUPABASE_URL='';/);
assert.match(html,/const SUPABASE_KEY='';/);
assert.match(html,/const FLOOR_SYNC_WRITE_RELEASED_V363=false/);
assert.ok(manifest.icons.length>=1);
assert.match(html,/cloudBaselineV364/);
assert.match(html,/cloudSelectEntitiesV364/);
assert.doesNotMatch(html,/async async function/);

const helpers=html.slice(html.indexOf('function normalizeDeletedMap(v)'),html.indexOf('function saveDataSafetySnapshot('));
assert.ok(helpers.length>5000);
const store=new Map();
const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
const pre=`const DATA_SAFETY_SNAPSHOT_KEY="snap",DATA_SAFETY_BEST_KEY="best",CLOUD_DELETED_KEY="deleted",CLOUD_ID="main",SUPABASE_URL="isolated";
const localStorage=ls;function hasCloudPending(){return false}function isHistoricalSeedOnly(){return false}
function isDefaultQuoteSeedOnly(a){return a.length===0}function historicalSeedsV33(){return [{"id":2025122301},{"id":2026011201},{"id":2026012601},{"id":2026012701},{"id":2026020401},{"id":2026030601},{"id":2026041701},{"id":2026052601},{"id":2026052701},{"id":2026061201},{"id":2026072801},{"id":2026082701},{"id":2026091101}]}function isPristineHistoricalSeedV346(x){return x?.historicalSource==='销售财务助手'&&x?.testPristine===true}function normText(x){return String(x)}
function normSpec(x){return String(x)};`;
const api=new Function('ls',pre+helpers+'return {cloudSafePlanV362,cloudConflictReasonV362,saveCloudBaselineV364};')(storage);
let checks=0;
const test=(title,fn)=>{store.clear();assert.ok(fn(),title);checks++;process.stdout.write('PASS '+title+'\n')};
const order=(id,extra={})=>({id,finalAmount:5000,paid:2500,cost:2000,profit:3000,
 updatedAt:'2026-01-01T00:00:00Z',paymentHistory:[{amount:2500,date:'2026-01-01T00:00:00Z'}],
 costSnapshot:{totalCost:2000,lockedAt:'2026-01-01T00:00:00Z'},...extra});
const st=(orders=[],products=[],deleted={})=>({orders,products,deleted});
const a=order('a');
test('bootstrap empty device',()=>api.cloudSafePlanV362(st(),st([a])).state.orders.length===1);
test('first contact conflicting payments blocks',()=>api.cloudSafePlanV362(st([a]),st([order('a',{paid:2600})])).conflicts.length===1);
test('unchanged same ID preserved',()=>{let p=api.cloudSafePlanV362(st([a]),st([a]));return !p.conflicts.length&&p.state.orders[0].profit===3000});
test('confirmed cloud-only payment update',()=>{api.saveCloudBaselineV364(st([a]),'t');let p=api.cloudSafePlanV362(st([a]),st([order('a',{paid:2600})]));return !p.conflicts.length&&p.state.orders[0].paid===2600});
test('confirmed local-only cost update',()=>{api.saveCloudBaselineV364(st([a]),'t');let p=api.cloudSafePlanV362(st([order('a',{cost:2400})]),st([a]));return !p.conflicts.length&&p.state.orders[0].cost===2400});
test('concurrent edit rejected',()=>{api.saveCloudBaselineV364(st([a]),'t');return api.cloudSafePlanV362(st([order('a',{paid:2600})]),st([order('a',{cost:2400})])).conflicts.length===1});
test('matching concurrent edits permitted',()=>{api.saveCloudBaselineV364(st([a]),'t');return api.cloudSafePlanV362(st([order('a',{paid:2600})]),st([order('a',{paid:2600})])).conflicts.length===0});
test('disjoint orders merged',()=>{api.saveCloudBaselineV364(st([a]),'t');return api.cloudSafePlanV362(st([a,order('b')]),st([a,order('c')])).state.orders.length===3});
test('delete with tombstone honored',()=>{api.saveCloudBaselineV364(st([a]),'t');return api.cloudSafePlanV362(st([a]),st([] ,[],{orders:{a:1800000000000}})).state.orders.length===0});
test('edit vs deletion conflict',()=>{api.saveCloudBaselineV364(st([a]),'t');return api.cloudSafePlanV362(st([order('a',{paid:2900})]),st([],[],{orders:{a:1800000000000}})).conflicts.length===1});
test('historical snapshot not auto inserted',()=>{storage.setItem('snap',JSON.stringify({orders:[order('legacy')]}));let p=api.cloudSafePlanV362(st([a]),st([a]));return p.recoveredOrders===1&&p.state.orders.length===1});
test('product local vs cloud based on baseline',()=>{api.saveCloudBaselineV364(st([a],[{id:'p',price:100}]),'t');let p=api.cloudSafePlanV362(st([a],[{id:'p',price:100}]),st([a],[{id:'p',price:120}]));return !p.conflicts.length&&p.state.products[0].price===120});
test('pristine legacy seed replaced with authoritative cloud order',()=>{const seed={...a,historicalSource:'销售财务助手',testPristine:true,paid:0};const p=api.cloudSafePlanV362(st([seed]),st([a]));return !p.conflicts.length&&p.state.orders[0].paid===2500});
test('modified legacy seed remains blocked',()=>{const seed={...a,historicalSource:'销售财务助手',testPristine:false,paid:0};const p=api.cloudSafePlanV362(st([seed]),st([a]));return p.conflicts.length===1});
test('all 13 untouched old local seeds safely bootstrap 24 remote orders',()=>{
 const ids=[2025122301,2026011201,2026012601,2026012701,2026020401,2026030601,2026041701,2026052601,2026052701,2026061201,2026072801,2026082701,2026091101];
 const old=ids.map(id=>({...a,id,historicalSource:'销售财务助手',testPristine:true,paid:100}));
 const real=ids.map(id=>({...a,id,paid:2500})).concat(Array.from({length:11},(_,i)=>({...a,id:'new-'+i})));
 const p=api.cloudSafePlanV362(st(old),st(real));return p.bootstrap&&p.state.orders.length===24&&!p.conflicts.length
});
test('one edited seed prevents unconditional 13-to-24 bootstrap',()=>{
 const ids=[2025122301,2026011201,2026012601,2026012701,2026020401,2026030601,2026041701,2026052601,2026052701,2026061201,2026072801,2026082701,2026091101];
 const old=ids.map(id=>({...a,id,historicalSource:'销售财务助手',testPristine:true,paid:100}));
 old[0].testPristine=false;
 const real=ids.map(id=>({...a,id,paid:2500})).concat(Array.from({length:11},(_,i)=>({...a,id:'new-'+i})));
 const p=api.cloudSafePlanV362(st(old),st(real));return !p.bootstrap&&p.conflicts.length>0
});

// V368 regression: verify the *actual* historical-seed detector, not the simplified merge-test stub.
const sliceBetween=(left,right)=>{
 const start=html.indexOf(left),end=html.indexOf(right,start+left.length);
 assert.ok(start>=0&&end>start,'missing source boundary '+left);
 return html.slice(start,end);
};
const seedSource=sliceBetween('function historicalSeedsV33()','function migrateHistoricalOrdersV33()');
const signatureSource=sliceBetween('function stableSignatureValue(v)','function signatureEntityArray(');
const pristineSource=sliceBetween('function isPristineHistoricalSeedV346(','function previewMigrationImportV344(');
const historyOnlySource=sliceBetween('function isPristineHistoryOnlyV366(','function cloudSafePlanV362(');
const historyApi=new Function(
 'const costTotal=b=>Object.values(b).reduce((n,x)=>n+(Number(x)||0),0);'+
 'const isProfitKnown=o=>o.profitKnown===true||o.costStatus==="complete";'+
 'const lockCompletedCostSnapshot=o=>{o.costSnapshot={lockedAt:new Date().toISOString(),totalCost:o.cost}};'+
 'const normalizeDeletedMap=v=>{const a={orders:{},costs:{},products:{},quotes:{}};for(const k of Object.keys(a))a[k]=v?.[k]||{};return a};'+
 'const normalizeBusinessStateLike=v=>({orders:v?.orders||[],costs:v?.costs||[],products:v?.products||[],quotes:v?.quotes||[],deleted:normalizeDeletedMap(v?.deleted)});'+
 'const isDefaultQuoteSeedOnly=v=>!v.length;'+seedSource+signatureSource+pristineSource+historyOnlySource+
 'return {historicalSeedsV33,isPristineHistoricalSeedV346,isPristineHistoryOnlyV366,costTotal,isProfitKnown}'
)();
const pristine13=historyApi.historicalSeedsV33().map(o=>{
 const x={...o,cust:'未命名客户',opener:'',price:0,project:'',status:'已完成',completedAt:o.date,
 balance:0,paymentMode:'normal',paymentPlan:null,historicalSource:'销售财务助手'};
 x.cost=historyApi.costTotal(x.costBreakdown);x.profit=x.sales-x.cost;
 x.margin=historyApi.isProfitKnown(x)&&x.sales?x.profit/x.sales*100:0;
 return x;
});
const official24={orders:[...pristine13.map(x=>({...x,historicalSource:'official',cust:'客户',paid:x.paid+1})),...Array.from({length:11},(_,i)=>({id:2000000000+i}))]};
const pristineLocal={orders:pristine13};
test('real 13 legacy records recognized',()=>pristine13.every(x=>historyApi.isPristineHistoricalSeedV346(x)));
test('real legacy 13-to-24 strictly passes',()=>historyApi.isPristineHistoryOnlyV366(pristineLocal,official24));
test('real legacy 13-to-25 preserves additional cloud order',()=>historyApi.isPristineHistoryOnlyV366(pristineLocal,{orders:[...official24.orders,{id:'new-test-25'}]}));
test('edited payment stops replace',()=>{
 const changed=structuredClone(pristineLocal);changed.orders[0].paid+=10;
 return !historyApi.isPristineHistoryOnlyV366(changed,official24)
});
test('edited profit or cost stops replace',()=>{
 const changed=structuredClone(pristineLocal);changed.orders[4].cost+=100;
 return !historyApi.isPristineHistoryOnlyV366(changed,official24)
});
test('extra local products stop replace',()=>!historyApi.isPristineHistoryOnlyV366({...pristineLocal,products:[{id:1}]},official24));
test('local deletion markers stop replace',()=>!historyApi.isPristineHistoryOnlyV366({...pristineLocal,deleted:{orders:{'extra':Date.now()}}},official24));
test('nonlegacy order IDs stop replace',()=>{
 const changed=structuredClone(pristineLocal);changed.orders[0].id=123456;
 return !historyApi.isPristineHistoryOnlyV366(changed,official24)
});
assert.match(html,/if\(!isPristineHistoryOnlyV366\(local,remote\)&&!isVerifiedV371MacBackupOnlyV372\(local,remote\)\)\{/,'manual recovery must reject unknown edited cache');
assert.match(html,/throw new Error\('本机13笔中仅 '/,'manual recovery must explain nonpristine records');
const verifyCloudSource=sliceBetween('function verifyOwnerCloud24V367(remote){','async function safeRestoreFromCloudV367()');
const verifyCloud=new Function('normalizeBusinessStateLike',verifyCloudSource+'return verifyOwnerCloud24V367;')(x=>x);
const sampleCloud={orders:Array.from({length:25},(_,i)=>({
 id:'cloud-'+i,
 ...(i<17?{costSnapshot:{cost:100,profit:200}}:{}),
 ...(i<13?{paymentHistory:[{amount:10}]}:{})
})),products:Array.from({length:4},(_,i)=>({id:i})),quotes:Array.from({length:34},(_,i)=>({id:i}))};
test('V371 cloud 25 recovery validation accepts intact 24 baseline plus new order',()=>verifyCloud(sampleCloud).orders.length===25);
test('V371 cloud 24 baseline still accepted',()=>verifyCloud({...sampleCloud,orders:sampleCloud.orders.slice(0,24)}).orders.length===24);
test('V371 cloud 23 missing order rejected',()=>{assert.throws(()=>verifyCloud({...sampleCloud,orders:sampleCloud.orders.slice(0,23)}));return true});
test('V371 duplicate cloud order ID rejected',()=>{const orders=structuredClone(sampleCloud.orders);orders[24].id=orders[0].id;assert.throws(()=>verifyCloud({...sampleCloud,orders}));return true});
test('V371 missing historical snapshot rejected',()=>{const orders=structuredClone(sampleCloud.orders);delete orders[0].costSnapshot;assert.throws(()=>verifyCloud({...sampleCloud,orders}));return true});
test('V371 missing payment event rejected',()=>{const orders=structuredClone(sampleCloud.orders);delete orders[0].paymentHistory;assert.throws(()=>verifyCloud({...sampleCloud,orders}));return true});
test('V371 missing product baseline rejected',()=>{assert.throws(()=>verifyCloud({...sampleCloud,products:sampleCloud.products.slice(0,3)}));return true});
assert.match(html,/countMismatch&&!cloudReadOnly&&!cloudConflict&&cloudStatusOkay!==false/,'conflict status must not be masked');
assert.match(html,/fetch\(url,\{method:method,cache:'no-store'/,'cloud reads must bypass stale cache');
assert.equal(version.version,'376','staging version must be 376');
assert.match(html,/id="v376-ipad-edge-fit"/,'V376 edge CSS missing');
assert.match(html,/id="v375-ipad-compact-nested-spacing"/,'V375 tablet spacing CSS missing');
assert.match(html,/id="v374-ipad-both-orientations-content-width"/,'V374 iPad CSS missing');
assert.match(html,/Number\(cloudRemoteOrderCount\)>=24&&all\.length===13/,'recovery entry must support 25+ cloud orders');
assert.match(html,/cloudRemoteOrderCount=remote\.orders\.length/,'post-recovery count must reflect current cloud');
assert.match(html,/从云端安全恢复当前云端订单（自动备份本机）/,'recovery button must be dynamic');
assert.match(html,/<details id="dataSyncAdvancedV370" class="data-sync-advanced">/);
assert.match(html,/authCardV370\.style\.display=needsCloudLogin\?'block':'none'/);
assert.match(html,/<button id="restoreFromCloudV367"/);
assert.match(html,/id="restore24PanelV351"/);
assert.match(html,/id="auditHistoryV353"/);
assert.match(html,/id="migrationImportBtnV344"/);
assert.match(html,/确认导入到本机（不覆盖原记录）<\/button><\/div><\/div><\/details><\/details><button id="orderManagerToggle"/);

console.log('OK: '+checks+' behavior tests, '+scripts.length+' JS syntax blocks, staging safety checks');

const authSource=sliceBetween('async function floorAuthToken(grantType,credentials){','function checkAuthMigrationReadinessV349(){');
const authStorage=new Map();
const authLocalStorage={
 getItem:k=>authStorage.get(k)??null,
 setItem:(k,v)=>authStorage.set(k,String(v)),
 removeItem:k=>authStorage.delete(k)
};
let fakeAuthFetch=async()=>{throw new Error('offline')};
const authApi=new Function('ls','mockFetch',String.raw`
 const localStorage=ls;
 const FLOOR_AUTH_URL='https://example.invalid',FLOOR_AUTH_PUBLIC_KEY='public-key',FLOOR_AUTH_MODE='password';
 const FLOOR_AUTH_STORAGE_V363='floor_authenticated_session_v363';
 let floorAuthSessionV350=null;
 const fetch=(...args)=>mockFetch(...args);
 function floorAuthMessageV350(){}
 function floorAuthConfigured(){return true}
 `+authSource.replace("const FLOOR_AUTH_STORAGE_V363='floor_authenticated_session_v363';",'')+
 'return {restore:floorAuthRestoreV363,ensure:ensureFloorCloudAuthV363,getSession:()=>floorAuthSessionV350,setSession:v=>floorAuthSessionV350=v};'
)(authLocalStorage,(...args)=>fakeAuthFetch(...args));
const validSaved={access_token:'expired',refresh_token:'valid-refresh',expires_at:1,user_id:'owner'};
const key='floor_authenticated_session_v363';
(async()=>{
 authStorage.set(key,JSON.stringify(validSaved));
 await authApi.restore();
 assert.equal(authApi.getSession().refresh_token,'valid-refresh','offline must retain in-memory login');
 assert.ok(authStorage.has(key),'offline must retain saved login');
 let offlineError=false;try{await authApi.ensure()}catch(_){offlineError=true}
 assert.ok(offlineError&&authStorage.has(key),'offline retry must not erase login');
 fakeAuthFetch=async()=>({ok:true,status:200,json:async()=>({access_token:'fresh-access',refresh_token:'new-refresh',expires_in:3600,user:{id:'owner'}})});
 assert.equal(await authApi.ensure(),'fresh-access','network recovery should refresh without password');
 assert.equal(JSON.parse(authStorage.get(key)).refresh_token,'new-refresh','new session must persist');
 authStorage.set(key,JSON.stringify(validSaved));authApi.setSession(null);
 fakeAuthFetch=async()=>({ok:false,status:400,json:async()=>({error:'invalid_grant'})});
 await authApi.restore();
 assert.equal(authApi.getSession(),null,'invalid refresh token must invalidate login');
 assert.ok(!authStorage.has(key),'invalid token must clear saved login');
 process.stdout.write('PASS remembered login offline, reconnect, revoked token\n');
})().catch(e=>{console.error(e);process.exitCode=1});


/* V372: fingerprinted Mac backup can bootstrap, but any local edits must block. */
const v372Source=sliceBetween('/* V372: exactly fingerprint','function isPristineHistoryOnlyV366(');
const v372VerifySource=sliceBetween('function verifyOwnerCloud24V367(remote){','async function safeRestoreFromCloudV367()');
const v372TestSource=v372Source.replace(
 "return hash.toString(16).padStart(16,'0');",
 "return V371_VERIFIED_MAC_ORDER_HASHES_V372[String(record.id)]||'not-known';"
);
const v372Api=new Function(
 'const normalizeBusinessStateLike=v=>({orders:v?.orders||[],costs:v?.costs||[],products:v?.products||[],quotes:v?.quotes||[],deleted:{orders:{},costs:{},products:{},quotes:{},...(v?.deleted||{})}});'+
 'const isDefaultQuoteSeedOnly=v=>!v.length;'+
 'const stableSignatureValue=v=>v;'+
 v372VerifySource+v372TestSource+
 'return {check:isVerifiedV371MacBackupOnlyV372,hash:v371RecordFingerprintV372,hashes:V371_VERIFIED_MAC_ORDER_HASHES_V372};'
)();
const v372Local=pristine13.map(x=>({...x,costSnapshot:{sales:x.sales,cost:x.cost,costStatus:x.costStatus,profitKnown:x.profitKnown},entrySource:'manual'}));
const v372Remote=structuredClone(v372Local).map(x=>({...x,sales:x.sales+1,paymentHistory:[{amount:1}]}));
const v372Cloud={orders:[...v372Remote,...Array.from({length:12},(_,i)=>({id:'new-'+i,costSnapshot:{cost:1},paymentHistory:[]}))],products:Array.from({length:4},(_,i)=>({id:i})),quotes:Array.from({length:34},(_,i)=>({id:i}))};
test('V372 known Mac backup all 13 accepted with cloud 25',()=>v372Api.check({orders:v372Local},v372Cloud));
test('V372 new local order rejected',()=>!v372Api.check({orders:[...v372Local,{id:123}]},v372Cloud));
test('V372 changed local payment rejected',()=>{let local=structuredClone(v372Local);local[0].paid+=1;return !v372Api.check({orders:local},v372Cloud)});
test('V372 changed cloud historical cost rejected',()=>{let cloud=structuredClone(v372Cloud);cloud.orders[0].cost+=1;return !v372Api.check({orders:v372Local},cloud)});
test('V372 changed cloud historical cost status rejected',()=>{let cloud=structuredClone(v372Cloud);cloud.orders[0].costStatus='complete';return !v372Api.check({orders:v372Local},cloud)});
test('V372 custom local product rejected',()=>!v372Api.check({orders:v372Local,products:[{id:'custom'}]},v372Cloud));
test('V372 custom local quote rejected',()=>!v372Api.check({orders:v372Local,quotes:[{id:'custom'}]},v372Cloud));
test('V372 cloud less than 24 orders rejected',()=>!v372Api.check({orders:v372Local},{...v372Cloud,orders:v372Cloud.orders.slice(0,23)}));
assert.doesNotMatch(html,/plan.reason==='verified-v371-mac-backup'/,'V373 restores only after explicit confirmation');
assert.match(html,/恢复后完整校验失败/,'V373 restore verifies complete state signature');
assert.match(html,/本机回退快照保存失败，恢复已停止/,'V373 backup failure stops restore');
assert.match(html,/if\(st==='missing'\)return '待补成本'/,'V373 leaves existing V371 profit calculations unchanged');
