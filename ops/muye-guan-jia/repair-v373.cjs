'use strict';
// Emergency V373: restore only the independently verified V371 Mac snapshot;
// keep production data, business calculations and all other app behavior unchanged.
const fs=require('node:fs'),cp=require('node:child_process'),vm=require('node:vm'),assert=require('node:assert/strict');
const repo='floor-assistant-v285/index.html';
const mode=process.argv[2];
assert.ok(['staging','production'].includes(mode),'mode: staging | production');
const gitShow=(sha,file)=>cp.execFileSync('git',['show',sha+':'+file],{encoding:'utf8',maxBuffer:12000000});
const current=gitShow('6f1f0b45cc8817a3f3fb0ad7e55adb4abd8cc4a9',repo);
const verified=gitShow('9a064b97533292f066ec26feb7afa64ec2fef295',repo);
assert.match(current,/const APP_VERSION='371'/);
const start=verified.indexOf('/* V372: exactly fingerprint');
const end=verified.indexOf('function isPristineHistoryOnlyV366(',start);
assert.ok(start>0&&end>start);
const guard=verified.slice(start,end);
assert.ok(guard.includes('V371_VERIFIED_MAC_ORDER_HASHES_V372')&&guard.includes('function isVerifiedV371MacBackupOnlyV372('));
function replaceOne(str,before,after){const first=str.indexOf(before);assert.ok(first>=0,'missing anchor: '+before);
assert.equal(str.indexOf(before,first+before.length),-1,'duplicate anchor: '+before);
return str.slice(0,first)+after+str.slice(first+before.length)}
let html=replaceOne(current,'function isPristineHistoryOnlyV366(',guard+'function isPristineHistoryOnlyV366(');
html=replaceOne(html,'if(!isPristineHistoryOnlyV366(local,remote)){',
 'if(!isPristineHistoryOnlyV366(local,remote)&&!isVerifiedV371MacBackupOnlyV372(local,remote)){');
html=replaceOne(html,'已确认全部为未经编辑的旧系统模板。',
 '已确认属于未经编辑的历史模板或逐笔核验的V371本机备份。');
html=replaceOne(html,'<title>木业管家 V371</title><meta name="app-version" content="V371"',
 '<title>木业管家 V373</title><meta name="app-version" content="V373"');
html=replaceOne(html,"const APP_VERSION='371';","const APP_VERSION='373';");
if(mode==='staging'){
 html=replaceOne(html,"const SUPABASE_URL='https://cygdpihurwznpeltcntd.supabase.co';","const SUPABASE_URL='';");
 html=replaceOne(html,"const SUPABASE_KEY=FLOOR_AUTH_PUBLIC_KEY;","const SUPABASE_KEY='';");
 html=replaceOne(html,"const FLOOR_SYNC_WRITE_RELEASED_V363=true;","const FLOOR_SYNC_WRITE_RELEASED_V363=false;");
}else{
 assert.ok(html.includes("const FLOOR_SYNC_WRITE_RELEASED_V363=true;"));
 assert.ok(!html.includes("const SUPABASE_URL='';"));
}
assert.ok(!html.includes("plan.reason==='verified-v371-mac-backup'"),'do not enable automatic replacement');
assert.ok(html.includes('本机回退快照保存失败，恢复已停止'),'local rollback snapshot must fail closed');
assert.ok(html.includes('恢复后完整校验失败'),'verify all records after restore');
const scripts=[...html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/gi)].filter(m=>!/\\bsrc\\s*=/.test(m[1]));
assert.equal(scripts.length,18,'all inline JS must remain');
scripts.forEach((m,i)=>new vm.Script(m[2],{filename:'inline-'+i+'.js'}));
assert.match(html,/const APP_VERSION='373'/);
fs.writeFileSync(repo,html);
const manifestFile='floor-assistant-v285/version.json',m=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
m.version='373';m.channel=mode==='staging'?'migration-test':'production';
m.cloudSync=mode==='staging'?'isolated':'authenticated_owner_only';
fs.writeFileSync(manifestFile,JSON.stringify(m,null,2)+'\n');
if(mode==='staging'){
 const file='ops/muye-guan-jia/validate-v364.cjs';
 let val=fs.readFileSync(file,'utf8');
 val=replaceOne(val,"assert.equal(version.version,'372','staging version must be 372');",
 "assert.equal(version.version,'373','staging version must be 373');");
 val=replaceOne(val,"assert.match(html,/plan.reason==='verified-v371-mac-backup'/,'V372 auto restore requires exact verified reason');",
 "assert.doesNotMatch(html,/plan.reason==='verified-v371-mac-backup'/,'V373 restores only after explicit user confirmation');");
 val=replaceOne(val,"assert.match(html,/恢复后数据签名校验失败/,'V372 restore must verify complete signature');",
 "assert.match(html,/恢复后完整校验失败/,'V373 manual restore verifies full signature');");
 val=replaceOne(val,"assert.match(html,/本机回退快照保存失败，已阻止自动恢复/,'V372 restore must fail closed on backup failure');",
 "assert.match(html,/本机回退快照保存失败，恢复已停止/,'V373 backup failure stops restore');");
 val=replaceOne(val,"assert.match(html,/if\\(st!=='complete'\\)return '待补成本'/,'V372 incomplete cost cannot display fabricated accurate profit');",
 "assert.match(html,/if\\(st==='missing'\\)return '待补成本'/,'V373 leaves V371 profit calculation unchanged');");
 new vm.Script(val);
 fs.writeFileSync(file,val);
}
console.log('VALIDATED',mode,'V373',scripts.length,'inline JS parsed','minimal manual Mac restore only');
