/* Wood Floor Manager V424: independent A4 measurement report. No mutations to orders, quotes, contracts or cloud. */
(()=>{
'use strict';
const STORE='muye-measure-a4-reports-v424';
const q=(s,root=document)=>root.querySelector(s);
const qa=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>{const n=Number(x);return Number.isFinite(n)&&n>=0?n:null};
const money2=x=>Number(x||0).toFixed(2);
let current=null,modal=null;
const today=()=>{const d=new Date(),p=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
function exactPerimeter(expr){
 const parts=String(expr||'').replace(/\s/g,'').replace(/[×xX*＊]/g,'x').split('+');
 if(!parts.length||parts.some(p=>!p))return null;
 let total=0;
 for(const part of parts){
  const m=part.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
  if(!m)return null;
  total+=2*(Number(m[1])+Number(m[2]))/100;
 }
 return total;
}
function capture(){
 const rows=[],invalid=[];
 qa('#measureRows > .measure-row').forEach((el,i)=>{
  const kind=el.dataset.kind==='stair'?'stair':'area',floor=String(el.dataset.floor||'1楼').trim()||'1楼';
  const name=q('.mname',el)?.value.trim()||(kind==='stair'?'楼梯':'区域'+(i+1));
  if(kind==='stair'){
   const get=s=>q(s,el)?.value||'';
   const fields={width:get('.stair-width'),depth:get('.stair-depth'),count:get('.stair-count'),riser:get('.stair-riser'),platform:get('.stair-platform')};
   const hasInput=Object.values(fields).some(v=>v!=='');
   if(!hasInput)return;
   const area=typeof stairMeasureArea==='function'?stairMeasureArea(el):0;
   if(!Number.isFinite(area)||area<=0){invalid.push(floor+' '+name);return;}
   rows.push({kind,floor,name,expr:'踏步'+fields.count+'级'+(fields.platform?'；平台'+fields.platform:''),area,fields});
  }else{
   const expr=q('.mexpr',el)?.value.trim()||'';
   if(!expr)return;
   const area=typeof parseMeasureExpr==='function'?parseMeasureExpr(expr):0;
   if(!Number.isFinite(area)||area<=0){invalid.push(floor+' '+name);return;}
   rows.push({kind,floor,name,expr,area,perimeter:exactPerimeter(expr)});
  }
 });
 return {rows,invalid,capturedAt:new Date().toISOString()};
}
function defaults(){
 const source=capture();
 return {id:null,createdAt:null,source,customer:q('#cust')?.value.trim()||'',address:q('#project')?.value.trim()||'',date:today(),notes:'',
  method:'glue',skirt:true,trim:false,stairs:source.rows.some(r=>r.kind==='stair'),other:false,
  skirtQty:'',battenQty:'',trimQty:'',extras:[]};
}
function reportTotals(d){
 const regular=d.source.rows.filter(r=>r.kind==='area'),steps=d.source.rows.filter(r=>r.kind==='stair');
 const area=regular.reduce((n,r)=>n+r.area,0),stairArea=steps.reduce((n,r)=>n+r.area,0);
 const rect=regular.filter(r=>Number.isFinite(r.perimeter)),needsManual=regular.length-rect.length;
 const skirtEstimate=rect.reduce((n,r)=>n+r.perimeter,0);
 const sk=d.skirtQty===''?skirtEstimate:num(d.skirtQty);
 const bk=d.battenQty===''?area*4:num(d.battenQty);
 const trim=d.trimQty===''?null:num(d.trimQty);
 return {regular,steps,area,stairArea,skirtEstimate,needsManual,sk,bk,trim};
}
function validQuantity(v){return v===''||num(v)!==null}
function confirmForm(){
 if(!current)return false;
 for(const key of ['skirtQty','battenQty','trimQty']){
  if(!validQuantity(current[key])){alert('数量必须为非负数字，请检查输入。');return false;}
 }
 for(const item of current.extras){
  if(!item.name.trim()||num(item.qty)===null||!item.unit.trim()){alert('其他项目请完整填写名称、非负数量及单位。');return false;}
 }
 return true;
}
function buildMarkup(d){
 const t=reportTotals(d),floors=[...new Set(d.source.rows.map(r=>r.floor))],body=[];
 for(const floor of floors){
  const items=d.source.rows.filter(r=>r.floor===floor&&(r.kind==='area'||d.stairs));
  if(!items.length)continue;
  body.push('<tr class="mr-floor"><td colspan="4">'+esc(floor)+'</td></tr>');
  items.forEach(r=>body.push('<tr><td>'+esc(r.name)+'</td><td>'+esc(r.kind==='stair'?'楼梯':r.expr)+'</td><td>'+esc(r.kind==='stair'?'楼梯':'木地板')+'</td><td class="mr-right">'+money2(r.area)+'㎡</td></tr>'));
  body.push('<tr class="mr-sub"><td colspan="3">'+esc(floor)+'小计</td><td class="mr-right">'+money2(items.reduce((n,r)=>n+r.area,0))+'㎡</td></tr>');
 }
 const extra=[];
 if(d.skirt){
  extra.push(['踢脚线'+(d.skirtQty===''?'（预估）':''),d.skirtQty===''&&t.needsManual?'部分区域待复核':t.sk===null?'待填写':money2(t.sk)+' m']);
 }
 if(d.trim)extra.push(['收口条',t.trim===null?'待填写':money2(t.trim)+' m']);
 if(d.method==='batten')extra.push(['龙骨'+(d.battenQty===''?'（预估）':''),t.bk===null?'待填写':money2(t.bk)+' m']);
 if(d.stairs&&t.steps.length)extra.push(['楼梯铺设面积',money2(t.stairArea)+' ㎡']);
 if(d.other)d.extras.forEach(x=>{if(x.name.trim())extra.push([x.name.trim(),x.qty!==''?x.qty+' '+x.unit:'待填写'])});
 const rows=extra.map(x=>'<div class="mr-item"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join('');
 const floorNote=d.skirt&&d.skirtQty===''?'踢脚线按规则区域外周长预估，未扣除门洞、柜体等，连通或异形区域须现场复核。':'';
 const flag=d.source.invalid?.length?'部分测量数据无有效面积，已排除，需补充后重新生成。':'';
 return '<article class="mr-sheet">'+
  '<header class="mr-heading"><span>深圳市佳杰木业有限公司</span><h1>现场量房汇总单</h1><small>MEASUREMENT SUMMARY · 客户版</small></header>'+
  '<div class="mr-meta"><span>客户姓名：'+esc(d.customer||'—')+'</span><span>测量日期：'+esc(d.date||'—')+'</span><span class="mr-full">项目地址：'+esc(d.address||'—')+'</span></div>'+
  '<h2>01 · 房间面积明细</h2><table class="mr-table"><thead><tr><th>区域</th><th>尺寸（cm）/说明</th><th>项目</th><th class="mr-right">实测面积</th></tr></thead><tbody>'+
    body.join('')+'</tbody></table>'+
  '<div class="mr-grand"><span>木地板实测面积（不含楼梯）</span><b>'+money2(t.area)+' ㎡</b></div>'+
  (extra.length?'<h2>02 · 其他项目汇总</h2><div class="mr-extras">'+rows+'</div>':'')+
  (d.notes.trim()?'<h2>03 · 现场施工说明</h2><p class="mr-notes">'+esc(d.notes)+'</p>':'')+
  '<footer class="mr-foot">'+(floorNote?'<p>'+esc(floorNote)+'</p>':'')+
   (flag?'<p>'+esc(flag)+'</p>':'')+
   '<p>本单为现场测量汇总，实测面积不含备料损耗；最终施工及计价数量以双方确认方案为准。</p>'+
   '<span>佳杰木业 · 现场量房记录</span></footer></article>';
}
function collectSaved(){
 try{const a=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(a)?a:[]}catch(_){return []}
}
function writeSaved(records){
 const value=JSON.stringify(records);
 localStorage.setItem(STORE,value);
 if(localStorage.getItem(STORE)!==value)throw Error('回读失败');
}
function optToggle(key,label){
 return '<label class="mr-toggle"><input type="checkbox" data-r-field="'+key+'" '+(current[key]?'checked':'')+'><span>'+label+'</span></label>';
}
function controls(){
 const d=current,t=reportTotals(d);
 q('#mr-customer',modal).value=d.customer;q('#mr-address',modal).value=d.address;q('#mr-date',modal).value=d.date;
 q('#mr-notes',modal).value=d.notes;
 q('#mr-method',modal).value=d.method;
 q('#mr-options',modal).innerHTML=
  optToggle('skirt','安装踢脚线')+optToggle('trim','需要收口条')+
  (t.steps.length?optToggle('stairs','包含楼梯'):'')+optToggle('other','其他施工项目');
 const quantity=[];
 if(d.skirt)quantity.push('<label>踢脚线长度（m）<input data-r-number="skirtQty" inputmode="decimal" type="number" min="0" step="0.01" placeholder="自动预估 '+money2(t.skirtEstimate)+'，可手动覆盖" value="'+esc(d.skirtQty)+'"></label>');
 if(d.method==='batten')quantity.push('<label>龙骨长度（m）<input data-r-number="battenQty" inputmode="decimal" type="number" min="0" step="0.01" placeholder="实测面积 × 4 = '+money2(t.area*4)+' m" value="'+esc(d.battenQty)+'"></label>');
 if(d.trim)quantity.push('<label>收口条长度（m）<input data-r-number="trimQty" inputmode="decimal" type="number" min="0" step="0.01" placeholder="人工测量后填写" value="'+esc(d.trimQty)+'"></label>');
 q('#mr-quantities',modal).innerHTML=quantity.join('');
 const out=q('#mr-custom',modal);out.hidden=!d.other;
 out.innerHTML=d.other?'<div class="mr-custom-head">自定义项目 <button type="button" data-r-action="add">＋ 添加</button></div>'+
  d.extras.map((x,i)=>'<div class="mr-custom-row"><input data-extra-index="'+i+'" data-extra-key="name" placeholder="项目名称" value="'+esc(x.name)+'"><input data-extra-index="'+i+'" data-extra-key="qty" inputmode="decimal" type="number" min="0" step="0.01" placeholder="数量" value="'+esc(x.qty)+'"><input data-extra-index="'+i+'" data-extra-key="unit" placeholder="单位" value="'+esc(x.unit)+'"><button type="button" data-r-delete="'+i+'" aria-label="删除自定义项目">×</button></div>').join(''):'';
 const sel=q('#mr-saved',modal),records=collectSaved();
 sel.innerHTML='<option value="">历史保存记录（本机）</option>'+records.map(x=>'<option value="'+esc(x.id)+'">'+esc((x.customer||'未命名客户')+' · '+(x.date||'')+' · '+x.source.rows.length+'项')+'</option>').join('');
 if(d.id)sel.value=d.id;
 render();
}
function render(){
 if(!modal||!current)return;
 q('#mr-preview',modal).innerHTML=buildMarkup(current);
 const t=reportTotals(current);
 q('#mr-warning',modal).textContent=current.source.invalid.length?'注意：'+current.source.invalid.join('、')+'未能计算面积；请返回量房修正。':
  current.skirt&&current.skirtQty===''&&t.needsManual?'提示：有 '+t.needsManual+' 个区域无法按长宽预估踢脚线，请手工复核。':'';
}
function markDataChanged(){if(current){current.id=null;current.createdAt=null;}const s=q('#mr-saved',modal);if(s)s.value='';}
function save(){
 if(!confirmForm())return;
 const records=collectSaved();const id=current.id||'MR-'+Date.now()+'-'+Math.floor(Math.random()*100000);
 const obj=JSON.parse(JSON.stringify({...current,id,createdAt:new Date().toISOString()}));
 const i=records.findIndex(r=>r.id===id);
 if(i>=0)records[i]=obj;else records.unshift(obj);
 try{writeSaved(records.slice(0,60));current.id=id;current.createdAt=obj.createdAt;controls();alert('量房汇总单已保存在本机，可从历史记录重新打开。');}
 catch(e){alert('保存失败：本机存储不可用。请先打印或复制文字，不会假装保存成功。')}
}
function printReport(){
 if(!confirmForm())return;
 const tab=window.open('','_blank');
 if(!tab){alert('浏览器阻止打开打印页，请允许弹出新窗口后再试。');return;}
 const cssHref=new URL('./measure-report-v424.css?v=424',location.href).href;
 const doc='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>现场量房汇总单</title><link rel="stylesheet" href="'+esc(cssHref)+'"></head><body class="mr-print-window"><div class="mr-print-toolbar"><button onclick="window.print()">打印 / 保存PDF</button><span>iPhone 可在系统打印预览中选择分享或保存PDF</span></div>'+buildMarkup(current)+'</body></html>';
 tab.document.open();tab.document.write(doc);tab.document.close();
}
function shareText(){
 if(!confirmForm())return;
 const t=reportTotals(current),lines=['现场量房汇总单','客户：'+(current.customer||'—'),'日期：'+current.date,'地址：'+(current.address||'—')];
 current.source.rows.filter(r=>r.kind==='area'||current.stairs).forEach(r=>lines.push(r.floor+' '+r.name+' '+money2(r.area)+'㎡'));
 lines.push('木地板实测面积（不含楼梯）：'+money2(t.area)+'㎡');
 if(current.skirt)lines.push('踢脚线：'+(current.skirtQty===''?'预估 ':'')+(t.sk===null?'待填写':money2(t.sk)+'m'));
 if(current.trim)lines.push('收口条：'+(t.trim===null?'待填写':money2(t.trim)+'m'));
 if(current.method==='batten')lines.push('龙骨：'+(current.battenQty===''?'预估 ':'')+money2(t.bk)+'m');
 if(current.stairs&&t.steps.length)lines.push('楼梯：'+money2(t.stairArea)+'㎡');
 if(current.other)current.extras.forEach(x=>{if(x.name.trim())lines.push(x.name+'：'+x.qty+x.unit)});
 if(current.notes.trim())lines.push('现场说明：'+current.notes.trim());
 lines.push('实测面积不含备料损耗；最终施工与计价以双方确认方案为准。');
 const text=lines.join('\n');
 if(navigator.share){navigator.share({title:'现场量房汇总单',text}).catch(err=>{if(err?.name!=='AbortError')navigator.clipboard?.writeText(text).then(()=>alert('已复制量房文字，请粘贴到微信。')).catch(()=>alert('分享失败，请使用打印功能。'))})}
 else if(navigator.clipboard)navigator.clipboard.writeText(text).then(()=>alert('已复制量房文字，可粘贴发送客户。')).catch(()=>alert('复制失败，请使用打印功能。'));
 else alert('当前浏览器不支持直接分享，请通过打印页面保存PDF。');
}
function open(){
 const data=defaults();
 if(!data.source.rows.length){alert('请先在①面积中填写至少一个有效房间或楼梯测量记录。');return}
 current=data;modal.hidden=false;document.body.classList.add('mr-open');controls();
}
function close(){modal.hidden=true;document.body.classList.remove('mr-open');current=null}
function init(){
 if(q('#mr-open-btn'))return;
 const card=q('#quote .measure-card-v273');if(!card)return;
 const trigger=document.createElement('div');trigger.className='mr-open-row';trigger.innerHTML='<button id="mr-open-btn" type="button">生成 A4 量房汇总单</button><span>现场测量 → 客户版一页汇总</span>';
 card.appendChild(trigger);q('#mr-open-btn',trigger).addEventListener('click',open);
 modal=document.createElement('div');modal.id='mr-v424';modal.className='modal-mask mr-overlay';modal.hidden=true;
 modal.innerHTML='<section class="mr-dialog" role="dialog" aria-modal="true" aria-label="现场量房汇总单">'+
 '<header class="mr-dialog-head"><strong>A4现场量房汇总单</strong><button type="button" data-r-action="close" aria-label="关闭">×</button></header>'+
 '<div class="mr-dialog-scroll"><div class="mr-form"><div class="mr-top-fields"><label>客户姓名<input id="mr-customer" placeholder="客户姓名"></label><label>测量日期<input id="mr-date" type="date"></label><label class="mr-span">项目地址/名称<input id="mr-address" placeholder="项目地址"></label></div>'+
 '<label>基层安装方式<select id="mr-method"><option value="glue">打胶直铺（不打龙骨）</option><option value="batten">龙骨安装</option><option value="floating">悬浮铺装</option></select></label>'+
 '<div class="mr-options" id="mr-options"></div><div class="mr-quantities" id="mr-quantities"></div><div id="mr-custom"></div>'+
 '<label>现场施工说明<textarea id="mr-notes" rows="2" placeholder="门口高低差、柜体下方是否铺装等（可留空）"></textarea></label>'+
 '<div class="mr-tools"><button type="button" data-r-action="recapture">重新读取当前量房</button><select id="mr-saved" aria-label="历史量房汇总单"></select></div>'+
 '<p id="mr-warning" class="mr-warning" role="status"></p></div><div id="mr-preview" class="mr-preview"></div></div>'+
 '<footer class="mr-dialog-actions"><button type="button" data-r-action="close">返回</button><button type="button" data-r-action="save">保存汇总单</button><button type="button" data-r-action="share">分享文字</button><button type="button" data-r-action="print">打印 / 保存PDF</button></footer></section>';
 document.body.appendChild(modal);
 modal.addEventListener('click',e=>{
  if(e.target===modal){close();return}
  const action=e.target.closest('[data-r-action]')?.dataset.rAction;
  if(action==='close')return close();
  if(action==='add'){current.extras.push({name:'',qty:'',unit:'m'});markDataChanged();controls();return}
  const del=e.target.closest('[data-r-delete]')?.dataset.rDelete;
  if(del!=null){current.extras.splice(Number(del),1);markDataChanged();controls();return}
  if(action==='recapture'){const fresh=capture();if(fresh.rows.length){current.source=fresh;markDataChanged();controls()}else alert('当前没有有效量房记录。');return}
  if(action==='save')return save();
  if(action==='print')return printReport();
  if(action==='share')return shareText();
 });
 modal.addEventListener('input',handleInput);
 modal.addEventListener('change',handleInput);
 function handleInput(e){
  if(!current)return;
  const el=e.target,k=el.dataset.rField;
  if(k){current[k]=el.checked;markDataChanged();controls();return}
  if(el.id==='mr-method'){current.method=el.value;markDataChanged();controls();return}
  if(el.id==='mr-saved'){
   if(!el.value)return;
   const found=collectSaved().find(r=>r.id===el.value);
   if(found&&found.source&&Array.isArray(found.source.rows)){current=JSON.parse(JSON.stringify(found));controls()}
   return;
  }
  const field={'mr-customer':'customer','mr-address':'address','mr-date':'date','mr-notes':'notes'}[el.id];
  if(field)current[field]=el.value;
  else if(el.dataset.rNumber)current[el.dataset.rNumber]=el.value;
  else if(el.dataset.extraIndex!=null&&current.extras[Number(el.dataset.extraIndex)])current.extras[Number(el.dataset.extraIndex)][el.dataset.extraKey]=el.value;
  else return;
  markDataChanged();render();
 }
 window.muyeMeasureReportV424={open,status:()=>({enabled:true,visible:!!modal&&!modal.hidden,sourceCount:current?.source.rows.length||0}),capture,estimatePerimeter:exactPerimeter,reportTotals};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();