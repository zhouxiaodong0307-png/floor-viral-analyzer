/* V425: read-only instant measurement summary; uses existing measurement/optional quote data, no second-entry forms. */
(()=>{
'use strict';
const STORE='muye-measure-a4-reports-v424'; // Keep V424 saved records untouched.
const q=(s,root=document)=>root.querySelector(s);
const qa=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toFixed(2);
// Customer-facing loss-inclusive material estimate must be whole m²; retain raw precision until final ceiling.
const fmtWholePreparation=n=>String(Math.ceil(n-Number.EPSILON*Math.max(1,Math.abs(n))*4));
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
 const rows=[],invalid=[],pendingRows=[];
 qa('#measureRows > .measure-row').forEach((el,i)=>{
  const kind=el.dataset.kind==='stair'?'stair':'area',floor=String(el.dataset.floor||'1楼').trim()||'1楼';
  const name=q('.mname',el)?.value.trim()||(kind==='stair'?'楼梯':'区域'+(i+1));
  if(kind==='stair'){
   const get=sel=>q(sel,el)?.value||'';
   const fields={width:get('.stair-width'),depth:get('.stair-depth'),count:get('.stair-count'),riser:get('.stair-riser'),platform:get('.stair-platform')};
   if(!Object.values(fields).some(x=>x!==''))return;
   const invalidDimension=['width','depth','count','riser'].some(k=>fields[k]!==''&&nonNegative(fields[k])===null);
   if(invalidDimension||(fields.count!==''&&!Number.isInteger(Number(fields.count)))||(fields.platform&&exactPerimeter(fields.platform)===null)){invalid.push(floor+' '+name);pendingRows.push({kind,floor,name,expr:'踏步/平台待补充',order:i});return}
   const area=typeof stairMeasureArea==='function'?stairMeasureArea(el):0;
   if(!Number.isFinite(area)||area<=0){invalid.push(floor+' '+name);pendingRows.push({kind,floor,name,expr:'踏步/平台待补充',order:i});return}
   rows.push({kind,floor,name,expr:'踏步'+fields.count+'级'+(fields.platform?'；平台'+fields.platform:''),area,fields,order:i});
  }else{
   const expr=q('.mexpr',el)?.value.trim()||'';
   if(!expr)return;
   const perimeter=exactPerimeter(expr);
   if(perimeter===null){invalid.push(floor+' '+name);pendingRows.push({kind,floor,name,expr,order:i});return}
   const area=typeof parseMeasureExpr==='function'?parseMeasureExpr(expr):0;
   if(!Number.isFinite(area)||area<=0){invalid.push(floor+' '+name);pendingRows.push({kind,floor,name,expr,order:i});return}
   rows.push({kind,floor,name,expr,area,perimeter,order:i});
  }
 });
 return {rows,invalid,pendingRows,capturedAt:new Date().toISOString()};
}
function dataFromCurrentInputs(){
 const source=capture(),customer=q('#cust')?.value.trim()||'',address=q('#project')?.value.trim()||'';
 // "0" is the default in the existing quote. It never means the customer selected that item.
 // These are quantity fields, not price/cost fields; never expose internal financial data.
 const skirt=nonNegative(q('#skirt')?.value),batten=nonNegative(q('#batten')?.value);
 // Reflect the current user-controlled loss slider; do not change it or the quote calculation.
 const lossValue=nonNegative(q('#measureLoss')?.value);
 return {id:null,createdAt:null,source,customer,address,date:today(),
  lossPercent:lossValue,
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
function lossSummary(d,t){
 // Historic V424-V427 saved reports without lossPercent remain unchanged.
 const percent=nonNegative(d.lossPercent);
 if(percent===null||!(t.combined>0))return null;
 // Existing quote's loss slider applies to the entire measured area, including stairs.
 const area=t.combined*percent/100;
 return {percent,area,total:t.combined*(1+percent/100)};
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
// Presentation-only: don't repeat a floor's name as a room name inside that floor.
function reportRowName(r,floor){
 const name=String(r.name||'').trim();
 return r.kind==='area'&&name===String(floor||'1楼').trim()?'测量区域':name||'测量区域';
}
function buildMarkup(d){
 const t=reportTotals(d),pending=Array.isArray(d.source.pendingRows)?d.source.pendingRows:[],body=[];
 const entries=[...d.source.rows.map((r,i)=>({...r,pending:false,order:Number.isInteger(r.order)?r.order:i})),
  ...pending.map((r,i)=>({...r,pending:true,order:Number.isInteger(r.order)?r.order:d.source.rows.length+i}))];
 const floors=[...new Set(entries.map(r=>r.floor||'1楼'))],multipleFloors=floors.length>1;
 for(const floor of floors){
  const list=entries.filter(r=>(r.floor||'1楼')===floor).sort((a,b)=>a.order-b.order);
  if(!list.length)continue;
  // A single floor needs no redundant floor label. Multiple floors get one subtotal
  // in the heading (not a second subtotal row after the rooms).
  const floorArea=list.filter(r=>!r.pending).reduce((a,r)=>a+r.area,0);
  if(multipleFloors)body.push('<tr class="mr-floor"><td colspan="2"><span class="mr-floor-name">'+esc(floor)+'</span></td><td class="mr-right"><span class="mr-floor-total">本层 '+fmt(floorArea)+'㎡</span></td></tr>');
  for(const r of list){
   const expr=r.kind==='stair'?(r.pending?'踏步/平台待补充':'踏步/平台'):r.expr;
   const value=r.pending?'<span class="mr-pending-value">待补充</span>':fmt(r.area)+'㎡';
   const name=reportRowName(r,floor);
   body.push('<tr'+(r.pending?' class="mr-pending"':'')+'><td>'+esc(name)+'</td><td>'+esc(expr)+'</td><td class="mr-right">'+value+'</td></tr>');
  }
 }
 const optional=optionalRows(d,t),loss=lossSummary(d,t);
 const meta=[];
 if(d.customer?.trim())meta.push('<span>客户姓名：'+esc(d.customer.trim())+'</span>');
 if(d.date?.trim())meta.push('<span>测量日期：'+esc(d.date.trim())+'</span>');
 if(d.address?.trim())meta.push('<span class="mr-full">项目地址：'+esc(d.address.trim())+'</span>');
 const areaName='木地板实测总面积';
 const rows=optional.map(x=>'<div class="mr-item"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join('');
 const caution=optional.some(x=>x[0].includes('踢脚线（预估）'))?
  '<p>踢脚线按房间尺寸估算，未扣除门洞、柜体及连通区域共边，须现场复核。</p>':'';
 const unmeasured=pending.length?'<p class="mr-attention">尺寸待补充：'+esc(pending.map(r=>r.name).join('、'))+'。以上实测合计仅包含填写完整的区域。</p>':'';
 return '<article class="mr-sheet">'+
 '<header class="mr-heading"><h1>现场量房汇总单</h1><small>客户版</small></header>'+
 (meta.length?'<div class="mr-meta">'+meta.join('')+'</div>':'')+
 '<h2>'+(multipleFloors?'01 · 各楼层面积':'01 · 房间面积明细')+'</h2><table class="mr-table"><thead><tr><th>区域</th><th>尺寸（cm）</th><th class="mr-right">实测面积</th></tr></thead><tbody>'+body.join('')+'</tbody></table>'+
 '<div class="mr-grand"><span>'+areaName+'</span><b>'+fmt(t.combined)+' ㎡'+'</b></div>'+
 (loss?'<div class="mr-loss"><span>'+'含'+esc(loss.percent)+'%损耗预估面积</span><b>'+fmtWholePreparation(loss.total)+' ㎡</b></div>':'')+
 (optional.length?'<h2>02 · 其他项目汇总</h2><div class="mr-extras">'+rows+'</div>':'')+
 (d.notes?.trim()?'<h2>03 · 现场施工说明</h2><p class="mr-notes">'+esc(d.notes.trim())+'</p>':'')+
 '<footer class="mr-foot">'+unmeasured+caution+'<p>本单为现场测量初稿，实测面积不含备料损耗，最终施工及计价数量以双方确认方案为准。</p></footer></article>';
}
function collectSaved(){
 try{const a=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(a)?a:[]}catch(_){return []}
}
function writeSaved(rows){
 const raw=JSON.stringify(rows);localStorage.setItem(STORE,raw);
 if(localStorage.getItem(STORE)!==raw)throw Error('本机保存回读失败');
}
function exportReady(){
 if(!current||(current.source.rows.length===0&&!(current.source.pendingRows?.length))){alert('请先填写量房尺寸。');return false}
 return true;
}
function render(){
 if(!current||!modal)return;
 q('#mr-preview',modal).innerHTML=buildMarkup(current);
 const tip=q('#mr-warning',modal);
 tip.textContent=current.source.pendingRows?.length?'有 '+current.source.pendingRows.length+' 处尺寸尚未填完整，已在清单标记为「待补充」，不计入实测面积。':'';
 tip.hidden=!tip.textContent;
}

/* V465: render the current report as an offline PNG. iOS websites cannot silently
   write Photos, so give the native share sheet a genuine image file. */
function renderReportImage(d=current){
 if(!d)throw Error('量房内容为空');
 const W=1120, L=76, R=W-76, CW=R-L, ops=[];
 const probe=document.createElement('canvas').getContext('2d');
 if(!probe)throw Error('当前浏览器不支持生成图片');
 const font=(size,bold=false)=>`${bold?'700':'400'} ${size}px "PingFang SC",-apple-system,"Microsoft YaHei",sans-serif`;
 const wrap=(value,maxWidth,size=26,bold=false)=>{
  probe.font=font(size,bold);
  const lines=[];let part='';
  for(const ch of String(value??'')){
   if(ch==='\n'){lines.push(part);part='';continue}
   if(part&&probe.measureText(part+ch).width>maxWidth){lines.push(part);part=ch}else part+=ch;
  }
  lines.push(part);
  return lines;
 };
 const rect=(x,y,w,h,fill,r=0)=>ops.push(g=>{
  g.fillStyle=fill;
  if(r&&typeof g.roundRect==='function'){g.beginPath();g.roundRect(x,y,w,h,r);g.fill()}
  else g.fillRect(x,y,w,h);
 });
 const stroke=(x1,y1,x2,y2,color='#dedede')=>ops.push(g=>{g.strokeStyle=color;g.lineWidth=1;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()});
 const text=(value,x,y,size=26,bold=false,color='#1c1c1e',align='left')=>ops.push(g=>{
  g.fillStyle=color;g.font=font(size,bold);g.textAlign=align;g.textBaseline='top';g.fillText(String(value),x,y);
 });
 let y=70;
 rect(L,y,CW,155,'#1c1c1e',14);
 text('现场量房汇总单',W/2,y+34,44,true,'#fff','center');
 text('客户版',W/2,y+101,23,false,'#ddd','center');
 y+=192;
 const meta=[];
 if(d.customer?.trim())meta.push('客户姓名：'+d.customer.trim());
 if(d.date?.trim())meta.push('测量日期：'+d.date.trim());
 if(d.address?.trim())meta.push('项目地址：'+d.address.trim());
 for(const m of meta){const ls=wrap(m,CW,24);for(const s of ls){text(s,L,y,24);y+=34}y+=5}
 y+=23;
 const entries=[
  ...d.source.rows.map((r,i)=>({...r,pending:false,order:Number.isInteger(r.order)?r.order:i})),
  ...(d.source.pendingRows||[]).map((r,i)=>({...r,pending:true,order:Number.isInteger(r.order)?r.order:d.source.rows.length+i}))
 ];
 const floors=[...new Set(entries.map(r=>r.floor||'1楼'))];
 text(floors.length>1?'01 · 各楼层面积':'01 · 房间面积明细',L,y,32,true);
 y+=55;stroke(L,y,R,y,'#444');y+=14;
 text('区域',L+8,y,23,false,'#71717a');
 text('尺寸（cm）',L+280,y,23,false,'#71717a');
 text('实测面积',R-8,y,23,false,'#71717a','right');
 y+=48;stroke(L,y,R,y);
 for(const floor of floors){
  const rows=entries.filter(r=>(r.floor||'1楼')===floor).sort((a,b)=>a.order-b.order);
  if(floors.length>1){
   rect(L,y,CW,50,'#f3f3f3');
   text(floor,L+10,y+10,24,true);
   text('本层 '+fmt(rows.filter(r=>!r.pending).reduce((a,r)=>a+r.area,0))+'㎡',R-10,y+10,22,true,'#3f3f46','right');
   y+=50;
  }
  for(const r of rows){
   const left=wrap(reportRowName(r,floor),236,24);
   const middle=wrap(r.kind==='stair'?(r.pending?'踏步/平台待补充':'踏步/平台'):r.expr,422,24);
   const h=Math.max(57,Math.max(left.length,middle.length)*36+18);
   for(let i=0;i<left.length;i++)text(left[i],L+8,y+9+i*36,24);
   for(let i=0;i<middle.length;i++)text(middle[i],L+280,y+9+i*36,24);
   text(r.pending?'待补充':fmt(r.area)+'㎡',R-8,y+9,24,false,r.pending?'#9a3412':'#1c1c1e','right');
   y+=h;stroke(L,y,R,y,'#e5e5e5');
  }
 }
 const t=reportTotals(d),loss=lossSummary(d,t);
 y+=25;
 rect(L,y,CW,84,'#f5f5f5',12);
 text('木地板实测总面积',L+20,y+24,26,true);
 text(fmt(t.combined)+' ㎡',R-20,y+18,34,true,'#111','right');
 y+=100;
 if(loss){
  rect(L,y,CW,73,'#fafafa',10);
  text('含'+loss.percent+'%损耗预估面积',L+20,y+21,24);
  text(fmtWholePreparation(loss.total)+' ㎡',R-20,y+13,33,true,'#111','right');
  y+=88;
 }
 const extras=optionalRows(d,t);
 if(extras.length){
  y+=22;text('02 · 其他项目汇总',L,y,30,true);y+=48;stroke(L,y,R,y);y+=10;
  for(const [label,value] of extras){text(label,L+8,y+10,24);text(value,R-8,y+10,25,true,'#111','right');y+=52;stroke(L,y,R,y)}
 }
 if(d.notes?.trim()){
  y+=30;text('03 · 现场施工说明',L,y,30,true);y+=51;
  for(const s of wrap(d.notes.trim(),CW-16,24)){text(s,L+8,y,24);y+=36}
 }
 y+=45;stroke(L,y,R,y,'#d5d5d5');y+=24;
 const notices=[];
 const pending=d.source.pendingRows||[];
 if(pending.length)notices.push('尺寸待补充：'+pending.map(r=>r.name).join('、')+'。仅统计填写完整的区域。');
 if(extras.some(x=>x[0].includes('踢脚线（预估）')))notices.push('踢脚线为估算数量，须现场复核。');
 notices.push('本单为现场测量初稿，实测面积不含备料损耗，最终施工及计价数量以双方确认方案为准。');
 for(const note of notices){for(const s of wrap(note,CW,21)){text(s,L,y,21,false,'#71717a');y+=31}y+=6}
 const H=Math.max(1584,Math.ceil(y+75)),scale=Math.min(1,7000/H);
 const canvas=document.createElement('canvas');
 canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);
 const g=canvas.getContext('2d');
 if(!g)throw Error('当前浏览器不支持生成图片');
 g.scale(scale,scale);g.fillStyle='#fff';g.fillRect(0,0,W,H);
 for(const op of ops)op(g);
 return canvas;
}
function previewReportImage(dataURL,mode){
 const box=q('#mr-preview',modal);
 if(!box)return;
 box.replaceChildren();
 const tip=document.createElement('p');
 tip.textContent=mode==='save'?'长按下方图片，选择「存储到照片」，即可保存到相册。':'长按图片可保存，也可以从相册发送给微信好友。';
 tip.style.cssText='font-size:13px;color:#333;margin:8px 4px 12px;text-align:center';
 const img=document.createElement('img');
 img.src=dataURL;img.alt='现场量房汇总单图片';img.style.cssText='display:block;width:100%;height:auto;background:white;border-radius:9px';
 const back=document.createElement('button');
 back.type='button';back.textContent='返回汇总单';
 back.style.cssText='display:block;margin:12px auto;border:1px solid #ddd;border-radius:9px;background:white;padding:10px 18px;color:#111;font-size:14px';
 back.addEventListener('click',render);
 box.append(tip,img,back);
 q('.mr-dialog-scroll',modal)?.scrollTo?.(0,0);
}
function exportReportImage(mode){
 if(!exportReady())return;
 let dataURL;
 try{
  const canvas=renderReportImage();
  dataURL=canvas.toDataURL('image/png');
  if(!dataURL.startsWith('data:image/png;base64,'))throw Error('PNG生成失败');
  const binary=atob(dataURL.slice(dataURL.indexOf(',')+1)),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const file=new File([bytes],'现场量房汇总单-'+(current.date||today())+'.png',{type:'image/png'});
  // Image files are accepted by iOS/WeChat more consistently than text-only Web Share.
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
   try{
    const promise=navigator.share({files:[file]});
    Promise.resolve(promise).catch(e=>{if(e?.name!=='AbortError')previewReportImage(dataURL,mode)});
    return;
   }catch(_){/* Fall back to an image that can be long-pressed. */}
  }
 }catch(e){alert('生成汇总图片失败，请使用打印PDF。');return}
 previewReportImage(dataURL,mode);
}

function save(){return exportReportImage('save')}
function printReport(){
 if(!exportReady())return;
 const tab=window.open('','_blank');
 if(!tab){alert('无法打开打印页面，请允许浏览器弹出新页面。');return}
 const href=new URL('./measure-report-v424.css?v=445',location.href).href;
 const raw='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>现场量房汇总单</title><link rel="stylesheet" href="'+esc(href)+'"></head><body class="mr-print-window"><div class="mr-print-toolbar"><button onclick="window.print()">打印 / 保存PDF</button></div>'+buildMarkup(current)+'</body></html>';
 tab.document.open();tab.document.write(raw);tab.document.close();
}
function shareText(){
 if(!exportReady())return;
 const t=reportTotals(current),loss=lossSummary(current,t);
 const rows=['现场量房汇总单'];
 if(current.customer?.trim())rows.push('客户：'+current.customer.trim());
 if(current.date?.trim())rows.push('日期：'+current.date.trim());
 if(current.address?.trim())rows.push('项目：'+current.address.trim());
 const pending=current.source.pendingRows||[];
 const entries=[...current.source.rows.map((r,i)=>({...r,pending:false,order:Number.isInteger(r.order)?r.order:i})),...pending.map((r,i)=>({...r,pending:true,order:Number.isInteger(r.order)?r.order:current.source.rows.length+i}))].sort((a,b)=>a.order-b.order);
 const withFloors=new Set(entries.map(x=>x.floor||'1楼')).size>1;
 const floors=[...new Set(entries.map(x=>x.floor||'1楼'))];
 for(const floor of floors){
  const list=entries.filter(x=>(x.floor||'1楼')===floor);
  if(withFloors)rows.push('【'+floor+'】本层 '+fmt(list.filter(x=>!x.pending).reduce((a,x)=>a+x.area,0))+'㎡');
  for(const x of list)rows.push(reportRowName(x,floor)+' '+(x.pending?'尺寸待补充（'+x.expr+'）':x.expr+' · '+fmt(x.area)+'㎡'));
 }
 rows.push('木地板实测总面积：'+fmt(t.combined)+'㎡');
 if(loss)rows.push('含'+loss.percent+'%损耗预估面积：'+fmtWholePreparation(loss.total)+'㎡');
 if(pending.length)rows.push('注：待补充区域未计入实测面积，本单仅供现场初步核对。');
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
 if(!data.source.rows.length&&!data.source.pendingRows.length){alert('请先在①面积填写房间尺寸。');return}
 current=data;modal.hidden=false;document.body.classList.add('mr-open');render();
}
function close(){if(!modal)return;modal.hidden=true;document.body.classList.remove('mr-open');current=null;}
function init(){
 if(q('#mr-open-btn'))return;
 const card=q('#quote .measure-card-v273');if(!card)return;
 const header=q('.measure-head',card);if(!header)return;
 // V437: move the existing single trigger beside the ①面积 heading.
 // Do not add a sixth control to the four-button toolbar or a new bottom row.
 const trigger=document.createElement('div');trigger.className='mr-head-trigger';
 trigger.innerHTML='<button type="button" id="mr-open-btn" aria-label="查看现场量房汇总单">量房汇总</button>';
 header.appendChild(trigger);q('#mr-open-btn',trigger).addEventListener('click',open);
 modal=document.createElement('div');modal.id='mr-v424';modal.className='modal-mask mr-overlay';modal.hidden=true;
 modal.innerHTML='<section class="mr-dialog" role="dialog" aria-modal="true" aria-label="现场量房汇总单">'+
 '<header class="mr-dialog-head"><strong>量房结果</strong><button type="button" data-r-action="close" aria-label="关闭">×</button></header>'+
 '<div class="mr-dialog-scroll"><p id="mr-warning" class="mr-warning" hidden></p><div id="mr-preview" class="mr-preview"></div></div>'+
 '<footer class="mr-dialog-actions">'+
 '<button type="button" data-r-action="close" aria-label="返回量房"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6M9 12h11"/></svg><span>返回</span></button>'+
 '<button type="button" data-r-action="save" aria-label="保存汇总单图片到相册"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM7 3v6h9V3M7 21v-8h10v8"/></svg><span>保存</span></button>'+
 '<button type="button" data-r-action="share" aria-label="分享汇总单图片"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m0 0-5 5m5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg><span>分享</span></button>'+
 '<button type="button" data-r-action="print" aria-label="打印或保存PDF"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 15h12v6H6z"/></svg><span>打印PDF</span></button>'+
 '</footer></section>';
 document.body.appendChild(modal);
 modal.addEventListener('click',e=>{
  if(e.target===modal){close();return}
  const action=e.target.closest('[data-r-action]')?.dataset.rAction;
  if(action==='close')return close();
  if(action==='save')return save();
  if(action==='share')return exportReportImage('share');
  if(action==='print')return printReport();
 });
 window.muyeMeasureReportV424={
  open,close,capture,estimatePerimeter:exactPerimeter,reportTotals,lossSummary,buildMarkup,
  status:()=>({enabled:true,visible:!!modal&&!modal.hidden,sourceCount:current?.source.rows.length||0,version:'465'})
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();