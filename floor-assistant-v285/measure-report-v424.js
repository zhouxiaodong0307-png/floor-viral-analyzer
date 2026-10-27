/* V425: read-only instant measurement summary; uses existing measurement/optional quote data, no second-entry forms. */
(()=>{
'use strict';
const STORE='muye-measure-a4-reports-v424'; // Keep V424 saved records untouched.
const q=(s,root=document)=>root.querySelector(s);
const qa=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toFixed(2);
const nonNegative=x=>{if(x===''||x==null)return null;const n=Number(x);return Number.isFinite(n)&&n>=0?n:null;};
let current=null,modal=null;
function today(){
 const date=new Date(),pad=v=>String(v).padStart(2,'0');
 return [date.getFullYear(),pad(date.getMonth()+1),pad(date.getDate())].join('-');
}
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
   const get=sel=>q(sel,el)?.value||'';
   const fields={width:get('.stair-width'),depth:get('.stair-depth'),count:get('.stair-count'),riser:get('.stair-riser'),platform:get('.stair-platform')};
   if(!Object.values(fields).some(x=>x!==''))return;
   const invalidDimension=['width','depth','count','riser'].some(k=>fields[k]!==''&&nonNegative(fields[k])===null);
   if(invalidDimension||(fields.count!==''&&!Number.isInteger(Number(fields.count)))||(fields.platform&&exactPerimeter(fields.platform)===null)){invalid.push(floor+' '+name);return}
   const area=typeof stairMeasureArea==='function'?stairMeasureArea(el):0;
   if(!Number.isFinite(area)||area<=0){invalid.push(floor+' '+name);return}
   rows.push({kind,floor,name,expr:'踏步'+fields.count+'级'+(fields.platform?'；平台'+fields.platform:''),area,fields});
  }else{
   const expr=q('.mexpr',el)?.value.trim()||'';
   if(!expr)return;
   const perimeter=exactPerimeter(expr);
   if(perimeter===null){invalid.push(floor+' '+name);return}
   const area=typeof parseMeasureExpr==='function'?parseMeasureExpr(expr):0;
   if(!Number.isFinite(area)||area<=0){invalid.push(floor+' '+name);return}
   rows.push({kind,floor,name,expr,area,perimeter});
  }
 });
 return {rows,invalid,capturedAt:new Date().toISOString()};
}
function dataFromCurrentInputs(){
 const source=capture(),customer=q('#cust')?.value.trim()||'',address=q('#project')?.value.trim()||'';
 // "0" is the default in the existing quote. It never means the customer selected that item.
 // These are quantity fields, not price/cost fields; never expose internal financial data.
 const skirt=nonNegative(q('#skirt')?.value),batten=nonNegative(q('#batten')?.value);
 return {id:null,createdAt:null,source,customer,address,date:today(),
  skirtQty:skirt!==null&&skirt>0?skirt:null,
  battenQty:batten!==null&&batten>0?batten:null,
  // No default extras or notes. Unfilled/nonexistent values are omitted from the client sheet.
  trimQty:null,otherRows:[],notes:''};
}
function reportTotals(d){
 const rooms=d.source.rows.filter(r=>r.kind==='area'),stairs=d.source.rows.filter(r=>r.kind==='stair');
 const area=rooms.reduce((a,r)=>a+r.area,0),stairArea=stairs.reduce((a,r)=>a+r.area,0);
 const skirtingEstimate=rooms.reduce((a,r)=>a+(Number.isFinite(r.perimeter)?r.perimeter:0),0);
 const battenEstimate=area*4;
 return {rooms,stairs,area,stairArea,combined:area+stairArea,skirtingEstimate,battenEstimate};
}
function optionalRows(d,t){
 const list=[];
 if(nonNegative(d.skirtQty)>0)list.push(['踢脚线',fmt(d.skirtQty)+' m']);
 else if(d.skirt===true&&t.skirtingEstimate>0)list.push(['踢脚线（预估）',fmt(t.skirtingEstimate)+' m']);
 if(nonNegative(d.battenQty)>0)list.push(['龙骨',fmt(d.battenQty)+' m']);
 else if(d.method==='batten'&&t.battenEstimate>0)list.push(['龙骨（预估）',fmt(t.battenEstimate)+' m']);
 if(nonNegative(d.trimQty)>0)list.push(['收口条',fmt(d.trimQty)+' m']);
 // Old V424 saved snapshots remain readable, but only completed extra quantities are shown.
 const extras=Array.isArray(d.otherRows)?d.otherRows:Array.isArray(d.extras)?d.extras:[];
 for(const v of extras){if(v?.name?.trim()&&nonNegative(v.qty)>0&&String(v.unit||'').trim())list.push([v.name.trim(),fmt(v.qty)+' '+String(v.unit).trim()]);}
 return list;
}
function buildMarkup(d){
 const t=reportTotals(d),floors=[...new Set(d.source.rows.map(r=>r.floor))],body=[];
 for(const floor of floors){
  const list=d.source.rows.filter(r=>r.floor===floor);
  if(!list.length)continue;
  body.push('<tr class="mr-floor"><td colspan="4">'+esc(floor)+'</td></tr>');
  for(const r of list)body.push('<tr><td>'+esc(r.name)+'</td><td>'+esc(r.kind==='stair'?'踏步/平台':r.expr)+'</td><td>'+esc(r.kind==='stair'?'楼梯':'木地板')+'</td><td class="mr-right">'+fmt(r.area)+'㎡</td></tr>');
  body.push('<tr class="mr-sub"><td colspan="3">'+esc(floor)+'小计</td><td class="mr-right">'+fmt(list.reduce((a,r)=>a+r.area,0))+'㎡</td></tr>');
 }
 const optional=optionalRows(d,t);
 const meta=[];
 if(d.customer?.trim())meta.push('<span>客户姓名：'+esc(d.customer.trim())+'</span>');
 if(d.date?.trim())meta.push('<span>测量日期：'+esc(d.date.trim())+'</span>');
 if(d.address?.trim())meta.push('<span class="mr-full">项目地址：'+esc(d.address.trim())+'</span>');
 const areaName=t.stairs.length?'木地板实测面积（不含楼梯）':'木地板实测总面积';
 const rows=optional.map(x=>'<div class="mr-item"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join('');
 const caution=optional.some(x=>x[0].includes('踢脚线（预估）'))?
  '<p>踢脚线按房间尺寸估算，未扣除门洞、柜体及连通区域共边，须现场复核。</p>':'';
 const unmeasured=d.source.invalid?.length?'<p class="mr-attention">待核实的测量区域：'+esc(d.source.invalid.join('、'))+'</p>':'';
 return '<article class="mr-sheet">'+
 '<header class="mr-heading"><span>深圳市佳杰木业有限公司</span><h1>现场量房汇总单</h1><small>客户版</small></header>'+
 (meta.length?'<div class="mr-meta">'+meta.join('')+'</div>':'')+
 '<h2>01 · 房间面积明细</h2><table class="mr-table"><thead><tr><th>区域</th><th>尺寸（cm）</th><th>项目</th><th class="mr-right">实测面积</th></tr></thead><tbody>'+body.join('')+'</tbody></table>'+
 '<div class="mr-grand"><span>'+areaName+'</span><b>'+fmt(t.area)+' ㎡</b></div>'+
 (t.stairs.length?'<div class="mr-grand mr-grand-secondary"><span>楼梯实测面积</span><b>'+fmt(t.stairArea)+' ㎡</b></div><div class="mr-grand mr-grand-all"><span>全部实测面积合计</span><b>'+fmt(t.combined)+' ㎡</b></div>':'')+
 (optional.length?'<h2>02 · 其他项目汇总</h2><div class="mr-extras">'+rows+'</div>':'')+
 (d.notes?.trim()?'<h2>03 · 现场施工说明</h2><p class="mr-notes">'+esc(d.notes.trim())+'</p>':'')+
 '<footer class="mr-foot">'+unmeasured+caution+'<p>本单为现场测量初稿，实测面积不含备料损耗，最终施工及计价数量以双方确认方案为准。</p><span>佳杰木业 · 现场量房记录</span></footer></article>';
}
function collectSaved(){
 try{const a=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(a)?a:[]}catch(_){return []}
}
function writeSaved(rows){
 const raw=JSON.stringify(rows);localStorage.setItem(STORE,raw);
 if(localStorage.getItem(STORE)!==raw)throw Error('本机保存回读失败');
}
function exportReady(){
 if(!current||!current.source.rows.length){alert('当前没有有效量房记录，暂不能生成汇总单。');return false}
 if(current.source.invalid?.length){alert('存在待核实尺寸，请先在量房页更正：'+current.source.invalid.join('、'));return false}
 return true;
}
function render(){
 if(!current||!modal)return;
 q('#mr-preview',modal).innerHTML=buildMarkup(current);
 const tip=q('#mr-warning',modal);
 tip.textContent=current.source.invalid?.length?'有未计算成功的区域：'+current.source.invalid.join('、')+'。请返回量房页面修正。':'';
 tip.hidden=!tip.textContent;
}
function save(){
 if(!exportReady())return;
 // Each save creates a new immutable snapshot; never edit an existing historical record.
 const all=collectSaved();
 const item=JSON.parse(JSON.stringify({...current,id:'MR-'+Date.now()+'-'+Math.floor(Math.random()*100000),createdAt:new Date().toISOString()}));
 try{writeSaved([item,...all].slice(0,60));alert('量房汇总单已保存到本机。')}
 catch(e){alert('保存失败，本机数据未确认写入。请使用打印/保存PDF。')}
}
function printReport(){
 if(!exportReady())return;
 const tab=window.open('','_blank');
 if(!tab){alert('无法打开打印页面，请允许浏览器弹出新页面。');return}
 const href=new URL('./measure-report-v424.css?v=425',location.href).href;
 const raw='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>现场量房汇总单</title><link rel="stylesheet" href="'+esc(href)+'"></head><body class="mr-print-window"><div class="mr-print-toolbar"><button onclick="window.print()">打印 / 保存PDF</button></div>'+buildMarkup(current)+'</body></html>';
 tab.document.open();tab.document.write(raw);tab.document.close();
}
function shareText(){
 if(!exportReady())return;
 const t=reportTotals(current);
 const rows=['现场量房汇总单'];
 if(current.customer?.trim())rows.push('客户：'+current.customer.trim());
 if(current.date?.trim())rows.push('日期：'+current.date.trim());
 if(current.address?.trim())rows.push('项目：'+current.address.trim());
 for(const x of current.source.rows)rows.push(x.floor+' '+x.name+' '+fmt(x.area)+'㎡');
 rows.push('木地板实测面积：'+fmt(t.area)+'㎡');
 if(t.stairs.length)rows.push('楼梯：'+fmt(t.stairArea)+'㎡','全部实测面积合计：'+fmt(t.combined)+'㎡');
 for(const x of optionalRows(current,t))rows.push(x[0]+'：'+x[1]);
 rows.push('实测面积不含备料损耗，最终施工及计价以双方确认方案为准。');
 const content=rows.join('\n');
 if(navigator.share)navigator.share({title:'现场量房汇总单',text:content}).catch(e=>{if(e?.name!=='AbortError')copyText(content)});
 else copyText(content);
}
function copyText(content){
 if(!navigator.clipboard){alert('当前浏览器不支持直接复制，请选择打印/保存PDF。');return}
 navigator.clipboard.writeText(content).then(()=>alert('汇总清单文字已复制，可发给客户。')).catch(()=>alert('复制失败，请使用打印/保存PDF。'));
}
function open(){
 const data=dataFromCurrentInputs();
 if(!data.source.rows.length){alert(data.source.invalid.length?'请先更正量房尺寸：'+data.source.invalid.join('、'):'请先在①面积中录入至少一个有效量房区域。');return}
 current=data;modal.hidden=false;document.body.classList.add('mr-open');render();
}
function close(){if(!modal)return;modal.hidden=true;document.body.classList.remove('mr-open');current=null;}
function init(){
 if(q('#mr-open-btn'))return;
 const card=q('#quote .measure-card-v273');if(!card)return;
 const trigger=document.createElement('div');trigger.className='mr-open-row';
 trigger.innerHTML='<button type="button" id="mr-open-btn" aria-label="查看现场量房汇总单">量房汇总</button>';
 card.appendChild(trigger);q('#mr-open-btn',trigger).addEventListener('click',open);
 modal=document.createElement('div');modal.id='mr-v424';modal.className='modal-mask mr-overlay';modal.hidden=true;
 modal.innerHTML='<section class="mr-dialog" role="dialog" aria-modal="true" aria-label="现场量房汇总单">'+
 '<header class="mr-dialog-head"><strong>现场量房汇总单</strong><button type="button" data-r-action="close" aria-label="关闭">×</button></header>'+
 '<div class="mr-dialog-scroll"><p id="mr-warning" class="mr-warning" hidden></p><div id="mr-preview" class="mr-preview"></div></div>'+
 '<footer class="mr-dialog-actions"><button type="button" data-r-action="close">返回</button><button type="button" data-r-action="save">保存汇总单</button><button type="button" data-r-action="share">分享文字</button><button type="button" data-r-action="print">打印 / 保存PDF</button></footer></section>';
 document.body.appendChild(modal);
 modal.addEventListener('click',e=>{
  if(e.target===modal){close();return}
  const action=e.target.closest('[data-r-action]')?.dataset.rAction;
  if(action==='close')return close();
  if(action==='save')return save();
  if(action==='share')return shareText();
  if(action==='print')return printReport();
 });
 window.muyeMeasureReportV424={
  open,close,capture,estimatePerimeter:exactPerimeter,reportTotals,buildMarkup,
  status:()=>({enabled:true,visible:!!modal&&!modal.hidden,sourceCount:current?.source.rows.length||0,version:'425'})
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();