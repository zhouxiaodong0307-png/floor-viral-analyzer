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
function isDefaultQuoteSeedOnly(a){return a.length===0}function normText(x){return String(x)}
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
console.log('OK: '+checks+' behavior tests, '+scripts.length+' JS syntax blocks, staging safety checks');
