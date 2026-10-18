'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='https://muye-guan-jia-migration-test.onrender.com/';
async function launch(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const width of [375,820,1024]){
  const context=await browser.newContext({viewport:{width,height:1024},hasTouch:width<=1024,isMobile:width<600,locale:'zh-CN'});
  const page=await context.newPage(),errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
  assert.ok(response?.ok(),'V410 staging must respond');
  await page.waitForFunction(()=>typeof window.floorAuthLoginV350==='function'&&typeof window.floorAuthRestoreV363==='function',{timeout:25000});
  const setup=await page.evaluate(()=>{
    if(APP_VERSION!=='412'||SUPABASE_URL!==''||FLOOR_AUTH_MODE!=='disabled'||isCloudWritableRuntime())throw Error('staging must remain completely cloud-isolated');
    window.__authTest={
     initialOrders:localStorage.getItem('floor_orders_v3'),
     initialProducts:localStorage.getItem('floor_product_library_v1')
    };
    window.floorAuthConfigured=()=>true;
    window.__authMockSession=(uid)=>({access_token:'fake-access-'+uid,refresh_token:'fake-refresh-'+uid,user_id:uid,expires_at:Math.floor(Date.now()/1000)+3600});
    document.getElementById('floorAuthEmailV350').value='test@example.invalid';
    document.getElementById('floorAuthPasswordV350').value='password';
    return {version:APP_VERSION,mode:FLOOR_AUTH_MODE,write:isCloudWritableRuntime()};
  });
  assert.deepEqual(setup,{version:'412',mode:'disabled',write:false});
  const inputs=()=>page.evaluate(()=>({notice:document.getElementById('authMigrationStatusTextV349')?.textContent,loggedIn:!!floorAuthSessionV350?.access_token,stored:localStorage.getItem('floor_authenticated_session_v363'),busy:floorAuthLoginBusyV410,enabled:!document.querySelector('#floorAuthControlsV350 button[onclick*="floorAuthLoginV350"]').disabled}));
  // 1: On iPad a token may already be accepted while follow-up data load fails.
  await page.evaluate(()=>{
   window.floorAuthSignIn=async()=>window.__authMockSession('success');
   window.initCloud=async()=>{throw Error('simulated cloud read failure after token accepted')};
  });
  const authenticated=await page.evaluate(()=>floorAuthLoginV350());
  assert.equal(authenticated,true,'success token remains success even when cloud init throws');
  let res=await inputs();
  assert.equal(res.loggedIn,true,'session must survive sync error');
  assert.ok(res.notice.includes('账号登录成功')&&!res.notice.includes('登录失败'),'login and sync errors must be visibly distinguished');
  assert.equal(JSON.parse(res.stored).user_id,'success');
  assert.equal(res.busy,false);assert.equal(res.enabled,true);
  // 2: Old Safari token-restore cannot override a completed manual login.
  const raced=await page.evaluate(async()=>{
    localStorage.setItem('floor_authenticated_session_v363',JSON.stringify({user_id:'stale',access_token:'old',refresh_token:'old',expires_at:0}));
    let resolveRefresh;
    window.floorAuthRefresh=()=>new Promise(resolve=>{resolveRefresh=resolve});
    const pending=floorAuthRestoreV363();
    await Promise.resolve();await Promise.resolve();
    document.getElementById('floorAuthPasswordV350').value='new-secret';
    window.floorAuthSignIn=async()=>window.__authMockSession('new-login');
    window.initCloud=async()=>{};
    const logged=await floorAuthLoginV350();
    resolveRefresh(window.__authMockSession('stale'));
    await pending;
    return {logged,uid:floorAuthSessionV350.user_id,stored:JSON.parse(localStorage.getItem('floor_authenticated_session_v363')).user_id};
  });
  assert.deepEqual(raced,{logged:true,uid:'new-login',stored:'new-login'},'manual iPad login wins old session restore race');
  // 3: Validation failures must show user-friendly actionable text, not generic "login failed".
  const invalid=await page.evaluate(async()=>{
    const before=floorAuthSessionV350.user_id;
    document.getElementById('floorAuthPasswordV350').value='wrong';
    window.floorAuthSignIn=async()=>{const e=new Error('fake');e.authStatus=400;e.authReason='invalid_credentials';throw e};
    const ok=await floorAuthLoginV350();
    return {ok,before,after:floorAuthSessionV350.user_id,text:document.getElementById('authMigrationStatusTextV349').textContent};
  });
  assert.equal(invalid.ok,false);assert.equal(invalid.after,invalid.before,'wrong password must not delete previously valid session');
  assert.ok(invalid.text.includes('账号或密码不正确'),invalid.text);
  const network=await page.evaluate(async()=>{
    document.getElementById('floorAuthPasswordV350').value='network';
    window.floorAuthSignIn=async()=>{const e=new Error('network blocked');e.authReason='network';throw e};
    const ok=await floorAuthLoginV350();
    return {ok,text:document.getElementById('authMigrationStatusTextV349').textContent};
  });
  assert.equal(network.ok,false);assert.ok(network.text.includes('网络')&&network.text.includes('VPN'),'iPad network errors are identified');
  // 4: Tapping login twice must never send two concurrent authentication attempts.
  const double=await page.evaluate(async()=>{
    let count=0,resolveSignIn;
    document.getElementById('floorAuthPasswordV350').value='double';
    window.floorAuthSignIn=()=>{count++;return new Promise(resolve=>{resolveSignIn=resolve})};
    window.initCloud=async()=>{};
    const first=floorAuthLoginV350();
    const during={busy:floorAuthLoginBusyV410,disabled:document.querySelector('#floorAuthControlsV350 button[onclick*="floorAuthLoginV350"]').disabled};
    const second=await floorAuthLoginV350();
    resolveSignIn(window.__authMockSession('double'));
    const result=await first;
    return {count,second,result,during};
  });
  assert.equal(double.count,1);assert.equal(double.second,false);assert.equal(double.result,true);
  assert.equal(double.during.busy,true);assert.equal(double.during.disabled,true);
  // 5: Neither tests nor login errors modify user business data.
  const untouched=await page.evaluate(()=>({orders:localStorage.getItem('floor_orders_v3')===window.__authTest.initialOrders,products:localStorage.getItem('floor_product_library_v1')===window.__authTest.initialProducts,cloud:SUPABASE_URL,write:isCloudWritableRuntime()}));
  assert.deepEqual(untouched,{orders:true,products:true,cloud:'',write:false});
  assert.equal(errs.length,0,'unexpected browser exceptions '+errs.join(' | '));
  console.log('PASS V410 isolated iPad login/sync separation + restore race + network + double click + data safety',width);
  await context.close();
 }
 }finally{await browser.close();}
}
launch().catch(e=>{console.error(e);process.exitCode=1});